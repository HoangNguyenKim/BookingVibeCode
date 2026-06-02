import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Bed, ShieldAlert, Sparkles, RefreshCw, Eye } from 'lucide-react';

function Rooms({ onOpenBooking }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await api.getRooms();
      setRooms(data);
      const types = await api.getRoomTypes();
      setRoomTypes(types);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const toast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
  };

  const handleUpdateStatus = async (roomId, newStatus) => {
    try {
      await api.updateRoomStatus(roomId, newStatus);
      toast('Cập nhật trạng thái phòng thành công!', 'success');
      setSelectedRoom(null);
      loadRooms();
    } catch (err) {
      toast(err.message || 'Lỗi khi cập nhật trạng thái phòng.', 'error');
    }
  };

  // Nhóm phòng theo tầng
  const groupRoomsByFloor = (roomsList) => {
    const filtered = roomsList.filter(room => filterStatus === 'all' || room.status === filterStatus);
    const groups = {};
    filtered.forEach(room => {
      if (!groups[room.floor]) {
        groups[room.floor] = [];
      }
      groups[room.floor].push(room);
    });
    return groups;
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Trống (Sẵn sàng)';
      case 'booked': return 'Đã được đặt trước';
      case 'occupied': return 'Đang có khách ở';
      case 'cleaning': return 'Cần dọn dẹp';
      case 'maintenance': return 'Bảo trì / Sửa chữa';
      default: return status;
    }
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: '#003580' }} />
      </div>
    );
  }

  const floors = groupRoomsByFloor(rooms);

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h2>Sơ đồ phòng khách sạn</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Xem và thay đổi nhanh trạng thái vệ sinh, bảo trì phòng</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="available">Trống</option>
            <option value="booked">Đã đặt trước</option>
            <option value="occupied">Đang ở</option>
            <option value="cleaning">Cần dọn dẹp</option>
            <option value="maintenance">Đang bảo trì</option>
          </select>
          <button className="btn btn-outline" onClick={loadRooms}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Chú thích màu sắc */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '13px', fontWeight: '600' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--status-available-color)' }}></span>
            <span>Trống ({rooms.filter(r => r.status === 'available').length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--status-booked-color)' }}></span>
            <span>Đã đặt ({rooms.filter(r => r.status === 'booked').length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--status-occupied-color)' }}></span>
            <span>Đang ở ({rooms.filter(r => r.status === 'occupied').length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--status-cleaning-color)' }}></span>
            <span>Cần dọn dẹp ({rooms.filter(r => r.status === 'cleaning').length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--status-maintenance-color)' }}></span>
            <span>Bảo trì ({rooms.filter(r => r.status === 'maintenance').length})</span>
          </div>
        </div>
      </div>

      <div className="rooms-container">
        {Object.keys(floors).length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không có phòng nào khớp với trạng thái lọc.</p>
        ) : (
          Object.keys(floors).sort().map(floor => (
            <div key={floor} className="floor-section">
              <div className="floor-title">Tầng {floor}</div>
              <div className="rooms-grid">
                {floors[floor].map(room => (
                  <div 
                    key={room.id} 
                    className={`room-card ${room.status}`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="room-number">{room.room_number}</span>
                      <span className={`badge ${room.status}`} style={{ padding: '2px 6px', fontSize: '10px' }}>
                        {room.status === 'available' ? 'Trống' : room.status === 'booked' ? 'Đã đặt' : room.status === 'occupied' ? 'Đang ở' : room.status === 'cleaning' ? 'Dọn' : 'Bảo trì'}
                      </span>
                    </div>
                    <div className="room-type">{room.room_type_name}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', marginTop: 'auto' }}>
                      {formatVND(room.price_per_night)} / đêm
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal chi tiết phòng */}
      {selectedRoom && (
        <div className="modal-overlay" onClick={() => setSelectedRoom(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết phòng {selectedRoom.room_number}</h3>
              <button className="close-btn" onClick={() => setSelectedRoom(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="confirmation-slip" style={{ borderStyle: 'solid', marginTop: 0 }}>
                <div className="slip-grid">
                  <div>
                    <div className="slip-label">Số phòng</div>
                    <div className="slip-value">Phòng {selectedRoom.room_number}</div>
                  </div>
                  <div>
                    <div className="slip-label">Tầng</div>
                    <div className="slip-value">Tầng {selectedRoom.floor}</div>
                  </div>
                  <div>
                    <div className="slip-label">Loại phòng</div>
                    <div className="slip-value">{selectedRoom.room_type_name}</div>
                  </div>
                  <div>
                    <div className="slip-label">Giá cơ bản</div>
                    <div className="slip-value">{formatVND(selectedRoom.price_per_night)} / đêm</div>
                  </div>
                  <div>
                    <div className="slip-label">Sức chứa tối đa</div>
                    <div className="slip-value">{selectedRoom.capacity} khách</div>
                  </div>
                  <div>
                    <div className="slip-label">Trạng thái hiện tại</div>
                    <div className="slip-value">
                      <span className={`badge ${selectedRoom.status}`}>{getStatusText(selectedRoom.status)}</span>
                    </div>
                  </div>
                </div>
                {selectedRoom.room_type_description && (
                  <div style={{ marginTop: '12px' }}>
                    <div className="slip-label">Mô tả loại phòng</div>
                    <div className="slip-value" style={{ fontWeight: '400', fontSize: '13px' }}>{selectedRoom.room_type_description}</div>
                  </div>
                )}
              </div>

              {/* Tác vụ hành động nhanh tùy theo trạng thái phòng */}
              <h4 style={{ marginTop: '20px', marginBottom: '12px', fontSize: '14px' }}>Hành động quản lý phòng:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {selectedRoom.status === 'cleaning' && (
                  <button className="btn btn-primary" onClick={() => handleUpdateStatus(selectedRoom.id, 'available')}>
                    <Sparkles size={16} /> Đã dọn dẹp sạch (Đặt lại Trống)
                  </button>
                )}
                {selectedRoom.status === 'available' && (
                  <button className="btn btn-danger" onClick={() => handleUpdateStatus(selectedRoom.id, 'maintenance')}>
                    <ShieldAlert size={16} /> Chuyển sang diện Bảo trì
                  </button>
                )}
                {selectedRoom.status === 'maintenance' && (
                  <button className="btn btn-primary" onClick={() => handleUpdateStatus(selectedRoom.id, 'available')}>
                    <Sparkles size={16} /> Bảo trì hoàn tất (Đặt lại Trống)
                  </button>
                )}
                {(selectedRoom.status === 'occupied' || selectedRoom.status === 'booked') && (
                  <div className="alert-box info" style={{ width: '100%', margin: 0 }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ℹ️ Phòng này đang có lịch đặt phòng hoặc đang có khách lưu trú. Để thay đổi trạng thái, vui lòng xử lý trong mục đặt phòng.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedRoom(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rooms;
