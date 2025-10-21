package com.AuthMikroService.security;


import com.AuthMikroService.auth_users.entity.User;
import lombok.Builder;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.List;
import java.util.Collection;

@Builder
@Data
public class AuthUser implements UserDetails {

    private User user;

    @Override // role kısmı getirirsen burayı değiştircen
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Giriş yapan her kullanıcıya varsayılan olarak "ROLE_USER" yetkisi verilir.
        // Bu sayede endpoint'lerinizi `.hasRole("USER")` gibi kurallarla koruyabilirsiniz.
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isEnabled() {
        return user.isActive();
    }
}
