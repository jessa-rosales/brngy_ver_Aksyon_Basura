const BASE_URL = "https://brngy-nzrth.onrender.com/api/archive";

export const archiveService = {
  /**
   * Fetch archived items based on category
   * @param {string} category - 'bins', 'reports', 'tasks', 'zones', 'announcements', or 'users'
   */
  getArchives: async (category) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/${category}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error(`Failed to fetch archived ${category}`);
      return await res.json();
    } catch (error) {
      console.error("Archive Service Error:", error);
      return [];
    }
  },

  /**
   * Restore an archived item back to active status
   */
  restoreItem: async (category, id) => {
    try {
      const token = localStorage.getItem("token");
      // Strip prefixes if they exist (e.g., 'COL-1' becomes '1')
      const cleanId = id.toString().replace(/^[A-Z]+-/, '');
      
      const res = await fetch(`${BASE_URL}/${category}/${cleanId}/restore`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to restore item");
      return await res.json();
    } catch (error) {
      console.error("Restore Service Error:", error);
      throw error;
    }
  }
};