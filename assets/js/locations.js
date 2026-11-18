// locations.js
// Секция #locations: карта первой локации (Google Maps JavaScript API).
//
// Что нужно заполнить перед запуском (Google Cloud Console):
//   1. APIs & Services -> Library -> включить "Maps JavaScript API".
//   2. Billing -> привязать платёжный аккаунт (у Google есть бесплатный лимит в месяц).
//   3. Credentials -> создать API key и ограничить его по HTTP referrer (ваш домен + localhost).
const CONFIG = {
  // Ключ доступа. Ограничьте его по HTTP referrer в Google Cloud Console.
  apiKey: "AIzaSyCrx0pJ3QGeUyXi4ai1c2eQsdMxqUoWm5U",
  // Координаты локации №1 из таблицы (строка с адресом "2848 Water St., ...").
  firstLocation: { lat: 43.249973, lng: 76.9462023 },
  zoom: 15,
};

// ---------- GoogleMapsLoader ----------
// Подключает скрипт Google Maps API и отдаёт промис готовности google.maps.

class GoogleMapsLoader {
  static CALLBACK_NAME = "__googleMapsReady";
  static SCRIPT_URL = "https://maps.googleapis.com/maps/api/js";

  #apiKey;

  constructor(apiKey) {
    this.#apiKey = apiKey;
  }

  load() {
    if (window.google?.maps) return Promise.resolve();

    return new Promise((resolve, reject) => {
      window[GoogleMapsLoader.CALLBACK_NAME] = resolve;

      const script = document.createElement("script");
      script.src = `${GoogleMapsLoader.SCRIPT_URL}?key=${this.#apiKey}&loading=async&callback=${GoogleMapsLoader.CALLBACK_NAME}`;
      script.async = true;
      script.onerror = () => reject(new Error("Скрипт Google Maps API не загрузился"));
      document.head.append(script);
    });
  }
}

// ---------- LocationsMap ----------
// Карта с меткой первой локации.

class LocationsMap {
  #element;
  #location;
  #zoom;

  constructor(element, location, zoom) {
    this.#element = element;
    this.#location = location;
    this.#zoom = zoom;
  }

  render() {
    const map = new google.maps.Map(this.#element, {
      center: this.#location,
      zoom: this.#zoom,
      mapTypeControl: false,
      streetViewControl: false,
    });

    // google.maps.Marker устарел, но работает без Map ID.
    // Для своего пина создайте Map ID и замените на AdvancedMarkerElement.
    new google.maps.Marker({
      position: this.#location,
      map,
      title: "Burger Heaven — location 1",
    });

    return map;
  }
}

// ---------- Locations ----------
// Находит контейнер секции и рисует карту.

class Locations {
  static SELECTOR = "#locations-map";

  #config;

  constructor(config) {
    this.#config = config;
  }

  init() {
    const mapElement = document.querySelector(Locations.SELECTOR);
    if (!mapElement) return;

    if (!this.#config.apiKey) {
      mapElement.innerHTML =
        '<p class="locations__hint">Google API key не задан: заполните CONFIG.apiKey в assets/js/locations.js</p>';
      return;
    }

    new GoogleMapsLoader(this.#config.apiKey)
      .load()
      .then(() => {
        new LocationsMap(mapElement, this.#config.firstLocation, this.#config.zoom).render();
      })
      .catch((error) => {
        console.error(error);
        mapElement.innerHTML =
          '<p class="locations__hint">Не удалось загрузить карту Google. Проверьте API key, billing и HTTP referrer.</p>';
      });
  }
}

new Locations(CONFIG).init();
