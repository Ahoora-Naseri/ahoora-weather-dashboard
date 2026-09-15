/* =========================================================
   Weather Dashboard — script.js
   Vanilla JS. No dependencies, no API yet.
   All temperatures live in the DOM as Celsius (data-temp)
   and are formatted at render time, so swapping in a real
   API later only means replacing `state` + `renderAll()`.
   ========================================================= */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    theme: "light",
    unit: "c",
    location: "Dhaka, Bangladesh",
  };

  /* ---------------------------------------------------------
     Theme
     --------------------------------------------------------- */
  const themeToggle = $("#themeToggle");

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
    );
  }

  let themeChosenByUser = false;

  themeToggle.addEventListener("click", () => {
    themeChosenByUser = true;
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });

  /* Start from the visitor's system preference, but stop following it
     once they have picked a theme themselves. */
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  applyTheme(prefersDark.matches ? "dark" : "light");
  prefersDark.addEventListener("change", (event) => {
    if (!themeChosenByUser) applyTheme(event.matches ? "dark" : "light");
  });

  /*=============================================*/

  async function fetchWeather(city) {
    try {
      const response = await fetch(
        `/.netlify/functions/functions?city=${city}`,
      );

      const data = await response.json();

      if (data.cod !== 200) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      console.error("Weather API Error:", error);
      return null;
    }
  }
  /* ---------------------------------------------------------
     Live clock
     --------------------------------------------------------- */
  const clockDay = $("#clockDay");
  const clockTime = $("#clockTime");

  function renderClock() {
    const now = new Date();
    clockDay.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
    });
    clockTime.textContent = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  renderClock();
  setInterval(renderClock, 1000 * 15);

  /* ---------------------------------------------------------
     Temperature units
     --------------------------------------------------------- */
  const unitButton = $("#unitButton");
  const unitMenu = $("#unitMenu");
  const unitLabel = $("#unitLabel");

  const toF = (c) => Math.round((c * 9) / 5 + 32);

  function formatTemp(celsius, style) {
    const value = state.unit === "f" ? toF(celsius) : Math.round(celsius);
    const symbol = state.unit === "f" ? "°F" : "°C";

    if (style === "slash") return "/" + value + symbol;
    if (style === "bare") return value + "°";
    return value + symbol;
  }

  function renderTemperatures(root = document) {
    $$("[data-temp]", root).forEach((el) => {
      const celsius = Number(el.dataset.temp);
      el.textContent = formatTemp(celsius, el.dataset.tempStyle);
    });
    unitLabel.textContent = state.unit === "f" ? "°F" : "°C";
  }

  function openUnitMenu(open) {
    unitMenu.hidden = !open;
    unitButton.setAttribute("aria-expanded", String(open));
  }

  unitButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openUnitMenu(unitMenu.hidden);
  });

  unitMenu.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-unit]");
    if (!choice) return;

    state.unit = choice.dataset.unit;
    $$("[role='option']", unitMenu).forEach((option) => {
      option.setAttribute(
        "aria-selected",
        String($("[data-unit]", option).dataset.unit === state.unit),
      );
    });
    renderTemperatures();
    openUnitMenu(false);
    unitButton.focus();
  });

  document.addEventListener("click", () => openUnitMenu(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") openUnitMenu(false);
  });

  /* ---------------------------------------------------------
     Location search (placeholder data until an API is wired up)
     --------------------------------------------------------- */
  const searchForm = $("#searchForm");
  const searchInput = $("#searchInput");
  const locationName = $("#locationName");

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    const weatherData = await fetchWeather(query);

    if (weatherData) {
      state.location = weatherData.name;

      locationName.textContent = weatherData.name;

      updateWeatherUI(weatherData);
    }
    searchInput.value = "";
    searchInput.blur();
  });

  /* ---------------------------------------------------------
     10 day forecast — selecting a day updates the main card
     --------------------------------------------------------- */
  const currentDay = $("#currentDay");
  const currentDate = $("#currentDate");
  const currentGlyph = $("#currentGlyph");
  const currentCondition = $("#currentCondition");
  const currentTemp = $(".current__temp");
  const currentLow = $(".current__temp-low");
  const currentFeels = $(".current__feels [data-temp]");

  function updateWeatherUI(data) {
    const temp = Math.round(data.main.temp);

    currentTemp.textContent = temp + "°";

    currentCondition.textContent = data.weather[0].description;
  }

  $$(".day").forEach((day) => {
    day.addEventListener("click", () => {
      $$(".day").forEach((other) => {
        other.classList.toggle("is-selected", other === day);
        other.setAttribute("aria-current", String(other === day));
      });

      const data = day.dataset;
      currentDay.textContent = data.day;
      currentDate.textContent = data.date;
      currentGlyph.textContent = data.glyph;
      currentGlyph.setAttribute("aria-label", data.condition);
      currentCondition.textContent = data.condition;
      currentTemp.dataset.temp = $(".day__temp", day).dataset.temp;
      currentLow.dataset.temp = data.low;
      currentFeels.dataset.temp = data.feels;

      renderTemperatures();
    });
  });

  /* Horizontal scrolling with a vertical wheel / trackpad. */
  const forecastList = $("#forecastList");
  forecastList.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      forecastList.scrollLeft += event.deltaY;
    },
    { passive: false },
  );

  /* ---------------------------------------------------------
     First paint
     --------------------------------------------------------- */
  renderTemperatures();
})();
