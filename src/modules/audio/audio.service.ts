import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AudioCategoryType } from '@prisma/client';
import { AudioQueryDto, CreateAudioTrackDto, MarkPlayedDto, RegisterDownloadDto } from './dto/audio.dto';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';

const MOCK_USER_ID = 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';

// Category metadata for frontend display
const CATEGORY_META: Record<string, { emoji: string; label: string; moodBenefit: string; gradientStart: string; gradientEnd: string }> = {
  RAIN:           { emoji: '🌧️', label: 'Rain',           moodBenefit: 'Reduces anxiety',    gradientStart: '#1a4a7a', gradientEnd: '#0d2a4a' },
  OCEAN:          { emoji: '🌊', label: 'Ocean',          moodBenefit: 'Calms the mind',     gradientStart: '#0f4c75', gradientEnd: '#1b6ca8' },
  FIREPLACE:      { emoji: '🔥', label: 'Fireplace',      moodBenefit: 'Cozy & warm',        gradientStart: '#7a2e0e', gradientEnd: '#4a1a08' },
  WHITE_NOISE:    { emoji: '☁️', label: 'White Noise',    moodBenefit: 'Improves focus',     gradientStart: '#374151', gradientEnd: '#1f2937' },
  BROWN_NOISE:    { emoji: '🤎', label: 'Brown Noise',    moodBenefit: 'Deep concentration', gradientStart: '#5a3e2b', gradientEnd: '#3a2a1e' },
  MEDITATION:     { emoji: '🧘', label: 'Meditation',     moodBenefit: 'Inner peace',        gradientStart: '#4c1d95', gradientEnd: '#7c3aed' },
  SLEEP_STORY:    { emoji: '🌙', label: 'Sleep Story',    moodBenefit: 'Drifts you to sleep',gradientStart: '#1e1b4b', gradientEnd: '#312e81' },
  FOCUS:          { emoji: '🎯', label: 'Focus',          moodBenefit: 'Sharpens clarity',   gradientStart: '#065f46', gradientEnd: '#047857' },
  NATURE:         { emoji: '🌿', label: 'Nature',         moodBenefit: 'Grounds & restores', gradientStart: '#14532d', gradientEnd: '#166534' },
  PIANO:          { emoji: '🎹', label: 'Piano',          moodBenefit: 'Emotional release',  gradientStart: '#1e293b', gradientEnd: '#334155' },
  TIBETAN_BOWLS:  { emoji: '🔔', label: 'Tibetan Bowls', moodBenefit: 'Vibrational healing',gradientStart: '#78350f', gradientEnd: '#b45309' },
  SPACE:          { emoji: '🌌', label: 'Space Ambience', moodBenefit: 'Expands perspective',gradientStart: '#0f172a', gradientEnd: '#1e1b4b' },
  ANXIETY_RELIEF: { emoji: '💙', label: 'Anxiety Relief', moodBenefit: 'Eases panic',       gradientStart: '#0c4a6e', gradientEnd: '#0369a1' },
  DEEP_RELAXATION:{ emoji: '✨', label: 'Deep Relaxation',moodBenefit: 'Total unwind',       gradientStart: '#581c87', gradientEnd: '#7e22ce' },
};

// Recommendation engine logic
function getRecommendationReason(
  category: AudioCategoryType,
  moodContext?: { stress?: number; anxiety?: number; sleepHours?: number },
): string {
  if (!moodContext) return 'Recommended for your wellness journey';
  const { stress, anxiety, sleepHours } = moodContext;
  if (anxiety && anxiety > 6 && (category === 'ANXIETY_RELIEF' || category === 'OCEAN' || category === 'TIBETAN_BOWLS')) {
    return 'Recommended because you logged high anxiety recently';
  }
  if (stress && stress > 6 && (category === 'RAIN' || category === 'BROWN_NOISE' || category === 'FIREPLACE')) {
    return 'Recommended because you seem stressed today';
  }
  if (sleepHours && sleepHours < 6 && (category === 'SLEEP_STORY' || category === 'DEEP_RELAXATION')) {
    return 'Recommended because you had poor sleep recently';
  }
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) return 'Recommended for late night winding down';
  if (hour >= 6 && hour < 10) return 'Recommended for a focused morning start';
  return 'Recommended based on your listening history';
}

@Injectable()
export class AudioService implements OnModuleInit {
  private readonly logger = new Logger(AudioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting automatic audio synchronization...');
    try {
      await this.seedBucketMetadata('sleep-sounds');
      await this.seedBucketMetadata('meditation-audio');
      this.logger.log('Automatic audio synchronization complete.');
    } catch (err) {
      this.logger.error('Failed to auto-sync audio metadata:', err.message);
    }
  }

  private _resolveDynamicUrl(track: any) {
    if (track.bucketName && track.fileName) {
      track.audioUrl = this.storage.getPublicAudioUrl(track.bucketName, track.folderName, track.fileName);
      if (track.artworkFile) {
        track.artworkUrl = this.storage.getArtworkUrl(track.bucketName, track.folderName, track.artworkFile);
      }
    }
    return track;
  }

  getCategories() {
    return Object.entries(CATEGORY_META).map(([id, meta]) => ({ id, ...meta }));
  }

  async getTracks(query: AudioQueryDto) {
    const { category, subCategory, search, limit = 30, skip = 0 } = query;
    const tracks = await this.prisma.audioTrack.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(subCategory ? { subCategory } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { tags: { has: search.toLowerCase() } },
          ],
        } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { playCount: 'desc' }, { createdAt: 'desc' }],
      take: Number(limit),
      skip: Number(skip),
    });
    return tracks.map(t => this._resolveDynamicUrl(t));
  }

  async getTrack(id: string) {
    const track = await this.prisma.audioTrack.findUniqueOrThrow({ where: { id } });
    return this._resolveDynamicUrl(track);
  }

  async getRecommended(userId: string) {
    // Get recent mood context
    const recentMood = await this.prisma.moodLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const moodContext = recentMood ? {
      stress: recentMood.stress ?? undefined,
      anxiety: recentMood.anxiety ?? undefined,
      sleepHours: recentMood.sleepHours ?? undefined,
    } : undefined;

    // Pick recommended category order based on mood
    const hour = new Date().getHours();
    const isNight = hour >= 21 || hour < 6;
    const isMorning = hour >= 6 && hour < 11;
    const isAfternoon = hour >= 11 && hour < 17;

    const anxiety = moodContext?.anxiety ?? 0;
    const stress = moodContext?.stress ?? 0;
    const sleepHours = moodContext?.sleepHours ?? 8;

    let priorityCategories: AudioCategoryType[] = [];
    if (anxiety > 6) priorityCategories = ['ANXIETY_RELIEF', 'OCEAN', 'TIBETAN_BOWLS', 'RAIN'];
    else if (stress > 6) priorityCategories = ['RAIN', 'BROWN_NOISE', 'FIREPLACE', 'DEEP_RELAXATION'];
    else if (sleepHours < 6) priorityCategories = ['SLEEP_STORY', 'DEEP_RELAXATION', 'OCEAN', 'MEDITATION'];
    else if (isNight) priorityCategories = ['SLEEP_STORY', 'DEEP_RELAXATION', 'PIANO', 'OCEAN'];
    else if (isMorning) priorityCategories = ['FOCUS', 'NATURE', 'PIANO', 'MEDITATION'];
    else if (isAfternoon) priorityCategories = ['FOCUS', 'BROWN_NOISE', 'NATURE', 'RAIN'];
    else priorityCategories = ['MEDITATION', 'OCEAN', 'DEEP_RELAXATION', 'PIANO'];

    const tracks = await this.prisma.audioTrack.findMany({
      where: { category: { in: priorityCategories } },
      orderBy: { playCount: 'desc' },
      take: 10,
    });

    return tracks.map(track => ({
      ...this._resolveDynamicUrl(track),
      recommendationReason: getRecommendationReason(track.category, moodContext),
    }));
  }

  async getHistory(userId: string, limit = 20) {
    return this.prisma.userAudioHistory.findMany({
      where: { userId },
      include: { track: true },
      orderBy: { playedAt: 'desc' },
      take: limit,
    });
  }

  async getFavorites(userId: string) {
    return this.prisma.userAudioHistory.findMany({
      where: { userId, isFavorite: true },
      include: { track: true },
      orderBy: { playedAt: 'desc' },
    });
  }

  async getDownloads(userId: string) {
    const downloads = await this.prisma.downloadedAudioTrack.findMany({
      where: { userId },
      include: { track: true },
      orderBy: { downloadedAt: 'desc' },
    });
    return downloads.map(d => ({ ...d, track: d.track ? this._resolveDynamicUrl(d.track) : null }));
  }

  async createTrack(dto: CreateAudioTrackDto) {
    return this.prisma.audioTrack.create({ data: dto });
  }

  async markPlayed(userId: string, audioTrackId: string, dto: MarkPlayedDto) {
    const [history] = await Promise.all([
      this.prisma.userAudioHistory.upsert({
        where: { userId_audioTrackId: { userId, audioTrackId } },
        create: { userId, audioTrackId, progress: dto.progress },
        update: { playedAt: new Date(), progress: dto.progress },
      }),
      this.prisma.audioTrack.update({
        where: { id: audioTrackId },
        data: { playCount: { increment: 1 } },
      }),
    ]);
    return history;
  }

  async toggleFavorite(userId: string, audioTrackId: string) {
    const existing = await this.prisma.userAudioHistory.findUnique({
      where: { userId_audioTrackId: { userId, audioTrackId } },
    });
    if (existing) {
      return this.prisma.userAudioHistory.update({
        where: { userId_audioTrackId: { userId, audioTrackId } },
        data: { isFavorite: !existing.isFavorite },
      });
    }
    // Create history row with favorite set to true
    return this.prisma.userAudioHistory.create({
      data: { userId, audioTrackId, isFavorite: true },
    });
  }

  async registerDownload(userId: string, audioTrackId: string, dto: RegisterDownloadDto) {
    return this.prisma.downloadedAudioTrack.upsert({
      where: { userId_audioTrackId: { userId, audioTrackId } },
      create: { userId, audioTrackId, localPath: dto.localPath, fileSize: dto.fileSize },
      update: { localPath: dto.localPath, fileSize: dto.fileSize, downloadedAt: new Date() },
    });
  }

  async seedMockDatabase() {
    const tracks = [
      { title: 'Gentle Rain on Leaves',       category: 'RAIN'         as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/sleep-sounds/rain/gentle-rain.mp3',         artworkUrl: null, durationSeconds: 3600, tags: ['rain', 'sleep', 'relax'],           moodBenefit: 'Reduces anxiety',     isFeatured: true  },
      { title: 'Thunderstorm at Night',        category: 'RAIN'         as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/sleep-sounds/rain/thunderstorm.mp3',          artworkUrl: null, durationSeconds: 2700, tags: ['rain', 'thunder', 'deep'],          moodBenefit: 'Masks intrusive thoughts', isFeatured: false },
      { title: 'Ocean Waves — Deep Shore',     category: 'OCEAN'        as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/sleep-sounds/ocean/deep-shore.mp3',            artworkUrl: null, durationSeconds: 3600, tags: ['ocean', 'waves', 'calm'],           moodBenefit: 'Calms the mind',      isFeatured: true  },
      { title: 'Crackling Fireplace',          category: 'FIREPLACE'    as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/sleep-sounds/fireplace/crackling.mp3',          artworkUrl: null, durationSeconds: 3600, tags: ['fire', 'cozy', 'warm'],             moodBenefit: 'Cozy & comforting',   isFeatured: true  },
      { title: 'Pure White Noise',             category: 'WHITE_NOISE'  as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/sleep-sounds/white-noise/pure.mp3',             artworkUrl: null, durationSeconds: 7200, tags: ['white noise', 'focus', 'baby'],     moodBenefit: 'Improves focus',      isFeatured: false },
      { title: 'Deep Brown Noise',             category: 'BROWN_NOISE'  as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/sleep-sounds/white-noise/brown.mp3',            artworkUrl: null, durationSeconds: 7200, tags: ['brown noise', 'deep', 'focus'],     moodBenefit: 'Deep concentration',  isFeatured: false },
      { title: 'Tibetan Singing Bowls',        category: 'TIBETAN_BOWLS'as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/anxiety/tibetan-bowls.mp3',    artworkUrl: null, durationSeconds: 1800, tags: ['tibetan', 'healing', 'spiritual'], moodBenefit: 'Vibrational healing', isFeatured: true  },
      { title: 'Moonlight Piano',              category: 'PIANO'        as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/sleep/moonlight-piano.mp3',     artworkUrl: null, durationSeconds: 2400, tags: ['piano', 'classical', 'calm'],       moodBenefit: 'Emotional release',   isFeatured: true  },
      { title: 'Forest at Dawn',               category: 'NATURE'       as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/sleep-sounds/nature/forest-dawn.mp3',            artworkUrl: null, durationSeconds: 3600, tags: ['forest', 'birds', 'morning'],       moodBenefit: 'Grounds & restores',  isFeatured: false },
      { title: 'Sleep Story: The Island',      category: 'SLEEP_STORY'  as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/sleep-sounds/stories/the-island.mp3',            artworkUrl: null, durationSeconds: 1800, tags: ['story', 'sleep', 'guided'],         moodBenefit: 'Drifts you to sleep', isFeatured: true  },
      { title: 'Deep Space Ambience',          category: 'SPACE'        as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/focus/space-ambience.mp3',      artworkUrl: null, durationSeconds: 3600, tags: ['space', 'ambient', 'focus'],        moodBenefit: 'Expands perspective', isFeatured: false },
      { title: 'Anxiety Relief Flow',          category: 'ANXIETY_RELIEF'as AudioCategoryType,audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/anxiety/relief-flow.mp3',       artworkUrl: null, durationSeconds: 1200, tags: ['anxiety', 'panic', 'calm'],         moodBenefit: 'Eases panic',         isFeatured: true  },
      { title: 'Body Scan Deep Relaxation',    category: 'DEEP_RELAXATION'as AudioCategoryType,audioUrl:'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/healing/body-scan.mp3',          artworkUrl: null, durationSeconds: 1800, tags: ['body scan', 'relax', 'sleep'],      moodBenefit: 'Total unwind',        isFeatured: false },
      { title: 'Morning Focus Beats',          category: 'FOCUS'        as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/focus/morning-beats.mp3',        artworkUrl: null, durationSeconds: 2700, tags: ['focus', 'morning', 'energy'],       moodBenefit: 'Sharpens clarity',    isFeatured: true  },
      { title: 'Guided Breath Meditation',     category: 'MEDITATION'   as AudioCategoryType, audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/anxiety/guided-breath.mp3',      artworkUrl: null, durationSeconds: 900,  tags: ['meditation', 'breath', 'guided'],   moodBenefit: 'Inner peace',         isFeatured: true  },

    ];

    await this.prisma.audioTrack.createMany({ data: tracks, skipDuplicates: true });
    return { message: `Seeded ${tracks.length} audio tracks` };
  }

  async getFoldersByBucket(bucket: string) {
    return this.storage.listFolders(bucket);
  }

  async getFilesInFolder(bucket: string, folder: string) {
    return this.storage.listFiles(bucket, folder);
  }

  async seedBucketMetadata(bucket: string) {
    let addedCount = 0;
    const folders = await this.storage.listFolders(bucket);
    
    for (const folder of folders) {
      const folderName = folder.name;
      const files = await this.storage.listFiles(bucket, folderName);
      
      for (const file of files) {
        if (!file.name.endsWith('.mp3') && !file.name.endsWith('.wav')) continue;

        // Check if track already exists by bucket + folder + file to avoid dupes
        const existing = await this.prisma.audioTrack.findFirst({
          where: { bucketName: bucket, folderName, fileName: file.name }
        });

        if (!existing) {
          // Default mappings based on folder names or random assignment
          const category = this._guessCategoryFromFolder(folderName);
          const title = file.name.replace(/-/g, ' ').replace(/\.mp3|\.wav/, '');
          
          await this.prisma.audioTrack.create({
            data: {
              title,
              category,
              subCategory: folderName,
              bucketName: bucket,
              folderName,
              fileName: file.name,
              audioUrl: '', // Will be dynamically generated, but field is required
              tags: [folderName, category.toLowerCase()],
              isFeatured: false,
              isPremium: false,
            }
          });
          addedCount++;
        } else if (existing.category === 'NATURE') {
          // If it was fallback to NATURE, try re-guessing
          const newCategory = this._guessCategoryFromFolder(folderName);
          if (newCategory !== 'NATURE') {
            await this.prisma.audioTrack.update({
              where: { id: existing.id },
              data: { category: newCategory, tags: [folderName, newCategory.toLowerCase()] }
            });
            addedCount++;
          }
        }
      }
    }
    return { message: `Scanned bucket '${bucket}', added ${addedCount} new tracks.` };
  }

  private _guessCategoryFromFolder(folder: string): AudioCategoryType {
    const f = folder.toLowerCase();
    if (f.includes('rain')) return 'RAIN';
    if (f.includes('ocean')) return 'OCEAN';
    if (f.includes('fire')) return 'FIREPLACE';
    if (f.includes('meditation')) return 'MEDITATION';
    if (f.includes('focus')) return 'FOCUS';
    if (f.includes('anxiety')) return 'ANXIETY_RELIEF';
    if (f.includes('piano')) return 'PIANO';
    if (f.includes('sleep')) return 'SLEEP_STORY';
    if (f.includes('space')) return 'SPACE';
    if (f.includes('tibetan') || f.includes('bowl')) return 'TIBETAN_BOWLS';
    if (f.includes('relax') || f.includes('healing')) return 'DEEP_RELAXATION';
    if (f.includes('white')) return 'WHITE_NOISE';
    if (f.includes('brown')) return 'BROWN_NOISE';
    return 'NATURE'; // default fallback
  }
}
