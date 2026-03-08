import { Module } from '@nestjs/common';
import { CqrxModule } from 'nestjs-cqrx';

import { UserModule } from './user/user.module.js';

@Module({
  imports: [
    // CqrxModule.forRoot({ type: 'eventdbx', token: process.env.EVENTDBX_TOKEN }),
    CqrxModule.forRoot({
      type: 'kurrentdb',
      connectionString: 'kurrentdb://localhost:2113?tls=false',
    }),
    UserModule,
  ],
})
export class AppModule {}
