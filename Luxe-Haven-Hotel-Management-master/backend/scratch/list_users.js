const { query } = require('../config/db');

async function run() {
  try {
    const res = await query('SELECT id, username, full_name, role, is_active FROM system_users');
    console.log('--- SYSTEM USERS ---');
    console.table(res.recordset);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
