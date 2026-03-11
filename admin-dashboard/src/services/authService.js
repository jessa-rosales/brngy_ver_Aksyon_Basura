const BASE_URL = "https://brngy-nzrth.onrender.com/api/users";

export const authService = {
  // 1. Login
  login: async (credentials) => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ✅ Pass loginType so the backend enforces Admin-only access for the dashboard
      body: JSON.stringify({ 
        ...credentials, 
        loginType: 'website' 
      })
    });
    return res; 
  },

  // 2. Verify Session
  verifyToken: async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const res = await fetch(`${BASE_URL}/verify`, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}` 
        }
      });
      
      if (!res.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("userProfile"); // Clear profile too if token is dead
        return null;
      }
      
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // 3. Logout
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userProfile");
    window.location.href = "/login"; 
  }
};