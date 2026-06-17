const bookingService = require('../services/bookingService')
const { sendSuccess } = require('../utils/response')

async function listBookings(req, res, next) {
  try {
    const bookings = await bookingService.getBookings()
    sendSuccess(res, bookings, 'Bookings retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function getBooking(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.params.id)
    sendSuccess(res, booking, 'Booking retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function createBooking(req, res, next) {
  try {
    const booking = await bookingService.createBooking(req.body)
    sendSuccess(res, booking, 'Booking created successfully')
  } catch (error) {
    next(error)
  }
}

async function completeBooking(req, res, next) {
  try {
    const { staffId } = req.body
    const booking = await bookingService.completeBooking(req.params.id, staffId)
    sendSuccess(res, booking, 'Booking completed successfully')
  } catch (error) {
    next(error)
  }
}

async function confirmBooking(req, res, next) {
  try {
    const booking = await bookingService.confirmBooking(req.params.id)
    sendSuccess(res, booking, 'Booking confirmed successfully')
  } catch (error) {
    next(error)
  }
}

async function checkoutBooking(req, res, next) {
  try {
    const { staffId } = req.body
    const booking = await bookingService.checkoutBooking(req.params.id, staffId)
    sendSuccess(res, booking, 'Booking checked out successfully')
  } catch (error) {
    next(error)
  }
}

async function getInvoice(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.params.id)
    sendSuccess(res, booking, 'Invoice retrieved successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listBookings,
  getBooking,
  createBooking,
  completeBooking,
  confirmBooking,
  checkoutBooking,
  getInvoice,
}
