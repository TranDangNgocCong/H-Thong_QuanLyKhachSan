const paymentModel = require('../models/paymentModel')
const bookingModel = require('../models/bookingModel')
const notificationModel = require('../models/notificationModel')
const AppError = require('../utils/appError')

function getPayments() {
  return paymentModel.findAll()
}

function getPaymentById(id) {
  const payment = paymentModel.findById(id)
  if (!payment) {
    throw new AppError(`Payment record not found with ID ${id}`, 404)
  }
  return payment
}

function getPaymentByBookingId(bookingId) {
  const payment = paymentModel.findByBookingId(bookingId)
  if (!payment) {
    throw new AppError(`No payment record found for booking ID ${bookingId}`, 404)
  }
  return payment
}

async function updatePaymentStatus(id, status) {
  if (!['Pending', 'Paid', 'Refunded', 'Chưa thanh toán', 'Đã thanh toán'].includes(status)) {
    throw new AppError('Invalid payment status value', 400)
  }

  const payment = await paymentModel.updateStatus(id, status)
  if (!payment) {
    throw new AppError(`Payment record not found with ID ${id}`, 404)
  }

  if (status === 'Paid' || status === 'Đã thanh toán') {
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.amount)
    await notificationModel.create({
      title: 'Thanh Toán Thành Công',
      message: `Hóa đơn cho mã đặt phòng BK-${payment.bookingId} trị giá ${formattedAmount} đã được thanh toán.`,
      targetRole: 'accountant'
    }).catch(err => console.error('Error creating payment notification:', err))
  }

  return payment
}

module.exports = {
  getPayments,
  getPaymentById,
  getPaymentByBookingId,
  updatePaymentStatus,
}
