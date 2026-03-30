import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { name, email, password, role, licenseNumber, dob, city, state, location } = await req.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (role === 'patient') {
      if (!dob || !city || !state) return NextResponse.json({ error: 'Date of Birth, City, and State are required for patients' }, { status: 400 });
    } else if (role === 'donor') {
      if (!dob) return NextResponse.json({ error: 'Date of Birth is required for donors' }, { status: 400 });
    } else if (role === 'organization') {
      if (!licenseNumber || !location) {
        return NextResponse.json({ error: 'License number and location are required for organizations' }, { status: 400 });
      }

      // Check against approved JSON file dynamically
      try {
        const filePath = path.join(process.cwd(), 'src', 'data', 'approved_orgs.json');
        const fileData = fs.readFileSync(filePath, 'utf8');
        const approvedOrgs = JSON.parse(fileData);

        const isApproved = approvedOrgs.some((org: any) => org.license_number === licenseNumber);

        if (!isApproved) {
          return NextResponse.json({ error: 'Invalid license number. Government approval required.' }, { status: 400 });
        }
      } catch (err) {
        console.error('Error reading approved_orgs.json:', err);
        return NextResponse.json({ error: 'Validation service unavailable' }, { status: 500 });
      }
    }

    // Check if user exists
    const [existing]: any = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);

    // Insert user
    const [result]: any = await db.query(
      'INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, password_hash, role]
    );

    const userId = result.insertId;

    // Add user to the specific role table
    if (role === 'patient') {
      await db.query('INSERT INTO Patient (user_id, name, dob, city, state) VALUES (?, ?, ?, ?, ?)', [userId, name, dob, city, state]);
    } else if (role === 'donor') {
      await db.query('INSERT INTO Donor (user_id, name, dob) VALUES (?, ?, ?)', [userId, name, dob]);
    } else if (role === 'organization') {
      await db.query('INSERT INTO Organization (user_id, name, location, license_number, government_approved) VALUES (?, ?, ?, ?, ?)', [userId, name, location, licenseNumber, true]);
    }

    return NextResponse.json({ message: 'User created successfully', userId }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
