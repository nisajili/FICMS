export interface PageQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function parsePagination(query: PageQuery): {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
} {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
  );
  const skip = (page - 1) * pageSize;
  const orderBy: Record<string, 'asc' | 'desc'> | undefined = query.sort
    ? { [query.sort]: query.order === 'asc' ? 'asc' : 'desc' }
    : undefined;
  return { page, pageSize, skip, take: pageSize, orderBy };
}

export function toPaginated<T>(
  data: T[],
  total: number,
  q: { page: number; pageSize: number },
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    },
  };
}
