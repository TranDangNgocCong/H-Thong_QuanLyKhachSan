const { query, sql } = require('../config/db');

class RoomModel {
  async findAll() {
    const res = await query('SELECT id, room_number AS [number], room_type AS [type], price_per_night AS [pricePerNight], is_available AS [available] FROM rooms');
    return res.recordset.map(r => ({
      ...r,
      available: r.available === true || r.available === 1 || r.available === '1'
    }));
  }

  async findById(id) {
    const res = await query('SELECT id, room_number AS [number], room_type AS [type], price_per_night AS [pricePerNight], is_available AS [available] FROM rooms WHERE id = @id', [
      { name: 'id', type: sql.Int, value: parseInt(id) }
    ]);
    if (res.recordset.length === 0) return null;
    const r = res.recordset[0];
    return {
      ...r,
      available: r.available === true || r.available === 1 || r.available === '1'
    };
  }

  async update(id, updateData) {
    const current = await this.findById(id);
    if (!current) return null;

    const number = updateData.number !== undefined ? updateData.number : current.number;
    const type = updateData.type !== undefined ? updateData.type : current.type;
    const pricePerNight = updateData.pricePerNight !== undefined ? parseFloat(updateData.pricePerNight) : current.pricePerNight;
    const available = updateData.available !== undefined ? (updateData.available ? 1 : 0) : (current.available ? 1 : 0);

    await query('UPDATE rooms SET room_number = @number, room_type = @type, price_per_night = @pricePerNight, is_available = @available WHERE id = @id', [
      { name: 'id', type: sql.Int, value: parseInt(id) },
      { name: 'number', type: sql.VarChar, value: number },
      { name: 'type', type: sql.NVarChar, value: type },
      { name: 'pricePerNight', type: sql.Decimal, value: pricePerNight },
      { name: 'available', type: sql.Bit, value: available }
    ]);

    return { id: parseInt(id), number, type, pricePerNight, available: available === 1 };
  }

  async create(roomData) {
    const res = await query(`
      INSERT INTO rooms (room_number, room_type, price_per_night, is_available)
      VALUES (@number, @type, @price, @available);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'number', type: sql.VarChar, value: roomData.number },
      { name: 'type', type: sql.NVarChar, value: roomData.type },
      { name: 'price', type: sql.Decimal, value: parseFloat(roomData.pricePerNight) },
      { name: 'available', type: sql.Bit, value: roomData.available !== undefined ? (roomData.available ? 1 : 0) : 1 }
    ]);
    const newId = res.recordset[0].id;
    return await this.findById(newId);
  }

  async findAvailableByType(type, checkin, checkout) {
    const res = await query(`
      SELECT id, room_number AS [number], room_type AS [type], price_per_night AS [pricePerNight], is_available AS [available] 
      FROM rooms 
      WHERE (LOWER(room_type) = LOWER(@type) OR LOWER(@type) LIKE '%' + LOWER(room_type) + '%' OR LOWER(room_type) LIKE '%' + LOWER(@type) + '%')
        AND id NOT IN (
          SELECT room_id 
          FROM bookings 
          WHERE status != 'cancelled' 
            AND check_in < @checkout 
            AND check_out > @checkin
        )
    `, [
      { name: 'type', type: sql.NVarChar, value: type },
      { name: 'checkin', type: sql.Date, value: checkin },
      { name: 'checkout', type: sql.Date, value: checkout }
    ]);
    return res.recordset.map(r => ({
      ...r,
      available: r.available === true || r.available === 1 || r.available === '1'
    }));
  }

  async getRoomTypes() {
    const res = await query(`
      SELECT room_type AS [roomType], MIN(price_per_night) AS [minPrice]
      FROM rooms
      WHERE is_available = 1 OR is_available = 0
      GROUP BY room_type
    `);
    return res.recordset;
  }

  async delete(id) {
    await query('DELETE FROM rooms WHERE id = @id', [
      { name: 'id', type: sql.Int, value: parseInt(id) }
    ]);
    return true;
  }
}

const roomModelInstance = new RoomModel();
module.exports = roomModelInstance;
