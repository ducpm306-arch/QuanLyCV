import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ApplicantsModule } from './applicants/applicants.module.js';
import { PositionsModule } from './positions/positions.module.js';
import { CvsModule } from './cvs/cvs.module.js';
import { TechStacksModule } from './tech-stacks/tech-stacks.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApplicantTechStacksModule } from './applicant-tech-stacks/applicant-tech-stacks.module.js';
import { AiModule } from './ai/ai.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URL'),
      }),
      inject: [ConfigService],
    }),
    ApplicantsModule,
    PositionsModule,
    CvsModule,
    TechStacksModule,
    ApplicantTechStacksModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
