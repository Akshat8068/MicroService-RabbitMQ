import { Module } from '@nestjs/common';
import { ProductService } from './product.service.js';
import { ProductController } from './product.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from './product.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity])],
  controllers: [ ProductController],
  providers: [ProductService],
  exports: [ProductService]
})
export class ProductModule {}
