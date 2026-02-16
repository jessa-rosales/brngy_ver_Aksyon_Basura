const express = require('express');
const router = express.Router();
const { submitReport, getAllReports, toggleAttention, updateReportStatus, deleteReport } = require('../controllers/reportController');
const reportUpload = require('../middleware/reportUpload'); 
const authorize = require('../middleware/auth'); // Ensure this middleware is imported

// POST: Submit a new report
router.post('/submit-report', reportUpload.single('photo'), submitReport);

// GET: All reports for the feed
router.get('/', authorize, getAllReports);

// POST: Toggle the attention button (Requires Login)
router.post('/toggle-attention', authorize, toggleAttention); 

// Update existing reportRoutes.js
router.put('/:id/status', authorize, updateReportStatus);
router.delete('/:id', authorize, deleteReport);

module.exports = router;