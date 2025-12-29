package com.AuthMikroService.aws;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetUrlRequest;

import java.net.URL;

@Service
@Slf4j
@RequiredArgsConstructor
public class AWSS3ServiceImpl implements AWSS3Service {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    @Override
    public URL uploadFile(String keyName, MultipartFile file){
        log.info("Inside AWSS3Service uploadFile()");
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(keyName)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(file.getBytes()));

            // MinIO kullanırken URL'i SDK'dan almak en temizi:
            return s3Client.utilities().getUrl(builder -> builder.bucket(bucketName).key(keyName));

        }catch (Exception e) {
            log.error("MinIO upload hatası: " + e.getMessage());
            throw new RuntimeException("Resim yüklenirken hata oluştu: " + e.getMessage());
        }
    }

    @Override
    public void deleteFile(String keyName) {
        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(keyName) // "profile/resim.jpg" formatında gelmeli
                    .build();
            s3Client.deleteObject(deleteObjectRequest);
            log.info("File {} deleted from bucket {}", keyName, bucketName);
        } catch (Exception e) {
            // Dosya zaten yoksa hata fırlatıp akışı bozmasın, logla geç
            log.warn("Dosya silinemedi (zaten yok olabilir): {}", e.getMessage());
        }
    }
}