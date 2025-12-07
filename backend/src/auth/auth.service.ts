import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { OAuthProvider } from '@prisma/client';

interface RegisterDto {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

interface LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    // Validate email format
    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('Invalid email format');
    }

    // Normalize email (lowercase)
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Validate username format (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(dto.username)) {
      throw new BadRequestException('Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens');
    }

    // Normalize username (lowercase for storage to prevent case-sensitive duplicates)
    const normalizedUsername = dto.username.toLowerCase().trim();

    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username already exists (case-insensitive - check lowercase version)
    const existingUsername = await this.prisma.user.findFirst({
      where: { 
        username: {
          equals: normalizedUsername,
          mode: 'insensitive',
        },
      },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Validate password
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Use transaction to ensure atomicity
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create user (store username in lowercase to prevent duplicates)
        const user = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            username: normalizedUsername, // Store lowercase to prevent case-sensitive duplicates
            displayName: (dto.displayName || dto.username).trim(), // Display name keeps original case
            oauthProvider: null,
            oauthId: null,
            language: 'en',
          },
        });

        // Create initial balance
        await tx.userBalance.create({
          data: {
            userId: user.id,
            balance: 0,
            lockedBalance: 0,
          },
        });

        // Create initial level
        await tx.userLevel.create({
          data: {
            userId: user.id,
            level: 1,
            xp: 0,
            totalXpEarned: 0,
          },
        });

        return user;
      });

      // Create session (auto-login after registration)
      const session = await this.prisma.session.create({
        data: {
          userId: result.id,
          token: this.generateToken(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      // Don't return password hash
      const { passwordHash: _, ...userWithoutPassword } = result;

      return {
        user: userWithoutPassword,
        userId: result.id,
        token: session.token,
      };
    } catch (error: any) {
      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
          throw new ConflictException('Email already registered');
        }
        if (error.meta?.target?.includes('username')) {
          throw new ConflictException('Username already taken');
        }
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    // Normalize email (lowercase)
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Find user by email (case-insensitive)
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is banned
    if (user.isBanned) {
      const banMessage = user.banReason 
        ? `Account is banned: ${user.banReason}`
        : 'Account is banned';
      throw new UnauthorizedException(banMessage);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Create session
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        token: this.generateToken(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Don't return password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      userId: user.id,
      token: session.token,
    };
  }

  async validateToken(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (session.user.isBanned) {
      throw new UnauthorizedException('Account is banned');
    }

    return session.user;
  }

  private generateToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36)
    );
  }
}

