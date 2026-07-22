import { Link } from 'react-router-dom';

const Footer = () => {
  const handleOpenChat = (e) => {
    e.preventDefault();
    window.dispatchEvent(new Event('openLiveChat'));
  };

  return (
    <footer className="bg-gray-900 pt-16 pb-8 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Cột 1: Thông tin thương hiệu */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-500 mb-4">
              <span className="material-symbols-outlined text-4xl">sports_tennis</span>
              <span className="text-2xl font-bold text-white">PickleBall Pro</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Hệ thống đặt sân & cửa hàng dụng cụ Pickleball Kỳ Hòa cao cấp. Nơi kết nối đam mê thể thao, cung cấp dịch vụ huấn luyện viên và giải đấu phong trào chất lượng hàng đầu tại TP. Hồ Chí Minh.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-green-600 hover:text-white transition-colors">
                <span className="material-symbols-outlined">facebook</span>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-green-600 hover:text-white transition-colors">
                <span className="material-symbols-outlined">smart_display</span>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-green-600 hover:text-white transition-colors">
                <span className="material-symbols-outlined">camera_alt</span>
              </a>
            </div>
          </div>

          {/* Cột 2: Dịch vụ */}
          <div>
            <h3 className="text-white text-lg font-bold mb-6">Dịch vụ</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/courts" className="hover:text-green-400 transition-colors">Đặt sân Kỳ Hòa</Link></li>
              <li><Link to="/shop" className="hover:text-green-400 transition-colors">Cửa hàng dụng cụ</Link></li>
              <li><Link to="/coaches" className="hover:text-green-400 transition-colors">Thuê Huấn luyện viên</Link></li>
              <li><Link to="/tournaments" className="hover:text-green-400 transition-colors">Giải đấu nội bộ</Link></li>
              <li><Link to="/coaches" className="hover:text-green-400 transition-colors">Lớp học cơ bản</Link></li>
            </ul>
          </div>

          {/* Cột 3: Hỗ trợ */}
          <div>
            <h3 className="text-white text-lg font-bold mb-6">Hỗ trợ khách hàng</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/support?tab=help" className="hover:text-green-400 transition-colors">Trung tâm trợ giúp</Link></li>
              <li><Link to="/support?tab=privacy" className="hover:text-green-400 transition-colors">Chính sách bảo mật</Link></li>
              <li><Link to="/support?tab=terms" className="hover:text-green-400 transition-colors">Điều khoản dịch vụ</Link></li>
              <li><Link to="/support?tab=refund" className="hover:text-green-400 transition-colors">Chính sách hoàn tiền</Link></li>
              <li><Link to="/support?tab=faq" className="hover:text-green-400 transition-colors">Câu hỏi thường gặp (FAQ)</Link></li>
            </ul>
          </div>

          {/* Cột 4: Liên hệ */}
          <div>
            <h3 className="text-white text-lg font-bold mb-6">Liên hệ</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500">location_on</span>
                <span>238 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-500">call</span>
                <span>0987.654.321 (Hotline đặt sân)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-500">mail</span>
                <span>support@kyhoapickleball.vn</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 text-center md:text-left">
            &copy; {new Date().getFullYear()} PickleBall Pro. Thiết kế bởi Võ Phúc Tường & Hoàng Văn Đức.
          </p>
          <div className="flex gap-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" className="h-6 opacity-50 hover:opacity-100 transition-opacity" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 opacity-50 hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
