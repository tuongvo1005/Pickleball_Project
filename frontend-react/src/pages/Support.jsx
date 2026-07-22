import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const Support = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'help';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync active tab with search parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // State for FAQ accordions
  const [expandedFaq, setExpandedFaq] = useState(null);
  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Trigger global live chat widget
  const triggerLiveChat = (e) => {
    e.preventDefault();
    window.dispatchEvent(new Event('openLiveChat'));
  };

  const tabs = [
    { key: 'help', label: 'Trung tâm trợ giúp', icon: 'help_center' },
    { key: 'privacy', label: 'Chính sách bảo mật', icon: 'security' },
    { key: 'terms', label: 'Điều khoản dịch vụ', icon: 'gavel' },
    { key: 'refund', label: 'Chính sách hoàn tiền', icon: 'payments' },
    { key: 'faq', label: 'Câu hỏi thường gặp (FAQ)', icon: 'quiz' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Sleek Page Header Banner */}
        <div className="relative rounded-3xl overflow-hidden mb-12 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 text-white p-8 md:p-12 shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl">
            <span className="bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
              Hỗ trợ khách hàng
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-4 mb-3">
              Chúng tôi có thể giúp gì cho bạn?
            </h1>
            <p className="text-blue-100 text-sm md:text-base leading-relaxed font-medium">
              Tìm kiếm câu trả lời nhanh chóng cho các câu hỏi thường gặp, tìm hiểu chính sách hoạt động của CLB hoặc chat trực tiếp với đội ngũ quản trị viên.
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* LEFT COLUMN: Vertical Navigation Card */}
          <div className="w-full lg:w-1/4 bg-white rounded-3xl border border-gray-150 p-4 shadow-sm shrink-0">
            <h3 className="text-gray-400 font-black text-[10px] uppercase tracking-wider px-3 mb-3">Danh mục hỗ trợ</h3>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all border-0 text-left cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-500/10'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-semibold'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                    <span className="text-xs">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
            
            {/* Quick Chat Callout Box */}
            <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
              <span className="material-symbols-outlined text-3xl text-blue-600 mb-2">support_agent</span>
              <h4 className="font-extrabold text-blue-900 text-xs mb-1">Cần hỗ trợ trực tiếp?</h4>
              <p className="text-blue-700 text-[10px] leading-relaxed mb-3">
                Đội ngũ Admin trực tuyến luôn sẵn sàng giải đáp thắc mắc của bạn ngay lập tức.
              </p>
              <button
                onClick={triggerLiveChat}
                className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-blue-700 transition shadow-sm border-0 cursor-pointer"
              >
                Trò chuyện ngay
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Active Content Card */}
          <div className="w-full lg:w-3/4 bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
            
            {/* TAB 1: HELP CENTER */}
            {activeTab === 'help' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">help_center</span>
                    Trung tâm trợ giúp & Liên hệ hỗ trợ
                  </h2>
                  <p className="text-gray-500 text-xs">Chào mừng bạn đến với Cổng trợ giúp CLB PickleBall Pro.</p>
                </div>

                {/* Quick Search Tool Box */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-150">
                  <h4 className="font-extrabold text-gray-800 text-xs mb-2">Tìm kiếm nhanh giải đáp</h4>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                    <input
                      type="text"
                      placeholder="Nhập từ khóa cần hỗ trợ (ví dụ: cọc tiền, hủy sân, hoàn trả vợt...)"
                      className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-xs font-semibold focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Support Methods Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Card 1: Chat Live */}
                  <div className="p-6 rounded-2xl border border-gray-150 hover:border-blue-500 transition-colors bg-white flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">forum</span>
                    </div>
                    <h4 className="font-extrabold text-gray-900 text-sm">Hỗ trợ qua Kênh Live Chat</h4>
                    <p className="text-gray-500 text-xs leading-relaxed">
                      Kết nối trực tiếp 1-1 với nhân viên tư vấn của câu lạc bộ. Trực tuyến 24/7 để nhận các thông tin đặt lịch và cho thuê dụng cụ.
                    </p>
                    <button
                      onClick={triggerLiveChat}
                      className="mt-auto w-max text-xs text-blue-600 hover:text-blue-700 font-extrabold flex items-center gap-1 cursor-pointer border-0 bg-transparent"
                    >
                      Kích hoạt khung Chat <span className="material-symbols-outlined text-[16px]">arrow_right_alt</span>
                    </button>
                  </div>

                  {/* Card 2: Hotline */}
                  <div className="p-6 rounded-2xl border border-gray-150 hover:border-emerald-500 transition-colors bg-white flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">phone_in_talk</span>
                    </div>
                    <h4 className="font-extrabold text-gray-900 text-sm">Đường dây nóng (Hotline)</h4>
                    <p className="text-gray-500 text-xs leading-relaxed">
                      Cần giải quyết nhanh các sự cố sân bãi hoặc điều chỉnh đặt chỗ đột xuất? Liên hệ ngay Hotline dịch vụ của chúng tôi.
                    </p>
                    <a
                      href="tel:0987654321"
                      className="mt-auto w-max text-xs text-emerald-600 hover:text-emerald-700 font-extrabold flex items-center gap-1 decoration-none"
                    >
                      Gọi ngay: 0987.654.321 <span className="material-symbols-outlined text-[16px]">call</span>
                    </a>
                  </div>

                </div>

                {/* Club Location Info */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-150 space-y-4">
                  <h4 className="font-extrabold text-gray-900 text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-[18px]">location_on</span>
                    Văn phòng hỗ trợ trực tiếp
                  </h4>
                  <div className="text-xs text-gray-600 space-y-2 leading-relaxed">
                    <p>📍 <strong>Địa chỉ:</strong> CLB PickleBall Pro, 238 Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh</p>
                    <p>🕒 <strong>Thời gian hoạt động sân:</strong> Thứ 2 - Chủ Nhật, từ 05:00 sáng đến 23:00 đêm</p>
                    <p>📧 <strong>Email hỗ trợ chính thức:</strong> support@kyhoapickleball.vn</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PRIVACY POLICY */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 animate-fadeIn text-gray-700 text-xs leading-relaxed">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">security</span>
                    Chính sách bảo mật thông tin khách hàng
                  </h2>
                  <p className="text-gray-400 text-[10px] font-bold">Cập nhật lần cuối: 28 tháng 05, 2026</p>
                </div>

                <div className="space-y-4 font-medium">
                  <p>
                    Tại <strong>PickleBall Pro</strong>, chúng tôi coi trọng sự riêng tư và bảo mật thông tin cá nhân của bạn. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu khi bạn truy cập trang web đặt lịch và mua sắm dụng cụ.
                  </p>
                  
                  <h4 className="font-extrabold text-gray-900 text-xs mt-6 mb-2">1. Thông tin thu thập</h4>
                  <p>
                    Chúng tôi thu thập các thông tin sau khi khách hàng đăng ký thành viên hoặc sử dụng dịch vụ thanh toán:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Họ và tên, địa chỉ email, số điện thoại liên hệ.</li>
                    <li>Thông tin đặt lịch sân (khung giờ sân, sân được đặt, lịch sử giao dịch).</li>
                    <li>Thông tin địa chỉ giao hàng và phương thức thanh toán đối với đơn hàng mua/thuê vợt.</li>
                  </ul>

                  <h4 className="font-extrabold text-gray-900 text-xs mt-6 mb-2">2. Sử dụng thông tin</h4>
                  <p>
                    Dữ liệu cá nhân thu thập được chỉ sử dụng trong nội bộ CLB nhằm phục vụ các mục đích:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Xác nhận giao dịch thanh toán đặt sân cọc 50% hoặc thanh toán mua bán trực tuyến qua Ví MoMo/VietQR.</li>
                    <li>Cung cấp và điều phối hoạt động cho thuê dụng cụ đúng thời hạn tại quầy lễ tân.</li>
                    <li>Gửi thông báo cập nhật về trạng thái đơn hàng hoặc lịch thi đấu giải phong trào của CLB.</li>
                  </ul>

                  <h4 className="font-extrabold text-gray-900 text-xs mt-6 mb-2">3. Bảo mật giao dịch trực tuyến</h4>
                  <p>
                    Toàn bộ thông tin tài khoản ngân hàng hoặc số điện thoại ví điện tử MoMo của bạn được mã hóa an toàn qua cổng giao dịch Sandbox và các chuẩn mã hóa HTTPS bảo mật cao nhất, tuyệt đối không chia sẻ thông tin cho bên thứ ba ngoại trừ các đối tác đối soát cổng thanh toán chính thức.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: TERMS OF SERVICE */}
            {activeTab === 'terms' && (
              <div className="space-y-6 animate-fadeIn text-gray-700 text-xs leading-relaxed">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">gavel</span>
                    Điều khoản dịch vụ & Quy định hoạt động
                  </h2>
                  <p className="text-gray-400 text-[10px] font-bold">Cập nhật lần cuối: 28 tháng 05, 2026</p>
                </div>

                <div className="space-y-4 font-medium">
                  <p>
                    Bằng việc truy cập ứng dụng và thực hiện đặt lịch trực tuyến, quý khách hàng đồng ý tuân thủ toàn bộ các quy định và điều khoản hoạt động của CLB PickleBall Pro dưới đây:
                  </p>

                  <h4 className="font-extrabold text-gray-900 text-xs mt-6 mb-2">1. Quy định đặt cọc và giữ sân</h4>
                  <p>
                    Tất cả các lượt đặt sân trực tuyến bắt buộc phải thanh toán **tối thiểu 50% tiền cọc trực tuyến** thông qua các cổng thanh toán tích hợp (MoMo Sandbox/VietQR) để kích hoạt giữ chỗ thành công trên hệ thống. 50% số tiền còn lại khách hàng sẽ hoàn tất trực tiếp tại quầy lễ tân khi nhận sân thi đấu.
                  </p>

                  <h4 className="font-extrabold text-gray-900 text-xs mt-6 mb-2">2. Quy định thuê vợt và dụng cụ</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Dụng cụ cho thuê (vợt, bóng, thiết bị tập luyện) chỉ được sử dụng trong phạm vi sân bãi của CLB.</li>
                    <li>Khách hàng có trách nhiệm bảo quản tốt dụng cụ. Trong trường hợp xảy ra nứt vỡ hoặc hư hỏng nặng do lỗi va đập sai kỹ thuật, quý khách vui lòng bồi thường theo biểu giá quy định của cửa hàng.</li>
                  </ul>

                  <h4 className="font-extrabold text-gray-900 text-xs mt-6 mb-2">3. Hành vi ứng xử và trang phục</h4>
                  <p>
                    Vui lòng mặc trang phục thể thao lịch sự và sử dụng giày thể thao có đế cao su không để lại vết sẫm màu trên bề mặt sân bóng. Nghiêm cấm các hành vi gây mất trật tự hoặc xả rác bừa bãi trong khuôn viên khu liên hợp Kỳ Hòa.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: REFUND POLICY */}
            {activeTab === 'refund' && (
              <div className="space-y-6 animate-fadeIn text-gray-700 text-xs leading-relaxed">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">payments</span>
                    Chính sách hoàn trả & Hủy đặt lịch
                  </h2>
                  <p className="text-gray-400 text-[10px] font-bold">Cập nhật lần cuối: 28 tháng 05, 2026</p>
                </div>

                <div className="space-y-4 font-medium">
                  <p>
                    Chúng tôi hiểu rằng lịch trình của bạn có thể thay đổi đột xuất. PickleBall Pro áp dụng chính sách hủy và hoàn cọc vô cùng minh bạch:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                      <h5 className="font-extrabold text-emerald-800 text-xs mb-1">Hủy trước 24 giờ</h5>
                      <p className="text-gray-600 text-[11px] leading-relaxed">
                        Hoàn trả **100% số tiền cọc** đã thanh toán. Số tiền sẽ được chuyển khoản trả lại tài khoản ví MoMo/Ngân hàng của quý khách trong vòng 24h làm việc.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                      <h5 className="font-extrabold text-amber-800 text-xs mb-1">Hủy từ 12 - 24 giờ</h5>
                      <p className="text-gray-600 text-[11px] leading-relaxed">
                        Hỗ trợ **dời lịch đặt sân sang ngày khác** (chỉ dời tối đa 1 lần). Không áp dụng hoàn cọc bằng tiền mặt.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-red-200 bg-red-50/50">
                    <h5 className="font-extrabold text-red-800 text-xs mb-1">⚠️ Hủy dưới 12 giờ hoặc vắng mặt</h5>
                    <p className="text-gray-600 text-[11px] leading-relaxed">
                      Hệ thống tự động **khấu trừ 100% tiền đặt cọc** để chi trả chi phí giữ sân trống cho đối tác và ban quản lý. Mong quý khách hàng thông cảm.
                    </p>
                  </div>

                  <h4 className="font-extrabold text-gray-900 text-xs mt-6 mb-2">Quy trình yêu cầu hoàn tiền</h4>
                  <p>
                    Để gửi yêu cầu hoàn tiền hoặc dời lịch đặt sân bãi/đơn hàng, quý khách hàng vui lòng:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Truy cập mục <strong>Hỗ trợ trực tuyến</strong> ở góc màn hình và gửi mã lượt đặt sân (#PB-XXX).</li>
                    <li>Nhân viên trực ban sau khi đối soát trên hệ thống sẽ làm việc trực tiếp với Admin để hoàn thành lệnh chuyển tiền trong 5-10 phút.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB 5: FAQ */}
            {activeTab === 'faq' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">quiz</span>
                    Các câu hỏi thường gặp (FAQ)
                  </h2>
                  <p className="text-gray-500 text-xs">Giải đáp nhanh các câu hỏi phổ biến nhất từ người chơi.</p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      q: "Tôi có thể dời giờ chơi sau khi đã đặt sân thành công không?",
                      a: "Có! Bạn hoàn toàn có thể dời lịch chơi miễn là thông báo cho ban quản lý trước ít nhất 12 giờ so với khung giờ bắt đầu. Vui lòng mở khung chat Live để nhân viên hỗ trợ đổi giờ nhanh chóng."
                    },
                    {
                      q: "Có dịch vụ cho thuê vợt và bóng tại sân không?",
                      a: "Có! Cửa hàng của chúng tôi cung cấp đầy đủ dịch vụ cho thuê các dòng vợt Pickleball cao cấp và bóng đạt chuẩn giải đấu quốc tế. Bạn có thể thuê theo giờ trực tiếp trên website trước khi đến sân."
                    },
                    {
                      q: "Làm thế nào để đăng ký tham gia các giải đấu phong trào?",
                      a: "Mọi thông tin đăng ký giải đấu luôn được cập nhật chi tiết ở trang 'Giải đấu'. Bạn chỉ cần nhấn nút đăng ký và thực hiện đặt cọc phí tham dự để ghi danh đội của mình."
                    },
                    {
                      q: "Hạn chế số lượng dụng cụ thuê tối đa trong giỏ hàng là bao nhiêu?",
                      a: "Hệ thống sẽ dựa vào số lượng dụng cụ thực tế còn trống trong kho ở thời gian thực. Nếu kho đã cho thuê hết hàng, các khung giờ thuê sẽ tự động ẩn đi để tránh tình trạng trùng lặp."
                    },
                    {
                      q: "Số tiền cọc tối thiểu là bao nhiêu và hoàn tất thanh toán như thế nào?",
                      a: "Số tiền cọc đặt sân là 50% tổng giá trị tiền giờ chơi. Bạn có thể chọn cổng thanh toán Ví MoMo (UAT Sandbox) hoặc VietQR, sau đó thực hiện chuyển khoản. Sau khi thanh toán, nhấn nút kiểm thử để kích hoạt sân lập tức."
                    }
                  ].map((faq, index) => {
                    const isExpanded = expandedFaq === index;
                    return (
                      <div key={index} className="border border-gray-150 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                        <button
                          onClick={() => toggleFaq(index)}
                          className="w-full flex justify-between items-center p-4 hover:bg-gray-50 text-left border-0 bg-transparent cursor-pointer"
                        >
                          <span className="font-extrabold text-xs text-gray-800 leading-snug">{faq.q}</span>
                          <span className="material-symbols-outlined text-gray-400 text-lg transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                            expand_more
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-600 leading-relaxed font-semibold">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

export default Support;
