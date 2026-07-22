import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LiveChatWidget from './components/LiveChatWidget';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Login from './pages/Login';
import Courts from './pages/Courts';
import CourtDetail from './pages/CourtDetail';
import Tournaments from './pages/Tournaments';
import Coaches from './pages/Coaches';
import Cart from './pages/Cart';
import UserProfile from './pages/UserProfile';
import MyOrders from './pages/MyOrders';
import Support from './pages/Support';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import ManageCourts from './pages/admin/ManageCourts';
import ManageProducts from './pages/admin/ManageProducts';
import ManageBookings from './pages/admin/ManageBookings';
import ManageUsers from './pages/admin/ManageUsers';
import ManageOrders from './pages/admin/ManageOrders';
import AdminProfile from './pages/admin/AdminProfile';
import AdminSettings from './pages/admin/AdminSettings';
import ManageTournaments from './pages/admin/ManageTournaments';
import ManageChats from './pages/admin/ManageChats';
import ManageReviews from './pages/admin/ManageReviews';
import { useAuthContext } from './contexts/AuthContext';

// ── Trang lỗi 403 ────────────────────────────────────────────────────────────
const Forbidden = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
    <span className="material-symbols-outlined text-7xl text-red-300">gpp_bad</span>
    <h1 className="text-3xl font-extrabold text-gray-800">Truy cập bị từ chối</h1>
    <p className="text-gray-500 max-w-sm">
      Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
    </p>
    <a href="/" className="mt-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition">
      Về trang chủ
    </a>
  </div>
);

// ── Protected Route ───────────────────────────────────────────────────────────
// allowedRoles: nếu truyền vào thì kiểm tra role; nếu không thì chỉ cần đăng nhập
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuthContext();

  // Chưa đăng nhập → về trang login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Không đủ quyền → trang 403 (không redirect admin để tránh lộ /admin route)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Forbidden />;
  }

  return children;
};

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Routes>

        {/* ══════════════════════════════════════════════════════════
            ADMIN ROUTES — Layout riêng, không có Navbar/Footer user
            Chỉ role="admin" mới được vào, người khác thấy trang 403
        ══════════════════════════════════════════════════════════ */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index         element={<AdminDashboard />} />
          <Route path="courts"     element={<ManageCourts />} />
          <Route path="products"   element={<ManageProducts />} />
          <Route path="bookings"   element={<ManageBookings />} />
          <Route path="tournaments" element={<ManageTournaments />} />
          <Route path="users"      element={<ManageUsers />} />
          <Route path="orders"     element={<ManageOrders />} />
          <Route path="chats"      element={<ManageChats />} />
          <Route path="reviews"    element={<ManageReviews />} />
          <Route path="profile"    element={<AdminProfile />} />
          <Route path="settings"   element={<AdminSettings />} />
          {/* Bất kỳ sub-route admin không tồn tại → về dashboard */}
          <Route path="*"          element={<Navigate to="/admin" replace />} />
        </Route>

        {/* ══════════════════════════════════════════════════════════
            USER ROUTES — Có Navbar + Footer
        ══════════════════════════════════════════════════════════ */}
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  {/* Public */}
                  <Route path="/"            element={<Home />} />
                  <Route path="/courts"      element={<Courts />} />
                  <Route path="/courts/:id"  element={<CourtDetail />} />
                  <Route path="/shop"        element={<Shop />} />
                  <Route path="/tournaments" element={<Tournaments />} />
                  <Route path="/coaches"     element={<Coaches />} />
                  <Route path="/login"       element={<Login />} />
                  <Route path="/support"     element={<Support />} />

                  {/* Chỉ user đăng nhập */}
                  <Route path="/cart" element={
                    <ProtectedRoute><Cart /></ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute><UserProfile /></ProtectedRoute>
                  } />
                  <Route path="/my-orders" element={
                    <ProtectedRoute><MyOrders /></ProtectedRoute>
                  } />

                  {/* Chặn user thường vào /admin/* bằng wildcard */}
                  <Route path="/admin/*" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      {/* Không bao giờ render — ProtectedRoute sẽ hiện Forbidden */}
                      <Navigate to="/" replace />
                    </ProtectedRoute>
                  } />

                  {/* 404 fallback */}
                  <Route path="*" element={
                    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-4">
                      <span className="material-symbols-outlined text-7xl text-gray-200">search_off</span>
                      <h1 className="text-2xl font-extrabold text-gray-700">Trang không tồn tại</h1>
                      <p className="text-gray-400">Đường dẫn bạn truy cập không có trên hệ thống.</p>
                      <a href="/" className="mt-2 text-green-600 font-bold hover:underline">← Về trang chủ</a>
                    </div>
                  } />
                </Routes>
              </main>
              <Footer />
              <LiveChatWidget />
            </div>
          }
        />

      </Routes>
    </Router>
  );
}

export default App;
