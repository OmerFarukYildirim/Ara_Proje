package com.AuthMikroService.auth_users.repository;

import com.AuthMikroService.auth_users.entity.Form;
import org.springframework.data.jpa.repository.JpaRepository;


public interface FormRepository extends JpaRepository<Form, Long> {

    int countByEmail(String email);
}
