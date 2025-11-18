package com.hometech.hometech.controller.Api;

import com.hometech.hometech.model.Voucher;
import com.hometech.hometech.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vouchers")

public class VoucherRestController {

    public VoucherRestController(VoucherService voucherService) {
        this.voucherService = voucherService;
    }

    private final VoucherService voucherService;

    // ================= Build Response ===================
    private ResponseEntity<Map<String, Object>> buildResponse(
            boolean success,
            String message,
            Object data,
            String error,
            HttpStatus status
    ) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", success);
        body.put("message", message);
        body.put("data", data);
        body.put("error", error);
        return new ResponseEntity<>(body, status);
    }

    // ================= CRUD ===================
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Voucher voucher) {
        try {
            Voucher created = voucherService.create(voucher);
            return buildResponse(true, "Tạo voucher thành công", created, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Tạo voucher thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Voucher voucher) {
        try {
            Voucher updated = voucherService.update(id, voucher);
            return buildResponse(true, "Cập nhật voucher thành công", updated, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Cập nhật voucher thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            voucherService.delete(id);
            return buildResponse(true, "Xóa voucher thành công", null, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Xóa voucher thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        List<Voucher> vouchers = voucherService.getAll();
        return buildResponse(true, "Lấy danh sách voucher thành công", vouchers, null, HttpStatus.OK);
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<?> getByCode(@PathVariable String code) {
        try {
            Voucher voucher = voucherService.getByCode(code);
            return buildResponse(true, "Lấy voucher theo mã thành công", voucher, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Không tìm thấy voucher", null, e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    // ================= APPLY VOUCHER ===================
    @GetMapping("/apply")
    public ResponseEntity<?> applyVoucher(
            @RequestParam String code,
            @RequestParam double orderTotal
    ) {
        try {
            double discounted = voucherService.applyVoucher(code, orderTotal);
            return buildResponse(true, "Áp dụng voucher thành công", discounted, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Áp dụng voucher thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }
}
