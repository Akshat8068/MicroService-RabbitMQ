import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { Repository } from 'typeorm';
import { OrderCreatedNotificationDto } from './notification.dto.js';
import { NotificationEntity } from './notification.entity.js';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly configService: ConfigService,
  ) { }
  async sendOrderCreatedEmail(
    order: OrderCreatedNotificationDto,
  ): Promise<NotificationEntity> {
    const { otp, ...notificationDetails } = order;
    const notification = this.notificationRepository.create({
      ...notificationDetails,
      status: 'PENDING',
      errorMessage: null,
      sentAt: null,
    });
    const savedNotification = await this.notificationRepository.save(notification);

    try {
      await this.sendOtpEmail(
        order.customerEmail,
        `Delivery OTP for order ${order.orderId}`,
        otp,
      );
    } catch (error) {
      savedNotification.status = 'FAILED';
      savedNotification.errorMessage =
        error instanceof Error ? error.message : 'Unknown email delivery error';
      try {
        await this.notificationRepository.save(savedNotification);
      } catch (persistenceError) {
        throw new InternalServerErrorException(
          'Email delivery failed and notification failure could not be recorded',
          { cause: persistenceError },
        );
      }
      throw new ServiceUnavailableException(
        'Could not send the order notification email',
        { cause: error },
      );
    }

    savedNotification.status = 'SENT';
    savedNotification.sentAt = new Date();
    savedNotification.errorMessage = null;
    return this.notificationRepository.save(savedNotification);
  }

  private async sendOtpEmail(
    email: string,
    subject: string,
    otp: string,
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Order</h2>
        <p>Your delivery One-Time Password (OTP) is:</p>
        <h1 style="letter-spacing: 5px; color: #2563eb;">${otp}</h1>
        <p>Share this code with the delivery person to confirm your order.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <br />
        <p>Thanks,<br />Order Team</p>
      </div>
    `;
    const text =
      `Your delivery OTP is ${otp}. ` +
      'Share this code with the delivery person to confirm your order.';

    if (this.configService.get<string>('NODE_ENV') === 'development') {
      const user = this.configService.getOrThrow<string>('EMAIL_USER');
      const password = this.configService.getOrThrow<string>('EMAIL_PASSWORD');
      const transport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass: password },
      });

      await transport.sendMail({
        from: `"Order" <${user}>`,
        to: email,
        subject,
        html,
        text,
      });
      return;
    }

    const resend = new Resend(
      this.configService.getOrThrow<string>('RESEND_API_KEY'),
    );
    const { error } = await resend.emails.send({
      from: this.configService.get<string>(
        'RESEND_FROM',
        'Order <onboarding@resend.dev>',
      ),
      to: [email],
      subject,
      html,
      text,
    });
    if (error) {
      throw new Error(`Resend could not send OTP email: ${error.message}`);
    }
  }
}
