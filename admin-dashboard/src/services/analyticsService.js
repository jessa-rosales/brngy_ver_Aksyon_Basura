const BASE_URL = "http://localhost:5000/api/analytics";

const getHeaders = () => ({
  "Authorization": `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json"
});

export const analyticsService = {
  // Add 'type' as the third parameter
  getSystemReport: async (startDate, endDate, type) => {
    const res = await fetch(`${BASE_URL}/system-report?startDate=${startDate}&endDate=${endDate}&type=${type}`, {
      method: "GET",
      headers: getHeaders()
    });
    
    const result = await res.json();
    
    if (!result.success) {
      throw new Error(result.message || "Failed to fetch analytics");
    }
    
    return result.data; 
  }
};