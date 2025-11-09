import { Hono } from 'hono';
import { z } from 'zod';
import { db, eq } from '@/db';
import { user } from '@coffeeshop/db';
import { 
  hashPassword, 
  comparePasswords, 
  generateToken, 
  verifyToken,
} from '../lib/auth';

const authRouter = new Hono();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'staff', 'customer']).optional().default('customer'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register a new user
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      return c.json(
        { success: false, error: result.error.issues.map(issue => issue.message).join(', ') },
        400
      );
    }
    
    const { name, email, password, role } = result.data;

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email));

    if (existingUser) {
      return c.json(
        { success: false, error: 'Email already registered' },
        400
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const [newUser] = await db
      .insert(user)
      .values({
        name,
        email,
        password: hashedPassword,
        role,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Generate JWT token
    const token = await generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    });

    return c.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json(
      { success: false, error: 'Registration failed' },
      500
    );
  }
});

// Login user
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return c.json(
        { success: false, error: result.error.issues.map(issue => issue.message).join(', ') },
        400
      );
    }
    
    const { email, password } = result.data;

    // Find user by email
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email));

    if (!foundUser || !foundUser.password) {
      return c.json(
        { success: false, error: 'Invalid credentials' },
        401
      );
    }

    // Verify password
    const isPasswordValid = await comparePasswords(password, foundUser.password);
    if (!isPasswordValid) {
      return c.json(
        { success: false, error: 'Invalid credentials' },
        401
      );
    }

    // Check if user is active
    if (!foundUser.isActive) {
      return c.json(
        { success: false, error: 'Account is deactivated' },
        403
      );
    }

    // Generate JWT token
    const token = await generateToken({
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      role: foundUser.role,
    });

    // Update last login time
    await db
      .update(user)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(user.id, foundUser.id));

    return c.json({
      success: true,
      data: {
        user: {
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          role: foundUser.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json(
      { success: false, error: 'Login failed' },
      500
    );
  }
});

// Get current user
authRouter.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        { success: false, error: 'No token provided' },
        401
      );
    }

    const parts = authHeader.split(' ');
    const token = parts[1];
    if (!token) {
      return c.json(
        { success: false, error: 'No token provided' },
        401
      );
    }
    const payload = await verifyToken(token);

    if (!payload) {
      return c.json(
        { success: false, error: 'Invalid or expired token' },
        401
      );
    }

    // Find user by ID from token
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, payload.id));

    if (!foundUser) {
      return c.json(
        { success: false, error: 'User not found' },
        404
      );
    }

    // Return only necessary user data
    const userData = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role,
      isActive: foundUser.isActive,
      lastLoginAt: foundUser.lastLoginAt,
      createdAt: foundUser.createdAt,
    };

    return c.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return c.json(
      { success: false, error: 'Failed to get current user' },
      500
    );
  }
});

export { authRouter };
