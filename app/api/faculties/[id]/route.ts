import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Faculty, ClassEntry } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;
    const { id } = await params;

    const faculty = await Faculty.findOne({ _id: id, instituteId }).select('-passwordHash');
    if (!faculty) return NextResponse.json({ success: false, error: 'Faculty not found' }, { status: 404 });

    const fOid = new mongoose.Types.ObjectId(id);
    const iOid = new mongoose.Types.ObjectId(instituteId);

    const [sectionBreakdown, monthlyBreakdown, topicHistory, totalClasses, uniqueTopics] = await Promise.all([
      ClassEntry.aggregate([
        { $match: { facultyId: fOid, instituteId: iOid } },
        { $group: { _id: '$sectionId', count: { $sum: 1 } } },
        { $lookup: { from: 'sections', localField: '_id', foreignField: '_id', as: 'section' } },
        { $unwind: '$section' },
        { $project: { sectionName: '$section.name', count: 1 } },
        { $sort: { count: -1 } },
      ]),
      ClassEntry.aggregate([
        { $match: { facultyId: fOid, instituteId: iOid } },
        { $group: { _id: { $substr: ['$classDateBS', 0, 7] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      ClassEntry.find({ facultyId: id, instituteId })
        .populate('sectionId', 'name')
        .sort({ classDateBS: -1 })
        .limit(100)
        .select('classDateBS topic subject startTime endTime sectionId')
        .lean(),
      ClassEntry.countDocuments({ facultyId: id, instituteId }),
      ClassEntry.distinct('topic', { facultyId: id, instituteId }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        faculty,
        totalClasses,
        totalSections: sectionBreakdown.length,
        totalTopics:   uniqueTopics.length,
        sectionBreakdown,
        monthlyBreakdown,
        topicHistory,
      },
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
    const { id }  = await params;
    const body    = await request.json();

    const { newPassword, username, ...fields } = body;
    const $set: any   = {};
    const $unset: any = {};

    if (fields.fullName  !== undefined) $set.fullName = fields.fullName;
    if (fields.initials  !== undefined) $set.initials = fields.initials.toUpperCase();
    if (fields.subject   !== undefined) $set.subject  = fields.subject.toUpperCase();
    if (fields.phone     !== undefined) $set.phone    = fields.phone;
    if (typeof fields.isActive === 'boolean') $set.isActive = fields.isActive;

    if (username !== undefined) {
      if (username === null || username === '') {
        $unset.username     = 1;
        $unset.passwordHash = 1;
      } else {
        const taken = await Faculty.findOne({ username: username.toLowerCase().trim(), _id: { $ne: id } });
        if (taken) {
          return NextResponse.json({ success: false, error: 'Username already taken' }, { status: 400 });
        }
        $set.username = username.toLowerCase().trim();
      }
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      $set.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const update: any = {};
    if (Object.keys($set).length   > 0) update.$set   = $set;
    if (Object.keys($unset).length > 0) update.$unset = $unset;

    const updated = await Faculty.findOneAndUpdate(
      { _id: id, instituteId },
      update,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!updated) return NextResponse.json({ success: false, error: 'Faculty not found' }, { status: 404 });
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

    const updated = await Faculty.findOneAndUpdate(
      { _id: id, instituteId },
      { isActive: false },
      { new: true }
    ).select('-passwordHash');

    if (!updated) return NextResponse.json({ success: false, error: 'Faculty not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Faculty deactivated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}