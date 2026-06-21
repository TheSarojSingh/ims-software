import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { RoutineImport } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const imports = await RoutineImport.find({ instituteId }).sort({ createdAt: -1 }).limit(30).lean();
    return NextResponse.json({ success: true, data: imports });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}