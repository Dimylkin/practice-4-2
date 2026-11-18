import './styles.css';
import { applyFilters, filterByAuthor, filterByMinYear } from './task3-filters';
import { createBookFromForm } from "./task4-integration";
import { filterByTitle, sortBooks } from './task5-utils';
import { BookCatalog } from './task6-classes';
import { Wishlist } from './task7-wishlist';
import { createBook as createServerBook, deleteBook, fetchBooks } from './api';
let state = { status: 'loading' };
let errorMessage = '';
let saving = false;
let errorTimeout;
// ============================================================
// ИСХОДНОЕ СОСТОЯНИЕ
// ============================================================
let catalog = new BookCatalog('main');
let wishlist = new Wishlist();
// Избранное остаётся локальным состоянием интерфейса.
const savedWishlist = localStorage.getItem('wishlist');
if (savedWishlist) {
    wishlist = new Wishlist(JSON.parse(savedWishlist));
}
// ============================================================
// СОХРАНЕНИЕ ИЗБРАННОГО
// ============================================================
function saveWishlist() {
    localStorage.setItem('wishlist', JSON.stringify(wishlist.getFavoriteIds()));
}
// ============================================================
// DOM-элементы
// ============================================================
const bookList = document.querySelector('#bookList');
const wishlistContainer = document.querySelector('#wishlistContainer');
const form = document.querySelector('#bookForm');
const filterBtn = document.querySelector('#applyFilters');
const authorInput = document.querySelector('#filterAuthor');
const yearInput = document.querySelector('#filterYear');
const errorElement = document.querySelector('#errorMessage');
const searchInput = document.querySelector('#searchInput');
const sortBySelect = document.querySelector('#sortBy');
// ============================================================
// СОЗДАНИЕ КАРТОЧКИ
// ============================================================
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    const titleEl = document.createElement('h3');
    titleEl.textContent = `${book.title} — ${book.authors.join(', ')}${book.year ? `, ${book.year}` : ''}`;
    card.append(titleEl);
    if (book.rating !== undefined) {
        const ratingEl = document.createElement('p');
        ratingEl.textContent = `Рейтинг: ${book.rating}`;
        card.append(ratingEl);
    }
    // Кнопка «Удалить»
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Удалить';
    deleteBtn.addEventListener('click', async () => {
        if (state.status !== 'success')
            return;
        const currentBooks = state.data;
        await updateBooks(async () => {
            await deleteBook(book.id);
            return currentBooks.filter(item => item.id !== book.id);
        });
    });
    card.append(deleteBtn);
    // Кнопка «Избранное» 
    const favBtn = document.createElement('button');
    favBtn.textContent = wishlist.has(book.id) ? '❤️ В избранном' : '🤍 В избранное';
    favBtn.addEventListener('click', () => {
        wishlist.toggle(book.id);
        saveWishlist();
        render();
    });
    card.append(favBtn);
    deleteBtn.disabled = saving;
    favBtn.disabled = saving;
    return card;
}
// ============================================================
// ОТРИСОВКА
// ============================================================
function renderBooks(books) {
    bookList.innerHTML = '';
    if (books.length === 0) {
        bookList.textContent = 'Книги не найдены. Попробуйте изменить фильтры.';
        return;
    }
    books.forEach(book => {
        bookList.append(createBookCard(book));
    });
}
function renderWishlist() {
    wishlistContainer.innerHTML = '';
    const favBooks = wishlist.getFavorites(catalog);
    if (favBooks.length === 0) {
        wishlistContainer.textContent = 'Пока ничего не добавлено';
        return;
    }
    favBooks.forEach(book => {
        wishlistContainer.append(createBookCard(book));
    });
}
// Единая функция обновления вида
function updateView() {
    const filters = [];
    if (authorInput.value.trim())
        filters.push(filterByAuthor(authorInput.value.trim()));
    if (yearInput.value)
        filters.push(filterByMinYear(parseInt(yearInput.value, 10)));
    if (searchInput.value.trim())
        filters.push(filterByTitle(searchInput.value.trim()));
    if (state.status !== 'success')
        return;
    const allBooks = state.data;
    const filtered = applyFilters(allBooks, filters);
    const sorted = sortBooks(filtered, sortBySelect.value);
    renderBooks(sorted);
    renderWishlist();
}
function render() {
    errorElement.textContent = errorMessage;
    bookList.innerHTML = '';
    wishlistContainer.innerHTML = '';
    switch (state.status) {
        case 'idle':
            break;
        case 'loading':
            bookList.textContent = 'Загрузка данных...';
            break;
        case 'success':
            catalog = new BookCatalog('main', state.data);
            updateView();
            break;
        case 'error': {
            const message = document.createElement('div');
            message.className = 'load-error';
            message.textContent = state.message;
            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'Повторить попытку';
            retryBtn.addEventListener('click', initApp);
            message.append(document.createElement('br'), retryBtn);
            bookList.append(message);
            break;
        }
    }
}
async function initApp() {
    state = { status: 'loading' };
    render();
    try {
        const books = await fetchBooks();
        state = { status: 'success', data: books };
    }
    catch (error) {
        state = { status: 'error', message: error instanceof Error ? error.message : 'Неизвестная ошибка' };
    }
    render();
}
async function updateBooks(change) {
    saving = true;
    const buttons = document.querySelectorAll('#bookForm button, .book-card button');
    buttons.forEach(button => button.disabled = true);
    try {
        const books = await change();
        state = { status: 'success', data: books };
        render();
        return true;
    }
    catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        clearTimeout(errorTimeout);
        render();
        errorTimeout = setTimeout(() => {
            errorMessage = '';
            render();
        }, 3000);
        return false;
    }
    finally {
        saving = false;
        document.querySelectorAll('#bookForm button, .book-card button')
            .forEach(button => button.disabled = false);
    }
}
// Первичная отрисовка
initApp();
// ============================================================
// ОБРАБОТЧИК ФОРМЫ
// ============================================================
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.status !== 'success' || saving)
        return;
    errorMessage = '';
    clearTimeout(errorTimeout);
    render();
    try {
        const formData = new FormData(form);
        const newBook = createBookFromForm(formData);
        const currentBooks = state.data;
        if (await updateBooks(async () => [...currentBooks, await createServerBook(newBook)]))
            form.reset();
    }
    catch (error) {
        if (error instanceof Error) {
            errorMessage = error.message;
            render();
        }
    }
});
// ============================================================
// ФИЛЬТРЫ И СОРТИРОВКА
// ============================================================
filterBtn.addEventListener('click', render);
searchInput.addEventListener('input', render);
sortBySelect.addEventListener('change', render);
