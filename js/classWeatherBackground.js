export class WeatherBackground extends HTMLElement {

    static get observedAttributes() { return ['src'] };

    #clockMs = 1000; //set update time of sky celestial movement
    _timer = null;
    #rafId = null;


    //global scene state
    #sceneState = {
        clouds:{
            count: 6
        },
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

    //controller objects

    #celestialController 
    #moodController  

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
        this.#moodController = new MoodController(this)

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
        if (!svg_scene) return;


        svg_scene.setAttribute('preserveAspectRatio', 'xMidYMid slice');

        //Choosing elements from svg scene
        this.#sceneComponents = {
            arc: box.querySelector('#curve path'),
            sun: box.querySelector('#sun'),
            moon: box.querySelector('#moon'),
            clouds: box.querySelectorAll('.cloud'),
            rain:box.querySelectorAll('.rain'),
            snow: box.querySelectorAll('.snow'),
            fog: box.querySelectorAll('.fog'),
        } 

        this._resolveReady?.();
        const defFunc = this._queue.splice(0);
        defFunc.forEach(f => f());
    }

    updateScene(data = null) {
        if (!data) return;

        if (!this.#sceneComponents.arc || !this.#sceneComponents.sun) return this._queue.push(() => this.updateScene(data));
        
        this.#sceneState = normalizeDataToState(data, this.#sceneState)
        console.log("Scene State: ", this.#sceneState)

        //set sun position
       //this.#sceneState.timeNow = data?.current_weather?.time ? new Date(data.current_weather.time) : new Date();
        //const sunPickedTime = pickSunTimeForDate(this.#sceneState.timeNow, data.daily);
        //const sunrise = new Date(sunPickedTime.sunriseISO);
        //const sunset = new Date(sunPickedTime.sunsetISO);
        //this.#sceneState.sunTime = { sunrise: sunrise, sunset: sunset }
        this.#celestialController.apply(this.#sceneState, this.#sceneComponents)
        this.#moodController.apply(this.#sceneState)

        //if (this._timer) clearInterval(this._timer); //check if timer exist: true - reset. false - skip
        
        // this._timer = setInterval(() => {
        //     this.#sceneState.timeNow = new Date(this.#sceneState.timeNow.getTime() + this.#clockMs);
        //     this.#celestialController.apply(this.#sceneState, this.#sceneComponents)
            
        // }, this.#clockMs)

        this.#startClock()
        //
    }

    #startClock(){
        if (this.#rafId) return;

        var start;
        
        const loop = (timestamp) => {
            if(!start) start = timestamp;
            
            const dt = timestamp - start;
            start = timestamp

            const {sunriseISO, sunsetISO} = this.#sceneState.sunTimeISO
            //console.log("Time: ", this.#sceneState.timeNow)
            this.#sceneState.timeNow = new Date(this.#sceneState.timeNow.getTime() + dt);
            this.#celestialController.apply(this.#sceneState, this.#sceneComponents)
            this.#sceneState.isDay = isDayLight(this.#sceneState.timeNow, sunriseISO, sunsetISO)

            this.#rafId = requestAnimationFrame(loop)
        }

        this.#rafId = requestAnimationFrame(loop)
    }

}

//funcs 
function isDayLight(now, sunriseISO, sunsetISO){
    if (!now || !sunriseISO || !sunsetISO) return;
    const sunrise = new Date(sunriseISO);
    const sunset = new Date(sunsetISO);
    if (sunset <= sunrise) sunset = new Date(sunset.getTime() + 24 * 3600 * 1000)
    return (now >= sunrise) && (now <= sunset)
}

//func normalizeDataToState

function normalizeDataToState(data, prev={}){
    const current_weather = data?.current_weather ?? {};
    const daily = data?.daily ?? {};
    const hourly = data?.hourly ?? {};
    const timezone = data?.timezone || 'UTC';
    const current_time = data?.current_timezone_time;

    console.log("CURRENT TIME IN SCENE STATE", current_time)


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
        windspeed: Number(current_weather.windspeed ?? 0),
        hummidity: null,
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


class skyCelestialController{
    constructor(host){this.host = host;}
    
    apply(state, refs) {
        this.refs = refs;
        this.#centerAnchor(refs?.sun);
        this.#centerAnchor(refs?.moon);
        this.#CelestialTick(state);
    }

    #centerAnchor(node) { // try to center sun and moon sprite
        if (!node || node.__anchor) return;
            node.removeAttribute('transform'); // remove any translate from sprites (node)
            const b = node.getBBox();
            node.__anchor = { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    }

    #CelestialTick(state) {
        if (!state.sunTimeISO || !state.timeNow) return;
        const now = state.timeNow
        const { sunriseISO, sunsetISO } = state.sunTimeISO;
        const progress = this.#checkDayProgress(now, sunriseISO, sunsetISO)
        state.skyCelestial.progress = progress
        
        this.#moveOnArc(this.refs.arc, this.refs.sun, progress)
    }

    #checkDayProgress = (now, sunriseISO, sunsetISO) => {
        const sunrise = new Date(sunriseISO)
        const sunset = new Date(sunsetISO)
        if (sunset <= sunrise) sunset = new Date(sunset.getTime() + 24 * 3600 * 1000);
        return cutter((now - sunrise) / (sunset - sunrise));
    }

    #moveOnArc(arc, node, progress) { // move sun or moon on invisible arc
        const nwProgress = cutter(progress);

        const arcLength = arc.getTotalLength();
        const Position = arc.getPointAtLength(arcLength * nwProgress);

        const { cx, cy } = node.__anchor;

        let translate = `translate(${Position.x - cx}, ${Position.y - cy})`;
        node.setAttribute('transform', translate);
    }
}

class MoodController {
  constructor(host){ this.host = host; }
  apply(state, refs){
    const code = state.code ?? 0;
    const mood = {
      clear:   { saturate:1.0,  brightness:1.00, contrast:1.00, hue:10 },
      cloudy:  { saturate:0.75, brightness:0.98, contrast:0.96, hue:0 },
      overcast:{ saturate:0.45, brightness:0.82, contrast:0.95, hue:10 },
      rain:    { saturate:0.50, brightness:0.90, contrast:0.96, hue:0 },
      snow:    { saturate:0.10, brightness:1.08, contrast:0.93, hue:230 },
      thunder: { saturate:0.35, brightness:0.85, contrast:1.06, hue:220 },
      fog:     { saturate:0.25, brightness:0.96, contrast:0.88, hue:0, blur:'1px' },
    };
    const cls = (c)=>{
      if (c===0) return 'clear';
      if ([1,2].includes(c)) return 'cloudy';
      if (c===3) return 'overcast';
      if ([45,48].includes(c)) return 'fog';
      if ([61,63,65,80,81,82,66,67].includes(c)) return 'rain';
      if ([71,73,75,77,85,86].includes(c)) return 'snow';
      if ([95,96,99].includes(c)) return 'thunder';
      return 'cloudy';
    };
    const m = mood[cls(code)];
    const setVars = ({saturate=1, brightness=1, contrast=1, hue=0, blur='0px'})=>{
      const el = this.host;
      el.style.setProperty('--sat', String(saturate));
      el.style.setProperty('--bright', String(brightness));
      el.style.setProperty('--contrast', String(contrast));
      el.style.setProperty('--hue', hue + (typeof hue === 'number' ? 'deg':''));
      el.style.setProperty('--blur', String(blur));
    };
    setVars(m);
  }
}

class skyColorController{
    constructor(host){this.host = host}

    apply(state){
        if (state.isDay){
            
        }
        else{

        }
    }
}

const cutter = (x) => Math.max(0, Math.min(1, x));

customElements.define('weather-scene', WeatherBackground);