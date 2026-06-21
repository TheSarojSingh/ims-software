import { Schema, Document, model, models, Types } from 'mongoose';

export interface ISection extends Document {
  instituteId: Types.ObjectId;
  name:        string;
  status:      'Active' | 'Inactive';
  remarks:     string;
}

const SectionSchema = new Schema<ISection>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
    name:        { type: String, required: true, trim: true },
    status:      { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    remarks:     { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

SectionSchema.index({ instituteId: 1, name: 1 }, { unique: true });
SectionSchema.index({ instituteId: 1, status: 1 });

export const Section = models.Section || model<ISection>('Section', SectionSchema);