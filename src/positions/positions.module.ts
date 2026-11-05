import { Module } from '@nestjs/common';
import { PositionsService } from './positions.service.js';
import { PositionsController } from './positions.controller.js';
import { Position, PositionSchema } from './entities/position.entity.js';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Position.name, schema: PositionSchema },
    ]),
  ],
  controllers: [PositionsController],
  providers: [PositionsService],
})
export class PositionsModule {}
