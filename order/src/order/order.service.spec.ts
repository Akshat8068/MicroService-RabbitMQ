import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { OrderEntity } from './order.entity.js';
import { OrderService } from './order.service.js';

describe('OrderService delivery OTP', () => {
  let service: OrderService;
  let orderRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let axiosPost: ReturnType<typeof vi.fn>;
  let rabbitEmit: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    orderRepository = {
      create: vi.fn((order) => order),
      save: vi.fn(async (order) => ({
        ...order,
        id: 42,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      })),
      find: vi.fn(),
      findOneBy: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      delete: vi.fn(),
    };
    axiosPost = vi.fn().mockResolvedValue({
      data: { id: 7, name: 'Product', price: 12.5, stock: 5 },
    });
    rabbitEmit = vi.fn(() => of(undefined));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: 'Order_Broker',
          useValue: { emit: rabbitEmit },
        },
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: orderRepository,
        },
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              post: axiosPost,
              get: vi.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: vi.fn((key: string) => {
              const values: Record<string, string> = {
                PRODUCT_SERVICE_URL: 'http://product',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('publishes the generated OTP for notification without returning it', async () => {
    const response = await service.createOrder({
      productId: 7,
      quantity: 2,
      customerEmail: 'customer@example.com',
    });
    const savedOrder = await orderRepository.save.mock.results[0].value;
    const [eventName, notification] = rabbitEmit.mock.calls[0];

    expect(eventName).toBe('order.created');
    expect(notification.otp).toMatch(/^\d{4}$/);
    expect(savedOrder.deliveryOtp).toBe(notification.otp);
    expect(response).not.toHaveProperty('deliveryOtp');
    expect(response).not.toHaveProperty('otp');
  });

  it('returns the created order without an OTP when notification is unavailable', async () => {
    axiosPost
      .mockReset()
      .mockResolvedValueOnce({
        data: { id: 7, name: 'Product', price: 12.5, stock: 5 },
      });
    rabbitEmit.mockImplementation(() =>
      throwError(() => new Error('RabbitMQ unavailable')),
    );
    const errorLog = vi.spyOn(service['logger'], 'error').mockImplementation(() => {});

    const response = await service.createOrder({
      productId: 7,
      quantity: 2,
      customerEmail: 'customer@example.com',
    });

    expect(response).toMatchObject({
      id: 42,
      productId: 7,
      quantity: 2,
      status: 'pending',
    });
    expect(response).not.toHaveProperty('otp');
    expect(response).not.toHaveProperty('deliveryOtp');
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it('consumes the OTP and marks the order delivered when it matches', async () => {
    await service.createOrder({
      productId: 7,
      quantity: 2,
      customerEmail: 'customer@example.com',
    });
    const savedOrder = await orderRepository.save.mock.results[0].value;
    orderRepository.findOne.mockResolvedValue(savedOrder);
    const otp = rabbitEmit.mock.calls[0][1].otp as string;

    const response = await service.confirmDelivery(42, otp);

    expect(orderRepository.update).toHaveBeenCalledWith(
      { id: 42, status: 'pending' },
      { status: 'delivered', deliveryOtp: null },
    );
    expect(response.status).toBe('delivered');
    expect(response).not.toHaveProperty('deliveryOtp');
  });

  it('cancels the order and releases stock when the OTP is wrong', async () => {
    await service.createOrder({
      productId: 7,
      quantity: 2,
      customerEmail: 'customer@example.com',
    });
    orderRepository.findOne.mockResolvedValue(
      await orderRepository.save.mock.results[0].value,
    );
    await expect(service.confirmDelivery(42, '0000')).rejects.toThrow(
      'Incorrect OTP',
    );

    expect(orderRepository.update).toHaveBeenCalledWith(
      { id: 42, status: 'pending' },
      { status: 'cancelled', deliveryOtp: null },
    );
    expect(axiosPost).toHaveBeenLastCalledWith(
      'http://product/product/7/release',
      { quantity: 2 },
    );
  });
});
