import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileService } from '../services/mobileService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  // --- LOGIC: Check how many posts are newer than the last visit ---
  const checkUnreadAnnouncements = async () => {
    try {
      const response = await mobileService.getAnnouncements();
      const announcements = await response.json();
      
      const lastOpened = await AsyncStorage.getItem('news_last_opened');
      
      // If user has never opened the tab, we treat the start of time as the date
      const lastOpenedDate = lastOpened ? new Date(lastOpened) : new Date(0);

      // Filter announcements that were published AFTER the last saved timestamp
      const newItems = announcements.filter(ann => 
        new Date(ann.date_published) > lastOpenedDate
      );

      setUnreadCount(newItems.length);
    } catch (err) {
      console.error("Badge sync error:", err);
    }
  };

  // --- LOGIC: Save current time as "Last Seen" and clear badge ---
  const markAsRead = async () => {
    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem('news_last_opened', now);
      setUnreadCount(0);
    } catch (err) {
      console.error("Error saving last seen:", err);
    }
  };

  // Check for new announcements every time the app initializes
  useEffect(() => {
    checkUnreadAnnouncements();
  }, []);

  return (
    <NotificationContext.Provider 
      value={{ unreadCount, checkUnreadAnnouncements, markAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook for easy access in other screens
export const useNotifications = () => useContext(NotificationContext);