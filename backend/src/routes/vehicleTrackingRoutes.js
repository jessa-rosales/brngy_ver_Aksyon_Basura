const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/vehicleTrackingController');

// GET /api/tracking/live-fleet
router.get('/live-fleet', trackingController.getLiveFleet); 

module.exports = router;