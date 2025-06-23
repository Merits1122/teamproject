# backend/Dockerfile

# 1. 베이스 이미지 선택 (Java 17 환경)
FROM openjdk:17-jdk-slim

# 2. JAR 파일이 위치할 디렉토리 및 인수 설정
ARG JAR_FILE_PATH=build/libs/*.jar

# 3. JAR 파일을 이미지 안으로 복사
#    이름을 app.jar로 통일하여 실행 시 편리하게 함
COPY ${JAR_FILE_PATH} app.jar

# 4. 애플리케이션이 사용할 포트 명시
EXPOSE 8080

# 5. 컨테이너가 시작될 때 실행될 명령어
ENTRYPOINT ["java", "-jar", "/app.jar"]