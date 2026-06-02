import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, RefreshCw, User, Mail, Phone, Calendar, ClipboardList } from 'lucide-react';

function Guests() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);

  const loadGuests = async () => {
    setLoading(true);
    try {
      const data = await api.getGuests(searchTerm);
      setGuests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadGuests();
  };

  const toast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
  };

  const handleOpenDetails = async (id) => {
    try {
      const details = await api.getGuestDetails(id);
      setSelectedGuest(details);
    } catch (err) {
      toast(err.message || 'Lỗi lấy lịch sử khách hàng.', 'error');
    }
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'booked': return 'Đã đặt trước';
      case 'checked_in': return 'Đang ở';
      case 'checked_out': return 'Đã trả phòng';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const calculateTotalSpend = (history) => {
    if (!history) return 0;
    return history
      .filter(b => b.status === 'checked_out' || b.status === 'checked_in')
      .reduce((sum, b) => sum + parseFloat(b.total_price), 0);
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h2>Danh bạ khách hàng</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Quản lý thông tin khách lưu trú và xem lịch sử các lượt đặt phòng</p>
        </div>
        <button className="btn btn-outline" onClick={loadGuests}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {/* Tìm kiếm */}
      <form onSubmit={handleSearchSubmit} className="booking-search-bar" style={{ padding: '12px' }}>
        <div className="search-input-group" style={{ flex: 4 }}>
          <input 
            type="text" 
            placeholder="Tìm theo tên khách hàng, số điện thoại, số CCCD..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button type="submit" className="search-btn">
          <Search size={16} /> Tìm kiếm
        </button>
      </form>

      {/* Bảng Danh Sách */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <RefreshCw className="animate-spin" size={24} style={{ color: '#003580' }} />
            </div>
          ) : guests.length === 0 ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Không có khách hàng nào trong danh sách.</p>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tên khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Email</th>
                  <th>CCCD / Passport</th>
                  <th className="text-center">Số lượt đặt phòng</th>
                  <th className="text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody>
                {guests.map(guest => (
                  <tr key={guest.id}>
                    <td className="font-bold">{guest.full_name}</td>
                    <td>{guest.phone}</td>
                    <td>{guest.email || 'N/A'}</td>
                    <td>{guest.id_card_number || 'N/A'}</td>
                    <td className="text-center font-bold">{guest.booking_count}</td>
                    <td className="text-right">
                      <button className="btn btn-outline btn-xs" onClick={() => handleOpenDetails(guest.id)}>
                        <ClipboardList size={12} /> Xem lịch sử
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Lịch sử Khách hàng */}
      {selectedGuest && (
        <div className="modal-overlay" onClick={() => setSelectedGuest(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Hồ sơ & Lịch sử lưu trú</h3>
              <button className="close-btn" onClick={() => setSelectedGuest(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {/* Thẻ thông tin khách hàng */}
              <div className="confirmation-slip" style={{ borderStyle: 'solid', marginTop: 0 }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary-blue)' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--primary-blue)' }}>{selectedGuest.full_name}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mã khách hàng: #{selectedGuest.id}</p>
                  </div>
                </div>
                <div className="slip-grid">
                  <div>
                    <div className="slip-label">Số điện thoại</div>
                    <div className="slip-value">{selectedGuest.phone}</div>
                  </div>
                  <div>
                    <div className="slip-label">Email</div>
                    <div className="slip-value">{selectedGuest.email || 'Chưa cập nhật'}</div>
                  </div>
                  <div>
                    <div className="slip-label">Số CCCD / Passport</div>
                    <div className="slip-value">{selectedGuest.id_card_number || 'Chưa cập nhật'}</div>
                  </div>
                  <div>
                    <div className="slip-label">Tổng chi tiêu (Tiền phòng)</div>
                    <div className="slip-value" style={{ color: 'var(--status-available-color)' }}>
                      {formatVND(calculateTotalSpend(selectedGuest.history))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lịch sử đặt phòng */}
              <h4 style={{ marginTop: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '14px', color: 'var(--primary-blue)' }}>
                📅 Lịch sử các lần đặt phòng ({selectedGuest.history?.length || 0} lượt)
              </h4>

              <div className="table-container" style={{ marginTop: '10px' }}>
                {selectedGuest.history?.length === 0 ? (
                  <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Khách hàng này chưa từng đặt phòng.</p>
                ) : (
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Phòng</th>
                        <th>Loại phòng</th>
                        <th>Ngày Check-in</th>
                        <th>Ngày Check-out</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGuest.history.map(historyItem => (
                        <tr key={historyItem.id}>
                          <td>#{historyItem.id}</td>
                          <td className="font-bold">P. {historyItem.room_number}</td>
                          <td>{historyItem.room_type_name}</td>
                          <td>{new Date(historyItem.check_in_date).toLocaleDateString('vi-VN')}</td>
                          <td>{new Date(historyItem.check_out_date).toLocaleDateString('vi-VN')}</td>
                          <td className="font-bold">{formatVND(historyItem.total_price)}</td>
                          <td>
                            <span className={`badge ${historyItem.status}`}>
                              {getStatusText(historyItem.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedGuest(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Guests;
