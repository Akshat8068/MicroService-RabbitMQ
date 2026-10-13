import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateProductDto } from './product.dto.js';

describe('UpdateProductDto', () => {
  it('accepts a name-only update', () => {
    const product = plainToInstance(UpdateProductDto, { name: 'Updated name' });

    expect(validateSync(product)).toEqual([]);
  });

  it('validates supplied numeric fields', () => {
    const product = plainToInstance(UpdateProductDto, {
      name: 'Updated name',
      stock: 'not-a-number',
    });

    expect(validateSync(product).map(({ property }) => property)).toContain('stock');
  });
});
