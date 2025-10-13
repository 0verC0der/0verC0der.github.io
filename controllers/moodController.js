export class moodController {
  constructor(host){ this.host = host; }
  apply(state){
    const code = state.code ?? 0;
    const mood = {
      clear:   { saturate:1.0,  brightness:1.00, contrast:1.00, hue:10 },
      cloudy:  { saturate:0.75, brightness:0.98, contrast:0.96, hue:0 },
      overcast:{ saturate:0.45, brightness:0.82, contrast:0.95, hue:10 },
      rain:    { saturate:0.50, brightness:0.90, contrast:0.96, hue:0 },
      snow:    { saturate:0.10, brightness:1.08, contrast:0.93, hue:230 },
      thunder: { saturate:0.35, brightness:0.85, contrast:1.06, hue:220 },
      fog:     { saturate:0.25, brightness:0.96, contrast:0.88, hue:0, blur:'1px' },
    };
    const cls = (c) => {
      if (c===0) return 'clear';
      if ([1,2].includes(c)) return 'cloudy';
      if (c===3) return 'overcast';
      if ([45,48].includes(c)) return 'fog';
      if ([61,63,65,80,81,82,66,67].includes(c)) return 'rain';
      if ([71,73,75,77,85,86].includes(c)) return 'snow';
      if ([95,96,99].includes(c)) return 'thunder';
      return 'cloudy';
    };
    const m = mood[cls(code)];
    const setVars = ({saturate=1, brightness=1, contrast=1, hue=0, blur='0px'})=>{
      const el = this.host;
      el.style.setProperty('--sat', String(saturate));
      el.style.setProperty('--bright', String(brightness));
      el.style.setProperty('--contrast', String(contrast));
      el.style.setProperty('--hue', hue + (typeof hue === 'number' ? 'deg':''));
      el.style.setProperty('--blur', String(blur));
    };
    setVars(m);
  }
}