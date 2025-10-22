package com.SourceManagerMicroService;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SourceManagerMicroServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(SourceManagerMicroServiceApplication.class, args);
	}

}
