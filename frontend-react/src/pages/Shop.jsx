import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Các sản phẩm đang có trong giỏ hàng (dùng để tính số lượng còn lại realtime)
  const [cartItems, setCartItems] = useState([]);

  const [category, setCategory] = useState('all');
  const [sortPrice, setSortPrice] = useState('default');

  // Tải giỏ hàng từ localStorage
  const syncCart = () => {
    const cartKey = user ? `cart_${user.id}` : 'cart';
    setCartItems(JSON.parse(localStorage.getItem(cartKey) || '[]'));
  };

  // Lắng nghe sự kiện cartUpdated (thêm/xóa khỏi giỏ) và user thay đổi
  useEffect(() => {
    syncCart();
    window.addEventListener('cartUpdated', syncCart);
    return () => window.removeEventListener('cartUpdated', syncCart);
  }, [user]);

  // Hàm fetch sản phẩm (dùng cho cả lần đầu và polling)
  const fetchProducts = () => {
    axios.get('http://127.0.0.1:8000/api/products')
      .then(response => {
        setProducts(response.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi khi lấy dữ liệu sản phẩm:", err);
        setError("Không thể tải danh sách sản phẩm lúc này.");
        setLoading(false);
      });
  };

  // Lần đầu và polling mỗi 30 giây
  useEffect(() => {
    fetchProducts();
    const interval = setInterval(fetchProducts, 30000);
    return () => clearInterval(interval);
  }, []);

  const [selectedRentalProduct, setSelectedRentalProduct] = useState(null);
  const [rentalStartDate, setRentalStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [rentalStartTime, setRentalStartTime] = useState('08:00');
  const [rentalHours, setRentalHours] = useState(2);
  const [rentalQty, setRentalQty] = useState(1);

  // Danh sách các lượt thuê đã tồn tại trong hệ thống (để kiểm tra giới hạn kho theo giờ)
  const [existingRentals, setExistingRentals] = useState([]);

  // Tải danh sách đơn hàng để lọc các lượt thuê khi mở modal thuê dụng cụ
  useEffect(() => {
    if (selectedRentalProduct) {
      axios.get('http://127.0.0.1:8000/api/orders')
        .then(res => {
          if (res.data && res.data.success) {
            const rentalsFromDB = [];
            res.data.data.forEach(order => {
              if (order.status !== 'cancelled') {
                let items = [];
                try {
                  items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                } catch (e) {
                  console.error(e);
                }
                if (Array.isArray(items)) {
                  items.forEach(item => {
                    if (item.isRental) {
                      rentalsFromDB.push(item);
                    }
                  });
                }
              }
            });
            setExistingRentals(rentalsFromDB);
          }
        })
        .catch(err => console.error("Lỗi khi tải đơn hàng để lọc lịch thuê:", err));
    }
  }, [selectedRentalProduct]);

  const [quantities, setQuantities] = useState({});

  // Tính số lượng đã có trong giỏ hàng (mua đứt) của 1 sản phẩm
  const getCartQty = (productId) => {
    return cartItems
      .filter(item => !item.isRental && (item.id === productId || item.product_id === productId))
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Số lượng còn lại thực tế có thể mua = stock - đã trong giỏ
  const getRemainingStock = (product) => {
    return Math.max(0, product.stock - getCartQty(product.id));
  };

  const handleQtyChange = (productId, newQty) => {
    if (newQty < 1) return;
    setQuantities(prev => ({
      ...prev,
      [productId]: newQty
    }));
  };

  const handleAddToCart = (product) => {
    if (!user) {
      toast.warning('Vui lòng đăng nhập để mua hàng!');
      navigate('/login');
      return;
    }

    const qty = quantities[product.id] || 1;
    const remaining = getRemainingStock(product);

    if (qty > remaining) {
      toast.error(`Chỉ còn ${remaining} sản phẩm trong kho! Vui lòng giảm số lượng.`);
      handleQtyChange(product.id, remaining > 0 ? remaining : 1);
      return;
    }

    const cartKey = user ? `cart_${user.id}` : 'cart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += qty;
    } else {
      cart.push({ ...product, quantity: qty, image: getProductImage(product.name) });
    }
    
    localStorage.setItem(cartKey, JSON.stringify(cart));
    // Phát event để Navbar và syncCart cập nhật số lượng
    window.dispatchEvent(new Event('cartUpdated'));
    toast.success(`Đã thêm ${qty} "${product.name}" vào giỏ hàng!`);
  };

  // Tính giá thuê theo GIỜ (0.2% giá trị sản phẩm, tối thiểu 5k, làm tròn nghìn đồng)
  const getRentalPricePerHour = (price) => {
    return Math.max(5000, Math.round(Number(price) * 0.002 / 1000) * 1000);
  };

  // Tính tiền đặt cọc (30% giá trị sản phẩm, làm tròn nghìn đồng)
  const getDepositPrice = (price) => {
    return Math.round(Number(price) * 0.3 / 1000) * 1000;
  };

  // Hàm xác định xem khung giờ cần thuê có chồng chéo với khung giờ đã thuê hay không
  const isTimeOverlapping = (targetTime, rentedStartTime, rentedHours) => {
    const parseToMinutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    
    const targetStart = parseToMinutes(targetTime);
    const targetEnd = targetStart + 60; // Coi như block kiểm tra 1 tiếng
    
    const rentedStart = parseToMinutes(rentedStartTime);
    const rentedEnd = rentedStart + rentedHours * 60;
    
    return targetStart < rentedEnd && targetEnd > rentedStart;
  };

  // Lấy số lượng sản phẩm đã thuê tại một khung giờ cụ thể
  const getRentedQtyForSlot = (productId, dateStr, timeStr) => {
    // 1. Kiểm tra các sản phẩm đã có trong giỏ hàng hiện tại (chưa checkout)
    const cartKey = user ? `cart_${user.id}` : 'cart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    let cartRentedQty = 0;
    cart.forEach(item => {
      if (item.isRental && item.id.startsWith(`${productId}_rental`) && item.rentalStartDate === dateStr) {
        if (isTimeOverlapping(timeStr, item.rentalStartTime, item.rentalHours)) {
          cartRentedQty += item.quantity;
        }
      }
    });

    // 2. Kiểm tra các hóa đơn thực tế đã thanh toán lưu trong DB
    let dbRentedQty = 0;
    existingRentals.forEach(item => {
      const itemProdId = item.product_id || (item.originalProduct ? item.originalProduct.id : null);
      if (item.isRental && Number(itemProdId) === Number(productId) && item.rentalStartDate === dateStr) {
        if (isTimeOverlapping(timeStr, item.rentalStartTime, item.rentalHours)) {
          dbRentedQty += item.quantity;
        }
      }
    });

    return cartRentedQty + dbRentedQty;
  };

  // Tính toán danh sách khung giờ bắt đầu từ 06:00 đến 22:00 có sẵn trong kho
  const getAvailableHours = () => {
    if (!selectedRentalProduct) return [];
    
    return Array.from({ length: 17 }, (_, i) => {
      const h = i + 6;
      return String(h).padStart(2, '0') + ':00';
    }).filter(hour => {
      const rentedQty = getRentedQtyForSlot(selectedRentalProduct.id, rentalStartDate, hour);
      const remainingStock = selectedRentalProduct.stock - rentedQty;
      // Chỉ giữ lại những khung giờ mà số lượng còn lại trong kho lớn hơn 0
      return remainingStock > 0;
    });
  };

  const availableHours = getAvailableHours();

  // Tự động chọn khung giờ bắt đầu đầu tiên có sẵn nếu khung giờ hiện tại bị ẩn đi (khi chuyển ngày hoặc hết hàng)
  useEffect(() => {
    if (selectedRentalProduct && availableHours.length > 0) {
      if (!availableHours.includes(rentalStartTime)) {
        setRentalStartTime(availableHours[0]);
      }
    }
  }, [rentalStartDate, selectedRentalProduct, availableHours, rentalStartTime]);

  // Lấy số lượng còn lại tối đa trong kho tại khung giờ đang chọn
  const getCurrentRemainingStock = () => {
    if (!selectedRentalProduct) return 0;
    const rentedQty = getRentedQtyForSlot(selectedRentalProduct.id, rentalStartDate, rentalStartTime);
    return Math.max(0, selectedRentalProduct.stock - rentedQty);
  };

  const currentRemainingStock = getCurrentRemainingStock();

  // Đảm bảo số lượng chọn thuê không vượt quá số lượng tối đa còn lại tại khung giờ đó
  useEffect(() => {
    if (rentalQty > currentRemainingStock) {
      setRentalQty(currentRemainingStock > 0 ? currentRemainingStock : 1);
    }
  }, [rentalStartTime, rentalStartDate, currentRemainingStock, rentalQty]);

  const handleOpenRentalModal = (product) => {
    if (!user) {
      toast.warning('Vui lòng đăng nhập để thuê dụng cụ!');
      navigate('/login');
      return;
    }
    setSelectedRentalProduct(product);
    setRentalStartDate(new Date().toISOString().split('T')[0]);
    
    // Giờ mặc định là giờ tròn tiếp theo
    const now = new Date();
    let currentHour = now.getHours() + 1;
    if (currentHour >= 22 || currentHour < 6) {
      currentHour = 8;
    }
    const formattedHour = String(currentHour).padStart(2, '0') + ':00';
    setRentalStartTime(formattedHour);
    setRentalHours(2);
    setRentalQty(1);
  };

  const formatDateVN = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.split('-').reverse().join('/');
  };

  const getEndTime = (startTimeStr, hours) => {
    if (!startTimeStr) return '';
    const [h, m] = startTimeStr.split(':').map(Number);
    let endH = h + Number(hours);
    if (endH >= 24) endH = endH % 24;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(endH)}:${pad(m)}`;
  };

  const handleConfirmRental = () => {
    const product = selectedRentalProduct;
    const qty = rentalQty;
    const hours = rentalHours;
    const start = rentalStartDate;
    const time = rentalStartTime;

    if (qty > currentRemainingStock) {
      toast.error(`Khung giờ này chỉ còn lại ${currentRemainingStock} sản phẩm trong kho. Vui lòng chọn số lượng ít hơn!`);
      return;
    }
    
    const hourlyPrice = getRentalPricePerHour(product.price);
    const depositVal = getDepositPrice(product.price);
    const totalRentalFee = hourlyPrice * hours;
    
    const cartKey = user ? `cart_${user.id}` : 'cart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    const end = getEndTime(time, hours);
    
    // Tạo ID độc nhất cho sản phẩm thuê theo giờ
    const rentalId = `${product.id}_rental_${start}_${time}_${hours}`;
    const existingIndex = cart.findIndex(item => item.id === rentalId);
    
    const rentalItem = {
      id: rentalId,
      product_id: product.id,
      name: `${product.name} (THUÊ ${hours} giờ: ${time} - ${end} ngày ${formatDateVN(start)})`,
      price: totalRentalFee,
      quantity: qty,
      image: getProductImage(product.name),
      isRental: true,
      rentalStartDate: start,
      rentalStartTime: time,
      rentalEndTime: end,
      rentalHours: hours,
      deposit: depositVal,
      originalPrice: product.price,
      originalProduct: product
    };
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += qty;
    } else {
      cart.push(rentalItem);
    }
    
    localStorage.setItem(cartKey, JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    toast.success(`Đã thêm lịch thuê “${product.name}” vào giỏ hàng!`);
    setSelectedRentalProduct(null);
  };

  const getProductImage = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('túi') || lowerName.includes('bag') || lowerName.includes('crbn')) {
      return "https://images.unsplash.com/photo-1577733966973-d680bffd2e69?q=80&w=600&auto=format&fit=crop";
    }
    if (lowerName.includes('vợt') || lowerName.includes('paddle') || lowerName.includes('selkirk') || lowerName.includes('joola')) {
      return "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=600&auto=format&fit=crop";
    }
    if (lowerName.includes('bóng') || lowerName.includes('ball') || lowerName.includes('franklin')) {
      return "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=600&auto=format&fit=crop";
    }
    if (lowerName.includes('giày') || lowerName.includes('shoes') || lowerName.includes('swiss')) {
      return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop";
    }
    return "https://images.unsplash.com/photo-1592709823855-d1043492e9f2?q=80&w=600&auto=format&fit=crop";
  };

  const filteredProducts = products
    .filter(product => {
      if (category === 'all') return true;
      const lowerName = product.name.toLowerCase();
      if (category === 'vot') return lowerName.includes('vợt');
      if (category === 'bong') return lowerName.includes('bóng');
      if (category === 'phu-kien') return !lowerName.includes('vợt') && !lowerName.includes('bóng');
      return true;
    })
    .sort((a, b) => {
      if (sortPrice === 'asc') return Number(a.price) - Number(b.price);
      if (sortPrice === 'desc') return Number(b.price) - Number(a.price);
      return 0;
    });

  return (
    <div className="w-full bg-gray-50 min-h-screen pb-20">
      {/* Shop Hero Banner */}
      <section className="relative w-full h-[350px] flex items-center justify-center bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Shop Banner"
            className="w-full h-full object-cover opacity-40 blur-[2px]"
            src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=2070&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">
            Cửa Hàng Dụng Cụ
          </h1>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto font-light">
            Vợt, bóng, trang phục và phụ kiện chính hãng chuẩn thi đấu. Mua đứt sở hữu hoặc Thuê dụng cụ theo giờ cực kỳ linh hoạt và tiết kiệm.
          </p>
        </div>
      </section>

      {/* Main Shop Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="w-full lg:w-1/4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                <span className="material-symbols-outlined text-blue-600">category</span>
                <h2 className="text-lg font-bold text-gray-800">Danh mục</h2>
              </div>
              
              <ul className="space-y-2 mb-8">
                {[{id: 'all', label: 'Tất cả sản phẩm'}, {id: 'vot', label: 'Vợt Pickleball'}, {id: 'bong', label: 'Bóng thi đấu'}, {id: 'phu-kien', label: 'Giày & Phụ kiện'}].map(cat => (
                  <li key={cat.id}>
                    <button 
                      onClick={() => setCategory(cat.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl font-medium transition-colors ${
                        category === cat.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {cat.label}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <span className="material-symbols-outlined text-blue-600">sort</span>
                <h2 className="text-lg font-bold text-gray-800">Sắp xếp</h2>
              </div>
              <select 
                value={sortPrice}
                onChange={(e) => setSortPrice(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="default">Mới nhất</option>
                <option value="asc">Giá: Thấp đến Cao</option>
                <option value="desc">Giá: Cao đến Thấp</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          <div className="w-full lg:w-3/4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
              
              {loading && (
                <div className="flex flex-col justify-center items-center py-20">
                  <span className="material-symbols-outlined animate-spin text-5xl text-blue-600 mb-4">refresh</span>
                  <span className="text-gray-500 font-medium">Đang tải gian hàng...</span>
                </div>
              )}

              {error && (
                <div className="text-center py-20">
                  <span className="material-symbols-outlined text-6xl text-red-300 block mb-4">error</span>
                  <p className="text-red-500 font-medium">{error}</p>
                </div>
              )}

              {!loading && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-20">
                      <span className="material-symbols-outlined text-6xl text-gray-300 block mb-4">inventory_2</span>
                      <p className="text-gray-500 text-lg">Chưa có sản phẩm nào phù hợp.</p>
                    </div>
                  ) : (
                    filteredProducts.map(product => {
                      const hourlyPrice = getRentalPricePerHour(product.price);
                      return (
                        <div key={product.id} className="group bg-white rounded-2xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col relative">
                          
                          {product.stock <= 0 && (
                            <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 uppercase tracking-wide">
                              Hết hàng
                            </div>
                          )}

                          <div className="w-full h-56 bg-gray-50 relative overflow-hidden flex items-center justify-center p-4">
                            <img 
                              alt={product.name}
                              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 mix-blend-multiply"
                              src={getProductImage(product.name)} 
                            />
                          </div>

                          <div className="p-5 flex flex-col flex-grow border-t border-gray-50">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 truncate" title={product.name}>{product.name}</h3>
                            <p className="text-xs text-gray-500 mb-4 line-clamp-2 min-h-[32px]">{product.description || "Không có mô tả."}</p>
                            
                            <div className="mt-auto pt-4 border-t border-gray-50 space-y-4">
                              
                              {/* Khu vực giá cả kép: Mua đứt vs Thuê theo giờ */}
                              <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-gray-100">
                                <div className="flex justify-between items-center">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">GIÁ BÁN</p>
                                  <p className="text-base font-extrabold text-blue-600 whitespace-nowrap">
                                    {Number(product.price).toLocaleString('vi-VN')} <span className="text-xs font-normal text-gray-500">đ</span>
                                  </p>
                                </div>
                                <div className="flex justify-between items-center border-t border-dashed border-gray-200 pt-1.5">
                                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">GIÁ THUÊ</p>
                                  <p className="text-sm font-extrabold text-emerald-600 whitespace-nowrap">
                                    {hourlyPrice.toLocaleString('vi-VN')} <span className="text-xs font-normal text-emerald-500">đ/giờ</span>
                                  </p>
                                </div>
                              </div>
                              
                              {(() => {
                                const remaining = getRemainingStock(product);
                                const currentQty = quantities[product.id] || 1;
                                return remaining > 0 ? (
                                  <div className="space-y-2">
                                    {/* Badge số lượng còn lại realtime */}
                                    <div className="flex items-center justify-between text-[10px] px-1">
                                      <span className="text-gray-400 font-medium">Tồn kho:</span>
                                      <span className={`font-bold ${
                                        remaining <= 3 ? 'text-red-500' 
                                        : remaining <= 10 ? 'text-orange-500' 
                                        : 'text-emerald-600'
                                      }`}>
                                        {remaining <= 3 ? `⚠️ Chỉ còn ${remaining}` : `✅ Còn ${remaining}`}
                                      </span>
                                    </div>

                                    {/* Bộ đếm số lượng mua */}
                                    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-1 shadow-inner w-full">
                                      <span className="text-[10px] font-bold text-gray-400 pl-2 uppercase tracking-wide">Số lượng mua</span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleQtyChange(product.id, currentQty - 1)}
                                          disabled={currentQty <= 1}
                                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-gray-600 hover:bg-gray-100 font-bold transition-all shadow-sm active:scale-95 text-xs disabled:opacity-40"
                                        >
                                          -
                                        </button>
                                        <span className="w-6 text-center text-xs font-black text-gray-800">
                                          {currentQty}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleQtyChange(product.id, currentQty + 1)}
                                          disabled={currentQty >= remaining}
                                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-gray-600 hover:bg-gray-100 font-bold transition-all shadow-sm active:scale-95 text-xs disabled:opacity-40"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Nhóm nút bấm Mua vs Thuê theo giờ */}
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                      <button 
                                        onClick={() => handleAddToCart(product)}
                                        className="h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-1 transition-all shadow-sm hover:bg-blue-700 active:scale-95 hover:shadow-md font-bold text-[10px] uppercase tracking-wider"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
                                        Mua đứt
                                      </button>
                                      <button 
                                        onClick={() => handleOpenRentalModal(product)}
                                        className="h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-1 transition-all shadow-sm hover:bg-emerald-700 active:scale-95 hover:shadow-md font-bold text-[10px] uppercase tracking-wider"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                                        Thuê ngay
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="block w-full text-center py-2 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl uppercase tracking-wider">
                                    Hết hàng
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal Đăng Ký Thuê Dụng Cụ Theo Giờ */}
      {selectedRentalProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2 text-emerald-600">
                <span className="material-symbols-outlined font-bold">hourglass_empty</span>
                <h2 className="text-xl font-bold text-gray-800">Đặt Thuê Dụng Cụ Theo Giờ</h2>
              </div>
              <button onClick={() => setSelectedRentalProduct(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Product Brief */}
              <div className="flex gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-6">
                <div className="w-16 h-16 bg-white rounded-lg p-1 flex shrink-0 items-center justify-center border border-emerald-100">
                  <img 
                    src={getProductImage(selectedRentalProduct.name)} 
                    alt={selectedRentalProduct.name}
                    className="max-h-full max-w-full object-contain mix-blend-multiply" 
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-emerald-950 truncate text-base">{selectedRentalProduct.name}</h3>
                  <p className="text-xs text-emerald-700 mt-0.5 line-clamp-1">{selectedRentalProduct.description || 'Dụng cụ thể thao cao cấp.'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-black text-emerald-600">
                      Giá thuê: {getRentalPricePerHour(selectedRentalProduct.price).toLocaleString('vi-VN')} đ/giờ
                    </p>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Tổng kho: {selectedRentalProduct.stock} cái
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Form Fields */}
              <div className="space-y-4">
                
                {/* Row 1: Date & Time Start */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ngày Thuê</label>
                    <input 
                      type="date"
                      value={rentalStartDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setRentalStartDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 font-medium text-gray-700 bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Giờ Bắt Đầu</label>
                    {availableHours.length > 0 ? (
                      <select
                        value={rentalStartTime}
                        onChange={(e) => setRentalStartTime(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 font-medium text-gray-700 bg-white shadow-sm"
                      >
                        {availableHours.map(formatted => (
                          <option key={formatted} value={formatted}>{formatted}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-500 font-bold bg-red-50 flex items-center gap-1.5 shadow-sm">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        Hết đồ cho ngày này
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Hours & Qty */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Thời Hạn Thuê (Tiếng)</label>
                    <select
                      value={rentalHours}
                      disabled={availableHours.length === 0}
                      onChange={(e) => setRentalHours(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 font-medium text-gray-700 bg-white shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="1">1 giờ</option>
                      <option value="2">2 giờ (Khuyên dùng)</option>
                      <option value="3">3 giờ</option>
                      <option value="4">4 giờ</option>
                      <option value="5">5 giờ</option>
                      <option value="8">8 giờ (Cả ngày)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Số Lượng Thuê {availableHours.length > 0 && `(Còn ${currentRemainingStock})`}
                    </label>
                    <div className="flex items-center justify-between border border-gray-200 rounded-xl p-1 bg-white shadow-sm">
                      <button
                        type="button"
                        disabled={availableHours.length === 0 || rentalQty <= 1}
                        onClick={() => setRentalQty(prev => prev > 1 ? prev - 1 : 1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-black text-gray-800">
                        {availableHours.length > 0 ? rentalQty : 0}
                      </span>
                      <button
                        type="button"
                        disabled={availableHours.length === 0 || rentalQty >= currentRemainingStock}
                        onClick={() => setRentalQty(prev => prev < currentRemainingStock ? prev + 1 : prev)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary Detail Box */}
                {availableHours.length > 0 ? (
                  <div className="bg-slate-50 rounded-xl p-4 border border-gray-150 space-y-2 mt-6">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Khung giờ thuê:</span>
                      <span className="font-bold text-gray-700">
                        {rentalStartTime} đến {getEndTime(rentalStartTime, rentalHours)} ngày {formatDateVN(rentalStartDate)} ({rentalHours} giờ)
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Giá thuê 1 chiếc/giờ:</span>
                      <span className="font-bold text-gray-700">
                        {getRentalPricePerHour(selectedRentalProduct.price).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-600 font-medium">
                      <span>Tổng phí thuê ({rentalQty} cái x {rentalHours} giờ):</span>
                      <span className="font-extrabold">
                        {(getRentalPricePerHour(selectedRentalProduct.price) * rentalHours * rentalQty).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 border-t border-dashed border-gray-200 pt-2">
                      <span>Đặt cọc tạm tính (Hoàn lại 100%):</span>
                      <span className="font-bold text-gray-700">
                        {(getDepositPrice(selectedRentalProduct.price) * rentalQty).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 text-red-700 border border-red-150 rounded-xl p-4 text-sm font-medium text-center mt-6">
                    Hết sạch dụng cụ trong kho trong toàn bộ khung giờ của ngày này. Vui lòng chọn một ngày khác!
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-6 mt-4 flex justify-end gap-3 border-t border-gray-50">
                <button 
                  onClick={() => setSelectedRentalProduct(null)} 
                  className="px-4 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button 
                  onClick={handleConfirmRental}
                  disabled={availableHours.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                  Xác Nhận Đặt Thuê
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Shop;
