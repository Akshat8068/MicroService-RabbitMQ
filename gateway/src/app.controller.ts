import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { GatewayService } from './app.service.js';
import {
  CreateOrderDto,
  CreateProductDto,
  DeliveryOtpDto,
  UpdateOrderDto,
  UpdateProductDto,
} from './gateway.dto.js';

@Controller()
export class AppController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('orders')
  createOrder(@Body() body: CreateOrderDto) {
    return this.gatewayService.forward('order', 'POST', '/order', body);
  }

  @Get('orders')
  getOrders() {
    return this.gatewayService.forward('order', 'GET', '/order');
  }

  @Get('orders/:id')
  getOrder(@Param('id', ParseIntPipe) id: number) {
    return this.gatewayService.forward('order', 'GET', `/order/${id}`);
  }

  @Post('orders/:id/deliver')
  confirmDelivery(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DeliveryOtpDto,
  ) {
    return this.gatewayService.forward(
      'order',
      'POST',
      `/order/${id}/deliver`,
      body,
    );
  }

  @Patch('orders/:id')
  updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOrderDto,
  ) {
    return this.gatewayService.forward(
      'order',
      'PATCH',
      `/order/${id}`,
      body,
    );
  }

  @Delete('orders/:id')
  deleteOrder(@Param('id', ParseIntPipe) id: number) {
    return this.gatewayService.forward('order', 'DELETE', `/order/${id}`);
  }

  @Post('products')
  createProduct(@Body() body: CreateProductDto) {
    return this.gatewayService.forward('product', 'POST', '/product', body);
  }

  @Get('products')
  getProducts() {
    return this.gatewayService.forward('product', 'GET', '/product');
  }

  @Get('products/:id')
  getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.gatewayService.forward('product', 'GET', `/product/${id}`);
  }

  @Put('products/:id')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
  ) {
    return this.gatewayService.forward(
      'product',
      'PUT',
      `/product/${id}`,
      body,
    );
  }
}
