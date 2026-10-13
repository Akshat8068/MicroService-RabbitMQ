import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductDto {
    
    @IsString()
    name: string;
    @Type(() => Number)
    @IsInt()
    @Min(0)
    stock: number;
    @Type(() => Number)
    @IsNumber()
    price: number;

}
export class UpdateProductDto {
    @IsOptional()
    @IsString()
    name?: string;
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    stock?: number;
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    price?: number;
}
export class StockQuantityDto {
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    quantity: number;
}
export class ProductResponseDto {
    id: number;
    name: string;
    stock: number;
    price: number;
}