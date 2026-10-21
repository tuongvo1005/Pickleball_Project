import { useState, useEffect } from 'react';
import axios from 'axios';
import axiosClient from '../axiosClient';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const formatPrize = (prize) => {
  if (!prize) return 'Liên hệ Ban tổ chức';
  // Nếu là chuỗi số nguyên thuần túy, định dạng tiền tệ
  if (/^\d+$/.test(prize)) {
    return Number(prize).toLocaleString('vi-VN') + 'đ';
  }
  return prize;
};

const Tournaments = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const toast = useToast();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinedIds, setJoinedIds] = useState([]);

  useEffect(() => {
    // Gọi API lấy danh sách giải đấu
    axios.get('http://127.0.0.1:8000/api/tournaments')
      .then(response => {
        const list = response.data.data || [];
        
        // Lọc bỏ các giải đấu đã kết thúc hoặc hết hạn ngày thi đấu
        const activeTournaments = list.filter(t => {
          const isFinished = t.status === 'finished';
          
          // Kiểm tra hạn ngày bế mạc (end_date) so với ngày hôm nay
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Chỉ so sánh ngày
          
          const endDate = t.end_date ? new Date(t.end_date) : null;
          if (endDate) {
            endDate.setHours(23, 59, 59, 999); // Hết ngày bế mạc mới coi là hết hạn
          }
          
          const isExpired = endDate && endDate < today;
          
          return !isFinished && !isExpired;
        });

        setTournaments(activeTournaments);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi khi lấy dữ liệu giải đấu:", err);
        setError("Không thể tải danh sách giải đấu lúc này.");
        setLoading(false);
      });
  }, []);

  const handleJoinTournament = (tournament) => {
    if (!user) {
      toast.warning('Vui lòng đăng nhập để đăng ký tham gia giải đấu!');
      navigate('/login');
      return;
    }
    if (tournament.status === 'ongoing') {
      toast.warning('Giải đấu đang diễn ra, hệ thống đã khóa đăng ký!');
      return;
    }
    if (tournament.status === 'finished') {
      toast.warning('Giải đấu đã kết thúc!');
      return;
    }
    if (joinedIds.includes(tournament.id)) {
      toast.info('Bạn đã đăng ký giải đấu này rồi!');
      return;
    }
    setSelectedTournament(tournament);
  };

  const submitJoin = async () => {
    if (!selectedTournament || joining) return;
    setJoining(true);
    try {
      await axiosClient.post(`/tournaments/${selectedTournament.id}/join`, {
        user_id: user.id
      });
      toast.success(`Đăng ký thành công! Bạn đã đăng ký giải “${selectedTournament.name}”.
Ban tổ chức sẽ liên hệ bạn sớm!`);
      setJoinedIds(prev => [...prev, selectedTournament.id]);
      // Cập nhật số người tham gia hiển thị
      setTournaments(prev => prev.map(t =>
        t.id === selectedTournament.id
          ? { ...t, participants_count: (t.participants_count || 0) + 1 }
          : t
      ));
      setSelectedTournament(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi đăng ký.';
      if (msg.includes('đã đăng ký')) {
        toast.info('Bạn đã đăng ký giải đấu này rồi!');
        setJoinedIds(prev => [...prev, selectedTournament.id]);
      } else {
        toast.error(msg);
      }
      setSelectedTournament(null);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Hero Banner Giải Đấu */}
      <section className="relative w-full h-[350px] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Tournaments Banner"
            className="w-full h-full object-cover opacity-40 blur-[3px]"
            src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        <div className="relative z-10 text-center px-4 mt-10">
          <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Hệ thống giải đấu</span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">
            Đỉnh Cao Tranh Tài
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto font-light">
            Tham gia các giải đấu Pickleball chuyên nghiệp và phong trào. Khẳng định bản lĩnh và giành giải thưởng hấp dẫn!
          </p>
        </div>
      </section>

      {/* Danh sách giải đấu */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900">Các Giải Đấu Pickleball</h2>
          <div className="w-24 h-1 bg-orange-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <span className="material-symbols-outlined animate-spin text-5xl text-orange-500 mb-4">refresh</span>
            <span className="text-gray-500 font-medium">Đang tải lịch thi đấu...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-red-300 block mb-4">error</span>
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="material-symbols-outlined text-6xl text-gray-300 block mb-4">emoji_events</span>
            <p className="text-gray-500 text-lg">Hiện tại chưa có giải đấu nào được lên lịch.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col md:flex-row group">
                
                {/* Ngày tháng (Box bên trái) */}
                <div className="w-full md:w-48 bg-gradient-to-br from-orange-50 to-orange-100 border-r border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-1">Khởi tranh</span>
                  <span className="text-4xl font-black text-gray-900">{new Date(tournament.start_date).getDate()}</span>
                  <span className="text-lg font-medium text-gray-700 mb-2">Tháng {new Date(tournament.start_date).getMonth() + 1}</span>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border border-orange-200 shadow-sm">
                    {new Date(tournament.start_date).getFullYear()}
                  </span>
                </div>

                {/* Thông tin giải đấu */}
                <div className="p-6 md:p-8 flex-grow flex flex-col justify-center">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{tournament.name}</h3>
                    {/* Badge trạng thái tự động theo ngày */}
                    {tournament.status === 'ongoing' ? (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold px-3 py-1 rounded-full whitespace-nowrap animate-pulse flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        Đang diễn ra
                      </span>
                    ) : tournament.status === 'finished' ? (
                      <span className="bg-gray-100 text-gray-600 border border-gray-200 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        Đã kết thúc
                      </span>
                    ) : (
                      <span className="bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        Sắp diễn ra (Mở đăng ký)
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-6 max-w-2xl">
                    {tournament.description || "Đây là giải đấu thường niên thu hút đông đảo các tay vợt xuất sắc từ mọi miền tham dự."}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400">event</span>
                      <span className="text-gray-700">{new Date(tournament.end_date).toLocaleDateString('vi-VN')} (Bế mạc)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400">group</span>
                      <span className="text-gray-700">Tối đa: <strong className="text-gray-900">{tournament.max_participants || 'Không giới hạn'}</strong> đội</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400">location_on</span>
                      <span className="text-gray-700 truncate" title={tournament.location || 'TP. Hồ Chí Minh'}>
                        {tournament.location || 'TP. Hồ Chí Minh'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-orange-500">payments</span>
                      <span className="text-gray-700">Tổng giải thưởng: <strong className="text-orange-600 text-base">{formatPrize(tournament.prize)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Cột Action */}
                <div className="w-full md:w-56 p-6 bg-gray-50 flex flex-col items-center justify-center border-l border-gray-100">
                  {tournament.status === 'ongoing' ? (
                    <>
                      <p className="text-xs text-amber-700 mb-3 text-center font-bold">⚠️ Giải đang diễn ra</p>
                      <div className="w-full bg-amber-100 text-amber-800 font-bold py-3 px-4 rounded-xl text-center text-xs select-none cursor-not-allowed border border-amber-200">
                        Đã khóa đăng ký
                      </div>
                    </>
                  ) : tournament.status === 'finished' ? (
                    <>
                      <p className="text-xs text-gray-500 mb-3 text-center font-bold">🏁 Giải đấu đã kết thúc</p>
                      <div className="w-full bg-gray-200 text-gray-500 font-bold py-3 px-4 rounded-xl text-center text-xs select-none cursor-not-allowed">
                        Đã đóng giải
                      </div>
                    </>
                  ) : tournament.max_participants && tournament.participants_count >= tournament.max_participants ? (
                    <>
                      <p className="text-xs text-red-500 mb-3 text-center font-bold">❌ Đã đủ số lượng đội!</p>
                      <div className="w-full bg-gray-200 text-gray-400 font-bold py-3 px-4 rounded-xl text-center text-xs select-none cursor-not-allowed">
                        Đã đủ suất
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 mb-3 text-center font-medium">Chỉ còn vài suất trống, hãy nhanh tay!</p>
                      <button 
                        type="button"
                        onClick={() => handleJoinTournament(tournament)}
                        className="w-full bg-orange-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-orange-600 hover:shadow-lg transition-all flex justify-center items-center gap-1.5 cursor-pointer border-0 text-xs"
                      >
                        Tham gia ngay
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL ĐĂNG KÝ GIẢI ĐẤU */}
      {selectedTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-orange-500 p-6 text-white text-center relative">
              <button onClick={() => setSelectedTournament(null)} className="absolute top-4 right-4 text-white/70 hover:text-white transition">
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl">emoji_events</span>
              </div>
              <h3 className="text-xl font-bold">Phiếu Đăng Ký Thi Đấu</h3>
              <p className="text-orange-100 text-sm mt-1">{selectedTournament.name}</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên / Tên đội</label>
                  <input type="text" placeholder="Nhập tên của bạn hoặc đội" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại liên hệ</label>
                  <input type="tel" placeholder="09xx xxx xxx" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung thi đấu</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500">
                    <option>Đơn Nam</option>
                    <option>Đơn Nữ</option>
                    <option>Đôi Nam Nữ</option>
                  </select>
                </div>
              </div>
              
              <button 
                onClick={submitJoin}
                disabled={joining}
                className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
                    Đang đăng ký...
                  </>
                ) : 'Hoàn tất đăng ký'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tournaments;
