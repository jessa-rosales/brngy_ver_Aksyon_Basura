const API_URL = 'http://localhost:5000/api/vehicles';

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

  delete: async (id) => {
    try {
      // Requires token for administrative deletion
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await res.json();
    } catch (err) {
      return { error: "Network Error: Failed to delete vehicle" };
    }
  }
};