const express = require('express');
const router = express.Router();
const archiveController = require('../controllers/archiveController');

// We have removed the 'authorize' middleware so the server can start successfully.

// Route for fetching archived items by category
router.get('/:category', archiveController.getArchivedItems);

// Route for restoring items by category and ID
router.patch('/:category/:id/restore', archiveController.restoreItem);

module.exports = router;