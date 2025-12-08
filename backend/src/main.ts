import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Set timezone to Italian timezone (CET/CEST)
process.env.TZ = 'Europe/Rome';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  // Log timezone info
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  console.log(`🚀 Backend running on port ${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
  console.log(`🕐 Timezone: ${timezone} (${process.env.TZ || 'system default'})`);
  console.log(`🕐 Current server time: ${now.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })} (Italy)`);
}

bootstrap();

