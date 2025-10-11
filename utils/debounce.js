export function debounceFetch (fn, wait = 200){
    let timer = null;
    let abortController = null;

    return (...args) => {
        if (timer) clearTimeout(timer);
        abortController?.abort()
        
        abortController = new AbortController();
        const signal = abortController.signal;

        timer = setTimeout(() => {
            fn(...args, signal);
        }, wait);
    }
}