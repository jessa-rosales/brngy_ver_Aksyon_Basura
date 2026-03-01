const express = require('express');
const router = express.Router();
const { submitReport, getAllReports, toggleAttention, updateReportStatus, deleteReport, assignTeam, uploadReportEvidence, confirmReportResolution } = require('../controllers/reportController');
const reportUpload = require('../middleware/reportUpload');
const evidenceUpload = require('../middleware/collectionUpload'); 
const authorize = require('../middleware/auth'); // Ensure this middleware is imported

// POST: Submit a new report
router.post('/submit-report', reportUpload.single('photo'), submitReport);

// GET: All reports for the feed
router.get('/', authorize, getAllReports);

// POST: Toggle the attention button (Requires Login)
router.post('/toggle-attention', authorize, toggleAttention); 

// Update existing reportRoutes.js
router.put('/:id/status', authorize, updateReportStatus);
router.put('/:id/assign', authorize, assignTeam);
router.delete('/:id', authorize, deleteReport);

// 📸 Route for Collector to upload the photo (Using evidenceUpload to put it in collection_rec!)
router.post('/:id/evidence', authorize, evidenceUpload.single('photo'), uploadReportEvidence);

// 🚚 Route for Driver to confirm the task
router.put('/:id/confirm-resolution', authorize, confirmReportResolution);

module.exports = router;