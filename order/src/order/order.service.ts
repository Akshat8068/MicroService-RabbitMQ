import {
    BadRequestException,
    ConflictException,
    HttpException,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderEntity } from './order.entity.js';
import { type Repository } from 'typeorm/browser/repository/Repository.js';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Orderdto, UpdateOrderDto,OrderResponseDto } from './order.dto.js';
import { isAxiosError } from 'axios';
import {
    randomInt,
    timingSafeEqual,
} from 'node:crypto';
import { ClientProxy } from '@nestjs/microservices';

type Product = {
    id: number;
    name: string;
    price: number;
    stock: number;
};

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    constructor(
        @Inject('Order_Broker')
        private readonly rabbitClient: ClientProxy,
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) { }
    async createOrder(order: Orderdto): Promise<OrderResponseDto> {
        const otp = randomInt(1000, 10000).toString();
        const product = await this.reserveStock(order.productId, order.quantity);
        let savedOrder: OrderEntity;
        try {
            const unitPrice = (order.quantity * product.price).toFixed(2);
            const newOrder = this.orderRepository.create({
                productId: order.productId,
                quantity: order.quantity,
                unitPrice,
                customerEmail: order.customerEmail,
                status: 'pending',
                deliveryOtp: otp,
            });
            savedOrder = await this.orderRepository.save(newOrder);
        } catch (error) {
            try {
                await this.releaseStock(order.productId, order.quantity);
            } catch (releaseError) {
                throw new InternalServerErrorException(
                    'Order creation failed and reserved stock could not be released',
                    { cause: releaseError },
                );
            }
            throw error;
        }

        this.rabbitClient.emit('order.created', {
            orderId: savedOrder.id,
            productId: savedOrder.productId,
            quantity: savedOrder.quantity,
            customerEmail: savedOrder.customerEmail,
            otp,
        }).subscribe({
            error: (error: unknown) => {
                this.logger.error(
                    `Order ${savedOrder.id} was created, but its notification event could not be published`,
                    error instanceof Error ? error.stack : undefined,
                );
            },
        });
        return this.toResponse(savedOrder);
    }

    async getOrders(): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find();
        return orders.map((order) => this.toResponse(order));
    }

    async getOrderById(id: number): Promise<OrderResponseDto> {
        const order = await this.orderRepository.findOneBy({ id });
        if (!order) {
            throw new NotFoundException(`Order with id ${id} not found`);
        }
        return this.toResponse(order);
    }

    async confirmDelivery(id: number, otp: string): Promise<OrderResponseDto> {
        const order = await this.orderRepository.findOne({
            where: { id },
            select: {
                id: true,
                productId: true,
                quantity: true,
                unitPrice: true,
                customerEmail: true,
                status: true,
                createdAt: true,
                deliveryOtp: true,
            },
        });
        if (!order) {
            throw new NotFoundException(`Order with id ${id} not found`);
        }
        if (
            order.status !== 'pending' ||
            !order.deliveryOtp
        ) {
            throw new ConflictException('Order is not awaiting delivery confirmation');
        }

        const expectedOtp = Buffer.from(order.deliveryOtp);
        const providedOtp = Buffer.from(otp);
        const otpIsValid =
            expectedOtp.length === providedOtp.length &&
            timingSafeEqual(expectedOtp, providedOtp);
        const result = await this.orderRepository.update(
            { id, status: 'pending' },
            {
                status: otpIsValid ? 'delivered' : 'cancelled',
                deliveryOtp: null,
            },
        );
        if (!result.affected) {
            throw new ConflictException('Order is no longer awaiting delivery confirmation');
        }

        if (!otpIsValid) {
            await this.releaseStock(order.productId, order.quantity);
            throw new BadRequestException(
                'Incorrect OTP. The order was cancelled and reserved stock was released.',
            );
        }

        const response = this.toResponse(order);
        response.status = 'delivered';
        return response;
    }

    async updateOrderById(id: number, updates: UpdateOrderDto): Promise<OrderResponseDto> {
        const order = await this.getOrderById(id);
        if (order.status !== 'pending') {
            throw new ConflictException('Only pending orders can be updated');
        }
        const originalProductId = order.productId;
        const originalQuantity = order.quantity;
        const productId = updates.productId ?? order.productId;
        const quantity = updates.quantity ?? order.quantity;

        if (productId === order.productId && quantity === order.quantity) {
            return order;
        }

        const productChanged = productId !== order.productId;
        const reservedQuantity = productChanged
            ? quantity
            : Math.max(quantity - order.quantity, 0);
        const product = reservedQuantity > 0
            ? await this.reserveStock(productId, reservedQuantity)
            : await this.getProduct(productId);

        order.productId = productId;
        order.quantity = quantity;
        order.unitPrice = (quantity * product.price).toFixed(2);

        let savedOrder: OrderEntity;
        try {
            savedOrder = await this.orderRepository.save(order);
        } catch (error) {
            if (reservedQuantity > 0) {
                try {
                    await this.releaseStock(productId, reservedQuantity);
                } catch (releaseError) {
                    throw new InternalServerErrorException(
                        'Order update failed and reserved stock could not be released',
                        { cause: releaseError },
                    );
                }
            }
            throw error;
        }

        const stockToRelease = productChanged ? originalQuantity : originalQuantity - quantity;
        if (stockToRelease > 0) {
            await this.releaseStock(originalProductId, stockToRelease);
        }
        return this.toResponse(savedOrder);
    }

    async deleteOrderById(id: number): Promise<void> {
        const order = await this.getOrderById(id);
        if (order.status !== 'pending') {
            throw new ConflictException('Only pending orders can be deleted');
        }
        const result = await this.orderRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Order with id ${id} not found`);
        }
        await this.releaseStock(order.productId, order.quantity);
    }

    private get productServiceUrl(): string {
        return this.configService.getOrThrow<string>('PRODUCT_SERVICE_URL');
    }

    private async reserveStock(productId: number, quantity: number): Promise<Product> {
        return this.productServiceRequest(
            this.httpService.axiosRef.post<Product>(
                `${this.productServiceUrl}/product/${productId}/reserve`,
                { quantity },
            ),
        );
    }

    private async releaseStock(productId: number, quantity: number): Promise<void> {
        if (quantity === 0) {
            return;
        }
        await this.productServiceRequest(
            this.httpService.axiosRef.post<Product>(
                `${this.productServiceUrl}/product/${productId}/release`,
                { quantity },
            ),
        );
    }

    private async getProduct(productId: number): Promise<Product> {
        return this.productServiceRequest(
            this.httpService.axiosRef.get<Product>(
                `${this.productServiceUrl}/product/${productId}`,
            ),
        );
    }

    private async productServiceRequest<T>(request: Promise<{ data: T }>): Promise<T> {
        try {
            return (await request).data;
        } catch (error) {
            if (isAxiosError<{ message?: string }>(error) && error.response) {
                throw new HttpException(
                    error.response.data?.message ?? 'Product service request failed',
                    error.response.status,
                );
            }
            throw new ServiceUnavailableException('Product service is unavailable', { cause: error });
        }
    }

    private toResponse(order: OrderEntity): OrderResponseDto {
        return {
            id: order.id,
            productId: order.productId,
            quantity: order.quantity,
            unitPrice: order.unitPrice,
            customerEmail: order.customerEmail,
            status: order.status,
            createdAt: order.createdAt,
        };
    }
}
