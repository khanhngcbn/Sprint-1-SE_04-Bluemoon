package com.example.demo.controller;

import com.example.demo.entity.Apartment;
import com.example.demo.entity.Bill;
import com.example.demo.entity.Resident;
import com.example.demo.service.ApartmentService;
import com.example.demo.service.BillService;
import com.example.demo.service.ResidentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import com.example.demo.security.CurrentUserAccess;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/user/apartment-detail")
@CrossOrigin
public class UserApartmentDetailController {

	@Autowired
	private ApartmentService apartmentService;

	@Autowired
	private BillService billService;

	@Autowired
	private ResidentService residentService;

	@Autowired
	private CurrentUserAccess access;

	@GetMapping
	public ResponseEntity<?> getApartmentDetail(@RequestParam("apartmentNumber") String apartmentNumber) {
		if (!access.canAccessApartment(apartmentNumber)) {
			return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền xem căn hộ này");
		}

		Apartment apartment = apartmentService.getApartmentByNumber(apartmentNumber);

		if (apartment == null) {
			return ResponseEntity.notFound().build();
		}

		// Lấy danh sách khoản thu
		Set<Bill> bills = billService.findByIdIn(apartment.getBillIds());

		// Lấy danh sách cư dân
		Set<Resident> residents = residentService.findByIdIn(apartment.getResidentIds());

		// Đóng gói dữ liệu vào một Map để trả về JSON
		Map<String, Object> response = new HashMap<>();
		response.put("apartment", apartment);
		response.put("bills", bills);
		response.put("residents", residents);

		return ResponseEntity.ok(response);
	}
}
