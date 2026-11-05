import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Applicant } from '../../applicants/entities/applicant.entity.js';
import { TechStack } from '../../tech-stacks/entities/tech-stack.entity.js';

export type ApplicantTechStackDocument =
  mongoose.HydratedDocument<ApplicantTechStack>;

@Schema({ timestamps: true })
export class ApplicantTechStack {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Applicant.name,
    required: true,
  })
  applicant: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: TechStack.name,
    required: true,
  })
  tech_stack: mongoose.Types.ObjectId;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const ApplicantTechStackSchema =
  SchemaFactory.createForClass(ApplicantTechStack);

ApplicantTechStackSchema.index(
  { applicant: 1, tech_stack: 1 },
  { unique: true },
);
