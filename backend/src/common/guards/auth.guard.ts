import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';

/**
 * Auth guard that validates Bearer token from Authorization header
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Try to get token from Authorization header
    const authorization = request.headers['authorization'];
    if (authorization && authorization.startsWith('Bearer ')) {
      const token = authorization.substring(7);
      try {
        const user = await this.authService.validateToken(token);
        request.user = user;
        request.userId = user.id;
        return true;
      } catch (error) {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    // Fallback: check for userId in request (for backward compatibility)
    const userId = request.user?.id || request.headers['x-user-id'];
    if (userId) {
      request.userId = userId;
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }
}

