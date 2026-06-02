import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Bed, 
  DollarSign, 
  Percent, 
  Calendar, 
  LogIn, 
  LogOut, 
  RefreshCw, 
  Sparkles, 
  Phone,
  User
} from 'lucide-react';

function Dashboard({ onOpenBooking }) {
  const [stats, setStats] = useState(null);
  const [actions, setActions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('arrivals'); // 'arrivals', 'departures', 'cleaning'

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const statsData = await api.getDashboardStats();
      const actionsData = await api.getTodayActions();
      setStats(statsData);
      setActions(actionsData);
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối đến cơ sở dữ liệu. Vui lòng kiểm tra lại SQL Server và Backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckIn = async (bookingId) => {
    try {
      await api.checkInBooking(bookingId);
      loadData();
    } catch (err) {
      alert(err.message || 'Lỗi khi thực hiện Check-in');
    }
  };

  const handleCheckOut = async (bookingId) => {
    if (window.confirm('Bạn có chắc chắn muốn thực hiện Check-out cho phòng này?')) {
      try {
        await api.checkOutBooking(bookingId);
        loadData();
        if (onOpenBooking) {
          onOpenBooking(bookingId); // Mở hóa đơn chi tiết để admin xem
        }
      } catch (err) {
        alert(err.message || 'Lỗi khi thực hiện Check-out');
      }
    }
  };

  const handleMarkCleaned = async (roomId) => {
    try {
      await api.updateRoomStatus(roomId, 'available');
      loadData();
    } catch (err) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái phòng');
    }
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '15px' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: '#003580' }} />
        <p>Đang tải dữ liệu hệ thống...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h2>Tổng quan hoạt động</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className="btn btn-outline" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {error && (
        <div className="alert-box">
          <p>⚠️ <strong>Lỗi kết nối cơ sở dữ liệu:</strong> {error}</p>
          <p style={{ marginTop: '5px', fontSize: '12px' }}>Đảm bảo bạn đã khởi chạy SQL Server, chạy file schema.sql để tạo các bảng, và khởi động API server ở backend.</p>
        </div>
      )}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-info">
              <h4>Phòng đang ở (Occupied)</h4>
              <div className="stat-value">{stats.occupiedCount} / {stats.totalRooms}</div>
            </div>
            <div className="stat-icon">
              <Bed size={22} />
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-info">
              <h4>Lượt Check-in hôm nay</h4>
              <div className="stat-value">{stats.todayCheckins}</div>
            </div>
            <div className="stat-icon">
              <LogIn size={22} />
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-info">
              <h4>Lượt Check-out hôm nay</h4>
              <div className="stat-value">{stats.todayCheckouts}</div>
            </div>
            <div className="stat-icon">
              <LogOut size={22} />
            </div>
          </div>

          <div className="stat-card yellow">
            <div className="stat-info">
              <h4>Doanh thu tháng này</h4>
              <div className="stat-value" style={{ fontSize: '20px' }}>{formatVND(stats.totalRevenue)}</div>
            </div>
            <div className="stat-icon">
              <DollarSign size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs Tác vụ hôm nay */}
      <div className="card">
        <div className="card-title">
          📋 Công việc cần xử lý hôm nay
        </div>

        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', paddingBottom: '2px' }}>
          <button 
            className={`btn btn-xs ${activeTab === 'arrivals' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('arrivals')}
            style={{ borderRadius: '2px', borderBottom: activeTab === 'arrivals' ? '2px solid var(--accent-yellow)' : '' }}
          >
            📥 Khách đến nhận phòng ({actions?.arrivals?.length || 0})
          </button>
          <button 
            className={`btn btn-xs ${activeTab === 'departures' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('departures')}
            style={{ borderRadius: '2px', borderBottom: activeTab === 'departures' ? '2px solid var(--accent-yellow)' : '' }}
          >
            📤 Khách trả phòng thanh toán ({actions?.departures?.length || 0})
          </button>
          <button 
            className={`btn btn-xs ${activeTab === 'cleaning' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('cleaning')}
            style={{ borderRadius: '2px', borderBottom: activeTab === 'cleaning' ? '2px solid var(--accent-yellow)' : '' }}
          >
            🧹 Phòng cần dọn dẹp ({actions?.cleaningRooms?.length || 0})
          </button>
        </div>

        {/* Tab Content: Arrivals */}
        {activeTab === 'arrivals' && (
          <div className="table-container">
            {actions?.arrivals?.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Hôm nay không có lượt nhận phòng dự kiến nào.</p>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Số điện thoại</th>
                    <th>Phòng</th>
                    <th>Loại phòng</th>
                    <th>Ngày đi</th>
                    <th>Tạm tính</th>
                    <th className="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {actions?.arrivals.map((arrival) => (
                    <tr key={arrival.id}>
                      <td className="font-bold">{arrival.guest_name}</td>
                      <td>{arrival.guest_phone}</td>
                      <td><span className="badge checked_in">Phòng {arrival.room_number}</span></td>
                      <td>{arrival.room_type_name}</td>
                      <td>{new Date(arrival.check_out_date).toLocaleDateString('vi-VN')}</td>
                      <td className="font-bold">{formatVND(arrival.total_price)}</td>
                      <td className="text-right">
                        <button className="btn btn-primary btn-xs" onClick={() => handleCheckIn(arrival.id)}>
                          <LogIn size={12} /> Check-In
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab Content: Departures */}
        {activeTab === 'departures' && (
          <div className="table-container">
            {actions?.departures?.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Hôm nay không có lượt trả phòng dự kiến nào.</p>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Số điện thoại</th>
                    <th>Phòng</th>
                    <th>Loại phòng</th>
                    <th>Ngày đến</th>
                    <th>Tạm tính</th>
                    <th className="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {actions?.departures.map((departure) => (
                    <tr key={departure.id}>
                      <td className="font-bold">{departure.guest_name}</td>
                      <td>{departure.guest_phone}</td>
                      <td><span className="badge booked">Phòng {departure.room_number}</span></td>
                      <td>{departure.room_type_name}</td>
                      <td>{new Date(departure.check_in_date).toLocaleDateString('vi-VN')}</td>
                      <td className="font-bold">{formatVND(departure.total_price)}</td>
                      <td className="text-right">
                        <button className="btn btn-accent btn-xs" onClick={() => handleCheckOut(departure.id)}>
                          <LogOut size={12} /> Trả phòng & In Hóa đơn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab Content: Cleaning */}
        {activeTab === 'cleaning' && (
          <div className="table-container">
            {actions?.cleaningRooms?.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Tất cả các phòng đã được dọn dẹp sạch sẽ!</p>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Số phòng</th>
                    <th>Tầng</th>
                    <th>Loại phòng</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {actions?.cleaningRooms.map((room) => (
                    <tr key={room.id}>
                      <td className="font-bold">Phòng {room.room_number}</td>
                      <td>Tầng {room.floor}</td>
                      <td>{room.room_type_name}</td>
                      <td><span className="badge cleaning">Cần dọn dẹp</span></td>
                      <td className="text-right">
                        <button className="btn btn-primary btn-xs" onClick={() => handleMarkCleaned(room.id)}>
                          <Sparkles size={12} /> Đã dọn dẹp xong
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
