FROM openjdk:17-jdk-slim


ENV TZ Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
ENV JAVA_OPTS="-Duser.timezone=$TZ"

CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

ARG JAR_FILE_PATH=build/libs/*.jar

COPY ${JAR_FILE_PATH} app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app.jar"]