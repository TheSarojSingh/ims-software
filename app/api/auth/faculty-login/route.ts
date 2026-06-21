import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Faculty } from '@/lib/db/models';
import { createSession, getSessionCookieOptions } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    const faculty = await Faculty.findOne({ username: username.toLowerCase().trim(), isActive: true });
    if (!faculty) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
    if (!faculty.passwordHash) {
      return NextResponse.json({ success: false, error: 'Portal access not enabled for this account' }, { status: 401 });
    }

    const valid = await faculty.comparePassword(password);
    if (!valid) return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });

    const token = await createSession({
      username:    faculty.username!,
      role:        'faculty',
      facultyId:   faculty._id.toString(),
      instituteId: faculty.instituteId.toString(),
    });

    const opts = getSessionCookieOptions();
    const res  = NextResponse.json({
      success:  true,
      username: faculty.username,
      fullName: faculty.fullName,
      role:     'faculty',
    });
    res.cookies.set(opts.name, token, opts);
    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}