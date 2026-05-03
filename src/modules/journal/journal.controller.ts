import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JournalService } from './journal.service';
import { CreateJournalDto, UpdateJournalDto, SearchJournalDto } from './dto/journal.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('journal')
// @UseGuards(AuthGuard('jwt')) // Commented out for easier rapid local testing
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post('create')
  createEntry(@Req() req, @Body() dto: CreateJournalDto) {
    const userId = req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76'; // Dummy
    return this.journalService.createEntry(userId, dto);
  }

  @Get('history')
  getHistory(@Req() req, @Query() query: SearchJournalDto) {
    const userId = req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';
    return this.journalService.getHistory(userId, query);
  }

  @Get('search')
  searchEntries(@Req() req, @Query() query: SearchJournalDto) {
    const userId = req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';
    return this.journalService.getHistory(userId, query); // Handled by same service logic
  }

  @Get('analytics')
  getAnalytics(@Req() req) {
    const userId = req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';
    return this.journalService.getAnalytics(userId);
  }

  @Get('entry/:id')
  getEntry(@Req() req, @Param('id') id: string) {
    const userId = req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';
    return this.journalService.getEntryById(userId, id);
  }

  @Put('update/:id')
  updateEntry(@Req() req, @Param('id') id: string, @Body() dto: UpdateJournalDto) {
    const userId = req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';
    return this.journalService.updateEntry(userId, id, dto);
  }

  @Delete('delete/:id')
  deleteEntry(@Param('id') id: string) {
    // Logic goes here
    return { success: true };
  }

  @Post('upload-media')
  uploadMedia() {
    // Stub for R2 Signed URL returned to Flutter
    return { uploadUrl: 'https://r2.mock-storage.com/upload-temp-key' };
  }
}
