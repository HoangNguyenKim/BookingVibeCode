import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Phone, 
  DollarSign, 
  Trash2, 
  PlusCircle, 
  Receipt,
  FileText,
  RefreshCw,
  LogIn,
  LogOut,
  XCircle,
  Eye
} from 'lucide-react';

function Bookings({ activeBookingId, onCloseBookingDetails }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: 'all', checkIn: '', checkOut: '' });
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null); // Cho hóa đơn/chi tiết

  // Form Tạo Booking mới
  const [newBooking, setNewBooking] = useState({
    full_name: '', phone: '', email: '', id_card_number: '',
    room_id: '', check_in_date: '', check_out_date: '', total_price: 0
  });
  const [availableRooms, setAvailableRooms] = useState([]);
  const [searchRoomsLoading, setSearchRoomsLoading] = useState(false);
  const [selectedRoomPrice, setSelectedRoomPrice] = useState(0);

  // Trạng thái lỗi Validation
  const [bookingErrors, setBookingErrors] = useState({});
  const [serviceError, setServiceError] = useState('');

  // Form Thêm Dịch vụ phụ thu
  const [newService, setNewService] = useState({ service_name: '', price: '', quantity: 1 });

  const toast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getBookings(filters);
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [filters.status]);

  // Hỗ trợ mở chi tiết từ các trang khác (ví dụ: Dashboard, Timeline)
  useEffect(() => {
    if (activeBookingId) {
      handleOpenDetails(activeBookingId);
    }
  }, [activeBookingId]);

  const handleOpenDetails = async (id) => {
    try {
      const details = await api.getBookingDetails(id);
      setSelectedBooking(details);
    } catch (err) {
      toast(err.message || 'Không thể tải chi tiết đặt phòng.', 'error');
    }
  };

  const handleCloseDetails = () => {
    setSelectedBooking(null);
    if (onCloseBookingDetails) {
      onCloseBookingDetails();
    }
    loadBookings();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadBookings();
  };

  // Tìm phòng trống theo khoảng ngày check-in/out
  const handleFindRooms = async () => {
    const { check_in_date, check_out_date } = newBooking;
    const errors = { ...bookingErrors };
    let hasError = false;

    if (!check_in_date) {
      errors.check_in_date = 'Vui lòng chọn ngày Check-in.';
      hasError = true;
    } else {
      delete errors.check_in_date;
    }

    if (!check_out_date) {
      errors.check_out_date = 'Vui lòng chọn ngày Check-out.';
      hasError = true;
    } else {
      delete errors.check_out_date;
    }

    if (check_in_date && check_out_date) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (check_in_date < todayStr) {
        errors.check_in_date = 'Ngày Check-in không được nhỏ hơn ngày hôm nay.';
        hasError = true;
      }
      if (new Date(check_in_date) >= new Date(check_out_date)) {
        errors.check_out_date = 'Ngày Check-out phải sau ngày Check-in ít nhất 1 ngày.';
        hasError = true;
      } else if (!hasError) {
        delete errors.check_out_date;
      }
    }

    if (hasError) {
      setBookingErrors(errors);
      return;
    }

    // Xóa các lỗi về ngày nếu hợp lệ
    const updatedErrors = { ...bookingErrors };
    delete updatedErrors.check_in_date;
    delete updatedErrors.check_out_date;
    setBookingErrors(updatedErrors);

    setSearchRoomsLoading(true);
    try {
      const rooms = await api.getAvailableRooms(check_in_date, check_out_date);
      setAvailableRooms(rooms);
      if (rooms.length === 0) {
        toast('Rất tiếc, không còn phòng nào trống trong khoảng thời gian này.', 'warning');
      } else {
        toast(`Đã tìm thấy ${rooms.length} phòng khả dụng!`, 'info');
      }
    } catch (err) {
      toast(err.message || 'Lỗi khi tìm phòng trống.', 'error');
    } finally {
      setSearchRoomsLoading(false);
    }
  };

  // Tính số đêm và cập nhật tổng giá khi đổi phòng hoặc ngày
  useEffect(() => {
    const { check_in_date, check_out_date, room_id } = newBooking;
    if (check_in_date && check_out_date && room_id && selectedRoomPrice > 0) {
      const inDate = new Date(check_in_date);
      const outDate = new Date(check_out_date);
      const diffTime = Math.abs(outDate - inDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        setNewBooking(prev => ({
          ...prev,
          total_price: diffDays * selectedRoomPrice
        }));
      }
    }
  }, [newBooking.room_id, newBooking.check_in_date, newBooking.check_out_date, selectedRoomPrice]);

  const handleRoomChange = (e) => {
    const roomId = e.target.value;
    const room = availableRooms.find(r => r.id === parseInt(roomId, 10));
    setSelectedRoomPrice(room ? room.price_per_night : 0);
    setNewBooking(prev => ({ ...prev, room_id: roomId }));
    
    if (roomId) {
      const updatedErrors = { ...bookingErrors };
      delete updatedErrors.room_id;
      setBookingErrors(updatedErrors);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    const errors = {};
    
    if (!newBooking.full_name.trim()) {
      errors.full_name = 'Vui lòng nhập tên khách hàng.';
    }
    
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!newBooking.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!phoneRegex.test(newBooking.phone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ (phải gồm 10 - 11 chữ số).';
    }

    if (newBooking.email.trim() && !/\S+@\S+\.\S+/.test(newBooking.email)) {
      errors.email = 'Email không đúng định dạng.';
    }

    if (!newBooking.room_id) {
      errors.room_id = 'Vui lòng tìm và chọn một phòng khả dụng.';
    }

    if (Object.keys(errors).length > 0) {
      setBookingErrors(errors);
      return;
    }

    setBookingErrors({});
    try {
      await api.createBooking(newBooking);
      toast('Tạo đặt phòng mới thành công!', 'success');
      setShowCreateModal(false);
      setNewBooking({
        full_name: '', phone: '', email: '', id_card_number: '',
        room_id: '', check_in_date: '', check_out_date: '', total_price: 0
      });
      setAvailableRooms([]);
      loadBookings();
    } catch (err) {
      toast(err.message || 'Lỗi khi tạo đặt phòng.', 'error');
    }
  };

  // Check-In
  const handleCheckIn = async (id) => {
    try {
      await api.checkInBooking(id);
      toast('Nhận phòng (Check-in) thành công!', 'success');
      if (selectedBooking && selectedBooking.id === id) {
        handleOpenDetails(id);
      } else {
        loadBookings();
      }
    } catch (err) {
      toast(err.message || 'Lỗi Check-in', 'error');
    }
  };

  // Check-Out
  const handleCheckOut = async (id) => {
    if (window.confirm('Khách thanh toán và trả phòng?')) {
      try {
        await api.checkOutBooking(id);
        toast('Check-out trả phòng & thanh toán thành công!', 'success');
        if (selectedBooking && selectedBooking.id === id) {
          handleOpenDetails(id);
        } else {
          loadBookings();
        }
      } catch (err) {
        toast(err.message || 'Lỗi Check-out', 'error');
      }
    }
  };

  // Hủy phòng
  const handleCancelBooking = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đặt phòng này?')) {
      try {
        await api.cancelBooking(id);
        toast('Hủy đặt phòng thành công!', 'success');
        if (selectedBooking && selectedBooking.id === id) {
          handleOpenDetails(id);
        } else {
          loadBookings();
        }
      } catch (err) {
        toast(err.message || 'Lỗi hủy đặt phòng', 'error');
      }
    }
  };

  // Thêm dịch vụ
  const handleAddService = async (e) => {
    e.preventDefault();
    if (!newService.service_name.trim()) {
      setServiceError('Vui lòng nhập tên dịch vụ phụ thu.');
      return;
    }
    if (!newService.price || parseFloat(newService.price) <= 0) {
      setServiceError('Vui lòng nhập giá dịch vụ hợp lệ.');
      return;
    }

    setServiceError('');
    try {
      await api.addBookingService(selectedBooking.id, newService);
      toast('Thêm dịch vụ phụ thu vào hóa đơn thành công!', 'success');
      setNewService({ service_name: '', price: '', quantity: 1 });
      handleOpenDetails(selectedBooking.id);
    } catch (err) {
      toast(err.message || 'Lỗi thêm dịch vụ.', 'error');
    }
  };

  // Xóa dịch vụ
  const handleDeleteService = async (serviceId) => {
    if (window.confirm('Bạn có muốn xóa dịch vụ này khỏi hóa đơn?')) {
      try {
        await api.deleteBookingService(serviceId);
        toast('Đã xóa dịch vụ khỏi hóa đơn.', 'info');
        handleOpenDetails(selectedBooking.id);
      } catch (err) {
        toast(err.message || 'Lỗi xóa dịch vụ.', 'error');
      }
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'booked': return 'Đã đặt trước';
      case 'checked_in': return 'Đang ở (Checked-In)';
      case 'checked_out': return 'Đã trả phòng (Checked-Out)';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const calculateInvoiceTotal = () => {
    if (!selectedBooking) return 0;
    const roomCharge = parseFloat(selectedBooking.total_price);
    const servicesCharge = selectedBooking.services.reduce(
      (sum, s) => sum + (parseFloat(s.price) * s.quantity), 0
    );
    return roomCharge + servicesCharge;
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h2>Quản lý đặt phòng</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tạo đặt phòng mới, quản lý dịch vụ và hóa đơn check-in / check-out</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Đặt phòng mới
        </button>
      </div>

      {/* Booking.com Style Yellow Search Container */}
      <form className="booking-search-bar" onSubmit={handleSearchSubmit}>
        <div className="search-input-group">
          <label>Tìm kiếm thông tin</label>
          <input 
            type="text" 
            placeholder="Tên khách, SĐT, số phòng..." 
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <div className="search-input-group">
          <label>Trạng thái</label>
          <select 
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="booked">Đã đặt trước</option>
            <option value="checked_in">Đang ở</option>
            <option value="checked_out">Đã thanh toán (Checked-Out)</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
        <div className="search-input-group">
          <label>Nhận phòng từ ngày</label>
          <input 
            type="date" 
            value={filters.checkIn}
            onChange={(e) => setFilters(prev => ({ ...prev, checkIn: e.target.value }))}
          />
        </div>
        <div className="search-input-group">
          <label>Đến ngày</label>
          <input 
            type="date" 
            value={filters.checkOut}
            onChange={(e) => setFilters(prev => ({ ...prev, checkOut: e.target.value }))}
          />
        </div>
        <button type="submit" className="search-btn">
          <Search size={16} /> Tìm kiếm
        </button>
      </form>

      {/* Table List */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <RefreshCw className="animate-spin" size={24} style={{ color: '#003580' }} />
            </div>
          ) : bookings.length === 0 ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy lịch đặt phòng nào.</p>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Phòng</th>
                  <th>Ngày đến (Check-in)</th>
                  <th>Ngày đi (Check-out)</th>
                  <th>Tạm tính</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="font-bold">{booking.guest_name}</td>
                    <td>{booking.guest_phone}</td>
                    <td><span className="badge checked_in">P. {booking.room_number}</span></td>
                    <td>{new Date(booking.check_in_date).toLocaleDateString('vi-VN')}</td>
                    <td>{new Date(booking.check_out_date).toLocaleDateString('vi-VN')}</td>
                    <td className="font-bold">{formatVND(booking.total_price)}</td>
                    <td><span className={`badge ${booking.status}`}>{getStatusText(booking.status)}</span></td>
                    <td className="text-right">
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-xs" onClick={() => handleOpenDetails(booking.id)} title="Hóa đơn & Dịch vụ">
                          <Receipt size={12} /> Chi tiết
                        </button>
                        {booking.status === 'booked' && (
                          <>
                            <button className="btn btn-primary btn-xs" onClick={() => handleCheckIn(booking.id)}>
                              <LogIn size={12} /> Check-In
                            </button>
                            <button className="btn btn-danger btn-xs" onClick={() => handleCancelBooking(booking.id)}>
                              <XCircle size={12} /> Hủy
                            </button>
                          </>
                        )}
                        {booking.status === 'checked_in' && (
                          <button className="btn btn-accent btn-xs" onClick={() => handleCheckOut(booking.id)}>
                            <LogOut size={12} /> Trả phòng
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Đặt phòng mới */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setBookingErrors({}); }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo phiếu đặt phòng mới</h3>
              <button className="close-btn" onClick={() => { setShowCreateModal(false); setBookingErrors({}); }}>&times;</button>
            </div>
            <form onSubmit={handleCreateBooking}>
              <div className="modal-body">
                <h4 style={{ marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '14px', color: 'var(--primary-blue)' }}>
                  👤 Thông tin khách hàng
                </h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Họ và tên *</label>
                    <input 
                      type="text" 
                      value={newBooking.full_name}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, full_name: e.target.value }))}
                      className={bookingErrors.full_name ? 'input-invalid' : ''}
                      placeholder="Nguyễn Văn A"
                    />
                    {bookingErrors.full_name && <span className="form-error">{bookingErrors.full_name}</span>}
                  </div>
                  <div className="form-group">
                    <label>Số điện thoại *</label>
                    <input 
                      type="text" 
                      value={newBooking.phone}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, phone: e.target.value }))}
                      className={bookingErrors.phone ? 'input-invalid' : ''}
                      placeholder="0912345678"
                    />
                    {bookingErrors.phone && <span className="form-error">{bookingErrors.phone}</span>}
                  </div>
                  <div className="form-group">
                    <label>Email (nếu có)</label>
                    <input 
                      type="text" 
                      value={newBooking.email}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, email: e.target.value }))}
                      className={bookingErrors.email ? 'input-invalid' : ''}
                      placeholder="email@example.com"
                    />
                    {bookingErrors.email && <span className="form-error">{bookingErrors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label>Số CCCD / Passport</label>
                    <input 
                      type="text" 
                      value={newBooking.id_card_number}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, id_card_number: e.target.value }))}
                      placeholder="012345678901"
                    />
                  </div>
                </div>

                <h4 style={{ marginBottom: '12px', marginTop: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '14px', color: 'var(--primary-blue)' }}>
                  🔑 Lịch trình & Chọn phòng
                </h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Ngày Check-in *</label>
                    <input 
                      type="date" 
                      value={newBooking.check_in_date}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, check_in_date: e.target.value }))}
                      className={bookingErrors.check_in_date ? 'input-invalid' : ''}
                    />
                    {bookingErrors.check_in_date && <span className="form-error">{bookingErrors.check_in_date}</span>}
                  </div>
                  <div className="form-group">
                    <label>Ngày Check-out *</label>
                    <input 
                      type="date" 
                      value={newBooking.check_out_date}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, check_out_date: e.target.value }))}
                      className={bookingErrors.check_out_date ? 'input-invalid' : ''}
                    />
                    {bookingErrors.check_out_date && <span className="form-error">{bookingErrors.check_out_date}</span>}
                  </div>
                  <div className="form-group" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px' }}>
                    <button type="button" className="btn btn-accent w-full" onClick={handleFindRooms}>
                      🔍 Tìm phòng trống
                    </button>
                  </div>
                </div>

                {availableRooms.length > 0 && (
                  <div className="form-grid" style={{ marginTop: '16px' }}>
                    <div className="form-group full-width">
                      <label>Chọn phòng khả dụng *</label>
                      <select 
                        value={newBooking.room_id} 
                        onChange={handleRoomChange}
                        className={bookingErrors.room_id ? 'input-invalid' : ''}
                      >
                        <option value="">-- Chọn phòng trống --</option>
                        {availableRooms.map(room => (
                          <option key={room.id} value={room.id}>
                            Phòng {room.room_number} - {room.room_type_name} ({formatVND(room.price_per_night)}/đêm, max {room.capacity} khách)
                          </option>
                        ))}
                      </select>
                      {bookingErrors.room_id && <span className="form-error">{bookingErrors.room_id}</span>}
                    </div>
                  </div>
                )}

                {availableRooms.length === 0 && (
                  <div className="alert-box" style={{ margin: '16px 0 0 0' }}>
                    💡 Hãy nhập khoảng ngày đến/đi và bấm <strong>Tìm phòng trống</strong> để hiển thị danh sách phòng trống tương ứng.
                  </div>
                )}

                {newBooking.total_price > 0 && (
                  <div className="confirmation-slip" style={{ borderStyle: 'solid', borderColor: 'var(--status-available-color)', marginTop: '20px' }}>
                    <div className="slip-total">
                      <span>Tổng chi phí tiền phòng dự kiến:</span>
                      <span style={{ color: 'var(--status-available-color)' }}>{formatVND(newBooking.total_price)}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Được tính dựa trên số ngày ở thực tế x đơn giá phòng.
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowCreateModal(false); setBookingErrors({}); }}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary" disabled={!newBooking.room_id}>Xác nhận đặt phòng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hóa đơn & Chi tiết Booking */}
      {selectedBooking && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Đặt phòng #{selectedBooking.id} - Chi tiết & Hóa đơn</h3>
              <button className="close-btn" onClick={handleCloseDetails}>&times;</button>
            </div>
            <div className="modal-body">
              {/* Phiếu xác nhận đặt phòng Booking.com style */}
              <div className="confirmation-slip">
                <div className="confirmation-header">
                  <span className="slip-title">XÁC NHẬN ĐẶT PHÒNG</span>
                  <span className={`badge ${selectedBooking.status}`}>{getStatusText(selectedBooking.status)}</span>
                </div>
                <div className="slip-grid">
                  <div>
                    <div className="slip-label">Tên khách hàng</div>
                    <div className="slip-value">{selectedBooking.guest_name}</div>
                  </div>
                  <div>
                    <div className="slip-label">Số điện thoại</div>
                    <div className="slip-value">{selectedBooking.guest_phone}</div>
                  </div>
                  <div>
                    <div className="slip-label">Số phòng được chọn</div>
                    <div className="slip-value">Phòng {selectedBooking.room_number} ({selectedBooking.room_type_name})</div>
                  </div>
                  <div>
                    <div className="slip-label">Giá niêm yết phòng</div>
                    <div className="slip-value">{formatVND(selectedBooking.room_price)} / đêm</div>
                  </div>
                  <div>
                    <div className="slip-label">Ngày nhận phòng (Check-in)</div>
                    <div className="slip-value">{new Date(selectedBooking.check_in_date).toLocaleDateString('vi-VN')}</div>
                  </div>
                  <div>
                    <div className="slip-label">Ngày trả phòng (Check-out)</div>
                    <div className="slip-value">{new Date(selectedBooking.check_out_date).toLocaleDateString('vi-VN')}</div>
                  </div>
                </div>
                <div className="slip-divider"></div>
                <div className="slip-total">
                  <span>Tiền phòng ({Math.round(Math.abs(new Date(selectedBooking.check_out_date) - new Date(selectedBooking.check_in_date)) / (1000 * 60 * 60 * 24))} đêm):</span>
                  <span>{formatVND(selectedBooking.total_price)}</span>
                </div>
              </div>

              {/* Phần quản lý phụ thu dịch vụ */}
              <h4 style={{ marginTop: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '14px', color: 'var(--primary-blue)' }}>
                🍹 Dịch vụ phụ thu đi kèm
              </h4>
              
              {selectedBooking.services.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: '10px 0' }}>Chưa có phụ thu dịch vụ nào cho đặt phòng này.</p>
              ) : (
                <table className="service-bill-table" style={{ marginBottom: '16px' }}>
                  <thead>
                    <tr>
                      <th>Tên dịch vụ / Phụ thu</th>
                      <th className="text-right">Đơn giá</th>
                      <th className="text-center" style={{ width: '80px' }}>Số lượng</th>
                      <th className="text-right">Thành tiền</th>
                      {selectedBooking.status === 'checked_in' && <th className="text-right" style={{ width: '40px' }}>Xóa</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBooking.services.map(service => (
                      <tr key={service.id}>
                        <td>{service.service_name}</td>
                        <td className="text-right">{formatVND(service.price)}</td>
                        <td className="text-center">{service.quantity}</td>
                        <td className="text-right font-bold">{formatVND(service.price * service.quantity)}</td>
                        {selectedBooking.status === 'checked_in' && (
                          <td className="text-right">
                            <button 
                              style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer' }}
                              onClick={() => handleDeleteService(service.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Form thêm dịch vụ nhanh (Chỉ hiển thị khi đang checked_in) */}
              {selectedBooking.status === 'checked_in' && (
                <div style={{ marginTop: '16px' }}>
                  {serviceError && <div className="form-error" style={{ marginBottom: '8px' }}>⚠️ {serviceError}</div>}
                  <form onSubmit={handleAddService} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', padding: '12px', border: '1px solid var(--border-color)', backgroundColor: '#fafbfc', borderRadius: '4px' }}>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Tên dịch vụ / phụ thu *</label>
                      <input 
                        type="text" 
                        placeholder="Nước ngọt mini-bar, giặt là..." 
                        style={{ padding: '6px', fontSize: '13px', border: '1px solid var(--border-color)' }}
                        value={newService.service_name}
                        onChange={(e) => setNewService(prev => ({ ...prev, service_name: e.target.value }))}
                        className={serviceError && !newService.service_name.trim() ? 'input-invalid' : ''}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Đơn giá (VND) *</label>
                      <input 
                        type="number" 
                        placeholder="20000" 
                        style={{ padding: '6px', fontSize: '13px', border: '1px solid var(--border-color)' }}
                        value={newService.price}
                        onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                        className={serviceError && (!newService.price || parseFloat(newService.price) <= 0) ? 'input-invalid' : ''}
                      />
                    </div>
                    <div style={{ width: '70px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Số lượng</label>
                      <input 
                        type="number" 
                        min="1"
                        style={{ padding: '6px', fontSize: '13px', border: '1px solid var(--border-color)' }}
                        value={newService.quantity}
                        onChange={(e) => setNewService(prev => ({ ...prev, quantity: parseInt(e.target.value, 10) }))}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '13px' }}>
                      <PlusCircle size={14} /> Thêm dịch vụ
                    </button>
                  </form>
                </div>
              )}

              {/* Tổng hóa đơn thanh toán */}
              <div className="confirmation-slip" style={{ borderStyle: 'solid', borderColor: 'var(--primary-blue)', marginTop: '20px', backgroundColor: '#f0f4f8' }}>
                <div className="slip-total" style={{ fontSize: '18px' }}>
                  <span>TỔNG CỘNG HÓA ĐƠN THANH TOÁN:</span>
                  <span style={{ fontSize: '22px' }}>{formatVND(calculateInvoiceTotal())}</span>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <div style={{ marginRight: 'auto', display: 'flex', gap: '8px' }}>
                {selectedBooking.status === 'booked' && (
                  <>
                    <button className="btn btn-primary" onClick={() => handleCheckIn(selectedBooking.id)}>
                      <LogIn size={16} /> Nhận phòng (Check-in)
                    </button>
                    <button className="btn btn-danger" onClick={() => handleCancelBooking(selectedBooking.id)}>
                      <XCircle size={16} /> Hủy đặt phòng
                    </button>
                  </>
                )}
                {selectedBooking.status === 'checked_in' && (
                  <button className="btn btn-accent" onClick={() => handleCheckOut(selectedBooking.id)}>
                    <LogOut size={16} /> Trả phòng & Thanh toán
                  </button>
                )}
              </div>
              <button className="btn btn-outline" onClick={handleCloseDetails}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bookings;
