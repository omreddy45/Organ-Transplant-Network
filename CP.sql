DROP DATABASE IF EXISTS Hospital;
CREATE DATABASE Hospital;
USE Hospital;

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

-- View 1: Full transplant details with donor + patient + doctor + org info
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

-- View 2: Full organ inventory with donor and org info
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

-- View 3: Donor summary with total donations and pledge counts
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

-- Function 1: Count how many times a donor has donated a specific organ type
DELIMITER //
CREATE FUNCTION fn_donor_organ_count(p_donor_id INT, p_organ_name VARCHAR(50))
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE organ_count INT DEFAULT 0;
  SELECT COUNT(*) INTO organ_count
  FROM donor_pledge
  WHERE donor_id = p_donor_id
    AND organ_type = p_organ_name
    AND status IN ('approved', 'pending');
  RETURN organ_count;
END //
DELIMITER ;

-- Function 2: Get the max donation limit for a given organ type
DELIMITER //
CREATE FUNCTION fn_organ_max_donation(p_organ_name VARCHAR(50))
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE max_d INT DEFAULT 1;
  SELECT max_donations INTO max_d
  FROM organ_limits
  WHERE organ_name = p_organ_name;
  RETURN max_d;
END //
DELIMITER ;

-- Trigger 1: Backup user data before deletion
DELIMITER //
CREATE TRIGGER trg_backup_user_delete
BEFORE DELETE ON users
FOR EACH ROW
BEGIN
  INSERT INTO deleted_records_audit (table_name, record_id, record_data)
  VALUES ('users', OLD.user_id,
    CONCAT('{"user_id":', OLD.user_id,
           ',"username":"', IFNULL(OLD.username,''), '"',
           ',"email":"', IFNULL(OLD.email,''), '"',
           ',"role":"', IFNULL(OLD.role,''), '"',
           ',"created_at":"', IFNULL(OLD.created_at,''), '"}')
  );
END //
DELIMITER ;

-- Trigger 2: Backup organ data before deletion
DELIMITER //
CREATE TRIGGER trg_backup_organ_delete
BEFORE DELETE ON organ
FOR EACH ROW
BEGIN
  INSERT INTO deleted_records_audit (table_name, record_id, record_data)
  VALUES ('organ', OLD.organ_id,
    CONCAT('{"organ_id":', OLD.organ_id,
           ',"name":"', IFNULL(OLD.name,''), '"',
           ',"quantity":', IFNULL(OLD.quantity,0),
           ',"availability_status":"', IFNULL(OLD.availability_status,''), '"',
           ',"donor_id":', IFNULL(OLD.donor_id, 'null'),
           ',"org_id":', IFNULL(OLD.org_id, 'null'), '}')
  );
END //
DELIMITER ;

-- Trigger 3: Backup transplant data before deletion
DELIMITER //
CREATE TRIGGER trg_backup_transplant_delete
BEFORE DELETE ON transplant
FOR EACH ROW
BEGIN
  INSERT INTO deleted_records_audit (table_name, record_id, record_data)
  VALUES ('transplant', OLD.transplant_id,
    CONCAT('{"transplant_id":', OLD.transplant_id,
           ',"transplant_date":"', IFNULL(OLD.transplant_date,''), '"',
           ',"status":"', IFNULL(OLD.status,''), '"',
           ',"bill_amount":', IFNULL(OLD.bill_amount, 0),
           ',"patient_id":', IFNULL(OLD.patient_id, 'null'),
           ',"doctor_id":', IFNULL(OLD.doctor_id, 'null'),
           ',"organ_id":', IFNULL(OLD.organ_id, 'null'),
           ',"org_id":', IFNULL(OLD.org_id, 'null'), '}')
  );
END //
DELIMITER ;

-- Trigger 3b: Backup patient data before deletion
DELIMITER //
CREATE TRIGGER trg_backup_patient_delete
BEFORE DELETE ON patient
FOR EACH ROW
BEGIN
  INSERT INTO deleted_records_audit (table_name, record_id, record_data)
  VALUES ('patient', OLD.patient_id,
    CONCAT('{"patient_id":', OLD.patient_id,
           ',"user_id":', OLD.user_id,
           ',"name":"', IFNULL(OLD.name,''), '"',
           ',"dob":"', IFNULL(OLD.dob,''), '"',
           ',"street":"', IFNULL(OLD.street,''), '"',
           ',"city":"', IFNULL(OLD.city,''), '"',
           ',"state":"', IFNULL(OLD.state,''), '"',
           ',"medical_insurance":"', IFNULL(OLD.medical_insurance,''), '"}')
  );
END //
DELIMITER ;

-- Trigger 3c: Backup donor data before deletion
DELIMITER //
CREATE TRIGGER trg_backup_donor_delete
BEFORE DELETE ON donor
FOR EACH ROW
BEGIN
  INSERT INTO deleted_records_audit (table_name, record_id, record_data)
  VALUES ('donor', OLD.donor_id,
    CONCAT('{"donor_id":', OLD.donor_id,
           ',"user_id":', OLD.user_id,
           ',"name":"', IFNULL(OLD.name,''), '"',
           ',"dob":"', IFNULL(OLD.dob,''), '"',
           ',"donation_reason":"', IFNULL(OLD.donation_reason,''), '"',
           ',"donor_status":"', IFNULL(OLD.donor_status,''), '"}')
  );
END //
DELIMITER ;

-- Trigger 3d: Backup doctor data before deletion
DELIMITER //
CREATE TRIGGER trg_backup_doctor_delete
BEFORE DELETE ON doctor
FOR EACH ROW
BEGIN
  INSERT INTO deleted_records_audit (table_name, record_id, record_data)
  VALUES ('doctor', OLD.doctor_id,
    CONCAT('{"doctor_id":', OLD.doctor_id,
           ',"user_id":', OLD.user_id,
           ',"name":"', IFNULL(OLD.name,''), '"',
           ',"specialization":"', IFNULL(OLD.specialization,''), '"',
           ',"availability_status":"', IFNULL(OLD.availability_status,''), '"',
           ',"org_id":', OLD.org_id, '}')
  );
END //
DELIMITER ;

-- Trigger 3e: Backup organization data before deletion
DELIMITER //
CREATE TRIGGER trg_backup_organization_delete
BEFORE DELETE ON organization
FOR EACH ROW
BEGIN
  INSERT INTO deleted_records_audit (table_name, record_id, record_data)
  VALUES ('organization', OLD.org_id,
    CONCAT('{"org_id":', OLD.org_id,
           ',"user_id":', OLD.user_id,
           ',"name":"', IFNULL(OLD.name,''), '"',
           ',"location":"', IFNULL(OLD.location,''), '"',
           ',"license_number":"', IFNULL(OLD.license_number,''), '"',
           ',"government_approved":', IFNULL(OLD.government_approved, 0), '}')
  );
END //
DELIMITER ;

-- Trigger 3f: Backup organization_head data before deletion
DELIMITER //
CREATE TRIGGER trg_backup_org_head_delete
BEFORE DELETE ON organization_head
FOR EACH ROW
BEGIN
  INSERT INTO deleted_records_audit (table_name, record_id, record_data)
  VALUES ('organization_head', OLD.org_id,
    CONCAT('{"org_id":', OLD.org_id,
           ',"user_id":', OLD.user_id,
           ',"name":"', IFNULL(OLD.name,''), '"',
           ',"joining_date":"', IFNULL(OLD.joining_date,''), '"',
           ',"term_length":', IFNULL(OLD.term_length, 0), '}')
  );
END //
DELIMITER ;

-- Trigger 4: Prevent organ donation exceeding biological limits
DELIMITER //
CREATE TRIGGER trg_check_organ_limit
BEFORE INSERT ON donor_pledge
FOR EACH ROW
BEGIN
  DECLARE current_count INT;
  DECLARE max_allowed INT;

  SET current_count = fn_donor_organ_count(NEW.donor_id, NEW.organ_type);
  SET max_allowed = fn_organ_max_donation(NEW.organ_type);

  IF current_count >= max_allowed THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Organ donation limit exceeded. Humans cannot donate this organ more times.';
  END IF;
END //
DELIMITER ;

-- Procedure 1: Complete a transplant (updates organ status + transplant status)
DELIMITER //
CREATE PROCEDURE sp_complete_transplant(
  IN p_transplant_id INT,
  IN p_bill_amount DECIMAL(10,2)
)
BEGIN
  DECLARE v_organ_id INT;

  -- Get the organ for this transplant
  SELECT organ_id INTO v_organ_id
  FROM transplant
  WHERE transplant_id = p_transplant_id;

  -- Update transplant status
  UPDATE transplant
  SET status = 'completed', bill_amount = p_bill_amount
  WHERE transplant_id = p_transplant_id;

  -- Update organ status to transplanted
  UPDATE organ
  SET availability_status = 'transplanted'
  WHERE organ_id = v_organ_id;

  -- Update match_request if linked
  UPDATE match_request mr
  JOIN transplant t ON t.patient_id = mr.patient_id
  JOIN organ o ON t.organ_id = o.organ_id AND o.name = mr.organ_type
  SET mr.status = 'completed'
  WHERE t.transplant_id = p_transplant_id AND mr.status = 'matched';
END //
DELIMITER ;

-- Procedure 2: Assign organ to a patient (from match request)
DELIMITER //
CREATE PROCEDURE sp_assign_organ(
  IN p_request_id INT,
  IN p_organ_id INT,
  IN p_doctor_id INT,
  IN p_org_id INT
)
BEGIN
  DECLARE v_patient_id INT;

  -- Get the patient from the match request
  SELECT patient_id INTO v_patient_id
  FROM match_request
  WHERE request_id = p_request_id;

  -- Update match request status
  UPDATE match_request SET status = 'matched' WHERE request_id = p_request_id;

  -- Reserve the organ
  UPDATE organ SET availability_status = 'reserved' WHERE organ_id = p_organ_id;

  -- Create transplant record
  INSERT INTO transplant (transplant_date, status, bill_amount, patient_id, doctor_id, organ_id, org_id)
  VALUES (CURDATE(), 'pending', 0, v_patient_id, p_doctor_id, p_organ_id, p_org_id);

  -- Auto-schedule a visit
  INSERT IGNORE INTO attends (doctor_id, patient_id, visit_date)
  VALUES (p_doctor_id, v_patient_id, CURDATE());
END //
DELIMITER ;

SELECT * FROM transplant;