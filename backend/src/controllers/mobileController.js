const pool = require('../db');
const fs = require('fs').promises; // Required for saving the image file
const path = require('path');

const getMobileAssignment = async (req, res) => {
  const { userId } = req.params;
  
  try {
    const query = `
      SELECT DISTINCT
        ta.task_id, 
        ta.status as task_status,
        ta.start_time, 
        ta.end_time,
        z.zone_id, 
        z.zone_name, 
        z.zone_color, 
        z.boundaries,
        v.vehicle_id,
        v.vehicle_name,
        v.plate_number,
        v.status as vehicle_status,
        -- 👇 FETCH THE TRUCK'S LIVE LOCATION
        ST_Y(v.current_location::geometry) as truck_lat,
        ST_X(v.current_location::geometry) as truck_lng
      FROM task_assignments ta
      LEFT JOIN task_collectors tc ON ta.task_id = tc.task_id
      JOIN zones z ON ta.zone_id = z.zone_id
      JOIN vehicles v ON ta.vehicle_id = v.vehicle_id 
      WHERE 
        (ta.driver_id = $1 OR tc.collector_id = $1)
        AND ta.status IN ('Pending', 'Assigned', 'In Progress', 'Active')
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(200).json([]); 
    }

    const assignmentsWithBins = await Promise.all(result.rows.map(async (assignment) => {
      // 🔥 UPDATED: Dynamically checks if the photo evidence already exists in the database
      const binsQuery = `
        SELECT 
          wb.bin_id, ST_Y(wb.location::geometry) as lat, ST_X(wb.location::geometry) as lng, 
          'General' as type, wb.collection_status as status, wb.bin_address as address,
          wb.last_collected_timestamp, -- ✅ Added this so the app knows WHEN it was last collected
          EXISTS(SELECT 1 FROM collection_records cr WHERE cr.bin_id = wb.bin_id AND cr.task_id = $2) as evidence_submitted
        FROM waste_bins wb 
        WHERE wb.zone_id = $1
      `;
      const binsResult = await pool.query(binsQuery, [assignment.zone_id, assignment.task_id]);
      return {
        ...assignment,
        bins: binsResult.rows
      };
    }));

    res.json(assignmentsWithBins);
  } catch (error) {
    console.error("Mobile Assignment Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📸 UPDATED: Save the collection record using Multer
// 📸 UPDATED: Save the collection record using Multer (with safe integer parsing)
const saveCollectionRecord = async (req, res) => {
  // text fields come from req.body via FormData (they are strings!)
  const { bin_id, task_id, personnel_id } = req.body;

  try {
    // Make sure multer actually caught a file
    if (!req.file) {
        return res.status(400).json({ error: "No image file provided." });
    }

    // multer saved the file, we just need to construct the URL for the database
    const photo_proof_url = `/uploads/collection_rec/${req.file.filename}`; 

    // ✅ NEW: Safely parse strings to integers, or make them NULL so PostgreSQL doesn't crash
    const safeBinId = parseInt(bin_id, 10);
    const safeTaskId = (task_id && task_id !== '0' && task_id !== 'undefined' && task_id !== 'null') ? parseInt(task_id, 10) : null;
    const safePersonnelId = (personnel_id && personnel_id !== 'undefined' && personnel_id !== 'null') ? parseInt(personnel_id, 10) : null;

    // Insert into the database
    const insertQuery = `
      INSERT INTO collection_records (bin_id, task_id, personnel_id, photo_proof_url)
      VALUES ($1, $2, $3, $4)
      RETURNING record_id, photo_proof_url, timestamp;
    `;
    const result = await pool.query(insertQuery, [safeBinId, safeTaskId, safePersonnelId, photo_proof_url]);

    res.status(201).json({ success: true, record: result.rows[0] });
  } catch (error) {
    console.error("Save Collection Record Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🚚 NEW: Driver confirms the collection
// 🚚 NEW: Driver confirms the collection
const confirmBinCollection = async (req, res) => {
  const { bin_id, driver_id } = req.body;

  try {
    const updateQuery = `
      UPDATE waste_bins 
      SET 
        collection_status = 'Collected', 
        last_collected_timestamp = CURRENT_TIMESTAMP,
        confirmed_by = $2
      WHERE bin_id = $1
      RETURNING bin_id, collection_status, last_collected_timestamp;
    `;
    
    // ✅ FIXED: We strictly provide 2 parameters here. The || null prevents "undefined" crashes.
    const result = await pool.query(updateQuery, [bin_id, driver_id || null]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bin not found." });
    }

    res.status(200).json({ success: true, bin: result.rows[0] });
  } catch (error) {
    console.error("Confirm Collection Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🚚 NEW: Driver continuously updates the truck's location
const updateVehicleLocation = async (req, res) => {
  const { vehicle_id, lat, lng } = req.body;

  // 1. Log what we actually received from the phone!
  console.log(`📡 RECEIVED GPS -> Vehicle: ${vehicle_id}, Lat: ${lat}, Lng: ${lng}`);

  if (!vehicle_id || !lat || !lng) {
      console.log("❌ Missing data! Cannot update location.");
      return res.status(400).json({ error: "Missing required location data" });
  }

  try {
    // 2. Force casting to numeric to prevent PostGIS errors
    const updateQuery = `
      UPDATE vehicles 
      SET current_location = ST_SetSRID(ST_MakePoint($1::numeric, $2::numeric), 4326)
      WHERE vehicle_id = $3
      RETURNING vehicle_id;
    `;
    const result = await pool.query(updateQuery, [lng, lat, vehicle_id]);

    if (result.rows.length === 0) {
        console.log(`❌ Vehicle ID ${vehicle_id} not found in database!`);
    } else {
        console.log(`✅ Successfully updated GPS for vehicle ${vehicle_id}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Update Vehicle Location Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🚚 Fetch all currently active routes for Citizen Tracking SCREEN
// 🚚 Fetch all currently active routes for Citizen Tracking
// 🚚 Fetch all currently active routes & zones for Citizen Tracking
// 🚚 Fetch all currently active routes & zones for Citizen Tracking
const getActiveTrackingRoutes = async (req, res) => {
    try {
        // 1. Fetch ALL unarchived zones (Using zones as the base reference)
        const zonesQuery = `
            SELECT 
                z.zone_id,
                z.zone_name, 
                z.boundaries,
                z.zone_color,
                ta.task_id, 
                v.plate_number,
                v.vehicle_name, 
                CONCAT(d.first_name, ' ', d.last_name) AS driver_name,
                ST_Y(v.current_location::geometry) AS truck_lat,
                ST_X(v.current_location::geometry) AS truck_lng,
                CURRENT_TIMESTAMP AS last_update
            FROM zones z
            -- LEFT JOIN ensures we get the zone EVEN IF there is no active task
            LEFT JOIN task_assignments ta ON z.zone_id = ta.zone_id AND ta.status IN ('Assigned', 'In Progress', 'Active')
            LEFT JOIN vehicles v ON ta.vehicle_id = v.vehicle_id
            LEFT JOIN users d ON ta.driver_id = d.user_id
            WHERE z.is_archived = false
            ORDER BY z.zone_name ASC;
        `;
        
        const zonesResult = await pool.query(zonesQuery);
        const zones = zonesResult.rows;

        // 2. Fetch Bins & Reports for each zone
        for (let zone of zones) {
            // -- Fetch Bins for this zone --
            const binsQuery = `
                SELECT 
                    wb.bin_id AS id, 
                    'bin' AS type,
                    wb.bin_address AS address, 
                    wb.collection_status AS status,
                    wb.last_collected_timestamp AS updated_at,
                    (CASE WHEN cr.photo_proof_url IS NOT NULL THEN true ELSE false END) AS has_photo,
                    cr.photo_proof_url AS photo_url, -- ✅ FIXED: Sent the actual image URL string to the app!
                    CONCAT(c.first_name, ' ', c.last_name) AS collector_name,
                    ST_Y(wb.location::geometry) AS lat, 
                    ST_X(wb.location::geometry) AS lng
                FROM waste_bins wb
                LEFT JOIN collection_records cr ON cr.bin_id = wb.bin_id AND cr.task_id = $2
                LEFT JOIN users c ON cr.personnel_id = c.user_id
                WHERE wb.zone_id = $1
            `;
            // Note: If no active task_id exists, $2 is null, which just means no collection_records will join
            const binsResult = await pool.query(binsQuery, [zone.zone_id, zone.task_id || null]);
            zone.bins = binsResult.rows;

            // -- Fetch Citizen Reports assigned to this active task --
            if (zone.task_id) {
                const reportsQuery = `
                    SELECT 
                        r.report_id AS id,
                        'report' AS type,
                        r.location_address AS address,
                        r.status,
                        r.resolved_at AS updated_at,
                        (CASE WHEN r.photo_evidence_url IS NOT NULL OR r.resolved_photo_url IS NOT NULL THEN true ELSE false END) AS has_photo,
                        COALESCE(r.resolved_photo_url, r.photo_evidence_url) AS photo_url, -- ✅ FIXED: Sent the actual image URL string to the app!
                        CONCAT(u.first_name, ' ', u.last_name) AS collector_name,
                        ST_Y(r.location_coords::geometry) AS lat,
                        ST_X(r.location_coords::geometry) AS lng
                    FROM citizen_reports r
                    LEFT JOIN users u ON r.photo_uploaded_by = u.user_id
                    WHERE r.assigned_team_id = $1
                `;
                const reportsResult = await pool.query(reportsQuery, [zone.task_id]);
                zone.reports = reportsResult.rows;
            } else {
                zone.reports = [];
            }
        }

        // 3. Send structured data back to React Native
        res.status(200).json({ success: true, data: zones });

    } catch (error) {
        console.error("Fetch Active Tracking Routes Error:", error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// FOR UserReportsScreen
const getAllReports = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.*, 
                -- We alias reporter_id as user_id so the frontend doesn't break
                r.reporter_id AS user_id, 
                CONCAT(reporter.first_name, ' ', reporter.last_name) AS reporter_name,
                
                -- 🚚 JOIN FOR DRIVER NAME (via assigned_team_id -> task_assignments)
                COALESCE(CONCAT(d.first_name, ' ', d.last_name), 'Assigning Driver...') AS driver_name,
                
                -- 🧑‍🦯 JOIN FOR COLLECTOR NAME (via photo_uploaded_by -> users)
                COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Pending Collection') AS collector_name,

                -- 📸 EXPLICIT PHOTO NAMES
                r.photo_evidence_url,
                r.resolved_photo_url,
                
                -- ⏰ TIMESTAMPS
                r.created_at,
                r.resolved_at
            FROM public.citizen_reports r
            LEFT JOIN public.users reporter ON r.reporter_id = reporter.user_id 
            LEFT JOIN public.task_assignments ta ON r.assigned_team_id = ta.task_id
            LEFT JOIN public.users d ON ta.driver_id = d.user_id
            -- ✅ THIS IS THE FIX: Joining on photo_uploaded_by to get the Collector
            LEFT JOIN public.users c ON r.photo_uploaded_by = c.user_id 
            ORDER BY r.created_at DESC;
        `;
        const result = await pool.query(query);
        res.status(200).json({ success: true, reports: result.rows });
    } catch (error) {
        console.error("Get All Reports Error:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// ✅ UPDATED EXPORTS: Added getAllReports
module.exports = { 
  getMobileAssignment, 
  saveCollectionRecord, 
  confirmBinCollection, 
  updateVehicleLocation,
  getActiveTrackingRoutes,
  getAllReports
};