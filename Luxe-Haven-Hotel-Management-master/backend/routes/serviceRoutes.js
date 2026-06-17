const express = require('express')
const serviceController = require('../controllers/serviceController')

const router = express.Router()

router.get('/', serviceController.listServices)
router.get('/:id', serviceController.getService)
router.post('/', serviceController.create)
router.put('/:id', serviceController.update)
router.post('/booking', serviceController.addServiceToBooking)

module.exports = router
