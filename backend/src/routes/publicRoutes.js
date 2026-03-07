// backend/routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Adjust path to your database config

// 1. Get Public Zones
router.get('/zones', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT zone_id, zone_name, boundaries, zone_color 
       FROM zones 
       WHERE is_archived = false`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching public zones' });
  }
});

// 2. Get Public Bins (Only safe data, no collector info needed)
router.get('/bins', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         bin_id, 
         bin_name, 
         ST_X(location::geometry) as longitude, 
         ST_Y(location::geometry) as latitude, 
         zone_id, 
         collection_status, 
         last_collected_timestamp 
       FROM waste_bins`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching public bins' });
  }
});

// 3. Get Public Reports (Hiding reporter details for privacy)
router.get('/reports', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         report_id, 
         issue_type, 
         ST_X(location_coords::geometry) as longitude, 
         ST_Y(location_coords::geometry) as latitude, 
         status, 
         created_at, 
         resolved_at 
       FROM citizen_reports 
       WHERE is_archived = false`
    );
    
    // We send back an object with a 'reports' array to match your frontend logic
    res.json({ reports: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching public reports' });
  }
});

module.exports = router;