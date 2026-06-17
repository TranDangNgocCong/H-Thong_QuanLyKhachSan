const serviceModel = require('../models/serviceModel')
const bookingModel = require('../models/bookingModel')
const AppError = require('../utils/appError')

async function getServices() {
  return await serviceModel.findAllServices()
}

async function getAvailableServices() {
  return await serviceModel.findAvailableServices()
}

async function getServiceById(id) {
  const service = await serviceModel.findServiceById(id)
  if (!service) {
    throw new AppError(`Service not found with ID ${id}`, 404)
  }
  return service
}

async function createService({ serviceName, price, isAvailable = true }) {
  if (!serviceName || price === undefined) {
    throw new AppError('Please provide serviceName and price', 400)
  }
  return await serviceModel.createService({
    serviceName,
    price: parseFloat(price),
    isAvailable,
  })
}

async function addServiceToBooking({ bookingId, serviceId, quantity = 1 }) {
  const booking = await bookingModel.findById(bookingId)
  if (!booking) {
    throw new AppError(`Booking not found with ID ${bookingId}`, 404)
  }

  const service = await serviceModel.findServiceById(serviceId)
  if (!service) {
    throw new AppError(`Service not found with ID ${serviceId}`, 404)
  }
  if (!service.isAvailable) {
    throw new AppError(`Service ${service.serviceName} is not available`, 400)
  }

  const qty = parseInt(quantity) || 1
  const totalPrice = service.price * qty

  const mapping = await serviceModel.addServiceToBooking({
    bookingId: parseInt(bookingId),
    serviceId: parseInt(serviceId),
    quantity: qty,
    totalPrice,
  })

  // Additionally: update the booking payment amount if a payment exists
  const paymentModel = require('../models/paymentModel')
  const payment = await paymentModel.findByBookingId(bookingId)
  if (payment) {
    await paymentModel.updateAmount(payment.id, payment.amount + totalPrice)
  }

  return mapping
}

async function updateService(id, updateData) {
  return await serviceModel.updateService(id, updateData)
}

module.exports = {
  getServices,
  getAvailableServices,
  getServiceById,
  createService,
  addServiceToBooking,
  updateService,
}
