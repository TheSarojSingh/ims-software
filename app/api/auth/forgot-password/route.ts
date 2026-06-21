import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Admin } from '@/lib/db/models';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { action, email, token, newPassword } = await request.json();

    if (action === 'request') {
      const admin = await Admin.findOne({ email: email?.toLowerCase().trim() });
      if (admin) {
        const resetToken  = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await Admin.findByIdAndUpdate(admin._id, { resetToken, resetTokenExpiry: resetExpiry });
        // TODO: integrate your email provider here to send resetToken
        console.log(`[forgot-password] reset token for ${email}: ${resetToken}`);
      }
      // Always 200 — prevents email enumeration
      return NextResponse.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    if (action === 'reset') {
      if (!token || !newPassword) {
        return NextResponse.json({ success: false, error: 'Token and new password required' }, { status: 400 });
      }
      const admin = await Admin.findOne({
        resetToken:       token,
        resetTokenExpiry: { $gt: new Date() },
      });
      if (!admin) {
        return NextResponse.json({ success: false, error: 'Invalid or expired reset token' }, { status: 400 });
      }
      await Admin.findByIdAndUpdate(admin._id, {
        passwordHash:     await bcrypt.hash(newPassword, 12),
        resetToken:       '',
        resetTokenExpiry: undefined,
      });
      return NextResponse.json({ success: true, message: 'Password reset successful' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}