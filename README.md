# AcademicRunner

학원 과제 풀이 파일(Java·Python·JavaScript)을 한 화면에서 열어 고치고, 클릭이나 단축키 한 번으로 실행·시험하는 개인용 Windows 앱입니다.

- 상태: v0.1.0 개발 중 (M1 완료: 문제 목록·검색. 편집기와 실행은 다음 단계)
- 계획서: [docs/plans/00-master-plan.md](docs/plans/00-master-plan.md)
- 문제 풀이 보관 폴더: 기본 `C:\dev\AcademicTest` (앱의 "폴더 선택"으로 변경)

## 실행

```bash
npm install
npm start
```

테스트: `npm test`, exe 만들기: `npm run dist:win` (결과는 `release-packager` 폴더)

앱 시험은 1차 확인용입니다. 사이트의 숨은 테스트는 알 수 없으므로 사이트 채점을 대신하지 않습니다.
