import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { OrderModule } from './order/order.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './order/order.entity.js';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }),ClientsModule.registerAsync([
    {
      name:"Order_Broker",
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport:Transport.RMQ,
        options:{
          urls:[configService.get<string>('RABBITMQ_URL','amqp://guest:guest@localhost:5672')],
           queue:"order.events",
           queueOptions:{
            durable:true}
        }
      })
    }
  ])
  ,TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
      type: 'postgres',
      host: configService.get('DB_HOST'),
      port: configService.get('DB_PORT'),
      username: configService.get('DB_USERNAME'),
      password: configService.get('DB_PASSWORD'),
      entities: [OrderEntity],
      synchronize: true,
    })
  }), OrderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
