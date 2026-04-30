-- ============================================
-- OrganConnect Cloud Schema (Aiven-compatible)
-- No DROP/CREATE DATABASE — uses Aiven's defaultdb
-- ============================================

-- Drop existing objects in reverse dependency order (safe re-run)
DROP PROCEDURE IF EXISTS sp_assign_organ;
DROP PROCEDURE IF EXISTS sp_complete_transplant;
DROP TRIGGER IF EXISTS trg_check_organ_limit;
DROP TRIGGER IF EXISTS trg_backup_org_head_delete;
DROP TRIGGER IF EXISTS trg_backup_organization_delete;
DROP TRIGGER IF EXISTS trg_backup_doctor_delete;
DROP TRIGGER IF EXISTS trg_backup_donor_delete;
DROP TRIGGER IF EXISTS trg_backup_patient_delete;
DROP TRIGGER IF EXISTS trg_backup_transplant_delete;
DROP TRIGGER IF EXISTS trg_backup_organ_delete;
DROP TRIGGER IF EXISTS trg_backup_user_delete;
DROP FUNCTION IF EXISTS fn_organ_max_donation;
DROP FUNCTION IF EXISTS fn_donor_organ_count;
DROP VIEW IF EXISTS vw_donor_summary;
DROP VIEW IF EXISTS vw_organ_inventory_full;
DROP VIEW IF EXISTS vw_transplant_full;

DROP TABLE IF EXISTS deleted_records_audit;
DROP TABLE IF EXISTS donor_pledge;
DROP TABLE IF EXISTS match_request;
DROP TABLE IF EXISTS medical_history;
DROP TABLE IF EXISTS attends;
DROP TABLE IF EXISTS transplant;
DROP TABLE IF EXISTS organ;
DROP TABLE IF EXISTS organization_phone;
DROP TABLE IF EXISTS donor_phone;
DROP TABLE IF EXISTS patient_phone;
DROP TABLE IF EXISTS doctor_phone;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS organ_limits;
DROP TABLE IF EXISTS organization_head;
DROP TABLE IF EXISTS doctor;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS donor;
DROP TABLE IF EXISTS organization;
DROP TABLE IF EXISTS users;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('doctor','patient','organization','donor','admin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organization (
  org_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  license_number VARCHAR(100) NOT NULL UNIQUE,
  government_approved BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

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

CREATE TABLE donor (
  donor_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  donation_reason VARCHAR(255),
  donor_status ENUM('pending','approved','rejected') DEFAULT 'pending',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE organization_head (
  org_id INT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  joining_date DATE NOT NULL,
  term_length INT,
  FOREIGN KEY (org_id) REFERENCES organization(org_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

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

CREATE TABLE attends (
  doctor_id INT NOT NULL,
  patient_id INT NOT NULL,
  visit_date DATE NOT NULL,
  PRIMARY KEY (doctor_id, patient_id, visit_date),
  FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE
);

CREATE TABLE medical_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  medical_detail TEXT NOT NULL,
  record_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE
);

CREATE TABLE match_request (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  organ_type VARCHAR(100) NOT NULL,
  urgency_level ENUM('low','normal','high','critical') DEFAULT 'normal',
  status ENUM('pending','matched','completed','rejected') DEFAULT 'pending',
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

CREATE TABLE donor_pledge (
  pledge_id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  org_id INT NOT NULL,
  organ_type VARCHAR(100) NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  pledge_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donor(donor_id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organization(org_id) ON DELETE CASCADE
);

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

CREATE TABLE sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE organ_limits (
  organ_name VARCHAR(50) PRIMARY KEY,
  max_donations INT NOT NULL DEFAULT 1,
  required_specialization VARCHAR(100) NOT NULL,
  description VARCHAR(255)
);

INSERT INTO organ_limits (organ_name, max_donations, required_specialization, description) VALUES
  ('Kidney', 1, 'Nephrology', 'Humans have 2 kidneys, can donate 1 while alive'),
  ('Liver', 1, 'Hepatology', 'Partial liver can regenerate, typically one living donation'),
  ('Heart', 1, 'Cardiology', 'Only donated after death — single organ'),
  ('Lung', 1, 'Pulmonology', 'Can donate one lobe while alive'),
  ('Pancreas', 1, 'Endocrinology', 'Partial donation possible once'),
  ('Cornea', 2, 'Ophthalmology', 'Humans have 2 corneas — both can be donated post-mortem'),
  ('Bone Marrow', 3, 'Hematology', 'Bone marrow regenerates — multiple donations possible'),
  ('Skin', 3, 'Dermatology', 'Skin grafts can be harvested multiple times');

CREATE TABLE deleted_records_audit (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  record_id INT NOT NULL,
  record_data TEXT NOT NULL,
  deleted_by VARCHAR(100) DEFAULT 'system',
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VIEWS
-- ============================================

CREATE VIEW vw_transplant_full AS
SELECT
  t.transplant_id,
  t.transplant_date,
  t.status,
  t.bill_amount,
  t.patient_id,
  p.name AS patient_name,
  pu.email AS patient_email,
  t.doctor_id,
  d.name AS doctor_name,
  t.organ_id,
  o.name AS organ_name,
  o.donor_id,
  dn.name AS donor_name,
  du.email AS donor_email,
  t.org_id,
  org.name AS organization_name
FROM transplant t
JOIN patient p ON t.patient_id = p.patient_id
JOIN users pu ON p.user_id = pu.user_id
JOIN doctor d ON t.doctor_id = d.doctor_id
JOIN organ o ON t.organ_id = o.organ_id
JOIN organization org ON t.org_id = org.org_id
LEFT JOIN donor dn ON o.donor_id = dn.donor_id
LEFT JOIN users du ON dn.user_id = du.user_id;

CREATE VIEW vw_organ_inventory_full AS
SELECT
  o.organ_id,
  o.name,
  o.quantity,
  o.availability_status,
  o.donor_id,
  d.name AS donor_name,
  du.email AS donor_email,
  o.org_id,
  org.name AS organization_name,
  org.location
FROM organ o
JOIN organization org ON o.org_id = org.org_id
LEFT JOIN donor d ON o.donor_id = d.donor_id
LEFT JOIN users du ON d.user_id = du.user_id;

CREATE VIEW vw_donor_summary AS
SELECT
  d.donor_id,
  d.name AS donor_name,
  u.email,
  d.donor_status,
  d.dob,
  COUNT(DISTINCT o.organ_id) AS total_organs_donated,
  COUNT(DISTINCT dp.pledge_id) AS total_pledges,
  SUM(CASE WHEN o.availability_status = 'transplanted' THEN 1 ELSE 0 END) AS lives_saved
FROM donor d
JOIN users u ON d.user_id = u.user_id
LEFT JOIN organ o ON o.donor_id = d.donor_id
LEFT JOIN donor_pledge dp ON dp.donor_id = d.donor_id
GROUP BY d.donor_id, d.name, u.email, d.donor_status, d.dob;
