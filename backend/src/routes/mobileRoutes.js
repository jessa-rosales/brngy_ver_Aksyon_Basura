const express = require('express');
const router = express.Router();
const { getMobileAssignment, saveCollectionRecord, confirmBinCollection } = require('../controllers/mobileController');
const authorize = require("../middleware/auth"); 
const uploadEvidence = require('../middleware/collectionUpload');

router.get('/assignment/:userId', authorize, getMobileAssignment);

// 👇 Add the multer middleware here. 'photo' is the field name we will use in React Native.
router.post('/evidence', authorize, uploadEvidence.single('photo'), saveCollectionRecord);

// 🚚 NEW: Route for the driver to confirm collection
router.put('/confirm-collection', authorize, confirmBinCollection);

module.exports = router;