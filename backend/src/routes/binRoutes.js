const router = require("express").Router();
const binController = require("../controllers/binController");
const authorize = require("../middleware/auth");

router.post("/", authorize, binController.addBin);
router.get("/zone/:zoneId", authorize, binController.getBinsByZone);
router.get("/", authorize, binController.getAllBins);
router.put("/:id/relocate", authorize, binController.relocateBin);
router.delete("/:id", authorize, binController.deleteBin);

module.exports = router;