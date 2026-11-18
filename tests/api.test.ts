import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_URL, createBook, deleteBook, fetchBooks } from '../src/api';
import type { Book } from '../src/task1-types';

const dto = { id: '42', title: 'Книга', author: 'Автор', year: 2024, rating: 4.5 };

function response(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Not Found',
    json: async () => body,
  } as Response;
}

describe('API books', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('загружает DTO и преобразует их во внутренние книги', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([dto]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchBooks()).resolves.toEqual([
      { id: '42', title: 'Книга', authors: ['Автор'], year: 2024, rating: 4.5 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(API_URL);
  });

  it('отклоняет неуспешный HTTP-ответ при загрузке', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response('Not found', false, 404)));

    await expect(fetchBooks()).rejects.toThrow('Ошибка API: 404 Not Found');
  });

  it('создаёт одну книгу и возвращает серверный id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(dto, true, 201));
    vi.stubGlobal('fetch', fetchMock);
    const book: Book = { id: '', title: 'Книга', authors: ['Автор'], year: 2024, rating: 4.5 };

    await expect(createBook(book)).resolves.toEqual({
      id: '42', title: 'Книга', authors: ['Автор'], year: 2024, rating: 4.5,
    });
    expect(fetchMock).toHaveBeenCalledWith(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Книга', author: 'Автор', year: 2024, rating: 4.5 }),
    });
  });

  it('удаляет книгу по id и проверяет HTTP-статус', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(null, true, 200));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteBook('42')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/42`, { method: 'DELETE' });
  });
});
