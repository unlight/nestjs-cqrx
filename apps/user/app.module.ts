import { Module } from '@nestjs/common';
import { CqrxModule } from 'nestjs-cqrx';

import { UserModule } from './user/user.module';

@Module({
  imports: [
    CqrxModule.forRoot({
      eventstoreConnectionString:
        'kurrentdb://localhost:34605?tls=false&keepAliveTimeout=120000',
    }),
    UserModule,
  ],
})
export class AppModule {}
