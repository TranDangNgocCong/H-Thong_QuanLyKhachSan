const housekeepingService = require('../services/housekeepingService')
const { sendSuccess } = require('../utils/response')
const { query, sql } = require('../config/db')
const { getVietnamTime } = require('../utils/dateHelper')

async function listLogs(req, res, next) {
  try {
    const logs = await housekeepingService.getHousekeepingLogs()
    sendSuccess(res, logs, 'Housekeeping logs retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status, staffId } = req.body
    const log = await housekeepingService.updateRoomCleaningStatus(req.params.roomId, status, staffId)
    sendSuccess(res, log, 'Room cleaning status updated successfully')
  } catch (error) {
    next(error)
  }
}

async function updateStatusBody(req, res, next) {
  try {
    const { roomId } = req.body
    const log = await housekeepingService.updateRoomCleaningDetailed(roomId, req.body)
    sendSuccess(res, log, 'Room cleaning status updated successfully')
  } catch (error) {
    next(error)
  }
}

async function assignSelf(req, res, next) {
  try {
    const { roomId } = req.body
    const staffId = req.userId

    // 1. Verify user exists and has cleaner role
    const userRes = await query('SELECT role FROM system_users WHERE id = @id', [
      { name: 'id', type: sql.Int, value: staffId }
    ])
    if (userRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Nhân viên không tồn tại' })
    }
    const userRole = userRes.recordset[0].role
    if (userRole !== 'cleaner') {
      return res.status(403).json({ success: false, message: 'Chỉ nhân viên dọn dẹp mới được nhận việc' })
    }

    // 2. Check if there is an active housekeeping log for the room (LATEST only)
    const activeRes = await query("SELECT TOP 1 id, status, task_status FROM housekeeping_log WHERE room_id = @roomId AND status != 'clean' ORDER BY id DESC", [
      { name: 'roomId', type: sql.Int, value: parseInt(roomId) }
    ])

    if (activeRes.recordset.length > 0) {
      const log = activeRes.recordset[0]
      if (log.task_status !== 'unassigned') {
        return res.status(400).json({ success: false, message: 'Phòng này đã được phân công hoặc nhận việc' })
      }

      const vnTime = getVietnamTime()
      await query(`
        UPDATE housekeeping_log 
        SET staff_id = @staffId, 
            status = 'cleaning', 
            task_status = 'assigned', 
            start_time = @vnTime,
            updated_at = @vnTime 
        WHERE id = @id
      `, [
        { name: 'id', type: sql.Int, value: log.id },
        { name: 'staffId', type: sql.Int, value: staffId },
        { name: 'vnTime', type: sql.DateTime, value: vnTime }
      ])
    } else {
      // Create new active log
      const vnTime = getVietnamTime()
      await query(`
        INSERT INTO housekeeping_log (room_id, staff_id, status, task_status, start_time, updated_at)
        VALUES (@roomId, @staffId, 'cleaning', 'assigned', @vnTime, @vnTime)
      `, [
        { name: 'roomId', type: sql.Int, value: parseInt(roomId) },
        { name: 'staffId', type: sql.Int, value: staffId },
        { name: 'vnTime', type: sql.DateTime, value: vnTime }
      ])
    }

    // 3. Update room availability status to 0
    await query('UPDATE rooms SET is_available = 0 WHERE id = @roomId', [
      { name: 'roomId', type: sql.Int, value: parseInt(roomId) }
    ])

    res.status(200).json({ success: true, message: 'Đăng ký nhận việc thành công!' })
  } catch (error) {
    next(error)
  }
}

async function requestCancel(req, res, next) {
  try {
    const { roomId, reason } = req.body
    const staffId = req.userId

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do hủy dọn dẹp' })
    }

    // Check if there is an active log for this cleaner on this room (LATEST only)
    const activeRes = await query("SELECT TOP 1 id, task_status FROM housekeeping_log WHERE room_id = @roomId AND staff_id = @staffId AND status != 'clean' ORDER BY id DESC", [
      { name: 'roomId', type: sql.Int, value: parseInt(roomId) },
      { name: 'staffId', type: sql.Int, value: staffId }
    ])

    if (activeRes.recordset.length === 0) {
      return res.status(400).json({ success: false, message: 'Bạn không phụ trách dọn dẹp phòng này hoặc phòng đã sạch' })
    }

    const log = activeRes.recordset[0]
    if (log.task_status !== 'assigned') {
      return res.status(400).json({ success: false, message: 'Nhiệm vụ không ở trạng thái đang dọn để xin hủy' })
    }

    const vnTime = getVietnamTime()
    await query(`
      UPDATE housekeeping_log 
      SET task_status = 'cancel_requested', 
          cancellation_reason = @reason,
          updated_at = @vnTime 
      WHERE id = @id
    `, [
      { name: 'id', type: sql.Int, value: log.id },
      { name: 'reason', type: sql.NVarChar, value: reason },
      { name: 'vnTime', type: sql.DateTime, value: vnTime }
    ])

    res.status(200).json({ success: true, message: 'Đã gửi yêu cầu xin hủy dọn dẹp!' })
  } catch (error) {
    next(error)
  }
}

async function handleCancelRequest(req, res, next) {
  try {
    const { roomId, action } = req.body
    const userId = req.userId

    // 1. Verify user is admin or receptionist
    const userRes = await query('SELECT role FROM system_users WHERE id = @id', [
      { name: 'id', type: sql.Int, value: userId }
    ])
    if (userRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' })
    }
    const role = userRes.recordset[0].role
    if (role !== 'admin' && role !== 'receptionist') {
      return res.status(403).json({ success: false, message: 'Chỉ admin hoặc lễ tân mới có quyền duyệt yêu cầu hủy' })
    }

    // 2. Find active cancel_requested log
    const activeRes = await query("SELECT id FROM housekeeping_log WHERE room_id = @roomId AND task_status = 'cancel_requested'", [
      { name: 'roomId', type: sql.Int, value: parseInt(roomId) }
    ])

    if (activeRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu hủy dọn dẹp cho phòng này' })
    }

    const logId = activeRes.recordset[0].id

    const vnTime = getVietnamTime()
    if (action === 'approve') {
      // Approve: reset status back to unassigned, status to dirty, cleave staff_id, clear cancellation_reason and start/end time
      await query(`
        UPDATE housekeeping_log 
        SET task_status = 'unassigned', 
            status = 'dirty', 
            staff_id = NULL, 
            cancellation_reason = NULL,
            start_time = NULL, 
            end_time = NULL,
            updated_at = @vnTime 
        WHERE id = @id
      `, [
        { name: 'id', type: sql.Int, value: logId },
        { name: 'vnTime', type: sql.DateTime, value: vnTime }
      ])
      res.status(200).json({ success: true, message: 'Đã chấp thuận hủy dọn dẹp phòng!' })
    } else if (action === 'reject') {
      // Reject: forces task state back to assigned, clears cancellation reason
      await query(`
        UPDATE housekeeping_log 
        SET task_status = 'assigned', 
            cancellation_reason = NULL, 
            updated_at = @vnTime 
        WHERE id = @id
      `, [
        { name: 'id', type: sql.Int, value: logId },
        { name: 'vnTime', type: sql.DateTime, value: vnTime }
      ])
      res.status(200).json({ success: true, message: 'Đã từ chối yêu cầu hủy dọn dẹp!' })
    } else {
      res.status(400).json({ success: false, message: 'Hành động không hợp lệ' })
    }
  } catch (error) {
    next(error)
  }
}

async function listCleaners(req, res, next) {
  try {
    const result = await query(`
      SELECT id, full_name, role FROM system_users WHERE role = 'cleaner' AND is_active = 1
    `)
    res.status(200).json({
      success: true,
      data: result.recordset
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listCleaners,
  listLogs,
  updateStatus,
  updateStatusBody,
  assignSelf,
  requestCancel,
  handleCancelRequest,
}
