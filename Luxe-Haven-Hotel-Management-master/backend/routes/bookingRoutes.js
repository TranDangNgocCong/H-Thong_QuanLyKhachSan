const express = require('express')
const bookingController = require('../controllers/bookingController')

const router = express.Router()

router.get('/', bookingController.listBookings)
router.post('/', bookingController.createBooking)
router.get('/:id', bookingController.getBooking)
router.get('/:id/invoice', bookingController.getInvoice)
router.put('/:id/complete', bookingController.completeBooking)
router.put('/confirm/:id', bookingController.confirmBooking)
router.put('/checkout/:id', bookingController.checkoutBooking)

module.exports = router
