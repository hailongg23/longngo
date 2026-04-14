import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tour', required: true })
  tourId: Types.ObjectId;

  // Ngày khởi hành tour
  @Prop({ required: true })
  departureDate: Date;

  // Số người tham gia
  @Prop({ required: true, min: 1, default: 1 })
  numberOfTravelers: number;

  // Thông tin người đặt tour chính
  @Prop({
    type: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    required: true,
  })
  contactPerson: {
    name: string;
    email: string;
    phone: string;
  };

  // Danh sách thông tin travelers
  @Prop([
    {
      name: { type: String, required: true },
      age: { type: Number, required: true },
      gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true,
      },
      identityNumber: String, // CMND/CCCD
      specialRequests: String,
    },
  ])
  travelers: Array<{
    name: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    identityNumber?: string;
    specialRequests?: string;
  }>;

  // Tổng tiền
  @Prop({ required: true, min: 0 })
  totalAmount: number;

  // Trạng thái booking
  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  // Ghi chú từ khách hàng
  @Prop()
  customerNotes: string;

  // Ghi chú từ admin
  @Prop()
  adminNotes: string;

  // Ngày đặt tour
  @Prop({ default: Date.now })
  bookingDate: Date;

  // Lý do hủy (nếu có)
  @Prop()
  cancellationReason: string;

  // Ngày hủy
  @Prop()
  cancelledAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
