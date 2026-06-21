import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClassEntry } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';
import { convertBStoAD } from '@/lib/date/date-converter';
import { z } from 'zod';

const BulkSchema = z.object({
  sectionId:   z.string().min(1),
  classDateBS: z.string().min(1),
  slots: z.array(z.object({
    facultyId: z.string().min(1),
    subject:   z.string().min(1),
    topic:     z.string().min(1),
    startTime: z.string().min(1),
    endTime:   z.string().min(1),
  })).min(1),
});

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const parsed      = BulkSchema.parse(await request.json());
    const classDateAD = convertBStoAD(parsed.classDateBS);

    const docs = parsed.slots.map(slot => ({
      instituteId,
      sectionId:   parsed.sectionId,
      classDateBS: parsed.classDateBS,
      classDateAD,
      facultyId:   slot.facultyId,
      subject:     slot.subject.toUpperCase(),
      topic:       slot.topic,
      startTime:   slot.startTime,
      endTime:     slot.endTime,
    }));

    const result = await ClassEntry.insertMany(docs);
    return NextResponse.json({ success: true, count: result.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}