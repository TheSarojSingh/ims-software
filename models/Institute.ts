import { Schema, Document, model, models } from 'mongoose';

export interface IInstitute extends Document {
  name:      string;
  shortName: string;
  address:   string;
  phone:     string;
  isActive:  boolean;
}

const InstituteSchema = new Schema<IInstitute>(
  {
    name:      { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true, uppercase: true },
    address:   { type: String, trim: true, default: '' },
    phone:     { type: String, trim: true, default: '' },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Institute = models.Institute || model<IInstitute>('Institute', InstituteSchema);