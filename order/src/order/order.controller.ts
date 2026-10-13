
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common';

import { OrderService } from './order.service.js';
import {
    Orderdto,
    DeliveryOtpDto,
    UpdateOrderDto,
    OrderResponseDto,
} from './order.dto.js';

@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    // Create a new order
    @Post()
    async createOrder(
        @Body() order: Orderdto,
    ): Promise<OrderResponseDto> {
        return this.orderService.createOrder(order);
    }

    // Get all orders
    @Get()
    async getOrders(): Promise<OrderResponseDto[]> {
        return this.orderService.getOrders();
    }

    // Get an order by ID
    @Get(':id')
    async getOrderById(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<OrderResponseDto> {
        return this.orderService.getOrderById(id);
    }

    @Post(':id/deliver')
    async confirmDelivery(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: DeliveryOtpDto,
    ): Promise<OrderResponseDto> {
        return this.orderService.confirmDelivery(id, body.otp);
    }

    // Update an existing order
    @Patch(':id')
    async updateOrderById(
        @Param('id', ParseIntPipe) id: number,
        @Body() updates: UpdateOrderDto,
    ): Promise<OrderResponseDto> {
        return this.orderService.updateOrderById(id, updates);
    }

    // Delete an order
    @Delete(':id')
    async deleteOrderById(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<void> {
        return this.orderService.deleteOrderById(id);
    }
}
