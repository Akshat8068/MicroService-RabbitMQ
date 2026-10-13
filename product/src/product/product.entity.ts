import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("Product")
export class ProductEntity {
    @PrimaryGeneratedColumn()
    id!:number
    @Column({type:"varchar", length:50})
    name!:string
    @Column({type:"int"})
    stock!:number
    @Column({type:"int"})
    price!:number
    @CreateDateColumn()
    createdAt!:Date
    @UpdateDateColumn()
    updatedAt!:Date
}