const express = require('express');
const router = express.Router();
const { getTanks, createTank, updateTank, deleteTank } = require('../controllers/tankController');

router.route('/')
  .get(getTanks)
  .post(createTank);

router.route('/:id')
  .put(updateTank)
  .delete(deleteTank);

module.exports = router;
