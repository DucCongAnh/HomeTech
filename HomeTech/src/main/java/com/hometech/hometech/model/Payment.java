package com.hometech.hometech.model;

import com.hometech.hometech.enums.PaymentMethod;
import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String method;
    private double amount;
    private String status;
    private String txnRef;
    private String orderInfo;
    private String bankCode;
    private String cardType;
    private String responseCode;
    private String transactionNo;
    private String payDate;
    private String transactionStatus;
    private String secureHash;

    @OneToOne
    @JoinColumn(name = "order_id")
    private Order order;
}
