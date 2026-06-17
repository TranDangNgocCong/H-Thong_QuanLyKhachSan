const { query } = require('../config/db');

async function updateDb() {
  try {
    console.log('Altering system_users role check constraint...');
    // Drop existing check constraint
    try {
      await query(`ALTER TABLE system_users DROP CONSTRAINT CHK_SystemUserRole`);
      console.log('Successfully dropped CHK_SystemUserRole constraint.');
    } catch (err) {
      console.log('Could not drop CHK_SystemUserRole (it might not exist or name differs):', err.message);
    }

    // Add new check constraint allowing accountant
    await query(`
      ALTER TABLE system_users 
      ADD CONSTRAINT CHK_SystemUserRole CHECK (role IN ('receptionist', 'admin', 'cleaner', 'accountant'))
    `);
    console.log('Successfully added new CHK_SystemUserRole constraint supporting cleaner and accountant.');

    // Create expense_vouchers table
    console.log('Creating expense_vouchers table if not exists...');
    await query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'expense_vouchers')
      BEGIN
          CREATE TABLE expense_vouchers (
              id INT IDENTITY(1,1) PRIMARY KEY,
              title NVARCHAR(255) NOT NULL,
              amount DECIMAL(18,2) NOT NULL,
              category NVARCHAR(100) NOT NULL,
              created_at DATETIME DEFAULT GETDATE()
          );
          PRINT 'Table expense_vouchers created successfully.';
      END
      ELSE
      BEGIN
          PRINT 'Table expense_vouchers already exists.';
      END
    `);
    console.log('Finished updating database schema.');

  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    process.exit(0);
  }
}

updateDb();
