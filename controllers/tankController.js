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

// Get inventory levels for a port and commodity
const getInventoryLevels = async (req, res) => {
  try {
    const portName = String(req.query.portName || '').trim();
    const commodity = String(req.query.commodity || '').trim();

    if (!portName || !commodity) {
      return res.status(400).json({ message: 'portName and commodity are required.' });
    }

    const tanks = await Tank.find({
      location: new RegExp(`^${portName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i'),
      commodity: new RegExp(`^${commodity.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i')
    });

    const totalCapacity = tanks.reduce((sum, tank) => sum + (Number(tank.capacity) || 0), 0);
    const totalCurrentLevel = tanks.reduce((sum, tank) => sum + (Number(tank.currentLevel) || 0), 0);
    const utilizationPct = totalCapacity > 0 ? (totalCurrentLevel / totalCapacity) * 100 : 0;

    res.status(200).json({
      portName,
      commodity,
      totalCapacity,
      totalCurrentLevel,
      utilizationPct: Math.round(utilizationPct * 10) / 10,
      tanks: tanks.map(t => ({
        tankId: t.tankId,
        capacity: t.capacity,
        currentLevel: t.currentLevel,
        utilizationPct: t.capacity > 0 ? Math.round((t.currentLevel / t.capacity) * 1000) / 10 : 0
      }))
    });
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
  getInventoryLevels,
  createTank,
  updateTank,
  deleteTank
};
