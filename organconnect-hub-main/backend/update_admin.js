import db from './db.js';
import bcrypt from 'bcryptjs';

async function updateAdmin() {
  try {
    const hash = await bcrypt.hash('admin@gmail.com', 10);
    // Delete existing admin
    await db.query("DELETE FROM users WHERE role = 'admin'");
    
    // Insert new admin
    await db.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES ('admin', 'admin@gmail.com', ?, 'admin')",
      [hash]
    );
    console.log('✅ Updated admin account to admin@gmail.com');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
updateAdmin();
