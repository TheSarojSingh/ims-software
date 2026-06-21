import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClassEntry } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';
import { convertBStoAD } from '@/lib/date/date-converter';
import { normalizeBSDate } from '@/lib/date/bs-date';
import { z } from 'zod';

const CreateSchema = z.object({
  sectionId:   z.string().min(1),
  facultyId:   z.string().min(1),
  subject:     z.string().min(1),
  topic:       z.string().min(1),
  startTime:   z.string().min(1),
  endTime:     z.string().min(1),
  classDateBS: z.string().min(1),
  remarks:     z.string().optional().default(''),
});

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const { searchParams } = new URL(request.url);
    const page        = parseInt(searchParams.get('page')  || '1',  10);
    const limit       = parseInt(searchParams.get('limit') || '20', 10);
    const sectionId   = searchParams.get('sectionId');
    const facultyId   = searchParams.get('facultyId');
    const classDateBS = searchParams.get('classDateBS');
    const startDateBS = searchParams.get('startDateBS');
    const endDateBS   = searchParams.get('endDateBS');

    const filter: any = { instituteId };
    if (sectionId)   filter.sectionId   = sectionId;
    if (facultyId)   filter.facultyId   = facultyId;
    if (classDateBS) filter.classDateBS = normalizeBSDate(classDateBS);
    if (startDateBS || endDateBS) {
      filter.classDateBS = {};
      if (startDateBS) filter.classDateBS.$gte = normalizeBSDate(startDateBS);
      if (endDateBS)   filter.classDateBS.$lte = normalizeBSDate(endDateBS);
    }

    const [entries, total] = await Promise.all([
      ClassEntry.find(filter)
        .populate('sectionId', 'name')
        .populate('facultyId', 'fullName initials subject')
        .sort({ classDateBS: -1, startTime: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ClassEntry.countDocuments(filter),
    ]);

    return NextResponse.json({
      success:    true,
      data:       entries,
      pagination: { page, totalPages: Math.ceil(total / limit), totalRecords: total, limit },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const validated   = CreateSchema.parse(await request.json());
    const classDateBS = normalizeBSDate(validated.classDateBS);

    const entry = await ClassEntry.create({
      ...validated,
      instituteId,
      classDateBS,
      classDateAD: convertBStoAD(classDateBS),
      subject:     validated.subject.toUpperCase(),
    });

    const populated = await entry.populate([
      { path: 'sectionId', select: 'name' },
      { path: 'facultyId', select: 'fullName initials subject' },
    ]);
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const classDateBS = new URL(request.url).searchParams.get('classDateBS');
    if (!classDateBS) {
      return NextResponse.json({ success: false, error: 'classDateBS is required' }, { status: 400 });
    }

    const result = await ClassEntry.deleteMany({ instituteId, classDateBS: normalizeBSDate(classDateBS) });
    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}