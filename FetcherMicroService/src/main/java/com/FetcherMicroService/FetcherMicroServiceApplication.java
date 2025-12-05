package com.FetcherMicroService;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FetcherMicroServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(FetcherMicroServiceApplication.class, args);
	}

}
