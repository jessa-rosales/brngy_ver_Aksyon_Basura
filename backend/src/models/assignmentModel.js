const pool = require("../db");

// ✅ Global day order for reference
const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ✅ Helper: Check if two date ranges overlap
const datesOverlap = (s1, e1, s2, e2) => {
  const start1 = s1 ? new Date(s1) : new Date('1900-01-01');
  const end1 = e1 ? new Date(e1) : new Date('2100-12-31');
  const start2 = s2 ? new Date(s2) : new Date('1900-01-01');
  const end2 = e2 ? new Date(e2) : new Date('2100-12-31');
  return start1 <= end2 && end1 >= start2;
};

// ✅ Helper: Split shifts into daily slots (handles overnight logic)
const getOccupiedSlots = (days, start, end) => {
  const slots = [];
  if (!Array.isArray(days)) return slots;

  days.forEach(day => {
    const dayIdx = dayOrder.indexOf(day);
    if (dayIdx === -1) return;

    if (start < end) {
      slots.push({ dayIdx, start, end });
    } else {
      // Overnight Shift (e.g., 22:00 - 06:00)
      slots.push({ dayIdx, start, end: '23:59' }); 
      slots.push({ dayIdx: (dayIdx + 1) % 7, start: '00:00', end }); 
    }
  });
  return slots;
};

const assignmentModel = {
  // ✅ REUSABLE VALIDATION LOGIC
  validateConflicts: async (client, data, excludeId = null) => {
    const { driver_id, vehicle_id, zone_id, collector_ids, work_days, start_time, end_time, start_date, end_date } = data;
    const newSlots = getOccupiedSlots(work_days, start_time, end_time);

    // --- 0. PHYSICAL VEHICLE STATUS CHECK ---
    // Kini mopugong sa pag-assign kung ang trak naka-Maintenance o Inactive
    if (vehicle_id) {
      const vCheck = await client.query(
        "SELECT vehicle_name, status FROM public.vehicles WHERE vehicle_id = $1", 
        [vehicle_id]
      );
      if (vCheck.rows.length > 0) {
        const v = vCheck.rows[0];
        if (v.status !== 'Active') {
          throw new Error(`Conflict: ${v.vehicle_name} is currently under ${v.status} and cannot be deployed.`);
        }
      }
    }

    // --- 1. RESOURCE USAGE CONFLICTS (Driver, Vehicle usage, Zone) ---
    let query = `
      SELECT a.*, u.first_name, u.last_name, z.zone_name,
             TO_CHAR(a.start_time, 'HH24:MI') as s_time, 
             TO_CHAR(a.end_time, 'HH24:MI') as e_time 
      FROM public.task_assignments a 
      LEFT JOIN public.users u ON a.driver_id = u.user_id
      LEFT JOIN public.zones z ON a.zone_id = z.zone_id
      WHERE a.status = 'Active' 
        AND a.is_archived = false 
        AND (z.is_archived = false OR z.zone_id IS NULL) -- ✅ IGNORE ARCHIVED ZONES
    `;
    if (excludeId) query += ` AND a.task_id != ${excludeId}`;
    
    const existing = await client.query(query);

    for (let task of existing.rows) {
      if (datesOverlap(start_date, end_date, task.start_date, task.end_date)) {
        const existingSlots = getOccupiedSlots(task.work_days, task.s_time, task.e_time);

        for (let n of newSlots) {
          for (let e of existingSlots) {
            if (n.dayIdx === e.dayIdx && n.start < e.end && n.end > e.start) {
              if (driver_id && parseInt(driver_id) === task.driver_id) {
                throw new Error(`Conflict: ${task.first_name} ${task.last_name} is already scheduled for duty from ${task.s_time}-${task.e_time}.`);
              }
              if (vehicle_id && parseInt(vehicle_id) === task.vehicle_id) {
                throw new Error(`Conflict: This vehicle is already in use from ${task.s_time}-${task.e_time} by another team.`);
              }
              if (zone_id && parseInt(zone_id) === task.zone_id) {
                throw new Error(`Conflict: ${task.zone_name} is already being serviced from ${task.s_time} to ${task.e_time}.`);
              }
            }
          }
        }
      }
    }

    // --- 2. COLLECTOR CONFLICT CHECK ---
    if (collector_ids?.length > 0) {
      let colQuery = `
        SELECT tc.collector_id, u.first_name, u.last_name, a.work_days, a.start_date, a.end_date,
               TO_CHAR(a.start_time, 'HH24:MI') as s_time, TO_CHAR(a.end_time, 'HH24:MI') as e_time
        FROM public.task_collectors tc
        JOIN public.task_assignments a ON tc.task_id = a.task_id
        JOIN public.users u ON tc.collector_id = u.user_id
        WHERE tc.collector_id = ANY($1) 
          AND a.status = 'Active' 
          AND a.is_archived = false
      `;
      if (excludeId) colQuery += ` AND a.task_id != ${excludeId}`;
      
      const colRes = await client.query(colQuery, [collector_ids]);
      for (let col of colRes.rows) {
        if (datesOverlap(start_date, end_date, col.start_date, col.end_date)) {
          const colSlots = getOccupiedSlots(col.work_days, col.s_time, col.e_time);
          for (let n of newSlots) {
            for (let cs of colSlots) {
              if (n.dayIdx === cs.dayIdx && n.start < cs.end && n.end > cs.start) {
                throw new Error(`Conflict: ${col.first_name} ${col.last_name} is already assigned to a shift from ${col.s_time} to ${col.e_time}.`);
              }
            }
          }
        }
      }
    }
  },

  create: async (data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const d_id = data.driver_id ? parseInt(data.driver_id) : null;
      const v_id = data.vehicle_id ? parseInt(data.vehicle_id) : null;
      const z_id = data.zone_id ? parseInt(data.zone_id) : null;
      const cleaned = { ...data, driver_id: d_id, vehicle_id: v_id, zone_id: z_id };

      await assignmentModel.validateConflicts(client, cleaned);

      const assignStatus = (d_id && v_id && z_id && data.work_days?.length > 0 && data.start_time && data.end_time) ? 'Active' : 'Draft';
      const res = await client.query(
        `INSERT INTO public.task_assignments 
        (driver_id, vehicle_id, zone_id, work_days, start_time, end_time, start_date, end_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING task_id`,
        [d_id, v_id, z_id, JSON.stringify(data.work_days || []), data.start_time, data.end_time, data.start_date || null, data.end_date || null, assignStatus]
      );

      const taskId = res.rows[0].task_id;
      if (data.collector_ids?.length > 0) {
        for (const cid of data.collector_ids) {
          await client.query('INSERT INTO public.task_collectors (task_id, collector_id) VALUES ($1, $2)', [taskId, cid]);
        }
      }
      await client.query('COMMIT');
      return { success: true, task_id: taskId };
    } catch (err) {
      await client.query('ROLLBACK');
      return { error: err.message };
    } finally {
      client.release();
    }
  },

  update: async (id, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const d_id = data.driver_id ? parseInt(data.driver_id) : null;
      const v_id = data.vehicle_id ? parseInt(data.vehicle_id) : null;
      const z_id = data.zone_id ? parseInt(data.zone_id) : null;
      const cleaned = { ...data, driver_id: d_id, vehicle_id: v_id, zone_id: z_id };

      await assignmentModel.validateConflicts(client, cleaned, id);

      const assignStatus = (d_id && v_id && z_id && data.work_days?.length > 0 && data.start_time && data.end_time) ? 'Active' : 'Draft';
      await client.query(
        `UPDATE public.task_assignments 
         SET driver_id=$1, vehicle_id=$2, zone_id=$3, work_days=$4, start_time=$5, end_time=$6, start_date=$7, end_date=$8, status=$9
         WHERE task_id=$10`,
        [d_id, v_id, z_id, JSON.stringify(data.work_days), data.start_time, data.end_time, data.start_date || null, data.end_date || null, assignStatus, id]
      );

      await client.query('DELETE FROM public.task_collectors WHERE task_id = $1', [id]);
      if (data.collector_ids?.length > 0) {
        for (const cid of data.collector_ids) {
          await client.query('INSERT INTO public.task_collectors (task_id, collector_id) VALUES ($1, $2)', [id, cid]);
        }
      }
      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      return { error: err.message };
    } finally {
      client.release();
    }
  },

  getAll: async () => {
    const query = `
      SELECT 
          a.task_id, a.driver_id, a.vehicle_id, a.zone_id,
          u.first_name, u.last_name,
          v.vehicle_name,
          v.plate_number,
          v.status AS truck_status,
          v.is_archived AS truck_archived, 
          a.status AS assignment_status, 
          z.zone_name,
          a.work_days, a.start_date, a.end_date,
          TO_CHAR(a.start_time, 'HH24:MI') as start_time, 
          TO_CHAR(a.end_time, 'HH24:MI') as end_time,
          (SELECT ARRAY_AGG(tc.collector_id) FROM public.task_collectors tc WHERE tc.task_id = a.task_id) as collector_ids,
          (SELECT ARRAY_AGG(usr.first_name || ' ' || usr.last_name) 
           FROM public.task_collectors tc 
           JOIN public.users usr ON tc.collector_id = usr.user_id 
           WHERE tc.task_id = a.task_id) as collector_names
      FROM public.task_assignments a
      LEFT JOIN public.users u ON a.driver_id = u.user_id
      LEFT JOIN public.vehicles v ON a.vehicle_id = v.vehicle_id
      LEFT JOIN public.zones z ON a.zone_id = z.zone_id
      WHERE a.is_archived = false
        AND (z.is_archived = false OR z.zone_id IS NULL) -- ✅ STRICT FIX: Hides active schedules if their zone was archived
      ORDER BY a.task_id DESC;
    `;
    const res = await pool.query(query);
    return res.rows;
  },

  archive: async (id) => {
    const result = await pool.query(
      "UPDATE public.task_assignments SET is_archived = true WHERE task_id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }
};

module.exports = assignmentModel;