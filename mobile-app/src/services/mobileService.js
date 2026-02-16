import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: Always ensure this matches your active ngrok terminal output
const NGROK_URL = "https://jalousied-overenviously-malka.ngrok-free.dev";
const API_URL = `${NGROK_URL}/api`;

export const mobileService = {
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' 
        },
        body: JSON.stringify({ email, password, loginType: 'mobile' }),
      });

      const clone = response.clone();
      const data = await clone.json();

      if (response.ok && data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('userProfile', JSON.stringify(data.user));
      }
      return response; 
    } catch (error) {
      console.error("Mobile Login API Error:", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'userProfile']);
    } catch (error) {
      console.error("Logout Storage Error:", error);
    }
  },

  register: async (userData) => {
    return await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' 
      },
      body: JSON.stringify(userData),
    });
  },

  getAnnouncements: async () => {
    try {
      return await fetch(`${API_URL}/announcements`, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
    } catch (error) {
      console.error("Fetch Announcements Error:", error);
      throw error;
    }
  },

  // Specifically for mobile profile text updates
  updateMobileProfile: async (id, userData) => {
    try {
      const token = await AsyncStorage.getItem('token');
      return await fetch(`${API_URL}/users/mobile-profile/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData),
      });
    } catch (error) {
      console.error("Update Profile Error:", error);
      throw error;
    }
  },

  // Specifically for mobile photo uploads
  uploadProfilePic: async (formData) => {
    try {
      const token = await AsyncStorage.getItem('token'); 
      return await fetch(`${API_URL}/users/upload-profile-pic`, { 
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}` 
          // Do NOT set Content-Type; FormData needs the automatic boundary
        },
        body: formData,
      });
    } catch (error) {
      console.error("Upload Pic Error:", error);
      throw error;
    }
  },

  //FOR MY SCHEDULE SCREEN
  // ADD THIS: Fetch schedule for the specific staff member
  getStaffSchedule: async (userId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    // Ensure the path matches your backend (e.g., /api/assignments/staff/...)
    const response = await fetch(`${API_URL}/assignments/staff/${userId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json', // Force JSON acceptance
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
    });

    // Check if response is actually JSON before parsing
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return await response.json();
    } else {
      const text = await response.text();
      console.error("Server returned non-JSON response:", text);
      return { message: "Server Error" };
    }
  } catch (error) {
    console.error("Fetch Schedule Error:", error);
    throw error;
  }
},


//FOR REPORT SCREEN
// Inside mobileService.js
// mobile-app/src/services/mobileService.js
submitCitizenReport: async (formData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_URL}/reports/submit-report`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Authorization': `Bearer ${token}` 
        // Note: Do NOT set 'Content-Type' manually when sending FormData
      },
      body: formData, 
    });
    return await response.json();
  } catch (error) {
    console.error("Error in submitCitizenReport:", error);
    throw error;
  }
},

// --- ADDED FOR FEED SCREEN ---
getAllReports: async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_URL}/reports`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true' // Critical to bypass ngrok landing page
      },
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return await response.json();
    } else {
      // If we got HTML (like an error page), log it to help debugging
      const text = await response.text();
      console.error("Server returned non-JSON. Check backend routes or ngrok status.", text.substring(0, 100));
      return { success: false, message: "Server Error: Non-JSON response" };
    }
  } catch (error) {
    console.error("Error in getAllReports:", error);
    throw error;
  }
},

//FOR NEED ATTENTION FROM THE FEED SCREEN
toggleAttention: async (reportId, userId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_URL}/reports/toggle-attention`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ report_id: reportId, user_id: userId }),
    });
    return await response.json();
  } catch (error) {
    console.error("Toggle Attention Error:", error);
    throw error;
  }
},
/*
// Fetch all zones to find the one assigned to the staff
  getZones: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/zones`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Fetch Zones Error:", error);
      throw error;
    }
  },

  // Helper to fetch a specific zone detail if your backend supports it
  getZoneDetails: async (zoneId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/zones/${zoneId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Fetch Zone Details Error:", error);
      throw error;
    }
  },

  getZoneDetails: async (zoneId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_URL}/zones/${zoneId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Fetch Zone Details Error:", error);
    throw error;
  }
},*/
  // Unified image URL handler
  getImageUrl: (path) => {
    if (!path) return null;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${NGROK_URL}${cleanPath}`;
  }
};