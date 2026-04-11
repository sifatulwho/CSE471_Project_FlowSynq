const { geocodePort } = require("../services/portGeocodingService");

const getPortCoordinates = async (req, res) => {
  try {
    const { portName, countryCode } = req.query;

    if (!portName) {
      return res.status(400).json({
        success: false,
        message: "portName query parameter is required.",
      });
    }

    const data = await geocodePort(portName, countryCode);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[portGeocodingController]", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch port coordinates.",
      error: error.message,
    });
  }
};

module.exports = {
  getPortCoordinates,
};