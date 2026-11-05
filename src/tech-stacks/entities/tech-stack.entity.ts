import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Position } from '../../positions/entities/position.entity.js';

export type TechStackDocument = mongoose.HydratedDocument<TechStack>;

@Schema({ timestamps: true })
export class TechStack {
  @Prop()
  name: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Position.name,
    required: true,
  })
  position: mongoose.Types.ObjectId;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const TechStackSchema = SchemaFactory.createForClass(TechStack);
