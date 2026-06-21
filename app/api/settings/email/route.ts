import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Admin } from '@/lib/db/models';
import { getAdminSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await connectToDatabase();
    const admin = await Admin.findOne({ username: session.username }).select('email').lean();
    return NextResponse.json({ success: true, email: (admin as any)?.email ?? '' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await connectToDatabase();
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email required' }, { status: 400 });
    }
    await Admin.findOneAndUpdate({ username: session.username }, { email: email.toLowerCase().trim() });
    return NextResponse.json({ success: true, message: 'Email updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}