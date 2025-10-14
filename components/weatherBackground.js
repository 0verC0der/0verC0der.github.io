import { TimeCounter } from "./timeComponent.js";
import { skyCelestialController } from "../controllers/skyCelestialController.js";
import { moodController } from "../controllers/moodController.js"
import { cloudController } from "../controllers/cloudController.js";

export class weatherBackground extends HTMLElement {

    static get observedAttributes() { return ['src'] };
   
    _timer = null;
    #rafId = null;

    //global scene state
    #sceneState = {
        wind: {
            speed: 2
        },
        rain:{
            drops:0
        },
        skyCelestial:{
            progress: 0.5
        },
        sunTimeISO:{
            sunriseISO: '6:00',
            sunsetISO: '18:00'
        },
        timeNow: new Date(),
        isDay: true,
        daily:[],
        hourly:[],
    }

    #sceneComponents // Components of svg scene obj.  forest, sun, moon etc.
    #celestialController 
    #moodController
    #cloudController
    #actualTime

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

            --sat:1;
            --bright:1;
            --contrast:1;
            --hue: 0deg;
            --blur: 0px;      
        }
        #box-scene, svg{
                width: 100% ;
                height: 100%;
                display: block;
        }
        #box-scene{ 
            transition:filter .2s ease;
            filter: 
            saturate(var(--sat))
            brightness(var(--bright))
            contrast(var(--contrast))
            hue-rotate(var(--hue))
            blur(var(--blur))
            ;
        }
        </style>
        <div id="box-scene"></div>`;

        this.#celestialController = new skyCelestialController(this)
        this.#moodController = new moodController(this)
        this.#cloudController = new cloudController(this)
        this.#actualTime = new TimeCounter()

        this._resolveReady = null;
        this.ready = new Promise(res => (this._resolveReady = res));

        this._queue = [];

        this.ready = new Promise(res => (this._resolveReady = res));
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
        console.log('Scene component', box)
        if (!svg_scene) return;

        svg_scene.setAttribute('preserveAspectRatio', 'xMidYMid slice');
     

        //Choosing elements from svg scene
        this.#sceneComponents = {
            arc: box.querySelector('#curve path'),
            sun: box.querySelector('#sun'),
            moon: box.querySelector('#moon'),
            clouds: box.querySelector('#clouds'),
            rain: box.querySelectorAll('.rain'),
            snow: box.querySelectorAll('.snow'),
            fog: box.querySelectorAll('.fog'),
        } 
        console.log('Clouds', this.#sceneComponents.clouds)
        this._resolveReady?.();
        const defFunc = this._queue.splice(0);
        defFunc.forEach(f => f());
    }

    updateScene(data = null) {
        if (!data) return;

        if (!this.#sceneComponents.arc || !this.#sceneComponents.sun) return this._queue.push(() => this.updateScene(data));
        
        this.#sceneState = normalizeDataAndWeatherToState(data, this.#sceneState)

        console.log("Scene State: ", this.#sceneState)
        this.#actualTime.updateTime(data?.current_timezone_time)

        this.#cloudController.apply(this.#sceneState, this.#sceneComponents)
        this.#celestialController.apply(this.#sceneState, this.#sceneComponents)
        this.#moodController.apply(this.#sceneState)

        this.#startClock()
    }

    #startClock(){
            if (this.#rafId) return;
            const loop = () => {
                const {sunriseISO, sunsetISO} = this.#sceneState.sunTimeISO

                this.#sceneState.isDay = isDayLight(this.#sceneState.timeNow, sunriseISO, sunsetISO)
                this.#sceneState.timeNow = this.#actualTime.getCurrentTimeCounter();
                
                this.#celestialController.apply(this.#sceneState, this.#sceneComponents)

                this.#rafId = requestAnimationFrame(loop)
            }
        this.#rafId = requestAnimationFrame(loop)
    }
}

function isDayLight(now, sunriseISO, sunsetISO){
    if (!now || !sunriseISO || !sunsetISO) return;
    const sunrise = new Date(sunriseISO);
    const sunset = new Date(sunsetISO);
    if (sunset <= sunrise) sunset = new Date(sunset.getTime() + 24 * 3600 * 1000)
    return (now >= sunrise) && (now <= sunset)
}

function normalizeDataAndWeatherToState(data, prev={}){
    const current_weather = data?.current_weather ?? {};
    const daily = data?.daily ?? {};
    const hourly = data?.hourly ?? {};
    const timezone = data?.timezone || 'UTC';
    const current_time = data?.current_timezone_time;

    let sunriseISO = null, sunsetISO = null;
    if (Array.isArray(daily.time) && daily.time.length){
        const today = new Date(current_weather.time || Date.now()).toISOString().slice(0, 10);
        const idx = daily.time.indexOf(today);

        if( idx !== -1){
            sunriseISO = daily.sunrise?.[idx] ?? null;
            sunsetISO = daily.sunset?.[idx] ?? null;
        }
    }
    const code = current_weather.weathercode ?? 0;
    let density = 0.2;
    if ([1,2].includes(code)) density = 0.45
    else if (code === 3) density = 0.85;
    else if ([61, 63, 65, 80, 81, 82, 66, 67, 95, 96, 99].includes(code)) density = 0.9;
    else if ([45, 48].includes(code)) density = 0.7;
    return {
        ...prev,
        code,
        wind: {
            speed: Number(current_weather.windspeed ?? 0),
            winddirection: Number(current_weather.winddirection ?? 0)
        },
        sunTimeISO: {
            sunriseISO,
            sunsetISO
        },
        timeNow: new Date(current_time),
        density,
        daily: daily,
        hourly: hourly,
        timezone: timezone,
    }
}

customElements.define('weather-scene', weatherBackground);