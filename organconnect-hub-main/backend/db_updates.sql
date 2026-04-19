ALTER TABLE Donor ADD COLUMN donor_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS Match_Request (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    organ_type VARCHAR(100) NOT NULL,
    urgency_level VARCHAR(50) DEFAULT 'normal',
    status ENUM('pending', 'assigned', 'completed') DEFAULT 'pending',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id)
);
