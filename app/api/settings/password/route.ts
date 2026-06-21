import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Admin } from '@/lib/db/models';
import { getAdminSession } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Both passwords are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const admin = await Admin.findOne({ username: session.username });
    if (!admin) return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });

    if (!(await admin.comparePassword(currentPassword))) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    await Admin.findByIdAndUpdate(admin._id, { passwordHash: await bcrypt.hash(newPassword, 12) });
    return NextResponse.json({ success: true, message: 'Password updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}