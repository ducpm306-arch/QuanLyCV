import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export type CvDocument = mongoose.HydratedDocument<Cv>;

@Schema({ timestamps: true })
export class Cv {
  @Prop()
  file: string;

  @Prop()
  originalName: string;

  @Prop()
  mimeType: string;

  @Prop()
  size: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    default: null,
  })
  extractedData: Record<string, unknown> | null;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null })
  review: Record<string, unknown> | null;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null })
  generatedFiles: { docx: string; pdf: string | null } | null;

  @Prop({
    enum: [
      'uploaded',
      'extracting',
      'needs_review',
      'approved',
      'generating',
      'generated',
      'failed',
    ],
    default: 'uploaded',
  })
  status: string;
}

export const CvSchema = SchemaFactory.createForClass(Cv);
