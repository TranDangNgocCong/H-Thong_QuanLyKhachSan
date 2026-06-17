const express = require('express')
const userController = require('../controllers/userController')
const { protect, restrictTo } = require('../middleware/authMiddleware')

const router = express.Router()

// Public routes
router.post('/login', userController.login)
router.post('/register', userController.register)
router.post('/check-email', userController.checkEmail)

// Protected routes (Admin only)
router.use(protect)
router.use(restrictTo('admin'))

router.get('/', userController.listUsers)
router.get('/:id', userController.getUser)
router.put('/:id', userController.update)
router.delete('/:id', userController.deleteUser)

module.exports = router
