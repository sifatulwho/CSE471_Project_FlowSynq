const express = require("express");
const { getPortCoordinates } = require("../controllers/portGeocodingController");

const router = express.Router();

router.get("/coordinates", getPortCoordinates);

module.exports = router;