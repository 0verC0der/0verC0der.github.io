import { cutter } from "../utils/cutter.js";

export class skyCelestialController{
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
        //this.#updateVisibility()
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

        #updateVisibility(state) {
        if (!this.refs) return;
        const sun = this.refs.sun;
        const moon = this.refs.moon;
        const isDay = Boolean(state.isDay);

        if (sun) {
            // Плавно показуємо/ховаємо сонце
            sun.style.opacity = isDay ? '1' : '0';
            sun.style.pointerEvents = isDay ? 'auto' : 'none';
            sun.setAttribute('aria-hidden', isDay ? 'false' : 'true');
        }
        if (moon) {
            // Місяць навпаки
            moon.style.opacity = isDay ? '0' : '1';
            moon.style.pointerEvents = isDay ? 'none' : 'auto';
            moon.setAttribute('aria-hidden', isDay ? 'true' : 'false');
        }
    }

}