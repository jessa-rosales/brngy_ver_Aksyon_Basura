const BASE_URL = "http://localhost:5000/api/collections";

export const collectionService = {
  getCollectedBins: async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(BASE_URL, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch collected bins");
      return await res.json();
    } catch (error) {
      console.error("Service Error:", error);
      return [];
    }
  },

    archiveRecord: async (id) => {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/collections/${id}/archive`, {
        method: 'PATCH', // Using PATCH for soft-deletes
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
        });
        if (!res.ok) throw new Error("Failed to archive record");
        return await res.json();
    } catch (error) {
        console.error("Service Error:", error);
        throw error;
    }
    },

    getArchivedBins: async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/archived`, { // You'll need to create this endpoint
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (error) {
    console.error("Fetch Archive Error:", error);
    return [];
  }
},

restoreRecord: async (id) => {
  try {
    const token = localStorage.getItem("token");
    const cleanId = id.toString().replace('COL-', '');
    const res = await fetch(`${BASE_URL}/${cleanId}/restore`, {
      method: 'PATCH',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (error) {
    throw error;
  }
}
};