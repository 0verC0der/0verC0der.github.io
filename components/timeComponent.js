export class TimeCounter {
    constructor(){
    
    }
    #rafID = null

    #timeState = {
        timeNow: new Date()
    }

    

    updateTime(timeNow){
        if (this.#rafID) return;
        var start;

        const loop = (timestamp) => {
            if(!start) start = timestamp

            const dt = timestamp - start
            start = timestamp
            this.#timeState.timeNow = new Date(this.#timeState.timeNow.getTime() + dt);
            this.#rafID = requestAnimationFrame(loop)
        }
        this.#rafID = requestAnimationFrame(loop)
    }

    getCurrentTimeCounter(){
        return this.#timeState.timeNow
    }

}