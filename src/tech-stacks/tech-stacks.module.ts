import { Module } from '@nestjs/common';
import { TechStacksService } from './tech-stacks.service.js';
import { TechStacksController } from './tech-stacks.controller.js';
import { TechStack, TechStackSchema } from './entities/tech-stack.entity.js';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Position,
  PositionSchema,
} from '../positions/entities/position.entity.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TechStack.name, schema: TechStackSchema },
      { name: Position.name, schema: PositionSchema },
    ]),
  ],
  controllers: [TechStacksController],
  providers: [TechStacksService],
})
export class TechStacksModule {}
