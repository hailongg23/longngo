import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditDocument = Audit & Document;

@Schema({ timestamps: true })
export class Audit {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  resource: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);

// Index for efficient querying by userId and timestamp
AuditSchema.index({ userId: 1, timestamp: -1 });
AuditSchema.index({ timestamp: -1 });
