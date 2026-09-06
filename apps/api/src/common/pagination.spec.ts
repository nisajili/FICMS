import { parsePagination, toPaginated } from './pagination';

describe('parsePagination', () => {
  it('defaults to page 1 and a sane page size', () => {
    const r = parsePagination({});
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(25);
    expect(r.skip).toBe(0);
    expect(r.take).toBe(25);
    expect(r.orderBy).toBeUndefined();
  });

  it('clamps page size to the maximum', () => {
    const r = parsePagination({ pageSize: 500 });
    expect(r.pageSize).toBe(100);
  });

  it('computes the offset from page and page size', () => {
    const r = parsePagination({ page: 3, pageSize: 20 });
    expect(r.skip).toBe(40);
    expect(r.take).toBe(20);
  });

  it('accepts a sort order', () => {
    const r = parsePagination({ sort: 'createdAt', order: 'asc' });
    expect(r.orderBy).toEqual({ createdAt: 'asc' });
  });

  it('defaults non-ascc to desc', () => {
    const r = parsePagination({ sort: 'updatedAt', order: 'desc' });
    expect(r.orderBy).toEqual({ updatedAt: 'desc' });
  });
});

describe('toPaginated', () => {
  it('builds the paginated envelope and total pages', () => {
    const r = toPaginated([1, 2], 5, { page: 1, pageSize: 2 });
    expect(r.meta.total).toBe(5);
    expect(r.meta.totalPages).toBe(3);
    expect(r.data).toHaveLength(2);
  });

  it('guarantees at least one page for zero records', () => {
    const r = toPaginated([], 0, { page: 1, pageSize: 25 });
    expect(r.meta.totalPages).toBe(1);
  });
});
