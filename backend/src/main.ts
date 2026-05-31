import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env loader to ensure environment variables are populated
const envPaths = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env')
];

for (const envPath of envPaths) {
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = match[2] || '';
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
          }
          process.env[key] = val;
        }
      });
      break;
    }
  } catch (e) {
    // Ignore error
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

