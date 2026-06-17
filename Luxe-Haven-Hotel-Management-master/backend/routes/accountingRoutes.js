const express = require('express');
const { query, sql } = require('../config/db');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { getVietnamTime } = require('../utils/dateHelper');

const router = express.Router();

// All accounting routes require authentication and either admin or accountant role
router.use(protect);
router.use(restrictTo('admin', 'accountant'));

// GET /api/accounting/payroll - Aggregate total worked hours grouped by employee for current month
router.get('/payroll', async (req, res, next) => {
  try {
    const vnTime = getVietnamTime();
    const currentMonth = parseInt(vnTime.substring(5, 7));
    const currentYear = parseInt(vnTime.substring(0, 4));

    const result = await query(`
      SELECT 
        u.id AS id,
        u.username AS username,
        u.full_name AS fullName,
        u.role AS role,
        SUM(COALESCE(t.total_hours, 0)) AS totalHours
      FROM system_users u
      LEFT JOIN time_attendance t ON u.id = t.user_id 
        AND MONTH(t.work_date) = @currentMonth 
        AND YEAR(t.work_date) = @currentYear
      WHERE u.role IN ('admin', 'receptionist', 'cleaner', 'accountant', 'technical')
      GROUP BY u.id, u.username, u.full_name, u.role
    `, [
      { name: 'currentMonth', type: sql.Int, value: currentMonth },
      { name: 'currentYear', type: sql.Int, value: currentYear }
    ]);
    res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/accounting/expenses - Get history log of all expense vouchers
router.get('/expenses', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, title, amount, category, CONVERT(VARCHAR(19), created_at, 120) AS [createdAt]
      FROM expense_vouchers
      ORDER BY created_at DESC
    `);
    res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/accounting/expenses - Create new expense voucher
router.post('/expenses', async (req, res, next) => {
  try {
    const { title, amount, category } = req.body;
    if (!title || amount === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ tiêu đề, số tiền và danh mục chi.'
      });
    }

    const vnTime = getVietnamTime();

    await query(`
      INSERT INTO expense_vouchers (title, amount, category, created_at)
      VALUES (@title, @amount, @category, @createdAt)
    `, [
      { name: 'title', type: sql.NVarChar, value: title },
      { name: 'amount', type: sql.Decimal(18, 2), value: parseFloat(amount) },
      { name: 'category', type: sql.NVarChar, value: category },
      { name: 'createdAt', type: sql.DateTime, value: vnTime }
    ]);

    res.status(200).json({
      success: true,
      message: 'Tạo phiếu chi thành công!'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/accounting/confirm-deposit/:id - Confirm 50% deposit and switch booking status to confirmed
router.put('/confirm-deposit/:id', async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    
    // Check if booking exists
    const bookingRes = await query(`SELECT id FROM bookings WHERE id = @id`, [
      { name: 'id', type: sql.Int, value: bookingId }
    ]);

    if (bookingRes.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn đặt phòng với ID đã cung cấp.'
      });
    }

    // Update status to 'confirmed'
    await query(`
      UPDATE bookings
      SET status = 'confirmed'
      WHERE id = @id
    `, [
      { name: 'id', type: sql.Int, value: bookingId }
    ]);

    res.status(200).json({
      success: true,
      message: 'Xác nhận nhận tiền cọc (50%) thành công! Trạng thái đặt phòng đã chuyển sang ĐÃ XÁC NHẬN.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
