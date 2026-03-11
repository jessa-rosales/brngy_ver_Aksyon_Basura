require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const path = require('path'); 
const userRoutes = require('./routes/userRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const announcementRoutes = require('./routes/announcementRoutes'); 
const assignmentRoutes = require('./routes/assignmentRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const reportRoutes = require('./routes/reportRoutes');
const mobileRoutes = require('./routes/mobileRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const archiveRoutes = require('./routes/archiveRoutes');
const vehicleTrackingRoutes = require('./routes/vehicleTrackingRoutes');
const logRoutes = require('./routes/logRoutes');
const publicRoutes = require('./routes/publicRoutes'); 

const app = express();

// ✅ UPDATED CORS: This allows your Vercel site to talk to your Render backend
app.use(cors({
    origin: [
        'https://brngy-nzrth.vercel.app', // Your live Vercel link
        'http://localhost:5173',          // Local Vite
        'http://localhost:3000'           // Local React
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ✅ SERVE IMAGES
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ ROUTES
app.use('/api/collections', collectionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/tracking', vehicleTrackingRoutes);
app.use('/api/bins', require('./routes/binRoutes'));
app.use('/api/logs', logRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/public', publicRoutes); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 UNIFIED BACKEND running on port ${PORT}`);
});