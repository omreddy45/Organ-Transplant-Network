import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
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

    return NextResponse.json({ message: 'User created successfully', userId: result.insertId }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
