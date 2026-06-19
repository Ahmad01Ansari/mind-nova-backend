import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);
  const supabaseUrl = config.get<string>('SUPABASE_URL');
  const supabaseKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  const { data, error } = await supabase.storage.createBucket('mindnova-assets', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    fileSizeLimit: 10485760 // 10MB
  });

  if (error) {
    console.error('Bucket creation error:', error);
  } else {
    console.log('Bucket created successfully:', data);
  }
  
  await app.close();
}
bootstrap();
