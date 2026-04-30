# OrganConnect

**OrganConnect** is a centralized, role-based web application designed to bridge the gap between organ donors, patients, medical doctors, and hospital organizations. Built with a modern tech stack and strict relational data integrity, OrganConnect streamlines the critical and time-sensitive process of organ donation, matching, and transplantation.

![OrganConnect Banner](https://img.shields.io/badge/Status-Production%20Ready-success) ![License](https://img.shields.io/badge/License-MIT-blue)

---

## Features

- **Role-Based Access Control (RBAC):** Distinct interfaces for Hospitals (Organizations), Doctors, Patients, and Donors.
- **Automated Matching & Workflow:** Hospitals match available organs to patients and assign doctors, automatically triggering status changes and procedure scheduling.
- **Strict Data Integrity:** Robust MySQL constraints and triggers ensure an organ can only be pledged once and transplanted once, eliminating duplicate assignments.
- **Administrative Management:** Built-in system administrator tools to monitor system health, manage deleted records, and resolve unmatched requests.

## Tech Stack

### Frontend
- **Framework:** React.js (TypeScript) + Vite
- **Styling:** Tailwind CSS & Shadcn/UI
- **State Management:** React Hooks & Context API

### Backend
- **Framework:** Node.js with Express.js
- **Database:** MySQL 8.0 (Aiven Cloud / DigitalOcean)
- **Security:** Bcrypt (Password Hashing), UUID (Session tracking), CORS configuration

---

## System Architecture

OrganConnect utilizes a decoupled **Client-Server Architecture**:
1. **Presentation Layer:** The Vite-powered React application handles client-side routing, state, and API communication.
2. **Business Logic Layer:** The Express backend implements CRUD workflows, transaction management, and RESTful APIs.
3. **Data Layer:** The MySQL relational database enforces ACID properties natively via `UNIQUE` constraints, Triggers, and Stored Procedures.

---

## Installation & Local Setup

To run OrganConnect locally for development:

### 1. Clone the Repository
```bash
git clone https://github.com/omreddy45/Organ-Transplant-Network.git
cd Organ-Transplant-Network
```

### 2. Install Dependencies
Install dependencies for both the frontend and backend:
```bash
# In the root directory (Frontend)
npm install

# In the backend directory
cd backend
npm install
```

### 3. Database Configuration
1. Start your local MySQL server.
2. Execute the `CP.sql` script to construct the database schema, views, procedures, and triggers.
3. In the `backend/` directory, create a `.env` file:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=Hospital
DB_SSL=false
```

### 4. Run the Application
Start the development servers simultaneously:
```bash
# Terminal 1: Run the backend API
cd backend
npm run dev

# Terminal 2: Run the frontend application
cd ..
npm run dev
```

---

## Administrative Operations

The platform includes powerful administrative tools to ensure system security and data preservation.

### Default Admin Credentials
Upon initial deployment, the backend automatically seeds a root administrative account:
- **Email:** `admin@gmail.com`
- **Password:** `admin@gmail.com`
> **Security Notice:** It is highly recommended to change this password immediately after your first login.

### Account Restoration & Soft Deletes
To prevent catastrophic data loss, user accounts are never hard-deleted. 
- Deleted accounts are moved to a secure `deleted_records_audit` table via database triggers.
- **Restoration:** If an administrator restores a user, their complete profile (Patient/Donor/Doctor) is dynamically reinstated. 
- **Password Reset:** For security reasons, original passwords are not recovered. A restored account receives a temporary default password: **`restored`**. The user will be required to log in and update their password.

---

## Cloud Deployment

OrganConnect is configured for modern cloud deployment:
- **Database:** Hosted on [Aiven MySQL](https://aiven.io/). Strict SQL modes (`ANSI_QUOTES`) are supported, and SSL is enabled via `.env`.
- **Backend API:** Hosted as a Web Service on [Render](https://render.com/). Build command: `npm install`, Start command: `node server.js`.
- **Frontend SPA:** Deployed globally via [Vercel](https://vercel.com/) edge network.

---

## License
This project is proprietary and developed as a comprehensive DBMS implementation. Contact the repository owner for licensing details.
