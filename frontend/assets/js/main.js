// frontend/assets/js/main.js

// Khởi tạo instance Axios với Base URL chung của Backend
const apiClient = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
});

// Hàm lấy dữ liệu sân (Courts) từ API
function fetchCourts() {
    apiClient.get('/courts')
        .then(function (response) {
            // In kết quả thành công ra Console
            console.log('✅ Fetch Courts Success:', response.data.data);
        })
        .catch(function (error) {
            // In lỗi ra Console
            console.error('❌ Fetch Courts Error:', error);
        });
}

// Tự động chạy hàm ngay khi file main.js được tải
fetchCourts();
