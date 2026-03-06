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

            (SELECT json_agg(logs) FROM (
                SELECT 
                    dl.start_time AS actual_start,
                    dl.end_time AS actual_end,
                    dl.status,
                    CONCAT(du.first_name, ' ', du.last_name) AS driver_at_time,
                    lv.vehicle_name AS log_vehicle_name,
                    lv.plate_number AS log_plate_number,
                    
                    -- 🔥 READS DIRECTLY FROM THE NEW SNAPSHOT COLUMNS
                    hist_z.zone_name AS hist_zone_name,
                    dl.sched_start AS hist_sched_start,
                    dl.sched_end AS hist_sched_end,
                    dl.collectors_snapshot AS team_collectors,
                    dl.work_days_snapshot AS hist_work_days,

                    (SELECT COUNT(*) FROM waste_bins wb WHERE wb.zone_id = dl.zone_id AND wb.collection_status = 'Collected') AS bins_collected,
                    (SELECT COUNT(*) FROM waste_bins wb WHERE wb.zone_id = dl.zone_id) AS total_bins,
                    
                    -- Keep citizen reports linked to the correct historical task
                    (SELECT COUNT(*) FROM citizen_reports cr WHERE cr.assigned_team_id = hist_ta.task_id AND cr.status = 'Resolved') AS reports_done
                
                FROM duty_logs dl
                LEFT JOIN users du ON dl.user_id = du.user_id
                LEFT JOIN vehicles lv ON dl.vehicle_id = lv.vehicle_id
                LEFT JOIN zones hist_z ON dl.zone_id = hist_z.zone_id
                
                LEFT JOIN LATERAL (
                    SELECT task_id
                    FROM task_assignments
                    WHERE vehicle_id = dl.vehicle_id 
                      AND driver_id = dl.user_id
                      AND DATE(dl.start_time) >= COALESCE(start_date, '2000-01-01')
                    ORDER BY task_id DESC
                    LIMIT 1
                ) hist_ta ON true

                WHERE dl.vehicle_id = v.vehicle_id
                ORDER BY dl.start_time DESC
                LIMIT 10 
            ) logs) AS past_logs
            
        FROM vehicles v
        -- 🔥 ANTI-DUPLICATION FIX: Forces the DB to only pick ONE active task per truck
        LEFT JOIN LATERAL (
            SELECT task_id, start_time, end_time, zone_id, driver_id
            FROM task_assignments 
            WHERE vehicle_id = v.vehicle_id 
              AND status IN ('Active', 'In Progress') 
              AND is_archived = false
            ORDER BY task_id DESC
            LIMIT 1
        ) ta ON true
        LEFT JOIN zones z ON ta.zone_id = z.zone_id
        LEFT JOIN users u ON ta.driver_id = u.user_id
        WHERE v.is_archived = false;
    `;
    const result = await pool.query(query);
    return result.rows;
};

module.exports = { getLiveFleetData };