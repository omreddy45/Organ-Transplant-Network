-- ===============================
-- ORGANCONNECT DATABASE (CLEAN)
-- ===============================

DROP DATABASE IF EXISTS Hospital;
CREATE DATABASE Hospital;
USE Hospital;

-- ===============================
-- USERS (PARENT TABLE FIRST)
-- ===============================
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('doctor','patient','organization','donor') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- ORGANIZATION
-- ===============================
CREATE TABLE organization (
  org_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  license_number VARCHAR(100) NOT NULL UNIQUE,
  government_approved BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ===============================
-- DOCTOR
-- ===============================
CREATE TABLE doctor (
  doctor_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  availability_status ENUM('available','busy','on_leave') DEFAULT 'available',
  org_id INT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organization(org_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ===============================
-- PATIENT
-- ===============================
CREATE TABLE patient (
  patient_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  street VARCHAR(100),
  city VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL,
  medical_insurance VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ===============================
-- DONOR
-- ===============================
CREATE TABLE donor (
  donor_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  donation_reason VARCHAR(255),
  donor_status ENUM('pending','approved','rejected') DEFAULT 'pending',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ===============================
-- ORGANIZATION HEAD
-- ===============================
CREATE TABLE organization_head (
  org_id INT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  joining_date DATE NOT NULL,
  term_length INT,
  FOREIGN KEY (org_id) REFERENCES organization(org_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ===============================
-- ORGAN
-- ===============================
CREATE TABLE organ (
  organ_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  quantity INT DEFAULT 1,
  availability_status ENUM('available','reserved','transplanted') DEFAULT 'available',
  donor_id INT,
  org_id INT NOT NULL,
  FOREIGN KEY (donor_id) REFERENCES donor(donor_id) ON DELETE SET NULL,
  FOREIGN KEY (org_id) REFERENCES organization(org_id) ON DELETE CASCADE
);

-- ===============================
-- TRANSPLANT
-- ===============================
CREATE TABLE transplant (
  transplant_id INT AUTO_INCREMENT PRIMARY KEY,
  transplant_date DATE NOT NULL,
  status ENUM('pending','approved','completed','cancelled') DEFAULT 'pending',
  bill_amount DECIMAL(10,2),
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  organ_id INT NOT NULL UNIQUE,
  org_id INT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE,
  FOREIGN KEY (organ_id) REFERENCES organ(organ_id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organization(org_id) ON DELETE CASCADE
);

-- ===============================
-- ATTENDS (M:N)
-- ===============================
CREATE TABLE attends (
  doctor_id INT NOT NULL,
  patient_id INT NOT NULL,
  visit_date DATE NOT NULL,
  PRIMARY KEY (doctor_id, patient_id, visit_date),
  FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE
);

-- ===============================
-- MEDICAL HISTORY
-- ===============================
CREATE TABLE medical_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  medical_detail TEXT NOT NULL,
  record_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE
);

-- ===============================
-- MATCH REQUEST (REAL-WORLD ADDITION)
-- ===============================
CREATE TABLE match_request (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  organ_type VARCHAR(100) NOT NULL,
  urgency_level ENUM('low','normal','high','critical') DEFAULT 'normal',
  status ENUM('pending','matched','completed','rejected') DEFAULT 'pending',
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

-- ===============================
-- DONOR PLEDGE (REAL-WORLD ADDITION)
-- ===============================
CREATE TABLE donor_pledge (
  pledge_id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  org_id INT NOT NULL,
  organ_type VARCHAR(100) NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  pledge_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donor(donor_id),
  FOREIGN KEY (org_id) REFERENCES organization(org_id)
);

-- ===============================
-- PHONE TABLES
-- ===============================
CREATE TABLE doctor_phone (
  doctor_id INT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  PRIMARY KEY (doctor_id, phone),
  FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE
);

CREATE TABLE patient_phone (
  patient_id INT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  PRIMARY KEY (patient_id, phone),
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE
);

CREATE TABLE donor_phone (
  donor_id INT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  PRIMARY KEY (donor_id, phone),
  FOREIGN KEY (donor_id) REFERENCES donor(donor_id) ON DELETE CASCADE
);

CREATE TABLE organization_phone (
  org_id INT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  PRIMARY KEY (org_id, phone),
  FOREIGN KEY (org_id) REFERENCES organization(org_id) ON DELETE CASCADE
);

-- ===============================
-- SESSIONS
-- ===============================
CREATE TABLE sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);