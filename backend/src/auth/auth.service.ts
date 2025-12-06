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

    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
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

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        username: dto.username,
        displayName: dto.displayName || dto.username,
        oauthProvider: null,
        oauthId: null,
        language: 'en',
      },
    });

    // Create initial balance
    await this.prisma.userBalance.create({
      data: {
        userId: user.id,
        balance: 0,
        lockedBalance: 0,
      },
    });

    // Create initial level
    await this.prisma.userLevel.create({
      data: {
        userId: user.id,
        level: 1,
        xp: 0,
        totalXpEarned: 0,
      },
    });

    // Don't return password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      userId: user.id,
    };
  }

  async login(dto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new UnauthorizedException('Account is banned');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
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

