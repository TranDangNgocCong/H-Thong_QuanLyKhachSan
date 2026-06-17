const paymentService = require('../services/paymentService')
const { sendSuccess } = require('../utils/response')

function listPayments(req, res, next) {
  try {
    const payments = paymentService.getPayments()
    sendSuccess(res, payments, 'Payments retrieved successfully')
  } catch (error) {
    next(error)
  }
}

function getPayment(req, res, next) {
  try {
    const payment = paymentService.getPaymentById(req.params.id)
    sendSuccess(res, payment, 'Payment retrieved successfully')
  } catch (error) {
    next(error)
  }
}

function getPaymentByBooking(req, res, next) {
  try {
    const payment = paymentService.getPaymentByBookingId(req.params.bookingId)
    sendSuccess(res, payment, 'Payment retrieved successfully')
  } catch (error) {
    next(error)
  }
}

function updateStatus(req, res, next) {
  try {
    const { status } = req.body
    const payment = paymentService.updatePaymentStatus(req.params.id, status)
    sendSuccess(res, payment, 'Payment status updated successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listPayments,
  getPayment,
  getPaymentByBooking,
  updateStatus,
}
