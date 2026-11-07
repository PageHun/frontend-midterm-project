const $form = $(".form");
const $inputs = $form.find("input");

$form.attr("novalidate", true);

const checks = {
  name: (value) => value.length >= 2 ? "" : "Name must be at least 2 characters.",
  surname: (value) => value.length >= 2 ? "" : "Surname must be at least 2 characters.",
  email: (value) => /^\S+@\S+\.\S+$/.test(value) ? "" : "Enter a valid e-mail.",
  phone: (value) => /^\+?\d{10,15}$/.test(value.replace(/[\s()-]/g, "")) ? "" : "Enter a valid phone number."
};

$inputs.after(`<div class="feedback"></div>`);

function validate($input) {
  const error = checks[$input.attr("id")]($input.val().trim());
  const $feedback = $input.next(".feedback");

  $input
    .toggleClass("is-valid", !error)
    .toggleClass("is-invalid", !!error);

  $feedback
    .text(error || "Looks good!")
    .toggleClass("feedback-valid", !error)
    .toggleClass("feedback-invalid", !!error);

  return !error;
}

$inputs.on("input", function () {
  validate($(this));
});

$form.on("submit", function (event) {
  event.preventDefault();

  const results = $inputs.map(function () {
    return validate($(this));
  }).get();

  if (results.includes(false)) return;

  this.reset();
  $inputs.removeClass("is-valid is-invalid");
  $(".feedback").text("").removeClass("feedback-valid feedback-invalid");
});