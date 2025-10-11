import { WeatherBackground } from './components/classWeatherBackground.js'
import {FORECAST} from './api/weatherApi.js'
import {TIME_BY_TIMEZONE} from './api/timeApi.js';
import { GEO_API_URL, GEO_REV} from './api/geocodeApi.js';
import { I18n } from './i18n/index.js';
import { WMO, ICON_BY_WMO, weatherText} from './utils/wmo.js';
import Listbox from './components/listBox.js';

const html = document.documentElement;
const inputEl = document.getElementById('cityInput');
const listBoxEl = document.getElementById('cityListbox');
const statusEl = document.getElementById('liveStatus');
const geoLocBtn = document.getElementById('geoloc-btn');
const titleEl = document.getElementById('appTitle');

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

//buttons
const btnUk = document.getElementById('lang-uk-btn');
const btnEn = document.getElementById('lang-en-btn');
const searchBtn = document.getElementById('search-btn');
const scene = document.getElementById('weather-scene');


//variables
let activeIndex = -1; // індекс активного елемента
let cache = new Map(); // простенький кеш на основі Map
let abortCtrl = null; // простий контроллер переривання
let lang = 'en';
let WeatherCode = 0; // код погоди
let lastREQ = { lat: null, lon: null, data: null, label: null };

const listboxObj = new Listbox({
    listBoxEl,
    inputEl: inputEl,
    announcer: announce,
    onSelect: ({label, lat, lon}) => fetchAndRenderWeather(lat, lon, label)
})

function announce(msg){ statusEl.textContent = msg; }

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

async function onLangRefresh(newLang) {
        lang = newLang;
        setPressed(btnUk, lang === 'uk');
        setPressed(btnEn, lang === 'en');
        applyI18n();

        if (lastREQ.data) {
            try {
                const rev = await fetch(GEO_REV(lastREQ.lat, lastREQ.lon, lang)).then(r => r.json());
                lastREQ.label = rev ? [rev.locality, rev.countryName].filter(Boolean).join(', ') : lastREQ.label;
            }
            catch (e) {
                console.error(e);
                announce(I18n[lang].error);
            }
            renderWeather(lastREQ.data, lastREQ.label);
        }
        inputEl.dispatchEvent(new Event('input'));
}

function applyI18n() {  
    const currentLang = I18n[lang];
    html.lang = lang;
    titleEl.textContent = currentLang.title;
    inputEl.placeholder = currentLang.placeholder;
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


//onInput event
const onInput = waiter(async (event) => {
    const query = event.target.value.trim();
    if (query.length < 2) { listboxObj.closeListBox(); return; }
    const cacheKey = `${query.toLowerCase()}| ${lang} `;
    if (cache.has(cacheKey)) { listboxObj.render(cache.get(cacheKey), query, I18n[lang]); return; }
    abortCtrl?.abort();
    abortCtrl = new AbortController();
    inputEl.setAttribute('aria-busy', 'true');
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
        listboxObj.render(items, query, I18n[lang]);
    }
    catch (e) {
        if (e.name !== 'AbortError') {
            console.error(e);
            // renderOptions([], query);
        }
    }
    finally {
        inputEl.removeAttribute('aria-busy');
    }

}, 200);
//

// Weather render func API
async function fetchAndRenderWeather(lat, lon, label) {
    try {
        announce(I18n[lang].loading);
        const data = await fetch(FORECAST(lat, lon)).then(r => r.json());
        const time = await fetch(TIME_BY_TIMEZONE(data.timezone)).then(r => r.json());
        data.current_timezone_time = time.datetime.replace(/\.\d+(?=([+-]\d{2}:?\d{2}|Z)?$)/, '').replace(/([+-]\d{2}:?\d{2}|Z)$/, '');       
        renderWeather(data, label);
        scene.updateScene(data)
        lastREQ = { lat, lon, data, label };
    }
    catch (e) {
        console.error(e);
        announce(I18n[lang].error);
    }
}
//

function renderWeather(data, lable) {
    cityName.textContent = lable;
    const cw = data.current_weather;
    const code = cw.weathercode;
    let hum = null;
    WeatherCode = code;
    tempValue.textContent = `${Math.round(cw.temperature)}°C`;
    descriptionValue.textContent = `${weatherText(code, lang)} `;
    windSpeedValue.textContent = `${Math.round(cw.windspeed)} m / s`;
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

    const query = inputEl.value.trim();
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

inputEl.addEventListener('input', onInput);
inputEl.addEventListener('keydown', (e) => listboxObj.handleKey(e));

btnUk.addEventListener('click', () => { lang = 'uk'; onLangRefresh(lang);});
btnEn.addEventListener('click', () => { lang = 'en'; onLangRefresh(lang); });

window.addEventListener('DOMContentLoaded', () => {
    if ('permission' in navigator && navigator.permissions?.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
            if (result.state === 'granted' || result.state === 'prompt') {
                getGeolocation();
            }
        });
    }
    else {
        getGeolocation();
    }
});