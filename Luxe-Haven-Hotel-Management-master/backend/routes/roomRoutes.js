const express = require('express')
const roomController = require('../controllers/roomController')
const { protect, restrictTo } = require('../middleware/authMiddleware')

const router = express.Router()

// Public routes (no authentication required)
router.get('/types', roomController.getRoomTypes)
router.get('/available-by-type', roomController.getAvailableRoomsByType)

// All room routes below require authentication
router.use(protect)

// Read routes: Accessible to admin, receptionist, cleaner, accountant
router.get('/', roomController.listRooms)
router.get('/available', roomController.listAvailableRooms)

// Write routes: Restricted to admin only
router.post('/', restrictTo('admin'), roomController.createRoom)
router.put('/:id', restrictTo('admin'), roomController.updateRoom)
router.delete('/:id', restrictTo('admin'), roomController.deleteRoom)

module.exports = router
