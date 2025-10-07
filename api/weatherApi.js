const FORECAST = (lat, lon) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}
&longitude=${lon}
&current_weather=true
&hourly=cloudcover,relativehumidity_2m
&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,sunrise,sunset
&windspeed_unit=ms
&forecast_days=5&timezone=auto`;


export {FORECAST};