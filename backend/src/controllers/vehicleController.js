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
      const result = await pool.query("SELECT * FROM public.vehicles ORDER BY vehicle_id DESC");
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
  deleteVehicle: async (req, res) => {
    try {
      const { id } = req.params;
      // Note: If the vehicle is assigned to a task, you might need to handle FK constraints
      await pool.query("DELETE FROM public.vehicles WHERE vehicle_id = $1", [id]);
      res.json({ success: true, message: "Vehicle deleted" });
    } catch (err) {
      res.status(500).json({ error: "Cannot delete vehicle. It might be linked to an active assignment." });
    }
  }
};

module.exports = vehicleController;