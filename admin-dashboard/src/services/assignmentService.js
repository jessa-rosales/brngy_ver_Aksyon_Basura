const API_URL = 'http://localhost:5000/api/assignments';

// ✅ Standardized Authorization Headers
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'token': localStorage.getItem('token'), // Backwards compatibility if needed
  'Authorization': `Bearer ${localStorage.getItem('token')}` 
});

export const assignmentService = {
  getOptions: async () => {
    // Requires token to fetch active personnel and zones
    const res = await fetch(`${API_URL}/options`, { headers: getHeaders() });
    return await res.json();
  },

  getAssignments: async () => {
    // Requires token to view current team deployments
    const res = await fetch(API_URL, { headers: getHeaders() });
    return await res.json();
  },

  establish: async (payload) => {
    // Requires token to create new task assignments
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  update: async (id, payload) => {
    try {
      // Requires token to modify existing team schedules
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { error: "Network Error: Failed to update assignment" };
    }
  },
};