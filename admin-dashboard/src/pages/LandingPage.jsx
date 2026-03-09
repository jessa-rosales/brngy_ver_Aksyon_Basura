import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, PlayCircle, Menu, X, 
  MapPin, Users, BarChart3, Zap, Shield, Bell,
  Facebook, Twitter, Linkedin, Instagram, Mail, Phone, Clock,
  Truck, ClipboardCheck, Globe, Sparkles, Heart, Quote,
  ArrowUp, ChevronLeft, ChevronRight, Trash2, AlertCircle, ChevronDown,
  Smartphone
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react'; 

// --- MAP IMPORTS ---
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, LayersControl, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';

// --- SERVICE IMPORTS ---
import { publicService } from '../services/publicService';

// Asset Imports
import landingImg from '../assets/landing_page_img.png';
import logoImg from '../assets/logo10.png';
import apkGuideImg from '../assets/apk.jpg'; 

// Citizen Workflow Assets
import clogin1 from '../assets/c-login1.jpg';
import cregister2 from '../assets/c-register2.jpg';
import ctrack3 from '../assets/c-track3.jpg';
import cfeed4 from '../assets/c-feed4.jpg';
import creport5 from '../assets/c-report5.jpg';
import cnews6 from '../assets/c-news6.jpg';
import cguide7 from '../assets/c-guide7.jpg';
import cprofile8 from '../assets/c-profile8.jpg';

// Collector Workflow Assets 
import cologin from '../assets/Co-login.jpg';
import coroute1_1 from '../assets/Co-route1.1.jpg';
import coroute1_2 from '../assets/Co-route1.2.jpg';
import coroute1_3 from '../assets/Co-route1.3.jpg';
import cocitizentask from '../assets/Co-citizentask.jpg';
import cofeed from '../assets/Co-feed.jpg';
import conews from '../assets/Co-news.jpg';
import coschedule from '../assets/Co-schedule.jpg';
import coprofile from '../assets/Co-profile.jpg';

// Driver Workflow Assets
import droute1_1 from '../assets/D-route1.1.jpg';
import droute1_2 from '../assets/D-route1.2.jpg';
import droute1_3 from '../assets/D-route1.3.jpg';
import droute1_4 from '../assets/D-route1.4.jpg';
import dcitizentask from '../assets/D-citizentask.jpg';
import dfeed from '../assets/D-feed.jpg';
import dnews from '../assets/D-news.jpg';
import dschedule from '../assets/D-schedule.jpg';
import dprofile from '../assets/D-profile.jpg';

// ==========================================
// APP DOWNLOAD LINK
// ==========================================
const EXPO_DOWNLOAD_LINK = "https://expo.dev/accounts/jejerogo/projects/aksyon-basura/builds/016b6294-7a92-442e-b53a-aa88f2171523";

// ==========================================
// MAP MARKER HELPERS & FOCUS HANDLER
// ==========================================

// Helper: Check if a coordinate is inside a polygon boundary
const isPointInPolygon = (lat, lng, polygon) => {
  if (!polygon || !Array.isArray(polygon)) return false;
  const x = Number(lat);
  const y = Number(lng);
  let inside = false;
  
  const coords = Array.isArray(polygon[0][0]) || typeof polygon[0][0] === 'object' 
    ? polygon[0] 
    : polygon;
  
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = Number(coords[i].lat ?? coords[i][0]);
    const yi = Number(coords[i].lng ?? coords[i][1]);
    const xj = Number(coords[j].lat ?? coords[j][0]);
    const yj = Number(coords[j].lng ?? coords[j][1]);

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Auto-zooms the map based on the selected zone
const MapFocusHandler = ({ selectedZoneId, zones }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedZoneId === 'all') {
      // Default view for whole city
      map.setView([8.4822, 124.6472], 14, { animate: true });
    } else {
      const activeZone = zones.find(z => String(z.zone_id) === String(selectedZoneId));
      if (activeZone && activeZone.boundaries) {
        const positions = Array.isArray(activeZone.boundaries[0]) 
          ? activeZone.boundaries[0] 
          : activeZone.boundaries;
        const latLngs = positions.map(p => [Number(p.lat ?? p[0]), Number(p.lng ?? p[1])]);
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
      }
    }
  }, [selectedZoneId, zones, map]);
  return null;
};

const getBinIcon = (status) => {
  let outerPulse = 'bg-slate-400/20';
  let innerBg = 'bg-slate-500';
  let pinTail = 'bg-slate-500';
  let isPulse = false;

  if (status === 'pending') {
    outerPulse = 'bg-emerald-500/20';
    innerBg = 'bg-emerald-700';
    pinTail = 'bg-emerald-700';
    isPulse = true;
  } else if (status === 'missed') {
    outerPulse = 'bg-rose-500/20';
    innerBg = 'bg-rose-700';
    pinTail = 'bg-rose-700';
    isPulse = true;
  }

  return new L.DivIcon({
    html: renderToStaticMarkup(
      <div className="relative flex items-center justify-center">
        {isPulse && <div className={`absolute w-8 h-8 rounded-full animate-pulse ${outerPulse}`} />}
        <div className={`relative p-1.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${innerBg}`}>
          <Trash2 color="white" size={12} />
        </div>
        <div className={`absolute -bottom-1 w-2 h-2 rotate-45 border-r border-b border-white ${pinTail}`} />
      </div>
    ),
    className: 'main-bin-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const getReportIcon = (status) => {
  const s = (status || '').toLowerCase();
  let outerPulse = 'bg-slate-400/20';
  let innerBg = 'bg-slate-500';
  let pinTail = 'bg-slate-500';
  let animation = '';

  if (s === 'pending') {
    outerPulse = 'bg-rose-500/40';
    innerBg = 'bg-rose-600';
    pinTail = 'bg-rose-600';
    animation = 'animate-ping';
  } else if (s === 'in progress' || s === 'in_progress') {
    outerPulse = 'bg-orange-500/40';
    innerBg = 'bg-orange-600';
    pinTail = 'bg-orange-600';
    animation = 'animate-pulse';
  }

  return new L.DivIcon({
    html: renderToStaticMarkup(
      <div className="relative flex items-center justify-center">
        {animation && <div className={`absolute w-10 h-10 rounded-full ${animation} ${outerPulse}`} />}
        <div className={`relative p-1.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${innerBg}`}>
          <AlertCircle color="white" size={12} fill="white" fillOpacity={0.2} />
        </div>
        <div className={`absolute -bottom-1 w-2 h-2 rotate-45 border-r border-b border-white ${pinTail}`} />
      </div>
    ),
    className: 'report-marker-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Citizens');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // NEW STATES FOR SMART NAVBAR & MODAL
  const [showNav, setShowNav] = useState(true);
  const lastScrollY = useRef(0);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // --- MAP STATE ---
  const [zones, setZones] = useState([]);
  const [allBins, setAllBins] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('all');

  // --- ADMIN PORTAL ACCESS LOGIC ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.shiftKey && e.key === 'A') {
        navigate('/admin-portal-access'); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // --- DEVICE DETECTION ---
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
      const mobile = Boolean(userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i));
      setIsMobileDevice(mobile);
    };
    checkDevice();
  }, []);

  // --- LOADING LOGIC & DATA FETCHING ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [zoneData, binData, reportData] = await Promise.all([
          publicService.getZones().catch(() => []),
          publicService.getBins().catch(() => []),
          publicService.getReports().catch(() => ({ reports: [] }))
        ]);
        
        setZones(zoneData || []);
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const processedBins = (binData || []).map(bin => {
          let displayStatus = (bin.collection_status || 'pending').toLowerCase(); 
          const collectedTime = bin.last_collected_timestamp || bin.collectedAt;
          if (displayStatus === 'collected' && collectedTime) {
            const collectedDate = new Date(collectedTime);
            if (collectedDate < startOfToday) {
              displayStatus = 'pending';
            }
          }
          return { ...bin, displayStatus };
        });
        setAllBins(processedBins);

        const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
        const visibleReports = (reportData?.reports || []).filter(report => {
          const status = (report.status || '').toLowerCase();
          if (status === 'resolved' || status === 'resolve') {
            const timeField = report.resolved_at || report.resolvedAt || report.updated_at;
            if (timeField) {
              return (Date.now() - new Date(timeField).getTime()) < FIVE_HOURS_MS;
            }
            return false;
          }
          return true;
        });
        setAllReports(visibleReports);

        } catch (err) {
        console.error("Landing Map Load Error:", err);
      } finally {
        setTimeout(() => setIsLoading(false), 2500); 
      }
    };

    loadData();
  }, []);

  const navLinks = ['Features', 'Live Map', 'How It Works', 'Impact', 'Feedback', 'Contact'];

  const roles = [
    { name: 'Citizens', icon: <Users size={16} /> },
    { name: 'Drivers', icon: <Truck size={16} /> },
    { name: 'Collectors', icon: <ClipboardCheck size={16} /> }
  ];

  // --- FILTERED MAP DATA ---
  const filteredZones = selectedZoneId === 'all' 
    ? zones 
    : zones.filter(z => String(z.zone_id) === String(selectedZoneId));

  const filteredBins = selectedZoneId === 'all' 
    ? allBins 
    : allBins.filter(b => String(b.zone_id) === String(selectedZoneId));

  const filteredReports = selectedZoneId === 'all'
    ? allReports
    : allReports.filter(report => {
        const activeZone = zones.find(z => String(z.zone_id) === String(selectedZoneId));
        if (!activeZone || !activeZone.boundaries) return false;
        return isPointInPolygon(report.latitude, report.longitude, activeZone.boundaries);
      });

  const featuresList = [
    { icon: <MapPin size={24} />, title: "Live Truck Tracking", desc: "Citizens can watch the garbage trucks moving on the map in real-time so they never miss a pickup." },
    { icon: <Users size={24} />, title: "Community Reporting", desc: "Anyone can drop a pin and upload a photo to report missed pickups or illegal dumping." },
    { icon: <Zap size={24} />, title: "Urgent Issue Voting", desc: "Neighbors can vote 'Need Attention' on reports to tell officials which trash problems to fix first." },
    { icon: <Truck size={24} />, title: "Route Management", desc: "Drivers get clear maps and lists showing exactly where to drive and how many stops are left." },
    { icon: <Shield size={24} />, title: "Digital Evidence", desc: "Collectors take photos after cleaning an area to prove the job was done right." },
    { icon: <Bell size={24} />, title: "Office Announcements", desc: "Everyone gets fast updates about truck repairs, schedule changes, and local cleanup events." }
  ];

  const workflows = {
    Citizens: [
      { step: "01", title: "Register", desc: "Join the movement. Sign up easily to become an active participant in your barangay's waste management.", img: cregister2 },
      { step: "02", title: "Login", desc: "Securely access your personalized eco-dashboard. Your account keeps track of your community contributions.", img: clogin1 },
      { 
        step: "03", 
        title: "Track", 
        desc: "See exactly where the garbage trucks are right now so you don't miss them.", 
        img: ctrack3,
        startNumber: 1,
        features: [
          "Pick your area to see nearby trucks.",
          "Open the big map to see the whole city.",
          "See photos to know when garbage was picked up.",
          "Click the green circle to report a waste issue."
        ]
      },
      { 
        step: "04", 
        title: "Feed", 
        desc: "Look at garbage issues reported by your neighbors. Help prioritize critical issues so they get addressed faster.", 
        img: cfeed4,
        startNumber: 1,
        features: [
          "Sort reports by what's new, being fixed, or done.",
          "Tap 'Need Attention' to vote on urgent problems.",
          "Tap Navigate to get directions straight to the reported location if you want to view"
        ]
      },
      { 
        step: "05", 
        title: "Report", 
        desc: "Tell us where there is uncollected garbage or illegal dumping by dropping a pin and sending a photo.", 
        img: creport5,
        startNumber: 1,
        features: [
          "Choose the problem (like missed pickup or illegal dumping).",
          "Take a clear picture of the trash.",
          "Put a pin exactly where the trash is on the map.",
          "Type a short note if you want.",
          "Tap 'Submit Report' to send it to the officials."
        ]
      },
      { step: "06", title: "News", desc: "Read the latest updates about cleanups, rules, and local events.", img: cnews6 },
      { step: "07", title: "Guides", desc: "Learn how to separate your trash properly the easy way.", img: cguide7 },
      { 
        step: "08", 
        title: "Profile", 
        desc: "Check your points, update your details, and see all the reports you made.", 
        img: cprofile8,
        startNumber: 1,
        features: [
          "See the status of your past reports.",
          "Change your name, email, or address.",
          "Look at old, finished reports.",
          "Read basic info about the app."
        ]
      }
    ],
    Drivers: [
      { step: "01", title: "Login", desc: "Log in to connect to your truck and see your daily driving route.", img: cologin },
      { 
        step: "02", 
        title: "Start Duty", 
        desc: "Turn on your location so the city knows your truck is moving.", 
        img: droute1_1,
        startNumber: 1,
        features: [
          "Tap 'START DUTY' to begin your shift.",
          "Tap 'PREVIEW ROUTE COLLECTION' to see the roads you will take."
        ]
      },
      { 
        step: "03", 
        title: "Schedule", 
        desc: "Look at the list of places you need to drive to today.", 
        img: droute1_2,
        startNumber: 3,
        features: [
          "Check the 'Mission Progress' bar to see how far along you are.",
          "Look at the 'Stop Schedule' list.",
          "Tap 'START COLLECTION' to get map directions."
        ]
      },
      { 
        step: "04", 
        title: "Drive & Wait", 
        desc: "Follow the map. When you arrive, wait for your team to clear the trash.", 
        img: droute1_3,
        startNumber: 6,
        features: [
          "The app will say 'WAITING FOR PHOTO...' while your collectors take the evidence picture."
        ]
      },
      { 
        step: "05", 
        title: "End Duty", 
        desc: "Finish your shift and turn off truck tracking.", 
        img: droute1_4,
        startNumber: 7, 
        features: [
          "Tap 'END DUTY' when the whole route is finished."
        ]
      },
      { 
        step: "06", 
        title: "Citizen Tasks", 
        desc: "An overview of specific garbage reports that have been assigned directly to your truck.", 
        img: dcitizentask,
        startNumber: 1,
        features: [
          "Switch between tasks that are new or already done.",
          "Tap 'Navigate' to get driving directions to the exact spot."
        ]
      },
      { 
        step: "07", 
        title: "Feed", 
        desc: "Read the community feed to see all trash issues reported across the area. You can also vote on urgent problems.", 
        img: dfeed,
        startNumber: 1,
        features: [
          "Look at all reports, even if they aren't assigned to you yet.",
          "Tap 'Need Attention' to vote on critical problems, just like citizens do.",
          "Tap 'Navigate' to get driving directions to the exact spot."
        ]
      },
      { step: "08", title: "News", desc: "Read important messages from the office about truck maintenance or road closures.", img: dnews },
      { step: "09", title: "Schedule", desc: "Check your working days and see which collectors are riding with you.", img: dschedule },
      { 
        step: "10", 
        title: "Profile", 
        desc: "Manage your account details, check your daily schedule, and review your past work.", 
        img: dprofile,
        startNumber: 1,
        features: [
          "View 'My Collection History' to see your past work and tasks.",
          "Check 'My Schedule' for your assigned future shifts.",
          "Use 'Edit Account' to update your personal details.",
          "Access 'Archive History' to look at old work records.",
          "Read 'App Information' for details about the app."
        ]
      }
    ],
    Collectors: [
      { step: "01", title: "Login", desc: "Log in to start your shift and see your daily tasks.", img: cologin },
      { 
        step: "02", 
        title: "Route Setup", 
        desc: "Check your assigned area and truck for today.", 
        img: coroute1_1,
        startNumber: 1,
        features: [
          "Tap 'VIEW MISSION ROUTE' to see your map and stops."
        ]
      },
      { 
        step: "03", 
        title: "Stop Schedule", 
        desc: "See your list of places to pick up trash, including urgent reports from citizens.", 
        img: coroute1_2,
        startNumber: 2, 
        features: [
          "Check how many stops you have left.",
          "Look at the list of places you need to go.",
          "Tap 'START COLLECTION' to get directions to your first stop."
        ]
      },
      { 
        step: "04", 
        title: "Mission Mode", 
        desc: "Follow the map to the trash and take a photo when you clean it up.", 
        img: coroute1_3,
        startNumber: 5, 
        features: [
          "Tap 'TAKE EVIDENCE PHOTO' to prove the area is clean."
        ]
      },
      { 
        step: "05", 
        title: "Citizen Tasks", 
        desc: "An overview of specific garbage reports that have been assigned directly to your team.", 
        img: cocitizentask,
        startNumber: 1,
        features: [
          "Switch between tasks you are doing and tasks you finished.",
          "Tap 'Navigate' to go straight to the reported trash."
        ]
      },
      { 
        step: "06", 
        title: "Feed", 
        desc: "Read the community feed to see all trash issues reported across the area. You can also vote on urgent problems.", 
        img: cofeed,
        startNumber: 1,
        features: [
          "Sort the list by new, working, or finished.",
          "Tap 'Need Attention' to vote on critical problems, just like citizens do.",
          "Tap 'Navigate' to go straight to the reported trash."
        ]
      },
      { step: "07", title: "News", desc: "Read important messages from the office about truck repairs or schedule changes.", img: conews },
      { step: "08", title: "Schedule", desc: "Check your work hours, see your team members, and find your truck details.", img: coschedule },
      { 
        step: "09", 
        title: "Profile", 
        desc: "Manage your account details, check your daily schedule, and review your past work.", 
        img: coprofile,
        startNumber: 1,
        features: [
          "View 'My Collection History' to see your past work and tasks.",
          "Check 'My Schedule' for your assigned future shifts.",
          "Use 'Edit Account' to update your personal details.",
          "Access 'Archive History' to look at old work records.",
          "Read 'App Information' for details about the app."
        ]
      }
    ]
  };

  const testimonials = [
    { name: "Elena Rodriguez", role: "Citizen, Brgy. Nazareth", text: "The reporting feature is a game-changer. I reported a pile-up near the market, and it was cleared within hours. Truly responsive government service!" },
    { name: "Capt. Juan Dela Cruz", role: "Admin, Brgy. Carmen", text: "Managing fleet routes has never been this efficient. We reduced our fuel consumption by 20% in the first month using the Smart Analytics." },
    { name: "Marcus Tan", role: "Eco-Volunteer", text: "I love the transparency. Knowing exactly where the collection trucks are helps us coordinate our community cleanup drives perfectly." }
  ];

  // UPDATED SCROLL HANDLER
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setShowBackToTop(currentScrollY > 500);
      setIsScrolled(currentScrollY > 50);

      // Smart navbar logic: Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
      
      lastScrollY.current = currentScrollY;
    };
    
    // Using passive: true for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeedbackIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const currentStep = workflows[activeTab][currentIndex];
  const nextSlide = () => { if (currentIndex < workflows[activeTab].length - 1) setCurrentIndex(prev => prev + 1); };
  const prevSlide = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };
  const handleTabChange = (role) => { setActiveTab(role); setCurrentIndex(0); };
  const nextFeedback = () => setFeedbackIndex((prev) => (prev + 1) % testimonials.length);
  const prevFeedback = () => setFeedbackIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const fadeInScroll = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  const staggerContainer = {
    initial: { opacity: 0 },
    whileInView: { 
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    },
    viewport: { once: true, margin: "-100px" }
  };

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            key="loader"
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[200] bg-emerald-950 flex flex-col items-center justify-center"
          >
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative mb-8">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-white border-4 border-emerald-500 rounded-full overflow-hidden flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] pulse-glow">
                <img src={logoImg} alt="Logo" className="w-full h-full object-cover scale-125" />
              </div>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute -inset-4 border-t-2 border-emerald-500 rounded-full" />
            </motion.div>
            <div className="text-center">
              <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white font-black uppercase tracking-[0.5em] text-sm mb-4">Aksyon Basura</motion.h2>
              <div className="w-48 h-[2px] bg-emerald-900 rounded-full overflow-hidden">
                <motion.div initial={{ x: '-100%' }} animate={{ x: '0%' }} transition={{ duration: 2.5, ease: "easeInOut" }} className="w-full h-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full font-sans bg-white text-slate-800 selection:bg-emerald-500/30">
        
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 z-[100] p-4 bg-emerald-600 text-white rounded-full shadow-2xl hover:bg-emerald-700 transition-all border border-emerald-500/20 group"
            >
              <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* --- ENHANCED DOWNLOAD MODAL --- */}
        <AnimatePresence>
          {isDownloadModalOpen && (
            <>
              {/* Dark Blurred Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setIsDownloadModalOpen(false)} 
                className="fixed inset-0 bg-emerald-950/80 backdrop-blur-sm z-[200]" 
              />
              
              {/* Modal Container */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 20 }} 
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[90%] max-w-md bg-white rounded-[40px] p-8 shadow-2xl border border-emerald-100 flex flex-col items-center text-center max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:my-8 [&::-webkit-scrollbar-thumb]:bg-emerald-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300 transition-colors"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setIsDownloadModalOpen(false)} 
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors active:scale-90"
                >
                  <X size={24} />
                </button>
                
                {/* Header Logo */}
                <div className="w-24 h-24 bg-white border-4 border-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)] overflow-hidden relative shrink-0">
                  <img src={logoImg} alt="Aksyon Basura Logo" className="w-full h-full object-cover scale-125" />
                </div>
                
                <h3 className="text-3xl font-black text-emerald-950 uppercase tracking-tight mb-2">Get the App</h3>
                
                {isMobileDevice ? (
                  // --- MOBILE VIEW: Direct Download Buttons ---
                  <>
                    <p className="text-slate-600 mb-6 leading-relaxed text-sm px-2">
                      You're one tap away from making a difference! Click below to install the Aksyon Basura app on your device.
                    </p>
                    <div className="w-full flex flex-col gap-4">
                      <a 
                        href={EXPO_DOWNLOAD_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-600/30 hover:bg-emerald-500 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <Smartphone size={20} /> Download App Now
                      </a>
                      <button 
                        onClick={() => setIsDownloadModalOpen(false)}
                        className="w-full py-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95"
                      >
                        Maybe Later
                      </button>
                    </div>
                  </>
                ) : (
                  // --- DESKTOP VIEW: Scannable QR Code ---
                  <>
                    <p className="text-slate-600 mb-6 leading-relaxed text-sm">
                      Open your phone's camera and scan the QR code below to install the Aksyon Basura app.
                    </p>
                    <div className="p-4 bg-white border-2 border-emerald-100 rounded-3xl mb-4 flex flex-col items-center justify-center shadow-sm">
                      <QRCodeSVG 
                        value={EXPO_DOWNLOAD_LINK}
                        size={160}
                        bgColor={"#ffffff"}
                        fgColor={"#022c22"} // This matches text-emerald-950
                        level={"Q"}
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Scan to Download via Expo</p>
                  </>
                )}

                {/* --- 🔥 NEW: QUICK GUIDE / REASSURANCE --- */}
                <div className="mt-8 w-full border-t border-slate-100 pt-6 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-emerald-500" />
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">What to expect</p>
                  </div>
                  
                  <div className="w-full rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm relative group bg-slate-50 p-2">
                    <img 
                      src={apkGuideImg} 
                      alt="APK Download Guide" 
                      className="w-full h-auto object-cover rounded-xl" 
                    />
                    <div className="absolute inset-0 bg-emerald-900/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white text-emerald-800 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider border border-emerald-100">
                        Tap to install
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-[12px] text-slate-500 mt-4 font-medium px-2 text-center leading-relaxed">
                    You're on the right track! Once you scan the code or tap the link, simply hit the download button as shown above to install.
                  </p>
                </div>

              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-[110] lg:hidden" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-[280px] bg-[#f4fbf7] z-[120] lg:hidden p-8 shadow-2xl border-l border-emerald-100" >
                <div className="flex flex-col h-full">
                  <div className="flex justify-end mb-8"><button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-emerald-100 text-emerald-950 rounded-lg"><X size={28} /></button></div>
                  <div className="space-y-6">
                    {navLinks.map((item) => (
                      <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setIsMenuOpen(false)} className="block text-2xl font-bold uppercase tracking-tight text-emerald-950 hover:text-emerald-600 transition-colors">{item}</a>
                    ))}
                  </div>
                  <div className="mt-auto">
                    <button onClick={() => { setIsMenuOpen(false); setIsDownloadModalOpen(true); }} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-emerald-700 transition-colors">
                      Download App
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* UPDATED NAV TAG WITH TRANSFORM CLASSES */}
        <nav className={`fixed top-0 left-0 w-full z-[90] transition-transform duration-300 px-6 md:px-12 py-5 ${showNav ? 'translate-y-0' : '-translate-y-full'} ${isScrolled ? 'bg-[#f4fbf7]/95 backdrop-blur-lg border-b border-emerald-100 py-4 shadow-sm' : 'bg-transparent py-8'}`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center overflow-hidden active:scale-95 transition-transform shadow-sm">
                <img src={logoImg} alt="Logo" className="w-full h-full object-cover scale-125" />
              </div>
              <span className={`text-lg md:text-xl font-black tracking-tighter uppercase transition-colors ${isScrolled ? 'text-emerald-950' : 'text-white'}`}>Aksyon <span className="text-emerald-500">Basura</span></span>
            </div>
            <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest">
              {navLinks.map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className={`transition-colors relative group ${isScrolled ? 'text-emerald-800 hover:text-emerald-600' : 'text-white/80 hover:text-emerald-400'}`}>
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-emerald-500 transition-all group-hover:w-full" />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsDownloadModalOpen(true)} className={`hidden sm:block px-6 py-2 font-bold rounded-lg transition-all text-xs uppercase active:scale-95 border ${isScrolled ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/50'}`}>Get The App Now</button>
              <button onClick={() => setIsMenuOpen(true)} className={`lg:hidden p-2 rounded-lg active:scale-90 transition-all ${isScrolled ? 'text-emerald-950 hover:bg-emerald-100' : 'text-white hover:bg-white/10'}`}><Menu size={28} /></button>
            </div>
          </div>
        </nav>

        {/* --- HERO SECTION --- */}
        <section className="relative min-h-screen w-full overflow-hidden flex items-center">
          <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${landingImg})` }} />
          <div className="absolute inset-0 z-10 bg-emerald-950/70 mix-blend-multiply" /> 
          <div className="absolute inset-0 z-10 bg-black/40" />
          <div className="relative z-20 w-full px-6 md:px-12 md:pl-[100px] max-w-7xl mx-auto">
            <motion.div className="mt-20" initial={{ opacity: 0, x: -50 }} animate={!isLoading ? { opacity: 1, x: 0 } : {}} transition={{ duration: 1, delay: 0.5 }}>
              <h1 className="text-[44px] md:text-[75px] font-black leading-[0.95] mb-8 uppercase tracking-tighter text-white">Transform Your  <br />Barangay<span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent"> Waste Management</span> <br />Into Intelligence</h1>
              <p className="text-base md:text-xl text-emerald-50 font-medium mb-12 max-w-2xl">Empowering Barangay Nazareth with real-time tracking, and citizen engagement tools to build cleaner, smarter, and more sustainable communities.</p>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <button onClick={() => setIsDownloadModalOpen(true)} className="w-full sm:w-auto px-12 py-5 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all text-sm uppercase shadow-2xl shadow-emerald-600/20 active:scale-95">Go to App Now! <ArrowRight size={20} /></button>
                <button 
                  onClick={() => {
                    const section = document.getElementById('how-it-works');
                    if (section) section.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-10 py-5 border-2 border-white/30 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all text-sm uppercase active:scale-95"
                >
                  <PlayCircle size={22} className="text-emerald-400" /> How it works
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section id="features" className="py-32 bg-[#f4fbf7] border-t border-emerald-100 relative overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-400/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px] relative z-10">
            <motion.div className="max-w-3xl mb-24" {...fadeInScroll}>
              <h2 className="text-emerald-600 font-black uppercase tracking-[0.4em] text-xs mb-4">Eco-System</h2>
              <h3 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-emerald-950">Next-Gen Tools for <br /> <span className="text-emerald-950/30">Urban Sanitation</span></h3>
            </motion.div>
            
            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={staggerContainer} initial="initial" whileInView="whileInView" viewport={{ once: true, margin: "-50px" }}>
              {featuresList.map((f, index) => (
                <motion.div key={index} variants={fadeInScroll} whileHover={{ y: -8 }} className="group relative p-10 rounded-[32px] bg-white border border-emerald-100 shadow-sm hover:shadow-lg hover:shadow-emerald-900/5 hover:border-emerald-300 transition-all duration-500 overflow-hidden">
                  
                  {/* --- LOW OPACITY BACKGROUND ICON --- */}
                  <div className="absolute -bottom-8 -right-8 opacity-[0.08] group-hover:opacity-[0.11] transition-all duration-500 transform group-hover:scale-110 pointer-events-none z-0">
                    {React.cloneElement(f.icon, { size: 160, className: "text-emerald-900" })}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-br from-[#f4fbf7] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
                  
                  <div className="relative z-10">
                    <div className="mb-10 p-4 bg-emerald-50 w-fit rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">{f.icon}</div>
                    <h4 className="text-2xl font-black mb-4 uppercase tracking-tight text-emerald-950 group-hover:text-emerald-700 transition-colors">{f.title}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium transition-colors">{f.desc}</p>
                  </div>
                  
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-all duration-500 z-0 pointer-events-none" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* --- LIVE CITY MAP OVERVIEW ENHANCED (WITH SIDEBAR) --- */}
        <section id="live-map" className="py-24 bg-white border-t border-emerald-100 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px] relative z-10">
            
            <motion.div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-8" {...fadeInScroll}>
              <div className="max-w-2xl">
                <h2 className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-sm mb-4">Public Transparency</h2>
                <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight text-emerald-950">Live City Overview</h3>
                <p className="text-slate-600 mt-4 text-lg leading-relaxed">Watch real-time waste collection activities and community reports across the barangay.</p>
              </div>
            </motion.div>

            {/* --- SEPARATED STATS ABOVE THE MAP --- */}
            <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6" {...fadeInScroll}>
              <div className="bg-[#f4fbf7] border border-emerald-100 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-[10px] md:text-xs font-black text-emerald-600/70 uppercase tracking-widest mb-1">
                     {selectedZoneId === 'all' ? 'Active Zones' : 'Selected Zone'}
                   </p>
                   <h4 className="text-2xl md:text-4xl font-black text-emerald-950">
                     {selectedZoneId === 'all' ? zones.length : 1}
                   </h4>
                 </div>
                 <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <MapPin size={20} className="md:w-6 md:h-6" />
                 </div>
              </div>

              <div className="bg-[#f4fbf7] border border-emerald-100 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-[10px] md:text-xs font-black text-emerald-600/70 uppercase tracking-widest mb-1">Total Bins</p>
                   <h4 className="text-2xl md:text-4xl font-black text-emerald-950">{filteredBins.length}</h4>
                 </div>
                 <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Trash2 size={20} className="md:w-6 md:h-6" />
                 </div>
              </div>

              <div className="bg-rose-50 border border-rose-100 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm flex items-center justify-between relative overflow-hidden">
                 <div>
                   <p className="text-[10px] md:text-xs font-black text-rose-600/70 uppercase tracking-widest mb-1">Live Reports</p>
                   <div className="flex items-center gap-3">
                     <span className="relative flex h-3 md:h-3.5 w-3 md:w-3.5">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-3 md:h-3.5 w-3 md:w-3.5 bg-rose-500"></span>
                     </span>
                     <h4 className="text-2xl md:text-4xl font-black text-rose-950">{filteredReports.length}</h4>
                   </div>
                 </div>
                 <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 relative z-10">
                    <AlertCircle size={20} className="md:w-6 md:h-6" />
                 </div>
                 <div className="absolute -right-4 -bottom-4 opacity-10">
                    <AlertCircle size={80} className="md:w-[100px] md:h-[100px]" />
                 </div>
              </div>
            </motion.div>

            {/* --- MAP SECTION WITH SIDEBAR --- */}
            <motion.div className="flex flex-col lg:flex-row gap-6 mb-6" {...fadeInScroll}>
              
              {/* Left Sidebar for Zone Selection - DROPDOWN ON MOBILE */}
              <div className="w-full lg:w-72 flex flex-col gap-3 lg:max-h-[550px]">
                
                {/* Mobile Dropdown */}
                <div className="block lg:hidden relative w-full">
                  <select 
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full appearance-none bg-white border-2 border-emerald-100 rounded-2xl py-4 pl-5 pr-12 text-emerald-950 font-bold text-[15px] shadow-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="all">All Zones - View entire city map</option>
                    {zones.map(zone => (
                      <option key={zone.zone_id} value={zone.zone_id}>
                        {zone.zone_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                    <ChevronDown size={20} />
                  </div>
                </div>

                {/* Desktop Sidebar */}
                <div className="hidden lg:flex flex-col gap-2 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-emerald-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300 transition-colors">
                  <button 
                    onClick={() => setSelectedZoneId('all')}
                    className={`p-4 rounded-2xl text-left transition-all border ${selectedZoneId === 'all' ? 'bg-emerald-600 text-white shadow-md border-emerald-500' : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-emerald-50 hover:border-emerald-200'}`}
                  >
                    <span className="font-bold block text-[15px]">All Zones</span>
                    <span className={`text-[11px] font-semibold mt-1 block ${selectedZoneId === 'all' ? 'text-emerald-100' : 'text-slate-400'}`}>View entire city map</span>
                  </button>
                  
                  {zones.map(zone => (
                    <button 
                      key={zone.zone_id}
                      onClick={() => setSelectedZoneId(zone.zone_id)}
                      className={`p-4 rounded-2xl text-left transition-all border ${String(selectedZoneId) === String(zone.zone_id) ? 'bg-emerald-600 text-white shadow-md border-emerald-500' : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-emerald-50 hover:border-emerald-200'}`}
                    >
                      <span className="font-bold block text-[15px]">{zone.zone_name}</span>
                      <span className={`text-[11px] font-semibold mt-1 block uppercase tracking-wider ${String(selectedZoneId) === String(zone.zone_id) ? 'text-emerald-200' : 'text-slate-400'}`}>Focus Zone</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Container - FIXED FOR MOBILE */}
              <div className="w-full lg:flex-1 h-[450px] min-h-[450px] lg:h-[550px] shrink-0 rounded-[32px] md:rounded-[40px] overflow-hidden border-2 border-emerald-100 shadow-[0_20px_50px_rgba(16,185,129,0.10)] relative" style={{ zIndex: 0 }}>
                <MapContainer center={[8.4822, 124.6472]} zoom={14} style={{ height: "100%", width: "100%", zIndex: 0 }} scrollWheelZoom={false}>
                  <MapFocusHandler selectedZoneId={selectedZoneId} zones={zones} />
                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Google Streets">
                      <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution='&copy; Google Maps' />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite View">
                      <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution='&copy; Google Maps' />
                    </LayersControl.BaseLayer>
                  </LayersControl>

                  {filteredZones.map((zone) => {
                    if (!zone.boundaries) return null;
                    const positions = Array.isArray(zone.boundaries[0]) ? zone.boundaries[0] : zone.boundaries;
                    return (
                      <Polygon key={`public-zone-${zone.zone_id}`} positions={positions} pathOptions={{ color: zone.zone_color || '#10b981', fillColor: zone.zone_color || '#10b981', fillOpacity: 0.15, weight: 2 }}>
                        <Popup><h4 className="font-bold text-gray-800">{zone.zone_name}</h4></Popup>
                      </Polygon>
                    );
                  })}

                  {filteredBins.map((bin) => (
                    <Marker key={`public-bin-${bin.bin_id}`} position={[Number(bin.latitude), Number(bin.longitude)]} icon={getBinIcon(bin.displayStatus)}>
                      <Popup className="custom-popup rounded-xl">
                        <div className="p-1">
                          <p className="font-black text-slate-800 text-sm mb-1">{bin.bin_name}</p>
                          <p className={`text-[10px] px-2 py-1 inline-block rounded font-bold uppercase tracking-widest ${
                            bin.displayStatus === 'collected' ? 'bg-slate-100 text-slate-600' :
                            bin.displayStatus === 'pending' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {bin.displayStatus}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {filteredReports.map((report) => (
                    <Marker key={`public-rep-${report.report_id}`} position={[Number(report.latitude), Number(report.longitude)]} icon={getReportIcon(report.status)}>
                      <Popup className="custom-popup rounded-xl">
                        <div className="p-1">
                          <p className="font-black text-slate-800 text-sm mb-1">{report.issue_type}</p>
                          <p className={`text-[10px] px-2 py-1 inline-block rounded font-bold uppercase tracking-widest ${
                            report.status === 'Resolved' ? 'bg-slate-100 text-slate-600' :
                            report.status === 'In Progress' ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {report.status}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </motion.div>

            {/* --- SEPARATED LEGEND BELOW THE MAP --- */}
            <motion.div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 px-6 md:px-8 py-4 md:py-5 bg-[#f4fbf7] border border-emerald-100 rounded-2xl md:rounded-3xl shadow-sm" {...fadeInScroll}>
              <div className="flex items-center gap-2"><div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-slate-400 shadow-sm" /><span className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">Collected / Resolved</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-emerald-500 shadow-sm" /><span className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">Pending Bin</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-orange-500 shadow-sm animate-pulse" /><span className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">Report In Progress</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-rose-600 shadow-sm" /><span className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">Missed / New Report</span></div>
            </motion.div>

          </div>
        </section>

        {/* --- WORKFLOW SECTION (2-COLUMN) --- */}
        <section id="how-it-works" className="py-24 bg-[#f4fbf7] border-t border-emerald-100 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px]">
            
            <motion.div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8" {...fadeInScroll}>
              <div className="max-w-2xl">
                <h2 className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-sm mb-4">The Workflow</h2>
                <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight text-emerald-950">Mobile Experience</h3>
              </div>
              <div className="flex flex-wrap gap-2 bg-white p-1 rounded-xl border border-emerald-100 shadow-sm">
                {roles.map((role) => (
                  <button 
                    key={role.name} 
                    onClick={() => handleTabChange(role.name)} 
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === role.name ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50'}`}
                  >
                    {role.icon} {role.name}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div className="bg-white border border-emerald-100 rounded-[40px] p-8 lg:p-16 shadow-sm" {...fadeInScroll}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                
                {/* LEFT COLUMN: IMAGE AND CONTROLS */}
                <div className="relative group w-full max-w-[400px] mx-auto lg:max-w-none">
                  
                  {/* Controls */}
                  <button 
                    onClick={prevSlide} 
                    disabled={currentIndex === 0}
                    className={`absolute -left-4 lg:-left-8 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full shadow-lg transition-all ${currentIndex === 0 ? 'bg-emerald-50 text-emerald-300 cursor-not-allowed opacity-50' : 'bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white active:scale-90 border border-emerald-100'}`}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  
                  <button 
                    onClick={nextSlide} 
                    disabled={currentIndex === workflows[activeTab].length - 1}
                    className={`absolute -right-4 lg:-right-8 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full shadow-lg transition-all ${currentIndex === workflows[activeTab].length - 1 ? 'bg-emerald-50 text-emerald-300 cursor-not-allowed opacity-50' : 'bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white active:scale-90 border border-emerald-100'}`}
                  >
                    <ChevronRight size={24} />
                  </button>

                  {/* Image Container */}
                  <div className="aspect-[4/5] rounded-[32px] bg-[#f4fbf7] border border-emerald-100 flex items-center justify-center p-6 lg:p-10 shadow-inner overflow-hidden relative">
                    <AnimatePresence mode="wait">
                      <motion.img 
                        key={`${activeTab}-${currentIndex}-img`}
                        src={currentStep.img} 
                        alt={currentStep.title} 
                        initial={{ opacity: 0, scale: 0.95, x: 20 }} 
                        animate={{ opacity: 1, scale: 1, x: 0 }} 
                        exit={{ opacity: 0, scale: 0.95, x: -20 }} 
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="w-full h-full object-contain drop-shadow-2xl"
                      />
                    </AnimatePresence>
                  </div>
                </div>

                {/* RIGHT COLUMN: INFORMATION */}
                <div className="flex flex-col justify-center h-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${activeTab}-${currentIndex}-info`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <div className="inline-block px-5 py-2 bg-emerald-50 text-emerald-800 font-black rounded-xl text-sm mb-6 uppercase tracking-widest border border-emerald-100 shadow-sm">
                        Step {currentStep.step} of {String(workflows[activeTab].length).padStart(2, '0')}
                      </div>
                      <h4 className="text-4xl lg:text-5xl font-black mb-6 uppercase text-emerald-950 tracking-tight leading-none">
                        {currentStep.title}
                      </h4>
                      <p className={`text-slate-600 text-lg lg:text-xl leading-relaxed max-w-lg ${currentStep.features ? 'mb-8' : ''}`}>
                        {currentStep.desc}
                      </p>

                      {/* Display Numbered Features if available for this step */}
                      {currentStep.features && (
                        <ul className="space-y-4 mb-8">
                          {currentStep.features.map((feature, idx) => {
                            const badgeNumber = currentStep.startNumber !== undefined 
                              ? currentStep.startNumber + idx 
                              : idx + 1;
                              
                            return (
                              <li key={idx} className="flex items-start gap-4">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0 mt-0.5 shadow-sm">
                                  {badgeNumber}
                                </span>
                                <span className="text-slate-700 font-medium">{feature}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Progress Dots */}
                      <div className="flex gap-3 mt-8 flex-wrap">
                        {workflows[activeTab].map((_, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => setCurrentIndex(idx)} 
                            className={`h-2.5 rounded-full transition-all duration-500 ${currentIndex === idx ? 'w-10 bg-emerald-600 shadow-md shadow-emerald-600/30' : 'w-2.5 bg-emerald-100 hover:bg-emerald-300'}`} 
                            aria-label={`Go to step ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

              </div>
            </motion.div>

          </div>
        </section>

        {/* --- IMPACT SECTION --- */}
        <section id="impact" className="py-32 bg-white border-t border-emerald-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-300/20 blur-[120px] rounded-full -mr-64 -mt-64" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-400/10 blur-[120px] rounded-full -ml-64 -mb-64" />
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px] relative z-10">
            <motion.div className="text-center mb-24" {...fadeInScroll}>
              <h2 className="text-emerald-600 font-bold uppercase tracking-[0.3em] text-sm mb-4">Social & Environmental Impact</h2>
              <h3 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter leading-none mb-6 text-emerald-950">More than an App.<br/><span className="text-emerald-950/40">A Movement.</span></h3>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">We aren't just moving waste; we are restoring the dignity of our streets and the health of our communities.</p>
            </motion.div>
            <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-8" variants={staggerContainer} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
              <motion.div variants={fadeInScroll} whileHover={{ y: -10 }} className="relative p-10 rounded-3xl bg-[#f4fbf7] border border-emerald-100 shadow-sm overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Globe size={120} className="text-emerald-600" /></div>
                <Sparkles className="text-emerald-600 mb-8" size={40} />
                <h4 className="text-2xl font-bold uppercase mb-4 tracking-tight text-emerald-950">Breathable Spaces</h4>
                <p className="text-slate-600 leading-relaxed mb-6">By eliminating illegal dumping sites, we've helped neighborhoods reclaim air quality and transform vacant lots into safe community zones.</p>
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest"><div className="w-8 h-[2px] bg-emerald-600" /> Community Restoration</div>
              </motion.div>
              <motion.div variants={fadeInScroll} whileHover={{ y: -10 }} className="relative p-10 rounded-3xl bg-emerald-600 border border-emerald-500 overflow-hidden group shadow-[0_20px_50px_rgba(16,185,129,0.3)]">
                <div className="absolute -bottom-10 -right-10 opacity-20"><Shield size={200} className="text-white" /></div>
                <Shield className="text-white mb-8" size={40} />
                <h4 className="text-2xl font-bold uppercase mb-4 tracking-tight text-white">Clean Waterways</h4>
                <p className="text-emerald-50 leading-relaxed mb-6">Preventing plastic and hazardous waste from entering our drainage systems ensures the long-term health of our rivers and coastal ecosystems.</p>
                <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest"><div className="w-8 h-[2px] bg-white" /> Eco-System Shield</div>
              </motion.div>
              <motion.div variants={fadeInScroll} whileHover={{ y: -10 }} className="relative p-10 rounded-3xl bg-[#f4fbf7] border border-emerald-100 shadow-sm overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={120} className="text-emerald-600" /></div>
                <Heart className="text-emerald-600 mb-8" size={40} />
                <h4 className="text-2xl font-bold uppercase mb-4 tracking-tight text-emerald-950">Healthier Lives</h4>
                <p className="text-slate-600 leading-relaxed mb-6">Timely waste collection directly correlates to a decrease in pest-borne diseases and improves the daily wellbeing of every citizen.</p>
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest"><div className="w-8 h-[2px] bg-emerald-600" /> Public Wellbeing</div>
              </motion.div>
            </motion.div>
            <motion.div className="mt-20 p-12 rounded-[40px] bg-gradient-to-r from-emerald-800 to-emerald-950 border border-emerald-700 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl" {...fadeInScroll}>
              <div className="max-w-xl text-center md:text-left">
                <h4 className="text-3xl font-bold mb-2 uppercase tracking-tight text-white">Be part of the change.</h4>
                <p className="text-emerald-100/80 text-sm leading-relaxed">Join thousands of residents in Cagayan de Oro who are actively shaping a cleaner, smarter future for the next generation.</p>
              </div>
              <button onClick={() => setIsDownloadModalOpen(true)} className="px-10 py-5 bg-white text-emerald-950 font-black rounded-2xl uppercase tracking-tighter hover:bg-emerald-50 transition-all whitespace-nowrap active:scale-95 shadow-lg">Get Started Now</button>
            </motion.div>
          </div>
        </section>

        {/* --- FEEDBACK SECTION --- */}
        <section id="feedback" className="py-24 bg-[#f4fbf7] border-t border-emerald-100 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px]">
            <motion.div {...fadeInScroll}>
              <h2 className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-sm mb-4">Feedback</h2>
              <h3 className="text-4xl md:text-5xl font-black uppercase mb-16 text-emerald-950">Community Voice</h3>
            </motion.div>
            <motion.div className="relative max-w-4xl mx-auto" {...fadeInScroll}>
              <button onClick={prevFeedback} className="absolute -left-4 md:-left-20 top-1/2 -translate-y-1/2 z-30 p-3 bg-white border border-emerald-100 text-emerald-800 rounded-full hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all group shadow-md active:scale-90"><ChevronLeft size={24} /></button>
              <button onClick={nextFeedback} className="absolute -right-4 md:-right-20 top-1/2 -translate-y-1/2 z-30 p-3 bg-white border border-emerald-100 text-emerald-800 rounded-full hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all group shadow-md active:scale-90"><ChevronRight size={24} /></button>
              <div className="overflow-hidden px-4">
                <AnimatePresence mode="wait">
                  <motion.div key={feedbackIndex} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -20 }} transition={{ duration: 0.5 }} className="bg-white border border-emerald-100 p-8 md:p-12 rounded-[40px] shadow-sm relative" >
                    <Quote className="absolute top-8 right-12 text-emerald-600/10" size={80} />
                    <p className="text-xl md:text-2xl text-emerald-950/80 leading-relaxed italic mb-10 relative z-10">"{testimonials[feedbackIndex].text}"</p>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-md">{testimonials[feedbackIndex].name.charAt(0)}</div>
                      <div>
                        <h4 className="text-emerald-950 font-bold text-lg uppercase tracking-tight">{testimonials[feedbackIndex].name}</h4>
                        <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest">{testimonials[feedbackIndex].role}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex justify-center gap-3 mt-12">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setFeedbackIndex(i)} className={`h-1.5 rounded-full transition-all duration-300 ${feedbackIndex === i ? 'w-8 bg-emerald-600' : 'w-2 bg-emerald-200 hover:bg-emerald-400'}`} />
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer id="contact" className="bg-[#05221b] text-white pt-20 pb-10 border-t border-[#0a3a2f]">
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20 text-sm text-emerald-100/70">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  {/* FOOTER LOGO UPDATE */}
                  <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-white border-2 border-emerald-500 rounded-full overflow-hidden shadow-lg shadow-emerald-600/10">
                    <img src={logoImg} alt="Logo" className="w-full h-full object-cover scale-125" />
                  </div>
                  <span className="text-xl font-bold uppercase tracking-tight text-white">Aksyon <span className="text-emerald-500">Basura</span></span>
                </div>
                <p className="leading-relaxed max-w-xs text-sm">Revolutionizing waste management with real-time GPS tracking and mobile collection monitoring.</p>
                <div className="flex gap-3">
                  {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                    <a key={i} href="#" className="w-10 h-10 bg-white/5 hover:bg-emerald-600 text-white flex items-center justify-center rounded-lg transition-all active:scale-90"><Icon size={18} /></a>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-8 uppercase tracking-tight text-white">Features</h4>
                <ul className="space-y-4">
                  <li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">Login & Shift Assignment</li>
                  <li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">On-Route Interface</li>
                  <li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">Verification Interface</li>
                  <li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">Citizen Reports</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-8 uppercase tracking-tight text-white">Resources</h4>
                <ul className="space-y-4">
                  <li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">Documentation</li>
                  <li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">API Reference</li>
                  <li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">User Guide</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-8 uppercase tracking-tight text-emerald-500">Contact</h4>
                <ul className="space-y-5">
                  <li className="flex items-start gap-4"><MapPin size={20} className="text-emerald-500 shrink-0" /><span className="text-white">Cagayan de Oro City, Philippines</span></li>
                  <li className="flex items-center gap-4 hover:text-emerald-400 transition-colors cursor-pointer w-fit"><Mail size={18} className="text-emerald-500 shrink-0" /><span>info@aksyonbasura.com</span></li>
                  <li className="flex items-center gap-4"><Phone size={18} className="text-emerald-500 shrink-0" /><span className="text-white">+63 912 345 6789</span></li>
                  <li className="flex items-center gap-4"><Clock size={18} className="text-emerald-500 shrink-0" /><span className="text-white">Mon - Fri: 8:00 AM - 5:00 PM</span></li>
                </ul>
              </div>
            </div>
            <div className="pt-8 border-t border-[#0a3a2f] flex flex-col md:flex-row justify-between items-center gap-6 text-[13px] font-bold uppercase tracking-widest text-emerald-100/50">
              <p>© 2026 Aksyon Basura. All rights reserved.</p>
              <div className="flex gap-8">
                <a href="#" className="hover:text-white transition-colors cursor-pointer">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors cursor-pointer">Terms of Service</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;