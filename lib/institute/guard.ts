import { NextResponse } from 'next/server';

export function getInstituteId(request: Request): { instituteId: string } | NextResponse {
  const id = request.headers.get('x-institute-id');
  if (!id || id.length < 10) {
    return NextResponse.json(
      { success: false, error: 'No institute selected. Pass x-institute-id header.' },
      { status: 400 }
    );
  }
  return { instituteId: id };
}