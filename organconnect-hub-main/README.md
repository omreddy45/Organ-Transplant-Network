# OrganConnect — Organ Donation & Transplant Network

## Project Structure

```
organconnect-hub-main/
├── src/                    # React frontend (Vite + TypeScript + Tailwind)
│   ├── pages/              # All page components
│   ├── components/         # Shared UI components
│   ├── contexts/           # Auth & Theme providers
│   ├── lib/                # API service, mock data, utilities
│   └── hooks/              # Custom hooks
├── backend/                # Express.js API server
│   ├── server.js           # Entry point (port 3001)
│   ├── db.js               # MySQL connection pool
│   ├── routes/
│   │   ├── auth.js         # Login, Signup, Logout
│   │   ├── organs.js       # CRUD + catalog + stats
│   │   ├── transplants.js  # Records + analytics
│   │   ├── profile.js      # View / edit / password / delete
│   │   ├── doctors.js      # List, status, schedule, visits
│   │   ├── patients.js     # List by doctor or all
│   │   └── medicalHistory.js # Patient medical records
│   └── .env                # DB credentials
└── vite.config.ts          # Proxy: /api → localhost:3001
```

## How to Run

### 1. Setup MySQL
```sql
-- Run the schema file
SOURCE d:/DBMS-CP/CP.sql;
```

### 2. Start Backend
```bash
cd backend
npm install
node server.js
# → API on http://localhost:3001
```

### 3. Start Frontend
```bash
cd organconnect-hub-main
npm install
npm run dev
# → UI on http://localhost:8080
```

### 4. Login
- Register as Patient, Donor, or Organization via `/signup`
- Doctors are created by Organization admins from the Org Dashboard
- Login at `/login` with your registered email + password

## Account Creation Flow

| Role         | Created By          | Where                           |
|-------------|--------------------|---------------------------------|
| Patient     | Self-registration   | `/signup` → Patient role card   |
| Donor       | Self-registration   | `/signup` → Donor role card     |
| Organization| Self-registration   | `/signup` → Organization card   |
| Doctor      | Organization admin  | Org Dashboard → "Add Doctor"    |

## API Endpoints

| Method | Endpoint                  | Description                    |
|--------|--------------------------|--------------------------------|
| POST   | `/api/auth/signup`       | Register new account           |
| POST   | `/api/auth/login`        | Login → returns user + session |
| POST   | `/api/auth/logout`       | End session                    |
| GET    | `/api/organs`            | Public organ catalog           |
| GET    | `/api/organs/inventory`  | Org-specific inventory         |
| GET    | `/api/organs/stats`      | Landing page statistics        |
| POST   | `/api/organs/add`        | Add organ to inventory         |
| PUT    | `/api/organs/:id`        | Update organ                   |
| DELETE | `/api/organs/:id`        | Delete organ                   |
| GET    | `/api/transplants`       | List transplant records        |
| POST   | `/api/transplants`       | Create transplant              |
| PUT    | `/api/transplants/:id`   | Update status                  |
| GET    | `/api/transplants/analytics` | Charts data for org        |
| GET    | `/api/doctors`           | List doctors                   |
| PUT    | `/api/doctors/:id/status`| Change availability            |
| GET    | `/api/doctors/:id/schedule`| Weekly visits                |
| POST   | `/api/doctors/visit`     | Book a visit                   |
| GET    | `/api/patients`          | List patients                  |
| GET    | `/api/medical-history`   | Patient medical records        |
| POST   | `/api/medical-history/add`| Add medical record            |
| DELETE | `/api/medical-history/:id`| Delete record                 |
| GET    | `/api/profile`           | Get user profile               |
| PUT    | `/api/profile/update`    | Update profile                 |
| PUT    | `/api/profile/password`  | Change password                |
| DELETE | `/api/profile`           | Delete account                 |
