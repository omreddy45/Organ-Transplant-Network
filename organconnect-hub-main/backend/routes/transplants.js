import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ──────────────────────────────────────────────
// GET /api/transplants/analytics — Org chart data
// MUST be before /:id
// ──────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  const { org_id } = req.query;

  try {
    let monthSql = `
      SELECT DATE_FORMAT(transplant_date, '%b') AS month,
             COUNT(*) AS transplants
      FROM Transplant
      WHERE transplant_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    `;
    const monthParams = [];
    if (org_id) { monthSql += ' AND org_id = ?'; monthParams.push(org_id); }
    monthSql += ' GROUP BY YEAR(transplant_date), MONTH(transplant_date) ORDER BY MIN(transplant_date)';

    const [monthly] = await db.query(monthSql, monthParams);

    let mixSql = 'SELECT name, SUM(quantity) AS value FROM Organ';
    const mixParams = [];
    if (org_id) { mixSql += ' WHERE org_id = ?'; mixParams.push(org_id); }
    mixSql += ' GROUP BY name';
    const [mix] = await db.query(mixSql, mixParams);

    const [growth] = await db.query(`
      SELECT DATE_FORMAT(u.created_at, '%b') AS month,
             COUNT(*) AS donors
      FROM Donor d
      JOIN Users u ON d.user_id = u.user_id
      WHERE u.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY YEAR(u.created_at), MONTH(u.created_at)
      ORDER BY MIN(u.created_at)
    `);

    return res.json({ monthly, mix, growth });
  } catch (err) {
    console.error('GET /api/transplants/analytics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// GET /api/transplants — includes donor info (Loopholes #1 & #4 fix)
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { patient_id, doctor_id, org_id, status, donor_id } = req.query;

  try {
    let sql = `
      SELECT t.transplant_id, t.transplant_date, t.status, t.bill_amount,
             t.patient_id, p.name AS patient_name, pu.email AS patient_email,
             t.doctor_id, d.name AS doctor_name,
             t.organ_id, o.name AS organ_name,
             o.donor_id, dn.name AS donor_name, du.email AS donor_email,
             t.org_id, org.name AS organization_name
      FROM Transplant t
      JOIN Patient p ON t.patient_id = p.patient_id
      JOIN Users pu ON p.user_id = pu.user_id
      JOIN Doctor d ON t.doctor_id = d.doctor_id
      JOIN Organ o ON t.organ_id = o.organ_id
      JOIN Organization org ON t.org_id = org.org_id
      LEFT JOIN Donor dn ON o.donor_id = dn.donor_id
      LEFT JOIN Users du ON dn.user_id = du.user_id
      WHERE 1=1
    `;
    const params = [];

    if (patient_id) { sql += ' AND t.patient_id = ?'; params.push(patient_id); }
    if (doctor_id) { sql += ' AND t.doctor_id = ?'; params.push(doctor_id); }
    if (org_id) { sql += ' AND t.org_id = ?'; params.push(org_id); }
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (donor_id) { sql += ' AND o.donor_id = ?'; params.push(donor_id); }

    sql += ' ORDER BY t.transplant_date DESC';

    const [rows] = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/transplants error:', err);
    return res.status(500).json({ error: `Failed to load transplant records: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// POST /api/transplants
// ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { transplant_date, patient_id, doctor_id, organ_id, org_id, bill_amount } = req.body;

  try {
    if (!transplant_date || !patient_id || !doctor_id || !organ_id || !org_id) {
      return res.status(400).json({ error: 'Missing required fields: transplant_date, patient_id, doctor_id, organ_id, and org_id are all required.' });
    }

    const [organs] = await db.query("SELECT availability_status FROM Organ WHERE organ_id = ?", [organ_id]);
    if (!organs.length) {
      return res.status(404).json({ error: 'Organ not found.' });
    }
    if (organs[0].availability_status !== 'available') {
      return res.status(409).json({ error: 'This organ is already reserved or transplanted. Each organ can only be used once.' });
    }

    const [result] = await db.query(
      `INSERT INTO Transplant (transplant_date, status, bill_amount, patient_id, doctor_id, organ_id, org_id)
       VALUES (?, 'pending', ?, ?, ?, ?, ?)`,
      [transplant_date, bill_amount || 0, patient_id, doctor_id, organ_id, org_id]
    );

    await db.query("UPDATE Organ SET availability_status = 'reserved' WHERE organ_id = ?", [organ_id]);

    return res.status(201).json({ message: 'Transplant record created', transplant_id: result.insertId });
  } catch (err) {
    console.error('POST /api/transplants error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This organ is already linked to another transplant. Each organ can only be used once.' });
    }
    return res.status(500).json({ error: `Failed to create transplant: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// PUT /api/transplants/:id
// ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, bill_amount } = req.body;

  try {
    const fields = [];
    const params = [];

    if (status) { fields.push('status = ?'); params.push(status); }
    if (bill_amount !== undefined) { 
      if (Number(bill_amount) < 0) return res.status(400).json({ error: 'Bill amount cannot be negative.' });
      fields.push('bill_amount = ?'); 
      params.push(bill_amount); 
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one field to update (status or bill_amount).' });
    }

    params.push(id);
    await db.query(`UPDATE Transplant SET ${fields.join(', ')} WHERE transplant_id = ?`, params);

    if (status === 'completed') {
      const [rows] = await db.query('SELECT organ_id FROM Transplant WHERE transplant_id = ?', [id]);
      if (rows.length) {
        await db.query("UPDATE Organ SET availability_status = 'transplanted' WHERE organ_id = ?", [rows[0].organ_id]);
      }
    }

    if (status === 'cancelled') {
      const [rows] = await db.query('SELECT organ_id FROM Transplant WHERE transplant_id = ?', [id]);
      if (rows.length) {
        await db.query("UPDATE Organ SET availability_status = 'available' WHERE organ_id = ?", [rows[0].organ_id]);
      }
    }

    return res.json({ message: 'Transplant updated' });
  } catch (err) {
    console.error('PUT /api/transplants/:id error:', err);
    return res.status(500).json({ error: `Failed to update transplant: ${err.message}` });
  }
});

export default router;
