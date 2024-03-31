import { Module } from '@nestjs/common';
import { CqrxModule } from 'nestjs-cqrx';

import { UserModule } from './user/user.module';

@Module({
  imports: [
    CqrxModule.forRoot({
      eventstoreDbConnectionString:
        'esdb://localhost:2113?tls=false&keepAliveTimeout=120000',
    }),
    UserModule,
  ],
})
export class AppModule {}
