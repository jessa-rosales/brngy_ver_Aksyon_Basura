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