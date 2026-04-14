<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Cancellation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
        }

        .header {
            background-color: #ef4444;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }

        .content {
            padding: 20px;
        }

        .booking-info {
            background-color: #fef2f2;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #ef4444;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .label {
            font-weight: bold;
            color: #374151;
        }

        .value {
            color: #6b7280;
        }

        .cancellation-notice {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            color: #991b1b;
        }

        .footer {
            background-color: #f3f4f6;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            border-radius: 0 0 8px 8px;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>❌ Booking Cancellation</h1>
            <p>Your booking has been cancelled</p>
        </div>

        <div class="content">
            <p>Xin chào <strong>{{userName}}</strong>,</p>

            <div class="cancellation-notice">
                <h3>⚠️ Cancellation Notice</h3>
                <p>Your booking <strong>{{bookingId}}</strong> has been cancelled on {{cancelledAt}}.</p>
                <p><strong>Lý do:</strong> {{cancellationReason}}</p>
            </div>

            <div class="booking-info">
                <h3>🏖️ Cancelled Tour Information</h3>
                <div class="info-row">
                    <span class="label">Tên tour:</span>
                    <span class="value">{{tourTitle}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Địa điểm:</span>
                    <span class="value">{{tourLocation}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Ngày khởi hành:</span>
                    <span class="value">{{departureDate}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Số người tham gia:</span>
                    <span class="value">{{numberOfTravelers}} người</span>
                </div>
                <div class="info-row">
                    <span class="label">Tổng tiền:</span>
                    <span class="value">{{totalAmount}}</span>
                </div>
            </div>

            <p>We apologize for this inconvenience. If the tour cancellation is due to company error, we will refund
                100%
                within 7-10 business days.</p>

            <p>For more information about refund policy or to book another tour, please contact us.</p>
        </div>

        <div class="footer">
            <p><strong>Travel System</strong></p>
            <p>Email: support@travelsystem.com | Hotline: 1900-1234</p>
            <p>© 2025 Travel System. All rights reserved.</p>
        </div>
    </div>
</body>

</html>