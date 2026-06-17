const express = require('express');
const notificationController = require('../controllers/notificationController');
const authRouter = require('./authRoutes');
const extractUser = authRouter.extractUser;

const router = express.Router();

router.get('/', extractUser, notificationController.listNotifications);
router.put('/read-all', extractUser, notificationController.markAllRead);

module.exports = router;
