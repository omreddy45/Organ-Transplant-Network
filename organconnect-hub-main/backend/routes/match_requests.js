import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Create new match request (Patient)
router.post('/', async (req, res) => {
  const { patient_id, organ_type, urgency_level } = req.body;
  try {
    // Check for existing active request
    const [existing] = await db.query(
      "SELECT * FROM Match_Request WHERE patient_id = ? AND organ_type = ? AND status IN ('pending', 'matched')",
      [patient_id, organ_type]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: `You already have an active request for a ${organ_type}.` });
    }

    const [result] = await db.query(
      "INSERT INTO Match_Request (patient_id, organ_type, urgency_level, status) VALUES (?, ?, ?, 'pending')",
      [patient_id, organ_type, urgency_level || 'normal']
    );
    res.json({ message: 'Request submitted', request_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Failed to submit match request: ${err.message}` });
  }
});

// List all requests (Hospital) or patient's requests (Patient)
router.get('/', async (req, res) => {
  const { patient_id, status } = req.query;
  try {
    let sql = `
      SELECT m.*, p.name as patient_name 
      FROM Match_Request m 
      JOIN Patient p ON m.patient_id = p.patient_id
      WHERE 1=1
    `;
    const params = [];
    if (patient_id) { sql += ' AND m.patient_id = ?'; params.push(patient_id); }
    if (status) { sql += ' AND m.status = ?'; params.push(status); }
    sql += ' ORDER BY m.request_id DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch(err) {
    res.status(500).json({ error: `Failed to load match requests: ${err.message}` });
  }
});

// Hospital assigns organ to request
router.post('/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { organ_id, doctor_id, org_id } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get Match Request
    const [reqs] = await conn.query("SELECT * FROM Match_Request WHERE request_id = ?", [id]);
    if (!reqs.length) throw new Error("Request not found");
    const mReq = reqs[0];
    if (mReq.status !== 'pending') throw new Error("Request already assigned/completed");

    // 2. Update Match Request to matched
    await conn.query("UPDATE Match_Request SET status = 'matched' WHERE request_id = ?", [id]);

    // 2.5 Check Organ availability
    const [organs] = await conn.query("SELECT availability_status FROM Organ WHERE organ_id = ?", [organ_id]);
    if (!organs.length) throw new Error("Organ not found");
    if (organs[0].availability_status !== 'available') throw new Error("Organ is already reserved or transplanted");

    // 3. Update Organ to 'reserved'
    await conn.query("UPDATE Organ SET availability_status = 'reserved' WHERE organ_id = ?", [organ_id]);

    // 4. Create Transplant record with status 'pending'
    await conn.query(
      "INSERT INTO Transplant (transplant_date, status, bill_amount, patient_id, doctor_id, organ_id, org_id) VALUES (CURDATE(), 'pending', 0, ?, ?, ?, ?)",
      [mReq.patient_id, doctor_id, organ_id, org_id]
    );

    // 5. Auto-schedule a medical visit to inform patient and doctor
    await conn.query(
      "INSERT IGNORE INTO attends (doctor_id, patient_id, visit_date) VALUES (?, ?, CURDATE())",
      [doctor_id, mReq.patient_id]
    );

    await conn.commit();
    res.json({ message: 'Organ successfully assigned' });
  } catch(err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to assign organ to patient. Please try again.' });
  } finally {
    conn.release();
  }
});

// Reject match request
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE Match_Request SET status = 'rejected' WHERE request_id = ?", [id]);
    res.json({ message: 'Request rejected' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: `Failed to reject match request: ${err.message}` });
  }
});

// Delete pending match request
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT status FROM Match_Request WHERE request_id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: 'Request not found' });
    if (rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be deleted.' });
    }
    await db.query("DELETE FROM Match_Request WHERE request_id = ?", [id]);
    res.json({ message: 'Request deleted successfully' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: `Failed to delete match request: ${err.message}` });
  }
});

export default router;
