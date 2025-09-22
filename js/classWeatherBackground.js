export class WeatherBackground extends HTMLElement {

    static get observedAttributes() { return ['src'] };

    #sunTime = null;
    #clockMs = 1000; //set update time of sky celestial movement
    #timeNow = null;
    _timer = null;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
        <style>
        :host {
            position: fixed;
            inset: 0;
            z-index: 0;
            display: block;
            pointer-events: none;
        }
        #box-scene, svg{
                width: 100% ;
                height: 100%;
                display: block;
        }
        </style>
        <div id="box-scene"></div>`;
        this._resolveReade = null;
        this.ready = new Promise(res => (this._resolveReady = res));

        this._queue = [];

        this.ready = new Promise(res => (this._resolveReady = res));

        this._lastData = null;

    }
    //on attribute change
    attributeChangedCallback(n) { if (n === 'src') this.#load(); }



    async #load() {
        const res = await fetch(this.getAttribute('src'));
        if (!res.ok) throw new Error('Cannot load weather scene.svg');
        //Get svg text
        const svgText = await res.text();
        const box = this.shadowRoot.getElementById('box-scene');

        box.innerHTML = svgText;

        const svg_scene = box.querySelector('svg');
        if (!svg_scene) return;


        svg_scene.setAttribute('preserveAspectRatio', 'xMidYMid slice');

        //Choosing elements from svg scene
        this.arc = box.querySelector('#curve path');

        this.sun = box.querySelector('#sun');
        this.moon = box.querySelector('#moon');



        this.clouds = box.querySelectorAll('.cloud');
        this.rain = box.querySelectorAll('.rain');
        this.snow = box.querySelectorAll('.snow');
        this.fog = box.querySelectorAll('.fog');


        this._resolveReady?.();
        const defFunc = this._queue.splice(0);
        defFunc.forEach(f => f());
    }

    sceneApplyWeather(data = null) {
        if (!data) return;

        if (!this.arc || !this.sun) return this._queue.push(() => this.sceneApplyWeather(data));

        const setTimeToDate = (baseDate, hhmm) => {
            const d = new Date(baseDate);
            const [hh, mm] = hhmm.split(':').map(Number);
            d.setHours(hh, mm, 0, 0);
            return d;
        }

        const pickSunTimeForDate = (now, daily) => {
            const day = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
            if (!daily || !daily.time) return null;
            const idx = daily.time.indexOf(day);
            return idx === -1 ? null : { sunsetISO: daily.sunset[idx], sunriseISO: daily.sunrise[idx] };
        }

        this.#timeNow = data?.current_weather?.time ? new Date(data.current_weather.time) : new Date();

        const sunPickedTime = pickSunTimeForDate(this.#timeNow, data.daily);

        const sunrise = new Date(sunPickedTime.sunriseISO);
        const sunset = new Date(sunPickedTime.sunsetISO);

        this.#sunTime = { sunrise: sunrise, sunset: sunset }

        const progress = this.#checkDayProgress(this.#timeNow, sunrise, sunset);

        this.#skyCelestialMovement(progress);

        if (this._timer) clearInterval(this._timer); //check if timer exist: true - reset. false - skip

        this._timer = setInterval(() => {
            this.#timeNow = new Date(this.#timeNow.getTime() + this.#clockMs);
            this.#CelestialTick();
        }, this.#clockMs)

    }

    //utils

    #cutter = (x) => Math.max(0, Math.min(1, x));


    // sky celestial utils

    #CelestialTick() {
        if (!this.#sunTime || !this.#timeNow) return;
        const now = this.#timeNow
        const { sunrise, sunset } = this.#sunTime;

        const progress = this.#checkDayProgress(now, sunrise, sunset)
        this.#skyCelestialMovement(progress)
    }

    #skyCelestialMovement(progress = 0.5) { //
        if (!this.arc || !this.sun) return this._queue.push(() => this.skyCelestialMovement(progress));
        this.#centerAnchor(this.sun);
        this.#centerAnchor(this.moon);
        this.#moveOnArc(this.arc, this.sun, progress);
    }


    #centerAnchor(node) { // try to center sun and moon sprite
        if (!node) return;
        if (!node.__anchor) {
            node.removeAttribute('transform'); // remove any translate from sprites (node)
            const b = node.getBBox();
            node.__anchor = { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
        }
    }

    #checkDayProgress = (now, sunriseISO, sunsetISO) => {
        if (sunsetISO <= sunriseISO) sunsetISO = new Date(sunsetISO.getTime() + 24 * 3600 * 1000);
        return this.#cutter((now - sunriseISO) / (sunsetISO - sunriseISO));
    }

    #moveOnArc(arc, node, progress) { // move sun or moon on invisible arc
        const nwProgress = this.#cutter(progress);

        const arcLength = arc.getTotalLength();
        const Position = arc.getPointAtLength(arcLength * nwProgress);

        const { cx, cy } = node.__anchor;

        let translate = `translate(${Position.x - cx}, ${Position.y - cy})`;

        node.setAttribute('transform', translate);

    }
}


customElements.define('weather-scene', WeatherBackground);