import { IsBoolean, IsOptional } from 'class-validator';

export class SecuritySettingsDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  sessionTimeout?: boolean;

  @IsOptional()
  @IsBoolean()
  deviceTracking?: boolean;
}
