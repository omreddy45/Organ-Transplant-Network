import 'dotenv/config';
import db from './db.js';

async function run() {
  try {
    await db.query(`ALTER TABLE donor_pledge DROP FOREIGN KEY donor_pledge_ibfk_1;`);
    await db.query(`ALTER TABLE donor_pledge ADD CONSTRAINT donor_pledge_ibfk_1 FOREIGN KEY (donor_id) REFERENCES donor(donor_id) ON DELETE CASCADE;`);
    
    await db.query(`ALTER TABLE match_request DROP FOREIGN KEY match_request_ibfk_1;`);
    await db.query(`ALTER TABLE match_request ADD CONSTRAINT match_request_ibfk_1 FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE;`);
    
    await db.query(`ALTER TABLE donor_pledge DROP FOREIGN KEY donor_pledge_ibfk_2;`);
    await db.query(`ALTER TABLE donor_pledge ADD CONSTRAINT donor_pledge_ibfk_2 FOREIGN KEY (org_id) REFERENCES organization(org_id) ON DELETE CASCADE;`);
    
    console.log("Constraints updated successfully");

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
