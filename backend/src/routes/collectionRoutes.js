const express = require('express');
const router = express.Router();
const authorize = require('../middleware/auth');
const collectionController = require('../controllers/collectionController');

// GET /api/collections
router.get('/', authorize, collectionController.getCollections);

router.patch('/:id/archive', authorize, collectionController.archiveRecord);

module.exports = router;