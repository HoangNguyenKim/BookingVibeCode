import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RefreshCw, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

function Timeline({ onOpenBooking }) {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date()); // Bắt đầu từ hôm nay
  const [daysCount] = useState(15); // Hiển thị 15 ngày tiếp theo

  const loadData = async () => {
    setLoading(true);
    try {
      const roomsData = await api.getRooms();
      setRooms(roomsData);
      
      // Lấy danh sách booking (tất cả các trạng thái active)
      const bookingsData = await api.getBookings();
      setBookings(bookingsData.filter(b => b.status !== 'cancelled'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const changeStartDate = (days) => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    setStartDate(newDate);
  };

  // Tạo danh sách các ngày để render header
  const getDatesArray = () => {
    const dates = [];
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = getDatesArray();

  const getDayName = (date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Tìm booking của một phòng tại một ngày cụ thể
  const findBookingForRoomAndDate = (roomId, date) => {
    const dStr = date.toISOString().split('T')[0];
    return bookings.find(b => {
      if (b.room_id !== roomId) return false;
      const checkInStr = new Date(b.check_in_date).toISOString().split('T')[0];
      const checkOutStr = new Date(b.check_out_date).toISOString().split('T')[0];
      return dStr >= checkInStr && dStr < checkOutStr; // Khách ở từ check-in đến trước ngày check-out
    });
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
          <h2>Lịch đặt phòng (Timeline)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sơ đồ trực quan Gantt hiển thị lịch lấp đầy phòng trong {daysCount} ngày</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-outline btn-xs" onClick={() => changeStartDate(-7)} style={{ display: 'flex', gap: '4px' }}>
            <ChevronLeft size={16} /> 7 ngày trước
          </button>
          <button className="btn btn-outline btn-xs" onClick={() => setStartDate(new Date())}>
            Hôm nay
          </button>
          <button className="btn btn-outline btn-xs" onClick={() => changeStartDate(7)}>
            7 ngày sau <ChevronRight size={16} />
          </button>
          <button className="btn btn-outline" onClick={loadData} style={{ marginLeft: '10px' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="timeline-scroller">
          <table className="timeline-table">
            <thead>
              <tr>
                <th className="room-col">Phòng</th>
                {dates.map((date, index) => (
                  <th 
                    key={index} 
                    className={isToday(date) ? 'today-col' : ''}
                    style={{ minWidth: '60px' }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{getDayName(date)}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{date.getDate()}</div>
                    <div style={{ fontSize: '9px', fontWeight: 'normal' }}>Th{date.getMonth() + 1}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => {
                const rowCells = [];
                for (let i = 0; i < daysCount; i++) {
                  const currentDate = dates[i];
                  const booking = findBookingForRoomAndDate(room.id, currentDate);

                  if (booking) {
                    const checkInStr = new Date(booking.check_in_date).toISOString().split('T')[0];
                    const curStr = currentDate.toISOString().split('T')[0];

                    // Chỉ vẽ thanh timeline ở ngày bắt đầu (Check-in) hoặc ở cột đầu tiên của bảng hiển thị
                    if (curStr === checkInStr || i === 0) {
                      // Tính xem booking này kéo dài bao nhiêu ngày trong khoảng 15 ngày hiển thị
                      const checkOutStr = new Date(booking.check_out_date).toISOString().split('T')[0];
                      let span = 0;
                      
                      // Đếm số ngày overlap bắt đầu từ ngày i hiện tại
                      for (let j = i; j < daysCount; j++) {
                        const cellDateStr = dates[j].toISOString().split('T')[0];
                        if (cellDateStr >= checkInStr && cellDateStr < checkOutStr) {
                          span++;
                        } else {
                          break;
                        }
                      }

                      rowCells.push(
                        <td 
                          key={i} 
                          colSpan={span} 
                          style={{ padding: 0, position: 'relative', height: '48px', verticalAlign: 'middle' }}
                        >
                          <div 
                            className={`timeline-bar ${booking.status}`}
                            onClick={() => onOpenBooking(booking.id)}
                            title={`${booking.guest_name} | Phòng ${room.room_number} (${room.room_type_name})\nCheck-in: ${new Date(booking.check_in_date).toLocaleDateString('vi-VN')}\nCheck-out: ${new Date(booking.check_out_date).toLocaleDateString('vi-VN')}`}
                            style={{ cursor: 'pointer' }}
                          >
                            👤 {booking.guest_name} ({booking.status === 'checked_in' ? 'Đang ở' : 'Đặt trước'})
                          </div>
                        </td>
                      );

                      // Nhảy qua các ngày đã gộp
                      i += (span - 1);
                    } else {
                      // Bỏ qua cột này vì nó đã bị gộp vào ngày check-in trước đó
                    }
                  } else {
                    // Cột trống
                    rowCells.push(
                      <td 
                        key={i} 
                        className={isToday(currentDate) ? 'today-col' : ''}
                        style={{ height: '48px' }}
                      ></td>
                    );
                  }
                }

                return (
                  <tr key={room.id}>
                    <td className="room-col">
                      <div className="font-bold">P. {room.room_number}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{room.room_type_name}</div>
                    </td>
                    {rowCells}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '16px', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '15px', height: '15px', borderRadius: '3px', backgroundColor: 'var(--status-booked-color)' }}></span>
          <span>Phòng đã đặt trước</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '15px', height: '15px', borderRadius: '3px', backgroundColor: 'var(--status-occupied-color)' }}></span>
          <span>Khách đang lưu trú (Checked-In)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '15px', height: '15px', borderRadius: '3px', backgroundColor: 'var(--text-muted)' }}></span>
          <span>Khách đã trả phòng (Checked-Out)</span>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
