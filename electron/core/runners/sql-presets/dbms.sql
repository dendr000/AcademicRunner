-- Copyright (c) dendr000. MIT License.
-- 학원 사이트 DBMS 이론 점검의 "참고 테이블"(STUDENT 5줄, DEPT 3줄)과 같은 데이터
CREATE TABLE STUDENT(id INTEGER PRIMARY KEY, name TEXT, dept TEXT, score INTEGER, city TEXT);
CREATE TABLE DEPT(dept TEXT PRIMARY KEY, dname TEXT);
INSERT INTO STUDENT VALUES (1,'김민수','IT',85,'부산'),(2,'이지은','BIZ',92,'서울'),(3,'박도윤','IT',78,'부산'),(4,'최유나','DESIGN',NULL,'대구'),(5,'정하늘','IT',95,'서울');
INSERT INTO DEPT VALUES ('IT','정보기술'),('BIZ','경영'),('ART','예술');
