const sql = require('mssql');
const env = require('./env');

const dbConfig = {
  user: env.dbUser,
  password: env.dbPassword,
  server: env.dbServer,
  database: env.dbName,
  options: {
    encrypt: false, // Set true for Azure SQL
    trustServerCertificate: true, // Self-signed certs (local dev)
  },
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log(`Connected to SQL Server database: ${dbConfig.database} on ${dbConfig.server}`);
    return pool;
  })
  .catch(err => {
    console.error('Database connection failed: ', err);
    // Let server continue running (will retry on next query or fail gracefully)
  });

/**
 * Execute parameterized query
 * @param {string} sqlQuery 
 * @param {Array<{name: string, type: sql.Type, value: any}>} params 
 * @returns {Promise<sql.IResult<any>>}
 */
async function query(sqlQuery, params = []) {
  const pool = await poolPromise;
  if (!pool) {
    throw new Error('Database pool not connected');
  }
  const request = pool.request();
  if (params && params.length > 0) {
    params.forEach(p => {
      request.input(p.name, p.type || sql.NVarChar, p.value);
    });
  }
  return await request.query(sqlQuery);
}

module.exports = {
  sql,
  query,
  poolPromise,
};
