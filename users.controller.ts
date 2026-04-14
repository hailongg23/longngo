<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Alert</title>
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
            border-bottom: 2px solid #dc3545;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #dc3545;
            margin-bottom: 10px;
        }

        .alert-icon {
            font-size: 48px;
            color: #dc3545;
            margin: 20px 0;
        }

        .alert-box {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }

        .details {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
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
            <div class="alert-icon">⚠️</div>
            <p style="margin: 0; color: #666;">Security Alert</p>
        </div>

        <h2>Security Alert: {{alertType}}</h2>

        <div class="alert-box">
            <strong>We detected unusual activity on your account.</strong>
            <p style="margin: 10px 0 0 0;">Please review the details below and take appropriate action if you don't
                recognize this activity.</p>
        </div>

        <div class="details">
            <h3>Alert Details:</h3>
            <p><strong>Account:</strong> {{email}}</p>
            <p><strong>Alert Type:</strong> {{alertType}}</p>
            <p><strong>Time:</strong> {{timestamp}}</p>

            {{#if details}}
            <p><strong>Details:</strong> {{details}}</p>
            {{/if}}

            {{#if details.ipAddress}}
            <p><strong>IP Address:</strong> {{details.ipAddress}}</p>
            {{/if}}

            {{#if details.userAgent}}
            <p><strong>Browser/Device:</strong> {{details.userAgent}}</p>
            {{/if}}

            {{#if details.location}}
            <p><strong>Location:</strong> {{details.location}}</p>
            {{/if}}

            {{#if details.action}}
            <p><strong>Action:</strong> {{details.action}}</p>
            {{/if}}

            {{#if details.message}}
            <p><strong>Message:</strong> {{details.message}}</p>
            {{/if}}
        </div>

        <h3>What should you do?</h3>
        <ul>
            <li>If this was you, no action is needed</li>
            <li>If this wasn't you, immediately change your password</li>
            <li>Review your recent account activity</li>
            <li>Consider enabling two-factor authentication</li>
            <li>Contact support if you suspect unauthorized access</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{changePasswordUrl}}"
                style="display: inline-block; padding: 12px 30px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px;">
                Change Password
            </a>
            <a href="{{reviewAccountUrl}}"
                style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px;">
                Review Account
            </a>
        </div>

        <div class="footer">
            <p>Best regards,<br>The Travel Booking System Security Team</p>
            <p style="font-size: 12px; color: #999;">
                This is an automated security alert. If you have questions, please contact our support team.
            </p>
        </div>
    </div>
</body>

</html>