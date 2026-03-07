const pool = require("../db");

const getAllDutyLogs = async (req, res) => {
  try {
    const query = `
      SELECT 
        dl.log_id,
        dl.status,
        
        -- Historical Timestamps (Formatted for UI)
        TO_CHAR(dl.start_time, 'YYYY-MM-DD') AS date_logged,
        TO_CHAR(dl.start_time, 'HH12:MI AM') AS actual_start,
        COALESCE(TO_CHAR(dl.end_time, 'HH12:MI AM'), 'Active') AS actual_end,
        
        -- Driver Identity
        CONCAT(u.first_name, ' ', u.last_name) AS driver_name,
        
        -- Asset Information
        v.vehicle_name,
        v.plate_number,
        
        -- Operational Context (Fetched via task_assignments)
        TO_CHAR(ta.start_time, 'HH12:MI AM') AS sched_start,
        TO_CHAR(ta.end_time, 'HH12:MI AM') AS sched_end,
        ta.work_days AS work_days_snapshot,
        z.zone_name,
        
        -- Collectors Snapshot (JSON array of names)
        (
            SELECT json_agg(CONCAT(c_user.first_name, ' ', c_user.last_name))
            FROM task_collectors tc
            JOIN users c_user ON tc.collector_id = c_user.user_id
            WHERE tc.task_id = ta.task_id
        ) AS collectors_snapshot,
        
        -- PERFORMANCE LOGIC: Bins
        -- Count bins that were marked 'Collected' during this specific shift/task
        (SELECT COUNT(*) FROM collection_records cr 
         WHERE cr.task_id = ta.task_id 
         AND cr.timestamp >= dl.start_time 
         AND (dl.end_time IS NULL OR cr.timestamp <= dl.end_time)) AS bins_collected,
        
        -- Total bins available in that specific zone assigned to this task
        (SELECT COUNT(*) FROM waste_bins wb 
         WHERE wb.zone_id = ta.zone_id) AS total_zone_bins,
         
        -- PERFORMANCE LOGIC: Reports
        -- Count only citizen reports that the team actually resolved during this shift
        (SELECT COUNT(*) FROM citizen_reports r 
         WHERE r.assigned_team_id = ta.task_id 
         AND r.status = 'Resolved'
         AND r.resolved_at >= dl.start_time 
         AND (dl.end_time IS NULL OR r.resolved_at <= dl.end_time)) AS reports_resolved,

        -- 🔥 UPDATED: Total citizen reports strictly assigned to this specific team's task
        (SELECT COUNT(*) FROM citizen_reports r 
         WHERE r.assigned_team_id = ta.task_id) AS total_assigned_reports

      FROM duty_logs dl
      LEFT JOIN users u ON dl.user_id = u.user_id
      LEFT JOIN vehicles v ON dl.vehicle_id = v.vehicle_id
      
      -- Link log to the task assignment active at the time of the shift
      LEFT JOIN LATERAL (
          SELECT task_id, zone_id, start_time, end_time, work_days
          FROM task_assignments
          WHERE driver_id = dl.user_id AND vehicle_id = dl.vehicle_id
          AND is_archived = false
          ORDER BY task_id DESC LIMIT 1
      ) ta ON true
      
      LEFT JOIN zones z ON ta.zone_id = z.zone_id
      ORDER BY dl.start_time DESC;
    `;

    const { rows } = await pool.query(query);

    const formattedLogs = rows.map(log => {
      // Safely parse Snapshot Data (Handle strings or arrays)
      let parsedCollectors = log.collectors_snapshot || [];
      let parsedWorkDays = log.work_days_snapshot || [];

      if (typeof parsedCollectors === 'string') { 
        try { parsedCollectors = JSON.parse(parsedCollectors); } catch(e) { parsedCollectors = []; } 
      }
      if (typeof parsedWorkDays === 'string') { 
        try { parsedWorkDays = JSON.parse(parsedWorkDays); } catch(e) { parsedWorkDays = []; } 
      }

      return {
        ...log,
        collectors: Array.isArray(parsedCollectors) ? parsedCollectors : [],
        workDays: Array.isArray(parsedWorkDays) ? parsedWorkDays : []
      };
    });

    res.status(200).json({ success: true, data: formattedLogs });
  } catch (error) {
    console.error("Fetch Duty Logs Error:", error);
    res.status(500).json({ success: false, message: "Server Error fetching duty logs" });
  }
};

module.exports = { getAllDutyLogs };