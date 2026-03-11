const pool = require("../db");

const getSystemReport = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required." });
    }

    const start = `${startDate} 00:00:00`;
    const end = `${endDate} 23:59:59`;

    // 1. Get KPI Totals
    const kpiQuery = `
      SELECT 
        (SELECT COUNT(*) FROM collection_records WHERE timestamp BETWEEN $1 AND $2 AND is_archived = false) AS total_collections,
        (SELECT COUNT(*) FROM citizen_reports WHERE status = 'Resolved' AND created_at BETWEEN $1 AND $2 AND is_archived = false) AS resolved_reports,
        (SELECT COUNT(*) FROM citizen_reports WHERE status IN ('Pending', 'In Progress') AND created_at BETWEEN $1 AND $2 AND is_archived = false) AS pending_reports,
        (SELECT COUNT(*) FROM waste_bins WHERE collection_status = 'Missed' AND is_archived = false) AS missed_bins
    `;
    const kpiResult = await pool.query(kpiQuery, [start, end]);
    const kpis = kpiResult.rows[0];

    // 2. Get Top Issues Overall
    const issuesQuery = `
      SELECT 
        CASE WHEN issue_type = 'Other' THEN COALESCE(issue_type_other, 'Other') ELSE issue_type::text END as issue_name,
        COUNT(*) as count
      FROM citizen_reports
      WHERE created_at BETWEEN $1 AND $2 AND is_archived = false
      GROUP BY issue_name
      ORDER BY count DESC
      LIMIT 5;
    `;
    const issuesResult = await pool.query(issuesQuery, [start, end]);
    const topIssues = issuesResult.rows.map(row => [row.issue_name, parseInt(row.count)]);

    // 3. DYNAMIC TIMELINE SUMMARY
    let timelineQuery = "";
    if (type === 'Annual') {
        timelineQuery = `
          WITH date_series AS ( SELECT generate_series($1::date, $2::date, '1 month'::interval) AS date ),
          daily_collections AS ( SELECT DATE_TRUNC('month', timestamp) as report_date, COUNT(*) as col_count FROM collection_records WHERE timestamp BETWEEN $1 AND $2 AND is_archived = false GROUP BY DATE_TRUNC('month', timestamp) ),
          daily_reports AS ( SELECT DATE_TRUNC('month', created_at) as report_date, COUNT(*) as rep_count, SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as res_count FROM citizen_reports WHERE created_at BETWEEN $1 AND $2 AND is_archived = false GROUP BY DATE_TRUNC('month', created_at) )
          SELECT TRIM(TO_CHAR(ds.date, 'Month')) as period_name, COALESCE(SUM(dc.col_count), 0) as collections, COALESCE(SUM(dr.rep_count), 0) as reports, COALESCE(SUM(dr.res_count), 0) as resolved, EXTRACT(MONTH FROM ds.date) as sort_order
          FROM date_series ds LEFT JOIN daily_collections dc ON DATE_TRUNC('month', ds.date) = dc.report_date LEFT JOIN daily_reports dr ON DATE_TRUNC('month', ds.date) = dr.report_date
          GROUP BY TRIM(TO_CHAR(ds.date, 'Month')), EXTRACT(MONTH FROM ds.date) ORDER BY sort_order;
        `;
    } else if (type === 'Monthly') {
        timelineQuery = `
          WITH date_series AS ( SELECT generate_series($1::date, $2::date, '1 day'::interval) AS date ),
          daily_collections AS ( SELECT DATE(timestamp) as report_date, COUNT(*) as col_count FROM collection_records WHERE timestamp BETWEEN $1 AND $2 AND is_archived = false GROUP BY DATE(timestamp) ),
          daily_reports AS ( SELECT DATE(created_at) as report_date, COUNT(*) as rep_count, SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as res_count FROM citizen_reports WHERE created_at BETWEEN $1 AND $2 AND is_archived = false GROUP BY DATE(created_at) )
          SELECT 'Week ' || CEIL(EXTRACT(DAY FROM ds.date) / 7.0) as period_name, COALESCE(SUM(dc.col_count), 0) as collections, COALESCE(SUM(dr.rep_count), 0) as reports, COALESCE(SUM(dr.res_count), 0) as resolved, CEIL(EXTRACT(DAY FROM ds.date) / 7.0) as sort_order
          FROM date_series ds LEFT JOIN daily_collections dc ON DATE(ds.date) = dc.report_date LEFT JOIN daily_reports dr ON DATE(ds.date) = dr.report_date
          GROUP BY CEIL(EXTRACT(DAY FROM ds.date) / 7.0) ORDER BY sort_order;
        `;
    } else {
        timelineQuery = `
          WITH date_series AS ( SELECT generate_series($1::date, $2::date, '1 day'::interval) AS date ),
          daily_collections AS ( SELECT DATE(timestamp) as report_date, COUNT(*) as col_count FROM collection_records WHERE timestamp BETWEEN $1 AND $2 AND is_archived = false GROUP BY DATE(timestamp) ),
          daily_reports AS ( SELECT DATE(created_at) as report_date, COUNT(*) as rep_count, SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as res_count FROM citizen_reports WHERE created_at BETWEEN $1 AND $2 AND is_archived = false GROUP BY DATE(created_at) )
          SELECT TRIM(TO_CHAR(ds.date, 'Day')) as period_name, COALESCE(SUM(dc.col_count), 0) as collections, COALESCE(SUM(dr.rep_count), 0) as reports, COALESCE(SUM(dr.res_count), 0) as resolved, EXTRACT(ISODOW FROM ds.date) as sort_order
          FROM date_series ds LEFT JOIN daily_collections dc ON DATE(ds.date) = dc.report_date LEFT JOIN daily_reports dr ON DATE(ds.date) = dr.report_date
          GROUP BY TRIM(TO_CHAR(ds.date, 'Day')), EXTRACT(ISODOW FROM ds.date) ORDER BY sort_order;
        `;
    }
    const timelineResult = await pool.query(timelineQuery, [start, end]);
    const dailySummaryTable = timelineResult.rows.map(row => ({
      period_name: row.period_name,
      collections: parseInt(row.collections),
      reports: parseInt(row.reports),
      resolved: parseInt(row.resolved),
      resolvedRate: parseInt(row.reports) > 0 ? Math.round((parseInt(row.resolved) / parseInt(row.reports)) * 100) : 100
    }));

    // 4. 🔥 NEW: COMPREHENSIVE ZONE PERFORMANCE (BINS & REPORTS)
    const zonePerformanceQuery = `
      WITH AllZones AS (
          SELECT zone_id, zone_name FROM zones WHERE is_archived = false
          UNION ALL
          SELECT 0 as zone_id, 'Unassigned Area' as zone_name
      ),
      ZoneBins AS (
          SELECT 
              COALESCE(wb.zone_id, 0) as zone_id,
              COUNT(DISTINCT wb.bin_id) as total_bins,
              COUNT(DISTINCT CASE WHEN cr.record_id IS NOT NULL THEN wb.bin_id END) as collected_bins
          FROM waste_bins wb
          LEFT JOIN collection_records cr ON wb.bin_id = cr.bin_id 
              AND cr.timestamp BETWEEN $1 AND $2 
              AND cr.is_archived = false
          WHERE wb.is_archived = false
          GROUP BY COALESCE(wb.zone_id, 0)
      ),
      ZoneReports AS (
          SELECT 
              COALESCE(ta.zone_id, 0) as zone_id,
              COUNT(r.report_id) as total_reports,
              SUM(CASE WHEN r.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_reports
          FROM citizen_reports r
          LEFT JOIN task_assignments ta ON r.assigned_team_id = ta.task_id
          WHERE r.created_at BETWEEN $1 AND $2 AND r.is_archived = false
          GROUP BY COALESCE(ta.zone_id, 0)
      )
      SELECT 
          az.zone_name as zone,
          COALESCE(zb.total_bins, 0)::int as total_bins,
          COALESCE(zb.collected_bins, 0)::int as collected_bins,
          COALESCE(zr.total_reports, 0)::int as total_reports,
          COALESCE(zr.resolved_reports, 0)::int as resolved_reports
      FROM AllZones az
      LEFT JOIN ZoneBins zb ON az.zone_id = zb.zone_id
      LEFT JOIN ZoneReports zr ON az.zone_id = zr.zone_id
      WHERE az.zone_id != 0 OR COALESCE(zb.total_bins, 0) > 0 OR COALESCE(zr.total_reports, 0) > 0
      ORDER BY az.zone_name ASC;
    `;
    const zonePerformanceResult = await pool.query(zonePerformanceQuery, [start, end]);
    const zoneCoverageTable = zonePerformanceResult.rows;

    // 5. Zone Incident Hotspots
    const incidentQuery = `
      WITH ZoneIssues AS (
          SELECT 
              COALESCE(z.zone_name, 'Unassigned Area') AS zone_name,
              CASE WHEN r.issue_type = 'Other' THEN COALESCE(r.issue_type_other, 'Other') ELSE r.issue_type::text END as issue_name,
              COUNT(*) AS issue_count
          FROM citizen_reports r
          LEFT JOIN task_assignments ta ON r.assigned_team_id = ta.task_id
          LEFT JOIN zones z ON ta.zone_id = z.zone_id
          WHERE r.created_at BETWEEN $1 AND $2 AND r.is_archived = false
          GROUP BY z.zone_name, issue_name
      ),
      RankedIssues AS (
          SELECT 
              zone_name, issue_name, issue_count,
              SUM(issue_count) OVER (PARTITION BY zone_name) AS total_zone_reports,
              ROW_NUMBER() OVER (PARTITION BY zone_name ORDER BY issue_count DESC) as rn
          FROM ZoneIssues
      )
      SELECT 
          zone_name, total_zone_reports, issue_name AS top_issue, issue_count AS top_issue_count
      FROM RankedIssues
      WHERE rn = 1
      ORDER BY total_zone_reports DESC;
    `;
    const incidentResult = await pool.query(incidentQuery, [start, end]);
    const zoneIncidentTable = incidentResult.rows.map(row => ({
      zone_name: row.zone_name,
      total_zone_reports: parseInt(row.total_zone_reports),
      top_issue: row.top_issue,
      top_issue_count: parseInt(row.top_issue_count)
    }));

    // Send payload
    res.status(200).json({
      success: true,
      data: {
        totalCollections: parseInt(kpis.total_collections),
        resolvedReports: parseInt(kpis.resolved_reports),
        pendingReports: parseInt(kpis.pending_reports),
        missedCollections: parseInt(kpis.missed_bins),
        topIssues,
        dailySummaryTable, 
        zoneCoverageTable, 
        zoneIncidentTable 
      }
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ success: false, message: "Server Error generating report" });
  }
};

module.exports = { getSystemReport };