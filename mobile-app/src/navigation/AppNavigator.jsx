import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNotifications } from '../context/NotificationContext';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform, 
  Image,
  Dimensions
} from 'react-native'; 
import { 
  MapPin, 
  Newspaper, 
  PlusCircle, 
  Megaphone, 
  BookText, 
  User,
  ClipboardList,
  LayoutGrid,
  UserCircle,
  CalendarCheck 
} from 'lucide-react-native';

// --- SCREEN IMPORTS ---
import MobileLogin from '../pages/MobileLogin';
import FeedScreen from '../pages/FeedScreen';
import ReportScreen from '../pages/ReportScreen';
import NewsScreen from '../pages/NewsScreen';
import GuideScreen from '../pages/GuideScreen';
import ProfileScreen from '../pages/ProfileScreen';
import UserReportsScreen from '../pages/UserReportsScreen';
import EditProfileScreen from '../pages/EditProfileScreen';
import LiveMapScreen from '../pages/LiveMapScreen';
import ScheduleScreen from '../pages/ScheduleScreen';
import TrackScreen from '../pages/TrackScreen';
import DriverRouteScreen from '../pages/DriverRouteScreen';

const { width } = Dimensions.get('window');
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const themeColor = '#1B5E20'; 

// --- 1. DYNAMIC HEADER COMPONENT ---
const CustomHeaderTitle = ({ role }) => (
  <View style={styles.headerContainer}>
    <Image 
      source={require('../../assets/Logo.png')} 
      style={styles.headerLogo}
      resizeMode="contain"
    />
    <Text style={styles.headerTitleText}>
      {role === 'collector' ? 'Collector Portal' : 
       role === 'driver' ? 'Driver Portal' : 'Citizen Portal'}
    </Text>
  </View>
);

const PlaceholderScreen = ({ route }) => (
  <View style={styles.center}>
    <Text style={styles.text}>{route.name} Portal</Text>
    <Text style={styles.subtext}>This feature is coming soon.</Text>
  </View>
);

// --- 2. SHARED NAVIGATION CONFIG (FIXES HEADER JUMPING) ---
const getHeaderOptions = (role) => ({
  headerShown: true,
  headerTitle: () => <CustomHeaderTitle role={role} />, 
  headerStyle: styles.headerStyle,
  headerTitleAlign: 'left',
  // Change: Remove the manual StatusBarHeight unless absolutely necessary 
  // or use a consistent value for both Stack and Tab
  headerStatusBarHeight: Platform.OS === 'android' ? undefined : undefined, 
  headerTitleContainerStyle: {
    marginLeft: Platform.OS === 'ios' ? 0 : 5, // Adjusted for Android alignment
  },
  tabBarActiveTintColor: themeColor,
  tabBarInactiveTintColor: '#94a3b8',
  tabBarLabelStyle: styles.tabLabel,
  tabBarStyle: styles.tabBar,
});

// --- 3. CITIZEN TAB NAVIGATOR ---
const MainTabs = () => {
  const { unreadCount } = useNotifications();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...getHeaderOptions('citizen'),
        tabBarIcon: ({ focused, color }) => {
          let iconSize = focused ? 26 : 22;
          switch (route.name) {
            case 'Track': return <MapPin size={iconSize} color={color} />;
            case 'Feed': return <Newspaper size={iconSize} color={color} />;
            case 'Report': return <PlusCircle size={iconSize} color={color} />;
            case 'News': return <Megaphone size={iconSize} color={color} />;
            case 'Guide': return <BookText size={iconSize} color={color} />;
            case 'Profile': return <User size={iconSize} color={color} />;
            default: return null;
          }
        },
      })}
    >
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen 
        name="News" 
        component={NewsScreen} 
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 'bold' }
        }}
      />
      <Tab.Screen name="Guide" component={GuideScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// --- 4. STAFF TAB NAVIGATOR ---
const StaffTabs = ({ role }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...getHeaderOptions(role),
        tabBarIcon: ({ focused, color }) => {
          let iconSize = focused ? 26 : 22;
          switch (route.name) {
            case 'Route': return <MapPin size={iconSize} color={color} />;
            case 'Citizen Task': return <ClipboardList size={iconSize} color={color} />;
            case 'Feed': return <LayoutGrid size={iconSize} color={color} />;
            case 'News': return <Megaphone size={iconSize} color={color} />;
            case 'Schedule': return <CalendarCheck size={iconSize} color={color} />;
            case 'Profile': return <UserCircle size={iconSize} color={color} />;
            default: return null;
          }
        },
      })}
    >
      <Tab.Screen name="Route" component={DriverRouteScreen} initialParams={{ role: role }} />
      <Tab.Screen name="Citizen Task" component={PlaceholderScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="News" component={NewsScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const CollectorDashboard = () => <StaffTabs role="collector" />;
const DriverDashboard = () => <StaffTabs role="driver" />;

// --- 5. MAIN STACK NAVIGATOR ---
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#E3F3DF" />
      <Stack.Navigator 
        initialRouteName="Login" 
        screenOptions={{ 
          headerShown: false, // Default to hidden
          headerMode: 'screen' // Forces headers to animate with the screen
        }}
      >
        <Stack.Screen name="Login" component={MobileLogin} />
        
        {/* Disable Stack header for these because they have their own Tab headers */}
        <Stack.Screen 
          name="Dashboard" 
          component={MainTabs} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="CollectorDashboard" 
          component={CollectorDashboard} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="DriverDashboard" 
          component={DriverDashboard} 
          options={{ headerShown: false }} 
        />

        {/* Keep it true for standalone screens that are NOT tabs */}
        <Stack.Screen 
          name="UserReports" 
          component={UserReportsScreen} 
          options={{
            headerShown: true,
            headerTitle: () => <CustomHeaderTitle role="citizen" />,
            headerStyle: styles.headerStyle,
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
        <Stack.Screen name="LiveMapScreen" component={LiveMapScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// --- 6. STYLES ---
const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width * 0.8,
  },
  headerLogo: {
    width: 40,
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
    // REMOVED HARDCODED HEIGHT - Using headerStatusBarHeight instead for stability
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
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
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4, 
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EAF5E8',
  },
  text: {
    fontSize: 20,
    fontWeight: '900',
    color: themeColor,
  },
  subtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 5,
  },
});

export default AppNavigator;