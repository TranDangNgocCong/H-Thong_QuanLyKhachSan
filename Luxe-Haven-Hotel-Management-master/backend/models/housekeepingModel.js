const { query, sql } = require('../config/db');

class HousekeepingModel {
  async findAll() {
    // Return only the latest (most recent) housekeeping log per room.
    // Active tasks (status != 'clean') are always included.
    // Completed tasks (status = 'clean') are only included if updated today
    // so admin can still see the green "Đã sạch" badge for the current shift.
    const res = await query(`
      ;WITH LatestPerRoom AS (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY id DESC) AS rn
        FROM housekeeping_log
      )
      SELECT id, room_id AS [roomId], staff_id AS [staffId], status, updated_at AS [updatedAt], task_status,
             cancellation_reason AS [cancellation_reason],
             CONVERT(VARCHAR(19), start_time, 120) AS [start_time],
             CONVERT(VARCHAR(19), end_time, 120) AS [end_time]
      FROM LatestPerRoom
      WHERE rn = 1
        AND (
          status != 'clean'
          OR CAST(updated_at AS DATE) = CAST(GETDATE() AS DATE)
        )
      ORDER BY id DESC
    `);
    return res.recordset.map(l => ({
      ...l,
      staffId: l.staffId ? parseInt(l.staffId) : null
    }));
  }

  async findById(id) {
    const res = await query(`
      SELECT id, room_id AS [roomId], staff_id AS [staffId], status, updated_at AS [updatedAt], task_status,
             cancellation_reason AS [cancellation_reason],
             CONVERT(VARCHAR(19), start_time, 120) AS [start_time],
             CONVERT(VARCHAR(19), end_time, 120) AS [end_time]
      FROM housekeeping_log 
      WHERE id = @id
    `, [
      { name: 'id', type: sql.Int, value: parseInt(id) }
    ]);
    if (res.recordset.length === 0) return null;
    const l = res.recordset[0];
    return {
      ...l,
      staffId: l.staffId ? parseInt(l.staffId) : null
    };
  }

  async findByRoomId(roomId) {
    const res = await query(`
      SELECT id, room_id AS [roomId], staff_id AS [staffId], status, updated_at AS [updatedAt], task_status,
             cancellation_reason AS [cancellation_reason],
             CONVERT(VARCHAR(19), start_time, 120) AS [start_time],
             CONVERT(VARCHAR(19), end_time, 120) AS [end_time]
      FROM housekeeping_log 
      WHERE room_id = @roomId
    `, [
      { name: 'roomId', type: sql.Int, value: parseInt(roomId) }
    ]);
    return res.recordset.map(l => ({
      ...l,
      staffId: l.staffId ? parseInt(l.staffId) : null
    }));
  }

  async createLog(logData) {
    const staffId = logData.staffId ? parseInt(logData.staffId) : null;
    const status = logData.status || 'dirty';
    const taskStatus = logData.task_status || (status === 'clean' ? 'completed' : (staffId ? 'assigned' : 'unassigned'));
    const cancellationReason = logData.cancellation_reason || null;
    const startTime = logData.start_time ? new Date(logData.start_time) : null;
    const endTime = logData.end_time ? new Date(logData.end_time) : null;

    const res = await query(`
      INSERT INTO housekeeping_log (room_id, staff_id, status, task_status, cancellation_reason, start_time, end_time)
      VALUES (@roomId, @staffId, @status, @taskStatus, @cancellationReason, @startTime, @endTime);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'roomId', type: sql.Int, value: parseInt(logData.roomId) },
      { name: 'staffId', type: sql.Int, value: staffId },
      { name: 'status', type: sql.VarChar, value: status },
      { name: 'taskStatus', type: sql.VarChar, value: taskStatus },
      { name: 'cancellationReason', type: sql.NVarChar, value: cancellationReason },
      { name: 'startTime', type: sql.DateTime, value: startTime },
      { name: 'endTime', type: sql.DateTime, value: endTime }
    ]);
    const newId = res.recordset[0].id;
    return await this.findById(newId);
  }

  async updateStatus(roomId, status, staffId) {
    return await this.updateDetailedStatus(roomId, { status, staffId });
  }

  async updateDetailedStatus(roomId, updateData) {
    // Check if there is an active log (status is not 'clean') — pick the LATEST one
    const activeRes = await query("SELECT TOP 1 id FROM housekeeping_log WHERE room_id = @roomId AND status != 'clean' ORDER BY id DESC", [
      { name: 'roomId', type: sql.Int, value: parseInt(roomId) }
    ]);

    let logId;
    if (activeRes.recordset.length > 0) {
      logId = activeRes.recordset[0].id;
      const current = await this.findById(logId);
      
      const status = updateData.status !== undefined ? updateData.status : current.status;
      const staffId = updateData.staffId !== undefined ? (updateData.staffId ? parseInt(updateData.staffId) : null) : current.staffId;
      const taskStatus = updateData.task_status !== undefined ? updateData.task_status : current.task_status;
      const cancellationReason = updateData.cancellation_reason !== undefined ? updateData.cancellation_reason : current.cancellation_reason;
      
      let startTime = current.start_time;
      if (updateData.start_time !== undefined) {
        startTime = updateData.start_time ? new Date(updateData.start_time) : null;
      }
      
      let endTime = current.end_time;
      if (updateData.end_time !== undefined) {
        endTime = updateData.end_time ? new Date(updateData.end_time) : null;
      }

      await query(`
        UPDATE housekeeping_log 
        SET status = @status, staff_id = @staffId, task_status = @taskStatus, 
            cancellation_reason = @cancellationReason, start_time = @startTime, end_time = @endTime,
            updated_at = GETDATE() 
        WHERE id = @id
      `, [
        { name: 'id', type: sql.Int, value: logId },
        { name: 'status', type: sql.VarChar, value: status },
        { name: 'staffId', type: sql.Int, value: staffId },
        { name: 'taskStatus', type: sql.VarChar, value: taskStatus },
        { name: 'cancellationReason', type: sql.NVarChar, value: cancellationReason },
        { name: 'startTime', type: sql.DateTime, value: startTime },
        { name: 'endTime', type: sql.DateTime, value: endTime }
      ]);
    } else {
      // Create new
      const status = updateData.status || 'dirty';
      const staffId = updateData.staffId ? parseInt(updateData.staffId) : null;
      const taskStatus = updateData.task_status || (status === 'clean' ? 'completed' : (staffId ? 'assigned' : 'unassigned'));
      const cancellationReason = updateData.cancellation_reason || null;
      const startTime = updateData.start_time ? new Date(updateData.start_time) : null;
      const endTime = updateData.end_time ? new Date(updateData.end_time) : null;

      const res = await query(`
        INSERT INTO housekeeping_log (room_id, staff_id, status, task_status, cancellation_reason, start_time, end_time)
        VALUES (@roomId, @staffId, @status, @taskStatus, @cancellationReason, @startTime, @endTime);
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'roomId', type: sql.Int, value: parseInt(roomId) },
        { name: 'staffId', type: sql.Int, value: staffId },
        { name: 'status', type: sql.VarChar, value: status },
        { name: 'taskStatus', type: sql.VarChar, value: taskStatus },
        { name: 'cancellationReason', type: sql.NVarChar, value: cancellationReason },
        { name: 'startTime', type: sql.DateTime, value: startTime },
        { name: 'endTime', type: sql.DateTime, value: endTime }
      ]);
      logId = res.recordset[0].id;
    }

    return await this.findById(logId);
  }
}

const housekeepingModelInstance = new HousekeepingModel();
module.exports = housekeepingModelInstance;
