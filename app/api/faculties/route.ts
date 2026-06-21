import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Faculty } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';
import { z } from 'zod';

const CreateSchema = z.object({
  fullName: z.string().min(2),
  initials: z.string().min(1).max(15),
  phone:    z.string().min(7),
  subject:  z.string().min(1),
});

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const { searchParams } = new URL(request.url);
    const search          = searchParams.get('search') || '';
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const query: any = { instituteId, ...(includeInactive ? {} : { isActive: true }) };
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { initials: { $regex: search, $options: 'i' } },
        { subject:  { $regex: search, $options: 'i' } },
      ];
    }

    const faculties = await Faculty.find(query).select('-passwordHash').sort({ subject: 1, initials: 1 });
    return NextResponse.json({ success: true, data: faculties });
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

    const body      = await request.json();
    const validated = CreateSchema.parse(body);
    const initials  = validated.initials.toUpperCase();
    const subject   = validated.subject.toUpperCase();

    const existing = await Faculty.findOne({ instituteId, initials, subject });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Faculty ${subject}-${initials} already exists in this institute` },
        { status: 400 }
      );
    }

    const created = await Faculty.create({ ...validated, instituteId, initials, subject });
    const result  = created.toObject();
    delete (result as any).passwordHash;
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}