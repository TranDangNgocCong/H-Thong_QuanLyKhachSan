const { query, sql } = require('../config/db');

class BookingModel {
  async findAll() {
    const res = await query(`
      SELECT b.id, b.customer_id AS [userId], c.full_name AS [guestName], b.room_id AS [roomId], 
             CONVERT(VARCHAR(10), b.check_in, 120) AS [checkIn], 
             CONVERT(VARCHAR(10), b.check_out, 120) AS [checkOut], 
             b.status, b.created_at AS [createdAt]
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      ORDER BY b.id DESC
    `);
    return res.recordset;
  }

  async findById(id) {
    const res = await query(`
      SELECT b.id, b.customer_id AS [userId], c.full_name AS [guestName], b.room_id AS [roomId], 
             CONVERT(VARCHAR(10), b.check_in, 120) AS [checkIn], 
             CONVERT(VARCHAR(10), b.check_out, 120) AS [checkOut], 
             b.status, b.created_at AS [createdAt]
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      WHERE b.id = @id
    `, [
      { name: 'id', type: sql.Int, value: parseInt(id) }
    ]);
    if (res.recordset.length === 0) return null;
    return res.recordset[0];
  }

  async create(bookingData) {
    const res = await query(`
      INSERT INTO bookings (customer_id, room_id, check_in, check_out, status)
      VALUES (@customerId, @roomId, @checkIn, @checkOut, @status);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'customerId', type: sql.Int, value: parseInt(bookingData.userId) },
      { name: 'roomId', type: sql.Int, value: parseInt(bookingData.roomId) },
      { name: 'checkIn', type: sql.Date, value: bookingData.checkIn },
      { name: 'checkOut', type: sql.Date, value: bookingData.checkOut },
      { name: 'status', type: sql.VarChar, value: bookingData.status || 'confirmed' }
    ]);
    const newId = res.recordset[0].id;
    return await this.findById(newId);
  }

  async update(id, updateData) {
    const current = await this.findById(id);
    if (!current) return null;

    const customerId = updateData.userId !== undefined ? parseInt(updateData.userId) : current.userId;
    const roomId = updateData.roomId !== undefined ? parseInt(updateData.roomId) : current.roomId;
    const checkIn = updateData.checkIn !== undefined ? updateData.checkIn : current.checkIn;
    const checkOut = updateData.checkOut !== undefined ? updateData.checkOut : current.checkOut;
    const status = updateData.status !== undefined ? updateData.status : current.status;

    await query(`
      UPDATE bookings 
      SET customer_id = @customerId, room_id = @roomId, check_in = @checkIn, check_out = @checkOut, status = @status 
      WHERE id = @id
    `, [
      { name: 'id', type: sql.Int, value: parseInt(id) },
      { name: 'customerId', type: sql.Int, value: customerId },
      { name: 'roomId', type: sql.Int, value: roomId },
      { name: 'checkIn', type: sql.Date, value: checkIn },
      { name: 'checkOut', type: sql.Date, value: checkOut },
      { name: 'status', type: sql.VarChar, value: status }
    ]);

    return await this.findById(id);
  }
  async createBookingWithTransaction(bookingData) {
    const { poolPromise } = require('../config/db');
    const pool = await poolPromise;
    if (!pool) {
      throw new Error('Database pool not connected');
    }
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      
      // 1. Check overlap with lock
      const overlapRequest = new sql.Request(transaction);
      overlapRequest.input('roomId', sql.Int, parseInt(bookingData.roomId));
      overlapRequest.input('checkIn', sql.Date, bookingData.checkIn);
      overlapRequest.input('checkOut', sql.Date, bookingData.checkOut);
      
      const overlapRes = await overlapRequest.query(`
        SELECT COUNT(*) AS count 
        FROM bookings WITH (UPDLOCK, HOLDLOCK)
        WHERE room_id = @roomId 
          AND status IN ('confirmed', 'active') 
          AND NOT (check_out <= @checkIn OR check_in >= @checkOut)
      `);
      
      if (overlapRes.recordset[0].count > 0) {
        throw new Error('Room is currently not available due to overlap booking');
      }
      
      // 2. Create the booking
      const createRequest = new sql.Request(transaction);
      createRequest.input('customerId', sql.Int, parseInt(bookingData.userId));
      createRequest.input('roomId', sql.Int, parseInt(bookingData.roomId));
      createRequest.input('checkIn', sql.Date, bookingData.checkIn);
      createRequest.input('checkOut', sql.Date, bookingData.checkOut);
      createRequest.input('status', sql.VarChar, bookingData.status || 'confirmed');
      createRequest.input('createdAt', sql.DateTime, bookingData.createdAt);
      
      const createRes = await createRequest.query(`
        INSERT INTO bookings (customer_id, room_id, check_in, check_out, status, created_at)
        VALUES (@customerId, @roomId, @checkIn, @checkOut, @status, @createdAt);
        SELECT SCOPE_IDENTITY() AS id;
      `);
      
      const newId = createRes.recordset[0].id;
      
      await transaction.commit();
      return newId;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async checkOverlap(roomId, checkIn, checkOut) {
    const res = await query(`
      SELECT COUNT(*) AS count 
      FROM bookings 
      WHERE room_id = @roomId 
        AND status IN ('confirmed', 'active') 
        AND NOT (check_out <= @checkIn OR check_in >= @checkOut)
    `, [
      { name: 'roomId', type: sql.Int, value: parseInt(roomId) },
      { name: 'checkIn', type: sql.Date, value: checkIn },
      { name: 'checkOut', type: sql.Date, value: checkOut }
    ]);
    return res.recordset[0].count > 0;
  }
}

const bookingModelInstance = new BookingModel();
module.exports = bookingModelInstance;
