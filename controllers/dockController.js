const { getDockStatusForPort } = require('../services/dockStateService');

const getDocks = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const userPort = String(req.user?.portName || req.user?.port || '').trim();
    const portName = role !== 'admin' ? userPort : String(req.query.portName || userPort).trim();
    const gasType = String(req.query.gasType || '').trim().toLowerCase();
    const onlyAvailable = String(req.query.availableOnly || '').toLowerCase() === 'true';
    const search = String(req.query.search || '').trim().toLowerCase();

    const docks = await getDockStatusForPort({ portName });
    const filtered = docks.filter((dock) => {
      if (onlyAvailable && dock.dockVacancy <= 0) return false;
      if (gasType && !dock.supportedGasTypes.some((g) => String(g).toLowerCase() === gasType)) return false;
      if (search && !dock.dockName.toLowerCase().includes(search)) return false;
      return true;
    });
    res.status(200).json(filtered);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createDock = async (req, res) => {
  return res.status(405).json({ message: 'Docks are predefined constants. Manual create is disabled.' });
};

const updateDock = async (req, res) => {
  return res.status(405).json({ message: 'Docks are predefined constants. Manual update is disabled.' });
};

const deleteDock = async (req, res) => {
  return res.status(405).json({ message: 'Docks are predefined constants. Manual delete is disabled.' });
};

module.exports = {
  getDocks,
  createDock,
  updateDock,
  deleteDock,
};
