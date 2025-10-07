const GEO_API_URL = (query, lang) => `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=${lang}&format=json`;
const GEO_REV = (lat, lon, lang) => `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&language=${lang}&format=json`;



export {GEO_API_URL, GEO_REV}