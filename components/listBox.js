export default class Listbox {
    constructor({listBoxEl, inputEl, announcer, onSelect}){
        this.listBox = listBoxEl;
        this.input = inputEl;
        this.announce = announcer;
        this.onSelect = onSelect;
        this.options = [];
        this.activeIndex = -1;
    }

    openListBox() { if (this.listBox.hidden) {this.listBox.hidden = false; 
        this.input.setAttribute('aria-expanded', 'true'); } }

    closeListBox() { if (!this.listBox.hidden) { this.listBox.hidden = true; 
        this.input.setAttribute('aria-expanded', 'false'); 
        this.input.removeAttribute('aria-activedescendant'); this.activeIndex = -1; } }

    render(items, query, i18n){
        this.listBox.innerHTML = '';
        this.options = items;
        if (!items.length){
            const li = document.createElement('li');
            li.role = 'option';
            li.className = 'option';
            li.setAttribute('aria-disabled', 'true')
            li.textContent = i18n.none;
            this.listBox.appendChild(li);
            this.openListBox();
            this.announce(i18n.none);
            return;
        }
        const regex = new RegExp(query.replace(/[.*+?${}()|[\]\\]/g, '\\$&'), 'i');
        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.role = 'option';
            li.id = `option-${idx}`;
            li.className = 'option';
            li.dataset.label = item.label;
            li.dataset.lat = item.lat;
            li.dataset.lon = item.lon;
            li.innerHTML = item.label.replace(regex, match => '<mark>' + match + '</mark>');
            this.listBox.appendChild(li);
        })
        this.announce(i18n.results(items.length));
        this.openListBox();
        this.setActive(0);
    }

    setActive(idx) {// set active index
        const nodeList = this.listBox ? this.listBox.querySelectorAll('.option[role="option"]') : null;
        const opts = Array.from(nodeList || []);
        if (!opts.length) return;
        idx = Math.max(0, Math.min(idx, opts.length - 1));
        if (this.activeIndex >= 0 && opts[this.activeIndex]) opts[this.activeIndex].dataset.active = 'false';
        this.activeIndex = idx;
        const el = opts[this.activeIndex];
        el.dataset.active = 'true';
        this.input.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
    }

    handleKey(e){
        const open = !this.listBox.hidden;
        if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) { this.openListBox(); this.setActive(0); } else this.setActive(this.activeIndex + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); if (!open) { this.openListBox(); this.setActive(0); } else this.setActive(this.activeIndex - 1); }
        else if (e.key === 'Home') { if (open) { e.preventDefault(); this.setActive(0); } }
        else if (e.key === 'End') { if (open) { e.preventDefault(); this.setActive(this.options.length - 1); } }
        else if (e.key === 'Enter') { if (open && this.activeIndex >= 0) { e.preventDefault(); this.__select(this.activeIndex); } }
        else if (e.key === 'Escape') { if (open) { e.preventDefault(); this.closeListBox(); } }
    }

    __select(idx){
        const el = this.listBox.querySelector(`#option-${idx}`);
        if (!el || el.getAttribute('aria-disabled') === 'true') return;
        const label = el.dataset.label; 
        const lat = Number(el.dataset.lat); 
        const lon = Number(el.dataset.lon);
        this.input.value = label;
         console.log({label, lat, lon})
        this.closeListBox(); 
        this.onSelect({lat, lon, label}) 
    }
}

