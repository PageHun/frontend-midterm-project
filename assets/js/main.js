// Burger menu

const burgerMenu = document.querySelector(".burger-menu");

burgerMenu.addEventListener("click", () => {
  burgerMenu.classList.toggle("active");
  $(".mobile-menu").slideToggle(1000);
});

// Theme switcher

$(".theme-switcher").on("click", () => {
  switchTheme();
});

function switchTheme() {
  $(".theme-switcher__button").toggleClass("__active");
  $(".wrapper").toggleClass("white-theme");
}

// Message

const footerSubmitBtn = $(".footer__form-submit");
const footerInput = $(".footer__form-text");
const footerFormLabel = $(".footer__form-label span");
const formMessage = $(".form-message");

export const showFormMessage = (text) => {
  formMessage
    .html(text)
    .fadeIn(1000)
    .delay(2000)
    .animate({ right: "-500px" }, 2000)
    .fadeOut()
    .animate({ right: "30px" });
};

footerSubmitBtn.on("click", (event) => {
  event.preventDefault();

  if (!footerInput.val().length) {
    showFormMessage("Newsletter is empty! </br> Fill out the newsletter.");
  } else {
    showFormMessage("Newsletter successfully sent.");
  }
});

footerInput.on("keyup", () => {
  footerFormLabel.html(footerInput.val().length);
});