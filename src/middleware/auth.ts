import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { err } from '../utils/response';

export interface JwtPayload {
  id: number;
  name: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    err(res, 401, 'No token provided.');
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
      req.user = {
        id: Number((decoded as JwtPayload).id),
        name: String((decoded as JwtPayload).name),
        role: String((decoded as JwtPayload).role),
      };
      next();
    } else {
      err(res, 401, 'Invalid token payload.');
    }
  } catch {
    err(res, 401, 'Invalid or expired token.');
  }
};  

export const requireMaintainer = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'maintainer') {
    err(res, 403, 'Maintainer access required.');
    return;
  }
  next();
};