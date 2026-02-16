const binModel = require("../models/binModel");
const pool = require("../db");

const addBin = async (req, res) => {
  try {
    const { bin_name, zone_id, latitude, longitude, bin_address } = req.body;

    if (!bin_name || !latitude || !longitude) {
      return res.status(400).json({ error: "Bin name and map location are required." });
    }

    const newBin = await binModel.createBin(bin_name, zone_id, latitude, longitude, bin_address);
    res.status(201).json(newBin);
  } catch (err) {
    console.error("Add Bin Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

const getBinsByZone = async (req, res) => {
  try {
    const bins = await binModel.getBinsByZoneId(req.params.zoneId);
    res.json(bins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const relocateBin = async (req, res) => {
  try {
    const { id } = req.params; 
    const { latitude, longitude } = req.body;

    //Validation check
    if (!id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing Bin ID or Coordinates" });
    }

    //PostGIS Query
    //ST_MakePoint takes (Longitude, Latitude) -> ($2, $1)
    const query = `
      UPDATE waste_bins 
      SET location = ST_SetSRID(ST_MakePoint($2, $1), 4326) 
      WHERE bin_id = $3 
      RETURNING bin_id, bin_name, ST_AsGeoJSON(location) as location;
    `;
    
    const result = await pool.query(query, [latitude, longitude, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Bin not found in database." });
    }

    res.json({ message: "Relocation successful", data: result.rows[0] });
  } catch (err) {
    console.error("CRITICAL DATABASE ERROR:", err.message);
    res.status(500).json({ error: "Database rejected the relocation update." });
  }
};

const getAllBins = async (req, res) => {
  try {
    const bins = await binModel.getAllBins();
    res.json(bins);
  } catch (err) {
    console.error("Fetch All Bins Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteBin = async (req, res) => {
  try {
    const deleted = await binModel.deleteBin(req.params.id);
    if (deleted) res.json({ message: "Bin removed successfully" });
    else res.status(404).json({ message: "Bin not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { addBin, getBinsByZone, relocateBin, deleteBin, getAllBins };