const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

router.post('/', vehicleController.registerVehicle);
router.get('/', vehicleController.getVehicles);
router.put('/:id', vehicleController.updateVehicle);    //  Update Route
router.delete('/:id', vehicleController.deleteVehicle); //  Delete Route

module.exports = router;