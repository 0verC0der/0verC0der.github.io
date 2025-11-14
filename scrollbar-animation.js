const slider = document.getElementById('slider')
const btnLeft = document.getElementById('btn-left')
const btnRight = document.getElementById('btn-right')

const step = 220 // на скільки пікселів рухати

btnRight.addEventListener('click', () => {
	slider.scrollBy({ left: step, behavior: 'smooth' })
})

btnLeft.addEventListener('click', () => {
	slider.scrollBy({ left: -step, behavior: 'smooth' })
})
