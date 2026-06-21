import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'change-me-in-production');
const COOKIE = 'auth_session';
const EXPIRY = 60 * 60 * 24 * 7;

export type SessionRole = 'admin' | 'faculty';

export interface SessionPayload {
  username:     string;
  role:         SessionRole;
  facultyId?:   string;
  instituteId?: string;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const jwtPayload: Record<string, unknown> = {
    username: payload.username,
    role:     payload.role,
    ...(payload.facultyId   ? { facultyId:   payload.facultyId }   : {}),
    ...(payload.instituteId ? { instituteId: payload.instituteId } : {}),
  };
  return new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY}s`)
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

export async function getFacultySession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || session.role !== 'faculty') return null;
  return session;
}

export function getSessionCookieOptions() {
  return {
    name:     COOKIE,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   EXPIRY,
    path:     '/',
  };
}