import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, PlayCircle, Menu, X, 
  MapPin, Users, BarChart3, Zap, Shield, Bell,
  Facebook, Twitter, Linkedin, Instagram, Mail, Phone, Clock,
  Smartphone, Truck, ClipboardCheck, LayoutDashboard,
  ChevronLeft, ChevronRight, Globe, Sparkles, Heart, Quote,
  ArrowUp 
} from 'lucide-react';

// Asset Imports
import landingImg from '../assets/landing_page_img.png';
import logoImg from '../assets/logo.png';
import cloginimg from '../assets/c-login.jpg';
import feed from '../assets/c-feed.jpg';
import report from '../assets/c-report.jpg';
import news from '../assets/c-news.jpg';
import guides from '../assets/c-guides.jpg';
import profile from '../assets/c-profile.jpg';

const LandingPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Citizens');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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

  // --- LOADING LOGIC ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const navLinks = ['Features', 'How It Works', 'Impact', 'Feedback', 'Contact'];

  const roles = [
    { name: 'Citizens', icon: <Users size={16} /> },
    { name: 'Drivers', icon: <Truck size={16} /> },
    { name: 'Collectors', icon: <ClipboardCheck size={16} /> }
  ];

  const features = [
    { icon: <MapPin size={24} />, title: "Real-time Tracking", desc: "Monitor waste collection vehicles and bin levels across the city in real-time." },
    { icon: <Users size={24} />, title: "Citizen Reporting", desc: "Empower residents to report illegal dumping via a simple mobile interface." },
    { icon: <BarChart3 size={24} />, title: "Smart Analytics", desc: "Data-driven insights to optimize collection routes and reduce fuel consumption." },
    { icon: <Zap size={24} />, title: "Instant Alerts", desc: "Automated notifications for missed collections or urgent waste issues." },
    { icon: <Shield size={24} />, title: "Verified Impact", desc: "Track diversion rates and carbon footprint reductions with verifiable data." },
    { icon: <Bell size={24} />, title: "Resource Allocation", desc: "Intelligently assign crews based on actual waste generation patterns." }
  ];

  const workflows = {
    Citizens: [
      { step: "01", title: "Login", desc: "Securely access your personalized eco-dashboard.", img: cloginimg },
      { step: "02", title: "Feed", desc: "See community updates and real-time collection status.", img: feed },
      { step: "03", title: "Report", desc: "Pinpoint waste locations and attach photos instantly.", img: report },
      { step: "04", title: "News", desc: "Stay informed on city-wide environmental policies.", img: news },
      { step: "05", title: "Guides", desc: "Learn segregation through interactive materials.", img: guides },
      { step: "06", title: "Profile", desc: "Track your impact points and manage settings.", img: profile }
    ],
    Drivers: [
      { step: "01", title: "Routes", desc: "View optimized daily routes and schedules.", img: landingImg },
      { step: "02", title: "Navigate", desc: "Turn-by-turn navigation for efficient collection.", img: landingImg },
      { step: "03", title: "Logs", desc: "Report issues and mark completions instantly.", img: landingImg }
    ],
    Collectors: [
      { step: "01", title: "Safety", desc: "Perform safety and equipment checklists.", img: landingImg },
      { step: "02", title: "Verify", desc: "Log waste volume and types per station.", img: landingImg },
      { step: "03", title: "Clean", desc: "Verify area cleanliness with post-cleanup photos.", img: landingImg }
    ]
  };

  const testimonials = [
    { name: "Elena Rodriguez", role: "Citizen, Brgy. Nazareth", text: "The reporting feature is a game-changer. I reported a pile-up near the market, and it was cleared within hours. Truly responsive government service!" },
    { name: "Capt. Juan Dela Cruz", role: "Admin, Brgy. Carmen", text: "Managing fleet routes has never been this efficient. We reduced our fuel consumption by 20% in the first month using the Smart Analytics." },
    { name: "Marcus Tan", role: "Eco-Volunteer", text: "I love the transparency. Knowing exactly where the collection trucks are helps us coordinate our community cleanup drives perfectly." }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeedbackIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const visibleSteps = workflows[activeTab].slice(currentIndex, currentIndex + 3);
  const nextSlide = () => { if (currentIndex + 3 < workflows[activeTab].length) setCurrentIndex(prev => prev + 1); };
  const prevSlide = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };
  const handleTabChange = (role) => { setActiveTab(role); setCurrentIndex(0); };
  const nextFeedback = () => setFeedbackIndex((prev) => (prev + 1) % testimonials.length);
  const prevFeedback = () => setFeedbackIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // --- ANIMATION VARIANTS ---
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
      {/* --- PRE-LOADER --- */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            key="loader"
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center"
          >
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative mb-8">
              <div className="w-24 h-24 bg-emerald-600 rounded-3xl flex items-center justify-center p-2 shadow-[0_0_50px_rgba(16,185,129,0.3)] pulse-glow">
                <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute -inset-4 border-t-2 border-emerald-500 rounded-full" />
            </motion.div>
            <div className="text-center">
              <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white font-black uppercase tracking-[0.5em] text-sm mb-4">Aksyon Basura</motion.h2>
              <div className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{ x: '-100%' }} animate={{ x: '0%' }} transition={{ duration: 2.5, ease: "easeInOut" }} className="w-full h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full font-sans bg-zinc-950 text-white selection:bg-emerald-500/30">
        
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 z-[100] p-4 bg-emerald-600 text-white rounded-full shadow-2xl hover:bg-emerald-500 transition-all border border-white/10 group"
            >
              <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] lg:hidden" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-[280px] bg-zinc-900 z-[120] lg:hidden p-8 shadow-2xl border-l border-white/10" >
                <div className="flex flex-col h-full">
                  <div className="flex justify-end mb-8"><button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-lg"><X size={28} /></button></div>
                  <div className="space-y-6">
                    {navLinks.map((item) => (
                      <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setIsMenuOpen(false)} className="block text-2xl font-bold uppercase tracking-tight hover:text-emerald-500 transition-colors">{item}</a>
                    ))}
                  </div>
                  <div className="mt-auto"><button className="w-full py-4 bg-emerald-600 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg">Open Dashboard</button></div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <nav className={`fixed top-0 left-0 w-full z-[90] transition-all duration-500 px-6 md:px-12 py-5 ${isScrolled ? 'bg-zinc-950/80 backdrop-blur-lg border-b border-white/10 py-4 shadow-xl' : 'bg-transparent py-8'}`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-600 rounded-xl flex items-center justify-center overflow-hidden active:scale-95 transition-transform"><img src={logoImg} alt="Logo" className="w-full h-full object-contain p-1" /></div>
              <span className="text-lg md:text-xl font-black tracking-tighter uppercase">Aksyon <span className="text-emerald-500">Basura</span></span>
            </div>
            <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-white">
              {navLinks.map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="text-white/70 hover:text-emerald-400 transition-colors relative group">
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-emerald-500 transition-all group-hover:w-full" />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button className="hidden sm:block px-6 py-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/30 font-bold rounded-lg transition-all text-xs uppercase active:scale-95">Get The App Now</button>
              <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg active:scale-90 transition-transform"><Menu size={28} /></button>
            </div>
          </div>
        </nav>

        {/* --- HERO SECTION --- */}
        <section className="relative min-h-screen w-full overflow-hidden flex items-center">
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" 
            style={{ backgroundImage: `url(${landingImg})` }} 
          />
          <div className="absolute inset-0 z-10 bg-black/65" />
          <div className="relative z-20 w-full px-6 md:px-12 md:pl-[100px] max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, x: -50 }} animate={!isLoading ? { opacity: 1, x: 0 } : {}} transition={{ duration: 1, delay: 0.5 }}>
              <h1 className="text-[44px] md:text-[80px] font-black leading-[0.95] mb-8 uppercase tracking-tighter text-white">Transform Your  <br />Barangay<span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent"> Waste Management</span> <br />Into Intelligence</h1>
              <p className="text-base md:text-xl text-gray-300 font-medium mb-12 max-w-2xl">Empowering Cagayan de Oro with real-time tracking, AI-driven reporting, and hyper-efficient resource allocation.</p>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <button className="w-full sm:w-auto px-12 py-5 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all text-sm uppercase shadow-2xl active:scale-95">Go to App Now! <ArrowRight size={20} /></button>
                <button className="w-full sm:w-auto px-10 py-5 border-2 border-white/20 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all text-sm uppercase active:scale-95"><PlayCircle size={22} className="text-emerald-500" /> How it works</button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section id="features" className="py-32 bg-zinc-950 border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px] relative z-10">
            <motion.div className="max-w-3xl mb-24" {...fadeInScroll}>
              <h2 className="text-emerald-500 font-black uppercase tracking-[0.4em] text-xs mb-4">Core Ecosystem</h2>
              <h3 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-white">Next-Gen Tools for <br /> <span className="text-white/20">Urban Sanitation</span></h3>
            </motion.div>
            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={staggerContainer} initial="initial" whileInView="whileInView" viewport={{ once: true, margin: "-50px" }}>
              {features.map((f, index) => (
                <motion.div key={index} variants={fadeInScroll} whileHover={{ y: -8 }} className="group relative p-10 rounded-[32px] bg-white/[0.02] border border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="mb-10 p-4 bg-emerald-500/10 w-fit rounded-2xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-lg shadow-emerald-500/5">{f.icon}</div>
                    <h4 className="text-2xl font-black mb-4 uppercase tracking-tight text-white group-hover:text-emerald-400 transition-colors">{f.title}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed font-medium group-hover:text-gray-300 transition-colors">{f.desc}</p>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* --- WORKFLOW SECTION WITH SLIDER RESTORED --- */}
        <section id="how-it-works" className="py-24 bg-zinc-950 border-t border-white/5 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px]">
            <motion.div className="flex flex-col lg:flex-row lg:items-end justify-between mb-20 gap-8" {...fadeInScroll}>
              <div className="max-w-2xl">
                <h2 className="text-emerald-500 font-bold uppercase tracking-[0.2em] text-sm mb-4">The Workflow</h2>
                <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight text-white">Mobile Experience</h3>
              </div>
              <div className="flex flex-wrap gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                {roles.map((role) => (
                  <button key={role.name} onClick={() => handleTabChange(role.name)} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === role.name ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-400 hover:text-white'}`}>
                    {role.icon} {role.name}
                  </button>
                ))}
              </div>
            </motion.div>
            
            <motion.div className="relative group" {...fadeInScroll}>
              {currentIndex > 0 && <button onClick={prevSlide} className="absolute -left-12 top-[40%] -translate-y-1/2 z-30 p-3 bg-emerald-600 rounded-full hidden lg:block shadow-xl active:scale-90 transition-all"><ChevronLeft size={24} /></button>}
              {currentIndex + 3 < workflows[activeTab].length && <button onClick={nextSlide} className="absolute -right-12 top-[40%] -translate-y-1/2 z-30 p-3 bg-emerald-600 rounded-full hidden lg:block shadow-xl active:scale-90 transition-all"><ChevronRight size={24} /></button>}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {visibleSteps.map((item, idx) => (
                    <motion.div 
                      key={`${activeTab}-${item.step}`} 
                      initial={{ opacity: 0, scale: 0.9, x: 50 }} 
                      animate={{ opacity: 1, scale: 1, x: 0 }} 
                      exit={{ opacity: 0, scale: 0.9, x: -50 }} 
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className="group/card"
                    >
                      <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 group-hover/card:border-emerald-500/50 transition-colors flex items-center justify-center p-4">
                        <img src={item.img} alt={item.title} className="w-full h-full object-contain transition-all duration-700 group-hover/card:scale-105" />
                        <div className="absolute top-4 left-4 bg-emerald-600 text-white font-black px-3 py-1 rounded text-sm">{item.step}</div>
                      </div>
                      <h4 className="text-xl font-bold mb-2 uppercase text-emerald-500">{item.title}</h4>
                      <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- IMPACT SECTION --- */}
        <section id="impact" className="py-32 bg-zinc-950 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 blur-[120px] rounded-full -mr-64 -mt-64" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-900/10 blur-[120px] rounded-full -ml-64 -mb-64" />
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px] relative z-10">
            <motion.div className="text-center mb-24" {...fadeInScroll}>
              <h2 className="text-emerald-500 font-bold uppercase tracking-[0.3em] text-sm mb-4">Social & Environmental Impact</h2>
              <h3 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter leading-none mb-6">More than an App.<br/><span className="text-white/40">A Movement.</span></h3>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">We aren't just moving waste; we are restoring the dignity of our streets and the health of our communities.</p>
            </motion.div>
            <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-8" variants={staggerContainer} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
              <motion.div variants={fadeInScroll} whileHover={{ y: -10 }} className="relative p-10 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Globe size={120} className="text-emerald-500" /></div>
                <Sparkles className="text-emerald-500 mb-8" size={40} />
                <h4 className="text-2xl font-bold uppercase mb-4 tracking-tight">Breathable Spaces</h4>
                <p className="text-gray-400 leading-relaxed mb-6">By eliminating illegal dumping sites, we've helped neighborhoods reclaim air quality and transform vacant lots into safe community zones.</p>
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest"><div className="w-8 h-[2px] bg-emerald-500" /> Community Restoration</div>
              </motion.div>
              <motion.div variants={fadeInScroll} whileHover={{ y: -10 }} className="relative p-10 rounded-3xl bg-emerald-600 border border-emerald-500 overflow-hidden group shadow-[0_20px_50px_rgba(16,185,129,0.2)]">
                <div className="absolute -bottom-10 -right-10 opacity-20"><Shield size={200} className="text-white" /></div>
                <Shield className="text-white mb-8" size={40} />
                <h4 className="text-2xl font-bold uppercase mb-4 tracking-tight text-white">Clean Waterways</h4>
                <p className="text-emerald-50 leading-relaxed mb-6">Preventing plastic and hazardous waste from entering our drainage systems ensures the long-term health of our rivers and coastal ecosystems.</p>
                <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest"><div className="w-8 h-[2px] bg-white" /> Eco-System Shield</div>
              </motion.div>
              <motion.div variants={fadeInScroll} whileHover={{ y: -10 }} className="relative p-10 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={120} className="text-emerald-500" /></div>
                <Heart className="text-emerald-500 mb-8" size={40} />
                <h4 className="text-2xl font-bold uppercase mb-4 tracking-tight text-white">Healthier Lives</h4>
                <p className="text-gray-400 leading-relaxed mb-6">Timely waste collection directly correlates to a decrease in pest-borne diseases and improves the daily wellbeing of every citizen.</p>
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest"><div className="w-8 h-[2px] bg-emerald-500" /> Public Wellbeing</div>
              </motion.div>
            </motion.div>
            <motion.div className="mt-20 p-12 rounded-[40px] bg-gradient-to-r from-emerald-950 to-zinc-900 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-8" {...fadeInScroll}>
              <div className="max-w-xl text-center md:text-left">
                <h4 className="text-3xl font-bold mb-2 uppercase tracking-tight">Be part of the change.</h4>
                <p className="text-gray-400 text-sm leading-relaxed">Join thousands of residents in Cagayan de Oro who are actively shaping a cleaner, smarter future for the next generation.</p>
              </div>
              <button className="px-10 py-5 bg-white text-zinc-950 font-black rounded-2xl uppercase tracking-tighter hover:bg-emerald-500 hover:text-white transition-all whitespace-nowrap active:scale-95 shadow-xl">Get Started Now</button>
            </motion.div>
          </div>
        </section>

        {/* --- FEEDBACK SECTION --- */}
        <section id="feedback" className="py-24 bg-zinc-950 border-t border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px]">
            <motion.div {...fadeInScroll}><h2 className="text-emerald-500 font-bold uppercase tracking-[0.2em] text-sm mb-4">Feedback</h2><h3 className="text-4xl md:text-5xl font-black uppercase mb-16 text-white">Community Voice</h3></motion.div>
            <motion.div className="relative max-w-4xl mx-auto" {...fadeInScroll}>
              <button onClick={prevFeedback} className="absolute -left-4 md:-left-20 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/5 border border-white/10 rounded-full hover:bg-emerald-600 transition-all group shadow-2xl active:scale-90"><ChevronLeft size={24} className="group-hover:text-white" /></button>
              <button onClick={nextFeedback} className="absolute -right-4 md:-right-20 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/5 border border-white/10 rounded-full hover:bg-emerald-600 transition-all group shadow-2xl active:scale-90"><ChevronRight size={24} className="group-hover:text-white" /></button>
              <div className="overflow-hidden px-4">
                <AnimatePresence mode="wait">
                  <motion.div key={feedbackIndex} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -20 }} transition={{ duration: 0.5 }} className="bg-white/[0.03] border border-white/10 p-8 md:p-12 rounded-[40px] backdrop-blur-md relative" >
                    <Quote className="absolute top-8 right-12 text-emerald-500/10" size={80} />
                    <p className="text-xl md:text-2xl text-gray-200 leading-relaxed italic mb-10 relative z-10">"{testimonials[feedbackIndex].text}"</p>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center font-bold text-xl">{testimonials[feedbackIndex].name.charAt(0)}</div>
                      <div><h4 className="text-white font-bold text-lg uppercase tracking-tight">{testimonials[feedbackIndex].name}</h4><p className="text-emerald-50 font-bold text-xs uppercase tracking-widest">{testimonials[feedbackIndex].role}</p></div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex justify-center gap-3 mt-12">{testimonials.map((_, i) => (<button key={i} onClick={() => setFeedbackIndex(i)} className={`h-1.5 rounded-full transition-all duration-300 ${feedbackIndex === i ? 'w-8 bg-emerald-500' : 'w-2 bg-white/20 hover:bg-white/40'}`} />))}</div>
            </motion.div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer id="contact" className="bg-[#05221b] text-white pt-20 pb-10 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 md:px-12 md:pl-[100px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20 text-sm text-gray-400">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-emerald-600 rounded-lg shadow-lg shadow-emerald-600/10"><img src={logoImg} alt="Logo" className="w-full h-full object-contain p-1" /></div>
                  <span className="text-xl font-bold uppercase tracking-tight text-white">Aksyon <span className="text-emerald-500">Basura</span></span>
                </div>
                <p className="leading-relaxed max-w-xs text-sm">Revolutionizing waste management with real-time GPS tracking and mobile collection monitoring.</p>
                <div className="flex gap-3">
                  {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (<a key={i} href="#" className="w-10 h-10 bg-white/5 hover:bg-emerald-600 flex items-center justify-center rounded-lg transition-all text-white active:scale-90"><Icon size={18} /></a>))}
                </div>
              </div>
              <div><h4 className="font-bold text-lg mb-8 uppercase tracking-tight text-white">Features</h4><ul className="space-y-4"><li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">Login & Shift Assignment</li><li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">On-Route Interface</li><li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">Verification Interface</li><li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">Citizen Reports</li></ul></div>
              <div><h4 className="font-bold text-lg mb-8 uppercase tracking-tight text-white">Resources</h4><ul className="space-y-4"><li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">Documentation</li><li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">API Reference</li><li className="hover:text-emerald-400 transition-colors cursor-pointer w-fit">User Guide</li></ul></div>
              <div><h4 className="font-bold text-lg mb-8 uppercase tracking-tight text-emerald-500">Contact</h4><ul className="space-y-5"><li className="flex items-start gap-4"><MapPin size={20} className="text-emerald-500 shrink-0" /><span>Cagayan de Oro City, Philippines</span></li><li className="flex items-center gap-4 hover:text-white transition-colors cursor-pointer w-fit"><Mail size={18} className="text-emerald-500 shrink-0" /><span>info@aksyonbasura.com</span></li><li className="flex items-center gap-4"><Phone size={18} className="text-emerald-500 shrink-0" /><span>+63 912 345 6789</span></li><li className="flex items-center gap-4"><Clock size={18} className="text-emerald-500 shrink-0" /><span>Mon - Fri: 8:00 AM - 5:00 PM</span></li></ul></div>
            </div>
            <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[13px] font-bold uppercase tracking-widest text-gray-500">
              <p>© 2026 Aksyon Basura. All rights reserved.</p>
              <div className="flex gap-8"><a href="#" className="hover:text-white transition-colors cursor-pointer">Privacy Policy</a><a href="#" className="hover:text-white transition-colors cursor-pointer">Terms of Service</a></div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;