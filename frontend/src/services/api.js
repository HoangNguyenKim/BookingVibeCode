const API_BASE_URL = 'http://localhost:5000/api';

async function fetchJson(url, options = {}) {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Có lỗi xảy ra khi gửi yêu cầu.');
  }
  return data;
}

export const api = {
  // Dashboard
  getDashboardStats: () => fetchJson('/dashboard/stats'),
  getTodayActions: () => fetchJson('/dashboard/today-actions'),

  // Rooms
  getRooms: () => fetchJson('/rooms'),
  getRoomTypes: () => fetchJson('/rooms/types'),
  createRoom: (roomData) => fetchJson('/rooms', {
    method: 'POST',
    body: JSON.stringify(roomData),
  }),
  updateRoomStatus: (roomId, status) => fetchJson(`/rooms/${roomId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  createRoomType: (typeData) => fetchJson('/rooms/types', {
    method: 'POST',
    body: JSON.stringify(typeData),
  }),
  updateRoomType: (typeId, typeData) => fetchJson(`/rooms/types/${typeId}`, {
    method: 'PUT',
    body: JSON.stringify(typeData),
  }),
  deleteRoom: (roomId) => fetchJson(`/rooms/${roomId}`, {
    method: 'DELETE',
  }),

  // Bookings
  getBookings: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.checkIn) params.append('checkIn', filters.checkIn);
    if (filters.checkOut) params.append('checkOut', filters.checkOut);
    return fetchJson(`/bookings?${params.toString()}`);
  },
  getAvailableRooms: (checkIn, checkOut) => {
    return fetchJson(`/bookings/available-rooms?checkIn=${checkIn}&checkOut=${checkOut}`);
  },
  getBookingDetails: (bookingId) => fetchJson(`/bookings/${bookingId}`),
  createBooking: (bookingData) => fetchJson('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  }),
  checkInBooking: (bookingId) => fetchJson(`/bookings/${bookingId}/check-in`, {
    method: 'PUT',
  }),
  checkOutBooking: (bookingId) => fetchJson(`/bookings/${bookingId}/check-out`, {
    method: 'PUT',
  }),
  cancelBooking: (bookingId) => fetchJson(`/bookings/${bookingId}/cancel`, {
    method: 'PUT',
  }),
  addBookingService: (bookingId, serviceData) => fetchJson(`/bookings/${bookingId}/services`, {
    method: 'POST',
    body: JSON.stringify(serviceData),
  }),
  deleteBookingService: (serviceId) => fetchJson(`/bookings/services/${serviceId}`, {
    method: 'DELETE',
  }),

  // Guests
  getGuests: (search = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return fetchJson(`/guests?${params.toString()}`);
  },
  getGuestDetails: (guestId) => fetchJson(`/guests/${guestId}`),
  createGuest: (guestData) => fetchJson('/guests', {
    method: 'POST',
    body: JSON.stringify(guestData),
  }),
  updateGuest: (guestId, guestData) => fetchJson(`/guests/${guestId}`, {
    method: 'PUT',
    body: JSON.stringify(guestData),
  }),

  // Payment SePay
  getPaymentQR: (bookingId) => fetchJson(`/payment/qr/${bookingId}`),
  simulatePaymentWebhook: (bookingId, amountIn) => fetchJson('/payment/simulate', {
    method: 'POST',
    body: JSON.stringify({ bookingId, amountIn }),
  }),
};
