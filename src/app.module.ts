import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { CommonModule } from './common/common.module';
import { BalancesModule } from './balances/balances.module';
import { TimeOffModule } from './time-off/time-off.module';
import { HcmModule } from './hcm/hcm.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databasePath =
          configService.get<string>('DATABASE_PATH') ?? 'data/timeoff.sqlite';
        if (databasePath !== ':memory:') {
          mkdirSync(dirname(databasePath), { recursive: true });
        }

        return {
          type: 'sqlite' as const,
          database: databasePath,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    CommonModule,
    HcmModule,
    BalancesModule,
    TimeOffModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
