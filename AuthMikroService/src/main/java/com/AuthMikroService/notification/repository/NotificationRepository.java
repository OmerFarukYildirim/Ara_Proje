package com.AuthMikroService.notification.repository;


import com.AuthMikroService.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
}
