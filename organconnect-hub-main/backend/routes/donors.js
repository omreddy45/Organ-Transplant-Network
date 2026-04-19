import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Get all donors (potentially filter by status)
router.get('/', async (req, res) => {
  const { status } = req.query;
  try {
    let sql = 'SELECT d.*, u.email FROM Donor d JOIN Users u ON d.user_id = u.user_id';
    const params = [];
    if (status) {
      sql += ' WHERE d.donor_status = ?';
      params.push(status);
    }
    sql += ' ORDER BY d.donor_id DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve donor
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE Donor SET donor_status = 'approved' WHERE donor_id = ?", [id]);
    res.json({ message: 'Donor approved' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create pledge
router.post('/pledge', async (req, res) => {
  const { donor_id, org_id, organ_type } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO Donor_Pledge (donor_id, org_id, organ_type, status) VALUES (?, ?, ?, "pending")',
      [donor_id, org_id, organ_type]
    );
    res.json({ message: 'Pledge submitted', pledge_id: result.insertId });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pledges
router.get('/pledges', async (req, res) => {
  const { org_id, donor_id } = req.query;
  try {
    let sql = `
      SELECT p.*, d.name as donor_name, o.name as org_name 
      FROM Donor_Pledge p 
      JOIN Donor d ON p.donor_id = d.donor_id
      JOIN Organization o ON p.org_id = o.org_id
      WHERE 1=1
    `;
    const params = [];
    if (org_id) { sql += ' AND p.org_id = ?'; params.push(org_id); }
    if (donor_id) { sql += ' AND p.donor_id = ?'; params.push(donor_id); }
    sql += ' ORDER BY p.pledge_id DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve pledge (adds to Organ inventory securely)
router.post('/pledge/:id/approve', async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query("SELECT * FROM Donor_Pledge WHERE pledge_id = ?", [id]);
    if (!rows.length) throw new Error("Pledge not found");
    const pl = rows[0];

    // Check if donor is approved
    const [dRows] = await conn.query("SELECT donor_status FROM Donor WHERE donor_id = ?", [pl.donor_id]);
    if (dRows.length && dRows[0].donor_status !== 'approved') {
      throw new Error("Donor must be legally approved first before their pledge can enter the catalog.");
    }

    await conn.query("UPDATE Donor_Pledge SET status = 'approved' WHERE pledge_id = ?", [id]);
    
    // Add Organ 
    await conn.query(
      "INSERT INTO Organ (name, quantity, availability_status, donor_id, org_id) VALUES (?, 1, 'available', ?, ?)",
      [pl.organ_type, pl.donor_id, pl.org_id]
    );

    await conn.commit();
    res.json({ message: 'Pledge approved and organ added to inventory' });
  } catch(err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  } finally {
    conn.release();
  }
});

export default router;
