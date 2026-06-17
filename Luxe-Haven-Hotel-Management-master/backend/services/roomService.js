const roomModel = require('../models/roomModel')

async function getRooms() {
  return await roomModel.findAll()
}

async function getAvailableRooms() {
  const rooms = await roomModel.findAll()
  return rooms.filter((room) => room.available)
}

async function createRoom(roomData) {
  return await roomModel.create(roomData)
}

async function updateRoom(id, roomData) {
  return await roomModel.update(id, roomData)
}

async function deleteRoom(id) {
  return await roomModel.delete(id)
}

async function getAvailableRoomsByType(type, checkin, checkout) {
  return await roomModel.findAvailableByType(type, checkin, checkout)
}

async function getRoomTypes() {
  const types = await roomModel.getRoomTypes();
  return types.map(t => {
    const roomType = t.roomType;
    const minPrice = parseFloat(t.minPrice);
    const type = roomType.toLowerCase();
    
    let maxGuests = 2;
    let sizeSqm = 45;
    let bedType = 'Giường King';
    let viewType = 'Hướng Vịnh';
    let description = 'Không gian nghỉ dưỡng sang trọng, ấm cúng với đầy đủ trang thiết bị tiện nghi cao cấp.';
    let imageUrl = 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80';

    if (type.includes('bayview')) {
      maxGuests = 2;
      sizeSqm = 50;
      bedType = 'Giường King';
      viewType = 'Hướng Vịnh';
      description = 'Thiết kế thoải mái với giường đôi cỡ lớn, ban công riêng, phòng tắm cao cấp hướng toàn cảnh vịnh biển.';
      imageUrl = 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80';
    } else if (type.includes('twin') || type.includes('double twin') || type.includes('oceanview twin')) {
      maxGuests = 2;
      sizeSqm = 52;
      bedType = '2 Giường Đơn';
      viewType = 'Hướng Biển';
      description = 'Lựa chọn phòng nghỉ tầng cao lý tưởng với hai giường đơn tách biệt, ban công đón trọn gió biển đại dương.';
      imageUrl = 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80';
    } else if (type.includes('family') || type.includes('gia đình')) {
      maxGuests = 4;
      sizeSqm = 115;
      bedType = 'Giường King & Đơn';
      viewType = 'Toàn Cảnh';
      description = 'Không gian Suite rộng rãi đẳng cấp dành riêng cho gia đình, tích hợp khu vực tiếp khách và quầy bar mini.';
      imageUrl = 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80';
    } else if (type.includes('suite')) {
      maxGuests = 2;
      sizeSqm = 75;
      bedType = 'Giường Super King';
      viewType = 'Toàn Cảnh Biển';
      description = 'Trải nghiệm kỳ nghỉ xa hoa trong phòng Suite rộng lớn với thiết kế tinh xảo, bồn tắm nằm và view biển panorama.';
      imageUrl = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80';
    } else if (type.includes('deluxe')) {
      maxGuests = 2;
      sizeSqm = 38;
      bedType = 'Giường Queen / Đôi';
      viewType = 'Sân Vườn';
      description = 'Phòng Deluxe sang trọng mang phong cách ấm cúng, đầy đủ tiện nghi hiện đại và ban công hướng nội khu.';
      imageUrl = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
    }

    return {
      room_type: roomType,
      min_price: minPrice,
      max_guests: maxGuests,
      size_sqm: sizeSqm,
      bed_type: bedType,
      view_type: viewType,
      description: description,
      image_url: imageUrl
    };
  });
}

module.exports = {
  getRooms,
  getAvailableRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getAvailableRoomsByType,
  getRoomTypes,
}
