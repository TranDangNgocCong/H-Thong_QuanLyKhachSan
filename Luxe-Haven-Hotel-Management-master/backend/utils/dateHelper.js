function getVietnamTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return formatter.format(now).replace('T', ' ');
}

function getVietnamDate() {
  return getVietnamTime().split(' ')[0];
}

module.exports = {
  getVietnamTime,
  getVietnamDate
};
