const { query } = require('../config/db');

async function run() {
  try {
    // Check if table exists
    const res = await query(`
      SELECT OBJECT_ID('time_attendance') AS table_id
    `);
    
    if (res.recordset[0] && res.recordset[0].table_id) {
      console.log('time_attendance table already exists in the database.');
    } else {
      console.log('time_attendance table does not exist. Creating it...');
      await query(`
        CREATE TABLE time_attendance (
            id INT IDENTITY(1,1) PRIMARY KEY,
            user_id INT FOREIGN KEY REFERENCES system_users(id),
            work_date DATE DEFAULT CAST(GETDATE() AS DATE),
            check_in_time DATETIME NOT NULL,
            check_out_time DATETIME NULL,
            total_hours DECIMAL(4,2) NULL
        )
      `);
      console.log('Successfully created time_attendance table.');
    }
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    process.exit(0);
  }
}

run();
