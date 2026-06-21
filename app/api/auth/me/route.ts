import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  return NextResponse.json({
    success:     true,
    username:    session.username,
    role:        session.role,
    ...(session.facultyId   ? { facultyId:   session.facultyId }   : {}),
    ...(session.instituteId ? { instituteId: session.instituteId } : {}),
  });
}