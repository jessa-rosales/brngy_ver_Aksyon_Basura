const express = require('express');
const router = express.Router();
const { getAllDutyLogs } = require('../controllers/logController');
const authorize = require("../middleware/auth"); 

router.get('/duty-logs', authorize, getAllDutyLogs);

module.exports = router;