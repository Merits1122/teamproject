TaskFlow 프로젝트 실행 가이드 (Docker 기반)

필수 사전 조건
1. Docker Desktop 설치 (WSL2 또는 Linux 환경 권장)
2. Git 또는 ZIP 다운로드로 프로젝트 전체 받기
3. Node.js / Java 설치 불필요 (모든 실행은 Docker 기반)

주요 프로젝트 구성
- backend/        → Spring Boot 백엔드
- frontend/       → Next.js 프론트엔드
- docker-compose.yml → 전체 서비스 정의
- env/            → 실행에 필요한 환경 변수 파일 (.env)

실행 방법

1. `.env` 파일 복사(최초 1회)
이캠퍼스의 과제 제출란 '최총 과제 제출'에 첨부된 .env파일을 다운받은 프로젝트 루트에 `.env` 이름으로 복사합니다.

2. Docker 이미지 빌드 및 실행

해당 프로젝트 루트 docker-compose.yml이 있는 곳에서 터미널을 실행합니다.
명령어 (Windows PowerShell 기준): docker-compose up --build를 입력합니다.
처음에는 이미지 다운로드 및 빌드로 약 2~5분 소요될 수 있습니다.

3. 브라우저에서 접속
- 프론트엔드: http://localhost:3000 (실제 브라우저)
해당 링크를 웹 브라우저에 입력합니다.

4. TaskFlow 사용
기존 계정이 있다면 로그인 버튼을 눌러 이메일과 비밀번호를 입력해 접속하고
새 계졍을 만들고 싶거나 최초 접속시에는 회원가입 버튼을 눌러 알맞게 정보를 입력하고 회원가입 버튼을 누릅니다.
새 계정으로 로그인 하기 전 이메일 인증 절차가 있습니다. 해당 이메일로 인증메일을 발송하니 해당 메일 안에 인증하기 버튼을 눌러야 정상적으로 로그인 할 수 있습니다.

 문제 해결 팁
- `.env` 파일을 누락하면 "MYSQL_ROOT_PASSWORD is not specified" 오류가 발생합니다.
- 포트 충돌이 날 경우 `.env`에서 포트를 변경하거나 기존 Docker 컨테이너를 중지하세요:

컨테이너 중지 명령어 순서
1. 기존 컨테이너 목록: docker ps -a
2. 컨테이너 정지: docker stop <컨테이너 ID>
3. 컨테이너 삭제: docker rm <컨테이너 ID>

## 📝 함께 첨부할 파일 구조 예시
/teamproject-main
├── backend/
├── frontend/
├── .env
├── docker-compose.yml
└── Readme.txt