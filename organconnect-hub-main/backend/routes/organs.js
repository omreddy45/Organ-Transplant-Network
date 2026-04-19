import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ──────────────────────────────────────────────
// GET /api/organs/stats — Counts for landing page
// MUST be before /:id routes
// ──────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [donors] = await db.query('SELECT COUNT(*) AS count FROM Donor');
    const [organs] = await db.query("SELECT COUNT(*) AS count FROM Organ WHERE availability_status = 'available'");
    const [transplants] = await db.query("SELECT COUNT(*) AS count FROM Transplant WHERE status = 'completed'");
    const [orgs] = await db.query('SELECT COUNT(*) AS count FROM Organization');

    return res.json({
      donors: donors[0].count,
      availableOrgans: organs[0].count,
      completedTransplants: transplants[0].count,
      organizations: orgs[0].count,
    });
  } catch (err) {
    console.error('GET /api/organs/stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// GET /api/organs/organizations — List all registered hospitals
// ──────────────────────────────────────────────
router.get('/organizations', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT org_id, name, location FROM Organization ORDER BY name ASC');
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/organs/organizations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// GET /api/organs/inventory — Org-specific inventory
// ──────────────────────────────────────────────
router.get('/inventory', async (req, res) => {
  const { org_id } = req.query;

  try {
    let sql = `
      SELECT o.organ_id, o.name, o.quantity, o.availability_status,
             o.donor_id, o.org_id,
             org.name AS organization_name, org.location
      FROM Organ o
      JOIN Organization org ON o.org_id = org.org_id
    `;
    const params = [];

    if (org_id) {
      sql += ' WHERE o.org_id = ?';
      params.push(org_id);
    }

    sql += ' ORDER BY o.organ_id DESC';

    const [rows] = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/organs/inventory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// GET /api/organs — Public organ catalog
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { type, status, location, search } = req.query;

  try {
    let sql = `
      SELECT o.organ_id, o.name, o.quantity, o.availability_status,
             o.donor_id, o.org_id,
             org.name AS organization_name, org.location
      FROM Organ o
      JOIN Organization org ON o.org_id = org.org_id
      WHERE 1=1
    `;
    const params = [];

    if (type) { sql += ' AND o.name = ?'; params.push(type); }
    if (status) { sql += ' AND o.availability_status = ?'; params.push(status); }
    if (location) { sql += ' AND org.location = ?'; params.push(location); }
    if (search) { sql += ' AND o.name LIKE ?'; params.push(`%${search}%`); }

    sql += ' ORDER BY o.availability_status ASC, o.organ_id DESC';

    const [rows] = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/organs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// POST /api/organs/add — Add organ to inventory
// ──────────────────────────────────────────────
router.post('/add', async (req, res) => {
  const { name, quantity, donor_id, org_id, availability_status } = req.body;

  try {
    if (!name || !org_id) {
      return res.status(400).json({ error: 'Organ name and org_id are required' });
    }

    const [result] = await db.query(
      'INSERT INTO Organ (name, quantity, availability_status, donor_id, org_id) VALUES (?, ?, ?, ?, ?)',
      [name, quantity || 1, availability_status || 'available', donor_id || null, org_id]
    );

    return res.status(201).json({
      message: 'Organ added',
      organ_id: result.insertId,
    });
  } catch (err) {
    console.error('POST /api/organs/add error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// PUT /api/organs/:id — Update organ
// ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, quantity, availability_status, donor_id } = req.body;

  try {
    const fields = [];
    const params = [];

    if (name) { fields.push('name = ?'); params.push(name); }
    if (quantity !== undefined) { fields.push('quantity = ?'); params.push(quantity); }
    if (availability_status) { fields.push('availability_status = ?'); params.push(availability_status); }
    if (donor_id !== undefined) { fields.push('donor_id = ?'); params.push(donor_id || null); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await db.query(`UPDATE Organ SET ${fields.join(', ')} WHERE organ_id = ?`, params);

    return res.json({ message: 'Organ updated' });
  } catch (err) {
    console.error('PUT /api/organs/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/organs/:id — Delete organ
// ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM Organ WHERE organ_id = ?', [id]);
    return res.json({ message: 'Organ deleted' });
  } catch (err) {
    console.error('DELETE /api/organs/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
