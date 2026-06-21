import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClassEntry } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const { searchParams } = new URL(request.url);
    const type        = searchParams.get('type') || 'faculty-summary';
    const startDateBS = searchParams.get('startDateBS') || '';
    const endDateBS   = searchParams.get('endDateBS')   || '';
    const facultyId   = searchParams.get('facultyId')   || '';
    const sectionId   = searchParams.get('sectionId')   || '';

    const iOid = new mongoose.Types.ObjectId(instituteId);
    const baseMatch: any = { instituteId: iOid };

    if (startDateBS && endDateBS) {
      baseMatch.classDateBS = { $gte: startDateBS, $lte: endDateBS };
    } else if (startDateBS) {
      baseMatch.classDateBS = { $gte: startDateBS };
    } else if (endDateBS) {
      baseMatch.classDateBS = { $lte: endDateBS };
    }

    if (facultyId) {
      try { baseMatch.facultyId = new mongoose.Types.ObjectId(facultyId); } catch {}
    }
    if (sectionId) {
      try { baseMatch.sectionId = new mongoose.Types.ObjectId(sectionId); } catch {}
    }

    // ── Faculty summary ───────────────────────────────────────────────────
    if (type === 'faculty-summary') {
      const data = await ClassEntry.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id:      '$facultyId',
            total:    { $sum: 1 },
            sections: { $addToSet: '$sectionId' },
            topics:   { $addToSet: '$topic' },
          },
        },
        { $lookup: { from: 'faculties', localField: '_id', foreignField: '_id', as: 'faculty' } },
        { $unwind: { path: '$faculty', preserveNullAndEmptyArrays: false } },
        {
          $project: {
            facultyId:    '$_id',
            fullName:     '$faculty.fullName',
            initials:     '$faculty.initials',
            subject:      '$faculty.subject',
            total:        1,
            sectionCount: { $size: '$sections' },
            topicCount:   { $size: '$topics' },
          },
        },
        { $sort: { total: -1 } },
      ]);
      return NextResponse.json({ success: true, type, data });
    }

    // ── Section summary ───────────────────────────────────────────────────
    if (type === 'section-summary') {
      const data = await ClassEntry.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id:      '$sectionId',
            total:    { $sum: 1 },
            faculties: { $addToSet: '$facultyId' },
            topics:    { $addToSet: '$topic' },
          },
        },
        { $lookup: { from: 'sections', localField: '_id', foreignField: '_id', as: 'section' } },
        { $unwind: { path: '$section', preserveNullAndEmptyArrays: false } },
        {
          $project: {
            sectionId:    '$_id',
            name:         '$section.name',
            total:        1,
            facultyCount: { $size: '$faculties' },
            topicCount:   { $size: '$topics' },
          },
        },
        { $sort: { total: -1 } },
      ]);
      return NextResponse.json({ success: true, type, data });
    }

    // ── Monthly trend ─────────────────────────────────────────────────────
    if (type === 'monthly') {
      const data = await ClassEntry.aggregate([
        { $match: baseMatch },
        { $group: { _id: { $substr: ['$classDateBS', 0, 7] }, total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      return NextResponse.json({ success: true, type, data });
    }

    // ── Daily trend ───────────────────────────────────────────────────────
    if (type === 'daily') {
      const data = await ClassEntry.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$classDateBS', total: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 60 },
      ]);
      return NextResponse.json({ success: true, type, data });
    }

    return NextResponse.json({ success: false, error: `Unknown report type: ${type}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}