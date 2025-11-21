package com.hometech.hometech.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
public class OrderSchemaFixer {

    private static final Logger log = LoggerFactory.getLogger(OrderSchemaFixer.class);
    private final JdbcTemplate jdbcTemplate;

    public OrderSchemaFixer(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @PostConstruct
    public void ensurePaymentMethodSupportsVnPay() {
        try {
            String columnType = jdbcTemplate.queryForObject(
                    """
                            SELECT COLUMN_TYPE
                            FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()
                              AND TABLE_NAME = 'orders'
                              AND COLUMN_NAME = 'payment_method'
                            """,
                    String.class
            );

            if (columnType != null
                    && columnType.startsWith("enum(")
                    && !columnType.contains("VNPAY")) {
                log.info("Updating orders.payment_method enum to include VNPAY");
                jdbcTemplate.execute(
                        "ALTER TABLE orders " +
                                "MODIFY payment_method ENUM('COD','MOMO','CARD','VNPAY') " +
                                "DEFAULT 'COD'"
                );
                log.info("orders.payment_method enum updated successfully");
            }
        } catch (Exception ex) {
            log.warn("Could not verify/alter orders.payment_method column: {}", ex.getMessage());
        }
    }
}
