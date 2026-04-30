import db from './db.js';
import bcrypt from 'bcryptjs';

async function testRestore() {
  try {
    const [rows] = await db.query('SELECT * FROM deleted_records_audit WHERE table_name = "users" LIMIT 1');
    if (!rows.length) {
      console.log('No user records to restore');
      process.exit();
    }
    
    const record = rows[0];
    const data = JSON.parse(record.record_data);
    const table = record.table_name;
    const keys = Object.keys(data).filter(k => data[k] !== 'null');
    const values = keys.map(k => data[k] === 'null' ? null : data[k]);

    console.log("Before modification keys:", keys);

    if (table.toLowerCase() === 'users') {
      const idx = keys.findIndex(k => k.toLowerCase() === 'password_hash');
      const defaultHash = await bcrypt.hash('restored123', 10);
      if (idx === -1) {
        keys.push('password_hash');
        values.push(defaultHash);
      } else if (!values[idx]) {
        values[idx] = defaultHash;
      }
    }
    
    console.log("After modification keys:", keys);

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    console.log("Executing SQL:", sql);
    await db.query(sql, values);
    console.log("Successfully inserted!");
    
    // Cleanup the restored record just in case
    await db.query(`DELETE FROM users WHERE user_id = ?`, [data.user_id]);
    
  } catch (err) {
    console.error("Error during restore:", err.message);
  } finally {
    process.exit();
  }
}

testRestore();
