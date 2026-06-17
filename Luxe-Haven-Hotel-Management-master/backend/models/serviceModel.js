const { query, sql } = require('../config/db');
const { getVietnamTime } = require('../utils/dateHelper');

class ServiceModel {
  async findAllServices() {
    const res = await query('SELECT id, service_name AS [serviceName], price, is_available AS [isAvailable] FROM services');
    return res.recordset.map(s => ({
      ...s,
      isAvailable: s.isAvailable === true || s.isAvailable === 1 || s.isAvailable === '1'
    }));
  }

  async findAvailableServices() {
    const res = await query('SELECT id, service_name AS [serviceName], price, is_available AS [isAvailable] FROM services WHERE is_available = 1');
    return res.recordset.map(s => ({
      ...s,
      isAvailable: true
    }));
  }

  async findServiceById(id) {
    const res = await query('SELECT id, service_name AS [serviceName], price, is_available AS [isAvailable] FROM services WHERE id = @id', [
      { name: 'id', type: sql.Int, value: parseInt(id) }
    ]);
    if (res.recordset.length === 0) return null;
    const s = res.recordset[0];
    return {
      ...s,
      isAvailable: s.isAvailable === true || s.isAvailable === 1 || s.isAvailable === '1'
    };
  }

  async createService(serviceData) {
    const res = await query(`
      INSERT INTO services (service_name, price, is_available) 
      VALUES (@serviceName, @price, @isAvailable);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'serviceName', type: sql.NVarChar, value: serviceData.serviceName },
      { name: 'price', type: sql.Decimal, value: parseFloat(serviceData.price) },
      { name: 'isAvailable', type: sql.Bit, value: serviceData.isAvailable !== false ? 1 : 0 }
    ]);
    const newId = res.recordset[0].id;
    return await this.findServiceById(newId);
  }

  async updateService(id, updateData) {
    const current = await this.findServiceById(id);
    if (!current) return null;

    const serviceName = updateData.serviceName !== undefined ? updateData.serviceName : current.serviceName;
    const price = updateData.price !== undefined ? parseFloat(updateData.price) : current.price;
    const isAvailable = updateData.isAvailable !== undefined ? (updateData.isAvailable ? 1 : 0) : (current.isAvailable ? 1 : 0);

    await query(`
      UPDATE services 
      SET service_name = @serviceName, price = @price, is_available = @isAvailable 
      WHERE id = @id
    `, [
      { name: 'id', type: sql.Int, value: parseInt(id) },
      { name: 'serviceName', type: sql.NVarChar, value: serviceName },
      { name: 'price', type: sql.Decimal, value: price },
      { name: 'isAvailable', type: sql.Bit, value: isAvailable }
    ]);

    return await this.findServiceById(id);
  }

  async addServiceToBooking({ bookingId, serviceId, quantity, totalPrice }) {
    let departmentId = 'F&B';
    const sid = parseInt(serviceId);
    if (sid === 3) {
      departmentId = 'SPA';
    } else if (sid === 4 || sid === 5) {
      departmentId = 'TRANSPORT';
    }

    const vnTime = getVietnamTime();

    const res = await query(`
      INSERT INTO service_orders (booking_id, service_id, quantity, total_price, department_id, task_status, created_at)
      VALUES (@bookingId, @serviceId, @quantity, @totalPrice, @departmentId, 'pending', @createdAt);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'bookingId', type: sql.Int, value: parseInt(bookingId) },
      { name: 'serviceId', type: sql.Int, value: sid },
      { name: 'quantity', type: sql.Int, value: parseInt(quantity) },
      { name: 'totalPrice', type: sql.Decimal, value: parseFloat(totalPrice) },
      { name: 'departmentId', type: sql.NVarChar, value: departmentId },
      { name: 'createdAt', type: sql.DateTime, value: vnTime }
    ]);
    const newId = res.recordset[0].id;
    return {
      id: newId,
      bookingId,
      serviceId,
      quantity,
      totalPrice,
      departmentId,
      taskStatus: 'pending'
    };
  }

  async findServicesByBookingId(bookingId) {
    const res = await query(`
      SELECT id, booking_id AS [bookingId], service_id AS [serviceId], quantity, total_price AS [totalPrice], created_at AS [createdAt], department_id AS [departmentId], task_status AS [taskStatus], assigned_staff_id AS [assignedStaffId]
      FROM service_orders 
      WHERE booking_id = @bookingId
    `, [
      { name: 'bookingId', type: sql.Int, value: parseInt(bookingId) }
    ]);
    return res.recordset;
  }
}

const serviceModelInstance = new ServiceModel();
module.exports = serviceModelInstance;
