import type { Page } from '@app/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateProductDto } from '../dto/create-product.dto.js';
import { ListProductsQuery } from '../dto/list-products.query.js';
import type { ProductResponseDto } from '../dto/product-response.dto.js';
import { RestockProductDto } from '../dto/restock-product.dto.js';
import { UpdateProductDto } from '../dto/update-product.dto.js';
import { toNewProduct, toProductChanges, toProductResponse } from '../mappers/product.mapper.js';
import { ProductsService } from '../services/products.service.js';

/** HTTP only: validated DTO in, service call, response DTO out. */
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  public async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    const product = await this.productsService.create(toNewProduct(dto));
    return toProductResponse(product);
  }

  @Get()
  public async list(@Query() query: ListProductsQuery): Promise<Page<ProductResponseDto>> {
    const page = await this.productsService.list(
      { search: query.search },
      { page: query.page, limit: query.limit },
    );
    return { ...page, items: page.items.map(toProductResponse) };
  }

  @Get(':id')
  public async getById(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return toProductResponse(await this.productsService.getById(id));
  }

  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.update(id, toProductChanges(dto));
    return toProductResponse(product);
  }

  @Post(':id/restock')
  @HttpCode(HttpStatus.OK)
  public async restock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestockProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.restock(id, dto.quantity);
    return toProductResponse(product);
  }
}
