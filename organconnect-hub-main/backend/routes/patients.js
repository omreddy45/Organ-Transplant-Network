import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ──────────────────────────────────────────────
// GET /api/patients — List patients
// Query: ?doctor_id= (patients attended by a doctor) | ?patient_id=
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { doctor_id, patient_id } = req.query;

  try {
    let sql, params = [];

    if (doctor_id) {
      // Patients attended by this doctor
      sql = `
        SELECT DISTINCT p.patient_id, p.name, p.dob, p.city, p.state,
               p.street, p.medical_insurance, u.email,
               MAX(a.visit_date) AS last_visit
        FROM patient p
        JOIN Attends a ON p.patient_id = a.patient_id
        JOIN users u ON p.user_id = u.user_id
        WHERE a.doctor_id = ?
        GROUP BY p.patient_id, p.name, p.dob, p.city, p.state, p.street, p.medical_insurance, u.email
        ORDER BY last_visit DESC
      `;
      params.push(doctor_id);
    } else if (patient_id) {
      sql = 'SELECT p.*, u.email FROM patient p JOIN users u ON p.user_id = u.user_id WHERE p.patient_id = ?';
      params.push(patient_id);
    } else {
      sql = 'SELECT p.*, u.email FROM patient p JOIN users u ON p.user_id = u.user_id ORDER BY p.name ASC';
    }

    const [rows] = await db.query(sql, params);

    // Attach phones and medical history
    for (const pat of rows) {
      const [phones] = await db.query('SELECT phone FROM Patient_Phone WHERE patient_id = ?', [pat.patient_id]);
      pat.phones = phones.map(p => p.phone);

      const [history] = await db.query('SELECT history_id, medical_detail, record_date FROM medical_history WHERE patient_id = ? ORDER BY record_date DESC', [pat.patient_id]);
      pat.medical_history = history;
    }

    return res.json(rows);
  } catch (err) {
    console.error('GET /api/patients error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// GET /api/patients/:id/schedule — Scheduled visits
// ──────────────────────────────────────────────
router.get('/:id/schedule', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT a.visit_date, a.doctor_id, d.name AS doctor_name, org.name AS organization_name
      FROM Attends a
      JOIN doctor d ON a.doctor_id = d.doctor_id
      JOIN organization org ON d.org_id = org.org_id
      WHERE a.patient_id = ?
      ORDER BY a.visit_date DESC
    `, [id]);
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/patients/:id/schedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
