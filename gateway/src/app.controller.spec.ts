import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppController } from './app.controller.js';
import { GatewayService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  let forward: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    forward = vi.fn().mockResolvedValue({ ok: true });
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: GatewayService,
          useValue: { forward },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('routes order creation to Order Service', async () => {
    const order = {
      productId: 3,
      quantity: 2,
      customerEmail: 'customer@example.com',
    };

    await appController.createOrder(order);

    expect(forward).toHaveBeenCalledWith('order', 'POST', '/order', order);
  });

  it('routes product reads to Product Service', async () => {
    await appController.getProduct(3);

    expect(forward).toHaveBeenCalledWith('product', 'GET', '/product/3');
  });

  it('does not expose internal product stock reservation routes', () => {
    expect('reserveStock' in appController).toBe(false);
    expect('releaseStock' in appController).toBe(false);
  });
});
