package com.example.demo.controller;

import com.example.demo.entity.ApartmentFeeUnit;
import com.example.demo.service.ApartmentFeeUnitService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/fee-units")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class ApartmentFeeUnitController {

    @Autowired
    private ApartmentFeeUnitService feeUnitService;

    @GetMapping
    public ResponseEntity<ApartmentFeeUnit> getFeeUnit() {
        ApartmentFeeUnit feeUnit = feeUnitService.getFeeUnit();
        return ResponseEntity.ok(feeUnit);
    }

    @PostMapping
    public ResponseEntity<?> saveFeeUnit(@RequestBody ApartmentFeeUnit feeUnit) {
        if (feeUnit.getApartmentPricePerM2() == null ||
            feeUnit.getServiceFeePerM2() == null ||
            feeUnit.getWaterFeePerM3() == null ||
            feeUnit.getElectricityFeePerKWh() == null) {

            Map<String, String> error = new HashMap<>();
            error.put("message", "Vui lòng nhập đầy đủ đơn giá phí căn hộ, dịch vụ, điện và nước!");
            return ResponseEntity.badRequest().body(error);
        }

        if (isNegative(feeUnit.getApartmentPricePerM2()) ||
            isNegative(feeUnit.getServiceFeePerM2()) ||
            isNegative(feeUnit.getWaterFeePerM3()) ||
            isNegative(feeUnit.getElectricityFeePerKWh()) ||
            isNegative(feeUnit.getParkingFeePerMonth()) ||
            isNegative(feeUnit.getParkingFeePerHour())) {

            Map<String, String> error = new HashMap<>();
            error.put("message", "Giá trị phí không thể là số âm!");
            return ResponseEntity.badRequest().body(error);
        }

        feeUnit.setId(1L);
        ApartmentFeeUnit savedFeeUnit = feeUnitService.saveFeeUnit(feeUnit);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Cập nhật đơn giá thành công!");
        response.put("status", "success");

        return ResponseEntity.ok(savedFeeUnit);
    }

    private static boolean isNegative(Long value) {
        return value != null && value < 0;
    }
} 