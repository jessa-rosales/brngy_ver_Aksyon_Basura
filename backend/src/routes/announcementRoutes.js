const express = require("express");
const router = express.Router();
// ✅ Handles saving the physical image files to src/uploads/
const upload = require("../middleware/announcementUpload"); 
const { 
  getAnnouncements, 
  createAnnouncement, 
  deleteAnnouncement,
  updateAnnouncementStatus, 
  updateAnnouncement // ✅ Required for "Modify Content"
} = require("../controllers/announcementController");

// 1. FETCH ALL: Used by the Announcement dashboard grid
router.get("/", getAnnouncements);

// 2. CREATE: Used by the CreateAnnouncementModal (New Posts)
router.post("/", upload.single("ann_photo"), createAnnouncement);

// 3. UPDATE: Used by CreateAnnouncementModal when in "Edit Mode"
// This matches the fetch(`${BASE_URL}/${id}`) call in your service
router.put("/:id", upload.single("ann_photo"), updateAnnouncement);

// 4. DELETE: Triggered by the red Trash icon
router.delete("/:id", deleteAnnouncement);

// 5. ARCHIVE: Triggered by the Archive button in the luxury modal
router.patch("/:id/status", updateAnnouncementStatus);

module.exports = router;