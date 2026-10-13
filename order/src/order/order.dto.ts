import {
  IsEmail,
  IsInt,
  IsOptional,
  IsPositive,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Orderdto {
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    productId: number;
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    quantity: number;
    @IsEmail()
    customerEmail: string;
}
export class UpdateOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity?: number;
}
export class OrderIdParamDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id: number;
}
export class OrderResponseDto {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  customerEmail: string | null;
  status: string;
  createdAt: Date;
}

export class DeliveryOtpDto {
  @Matches(/^\d{4}$/)
  otp: string;
}