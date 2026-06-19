import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SupabaseStorageService } from './src/common/services/supabase-storage.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const storage = app.get(SupabaseStorageService);
  const files = await storage.listFiles('mindnova-assets', 'avatars');
  console.log('FILES:', files);
  await app.close();
}
bootstrap();
