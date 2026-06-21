import { Schema, Document, model, models, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IFaculty extends Document {
  instituteId:   Types.ObjectId;
  fullName:      string;
  initials:      string;
  subject:       string;
  phone:         string;
  isActive:      boolean;
  username?:     string;       // set by admin to enable faculty portal login
  passwordHash?: string;
  comparePassword(plain: string): Promise<boolean>;
}

const FacultySchema = new Schema<IFaculty>(
  {
    instituteId:  { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
    fullName:     { type: String, required: true, trim: true },
    initials:     { type: String, required: true, uppercase: true, trim: true },
    subject:      { type: String, required: true, uppercase: true, trim: true },
    phone:        { type: String, required: true, trim: true },
    isActive:     { type: Boolean, default: true },
    username:     { type: String, trim: true, lowercase: true },
    passwordHash: { type: String },
  },
  { timestamps: true }
);

// Same initials+subject allowed across different institutes
FacultySchema.index({ instituteId: 1, initials: 1, subject: 1 }, { unique: true });
FacultySchema.index({ instituteId: 1, isActive: 1 });
// Username is the global login key — must be unique across all faculties
FacultySchema.index({ username: 1 }, { unique: true, sparse: true });

FacultySchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

export const Faculty = models.Faculty || model<IFaculty>('Faculty', FacultySchema);