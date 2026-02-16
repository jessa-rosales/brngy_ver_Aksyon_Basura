const express = require('express');
const router = express.Router();
const { getMobileAssignment } = require('../controllers/mobileController');
const authorize = require("../middleware/auth"); // This is your token verification middleware

// Use 'authorize' as the middleware
router.get('/assignment/:userId', authorize, getMobileAssignment);

module.exports = router;