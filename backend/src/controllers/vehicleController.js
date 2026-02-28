const pool = require("../db");

const vehicleController = {
  registerVehicle: async (req, res) => {
    try {
      const { vehicle_name, plate_number, status } = req.body;
      const query = `
        INSERT INTO public.vehicles (vehicle_name, plate_number, status)
        VALUES ($1, $2, $3) RETURNING *;
      `;
      const result = await pool.query(query, [vehicle_name, plate_number, status || 'Active']);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(400).json({ error: "Plate number already exists." });
      res.status(500).json({ error: "Failed to register vehicle." });
    }
  },

  getVehicles: async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM public.vehicles WHERE is_archived = false ORDER BY vehicle_id DESC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json([]);
    }
  },

  // ✅ DUGANGI KINI NGA METHOD (UPDATE)
  updateVehicle: async (req, res) => {
    try {
      const { id } = req.params;
      const { vehicle_name, plate_number, status } = req.body;
      
      const query = `
        UPDATE public.vehicles 
        SET vehicle_name = $1, plate_number = $2, status = $3
        WHERE vehicle_id = $4
        RETURNING *;
      `;
      
      const result = await pool.query(query, [vehicle_name, plate_number, status, id]);
      
      if (result.rowCount === 0) return res.status(404).json({ error: "Vehicle not found" });
      res.json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(400).json({ error: "Plate number already in use." });
      res.status(500).json({ error: "Failed to update asset." });
    }
  },

  // ✅ DUGANGI KINI NGA METHOD (DELETE)
 // ✅ UPDATED TO SOFT DELETE (ARCHIVE)
  // ✅ MUST USE UPDATE FOR SOFT DELETE (ARCHIVE)
  deleteVehicle: async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        "UPDATE public.vehicles SET is_archived = true WHERE vehicle_id = $1 RETURNING *", 
        [id]
      );
      
      if (result.rowCount === 0) {
          return res.status(404).json({ error: "Vehicle not found" });
      }
      
      res.json({ success: true, message: "Vehicle moved to Archive Center" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to archive vehicle." });
    }
  }
};

module.exports = vehicleController;