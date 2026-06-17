function sendSuccess(res, data, message = 'Success') {
  res.json({
    success: true,
    message,
    data,
  })
}

module.exports = {
  sendSuccess,
}
