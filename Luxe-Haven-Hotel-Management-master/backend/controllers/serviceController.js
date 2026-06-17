const serviceService = require('../services/serviceService')
const { sendSuccess } = require('../utils/response')

async function listServices(req, res, next) {
  try {
    const services = await serviceService.getServices()
    sendSuccess(res, services, 'Services retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function getService(req, res, next) {
  try {
    const service = await serviceService.getServiceById(req.params.id)
    sendSuccess(res, service, 'Service retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const service = await serviceService.createService(req.body)
    sendSuccess(res, service, 'Service created successfully')
  } catch (error) {
    next(error)
  }
}

async function addServiceToBooking(req, res, next) {
  try {
    const { bookingId, serviceId, quantity } = req.body
    const mapping = await serviceService.addServiceToBooking({ bookingId, serviceId, quantity })
    sendSuccess(res, mapping, 'Service added to booking successfully')
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const service = await serviceService.updateService(req.params.id, req.body)
    sendSuccess(res, service, 'Service updated successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listServices,
  getService,
  create,
  addServiceToBooking,
  update,
}
