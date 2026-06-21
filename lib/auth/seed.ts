import bcrypt from 'bcryptjs';
import { Admin } from '@/lib/db/models';

export async function seedAdminIfNeeded(): Promise<void> {
  const count = await Admin.countDocuments();
  if (count === 0) {
    const passwordHash = await bcrypt.hash('ADMIN123', 12);
    await Admin.create({ username: 'ADMIN', passwordHash });
    console.log('[seed] Default admin created — username: ADMIN, password: ADMIN123');
  }
}