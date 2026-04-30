import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';

const router = Router();

// ──────────────────────────────────────────────
// GET /api/admin/stats — Admin dashboard overview
// ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [users] = await db.query('SELECT COUNT(*) AS count FROM users');
    const [orgs] = await db.query('SELECT COUNT(*) AS count FROM organization');
    const [donors] = await db.query('SELECT COUNT(*) AS count FROM donor');
    const [patients] = await db.query('SELECT COUNT(*) AS count FROM patient');
    const [doctors] = await db.query('SELECT COUNT(*) AS count FROM doctor');
    const [organs] = await db.query("SELECT COUNT(*) AS count FROM organ WHERE availability_status = 'available'");
    const [transplants] = await db.query("SELECT COUNT(*) AS count FROM transplant WHERE status = 'completed'");
    const [pendingDonors] = await db.query("SELECT COUNT(*) AS count FROM donor WHERE donor_status = 'pending'");
    const [pendingRequests] = await db.query("SELECT COUNT(*) AS count FROM match_request WHERE status = 'pending'");

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
      FROM users u
      LEFT JOIN patient p ON p.user_id = u.user_id
      LEFT JOIN donor d ON d.user_id = u.user_id
      LEFT JOIN doctor doc ON doc.user_id = u.user_id
      LEFT JOIN organization o ON o.user_id = u.user_id
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
    const [check] = await db.query('SELECT role FROM users WHERE user_id = ?', [id]);
    if (!check.length) return res.status(404).json({ error: 'User not found' });
    if (check[0].role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts from here' });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      if (check[0].role === 'organization') {
        const [orgs] = await conn.query('SELECT org_id FROM organization WHERE user_id = ?', [id]);
        if (orgs.length > 0) {
          const orgId = orgs[0].org_id;
          // Delete all users who are doctors for this org
          await conn.query(`
            DELETE FROM users 
            WHERE user_id IN (SELECT user_id FROM doctor WHERE org_id = ?)
          `, [orgId]);
          // Delete the organization head user
          await conn.query(`
            DELETE FROM users 
            WHERE user_id IN (SELECT user_id FROM Organization_Head WHERE org_id = ?)
          `, [orgId]);
        }
      }

      await conn.query('DELETE FROM users WHERE user_id = ?', [id]);
      
      await conn.commit();
      return res.json({ message: 'User deleted successfully' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
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
             (SELECT COUNT(*) FROM doctor d WHERE d.org_id = o.org_id) AS doctor_count,
             (SELECT COUNT(*) FROM organ org WHERE org.org_id = o.org_id) AS organ_count,
             (SELECT COUNT(*) FROM transplant t WHERE t.org_id = o.org_id) AS transplant_count
      FROM organization o
      JOIN users u ON o.user_id = u.user_id
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
// When restoring a 'users' record, automatically restores all
// associated role-specific records (patient/donor/doctor/org/org_head)
// that were cascade-deleted alongside the user.
// ──────────────────────────────────────────────
router.post('/audit-log/:id/restore', async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM deleted_records_audit WHERE audit_id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Audit record not found' });
    
    const record = rows[0];
    let data;
    try {
      data = JSON.parse(record.record_data);
    } catch (e) {
      return res.status(400).json({ error: 'Stored data is not valid JSON, cannot restore' });
    }

    const table = record.table_name;

    // Helper: insert a parsed audit record into its table
    const insertRecord = async (connection, tableName, recordData) => {
      const keys = Object.keys(recordData).filter(k => recordData[k] !== 'null' && recordData[k] !== null && recordData[k] !== '');
      const values = keys.map(k => recordData[k]);

      if (tableName.toLowerCase() === 'users') {
        const idx = keys.findIndex(k => k.toLowerCase() === 'password_hash');
        const defaultHash = await bcrypt.hash('restored123', 10);
        if (idx === -1) {
          keys.push('password_hash');
          values.push(defaultHash);
        } else if (!values[idx]) {
          values[idx] = defaultHash;
        }
      }

      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
      await connection.query(sql, values);
    };

    await conn.beginTransaction();

    if (table.toLowerCase() === 'users') {
      // ── Step 1: Restore the users row first ──
      await insertRecord(conn, table, data);

      const userId = data.user_id;
      const role = data.role;

      // ── Step 2: Find and restore associated role-specific records ──
      // These were cascade-deleted and backed up by the role-specific triggers.
      // The restoration order matters: parent tables first (organization before org_head).
      const roleTableOrder = {
        patient:      ['patient'],
        donor:        ['donor'],
        doctor:       ['doctor'],
        organization: ['organization', 'organization_head'],
      };

      const tablesToRestore = roleTableOrder[role] || [];
      const restoredAuditIds = [id]; // Track all audit IDs to clean up

      for (const childTable of tablesToRestore) {
        // Find audit records for this table that belong to the deleted user
        const [childRows] = await conn.query(
          'SELECT * FROM deleted_records_audit WHERE table_name = ? ORDER BY audit_id ASC',
          [childTable]
        );

        for (const childRecord of childRows) {
          let childData;
          try {
            childData = JSON.parse(childRecord.record_data);
          } catch (_) {
            continue; // Skip unparseable records
          }

          // Match by user_id in the stored record data
          if (String(childData.user_id) === String(userId)) {
            try {
              await insertRecord(conn, childTable, childData);
              restoredAuditIds.push(childRecord.audit_id);
            } catch (insertErr) {
              // If it's a duplicate (already restored), just skip and still clean up audit
              if (insertErr.code === 'ER_DUP_ENTRY') {
                restoredAuditIds.push(childRecord.audit_id);
              } else {
                throw insertErr;
              }
            }
          }
        }
      }

      // ── Step 3: Clean up all restored audit records ──
      if (restoredAuditIds.length > 0) {
        const placeholders = restoredAuditIds.map(() => '?').join(',');
        await conn.query(
          `DELETE FROM deleted_records_audit WHERE audit_id IN (${placeholders})`,
          restoredAuditIds
        );
      }
    } else {
      // Non-users table: restore just this single record as before
      await insertRecord(conn, table, data);
      await conn.query('DELETE FROM deleted_records_audit WHERE audit_id = ?', [id]);
    }

    await conn.commit();
    return res.json({ message: 'Record restored successfully' });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('POST /api/admin/audit-log/:id/restore error:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
       return res.status(409).json({ error: 'Cannot restore: associated parent records (like User or Hospital) no longer exist.' });
    }
    if (err.code === 'ER_DUP_ENTRY') {
       return res.status(409).json({ error: 'Cannot restore: A record with this ID already exists.' });
    }
    return res.status(500).json({ error: `Failed to restore record: ${err.message}` });
  } finally {
    conn.release();
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
