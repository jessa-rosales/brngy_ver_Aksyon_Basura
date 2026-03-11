import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = "http://localhost:5000/api";
//const BASE_URL = "http://localhost:5000/api";

// ✅ Updated to be Async for Mobile
const getHeaders = async () => {
  const token = await AsyncStorage.getItem("token"); // Changed from localStorage
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

export const zoneService = {
  getZones: async () => {
    const headers = await getHeaders(); // Await the headers
    const res = await fetch(`${BASE_URL}/zones`, { headers });
    if (!res.ok) throw new Error("Failed to fetch zones");
    return res.json();
  },

  // ... Update your other functions (addZone, getAllBins, etc.) 
  // to await getHeaders() just like getZones above.
  
  getCollectionProof: async (binId) => {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/collection-records/bin/${binId}`, { 
      headers 
    });
    return res.json();
  }
};