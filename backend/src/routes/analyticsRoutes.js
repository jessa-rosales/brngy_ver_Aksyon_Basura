const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authorize = require('../middleware/auth'); 

// GET /api/analytics/system-report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/system-report', authorize, analyticsController.getSystemReport);

module.exports = router;