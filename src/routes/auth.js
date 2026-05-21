const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { guestOnly } = require('../middlewares/auth');

router.get('/login', guestOnly, AuthController.getLogin);
router.post('/login', guestOnly, AuthController.postLogin);
router.get('/logout', AuthController.logout);

module.exports = router;
