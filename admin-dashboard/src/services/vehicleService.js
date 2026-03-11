const API_URL = 'https://brngy-nzrth.onrender.com/api/vehicles';

// ✅ Standardized Authorization Headers
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const vehicleService = {
  getAll: async () => {
    try {
      // Requires token to view the truck list
      const res = await fetch(API_URL, { headers: getHeaders() });
      return await res.json();
    } catch (err) {
      return { error: "Failed to fetch vehicles" };
    }
  },

  register: async (payload) => {
    try {
      // Requires token to add new trucks to the fleet
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { error: "Network Error: Failed to register vehicle" };
    }
  },

  update: async (id, payload) => {
    try {
      // Requires token to update vehicle status (e.g., to Maintenance)
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { error: "Network Error: Failed to update vehicle" };
    }
  },

  deleteVehicle: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://brngy-nzrth.onrender.com/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to archive vehicle");
      return data;
    } catch (error) {
      console.error("Service Error:", error);
      return { error: error.message };
    }
  }
};