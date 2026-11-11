package com.example.demo.entity;

import com.example.demo.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "resident_contributions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ResidentContribution {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contribution_id", nullable = false)
    private Long contributionId;

    @Column(name = "resident_id", nullable = false)
    private Long residentId;

    @Column(name = "apartment_number", nullable = false)
    private String apartmentNumber;

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "payment_status", nullable = false)
    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "contribution_type_name")
    private String contributionName;
} 