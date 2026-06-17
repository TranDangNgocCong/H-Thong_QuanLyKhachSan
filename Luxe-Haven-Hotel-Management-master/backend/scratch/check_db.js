const { query } = require('../config/db');

async function check() {
  try {
    const cols = await query(`
      SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'housekeeping_log'
    `);
    console.log('--- Columns of housekeeping_log ---');
    console.log(cols.recordset);

    const userCols = await query(`
      SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'system_users'
    `);
    console.log('--- Columns of system_users ---');
    console.log(userCols.recordset);

    const constraints = await query(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_NAME = 'system_users'
    `);
    console.log('--- Constraints of system_users ---');
    console.log(constraints.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
