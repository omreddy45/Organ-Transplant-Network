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
               p.street, p.medical_insurance,
               MAX(a.visit_date) AS last_visit
        FROM Patient p
        JOIN Attends a ON p.patient_id = a.patient_id
        WHERE a.doctor_id = ?
        GROUP BY p.patient_id
        ORDER BY last_visit DESC
      `;
      params.push(doctor_id);
    } else if (patient_id) {
      sql = 'SELECT * FROM Patient WHERE patient_id = ?';
      params.push(patient_id);
    } else {
      sql = 'SELECT * FROM Patient ORDER BY name ASC';
    }

    const [rows] = await db.query(sql, params);

    // Attach phones
    for (const pat of rows) {
      const [phones] = await db.query('SELECT phone FROM Patient_Phone WHERE patient_id = ?', [pat.patient_id]);
      pat.phones = phones.map(p => p.phone);
    }

    return res.json(rows);
  } catch (err) {
    console.error('GET /api/patients error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
