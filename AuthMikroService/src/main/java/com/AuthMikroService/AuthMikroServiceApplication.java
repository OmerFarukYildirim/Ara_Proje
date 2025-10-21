package com.AuthMikroService;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AuthMikroServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(AuthMikroServiceApplication.class, args);
	}

}
