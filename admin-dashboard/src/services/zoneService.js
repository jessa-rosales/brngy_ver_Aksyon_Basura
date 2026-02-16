const BASE_URL = "http://localhost:5000/api";

const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token")}` // ✅ Updated
});

export const zoneService = {
  getZones: async () => {
    const res = await fetch(`${BASE_URL}/zones`, { headers: getHeaders() });
    return res.json();
  },

  addZone: async (zoneData) => {
    const res = await fetch(`${BASE_URL}/zones`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        zone_name: zoneData.zoneName,
        zone_color: zoneData.zoneColor,
        coordinates: zoneData.coordinates 
      })
    });
    return res.json();
  },

  updateZone: async (zoneId, updatedData) => {
    const res = await fetch(`${BASE_URL}/zones/${zoneId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        zone_name: updatedData.zoneName,
        zone_color: updatedData.zoneColor,
        boundaries: updatedData.coordinates 
      })
    });
    return res.json();
  },

  deleteZone: async (id) => {
    const res = await fetch(`${BASE_URL}/zones/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    return res.ok;
  },

  getAllBins: async () => {
    const res = await fetch(`${BASE_URL}/bins`, { headers: getHeaders() });
    return res.json();
  },

  getBinsByZone: async (zoneId) => {
    const res = await fetch(`${BASE_URL}/bins/zone/${zoneId}`, { headers: getHeaders() });
    return res.json();
  },

  addBin: async (binData) => {
    return fetch(`${BASE_URL}/bins`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(binData)
    });
  },

  relocateBin: async (binId, coords) => {
    return fetch(`${BASE_URL}/bins/${binId}/relocate`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ latitude: coords.lat, longitude: coords.lng })
    });
  },

  deleteBin: async (binId) => {
    return fetch(`${BASE_URL}/bins/${binId}`, {
      method: "DELETE",
      headers: getHeaders()
    });
  }
};