require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const path = require('path'); // ✅ Add this
const userRoutes = require('./routes/userRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const announcementRoutes = require('./routes/announcementRoutes'); // ✅ Import here
const assignmentRoutes = require('./routes/assignmentRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const reportRoutes = require('./routes/reportRoutes');
const mobileRoutes = require('./routes/mobileRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const archiveRoutes = require('./routes/archiveRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ SERVE IMAGES: This makes http://localhost:5000/uploads/filename.jpg work
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/collections', collectionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/bins', require('./routes/binRoutes'));
app.use('/api/announcements', announcementRoutes); // ✅ Mount here
app.use('/api/assignments', assignmentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/archive', archiveRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 UNIFIED BACKEND running on port ${PORT}`);
});