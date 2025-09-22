import { WeatherBackground } from './classWeatherBackground.js'


const html = document.documentElement;
const input = document.getElementById('cityInput');
const listbox = document.getElementById('cityListbox');
const statusEl = document.getElementById('liveStatus');
const geoLocBtn = document.getElementById('geoloc-btn');
const titleEl = document.getElementById('appTitle');
const searchBtn = document.getElementById('search-btn');
const searchForm = document.getElementById('searchForm');
const cityName = document.getElementById('cityName');
const temperature = document.getElementById('temperature');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const description = document.getElementById('description');
const tempValue = document.getElementById('tempValue');
const humidityValue = document.getElementById('humidityValue');
const windSpeedValue = document.getElementById('windSpeedValue');
const descriptionValue = document.getElementById('descriptionValue');
const weatherIcon = document.getElementById('weatherIcon');
const forecastTitle = document.getElementById('forecastTitle');
const forecastContainer = document.getElementById('forecastContainer');
const btnUk = document.getElementById('lang-uk-btn');
const btnEn = document.getElementById('lang-en-btn');


const scene = document.getElementById('weather-scene');


//variables
let activeIndex = -1; // індекс активного елемента
let cache = new Map(); // простенький кеш на основі Map
let abortCtrl = null; // простий контроллер переривання
let lang = 'en';
let WeatherCode = 0; // код погоди
let lastREQ = { lat: null, lon: null, data: null, label: null };

const WMO = {
    0: { en: 'Clear sky', uk: 'Ясно' },
    1: { en: 'Mainly clear', uk: 'Переважно ясно' },
    2: { en: 'Partly cloudy', uk: 'Мінлива хмарність' },
    3: { en: 'Overcast', uk: 'Похмуро' },
    45: { en: 'Fog', uk: 'Туман' },
    48: { en: 'Depositing rime fog', uk: 'Паморозь' },
    51: { en: 'Light drizzle', uk: 'Легкий мряка' },
    53: { en: 'Moderate drizzle', uk: 'Мряка' },
    55: { en: 'Dense drizzle', uk: 'Сильна мряка' },
    56: { en: 'Light freezing drizzle', uk: 'Легкий паморозний дощ' },
    57: { en: 'Dense freezing drizzle', uk: 'Сильний паморозний дощ' },
    61: { en: 'Slight rain', uk: 'Невеликий дощ' },
    63: { en: 'Moderate rain', uk: 'Дощ' },
    65: { en: 'Heavy rain', uk: 'Сильний дощ' },
    66: { en: 'Light freezing rain', uk: 'Невеликий крижаних дощ' },
    67: { en: 'Heavy freezing rain', uk: 'Сильний крижаних дощ' },
    71: { en: 'Slight snow fall', uk: 'Невеликий сніг' },
    73: { en: 'Moderate snow fall', uk: 'Сніг' },
    75: { en: 'Heavy snow fall', uk: 'Сильний сніг' },
    77: { en: 'Snow grains', uk: 'Сніжна крупа' },
    80: { en: 'Rain showers: slight', uk: 'Короткочасні дощі: слабкі' },
    81: { en: 'Rain showers: moderate', uk: 'Короткочасні дощі: помірні' },
    82: { en: 'Rain showers: violent', uk: 'Зливи: сильні' },
    85: { en: 'Snow showers: slight', uk: 'Снігопад: слабкий' },
    86: { en: 'Snow showers: heavy', uk: 'Снігопад: сильний' },
    95: { en: 'Thunderstorm', uk: 'Гроза' },
    96: { en: 'Thunderstorm with slight hail', uk: 'Гроза з невеликим градом' },
    99: { en: 'Thunderstorm with heavy hail', uk: 'Гроза з сильним градом' },
};

const ICON_BY_WMO = {
    0: 'sunny-day-16458.svg',
    1: 'sun-and-blue-cloud-16460.svg',
    2: 'blue-clouds-and-sun-16461.svg',
    3: 'cloudy-weather-16459.svg',
    45: 'fog-svgrepo-com',
    51: 'rainy-day-16464.svg',
    55: 'rainy-day-16464.svg',
    56: 'rainy-day-16464.svg',
    57: 'downpour-rain-and-blue-cloud-16463.svg',
    61: 'rainy-day-16464.svg',
    63: 'rainy-day-and-blue-cloud-16462.svg',
    65: 'downpour-rain-and-blue-cloud-16463.svg',
    66: 'hail-and-winter-cloud-16490.svg',
    67: 'hail-and-blue-cloud-16491.svg',
    71: 'winter-snowfall-16473.svg',
    73: 'winter-snowfall-16473.svg',
    75: 'snowy-weather-16472.svg',
    77: 'winter-snowfall-16473.svg',
    80: 'rainy-day-16464.svg',
    81: 'rainy-day-16464.svg',
    82: 'downpour-rain-and-blue-cloud-16463.svg',
    85: 'winter-snowfall-16473.svg',
    86: 'snowy-weather-16472.svg',
    95: 'thunder.svg',
    96: 'lightning-and-rainy-weather-16465.svg',
    99: 'lightning-and-rainy-weather-16465.svg',
};

const weatherText = (code, lang) => (WMO[code]?.[lang]) || String(code);

// Internationalization (i18n) configuration
const I18n = {
    en: { // англійська
        title: 'Weather App',
        placeholder: "Enter city name",
        search: "Search",
        geoloc: "Geolocation",
        temp: 'Temperature',
        desc: 'Description',
        humidity: "Humidity",
        wind: "Wind Speed",
        forecast: "5-Day Forecast",
        comboHint: "Use arrow keys to navigate suggestions, Enter to choose, Escape to close",
        loading: "Loading...",
        none: "No results found",
        results: (n) => `${n} results found`,
        error: 'Something went wrong'
    },
    uk: { // українська
        title: 'Погода',
        placeholder: "Введіть ім'я міста ",
        search: "Пошук",
        geoloc: "Геолокація",
        temp: 'Температура',
        desc: 'Опис',
        humidity: "Вологість",
        wind: "Швидкість вітру",
        forecast: "5-ти денний прогноз",
        comboHint: "Використовуйте клавіші стрілок, щоб обрати результат пошуку. Клавіша Enter обрати, Esc - закрити",
        loading: "Завантаження...",
        none: "Не знайдено жодних результатів",
        results: (n) => `${n} результатів знайдено`,
        error: 'Щось пішло не так'
    }
};


const GEO_API_URL = (query, lang) => `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=${lang}&format=json`;
const FORECAST = (lat, lon) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}
&longitude=${lon}&current_weather=true
&hourly=cloudcover,relativehumidity_2m
&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,sunrise,sunset
&windspeed_unit=ms
&forecast_days=5&timezone=auto`;
const GEO_REV = (lat, lon, lang) => `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&language=${lang}&format=json`;

const screen = (s) => s.replace(/[.*+?${}()|[\]\\]/g, '\\$&');

function openListBox() { if (listbox.hidden) { listbox.hidden = false; input.setAttribute('aria-expanded', 'true'); } }
function closeListBox() { if (!listbox.hidden) { listbox.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); activeIndex = -1; } }
function announce(msg) { statusEl.textContent = msg; }
const setPressed = (btn, state) => { btn.setAttribute('aria-pressed', state ? 'true' : 'false'); }

function ftmDate(iso, lang, timezone) {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(
        lang, { weekday: 'short', day: 'numeric', month: 'short', timeZone: timezone })
        .format(date);
}

const waiter = (fn, ms) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    };
}

function onLangRefresh(newLang) {
    return async () => {
        lang = newLang;
        setPressed(btnUk, lang === 'uk');
        setPressed(btnEn, lang === 'en');
        applyI18n();

        if (lastREQ.data) {
            try {
                const rev = await fetch(GEO_REV(lastREQ.lat, lastREQ.lon, lang)).then(r => r.json());
                console.log(rev);
                lastREQ.label = rev ? [rev.locality, rev.countryName].filter(Boolean).join(', ') : lastREQ.label;
            }
            catch (e) {
                console.error(e);
                announce(I18n[lang].error);
            }
            renderWeather(lastREQ.data, lastREQ.label);
        }
        input.dispatchEvent(new Event('input'));
    }
}

function applyI18n() {
    const currentLang = I18n[lang];
    html.lang = lang;
    titleEl.textContent = currentLang.title;
    input.placeholder = currentLang.placeholder;
    searchBtn.textContent = currentLang.search;
    geoLocBtn.textContent = currentLang.geoloc;
    forecastTitle.textContent = currentLang.forecast;
    temperature.textContent = `${currentLang.temp}: `;
    humidity.textContent = `${currentLang.humidity}: `;
    windSpeed.textContent = `${currentLang.wind}: `;
    description.textContent = `${currentLang.desc}: `;
    descriptionValue.textContent = weatherText(WeatherCode, lang);
    document.getElementById('comboHint').textContent = currentLang.comboHint;
}

function getGeolocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    announce(I18n[lang].loading);
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;

        try {
            const rev = await fetch(GEO_REV(lat, lon, lang)).then(r => r.json());
            const label = rev ? [rev.locality, rev.countryName].filter(Boolean).join(', ') : `${lat.toFixed(2)
                }, ${lon.toFixed(2)} `;
            fetchAndRenderWeather(lat, lon, label);
        }
        catch (e) {
            console.error(e);
            fetchAndRenderWeather(lat, lon, `${lat.toFixed(2)}, ${lon.toFixed(2)} `);
            announce(I18n[lang].error);
        }

    }, (err) => {
        console.error(err);
        //alert(err.message || 'Unable to retrieve your location');
    });
}


function renderListBox(items, query) {
    listbox.innerHTML = '';
    options = items;
    const CurrentLang = I18n[lang];
    if (!items.length) {
        const li = document.createElement('li');
        li.role = 'option';
        li.className = 'option';
        li.setAttribute('aria-disabled', 'true');
        li.textContent = CurrentLang.none;
        listbox.appendChild(li);
        openListBox();
        announce(CurrentLang.none);
        return;
    }
    const regex = new RegExp(screen(query), 'i');
    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.role = 'option';
        li.id = `option - ${index} `;
        li.className = 'option';
        li.dataset.label = item.label;
        li.dataset.lat = item.lat;
        li.dataset.lon = item.lon;
        li.innerHTML = item.label.replace(regex, match => '<mark>' + match + '</mark>');
        listbox.appendChild(li);
    })
    announce(CurrentLang.results(items.length));
    openListBox();
    setActive(0);
}

function setActive(idx) { // функція для встановалення активного елемента
    const nodeList = listbox ? listbox.querySelectorAll('.option[role="option"]') : null;
    const opts = Array.from(nodeList || []);
    if (!opts.length) return;
    idx = Math.max(0, Math.min(idx, opts.length - 1));
    if (activeIndex >= 0 && opts[activeIndex]) opts[activeIndex].dataset.active = 'false';
    activeIndex = idx;
    const el = opts[activeIndex];
    el.dataset.active = 'true';
    input.setAttribute('aria-activedescendant', el.id);
    el.scrollIntoView({ block: 'nearest' });
}

const onInput = waiter(async (event) => {
    const query = event.target.value.trim();

    if (query.length < 2) { closeListBox(); return; }
    const cacheKey = `${query.toLowerCase()}| ${lang} `;
    if (cache.has(cacheKey)) { renderListBox(cache.get(cacheKey), query); return; }
    abortCtrl?.abort();
    abortCtrl = new AbortController();
    input.setAttribute('aria-busy', 'true');
    announce(I18n[lang].loading);

    try {
        const response = await fetch(GEO_API_URL(query, lang), { signal: abortCtrl.signal })

        if (!response.ok) throw new Error('HTTP error' + response.status);
        announce('');
        const data = await response.json();
        const seen = new Set();
        const items = (data.results || []).map(r => {
            const parts = [r.name, r.admin1, r.country].filter(Boolean);
            const label = parts.join(', ');
            const key = parts.join('|').toLowerCase();
            return { key, label, lat: r.latitude, lon: r.longitude };
        }).filter(it => { if (seen.has(it.key)) return false; seen.add(it.key); return true; });
        cache.set(cacheKey, items);
        renderListBox(items, query);
    }
    catch (e) {
        if (err.name !== 'AbortError') {
            console.error(e);
            renderOptions([], query);
        }
    }
    finally {
        input.removeAttribute('aria-busy');
    }

}, 200);


//обрати індекс для списку елементів
function selectIndex(idx) {
    const el = listbox.querySelector(`#option-${idx}`); if (!el || el.getAttribute('aria-disabled') === 'true') return;
    const label = el.dataset.label; const lat = Number(el.dataset.lat); const lon = Number(el.dataset.lon);
    input.value = label; closeListBox(); fetchAndRenderWeather(lat, lon, label);
}

async function fetchAndRenderWeather(lat, lon, label) {
    try {
        announce(I18n[lang].loading);
        const data = await fetch(FORECAST(lat, lon)).then(r => r.json());
        renderWeather(data, label);
        scene.sceneApplyWeather(data)
        console.log(data);
        lastREQ = { lat, lon, data, label };
    }
    catch (e) {
        console.error(e);
        announce(I18n[lang].error);
    }
}

function renderWeather(data, lable) {
    const CurrentLang = I18n[lang];
    cityName.textContent = lable;
    const cw = data.current_weather;

    const code = cw.weathercode;
    WeatherCode = code;
    tempValue.textContent = `${Math.round(cw.temperature)}°C`;
    descriptionValue.textContent = `${weatherText(code, lang)} `;
    windSpeedValue.textContent = `${Math.round(cw.windspeed)} m / s`;
    let hum = null;
    const times = data.hourly?.time || [];
    const humidities = data.hourly?.relativehumidity_2m || [];
    if (times.length && humidities.length) {
        const idx = times.indexOf(cw.time);
        hum = humidities[idx >= 0 ? idx : humidities.length - 1];
    }
    humidityValue.textContent = `${hum !== null ? Math.round(hum) + '%' : '--'} `;

    // Іконка погоди
    const iconName = ICON_BY_WMO[code] || ICON_BY_WMO[0];
    weatherIcon.src = `svg/${iconName} `;
    weatherIcon.alt = weatherText(code, lang);

    const daily = data.daily;


    if (daily) {
        forecastContainer.innerHTML = ``;
        for (let i = 0; i < daily.time.length; i++) {
            const day = document.createElement('div'); day.className = 'forecast-day';
            const dayCode = daily.weathercode[i];
            day.innerHTML = `
                        <div class="muted"> ${ftmDate(daily.time[i], lang, data.timezone)} </div>
                            <div> ${weatherText(dayCode, lang)} </div>
                            <div> <img src="svg/${ICON_BY_WMO[dayCode] || ICON_BY_WMO[0]}" alt="${weatherText(dayCode, lang)}" width="36" height="36"> </div>
                            <div class="row"><strong>${Math.round(daily.temperature_2m_max[i])}°C</strong> / ${Math.round(daily.temperature_2m_min[i])}°C </div>
                        <div class="muted"> ${daily.precipitation_sum?.[i] ?? 0} mm </div>
                    `;
            forecastContainer.appendChild(day);
        }
    }
    announce('');
};

//Event Listeners
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const query = input.value.trim();
    if (!query) return;

    if (!listbox.hidden && activeIndex >= 0) {
        selectIndex(activeIndex);
    }

    try {
        announce(I18n[lang].loading);
        const res = await fetch(GEO_API_URL(query, lang));
        const data = await res.json();
        const first = (data.results || [])[0];
        if (!first) {
            announce(I18n[lang].none);
            return;
        }
        const label = [first.name, first.admin1, first.country].filter(Boolean).join(', ');
        fetchAndRenderWeather(first.latitude, first.longitude, label);
    }
    catch (e) {
        console.error(e);
        announce(I18n[lang].error);
    }
});



geoLocBtn.addEventListener('click', () => {
    getGeolocation();
});



input.addEventListener('input', onInput);
input.addEventListener('keydown', (e) => {
    console.log(e.key);
    const open = !listbox.hidden; const k = e.key;
    if (k === 'ArrowDown') { e.preventDefault(); if (!open) { openListbox(); setActive(0); } else setActive(activeIndex + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); if (!open) { openListbox(); setActive(0); } else setActive(activeIndex - 1); }
    else if (k === 'Home') { if (open) { e.preventDefault(); setActive(0); } }
    else if (k === 'End') { if (open) { e.preventDefault(); setActive(options.length - 1); } }
    else if (k === 'Enter') { if (open && activeIndex >= 0) { e.preventDefault(); selectIndex(activeIndex); } }
    else if (k === 'Escape') { if (open) { e.preventDefault(); closeListBox(); } }
});

btnUk.addEventListener('click', () => { lang = 'uk'; onLangRefresh(lang); });
btnEn.addEventListener('click', () => { lang = 'en'; onLangRefresh(lang); });



window.addEventListener('DOMContentLoaded', () => {
    if ('permission' in navigator && navigator.permissions?.query) {
        navigator.permission.query({ name: 'geolocation' }).then(result => {
            if (result.state === 'granted' || result.state === 'prompt') {
                getGeolocation();
            }
        });
    }
    else {
        getGeolocation();
    }
});