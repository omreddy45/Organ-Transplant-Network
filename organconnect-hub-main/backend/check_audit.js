import db from './db.js';

async function checkAuditLog() {
  try {
    const [rows] = await db.query('SELECT audit_id, table_name, record_data FROM deleted_records_audit ORDER BY deleted_at DESC LIMIT 5');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkAuditLog();
