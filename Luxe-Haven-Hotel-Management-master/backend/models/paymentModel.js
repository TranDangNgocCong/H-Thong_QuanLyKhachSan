const { query, sql } = require('../config/db');
const { getVietnamTime } = require('../utils/dateHelper');

class PaymentModel {
  async findAll() {
    const res = await query('SELECT id, booking_id AS [bookingId], amount, payment_method AS [paymentMethod], payment_status AS [paymentStatus], paid_at AS [paidAt] FROM payments');
    return res.recordset;
  }

  async findById(id) {
    const res = await query('SELECT id, booking_id AS [bookingId], amount, payment_method AS [paymentMethod], payment_status AS [paymentStatus], paid_at AS [paidAt] FROM payments WHERE id = @id', [
      { name: 'id', type: sql.Int, value: parseInt(id) }
    ]);
    if (res.recordset.length === 0) return null;
    return res.recordset[0];
  }

  async findByBookingId(bookingId) {
    const res = await query('SELECT id, booking_id AS [bookingId], amount, payment_method AS [paymentMethod], payment_status AS [paymentStatus], paid_at AS [paidAt] FROM payments WHERE booking_id = @bookingId', [
      { name: 'bookingId', type: sql.Int, value: parseInt(bookingId) }
    ]);
    if (res.recordset.length === 0) return null;
    return res.recordset[0];
  }

  async create(paymentData) {
    const paidAt = (paymentData.paymentStatus === 'Paid' || paymentData.paymentStatus === 'Đã thanh toán') ? getVietnamTime() : null;
    const res = await query(`
      INSERT INTO payments (booking_id, amount, payment_method, payment_status, paid_at)
      VALUES (@bookingId, @amount, @paymentMethod, @paymentStatus, @paidAt);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'bookingId', type: sql.Int, value: parseInt(paymentData.bookingId) },
      { name: 'amount', type: sql.Decimal, value: parseFloat(paymentData.amount) },
      { name: 'paymentMethod', type: sql.NVarChar, value: paymentData.paymentMethod || 'Cash' },
      { name: 'paymentStatus', type: sql.NVarChar, value: paymentData.paymentStatus || 'Pending' },
      { name: 'paidAt', type: sql.DateTime, value: paidAt }
    ]);
    const newId = res.recordset[0].id;
    return await this.findById(newId);
  }

  async updateStatus(id, status) {
    const paidAt = (status === 'Paid' || status === 'Đã thanh toán') ? getVietnamTime() : null;
    await query(`
      UPDATE payments 
      SET payment_status = @status, paid_at = @paidAt 
      WHERE id = @id
    `, [
      { name: 'id', type: sql.Int, value: parseInt(id) },
      { name: 'status', type: sql.NVarChar, value: status },
      { name: 'paidAt', type: sql.DateTime, value: paidAt }
    ]);
    return await this.findById(id);
  }

  async updateAmount(id, amount) {
    await query(`
      UPDATE payments 
      SET amount = @amount 
      WHERE id = @id
    `, [
      { name: 'id', type: sql.Int, value: parseInt(id) },
      { name: 'amount', type: sql.Decimal, value: parseFloat(amount) }
    ]);
    return await this.findById(id);
  }
}

const paymentModelInstance = new PaymentModel();
module.exports = paymentModelInstance;
