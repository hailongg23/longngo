<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Successful</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }

        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #28a745;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #28a745;
            margin-bottom: 10px;
        }

        .success-icon {
            font-size: 48px;
            color: #28a745;
            margin: 20px 0;
        }

        .security-tips {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }

        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
            text-align: center;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <div class="logo">Travel Booking System</div>
            <div class="success-icon">✓</div>
            <p style="margin: 0; color: #666;">Password Reset Successful</p>
        </div>

        <h2>Password Successfully Reset!</h2>

        <p>Your password has been successfully reset for your Travel Booking System account.</p>

        <p><strong>Account:</strong> {{email}}</p>
        <p><strong>Reset Time:</strong> {{resetTime}}</p>

        <div class="security-tips">
            <strong>Security Tips:</strong>
            <ul style="margin: 10px 0;">
                <li>All your existing sessions have been logged out for security</li>
                <li>Use a strong, unique password for your account</li>
                <li>Enable two-factor authentication if available</li>
                <li>Don't share your password with anyone</li>
            </ul>
        </div>

        <p>If you did not reset your password, please contact our support team immediately.</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{loginUrl}}"
                style="display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Login to Your Account
            </a>
        </div>

        <div class="footer">
            <p>Best regards,<br>The Travel Booking System Team</p>
            <p style="font-size: 12px; color: #999;">
                This is an automated message, please do not reply to this email.
            </p>
        </div>
    </div>
</body>

</html>