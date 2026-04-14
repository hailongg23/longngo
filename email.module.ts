import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking, BookingSchema } from './booking.schema';
import { Tour, TourSchema } from '../tours/tour.schema';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { SecurityModule } from '../security/security.module';
import { RateLimitGuard } from '../auth/guards/rate-limit.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Tour.name, schema: TourSchema },
    ]),
    EmailModule,
    UsersModule,
    SecurityModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, RateLimitGuard],
  exports: [BookingsService],
})
export class BookingsModule {}
