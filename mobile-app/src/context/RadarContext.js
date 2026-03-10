import React, { createContext, useState, useContext } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

const RadarContext = createContext();

export const RadarProvider = ({ children }) => {
  const [isNotifyActive, setIsNotifyActive] = useState(false);
  const [isNotifyLoading, setIsNotifyLoading] = useState(false);
  const [notifyTargetLocation, setNotifyTargetLocation] = useState(null);
  const [truckDistance, setTruckDistance] = useState(null);

  // The universal function to turn the radar on and off
  const toggleRadar = async (customAlertSetter = null) => {
    if (isNotifyLoading) return;

    // If it's on, turn it off
    if (isNotifyActive) {
      setIsNotifyActive(false);
      setNotifyTargetLocation(null);
      setTruckDistance(null);
      return;
    }

    // Turn it on
    setIsNotifyLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const msg = "We need your location to tell you when the truck is nearby.";
        customAlertSetter 
          ? customAlertSetter({ visible: true, title: "Location Needed", message: msg, type: "warning" })
          : Alert.alert("Location Needed", msg);
        setIsNotifyLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      setNotifyTargetLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      setIsNotifyActive(true);

    } catch (error) {
      const msg = "Could not find your exact location. Ensure GPS is enabled.";
      customAlertSetter 
          ? customAlertSetter({ visible: true, title: "GPS Error", message: msg, type: "danger" })
          : Alert.alert("GPS Error", msg);
    } finally {
      setIsNotifyLoading(false);
    }
  };

  // Used to reset when the truck actually arrives
  const triggerArrivalReset = () => {
    setIsNotifyActive(false);
    setNotifyTargetLocation(null);
    setTruckDistance(null);
  };

  return (
    <RadarContext.Provider value={{
      isNotifyActive,
      isNotifyLoading,
      notifyTargetLocation,
      truckDistance,
      setTruckDistance,
      toggleRadar,
      triggerArrivalReset
    }}>
      {children}
    </RadarContext.Provider>
  );
};

// Custom hook for easy access
export const useRadar = () => useContext(RadarContext);