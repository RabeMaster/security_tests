# Security Tests

> 본 소스코드는 AI를 통해 보안 취약점에 대한 이해를 돕기 위해 제작된 예제 코드입니다.

> 학습의 목적으로 만들어진 예제 코드이므로, 실제 서비스에 **절대** 시도해보지 마세요.

> 이 코드는 XSS, SQL Injection, Path Traversal에 취약한 부분을 포함하고 있습니다.

네이버 부스트캠프 10기 과정에서, 개인적인 발표를 위해 XSS와 SQL Injection, Path Traversal 공격에 대한 이해를 돕기 위해 제작된 예제 프로젝트입니다.

> 부스트캠프의 과정이나 내용과는 무관합니다.

---

## 파일 설명

- `safe.js`: 보안 취약점이 수정된 버전의 코드입니다.
- `unsafe.js`: XSS, SQL Injection, Path Traversal에 취약한 버전의 코드입니다.
- `init.sql`: MySQL 데이터베이스와 테이블을 생성하는 SQL 스크립트입니다.
- `public/`: 정적 파일(HTML, CSS, JS 등)이 위치한 디렉토리입니다.
- `.env, test.html, test.jpg`: Path Traversal 공격을 테스트하기 위한 파일입니다.
- `README.md`: 프로젝트 설명 및 실행 방법이 포함된 파일입니다.
-

## 실행 방법

1. npm install을 통해 필요한 패키지를 설치하세요.
2. mysql 서버를 구축하시고, init.sql 파일을 통해 데이터베이스와 테이블을 생성하세요.
3. safe.js와 unsafe.js파일 내부의 dbConfig객체를 본인의 mysql 설정에 맞게 수정하세요.
4. 터미널에서 `node safe.js` 또는 `node unsafe.js` 명령어를 실행하세요.
5. 브라우저에서 `http://localhost:3000`에 접속하세요.
