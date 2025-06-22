FROM openjdk:17-jdk-slim as builder

WORKDIR /workspace/app

COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

RUN ./gradlew dependencies

COPY src src

RUN ./gradlew build -x test


FROM openjdk:17-jre-slim

WORKDIR /app

COPY --from=builder /workspace/app/build/libs/*.jar app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]