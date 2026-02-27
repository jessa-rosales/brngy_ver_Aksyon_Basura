const announcementModel = require("../models/announcementModel");

const getAnnouncements = async (req, res) => {
  try {
    const data = await announcementModel.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, category, priority, status, author_id } = req.body;
    const validatedAuthorId = (author_id && author_id !== 'undefined') ? parseInt(author_id) : null;
    const ann_photo = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await announcementModel.create({
      title, content, ann_photo, category, priority, status,
      author_id: validatedAuthorId
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    // ✅ Extract last_edited_by from body (sent via FormData)
    const { title, content, category, priority, status, last_edited_by } = req.body;
    
    const editorId = (last_edited_by && last_edited_by !== 'undefined') ? parseInt(last_edited_by) : null;
    const ann_photo = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await announcementModel.update(parseInt(id), {
      title, content, ann_photo, category, priority, status,
      last_edited_by: editorId
    });

    res.json(result);
  } catch (err) {
    console.error("UPDATE ERROR:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await announcementModel.archive(id); // Changed from .delete(id)
    if (success) res.json({ message: "Announcement moved to archives" });
    else res.status(404).json({ error: "Not found" });
  } catch (err) {
    res.status(500).json({ error: "Archive failed" });
  }
};

const updateAnnouncementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    // You might want to update status via the main update or a specific model method
    res.json({ message: "Status updated" });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
};

module.exports = { getAnnouncements, createAnnouncement, deleteAnnouncement, updateAnnouncementStatus, updateAnnouncement };