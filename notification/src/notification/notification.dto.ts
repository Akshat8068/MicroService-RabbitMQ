import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsPositive, Matches } from 'class-validator';

export class OrderCreatedNotificationDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  orderId!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsEmail()
  customerEmail!: string;

  @Matches(/^\d{4}$/)
  otp!: string;
}
