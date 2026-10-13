import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { NotificationEntity } from './notification.entity.js';
import { NotificationService } from './notification.service.js';

const emailMocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  resendSend: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: { createTransport: emailMocks.createTransport },
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: emailMocks.resendSend };
  },
}));

describe('NotificationService OTP email', () => {
  const notificationRepository = {
    create: vi.fn((notification) => notification),
    save: vi.fn(async (notification) => ({ ...notification, id: 1 })),
  };
  let service: NotificationService;

  async function createService(environment: string): Promise<void> {
    const configValues: Record<string, string> = {
      NODE_ENV: environment,
      EMAIL_USER: 'sender@gmail.com',
      EMAIL_PASSWORD: 'gmail-app-password',
      RESEND_API_KEY: 'resend-test-api-key',
    };
    const configService = {
      get: vi.fn((key: string, defaultValue?: string) =>
        configValues[key] ?? defaultValue,
      ),
      getOrThrow: vi.fn((key: string) => {
        const value = configValues[key];
        if (!value) {
          throw new Error(`Missing config: ${key}`);
        }
        return value;
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: notificationRepository,
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = module.get(NotificationService);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    emailMocks.createTransport.mockReturnValue({
      sendMail: emailMocks.sendMail,
    });
    emailMocks.sendMail.mockResolvedValue({});
    emailMocks.resendSend.mockResolvedValue({
      data: { id: 'email-id' },
      error: null,
    });
    notificationRepository.save.mockImplementation(async (notification) => ({
      ...notification,
      id: 1,
    }));
  });

  it('sends branded HTML using Gmail SMTP in development', async () => {
    await createService('development');

    const result = await service.sendOrderCreatedEmail({
      orderId: 1,
      productId: 2,
      quantity: 1,
      customerEmail: 'customer@example.com',
      otp: '4821',
    });

    expect(emailMocks.createTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'sender@gmail.com', pass: 'gmail-app-password' },
    });
    expect(emailMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Order" <sender@gmail.com>',
        to: 'customer@example.com',
        subject: 'Delivery OTP for order 1',
        html: expect.stringContaining('4821'),
      }),
    );
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ otp: expect.anything() }),
    );
    expect(result.status).toBe('SENT');
  });

  it('sends branded HTML using Resend outside development', async () => {
    await createService('production');

    await service.sendOrderCreatedEmail({
      orderId: 2,
      productId: 3,
      quantity: 1,
      customerEmail: 'customer@example.com',
      otp: '7351',
    });

    expect(emailMocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Order <onboarding@resend.dev>',
        to: ['customer@example.com'],
        subject: 'Delivery OTP for order 2',
        html: expect.stringContaining('7351'),
      }),
    );
    expect(emailMocks.createTransport).not.toHaveBeenCalled();
  });
});
