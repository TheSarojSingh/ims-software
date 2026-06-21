import { Schema, Document, model, models, Types } from 'mongoose';

export interface IClassEntry extends Document {
  instituteId:     Types.ObjectId;
  sectionId:       Types.ObjectId;
  facultyId:       Types.ObjectId;
  subject:         string;
  topic:           string;
  remarks:         string;
  startTime:       string;
  endTime:         string;
  classDateBS:     string;
  classDateAD:     Date;
  sourceImportId?: Types.ObjectId;
}

const ClassEntrySchema = new Schema<IClassEntry>(
  {
    instituteId:    { type: Schema.Types.ObjectId, ref: 'Institute',     required: true },
    sectionId:      { type: Schema.Types.ObjectId, ref: 'Section',       required: true },
    facultyId:      { type: Schema.Types.ObjectId, ref: 'Faculty',       required: true },
    subject:        { type: String, required: true, trim: true, uppercase: true },
    topic:          { type: String, required: true, trim: true },
    remarks:        { type: String, trim: true, default: '' },
    startTime:      { type: String, required: true },
    endTime:        { type: String, required: true },
    classDateBS:    { type: String, required: true },
    classDateAD:    { type: Date,   required: true },
    sourceImportId: { type: Schema.Types.ObjectId, ref: 'RoutineImport' },
  },
  { timestamps: true }
);

ClassEntrySchema.index({ instituteId: 1, classDateBS: -1 });
ClassEntrySchema.index({ instituteId: 1, facultyId: 1, classDateBS: -1 });
ClassEntrySchema.index({ instituteId: 1, sectionId: 1, classDateBS: -1 });
ClassEntrySchema.index({ instituteId: 1, sourceImportId: 1 });

export const ClassEntry = models.ClassEntry || model<IClassEntry>('ClassEntry', ClassEntrySchema);