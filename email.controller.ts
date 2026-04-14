import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/user.schema';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../auth/guards/rate-limit.guard';
import { RATE_LIMIT_CONFIG } from '../common/config/rate-limit.config';

@Controller('api/bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit(RATE_LIMIT_CONFIG.BUSINESS.BOOKING_CREATE)
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    return this.bookingsService.create(createBookingDto, req.user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.bookingsService.findAll();
  }

  @Get('my-bookings')
  async findUserBookings(@Request() req) {
    return this.bookingsService.findUserBookings(req.user.userId);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.bookingsService.getBookingStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateBookingStatusDto & { adminNotes?: string },
  ) {
    return this.bookingsService.updateStatus(
      id,
      updateStatusDto,
      updateStatusDto.adminNotes,
    );
  }

  @Put(':id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Request() req,
    @Body() body?: { reason?: string },
  ) {
    return this.bookingsService.cancelBooking(
      id,
      req.user.userId,
      body?.reason,
    );
  }

  @Put(':id/admin-cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminCancelBooking(
    @Param('id') id: string,
    @Body() body: { adminNotes: string },
  ) {
    return this.bookingsService.adminCancelBooking(id, body.adminNotes);
  }
}
