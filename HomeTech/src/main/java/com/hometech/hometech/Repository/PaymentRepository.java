package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
}
