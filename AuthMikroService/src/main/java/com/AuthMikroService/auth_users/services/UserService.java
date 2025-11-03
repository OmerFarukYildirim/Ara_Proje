package com.AuthMikroService.auth_users.services;

import com.AuthMikroService.auth_users.dtos.UserDTO;
import com.AuthMikroService.auth_users.entity.User;
import com.AuthMikroService.response.Response;

import java.util.List;

public interface UserService {


    User getCurrentLoggedInUser();

    //Response<List<UserDTO>> getAllUsers();

    Response<UserDTO> getOwnAccountDetails();

    //Response<?> updateOwnAccount(UserDTO userDTO);

    //Response<?> deactivateOwnAccount();

    Response<UserDTO> getUserProfileById(Long id);

    Response<UserDTO> updateIsFirstLogin();


}
