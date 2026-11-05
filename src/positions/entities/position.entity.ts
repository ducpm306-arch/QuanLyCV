import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export type PositionDocument = mongoose.HydratedDocument<Position>;

@Schema({ timestamps: true })
export class Position {
  @Prop({ required: true, trim: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  requiredSkills: string[];

  @Prop({ type: [String], default: [] })
  preferredSkills: string[];

  @Prop({ default: 0, min: 0 })
  minExperienceYears: number;

  @Prop({ type: String, default: null })
  educationRequirements: string | null;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const PositionSchema = SchemaFactory.createForClass(Position);
