import { db, eq } from "@/db";
import { user } from "@coffeeshop/db";
import * as jose from 'jose';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '30d';

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  name: string;
}

export async function generateToken(user: UserPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  return await new jose.SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as string,
      name: payload.name as string
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hashedPassword);
}

export async function getUserByEmail(email: string) {
  const [found] = await db
    .select()
    .from(user)
    .where(eq(user.email, email));
  return found;
}

export async function getUserById(id: string) {
  const [found] = await db
    .select()
    .from(user)
    .where(eq(user.id, id));
  return found;
}
