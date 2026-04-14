import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContactPersonDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  phone: string;
}

export class TravelerDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  @Max(120)
  age: number;

  @IsEnum(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  identityNumber?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  tourId: string;

  @IsNotEmpty()
  @IsDateString()
  departureDate: string;

  @IsNumber()
  @Min(1)
  @Max(20) // Giới hạn tối đa 20 người
  numberOfTravelers: number;

  @ValidateNested()
  @Type(() => ContactPersonDto)
  contactPerson: ContactPersonDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TravelerDto)
  travelers: TravelerDto[];

  @IsOptional()
  @IsString()
  customerNotes?: string;
}
