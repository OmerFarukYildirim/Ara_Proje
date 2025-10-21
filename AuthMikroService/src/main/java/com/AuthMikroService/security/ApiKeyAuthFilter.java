package com.AuthMikroService.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // İstekten API Key başlığını al
        String requestApiKey = request.getHeader(apiKeyHeader);

        // API anahtarı yoksa veya yanlışsa, isteği yetkisiz olarak reddet
        if (requestApiKey == null || !requestApiKey.equals(correctApiKey)) {
            // Public endpoint'lere (login/register gibi) API Key olmadan izin vermek için bu kontrolü atlayabiliriz.
            // Ama genel bir güvenlik katmanı olarak tüm API'yi korumak daha iyidir.
            // "/api/auth/**" gibi yolları bu filtreden hariç tutmak istersen SecurityFilter'da konfigüre edebiliriz.
            // Şimdilik tüm istekler için zorunlu tutuyoruz.

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("API Key is missing or invalid.");
            return; // Filtre zincirini durdur, isteğin devam etmesini engelle.
        }

        // Anahtar doğruysa, isteğin zincirdeki bir sonraki filtreye (AuthFilter) devam etmesine izin ver.
        filterChain.doFilter(request, response);
    }
}