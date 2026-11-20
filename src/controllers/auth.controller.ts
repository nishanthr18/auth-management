import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import {
  clearResetToken,
  findUserByEmail,
  findUserById,
  findUserByResetToken,
  incrementTokenVersion,
  markEmailAsVerified,
  registerService,
  saveResetInitialPassword,
  updatePassword,
} from '../repositories/auth.repository';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { sendVerificationMail } from '../lib/mail';
import crypto from 'crypto';

interface EmailVerificationPayload extends JwtPayload {
  sub: string;
  purpose: 'email_verification';
}

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const getVerificationEmailTemplate = (
  name: string,
  verifyUrl: string
): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Your Email</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f4f6f8;
        font-family: Arial, Helvetica, sans-serif;
        color: #333333;
      ">

        <table width="100%" cellpadding="0" cellspacing="0"
          style="padding: 40px 15px;">
          <tr>
            <td align="center">

              <table width="100%" cellpadding="0" cellspacing="0"
                style="
                  max-width: 560px;
                  background-color: #ffffff;
                  border-radius: 10px;
                  overflow: hidden;
                ">

                <!-- Header -->
                <tr>
                  <td style="
                    background-color: #2563eb;
                    padding: 30px;
                    text-align: center;
                  ">
                    <h1 style="
                      margin: 0;
                      color: #ffffff;
                      font-size: 24px;
                    ">
                      Welcome Aboard!
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 35px 30px;">

                    <h2 style="
                      margin-top: 0;
                      font-size: 21px;
                      color: #111827;
                    ">
                      Hello ${escapeHtml(name)},
                    </h2>

                    <p style="
                      font-size: 15px;
                      line-height: 1.7;
                      color: #4b5563;
                    ">
                      Thank you for creating an account with us.
                      We're excited to have you on board!
                    </p>

                    <p style="
                      font-size: 15px;
                      line-height: 1.7;
                      color: #4b5563;
                    ">
                      To complete your registration and secure your
                      account, please verify your email address by
                      clicking the button below.
                    </p>

                    <!-- Verification Button -->
                    <table cellpadding="0" cellspacing="0"
                      style="margin: 30px auto;">
                      <tr>
                        <td align="center"
                          style="
                            background-color: #2563eb;
                            border-radius: 6px;
                          ">
                          <a href="${verifyUrl}"
                            style="
                              display: inline-block;
                              padding: 14px 30px;
                              color: #ffffff;
                              text-decoration: none;
                              font-size: 15px;
                              font-weight: bold;
                            ">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="
                      font-size: 14px;
                      line-height: 1.6;
                      color: #6b7280;
                    ">
                      This verification link will expire in 24 hours.
                      If you didn't create an account, you can safely
                      ignore this email.
                    </p>

                    <p style="
                      font-size: 13px;
                      line-height: 1.6;
                      color: #9ca3af;
                      margin-top: 30px;
                    ">
                      If the button doesn't work, copy and paste
                      the following link into your browser:
                    </p>

                    <p style="
                      font-size: 12px;
                      word-break: break-all;
                      color: #2563eb;
                    ">
                      <a href="${verifyUrl}" style="color: #2563eb;">
                        ${verifyUrl}
                      </a>
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="
                    background-color: #f9fafb;
                    padding: 20px;
                    text-align: center;
                  ">
                    <p style="
                      margin: 0;
                      font-size: 12px;
                      color: #9ca3af;
                    ">
                      © ${new Date().getFullYear()} Your Application.
                      All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>

      </body>
    </html>
  `;
};

const escapeHtml = (value: string): string => {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[char];
  });
};

const getAppUrl = (): string => {
  const url = process.env.APP_URL || `http://localhost:${process.env.PORT || 6000}`;
  return url.replace(/\/+$/, '');
};

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).toLowerCase().trim();

    const passwordHash = await hashPassword(String(password));

    const data = await registerService(
      normalizedName,
      normalizedEmail,
      passwordHash,
      'USER',
      false,
      false
    );

    const verificationSecret = process.env.EMAIL_VERIFICATION_SECRET;
    if (!verificationSecret) {
      throw new Error('EMAIL_VERIFICATION_SECRET is missing');
    }

    const verifyToken = jwt.sign(
      {
        sub: String(data.id),
        purpose: 'email_verification',
      },
      verificationSecret,
      { expiresIn: '1d' }
    );

    const verifyUrl =
      `${getAppUrl()}/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;

    const html = getVerificationEmailTemplate(normalizedName, verifyUrl);

    await sendVerificationMail(
      data.email,
      'Verify your email address',
      html
    );

    return res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      data: {
        id: data.id,
        name: data.name,
        email: data.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { token } = req.query;
  const verificationSecret = process.env.EMAIL_VERIFICATION_SECRET;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  if (!verificationSecret) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, verificationSecret) as EmailVerificationPayload;

    if (decoded.purpose !== 'email_verification' || !decoded.sub) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    await markEmailAsVerified(decoded.sub);

    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: 'Verification link has expired. Please request a new one.',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({
        message: 'Invalid verification link.',
      });
    }

    next(error);
  }
};

const createToken = (
  id: string,
  role: string,
  tokenVersion: number,
  jwtSecret: string,
  type: string = "AUTH_TOKEN",
) => {
  if (type === 'AUTH_TOKEN') {
    const token = jwt.sign(
      {
        sub: id,
        role,
        tokenVersion,
      },
      jwtSecret,
      { expiresIn: '1d' }
    );
    return token;
  }

  if (type === "REFRESH_TOKEN") {
    const token = jwt.sign(
      {
        sub: id,
        tokenVersion,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
    return token;
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in',
      });
    }

    // if (user.two_factor_enabled) {
    //   return res.status(200).json({
    //     requiresTwoFactor: true,
    //     message: 'Two-factor authentication code required',
    //   });
    // }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is missing');
    }

    const token = createToken(user.id, user.role, Number(user.token_version), jwtSecret);
    const refreshToken = createToken(user.id, user.role, Number(user.token_version), jwtSecret, "REFRESH_TOKEN");

    res.cookie('token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: 'Login successful',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.is_email_verified,
        isTwofactorEnabled: user.two_factor_enabled
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRefreshToken = (token: string) => jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

export const refreshTokenHandler = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken ?? undefined;

    if (!token) {
      return res.status(401).json({ message: 'token expired' })
    };

    const { sub, tokenVersion } = verifyRefreshToken(token);

    if (!sub || !tokenVersion) {
      return res.status(401).json({ msg: 'invalid req' })
    }

    const user = await findUserById(sub as string);

    if (!user) {
      return res.status(401).json({ msg: 'invalid request' })
    };

    if (tokenVersion !== user.token_version) {
      return res.status(401).json({ msg: 'invalid refresh token' })
    };

    const _token = createToken(user.id, user.role, user.token_version, process.env.JWT_SECRET!);
    const refreshToken = createToken(user.id, user.role, user.token_version, process.env.JWT_SECRET!, "REFRESH_TOKEN");

    res.cookie('token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: 'Login successful',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.is_email_verified,
        isTwofactorEnabled: user.two_factor_enabled
      },
      _token
    });
  }
  catch (e) {
    return res.status(500)
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return res.status(200).json({
    message: 'Logged out successfully',
  });
};


export const forgotPassword = async (
  req: Request,
  res: Response
) => {
  const email: string = req.body.email;

  if (!email) {
    return res.status(400).json({
      msg: 'Email not present',
    });
  }

  try {
    const user = await findUserByEmail(
      email.toLowerCase().trim()
    );

    // Prevent email enumeration
    if (!user) {
      return res.status(200).json({
        msg: 'If an account exists, a reset link has been sent.'
      });
    }

    // token sent to user
    const rawToken = crypto
      .randomBytes(32)
      .toString('hex');

    // token stored in DB
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const reset_password_expires_at =
      new Date(Date.now() + 15 * 60 * 1000);

    await saveResetInitialPassword(
      user.id,
      tokenHash,
      reset_password_expires_at,
    );

    const resetUrl =
      `${getAppUrl()}/auth/reset-password?token=${rawToken}`;

    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset.</p>
      <p>
        <a href="${resetUrl}">
          Reset Password
        </a>
      </p>
      <p>This link expires in 15 minutes.</p>
    `;

    await sendVerificationMail(
      user.email,
      'Reset your password',
      html
    );

    return res.status(200).json({
      msg: 'Reset link sent successfully'
    });

  } catch (e) {
    return res.status(500).json({
      msg: 'something went wrong!'
    });
  }
};

export const confirmResetPassword = async (
  req: Request,
  res: Response
) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      msg: 'missing fields'
    });
  }

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await findUserByResetToken(
    tokenHash
  );

  if (!user) {
    return res.status(400).json({
      msg: 'invalid token'
    });
  }

  if (
    !user.reset_password_expires_at ||
    user.reset_password_expires_at < new Date()
  ) {
    return res.status(400).json({
      msg: 'token expired'
    });
  }

  const passwordHash =
    await hashPassword(password);

  await updatePassword(
    user.id,
    passwordHash
  );

  await clearResetToken(user.id);

  await incrementTokenVersion(user.id);

  return res.status(200).json({
    msg: 'password updated successfully'
  });
};