const notificationModel = require('../models/notificationModel');
const { sendSuccess } = require('../utils/response');
const { query, sql } = require('../config/db');

async function listNotifications(req, res, next) {
  try {
    let userRole = 'all';
    if (req.userId) {
      const userRes = await query('SELECT role FROM system_users WHERE id = @id', [
        { name: 'id', type: sql.Int, value: req.userId }
      ]);
      if (userRes.recordset.length > 0) {
        userRole = userRes.recordset[0].role;
      }
    }
    const list = await notificationModel.findRecent(userRole);
    sendSuccess(res, list, 'Notifications retrieved successfully');
  } catch (error) {
    next(error);
  }
}

async function markAllRead(req, res, next) {
  try {
    let userRole = 'all';
    if (req.userId) {
      const userRes = await query('SELECT role FROM system_users WHERE id = @id', [
        { name: 'id', type: sql.Int, value: req.userId }
      ]);
      if (userRes.recordset.length > 0) {
        userRole = userRes.recordset[0].role;
      }
    }
    await notificationModel.markAllAsRead(userRole);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNotifications,
  markAllRead,
};
