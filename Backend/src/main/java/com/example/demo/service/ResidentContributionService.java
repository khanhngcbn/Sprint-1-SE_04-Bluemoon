package com.example.demo.service;

import com.example.demo.dto.ResidentContributionDTO;
import com.example.demo.entity.Contribution;
import com.example.demo.entity.ResidentContribution;
import com.example.demo.enums.ContributionStatus;
import com.example.demo.enums.PaymentStatus;
import com.example.demo.repository.ContributionRepository;
import com.example.demo.repository.ResidentContributionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.ResidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ResidentContributionService {

    @Autowired
    private ResidentContributionRepository residentContributionRepository;

    @Autowired
    private ContributionRepository contributionRepository;

    @Autowired
    private ResidentRepository residentRepository;

    @Autowired
    private UserRepository userRepository;

    public List<ResidentContributionDTO> getContributionsByContributionId(Long contributionId) {
        List<ResidentContribution> contributions = residentContributionRepository.findByContributionId(contributionId);
        return contributions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ResidentContributionDTO> getContributionsByResidentId(Long residentId) {
        List<ResidentContribution> contributions = residentContributionRepository.findByResidentId(residentId);
        return contributions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ResidentContributionDTO> getContributionsByApartmentNumber(String apartmentNumber) {
        List<ResidentContribution> contributions = residentContributionRepository.findByApartmentNumber(apartmentNumber);
        return contributions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public ResidentContributionDTO getContributionById(Long id) {
        ResidentContribution contribution = residentContributionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khoản đóng góp của cư dân"));
        return convertToDTO(contribution);
    }

    @Transactional
    public ResidentContributionDTO createResidentContribution(ResidentContributionDTO dto) {
        // Kiểm tra xem khoản đóng góp có tồn tại và đang active không
        Contribution contribution = contributionRepository.findById(dto.getContributionId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khoản đóng góp"));

        if (contribution.getStatus() != ContributionStatus.ACTIVE) {
            throw new RuntimeException("Khoản đóng góp không còn hoạt động");
        }
        
        // Kiểm tra ngày kết thúc
        if (contribution.getEndDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Khoản đóng góp đã hết hạn");
        }

        ResidentContribution residentContribution = new ResidentContribution();
        residentContribution.setContributionId(dto.getContributionId());
        residentContribution.setResidentId(dto.getResidentId());
        residentContribution.setApartmentNumber(dto.getApartmentNumber());
        residentContribution.setAmount(dto.getAmount());
        residentContribution.setNote(dto.getNote());
        residentContribution.setContributionName(contribution.getTitle());
        
        if (dto.getPaymentStatus() != null) {
            residentContribution.setPaymentStatus(dto.getPaymentStatus());
        } else {
            residentContribution.setPaymentStatus(PaymentStatus.UNPAID);
        }
        
        residentContribution.setCreatedAt(LocalDateTime.now());

        return convertToDTO(residentContributionRepository.save(residentContribution));
    }

    private ResidentContributionDTO convertToDTO(ResidentContribution contribution) {
        ResidentContributionDTO dto = new ResidentContributionDTO();
        dto.setId(contribution.getId());
        dto.setContributionId(contribution.getContributionId());
        dto.setResidentId(contribution.getResidentId());
        dto.setApartmentNumber(contribution.getApartmentNumber());
        dto.setAmount(contribution.getAmount());
        dto.setNote(contribution.getNote());
        dto.setPaymentStatus(contribution.getPaymentStatus());
        dto.setPaidAt(contribution.getPaidAt());
        dto.setCreatedAt(contribution.getCreatedAt());
        dto.setContributionName(contribution.getContributionName());

        if (contribution.getResidentId() != null) {
            residentRepository.findById(contribution.getResidentId())
                    .ifPresent(resident -> dto.setResidentName(resident.getFullName()));
        }

        if (contribution.getContributionId() != null) {
            contributionRepository.findById(contribution.getContributionId())
                    .ifPresent(contrib -> {
                        dto.setContributionTitle(contrib.getTitle());
                    });
        }

        return dto;
    }

    public List<ResidentContributionDTO> getAllContributions() {
        List<ResidentContribution> contributions = residentContributionRepository.findAll();
        return contributions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
} 