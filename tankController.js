const Tank = require('../models/Tank');

// Get all tanks
const getTanks = async (req, res) => {
  try {
    const tanks = await Tank.find();
    res.status(200).json(tanks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a tank
const createTank = async (req, res) => {
  const tank = new Tank({
    tankId: req.body.tankId,
    location: req.body.location,
    commodity: req.body.commodity,
    capacity: req.body.capacity,
    currentLevel: req.body.currentLevel
  });

  try {
    const newTank = await tank.save();
    res.status(201).json(newTank);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update a tank
const updateTank = async (req, res) => {
  try {
    const updatedTank = await Tank.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTank) return res.status(404).json({ message: 'Tank not found' });
    res.status(200).json(updatedTank);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a tank
const deleteTank = async (req, res) => {
  try {
    const deletedTank = await Tank.findByIdAndDelete(req.params.id);
    if (!deletedTank) return res.status(404).json({ message: 'Tank not found' });
    res.status(200).json({ message: 'Tank deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getTanks,
  createTank,
  updateTank,
  deleteTank
};
