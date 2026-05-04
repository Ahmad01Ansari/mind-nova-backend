import { Controller, Get } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('debug')
export class DebugController {
  @Get('migrate')
  async runMigration() {
    try {
      console.log('🔄 Starting emergency migration...');
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
      console.log('✅ Migration Output:', stdout);
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
