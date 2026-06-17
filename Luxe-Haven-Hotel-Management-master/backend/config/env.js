require('dotenv').config()

const env = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || '*',
  dbUser: process.env.DB_USER || 'sa',
  dbPassword: process.env.DB_PASSWORD || '',
  dbServer: process.env.DB_SERVER || 'localhost',
  dbName: process.env.DB_NAME || 'HotelManagement',
}

module.exports = env
