import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useUser } from '../context/UserContext'; 
import { ShieldAlert, AlertCircle, Eye, EyeOff } from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion'; // for smooth error animation

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [error, setError] = useState({ msg: '', type: '' });
  const navigate = useNavigate();
  const { setUser } = useUser(); 

  const handleLogin = async (e) => {
    e.preventDefault();
    setError({ msg: '', type: '' });

    try {
      const response = await authService.login({ email, password, loginType: 'website' });
      
      // Safely parse JSON in case the server returns an HTML error page
      let data = {};
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Response is not JSON");
      }

      // HANDLE HTTP ERRORS (401 Unauthorized, 403 Forbidden)
      if (!response.ok) {
        if (response.status === 401) {
          setError({ msg: "Invalid email or password. Please try again.", type: 'auth' });
          return;
        }
        if (response.status === 403) {
          setError({ 
            msg: data.message || "Access Denied: You do not have permission to access this portal.", 
            type: 'security' 
          });
          return;
        }
        setError({ msg: data.message || "An unexpected error occurred. Please try again.", type: 'auth' });
        return;
      }

      //  VERIFY USER PROPERTIES IF LOGIN IS TECHNICALLY SUCCESSFUL
      if (data.user) {
        // Check for Inactive Account
        if (data.user.status === 'Inactive') {
          setError({ 
            msg: "Your account is inactive. Please contact the System Administrator to reactivate it.", 
            type: 'security' 
          });
          return;
        }

        // Check for correct Role (Block Citizens, Drivers, Collectors from Web)
        if (data.user.role !== 'Admin') {
          setError({ 
            msg: "Access Denied: This portal is for Administrators only. Please use the mobile app to access your account.", 
            type: 'security' 
          });
          return;
        }
      }

      // SUCCESS - ALL CHECKS PASSED
      setUser(data.user); 
      localStorage.setItem("token", data.token);
      localStorage.setItem("userProfile", JSON.stringify(data.user));
      navigate('/dashboard');
      
    } catch (err) {
      console.error("Login Error:", err);
      setError({ msg: "Network error. Please check if the server is running.", type: 'network' });
    }
  };

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden">
      
      {/* LEFT SIDE (Visuals) */}
      <div className="hidden lg:flex w-1/2 bg-[#108e56] flex-col justify-between items-center relative p-8 xl:p-12">
        <div className="absolute -top-16 -left-16 w-64 h-64 border-4 border-white opacity-10 rounded-full pointer-events-none"></div>
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-white opacity-5 rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-16 w-64 h-64 border-4 border-white opacity-10 rounded-full pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-24 h-24 border border-white opacity-20 rounded-full pointer-events-none"></div>

        <div className="z-10 w-full max-w-lg flex flex-col items-center h-full justify-center">
          <div>
            <img 
              src="/login-cover-waste.jpg" 
              alt="Waste Management" 
              className="w-full h-auto max-h-[47vh] object-contain rounded-xl mx-auto mt-5"
            />
          </div>
          <div className="text-center mb-8 shrink-0">
            <h1 className="text-3xl xl:text-4xl font-bold text-white mb-4 drop-shadow-md">
              Waste Management <br /> Reporting System
            </h1>
            <p className="text-green-50 text-base xl:text-lg leading-relaxed">
              Monitor, track, and optimize your waste collection operations in real-time.
            </p>
          </div>
          
          <div className="w-full grid grid-cols-2 gap-4 mt-auto">
            <div className="h-15 xl:h-20 bg-white/10 rounded-3xl w-full backdrop-blur-sm border border-white/10"></div>
            <div className="h-15 xl:h-20 bg-white/10 rounded-3xl w-full backdrop-blur-sm border border-white/10"></div>
            <div className="h-15 xl:h-20 bg-white/10 rounded-3xl w-full backdrop-blur-sm border border-white/10"></div>
            <div className="h-15 xl:h-20 bg-white/10 rounded-3xl w-full backdrop-blur-sm border border-white/10"></div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#f0fdf4] p-6 lg:p-12 h-full overflow-y-auto">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-8">
            <img src="/Logo.png" alt="Logo" className="w-35 h-35 mx-auto mb-4" />
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Welcome Back</h2>
            <p className="text-gray-500 mt-2 text-sm lg:text-base">Sign in to your Administrator Dashboard</p>
          </div>

          {/* ANIMATED ERROR NOTIFICATION */}
          <AnimatePresence>
            {error.msg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border mb-6 ${
                  error.type === 'security' 
                    ? 'bg-amber-50 border-amber-200 text-amber-800' 
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {error.type === 'security' ? <ShieldAlert className="shrink-0 mt-0.5" size={18} /> : <AlertCircle className="shrink-0 mt-0.5" size={18} />}
                <div className="text-sm font-medium">
                  <strong className="block mb-0.5">
                    {error.type === 'security' ? 'Access Restricted' : 'Login Issue'}
                  </strong>
                  {error.msg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 focus:border-[#108e56] focus:bg-white focus:ring-2 focus:ring-green-100 outline-none transition-all"
                placeholder="admin@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 focus:border-[#108e56] focus:bg-white focus:ring-2 focus:ring-green-100 outline-none transition-all pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-gray-600 cursor-pointer select-none">
                <input type="checkbox" className="mr-2 w-4 h-4 text-[#108e56] rounded border-gray-300 focus:ring-[#108e56]" />
                Remember me
              </label>
              <a href="#" className="text-[#108e56] font-semibold hover:underline">Forgot Password?</a>
            </div>

            <button
              type="submit"
              className="w-full bg-[#047857] hover:bg-[#065f46] text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center justify-center gap-1.5">
              <ShieldAlert size={14} /> Secure access for authorized personnel only
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Login;