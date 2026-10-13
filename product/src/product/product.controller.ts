import { Body, Controller,Param,ParseIntPipe, Get, Post, Put, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { ProductService } from './product.service.js';

import type { Request } from 'express';
import { ProductDto, ProductResponseDto, StockQuantityDto, UpdateProductDto } from './product.dto.js';

@Controller('/product')
export class ProductController {
    constructor(private readonly productService: ProductService) { }
    private getBaseUrl(req: Request): string {
        const host = req.get('host') || 'localhost:3000'
        const protocol = req.protocol
        return process.env.BASE_URL || `${protocol}://${host}`
    }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    async createProduct(
        @Body() product: ProductDto,
        @Req() req: Request,
    ): Promise<ProductResponseDto> {
        const baseUrl = this.getBaseUrl(req);
        return this.productService.createProduct(product);
    }

    @Get()
    async getAllProducts(@Req() req: Request): Promise<ProductResponseDto[]> {
        const baseUrl = this.getBaseUrl(req);
        return this.productService.getAllProducts();
    }

    @Get('/:id')
    async getProductById(
        @Req() req: Request,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<ProductResponseDto> {
        const baseUrl = this.getBaseUrl(req);
        return this.productService.getProductById(id);
    }

    @Post('/:id/reserve')
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    async reserveStock(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: StockQuantityDto,
    ): Promise<ProductResponseDto> {
        return this.productService.reserveStock(id, body);
    }

    @Post('/:id/release')
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    async releaseStock(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: StockQuantityDto,
    ): Promise<ProductResponseDto> {
        return this.productService.releaseStock(id, body);
    }

    @Put('/:id')
    async updateProduct(
        @Req() req: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() product: UpdateProductDto,
    ): Promise<ProductResponseDto> {
        const baseUrl = this.getBaseUrl(req);
        return this.productService.updateProduct(id, product);
    }


}
