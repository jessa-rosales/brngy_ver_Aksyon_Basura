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
// ✅ FIXED: Cascading Soft Delete for Zone and its Bins
const archiveZone = async (id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start transaction to ensure data integrity

    // 1. Archive the Zone itself
    // FIXED: Removed the extra comma before [id]
    const zoneResult = await client.query(
      "UPDATE zones SET is_archived = true WHERE zone_id = $1 RETURNING *",
      [id]
    );

    if (zoneResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // 2. Archive all Bins associated with this specific Zone
    // FIXED: Removed the extra comma before [id]
    await client.query(
      "UPDATE waste_bins SET is_archived = true WHERE zone_id = $1",
      [id]
    );

    await client.query('COMMIT'); // Save both changes
    return zoneResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK'); // Cancel everything if an error occurs
    throw err;
  } finally {
    client.release();
  }
};

// ✅ Make sure archiveZone is exported
module.exports = { createZone, getAllZones, updateZone, archiveZone };