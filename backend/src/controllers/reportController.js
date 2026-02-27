const pool = require('../db'); // Matches your src/db.js path

const submitReport = async (req, res) => {
  const { 
    reporter_id, 
    issue_type, 
    issue_type_other, 
    description, 
    location_address, 
    latitude, 
    longitude 
  } = req.body;

  try {
    // Generate the path to save in the DB, matching your static route
    const photo_evidence_url = req.file ? `/uploads/reports/${req.file.filename}` : null;

    const query = `
      INSERT INTO citizen_reports (
        reporter_id, 
        issue_type, 
        issue_type_other, 
        description, 
        location_address, 
        location_coords, 
        photo_evidence_url, 
        status, 
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, 
        ST_SetSRID(ST_MakePoint($6, $7), 4326), 
        $8, 
        'Pending', 
        CURRENT_TIMESTAMP
      ) RETURNING *;
    `;

    const values = [
      reporter_id,
      issue_type,       // Matches ENUM values
      issue_type_other, // Custom user input
      description,
      location_address,
      longitude,        // PostGIS X coordinate
      latitude,         // PostGIS Y coordinate
      photo_evidence_url
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Report and image saved successfully.',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


// --- 2. GET ALL REPORTS (For the FeedScreen) ---
// --- GET ALL REPORTS (Fixed for FeedScreen) ---
/*
const getAllReports = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.report_id,
        r.issue_type,
        r.issue_type_other,
        r.description,
        r.location_address,
        ST_Y(r.location_coords::geometry) as latitude,
        ST_X(r.location_coords::geometry) as longitude,
        r.photo_evidence_url,
        r.status,
        r.created_at,
        CONCAT(u.first_name, ' ', u.last_name) AS reporter_name, -- Merging First and Last Name
        u.profile_picture -- Including profile picture
      FROM citizen_reports r
      LEFT JOIN users u ON r.reporter_id = u.user_id
      ORDER BY r.created_at DESC;
    `;
    
    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      reports: result.rows
    });
  } catch (error) {
    console.error('Fetch Reports Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }

};
*/


// 2. Get All Reports (For Feed)
// 2. Get All Reports (For Feed and Admin)
const getAllReports = async (req, res) => {
    const currentUserId = req.user ? req.user.id : null; 

    try {
        const query = `
            SELECT 
                r.*,
                ST_Y(r.location_coords::geometry) as latitude,
                ST_X(r.location_coords::geometry) as longitude,
                CONCAT(u.first_name, ' ', u.last_name) AS reporter_name,
                u.profile_picture,
                u.contact_number AS contact_number, -- ✅ FETCHING DIRECTLY FROM USERS TABLE
                (SELECT COUNT(*) FROM report_attention ra WHERE ra.report_id = r.report_id) AS attention_count,
                CAST(EXISTS (
                    SELECT 1 FROM report_attention 
                    WHERE report_id = r.report_id AND user_id = $1
                ) AS BOOLEAN) AS has_attended
            FROM citizen_reports r
            LEFT JOIN users u ON r.reporter_id = u.user_id -- ✅ THE JOIN LOGIC
            WHERE r.is_archived = false -- ✅ FILTER OUT ARCHIVED REPORTS
            ORDER BY r.created_at DESC;
        `;
        
        const result = await pool.query(query, [currentUserId]);
        res.status(200).json({ success: true, reports: result.rows });
    } catch (error) {
        console.error("Fetch reports error:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// 3. Toggle Attention Button
const toggleAttention = async (req, res) => {
    const { report_id, user_id } = req.body;
    try {
        const check = await pool.query(
            "SELECT * FROM report_attention WHERE report_id = $1 AND user_id = $2",
            [report_id, user_id]
        );

        if (check.rows.length > 0) {
            await pool.query("DELETE FROM report_attention WHERE report_id = $1 AND user_id = $2", [report_id, user_id]);
            res.json({ success: true, action: 'removed' });
        } else {
            await pool.query("INSERT INTO report_attention (report_id, user_id) VALUES ($1, $2)", [report_id, user_id]);
            res.json({ success: true, action: 'added' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateReportStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const query = `
            UPDATE citizen_reports 
            SET status = $1 
            WHERE report_id = $2 
            RETURNING *;
        `;
        const result = await pool.query(query, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        res.status(200).json({ success: true, report: result.rows[0] });
    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 5. Delete/Archive Report
const deleteReport = async (req, res) => {
    const { id } = req.params;
    try {
        // ✅ CHANGED TO UPDATE (SOFT DELETE / ARCHIVE)
        const result = await pool.query(
            "UPDATE citizen_reports SET is_archived = true WHERE report_id = $1 RETURNING *", 
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        res.status(200).json({ success: true, message: "Report moved to Archive Center" });
    } catch (error) {
        console.error("Archive Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Ensure these are added to module.exports
module.exports = { submitReport, getAllReports, toggleAttention, updateReportStatus, deleteReport };
