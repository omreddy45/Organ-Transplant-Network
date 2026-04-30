import db from './db.js';

async function fixMissingProfiles() {
  try {
    const [users] = await db.query('SELECT user_id, username, role FROM users');
    for (const u of users) {
      if (u.role === 'admin') continue;
      
      let table = '';
      if (u.role === 'patient') table = 'patient';
      if (u.role === 'donor') table = 'donor';
      if (u.role === 'doctor') table = 'doctor';
      if (u.role === 'organization') table = 'organization';
      
      if (table) {
        const [rows] = await db.query(`SELECT user_id FROM ${table} WHERE user_id = ?`, [u.user_id]);
        if (rows.length === 0) {
          console.log(`Fixing missing profile for user ${u.user_id} (${u.role})`);
          if (u.role === 'patient') {
            await db.query('INSERT IGNORE INTO patient (user_id, name, dob, street, city, state) VALUES (?, ?, ?, ?, ?, ?)', [u.user_id, u.username, '1970-01-01', '', 'Unknown', 'Unknown']);
          } else if (u.role === 'donor') {
            await db.query('INSERT IGNORE INTO donor (user_id, name, dob, donation_reason) VALUES (?, ?, ?, ?)', [u.user_id, u.username, '1970-01-01', '']);
          } else if (u.role === 'doctor') {
            const [orgs] = await db.query('SELECT MIN(org_id) as oid FROM organization');
            const oid = orgs[0]?.oid || 1;
            await db.query('INSERT IGNORE INTO doctor (user_id, name, specialization, org_id) VALUES (?, ?, ?, ?)', [u.user_id, u.username, 'General', oid]);
          } else if (u.role === 'organization') {
            await db.query('INSERT IGNORE INTO organization (user_id, name, location, license_number, government_approved) VALUES (?, ?, ?, ?, ?)', [u.user_id, u.username, 'Unknown', `TEMP-${u.user_id}`, 1]);
          }
        }
      }
    }
    console.log("Missing profiles fixed!");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

fixMissingProfiles();
