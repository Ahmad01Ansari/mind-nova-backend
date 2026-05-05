import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Storage sync will not work.');
      // Initialize with dummy values so it doesn't crash, but methods will fail gracefully
      this.supabase = createClient('https://dummy.supabase.co', 'dummy');
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Generates a public URL for an audio file.
   */
  getPublicAudioUrl(bucket: string, folder: string, fileName: string): string {
    const path = folder ? `${folder}/${fileName}` : fileName;
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Generates a public URL for an artwork file.
   */
  getArtworkUrl(bucket: string, folder: string, fileName: string): string {
    const path = folder ? `${folder}/${fileName}` : fileName;
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Lists all files in a specific folder within a bucket.
   */
  async listFiles(bucket: string, folder: string) {
    const { data, error } = await this.supabase.storage.from(bucket).list(folder, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      this.logger.error(`Error listing files in ${bucket}/${folder}: ${error.message}`);
      throw error;
    }

    // Filter out pseudo-directories
    return data.filter(item => item.id != null);
  }

  /**
   * Lists all folders in the root of a bucket.
   */
  async listFolders(bucket: string) {
    const { data, error } = await this.supabase.storage.from(bucket).list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      this.logger.error(`Error listing folders in ${bucket}: ${error.message}`);
      throw error;
    }

    // Items without an id are usually folders (or check metadata if available)
    return data.filter(item => item.id == null);
  }

  /**
   * Uploads a file to a specific bucket and folder.
   */
  async uploadFile(bucket: string, folder: string, fileName: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    const path = folder ? `${folder}/${fileName}` : fileName;
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Error uploading file to ${bucket}/${path}: ${error.message}`);
      throw error;
    }

    const { data: publicData } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return publicData.publicUrl;
  }
}
