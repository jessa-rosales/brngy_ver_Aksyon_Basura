const pool = require('../db');

exports.getAllCollectedBins = async () => {
  const query = `
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
    WHERE cr.is_archived = false
    ORDER BY cr.timestamp DESC;
  `;
  
  const { rows } = await pool.query(query);
  
  // Format the data for the frontend React component
  return rows.map(row => ({
    id: `COL-${row.id}`,
    photoUrl: row.photoUrl ? `https://brngy-nzrth.onrender.com${row.photoUrl}` : null,
    binId: `BIN-${row.binId}`,
    binName: row.binName,
    binAddress: row.binAddress || 'Address not specified',
    zone: row.zone || 'Unassigned Zone',
    collectorName: row.first_name ? `${row.first_name} ${row.last_name}` : 'Unknown Collector',
    timestamp: row.timestamp,
    status: 'Collected',
    isArchived: row.is_archived
  }));
};

/**
 * Updates a record to be archived (Soft Delete)
 */
exports.archiveCollectionRecord = async (id) => {
  const query = `
    UPDATE collection_records 
    SET is_archived = true 
    WHERE record_id = $1 
    RETURNING record_id;
  `;
  
  // Strip 'COL-' prefix if present before querying the database
  const cleanId = id.toString().replace('COL-', '');
  
  const { rows } = await pool.query(query, [cleanId]);
  return rows[0];
};