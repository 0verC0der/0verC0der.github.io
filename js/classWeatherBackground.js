export class WeatherBackground extends HTMLElement {

    static get observedAttributes() { return ['src'] };


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

    #sceneApplyWeather({
        timeISO = null,
        sunriseISO = null,
        sunsetISO = null,
        condition = 'clear',
        cloudiness = null,
        precipitation = null,
    }) {

    }

    //utils

    #cutter = (x) => Math.max(0, Math.min(1, x));

    skyCelestialMovement(progress) {
        if (!this.arc || !this.sun) return this._queue.push(() => this.skyCelestialMovement(progress));
        this.#moveOnArc(this.arc, this.sun, progress);
    }


    #moveOnArc(arc, node, progress) {
        const nwProgress = this.#cutter(progress);

        const arcLength = arc.getTotalLength();
        const Position = arc.getPointAtLength(arcLength * nwProgress);

        if (!node.__anchor) {
            node.removeAttribute('transform');                 // щоб не накопичувався старий translate
            const b = node.getBBox();                          // центр вмісту у локальних координатах node
            node.__anchor = { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
        }
        const { cx, cy } = node.__anchor;

        let translate = `translate(${Position.x - cx}, ${Position.y - cy})`;

        arc.setAttribute('stroke', 'red');
        node.setAttribute('transform', translate);

    }

}


customElements.define('weather-scene', WeatherBackground);