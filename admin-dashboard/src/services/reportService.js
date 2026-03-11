const API_URL = "https://brngy-nzrth.onrender.com/api";

export const reportService = {
  // 1. Fetch all reports
  getAllReports: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/reports`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
    });
    return await response.json();
  },

  getZoneForReport: async (lat, lng) => {
    try {
      const response = await fetch(`${API_URL}/zones/find-by-coords?lat=${lat}&lng=${lng}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      return await response.json();
    } catch (error) {
      console.error("Error finding zone:", error);
      return null;
    }
  },


  // 2. Update Status (Pending -> In Progress -> Resolved)
  updateReportStatus: async (reportId, status) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/reports/${reportId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status }),
    });
    return await response.json();
  },

  // 3. Delete Report
  deleteReport: async (reportId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/reports/${reportId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });
    return await response.json();
  },

  assignTeamToReport: async (reportId, taskId) => {
    // 1. Get the token from localStorage (or wherever you save your JWT)
    const token = localStorage.getItem('token'); 

    try {
      const response = await fetch(`https://brngy-nzrth.onrender.com/api/reports/${reportId}/assign`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ REQUIRED for the 'authorize' middleware
        },
        body: JSON.stringify({ assigned_team_id: taskId }),
      });
      
      return await response.json();
    } catch (error) {
      console.error("Assignment service error:", error);
      return { success: false, error: "Connection failed" };
    }
  },

};