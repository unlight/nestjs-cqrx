import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.listen(4028, () => console.log('Application is listening on port 4028'));
}
void bootstrap();
