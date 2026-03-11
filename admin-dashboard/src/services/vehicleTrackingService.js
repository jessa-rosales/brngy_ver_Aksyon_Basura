const BASE_URL = "https://brngy-nzrth.onrender.com/api";

const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token")}`
});

export const vehicleTrackingService = {
  // Fetches the live fleet data from our new backend route
  getLiveFleet: async () => {
    try {
      const res = await fetch(`${BASE_URL}/tracking/live-fleet`, { 
        headers: getHeaders() 
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch live fleet data");
      }
      
      return await res.json();
    } catch (error) {
      console.error("vehicleTrackingService Error:", error);
      throw error;
    }
  }
};