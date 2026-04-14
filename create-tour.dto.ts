import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { User } from '../users/user.schema';
import { Tour } from '../tours/tour.schema';

export interface BookingEmailData {
  booking: any; // Use any for now to avoid typing issues
  user: User;
  tour: Tour;
}

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    const { booking, user, tour } = data;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `Booking Confirmation - ${tour.title}`,
        template: 'booking-confirmation',
        context: {
          userName: user.name,
          bookingId: booking._id?.toString() || booking.id || 'N/A',
          tourTitle: tour.title,
          tourLocation: tour.location,
          departureDate: this.formatDate(booking.departureDate),
          numberOfTravelers: booking.numberOfTravelers,
          totalAmount: this.formatCurrency(booking.totalAmount),
          contactPerson: booking.contactPerson,
          travelers: booking.travelers,
          bookingDate: this.formatDate(
            booking.bookingDate || booking.createdAt,
          ),
          customerNotes: booking.customerNotes,
        },
      });
      console.log('Booking confirmation email sent successfully');
    } catch (error) {
      console.error('Failed to send booking confirmation email:', error);
      // Don't throw error to prevent booking creation from failing
    }
  }

  async sendBookingStatusUpdate(
    data: BookingEmailData,
    newStatus: string,
  ): Promise<void> {
    const { booking, user, tour } = data;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `Cập nhật trạng thái booking - ${tour.title}`,
        template: 'booking-status-update',
        context: {
          userName: user.name,
          bookingId: booking._id?.toString() || booking.id || 'N/A',
          tourTitle: tour.title,
          tourLocation: tour.location,
          newStatus: this.getStatusDisplayName(newStatus),
          statusColor: this.getStatusColor(newStatus),
          departureDate: this.formatDate(booking.departureDate),
          numberOfTravelers: booking.numberOfTravelers,
          totalAmount: this.formatCurrency(booking.totalAmount),
        },
      });
      console.log('Booking status update email sent successfully');
    } catch (error) {
      console.error('Failed to send booking status update email:', error);
    }
  }

  async sendBookingCancellation(
    data: BookingEmailData,
    reason: string,
  ): Promise<void> {
    const { booking, user, tour } = data;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `Booking Cancellation - ${tour.title}`,
        template: 'booking-cancellation',
        context: {
          userName: user.name,
          bookingId: booking._id?.toString() || booking.id || 'N/A',
          tourTitle: tour.title,
          tourLocation: tour.location,
          departureDate: this.formatDate(booking.departureDate),
          numberOfTravelers: booking.numberOfTravelers,
          totalAmount: this.formatCurrency(booking.totalAmount),
          cancellationReason: reason,
          cancelledAt: this.formatDate(booking.cancelledAt || new Date()),
        },
      });
      console.log('Booking cancellation email sent successfully');
    } catch (error) {
      console.error('Failed to send booking cancellation email:', error);
    }
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  private getStatusDisplayName(status: string): string {
    const statusMap = {
      pending: 'Pending Confirmation',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      completed: 'Completed',
    };
    return statusMap[status.toLowerCase()] || status;
  }

  private getStatusColor(status: string): string {
    const colorMap = {
      pending: '#f59e0b',
      confirmed: '#10b981',
      cancelled: '#ef4444',
      completed: '#3b82f6',
    };
    return colorMap[status.toLowerCase()] || '#6b7280';
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Request - Travel Booking System',
        template: 'password-reset',
        context: {
          resetUrl,
          email,
        },
      });
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  async sendPasswordResetSuccessEmail(email: string): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Successful - Travel Booking System',
        template: 'password-reset-success',
        context: {
          email,
          resetTime: this.formatDate(new Date()),
          loginUrl,
        },
      });
      console.log(`Password reset success email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send password reset success email:', error);
      // Don't throw error as password was already reset successfully
    }
  }

  async sendSecurityAlert(
    email: string,
    alertType: string,
    details: any,
  ): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Security Alert - ${alertType}`,
        template: 'security-alert',
        context: {
          email,
          alertType,
          details,
          timestamp: this.formatDate(new Date()),
          changePasswordUrl: `${baseUrl}/profile#password`,
          reviewAccountUrl: `${baseUrl}/profile#security`,
        },
      });
      console.log(`Security alert email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send security alert email:', error);
      // Don't throw error for security alerts
    }
  }
}
