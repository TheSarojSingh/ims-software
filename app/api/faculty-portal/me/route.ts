import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Faculty, ClassEntry } from '@/lib/db/models';
import { getFacultySession } from '@/lib/auth/session';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getFacultySession();
    if (!session?.facultyId || !session.instituteId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { facultyId, instituteId } = session;

    const faculty = await Faculty.findOne({ _id: facultyId, instituteId, isActive: true })
      .select('-passwordHash');
    if (!faculty) return NextResponse.json({ success: false, error: 'Faculty not found' }, { status: 404 });

    const fOid = new mongoose.Types.ObjectId(facultyId);
    const iOid = new mongoose.Types.ObjectId(instituteId);

    const [sectionBreakdown, monthlyBreakdown, classHistory, totalClasses, uniqueTopics] =
      await Promise.all([
        ClassEntry.aggregate([
          { $match: { facultyId: fOid, instituteId: iOid } },
          { $group: { _id: '$sectionId', count: { $sum: 1 }, topics: { $addToSet: '$topic' } } },
          { $lookup: { from: 'sections', localField: '_id', foreignField: '_id', as: 'section' } },
          { $unwind: '$section' },
          { $project: { sectionName: '$section.name', count: 1, topicCount: { $size: '$topics' } } },
          { $sort: { count: -1 } },
        ]),
        ClassEntry.aggregate([
          { $match: { facultyId: fOid, instituteId: iOid } },
          { $group: { _id: { $substr: ['$classDateBS', 0, 7] }, count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
        ]),
        ClassEntry.find({ facultyId, instituteId })
          .populate('sectionId', 'name')
          .sort({ classDateBS: -1, startTime: 1 })
          .limit(500)
          .select('classDateBS topic subject startTime endTime sectionId')
          .lean(),
        ClassEntry.countDocuments({ facultyId, instituteId }),
        ClassEntry.distinct('topic', { facultyId, instituteId }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        faculty,
        totalClasses,
        totalTopics:  uniqueTopics.length,
        totalMonths:  monthlyBreakdown.length,
        sectionBreakdown,
        monthlyBreakdown,
        classHistory,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}