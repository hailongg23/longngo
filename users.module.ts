import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function runSeed() {
  console.log('🌱 Starting seed process...');
  const { seed } = await import('./seed');
  await seed();
  console.log('✅ Seed completed!');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'], // Frontend URLs
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Run seed if RUN_SEED environment variable is set
  if (process.env.RUN_SEED === 'true') {
    try {
      await runSeed();
    } catch (error) {
      console.error('❌ Seed failed:', error);
      // Don't exit, continue with server startup
    }
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
