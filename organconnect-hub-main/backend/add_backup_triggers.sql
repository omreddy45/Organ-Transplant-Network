-- Migration: Add backup triggers for role-specific tables
-- These triggers capture patient/donor/doctor/organization/org_head data
-- before cascade deletion, so the restore endpoint can rebuild the full account.

USE Hospital;

-- Drop if they already exist (idempotent)
DROP TRIGGER IF EXISTS trg_backup_patient_delete;
DROP TRIGGER IF EXISTS trg_backup_donor_delete;
DROP TRIGGER IF EXISTS trg_backup_doctor_delete;
DROP TRIGGER IF EXISTS trg_backup_organization_delete;
DROP TRIGGER IF EXISTS trg_backup_org_head_delete;

-- Trigger: Backup patient data before deletion
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

-- Trigger: Backup donor data before deletion
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

-- Trigger: Backup doctor data before deletion
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

-- Trigger: Backup organization data before deletion
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

-- Trigger: Backup organization_head data before deletion
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

SELECT 'All backup triggers created successfully!' AS status;
