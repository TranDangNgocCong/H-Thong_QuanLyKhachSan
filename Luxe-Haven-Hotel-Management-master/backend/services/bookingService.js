const bookingModel = require('../models/bookingModel')
const roomModel = require('../models/roomModel')
const userModel = require('../models/userModel')
const paymentModel = require('../models/paymentModel')
const serviceModel = require('../models/serviceModel')
const housekeepingModel = require('../models/housekeepingModel')
const notificationModel = require('../models/notificationModel')
const AppError = require('../utils/appError')

// Helper function to populate full booking details (joins/links tables in-memory)
async function populateBooking(booking) {
  if (!booking) return null

  const room = await roomModel.findById(booking.roomId)
  const user = await userModel.findById(booking.userId)
  const payment = await paymentModel.findByBookingId(booking.id)
  
  // Find mapped services
  const bsMappings = await serviceModel.findServicesByBookingId(booking.id)
  const services = await Promise.all(bsMappings.map(async (mapping) => {
    const s = await serviceModel.findServiceById(mapping.serviceId)
    let assignedStaffName = null
    if (mapping.assignedStaffId) {
      const staff = await userModel.findById(mapping.assignedStaffId)
      if (staff) {
        assignedStaffName = staff.fullName
      }
    }
    return {
      id: mapping.id,
      serviceId: mapping.serviceId,
      serviceName: s ? s.serviceName : 'Unknown Service',
      price: s ? s.price : 0,
      quantity: mapping.quantity,
      totalPrice: mapping.totalPrice,
      createdAt: mapping.createdAt,
      taskStatus: mapping.taskStatus,
      departmentId: mapping.departmentId,
      assignedStaffId: mapping.assignedStaffId,
      assignedStaffName: assignedStaffName,
    }
  }))

  return {
    id: booking.id,
    userId: booking.userId,
    guestName: booking.guestName,
    roomId: booking.roomId,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status,
    createdAt: booking.createdAt,
    room: room
      ? {
          id: room.id,
          number: room.number,
          type: room.type,
          pricePerNight: room.pricePerNight,
        }
      : null,
    guest: user
      ? {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        }
      : null,
    payment: payment
      ? {
          id: payment.id,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentStatus: payment.paymentStatus,
          paidAt: payment.paidAt,
        }
      : null,
    services,
  }
}

async function getBookings() {
  const bookings = await bookingModel.findAll()
  return await Promise.all(bookings.map(populateBooking))
}

async function getBookingById(id) {
  const booking = await bookingModel.findById(id)
  if (!booking) {
    throw new AppError(`Booking not found with ID ${id}`, 404)
  }
  return await populateBooking(booking)
}

async function createBooking({ userId, roomId, checkIn, checkOut, services = [], paymentMethod = 'Cash', isPaid = false }) {
  // 1. Validate User
  const user = await userModel.findById(userId)
  if (!user) {
    throw new AppError(`Guest/User not found with ID ${userId}`, 404)
  }

  // 2. Validate Room
  const room = await roomModel.findById(roomId)
  if (!room) {
    throw new AppError(`Room not found with ID ${roomId}`, 404)
  }
  
  // 3. Calculate Room Cost
  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
    throw new AppError('Invalid check-in or check-out date', 400)
  }
  const diffTime = Math.abs(checkOutDate - checkInDate)
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const roomTotal = room.pricePerNight * nights

  const { getVietnamTime } = require('../utils/dateHelper')
  const vnTime = getVietnamTime()

  // 4. Create booking entry in a transaction with concurrency control
  let bookingId;
  try {
    bookingId = await bookingModel.createBookingWithTransaction({
      userId: parseInt(userId),
      roomId: parseInt(roomId),
      checkIn,
      checkOut,
      status: 'confirmed',
      createdAt: vnTime
    });
  } catch (err) {
    if (err.message && err.message.includes('not available')) {
      throw new AppError(`Room ${room.number} is currently not available`, 400)
    }
    throw err;
  }
  
  const booking = await bookingModel.findById(bookingId);

  // 5. Add Booking Services mapping
  let servicesTotal = 0
  for (const item of services) {
    const s = await serviceModel.findServiceById(item.serviceId)
    if (s && s.isAvailable) {
      const quantity = parseInt(item.quantity) || 1
      const totalPrice = s.price * quantity
      servicesTotal += totalPrice
      await serviceModel.addServiceToBooking({
        bookingId: booking.id,
        serviceId: s.id,
        quantity,
        totalPrice,
      })
    }
  }

  // 6. Create payment log
  const grandTotal = roomTotal + servicesTotal
  await paymentModel.create({
    bookingId: booking.id,
    amount: grandTotal,
    paymentMethod,
    paymentStatus: isPaid ? 'Paid' : 'Pending',
    paidAt: isPaid ? new Date() : null,
  })

  if (isPaid) {
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(grandTotal)
    await notificationModel.create({
      title: 'Thanh Toán Thành Công',
      message: `Đã ghi nhận thanh toán hóa đơn cho mã đặt phòng BK-${booking.id} trị giá ${formattedAmount}.`,
      targetRole: 'accountant'
    }).catch(err => console.error('Error creating payment notification:', err))
  }

  // 7. Mark Room as Unavailable
  await roomModel.update(roomId, { available: false })

  return await populateBooking(booking)
}

async function completeBooking(id, staffId) {
  const booking = await bookingModel.findById(id)
  if (!booking) {
    throw new AppError(`Booking not found with ID ${id}`, 404)
  }
  if (booking.status === 'completed') {
    throw new AppError(`Booking is already completed`, 400)
  }

  // 1. Update booking status
  await bookingModel.update(id, { status: 'completed' })

  // 2. Mark Room as Available again
  await roomModel.update(booking.roomId, { available: true })

  // 3. Trigger Housekeeping task for this room (status: dirty, assigned to staffId or default receptionist)
  await housekeepingModel.updateStatus(booking.roomId, 'dirty', staffId || 2)

  const populated = await populateBooking(booking)
  const roomNum = populated.room ? populated.room.number : 'N/A'
  const guestName = populated.guestName || (populated.guest ? populated.guest.fullName : 'N/A')

  // Trả phòng notification
  await notificationModel.create({
    title: 'Trả Phòng Thành Công',
    message: `Khách hàng ${guestName} đã trả phòng ${roomNum} và hoàn tất lưu trú.`,
    targetRole: 'accountant'
  }).catch(err => console.error('Error creating check-out notification:', err))

  // 4. Auto-update Payment to Paid if not already Paid
  const payment = await paymentModel.findByBookingId(id)
  if (payment && payment.paymentStatus !== 'Paid') {
    await paymentModel.updateStatus(payment.id, 'Paid')
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.amount)
    await notificationModel.create({
      title: 'Thanh Toán Thành Công',
      message: `Đã ghi nhận thanh toán hóa đơn cho mã đặt phòng BK-${id} trị giá ${formattedAmount} khi trả phòng.`,
      targetRole: 'accountant'
    }).catch(err => console.error('Error creating checkout payment notification:', err))
  }

  return populated
}

async function confirmBooking(id) {
  const booking = await bookingModel.findById(id)
  if (!booking) {
    throw new AppError(`Booking not found with ID ${id}`, 404)
  }
  if (booking.status === 'completed') {
    throw new AppError(`Booking is already completed`, 400)
  }
  await bookingModel.update(id, { status: 'occupied' })
  
  const populated = await populateBooking(booking)
  const roomNum = populated.room ? populated.room.number : 'N/A'
  const guestName = populated.guestName || (populated.guest ? populated.guest.fullName : 'N/A')
  
  await notificationModel.create({
    title: 'Nhận Phòng Thành Công',
    message: `Khách hàng ${guestName} đã nhận phòng ${roomNum}.`,
    targetRole: 'receptionist'
  }).catch(err => console.error('Error creating check-in notification:', err))

  return populated
}

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  completeBooking,
  confirmBooking,
  checkoutBooking: completeBooking,
}
