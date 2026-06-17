const express = require('express');
const { query, sql, poolPromise } = require('../config/db');
const authRouter = require('./authRoutes');
const extractUser = authRouter.extractUser;
const { getVietnamTime } = require('../utils/dateHelper');

const router = express.Router();

// Middleware to resolve department and role
async function resolveDepartment(req, res, next) {
  try {
    const userRes = await query('SELECT role, department_id AS departmentId, full_name AS fullName FROM system_users WHERE id = @id', [
      { name: 'id', type: sql.Int, value: req.userId }
    ]);
    if (userRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Nhân viên không tồn tại' });
    }
    req.userRole = userRes.recordset[0].role;
    req.userDepartment = userRes.recordset[0].departmentId;
    req.userFullName = userRes.recordset[0].fullName;
    next();
  } catch (error) {
    next(error);
  }
}

// GET /api/department/tasks - Get pending & processing tasks for logged-in department
router.get('/tasks', extractUser, resolveDepartment, async (req, res, next) => {
  try {
    if (req.userRole === 'technical') {
      const result = await query(`
        SELECT 
          ri.id,
          ri.room_id AS roomId,
          ri.reporter_id AS reporterId,
          ri.description AS serviceName,
          'technical' AS departmentId,
          CASE 
            WHEN ri.status = 'pending' THEN 'pending'
            WHEN ri.status = 'resolving' THEN 'processing'
            ELSE 'completed'
          END AS taskStatus,
          ri.assigned_staff_id AS assignedStaffId,
          CONVERT(VARCHAR(19), ri.created_at, 120) AS createdAt,
          r.room_number AS roomNumber,
          1 AS quantity
        FROM room_issues ri
        JOIN rooms r ON ri.room_id = r.id
        WHERE ri.status IN ('pending', 'resolving')
        ORDER BY ri.created_at ASC
      `);
      return res.status(200).json({
        success: true,
        data: result.recordset
      });
    }

    if (!req.userDepartment) {
      return res.status(200).json({ success: true, data: [] });
    }

    const result = await query(`
      SELECT 
        so.id,
        so.booking_id AS bookingId,
        so.service_id AS serviceId,
        so.quantity,
        so.total_price AS totalPrice,
        so.department_id AS departmentId,
        so.task_status AS taskStatus,
        so.assigned_staff_id AS assignedStaffId,
        CONVERT(VARCHAR(19), so.created_at, 120) AS createdAt,
        s.service_name AS serviceName,
        r.room_number AS roomNumber
      FROM service_orders so
      JOIN services s ON so.service_id = s.id
      JOIN bookings b ON so.booking_id = b.id
      JOIN rooms r ON b.room_id = r.id
      WHERE so.department_id = @departmentId AND so.task_status IN ('pending', 'processing')
      ORDER BY so.created_at ASC
    `, [
      { name: 'departmentId', type: sql.VarChar, value: req.userDepartment }
    ]);

    res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/department/tasks/:id/accept - Accept a task
router.put('/tasks/:id/accept', extractUser, resolveDepartment, async (req, res, next) => {
  try {
    const taskId = req.params.id;

    if (req.userRole === 'technical') {
      const issueRes = await query('SELECT id, status FROM room_issues WHERE id = @id', [
        { name: 'id', type: sql.Int, value: taskId }
      ]);
      if (issueRes.recordset.length === 0) {
        return res.status(404).json({ success: false, message: 'Sự cố không tồn tại' });
      }
      const issue = issueRes.recordset[0];
      if (issue.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Sự cố đã được tiếp nhận hoặc sửa xong' });
      }

      await query(`
        UPDATE room_issues
        SET status = 'resolving', assigned_staff_id = @staffId
        WHERE id = @id
      `, [
        { name: 'id', type: sql.Int, value: taskId },
        { name: 'staffId', type: sql.Int, value: req.userId }
      ]);

      return res.status(200).json({
        success: true,
        message: 'Tiếp nhận sửa chữa thành công! Trạng thái chuyển sang ĐANG SỬA CHỮA.'
      });
    }

    // Check if task exists and matches department
    const taskRes = await query('SELECT id, department_id, task_status FROM service_orders WHERE id = @id', [
      { name: 'id', type: sql.Int, value: taskId }
    ]);

    if (taskRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Nhiệm vụ không tồn tại' });
    }

    const task = taskRes.recordset[0];
    if (task.department_id !== req.userDepartment && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Nhiệm vụ này không thuộc bộ phận của bạn' });
    }

    if (task.task_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Nhiệm vụ này đã được nhận hoặc hoàn thành trước đó' });
    }

    await query(`
      UPDATE service_orders
      SET task_status = 'processing', assigned_staff_id = @staffId
      WHERE id = @id
    `, [
      { name: 'id', type: sql.Int, value: taskId },
      { name: 'staffId', type: sql.Int, value: req.userId }
    ]);

    res.status(200).json({
      success: true,
      message: 'Nhận nhiệm vụ thành công! Trạng thái chuyển sang ĐANG THỰC HIỆN.'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/department/tasks/:id/complete - Complete a task
router.put('/tasks/:id/complete', extractUser, resolveDepartment, async (req, res, next) => {
  try {
    const taskId = req.params.id;

    if (req.userRole === 'technical') {
      const issueRes = await query('SELECT id, room_id, status, assigned_staff_id FROM room_issues WHERE id = @id', [
        { name: 'id', type: sql.Int, value: taskId }
      ]);
      if (issueRes.recordset.length === 0) {
        return res.status(404).json({ success: false, message: 'Sự cố không tồn tại' });
      }
      const issue = issueRes.recordset[0];
      if (issue.assigned_staff_id !== req.userId && req.userRole !== 'admin') {
        return res.status(403).json({ success: false, message: 'Bạn không được phân công sửa chữa sự cố này' });
      }
      if (issue.status !== 'resolving') {
        return res.status(400).json({ success: false, message: 'Sự cố không ở trạng thái đang sửa chữa' });
      }

      const roomId = issue.room_id;
      const pool = await poolPromise;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        // 1. Update room_issues to fixed
        const req1 = new sql.Request(transaction);
        req1.input('id', sql.Int, parseInt(taskId));
        await req1.query("UPDATE room_issues SET status = 'fixed' WHERE id = @id");

        // 2. Cycle room availability to 0 (dirty/unavailable until cleaned)
        const req2 = new sql.Request(transaction);
        req2.input('roomId', sql.Int, parseInt(roomId));
        await req2.query("UPDATE rooms SET is_available = 0 WHERE id = @roomId");

        // 3. Upsert into housekeeping_log to set room status to 'dirty'
        const vnTime = getVietnamTime();
        const req3 = new sql.Request(transaction);
        req3.input('roomId', sql.Int, parseInt(roomId));
        req3.input('updatedAt', sql.DateTime, vnTime);
        await req3.query(`
          IF EXISTS (SELECT 1 FROM housekeeping_log WHERE room_id = @roomId AND status != 'clean')
          BEGIN
            UPDATE housekeeping_log 
            SET status = 'dirty', task_status = 'unassigned', staff_id = 2, updated_at = @updatedAt
            WHERE room_id = @roomId AND status != 'clean'
          END
          ELSE
          BEGIN
            INSERT INTO housekeeping_log (room_id, staff_id, status, task_status, created_at, updated_at)
            VALUES (@roomId, 2, 'dirty', 'unassigned', @updatedAt, @updatedAt)
          END
        `);

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }

      return res.status(200).json({
        success: true,
        message: 'Hoàn thành sửa chữa thành công! Phòng đã chuyển sang trạng thái Chờ dọn dẹp.'
      });
    }

    const taskRes = await query('SELECT id, department_id, task_status, assigned_staff_id FROM service_orders WHERE id = @id', [
      { name: 'id', type: sql.Int, value: taskId }
    ]);

    if (taskRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Nhiệm vụ không tồn tại' });
    }

    const task = taskRes.recordset[0];
    if (task.assigned_staff_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bạn không được phân công thực hiện nhiệm vụ này' });
    }

    if (task.task_status !== 'processing') {
      return res.status(400).json({ success: false, message: 'Nhiệm vụ không ở trạng thái đang thực hiện để hoàn thành' });
    }

    await query(`
      UPDATE service_orders
      SET task_status = 'completed'
      WHERE id = @id
    `, [
      { name: 'id', type: sql.Int, value: taskId }
    ]);

    res.status(200).json({
      success: true,
      message: 'Hoàn thành nhiệm vụ thành công!'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/department/tasks/:id/cancel - Force-abort/cancel the task (roll back to pending)
router.put('/tasks/:id/cancel', extractUser, resolveDepartment, async (req, res, next) => {
  try {
    const taskId = req.params.id;

    // Check if task exists
    const taskRes = await query('SELECT id, department_id, task_status FROM service_orders WHERE id = @id', [
      { name: 'id', type: sql.Int, value: taskId }
    ]);

    if (taskRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Nhiệm vụ không tồn tại' });
    }

    const task = taskRes.recordset[0];
    // Admin or department staff member can cancel
    if (task.department_id !== req.userDepartment && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy nhiệm vụ này' });
    }

    // Update the task status back to 'pending' and unassign staff
    await query(`
      UPDATE service_orders
      SET task_status = 'pending', assigned_staff_id = NULL
      WHERE id = @id
    `, [
      { name: 'id', type: sql.Int, value: taskId }
    ]);

    res.status(200).json({
      success: true,
      message: 'Hủy/hoàn trả nhiệm vụ về trạng thái Chờ tiếp nhận thành công!'
    });
  } catch (error) {
    next(error);
  }
});


// GET /api/department/inventory - Dynamic inventory based on department
router.get('/inventory', extractUser, resolveDepartment, async (req, res, next) => {
  try {
    const dept = req.userDepartment;

    if (dept === 'F&B') {
      // Fetch dishes from services catalog
      const result = await query("SELECT id, service_name AS [name], price, is_available AS [isAvailable] FROM services WHERE service_name LIKE N'%Ẩm thực%' OR service_name LIKE N'%Trà%' OR id IN (1, 2)");
      res.status(200).json({
        success: true,
        type: 'F&B',
        data: result.recordset.map(item => ({
          name: item.name,
          status: item.isAvailable ? 'Sẵn sàng phục vụ' : 'Hết hàng',
          price: item.price
        }))
      });
    } else if (dept === 'SPA') {
      // Check active spa processing tasks
      const activeSpaTasks = await query("SELECT id FROM service_orders WHERE department_id = 'SPA' AND task_status = 'processing'");
      const activeCount = activeSpaTasks.recordset.length;

      // Dynamic therapeutic rooms list
      const rooms = [
        { name: 'Phòng Trị Liệu VIP 1 (Single)', status: activeCount > 0 ? 'Đang hoạt động' : 'Sẵn sàng' },
        { name: 'Phòng Trị Liệu VIP 2 (Single)', status: activeCount > 1 ? 'Đang hoạt động' : 'Sẵn sàng' },
        { name: 'Phòng Trị Liệu Đôi 01 (Double)', status: activeCount > 2 ? 'Đang hoạt động' : 'Sẵn sàng' },
        { name: 'Phòng Sauna & Tắm hơi', status: 'Sẵn sàng' }
      ];

      res.status(200).json({
        success: true,
        type: 'SPA',
        data: rooms
      });
    } else if (dept === 'TRANSPORT') {
      // Check active transport processing tasks
      const activeTransTasks = await query("SELECT id FROM service_orders WHERE department_id = 'TRANSPORT' AND task_status = 'processing'");
      const activeCount = activeTransTasks.recordset.length;

      // Dynamic vehicle list
      const vehicles = [
        { name: 'Mercedes-Benz S500 (VIP 1)', status: activeCount > 0 ? 'Đang đưa đón khách' : 'Sẵn sàng' },
        { name: 'Toyota Alphard (VIP 2)', status: activeCount > 1 ? 'Đang đưa đón khách' : 'Sẵn sàng' },
        { name: 'Ford Transit Dcar Limousine', status: 'Sẵn sàng' }
      ];

      res.status(200).json({
        success: true,
        type: 'TRANSPORT',
        data: vehicles
      });
    } else {
      res.status(200).json({
        success: true,
        type: 'OTHER',
        data: []
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/department/report-issue - Create room issue operational log and notify cleaner & admin
router.post('/report-issue', extractUser, resolveDepartment, async (req, res, next) => {
  try {
    const { roomId, description } = req.body;
    if (!roomId || !description) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp phòng và mô tả sự cố' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Fetch room number for description
      const roomReq = new sql.Request(transaction);
      roomReq.input('roomId', sql.Int, parseInt(roomId));
      const roomRes = await roomReq.query('SELECT room_number FROM rooms WHERE id = @roomId');
      if (roomRes.recordset.length === 0) {
        throw new Error('Phòng không tồn tại');
      }
      const roomNumber = roomRes.recordset[0].room_number;

      const vnTime = getVietnamTime();

      // OPERATION 1: Insert the operational log into room_issues table
      const issueReq = new sql.Request(transaction);
      issueReq.input('roomId', sql.Int, parseInt(roomId));
      issueReq.input('reporterId', sql.Int, req.userId);
      issueReq.input('description', sql.NVarChar, description);
      issueReq.input('createdAt', sql.DateTime, vnTime);
      await issueReq.query(`
        INSERT INTO room_issues (room_id, reporter_id, description, status, created_at)
        VALUES (@roomId, @reporterId, @description, 'pending', @createdAt)
      `);

      const fullMessage = `Phòng ${roomNumber} vừa được báo cáo có sự cố: ${description}. Cần kiểm tra xử lý ngay!`;

      // OPERATION 2: Insert notifications targeting 'technical'
      const cleanNotifReq = new sql.Request(transaction);
      cleanNotifReq.input('message', sql.NVarChar, fullMessage);
      cleanNotifReq.input('createdAt', sql.DateTime, vnTime);
      await cleanNotifReq.query(`
        INSERT INTO notifications (title, message, is_read, created_at, target_role)
        VALUES (N'Cảnh báo: Sự cố phòng hỏng!', @message, 0, @createdAt, 'technical')
      `);

      // OPERATION 2 (dup): Insert notifications targeting 'admin'
      const adminNotifReq = new sql.Request(transaction);
      adminNotifReq.input('message', sql.NVarChar, fullMessage);
      adminNotifReq.input('createdAt', sql.DateTime, vnTime);
      await adminNotifReq.query(`
        INSERT INTO notifications (title, message, is_read, created_at, target_role)
        VALUES (N'Cảnh báo: Sự cố phòng hỏng!', @message, 0, @createdAt, 'admin')
      `);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    res.status(200).json({
      success: true,
      message: 'Báo cáo sự cố thành công! Thông báo đã được gửi đến bộ phận điều phối.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
