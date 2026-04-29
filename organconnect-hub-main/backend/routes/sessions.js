import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ──────────────────────────────────────────────
// GET /api/sessions?org_id=<id>
// Returns login/logout history for all users belonging to an organization
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: 'org_id is required' });

  try {
    const [rows] = await db.query(
      `SELECT s.session_id,
              s.user_id,
              u.username,
              u.email,
              CASE
                WHEN oh.org_id IS NOT NULL THEN 'head'
                WHEN d.doctor_id IS NOT NULL THEN 'doctor'
                WHEN o.org_id IS NOT NULL THEN 'organization'
                ELSE u.role
              END AS role,
              COALESCE(oh.name, o.name, d.name, u.username) AS display_name,
              s.login_time,
              s.logout_time,
              CASE
                WHEN s.logout_time IS NULL THEN 'active'
                ELSE 'ended'
              END AS session_status,
              TIMESTAMPDIFF(MINUTE, s.login_time, COALESCE(s.logout_time, NOW())) AS duration_minutes
       FROM Sessions s
       JOIN Users u ON s.user_id = u.user_id
       LEFT JOIN Organization o ON o.user_id = u.user_id AND o.org_id = ?
       LEFT JOIN Doctor d ON d.user_id = u.user_id AND d.org_id = ?
       LEFT JOIN Organization_Head oh ON oh.user_id = u.user_id AND oh.org_id = ?
       WHERE o.org_id IS NOT NULL
          OR d.org_id IS NOT NULL
          OR oh.org_id IS NOT NULL
       ORDER BY s.login_time DESC
       LIMIT 100`,
      [org_id, org_id, org_id]
    );

    // Summary stats
    const activeSessions = rows.filter(r => r.session_status === 'active').length;
    const totalSessions = rows.length;
    const uniqueUsers = new Set(rows.map(r => r.user_id)).size;

    return res.json({
      sessions: rows,
      stats: {
        total: totalSessions,
        active: activeSessions,
        uniqueUsers,
      },
    });
  } catch (err) {
    console.error('Sessions fetch error:', err);
    return res.status(500).json({ error: `Failed to load session history: ${err.message}` });
  }
});

export default router;
