import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'PUBLISHER' | 'ADMIN' | 'GUEST';
  avatar?: string;
  department?: string;
  regNumber?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const sessionStmt = db.prepare(`
        SELECT s.token, s.expires_at, u.id, u.name, u.email, u.role, u.avatar, u.department, u.reg_number
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
      `);
      const session = sessionStmt.get(token) as any;

      if (session) {
        // Check expiry
        if (session.expires_at < Date.now()) {
          db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        } else {
          req.user = {
            id: session.id,
            name: session.name,
            email: session.email,
            role: session.role,
            avatar: session.avatar,
            department: session.department,
            regNumber: session.reg_number,
          };
        }
      }
    } catch (err) {
      console.error('Session validation error:', err);
    }
  }

  // Resilient fallback for demo and fast-switched roles
  if (!req.user) {
    const roleHeader = (req.headers['x-campus-role'] || req.headers['x-client-role']) as string;
    if (roleHeader && ['ADMIN', 'PUBLISHER', 'STUDENT'].includes(roleHeader)) {
      try {
        let userEmail = 'student@vitbhopal.ac.in';
        if (roleHeader === 'ADMIN') userEmail = 'admin@vitbhopal.ac.in';
        else if (roleHeader === 'PUBLISHER') userEmail = 'aiclub@vitbhopal.ac.in';

        const u = db.prepare('SELECT id, name, email, role, avatar, department, reg_number FROM users WHERE email = ?').get(userEmail) as any;
        if (u) {
          req.user = {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar,
            department: u.department,
            regNumber: u.reg_number,
          };
        }
      } catch (e) {
        console.error('Role fallback error:', e);
      }
    }
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access forbidden: requires role [${allowedRoles.join(', ')}]. Current: ${req.user.role}`,
      });
    }
    next();
  };
}
