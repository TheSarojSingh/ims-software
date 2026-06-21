import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClassEntry, RoutineImport } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';
import { convertBStoAD } from '@/lib/date/date-converter';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const { importId, classDateBS, slots } = await request.json();

    if (!classDateBS || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { success: false, error: 'classDateBS and at least one slot are required' },
        { status: 400 }
      );
    }

    if (importId) {
      const importRecord = await RoutineImport.findOne({ _id: importId, instituteId });
      if (!importRecord) {
        return NextResponse.json({ success: false, error: 'Import record not found' }, { status: 404 });
      }
      // Re-confirm: wipe previously committed entries tagged to this import
      await ClassEntry.deleteMany({ instituteId, sourceImportId: importId });
    }

    const classDateAD = convertBStoAD(classDateBS);
    const documents   = slots.map((slot: any) => ({
      instituteId,
      sectionId:  slot.sectionId,
      facultyId:  slot.facultyId,
      subject:    slot.subject,
      topic:      slot.topic,
      startTime:  slot.startTime,
      endTime:    slot.endTime,
      classDateBS,
      classDateAD,
      ...(importId ? { sourceImportId: importId } : {}),
    }));

    const result = await ClassEntry.insertMany(documents);

    if (importId) {
      await RoutineImport.findByIdAndUpdate(importId, {
        status:                'Processed',
        processedEntriesCount: result.length,
      });
    }

    return NextResponse.json({ success: true, count: result.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}