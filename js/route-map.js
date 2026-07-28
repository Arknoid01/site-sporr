const routeMaps = new Map();

function isLeafletReady() {
  return typeof L !== 'undefined';
}

function destroyRouteMap(containerId) {
  const map = routeMaps.get(containerId);
  if (!map) return;
  map.remove();
  routeMaps.delete(containerId);
}

function renderRouteMap(container, points, options = {}) {
  if (!container) return null;

  const containerId = container.id || `route-map-${Date.now()}`;
  if (!container.id) container.id = containerId;

  destroyRouteMap(containerId);

  if (!isLeafletReady() || points.length === 0) {
    return null;
  }

  const height = options.height || 180;
  container.innerHTML = '';
  container.style.height = `${height}px`;
  container.classList.add('route-map-container');

  const map = L.map(container, {
    zoomControl: options.zoomControl !== false,
    attributionControl: options.attributionControl !== false,
    dragging: options.interactive !== false,
    scrollWheelZoom: false,
    touchZoom: options.interactive !== false,
    doubleClickZoom: options.interactive !== false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  const latlngs = points.map((p) => [p.lat, p.lng]);

  if (latlngs.length >= 2) {
    map._routeLine = L.polyline(latlngs, { color: '#FF6B35', weight: 4, lineCap: 'round' }).addTo(map);
    map.fitBounds(map._routeLine.getBounds(), { padding: [24, 24], maxZoom: options.maxZoom || 17 });

    L.circleMarker(latlngs[0], {
      radius: 7,
      color: '#00C9A7',
      fillColor: '#00C9A7',
      fillOpacity: 1,
      weight: 2
    }).addTo(map);

    L.circleMarker(latlngs[latlngs.length - 1], {
      radius: 7,
      color: '#7B2FF7',
      fillColor: '#7B2FF7',
      fillOpacity: 1,
      weight: 2
    }).addTo(map);
  } else {
    map.setView(latlngs[0], 16);
    map._userMarker = L.circleMarker(latlngs[0], {
      radius: 8,
      color: '#FF6B35',
      fillColor: '#FF6B35',
      fillOpacity: 1,
      weight: 2
    }).addTo(map);
  }

  routeMaps.set(containerId, map);
  window.setTimeout(() => map.invalidateSize(), 100);
  return map;
}

function updateLiveRouteMap(containerId, points) {
  if (!points.length) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  let map = routeMaps.get(containerId);
  if (!map) {
    map = renderRouteMap(container, points, {
      height: 160,
      interactive: false,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 18
    });
  }
  if (!map) return;

  const latlngs = points.map((p) => [p.lat, p.lng]);
  const last = latlngs[latlngs.length - 1];

  if (latlngs.length >= 2) {
    if (map._routeLine) {
      map._routeLine.setLatLngs(latlngs);
    } else {
      map._routeLine = L.polyline(latlngs, { color: '#FF6B35', weight: 4, lineCap: 'round' }).addTo(map);
    }
    map.fitBounds(map._routeLine.getBounds(), { padding: [20, 20], maxZoom: 18 });
  } else if (map._userMarker) {
    map._userMarker.setLatLng(last);
    map.setView(last, 16);
  }

  window.setTimeout(() => map.invalidateSize(), 50);
}
