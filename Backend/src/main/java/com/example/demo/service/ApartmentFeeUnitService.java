package com.example.demo.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.entity.ApartmentFeeUnit;
import com.example.demo.repository.ApartmentFeeUnitRepository;

@Service
public class ApartmentFeeUnitService {

    @Autowired
    private ApartmentFeeUnitRepository feeUnitRepository;
    
    public ApartmentFeeUnit getFeeUnit() {
        Optional<ApartmentFeeUnit> feeUnitOpt = feeUnitRepository.findById(1L);
        
        if (feeUnitOpt.isPresent()) {
            ApartmentFeeUnit feeUnit = feeUnitOpt.get();
            // Bảng giá tạo trước khi có đơn giá gửi xe: điền 0 cho các cột mới
            if (feeUnit.getParkingFeePerMonth() == null || feeUnit.getParkingFeePerHour() == null) {
                fillMissingParkingFees(feeUnit);
                feeUnit = feeUnitRepository.save(feeUnit);
            }
            return feeUnit;
        }
        
        // Tạo đơn giá mặc định nếu chưa có
        ApartmentFeeUnit defaultUnit = new ApartmentFeeUnit();
        defaultUnit.setId(1L);
        defaultUnit.setApartmentPricePerM2(300000L);
        defaultUnit.setServiceFeePerM2(15000L);
        defaultUnit.setWaterFeePerM3(15000L);
        defaultUnit.setElectricityFeePerKWh(3500L);
        fillMissingParkingFees(defaultUnit); // BQL tự thiết lập đơn giá gửi xe
        feeUnitRepository.save(defaultUnit);
        
        return defaultUnit;
    }
    
    public ApartmentFeeUnit saveFeeUnit(ApartmentFeeUnit feeUnit) {
        fillMissingParkingFees(feeUnit);
        return feeUnitRepository.save(feeUnit);
    }

    private static void fillMissingParkingFees(ApartmentFeeUnit feeUnit) {
        if (feeUnit.getParkingFeePerMonth() == null) {
            feeUnit.setParkingFeePerMonth(0L);
        }
        if (feeUnit.getParkingFeePerHour() == null) {
            feeUnit.setParkingFeePerHour(0L);
        }
    }

    public Optional<ApartmentFeeUnit> findById(long l) {
        return feeUnitRepository.findById(l);
    }
}