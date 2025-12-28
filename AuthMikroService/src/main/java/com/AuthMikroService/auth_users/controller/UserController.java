package com.AuthMikroService.auth_users.controller;

import com.AuthMikroService.auth_users.dtos.FormDTO;
import com.AuthMikroService.auth_users.dtos.UserDTO;
import com.AuthMikroService.auth_users.services.UserService;
import com.AuthMikroService.response.Response;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    /*@GetMapping("/all")
    @PreAuthorize("hasAuthority('ADMIN')") // ADMIN ALONE HAVE ACCESS TO THIS endpoint
    public ResponseEntity<Response<List<UserDTO>>> getAllUsers(){
        return ResponseEntity.ok(userService.getAllUsers());
    }*/

    /*@PutMapping(value = "/update", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response<?>> updateOwnAccount(
            @ModelAttribute UserDTO userDTO,
            @RequestPart(value = "imageFile", required = false)MultipartFile imageFile
            ){
        userDTO.setImageFile(imageFile);
        return ResponseEntity.ok(userService.updateOwnAccount(userDTO));
    }
*/
    @GetMapping("/account")
    public ResponseEntity<Response<UserDTO>> getOwnAccountDetails() {
        return ResponseEntity.ok(userService.getOwnAccountDetails());
    }

/*
    @DeleteMapping("/deactivate")
    public ResponseEntity<Response<?>> deactivateOwnAccount() {
        return ResponseEntity.ok(userService.deactivateOwnAccount());
    }*/

    @GetMapping("/{id}")
    public ResponseEntity<Response<UserDTO>> getUserProfileById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserProfileById(id));
    }

    @PutMapping("/updateFirstLogin")
    public ResponseEntity<Response<?>> updateOwnAccount(){
        return ResponseEntity.ok(userService.updateIsFirstLogin());
    }

    @GetMapping("/allForm")
    public ResponseEntity<Response<List<FormDTO>>> getAllForms(){
        return ResponseEntity.ok(userService.getAllForms());
    }
    @PostMapping("/createForm")
    public ResponseEntity<Response<?>> createForm(@Valid @RequestBody FormDTO formDTO){
        return ResponseEntity.ok(userService.createForm(formDTO));
    }

}
