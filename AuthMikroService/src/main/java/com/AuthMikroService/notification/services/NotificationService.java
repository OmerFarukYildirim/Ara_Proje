package com.AuthMikroService.notification.services;


import com.AuthMikroService.notification.dtos.NotificationDTO;

public interface NotificationService {
    void sendEmail(NotificationDTO notificationDTO);
}
