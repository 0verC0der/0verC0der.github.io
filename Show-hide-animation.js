const btn = document.getElementById('toggle-btn')

btn.addEventListener('click', () => {
	document.body.classList.toggle('hidden')
	btn.classList.toggle('hidden-btn')
})
