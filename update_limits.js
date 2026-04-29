import db from './organconnect-hub-main/backend/db.js';

async function updateLimits() {
  try {
    const limits = [
      { name: 'Kidney', spec: 'Nephrology' },
      { name: 'Liver', spec: 'Hepatology' },
      { name: 'Heart', spec: 'Cardiology' },
      { name: 'Lung', spec: 'Pulmonology' },
      { name: 'Pancreas', spec: 'Endocrinology' },
      { name: 'Cornea', spec: 'Ophthalmology' },
      { name: 'Bone Marrow', spec: 'Hematology' },
      { name: 'Skin', spec: 'Dermatology' }
    ];
    
    // Attempt to add column if missing
    try {
      await db.query('ALTER TABLE organ_limits ADD COLUMN required_specialization VARCHAR(100) NOT NULL DEFAULT "Surgeon"');
      console.log('Added column required_specialization');
    } catch (e) {
      console.log('Column might exist already');
    }

    for (const l of limits) {
      await db.query('UPDATE organ_limits SET required_specialization = ? WHERE organ_name = ?', [l.spec, l.name]);
    }
    console.log('Updated predefined organ limits!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
updateLimits();
