// menu.js
import { formMessage } from "./main.js";
import { CART_ICON } from "./icons.js";
import { FAVOURITE_ICON } from "./icons.js";

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

  // Названия категорий без "Favourite" — из них строятся вкладки фильтра.
  async getCategoryNames() {
    const data = await this.#load();
    if (!data) return null;

    return data.categories
      .filter((category) => category.name !== Menu.FAVOURITE_CATEGORY)
      .map((category) => category.name);
  }

  // Блюда из избранного. При filterCategory === "All" возвращает все категории.
  async getFavouriteItems(keys, filterCategory) {
    const data = await this.#load();
    if (!data) return null;

    return data.categories
      .filter((category) => category.name !== Menu.FAVOURITE_CATEGORY)
      .filter(
        (category) =>
          filterCategory === Menu.ALL_FILTER || category.name === filterCategory
      )
      .flatMap((category) => category.items)
      .filter((item) => keys.includes(FavouritesStore.keyOf(item)));
  }

  // Синхронизирует список favourite в данных menu.json с избранным.
  async syncFavourites(categoryName, keys) {
    const data = await this.#load();
    if (!data) return;

    const favouriteCategory = data.categories.find((c) => c.name === categoryName);
    if (!favouriteCategory) return;

    favouriteCategory.items = data.categories
      .filter((c) => c !== favouriteCategory)
      .flatMap((c) => c.items)
      .filter((item) => keys.includes(FavouritesStore.keyOf(item)));
  }
}

// ---------- MenuCardRenderer ----------
// Отвечает только за HTML карточки.

class MenuCardRenderer {
  #favourites;

  constructor(favourites) {
    this.#favourites = favourites;
  }

  render(item) {
    const key = FavouritesStore.keyOf(item);
    // Блюдо из избранного: иконка сердечка становится темнее через класс active.
    const activeClass = this.#favourites.has(key) ? ` ${Menu.FAVOURITE_CLASS}` : "";

    return `
      <div class="menu__grid-item" data-id="${key}" style="background-image: url(${item.imgSource});">
        <div class="menu__top">
          <button class="menu__favourite${activeClass}" type="button"
            aria-label="Toggle favourite" aria-pressed="${this.#favourites.has(key)}">
            ${FAVOURITE_ICON}
          </button>
        </div>
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

  keys() {
    return [...this.#keys];
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

// ---------- Menu ----------
// Вкладки категорий + отрисовка сетки. Все зависимости приходят через конструктор.

class Menu {
  static ACTIVE_TAB_CLASS = "__active-tab";
  // Должно совпадать с названием категории избранного в menu.json.
  static FAVOURITE_CATEGORY = "Favourite";
  // Первая вкладка фильтра внутри избранного: показывает все блюда.
  static ALL_FILTER = "All";
  static FILTER_ACTIVE_CLASS = "__active-filter";
  // Класс, который делает иконку сердечка темнее.
  static FAVOURITE_CLASS = "active";
  static CARD_SELECTOR = ".menu__grid-item";
  static FAVOURITE_SELECTOR = ".menu__favourite";
  static FILTER_SELECTOR = ".menu__filter";

  #grid;
  #tabs;
  #filters;
  #repository;
  #renderer;
  #search;
  #favourites;
  // Текущая вкладка фильтра внутри избранного.
  #filterCategory = Menu.ALL_FILTER;

  constructor({ grid, tabs, filters, repository, renderer, search, favourites }) {
    this.#grid = grid;
    this.#tabs = tabs;
    this.#filters = filters;
    this.#repository = repository;
    this.#renderer = renderer;
    this.#search = search;
    this.#favourites = favourites;
  }

  init() {
    this.#tabs.addEventListener("click", (event) => this.#handleTabClick(event));
    this.#filters.addEventListener("click", (event) => this.#handleFilterClick(event));
    // Делегируем документу: такие же карточки появляются в корзине вне сетки меню.
    document.addEventListener("click", (event) => this.#handleFavouriteClick(event));
    this.showCategory(this.#activeCategory);
  }

  async showCategory(categoryName) {
    await this.#renderFilters(categoryName);

    let items;
    if (categoryName === Menu.FAVOURITE_CATEGORY) {
      await this.#syncFavourites();
      items = await this.#repository.getFavouriteItems(
        this.#favourites.keys(),
        this.#filterCategory
      );
    } else {
      items = await this.#repository.getItems(categoryName);
    }
    if (!items) return;

    this.#grid
      .querySelectorAll(Menu.CARD_SELECTOR)
      .forEach((element) => element.remove());

    this.#grid.insertAdjacentHTML(
      "beforeend",
      items.map((item) => this.#renderer.render(item)).join("")
    );

    this.#search.apply();
  }

  // Вкладки фильтра показываются только внутри избранного.
  async #renderFilters(categoryName) {
    if (categoryName !== Menu.FAVOURITE_CATEGORY) {
      this.#filters.hidden = true;
      this.#filters.innerHTML = "";
      return;
    }

    const categories = await this.#repository.getCategoryNames();
    if (!categories) return;

    this.#filters.hidden = false;
    this.#filters.innerHTML = [Menu.ALL_FILTER, ...categories]
      .map((name) => {
        const activeClass =
          name === this.#filterCategory ? ` ${Menu.FILTER_ACTIVE_CLASS}` : "";
        return `<button class="menu__filter${activeClass}" type="button" data-category="${name}">${name}</button>`;
      })
      .join("");
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

    const categoryName = tab.textContent.trim();
    // При входе в избранное фильтр всегда начинается с "All".
    if (categoryName === Menu.FAVOURITE_CATEGORY) {
      this.#filterCategory = Menu.ALL_FILTER;
    }

    this.showCategory(categoryName);
  }

  #handleFilterClick(event) {
    const button = event.target.closest(Menu.FILTER_SELECTOR);
    if (!button || button.dataset.category === this.#filterCategory) return;

    this.#filterCategory = button.dataset.category;
    this.showCategory(Menu.FAVOURITE_CATEGORY);
  }

  // Клик по сердечку добавляет блюдо в избранное (или убирает его).
  async #handleFavouriteClick(event) {
    const button = event.target.closest(Menu.FAVOURITE_SELECTOR);
    if (!button) return;

    const card = button.closest(Menu.CARD_SELECTOR);
    if (!card) return;

    const isFavourite = this.#favourites.toggle(card.dataset.id);
    // Синхронизируем исходную карточку и её копию в корзине.
    document.querySelectorAll(Menu.CARD_SELECTOR).forEach((item) => {
      if (item.dataset.id !== card.dataset.id) return;
      const favouriteButton = item.querySelector(Menu.FAVOURITE_SELECTOR);
      if (!favouriteButton) return;
      favouriteButton.classList.toggle(Menu.FAVOURITE_CLASS, isFavourite);
      favouriteButton.setAttribute("aria-pressed", String(isFavourite));
    });

    await this.#syncFavourites();

    // На вкладке избранного список нужно перестроить.
    if (this.#activeCategory === Menu.FAVOURITE_CATEGORY) {
      this.showCategory(Menu.FAVOURITE_CATEGORY);
    }
  }

  #syncFavourites() {
    return this.#repository.syncFavourites(
      Menu.FAVOURITE_CATEGORY,
      this.#favourites.keys()
    );
  }
}

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

const grid = document.querySelector(".menu__grid");

const search = new MenuSearch({
  grid,
  input: document.querySelector(".menu__search-input"),
  button: document.querySelector(".menu__search-btn"),
});

const favourites = new FavouritesStore();

const menu = new Menu({
  grid,
  tabs: document.querySelector(".menu__list"),
  filters: document.querySelector(".menu__filters"),
  repository: new MenuRepository("../data/menu.json"),
  renderer: new MenuCardRenderer(favourites),
  search,
  favourites,
});

const cart = new Cart(formMessage);

search.init();
menu.init();
cart.init();
