package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "apartment_fee_units")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ApartmentFeeUnit {

    @Id
    private Long id;

    @Column(name = "apartment_price_per_m2", nullable = false)
    private Long apartmentPricePerM2;
    @Column(name = "service_fee_per_m2", nullable = false)
    private Long serviceFeePerM2;
    @Column(name = "water_fee_per_m3", nullable = false)
    private Long waterFeePerM3;
    @Column(name = "electricity_fee_per_kwh", nullable = false)
    private Long electricityFeePerKWh;
}
