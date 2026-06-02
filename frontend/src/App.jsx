import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Timeline from './pages/Timeline';
import Bookings from './pages/Bookings';
import Guests from './pages/Guests';
import Settings from './pages/Settings';
import { 
  LayoutDashboard, 
  Bed, 
  CalendarRange, 
  BookOpen, 
  Users, 
  Settings as SettingsIcon,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info as InfoIcon
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Trạng thái chia sẻ để mở popup chi tiết booking từ trang bất kỳ
  const [activeBookingId, setActiveBookingId] = useState(null);

  // Trạng thái thông báo Toast
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    const handleToast = (e) => {
      setToast(e.detail);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setToast(null);
      }, 3500);
    };
    window.addEventListener('show-toast', handleToast);
    return () => {
      window.removeEventListener('show-toast', handleToast);
      clearTimeout(timer);
    };
  }, []);

  const handleOpenBookingDetails = (bookingId) => {
    setActiveBookingId(bookingId);
    setActiveTab('bookings'); // Chuyển hướng sang trang booking để hiển thị chi tiết
  };

  const handleCloseBookingDetails = () => {
    setActiveBookingId(null);
  };

  const renderToast = () => {
    if (!toast) return null;
    const { message, type } = toast;
    
    let Icon = CheckCircle2;
    let iconColor = '#008009';
    if (type === 'error') {
      Icon = XCircle;
      iconColor = '#d32f2f';
    } else if (type === 'warning') {
      Icon = AlertTriangle;
      iconColor = '#febb02';
    } else if (type === 'info') {
      Icon = InfoIcon;
      iconColor = '#006ce4';
    }

    return (
      <div className={`toast-container ${type}`}>
        <Icon size={20} style={{ color: iconColor }} />
        <span className="toast-message">{message}</span>
      </div>
    );
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onOpenBooking={handleOpenBookingDetails} />;
      case 'rooms':
        return <Rooms onOpenBooking={handleOpenBookingDetails} />;
      case 'timeline':
        return <Timeline onOpenBooking={handleOpenBookingDetails} />;
      case 'bookings':
        return (
          <Bookings 
            activeBookingId={activeBookingId} 
            onCloseBookingDetails={handleCloseBookingDetails} 
          />
        );
      case 'guests':
        return <Guests />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onOpenBooking={handleOpenBookingDetails} />;
    }
  };

  const getPageTitleText = () => {
    switch (activeTab) {
      case 'dashboard': return 'Bảng điều khiển khách sạn';
      case 'rooms': return 'Sơ đồ phòng thực tế';
      case 'timeline': return 'Lịch đặt phòng trực quan';
      case 'bookings': return 'Danh sách phiếu đặt phòng';
      case 'guests': return 'Hồ sơ dữ liệu khách hàng';
      case 'settings': return 'Cấu hình và Hướng dẫn CSDL';
      default: return 'Khách Sạn';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          Booking<span>Admin</span>
        </div>
        <ul className="sidebar-menu">
          <li 
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); handleCloseBookingDetails(); }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => { setActiveTab('rooms'); handleCloseBookingDetails(); }}
          >
            <Bed size={18} />
            <span>Sơ đồ phòng</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => { setActiveTab('timeline'); handleCloseBookingDetails(); }}
          >
            <CalendarRange size={18} />
            <span>Sơ đồ Timeline</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('bookings'); }}
          >
            <BookOpen size={18} />
            <span>Lịch sử đặt phòng</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'guests' ? 'active' : ''}`}
            onClick={() => { setActiveTab('guests'); handleCloseBookingDetails(); }}
          >
            <Users size={18} />
            <span>Danh bạ khách</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('settings'); handleCloseBookingDetails(); }}
          >
            <SettingsIcon size={18} />
            <span>Cài đặt hệ thống</span>
          </li>
        </ul>
        <div className="sidebar-footer">
          <div>Phiên bản v1.0.0</div>
          <div>Admin Panel Khách Sạn</div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        {/* Header */}
        <header className="header">
          <div className="header-title">{getPageTitleText()}</div>
          <div className="header-user">
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-info">
              <span className="user-name">Quản trị viên</span>
              <span className="user-role">Chủ khách sạn (Admin)</span>
            </div>
          </div>
        </header>

        {/* Content Section */}
        <div className="content">
          {renderActiveView()}
        </div>
      </main>
      {renderToast()}
    </div>
  );
}

export default App;
