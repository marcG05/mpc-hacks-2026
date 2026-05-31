import { useState, useEffect, useRef } from 'react';
import { Icon } from '../../../components';
import { fetchMapToken } from '../../../services/api';

const COUNTRY_LNL: Record<string, [number, number]> = {
  US: [-100, 40],
  CA: [-95, 60],
  GB: [-2, 54],
  DE: [10, 51],
  FR: [2, 46],
  CN: [104, 35],
  JP: [138, 36],
  BR: [-52, -14],
  IN: [78, 20],
  RU: [105, 61],
  AU: [133, -25],
  ZA: [25, -30],
  MX: [-102, 23],
  IT: [12, 41],
  ES: [-3, 40],
  NL: [5, 52],
  SG: [103, 1],
};

function getCountryLngLat(code: string): [number, number] {
  return COUNTRY_LNL[code.toUpperCase()] || [-100, 40];
}

interface MapboxMapProps {
  originCountry: string;
  destCountry: string;
}

export function MapboxMap({ originCountry, destCountry }: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    async function getToken() {
      try {
        const res = await fetchMapToken();
        if (res.token) {
          setToken(res.token);
        }
      } catch (e) {
        console.error('Failed to load map token:', e);
      }
    }
    getToken();
  }, []);

  useEffect(() => {
    if (!token) return;

    if ((window as any).mapboxgl) {
      setLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, [token]);

  useEffect(() => {
    if (!loaded || !token || !mapContainerRef.current) return;

    const mapboxgl = (window as any).mapboxgl;
    mapboxgl.accessToken = token;

    const origin = getCountryLngLat(originCountry);
    const dest = getCountryLngLat(destCountry);
    
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(origin);
    bounds.extend(dest);

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      bounds: bounds,
      fitBoundsOptions: { padding: 40, maxZoom: 5 }
    });

    mapRef.current = map;

    map.on('load', () => {
      new mapboxgl.Marker({ color: '#38c08a' })
        .setLngLat(origin)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h4>Cardholder Home</h4><p>${originCountry}</p>`))
        .addTo(map);

      new mapboxgl.Marker({ color: '#f0616d' })
        .setLngLat(dest)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h4>Merchant Store</h4><p>${destCountry}</p>`))
        .addTo(map);

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [origin, dest]
          }
        }
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#f0616d',
          'line-width': 2.5,
          'line-dasharray': [2, 2]
        }
      });
    });

    return () => {
      map.remove();
    };
  }, [loaded, token, originCountry, destCountry]);

  if (!token) {
    return (
      <div style={{ height: 360, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', color: 'var(--text-3)', fontSize: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        No Mapbox token found in environment.
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{ height: 360, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', color: 'var(--text-3)', fontSize: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div className="flex" style={{ alignItems: 'center', gap: 6 }}>
          <Icon name="refresh" className="spin" size={16} />
          <span>Loading map client...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainerRef} 
      style={{ height: 360, width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}
    />
  );
}
