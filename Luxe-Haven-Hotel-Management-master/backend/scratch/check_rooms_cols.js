const { query } = require('../config/db');

async function check() {
  try {
    const cols = await query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'rooms'
    `);
    console.log('--- ROOMS COLUMNS ---');
    console.log(JSON.stringify(cols.recordset, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
