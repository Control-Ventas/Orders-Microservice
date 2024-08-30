import { OrderStatus } from "@prisma/client"
import { IsEnum, IsNumber, IsPositive } from "class-validator"


export class ChangeStatusDto {
    @IsNumber()
    @IsPositive()
    id: number

    @IsEnum(OrderStatus,{
        message: `Posible status values are ${OrderStatus}`
    })
    status: OrderStatus
}