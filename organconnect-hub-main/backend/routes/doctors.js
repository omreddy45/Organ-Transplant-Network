import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ──────────────────────────────────────────────
// GET /api/doctors — List doctors
// Query: ?org_id= | ?doctor_id=
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { org_id, doctor_id } = req.query;

  try {
    let sql = `
      SELECT d.doctor_id, d.user_id, d.name, d.specialization,
             d.availability_status, d.org_id,
             org.name AS organization_name
      FROM doctor d
      JOIN organization org ON d.org_id = org.org_id
      WHERE 1=1
    `;
    const params = [];

    if (org_id) { sql += ' AND d.org_id = ?'; params.push(org_id); }
    if (doctor_id) { sql += ' AND d.doctor_id = ?'; params.push(doctor_id); }

    sql += ' ORDER BY d.name ASC';

    const [rows] = await db.query(sql, params);

    // Attach phones and last visit date for each doctor
    for (const doc of rows) {
      const [phones] = await db.query('SELECT phone FROM doctor_phone WHERE doctor_id = ?', [doc.doctor_id]);
      doc.phones = phones.map(p => p.phone);

      const [visits] = await db.query(
        'SELECT MAX(visit_date) AS last_visit FROM attends WHERE doctor_id = ?',
        [doc.doctor_id]
      );
      doc.last_visit = visits[0]?.last_visit || null;
    }

    return res.json(rows);
  } catch (err) {
    console.error('GET /api/doctors error:', err);
    return res.status(500).json({ error: `Failed to load doctors list: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// PUT /api/doctors/:id/status — Update availability
// ──────────────────────────────────────────────
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { availability_status } = req.body;

  const valid = ['available', 'busy', 'on_leave'];
  if (!valid.includes(availability_status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: available, busy, or on_leave' });
  }

  try {
    await db.query('UPDATE doctor SET availability_status = ? WHERE doctor_id = ?', [availability_status, id]);
    return res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('PUT /api/doctors/:id/status error:', err);
    return res.status(500).json({ error: `Failed to UPDATE doctor status: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// GET /api/doctors/:id/schedule — Weekly visits
// ──────────────────────────────────────────────
router.get('/:id/schedule', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT a.visit_date, a.patient_id, p.name AS patient_name
      FROM attends a
      JOIN patient p ON a.patient_id = p.patient_id
      WHERE a.doctor_id = ?
      ORDER BY a.visit_date DESC
      LIMIT 30
    `, [id]);

    return res.json(rows);
  } catch (err) {
    console.error('GET /api/doctors/:id/schedule error:', err);
    return res.status(500).json({ error: `Failed to load schedule: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// POST /api/doctors/visit — Book a visit
// ──────────────────────────────────────────────
router.post('/visit', async (req, res) => {
  const { doctor_id, patient_id, visit_date } = req.body;

  if (!doctor_id || !patient_id || !visit_date) {
    return res.status(400).json({ error: 'Missing required fields: doctor_id, patient_id, and visit_date are required.' });
  }

  try {
    await db.query(
      'INSERT INTO attends (doctor_id, patient_id, visit_date) VALUES (?, ?, ?)',
      [doctor_id, patient_id, visit_date]
    );
    return res.status(201).json({ message: 'Visit booked' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Visit already exists for this date' });
    }
    console.error('POST /api/doctors/visit error:', err);
    return res.status(500).json({ error: `Failed to book visit: ${err.message}` });
  }
});
// ──────────────────────────────────────────────
// DELETE /api/doctors/:id — Remove a doctor (Loophole #7 fix)
// ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Get doctor's user_id first
    const [docRows] = await db.query('SELECT user_id FROM doctor WHERE doctor_id = ?', [id]);
    if (!docRows.length) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    const userId = docRows[0].user_id;
    // Delete FROM users table — cascade will remove Doctor record
    await db.query('DELETE FROM users WHERE user_id = ?', [userId]);
    return res.json({ message: 'Doctor removed successfully' });
  } catch (err) {
    console.error('DELETE /api/doctors/:id error:', err);
    return res.status(500).json({ error: `Failed to remove doctor: ${err.message}` });
  }
});

export default router;
