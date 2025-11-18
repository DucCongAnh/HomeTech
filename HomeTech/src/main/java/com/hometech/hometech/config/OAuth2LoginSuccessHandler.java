package com.hometech.hometech.config;

import com.hometech.hometech.Repository.AccountReposirory;
import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.Repository.UserRepository;
import com.hometech.hometech.enums.RoleType;
import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.Cart;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.service.CartService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final AccountReposirory accountRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final CartService cartService;

    public OAuth2LoginSuccessHandler(AccountReposirory accountRepository,
                                     UserRepository userRepository,
                                     CustomerRepository customerRepository,
                                     CartService cartService) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.cartService = cartService;
    }

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication)
            throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        if (email == null || email.isBlank()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Google không trả về email");
            return;
        }

        // 🔹 Tìm account theo email
        Account account = accountRepository.findByEmail(email).orElse(null);
        Customer customer;

        if (account == null) {
            // ✅ 1. Tạo customer trước để có ID
            customer = new Customer();
            customer.setFullName(name);
            customer.setCreatedAt(LocalDateTime.now());
            customer.setUpdatedAt(LocalDateTime.now());
            customerRepository.saveAndFlush(customer);

            // ✅ 2. Tạo account mới và gán user_id
            account = new Account();
            account.setUsername(email.split("@")[0]);
            account.setEmail(email);
            account.setPassword(""); // không cần mật khẩu
            account.setRole(RoleType.USER);
            account.setEnabled(true);
            account.setEmailVerified(true);
            account.setCreatedAt(LocalDateTime.now());
            account.setUpdatedAt(LocalDateTime.now());
            account.setUser(customer); // 🔹 gán user vào account

            accountRepository.saveAndFlush(account);

            // ✅ 3. Gán ngược lại (2 chiều)
            customer.setAccount(account);
            customerRepository.save(customer);

        } else {
            // Nếu account đã có thì load customer
            customer = customerRepository.findByAccount(account).orElse(null);
            if (customer == null) {
                customer = new Customer();
                customer.setFullName(name);
                customer.setAccount(account);
                customerRepository.save(customer);
            } else {
                customer.setFullName(name);
                customerRepository.save(customer);
            }
        }

        System.out.println("✅ Login Google thành công:");
        System.out.println("   - Account ID: " + account.getId());
        System.out.println("   - User ID: " + customer.getId());
        System.out.println("   - Account.user_id: " + (account.getUser() != null ? account.getUser().getId() : "NULL"));

        response.sendRedirect("http://localhost:8080/");
    }
}
