const { query } = require('../config/db');

async function updateDb() {
  try {
    console.log('Altering system_users role check constraint...');
    // Drop existing check constraint
    try {
      await query(`ALTER TABLE system_users DROP CONSTRAINT CHK_SystemUserRole`);
      console.log('Successfully dropped CHK_SystemUserRole constraint.');
    } catch (err) {
      console.log('Could not drop CHK_SystemUserRole (it might not exist):', err.message);
    }

    // Add new check constraint
    await query(`
      ALTER TABLE system_users 
      ADD CONSTRAINT CHK_SystemUserRole CHECK (role IN ('receptionist', 'admin', 'cleaner'))
    `);
    console.log('Successfully added new CHK_SystemUserRole constraint supporting cleaner.');

    // Alter staff_id to be nullable
    console.log('Altering housekeeping_log.staff_id to be nullable...');
    await query(`
      ALTER TABLE housekeeping_log ALTER COLUMN staff_id INT NULL
    `);
    console.log('Successfully made staff_id nullable.');

  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    process.exit(0);
  }
}

updateDb();
