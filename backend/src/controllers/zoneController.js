const zoneModel = require("../models/zoneModel");

const addZone = async (req, res) => {
  try {
    const { zone_name, zone_color, coordinates } = req.body;
    if (!zone_name || !coordinates) {
      return res.status(400).json({ message: "Zone name and boundaries are required" });
    }
    const newZone = await zoneModel.createZone(zone_name, zone_color, coordinates);
    res.status(201).json(newZone);
  } catch (err) {
    res.status(500).json({ message: "Database Error: " + err.message });
  }
};

const getZones = async (req, res) => {
  try {
    const zones = await zoneModel.getAllZones();
    res.json(zones);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

const updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { zone_name, zone_color, boundaries } = req.body;

    console.log("SENDING TO DB:", JSON.stringify(boundaries));
    const updated = await zoneModel.updateZone(id, zone_name, zone_color, boundaries);
    
    console.log("RECEIVED FROM DB:", updated.boundaries);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { addZone, getZones, updateZone };