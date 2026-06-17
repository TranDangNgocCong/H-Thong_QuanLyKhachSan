const { query } = require('../config/db');

async function run() {
  try {
    console.log('Starting migration...');

    // 1. Add department_id to system_users if it doesn't exist
    const checkUsersCol = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'system_users' AND COLUMN_NAME = 'department_id'
    `);
    
    if (checkUsersCol.recordset.length === 0) {
      console.log("Adding department_id column to system_users...");
      await query(`
        ALTER TABLE system_users 
        ADD department_id VARCHAR(20) NULL 
        CONSTRAINT CHK_UserDepartment CHECK (department_id IN ('F&B', 'SPA', 'TRANSPORT') OR department_id IS NULL)
      `);
      console.log("department_id column added successfully.");
    } else {
      console.log("department_id column already exists in system_users.");
    }

    // 2. Create service_orders if it doesn't exist
    const checkServiceOrdersTable = await query(`
      SELECT OBJECT_ID('service_orders') AS table_id
    `);

    if (!checkServiceOrdersTable.recordset[0].table_id) {
      console.log("Creating service_orders table...");
      await query(`
        CREATE TABLE service_orders (
            id INT IDENTITY(1,1) PRIMARY KEY,
            booking_id INT NOT NULL,
            service_id INT NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            total_price DECIMAL(18, 2) NOT NULL,
            department_id NVARCHAR(50) NULL,
            task_status NVARCHAR(50) DEFAULT 'pending' CHECK (task_status IN ('pending', 'processing', 'completed')),
            assigned_staff_id INT FOREIGN KEY REFERENCES system_users(id) NULL,
            created_at DATETIME DEFAULT GETDATE(),
            
            CONSTRAINT FK_ServiceOrders_Bookings FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
            CONSTRAINT FK_ServiceOrders_Services FOREIGN KEY (service_id) REFERENCES services(id)
        )
      `);
      console.log("service_orders table created.");

      // Check if booking_services exists to copy data
      const checkBookingServicesTable = await query(`
        SELECT OBJECT_ID('booking_services') AS table_id
      `);

      if (checkBookingServicesTable.recordset[0].table_id) {
        console.log("Copying records from booking_services to service_orders...");
        await query(`
          SET IDENTITY_INSERT service_orders ON;
          INSERT INTO service_orders (id, booking_id, service_id, quantity, total_price, created_at, department_id, task_status)
          SELECT id, booking_id, service_id, quantity, total_price, created_at, NULL, 'pending' FROM booking_services;
          SET IDENTITY_INSERT service_orders OFF;
        `);
        console.log("Data copied successfully.");

        console.log("Dropping old booking_services table...");
        await query("DROP TABLE booking_services");
        console.log("booking_services table dropped.");
      }
    } else {
      console.log("service_orders table already exists.");
    }

    // 3. Update existing service_orders with department_id based on service_id
    console.log("Setting department_id on existing service orders...");
    await query(`
      UPDATE service_orders SET department_id = 'F&B' WHERE service_id IN (1, 2);
      UPDATE service_orders SET department_id = 'SPA' WHERE service_id = 3;
      UPDATE service_orders SET department_id = 'TRANSPORT' WHERE service_id IN (4, 5);
    `);
    console.log("department_id mapping updated.");

    // 4. Create three mock department staff members to test
    console.log("Creating department staff members...");
    const mockUsers = [
      { username: 'cleaner_fb', email: 'fb.cleaner@luxehaven.com', fullName: 'Lê Văn Bếp', role: 'cleaner', department_id: 'F&B' },
      { username: 'cleaner_spa', email: 'spa.cleaner@luxehaven.com', fullName: 'Nguyễn Thị Spa', role: 'cleaner', department_id: 'SPA' },
      { username: 'cleaner_transport', email: 'transport.cleaner@luxehaven.com', fullName: 'Trần Văn Lái', role: 'cleaner', department_id: 'TRANSPORT' }
    ];

    for (const u of mockUsers) {
      const exist = await query("SELECT id FROM system_users WHERE username = @username", [
        { name: 'username', type: sql.VarChar, value: u.username }
      ]);
      if (exist.recordset.length === 0) {
        console.log(`Creating user ${u.username}...`);
        await query(`
          INSERT INTO system_users (username, email, password_hash, full_name, phone, role, is_active, department_id)
          VALUES (@username, @email, 'LuxeHaven@2026', @fullName, '0933333333', @role, 1, @department_id)
        `, [
          { name: 'username', type: sql.VarChar, value: u.username },
          { name: 'email', type: sql.VarChar, value: u.email },
          { name: 'fullName', type: sql.NVarChar, value: u.fullName },
          { name: 'role', type: sql.VarChar, value: u.role },
          { name: 'department_id', type: sql.VarChar, value: u.department_id }
        ]);
      }
    }
    console.log("Mock department staff created.");
    console.log("Migration completed successfully!");
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

const sql = require('mssql');
run();
