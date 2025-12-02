import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Simple auth guard - for now, just checks if userId is in request
 * TODO: Implement proper JWT/OAuth authentication
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.headers['x-user-id'];

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Attach userId to request for easy access
    request.userId = userId;
    return true;
  }
}

