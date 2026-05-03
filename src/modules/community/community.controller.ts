import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, Query } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityFeedService } from './community-feed.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('community')
@UseGuards(AuthGuard('jwt'))
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly feedService: CommunityFeedService,
  ) {}

  // ─── Feed Endpoints ───────────────────────────────────────────────────────

  @Post('post/create')
  createPost(@Request() req, @Body() body: {
    content: string;
    emotion: string;
    type?: string;
    needType?: string;
    tags?: string[];
    isAnonymous?: boolean;
  }) {
    return this.feedService.createPost(req.user.id, body);
  }

  @Get('feed')
  getFeed(
    @Query('tab') tab?: string,
    @Query('emotion') emotion?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedService.getFeed({
      tab: tab || 'FOR_YOU',
      emotion,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('feed/personalized')
  getPersonalizedFeed(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedService.getPersonalizedFeed(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('feed/insights')
  getCommunityInsights() {
    return this.feedService.getCommunityInsights();
  }

  @Get('feed/daily-prompt')
  getDailyPrompt() {
    return this.feedService.getDailyPrompt();
  }

  @Get('post/:postId')
  getPost(@Param('postId') postId: string) {
    return this.feedService.getPost(postId);
  }

  @Post('post/react')
  toggleReaction(@Request() req, @Body() body: { postId: string; type: string }) {
    return this.feedService.toggleReaction(body.postId, req.user.id, body.type);
  }

  @Post('post/comment')
  addComment(@Request() req, @Body() body: {
    postId: string;
    content: string;
    parentId?: string;
    isAnonymous?: boolean;
  }) {
    return this.feedService.addComment(body.postId, req.user.id, body);
  }

  @Get('post/:postId/comments')
  getComments(@Param('postId') postId: string) {
    return this.feedService.getComments(postId);
  }

  @Post('post/bookmark')
  toggleBookmark(@Request() req, @Body() body: { postId: string }) {
    return this.feedService.toggleBookmark(body.postId, req.user.id);
  }

  @Get('bookmarks')
  getBookmarks(@Request() req) {
    return this.feedService.getBookmarks(req.user.id);
  }

  @Post('post/report')
  reportPost(@Request() req, @Body() body: { postId: string; reason: string }) {
    return this.feedService.reportPost(body.postId, req.user.id, body.reason);
  }

  // ─── Rooms (existing) ─────────────────────────────────────────────────────

  @Get('rooms/live')
  getLiveRooms() {
    return this.communityService.getLiveRooms();
  }

  @Get('rooms/upcoming')
  getUpcomingRooms() {
    return this.communityService.getUpcomingRooms();
  }

  @Get('rooms/series')
  getRoomSeries() {
    return this.communityService.getRoomSeries();
  }

  @Post('rooms/join')
  joinRoom(@Request() req, @Body() body: { roomId: string; isAnonymous: boolean }) {
    return this.communityService.joinRoom(body.roomId, req.user.id, body.isAnonymous);
  }

  @Post('rooms/leave')
  leaveRoom(@Request() req, @Body() body: { roomId: string }) {
    return this.communityService.leaveRoom(body.roomId, req.user.id);
  }

  @Post('rooms/reminder')
  setReminder(@Request() req, @Body() body: { roomId: string }) {
    return this.communityService.setReminder(body.roomId, req.user.id);
  }

  @Post('rooms/feedback')
  submitFeedback(@Request() req, @Body() body: { roomId: string; feeling: string; notes?: string }) {
    return this.communityService.submitFeedback(body.roomId, req.user.id, body.feeling, body.notes);
  }

  @Post('rooms/report')
  reportUser(@Request() req, @Body() body: { roomId: string; reportedId: string; reason: string }) {
    return this.communityService.reportUser(body.roomId, req.user.id, body.reportedId, body.reason);
  }

  @Get('rooms/:roomId')
  getRoom(@Param('roomId') roomId: string) {
    return this.communityService.getRoom(roomId);
  }

  @Post('rooms/start')
  startRoom(@Body() body: { roomId: string }) {
    return this.communityService.startRoom(body.roomId);
  }

  @Post('rooms/end')
  endRoom(@Body() body: { roomId: string }) {
    return this.communityService.endRoom(body.roomId);
  }

  @Post('rooms/announce')
  postAnnouncement(@Body() body: { roomId: string; message: string }) {
    return this.communityService.postAnnouncement(body.roomId, body.message);
  }

  @Post('rooms/mute-chat')
  toggleMuteChat(@Body() body: { roomId: string; muted: boolean }) {
    return this.communityService.toggleMuteChat(body.roomId, body.muted);
  }

  @Post('rooms/remove-participant')
  removeParticipant(@Body() body: { roomId: string; participantId: string }) {
    return this.communityService.removeParticipant(body.roomId, body.participantId);
  }

  @Post('admin/create')
  createRoom(@Body() body: {
    title: string;
    category: string;
    hostType: string;
    hostName: string;
    startsAt: string;
    endsAt?: string;
    maxParticipants?: number;
    isRecurring?: boolean;
    seriesId?: string;
  }) {
    return this.communityService.createRoom(body);
  }

  @Patch('admin/update/:roomId')
  updateRoom(@Param('roomId') roomId: string, @Body() body: any) {
    return this.communityService.updateRoom(roomId, body);
  }
}

