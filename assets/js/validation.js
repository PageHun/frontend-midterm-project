// menu.js
import { formMessage } from "./main.js";
import { CART_ICON } from "./icons.js";

// ---------- FavouritesStore ----------
// Хранит ключи избранных блюд и сохраняет их в localStorage.

class FavouritesStore {
  static STORAGE_KEY = "favourites";

  // Ключ блюда: id, если он есть в json, иначе название.
  static keyOf(item) {
    return String(item.id ?? item.name);
  }

  #keys;

  constructor() {
    this.#keys = new Set(this.#read());
  }

  has(key) {
    return this.#keys.has(key);
  }

  // Добавляет блюдо в избранное или убирает его. Возвращает новое состояние.
  toggle(key) {
    if (this.#keys.has(key)) {
      this.#keys.delete(key);
    } else {
      this.#keys.add(key);
    }
    this.#save();
    return this.#keys.has(key);
  }

  // localStorage может быть недоступен или содержать мусор, поэтому try/catch.
  #read() {
    try {
      const saved = JSON.parse(localStorage.getItem(FavouritesStore.STORAGE_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  #save() {
    try {
      localStorage.setItem(FavouritesStore.STORAGE_KEY, JSON.stringify([...this.#keys]));
    } catch {
      // Хранилище недоступно: избранное сохранится только до перезагрузки страницы.
    }
  }
}

// ---------- MenuRepository ----------
// Отвечает только за получение данных: загрузка menu.json + кэш.

class MenuRepository {
  #url;
  #data = null;

  constructor(url) {
    this.#url = url;
  }

  async #load() {
    if (this.#data) return this.#data;

    try {
      const response = await fetch(this.#url);
      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }
      this.#data = await response.json();
      return this.#data;
    } catch (error) {
      console.error("Не удалось загрузить menu.json:", error);
      return null;
    }
  }

  // Возвращает массив блюд категории или null, если данных нет.
  async getItems(categoryName) {
    const data = await this.#load();
    if (!data) return null;

    const category = data.categories.find((c) => c.name === categoryName);
    if (!category) {
      console.warn("Категория не найдена в JSON:", categoryName);
      return null;
    }
    return category.items;
  }

  // Все блюда из всех категорий (нужно для раздела избранного).
  async getAllItems() {
    const data = await this.#load();
    if (!data) return null;

    return data.categories.flatMap((category) => category.items);
  }
}

// ---------- MenuCardRenderer ----------
// Отвечает только за HTML карточки.

class MenuCardRenderer {
  static FAVOURITE_CLASS = "__favourite";

  render(item, isFavourite = false) {
    return `
      <div class="menu__grid-item" data-key="${this.#escape(FavouritesStore.keyOf(item))}" style="background-image: url(${item.imgSource});">
        ${this.#renderFavouriteButton(isFavourite)}
        <div class="menu__price">
          ${this.#renderPrice(item)}
          <button class="menu__btn add-cart">${CART_ICON}</button>
        </div>
        <div class="menu__info">
          <h3 class="menu__name">${item.name}</h3>
          <p class="menu__desc">${item.description}</p>
        </div>
      </div>
    `;
  }

  #renderPrice(item) {
    if (item.haveDiscount) {
      return `
        <span style="text-decoration: line-through;">$${item.price}</span>
        <span>$${item.discountPrice}</span>
      `;
    }
    return `<span>$${item.price}</span>`;
  }

  #renderFavouriteButton(isFavourite) {
    const activeClass = isFavourite ? ` ${MenuCardRenderer.FAVOURITE_CLASS}` : "";

    return `
      <button class="menu__fav${activeClass}" type="button" aria-label="Toggle favourite" aria-pressed="${isFavourite}">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </button>
    `;
  }

  // Экранирует значение для безопасной вставки в атрибут HTML.
  #escape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

// ---------- MenuSearch ----------
// Фильтрует карточки в сетке по названию.

class MenuSearch {
  #grid;
  #input;
  #button;

  constructor({ grid, input, button }) {
    this.#grid = grid;
    this.#input = input;
    this.#button = button;
  }

  init() {
    this.#input.addEventListener("input", () => this.apply());
    this.#button.addEventListener("click", () => this.apply());
  }

  apply() {
    const query = this.#input.value.trim().toLowerCase();

    this.#grid.querySelectorAll(".menu__grid-item").forEach((card) => {
      const name = card.querySelector(".menu__name").textContent.toLowerCase();
      card.style.display = name.includes(query) ? "" : "none";
    });
  }
}

// ---------- Menu ----------
// Вкладки категорий + отрисовка сетки. Все зависимости приходят через конструктор.

class Menu {
  static ACTIVE_TAB_CLASS = "__active-tab";
  // Вкладка избранного определяется по тексту: Favourite, Favourites, Favorites...
  static FAVOURITES_TAB_PATTERN = /favou?rite/i;
  static EMPTY_FAVOURITES_HTML =
    '<p class="menu__empty">No favourites yet. Press the heart on a dish to add it here.</p>';

  #grid;
  #tabs;
  #repository;
  #renderer;
  #search;
  #favourites;
  #isFavouritesView = false;

  constructor({ grid, tabs, repository, renderer, search, favourites }) {
    this.#grid = grid;
    this.#tabs = tabs;
    this.#repository = repository;
    this.#renderer = renderer;
    this.#search = search;
    this.#favourites = favourites;
  }

  init() {
    this.#tabs.addEventListener("click", (event) => this.#handleTabClick(event));
    this.#grid.addEventListener("click", (event) => this.#handleFavouriteClick(event));
    this.showCategory(this.#activeCategory);
  }

  async showCategory(categoryName) {
    const isFavouritesView = Menu.FAVOURITES_TAB_PATTERN.test(categoryName);
    const items = await this.#loadItems(categoryName, isFavouritesView);
    if (!items) return;

    this.#isFavouritesView = isFavouritesView;
    this.#clearGrid();

    if (items.length) {
      this.#grid.insertAdjacentHTML(
        "beforeend",
        items
          .map((item) =>
            this.#renderer.render(item, this.#favourites.has(FavouritesStore.keyOf(item)))
          )
          .join("")
      );
    } else if (isFavouritesView) {
      this.#grid.insertAdjacentHTML("beforeend", Menu.EMPTY_FAVOURITES_HTML);
    }

    // Новые карточки должны подчиняться текущему запросу в поиске.
    this.#search.apply();
  }

  async #loadItems(categoryName, isFavouritesView) {
    if (!isFavouritesView) return this.#repository.getItems(categoryName);

    const allItems = await this.#repository.getAllItems();
    if (!allItems) return null;

    return allItems.filter((item) => this.#favourites.has(FavouritesStore.keyOf(item)));
  }

  #clearGrid() {
    this.#grid
      .querySelectorAll(".menu__grid-item, .menu__empty")
      .forEach((element) => element.remove());
  }

  #handleFavouriteClick(event) {
    const button = event.target.closest(".menu__fav");
    if (!button) return;

    const card = button.closest(".menu__grid-item");
    const isFavourite = this.#favourites.toggle(card.dataset.key);

    button.classList.toggle(MenuCardRenderer.FAVOURITE_CLASS, isFavourite);
    button.setAttribute("aria-pressed", String(isFavourite));

    // В разделе избранного убранное блюдо сразу исчезает из списка.
    if (this.#isFavouritesView && !isFavourite) {
      card.remove();
      if (!this.#grid.querySelector(".menu__grid-item")) {
        this.#grid.insertAdjacentHTML("beforeend", Menu.EMPTY_FAVOURITES_HTML);
      }
    }
  }

  get #activeCategory() {
    return this.#tabs
      .querySelector(`.${Menu.ACTIVE_TAB_CLASS}`)
      .textContent.trim();
  }

  #handleTabClick(event) {
    const tab = event.target.closest(".menu__list-item");
    if (!tab || tab.classList.contains(Menu.ACTIVE_TAB_CLASS)) return;

    this.#tabs
      .querySelector(`.${Menu.ACTIVE_TAB_CLASS}`)
      .classList.remove(Menu.ACTIVE_TAB_CLASS);
    tab.classList.add(Menu.ACTIVE_TAB_CLASS);

    this.showCategory(tab.textContent.trim());
  }
}

// ---------- Cart ----------
// Мини-корзина. Количество хранится в поле объекта, а не в DOM.

class Cart {
  static SELECTORS = {
    cart: ".shop-cart",
    content: ".shop-cart__main",
    overlay: ".overlay",
    closeButton: ".shop-cart__btn-exit",
    decreaseButton: ".decrease-btn",
    increaseButton: ".increase-btn",
    counter: ".shop-cart__count-info",
    orderButton: ".shop-cart__btn-order",
  };
  static ADD_BUTTON_SELECTOR = ".add-cart";
  static CARD_SELECTOR = ".menu__grid-item";
  static ITEM_CLASS = "shop-cart__item";
  static ACTIVE_CLASS = "active";
  // Элементы карточки, которые не нужны в копии внутри корзины.
  static EXCLUDED_FROM_CLONE_SELECTOR = ".menu__fav";

  #quantity = 1;
  #ui;
  #formMessage;

  constructor(formMessage) {
    this.#formMessage = formMessage;
    this.#ui = Object.fromEntries(
      Object.entries(Cart.SELECTORS).map(([key, selector]) => [
        key,
        document.querySelector(selector),
      ])
    );
  }

  init() {
    const { closeButton, decreaseButton, increaseButton, orderButton } = this.#ui;

    document.addEventListener("click", (event) => this.#handleDocumentClick(event));
    closeButton.addEventListener("click", () => this.close());
    decreaseButton.addEventListener("click", () => this.decrease());
    increaseButton.addEventListener("click", () => this.increase());
    orderButton.addEventListener("click", () => this.order());
  }

  add(card) {
    const item = card.cloneNode(true);
    item.querySelector(Cart.EXCLUDED_FROM_CLONE_SELECTOR)?.remove();
    item.classList.add(Cart.ITEM_CLASS);
    this.#ui.content.append(item);
    this.open();
  }

  open() {
    this.#ui.cart.classList.add(Cart.ACTIVE_CLASS);
    this.#ui.overlay.classList.add(Cart.ACTIVE_CLASS);
  }

  close() {
    this.#ui.cart.classList.remove(Cart.ACTIVE_CLASS);
    this.#ui.overlay.classList.remove(Cart.ACTIVE_CLASS);
    this.#ui.content
      .querySelectorAll(`.${Cart.ITEM_CLASS}`)
      .forEach((item) => item.remove());

    this.#quantity = 1;
    this.#renderQuantity();
  }

  increase() {
    this.#quantity++;
    this.#renderQuantity();
  }

  decrease() {
    if (this.#quantity <= 1) return;
    this.#quantity--;
    this.#renderQuantity();
  }

  order() {
    this.close();
    this.#formMessage.show("Successfully ordered!");
  }

  #handleDocumentClick(event) {
    const addButton = event.target.closest(Cart.ADD_BUTTON_SELECTOR);
    if (!addButton) return;

    this.add(addButton.closest(Cart.CARD_SELECTOR));
  }

  #renderQuantity() {
    this.#ui.counter.textContent = this.#quantity;
  }
}

// ---------- Composition ----------

const grid = document.querySelector(".menu__grid");

const search = new MenuSearch({
  grid,
  input: document.querySelector(".menu__search-input"),
  button: document.querySelector(".menu__search-btn"),
});

const menu = new Menu({
  grid,
  tabs: document.querySelector(".menu__list"),
  repository: new MenuRepository("../data/menu.json"),
  renderer: new MenuCardRenderer(),
  search,
  favourites: new FavouritesStore(),
});

const cart = new Cart(formMessage);

search.init();
menu.init();
cart.init();