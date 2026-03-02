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



//FOR CITIZEN TASK SCREEN
// 📸 Collector uploads photo for Citizen Report
  // 📸 Collector uploads photo for Citizen Report
  uploadReportEvidence: async (reportId, photoUri) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const profileData = await AsyncStorage.getItem('userProfile');
      const user = JSON.parse(profileData);

      const formData = new FormData();
      
      // ✅ FIXED: Safely fallback to user.id if user.user_id is undefined
      const actualUserId = user.user_id || user.id; 
      formData.append('collector_id', actualUserId);

      const filename = photoUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('photo', {
        uri: photoUri,
        name: filename,
        type: type
      });

      const response = await fetch(`${API_URL}/reports/${reportId}/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Upload Report Evidence Error:", error);
      throw error;
    }
  },

  // 🚚 Driver confirms resolution of Citizen Report
  confirmReportResolution: async (reportId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const profileData = await AsyncStorage.getItem('userProfile');
      const user = JSON.parse(profileData);
      
      const response = await fetch(`${API_URL}/reports/${reportId}/confirm-resolution`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ driver_id: user.user_id })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Confirm Report Resolution Error:", error);
      throw error;
    }
  },
  
  // Fetch live tracking data for the Citizen TrackScreen
  // 🚚 Fetch live tracking data for the TrackScreen
  getZoneTrackingData: async () => {
    try {
      const token = await AsyncStorage.getItem('token'); 
      
      const response = await fetch(`${API_URL}/mobile/tracking-routes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`, 
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text(); 
        console.error("SERVER REJECTED TRACKING ROUTES:", errorText);
        throw new Error(`Failed to fetch tracking routes: ${errorText}`);
      }
      
      return await response.json(); // Expected format: { success: true, data: [...] }
    } catch (error) {
      console.error("Tracking Route Error:", error);
      return { success: false, data: [] }; // Fallback so the app doesn't crash
    }
  },


//For MyHistory in the Profile Screen
  getUserReportHistory: async () => {
    try {
      // ✅ Must get token so the backend knows WHO is looking at the reports
      let token = await AsyncStorage.getItem('userToken'); 
      if (!token) token = await AsyncStorage.getItem('token'); 
      
      const response = await fetch(`${API_URL}/mobile/all-reports`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 👈 Critical for 'has_attended' to work
        }
      });
      return await response.json();
    } catch (error) {
      console.error("Get User Report History Error:", error);
      return { success: false, message: 'Network error' };
    }
  },

//For Archive Center in the Profile Screen
archiveReport: async (reportId) => {
    try {
      // Get the token securely
      let token = await AsyncStorage.getItem('userToken'); 
      if (!token) {
        token = await AsyncStorage.getItem('token'); 
      }
      
      const response = await fetch(`${API_URL}/mobile/archive-report`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ report_id: reportId })
      });

      return await response.json();
      
    } catch (error) {
      console.error("Archive Report Service Error:", error);
      return { success: false, message: 'Network error' };
    }
  },

  // Add this inside your mobileService object
  getArchivedReports: async () => {
    try {
      // Get token safely
      let token = await AsyncStorage.getItem('userToken'); 
      if (!token) token = await AsyncStorage.getItem('token'); 
      
      const response = await fetch(`${API_URL}/mobile/archived-reports`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      return await response.json();
    } catch (error) {
      console.error("Archived Reports Service Error:", error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Unified image URL handler
 /*
  getImageUrl: (path) => {
    if (!path) return null;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${NGROK_URL}${cleanPath}`;
  } UPDATED MARCH 3*/

  // Unified image URL handler (BULLETPROOF VERSION)
  getImageUrl: (path) => {
    if (!path || path === "" || path === "null") return null;
    
    // If it's already a full URL, just return it
    if (path.startsWith('http')) return path;
    
    // Remove all leading slashes from the path, and trailing slashes from NGROK
    const cleanPath = path.replace(/^\/+/, ''); 
    const cleanBase = NGROK_URL.replace(/\/+$/, '');
    
    return `${cleanBase}/${cleanPath}`;
  }

};