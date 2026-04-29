import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';

const router = Router();

// ──────────────────────────────────────────────
// GET /api/admin/stats — Admin dashboard overview
// ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [users] = await db.query('SELECT COUNT(*) AS count FROM Users');
    const [orgs] = await db.query('SELECT COUNT(*) AS count FROM Organization');
    const [donors] = await db.query('SELECT COUNT(*) AS count FROM Donor');
    const [patients] = await db.query('SELECT COUNT(*) AS count FROM Patient');
    const [doctors] = await db.query('SELECT COUNT(*) AS count FROM Doctor');
    const [organs] = await db.query("SELECT COUNT(*) AS count FROM Organ WHERE availability_status = 'available'");
    const [transplants] = await db.query("SELECT COUNT(*) AS count FROM Transplant WHERE status = 'completed'");
    const [pendingDonors] = await db.query("SELECT COUNT(*) AS count FROM Donor WHERE donor_status = 'pending'");
    const [pendingRequests] = await db.query("SELECT COUNT(*) AS count FROM Match_Request WHERE status = 'pending'");

    return res.json({
      totalUsers: users[0].count,
      totalOrganizations: orgs[0].count,
      totalDonors: donors[0].count,
      totalPatients: patients[0].count,
      totalDoctors: doctors[0].count,
      availableOrgans: organs[0].count,
      completedTransplants: transplants[0].count,
      pendingDonors: pendingDonors[0].count,
      pendingRequests: pendingRequests[0].count,
    });
  } catch (err) {
    console.error('GET /api/admin/stats error:', err);
    return res.status(500).json({ error: `Failed to load admin stats: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// GET /api/admin/users — List all users with role info
// ──────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const { role, search } = req.query;
  try {
    let sql = `
      SELECT u.user_id, u.username, u.email, u.role, u.created_at,
             COALESCE(p.name, d.name, doc.name, o.name, oh.name) AS display_name
      FROM Users u
      LEFT JOIN Patient p ON p.user_id = u.user_id
      LEFT JOIN Donor d ON d.user_id = u.user_id
      LEFT JOIN Doctor doc ON doc.user_id = u.user_id
      LEFT JOIN Organization o ON o.user_id = u.user_id
      LEFT JOIN Organization_Head oh ON oh.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    if (role && role !== 'all') { sql += ' AND u.role = ?'; params.push(role); }
    if (search) { sql += ' AND (u.email LIKE ? OR u.username LIKE ? OR COALESCE(p.name, d.name, doc.name, o.name, oh.name) LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY u.created_at DESC LIMIT 200';
    const [rows] = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    return res.status(500).json({ error: `Failed to load users: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/admin/users/:id — Admin can delete any user
// ──────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Don't allow deleting other admins
    const [check] = await db.query('SELECT role FROM Users WHERE user_id = ?', [id]);
    if (!check.length) return res.status(404).json({ error: 'User not found' });
    if (check[0].role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts from here' });

    await db.query('DELETE FROM Users WHERE user_id = ?', [id]);
    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/admin/users/:id error:', err);
    return res.status(500).json({ error: `Failed to delete user: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// GET /api/admin/organizations — All orgs with details
// ──────────────────────────────────────────────
router.get('/organizations', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.org_id, o.name, o.location, o.license_number, o.government_approved,
             u.email, u.created_at,
             oh.name AS head_name,
             (SELECT COUNT(*) FROM Doctor d WHERE d.org_id = o.org_id) AS doctor_count,
             (SELECT COUNT(*) FROM Organ org WHERE org.org_id = o.org_id) AS organ_count,
             (SELECT COUNT(*) FROM Transplant t WHERE t.org_id = o.org_id) AS transplant_count
      FROM Organization o
      JOIN Users u ON o.user_id = u.user_id
      LEFT JOIN Organization_Head oh ON oh.org_id = o.org_id
      ORDER BY o.org_id DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/organizations error:', err);
    return res.status(500).json({ error: `Failed to load organizations: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// GET /api/admin/audit-log — View deleted records backup
// ──────────────────────────────────────────────
router.get('/audit-log', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM deleted_records_audit ORDER BY deleted_at DESC LIMIT 100'
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/audit-log error:', err);
    return res.status(500).json({ error: `Failed to load audit log: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// POST /api/admin/audit-log/:id/restore — Restore a deleted record
// ──────────────────────────────────────────────
router.post('/audit-log/:id/restore', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM deleted_records_audit WHERE audit_id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Audit record not found' });
    
    const record = rows[0];
    let data;
    try {
      data = JSON.parse(record.record_data);
    } catch (e) {
      return res.status(400).json({ error: 'Stored data is not valid JSON, cannot restore' });
    }

    const table = record.table_name;
    const keys = Object.keys(data).filter(k => data[k] !== 'null');
    const values = keys.map(k => data[k] === 'null' ? null : data[k]);
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    await db.query(sql, values);
    await db.query('DELETE FROM deleted_records_audit WHERE audit_id = ?', [id]);
    
    return res.json({ message: 'Record restored successfully' });
  } catch (err) {
    console.error('POST /api/admin/audit-log/:id/restore error:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
       return res.status(409).json({ error: 'Cannot restore: associated parent records (like User or Hospital) no longer exist.' });
    }
    if (err.code === 'ER_DUP_ENTRY') {
       return res.status(409).json({ error: 'Cannot restore: A record with this ID already exists.' });
    }
    return res.status(500).json({ error: `Failed to restore record: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// GET /api/admin/organ-limits — View biological organ limits
// ──────────────────────────────────────────────
router.get('/organ-limits', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM organ_limits ORDER BY organ_name');
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/organ-limits error:', err);
    return res.status(500).json({ error: `Failed to load organ limits: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// POST /api/admin/organ-limits — Add new biological organ limits
// ──────────────────────────────────────────────
router.post('/organ-limits', async (req, res) => {
  const { organ_name, max_donations, required_specialization, description } = req.body;
  if (!organ_name || !max_donations || !required_specialization) {
    return res.status(400).json({ error: 'organ_name, max_donations, and required_specialization are required' });
  }
  try {
    await db.query(
      'INSERT INTO organ_limits (organ_name, max_donations, required_specialization, description) VALUES (?, ?, ?, ?)',
      [organ_name, max_donations, required_specialization, description || '']
    );
    return res.status(201).json({ message: 'Organ limit added successfully' });
  } catch (err) {
    console.error('POST /api/admin/organ-limits error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Organ type already exists' });
    }
    return res.status(500).json({ error: `Failed to add organ limit: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/admin/organ-limits/:name — Remove an organ limit
// ──────────────────────────────────────────────
router.delete('/organ-limits/:name', async (req, res) => {
  try {
    const { name } = req.params;
    await db.query('DELETE FROM organ_limits WHERE organ_name = ?', [name]);
    return res.json({ message: 'Organ limit deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/admin/organ-limits/:name error:', err);
    // If there's a foreign key constraint violation (e.g. from an organ record)
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Cannot delete this organ type because there are existing inventory or pledge records linked to it.' });
    }
    return res.status(500).json({ error: `Failed to delete organ limit: ${err.message}` });
  }
});

export default router;
