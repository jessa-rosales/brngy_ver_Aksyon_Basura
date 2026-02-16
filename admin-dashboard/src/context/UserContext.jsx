import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Load immediately from LocalStorage to prevent the "flicker"
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved ? JSON.parse(saved) : null;
  });

  const refreshUser = async () => {
    try {
      const data = await authService.verifyToken();
      if (data) {
        setUser(data);
        localStorage.setItem("userProfile", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Context: Sync failed", err);
    }
  };

  // Run a background check once when the app starts
  useEffect(() => { refreshUser(); }, []);

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);