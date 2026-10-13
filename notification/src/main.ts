import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.connectMicroservice<MicroserviceOptions>({
    transport:Transport.RMQ,
    options:{
      urls:[configService.get<string>('RABBITMQ_URL','amqp://guest:guest@localhost:5672')],
       queue:"order.events",
       queueOptions:{
        durable:true}
    }
  })
  await app.startAllMicroservices();
  await app.listen(configService.get<number>('PORT', 3002));
  console.log(`Notification server is running `);
}
await bootstrap();
