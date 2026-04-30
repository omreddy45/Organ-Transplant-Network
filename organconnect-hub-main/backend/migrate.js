/**
 * migrate.js — Run cloud_schema.sql + routines against Aiven MySQL
 * 
 * Usage:
 *   node migrate.js                    (uses .env credentials)
 *   node migrate.js --routines-only    (only functions/triggers/procedures)
 *   node migrate.js --schema-only      (only tables/views)
 * 
 * This script handles DELIMITER-based routines by splitting and
 * executing them as individual statements via mysql2.
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const args = process.argv.slice(2);
const routinesOnly = args.includes('--routines-only');
const schemaOnly = args.includes('--schema-only');

// ───── Connection ─────
async function getConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'defaultdb',
    multipleStatements: true,  // Required for running .sql files
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };

  console.log(`\n🔌 Connecting to ${config.host}:${config.port}/${config.database}...`);
  const conn = await mysql.createConnection(config);
  console.log('✅ Connected!\n');
  return conn;
}

// ───── Run schema (tables + views) ─────
async function runSchema(conn) {
  console.log('📋 Running cloud_schema.sql (tables + views)...');
  const sql = readFileSync(join(__dirname, 'cloud_schema.sql'), 'utf-8');
  await conn.query(sql);
  console.log('✅ Tables and views created successfully!\n');
}

// ───── Run routines (functions, triggers, procedures) ─────
async function runRoutines(conn) {
  console.log('⚙️  Running routines (functions, triggers, procedures)...');
  const sql = readFileSync(join(__dirname, 'cloud_routines.sql'), 'utf-8');

  // Parse DELIMITER blocks: extract the SQL between DELIMITER // and DELIMITER ;
  const routineBlocks = [];
  const lines = sql.split('\n');
  let inBlock = false;
  let currentBlock = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'DELIMITER //') {
      inBlock = true;
      currentBlock = [];
      continue;
    }

    if (trimmed === 'DELIMITER ;') {
      inBlock = false;
      if (currentBlock.length > 0) {
        // Remove trailing // from the last line of the block
        let blockSql = currentBlock.join('\n');
        blockSql = blockSql.replace(/\/\/\s*$/, '').trim();
        if (blockSql) routineBlocks.push(blockSql);
      }
      currentBlock = [];
      continue;
    }

    if (inBlock) {
      currentBlock.push(line);
    }
  }

  // Execute each routine individually
  let success = 0;
  let failed = 0;

  for (const block of routineBlocks) {
    // Extract the routine name for logging
    const nameMatch = block.match(/(CREATE\s+(?:FUNCTION|TRIGGER|PROCEDURE)\s+)(\w+)/i);
    const routineName = nameMatch ? nameMatch[2] : '(unknown)';
    const routineType = nameMatch ? nameMatch[1].trim() : 'ROUTINE';

    try {
      await conn.query(block);
      console.log(`  ✅ ${routineType} ${routineName}`);
      success++;
    } catch (err) {
      console.log(`  ❌ ${routineType} ${routineName}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Routines: ${success} succeeded, ${failed} failed\n`);
}

// ───── Verify migration ─────
async function verify(conn) {
  console.log('🔍 Verifying migration...\n');

  const [tables] = await conn.query("SHOW TABLES");
  console.log(`  Tables: ${tables.length}`);
  for (const row of tables) {
    const name = Object.values(row)[0];
    const [countRows] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${name}\``);
    console.log(`    📄 ${name} (${countRows[0].cnt} rows)`);
  }

  // Check views
  const [views] = await conn.query(
    "SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE()"
  );
  console.log(`\n  Views: ${views.length}`);
  for (const v of views) console.log(`    👁️  ${v.TABLE_NAME}`);

  // Check routines
  const [funcs] = await conn.query(
    "SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE()"
  );
  console.log(`\n  Functions/Procedures: ${funcs.length}`);
  for (const f of funcs) console.log(`    ⚡ ${f.ROUTINE_TYPE}: ${f.ROUTINE_NAME}`);

  // Check triggers
  const [triggers] = await conn.query(
    "SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()"
  );
  console.log(`\n  Triggers: ${triggers.length}`);
  for (const t of triggers) console.log(`    🔔 ${t.TRIGGER_NAME}`);

  console.log('');
}

// ───── Main ─────
async function main() {
  let conn;
  try {
    conn = await getConnection();

    if (!routinesOnly) await runSchema(conn);
    if (!schemaOnly) await runRoutines(conn);
    await verify(conn);

    console.log('🎉 Migration complete!\n');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
