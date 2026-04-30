import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Hospital',
});



const orgsData = [
  { license: "PUNE-RHC-001", name: "Ruby Hall Clinic", loc: "Pune, India" },
  { license: "PUNE-SH-002", name: "Sahyadri Hospital", loc: "Pune, India" },
  { license: "PUNE-DMH-003", name: "Deenanath Mangeshkar Hospital", loc: "Pune, India" },
  { license: "PUNE-JH-004", name: "Jehangir Hospital", loc: "Pune, India" },
  { license: "PUNE-KEM-005", name: "KEM Hospital", loc: "Pune, India" },
  { license: "MUM-LHH-006", name: "Lilavati Hospital", loc: "Mumbai, India" },
  { license: "MUM-BH-007", name: "Breach Candy Hospital", loc: "Mumbai, India" },
  { license: "MUM-NH-008", name: "Nanavati Hospital", loc: "Mumbai, India" },
  { license: "MUM-TMC-009", name: "Tata Memorial Hospital", loc: "Mumbai, India" },
  { license: "MUM-HNH-010", name: "H.N. Reliance Foundation Hospital", loc: "Mumbai, India" },
  // skipping PUNE-SJ-011 so that one is approved but not registered
];

const organTypes = ["Kidney", "Liver", "Heart", "Lung", "Pancreas", "Cornea"];
const specs = ["Nephrology", "Hepatology", "Cardiology", "Pulmonology", "Ophthalmology"];

async function main() {
  const conn = await pool.getConnection();

  try {
    console.log("Emptying old data (ignoring foreign keys temporarily)...");
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = ['Attends', 'Transplant', 'Organ', 'Medical_History', 'Doctor_Phone', 'Organization_Phone', 'Organization_Head', 'Doctor', 'Donor_Phone', 'Patient_Phone', 'Patient', 'Donor', 'Organization', 'Sessions', 'Users'];
    for (const t of tables) await conn.query(`TRUNCATE TABLE ${t}`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log(`Seeding ${orgsData.length} Organizations, Heads, and Doctors...`);
    const orgIds = [];
    let docIds = [];

    for (let i = 0; i < orgsData.length; i++) {
        const org = orgsData[i];
        const orgEmail = org.name.replace(/\s+/g, '') + "@gmail.com";
        const orgUName = orgEmail.split('@')[0];

        // Org User
        const [oRes] = await conn.query(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'organization')",
            [orgUName, orgEmail, bcrypt.hashSync(orgEmail, 10)]
        );
        const [orgRes] = await conn.query(
            "INSERT INTO organization (user_id, name, location, license_number, government_approved) VALUES (?, ?, ?, ?, 1)",
            [oRes.insertId, org.name, org.loc, org.license]
        );
        const orgId = orgRes.insertId;
        orgIds.push(orgId);

        // Head User
        const headEmail = org.name.replace(/\s+/g, '') + "Head@gmail.com";
        const [hRes] = await conn.query(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'organization')",
            [headEmail.split('@')[0], headEmail, bcrypt.hashSync(headEmail, 10)]
        );
        await conn.query(
            "INSERT INTO Organization_Head (org_id, user_id, name, joining_date, term_length) VALUES (?, ?, ?, CURDATE(), 5)",
            [orgId, hRes.insertId, "Dr. Head of " + org.name]
        );

        // Doctors (2-4 per org)
        const dCount = Math.floor(Math.random() * 3) + 2;
        for (let d = 1; d <= dCount; d++) {
            const docEmail = `doc_${orgId}_${d}@gmail.com`;
            const [duRes] = await conn.query(
                "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'doctor')",
                [`doc_${orgId}_${d}`, docEmail, bcrypt.hashSync(docEmail, 10)]
            );
            const [docRes] = await conn.query(
                "INSERT INTO doctor (user_id, name, specialization, org_id) VALUES (?, ?, ?, ?)",
                [duRes.insertId, `Dr. Expert ${d}`, specs[Math.floor(Math.random() * specs.length)], orgId]
            );
            docIds.push(docRes.insertId);
        }
    }

    console.log("Seeding 15 Donors... and their Organs");
    let donorIds = [];
    let organIds = [];
    for(let i = 1; i <= 15; i++) {
        const email = `donor${i}@gmail.com`;
        const [uRes] = await conn.query(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'donor')",
            [`donor${i}`, email, bcrypt.hashSync(email, 10)]
        );
        const [dRes] = await conn.query(
            "INSERT INTO donor (user_id, name, dob, donation_reason) VALUES (?, ?, ?, ?)",
            [uRes.insertId, `Donor ${i}`, '1990-01-01', 'Wanted to save lives']
        );
        donorIds.push(dRes.insertId);

        // 1-2 organs per donor
        const orgAssignId = orgIds[Math.floor(Math.random() * orgIds.length)];
        const oType = organTypes[Math.floor(Math.random() * organTypes.length)];
        
        const [oRes] = await conn.query(
            "INSERT INTO organ (name, quantity, availability_status, donor_id, org_id) VALUES (?, ?, ?, ?, ?)",
            [oType, 1, 'available', dRes.insertId, orgAssignId]
        );
        organIds.push({id: oRes.insertId, org_id: orgAssignId});
    }

    console.log("Seeding 15 Patients...");
    let patientIds = [];
    for(let i = 1; i <= 15; i++) {
        const email = `patient${i}@gmail.com`;
        const [uRes] = await conn.query(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'patient')",
            [`patient${i}`, email, bcrypt.hashSync(email, 10)]
        );
        const [pRes] = await conn.query(
            "INSERT INTO patient (user_id, name, dob, city, state) VALUES (?, ?, ?, ?, ?)",
            [uRes.insertId, `Patient ${i}`, '1985-06-15', 'Pune', 'Maharashtra']
        );
        patientIds.push(pRes.insertId);
    }

    console.log("Seeding Transplants (setting some organs to 'transplanted')...");
    for (let i = 0; i < 8; i++) {
        // take an organ, mark transplanted
        const targetOrgan = organIds[i];
        if (!targetOrgan) continue;

        await conn.query("UPDATE organ SET availability_status = 'transplanted' WHERE organ_id = ?", [targetOrgan.id]);
        
        // assign transplant record
        const docId = docIds[Math.floor(Math.random() * docIds.length)]; // random doctor
        const patId = patientIds[i]; // assign one patient
        
        await conn.query(
            "INSERT INTO transplant (transplant_date, status, bill_amount, patient_id, doctor_id, organ_id, org_id) VALUES (CURDATE(), 'completed', ?, ?, ?, ?, ?)",
            [Math.floor(Math.random() * 500000) + 100000, patId, docId, targetOrgan.id, targetOrgan.org_id]
        );
    }

    console.log("✅ Seeding completed! Database is full of life.");

  } catch (err) {
    console.error(err);
  } finally {
    conn.release();
    pool.end();
  }
}

main();
