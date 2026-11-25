package com.example.demo.service;

import com.example.demo.entity.Resident;
import com.example.demo.entity.User;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.UserRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

/**
 * Quản lý OTP cho hai luồng: xác minh email khi đăng ký và đặt lại mật khẩu.
 * - OTP hết hạn sau 5 phút, chỉ dùng được một lần.
 * - Mỗi email chỉ được yêu cầu tối đa 3 OTP trong 15 phút cho mỗi luồng.
 * - Nhập sai 3 lần thì OTP bị hủy, phải yêu cầu OTP mới.
 * - OTP của luồng đăng ký không dùng được để đặt lại mật khẩu và ngược lại.
 */
@Service
public class OTPService {

    static final int MAX_SENDS = 3;
    static final int MAX_FAILED_ATTEMPTS = 3;

    private static final String PURPOSE_REGISTER = "REGISTER:";
    private static final String PURPOSE_RESET = "RESET:";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResidentRepository residentRepository;

    @Autowired
    private MailService mailService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    /** OTP đã băm, key = mục đích + email. */
    private final Cache<String, String> otpCache = Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();

    /** Số lần nhập sai của OTP hiện tại, key = mục đích + email. */
    private final Cache<String, Integer> failedAttemptCache = Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();

    /** Số lần yêu cầu gửi OTP, key = mục đích + email. */
    private final Cache<String, Integer> sendCountCache = Caffeine.newBuilder()
            .expireAfterWrite(15, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();

    private String generateOtp() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    private void issueOtp(String key, String email) {
        Integer sends = sendCountCache.getIfPresent(key);
        int count = sends == null ? 0 : sends;
        if (count >= MAX_SENDS) {
            throw new RuntimeException("Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút.");
        }

        String otp = generateOtp();
        otpCache.put(key, passwordEncoder.encode(otp));
        failedAttemptCache.invalidate(key);
        sendCountCache.put(key, count + 1);

        mailService.sendOTP(email, otp);
    }

    /** Kiểm tra OTP; đúng thì hủy OTP (dùng một lần), sai quá số lần cho phép thì hủy OTP. */
    private boolean consumeOtp(String key, String otp) {
        String storedOtp = otpCache.getIfPresent(key);
        if (storedOtp == null || otp == null) {
            return false;
        }
        if (passwordEncoder.matches(otp, storedOtp)) {
            otpCache.invalidate(key);
            failedAttemptCache.invalidate(key);
            return true;
        }

        Integer failed = failedAttemptCache.getIfPresent(key);
        int count = (failed == null ? 0 : failed) + 1;
        if (count >= MAX_FAILED_ATTEMPTS) {
            otpCache.invalidate(key);
            failedAttemptCache.invalidate(key);
        } else {
            failedAttemptCache.put(key, count);
        }
        return false;
    }

    private static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    /** Gửi OTP xác minh email khi đăng ký. */
    public boolean sendGmailAuthentication(String email) {
        issueOtp(PURPOSE_REGISTER + normalize(email), email);
        return true;
    }

    /** Gửi OTP đặt lại mật khẩu tới email đã đăng ký của tài khoản. */
    public boolean sendResetPasswordOTP(String username) {
        Resident resident = findResidentOf(username);
        if (resident == null || resident.getEmail() == null) {
            return false;
        }
        issueOtp(PURPOSE_RESET + normalize(resident.getEmail()), resident.getEmail());
        return true;
    }

    /**
     * Xác thực OTP đặt lại mật khẩu và đổi mật khẩu.
     * OTP luôn được kiểm tra với email đã đăng ký của chính tài khoản {@code username};
     * nếu client gửi kèm email thì email đó phải khớp, nếu không yêu cầu bị từ chối.
     */
    public boolean verifyOTPAndChangePassword(String username, String email, String otp, String newPassword) {
        if (newPassword == null || newPassword.isBlank()) {
            return false;
        }
        User user = username == null ? null : userRepository.findByName(username);
        Resident resident = findResidentOf(user);
        if (resident == null || resident.getEmail() == null) {
            return false;
        }
        String registeredEmail = normalize(resident.getEmail());
        if (email != null && !email.isBlank() && !registeredEmail.equals(normalize(email))) {
            return false;
        }
        if (!consumeOtp(PURPOSE_RESET + registeredEmail, otp)) {
            return false;
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return true;
    }

    /** Xác thực OTP của luồng đăng ký. */
    public boolean verifyOTPByEmail(String email, String otp) {
        return consumeOtp(PURPOSE_REGISTER + normalize(email), otp);
    }

    private Resident findResidentOf(String username) {
        return username == null ? null : findResidentOf(userRepository.findByName(username));
    }

    private Resident findResidentOf(User user) {
        if (user == null || user.getResidentId() == null) {
            return null;
        }
        return residentRepository.findById(user.getResidentId()).orElse(null);
    }
}
