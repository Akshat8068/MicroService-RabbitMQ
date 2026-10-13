import { Body, Controller, Logger, Post } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationEntity } from './notification.entity.js';
import { OrderCreatedNotificationDto } from './notification.dto.js';
import { NotificationService } from './notification.service.js';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Post('order-created')
  sendOrderCreatedEmail(
    @Body() order: OrderCreatedNotificationDto,
  ): Promise<NotificationEntity> {
    return this.notificationService.sendOrderCreatedEmail(order);
  }

  @EventPattern('order.created')
  handleOrderCreatedEvent(
    @Payload() order: OrderCreatedNotificationDto,
  ): Promise<NotificationEntity> {
    this.logger.log(`Received order.created event for order ${order.orderId}`);
    return this.notificationService.sendOrderCreatedEmail(order);
  }
}
