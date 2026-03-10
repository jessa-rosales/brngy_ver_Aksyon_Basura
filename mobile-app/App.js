import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

//Import both of your providers
import { NotificationProvider } from './src/context/NotificationContext'; 
import { RadarProvider } from './src/context/RadarContext'; 

export default function App() {
  return (
    <NotificationProvider>
      {/*Add your new RadarProvider here */}
      <RadarProvider>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </RadarProvider>
    </NotificationProvider>
  );
}