import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Section, ClassEntry } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';
import mongoose from 'mongoose';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;
    const { id } = await params;

    const section = await Section.findOne({ _id: id, instituteId });
    if (!section) return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });

    const sOid = new mongoose.Types.ObjectId(id);
    const iOid = new mongoose.Types.ObjectId(instituteId);

    const [facultyBreakdown, monthlyBreakdown, topicHistory, totalClasses] = await Promise.all([
      ClassEntry.aggregate([
        { $match: { sectionId: sOid, instituteId: iOid } },
        { $group: { _id: '$facultyId', count: { $sum: 1 } } },
        { $lookup: { from: 'faculties', localField: '_id', foreignField: '_id', as: 'faculty' } },
        { $unwind: '$faculty' },
        { $project: { facultyName: '$faculty.fullName', initials: '$faculty.initials', subject: '$faculty.subject', count: 1 } },
        { $sort: { count: -1 } },
      ]),
      ClassEntry.aggregate([
        { $match: { sectionId: sOid, instituteId: iOid } },
        { $group: { _id: { $substr: ['$classDateBS', 0, 7] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      ClassEntry.find({ sectionId: id, instituteId })
        .populate('facultyId', 'fullName initials subject')
        .sort({ classDateBS: -1 })
        .limit(50)
        .select('classDateBS topic subject startTime endTime facultyId')
        .lean(),
      ClassEntry.countDocuments({ sectionId: id, instituteId }),
    ]);

    return NextResponse.json({
      success: true,
      data: { section, totalClasses, facultyBreakdown, monthlyBreakdown, topicHistory },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;
    const { id } = await params;

    const updated = await Section.findOneAndUpdate(
      { _id: id, instituteId },
      await request.json(),
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
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

    const updated = await Section.findOneAndUpdate(
      { _id: id, instituteId },
      { status: 'Inactive' },
      { new: true }
    );
    if (!updated) return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}