import db from './db.js';

async function check() {
  try {
    const [rows] = await db.query('SHOW TRIGGERS');
    console.log(JSON.stringify(rows.map(r => ({ Trigger: r.Trigger, Table: r.Table })), null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
