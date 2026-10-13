import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  unitPrice: string;
  @Index()
  @Column({ type: 'varchar', length: 254, nullable: true })
  customerEmail: string | null;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ type: 'varchar', length: 4, nullable: true, select: false })
  deliveryOtp: string | null;

  @CreateDateColumn()
  createdAt: Date;
}