package com.hometech.hometech.service;

import com.hometech.hometech.Repository.AccountReposirory;
import com.hometech.hometech.enums.RoleType;
import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.User;
import com.hometech.hometech.Repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final AccountReposirory accountReposirory;

    public UserService(UserRepository userRepository, AccountReposirory accountReposirory) {
        this.userRepository = userRepository;
        this.accountReposirory = accountReposirory;
    }

    // Lấy danh sách tất cả người dùng
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Cập nhật trạng thái hoạt động
    public void updateUserStatus(Long id, boolean enable) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + id));

        Account account = user.getAccount();
        if (account == null) {
            throw new RuntimeException("Người dùng không có tài khoản liên kết!");
        }

        account.setEnabled(enable);
        accountReposirory.save(account);
    }
    public void updateUserRole(Long id, RoleType roleName) {
        Account account = accountReposirory.findById(id)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        account.setRole(roleName);
        accountReposirory.save(account);
    }
    public User getById(long id) {
        Optional<User> userOpt = userRepository.findById(id);
        return userOpt.orElse(null);
    }
    public long countAll() { return userRepository.count(); }
    // 🟢 Tìm kiếm người dùng
    public List<User> searchUsers(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return userRepository.findAll(); // nếu ô tìm kiếm trống -> trả tất cả
        }
        return userRepository.findByFullNameContainingIgnoreCaseOrAccount_EmailContainingIgnoreCase(keyword, keyword);
    }
    public void save(User user) {
        userRepository.save(user);
    }
}
