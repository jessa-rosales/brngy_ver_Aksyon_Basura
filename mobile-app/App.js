import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
// ✅ Import your new provider
import { NotificationProvider } from './src/context/NotificationContext'; 

export default function App() {
  return (
    <NotificationProvider>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </NotificationProvider>
  );
}