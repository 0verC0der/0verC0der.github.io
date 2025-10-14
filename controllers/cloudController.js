export class cloudController{
    constructor(host){
        this.host = host
        this.cloudRefs = []
    }

    apply(state, refs){
        this.cloudRefs = refs?.clouds ? Array.from(refs.clouds) : [];
        this.sceneState = state
        this._cloudParent = this.cloudRefs[0].parentElement || null;
        this.#initClouds()
    }

    #cloudPool = [];
    #cloudRAF = null;
    #cloudLastTS
    
    #cloudConfig = {
        minScale: 0.5,
        maxScale: 5,
        baseSpeed: 10, 
        windFactor: 12,
        spawnPadding: 100,
        yRange: {top: 50, bottom: 400},
        countRange: {min: 0, max: 200}
    }

    #initClouds(){
        if (!this.cloudRefs || !this.cloudRefs.length) return;

        this.#syncCountToCloudCover();
    

        this.#cloudPool = this.cloudRefs.map((node, idx) => {
            node.style.willChange = 'transform, opacity';
            node.dataset._idx = idx;
            const params = this.#makeCloudParameter(node, idx);
            this.#applyCloudParameters(node, params.x, params.y, params.scale);

            node.style.opacity = params.opacity;
            
            return {node, ...params};
        });
        this.#startCloudLoop();
    }

    #getCloudCoverPercent(){
        return this.sceneState.hourly.cloudcover[0] / 100 ?? 0;
    }

    #desiredCloudCountFromCover(){
        const cover = this.#getCloudCoverPercent();
        console.log("DEBUG Cloud cover percent:", cover)    
        const {min, max} = this.#cloudConfig.countRange;
        return Math.round(lerp(min, max, cover));
    }

    #syncCountToCloudCover(){
        const desiredCount = this.#desiredCloudCountFromCover();
        console.log("DEBUG Desired cloud count:", desiredCount)
        console.log("DEBUG ________________________________________")
        try{
            if (!this.cloudRefs || !this.cloudRefs.length) {
                throw new Error("Cloud REFS is empty");   
        }}
        catch(e){ 
            console.warn("Failed to sync cloud count", e)
            return;
        }

        const current = this.#countManagedCloudNodes();

        if (current === desiredCount) return;
        
        if(desiredCount > current){
            this.#addClouds(desiredCount - current);    
        }
        else {
            this.#removeClouds(current - desiredCount);
        }
    }

    #countManagedCloudNodes(){
        return this.#cloudPool?.length || 0;
    }

    #addClouds(n){
        
        if (!this.cloudRefs || !this.cloudRefs.length) return;

        for (let i = 0; i < n; i++){
            const idx = i % this.cloudRefs.length;
            const proto = this.cloudRefs[idx];
            const clone = proto.cloneNode(true);

            clone.dataset._idx = this.#cloudPool.length;

            this._cloudParent.appendChild(clone);

            const params = this.#makeCloudParameter(clone, idx);

            this.#applyCloudParameters(clone, params.x, params.y, params.scale);
            clone.style.opacity = String(params.opacity);
            clone.style.willChange = 'transform, opacity';


            this.#cloudPool.push({node: clone, ...params});
        } 
    }

    #removeClouds(n){ 
        for (let i = 0; i < n; i++){
            const item = this.#cloudPool.pop();
            if (!item) break;
            try {
                item.remove();
            }
            catch(e){ console.warn("Failed to remove cloud node", e)}
     }
    }

    #makeCloudParameter(node, idx){
        const wind = (this.sceneState?.wind?.speed ?? 2);
        const hummidity = (this.sceneState?.hourly?.relativehumidity_2m && this.sceneState.hourly.relativehumidity_2m.length)
                   ? (this.sceneState.hourly.relativehumidity_2m[0]) : 50;

        const rand = Math.random;
        const scale = clamp( (0.6 * hummidity / 150) * (0.8 + rand() * 0.8), this.#cloudConfig.minScale, this.#cloudConfig.maxScale);
        const speed = (this.#cloudConfig.baseSpeed ?? 20 + wind * this.#cloudConfig.windFactor) * (0.6 + rand() * 1.2);
        
        const y = lerp(this.#cloudConfig.yRange.top, this.#cloudConfig.yRange.bottom, rand());
        
        const width = this.host.querySelector('svg')?.viewBox?.baseVal?.width || (this.host.clientWidth || 1200)

        const x = lerp(-this.#cloudConfig.spawnPadding, width + this.#cloudConfig.spawnPadding, rand());

        const opacity = clamp(0.5 + (scale - 0.6) * 0.8 + (1 - wind/20), 0.35, 1)

        return {x, y, scale, speed, opacity, direction: (rand() > 0.5 ? 1 : -1)}
    }

    #applyCloudParameters(node, x, y, scale){
        node.setAttribute('transform', `translate(${x}, ${y}) scale(${scale})`);
    }

    #startCloudLoop(){
        if (this.#cloudRAF) return;
        this.#cloudLastTS = performance.now();
        const loop = (ts) => {
            const dt = (ts - (this.#cloudLastTS || ts)) / 1000;
            this.#cloudLastTS = ts;
            this.#updateClouds(dt);
            this.#cloudRAF = requestAnimationFrame(loop);
        }
        this.#cloudRAF = requestAnimationFrame(loop);
    }

    #stopCloudLoop(){
        if (this.#cloudRAF) cancelAnimationFrame(this.#cloudRAF); ;
        this.#cloudRAF = null;
        this.#cloudLastTS = null;
    }

    #updateClouds(dt){
        if (!this.#cloudPool || !this.#cloudPool.length) return;

        const svg = this.host.querySelector('svg');
        const vb = svg?.viewBox?.baseVal;

        const width = (vb && vb.width) ? vb.width : (svg?.clientWidth || 1200);
        const pad = this.#cloudConfig.spawnPadding ?? 100;

        for (let cloud of this.#cloudPool){
            cloud.x += cloud.speed * dt * cloud.direction;

            if (cloud.direction > 0 && cloud.x > width + pad){
                const newParams = this.#makeCloudParameter(cloud.node);
                cloud.x = -pad;
                cloud.y = newParams.y;
                cloud.scale = newParams.scale;
                cloud.speed = newParams.speed;
                cloud.opacity = newParams.opacity;
                cloud.direction = newParams.direction;
            }
            else if (cloud.direction < 0 && cloud.x < -pad){
                const newParams = this.#makeCloudParameter(cloud.node);
                cloud.x = width + pad;
                cloud.y = newParams.y;
                cloud.scale = newParams.scale;
                cloud.speed = newParams.speed;
                cloud.opacity = newParams.opacity;
                cloud.direction = newParams.direction;
            }

            this.#applyCloudParameters(cloud.node, cloud.x, cloud.y, cloud.scale);
            cloud.node.style.opacity = cloud.opacity;
        }
    }
}

function clamp(v, a, b){return Math.max(a, Math.min(b, v))}
function lerp(a,b,t){return a + (b - a) * t; }