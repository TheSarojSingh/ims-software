import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClassEntry, Faculty, Section } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';
import { getTodayBS } from '@/lib/date/bs-date';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const todayBS    = getTodayBS();
    const [y, m]     = todayBS.split('-');
    const monthStart = `${y}-${m}-01`;
    const monthEnd   = `${y}-${m}-32`;

    const [todayCount, monthCount, totalFaculties, totalSections, recentClasses] = await Promise.all([
      ClassEntry.countDocuments({ instituteId, classDateBS: todayBS }),
      ClassEntry.countDocuments({ instituteId, classDateBS: { $gte: monthStart, $lte: monthEnd } }),
      Faculty.countDocuments({ instituteId, isActive: true }),
      Section.countDocuments({ instituteId, status: 'Active' }),
      ClassEntry.find({ instituteId })
        .populate('sectionId', 'name')
        .populate('facultyId', 'fullName initials subject')
        .sort({ classDateBS: -1, startTime: -1 })
        .limit(10)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: { todayBS, todayCount, monthCount, totalFaculties, totalSections, recentClasses },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}