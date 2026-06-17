const app = require('./app')
const env = require('./config/env')

const { poolPromise } = require('./config/db')
const notificationModel = require('./models/notificationModel')

app.listen(env.port, async () => {
  console.log(`Server running in ${env.nodeEnv} mode on port ${env.port}`)
  try {
    await poolPromise
    await notificationModel.ensureTableExists()
  } catch (err) {
    console.error('Database connection could not be verified on startup.')
  }
})
