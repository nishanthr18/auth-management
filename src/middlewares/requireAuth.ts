import type { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { findUserById } from '../repositories/auth.repository';

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: string;
  tokenVersion: number;
}

const verifyAccessToken = (token: string) => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET!
  ) as AccessTokenPayload;
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      msg: 'Unauthorized',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    const user = await findUserById(payload.sub);

    if (!user) {
      return res.status(404).json({
        msg: 'User not found',
      });
    }

    if (user.token_version !== payload.tokenVersion) {
      return res.status(401).json({
        msg: 'Token expired',
      });
    }

    (req as any).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.is_email_verified,
    };

    return next();
  } catch {
    return res.status(401).json({
      msg: 'Invalid or expired token',
    });
  }
};