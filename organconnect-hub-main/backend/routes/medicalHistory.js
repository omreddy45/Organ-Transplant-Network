import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ──────────────────────────────────────────────
// GET /api/medical-history?patient_id=
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { patient_id } = req.query;

  if (!patient_id) {
    return res.status(400).json({ error: 'patient_id is required' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM medical_history WHERE patient_id = ? ORDER BY record_date DESC',
      [patient_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/medical-history error:', err);
    return res.status(500).json({ error: `Failed to load medical history: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// POST /api/medical-history/add
// ──────────────────────────────────────────────
router.post('/add', async (req, res) => {
  const { patient_id, medical_detail } = req.body;

  if (!patient_id || !medical_detail) {
    return res.status(400).json({ error: 'Missing required fields: patient_id and medical_detail are both required.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO medical_history (patient_id, medical_detail) VALUES (?, ?)',
      [patient_id, medical_detail]
    );

    return res.status(201).json({
      message: 'Record added',
      history_id: result.insertId,
      record_date: new Date().toISOString(),
    });
  } catch (err) {
    console.error('POST /api/medical-history/add error:', err);
    return res.status(500).json({ error: `Failed to add medical record: ${err.message}` });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/medical-history/:id
// ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM medical_history WHERE history_id = ?', [id]);
    return res.json({ message: 'Record deleted' });
  } catch (err) {
    console.error('DELETE /api/medical-history/:id error:', err);
    return res.status(500).json({ error: `Failed to delete medical record: ${err.message}` });
  }
});

export default router;
