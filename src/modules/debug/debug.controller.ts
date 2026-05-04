import { Controller, Get } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('debug')
export class DebugController {
  @Get('migrate')
  async runMigration() {
    try {
      console.log('🔄 Starting emergency DB Push...');
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
      console.log('✅ DB Push Output:', stdout);
      if (stderr) console.error('⚠️ Migration Warning:', stderr);
      return {
        message: 'Migration successful!',
        output: stdout,
      };
    } catch (error) {
      console.error('❌ Migration Failed:', error);
      return {
        message: 'Migration failed!',
        error: error.message,
      };
    }
  }
}
