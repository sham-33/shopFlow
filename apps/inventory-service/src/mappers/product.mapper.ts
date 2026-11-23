import { paiseToRupees, rupeesToPaise } from '@app/common';
import type { CreateProductDto } from '../dto/create-product.dto.js';
import type { ProductResponseDto } from '../dto/product-response.dto.js';
import type { UpdateProductDto } from '../dto/update-product.dto.js';
import type { Product } from '../entities/product.entity.js';
import type { NewProduct } from '../repository/product.repository.js';
import type { ProductChanges } from '../services/products.service.js';

// Converts between the API's shapes (rupees, DTOs) and the service's shapes
// (paise, entities). Nothing else.

export function toNewProduct(dto: CreateProductDto): NewProduct {
  return {
    sku: dto.sku,
    name: dto.name,
    pricePaise: rupeesToPaise(dto.price),
    initialQuantity: dto.initialQuantity,
  };
}

export function toProductChanges(dto: UpdateProductDto): ProductChanges {
  const changes: ProductChanges = {};
  if (dto.name !== undefined) {
    changes.name = dto.name;
  }
  if (dto.price !== undefined) {
    changes.pricePaise = rupeesToPaise(dto.price);
  }
  if (dto.active !== undefined) {
    changes.active = dto.active;
  }
  return changes;
}

export function toProductResponse(product: Product): ProductResponseDto {
  const { stock } = product;
  if (!stock) {
    throw new Error(`Product ${product.id} was loaded without its stock`);
  }
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    price: paiseToRupees(product.pricePaise),
    active: product.active,
    stock: { available: stock.availableQty, reserved: stock.reservedQty },
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
