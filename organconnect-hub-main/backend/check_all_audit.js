import db from './db.js';

async function check() {
  try {
    const [rows] = await db.query('SELECT audit_id, table_name, record_data FROM deleted_records_audit LIMIT 20');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
