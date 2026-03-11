import axios from 'axios';

// Replace with your actual backend URL if different
const API_URL = 'https://brngy-nzrth.onrender.com/api/public'; 

export const publicService = {
  getZones: async () => {
    const response = await axios.get(`${API_URL}/zones`);
    return response.data;
  },
  
  getBins: async () => {
    const response = await axios.get(`${API_URL}/bins`);
    return response.data;
  },
  
  getReports: async () => {
    const response = await axios.get(`${API_URL}/reports`);
    return response.data;
  }
};