import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WheelService } from './wheel.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('wheel')
@UseGuards(AuthGuard)
export class WheelController {
  constructor(private readonly wheelService: WheelService) {}

  @Get('config')
  async getConfig(@CurrentUser() userId: string) {
    return this.wheelService.getConfigForUser(userId);
  }

  @Post('spin')
  async spin(@CurrentUser() userId: string) {
    return this.wheelService.spin(userId);
  }
}


