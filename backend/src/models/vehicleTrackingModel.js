const pool = require('../db');

const getLiveFleetData = async () => {
    const query = `
        SELECT 
            v.vehicle_id,
            v.vehicle_name,
            v.plate_number,
            v.status AS vehicle_status,
            ST_Y(v.current_location::geometry) AS current_lat,
            ST_X(v.current_location::geometry) AS current_lng,
            
            ta.task_id,
            ta.start_time AS sched_start,
            ta.end_time AS sched_end,
            z.zone_name,
            z.zone_id,
            CONCAT(u.first_name, ' ', u.last_name) AS driver_name,

            -- 🔥 FETCH ALL DUTY LOGS AS A JSON ARRAY
            (SELECT json_agg(logs) FROM (
                SELECT 
                    dl.start_time AS actual_start,
                    dl.end_time AS actual_end,
                    dl.status,
                    -- 🔥 FETCH THE SPECIFIC DRIVER FOR THIS LOG ENTRY
                    CONCAT(du.first_name, ' ', du.last_name) AS driver_at_time,
                    (SELECT json_agg(CONCAT(uc.first_name, ' ', uc.last_name)) 
                     FROM task_collectors tc 
                     JOIN users uc ON tc.collector_id = uc.user_id 
                     WHERE tc.task_id = ta.task_id) AS team_collectors,
                    (SELECT COUNT(*) FROM waste_bins wb WHERE wb.zone_id = ta.zone_id AND wb.collection_status = 'Collected') AS bins_collected,
                    (SELECT COUNT(*) FROM waste_bins wb WHERE wb.zone_id = ta.zone_id) AS total_bins,
                    (SELECT COUNT(*) FROM citizen_reports cr WHERE cr.assigned_team_id = ta.task_id AND cr.status = 'Resolved') AS reports_done
                FROM duty_logs dl
                -- Join users to get the driver's name who started this specific duty session
                LEFT JOIN users du ON dl.user_id = du.user_id
                WHERE dl.vehicle_id = v.vehicle_id
                ORDER BY dl.start_time DESC
                LIMIT 10 -- Shows the last 10 logs
            ) logs) AS past_logs
            
        FROM vehicles v
        LEFT JOIN task_assignments ta ON v.vehicle_id = ta.vehicle_id 
            AND ta.status IN ('Active', 'In Progress') 
            AND ta.is_archived = false
        LEFT JOIN zones z ON ta.zone_id = z.zone_id
        LEFT JOIN users u ON ta.driver_id = u.user_id
        WHERE v.status = 'Active' AND v.is_archived = false;
    `;
    const result = await pool.query(query);
    return result.rows;
};

module.exports = { getLiveFleetData };