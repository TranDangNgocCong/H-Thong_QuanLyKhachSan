const express = require('express')
const housekeepingController = require('../controllers/housekeepingController')
const authRouter = require('./authRoutes')
const extractUser = authRouter.extractUser

const router = express.Router()

router.get('/cleaners', housekeepingController.listCleaners)
router.get('/', housekeepingController.listLogs)
router.put('/room/:roomId/status', housekeepingController.updateStatus)
router.put('/update', housekeepingController.updateStatusBody)

router.put('/assign-self', extractUser, housekeepingController.assignSelf)
router.put('/request-cancel', extractUser, housekeepingController.requestCancel)
router.put('/handle-cancel-request', extractUser, housekeepingController.handleCancelRequest)

module.exports = router
