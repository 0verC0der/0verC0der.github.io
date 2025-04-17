document.addEventListener('mousemove', (event) => {
    const {clientX, clientY} = event;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;    

    const xOffset = (clientX / windowWidth) * 50;
    const yOffset = (clientY / windowHeight) * 50;  

    document.body.style.backgroundPosition = `${xOffset}% ${yOffset}%`;
});   