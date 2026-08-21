import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/appError';

export class AuthService {
  async login(email: string, pass: string) {
    let user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, company: true },
    });



    if (!user) {
      throw new AppError('Invalid credentials provided.', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'Active') {
      throw new AppError('Your account has been deactivated. Please contact support.', 403, 'USER_DEACTIVATED');
    }

    if (user.companyId && user.company) {
      if (user.company.status !== 'Active') {
        throw new AppError('Your company account is suspended. Please contact support.', 403, 'COMPANY_SUSPENDED');
      }
    }

    const isValidPassword = await bcrypt.compare(pass, user.passwordHash).catch(() => false);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials provided.', 401, 'INVALID_CREDENTIALS');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name || 'Super Admin',
      companyId: user.companyId || undefined,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        roleName: user.role?.name || 'Super Admin',
        companyId: user.companyId,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string) {
    if (!token) throw new AppError('Refresh token required.', 400, 'BAD_REQUEST');
    try {
      const decoded = verifyRefreshToken(token);
      const newAccessToken = generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
        roleId: decoded.roleId,
        roleName: decoded.roleName,
        companyId: decoded.companyId,
      });
      return { accessToken: newAccessToken };
    } catch (err: any) {
      throw new AppError(err.message || 'Invalid or expired refresh token.', 401, 'UNAUTHORIZED');
    }
  }

  async changePassword(userEmail: string | undefined, currentPass: string, newPass: string) {
    if (!userEmail) {
      throw new AppError('Authentication email is required.', 401, 'UNAUTHORIZED');
    }
    if (!currentPass) {
      throw new AppError('Current password is required.', 400, 'BAD_REQUEST');
    }
    if (!newPass || newPass.length < 6) {
      throw new AppError('New password must be at least 6 characters.', 400, 'BAD_REQUEST');
    }

    const user = await prisma.user.findFirst({
      where: userEmail ? { email: userEmail } : undefined,
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'NOT_FOUND');
    }

    const isPasswordValid = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Incorrect current password.', 400, 'INVALID_PASSWORD');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password updated successfully in database.' };
  }
}

export const authService = new AuthService();
