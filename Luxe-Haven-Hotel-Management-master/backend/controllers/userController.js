const userService = require('../services/userService')
const { sendSuccess } = require('../utils/response')

async function listUsers(req, res, next) {
  try {
    const users = await userService.getUsers()
    sendSuccess(res, users, 'Users retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function getUser(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id)
    sendSuccess(res, user, 'User retrieved successfully')
  } catch (error) {
    next(error)
  }
}

async function register(req, res, next) {
  try {
    const user = await userService.registerUser(req.body)
    sendSuccess(res, user, 'User registered successfully')
  } catch (error) {
    next(error)
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body
    const session = await userService.loginUser(username, password)
    sendSuccess(res, session, 'Login successful')
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body)
    sendSuccess(res, user, 'User updated successfully')
  } catch (error) {
    next(error)
  }
}

async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id)
    sendSuccess(res, null, 'User deleted successfully')
  } catch (error) {
    next(error)
  }
}

async function checkEmail(req, res, next) {
  try {
    const { email, phone } = req.body
    const userModel = require('../models/userModel')
    const allUsers = await userModel.findAll()

    const matchedCustomer = allUsers.find(u => 
      u.role === 'customer' && 
      ((u.phone && u.phone.replace(/[^0-9]/g, '') === (phone || '').replace(/[^0-9]/g, '')) || 
       (u.email && u.email.toLowerCase() === (email || '').toLowerCase()))
    )

    if (matchedCustomer) {
      sendSuccess(res, { exists: true, id: matchedCustomer.id }, 'Customer found')
    } else {
      sendSuccess(res, { exists: false }, 'Customer not found')
    }
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listUsers,
  getUser,
  register,
  login,
  update,
  deleteUser,
  checkEmail,
}
