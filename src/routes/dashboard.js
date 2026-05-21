const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { reqAuth } = require('../middlewares/auth');

router.get('/', reqAuth, DashboardController.index);

module.exports = router;
