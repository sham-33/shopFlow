import { PaginationQueryDto } from '@app/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrderStatus } from '../domain/enums.js';

/** Query of GET /api/v1/orders?customerId=&status=&page=&limit= */
export class ListOrdersQuery extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: "Only this customer's orders" })
  @IsOptional()
  @IsUUID()
  public customerId?: string;

  @ApiPropertyOptional({ enum: OrderStatus, description: 'Only orders in this status' })
  @IsOptional()
  @IsEnum(OrderStatus)
  public status?: OrderStatus;
}
