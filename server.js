import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// =============================================
// SUA CHAVE DA OPENWEATHERMAP
// =============================================
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';

// =============================================
// CACHES
// =============================================
const geoCache = new Map();
const weatherCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000;

// =============================================
// DICAS TRADUZIDAS (8 idiomas)
// =============================================
const tips = {
  'pt-BR': {
    storm: 'Possibilidade de tempestade. Evite áreas abertas e leve guarda-chuva.',
    rain: 'Chuva esperada. Um guarda-chuva compacto é recomendado.',
    snow: 'Neve esperada. Use roupas quentes, luvas e cachecol. Cuidado com gelo no chão.',
    cold: 'Frio. Leve um casaco pesado e luvas.',
    mild: 'Temperatura amena. Uma jaqueta leve é suficiente.',
    hot: 'Calor intenso. Hidrate-se bem e use protetor solar.',
    nice: 'Tempo agradável. Aproveite o dia!'
  },
  'en': {
    storm: 'Possible thunderstorm. Avoid open areas and bring an umbrella.',
    rain: 'Rain expected. A compact umbrella is recommended.',
    snow: 'Snow expected. Wear warm clothes, gloves and a scarf.',
    cold: 'Cold. Bring a heavy coat and gloves.',
    mild: 'Mild temperature. A light jacket is enough.',
    hot: 'Intense heat. Stay hydrated and use sunscreen.',
    nice: 'Pleasant weather. Enjoy your day!'
  },
  'es': {
    storm: 'Posibilidad de tormenta. Evite áreas abiertas y lleve paraguas.',
    rain: 'Lluvia esperada. Se recomienda un paraguas compacto.',
    snow: 'Nieve esperada. Use ropa abrigada, guantes y bufanda.',
    cold: 'Frío. Lleve un abrigo pesado y guantes.',
    mild: 'Temperatura templada. Una chaqueta ligera es suficiente.',
    hot: 'Calor intenso. Manténgase hidratado y use protector solar.',
    nice: 'Clima agradable. ¡Disfrute el día!'
  },
  'de': {
    storm: 'Gewitter möglich. Meiden Sie offene Flächen.',
    rain: 'Regen erwartet. Ein Regenschirm wird empfohlen.',
    snow: 'Schnee erwartet. Warme Kleidung tragen.',
    cold: 'Kalt. Bringen Sie einen Mantel mit.',
    mild: 'Milde Temperatur. Eine leichte Jacke reicht.',
    hot: 'Starke Hitze. Bleiben Sie hydratisiert.',
    nice: 'Angenehmes Wetter. Genießen Sie den Tag!'
  },
  'fr': {
    storm: 'Orage possible. Évitez les zones ouvertes.',
    rain: 'Pluie attendue. Un parapluie est recommandé.',
    snow: 'Neige attendue. Portez des vêtements chauds.',
    cold: 'Froid. Apportez un manteau.',
    mild: 'Température douce. Une veste légère suffit.',
    hot: 'Chaleur intense. Restez hydraté.',
    nice: 'Temps agréable. Profitez de la journée !'
  },
  'it': {
    storm: 'Possibilità di temporale. Evitate aree aperte.',
    rain: 'Pioggia prevista. Si consiglia un ombrello.',
    snow: 'Neve prevista. Indossate abiti caldi.',
    cold: 'Freddo. Portate un cappotto.',
    mild: 'Temperatura mite. Una giacca leggera basta.',
    hot: 'Caldo intenso. Rimanete idratati.',
    nice: 'Tempo piacevole. Godetevi la giornata!'
  },
  'zh-CN': {
    storm: '可能有雷暴。请避开开阔区域。',
    rain: '预计有雨。建议带伞。',
    snow: '预计有雪。请穿保暖衣物。',
    cold: '天气寒冷。请带外套。',
    mild: '温度适中。薄夹克即可。',
    hot: '天气炎热。请多喝水。',
    nice: '天气宜人。祝您愉快！'
  },
  'ja': {
    storm: '雷雨の可能性。開けた場所を避けて。',
    rain: '雨が予想。傘をお持ちください。',
    snow: '雪が予想。暖かい服を着て。',
    cold: '寒くなります。コートを持って。',
    mild: '穏やかな気温。薄手のジャケットで。',
    hot: '猛暑です。水分補給を。',
    nice: '快適な天気。良い一日を！'
  }
};

// =============================================
// BANCO LOCAL DE CIDADES FAMOSAS
// =============================================
const famousCities = {
  'sao paulo': { lat: -23.5505, lon: -46.6333, name: 'São Paulo' },
  'sp': { lat: -23.5505, lon: -46.6333, name: 'São Paulo' },
  'rio de janeiro': { lat: -22.9068, lon: -43.1729, name: 'Rio de Janeiro' },
  'brasilia': { lat: -15.7975, lon: -47.8919, name: 'Brasília' },
  'belo horizonte': { lat: -19.9167, lon: -43.9345, name: 'Belo Horizonte' },
  'salvador': { lat: -12.9714, lon: -38.5014, name: 'Salvador' },
  'fortaleza': { lat: -3.7172, lon: -38.5433, name: 'Fortaleza' },
  'curitiba': { lat: -25.4297, lon: -49.2711, name: 'Curitiba' },
  'porto alegre': { lat: -30.0346, lon: -51.2177, name: 'Porto Alegre' },
  'recife': { lat: -8.0476, lon: -34.8770, name: 'Recife' },
  'manaus': { lat: -3.1190, lon: -60.0217, name: 'Manaus' },
  'nova york': { lat: 40.7128, lon: -74.0060, name: 'Nova York' },
  'new york': { lat: 40.7128, lon: -74.0060, name: 'Nova York' },
  'londres': { lat: 51.5074, lon: -0.1278, name: 'Londres' },
  'london': { lat: 51.5074, lon: -0.1278, name: 'Londres' },
  'paris': { lat: 48.8566, lon: 2.3522, name: 'Paris' },
  'madri': { lat: 40.4168, lon: -3.7038, name: 'Madri' },
  'madrid': { lat: 40.4168, lon: -3.7038, name: 'Madri' },
  'barcelona': { lat: 41.3874, lon: 2.1686, name: 'Barcelona' },
  'lisboa': { lat: 38.7223, lon: -9.1393, name: 'Lisboa' },
  'berlim': { lat: 52.5200, lon: 13.4050, name: 'Berlim' },
  'berlin': { lat: 52.5200, lon: 13.4050, name: 'Berlim' },
  'roma': { lat: 41.9028, lon: 12.4964, name: 'Roma' },
  'rome': { lat: 41.9028, lon: 12.4964, name: 'Roma' },
  'toquio': { lat: 35.6762, lon: 139.6503, name: 'Tóquio' },
  'tokyo': { lat: 35.6762, lon: 139.6503, name: 'Tóquio' },
  'sydney': { lat: -33.8688, lon: 151.2093, name: 'Sydney' },
  'dubai': { lat: 25.2048, lon: 55.2708, name: 'Dubai' },
  'buenos aires': { lat: -34.6037, lon: -58.3816, name: 'Buenos Aires' },
  'santiago': { lat: -33.4489, lon: -70.6693, name: 'Santiago' },
  'lima': { lat: -12.0464, lon: -77.0428, name: 'Lima' },
  'miami': { lat: 25.7617, lon: -80.1918, name: 'Miami' },
  'los angeles': { lat: 34.0522, lon: -118.2437, name: 'Los Angeles' },
  'toronto': { lat: 43.6532, lon: -79.3832, name: 'Toronto' },
  'amsterdam': { lat: 52.3676, lon: 4.9041, name: 'Amsterdã' },
  'moscou': { lat: 55.7558, lon: 37.6173, name: 'Moscou' },
  'moscow': { lat: 55.7558, lon: 37.6173, name: 'Moscou' },
  'pequim': { lat: 39.9042, lon: 116.4074, name: 'Pequim' },
  'beijing': { lat: 39.9042, lon: 116.4074, name: 'Pequim' },
  'xangai': { lat: 31.2304, lon: 121.4737, name: 'Xangai' },
  'shanghai': { lat: 31.2304, lon: 121.4737, name: 'Xangai' },
  'cidade do mexico': { lat: 19.4326, lon: -99.1332, name: 'Cidade do México' }
};

// =============================================
// GEOLOCALIZAÇÃO (BANCO LOCAL + OPENSTREETMAP)
// =============================================
async function geocode(address) {
  const key = address.toLowerCase().trim();
  
  if (famousCities[key]) {
    console.log(`📍 Banco local: ${famousCities[key].name}`);
    geoCache.set(key, famousCities[key]);
    return famousCities[key];
  }
  
  if (geoCache.has(key)) {
    console.log(`📍 Cache: ${geoCache.get(key).name}`);
    return geoCache.get(key);
  }
  
  await sleep(1000);
  
  const countryHints = {
    'madri': 'Espanha', 'madrid': 'Espanha', 'barcelona': 'Espanha',
    'paris': 'França', 'londres': 'Reino Unido', 'london': 'Reino Unido',
    'lisboa': 'Portugal', 'lisbon': 'Portugal',
    'roma': 'Itália', 'rome': 'Itália',
    'berlim': 'Alemanha', 'berlin': 'Alemanha'
  };
  
  let query = address;
  if (countryHints[key]) {
    query = `${address}, ${countryHints[key]}`;
  }
  
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=3&accept-language=pt`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TempoNoDestino/1.0 (temponodestino@email.com)' }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.length > 0) {
      const best = data.sort((a, b) => parseFloat(b.importance) - parseFloat(a.importance))[0];
      const result = {
        lat: parseFloat(best.lat),
        lon: parseFloat(best.lon),
        name: best.display_name.split(',')[0].trim()
      };
      geoCache.set(key, result);
      console.log(`📍 OpenStreetMap: ${result.name}`);
      return result;
    }
  } catch (error) {
    console.warn('⚠️ OpenStreetMap falhou:', error.message);
  }
  
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================
// FUSO HORÁRIO POR LONGITUDE
// =============================================
function getTimezoneFromLongitude(lon) {
  const hours = Math.round(lon / 15);
  const sign = hours >= 0 ? '+' : '';
  return `GMT${sign}${Math.abs(hours)}`;
}

// =============================================
// DISTÂNCIA E TEMPO DE VIAGEM
// =============================================
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateETA(origin, dest, transport, departureStr) {
  const distance = getDistance(origin.lat, origin.lon, dest.lat, dest.lon);
  const speeds = { plane: 800, train: 200, car: 100 };
  let hours = distance / (speeds[transport] || 100);
  if (transport === 'plane') hours += 3;
  
  const departureTime = departureStr ? new Date(departureStr) : new Date();
  const arrivalTime = new Date(departureTime.getTime() + hours * 3600000);
  
  return { departureTime, arrivalTime, distance: Math.round(distance), duration: Math.round(hours * 10) / 10 };
}

// =============================================
// PREVISÃO DO TEMPO
// =============================================
async function getWeatherAtTime(coords, targetTime) {
  const cacheKey = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`🌤️ Cache: ${Math.round(cached.data.temp)}°C`);
    return cached.data;
  }
  
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br&cnt=40`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API falhou');
    const data = await response.json();
    
    const target = Math.floor(targetTime.getTime() / 1000);
    let closest = data.list[0];
    let min = Math.abs(closest.dt - target);
    
    for (const item of data.list) {
      const diff = Math.abs(item.dt - target);
      if (diff < min) { min = diff; closest = item; }
    }
    
    const result = { temp: closest.main.temp, feels_like: closest.main.feels_like, weather: closest.weather };
    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    console.log(`🌤️ API: ${Math.round(result.temp)}°C`);
    return result;
  } catch (error) {
    if (cached) return cached.data;
    throw error;
  }
}

// =============================================
// DICAS E EMOJIS
// =============================================
function getTipKey(weather) {
  const id = weather.weather[0].id;
  const temp = weather.temp;
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (temp < 10) return 'cold';
  if (temp < 20) return 'mild';
  if (temp > 30) return 'hot';
  return 'nice';
}

function getTip(key, lang) {
  return (tips[lang] || tips['en'])[key] || tips['en'][key];
}

function getWeatherEmoji(id) {
  if (id >= 200 && id < 300) return '⛈️';
  if (id >= 300 && id < 600) return '🌧️';
  if (id >= 600 && id < 700) return '🌨️';
  if (id >= 700 && id < 800) return '🌫️';
  if (id === 800) return '☀️';
  if (id === 801) return '🌤️';
  if (id === 802) return '⛅';
  return '☁️';
}

// =============================================
// ROTA PRINCIPAL
// =============================================
app.post('/api/previsao', async (req, res) => {
  const { origin, destination, transport, departure } = req.body;
  const lang = req.body.lang || 'pt-BR';

  console.log(`\n🔍 ${origin} → ${destination} (${transport})`);

  try {
    const coordsOrigin = await geocode(origin);
    const coordsDest = await geocode(destination);

    if (!coordsOrigin) throw new Error(`Cidade "${origin}" não encontrada.`);
    if (!coordsDest) throw new Error(`Cidade "${destination}" não encontrada.`);

    const route = calculateETA(coordsOrigin, coordsDest, transport, departure);
    console.log(`⏱️ ${route.distance}km | ${route.duration}h`);

    const weather = await getWeatherAtTime(coordsDest, route.arrivalTime);
    console.log(`🌡️ Chegada: ${Math.round(weather.temp)}°C`);

    res.json({
      success: true,
      origin: coordsOrigin.name,
      destination: coordsDest.name,
      transport,
      departureTime: route.departureTime.toISOString(),
      arrivalTime: route.arrivalTime.toISOString(),
      timezone: getTimezoneFromLongitude(coordsDest.lon),
      route: { distance: route.distance, duration: route.duration },
      weather: {
        temp: Math.round(weather.temp),
        feelsLike: Math.round(weather.feels_like),
        condition: weather.weather[0].description,
        icon: getWeatherEmoji(weather.weather[0].id)
      },
      tip: getTip(getTipKey(weather), lang)
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// =============================================
// ESTATÍSTICAS
// =============================================
app.get('/api/stats', (req, res) => {
  res.json({
    geoCache: { size: geoCache.size, cities: Array.from(geoCache.keys()) },
    weatherCache: {
      size: weatherCache.size,
      locations: Array.from(weatherCache.keys()).map(k => {
        const c = weatherCache.get(k);
        return { key: k, age: Math.round((Date.now() - c.timestamp) / 1000) + 's', temp: Math.round(c.data.temp) + '°C' };
      })
    },
    uptime: process.uptime().toFixed(0) + 's'
  });
});

// =============================================
// INICIAR
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('✅ Servidor TempoNoDestino rodando!');
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/previsao`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log('🌍 Geo: Banco local + OpenStreetMap');
  console.log('🌤️ Previsão: OpenWeatherMap (cache 30min)');
  console.log('🚀 Pronto!');
});