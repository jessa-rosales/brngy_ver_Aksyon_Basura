import axios from 'axios';

const API_URL = 'https://brngy-nzrth.onrender.com/api/logs'; 

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