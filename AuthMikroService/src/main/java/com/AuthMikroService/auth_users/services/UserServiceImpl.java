package com.AuthMikroService.auth_users.services;

import com.AuthMikroService.auth_users.dtos.FormDTO;
import com.AuthMikroService.auth_users.dtos.UserDTO;
import com.AuthMikroService.auth_users.entity.Form;
import com.AuthMikroService.auth_users.entity.User;
import com.AuthMikroService.auth_users.repository.FormRepository;
import com.AuthMikroService.auth_users.repository.UserRepository;
import com.AuthMikroService.exceptions.BadRequestException;
import com.AuthMikroService.exceptions.NotFoundException;
import com.AuthMikroService.notification.dtos.NotificationDTO;
import com.AuthMikroService.notification.services.NotificationService;
import com.AuthMikroService.response.Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeToken;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final FormRepository formRepository;
    private final PasswordEncoder passwordEncoder;
    private final ModelMapper modelMapper;
    private final NotificationService notificationService;


    @Override
    public User getCurrentLoggedInUser() {

        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        return userRepository.findByEmail(email)
                .orElseThrow(()-> new NotFoundException("user not found"));

    }

    /*@Override
    public Response<List<UserDTO>> getAllUsers() {

        log.info("INSIDE getAllUsers()");

        List<User> userList = userRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));

        List<UserDTO> userDTOS = modelMapper.map(userList, new TypeToken<List<UserDTO>>() {
        }.getType());

        return Response.<List<UserDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("All users retreived successfully")
                .data(userDTOS)
                .build();
    }*/

    @Override
    public Response<UserDTO> getOwnAccountDetails() {

        log.info("INSIDE getOwnAccountDetails()");

        User user = getCurrentLoggedInUser();

        UserDTO userDTO = modelMapper.map(user, UserDTO.class);

        return Response.<UserDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("success")
                .data(userDTO)
                .build();

    }

    @Override
    public Response<?> updateOwnAccount(UserDTO userDTO) {

        log.info("INSIDE updateOwnAccount()");

        // Fetch the currently logged-in user
        User user = getCurrentLoggedInUser();


        // Update user details
        if (userDTO.getName() != null) {
            user.setName(userDTO.getName());
        }

        if (userDTO.getSurname() != null) {
            user.setSurname(userDTO.getSurname());
        }

        if (userDTO.getPhoneNumber() != null && !userDTO.getPhoneNumber().equals(user.getPhoneNumber())) {
            if (userRepository.existsByPhoneNumber(userDTO.getPhoneNumber())) {
                throw new BadRequestException("Phone number already exists");
            }
            user.setPhoneNumber(userDTO.getPhoneNumber());
        }

        /*if (userDTO.getEmail() != null && !userDTO.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(userDTO.getEmail())) {
                throw new BadRequestException("Email already exists");
            }
            user.setEmail(userDTO.getEmail());
        }*/

        if (userDTO.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        }

        // Save the updated user
        userRepository.save(user);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Account updated successfully")
                .build();

    }

    @Override
    public Response<?> deactivateOwnAccount() {

        log.info("INSIDE deactivateOwnAccount()");

        User user = getCurrentLoggedInUser();

        // Deactivate the user
        user.setActive(false);
        userRepository.save(user);

        //SEND EMAIL AFTER DEACTIVATION

        // Send email notification
        NotificationDTO notificationDTO = NotificationDTO.builder()
                .recipient(user.getEmail())
                .subject("Hesap Kapatıldı")
                .body("Hesabın başarılı bir şekilde kapatıldı. Eğer bir yanlışlık olduğunu düşünüyorsan, lütfen destek ekibi ile iletişime geç.")
                .createdAt(LocalDateTime.now())
                .isHtml(false)
                .build();
        notificationService.sendEmail(notificationDTO);

        // Return a success response
        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Account deactivated successfully")
                .build();

    }


    @Override
    public Response<UserDTO> getUserProfileById(Long id) {
        User user =  userRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("User not found"));

        UserDTO userDTO = modelMapper.map(user, UserDTO.class);

        return Response.<UserDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("success")
                .data(userDTO)
                .build();
    }

    @Override
    public Response<UserDTO> updateIsFirstLogin(){

        User user = getCurrentLoggedInUser();

        user.setFirstLogin(false);
        userRepository.save(user);
        UserDTO userDTO = modelMapper.map(user,UserDTO.class);

        return Response.<UserDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("first login making false successfully")
                .data(userDTO)
                .build();
    }

    @Override
    public Response<?> createForm(FormDTO formDTO) {

        if(formRepository.countByEmail(formDTO.getEmail())<3){
            Form newForm = Form.builder()
                    .email(formDTO.getEmail())
                    .phoneNumber(formDTO.getPhoneNumber())
                    .topic(formDTO.getTopic())
                    .content(formDTO.getContent())
                    .build();

            formRepository.save(newForm);

            return Response.builder()
                    .statusCode(HttpStatus.OK.value())
                    .message("Form created successfully")
                    .build();
        }else{
            return Response.builder()
                    .statusCode(HttpStatus.OK.value())
                    .message("You can send max 3 form")
                    .build();
        }
    }

    @Override
    public Response<List<FormDTO>> getAllForms() {
        List<Form> forms = formRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));

        List<FormDTO> formDTOS = forms.stream()
                .map(form -> modelMapper.map(form, FormDTO.class))
                .collect(Collectors.toList());

        return Response.<List<FormDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("You can send max 3 form")
                .data(formDTOS)
                .build();
    }


}















