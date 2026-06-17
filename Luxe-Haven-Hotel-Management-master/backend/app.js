const express = require('express')
const cors = require('cors')
const env = require('./config/env')
const bookingRoutes = require('./routes/bookingRoutes')
const roomRoutes = require('./routes/roomRoutes')
const userRoutes = require('./routes/userRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const serviceRoutes = require('./routes/serviceRoutes')
const housekeepingRoutes = require('./routes/housekeepingRoutes')
const authRoutes = require('./routes/authRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const attendanceRoutes = require('./routes/attendanceRoutes')
const accountingRoutes = require('./routes/accountingRoutes')
const departmentRoutes = require('./routes/departmentRoutes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')

const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Hotel Booking API is running',
  })
})

app.use('/api/rooms', roomRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/users', userRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/housekeeping', housekeepingRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/accounting', accountingRoutes)
app.use('/api/department', departmentRoutes)

const path = require('path')
app.use(express.static(path.join(__dirname, '../frontend/html')))

app.use(notFound)
app.use(errorHandler)

module.exports = app
