class cloudController{
    constructor(host){this.host = host}

    apply(state, refs){
        this.cloudRefs = refs?.clouds || [];
    }

    #cloudPool = [];
    #cloudRAF = null;
    

    #cloudConfig = {}

    #initClouds(){
        if (!this.cloudRefs || !this.cloudRefs.length) return;

        this.#cloudPool = Array.from(this.cloudRefs).map((node, idx) => {
            node.style.willChange = 'transform, opacity';
            node.dataset._idx = idx;
            
        })
    }
}