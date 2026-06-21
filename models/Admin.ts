import { Schema, Document, model, models } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAdmin extends Document {
  username:          string;
  passwordHash:      string;
  email:             string;
  resetToken:        string;
  resetTokenExpiry?: Date;
  comparePassword(plain: string): Promise<boolean>;
}

const AdminSchema = new Schema<IAdmin>(
  {
    username:         { type: String, required: true, unique: true, uppercase: true, trim: true },
    passwordHash:     { type: String, required: true },
    email:            { type: String, trim: true, lowercase: true, default: '' },
    resetToken:       { type: String, default: '' },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

AdminSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

export const Admin = models.Admin || model<IAdmin>('Admin', AdminSchema);