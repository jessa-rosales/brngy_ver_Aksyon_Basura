const collectionModel = require('../models/collectionModel');

exports.getCollections = async (req, res) => {
  try {
    const collections = await collectionModel.getAllCollectedBins();
    res.status(200).json(collections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({ message: "Server error fetching collections" });
  }
};

exports.archiveRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const archived = await collectionModel.archiveCollectionRecord(id);

    if (!archived) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.status(200).json({ message: "Record moved to archive" });
  } catch (error) {
    console.error("Archive Error:", error);
    res.status(500).json({ message: "Internal server error during archiving" });
  }
};