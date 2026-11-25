package com.example.demo.service;

import com.example.demo.entity.Resident;
import com.example.demo.entity.User;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class OTPServiceTest {

    private static final String VICTIM_EMAIL = "victim@example.com";
    private static final String ATTACKER_EMAIL = "attacker@example.com";

    private OTPService otpService;
    private UserRepository userRepository;
    private MailService mailService;
    private User victim;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        ResidentRepository residentRepository = mock(ResidentRepository.class);
        mailService = mock(MailService.class);

        victim = new User();
        victim.setId(1L);
        victim.setName("victim");
        victim.setPassword(new BCryptPasswordEncoder().encode("old-password"));
        victim.setResidentId(10L);

        Resident resident = new Resident();
        resident.setId(10L);
        resident.setEmail(VICTIM_EMAIL);

        when(userRepository.findByName("victim")).thenReturn(victim);
        when(residentRepository.findById(10L)).thenReturn(Optional.of(resident));

        otpService = new OTPService();
        ReflectionTestUtils.setField(otpService, "userRepository", userRepository);
        ReflectionTestUtils.setField(otpService, "residentRepository", residentRepository);
        ReflectionTestUtils.setField(otpService, "mailService", mailService);
    }

    private String lastOtpSentTo(String email) {
        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        verify(mailService, atLeastOnce()).sendOTP(eq(email), otp.capture());
        return otp.getValue();
    }

    @Test
    void registrationOtpOfAnotherEmailCannotResetSomeoneElsesPassword() {
        otpService.sendGmailAuthentication(ATTACKER_EMAIL);
        String attackerOtp = lastOtpSentTo(ATTACKER_EMAIL);

        assertFalse(otpService.verifyOTPAndChangePassword("victim", ATTACKER_EMAIL, attackerOtp, "hacked"));
        assertFalse(otpService.verifyOTPAndChangePassword("victim", null, attackerOtp, "hacked"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetWorksWithOtpSentToRegisteredEmailAndIsSingleUse() {
        assertTrue(otpService.sendResetPasswordOTP("victim"));
        String otp = lastOtpSentTo(VICTIM_EMAIL);

        assertTrue(otpService.verifyOTPAndChangePassword("victim", VICTIM_EMAIL, otp, "new-password"));
        assertTrue(new BCryptPasswordEncoder().matches("new-password", victim.getPassword()));

        assertFalse(otpService.verifyOTPAndChangePassword("victim", VICTIM_EMAIL, otp, "again"));
    }

    @Test
    void resetOtpCannotBeUsedForRegistration() {
        otpService.sendResetPasswordOTP("victim");
        String otp = lastOtpSentTo(VICTIM_EMAIL);

        assertFalse(otpService.verifyOTPByEmail(VICTIM_EMAIL, otp));
    }

    @Test
    void otpIsInvalidatedAfterThreeWrongAttempts() {
        otpService.sendGmailAuthentication(ATTACKER_EMAIL);
        String otp = lastOtpSentTo(ATTACKER_EMAIL);
        String wrong = otp.equals("000000") ? "111111" : "000000";

        for (int i = 0; i < OTPService.MAX_FAILED_ATTEMPTS; i++) {
            assertFalse(otpService.verifyOTPByEmail(ATTACKER_EMAIL, wrong));
        }
        assertFalse(otpService.verifyOTPByEmail(ATTACKER_EMAIL, otp));
    }

    @Test
    void sendingIsLimitedToThreeOtpsPerEmail() {
        for (int i = 0; i < OTPService.MAX_SENDS; i++) {
            otpService.sendGmailAuthentication(ATTACKER_EMAIL);
        }
        assertThrows(RuntimeException.class, () -> otpService.sendGmailAuthentication(ATTACKER_EMAIL));
        verify(mailService, times(OTPService.MAX_SENDS)).sendOTP(eq(ATTACKER_EMAIL), any());
    }
}
