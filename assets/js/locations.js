const CONFIG = {
  apiKey: "AIzaSyCrx0pJ3QGeUyXi4ai1c2eQsdMxqUoWm5U",
  firstLocation: { lat: 43.249973, lng: 76.9462023 },
  zoom: 15,
};

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

    new google.maps.Marker({
      position: this.#location,
      map,
      title: "Burger Heaven — location 1",
    });

    return map;
  }
}

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
