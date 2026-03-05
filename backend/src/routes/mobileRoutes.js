const express = require('express');
const router = express.Router();
const { getMobileAssignment, startDuty, endDuty, updateVehicleLocation, saveCollectionRecord, confirmBinCollection, getActiveTrackingRoutes, getAllReports, getCollectionHistory, getArchivedCollectionHistory, archiveReport, getArchivedReports } = require('../controllers/mobileController');
const authorize = require("../middleware/auth"); 
const uploadEvidence = require('../middleware/collectionUpload');

router.get('/assignment/:userId', authorize, getMobileAssignment);

// ✅ Duty Management Routes
router.post('/start-duty', authorize, startDuty);
router.put('/end-duty', authorize, endDuty);

// For vehicle tracking live
router.put('/vehicle-location', authorize, updateVehicleLocation);

//  the multer middleware for photo
router.post('/evidence', authorize, uploadEvidence.single('photo'), saveCollectionRecord);

// Route for the driver to confirm collection
router.put('/confirm-collection', authorize, confirmBinCollection);

router.get('/tracking-routes', authorize, getActiveTrackingRoutes);

//This route is what FeedScreen and UserReportsScreen call
router.get('/all-reports', authorize, getAllReports);

// This route for My Collection History 
router.get('/collection-history/:userId', authorize, getCollectionHistory);

//Route for Staff Archive History (Collection logs + Resolved reports)
router.get('/collection-history-archived', authorize, getArchivedCollectionHistory);

router.post('/archive-report', authorize, archiveReport);

router.get('/archived-reports', authorize, getArchivedReports);

module.exports = router;