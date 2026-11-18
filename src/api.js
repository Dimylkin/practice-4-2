export const API_URL = 'https://6afd8a922a9c141d36b8a7a2.mockapi.io/api/v1/book';
export function mapBookFromDTO(dto) {
    return {
        id: dto.id,
        title: dto.title,
        authors: [dto.author],
        year: dto.year,
        rating: dto.rating,
    };
}
export function mapBookToDTO(book) {
    return {
        title: book.title,
        author: book.authors.join(', '),
        year: book.year,
        rating: book.rating,
    };
}
async function ensureOk(response) {
    if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
    }
}
export async function fetchBooks() {
    const response = await fetch(API_URL);
    await ensureOk(response);
    const books = await response.json();
    return books.map(mapBookFromDTO);
}
export async function createBook(book) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapBookToDTO(book)),
    });
    await ensureOk(response);
    const createdBook = await response.json();
    return mapBookFromDTO(createdBook);
}
export async function deleteBook(id) {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    await ensureOk(response);
}
