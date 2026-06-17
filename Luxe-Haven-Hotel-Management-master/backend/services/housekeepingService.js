const housekeepingModel = require('../models/housekeepingModel')
const roomModel = require('../models/roomModel')
const userModel = require('../models/userModel')
const notificationModel = require('../models/notificationModel')
const AppError = require('../utils/appError')

async function populateLog(log) {
  if (!log) return null
  const room = await roomModel.findById(log.roomId)
  const staff = log.staffId ? await userModel.findById(log.staffId) : null
  return {
    id: log.id,
    roomId: log.roomId,
    staffId: log.staffId,
    status: log.status,
    updatedAt: log.updatedAt,
    task_status: log.task_status,
    cancellation_reason: log.cancellation_reason,
    start_time: log.start_time,
    end_time: log.end_time,
    room: room ? { id: room.id, number: room.number, type: room.type } : null,
    staff: staff ? { id: staff.id, fullName: staff.fullName, username: staff.username, role: staff.role } : null,
  }
}

async function getHousekeepingLogs() {
  const logs = await housekeepingModel.findAll()
  return await Promise.all(logs.map(populateLog))
}

async function updateRoomCleaningDetailed(roomId, updateData) {
  const room = await roomModel.findById(roomId)
  if (!room) {
    throw new AppError(`Room not found with ID ${roomId}`, 404)
  }

  if (updateData.staffId !== undefined && updateData.staffId !== null) {
    const staff = await userModel.findById(updateData.staffId)
    if (!staff) {
      throw new AppError(`Staff member not found with ID ${updateData.staffId}`, 404)
    }
  }

  const log = await housekeepingModel.updateDetailedStatus(roomId, updateData)

  // Sync room available status
  if (updateData.status === 'clean') {
    await roomModel.update(roomId, { available: true })
    
    // Create notification
    const room = await roomModel.findById(roomId)
    const roomNum = room ? room.number : 'N/A'
    await notificationModel.create({
      title: 'Buồng Phòng Đã Sạch',
      message: `Phòng ${roomNum} đã hoàn tất dọn dẹp và sẵn sàng đón khách.`,
      targetRole: 'receptionist'
    }).catch(err => console.error('Error creating housekeeping notification:', err))
  } else if (updateData.status === 'dirty' || updateData.status === 'cleaning') {
    await roomModel.update(roomId, { available: false })
  }

  return await populateLog(log)
}

async function updateRoomCleaningStatus(roomId, status, staffId) {
  if (status && !['dirty', 'cleaning', 'clean'].includes(status)) {
    throw new AppError("Invalid housekeeping status. Must be 'dirty', 'cleaning', or 'clean'", 400)
  }
  return await updateRoomCleaningDetailed(roomId, { status, staffId })
}

module.exports = {
  getHousekeepingLogs,
  updateRoomCleaningStatus,
  updateRoomCleaningDetailed,
}
