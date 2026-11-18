import { formMessage } from "./main.js";

// JoinUsForm
class JoinUsForm {
  static FORM_SELECTOR = ".form";
  static INVALID_CLASS = "__invalid";
  static FIELDS = {
    name: {
      message: "Enter your name (at least 2 letters).",
      isValid: (value) => /^[A-Za-zА-Яа-яЁё\s'-]{2,}$/.test(value),
    },
    surname: {
      message: "Enter your surname (at least 2 letters).",
      isValid: (value) => /^[A-Za-zА-Яа-яЁё\s'-]{2,}$/.test(value),
    },
    email: {
      message: "Enter a valid e-mail, e.g. name@example.com.",
      isValid: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value),
    },
    phone: {
      message: "Enter a valid phone number (at least 7 digits).",
      isValid: (value) =>
        /^\+?[\d\s()-]{7,}$/.test(value) && value.replace(/\D/g, "").length >= 7,
    },
  };

  #form;
  #formMessage;

  constructor(formMessage) {
    this.#form = document.querySelector(JoinUsForm.FORM_SELECTOR);
    this.#formMessage = formMessage;
  }

  init() {
    if (!this.#form) return;

    this.#form.addEventListener("submit", (event) => this.#handleSubmit(event));
    this.#form.addEventListener("input", (event) =>
      event.target.classList.remove(JoinUsForm.INVALID_CLASS)
    );
  }

  #handleSubmit(event) {
    event.preventDefault();

    const error = this.#validate();
    if (error) {
      this.#formMessage.show(error);
      return;
    }

    this.#form.reset();
    this.#formMessage.show("Form successfully submitted!");
  }

  #validate() {
    let firstError = null;

    for (const [id, rule] of Object.entries(JoinUsForm.FIELDS)) {
      const input = this.#form.querySelector(`#${id}`);
      if (!input) continue;

      const isValid = rule.isValid(input.value.trim());
      input.classList.toggle(JoinUsForm.INVALID_CLASS, !isValid);

      if (!isValid && !firstError) firstError = rule.message;
    }

    return firstError;
  }
}

new JoinUsForm(formMessage).init();
