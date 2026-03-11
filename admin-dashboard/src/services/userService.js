const BASE_URL = "https://brngy-nzrth.onrender.com/api/users";

const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token")}` 
});

export const userService = {
  getUsers: async () => {
    try {
      const res = await fetch(BASE_URL, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch users");
      return await res.json();
    } catch (err) {
      console.error("userService.getUsers error:", err);
      throw err;
    }
  },

  addUser: async (userData) => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(userData) 
    });
    return res.json();
  },

  updateUser: async (id, userData) => {
    // ✅ Ensure mapping: frontend 'phone' becomes backend 'contact_number' if needed
    // Your controller destructures { email, phone, firstName, lastName... }
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  // ✅ Fixed: Changed API_URL to BASE_URL to match your variable above
  uploadAvatar: async (formData) => {
    const token = localStorage.getItem("token");
    // CHANGE: Changed /upload-avatar to /upload-profile-pic to match your backend route
    const response = await fetch(`${BASE_URL}/upload-profile-pic`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
            // NOTE: Do not include "Content-Type" here for FormData
        },
        body: formData, 
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
    }
    
    return response.json();
  },

  deleteUser: async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  }
};