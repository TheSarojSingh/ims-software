import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Section } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';
import { z } from 'zod';

const CreateSchema = z.object({
  name:    z.string().min(1),
  status:  z.enum(['Active', 'Inactive']).default('Active'),
  remarks: z.string().optional().default(''),
});

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const all   = new URL(request.url).searchParams.get('all') === 'true';
    const query = { instituteId, ...(all ? {} : { status: 'Active' }) };

    const sections = await Section.find(query).sort({ name: 1 });
    return NextResponse.json({ success: true, data: sections });
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

    const validated = CreateSchema.parse(await request.json());

    const existing = await Section.findOne({ instituteId, name: validated.name });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Section name already exists in this institute' }, { status: 400 });
    }

    const section = await Section.create({ ...validated, instituteId });
    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}