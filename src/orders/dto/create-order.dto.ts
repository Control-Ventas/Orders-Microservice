import { OrderStatus } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  Validate,
  ValidateNested,
} from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @IsNumber()
  @IsPositive()
  clientId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  // @IsNumber()
  // @IsPositive()
  // totalAmount: number

  // @IsNumber()
  // @IsPositive()
  // totalItems: number

  // @IsEnum(OrderStatusList,{
  //     message: `Posible status values are ${OrderStatusList}`
  // })
  // @IsOptional()
  // status: OrderStatus = OrderStatus.PENDING

  // @IsBoolean()
  // @IsOptional()
  // paid: boolean = false
}
