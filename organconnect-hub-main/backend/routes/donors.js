import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Get all donors (potentially filter by status)
router.get('/', async (req, res) => {
  const { status } = req.query;
  try {
    let sql = 'SELECT d.*, u.email FROM donor d JOIN users u ON d.user_id = u.user_id';
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
    res.status(500).json({ error: `Failed to load donors list: ${err.message}` });
  }
});

// Approve donor
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE donor SET donor_status = 'approved' WHERE donor_id = ?", [id]);
    res.json({ message: 'Donor approved' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: `Failed to approve donor: ${err.message}` });
  }
});

// Reject donor
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE donor SET donor_status = 'rejected' WHERE donor_id = ?", [id]);
    res.json({ message: 'Donor rejected' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: `Failed to reject donor: ${err.message}` });
  }
});

// Create pledge — with biological organ limit check (Loophole #2 fix)
router.post('/pledge', async (req, res) => {
  const { donor_id, org_id, organ_type } = req.body;
  try {
    // Check biological organ donation limit
    const [limitRows] = await db.query(
      'SELECT max_donations FROM organ_limits WHERE organ_name = ?',
      [organ_type]
    );
    const maxAllowed = limitRows.length > 0 ? limitRows[0].max_donations : 1;

    // Count existing approved + pending pledges for this donor and organ type
    const [countRows] = await db.query(
      "SELECT COUNT(*) AS cnt FROM donor_pledge WHERE donor_id = ? AND organ_type = ? AND status IN ('approved', 'pending')",
      [donor_id, organ_type]
    );
    const currentCount = countRows[0].cnt;

    if (currentCount >= maxAllowed) {
      return res.status(400).json({
        error: `Donation limit reached. Humans can donate "${organ_type}" a maximum of ${maxAllowed} time(s). You already have ${currentCount} active/approved pledge(s).`
      });
    }

    const [result] = await db.query(
      'INSERT INTO donor_pledge (donor_id, org_id, organ_type, status) VALUES (?, ?, ?, "pending")',
      [donor_id, org_id, organ_type]
    );
    res.json({ message: 'Pledge submitted', pledge_id: result.insertId });
  } catch(err) {
    console.error(err);
    if (err.sqlState === '45000') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: `Failed to create pledge: ${err.message}` });
  }
});

// Get pledges
router.get('/pledges', async (req, res) => {
  const { org_id, donor_id } = req.query;
  try {
    let sql = `
      SELECT p.*, d.name as donor_name, u.email as donor_email, o.name as org_name 
      FROM donor_pledge p 
      JOIN donor d ON p.donor_id = d.donor_id
      JOIN users u ON d.user_id = u.user_id
      JOIN organization o ON p.org_id = o.org_id
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
    res.status(500).json({ error: `Failed to load pledges: ${err.message}` });
  }
});

// Approve pledge (adds to Organ inventory securely)
router.post('/pledge/:id/approve', async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query("SELECT * FROM donor_pledge WHERE pledge_id = ?", [id]);
    if (!rows.length) throw new Error("Pledge not found");
    const pl = rows[0];

    // Automatically approve donor when their pledge is accepted
    const [dRows] = await conn.query("SELECT donor_status FROM donor WHERE donor_id = ?", [pl.donor_id]);
    if (dRows.length && dRows[0].donor_status !== 'approved') {
      await conn.query("UPDATE donor SET donor_status = 'approved' WHERE donor_id = ?", [pl.donor_id]);
    }

    await conn.query("UPDATE donor_pledge SET status = 'approved' WHERE pledge_id = ?", [id]);
    
    // Add Organ 
    await conn.query(
      "INSERT INTO organ (name, quantity, availability_status, donor_id, org_id) VALUES (?, 1, 'available', ?, ?)",
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

// Reject pledge
router.post('/pledge/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE donor_pledge SET status = 'rejected' WHERE pledge_id = ?", [id]);
    res.json({ message: 'Pledge rejected' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: `Failed to reject pledge: ${err.message}` });
  }
});

export default router;
