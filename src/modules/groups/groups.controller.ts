import { Controller, Get, Post, Body, Param, UseGuards, Req, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { GroupsService } from './groups.service';
import { CreateGroupDto, JoinGroupDto, GroupCheckInDto, GroupOnboardingDto, GroupExitFeedbackDto, CreateGroupPostDto } from './dto/groups.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('groups')
@UseGuards(AuthGuard('jwt'))
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }

  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  @Get('recommended')
  getRecommended(@GetUser() user: User) {
    return this.groupsService.getRecommended(user.id);
  }

  @Post('join')
  join(@GetUser() user: User, @Body() joinGroupDto: JoinGroupDto) {
    return this.groupsService.joinGroup(user.id, joinGroupDto.groupId);
  }

  @Post(':id/onboarding')
  completeOnboarding(
    @GetUser() user: User,
    @Param('id') groupId: string,
    @Body() dto: GroupOnboardingDto,
  ) {
    return this.groupsService.completeOnboarding(user.id, groupId, dto);
  }

  @Get(':id')
  findOne(@GetUser() user: User, @Param('id') id: string) {
    return this.groupsService.getGroupDetail(user.id, id);
  }

  @Get(':id/feed')
  async getGroupFeed(@Param('id') groupId: string) {
    return this.groupsService.getGroupFeed(groupId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadFile(@UploadedFile() file: any) {
    return { url: `/uploads/${file.filename}` };
  }

  @Post(':id/posts')
  async createPost(
    @GetUser('id') userId: string,
    @Param('id') groupId: string,
    @Body() dto: CreateGroupPostDto,
  ) {
    return this.groupsService.createPost(userId, groupId, dto);
  }

  @Post(':id/checkin')
  checkIn(
    @GetUser() user: User,
    @Param('id') groupId: string,
    @Body() dto: GroupCheckInDto,
  ) {
    return this.groupsService.createCheckIn(user.id, groupId, dto);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.groupsService.getGroupStats(id);
  }

  @Delete(':id/leave')
  leave(
    @GetUser() user: User,
    @Param('id') groupId: string,
    @Body() dto: GroupExitFeedbackDto,
  ) {
    return this.groupsService.leaveGroup(user.id, groupId, dto);
  }

  @Get('posts/:postId')
  async getPost(@Param('postId') postId: string) {
    return this.groupsService.getPost(postId);
  }

  @Post('posts/:postId/react')
  async toggleReaction(
    @GetUser('id') userId: string,
    @Param('postId') postId: string,
    @Body('type') type: string,
  ) {
    return this.groupsService.toggleReaction(postId, userId, type);
  }

  @Post('posts/:postId/comments')
  async addComment(
    @GetUser('id') userId: string,
    @Param('postId') postId: string,
    @Body() dto: { content: string, isAnonymous?: boolean, parentId?: string },
  ) {
    return this.groupsService.addComment(postId, userId, dto.content, dto.isAnonymous, dto.parentId);
  }

  @Get('posts/:postId/comments')
  async getComments(@Param('postId') postId: string) {
    return this.groupsService.getComments(postId);
  }
}
