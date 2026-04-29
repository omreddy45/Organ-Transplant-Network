import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Helper: load approved orgs fresh from disk (so edits take effect without restart)
function loadApprovedOrgs() {
  try {
    const filePath = join(__dirname, '..', 'data', 'approved_orgs.json');
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('⚠️ Could not load approved_orgs.json:', err.message);
    return [];
  }
}

// ──────────────────────────────────────────────
// POST /api/auth/signup
// ──────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const {
    name, username, email, password, role, dob,
    city, state, street, insurance,        // patient
    reason, phone, phoneNumber,            // donor / shared
    specialization, org_id,                // doctor
    orgName, location, license, head, joining, // organization
  } = req.body;

  const conn = await db.getConnection();
  try {
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const validRoles = ['patient', 'donor', 'doctor', 'organization'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Block public doctor signup — doctors must be created by organizations (Loophole #12)
    if (role === 'doctor' && !req.body._orgCreated) {
      return res.status(403).json({ error: 'Doctor accounts can only be created by organizations. Please ask your hospital to register you.' });
    }

    // ── Organization validation: check license against approved list ──
    if (role === 'organization') {
      if (!license || !location) {
        return res.status(400).json({ error: 'License number and location are required for organizations' });
      }
      const approvedOrgs = loadApprovedOrgs();
      const isApproved = approvedOrgs.some(
        (org) => org.license_number === license
      );
      if (!isApproved) {
        return res.status(403).json({
          error: 'Invalid license number. Only government-approved hospitals can register. Please contact the health ministry.'
        });
      }
    }

    // Check duplicate email — with role-aware guidance (Loophole #3 fix)
    const [existing] = await conn.query('SELECT user_id, role FROM Users WHERE email = ?', [email]);
    if (existing.length > 0) {
      const existingRole = existing[0].role;
      if (existingRole !== role) {
        return res.status(409).json({
          error: `This email is already registered as a "${existingRole}". To also register as a "${role}", please contact the system admin (admin@organconnect.com) to update your role.`
        });
      }
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Generate or validate username
    const uname = username || email.split('@')[0] + Math.floor(Math.random() * 1000);
    const [existingUser] = await conn.query('SELECT user_id FROM Users WHERE username = ?', [uname]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // ── Begin transaction for atomicity ──
    await conn.beginTransaction();

    // Insert into Users
    const [userResult] = await conn.query(
      'INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [uname, email, passwordHash, role]
    );
    const userId = userResult.insertId;

    // ── Insert into role-specific table ──
    if (role === 'patient') {
      if (!dob || !city || !state) {
        await conn.rollback();
        return res.status(400).json({ error: 'DOB, city, and state are required for patients' });
      }
      await conn.query(
        'INSERT INTO Patient (user_id, name, dob, street, city, state, medical_insurance) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, name, dob, street || null, city, state, insurance || null]
      );
      const [patientRows] = await conn.query('SELECT patient_id FROM Patient WHERE user_id = ?', [userId]);
      const ph = phoneNumber || phone;
      if (ph && patientRows.length > 0) {
        await conn.query('INSERT INTO Patient_Phone (patient_id, phone) VALUES (?, ?)', [patientRows[0].patient_id, ph]);
      }
    }

    if (role === 'donor') {
      if (!dob) {
        await conn.rollback();
        return res.status(400).json({ error: 'DOB is required for donors' });
      }
      await conn.query(
        'INSERT INTO Donor (user_id, name, dob, donation_reason) VALUES (?, ?, ?, ?)',
        [userId, name, dob, reason || null]
      );
      const [donorRows] = await conn.query('SELECT donor_id FROM Donor WHERE user_id = ?', [userId]);
      const ph = phoneNumber || phone;
      if (ph && donorRows.length > 0) {
        await conn.query('INSERT INTO Donor_Phone (donor_id, phone) VALUES (?, ?)', [donorRows[0].donor_id, ph]);
      }
    }

    if (role === 'doctor') {
      if (!specialization) {
        await conn.rollback();
        return res.status(400).json({ error: 'Specialization is required for doctors' });
      }
      // Validate that org_id exists
      const orgId = org_id || 1;
      const [orgCheck] = await conn.query('SELECT org_id FROM Organization WHERE org_id = ?', [orgId]);
      if (orgCheck.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Invalid organization ID' });
      }
      await conn.query(
        'INSERT INTO Doctor (user_id, name, specialization, org_id) VALUES (?, ?, ?, ?)',
        [userId, name, specialization, orgId]
      );
      const [docRows] = await conn.query('SELECT doctor_id FROM Doctor WHERE user_id = ?', [userId]);
      const ph = phoneNumber || phone;
      if (ph && docRows.length > 0) {
        await conn.query('INSERT INTO Doctor_Phone (doctor_id, phone) VALUES (?, ?)', [docRows[0].doctor_id, ph]);
      }
    }

    if (role === 'organization') {
      const oName = orgName || name;
      await conn.query(
        'INSERT INTO Organization (user_id, name, location, license_number, government_approved) VALUES (?, ?, ?, ?, ?)',
        [userId, oName, location, license, true]
      );
      const [orgRows] = await conn.query('SELECT org_id FROM Organization WHERE user_id = ?', [userId]);
      if (orgRows.length > 0) {
        const oid = orgRows[0].org_id;
        const ph = phoneNumber || phone;
        if (ph) {
          await conn.query('INSERT INTO Organization_Phone (org_id, phone) VALUES (?, ?)', [oid, ph]);
        }
      }
    }

    await conn.commit();

    return res.status(201).json({
      message: 'Account created successfully',
      user: { id: userId, email, role, name },
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* already committed or no transaction */ }
    console.error('Signup error:', err.message || err);
    console.error('Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Duplicate entry — email or username already exists' });
    }
    return res.status(500).json({ error: err.message ? `Registration failed: ${err.message}` : 'Failed to register account. Please try again later.' });
  } finally {
    conn.release();
  }
});

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'No account found with this email address. Please check your email or sign up.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again or reset your password.' });
    }

    // Get user's name + role-specific ID from their role table
    let name = user.username;
    let roleId = null;
    let orgId = null;

    try {
      if (user.role === 'admin') {
        name = 'System Admin';
        roleId = user.user_id;
      } else if (user.role === 'patient') {
        const [p] = await db.query('SELECT patient_id, name FROM Patient WHERE user_id = ?', [user.user_id]);
        if (p.length) { name = p[0].name; roleId = p[0].patient_id; }
      } else if (user.role === 'donor') {
        const [d] = await db.query('SELECT donor_id, name FROM Donor WHERE user_id = ?', [user.user_id]);
        if (d.length) { name = d[0].name; roleId = d[0].donor_id; }
      } else if (user.role === 'doctor') {
        const [d] = await db.query('SELECT doctor_id, name, org_id FROM Doctor WHERE user_id = ?', [user.user_id]);
        if (d.length) { name = d[0].name; roleId = d[0].doctor_id; orgId = d[0].org_id; }
      } else if (user.role === 'organization') {
        const [o] = await db.query('SELECT org_id, name FROM Organization WHERE user_id = ?', [user.user_id]);
        if (o.length) { 
          name = o[0].name; roleId = o[0].org_id; orgId = o[0].org_id; 
        } else {
          // Check if they are a Head
          const [h] = await db.query('SELECT org_id, name FROM Organization_Head WHERE user_id = ?', [user.user_id]);
          if (h.length) {
            name = h[0].name; roleId = h[0].org_id; orgId = h[0].org_id;
            user.role = 'head'; // override role in response payload so frontend routes to Head Dashboard
          }
        }
      }
    } catch (_) { /* use username as fallback */ }

    // Create session
    const sessionId = uuidv4();
    await db.query(
      'INSERT INTO Sessions (session_id, user_id) VALUES (?, ?)',
      [sessionId, user.user_id]
    );

    return res.json({
      message: 'Login successful',
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
        name,
        roleId,   // patient_id / donor_id / doctor_id / org_id
        orgId,    // org_id (for doctor and organization)
      },
      sessionId,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// POST /api/auth/logout
// ──────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const { sessionId } = req.body;
  try {
    if (sessionId) {
      await db.query('UPDATE Sessions SET logout_time = NOW() WHERE session_id = ?', [sessionId]);
    }
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// POST /api/auth/add-head
// ──────────────────────────────────────────────
router.post('/add-head', async (req, res) => {
  const { name, email, password, org_id, term_length } = req.body;
  if (!name || !email || !password || !org_id) return res.status(400).json({ error: "Missing fields" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ── Remove any existing head for this organization ──
    const [existingHeads] = await conn.query("SELECT user_id FROM Organization_Head WHERE org_id = ?", [org_id]);
    for (const h of existingHeads) {
      await conn.query("DELETE FROM Organization_Head WHERE user_id = ?", [h.user_id]);
      await conn.query("DELETE FROM Users WHERE user_id = ?", [h.user_id]);
    }

    const uname = email.split('@')[0] + Math.floor(Math.random() * 1000);
    const passwordHash = await bcrypt.hash(password, 10);
    const [userResult] = await conn.query(
      "INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, 'organization')",
      [uname, email, passwordHash]
    );
    const userId = userResult.insertId;

    await conn.query(
      "INSERT INTO Organization_Head (org_id, user_id, name, joining_date, term_length) VALUES (?, ?, ?, CURDATE(), ?)",
      [org_id, userId, name, term_length || 5]
    );

    await conn.commit();
    return res.status(201).json({ message: "Head account created successfully" });
  } catch (err) {
    try { await conn.rollback(); } catch (_) { }
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "Email or username already exists" });
    return res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

// ──────────────────────────────────────────────
// GET /api/auth/head/:org_id
// ──────────────────────────────────────────────
router.get('/head/:org_id', async (req, res) => {
  try {
    const [h] = await db.query('SELECT name FROM Organization_Head WHERE org_id = ?', [req.params.org_id]);
    if (h.length > 0) return res.json(h[0]);
    return res.status(404).json({ error: "Not found" });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// ──────────────────────────────────────────────
// GET /api/auth/org/:org_id
// ──────────────────────────────────────────────
router.get('/org/:org_id', async (req, res) => {
  try {
    const [o] = await db.query('SELECT name FROM Organization WHERE org_id = ?', [req.params.org_id]);
    if (o.length > 0) return res.json(o[0]);
    return res.status(404).json({ error: "Not found" });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// ──────────────────────────────────────────────
// GET /api/auth/approved-orgs — Public list
// ──────────────────────────────────────────────
router.get('/approved-orgs', (_req, res) => {
  return res.json(loadApprovedOrgs());
});

// ──────────────────────────────────────────────
// DELETE /api/auth/head/:org_id — Remove organization head (Loophole #7)
// ──────────────────────────────────────────────
router.delete('/head/:org_id', async (req, res) => {
  const { org_id } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [heads] = await conn.query('SELECT user_id FROM Organization_Head WHERE org_id = ?', [org_id]);
    if (!heads.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'No head found for this organization' });
    }
    for (const h of heads) {
      await conn.query('DELETE FROM Organization_Head WHERE user_id = ?', [h.user_id]);
      await conn.query('DELETE FROM Users WHERE user_id = ?', [h.user_id]);
    }
    await conn.commit();
    return res.json({ message: 'Head account removed successfully' });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('DELETE head error:', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

export default router;
