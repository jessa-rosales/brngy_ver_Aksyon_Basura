const router = require("express").Router();
const zoneController = require("../controllers/zoneController");
const authorize = require("../middleware/auth");

router.put("/:id", authorize, zoneController.updateZone);
router.post("/", authorize, zoneController.addZone);
router.get("/", authorize, zoneController.getZones);

module.exports = router;