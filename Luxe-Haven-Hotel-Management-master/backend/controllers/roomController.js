const roomService = require('../services/roomService')
const { sendSuccess } = require('../utils/response')

async function listRooms(req, res, next) {
  try {
    const rooms = await roomService.getRooms()
    sendSuccess(res, rooms, 'Rooms retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function listAvailableRooms(req, res, next) {
  try {
    const rooms = await roomService.getAvailableRooms()
    sendSuccess(res, rooms, 'Available rooms retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function createRoom(req, res, next) {
  try {
    const room = await roomService.createRoom(req.body)
    sendSuccess(res, room, 'Room created successfully', 201)
  } catch (error) {
    next(error)
  }
}

async function updateRoom(req, res, next) {
  try {
    const room = await roomService.updateRoom(req.params.id, req.body)
    sendSuccess(res, room, 'Room updated successfully')
  } catch (error) {
    next(error)
  }
}

async function deleteRoom(req, res, next) {
  try {
    await roomService.deleteRoom(req.params.id)
    sendSuccess(res, null, 'Room deleted successfully')
  } catch (error) {
    next(error)
  }
}

async function getAvailableRoomsByType(req, res, next) {
  try {
    const { type, checkin, checkout } = req.query
    if (!type || !checkin || !checkout) {
      return res.status(400).json({ success: false, message: 'Missing type, checkin, or checkout parameters' })
    }
    const rooms = await roomService.getAvailableRoomsByType(type, checkin, checkout)
    sendSuccess(res, rooms, 'Available rooms retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function getRoomTypes(req, res, next) {
  try {
    const types = await roomService.getRoomTypes()
    sendSuccess(res, types, 'Room types retrieved successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listRooms,
  listAvailableRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getAvailableRoomsByType,
  getRoomTypes,
}
