import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';

const router = Router();

// ──────────────────────────────────────────────
// GET /api/profile?user_id=
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const [users] = await db.query('SELECT user_id, username, email, role, created_at FROM Users WHERE user_id = ?', [user_id]);
    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];
    let profile = {};
    let phones = [];

    if (user.role === 'patient') {
      const [rows] = await db.query('SELECT * FROM Patient WHERE user_id = ?', [user_id]);
      if (rows.length) {
        profile = rows[0];
        const [ph] = await db.query('SELECT phone FROM Patient_Phone WHERE patient_id = ?', [rows[0].patient_id]);
        phones = ph.map(p => p.phone);
      }
    } else if (user.role === 'donor') {
      const [rows] = await db.query('SELECT * FROM Donor WHERE user_id = ?', [user_id]);
      if (rows.length) {
        profile = rows[0];
        const [ph] = await db.query('SELECT phone FROM Donor_Phone WHERE donor_id = ?', [rows[0].donor_id]);
        phones = ph.map(p => p.phone);
      }
    } else if (user.role === 'doctor') {
      const [rows] = await db.query(`
        SELECT d.*, org.name AS organization_name
        FROM Doctor d
        JOIN Organization org ON d.org_id = org.org_id
        WHERE d.user_id = ?
      `, [user_id]);
      if (rows.length) {
        profile = rows[0];
        const [ph] = await db.query('SELECT phone FROM Doctor_Phone WHERE doctor_id = ?', [rows[0].doctor_id]);
        phones = ph.map(p => p.phone);
      }
    } else if (user.role === 'organization') {
      const [rows] = await db.query('SELECT * FROM Organization WHERE user_id = ?', [user_id]);
      if (rows.length) {
        profile = rows[0];
        const [ph] = await db.query('SELECT phone FROM Organization_Phone WHERE org_id = ?', [rows[0].org_id]);
        phones = ph.map(p => p.phone);
        // Get org head info
        const [head] = await db.query('SELECT * FROM Organization_Head WHERE org_id = ?', [rows[0].org_id]);
        if (head.length) profile.head = head[0];
      }
    }

    return res.json({ ...user, ...profile, phones });
  } catch (err) {
    console.error('GET /api/profile error:', err);
    return res.status(500).json({ error: `Failed to load profile: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// PUT /api/profile/update
// ──────────────────────────────────────────────
router.put('/update', async (req, res) => {
  const { user_id, name, email, phones, ...extra } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    // Update email in Users if changed
    if (email) {
      await db.query('UPDATE Users SET email = ? WHERE user_id = ?', [email, user_id]);
    }

    // Get user role
    const [users] = await db.query('SELECT role FROM Users WHERE user_id = ?', [user_id]);
    if (!users.length) return res.status(404).json({ error: 'User not found' });
    const { role } = users[0];

    if (role === 'patient') {
      const fields = [];
      const params = [];
      if (name) { fields.push('name = ?'); params.push(name); }
      if (extra.city) { fields.push('city = ?'); params.push(extra.city); }
      if (extra.state) { fields.push('state = ?'); params.push(extra.state); }
      if (extra.street) { fields.push('street = ?'); params.push(extra.street); }
      if (extra.insurance) { fields.push('medical_insurance = ?'); params.push(extra.insurance); }

      if (fields.length) {
        params.push(user_id);
        await db.query(`UPDATE Patient SET ${fields.join(', ')} WHERE user_id = ?`, params);
      }

      // Update phones
      if (phones) {
        const [pRows] = await db.query('SELECT patient_id FROM Patient WHERE user_id = ?', [user_id]);
        if (pRows.length) {
          await db.query('DELETE FROM Patient_Phone WHERE patient_id = ?', [pRows[0].patient_id]);
          for (const ph of phones) {
            await db.query('INSERT INTO Patient_Phone (patient_id, phone) VALUES (?, ?)', [pRows[0].patient_id, ph]);
          }
        }
      }
    }

    if (role === 'donor') {
      const fields = [];
      const params = [];
      if (name) { fields.push('name = ?'); params.push(name); }
      if (extra.reason) { fields.push('donation_reason = ?'); params.push(extra.reason); }

      if (fields.length) {
        params.push(user_id);
        await db.query(`UPDATE Donor SET ${fields.join(', ')} WHERE user_id = ?`, params);
      }

      if (phones) {
        const [dRows] = await db.query('SELECT donor_id FROM Donor WHERE user_id = ?', [user_id]);
        if (dRows.length) {
          await db.query('DELETE FROM Donor_Phone WHERE donor_id = ?', [dRows[0].donor_id]);
          for (const ph of phones) {
            await db.query('INSERT INTO Donor_Phone (donor_id, phone) VALUES (?, ?)', [dRows[0].donor_id, ph]);
          }
        }
      }
    }

    if (role === 'doctor') {
      const fields = [];
      const params = [];
      if (name) { fields.push('name = ?'); params.push(name); }
      if (extra.specialization) { fields.push('specialization = ?'); params.push(extra.specialization); }
      if (extra.availability_status) { fields.push('availability_status = ?'); params.push(extra.availability_status); }

      if (fields.length) {
        params.push(user_id);
        await db.query(`UPDATE Doctor SET ${fields.join(', ')} WHERE user_id = ?`, params);
      }

      if (phones) {
        const [docRows] = await db.query('SELECT doctor_id FROM Doctor WHERE user_id = ?', [user_id]);
        if (docRows.length) {
          await db.query('DELETE FROM Doctor_Phone WHERE doctor_id = ?', [docRows[0].doctor_id]);
          for (const ph of phones) {
            await db.query('INSERT INTO Doctor_Phone (doctor_id, phone) VALUES (?, ?)', [docRows[0].doctor_id, ph]);
          }
        }
      }
    }

    if (role === 'organization') {
      const fields = [];
      const params = [];
      if (name || extra.orgName) { fields.push('name = ?'); params.push(extra.orgName || name); }
      if (extra.location) { fields.push('location = ?'); params.push(extra.location); }
      if (extra.license) { fields.push('license_number = ?'); params.push(extra.license); }

      if (fields.length) {
        params.push(user_id);
        await db.query(`UPDATE Organization SET ${fields.join(', ')} WHERE user_id = ?`, params);
      }

      if (phones) {
        const [orgRows] = await db.query('SELECT org_id FROM Organization WHERE user_id = ?', [user_id]);
        if (orgRows.length) {
          await db.query('DELETE FROM Organization_Phone WHERE org_id = ?', [orgRows[0].org_id]);
          for (const ph of phones) {
            await db.query('INSERT INTO Organization_Phone (org_id, phone) VALUES (?, ?)', [orgRows[0].org_id, ph]);
          }
        }
      }
    }

    return res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('PUT /api/profile/update error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This email is already in use by another account.' });
    }
    return res.status(500).json({ error: `Failed to update profile: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// PUT /api/profile/password
// ──────────────────────────────────────────────
router.put('/password', async (req, res) => {
  const { user_id, currentPassword, newPassword } = req.body;

  if (!user_id || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Please provide your current password and new password.' });
  }

  try {
    const [users] = await db.query('SELECT password_hash FROM Users WHERE user_id = ?', [user_id]);
    if (!users.length) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE Users SET password_hash = ? WHERE user_id = ?', [hash, user_id]);

    return res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('PUT /api/profile/password error:', err);
    return res.status(500).json({ error: `Failed to change password: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/profile?user_id= — Delete account
// ──────────────────────────────────────────────
router.delete('/', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    // Check if user exists first
    const [check] = await db.query('SELECT role FROM Users WHERE user_id = ?', [user_id]);
    if (!check.length) {
      return res.status(404).json({ error: 'Account not found. It may have already been deleted.' });
    }
    // CASCADE in schema handles child rows
    await db.query('DELETE FROM Users WHERE user_id = ?', [user_id]);
    return res.json({ message: `Account (${check[0].role}) deleted successfully. All related records have been removed and backed up in the audit log.` });
  } catch (err) {
    console.error('DELETE /api/profile error:', err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Cannot delete account: it has active transplant records. Please contact the admin.' });
    }
    return res.status(500).json({ error: `Failed to delete account: ${err.message}` });
  }
});

export default router;
