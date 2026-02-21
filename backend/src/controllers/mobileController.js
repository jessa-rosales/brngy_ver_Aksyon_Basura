const pool = require('../db'); // Adjust path to your db config
/*
const getMobileAssignment = async (req, res) => {
  const { userId } = req.params;
  
  try {
    // UPDATED QUERY: Added timing and vehicle details
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
        v.vehicle_name,
        v.plate_number,
        v.status as vehicle_status
      FROM task_assignments ta
      LEFT JOIN task_collectors tc ON ta.task_id = tc.task_id
      JOIN zones z ON ta.zone_id = z.zone_id
      JOIN vehicles v ON ta.vehicle_id = v.vehicle_id 
      WHERE 
        (ta.driver_id = $1 OR tc.collector_id = $1)
        AND ta.status IN ('Pending', 'Assigned', 'In Progress', 'Active')
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(200).json(null); 
    }
    
    const assignment = result.rows[0];

    // Fetch Bins with actual schema column 'collection_status'
    const binsQuery = `
      SELECT 
        bin_id, 
        ST_Y(location::geometry) as lat, 
        ST_X(location::geometry) as lng, 
        'General' as type,
        collection_status as status,
        bin_address as address 
      FROM waste_bins 
      WHERE zone_id = $1
    `;
    
    const binsResult = await pool.query(binsQuery, [assignment.zone_id]);

    res.json({
      ...assignment,
      bins: binsResult.rows
    });
  } catch (error) {
    console.error("Mobile Assignment Error:", error);
    res.status(500).json({ error: error.message });
  }
};
*/

const getMobileAssignment = async (req, res) => {
  const { userId } = req.params;
  
  try {
    // 1. Remove LIMIT 1 to get all active assignments
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
        v.vehicle_name,
        v.plate_number,
        v.status as vehicle_status
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

    // 2. Map through each assignment and fetch its specific bins
    const assignmentsWithBins = await Promise.all(result.rows.map(async (assignment) => {
      const binsQuery = `
        SELECT bin_id, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng, 
               'General' as type, collection_status as status, bin_address as address 
        FROM waste_bins WHERE zone_id = $1
      `;
      const binsResult = await pool.query(binsQuery, [assignment.zone_id]);
      return {
        ...assignment,
        bins: binsResult.rows
      };
    }));

    res.json(assignmentsWithBins); // Return an array instead of a single object
  } catch (error) {
    console.error("Mobile Assignment Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMobileAssignment };