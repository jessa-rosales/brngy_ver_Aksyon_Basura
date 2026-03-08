const pool = require("../db");

const createBin = async (bin_name, zone_id, latitude, longitude, bin_address) => {
  const query = `
    INSERT INTO waste_bins (bin_name, zone_id, location, collection_status, bin_address) 
    VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326), 'Pending', $5) 
    RETURNING bin_id, bin_name, zone_id, ST_AsGeoJSON(location) as location, collection_status, bin_address;
  `;
  
  // Mapping: $1:name, $2:zone, $3:lat, $4:lng, $5:address
  const values = [bin_name, zone_id, latitude, longitude, bin_address];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const getBinsByZoneId = async (zoneId) => {
  const query = `
    SELECT bin_id, bin_name, bin_address, collection_status, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude 
    FROM waste_bins 
    WHERE zone_id = $1 AND is_archived = false
  `;
  const result = await pool.query(query, [zoneId]);
  return result.rows;
};

// Change this to perform a Soft Delete instead of a Hard Delete
const deleteBin = async (binId) => {
  const query = "UPDATE waste_bins SET is_archived = true WHERE bin_id = $1 RETURNING *";
  const result = await pool.query(query, [binId]);
  return result.rowCount > 0;
};


const getAllBins = async () => {
  const query = `
    SELECT bin_id, bin_name, bin_address, collection_status, zone_id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude, last_collected_timestamp AS "collectedAt" 
    FROM waste_bins
    WHERE is_archived = false
  `;
  const result = await pool.query(query);
  return result.rows;
};

module.exports = { createBin, getBinsByZoneId, deleteBin, getAllBins };