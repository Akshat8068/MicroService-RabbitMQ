
import {
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductEntity } from './product.entity.js';
import {
    ProductDto,
    ProductResponseDto,
    StockQuantityDto,
    UpdateProductDto,
} from './product.dto.js';
import { type Repository } from 'typeorm';

@Injectable()
export class ProductService {
    constructor(
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
    ) {}

    async createProduct(
        product: ProductDto,
    ): Promise<ProductResponseDto> {
        try {
            const newProduct = this.productRepository.create(product);
            return await this.productRepository.save(newProduct);
        } catch (error) {
            console.error('Error creating product:', error);
            throw new InternalServerErrorException(
                'Failed to create product',
            );
        }
    }

    async getAllProducts(): Promise<ProductResponseDto[]> {
        try {
            return await this.productRepository.find();
        } catch (error) {
            console.error('Error fetching products:', error);
            throw new InternalServerErrorException(
                'Failed to fetch products',
            );
        }
    }

    async getProductById(
        id: number,
    ): Promise<ProductResponseDto> {
        try {
            const product = await this.productRepository.findOne({
                where: { id },
            });

            if (!product) {
                throw new NotFoundException(
                    `Product with id ${id} not found`,
                );
            }

            return product;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }

            console.error('Error fetching product:', error);
            throw new InternalServerErrorException(
                'Failed to fetch product',
            );
        }
    }

    async updateProduct(
        id: number,
        product: UpdateProductDto,
    ): Promise<ProductResponseDto> {
        try {
            return await this.productRepository.manager.transaction(
                async (manager) => {
                    const existingProduct = await manager.findOne(
                        ProductEntity,
                        {
                            where: { id },
                            lock: { mode: 'pessimistic_write' },
                        },
                    );

                    if (!existingProduct) {
                        throw new NotFoundException(
                            `Product with id ${id} not found`,
                        );
                    }

                    Object.assign(existingProduct, product);
                    return await manager.save(existingProduct);
                },
            );
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }

            console.error('Error updating product:', error);
            throw new InternalServerErrorException(
                'Failed to update product',
            );
        }
    }

    async reserveStock(
        id: number,
        { quantity }: StockQuantityDto,
    ): Promise<ProductResponseDto> {
        try {
            return await this.productRepository.manager.transaction(
                async (manager) => {
                    const product = await manager.findOne(
                        ProductEntity,
                        {
                            where: { id },
                            lock: { mode: 'pessimistic_write' },
                        },
                    );

                    if (!product) {
                        throw new NotFoundException(
                            `Product with id ${id} not found`,
                        );
                    }

                    if (product.stock < quantity) {
                        throw new ConflictException(
                            'Insufficient stock for the product',
                        );
                    }

                    product.stock -= quantity;
                    return await manager.save(product);
                },
            );
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof ConflictException
            ) {
                throw error;
            }

            console.error('Error reserving stock:', error);
            throw new InternalServerErrorException(
                'Failed to reserve stock',
            );
        }
    }

    async releaseStock(
        id: number,
        { quantity }: StockQuantityDto,
    ): Promise<ProductResponseDto> {
        try {
            return await this.productRepository.manager.transaction(
                async (manager) => {
                    const product = await manager.findOne(
                        ProductEntity,
                        {
                            where: { id },
                            lock: { mode: 'pessimistic_write' },
                        },
                    );

                    if (!product) {
                        throw new NotFoundException(
                            `Product with id ${id} not found`,
                        );
                    }

                    product.stock += quantity;
                    return await manager.save(product);
                },
            );
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }

            console.error('Error releasing stock:', error);
            throw new InternalServerErrorException(
                'Failed to release stock',
            );
        }
    }
}
