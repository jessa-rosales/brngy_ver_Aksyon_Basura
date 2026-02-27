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

const NGROK_URL = "https://jalousied-overenviously-malka.ngrok-free.dev";
const API_URL = `${NGROK_URL}/api`;

export const driverService = {
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
  },

 // 📸 UPDATED: Upload the evidence using FormData for Multer
 uploadEvidence: async (binId, taskId, photoUri) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const profileData = await AsyncStorage.getItem('userProfile');
      const user = JSON.parse(profileData);

      const formData = new FormData();
      formData.append('bin_id', binId);
      formData.append('task_id', taskId);
      formData.append('personnel_id', user.user_id);

      // Format the image for React Native upload
      const filename = photoUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('photo', {
        uri: photoUri,
        name: filename,
        type: type
      });

      console.log("Sending payload to backend...");

      const response = await fetch(`${API_URL}/mobile/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // ⚠️ NOTICE: 'Content-Type' is completely removed here! 
          // If you set it to JSON, Multer will ignore the file and crash.
        },
        body: formData
      });

      if (!response.ok) {
        // 🔥 NEW: Actually read the error message the backend is sending us!
        const errorText = await response.text();
        console.error("SERVER REJECTED UPLOAD:", errorText);
        throw new Error(`Server Error: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Upload Evidence Error:", error);
      throw error;
    }
  },

  // 🚚 NEW: Driver confirms collection
  confirmCollection: async (binId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/mobile/confirm-collection`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ bin_id: binId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Confirm Collection Error:", error);
      throw error;
    }
  },

  updateTruckLocation: async (vehicleId, lat, lng) => {
    try {
      console.log(`🚀 Sending GPS Sync... Vehicle: ${vehicleId} | Lat: ${lat} | Lng: ${lng}`);
      
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/mobile/vehicle-location`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ vehicle_id: vehicleId, lat, lng })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Server rejected GPS sync:", errorText);
      }
    } catch (error) {
      console.error("❌ Failed to sync truck location:", error);
    }
  }
};