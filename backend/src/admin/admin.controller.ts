import { Controller, Get, Put, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // XP Config
  @Get('config/xp')
  async getXpConfig() {
    return this.adminService.getXpConfig();
  }

  @Put('config/xp')
  async updateXpConfig(@CurrentUser() adminId: string, @Body() data: any) {
    return this.adminService.updateXpConfig(data, adminId);
  }

  // Level Config
  @Get('config/levels')
  async getLevelConfig() {
    return this.adminService.getLevelConfig();
  }

  @Get('config/levels/:level')
  async getLevelConfigByLevel(@Param('level') level: string) {
    return this.adminService.getLevelConfig(parseInt(level));
  }

  @Put('config/levels/:level')
  async updateLevelConfig(@Param('level') level: string, @Body() data: any) {
    return this.adminService.updateLevelConfig(parseInt(level), data);
  }

  // Reward Config
  @Get('config/rewards/:type')
  async getRewardConfig(@Param('type') type: string) {
    return this.adminService.getRewardConfig(type);
  }

  @Put('config/rewards/:type')
  async updateRewardConfig(@Param('type') type: string, @Body() config: any) {
    return this.adminService.updateRewardConfig(type, config);
  }

  // Ad Reward Config
  @Get('config/ads')
  async getAdRewardConfig() {
    return this.adminService.getAdRewardConfig();
  }

  @Put('config/ads')
  async updateAdRewardConfig(@Body() data: any) {
    return this.adminService.updateAdRewardConfig(data);
  }

  // Race Config
  @Get('config/races/:name')
  async getRaceConfig(@Param('name') name: string) {
    return this.adminService.getRaceConfig(name);
  }

  @Put('config/races/:name')
  async updateRaceConfig(@Param('name') name: string, @Body() data: any) {
    return this.adminService.updateRaceConfig(name, data);
  }

  // Emission Estimate
  @Get('emission-estimate')
  async getDailyEmissionEstimate() {
    return this.adminService.getDailyEmissionEstimate();
  }

  // Wheel config
  @Get('wheel/config/:name')
  async getWheelConfig(@Param('name') name: string) {
    return this.adminService.getWheelConfig(name);
  }

  @Put('wheel/config/:name')
  async updateWheelConfig(@Param('name') name: string, @Body() data: any) {
    return this.adminService.updateWheelConfig(name, data.segments);
  }

  // Missions admin
  @Get('missions')
  async listMissions() {
    return this.adminService.listMissions();
  }

  @Post('missions')
  async createMission(@CurrentUser() adminId: string, @Body() data: any) {
    return this.adminService.createMission(data, adminId);
  }

  @Put('missions/:id')
  async updateMission(@CurrentUser() adminId: string, @Param('id') id: string, @Body() data: any) {
    return this.adminService.updateMission(id, data, adminId);
  }

  @Post('missions/:id/delete')
  async deleteMission(@CurrentUser() adminId: string, @Param('id') id: string) {
    return this.adminService.deleteMission(id, adminId);
  }

  // Achievements admin
  @Get('achievements')
  async listAchievements() {
    return this.adminService.listAchievements();
  }

  @Post('achievements')
  async createAchievement(@CurrentUser() adminId: string, @Body() data: any) {
    return this.adminService.createAchievement(data, adminId);
  }

  @Put('achievements/:id')
  async updateAchievement(
    @CurrentUser() adminId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.adminService.updateAchievement(id, data, adminId);
  }

  @Post('achievements/:id/delete')
  async deleteAchievement(@CurrentUser() adminId: string, @Param('id') id: string) {
    return this.adminService.deleteAchievement(id, adminId);
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  @Get('users')
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isBanned') isBanned?: string,
  ) {
    return this.adminService.listUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      search,
      role: role as any,
      isBanned: isBanned === 'true' ? true : isBanned === 'false' ? false : undefined,
    });
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Post('users/:id/ban')
  async banUser(
    @CurrentUser() adminId: string,
    @Param('id') userId: string,
    @Body() body: { reason?: string; until?: string },
  ) {
    return this.adminService.banUser(userId, adminId, body.reason, body.until);
  }

  @Post('users/:id/unban')
  async unbanUser(@CurrentUser() adminId: string, @Param('id') userId: string) {
    return this.adminService.unbanUser(userId, adminId);
  }

  @Post('users/:id/give-tokens')
  async giveTokens(
    @CurrentUser() adminId: string,
    @Param('id') userId: string,
    @Body() body: { amount: number; reason?: string },
  ) {
    return this.adminService.giveTokens(userId, adminId, body.amount, body.reason);
  }

  @Put('users/:id')
  async updateUser(
    @CurrentUser() adminId: string,
    @Param('id') userId: string,
    @Body() body: { role?: string; displayName?: string; language?: string },
  ) {
    return this.adminService.updateUser(userId, adminId, body);
  }
}

