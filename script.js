/* =========================================================
   Weather Dashboard — script.js
   Vanilla JS. No dependencies.
   All temperatures live in the DOM as Celsius (data-temp)
   and are formatted at render time by renderTemperatures().
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

  const GLYPH_BY_CONDITION = {
    Clear: "☀️",
    Clouds: "☁️",
    Rain: "🌧️",
    Drizzle: "🌦️",
    Thunderstorm: "⛈️",
    Snow: "❄️",
    Mist: "🌫️",
    Fog: "🌫️",
    Haze: "🌫️",
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

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  applyTheme(prefersDark.matches ? "dark" : "light");
  prefersDark.addEventListener("change", (event) => {
    if (!themeChosenByUser) applyTheme(event.matches ? "dark" : "light");
  });

  /* ---------------------------------------------------------
     Weather API (Netlify function -> OpenWeatherMap)
     --------------------------------------------------------- */
  async function fetchWeather(city) {
    const response = await fetch(
      `/.netlify/functions/weather?city=${encodeURIComponent(city)}`,
    );

    const data = await response.json();

    const upstreamCode = data?.current?.cod;
    if (!response.ok || upstreamCode == 404 || upstreamCode == 400) {
      throw new Error(data?.current?.message || data?.error || "City not found");
    }

    return data; // { current, forecast }
  }

  /* Small time/unit helpers shared by the highlight, hourly and
     forecast renderers. The API gives Unix timestamps in UTC plus a
     timezone offset (seconds) for the searched city — we apply that
     offset ourselves so times shown are the CITY's local time, not
     the visitor's. */
  function formatCityTime(unixSeconds, tzOffsetSeconds) {
    const date = new Date((unixSeconds + tzOffsetSeconds) * 1000);
    let hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  }

  function formatCityHour24(unixSeconds, tzOffsetSeconds) {
    const date = new Date((unixSeconds + tzOffsetSeconds) * 1000);
    return String(date.getUTCHours()).padStart(2, "0") + ":00";
  }

  function cityDateKey(unixSeconds, tzOffsetSeconds) {
    const date = new Date((unixSeconds + tzOffsetSeconds) * 1000);
    return date.toISOString().slice(0, 10); // YYYY-MM-DD in city-local terms
  }

  const msToKmh = (metersPerSecond) => Math.round(metersPerSecond * 3.6 * 10) / 10;

  /* ---------------------------------------------------------
     Live clock (visitor's own local time, top bar)
     --------------------------------------------------------- */
  const clockDay = $("#clockDay");
  const clockTime = $("#clockTime");

  function renderClock() {
    const now = new Date();
    clockDay.textContent = now.toLocaleDateString(undefined, { weekday: "long" });
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
     Current weather card
     --------------------------------------------------------- */
  const currentDay = $("#currentDay");
  const currentDate = $("#currentDate");
  const currentGlyph = $("#currentGlyph");
  const currentCondition = $("#currentCondition");
  const currentTemp = $(".current__temp");
  const currentLow = $(".current__temp-low");
  const currentFeels = $(".current__feels [data-temp]");

  function updateWeatherUI(current) {
    currentTemp.dataset.temp = current.main.temp;
    currentLow.dataset.temp = current.main.temp_min;
    currentFeels.dataset.temp = current.main.feels_like;

    currentCondition.textContent = current.weather[0].description;
    currentGlyph.textContent = GLYPH_BY_CONDITION[current.weather[0].main] || "🌤️";
    currentGlyph.setAttribute("aria-label", current.weather[0].description);

    const now = new Date((current.dt + current.timezone) * 1000);
    currentDay.textContent = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    currentDate.textContent = now.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

    renderTemperatures();
  }

  /* ---------------------------------------------------------
     Today's Highlight — all fields come from the "current
     weather" response, no extra API call needed. UV Index is
     left as-is: OpenWeatherMap only exposes it through the
     paid One Call subscription, so it's out of scope for now.
     --------------------------------------------------------- */
  const windValue = $("#windValue");
  const windNote = $("#windNote");
  const humidityValue = $("#humidityValue");
  const humidityNote = $("#humidityNote");
  const sunriseValue = $("#sunriseValue");
  const sunsetValue = $("#sunsetValue");
  const visibilityValue = $("#visibilityValue");
  const visibilityNote = $("#visibilityNote");

  function humidityLabel(percent) {
    if (percent < 30) return "Humidity is low";
    if (percent < 60) return "Humidity is good";
    return "Humidity is high";
  }

  function updateHighlights(current) {
    const tz = current.timezone;

    windValue.innerHTML = `${msToKmh(current.wind.speed)}<span class="tile__unit">km/h</span>`;
    windNote.textContent = formatCityTime(current.dt, tz);

    humidityValue.innerHTML = `${current.main.humidity}<span class="tile__unit">%</span>`;
    humidityNote.textContent = humidityLabel(current.main.humidity);

    sunriseValue.textContent = formatCityTime(current.sys.sunrise, tz);
    sunsetValue.textContent = formatCityTime(current.sys.sunset, tz);

    const visibilityKm = Math.round((current.visibility ?? 10000) / 100) / 10;
    visibilityValue.innerHTML = `${visibilityKm}<span class="tile__unit">km</span>`;
    visibilityNote.textContent = formatCityTime(current.dt, tz);
  }

  /* ---------------------------------------------------------
     Hourly forecast — the free plan only gives 3-hour steps,
     so we show the next five slots from that list as "hourly".
     --------------------------------------------------------- */
  const hourlyList = $("#hourlyList");

  function buildHourlyItem(entry, tz) {
    const li = document.createElement("li");
    const hour = new Date((entry.dt + tz) * 1000).getUTCHours();
    // Daytime window (06:00–19:00 local) reads warm/orange, the rest
    // of the night reads cool/purple — independent of temperature.
    const isDaytime = hour >= 6 && hour < 19;
    li.className = `hour ${isDaytime ? "hour--warm" : "hour--cool"}`;

    const glyph = GLYPH_BY_CONDITION[entry.weather[0].main] || "🌤️";
    const rotation = entry.wind?.deg ?? 0;

    li.innerHTML = `
      <p class="hour__time">${formatCityHour24(entry.dt, tz)}</p>
      <span class="hour__glyph" role="img" aria-label="${entry.weather[0].description}">${glyph}</span>
      <p class="hour__temp" data-temp="${entry.main.temp}" data-temp-style="unit"></p>
      <svg class="hour__arrow" style="--rot:${rotation}deg" aria-hidden="true"><use href="#i-arrow"></use></svg>
      <p class="hour__wind">${msToKmh(entry.wind?.speed ?? 0)}km/h</p>
    `;
    return li;
  }

  function updateHourly(forecast) {
    const tz = forecast.city.timezone;
    const nextSlots = forecast.list.slice(0, 5);

    hourlyList.innerHTML = "";
    nextSlots.forEach((entry) => {
      hourlyList.appendChild(buildHourlyItem(entry, tz));
    });
    renderTemperatures(hourlyList);
  }

  /* ---------------------------------------------------------
     Multi-day forecast — grouped from the 5 day / 3 hour list.
     The free plan tops out at 5 real days, so that's what we
     show instead of the original 10 placeholder days.
     --------------------------------------------------------- */
  const forecastList = $("#forecastList");

  function groupByCityDay(forecast) {
    const tz = forecast.city.timezone;
    const days = new Map();

    forecast.list.forEach((entry) => {
      const key = cityDateKey(entry.dt, tz);
      if (!days.has(key)) days.set(key, []);
      days.get(key).push(entry);
    });

    return Array.from(days.entries()).map(([key, entries]) => {
      const temps = entries.map((e) => e.main.temp);
      // Prefer the entry closest to local noon to represent the day's icon.
      const midday = entries.reduce((best, e) => {
        const hour = new Date((e.dt + tz) * 1000).getUTCHours();
        const bestHour = new Date((best.dt + tz) * 1000).getUTCHours();
        return Math.abs(hour - 12) < Math.abs(bestHour - 12) ? e : best;
      });

      return {
        key,
        date: new Date((midday.dt + tz) * 1000),
        high: Math.max(...temps),
        low: Math.min(...temps),
        feels: midday.main.feels_like,
        condition: midday.weather[0].description,
        glyph: GLYPH_BY_CONDITION[midday.weather[0].main] || "🌤️",
      };
    });
  }

  function buildDayButton(day, index) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.className = "day" + (index === 0 ? " is-selected" : "");
    button.type = "button";
    button.setAttribute("aria-current", String(index === 0));
    button.dataset.condition = day.condition;
    button.dataset.glyph = day.glyph;
    button.dataset.feels = day.feels;
    button.dataset.low = day.low;
    button.dataset.day = index === 0 ? "Today" : day.date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    button.dataset.date = day.date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

    button.innerHTML = `
      <span class="day__name">${index === 0 ? "Today" : day.date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}</span>
      <span class="day__glyph" role="img" aria-label="${day.condition}">${day.glyph}</span>
      <span class="day__temp" data-temp="${day.high}" data-temp-style="unit"></span>
    `;
    li.appendChild(button);
    return li;
  }

  function selectForecastDay(button) {
    $$(".day", forecastList).forEach((other) => {
      other.classList.toggle("is-selected", other === button);
      other.setAttribute("aria-current", String(other === button));
    });

    const data = button.dataset;
    currentDay.textContent = data.day;
    currentDate.textContent = data.date;
    currentGlyph.textContent = data.glyph;
    currentGlyph.setAttribute("aria-label", data.condition);
    currentCondition.textContent = data.condition;
    currentTemp.dataset.temp = $(".day__temp", button).dataset.temp;
    currentLow.dataset.temp = data.low;
    currentFeels.dataset.temp = data.feels;

    renderTemperatures();
  }

  // Event delegation: works for the original static days AND for the
  // days we rebuild after every search.
  forecastList.addEventListener("click", (event) => {
    const button = event.target.closest(".day");
    if (button) selectForecastDay(button);
  });

  function updateForecast(forecast) {
    const days = groupByCityDay(forecast).slice(0, 5);

    forecastList.innerHTML = "";
    days.forEach((day, index) => {
      forecastList.appendChild(buildDayButton(day, index));
    });
    renderTemperatures(forecastList);
  }

  /* Horizontal scrolling with a vertical wheel / trackpad. */
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
     Location search
     --------------------------------------------------------- */
  const searchForm = $("#searchForm");
  const searchInput = $("#searchInput");
  const locationName = $("#locationName");

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    searchInput.disabled = true;

    try {
      const { current, forecast } = await fetchWeather(query);

      state.location = current.name;
      locationName.textContent = `${current.name}, ${current.sys.country}`;

      updateWeatherUI(current);
      updateHighlights(current);
      updateHourly(forecast);
      updateForecast(forecast);
    } catch (error) {
      locationName.textContent = "شهر پیدا نشد";
      console.error("Weather fetch failed:", error.message);
    } finally {
      searchInput.disabled = false;
      searchInput.value = "";
      searchInput.blur();
    }
  });

  /* ---------------------------------------------------------
     First paint
     --------------------------------------------------------- */
  renderTemperatures();
})();
