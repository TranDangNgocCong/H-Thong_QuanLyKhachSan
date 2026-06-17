const express = require('express')
const paymentController = require('../controllers/paymentController')

const router = express.Router()

router.get('/', paymentController.listPayments)
router.get('/:id', paymentController.getPayment)
router.get('/booking/:bookingId', paymentController.getPaymentByBooking)
router.put('/:id/status', paymentController.updateStatus)

module.exports = router
