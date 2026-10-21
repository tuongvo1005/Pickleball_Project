import { useState, useEffect } from 'react';
import axios from 'axios';
import CourtGrid from '../components/CourtGrid';

const Home = () => {
  const getTodayString = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };

  const [locationInput, setLocationInput] = useState('');
  const [date, setDate] = useState(getTodayString()); // Set default value to today
  const [time, setTime] = useState('Tất cả các giờ');
  
  // Danh sách sân thực tế lấy từ Database
  const [courtsList, setCourtsList] = useState([]);

  // State chứa từ khóa tìm kiếm chính thức (chỉ cập nhật khi bấm nút)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('Tất cả các giờ');
  const [searchDate, setSearchDate] = useState(getTodayString());

  const [currentTime, setCurrentTime] = useState('');
  const [weather, setWeather] = useState({
    temp: 28,
    desc: 'Nắng nhẹ',
    icon: 'partly_cloudy_day',
    recommendation: 'Lý tưởng cho sân ngoài trời'
  });

  // Tải danh sách tất cả sân chơi từ Database để hiển thị vào ô Select Tìm kiếm
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/courts')
      .then(res => {
        if (res.data?.success || Array.isArray(res.data?.data)) {
          setCourtsList(res.data.data || []);
        }
      })
      .catch(err => console.error("Lỗi lấy danh sách sân cho dropdown tìm kiếm:", err));
  }, []);

  // Đồng hồ chạy thực tế
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const dateStr = String(now.getDate()).padStart(2, '0');
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setCurrentTime(`${hours}:${minutes}:${seconds} - ${dateStr}/${monthStr}/${year}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Lấy thời tiết thực tế từ Open-Meteo API
  useEffect(() => {
    axios.get('https://api.open-meteo.com/v1/forecast?latitude=10.823&longitude=106.6296&current_weather=true')
      .then(response => {
        const cur = response.data?.current_weather;
        if (cur) {
          const temp = Math.round(cur.temperature);
          const code = cur.weathercode;
          
          // Kiểm tra xem hiện tại là ban đêm hay ban ngày (Dựa vào API hoặc giờ hệ thống)
          const hour = new Date().getHours();
          const isNight = cur.is_day === 0 || hour >= 18 || hour < 6;
          
          let desc = isNight ? 'Đêm nhiều mây' : 'Nắng nhẹ';
          let icon = isNight ? 'partly_cloudy_night' : 'partly_cloudy_day';
          let recommendation = isNight ? 'Thời tiết mát mẻ về đêm - Rất thích hợp chơi bóng!' : 'Lý tưởng cho sân ngoài trời';

          if (code === 0) {
            desc = isNight ? 'Trời quang / Đêm không mây' : 'Trời quang / Nắng';
            icon = isNight ? 'nights_stay' : 'sunny';
          } else if (code >= 1 && code <= 3) {
            desc = isNight ? 'Đêm ít mây' : 'Có mây nhẹ';
            icon = isNight ? 'partly_cloudy_night' : 'partly_cloudy_day';
          } else if (code >= 45 && code <= 48) {
            desc = 'Sương mù';
            icon = 'foggy';
          } else if (code >= 51 && code <= 67) {
            desc = 'Mưa phùn / Mưa rào';
            icon = 'rainy';
          } else if (code >= 80 && code <= 82) {
            desc = 'Mưa lớn';
            icon = 'rainy';
          } else if (code >= 95) {
            desc = 'Dông bão';
            icon = 'thunderstorm';
          }

          // Gợi ý đặt sân theo thời tiết thực tế
          if (icon === 'rainy' || icon === 'thunderstorm') {
            recommendation = 'Trời đang mưa - Hãy chọn Sân trong nhà (Indoor)';
          } else if (temp > 33) {
            recommendation = 'Thời tiết khá nóng - Ưu tiên đặt sân Trong nhà để mát mẻ';
          } else if (temp < 25) {
            recommendation = isNight 
              ? 'Thời tiết đêm se lạnh - Rất mát mẻ cho Sân ngoài trời' 
              : 'Thời tiết mát mẻ - Cực kỳ tuyệt vời cho Sân ngoài trời';
          } else {
            recommendation = isNight 
              ? 'Thời tiết tối mát mẻ - Rất lý tưởng để chơi bóng ngoài trời!' 
              : 'Thời tiết lý tưởng cho các hoạt động ngoài trời!';
          }

          setWeather({ temp, desc, icon, recommendation });
        }
      })
      .catch(err => {
        console.error("Lỗi khi tải thời tiết thực tế:", err);
      });
  }, []);

  const handleSearch = () => {
    // Cập nhật từ khóa tìm kiếm để truyền xuống CourtGrid
    setSearchTerm(locationInput);
    setSelectedTimeSlot(time);
    setSearchDate(date);
    
    // Tự động cuộn xuống phần hiển thị sân
    window.scrollTo({ top: 500, behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative w-full min-h-[600px] flex items-center justify-center bg-gray-900 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            alt="Pickleball Hero"
            className="w-full h-full object-cover opacity-40 blur-[3px]"
            src="https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?q=80&w=2070&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col items-center text-center mt-10">
          <div className="bg-white/20 backdrop-blur-md rounded-full px-5 py-2 mb-8 flex flex-wrap items-center justify-center gap-3 border border-white/30 shadow-sm text-white text-xs md:text-sm">
            {currentTime && (
              <div className="flex items-center gap-1.5 md:border-r border-white/20 md:pr-3">
                <span className="material-symbols-outlined text-green-400 text-[18px] animate-pulse">schedule</span>
                <span className="font-bold tracking-wider">{currentTime}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-green-400 text-[20px]">{weather.icon}</span>
              <span className="font-semibold">Hồ Chí Minh: {weather.temp}°C, {weather.desc}</span>
              <span className="opacity-80 hidden lg:inline">-</span>
              <span className="font-light opacity-90 hidden lg:inline">{weather.recommendation}</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 max-w-3xl leading-tight drop-shadow-lg">
            Đặt Sân Pickleball Trực Tuyến
          </h1>
          <p className="text-xl text-gray-200 mb-12 max-w-2xl font-light">
            Lựa chọn khung giờ vàng, đặt sân nhanh chóng và tận hưởng dịch vụ đẳng cấp tại PickleBall Pro.
          </p>

          {/* Search Box Container */}
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full flex flex-col md:flex-row gap-4 items-end max-w-5xl">
            {/* Chọn Sân */}
            <div className="flex-grow w-full md:w-1/3">
              <label className="block text-xs font-bold text-gray-500 mb-2 ml-1 tracking-widest uppercase">CHỌN SÂN</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors">sports_tennis</span>
                <select
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-gray-50 text-gray-800 appearance-none transition-all cursor-pointer"
                >
                  <option value="">Tất cả các sân</option>
                  {courtsList.length > 0 ? (
                    courtsList.map((c, idx) => (
                      <option key={c.id} value={c.name}>
                        Sân số {idx + 1}: {c.name} ({c.type === 'indoor' || c.type === 'trong-nha' ? 'Trong nhà' : 'Ngoài trời'})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Sân số 1">Sân số 1 (Ngoài trời)</option>
                      <option value="Sân số 2">Sân số 2 (Trong nhà)</option>
                      <option value="Sân số 3">Sân số 3 (Ngoài trời)</option>
                      <option value="Sân số 4">Sân số 4 (Trong nhà)</option>
                      <option value="Sân số 5">Sân số 5 (Trong nhà)</option>
                    </>
                  )}
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
              </div>
            </div>

            {/* Ngày chơi */}
            <div className="flex-grow w-full md:w-1/4">
              <label className="block text-xs font-bold text-gray-500 mb-2 ml-1 tracking-widest uppercase">NGÀY CHƠI</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors">calendar_today</span>
                <input
                  type="date"
                  value={date}
                  min={getTodayString()}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-gray-50 text-gray-800 transition-all"
                />
              </div>
            </div>

            {/* Khung giờ */}
            <div className="flex-grow w-full md:w-1/4">
              <label className="block text-xs font-bold text-gray-500 mb-2 ml-1 tracking-widest uppercase">KHUNG GIỜ</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors">schedule</span>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-gray-50 text-gray-800 appearance-none transition-all"
                >
                  <option>Tất cả các giờ</option>
                  <option>Sáng (6h - 12h)</option>
                  <option>Chiều (12h - 18h)</option>
                  <option>Tối (18h - 22h)</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
              </div>
            </div>

            {/* Nút Tìm kiếm */}
            <div className="w-full md:w-auto">
              <button
                onClick={handleSearch}
                className="w-full md:w-auto bg-green-600 text-white font-bold px-8 py-3 rounded-xl active:scale-95 transition-all hover:bg-green-700 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">search</span>
                <span className="tracking-wider">TÌM KIẾM</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Hiển thị danh sách sân từ API */}
      <CourtGrid searchTerm={searchTerm} selectedTimeSlot={selectedTimeSlot} selectedDate={searchDate} />
    </div>
  );
};

export default Home;
