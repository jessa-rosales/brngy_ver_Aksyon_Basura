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
const saveCollectionRecord = async (req, res) => {
  // text fields come from req.body
  const { bin_id, task_id, personnel_id } = req.body;

  try {
    // Make sure multer actually caught a file
    if (!req.file) {
        return res.status(400).json({ error: "No image file provided." });
    }

    // multer saved the file, we just need to construct the URL for the database
    const photo_proof_url = `/uploads/collection_rec/${req.file.filename}`; 

    // Insert into the database
    const insertQuery = `
      INSERT INTO collection_records (bin_id, task_id, personnel_id, photo_proof_url)
      VALUES ($1, $2, $3, $4)
      RETURNING record_id, photo_proof_url, timestamp;
    `;
    const result = await pool.query(insertQuery, [bin_id, task_id, personnel_id, photo_proof_url]);

    res.status(201).json({ success: true, record: result.rows[0] });
  } catch (error) {
    console.error("Save Collection Record Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🚚 NEW: Driver confirms the collection
const confirmBinCollection = async (req, res) => {
  const { bin_id } = req.body;

  try {
    // Update the bin's status to 'Collected' and stamp the current time
    const updateQuery = `
      UPDATE waste_bins 
      SET collection_status = 'Collected', last_collected_timestamp = CURRENT_TIMESTAMP
      WHERE bin_id = $1
      RETURNING bin_id, collection_status, last_collected_timestamp;
    `;
    
    const result = await pool.query(updateQuery, [bin_id]);

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

// Update your exports!
module.exports = { 
  getMobileAssignment, 
  saveCollectionRecord, 
  confirmBinCollection, 
  updateVehicleLocation 
};