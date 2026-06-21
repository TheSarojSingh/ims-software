import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { connectToDatabase } from '@/lib/db/mongodb';
import { RoutineImport } from '@/lib/db/models';
import { getInstituteId } from '@/lib/institute/guard';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const guard = getInstituteId(request);
    if (guard instanceof NextResponse) return guard;
    const { instituteId } = guard;

    const formData        = await request.formData();
    const imageFile       = formData.get('file') as File;
    const customPrompt    = formData.get('customPrompt') as string;
    const routineImageUrl = formData.get('routineImageUrl') as string;

    if (!imageFile) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const imagePart   = {
      inlineData: {
        data:     Buffer.from(arrayBuffer).toString('base64'),
        mimeType: imageFile.type,
      },
    };

    const instructions = `
You are parsing an institute class routine grid image.

IMAGE STRUCTURE:
- The grid is divided into SHIFTS: "MORNING SHIFT", "DAY SHIFT", "EVENING SHIFT [Online]"
- Each shift has its own set of time columns shown in the header row of that shift
- Left column shows section names: M2, M3, M4, M5, M6, M7, M8, M9, ONLINE CLASS MORNING, D1, D2, D3, D4, Evening Online, etc.
- There is a BREAK column between some time slots — skip it entirely
- The routine date is in the top-right header e.g. "2083-03-02"

CELL FORMAT — each cell has exactly two lines:
  Line 1: "X-YYY"  where X = subject code letter, YYY = faculty initials
  Line 2: "[TOPIC NAME]" in square brackets

PARSING RULES:
1. subjectCode  = single letter BEFORE the hyphen
2. facultyInitials = everything AFTER the hyphen (e.g. "OBS", "JN MILAN", "Dr. RJ")
3. topic        = text inside [ ] on line 2, WITHOUT the brackets
4. shift        = "Morning" | "Day" | "Evening" based on which shift block the cell is in
5. startTime / endTime = EXACT text from the column header (e.g. "6:15AM", "12:00PM")
6. Skip BREAK columns and empty cells entirely

${customPrompt ? `ADDITIONAL INSTRUCTIONS: ${customPrompt}` : ''}
`;

    const response = await ai.models.generateContent({
      model:    'gemini-2.5-flash',
      contents: [imagePart, instructions],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classDateBS: { type: Type.STRING, description: 'Date from top-right header, YYYY-MM-DD' },
            slots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sectionName:     { type: Type.STRING },
                  shift:           { type: Type.STRING },
                  subjectCode:     { type: Type.STRING },
                  facultyInitials: { type: Type.STRING },
                  topic:           { type: Type.STRING },
                  startTime:       { type: Type.STRING },
                  endTime:         { type: Type.STRING },
                },
                required: ['sectionName', 'shift', 'subjectCode', 'facultyInitials', 'topic', 'startTime', 'endTime'],
              },
            },
          },
          required: ['classDateBS', 'slots'],
        },
      },
    });

    const parsedOutputJson = JSON.parse(response.text || '{}');

    const importRecord = await RoutineImport.create({
      instituteId,
      fileName:              imageFile.name,
      routineImageUrl:       routineImageUrl || '',
      status:                'Pending_Verification',
      rawExtractedData:      parsedOutputJson,
      processedEntriesCount: 0,
    });

    return NextResponse.json({ success: true, data: parsedOutputJson, importId: importRecord._id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}