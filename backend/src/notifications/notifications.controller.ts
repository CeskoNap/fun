import { Controller, Get, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@CurrentUser() userId: string) {
    return await this.notificationsService.getUserNotifications(userId);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@CurrentUser() userId: string, @Param('id') notificationId: string) {
    return await this.notificationsService.markAsRead(userId, notificationId);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@CurrentUser() userId: string) {
    return await this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  async deleteNotification(@CurrentUser() userId: string, @Param('id') notificationId: string) {
    return await this.notificationsService.deleteNotification(userId, notificationId);
  }
}

