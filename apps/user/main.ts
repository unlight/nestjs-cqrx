import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({}));

  const port = process.env.PORT ?? 3333;

  await app.listen(port, () => {
    Logger.log(`Listening at http://localhost:${port}`);
  });
};

void bootstrap();
