/*import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the same NGROK URL as your other services
const NGROK_URL = "https://jalousied-overenviously-malka.ngrok-free.dev";
const API_URL = `${NGROK_URL}/api`;

export const driverService = {
  // 1. Fetch Assigned Routes
  getAssignedRoute: async (userId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/mobile/assignment/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true', // ✅ Critical for NGROK
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Driver Service Fetch Error:", error);
      throw error;
    }
  },

  // 2. ✅ ADD THIS: This is what the background task calls
  updateLiveLocation: async (userId, locationData) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/driver/update-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true', // ✅ Required for background POST too
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          userId,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timestamp: locationData.timestamp
        }),
      });

      if (!response.ok) {
        // Log error but don't throw (to keep the background task running)
        console.log("Location Sync Failed:", await response.text());
        return null;
      }

      return await response.json();
    } catch (error) {
      console.log("Background Sync Network Error:", error);
      return null;
    }
  }
};*/



import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the same NGROK URL as your other services
const NGROK_URL = "https://jalousied-overenviously-malka.ngrok-free.dev";
const API_URL = `${NGROK_URL}/api`;

export const driverService = {
  // Calls the new dedicated mobile-only endpoint
  getAssignedRoute: async (userId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/mobile/assignment/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Driver Service Fetch Error:", error);
      throw error;
    }
  }
};