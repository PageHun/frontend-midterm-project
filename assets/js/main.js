// main.js
// Общие компоненты страницы. Каждый компонент — отдельный класс
// со своим состоянием (приватные поля #) и публичным интерфейсом.

// ---------- Burger menu ----------

class BurgerMenu {
  #button;
  #$menu;
  #duration;

  constructor(buttonSelector, menuSelector, duration = 1000) {
    this.#button = document.querySelector(buttonSelector);
    this.#$menu = $(menuSelector);
    this.#duration = duration;
  }

  init() {
    if (!this.#button) return;
    this.#button.addEventListener("click", () => this.toggle());
  }

  toggle() {
    this.#button.classList.toggle("active");
    this.#$menu.slideToggle(this.#duration);
  }
}

// ---------- Theme switcher ----------

class ThemeSwitcher {
  static ACTIVE_CLASS = "__active";
  static LIGHT_THEME_CLASS = "white-theme";
  static STORAGE_KEY = "theme";

  #$trigger;
  #$indicator;
  #$target;
  #isLight = false;

  constructor({ trigger, indicator, target }) {
    this.#$trigger = $(trigger);
    this.#$indicator = $(indicator);
    this.#$target = $(target);
  }

  init() {
    // Начальное состояние берём из разметки, затем применяем сохранённое.
    this.#isLight = this.#$target.hasClass(ThemeSwitcher.LIGHT_THEME_CLASS);

    const saved = this.#readSavedTheme();
    if (saved) this.#apply(saved === "light");

    this.#$trigger.on("click", () => this.toggle());
  }

  toggle() {
    this.#apply(!this.#isLight);
    this.#saveTheme();
  }

  // Единственное место, которое меняет классы. Если тема уже такая же, ничего не делает.
  // Индикаторов может быть несколько (кнопки light и dark) и у каждого своё состояние
  // класса, поэтому их нужно ПЕРЕКЛЮЧАТЬ, а не приводить к одному и тому же значению.
  #apply(isLight) {
    if (isLight === this.#isLight) return;

    this.#isLight = isLight;
    this.#$indicator.toggleClass(ThemeSwitcher.ACTIVE_CLASS);
    this.#$target.toggleClass(ThemeSwitcher.LIGHT_THEME_CLASS, isLight);
  }

  // localStorage может быть недоступен (приватный режим, запрет в настройках),
  // поэтому обращения к нему обёрнуты в try/catch.
  #readSavedTheme() {
    try {
      return localStorage.getItem(ThemeSwitcher.STORAGE_KEY);
    } catch {
      return null;
    }
  }

  #saveTheme() {
    try {
      localStorage.setItem(ThemeSwitcher.STORAGE_KEY, this.#isLight ? "light" : "dark");
    } catch {
      // Не удалось сохранить: тема просто не запомнится после перезагрузки.
    }
  }
}

// ---------- Message (toast) ----------
// Назвал FormMessage, чтобы не перекрывать глобальный браузерный Notification.

export class FormMessage {
  #$element;
  #isShowing = false;

  constructor(selector) {
    this.#$element = $(selector);
  }

  show(text) {
    if (this.#isShowing) return;
    this.#isShowing = true;

    this.#$element
      .html(text)
      .fadeIn(1000)
      .delay(2000)
      .animate({ right: "-500px" }, 2000)
      .fadeOut()
      .animate({ right: "30px" }, () => {
        this.#isShowing = false;
      });
  }
}

// ---------- Footer newsletter ----------

class NewsletterForm {
  static EMPTY_MESSAGE = "Newsletter is empty! </br> Fill out the newsletter.";
  static SUCCESS_MESSAGE = "Newsletter successfully sent.";

  #$submit;
  #$input;
  #$counter;
  #formMessage;

  // formMessage передаём снаружи (dependency injection),
  // поэтому класс не зависит от конкретного экземпляра.
  constructor(formMessage) {
    this.#formMessage = formMessage;
    this.#$submit = $(".footer__form-submit");
    this.#$input = $(".footer__form-text");
    this.#$counter = $(".footer__form-label span");
  }

  init() {
    this.#$submit.on("click", (event) => this.#handleSubmit(event));
    this.#$input.on("keyup", () => this.#updateCounter());
  }

  #handleSubmit(event) {
    event.preventDefault();

    const isEmpty = !this.#$input.val().length;
    this.#formMessage.show(
      isEmpty ? NewsletterForm.EMPTY_MESSAGE : NewsletterForm.SUCCESS_MESSAGE
    );
  }

  #updateCounter() {
    this.#$counter.html(this.#$input.val().length);
  }
}

// ---------- Composition ----------
// Единственное место, где создаются объекты и связываются друг с другом.

export const formMessage = new FormMessage(".form-message");

new BurgerMenu(".burger-menu", ".mobile-menu").init();

new ThemeSwitcher({
  trigger: ".theme-switcher",
  indicator: ".theme-switcher__button",
  target: ".wrapper",
}).init();

new NewsletterForm(formMessage).init();