const { query } = require('../config/db');

async function run() {
  try {
    // Check if accountant already exists
    const resExist = await query("SELECT id FROM system_users WHERE username = 'accountant'");
    if (resExist.recordset.length > 0) {
      console.log('Accountant user already exists with id:', resExist.recordset[0].id);
      return;
    }

    const res = await query(`
      INSERT INTO system_users (username, email, password_hash, full_name, phone, role, is_active)
      VALUES ('accountant', 'accountant@luxehaven.com', 'LuxeHaven@2026', N'Trần Thị Kế Toán', '0934567891', 'accountant', 1);
    `);
    console.log('Successfully created accountant user!');
  } catch (err) {
    console.error('Error creating accountant user:', err);
  } finally {
    process.exit(0);
  }
}

run();
