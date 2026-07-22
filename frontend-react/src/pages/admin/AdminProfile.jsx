const AdminProfile = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-green-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">save</span>
          Lưu thay đổi
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex">
        {/* Left Col - Avatar */}
        <div className="w-1/3 p-8 border-r border-gray-100 flex flex-col items-center justify-center bg-gray-50/50">
          <div className="relative mb-4">
            <img src="https://ui-avatars.com/api/?name=Admin&background=16a34a&color=fff&size=150" alt="Admin" className="w-32 h-32 rounded-full ring-4 ring-green-100" />
            <button className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-gray-100 hover:text-green-600 transition-colors">
              <span className="material-symbols-outlined text-sm">photo_camera</span>
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Quản trị viên</h2>
          <p className="text-sm text-green-600 font-medium mt-1">Super Admin</p>
        </div>

        {/* Right Col - Form */}
        <div className="flex-1 p-8">
          <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3">Thông tin chi tiết</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
              <input type="text" defaultValue="Quản trị viên" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" defaultValue="admin@pickleball.com" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
              <input type="text" defaultValue="0123456789" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chức vụ</label>
              <input type="text" defaultValue="Super Admin" disabled className="w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-500 cursor-not-allowed" />
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 mt-10">Đổi mật khẩu</h3>
          <div className="grid grid-cols-1 gap-6 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu hiện tại</label>
              <input type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu mới</label>
              <input type="password" placeholder="Nhập mật khẩu mới" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
