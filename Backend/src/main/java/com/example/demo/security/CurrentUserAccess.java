package com.example.demo.security;

import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.example.demo.entity.Resident;
import com.example.demo.entity.User;
import com.example.demo.service.ResidentService;
import com.example.demo.service.UserService;

/**
 * Kiểm tra quyền của người dùng hiện tại đối với dữ liệu của căn hộ.
 * ADMIN xem được mọi căn hộ; cư dân chỉ xem được căn hộ của chính mình.
 */
@Component
public class CurrentUserAccess {

    @Autowired
    private UserService userService;

    @Autowired
    private ResidentService residentService;

    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    /** Số căn hộ mà người dùng hiện tại sở hữu/cư trú (rỗng nếu không xác định được). */
    public Set<String> ownApartmentNumbers() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return Set.of();
        }
        User user = userService.findByName(auth.getName());
        if (user == null || user.getResidentId() == null) {
            return Set.of();
        }
        Resident resident = residentService.findById(user.getResidentId());
        if (resident == null || resident.getApartmentNumbers() == null) {
            return Set.of();
        }
        return resident.getApartmentNumbers();
    }

    public boolean canAccessApartment(String apartmentNumber) {
        return isAdmin() || ownApartmentNumbers().contains(apartmentNumber);
    }
}
