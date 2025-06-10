# frontend/Dockerfile

# --- 1. 빌드 단계 (Builder) ---
# Node.js 18 버전을 베이스 이미지로 사용
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 🔽 빌드 시점에 필요한 환경 변수를 ARG로 선언합니다.
#    여러 개가 필요하다면 모두 선언합니다.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_API_BASE_URL

# 🔽 선언된 ARG를 ENV로 설정하여 빌드 프로세스가 사용할 수 있도록 합니다.
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# package.json과 package-lock.json을 먼저 복사하여 의존성 캐싱 활용
COPY package*.json ./
RUN npm install

# 나머지 소스 코드 복사
COPY . .

# 프로덕션용으로 빌드
RUN npm run build


# --- 2. 실행 단계 (Runner) ---
# 더 가벼운 이미지에서 다시 시작
FROM node:18-alpine

WORKDIR /app

# 빌드 단계에서 생성된 결과물만 복사
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# 애플리케이션이 사용할 포트 명시
EXPOSE 3000

# 컨테이너 시작 시 실행될 명령어
CMD ["npm", "start"]