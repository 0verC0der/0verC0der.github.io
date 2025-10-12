const _shared = {
    timeNow: new Date(),
    rafID: null
}

export class TimeCounter {
    constructor(timeNow){
        _shared.timeNow = timeNow ? new Date(timeNow) : new Date()
    }

    updateTime(){
        if (_shared.rafID) return;
        var start;
        console.log("Time: ", _shared.timeNow);
        const loop = (timestamp) => {
            if(!start) start = timestamp 
            const dt = timestamp - start
            start = timestamp
            _shared.timeNow = new Date(_shared.timeNow.getTime() + dt);
            _shared.rafID = requestAnimationFrame(loop)
        }
        _shared.rafID = requestAnimationFrame(loop)
    }

    stopTime(){
        if(!_shared.rafID) return;
        cancelAnimationFrame(_shared.rafID)
        _shared.rafID = null
    }

    setTimeCounter(newTime){
        _shared.timeNow = new Date(newTime)
    }

    getCurrentTimeCounter(){
        return _shared.timeNow
    }

}