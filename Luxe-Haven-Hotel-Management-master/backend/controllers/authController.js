const userService = require('../services/userService')
const userModel = require('../models/userModel')
const { sendSuccess } = require('../utils/response')
const AppError = require('../utils/appError')
const { query, sql } = require('../config/db')
const jwt = require('jsonwebtoken')

async function getMe(req, res, next) {
  try {
    const user = await userService.getUserById(req.userId)
    const userDetails = { ...user }
    delete userDetails.passwordHash
    sendSuccess(res, userDetails, 'Profile retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
      throw new AppError('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới', 400)
    }

    const user = await userService.getUserById(req.userId)
    if (user.passwordHash !== oldPassword) {
      throw new AppError('Mật khẩu hiện tại không chính xác', 400)
    }

    await userModel.update(req.userId, { passwordHash: newPassword })
    sendSuccess(res, null, 'Đổi mật khẩu thành công!')
  } catch (error) {
    next(error)
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tài khoản và mật khẩu'
      })
    }

    const result = await query(
      'SELECT id, username, password_hash, full_name, role, is_active, department_id AS [departmentId] FROM system_users WHERE username = @username',
      [{ name: 'username', type: sql.VarChar, value: username }]
    )

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại trên hệ thống!'
      })
    }

    const user = result.recordset[0]

    if (user.is_active === false || user.is_active === 0) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn hiện đang bị khóa!'
      })
    }

    if (user.password_hash !== password) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không chính xác!'
      })
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'LuxeHavenResortSecretKey2026',
      { expiresIn: '7d' }
    )

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      token: token,
      user: {
        id: user.id,
        name: user.full_name,
        full_name: user.full_name,
        role: user.role,
        username: user.username,
        departmentId: user.departmentId || ''
      }
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getMe,
  changePassword,
  login,
}
