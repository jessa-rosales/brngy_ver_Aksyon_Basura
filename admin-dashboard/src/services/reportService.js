const API_URL = "http://localhost:5000/api";

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
  }
};