import type { Mocked } from 'vitest';
import { DuplicateSkuException } from '../../src/exceptions/duplicate-sku.exception.js';
import { ProductNotFoundException } from '../../src/exceptions/product-not-found.exception.js';
import type { NewProduct, ProductRepository } from '../../src/repository/product.repository.js';
import { ProductsService } from '../../src/services/products.service.js';
import { PRODUCT_ID, aProduct } from '../builders/product.builder.js';

function mockRepository(): Mocked<ProductRepository> {
  return {
    findById: vi.fn<ProductRepository['findById']>(),
    existsBySku: vi.fn<ProductRepository['existsBySku']>(),
    list: vi.fn<ProductRepository['list']>(),
    insert: vi.fn<ProductRepository['insert']>(),
    save: vi.fn<ProductRepository['save']>((product) => Promise.resolve(product)),
    addAvailableStock: vi.fn<ProductRepository['addAvailableStock']>(),
  };
}

describe('ProductsService', () => {
  let repository: Mocked<ProductRepository>;
  let service: ProductsService;

  beforeEach(() => {
    repository = mockRepository();
    service = new ProductsService(repository);
  });

  describe('create', () => {
    const newProduct: NewProduct = {
      sku: 'TSHIRT-RED-M',
      name: 'Red T-shirt (M)',
      pricePaise: 49950,
      initialQuantity: 10,
    };

    it('inserts the product with its starting stock when the SKU is free', async () => {
      const created = aProduct();
      repository.existsBySku.mockResolvedValue(false);
      repository.insert.mockResolvedValue(created);

      await expect(service.create(newProduct)).resolves.toBe(created);
      expect(repository.existsBySku).toHaveBeenCalledWith('TSHIRT-RED-M');
      expect(repository.insert).toHaveBeenCalledWith(newProduct);
    });

    it('rejects a SKU that already exists, without inserting anything', async () => {
      repository.existsBySku.mockResolvedValue(true);

      const created = service.create(newProduct);

      await expect(created).rejects.toBeInstanceOf(DuplicateSkuException);
      await expect(created).rejects.toMatchObject({
        code: 'DUPLICATE_SKU',
        kind: 'conflict',
        details: { sku: 'TSHIRT-RED-M' },
      });
      expect(repository.insert).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns the product with its stock', async () => {
      const product = aProduct();
      repository.findById.mockResolvedValue(product);

      await expect(service.getById(PRODUCT_ID)).resolves.toBe(product);
      expect(repository.findById).toHaveBeenCalledWith(PRODUCT_ID);
    });

    it('throws PRODUCT_NOT_FOUND, naming the ID, when the product does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const found = service.getById(PRODUCT_ID);

      await expect(found).rejects.toBeInstanceOf(ProductNotFoundException);
      await expect(found).rejects.toMatchObject({
        code: 'PRODUCT_NOT_FOUND',
        kind: 'not_found',
        details: { productId: PRODUCT_ID },
      });
    });
  });

  describe('list', () => {
    it('passes the filter and page to the repository and counts the pages', async () => {
      const items = [aProduct(), aProduct({ id: 'b0a1c0de-0000-4000-8000-000000000002' })];
      repository.list.mockResolvedValue({ items, totalItems: 45 });

      const page = await service.list({ search: 'shirt' }, { page: 2, limit: 20 });

      expect(repository.list).toHaveBeenCalledWith({ search: 'shirt' }, { page: 2, limit: 20 });
      expect(page).toEqual({
        items,
        meta: { page: 2, limit: 20, totalItems: 45, totalPages: 3 },
      });
    });

    it('returns an empty page with zero pages when nothing matches', async () => {
      repository.list.mockResolvedValue({ items: [], totalItems: 0 });

      const page = await service.list({}, { page: 1, limit: 20 });

      expect(page).toEqual({
        items: [],
        meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
      });
    });

    it('returns no items, but the real totals, for a page past the end', async () => {
      repository.list.mockResolvedValue({ items: [], totalItems: 45 });

      const page = await service.list({}, { page: 9, limit: 20 });

      expect(page.items).toEqual([]);
      expect(page.meta).toEqual({
        page: 9,
        limit: 20,
        totalItems: 45,
        totalPages: 3,
      });
    });

    it('counts a last page that is only partly full', async () => {
      repository.list.mockResolvedValue({
        items: [aProduct()],
        totalItems: 41,
      });

      const page = await service.list({}, { page: 3, limit: 20 });

      expect(page.meta.totalPages).toBe(3);
    });
  });

  describe('update', () => {
    it('changes only the fields it is given', async () => {
      repository.findById.mockResolvedValue(aProduct());

      const updated = await service.update(PRODUCT_ID, {
        name: 'Red T-shirt (M), slim fit',
      });

      expect(updated).toMatchObject({
        name: 'Red T-shirt (M), slim fit',
        pricePaise: 49950,
        active: true,
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('changes every field when all are given', async () => {
      repository.findById.mockResolvedValue(aProduct());

      const updated = await service.update(PRODUCT_ID, {
        name: 'Blue Mug',
        pricePaise: 1999,
        active: false,
      });

      expect(updated).toMatchObject({
        name: 'Blue Mug',
        pricePaise: 1999,
        active: false,
      });
    });

    it('applies falsy values: a price of 0 and active false', async () => {
      repository.findById.mockResolvedValue(aProduct());

      const updated = await service.update(PRODUCT_ID, {
        pricePaise: 0,
        active: false,
      });

      expect(updated).toMatchObject({ pricePaise: 0, active: false });
    });

    it('leaves the product as it was when no fields are given', async () => {
      repository.findById.mockResolvedValue(aProduct());

      const updated = await service.update(PRODUCT_ID, {});

      expect(updated).toEqual(aProduct());
    });

    it('throws PRODUCT_NOT_FOUND and saves nothing when the product does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(PRODUCT_ID, { name: 'x' })).rejects.toBeInstanceOf(
        ProductNotFoundException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('restock', () => {
    it('adds the quantity and returns the product with its new stock', async () => {
      const restocked = aProduct({}, { availableQty: 15 });
      repository.addAvailableStock.mockResolvedValue(true);
      repository.findById.mockResolvedValue(restocked);

      await expect(service.restock(PRODUCT_ID, 5)).resolves.toBe(restocked);
      expect(repository.addAvailableStock).toHaveBeenCalledWith(PRODUCT_ID, 5);
    });

    it('throws PRODUCT_NOT_FOUND without reloading when no stock row was updated', async () => {
      repository.addAvailableStock.mockResolvedValue(false);

      await expect(service.restock(PRODUCT_ID, 5)).rejects.toBeInstanceOf(ProductNotFoundException);
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('throws PRODUCT_NOT_FOUND if the product is deleted between the update and the reload', async () => {
      repository.addAvailableStock.mockResolvedValue(true);
      repository.findById.mockResolvedValue(null);

      await expect(service.restock(PRODUCT_ID, 5)).rejects.toBeInstanceOf(ProductNotFoundException);
    });
  });
});
