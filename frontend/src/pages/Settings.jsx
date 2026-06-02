import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RefreshCw, Plus, Trash2, Key, Database, Home, Settings as SettingsIcon } from 'lucide-react';

function Settings() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showAddRoomType, setShowAddRoomType] = useState(false);
  const [newRoomType, setNewRoomType] = useState({ name: '', price_per_night: '', capacity: 2, description: '' });
  const [roomTypeErrors, setRoomTypeErrors] = useState({});
  
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ room_number: '', floor: '', room_type_id: '', status: 'available' });
  const [roomErrors, setRoomErrors] = useState({});

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm
    });
  };

  const toast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
  };

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const types = await api.getRoomTypes();
      setRoomTypes(types);
      const roomsData = await api.getRooms();
      setRooms(roomsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleAddRoomType = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newRoomType.name.trim()) {
      errors.name = 'Vui lòng nhập tên loại phòng.';
    }
    if (!newRoomType.price_per_night || parseFloat(newRoomType.price_per_night) <= 0) {
      errors.price_per_night = 'Vui lòng nhập giá tiền hợp lệ lớn hơn 0.';
    }
    if (!newRoomType.capacity || parseInt(newRoomType.capacity, 10) <= 0) {
      errors.capacity = 'Sức chứa tối thiểu là 1 người.';
    }

    if (Object.keys(errors).length > 0) {
      setRoomTypeErrors(errors);
      return;
    }

    setRoomTypeErrors({});
    try {
      await api.createRoomType(newRoomType);
      toast('Thêm loại phòng mới thành công!', 'success');
      setShowAddRoomType(false);
      setNewRoomType({ name: '', price_per_night: '', capacity: 2, description: '' });
      loadSettingsData();
    } catch (err) {
      toast(err.message || 'Lỗi thêm loại phòng.', 'error');
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newRoom.room_number.trim()) {
      errors.room_number = 'Vui lòng nhập số phòng.';
    }
    if (!newRoom.floor || parseInt(newRoom.floor, 10) <= 0) {
      errors.floor = 'Vui lòng nhập tầng hợp lệ (số dương).';
    }
    if (!newRoom.room_type_id) {
      errors.room_type_id = 'Vui lòng chọn loại phòng.';
    }

    if (Object.keys(errors).length > 0) {
      setRoomErrors(errors);
      return;
    }

    setRoomErrors({});
    try {
      await api.createRoom(newRoom);
      toast('Thêm phòng mới thành công!', 'success');
      setShowAddRoom(false);
      setNewRoom({ room_number: '', floor: '', room_type_id: '', status: 'available' });
      loadSettingsData();
    } catch (err) {
      toast(err.message || 'Lỗi thêm phòng.', 'error');
    }
  };

  const handleDeleteRoom = async (roomId, roomNumber) => {
    showConfirm(
      'Xóa phòng',
      `Bạn có chắc chắn muốn xóa phòng ${roomNumber} khỏi hệ thống?`,
      async () => {
        try {
          await api.deleteRoom(roomId);
          toast(`Xóa thành công phòng ${roomNumber}!`, 'success');
          loadSettingsData();
        } catch (err) {
          toast(err.message || 'Lỗi khi xóa phòng. Có thể phòng đã có lịch đặt trước.', 'error');
        }
      }
    );
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

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h2>Thiết lập cấu hình hệ thống</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Quản lý danh sách phòng, loại phòng và thông số cài đặt cơ sở dữ liệu</p>
        </div>
        <button className="btn btn-outline" onClick={loadSettingsData}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      <div className="grid-2">
        {/* Column 1: Quản lý loại phòng */}
        <div className="card">
          <div className="flex-between mb-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <span className="card-title" style={{ margin: 0 }}>
              <Key size={18} /> Danh sách loại phòng
            </span>
            <button className="btn btn-primary btn-xs" onClick={() => setShowAddRoomType(true)}>
              <Plus size={14} /> Thêm loại
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Tên loại phòng</th>
                  <th>Giá / Đêm</th>
                  <th className="text-center">Sức chứa</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map(type => (
                  <tr key={type.id}>
                    <td className="font-bold">{type.name}</td>
                    <td className="font-bold" style={{ color: 'var(--status-occupied-color)' }}>{formatVND(type.price_per_night)}</td>
                    <td className="text-center">{type.capacity} khách</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 2: Quản lý danh sách phòng */}
        <div className="card">
          <div className="flex-between mb-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <span className="card-title" style={{ margin: 0 }}>
              <Home size={18} /> Danh sách phòng cụ thể
            </span>
            <button className="btn btn-primary btn-xs" onClick={() => setShowAddRoom(true)}>
              <Plus size={14} /> Thêm phòng
            </button>
          </div>

          <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="custom-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Số phòng</th>
                  <th>Tầng</th>
                  <th>Loại phòng</th>
                  <th className="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id}>
                    <td className="font-bold">Phòng {room.room_number}</td>
                    <td>Tầng {room.floor}</td>
                    <td>{room.room_type_name}</td>
                    <td className="text-right">
                      <button 
                        className="btn btn-danger btn-xs"
                        onClick={() => handleDeleteRoom(room.id, room.room_number)}
                        style={{ padding: '4px 6px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 2: Hướng dẫn cấu hình SQL Server */}
      <div className="card">
        <span className="card-title">
          <Database size={18} style={{ color: 'var(--secondary-blue)' }} /> Hướng dẫn kết nối cơ sở dữ liệu SQL Server
        </span>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p>Hệ thống hiện tại đang sử dụng cơ sở dữ liệu Microsoft SQL Server. Để kết nối thành công và tải dữ liệu lên giao diện:</p>
          <ol style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong>Khởi chạy SQL Server:</strong> Đảm bảo dịch vụ SQL Server (MSSQLSERVER) đang hoạt động trong máy của bạn (có thể kiểm tra bằng <em>services.msc</em>).
            </li>
            <li>
              <strong>Mở cổng kết nối:</strong> Bật giao thức <strong>TCP/IP</strong> và đặt cổng mặc định <strong>1433</strong> trong <em>SQL Server Configuration Manager</em> (mục SQL Server Network Configuration).
            </li>
            <li>
              <strong>Tạo cơ sở dữ liệu:</strong> Mở phần mềm SSMS (SQL Server Management Studio), kết nối với SQL Server, tạo mới một database tên là <code>HotelBookingDB</code>.
            </li>
            <li>
              <strong>Cài đặt cấu trúc bảng & Dữ liệu mẫu:</strong>
              <ul style={{ paddingLeft: '20px', listStyleType: 'circle', marginTop: '4px' }}>
                <li>Chạy script trong file <code>backend/schema.sql</code> để tự động tạo cấu trúc các bảng.</li>
                <li>Chạy script trong file <code>backend/seed.sql</code> để tạo sẵn 12 phòng và 4 lịch đặt phòng mẫu hiển thị ngay lập tức.</li>
              </ul>
            </li>
            <li>
              <strong>Cấu hình File Môi trường:</strong> Kiểm tra lại file <code>backend/.env</code> đã điền đúng thông số đăng nhập (Tài khoản SQL Server <code>sa</code> và mật khẩu của bạn).
            </li>
          </ol>
        </div>
      </div>

      {/* Modal: Thêm loại phòng */}
      {showAddRoomType && (
        <div className="modal-overlay" onClick={() => { setShowAddRoomType(false); setRoomTypeErrors({}); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm loại phòng mới</h3>
              <button className="close-btn" onClick={() => { setShowAddRoomType(false); setRoomTypeErrors({}); }}>&times;</button>
            </div>
            <form onSubmit={handleAddRoomType}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tên loại phòng *</label>
                  <input 
                    type="text" 
                    value={newRoomType.name}
                    onChange={(e) => setNewRoomType(prev => ({ ...prev, name: e.target.value }))}
                    className={roomTypeErrors.name ? 'input-invalid' : ''}
                    placeholder="Deluxe Double, Standard Family..."
                  />
                  {roomTypeErrors.name && <span className="form-error">{roomTypeErrors.name}</span>}
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Giá tiền / đêm (VND) *</label>
                    <input 
                      type="number" 
                      value={newRoomType.price_per_night}
                      onChange={(e) => setNewRoomType(prev => ({ ...prev, price_per_night: e.target.value }))}
                      className={roomTypeErrors.price_per_night ? 'input-invalid' : ''}
                      placeholder="800000"
                    />
                    {roomTypeErrors.price_per_night && <span className="form-error">{roomTypeErrors.price_per_night}</span>}
                  </div>
                  <div className="form-group">
                    <label>Sức chứa tối đa (Khách) *</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={newRoomType.capacity}
                      onChange={(e) => setNewRoomType(prev => ({ ...prev, capacity: parseInt(e.target.value, 10) }))}
                      className={roomTypeErrors.capacity ? 'input-invalid' : ''}
                    />
                    {roomTypeErrors.capacity && <span className="form-error">{roomTypeErrors.capacity}</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label>Mô tả ngắn</label>
                  <textarea 
                    value={newRoomType.description}
                    onChange={(e) => setNewRoomType(prev => ({ ...prev, description: e.target.value }))}
                    rows="3"
                    placeholder="Các tiện nghi đi kèm, view phòng..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowAddRoomType(false); setRoomTypeErrors({}); }}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary">Lưu loại phòng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Thêm phòng cụ thể */}
      {showAddRoom && (
        <div className="modal-overlay" onClick={() => { setShowAddRoom(false); setRoomErrors({}); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm phòng mới</h3>
              <button className="close-btn" onClick={() => { setShowAddRoom(false); setRoomErrors({}); }}>&times;</button>
            </div>
            <form onSubmit={handleAddRoom}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Số phòng *</label>
                    <input 
                      type="text" 
                      value={newRoom.room_number}
                      onChange={(e) => setNewRoom(prev => ({ ...prev, room_number: e.target.value }))}
                      className={roomErrors.room_number ? 'input-invalid' : ''}
                      placeholder="304, 401..."
                    />
                    {roomErrors.room_number && <span className="form-error">{roomErrors.room_number}</span>}
                  </div>
                  <div className="form-group">
                    <label>Tầng *</label>
                    <input 
                      type="number" 
                      value={newRoom.floor}
                      onChange={(e) => setNewRoom(prev => ({ ...prev, floor: e.target.value }))}
                      className={roomErrors.floor ? 'input-invalid' : ''}
                      placeholder="3"
                    />
                    {roomErrors.floor && <span className="form-error">{roomErrors.floor}</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label>Loại phòng *</label>
                  <select 
                    value={newRoom.room_type_id}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, room_type_id: e.target.value }))}
                    className={roomErrors.room_type_id ? 'input-invalid' : ''}
                  >
                    <option value="">-- Chọn loại phòng --</option>
                    {roomTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name} ({formatVND(type.price_per_night)}/đêm)</option>
                    ))}
                  </select>
                  {roomErrors.room_type_id && <span className="form-error">{roomErrors.room_type_id}</span>}
                </div>
                <div className="form-group">
                  <label>Trạng thái ban đầu</label>
                  <select 
                    value={newRoom.status}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="available">Trống (Sẵn sàng)</option>
                    <option value="maintenance">Đang bảo trì</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowAddRoom(false); setRoomErrors({}); }}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary">Lưu phòng mới</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận tùy chỉnh */}
      {confirmModal.show && (
        <div className="modal-overlay" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--primary-blue)' }}>{confirmModal.title}</h3>
              <button className="close-btn" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 0', fontSize: '14px', lineHeight: '1.5' }}>
              {confirmModal.message}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '10px', paddingTop: '15px' }}>
              <button className="btn btn-outline" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>Hủy bỏ</button>
              <button className="btn btn-danger" onClick={() => {
                confirmModal.onConfirm();
                setConfirmModal(prev => ({ ...prev, show: false }));
              }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
