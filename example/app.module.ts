import { Module } from '@nestjs/common';
import { CqrxModule } from 'nestjs-cqrx';

import { UserModule } from './user/user.module';

@Module({
    imports: [
        CqrxModule.forRoot({
            inMemory: true,
            // eventstoreDbConnectionString: 'esdb://localhost:2113?tls=false',
        }),
        UserModule,
    ],
})
export class AppModule {}
