import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument, BookingStatus } from './booking.schema';
import { Tour, TourDocument } from '../tours/tour.schema';
import { User, UserDocument } from '../users/user.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Tour.name) private tourModel: Model<TourDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
  ) {}

  async create(
    createBookingDto: CreateBookingDto,
    userId: string,
  ): Promise<Booking> {
    // 1. Validate tour exists and is active
    const tour = await this.tourModel.findById(createBookingDto.tourId);
    if (!tour || !tour.isActive) {
      throw new NotFoundException('Tour not found or not available');
    }

    // 2. Validate departure date (must be in future)
    const departureDate = new Date(createBookingDto.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (departureDate <= today) {
      throw new BadRequestException('Departure date must be in the future');
    }

    // 3. Validate number of travelers matches travelers array
    if (
      createBookingDto.numberOfTravelers !== createBookingDto.travelers.length
    ) {
      throw new BadRequestException(
        'Number of travelers must match travelers list',
      );
    }

    // 4. Calculate total amount
    const totalAmount = tour.price * createBookingDto.numberOfTravelers;

    // 5. Check for duplicate booking (same user, same tour, same date)
    const existingBooking = await this.bookingModel.findOne({
      userId,
      tourId: createBookingDto.tourId,
      departureDate: departureDate,
      status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    });

    if (existingBooking) {
      throw new BadRequestException(
        'You already have a booking for this tour on this date',
      );
    }

    // 6. Create booking
    const booking = new this.bookingModel({
      userId,
      tourId: createBookingDto.tourId,
      departureDate: departureDate,
      numberOfTravelers: createBookingDto.numberOfTravelers,
      contactPerson: createBookingDto.contactPerson,
      travelers: createBookingDto.travelers,
      totalAmount,
      customerNotes: createBookingDto.customerNotes,
      bookingDate: new Date(),
      status: BookingStatus.PENDING,
    });

    const savedBooking = await (
      await booking.save()
    ).populate([
      { path: 'userId', select: 'name email' },
      { path: 'tourId', select: 'title location price duration images' },
    ]);

    // 7. Send confirmation email
    try {
      const user = await this.userModel.findById(userId).select('name email');
      if (user) {
        await this.emailService.sendBookingConfirmation({
          booking: savedBooking,
          user: user,
          tour: tour,
        });
      }
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      // Don't throw error - booking should still be created
    }

    return savedBooking;
  }

  async findAll(): Promise<Booking[]> {
    return this.bookingModel
      .find()
      .populate([
        { path: 'userId', select: 'name email' },
        { path: 'tourId', select: 'title location price duration' },
      ])
      .sort({ createdAt: -1 })
      .exec();
  }

  async findUserBookings(userId: string): Promise<Booking[]> {
    return this.bookingModel
      .find({ userId })
      .populate({
        path: 'tourId',
        select: 'title location price duration images',
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingModel
      .findById(id)
      .populate([
        { path: 'userId', select: 'name email' },
        { path: 'tourId', select: 'title location price duration' },
      ])
      .exec();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async cancelBooking(
    id: string,
    userId: string,
    reason?: string,
  ): Promise<Booking> {
    const booking = await this.bookingModel.findById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId.toString() !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ForbiddenException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new ForbiddenException('Cannot cancel completed booking');
    }

    // Check cancellation policy (e.g., can't cancel within 24 hours of departure)
    const departureDate = new Date(booking.departureDate);
    const now = new Date();
    const hoursUntilDeparture =
      (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 24) {
      throw new ForbiddenException(
        'Cannot cancel booking within 24 hours of departure',
      );
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancellationReason = reason || 'Cancelled by customer';
    booking.cancelledAt = new Date();

    const cancelledBooking = await (
      await booking.save()
    ).populate([
      { path: 'userId', select: 'name email' },
      { path: 'tourId', select: 'title location price duration images' },
    ]);

    // Send cancellation email
    try {
      const user = await this.userModel
        .findById(booking.userId)
        .select('name email');
      const tour = await this.tourModel.findById(booking.tourId);

      if (user && tour) {
        await this.emailService.sendBookingCancellation(
          {
            booking: cancelledBooking,
            user: user,
            tour: tour,
          },
          booking.cancellationReason,
        );
      }
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
    }

    return cancelledBooking;
  }

  async adminCancelBooking(id: string, adminNotes: string): Promise<Booking> {
    const booking = await this.bookingModel.findById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ForbiddenException('Booking is already cancelled');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.adminNotes = adminNotes;
    booking.cancellationReason = 'Cancelled by admin';
    booking.cancelledAt = new Date();

    const cancelledBooking = await (
      await booking.save()
    ).populate([
      { path: 'userId', select: 'name email' },
      { path: 'tourId', select: 'title location price duration images' },
    ]);

    // Send cancellation email
    try {
      const user = await this.userModel
        .findById(booking.userId)
        .select('name email');
      const tour = await this.tourModel.findById(booking.tourId);

      if (user && tour) {
        await this.emailService.sendBookingCancellation(
          {
            booking: cancelledBooking,
            user: user,
            tour: tour,
          },
          booking.cancellationReason,
        );
      }
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
    }

    return cancelledBooking;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateBookingStatusDto,
    adminNotes?: string,
  ): Promise<Booking> {
    const booking = await this.bookingModel.findById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Business logic for status transitions
    if (
      booking.status === BookingStatus.CANCELLED &&
      updateStatusDto.status !== BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot change status of cancelled booking',
      );
    }

    if (updateStatusDto.status === BookingStatus.COMPLETED) {
      const departureDate = new Date(booking.departureDate);
      const now = new Date();

      if (departureDate > now) {
        throw new BadRequestException(
          'Cannot mark booking as completed before departure date',
        );
      }
    }

    booking.status = updateStatusDto.status;
    if (adminNotes) {
      booking.adminNotes = adminNotes;
    }

    const updatedBooking = await (
      await booking.save()
    ).populate([
      { path: 'userId', select: 'name email' },
      { path: 'tourId', select: 'title location price duration images' },
    ]);

    // Send status update email
    try {
      const user = await this.userModel
        .findById(booking.userId)
        .select('name email');
      const tour = await this.tourModel.findById(booking.tourId);

      if (user && tour) {
        await this.emailService.sendBookingStatusUpdate(
          {
            booking: updatedBooking,
            user: user,
            tour: tour,
          },
          updateStatusDto.status,
        );
      }
    } catch (error) {
      console.error('Failed to send status update email:', error);
    }

    return updatedBooking;
  }

  async getBookingStats() {
    const stats = await this.bookingModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await this.bookingModel.countDocuments();

    return {
      total,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
    };
  }
}
