import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClassEntry } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;
    const { id } = await params;

    const updated = await ClassEntry.findOneAndUpdate(
      { _id: id, instituteId },
      await request.json(),
      { new: true }
    )
      .populate('sectionId', 'name')
      .populate('facultyId', 'fullName initials subject');

    if (!updated) return NextResponse.json({ success: false, error: 'Class record not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;
    const { id } = await params;

    const deleted = await ClassEntry.findOneAndDelete({ _id: id, instituteId });
    if (!deleted) return NextResponse.json({ success: false, error: 'Class record not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}