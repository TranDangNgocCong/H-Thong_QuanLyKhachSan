const userModel = require('../models/userModel')
const AppError = require('../utils/appError')
const jwt = require('jsonwebtoken')

async function getUsers() {
  return await userModel.findAll()
}

async function getUserById(id) {
  const user = await userModel.findById(id)
  if (!user) {
    throw new AppError(`User not found with ID ${id}`, 404)
  }
  return user
}

async function registerUser(userData) {
  if (!userData.username && userData.role !== 'customer') {
    throw new AppError('Username is required for system users', 400)
  }
  if (!userData.email || !userData.fullName) {
    throw new AppError('Please fill in all required fields (email, fullName)', 400)
  }

  // Validate role
  const role = userData.role || 'customer'
  if (!['customer', 'receptionist', 'admin', 'cleaner', 'accountant'].includes(role)) {
    throw new AppError("Role must be 'customer', 'receptionist', 'admin', 'cleaner', or 'accountant'", 400)
  }

  if (role !== 'customer') {
    // Check if username already exists
    const existingUsername = await userModel.findByUsername(userData.username)
    if (existingUsername) {
      throw new AppError('Username is already taken', 400)
    }
  }

  // Check if email already exists
  const existingEmail = await userModel.findByEmail(userData.email)
  if (existingEmail) {
    throw new AppError('Email is already registered', 400)
  }

  return await userModel.create({
    username: userData.username || '',
    email: userData.email,
    passwordHash: userData.passwordHash || 'LuxeHaven@2026',
    fullName: userData.fullName,
    phone: userData.phone || '',
    role,
  })
}

async function loginUser(username, password) {
  if (!username || !password) {
    throw new AppError('Please provide username and password', 400)
  }

  const user = await userModel.findByUsername(username)
  if (!user || user.passwordHash !== password) {
    throw new AppError('Invalid username or password', 401)
  }

  // Generate placeholder token and return user details (excluding password hash)
  const userDetails = { ...user }
  delete userDetails.passwordHash

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'LuxeHavenResortSecretKey2026',
    { expiresIn: '7d' }
  )

  return {
    user: userDetails,
    token: token,
  }
}

async function updateUser(id, updateData) {
  // Check if user exists
  const user = await userModel.findById(id)
  if (!user) {
    throw new AppError(`User not found with ID ${id}`, 404)
  }

  // Validate role if updating
  if (updateData.role && !['customer', 'receptionist', 'admin', 'cleaner', 'accountant'].includes(updateData.role)) {
    throw new AppError("Role must be 'customer', 'receptionist', 'admin', 'cleaner', or 'accountant'", 400)
  }

  const updated = await userModel.update(id, updateData)
  return updated
}

async function deleteUser(id) {
  const success = await userModel.delete(id)
  if (!success) {
    throw new AppError(`User not found with ID ${id}`, 404)
  }
  return true
}

module.exports = {
  getUsers,
  getUserById,
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
}
