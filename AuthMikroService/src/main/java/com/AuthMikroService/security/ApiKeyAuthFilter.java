package com.AuthMikroService.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    @Value("${app.security.api-key-header}")
    private String apiKeyHeader;

    @Value("${app.security.api-key-value}")
    private String correctApiKey;

    // 🚨 YENİ: Bu metot, filtrenin hangi durumlarda ÇALIŞMAYACAĞINI belirler.
    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        // "/api/auth/" ile başlayan tüm yollar (login, register) için bu filtreyi ATLA.
        return path.startsWith("/api/auth/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        // YENİ EKLENEN KISIM BAŞLANGICI
        // ==================================================
        // Authorization başlığını kontrol et (JWT için)
        String authorizationHeader = request.getHeader("Authorization");

        // Eğer istek "Bearer " ile başlıyorsa, bu bir JWT isteğidir.
        // Bu filtrenin görevi değil. Kenara çekil ve bir sonraki filtreye (AuthFilter) devret.
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return; // Bu filtreden hemen çık
        }
        // ==================================================
        // YENİ EKLENEN KISIM SONU

        String requestApiKey = request.getHeader(apiKeyHeader);

        if (requestApiKey == null || !requestApiKey.equals(correctApiKey)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("API Key is missing or invalid.");
            return;
        }

        filterChain.doFilter(request, response);
    }
}