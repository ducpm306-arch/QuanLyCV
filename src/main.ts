import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { DtoValidationPipe } from './common/pipes/dto-validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.useGlobalPipes(new DtoValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
