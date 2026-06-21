import { Schema, Document, model, models, Types } from 'mongoose';

export interface IRoutineImport extends Document {
  instituteId:           Types.ObjectId;
  fileName:              string;
  routineImageUrl:       string;
  status:                'Pending_Verification' | 'Processed' | 'Failed';
  rawExtractedData:      any;
  processedEntriesCount: number;
}

const RoutineImportSchema = new Schema<IRoutineImport>(
  {
    instituteId:           { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
    fileName:              { type: String, required: true },
    routineImageUrl:       { type: String, default: '' },
    status:                { type: String, enum: ['Pending_Verification', 'Processed', 'Failed'], default: 'Pending_Verification' },
    rawExtractedData:      { type: Schema.Types.Mixed, required: true },
    processedEntriesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RoutineImportSchema.index({ instituteId: 1, createdAt: -1 });

export const RoutineImport = models.RoutineImport || model<IRoutineImport>('RoutineImport', RoutineImportSchema);