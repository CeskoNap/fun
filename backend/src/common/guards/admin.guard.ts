import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.userId || request.user?.id || request.headers['x-user-id'];

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    // Get user from database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isBanned: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.isBanned) {
      throw new ForbiddenException('Account is banned');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    // Attach user to request
    request.user = user;
    request.userId = user.id;

    return true;
  }
}

