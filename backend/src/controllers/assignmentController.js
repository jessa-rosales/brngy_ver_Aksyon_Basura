const assignmentModel = require("../models/assignmentModel");
const pool = require("../db");

const assignmentController = {
  // 1. Fetch options for the Modal Dropdowns
  getOptions: async (req, res) => {
    try {
      const drivers = await pool.query(
        "SELECT user_id, first_name, last_name FROM users WHERE role::text = 'Driver' AND status = 'Active' ORDER BY first_name ASC"
      );
      const collectors = await pool.query(
        "SELECT user_id, first_name, last_name FROM users WHERE role::text = 'Collector' AND status = 'Active' ORDER BY first_name ASC"
      );
      const vehicles = await pool.query(
        "SELECT vehicle_id, vehicle_name FROM vehicles WHERE status = 'Active' ORDER BY vehicle_name ASC"
      );
      const zones = await pool.query(
        "SELECT zone_id, zone_name FROM zones ORDER BY zone_name ASC"
      );

      res.json({
        drivers: drivers.rows || [],
        collectors: collectors.rows || [],
        vehicles: vehicles.rows || [],
        zones: zones.rows || []
      });
    } catch (err) {
      console.error("Options Error:", err);
      res.status(500).json({ error: "Failed to load personnel/asset options" });
    }
  },

  // 2. Fetch data for the Dashboard Table
  getAssignments: async (req, res) => {
    try {
      const data = await assignmentModel.getAll();
      res.json(data);
    } catch (err) {
      console.error("Fetch Error:", err);
      res.status(500).json([]);
    }
  },

  // 3. Save to Database (MATCHED NAME WITH ROUTES)
  createAssignment: async (req, res) => {
    try {
      const result = await assignmentModel.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      console.error("Establish Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  },

  updateAssignment: async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const result = await assignmentModel.update(id, data);
      
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ message: "Assignment updated successfully!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server Error during update" });
    }
  },

  //MOBILE MY SCHEDULE SCREEN
  getStaffSchedule: async (req, res) => {
    try {
      const { userId } = req.params;
      
      const query = `
        SELECT 
          a.task_id, a.driver_id, a.vehicle_id, a.zone_id,
          u.first_name AS driver_first, u.last_name AS driver_last, u.profile_picture AS driver_photo,
          v.vehicle_name, v.plate_number, v.status AS truck_status,
          z.zone_name,
          a.work_days, a.start_date, a.end_date,
          TO_CHAR(a.start_time, 'HH24:MI') as start_time, 
          TO_CHAR(a.end_time, 'HH24:MI') as end_time,
          (SELECT JSON_AGG(json_build_object(
              'id', usr.user_id, 
              'name', usr.first_name || ' ' || usr.last_name, 
              'avatar', usr.profile_picture
          ))
          FROM public.task_collectors tc 
          JOIN public.users usr ON tc.collector_id = usr.user_id 
          WHERE tc.task_id = a.task_id) as collector_details
        FROM public.task_assignments a
        LEFT JOIN public.users u ON a.driver_id = u.user_id
        LEFT JOIN public.vehicles v ON a.vehicle_id = v.vehicle_id
        LEFT JOIN public.zones z ON a.zone_id = z.zone_id
        WHERE a.status = 'Active' 
          AND (a.driver_id = $1 OR EXISTS (
              SELECT 1 FROM public.task_collectors tc 
              WHERE tc.task_id = a.task_id AND tc.collector_id = $1
          ))
        ORDER BY a.start_time ASC; -- Sort by time so the earliest shift is first
      `;

      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "No active assignment found." });
      }
      
      res.json(result.rows); // Returning the whole array now
    } catch (err) {
      console.error("Staff Schedule Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
}
  
};

module.exports = assignmentController;