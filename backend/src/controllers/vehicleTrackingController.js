const trackingModel = require('../models/vehicleTrackingModel');

const getLiveFleet = async (req, res) => {
    try {
        const rawFleet = await trackingModel.getLiveFleetData();
        
        const formattedFleet = rawFleet.map(truck => {
            const lat = truck.current_lat ? Number(truck.current_lat) : 8.4772;
            const lng = truck.current_lng ? Number(truck.current_lng) : 124.6459;

            const formatTime12 = (dateStr) => {
                if (!dateStr || dateStr === 'Active') return 'Active';
                const date = new Date(dateStr);
                if (isNaN(date)) return '--:--';
                
                let hours = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                
                hours = hours % 12;
                hours = hours ? hours : 12; // the hour '0' should be '12'
                
                return `${hours}:${minutes} ${ampm}`;
            };

            const history = (truck.past_logs || []).map(log => {
                // Safely parse the JSONB array snapshots
                let collectorsArray = [];
                try { collectorsArray = typeof log.team_collectors === 'string' ? JSON.parse(log.team_collectors) : (log.team_collectors || []); } catch(e) {}
                
                let workDaysArray = [];
                try { workDaysArray = typeof log.hist_work_days === 'string' ? JSON.parse(log.hist_work_days) : (log.hist_work_days || []); } catch(e) {}

                return {
                    date: log.actual_start ? new Date(log.actual_start).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                    }) : 'N/A',
                    start: formatTime12(log.actual_start),
                    end: log.actual_end ? formatTime12(log.actual_end) : 'Active',
                    driverName: log.driver_at_time || 'N/A',
                    log_vehicle_name: log.log_vehicle_name || truck.vehicle_name,
                    log_plate_number: log.log_plate_number || truck.plate_number,
                    
                    // 🔥 Historical Snapshot Data mapping
                    log_zone_name: log.hist_zone_name || 'Unassigned',
                    schedStart: log.hist_sched_start ? log.hist_sched_start.slice(0, 5) : '--:--',
                    schedEnd: log.hist_sched_end ? log.hist_sched_end.slice(0, 5) : '--:--',
                    collectors: collectorsArray,
                    workDays: workDaysArray,

                    bins: `${log.bins_collected || 0}/${log.total_bins || 0}`,
                    reports: log.reports_done || 0
                };
            });

            return {
                vehicle_id: truck.vehicle_id,
                vehicle_name: truck.vehicle_name,
                plate_number: truck.plate_number,
                lat: lat,
                lng: lng,
                zoneName: truck.zone_name || 'Standby',
                driverName: truck.driver_name ? truck.driver_name.trim() : 'Unassigned',
                schedStart: truck.sched_start ? truck.sched_start.slice(0, 5) : '--:--',
                schedEnd: truck.sched_end ? truck.sched_end.slice(0, 5) : '--:--',
                startTime: history.length > 0 ? history[0].start : '--:--',
                endTime: history.length > 0 ? history[0].end : '--:--',
                dutyDate: history.length > 0 ? history[0].date : 'N/A',
                history: history,
                binsCollected: Number(truck.bins_collected) || 0,
                totalBins: Number(truck.total_bins_in_zone) || 0,
                reportsCompleted: Number(truck.reports_done) || 0
            };
        });

        res.status(200).json({ success: true, data: formattedFleet });
    } catch (error) {
        console.error("Live Fleet Controller Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { getLiveFleet };