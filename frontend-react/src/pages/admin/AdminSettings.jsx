import { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const toast = useToast();

  const tabs = [
    { id: 'general', icon: 'settings_suggest', label: 'Cấu hình chung' },
    { id: 'notifications', icon: 'notifications_active', label: 'Thông báo' },
    { id: 'payments', icon: 'payments', label: 'Thanh toán & Thuế' },
    { id: 'security', icon: 'security', label: 'Bảo mật & Quyền riêng tư' },
  ];

  const handleSave = () => {
    toast.success('Đã lưu cấu hình thành công!');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>
        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-green-700 flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-sm">save</span>
          Lưu cấu hình
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Menu bên trái cài đặt */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
          <ul className="divide-y divide-gray-100 text-sm">
            {tabs.map(tab => (
              <li 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 flex items-center gap-3 cursor-pointer transition-colors ${
                  activeTab === tab.id 
                    ? 'font-bold text-green-600 bg-green-50 border-l-4 border-green-600' 
                    : 'font-medium text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined">{tab.icon}</span> {tab.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Nội dung bên phải */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          
          {/* CẤU HÌNH CHUNG */}
          {activeTab === 'general' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3">Cấu hình Website</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên Website</label>
                  <input type="text" defaultValue="Pickleball Pro" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả Website (SEO Meta)</label>
                  <textarea rows="3" defaultValue="Nền tảng đặt sân và mua sắm dụng cụ Pickleball số 1 Việt Nam." className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"></textarea>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Chế độ bảo trì</h4>
                    <p className="text-xs text-gray-500 mt-1">Tạm thời vô hiệu hóa website đối với người dùng để nâng cấp hệ thống.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Cho phép đăng ký tài khoản HLV mới</h4>
                    <p className="text-xs text-gray-500 mt-1">Bật tính năng này để cho phép người dùng tự đăng ký làm Huấn Luyện Viên.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* THÔNG BÁO */}
          {activeTab === 'notifications' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3">Cài đặt Thông báo</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Thông báo qua Email</h4>
                    <p className="text-xs text-gray-500 mt-1">Gửi email cho Admin khi có đơn hàng hoặc lịch đặt sân mới.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Âm báo hệ thống</h4>
                    <p className="text-xs text-gray-500 mt-1">Phát ra âm thanh "tinh" khi có thông báo mới trên web.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* THANH TOÁN & THUẾ */}
          {activeTab === 'payments' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3">Thanh toán & Thuế</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Đơn vị tiền tệ</label>
                  <select className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500">
                    <option value="VND">VNĐ (Việt Nam Đồng)</option>
                    <option value="USD">USD (Đô la Mỹ)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thuế VAT (%)</label>
                  <input type="number" defaultValue="8" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Cho phép thanh toán VNPay</h4>
                    <p className="text-xs text-gray-500 mt-1">Khách hàng có thể thanh toán trực tuyến qua cổng VNPay.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* BẢO MẬT */}
          {activeTab === 'security' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3">Bảo mật & Quyền riêng tư</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Xác thực 2 bước (2FA)</h4>
                    <p className="text-xs text-gray-500 mt-1">Yêu cầu mã OTP qua điện thoại khi Admin đăng nhập.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Giới hạn số lần đăng nhập sai</h4>
                    <p className="text-xs text-gray-500 mt-1">Khóa tài khoản 30 phút nếu đăng nhập sai quá 5 lần.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
