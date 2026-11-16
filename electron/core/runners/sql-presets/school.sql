-- Copyright (c) dendr000. MIT License.
-- 학원 사이트 SQL Lv0 (학생/과목/수강) 과 같은 고정 데이터
CREATE TABLE student(id INTEGER PRIMARY KEY, name TEXT, dept TEXT, grade INTEGER, score INTEGER);
CREATE TABLE course(id INTEGER PRIMARY KEY, title TEXT, credit INTEGER);
CREATE TABLE enroll(student_id INTEGER, course_id INTEGER, score INTEGER);
INSERT INTO student VALUES (1,'김민준','컴퓨터공학',1,88),(2,'이서연','경영',2,92),(3,'박지훈','컴퓨터공학',3,75),(4,'최유나','디자인',1,64),(5,'정하늘','경영',4,81),(6,'김도윤','컴퓨터공학',2,95),(7,'한지민','디자인',3,70),(8,'오세훈','경영',1,58);
INSERT INTO course VALUES (10,'파이썬 기초',3),(20,'데이터베이스',3),(30,'웹 디자인',2),(40,'회계원리',3);
INSERT INTO enroll VALUES (1,10,90),(1,20,85),(2,40,95),(3,10,70),(3,20,80),(4,30,66),(5,40,78),(6,10,99),(6,20,92),(7,30,74);
