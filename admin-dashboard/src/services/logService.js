import axios from 'axios';

const API_URL = 'http://localhost:5000/api/logs'; 

export const logService = {
  getAllDutyLogs: async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/duty-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (error) {
      console.error('Failed to fetch duty logs', error);
      return { success: false, data: [] };
    }
  }
};