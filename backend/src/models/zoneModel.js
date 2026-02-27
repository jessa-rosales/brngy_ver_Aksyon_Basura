const pool = require("../db");

const createZone = async (zone_name, zone_color, boundaries) => {
  const result = await pool.query(
    "INSERT INTO zones (zone_name, zone_color, boundaries) VALUES ($1, $2, $3) RETURNING *",
    [zone_name, zone_color, JSON.stringify(boundaries)]
  );
  return result.rows[0];
};

/*
const getAllZones = async () => {
  const query = `
    SELECT 
      z.zone_id, 
      z.zone_name, 
      z.zone_color, 
      z.boundaries,
      COUNT(b.bin_id)::int as bin_count
    FROM zones z
    LEFT JOIN waste_bins b ON z.zone_id = b.zone_id
    GROUP BY z.zone_id, z.zone_name, z.zone_color, z.boundaries
    ORDER BY z.zone_id DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
};*/

const getAllZones = async () => {
  const query = `
    SELECT 
      z.zone_id, 
      z.zone_name, 
      z.zone_color, 
      z.boundaries,
      COUNT(b.bin_id)::int as bin_count
    FROM zones z
    LEFT JOIN waste_bins b ON z.zone_id = b.zone_id
    WHERE z.is_archived = false -- ✅ FILTER OUT ARCHIVED
    GROUP BY z.zone_id, z.zone_name, z.zone_color, z.boundaries
    ORDER BY z.zone_id DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
};

const updateZone = async (id, zone_name, zone_color, boundaries) => {
  const result = await pool.query(
    "UPDATE zones SET zone_name = $1, zone_color = $2, boundaries = $3 WHERE zone_id = $4 RETURNING *",
    [zone_name, zone_color, JSON.stringify(boundaries), id]
  );
  return result.rows[0];
};
// ✅ ADD THIS FUNCTION: Soft Delete
const archiveZone = async (id) => {
  const result = await pool.query(
    "UPDATE zones SET is_archived = true WHERE zone_id = $1 RETURNING *",
    [id]
  );
  return result.rows[0];
};

// ✅ Make sure archiveZone is exported
module.exports = { createZone, getAllZones, updateZone, archiveZone };