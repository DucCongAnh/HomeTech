package com.hometech.hometech.dto;

public class PreviewOrderResponse {
    public double subtotal;
    public double discount;
    public double finalTotal;
    public boolean voucherValid;
    public String voucherMessage;

    public PreviewOrderResponse(double subtotal, double discount, double finalTotal,
                                boolean voucherValid, String voucherMessage) {
        this.subtotal = subtotal;
        this.discount = discount;
        this.finalTotal = finalTotal;
        this.voucherValid = voucherValid;
        this.voucherMessage = voucherMessage;
    }
}
