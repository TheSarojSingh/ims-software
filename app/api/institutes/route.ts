import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Institute } from '@/lib/db/models';

export async function GET() {
  try {
    await connectToDatabase();
    const institutes = await Institute.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: institutes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { name, shortName, address, phone } = await request.json();

    if (!name || !shortName) {
      return NextResponse.json({ success: false, error: 'name and shortName are required' }, { status: 400 });
    }

    const institute = await Institute.create({ name, shortName, address, phone });
    return NextResponse.json({ success: true, data: institute }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}