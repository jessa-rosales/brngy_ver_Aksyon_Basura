import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { 
  MapPin, 
  ClipboardList, 
  LayoutGrid, 
  Megaphone, 
  UserCircle 
} from 'lucide-react-native';

// --- SCREEN IMPORTS ---
// import RouteScreen from '../pages/RouteScreen';
// import TaskScreen from '../pages/TaskScreen';
// import FeedScreen from '../pages/FeedScreen';
// import NewsScreen from '../pages/NewsScreen';
// import ProfileScreen from '../pages/ProfileScreen';

const Tab = createBottomTabNavigator();
const themeColor = '#1B5E20'; 

// --- DYNAMIC HEADER COMPONENT ---
const CustomHeaderTitle = ({ role }) => (
  <View style={styles.headerContainer}>
    <Image 
      source={require('../../assets/Logo.png')} 
      style={styles.headerLogo}
      resizeMode="contain"
    />
    <Text style={styles.headerTitleText}>
      {role === 'collector' ? 'Collector Portal' : 'Driver Portal'}
    </Text>
  </View>
);

const CollectorTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitle: () => <CustomHeaderTitle role="collector" />, 
        headerStyle: styles.headerStyle,
        tabBarActiveTintColor: themeColor, // Branded Green for active tab
        tabBarInactiveTintColor: '#94a3b8', // Professional Gray for inactive
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused, color }) => {
          // Dynamic icon sizing uniform with Citizen navigation
          let iconSize = focused ? 26 : 22;
          
          switch (route.name) {
            case 'Route': return <MapPin size={iconSize} color={color} />;
            case 'Citizen Task': return <ClipboardList size={iconSize} color={color} />;
            case 'Feed': return <LayoutGrid size={iconSize} color={color} />;
            case 'News': return <Megaphone size={iconSize} color={color} />;
            case 'Profile': return <UserCircle size={iconSize} color={color} />;
            default: return null;
          }
        },
      })}
    >
      <Tab.Screen name="Route" component={RouteScreen} />
      <Tab.Screen name="Citizen Task" component={TaskScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="News" component={NewsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  // Header Styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Platform.OS === 'ios' ? 0 : 5,
  },
  headerLogo: {
    width: 35,
    height: 35,
    marginRight: 10,
    borderRadius: 8,
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerStyle: {
    backgroundColor: themeColor,
    height: Platform.OS === 'ios' ? 110 : 90,
    elevation: 0,
    shadowOpacity: 0,
  },
  // Tab Bar Styles (Cleaned & Uniform)
  tabBar: {
    height: Platform.OS === 'ios' ? 85 : 75,
    paddingBottom: Platform.OS === 'ios' ? 25 : 12,
    paddingTop: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 0, 
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Maintaining the rounded look for staff portals
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4, // Adds space so text doesn't stick to icon
  },
});

export default CollectorTabNavigator;