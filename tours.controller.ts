<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
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
            background-color: #2563eb;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }

        .content {
            padding: 20px;
        }

        .booking-info {
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #2563eb;
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

        .travelers-list {
            margin-top: 10px;
        }

        .traveler {
            background-color: #e5e7eb;
            padding: 8px;
            margin: 5px 0;
            border-radius: 4px;
        }

        .footer {
            background-color: #f3f4f6;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            border-radius: 0 0 8px 8px;
        }

        .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 15px 0;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>✈️ Booking Confirmation</h1>
            <p>Thank you for booking with us!</p>
        </div>

        <div class="content">
            <p>Xin chào <strong>{{userName}}</strong>,</p>

            <p>We have received your tour booking request. Below are the details:</p>

            <div class="booking-info">
                <h3>🎫 Booking Information</h3>
                <div class="info-row">
                    <span class="label">Mã booking:</span>
                    <span class="value">{{bookingId}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Ngày đặt:</span>
                    <span class="value">{{bookingDate}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Trạng thái:</span>
                    <span class="value" style="color: #f59e0b; font-weight: bold;">Pending Confirmation</span>
                </div>
            </div>

            <div class="booking-info">
                <h3>🏖️ Tour Information</h3>
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
                    <span class="value" style="color: #ef4444; font-weight: bold;">{{totalAmount}}</span>
                </div>
            </div>

            {{#if customerNotes}}
            <div class="booking-info">
                <h3>📝 Ghi chú từ khách hàng</h3>
                <p>{{customerNotes}}</p>
            </div>
            {{/if}}

            <p>Your booking is being processed. We will contact you within 24 hours for confirmation.</p>

            <p>If you have any questions, please contact us via email or hotline.</p>
        </div>

        <div class="footer">
            <p><strong>Travel System</strong></p>
            <p>Email: support@travelsystem.com | Hotline: 1900-1234</p>
            <p>© 2025 Travel System. All rights reserved.</p>
        </div>
    </div>
</body>

</html>