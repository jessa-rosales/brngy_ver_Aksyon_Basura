const pool = require("../db");
const zoneModel = require("../models/zoneModel"); // ✅ IMPORT THE ZONE MODEL

const archiveController = {
  getArchivedItems: async (req, res) => {
    const { category } = req.params;
    let query = "";

    try {
      switch (category) {
        // ✅ UPDATED: Added JOINs to fetch reporter name, profile picture, and location for the Archive Center
        case "reports":
          query = `
            SELECT 
                r.*,
                ST_Y(r.location_coords::geometry) as latitude,
                ST_X(r.location_coords::geometry) as longitude,
                CONCAT(u.first_name, ' ', u.last_name) AS reporter_name,
                u.profile_picture,
                u.contact_number AS contact_number,
                (SELECT COUNT(*) FROM report_attention ra WHERE ra.report_id = r.report_id) AS attention_count
            FROM citizen_reports r
            LEFT JOIN users u ON r.reporter_id = u.user_id
            WHERE r.is_archived = true
            ORDER BY r.created_at DESC;
          `;
          break;
        case "tasks":
          query = `
            SELECT 
                a.task_id, a.driver_id, a.vehicle_id, a.zone_id,
                u.first_name, u.last_name,
                v.vehicle_name,
                v.plate_number,
                v.status AS truck_status,
                a.status AS assignment_status, 
                z.zone_name,
                a.work_days, a.start_date, a.end_date,
                TO_CHAR(a.start_time, 'HH24:MI') as start_time, 
                TO_CHAR(a.end_time, 'HH24:MI') as end_time,
                (SELECT ARRAY_AGG(usr.first_name || ' ' || usr.last_name) 
                 FROM task_collectors tc 
                 JOIN users usr ON tc.collector_id = usr.user_id 
                 WHERE tc.task_id = a.task_id) as collector_names
            FROM task_assignments a
            LEFT JOIN users u ON a.driver_id = u.user_id
            LEFT JOIN vehicles v ON a.vehicle_id = v.vehicle_id
            LEFT JOIN zones z ON a.zone_id = z.zone_id
            WHERE a.is_archived = true 
            ORDER BY a.task_id DESC
          `;
          break;
        case "vehicles":
          query = "SELECT * FROM vehicles WHERE is_archived = true ORDER BY vehicle_id DESC";
          break;
        case "zones":
          query = "SELECT * FROM zones WHERE is_archived = true ORDER BY zone_id DESC";
          break;
        case "announcements":
          query = `
            SELECT a.*, 
                   u1.first_name as author_first, u1.last_name as author_last,
                   u2.first_name as editor_first, u2.last_name as editor_last
            FROM announcements a
            LEFT JOIN users u1 ON a.author_id = u1.user_id
            LEFT JOIN users u2 ON a.last_edited_by = u2.user_id
            WHERE a.is_archived = true
            ORDER BY a.date_published DESC
          `;
          break;
        case "users":
          query = "SELECT * FROM users WHERE is_archived = true ORDER BY user_id DESC";
          break;
        case "bins":
          query = `
            SELECT 
              cr.record_id AS id,
              cr.photo_proof_url AS "photoUrl",
              wb.bin_name AS "binName",
              wb.bin_id AS "binId",
              wb.bin_address AS "binAddress",
              u.first_name, 
              u.last_name,
              cr.timestamp,
              z.zone_name AS zone,
              cr.is_archived
            FROM collection_records cr
            JOIN waste_bins wb ON cr.bin_id = wb.bin_id
            LEFT JOIN users u ON cr.personnel_id = u.user_id
            LEFT JOIN zones z ON wb.zone_id = z.zone_id
            WHERE cr.is_archived = true
            ORDER BY cr.timestamp DESC;
          `;
          break;
        case "waste_bins":
          query = `
            SELECT w.*, z.zone_name 
            FROM waste_bins w 
            LEFT JOIN zones z ON w.zone_id = z.zone_id 
            WHERE w.is_archived = true 
            ORDER BY w.bin_id ASC
          `;
          break;
        default:
          return res.status(400).json({ message: "Invalid category" });
      }

      const result = await pool.query(query);

      // Handle custom formatting for Collection Records
      if (category === "bins") {
        const formattedBins = result.rows.map(row => ({
          id: `COL-${row.id}`,
          photoUrl: row.photoUrl ? `http://localhost:5000${row.photoUrl}` : null,
          binId: `BIN-${row.binId}`,
          binName: row.binName,
          binAddress: row.binAddress || 'Address not specified',
          zone: row.zone || 'Unassigned Zone',
          collectorName: row.first_name ? `${row.first_name} ${row.last_name}` : 'Unknown Collector',
          timestamp: row.timestamp,
          status: 'Collected',
          isArchived: row.is_archived
        }));
        return res.json(formattedBins);
      }

      res.json(result.rows);
    } catch (err) {
      console.error(`Error fetching archived ${category}:`, err.message);
      res.status(500).json({ error: "Failed to fetch archives" });
    }
  },

  restoreItem: async (req, res) => {
    const { category, id } = req.params;

    try {
      // ✅ CASCADING RESTORE: Intercept 'zones' category to restore the zone AND its bins
      if (category === 'zones') {
        const restoredZone = await zoneModel.restoreZoneWithBins(id);
        
        if (!restoredZone) {
          return res.status(404).json({ message: "Zone not found in archives" });
        }
        
        return res.json({ 
          success: true, 
          message: "Zone and its associated bins restored successfully", 
          item: restoredZone 
        });
      }

      // Default logic for all other categories
      let table = "";
      let pk = "";

      switch (category) {
        case "reports": table = "citizen_reports"; pk = "report_id"; break;
        case "tasks": table = "task_assignments"; pk = "task_id"; break;
        case "vehicles": table = "vehicles"; pk = "vehicle_id"; break;
        case "announcements": table = "announcements"; pk = "announcement_id"; break;
        case "users": table = "users"; pk = "user_id"; break;
        case "bins": table = "collection_records"; pk = "record_id"; break;
        case "waste_bins": 
          table = "waste_bins"; 
          pk = "bin_id"; 
          break;
        default: return res.status(400).json({ message: "Invalid category" });
      }

      const cleanId = category === "bins" ? id.toString().replace('COL-', '') : id;

      const query = `UPDATE ${table} SET is_archived = false WHERE ${pk} = $1 RETURNING *`;
      const result = await pool.query(query, [cleanId]);

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Item not found in archives" });
      }

      res.json({ success: true, message: "Item restored successfully", item: result.rows[0] });
    } catch (err) {
      console.error(`Error restoring ${category} item:`, err.message);
      res.status(500).json({ error: "Failed to restore item" });
    }
  }
};

module.exports = archiveController;