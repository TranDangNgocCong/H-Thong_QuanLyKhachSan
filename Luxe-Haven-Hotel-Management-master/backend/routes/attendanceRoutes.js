const express = require('express');
const { query, sql } = require('../config/db');
const authRouter = require('./authRoutes');
const extractUser = authRouter.extractUser;
const { getVietnamTime, getVietnamDate } = require('../utils/dateHelper');

const router = express.Router();

// GET /api/attendance/status
router.get('/status', extractUser, async (req, res, next) => {
  try {
    const userId = req.userId;
    const activeRes = await query(`
      SELECT id, CONVERT(VARCHAR(19), check_in_time, 120) AS [checkInTime] 
      FROM time_attendance 
      WHERE user_id = @userId AND check_out_time IS NULL
    `, [
      { name: 'userId', type: sql.Int, value: userId }
    ]);

    if (activeRes.recordset.length > 0) {
      res.status(200).json({
        success: true,
        isClockedIn: true,
        checkInTime: activeRes.recordset[0].checkInTime
      });
    } else {
      res.status(200).json({
        success: true,
        isClockedIn: false
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/check-in
router.post('/check-in', extractUser, async (req, res, next) => {
  try {
    const userId = req.userId;

    // Verify no active session exists
    const activeRes = await query(`
      SELECT id FROM time_attendance 
      WHERE user_id = @userId AND check_out_time IS NULL
    `, [
      { name: 'userId', type: sql.Int, value: userId }
    ]);

    if (activeRes.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đăng nhập vào ca làm việc rồi!'
      });
    }

    const vnTime = getVietnamTime();
    const vnDate = getVietnamDate();

    // Insert new check-in row
    await query(`
      INSERT INTO time_attendance (user_id, check_in_time, work_date)
      VALUES (@userId, @checkInTime, @workDate)
    `, [
      { name: 'userId', type: sql.Int, value: userId },
      { name: 'checkInTime', type: sql.DateTime, value: vnTime },
      { name: 'workDate', type: sql.Date, value: vnDate }
    ]);

    res.status(200).json({
      success: true,
      message: 'Điểm danh vào ca thành công!'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/check-out
router.post('/check-out', extractUser, async (req, res, next) => {
  try {
    const userId = req.userId;

    const vnTime = getVietnamTime();

    // Stamp check-out and compute total hours
    const result = await query(`
      UPDATE time_attendance
      SET check_out_time = @checkOutTime,
          total_hours = CAST(DATEDIFF(second, check_in_time, @checkOutTime) / 3600.0 AS DECIMAL(4,2))
      OUTPUT CONVERT(VARCHAR(19), DELETED.check_in_time, 120) AS [checkInTime],
             CONVERT(VARCHAR(19), INSERTED.check_out_time, 120) AS [checkOutTime],
             INSERTED.total_hours AS [totalHours]
      WHERE user_id = @userId AND check_out_time IS NULL
    `, [
      { name: 'userId', type: sql.Int, value: userId },
      { name: 'checkOutTime', type: sql.DateTime, value: vnTime }
    ]);

    if (result.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa điểm danh vào ca hôm nay!'
      });
    }

    const session = result.recordset[0];
    res.status(200).json({
      success: true,
      message: 'Đã hoàn thành ca làm việc!',
      data: {
        checkInTime: session.checkInTime,
        checkOutTime: session.checkOutTime,
        totalHours: parseFloat(session.totalHours)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
