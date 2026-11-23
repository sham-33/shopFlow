import { ApiErrorResponse, COMMON_ERRORS, ParseIdPipe } from '@app/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ERRORS } from '../constants/errors.js';
import { CreateProductDto } from '../dto/create-product.dto.js';
import { ListProductsQuery } from '../dto/list-products.query.js';
import { ProductPageResponseDto, ProductResponseDto } from '../dto/product-response.dto.js';
import { RestockProductDto } from '../dto/restock-product.dto.js';
import { UpdateProductDto } from '../dto/update-product.dto.js';
import { toNewProduct, toProductChanges, toProductResponse } from '../mappers/product.mapper.js';
import { ProductsService } from '../services/products.service.js';

const PRODUCT_ID = {
  name: 'id',
  description: 'Product ID',
  format: 'uuid',
} as const;

/** HTTP only: validated DTO in, service call, response DTO out. */
@ApiTags('Products')
@ApiErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, COMMON_ERRORS.INTERNAL_ERROR)
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({
    summary: 'Create a product',
    description:
      'Adds a product to the catalogue together with its starting stock, in one transaction. The SKU must be unique and cannot change later.',
  })
  @ApiCreatedResponse({
    description: 'The product was created.',
    type: ProductResponseDto,
  })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, COMMON_ERRORS.VALIDATION_FAILED)
  @ApiErrorResponse(HttpStatus.CONFLICT, ERRORS.DUPLICATE_SKU)
  @Post()
  public async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    const product = await this.productsService.create(toNewProduct(dto));
    return toProductResponse(product);
  }

  @ApiOperation({
    summary: 'List products',
    description:
      'Returns one page of products with their stock, newest first. `search` matches anywhere in the name or SKU, ignoring case.',
  })
  @ApiOkResponse({
    description: 'One page of products.',
    type: ProductPageResponseDto,
  })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, COMMON_ERRORS.VALIDATION_FAILED)
  @Get()
  public async list(@Query() query: ListProductsQuery): Promise<ProductPageResponseDto> {
    const page = await this.productsService.list(
      { search: query.search },
      { page: query.page, limit: query.limit },
    );
    return { ...page, items: page.items.map(toProductResponse) };
  }

  @ApiOperation({
    summary: 'Get a product',
    description: 'Returns one product with its available and reserved stock.',
  })
  @ApiParam(PRODUCT_ID)
  @ApiOkResponse({ description: 'The product.', type: ProductResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, COMMON_ERRORS.INVALID_ID)
  @ApiErrorResponse(HttpStatus.NOT_FOUND, ERRORS.PRODUCT_NOT_FOUND)
  @Get(':id')
  public async getById(@Param('id', ParseIdPipe) id: string): Promise<ProductResponseDto> {
    return toProductResponse(await this.productsService.getById(id));
  }

  @ApiOperation({
    summary: 'Update a product',
    description:
      'Changes the name, price or active flag. Send only the fields to change. The SKU cannot change.',
  })
  @ApiParam(PRODUCT_ID)
  @ApiOkResponse({
    description: 'The updated product.',
    type: ProductResponseDto,
  })
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    COMMON_ERRORS.INVALID_ID,
    COMMON_ERRORS.VALIDATION_FAILED,
  )
  @ApiErrorResponse(HttpStatus.NOT_FOUND, ERRORS.PRODUCT_NOT_FOUND)
  @Patch(':id')
  public async update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.update(id, toProductChanges(dto));
    return toProductResponse(product);
  }

  @ApiOperation({
    summary: 'Restock a product',
    description:
      'Adds units to the available stock in one atomic update, so restocks and reservations running at the same time never overwrite each other.',
  })
  @ApiParam(PRODUCT_ID)
  @ApiOkResponse({
    description: 'The product with its new stock.',
    type: ProductResponseDto,
  })
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    COMMON_ERRORS.INVALID_ID,
    COMMON_ERRORS.VALIDATION_FAILED,
  )
  @ApiErrorResponse(HttpStatus.NOT_FOUND, ERRORS.PRODUCT_NOT_FOUND)
  @Post(':id/restock')
  @HttpCode(HttpStatus.OK)
  public async restock(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: RestockProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.restock(id, dto.quantity);
    return toProductResponse(product);
  }
}
