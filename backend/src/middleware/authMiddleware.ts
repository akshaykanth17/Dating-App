import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'tapin_jwt_access_secret_change_me_in_production_12345';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as { userId: string };
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Token expired' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}
