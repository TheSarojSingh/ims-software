import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Admin } from '@/lib/db/models';
import { seedAdminIfNeeded } from '@/lib/auth/seed';
import { createSession, getSessionCookieOptions } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    await seedAdminIfNeeded();

    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    const admin = await Admin.findOne({ username: username.toUpperCase().trim() });
    if (!admin) return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });

    const valid = await admin.comparePassword(password);
    if (!valid) return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });

    const token = await createSession({ username: admin.username, role: 'admin' });
    const opts  = getSessionCookieOptions();

    const res = NextResponse.json({ success: true, username: admin.username, role: 'admin' });
    res.cookies.set(opts.name, token, opts);
    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}