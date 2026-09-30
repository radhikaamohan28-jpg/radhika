import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'genomics-lab-jwt-secret-key-production-academic-2026';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'LAB_TECHNICIAN' | 'BIOINFORMATICS_ANALYST' | 'REVIEWER';
  status: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    const user = await User.findOne({ id: decoded.id }).lean() as (IUser & { _id: any }) | null;

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is inactive or suspended. Contact administrator.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized to perform this operation. Allowed: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}
