const trackingModel = require('../models/vehicleTrackingModel');

const getLiveFleet = async (req, res) => {
    try {
        const rawFleet = await trackingModel.getLiveFleetData();
        
        const formattedFleet = rawFleet.map(truck => {
            const lat = truck.current_lat ? Number(truck.current_lat) : 8.4772;
            const lng = truck.current_lng ? Number(truck.current_lng) : 124.6459;

            // Helper to format timestamps to HH:MM AM/PM
            const formatTime = (dateStr) => {
                if (!dateStr) return 'Active';
                return new Date(dateStr).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
            };

            // Process the list of past logs for the Modal
            const history = (truck.past_logs || []).map(log => ({
                date: log.actual_start ? new Date(log.actual_start).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                }) : 'N/A',
                start: formatTime(log.actual_start),
                end: formatTime(log.actual_end),
                collectors: log.team_collectors || [],
                bins: `${log.bins_collected || 0}/${log.total_bins || 0}`,
                reports: log.reports_done || 0
            }));

            return {
                vehicle_id: truck.vehicle_id,
                vehicle_name: truck.vehicle_name,
                plate_number: truck.plate_number,
                lat: lat,
                lng: lng,
                
                // Current Card Stats
                zoneName: truck.zone_name || 'Standby',
                driverName: truck.driver_name ? truck.driver_name.trim() : 'Unassigned',
                
                // Schedule from Task Assignment
                schedStart: truck.sched_start ? truck.sched_start.slice(0, 5) : '--:--',
                schedEnd: truck.sched_end ? truck.sched_end.slice(0, 5) : '--:--',
                
                // Latest Duty Info (for the card display)
                startTime: history.length > 0 ? history[0].start : '--:--',
                endTime: history.length > 0 ? history[0].end : '--:--',
                dutyDate: history.length > 0 ? history[0].date : 'N/A',

                // The Full List for the Modal
                history: history,

                // Current Stats
                binsCollected: Number(truck.bins_collected) || 0,
                totalBins: Number(truck.total_bins_in_zone) || 0,
                reportsCompleted: Number(truck.reports_completed) || 0
            };
        });

        res.status(200).json({ success: true, data: formattedFleet });
    } catch (error) {
        console.error("Live Fleet Controller Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { getLiveFleet };