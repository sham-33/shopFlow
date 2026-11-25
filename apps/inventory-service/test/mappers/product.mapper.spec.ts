import { CreateProductDto } from '../../src/dto/create-product.dto.js';
import { UpdateProductDto } from '../../src/dto/update-product.dto.js';
import {
  toNewProduct,
  toProductChanges,
  toProductResponse,
} from '../../src/mappers/product.mapper.js';
import { PRODUCT_ID, aProduct } from '../builders/product.builder.js';

function createDto(price: number, initialQuantity = 10): CreateProductDto {
  return Object.assign(new CreateProductDto(), {
    sku: 'TSHIRT-RED-M',
    name: 'Red T-shirt (M)',
    price,
    initialQuantity,
  });
}

describe('product mapper', () => {
  describe('toNewProduct', () => {
    it.each([
      [499.5, 49950],
      [19.99, 1999],
      [0.1, 10],
      [0, 0],
    ])('turns a price of %s rupees into %i paise', (rupees, paise) => {
      expect(toNewProduct(createDto(rupees)).pricePaise).toBe(paise);
    });

    it('copies the SKU, name and starting quantity unchanged', () => {
      expect(toNewProduct(createDto(499.5, 7))).toEqual({
        sku: 'TSHIRT-RED-M',
        name: 'Red T-shirt (M)',
        pricePaise: 49950,
        initialQuantity: 7,
      });
    });
  });

  describe('toProductChanges', () => {
    it('includes only the fields that were sent', () => {
      const dto = Object.assign(new UpdateProductDto(), { name: 'Blue Mug' });

      expect(toProductChanges(dto)).toEqual({ name: 'Blue Mug' });
    });

    it('keeps falsy values: a price of 0 and active false', () => {
      const dto = Object.assign(new UpdateProductDto(), {
        price: 0,
        active: false,
      });

      expect(toProductChanges(dto)).toEqual({ pricePaise: 0, active: false });
    });

    it('returns no changes for an empty body', () => {
      expect(toProductChanges(new UpdateProductDto())).toEqual({});
    });
  });

  describe('toProductResponse', () => {
    it('returns rupees, the stock levels and ISO timestamps', () => {
      const product = aProduct(
        { pricePaise: 1999, updatedAt: new Date('2026-11-24T08:30:00.000Z') },
        { availableQty: 7, reservedQty: 3 },
      );

      expect(toProductResponse(product)).toEqual({
        id: PRODUCT_ID,
        sku: 'TSHIRT-RED-M',
        name: 'Red T-shirt (M)',
        price: 19.99,
        active: true,
        stock: { available: 7, reserved: 3 },
        createdAt: '2026-11-23T10:00:00.000Z',
        updatedAt: '2026-11-24T08:30:00.000Z',
      });
    });

    it('fails loudly if the product was loaded without its stock', () => {
      const product = aProduct();
      product.stock = undefined;

      expect(() => toProductResponse(product)).toThrow(
        `Product ${PRODUCT_ID} was loaded without its stock`,
      );
    });
  });
});
