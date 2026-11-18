import { formMessage } from "./main.js";

// FormField

class FormField {
  #$input;
  #$feedback;
  #rule;

  constructor($input, rule) {
    this.#$input = $input;
    this.#rule = rule;
    this.#$feedback = $('<div class="feedback"></div>').insertAfter($input);
  }

  init() {
    this.#$input.on("input", () => this.validate());
  }

  validate() {
    const error = this.#rule(this.#$input.val().trim());
    this.#render(error);
    return !error;
  }

  reset() {
    this.#$input.removeClass("is-valid is-invalid");
    this.#$feedback.text("").removeClass("feedback-valid feedback-invalid");
  }

  #render(error) {
    this.#$input
      .toggleClass("is-valid", !error)
      .toggleClass("is-invalid", !!error);

    this.#$feedback
      .text(error || "Looks good!")
      .toggleClass("feedback-valid", !error)
      .toggleClass("feedback-invalid", !!error);
  }
}

// SignupForm

class SignupForm {
  static RULES = {
    name: (value) => (value.length >= 2 ? "" : "Name must be at least 2 characters."),
    surname: (value) => (value.length >= 2 ? "" : "Surname must be at least 2 characters."),
    email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? "" : "Enter a valid e-mail."),
    phone: (value) =>
      /^\+?\d{10,15}$/.test(value.replace(/[\s()-]/g, "")) ? "" : "Enter a valid phone number.",
  };

  static SUCCESS_MESSAGE = "Thank you for join us! Wait some news from us! <br> Good luck!";

  #$form;
  #fields;
  #formMessage;

  constructor(formSelector, formMessage) {
    this.#formMessage = formMessage;
    this.#$form = $(formSelector);
    this.#$form.attr("novalidate", true);

    this.#fields = this.#$form
      .find("input")
      .toArray()
      .filter((input) => SignupForm.RULES[input.id])
      .map((input) => new FormField($(input), SignupForm.RULES[input.id]));
  }

  init() {
    this.#fields.forEach((field) => field.init());
    this.#$form.on("submit", (event) => this.#handleSubmit(event));
  }

  isValid() {
    return this.#fields.map((field) => field.validate()).every(Boolean);
  }

  #handleSubmit(event) {
    event.preventDefault();
    if (!this.isValid()) return;

    this.#reset();
    this.#formMessage.show(SignupForm.SUCCESS_MESSAGE);
  }

  #reset() {
    this.#$form[0].reset();
    this.#fields.forEach((field) => field.reset());
  }
}

new SignupForm(".form", formMessage).init();
