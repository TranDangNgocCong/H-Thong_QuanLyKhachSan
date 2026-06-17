const { query, sql } = require('../config/db');

class UserModel {
  async findAll() {
    // 1. Fetch system users
    const resStaff = await query('SELECT id, username, email, password_hash AS [passwordHash], full_name AS [fullName], phone, role, is_active AS [isActive], department_id AS [departmentId] FROM system_users');
    const staff = resStaff.recordset.map(u => ({
      ...u,
      isActive: u.isActive === true || u.isActive === 1
    }));

    // 2. Fetch customers
    const resCustomers = await query('SELECT id, customer_code AS [username], email, NULL AS [passwordHash], full_name AS [fullName], phone, \'customer\' AS [role], 1 AS [isActive] FROM customers');
    const customers = resCustomers.recordset.map(c => ({
      ...c,
      isActive: true
    }));

    return [...staff, ...customers];
  }

  async findById(id) {
    // Try staff first
    const resStaff = await query('SELECT id, username, email, password_hash AS [passwordHash], full_name AS [fullName], phone, role, is_active AS [isActive], department_id AS [departmentId] FROM system_users WHERE id = @id', [
      { name: 'id', type: sql.Int, value: parseInt(id) }
    ]);
    if (resStaff.recordset.length > 0) {
      const u = resStaff.recordset[0];
      return {
        ...u,
        isActive: u.isActive === true || u.isActive === 1
      };
    }

    // Try customer
    const resCustomer = await query('SELECT id, customer_code AS [username], email, NULL AS [passwordHash], full_name AS [fullName], phone, \'customer\' AS [role], 1 AS [isActive] FROM customers WHERE id = @id', [
      { name: 'id', type: sql.Int, value: parseInt(id) }
    ]);
    if (resCustomer.recordset.length > 0) {
      return {
        ...resCustomer.recordset[0],
        isActive: true
      };
    }

    return null;
  }

  async findByUsername(username) {
    const res = await query('SELECT id, username, email, password_hash AS [passwordHash], full_name AS [fullName], phone, role, is_active AS [isActive], department_id AS [departmentId] FROM system_users WHERE LOWER(username) = LOWER(@username)', [
      { name: 'username', type: sql.VarChar, value: username }
    ]);
    if (res.recordset.length === 0) return null;
    const u = res.recordset[0];
    return {
      ...u,
      isActive: u.isActive === true || u.isActive === 1
    };
  }

  async findByEmail(email) {
    // Check system_users
    const resStaff = await query('SELECT id, username, email, password_hash AS [passwordHash], full_name AS [fullName], phone, role, is_active AS [isActive], department_id AS [departmentId] FROM system_users WHERE LOWER(email) = LOWER(@email)', [
      { name: 'email', type: sql.VarChar, value: email }
    ]);
    if (resStaff.recordset.length > 0) {
      const u = resStaff.recordset[0];
      return {
        ...u,
        isActive: u.isActive === true || u.isActive === 1
      };
    }

    // Check customers
    const resCustomer = await query('SELECT id, customer_code AS [username], email, NULL AS [passwordHash], full_name AS [fullName], phone, \'customer\' AS [role], 1 AS [isActive] FROM customers WHERE LOWER(email) = LOWER(@email)', [
      { name: 'email', type: sql.VarChar, value: email }
    ]);
    if (resCustomer.recordset.length > 0) {
      return {
        ...resCustomer.recordset[0],
        isActive: true
      };
    }

    return null;
  }

  async create(userData) {
    const role = userData.role || 'customer';
    if (role === 'customer') {
      const res = await query('INSERT INTO customers (full_name, phone, email) VALUES (@fullName, @phone, @email); SELECT SCOPE_IDENTITY() AS id;', [
        { name: 'fullName', type: sql.NVarChar, value: userData.fullName },
        { name: 'phone', type: sql.VarChar, value: userData.phone || '' },
        { name: 'email', type: sql.VarChar, value: userData.email || '' }
      ]);
      const newId = res.recordset[0].id;
      return await this.findById(newId);
    } else {
      const res = await query('INSERT INTO system_users (username, email, password_hash, full_name, phone, role, is_active, department_id) VALUES (@username, @email, @passwordHash, @fullName, @phone, @role, 1, @departmentId); SELECT SCOPE_IDENTITY() AS id;', [
        { name: 'username', type: sql.VarChar, value: userData.username },
        { name: 'email', type: sql.VarChar, value: userData.email },
        { name: 'passwordHash', type: sql.VarChar, value: userData.passwordHash || 'LuxeHaven@2026' },
        { name: 'fullName', type: sql.NVarChar, value: userData.fullName },
        { name: 'phone', type: sql.VarChar, value: userData.phone || '' },
        { name: 'role', type: sql.VarChar, value: role },
        { name: 'departmentId', type: sql.NVarChar, value: userData.departmentId || null }
      ]);
      const newId = res.recordset[0].id;
      return await this.findById(newId);
    }
  }

  async update(id, updateData) {
    const current = await this.findById(id);
    if (!current) return null;

    if (current.role === 'customer') {
      const fullName = updateData.fullName !== undefined ? updateData.fullName : current.fullName;
      const phone = updateData.phone !== undefined ? updateData.phone : current.phone;
      const email = updateData.email !== undefined ? updateData.email : current.email;

      await query('UPDATE customers SET full_name = @fullName, phone = @phone, email = @email WHERE id = @id', [
        { name: 'id', type: sql.Int, value: parseInt(id) },
        { name: 'fullName', type: sql.NVarChar, value: fullName },
        { name: 'phone', type: sql.VarChar, value: phone },
        { name: 'email', type: sql.VarChar, value: email }
      ]);
    } else {
      const username = updateData.username !== undefined ? updateData.username : current.username;
      const email = updateData.email !== undefined ? updateData.email : current.email;
      const passwordHash = updateData.passwordHash !== undefined ? updateData.passwordHash : current.passwordHash;
      const fullName = updateData.fullName !== undefined ? updateData.fullName : current.fullName;
      const phone = updateData.phone !== undefined ? updateData.phone : current.phone;
      const role = updateData.role !== undefined ? updateData.role : current.role;
      const isActive = updateData.isActive !== undefined ? (updateData.isActive ? 1 : 0) : (current.isActive ? 1 : 0);
      const departmentId = updateData.departmentId !== undefined ? updateData.departmentId : current.departmentId;

      await query('UPDATE system_users SET username = @username, email = @email, password_hash = @passwordHash, full_name = @fullName, phone = @phone, role = @role, is_active = @isActive, department_id = @departmentId WHERE id = @id', [
        { name: 'id', type: sql.Int, value: parseInt(id) },
        { name: 'username', type: sql.VarChar, value: username },
        { name: 'email', type: sql.VarChar, value: email },
        { name: 'passwordHash', type: sql.VarChar, value: passwordHash },
        { name: 'fullName', type: sql.NVarChar, value: fullName },
        { name: 'phone', type: sql.VarChar, value: phone },
        { name: 'role', type: sql.VarChar, value: role },
        { name: 'isActive', type: sql.Bit, value: isActive },
        { name: 'departmentId', type: sql.NVarChar, value: departmentId || null }
      ]);
    }

    return await this.findById(id);
  }

  async delete(id) {
    const current = await this.findById(id);
    if (!current) return false;

    if (current.role === 'customer') {
      await query('DELETE FROM customers WHERE id = @id', [
        { name: 'id', type: sql.Int, value: parseInt(id) }
      ]);
    } else {
      await query('DELETE FROM system_users WHERE id = @id', [
        { name: 'id', type: sql.Int, value: parseInt(id) }
      ]);
    }
    return true;
  }
}

const userModelInstance = new UserModel();
module.exports = userModelInstance;
