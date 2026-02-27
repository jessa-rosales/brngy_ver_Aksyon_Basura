const express = require("express");
// ✅ 1. Import deleteZone
const { addZone, getZones, updateZone, deleteZone } = require("../controllers/zoneController");

const router = express.Router();

router.post("/", addZone);
router.get("/", getZones);
router.put("/:id", updateZone);
// ✅ 2. Add the missing route
router.delete("/:id", deleteZone); 

module.exports = router;