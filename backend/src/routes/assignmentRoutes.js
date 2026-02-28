const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const authorize = require('../middleware/auth');

// 1. Dropdown options
router.get('/options', assignmentController.getOptions);

// 2. Main table list
router.get('/', assignmentController.getAssignments);

// 3. Create/Establish new team
router.post('/', assignmentController.createAssignment);

router.put('/:id', assignmentController.updateAssignment);
router.delete('/:id', assignmentController.deleteAssignment);

//MY SCHEDULE SCREEN MOBILE
router.get('/staff/:userId', authorize, assignmentController.getStaffSchedule);

module.exports = router;