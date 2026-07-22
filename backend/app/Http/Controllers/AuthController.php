<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Gửi mã xác thực qua Email
     */
    public function sendCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Email không đúng định dạng.'
            ], 422);
        }

        // Kiểm tra xem email đã tồn tại chưa
        if (User::where('email', $request->email)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Email này đã được đăng ký trong hệ thống.'
            ], 422);
        }

        // Tạo mã ngẫu nhiên 6 chữ số
        $code = rand(100000, 999999);

        // Lưu mã vào Cache trong 10 phút
        \Illuminate\Support\Facades\Cache::put('verify_code_' . $request->email, $code, now()->addMinutes(10));

        // Lưu log để dễ dàng lấy khi test không có mail server thực tế
        \Illuminate\Support\Facades\Log::info("Verification code for {$request->email}: {$code}");

        // Gửi email bằng PHPMailer
        try {
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

            // Server settings - Verbose connection debug logging
            $mail->SMTPDebug = 2; 
            $mail->Debugoutput = function($str, $level) {
                \Illuminate\Support\Facades\Log::debug("PHPMailer SMTP: " . trim($str));
            };
            
            $mail->isSMTP();                                            // Send using SMTP
            $mail->Host       = env('MAIL_HOST', 'smtp.gmail.com');     // SMTP server
            $mail->SMTPAuth   = true;                                   // Enable SMTP authentication
            $mail->Username   = env('MAIL_USERNAME');                   // SMTP username
            $mail->Password   = env('MAIL_PASSWORD');                   // SMTP password
            
            // Cấu hình Bỏ qua Xác thực SSL trên Localhost (Vô cùng quan trọng trên Windows)
            $mail->SMTPOptions = array(
                'ssl' => array(
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                )
            );

            // Encryption and Port
            $encryption = env('MAIL_ENCRYPTION', 'tls');
            if ($encryption === 'ssl') {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS; // ssl
                $mail->Port       = env('MAIL_PORT', 465);
            } else {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS; // tls
                $mail->Port       = env('MAIL_PORT', 587);
            }
            
            $mail->CharSet = 'UTF-8';                                   // Hỗ trợ hiển thị Tiếng Việt không lỗi font

            // Recipients
            $mail->setFrom(env('MAIL_FROM_ADDRESS', 'tuongvo1005@gmail.com'), env('MAIL_FROM_NAME', 'Pickleball Pro'));
            $mail->addAddress($request->email);                         // Người nhận

            // Content
            $mail->isHTML(true);                                        // Đặt định dạng email thành HTML
            $mail->Subject = '[Pickleball Pro] Mã xác thực đăng ký tài khoản';
            $mail->Body    = "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>
                    <div style='text-align: center; margin-bottom: 20px;'>
                        <h2 style='color: #16a34a; font-weight: 800; font-size: 22px; margin: 0;'>PickleBall Pro</h2>
                        <p style='color: #6b7280; font-size: 12px; margin: 5px 0 0 0;'>Hệ thống Đặt Sân & Cửa Hàng Dụng Cụ</p>
                    </div>
                    <div style='border-top: 2px solid #f3f4f6; padding-top: 20px;'>
                        <p style='color: #374151; font-size: 14px; line-height: 1.5; font-weight: 500;'>Chào bạn,</p>
                        <p style='color: #4b5563; font-size: 14px; line-height: 1.5;'>Bạn đang thực hiện đăng ký tài khoản thành viên mới tại hệ thống của chúng tôi. Dưới đây là mã OTP xác thực email của bạn:</p>
                        
                        <div style='background-color: #f0fdf4; border: 1px dashed #bbf7d0; padding: 15px; text-align: center; border-radius: 12px; margin: 25px 0;'>
                            <span style='font-size: 28px; font-weight: 900; color: #15803d; letter-spacing: 6px; font-family: monospace;'>{$code}</span>
                        </div>
                        
                        <p style='color: #ef4444; font-size: 11px; line-height: 1.5; font-weight: bold; margin-bottom: 20px;'>
                            * Mã xác thực có giá trị sử dụng trong 10 phút. Tuyệt đối không chia sẻ mã này với bất kỳ ai để tránh mất mát thông tin cá nhân.
                        </p>
                    </div>
                    <div style='border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 11px;'>
                        Đây là email tự động từ hệ thống PickleBall Pro. Vui lòng không trả lời thư này.
                    </div>
                </div>
            ";

            $mail->send();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send mail using PHPMailer: " . $e->getMessage() . " with config: Host: " . env('MAIL_HOST') . ", Port: " . env('MAIL_PORT') . ", Username: " . env('MAIL_USERNAME'));
        }

        return response()->json([
            'success' => true,
            'message' => 'Mã xác thực đã được gửi về email của bạn! Vui lòng kiểm tra hộp thư.',
            'debug_code' => $code 
        ]);
    }

    /**
     * Gửi mã OTP Quên mật khẩu qua Email
     */
    public function sendForgotPasswordOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Email không đúng định dạng.'
            ], 422);
        }

        // Kiểm tra xem email có tồn tại trong hệ thống hay không
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email này chưa được đăng ký trong hệ thống.'
            ], 404);
        }

        // Tạo mã ngẫu nhiên 6 chữ số
        $code = rand(100000, 999999);

        // Lưu mã vào Cache trong 10 phút
        \Illuminate\Support\Facades\Cache::put('reset_password_code_' . $request->email, $code, now()->addMinutes(10));

        // Lưu log để dễ dàng lấy khi test không có mail server thực tế
        \Illuminate\Support\Facades\Log::info("Forgot password OTP for {$request->email}: {$code}");

        // Gửi email bằng PHPMailer
        try {
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

            // Server settings
            $mail->SMTPDebug = 2; 
            $mail->Debugoutput = function($str, $level) {
                \Illuminate\Support\Facades\Log::debug("PHPMailer SMTP: " . trim($str));
            };
            
            $mail->isSMTP();                                            // Send using SMTP
            $mail->Host       = env('MAIL_HOST', 'smtp.gmail.com');     // SMTP server
            $mail->SMTPAuth   = true;                                   // Enable SMTP authentication
            $mail->Username   = env('MAIL_USERNAME');                   // SMTP username
            $mail->Password   = env('MAIL_PASSWORD');                   // SMTP password
            
            // Cấu hình Bỏ qua Xác thực SSL trên Localhost
            $mail->SMTPOptions = array(
                'ssl' => array(
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                )
            );

            // Encryption and Port
            $encryption = env('MAIL_ENCRYPTION', 'tls');
            if ($encryption === 'ssl') {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
                $mail->Port       = env('MAIL_PORT', 465);
            } else {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                $mail->Port       = env('MAIL_PORT', 587);
            }
            
            $mail->CharSet = 'UTF-8';

            // Recipients
            $mail->setFrom(env('MAIL_FROM_ADDRESS', 'tuongvo1005@gmail.com'), env('MAIL_FROM_NAME', 'Pickleball Pro'));
            $mail->addAddress($request->email);

            // Content
            $mail->isHTML(true);
            $mail->Subject = '[Pickleball Pro] Yêu cầu khôi phục mật khẩu (Mã OTP)';
            $mail->Body    = "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>
                    <div style='text-align: center; margin-bottom: 20px;'>
                        <h2 style='color: #16a34a; font-weight: 800; font-size: 22px; margin: 0;'>PickleBall Pro</h2>
                        <p style='color: #6b7280; font-size: 12px; margin: 5px 0 0 0;'>Hệ thống Đặt Sân & Cửa Hàng Dụng Cụ</p>
                    </div>
                    <div style='border-top: 2px solid #f3f4f6; padding-top: 20px;'>
                        <p style='color: #374151; font-size: 14px; line-height: 1.5; font-weight: 500;'>Chào {$user->name},</p>
                        <p style='color: #4b5563; font-size: 14px; line-height: 1.5;'>Bạn (hoặc ai đó) vừa yêu cầu khôi phục mật khẩu cho tài khoản tại hệ thống Pickleball Pro. Dưới đây là mã OTP xác nhận của bạn:</p>
                        
                        <div style='background-color: #fef2f2; border: 1px dashed #fca5a5; padding: 15px; text-align: center; border-radius: 12px; margin: 25px 0;'>
                            <span style='font-size: 28px; font-weight: 900; color: #dc2626; letter-spacing: 6px; font-family: monospace;'>{$code}</span>
                        </div>
                        
                        <p style='color: #ef4444; font-size: 11px; line-height: 1.5; font-weight: bold; margin-bottom: 20px;'>
                            * Mã OTP có giá trị sử dụng trong 10 phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc đổi mật khẩu để bảo mật tài khoản.
                        </p>
                    </div>
                    <div style='border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 11px;'>
                        Đây là email tự động từ hệ thống PickleBall Pro. Vui lòng không trả lời thư này.
                    </div>
                </div>
            ";

            $mail->send();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send reset password mail: " . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Mã OTP khôi phục mật khẩu đã được gửi về email của bạn!',
            'debug_code' => $code 
        ]);
    }

    /**
     * Xác nhận OTP và đặt lại mật khẩu mới
     */
    public function resetPasswordWithOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'             => 'required|string|email|max:255',
            'verification_code' => 'required|string|size:6',
            'password'          => 'required|string|min:6|confirmed',
        ], [
            'verification_code.required' => 'Vui lòng nhập mã OTP.',
            'verification_code.size'     => 'Mã OTP phải đúng 6 chữ số.',
            'password.required'          => 'Vui lòng nhập mật khẩu mới.',
            'password.min'               => 'Mật khẩu mới phải từ 6 ký tự trở lên.',
            'password.confirmed'         => 'Mật khẩu xác nhận không khớp.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors()
            ], 422);
        }

        // Kiểm tra mã OTP trong Cache
        $storedCode = \Illuminate\Support\Facades\Cache::get('reset_password_code_' . $request->email);

        if (!$storedCode || $storedCode != $request->verification_code) {
            return response()->json([
                'success' => false,
                'message' => 'Mã OTP không chính xác hoặc đã hết hạn.'
            ], 422);
        }

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin tài khoản.'
            ], 404);
        }

        // Cập nhật mật khẩu
        $user->update([
            'password' => Hash::make($request->password)
        ]);

        // Đăng xuất khỏi các thiết bị khác (xóa tokens cũ)
        $user->tokens()->delete();

        // Xóa mã OTP đã dùng
        \Illuminate\Support\Facades\Cache::forget('reset_password_code_' . $request->email);

        return response()->json([
            'success' => true,
            'message' => 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.'
        ]);
    }

    /**
     * Đăng ký tài khoản mới
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'sometimes|in:admin,coach,user',
            'phone' => 'nullable|string|max:20',
            'verification_code' => 'required|string|size:6'
        ], [
            'verification_code.required' => 'Vui lòng điền mã xác thực gửi qua email.',
            'verification_code.size' => 'Mã xác thực phải đúng 6 chữ số.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Kiểm tra mã xác thực từ Cache
        $storedCode = \Illuminate\Support\Facades\Cache::get('verify_code_' . $request->email);

        if (!$storedCode || $storedCode != $request->verification_code) {
            return response()->json([
                'success' => false,
                'message' => 'Mã xác thực không chính xác hoặc đã hết hạn.'
            ], 422);
        }

        // Xóa mã sau khi xác thực thành công
        \Illuminate\Support\Facades\Cache::forget('verify_code_' . $request->email);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password), // Mã hóa password
            'role' => 'user',
            'phone' => $request->phone,
        ]);

        // Tạo token đăng nhập (Dùng Sanctum)
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Đăng ký thành công!',
            'data' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer'
        ], 201);
    }

    /**
     * Đăng nhập
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        // Kiểm tra user có tồn tại và password có khớp không
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Email hoặc mật khẩu không chính xác.'
            ], 401);
        }

        // Xóa token cũ và tạo token mới
        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Đăng nhập thành công!',
            'data' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer'
        ], 200);
    }

    /**
     * Lấy thông tin user đang đăng nhập
     */
    public function profile(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $request->user()
        ]);
    }

    /**
     * Cập nhật thông tin cá nhân
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name'        => 'sometimes|required|string|max:255',
            'phone'       => 'nullable|string|max:20',
            'bio'         => 'nullable|string',
            'hourly_rate' => 'nullable|numeric|min:0',
            'experience'  => 'nullable|integer|min:0',
            'expertise'   => 'nullable|string',
            'password'    => 'nullable|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors()
            ], 422);
        }

        $data = $request->only(['name', 'phone', 'bio', 'hourly_rate', 'experience', 'expertise']);

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật hồ sơ thành công!',
            'data'    => $user->fresh()
        ]);
    }

    /**
     * Upload ảnh đại diện
     */
    public function uploadAvatar(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:4096', // Nâng giới hạn lên 4MB cho thoải mái
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'File tải lên không hợp lệ. Vui lòng chọn ảnh định dạng jpeg, png, jpg, gif và dưới 4MB.'
            ], 422);
        }

        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');
            
            $cloudName = env('CLOUDINARY_CLOUD_NAME');
            $apiKey = env('CLOUDINARY_API_KEY');
            $apiSecret = env('CLOUDINARY_API_SECRET');
            $avatarUrl = null;

            // Nếu người dùng đã cấu hình đầy đủ các biến môi trường Cloudinary
            if ($cloudName && $apiKey && $apiSecret) {
                try {
                    $timestamp = time();
                    
                    // Tạo signature theo chuẩn bảo mật của Cloudinary
                    $params = [
                        'timestamp' => $timestamp
                    ];
                    ksort($params);
                    $signString = "";
                    foreach ($params as $key => $val) {
                        $signString .= "$key=$val&";
                    }
                    $signString = rtrim($signString, '&') . $apiSecret;
                    $signature = sha1($signString);

                    // Sử dụng HTTP Client tích hợp sẵn của Laravel để POST multipart lên Cloudinary
                    $response = \Illuminate\Support\Facades\Http::attach(
                        'file', 
                        file_get_contents($file->getRealPath()), 
                        $file->getClientOriginalName()
                    )->post("https://api.cloudinary.com/v1_1/{$cloudName}/image/upload", [
                        'api_key'   => $apiKey,
                        'timestamp' => $timestamp,
                        'signature' => $signature,
                    ]);

                    if ($response->successful()) {
                        $responseData = $response->json();
                        $avatarUrl = $responseData['secure_url']; // URL ảnh trên đám mây Cloudinary
                    } else {
                        \Illuminate\Support\Facades\Log::error("Cloudinary upload failed: " . $response->body());
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Cloudinary upload exception: " . $e->getMessage());
                }
            }

            // Fallback lưu cục bộ nếu Cloudinary chưa cấu hình hoặc xảy ra lỗi trong quá trình upload
            if (!$avatarUrl) {
                $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $destinationPath = public_path('uploads/avatars');
                
                if (!file_exists($destinationPath)) {
                    mkdir($destinationPath, 0755, true);
                }
                
                $file->move($destinationPath, $filename);
                $avatarUrl = asset('uploads/avatars/' . $filename);
            } else {
                // Nếu upload Cloudinary thành công, tiến hành xóa ảnh lưu cục bộ cũ của người dùng này nếu có
                if ($user->avatar && str_contains($user->avatar, '/uploads/avatars/')) {
                    $oldFilename = basename($user->avatar);
                    $oldFilePath = public_path('uploads/avatars/' . $oldFilename);
                    if (file_exists($oldFilePath)) {
                        @unlink($oldFilePath);
                    }
                }
            }

            $user->update(['avatar' => $avatarUrl]);

            return response()->json([
                'success' => true,
                'message' => 'Tải ảnh đại diện lên thành công!',
                'data' => $user->fresh()
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Không tìm thấy file ảnh.'
        ], 400);
    }

    /**
     * Đăng xuất
     */
    public function logout(Request $request)
    {
        // Xóa token hiện tại
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đăng xuất thành công!'
        ]);
    }

    /**
     * --- ADMIN USER MANAGEMENT METHODS ---
     */
    
    public function getCoaches()
    {
        $coaches = User::where('role', 'coach')->get()->map(function ($c) {
            // Cung cấp các dữ liệu mẫu nếu các trường trong DB trống
            if (empty($c->avatar)) {
                $c->avatar = "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=256&auto=format&fit=crop";
            }
            if (empty($c->experience)) {
                $c->experience = "3 năm";
            }
            if (empty($c->expertise)) {
                $c->expertise = "Căn bản & Nâng cao";
            }
            if (empty($c->hourly_rate) || $c->hourly_rate <= 0) {
                $c->hourly_rate = 250000;
            }
            return $c;
        });

        return response()->json([
            'success' => true,
            'data' => $coaches
        ]);
    }

    public function getAllUsers(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền truy cập.'], 403);
        }

        $users = User::all();
        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    public function createUserByAdmin(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền thực hiện.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,coach,user',
            'phone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'phone' => $request->phone,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tạo người dùng mới thành công!',
            'data' => $user
        ], 201);
    }

    public function updateUserByAdmin(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền thực hiện.'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy người dùng.'], 404);
        }

        if ($id == 1 && $request->has('role') && $request->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Không thể thay đổi quyền của Admin tối cao.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $id,
            'phone' => 'nullable|string|max:20',
            'role' => 'sometimes|in:admin,coach,user',
            'bio' => 'nullable|string',
            'hourly_rate' => 'nullable|numeric|min:0',
            'experience' => 'nullable|string|max:255',
            'expertise' => 'nullable|string|max:255',
            'avatar' => 'nullable|string',
            'admin_password' => 'required|string',
        ], [
            'admin_password.required' => 'Mật khẩu xác nhận Admin là bắt buộc.'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
        }

        // Kiểm tra mật khẩu Admin hiện tại
        if (!Hash::check($request->admin_password, $request->user()->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu xác nhận Admin không chính xác. Không thể thực hiện cập nhật!'
            ], 422);
        }

        if ($request->has('name')) {
            $user->name = $request->name;
        }
        if ($request->has('email')) {
            $user->email = $request->email;
        }
        if ($request->has('phone')) {
            $user->phone = $request->phone;
        }
        if ($request->has('role')) {
            $user->role = $request->role;
        }
        if ($request->has('bio')) {
            $user->bio = $request->bio;
        }
        if ($request->has('hourly_rate')) {
            $user->hourly_rate = $request->hourly_rate;
        }
        if ($request->has('experience')) {
            $user->experience = $request->experience;
        }
        if ($request->has('expertise')) {
            $user->expertise = $request->expertise;
        }
        if ($request->has('avatar')) {
            $user->avatar = $request->avatar;
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thành công!',
            'data' => $user
        ]);
    }

    public function deleteUserByAdmin(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền thực hiện.'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy người dùng.'], 404);
        }

        if ($id == 1) {
            return response()->json(['success' => false, 'message' => 'Không thể xóa Admin tối cao.'], 403);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa người dùng thành công!'
        ]);
    }
}
