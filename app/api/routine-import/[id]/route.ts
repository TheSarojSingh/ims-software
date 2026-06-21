import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { RoutineImport, ClassEntry } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;
    const { id } = await params;

    const record = await RoutineImport.findOne({ _id: id, instituteId }).lean();
    if (!record) return NextResponse.json({ success: false, error: 'Import record not found' }, { status: 404 });

    // committedClasses is empty if this import was confirmed before sourceImportId was introduced
    const committedClasses = await ClassEntry.find({ instituteId, sourceImportId: id })
      .populate('sectionId', 'name')
      .populate('facultyId', 'fullName initials subject')
      .sort({ startTime: 1 })
      .lean();

    return NextResponse.json({ success: true, data: { ...record, committedClasses } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}