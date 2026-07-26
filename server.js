import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// =============================================
// SUA CHAVE DA OPENWEATHERMAP
// =============================================
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';

// =============================================
// CACHES (Performance e Economia de API)
// =============================================
const geoCache = new Map();           // Cache de coordenadas (permanente)
const weatherCache = new Map();       // Cache de previsão (30 minutos)
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos em milissegundos

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
    snow: 'Snow expected. Wear warm clothes, gloves and a scarf. Watch out for ice.',
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
// GEOLOCALIZAÇÃO VIA OPENSTREETMAP (COM CACHE)
// =============================================
async function geocode(address) {
  const key = address.toLowerCase().trim();
  
  if (geoCache.has(key)) {
    console.log(`📍 Cache: ${geoCache.get(key).name}`);
    return geoCache.get(key);
  }
  
  await sleep(1000);
  
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=pt`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TempoNoDestino/1.0 (temponodestino@email.com)'
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        name: data[0].display_name.split(',')[0].trim()
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
// CÁLCULO DE FUSO HORÁRIO POR LONGITUDE
// =============================================
function getTimezoneFromLongitude(lon) {
  const hours = Math.round(lon / 15);
  const sign = hours >= 0 ? '+' : '';
  const absHours = Math.abs(hours);
  return `GMT${sign}${absHours}`;
}

// =============================================
// CÁLCULO DE DISTÂNCIA E TEMPO DE VIAGEM
// =============================================
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateETA(origin, dest, transport, departureStr) {
  const distance = getDistance(origin.lat, origin.lon, dest.lat, dest.lon);
  
  let speedKmh;
  switch (transport) {
    case 'plane': speedKmh = 800; break;
    case 'train': speedKmh = 200; break;
    case 'car':
    default:     speedKmh = 100; break;
  }
  
  let hours = distance / speedKmh;
  
  if (transport === 'plane') {
    hours += 3;
  }
  
  let departureTime;
  if (departureStr) {
    departureTime = new Date(departureStr);
  } else {
    departureTime = new Date();
  }
  
  const arrivalTime = new Date(departureTime.getTime() + hours * 60 * 60 * 1000);
  
  return {
    departureTime,
    arrivalTime,
    distance: Math.round(distance),
    duration: Math.round(hours * 10) / 10
  };
}

// =============================================
// PREVISÃO DO TEMPO (COM CACHE DE 30 MINUTOS)
// =============================================
async function getWeatherAtTime(coords, targetTime) {
  const cacheKey = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
  
  const cached = weatherCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    const age = Math.round((Date.now() - cached.timestamp) / 1000);
    console.log(`🌤️ Cache (${age}s atrás): ${Math.round(cached.data.temp)}°C`);
    return cached.data;
  }
  
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br&cnt=40`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (cached) {
        console.log('⚠️ API falhou, usando cache expirado');
        return cached.data;
      }
      throw new Error('Erro na API do OpenWeatherMap.');
    }
    
    const data = await response.json();

    if (data.list && data.list.length > 0) {
      const targetTimestamp = Math.floor(targetTime.getTime() / 1000);
      let closest = data.list[0];
      let minDiff = Math.abs(closest.dt - targetTimestamp);

      for (const item of data.list) {
        const diff = Math.abs(item.dt - targetTimestamp);
        if (diff < minDiff) {
          minDiff = diff;
          closest = item;
        }
      }

      const result = {
        temp: closest.main.temp,
        feels_like: closest.main.feels_like,
        weather: closest.weather
      };
      
      weatherCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      console.log(`🌤️ API: ${Math.round(result.temp)}°C`);
      return result;
    }

    throw new Error('Dados de previsão não disponíveis.');
    
  } catch (error) {
    if (cached) {
      console.log('⚠️ Erro na API, usando cache expirado');
      return cached.data;
    }
    throw error;
  }
}

// =============================================
// FUNÇÕES DE DICA E EMOJI
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
  const langTips = tips[lang] || tips['en'];
  return langTips[key] || tips['en'][key];
}

function getWeatherEmoji(id) {
  if (id >= 200 && id < 300) return '⛈️';
  if (id >= 300 && id < 400) return '🌧️';
  if (id >= 500 && id < 600) return '🌧️';
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

    if (!coordsOrigin) {
      throw new Error(`Cidade "${origin}" não encontrada.`);
    }
    if (!coordsDest) {
      throw new Error(`Cidade "${destination}" não encontrada.`);
    }

    const route = calculateETA(coordsOrigin, coordsDest, transport, departure);
    console.log(`⏱️ ${route.distance}km | ${route.duration}h`);

    const weather = await getWeatherAtTime(coordsDest, route.arrivalTime);
    console.log(`🌡️ Chegada: ${Math.round(weather.temp)}°C`);

    const tipKey = getTipKey(weather);
    const tip = getTip(tipKey, lang);

    res.json({
      success: true,
      origin: coordsOrigin.name,
      destination: coordsDest.name,
      transport,
      departureTime: route.departureTime.toISOString(),
      arrivalTime: route.arrivalTime.toISOString(),
      timezone: getTimezoneFromLongitude(coordsDest.lon),
      route: {
        distance: route.distance,
        duration: route.duration
      },
      weather: {
        temp: Math.round(weather.temp),
        feelsLike: Math.round(weather.feels_like),
        condition: weather.weather[0].description,
        icon: getWeatherEmoji(weather.weather[0].id)
      },
      tip
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// =============================================
// ESTATÍSTICAS DO CACHE
// =============================================
app.get('/api/stats', (req, res) => {
  res.json({
    geoCache: {
      size: geoCache.size,
      cities: Array.from(geoCache.keys())
    },
    weatherCache: {
      size: weatherCache.size,
      locations: Array.from(weatherCache.keys()).map(k => {
        const c = weatherCache.get(k);
        return {
          key: k,
          age: Math.round((Date.now() - c.timestamp) / 1000) + 's',
          temp: Math.round(c.data.temp) + '°C'
        };
      })
    },
    uptime: process.uptime().toFixed(0) + 's'
  });
});

// =============================================
// INICIAR SERVIDOR
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('✅ Servidor TempoNoDestino rodando!');
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/previsao`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log('🌍 Geo: OpenStreetMap (cache permanente)');
  console.log('🌤️ Previsão: OpenWeatherMap (cache 30min)');
  console.log('🚀 Pronto para escala!');
});