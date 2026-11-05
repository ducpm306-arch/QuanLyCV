import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Cv } from '../../cvs/entities/cv.entity.js';
import { Position } from '../../positions/entities/position.entity.js';

export type ApplicantDocument = mongoose.HydratedDocument<Applicant>;

@Schema({ timestamps: true })
export class Applicant {
  @Prop()
  name: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Position.name,
    required: true,
  })
  position: mongoose.Types.ObjectId;

  @Prop()
  experience_years: number;

  @Prop()
  email: string;

  @Prop()
  phone_number: string;

  @Prop()
  review: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Cv.name,
    required: true,
    unique: true,
  })
  cv: mongoose.Types.ObjectId;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const ApplicantSchema = SchemaFactory.createForClass(Applicant);
