CREATE DATABASE IF NOT EXISTS Hospital;

USE Hospital;

CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('doctor','patient','organization','donor') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Organization (
    org_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    government_approved BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Organization_Head (
    org_id INT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    joining_date DATE NOT NULL,
    term_length INT CHECK (term_length > 0),
    FOREIGN KEY (org_id) REFERENCES Organization(org_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Donor (
    donor_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    donation_reason VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Patient (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    street VARCHAR(100),
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    medical_insurance VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Doctor (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    availability_status ENUM('available','busy','on_leave') DEFAULT 'available',
    org_id INT NOT NULL,
    FOREIGN KEY (org_id) REFERENCES Organization(org_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Organ (
    organ_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    availability_status ENUM('available','reserved','transplanted') DEFAULT 'available',
    donor_id INT,
    org_id INT NOT NULL,
    FOREIGN KEY (donor_id) REFERENCES Donor(donor_id) ON DELETE SET NULL,
    FOREIGN KEY (org_id) REFERENCES Organization(org_id) ON DELETE CASCADE
);

CREATE TABLE Transplant (
    transplant_id INT AUTO_INCREMENT PRIMARY KEY,
    transplant_date DATE NOT NULL,
    status ENUM('pending','completed','cancelled') DEFAULT 'pending',
    bill_amount DECIMAL(10,2) CHECK (bill_amount >= 0),
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    organ_id INT UNIQUE NOT NULL,
    org_id INT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (organ_id) REFERENCES Organ(organ_id) ON DELETE CASCADE,
    FOREIGN KEY (org_id) REFERENCES Organization(org_id) ON DELETE CASCADE
);

CREATE TABLE Attends (
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    visit_date DATE NOT NULL,
    PRIMARY KEY (doctor_id, patient_id, visit_date),
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE
);

CREATE TABLE Doctor_Phone (
    doctor_id INT NOT NULL,
    phone VARCHAR(15) NOT NULL,
    PRIMARY KEY (doctor_id, phone),
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id) ON DELETE CASCADE
);

CREATE TABLE Patient_Phone (
    patient_id INT NOT NULL,
    phone VARCHAR(15) NOT NULL,
    PRIMARY KEY (patient_id, phone),
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE
);

CREATE TABLE Donor_Phone (
    donor_id INT NOT NULL,
    phone VARCHAR(15) NOT NULL,
    PRIMARY KEY (donor_id, phone),
    FOREIGN KEY (donor_id) REFERENCES Donor(donor_id) ON DELETE CASCADE
);

CREATE TABLE Organization_Phone (
    org_id INT NOT NULL,
    phone VARCHAR(15) NOT NULL,
    PRIMARY KEY (org_id, phone),
    FOREIGN KEY (org_id) REFERENCES Organization(org_id) ON DELETE CASCADE
);

CREATE TABLE Medical_History (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    medical_detail TEXT NOT NULL,
    record_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE
);

SELECT * FROM Users;
SELECT * FROM Patient;
SELECT * FROM Sessions;


