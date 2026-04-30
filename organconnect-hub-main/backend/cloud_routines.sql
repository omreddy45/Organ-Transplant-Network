-- ============================================
-- Functions, Triggers, and Procedures
-- Run AFTER cloud_schema.sql
-- Must be run via MySQL CLI or Workbench (needs DELIMITER support)
-- ============================================

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

-- Procedure 1: Complete a transplant
DELIMITER //
CREATE PROCEDURE sp_complete_transplant(
  IN p_transplant_id INT,
  IN p_bill_amount DECIMAL(10,2)
)
BEGIN
  DECLARE v_organ_id INT;

  SELECT organ_id INTO v_organ_id
  FROM transplant
  WHERE transplant_id = p_transplant_id;

  UPDATE transplant
  SET status = 'completed', bill_amount = p_bill_amount
  WHERE transplant_id = p_transplant_id;

  UPDATE organ
  SET availability_status = 'transplanted'
  WHERE organ_id = v_organ_id;

  UPDATE match_request mr
  JOIN transplant t ON t.patient_id = mr.patient_id
  JOIN organ o ON t.organ_id = o.organ_id AND o.name = mr.organ_type
  SET mr.status = 'completed'
  WHERE t.transplant_id = p_transplant_id AND mr.status = 'matched';
END //
DELIMITER ;

-- Procedure 2: Assign organ to a patient
DELIMITER //
CREATE PROCEDURE sp_assign_organ(
  IN p_request_id INT,
  IN p_organ_id INT,
  IN p_doctor_id INT,
  IN p_org_id INT
)
BEGIN
  DECLARE v_patient_id INT;

  SELECT patient_id INTO v_patient_id
  FROM match_request
  WHERE request_id = p_request_id;

  UPDATE match_request SET status = 'matched' WHERE request_id = p_request_id;

  UPDATE organ SET availability_status = 'reserved' WHERE organ_id = p_organ_id;

  INSERT INTO transplant (transplant_date, status, bill_amount, patient_id, doctor_id, organ_id, org_id)
  VALUES (CURDATE(), 'pending', 0, v_patient_id, p_doctor_id, p_organ_id, p_org_id);

  INSERT IGNORE INTO attends (doctor_id, patient_id, visit_date)
  VALUES (p_doctor_id, v_patient_id, CURDATE());
END //
DELIMITER ;
