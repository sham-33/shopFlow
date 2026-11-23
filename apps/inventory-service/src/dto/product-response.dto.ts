import { type Page, PageMetaDto } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';

export class StockLevelDto {
  @ApiProperty({ description: 'Units that can still be sold', example: 10 })
  public available: number;

  @ApiProperty({
    description: 'Units held for orders waiting for payment',
    example: 2,
  })
  public reserved: number;
}

/** What every product endpoint returns. Never the TypeORM entity itself. */
export class ProductResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '33444446-505d-4aaf-b42a-5cbc575a9783',
  })
  public id: string;

  @ApiProperty({ description: 'Unique product code', example: 'TSHIRT-RED-M' })
  public sku: string;

  @ApiProperty({ description: 'Display name', example: 'Red T-shirt (M)' })
  public name: string;

  @ApiProperty({ description: 'Price in rupees', example: 499.5 })
  public price: number;

  @ApiProperty({
    description: 'Whether the product can be ordered',
    example: true,
  })
  public active: boolean;

  @ApiProperty({ description: 'Current stock levels', type: StockLevelDto })
  public stock: StockLevelDto;

  @ApiProperty({ format: 'date-time', example: '2026-11-23T11:35:57.258Z' })
  public createdAt: string;

  @ApiProperty({ format: 'date-time', example: '2026-11-23T11:35:57.258Z' })
  public updatedAt: string;
}

/** Response of GET /api/v1/products. */
export class ProductPageResponseDto implements Page<ProductResponseDto> {
  @ApiProperty({ type: [ProductResponseDto] })
  public items: ProductResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  public meta: PageMetaDto;
}
