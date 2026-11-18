(() => {
  const elements = {
    mapLoading: document.getElementById('map-loading'),
    mapHint: document.getElementById('map-hint-text'),
    travelMode: document.getElementById('travel-mode'),
    areaControl: document.getElementById('area-control'),
    areaSelect: document.getElementById('area-select'),
    areaLabel: document.getElementById('area-label'),
    startLocation: document.getElementById('start-location'),
    endLocation: document.getElementById('end-location'),
    sunWeight: document.getElementById('sun-weight'),
    sunValue: document.getElementById('sun-value'),
    floodWeight: document.getElementById('flood-weight'),
    floodValue: document.getElementById('flood-value'),
    algorithm: document.getElementById('algorithm'),
    findRoute: document.getElementById('find-route'),
    reset: document.getElementById('reset'),
    error: document.getElementById('error-message'),
    comparison: document.getElementById('comparison'),
    driveSummary: document.getElementById('drive-summary'),
    showNetwork: document.getElementById('show-network'),
    networkScore: document.getElementById('network-score'),
    areaInfo: document.getElementById('area-info')
  };

  let map;
  let bounds;
  let indiaBounds;
  let boundsLayer = null;
  let selectedAreaId = null;
  let driveMode = false;
  let startPoint = null;
  let endPoint = null;
  let startMarker = null;
  let endMarker = null;
  let routeLayer = null;
  let networkLayer = null;
  let networkEdges = null;
  let requestInProgress = false;
  let defaultWeights = { w1: 1.5, w2: 2 };

  function showError(message) {
    elements.error.textContent = message;
    elements.error.hidden = false;
  }

  function clearError() {
    elements.error.textContent = '';
    elements.error.hidden = true;
  }

  function updateHint() {
    const hintStep = document.querySelector('.hint-step');
    if (!startPoint) {
      elements.mapHint.textContent = 'Click the map to choose your start';
      hintStep.textContent = '1';
    } else if (!endPoint) {
      elements.mapHint.textContent = 'Now click to choose your destination';
      hintStep.textContent = '2';
    } else {
      elements.mapHint.textContent = 'Ready — find your routes';
      hintStep.textContent = '✓';
    }
    elements.findRoute.disabled = !startPoint || !endPoint || requestInProgress;
  }

  function formatPoint(point) {
    return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
  }

  function makeMarker(point, type, label) {
    const icon = L.divIcon({
      className: 'route-marker-icon',
      html: `<span class="route-marker ${type}" aria-hidden="true"></span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    return L.marker(point, { icon, title: label, keyboard: true }).addTo(map);
  }

  function clearRoutes() {
    if (routeLayer) {
      map.removeLayer(routeLayer);
      routeLayer = null;
    }
    elements.comparison.hidden = true;
    elements.driveSummary.hidden = true;
  }

  function handleMapClick(event) {
    if (requestInProgress) return;
    const point = event.latlng;
    if (!bounds.contains(point)) {
      showError(driveMode
        ? 'Click inside the highlighted India area to choose your points.'
        : 'Click inside the highlighted city area to choose your points.');
      return;
    }

    clearError();
    clearRoutes();
    if (startPoint && endPoint) {
      if (startMarker) map.removeLayer(startMarker);
      if (endMarker) map.removeLayer(endMarker);
      startPoint = point;
      endPoint = null;
      startMarker = makeMarker(point, 'start', 'Start');
      endMarker = null;
      elements.startLocation.textContent = formatPoint(point);
      elements.endLocation.textContent = 'Choose a second point';
    } else if (!startPoint) {
      startPoint = point;
      startMarker = makeMarker(point, 'start', 'Start');
      elements.startLocation.textContent = formatPoint(point);
    } else {
      endPoint = point;
      endMarker = makeMarker(point, 'end', 'Destination');
      elements.endLocation.textContent = formatPoint(point);
    }
    updateHint();
  }

  function formatDistance(meters) {
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters.toFixed(0)} m`;
  }

  function formatScore(score) {
    return `${(score * 100).toFixed(0)}%`;
  }

  function formatCost(cost) {
    return `${cost.toFixed(0)} m`;
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function fillComparison(data) {
    setText('shortest-distance', formatDistance(data.shortest.distance));
    setText('shadow-distance', formatDistance(data.shadow.distance));
    setText('shortest-sun', formatScore(data.shortest.avgSun));
    setText('shadow-sun', formatScore(data.shadow.avgSun));
    setText('shortest-flood', formatScore(data.shortest.avgFlood));
    setText('shadow-flood', formatScore(data.shadow.avgFlood));
    setText('shortest-cost', formatCost(data.shortest.cost));
    setText('shadow-cost', formatCost(data.shadow.cost));
    setText('dijkstra-nodes', data.stats.dijkstra.nodesExplored.toLocaleString());
    setText('dijkstra-time', data.stats.dijkstra.timeMs.toFixed(2));
    setText('astar-nodes', data.stats.astar.nodesExplored.toLocaleString());
    setText('astar-time', data.stats.astar.timeMs.toFixed(2));
    elements.comparison.hidden = false;
  }

  function drawRoutes(data) {
    clearRoutes();
    const shortest = L.polyline(data.shortest.coordinates, {
      color: '#df554d',
      weight: 5,
      opacity: 0.9,
      dashArray: '9 8',
      lineCap: 'round',
      lineJoin: 'round'
    });
    const shadow = L.polyline(data.shadow.coordinates, {
      color: '#2f8658',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    routeLayer = L.featureGroup([shortest, shadow]).addTo(map);
    fillComparison(data);
    map.fitBounds(routeLayer.getBounds(), { padding: [48, 48], maxZoom: 17 });
  }

  function drawDrivingRoute(data) {
    clearRoutes();
    routeLayer = L.polyline(data.coordinates, {
      color: '#3477b8',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    setText('drive-distance', formatDistance(data.distance));
    const minutes = Math.round(data.duration / 60);
    setText('drive-duration', minutes >= 60
      ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
      : `${minutes} min`);
    elements.driveSummary.hidden = false;
    map.fitBounds(routeLayer.getBounds(), { padding: [48, 48], maxZoom: 9 });
  }

  async function findRoutes() {
    if (!startPoint || !endPoint || requestInProgress) return;
    clearError();
    requestInProgress = true;
    elements.findRoute.disabled = true;
    elements.reset.disabled = true;
    elements.findRoute.setAttribute('aria-busy', 'true');
    elements.findRoute.innerHTML = '<span class="button-spinner" aria-hidden="true"></span><span>Finding routes…</span>';

    const params = new URLSearchParams({
      fromLat: startPoint.lat,
      fromLon: startPoint.lng,
      toLat: endPoint.lat,
      toLon: endPoint.lng
    });
    if (!driveMode) {
      params.set('w1', elements.sunWeight.value);
      params.set('w2', elements.floodWeight.value);
      params.set('algo', elements.algorithm.value);
      params.set('area', selectedAreaId);
    }

    try {
      const endpoint = driveMode ? '/api/drive-route' : '/api/route';
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404 && !driveMode) {
          throw new Error('No path found between those points. Try choosing points closer together.');
        }
        throw new Error(data.error || 'Could not calculate the routes. Please try again.');
      }
      if (driveMode) {
        if (!Array.isArray(data.coordinates) || data.coordinates.length === 0) {
          throw new Error('The driving service returned an incomplete route. Please try again.');
        }
        drawDrivingRoute(data);
        elements.driveSummary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      if (!data.shortest || !data.shadow || !Array.isArray(data.shortest.coordinates)
        || !Array.isArray(data.shadow.coordinates)) {
        throw new Error('The server returned an incomplete route. Please try again.');
      }
      drawRoutes(data);
      elements.comparison.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      if (error instanceof TypeError && !navigator.onLine) {
        showError('Could not reach the route server. Check your connection and try again.');
      } else {
        showError(error.message || 'Something went wrong while finding your route.');
      }
    } finally {
      requestInProgress = false;
      elements.reset.disabled = false;
      elements.findRoute.removeAttribute('aria-busy');
      elements.findRoute.innerHTML = '<span>Find routes</span><span aria-hidden="true">→</span>';
      updateHint();
    }
  }

  function reset() {
    clearError();
    clearRoutes();
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    startMarker = null;
    endMarker = null;
    startPoint = null;
    endPoint = null;
    elements.startLocation.textContent = 'Choose a point on the map';
    elements.endLocation.textContent = 'Choose a second point';
    elements.sunWeight.value = defaultWeights.w1;
    elements.floodWeight.value = defaultWeights.w2;
    elements.sunValue.value = Number(defaultWeights.w1).toFixed(1);
    elements.floodValue.value = Number(defaultWeights.w2).toFixed(1);
    elements.sunValue.textContent = Number(defaultWeights.w1).toFixed(1);
    elements.floodValue.textContent = Number(defaultWeights.w2).toFixed(1);
    elements.algorithm.value = 'astar';
    elements.showNetwork.checked = false;
    elements.networkScore.disabled = true;
    if (networkLayer) {
      map.removeLayer(networkLayer);
      networkLayer = null;
    }
    updateHint();
    map.fitBounds(bounds, { padding: [20, 20] });
  }

  function interpolateColor(value, metric) {
    const stops = metric === 'sunPenalty'
      ? [[41, 126, 91], [226, 190, 75], [214, 75, 63]]
      : [[52, 126, 176], [225, 190, 75], [214, 75, 63]];
    const bounded = Math.max(0, Math.min(1, value));
    const index = bounded < 0.5 ? 0 : 1;
    const amount = bounded < 0.5 ? bounded * 2 : (bounded - 0.5) * 2;
    const color = stops[index].map((channel, channelIndex) => (
      Math.round(channel + (stops[index + 1][channelIndex] - channel) * amount)
    ));
    return `#${color.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  }

  function renderNetwork() {
    if (networkLayer) {
      map.removeLayer(networkLayer);
      networkLayer = null;
    }
    if (!elements.showNetwork.checked || !networkEdges) return;

    const metric = elements.networkScore.value;
    const lines = networkEdges.map((edge) => L.polyline(edge.coordinates, {
      color: interpolateColor(edge[metric], metric),
      weight: 4,
      opacity: 0.76,
      interactive: false
    }));
    networkLayer = L.layerGroup(lines).addTo(map);
    if (routeLayer) {
      routeLayer.eachLayer((layer) => layer.bringToFront());
    }
    if (networkEdges.truncated) {
      elements.areaInfo.textContent = 'Showing a sample of 500 roads. Green/blue = lower score; red = higher score.';
    } else {
      elements.areaInfo.textContent = 'Green/blue = lower score; red = higher score.';
    }
  }

  async function toggleNetwork() {
    elements.networkScore.disabled = !elements.showNetwork.checked;
    if (!elements.showNetwork.checked) {
      renderNetwork();
      return;
    }
    clearError();
    try {
      if (!networkEdges) {
        const response = await fetch(`/api/network?area=${encodeURIComponent(selectedAreaId)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load road scores.');
        if (!Array.isArray(data.edges)) throw new Error('The server returned invalid road score data.');
        networkEdges = data.edges;
        networkEdges.truncated = data.truncated;
      }
      renderNetwork();
    } catch (error) {
      elements.showNetwork.checked = false;
      elements.networkScore.disabled = true;
      showError(error.message || 'Could not load road scores.');
    }
  }

  async function initialize() {
    try {
      if (typeof L === 'undefined') throw new Error('The map library did not load. Check your internet connection and reload.');
      const areasResponse = await fetch('/api/areas');
      const areasData = await areasResponse.json();
      if (!areasResponse.ok || !Array.isArray(areasData.areas)) {
        throw new Error(areasData.error || 'Could not load the available city areas.');
      }
      const { south, west, north, east } = areasData.indiaBbox;
      indiaBounds = L.latLngBounds([south, west], [north, east]);
      elements.areaSelect.replaceChildren(...areasData.areas.map((area) => {
        const option = document.createElement('option');
        option.value = area.id;
        option.textContent = area.available ? area.name : `${area.name} (download data first)`;
        return option;
      }));
      const defaultArea = areasData.areas.find((area) => area.available);
      if (!defaultArea) throw new Error('No city data is available. Run npm run fetch-data to download an area.');
      selectedAreaId = defaultArea.id;
      elements.areaSelect.value = selectedAreaId;
      await loadArea(selectedAreaId, true);
      elements.travelMode.disabled = false;
      map.on('click', handleMapClick);
      elements.areaSelect.addEventListener('change', () => loadArea(elements.areaSelect.value));
      updateHint();
    } catch (error) {
      showError(error.message || 'Could not initialize the map.');
      elements.areaInfo.textContent = 'City area could not be loaded.';
    } finally {
      elements.mapLoading.hidden = true;
    }
  }

  async function loadArea(areaId, initial = false) {
    clearError();
    try {
      const response = await fetch(`/api/graph-info?area=${encodeURIComponent(areaId)}`);
      const info = await response.json();
      if (!response.ok) throw new Error(info.error || 'Could not load this city area.');

      selectedAreaId = areaId;
      const { south, west, north, east } = info.bbox;
      bounds = L.latLngBounds([south, west], [north, east]);
      if (initial) {
        map = L.map('map', { zoomControl: false, maxBounds: bounds.pad(0.35), maxBoundsViscosity: 0.7 });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
      } else {
        networkEdges = null;
        reset();
        map.setMaxBounds(bounds.pad(0.35));
      }
      if (boundsLayer) map.removeLayer(boundsLayer);
      boundsLayer = L.rectangle(bounds, {
        color: '#588263',
        weight: 2,
        opacity: 0.8,
        fillColor: '#76a77b',
        fillOpacity: 0.07,
        dashArray: '6 5',
        interactive: false
      }).addTo(map);
      map.fitBounds(bounds, { padding: [20, 20] });
      elements.areaLabel.textContent = info.area.name;
      elements.areaInfo.textContent = `${info.nodeCount.toLocaleString()} nodes · ${info.edgeCount.toLocaleString()} road segments.`;
      defaultWeights = info.defaultWeights;
      elements.sunWeight.value = info.defaultWeights.w1;
      elements.floodWeight.value = info.defaultWeights.w2;
      elements.sunValue.value = Number(info.defaultWeights.w1).toFixed(1);
      elements.floodValue.value = Number(info.defaultWeights.w2).toFixed(1);
      elements.sunValue.textContent = Number(info.defaultWeights.w1).toFixed(1);
      elements.floodValue.textContent = Number(info.defaultWeights.w2).toFixed(1);
      elements.areaSelect.value = areaId;
      updateHint();
    } catch (error) {
      elements.areaSelect.value = selectedAreaId;
      if (initial) throw error;
      showError(error.message || 'Could not load this city area.');
    }
  }

  async function changeTravelMode() {
    driveMode = elements.travelMode.value === 'driving';
    const walkingOnly = document.querySelectorAll('.walking-only');
    walkingOnly.forEach((element) => { element.hidden = driveMode; });
    elements.areaControl.hidden = driveMode;
    if (!map) return;

    if (driveMode) {
      bounds = indiaBounds;
      reset();
      map.setMaxBounds(bounds.pad(0.15));
      if (boundsLayer) map.removeLayer(boundsLayer);
      boundsLayer = L.rectangle(bounds, {
        color: '#588263',
        weight: 2,
        opacity: 0.8,
        fillColor: '#76a77b',
        fillOpacity: 0.04,
        dashArray: '6 5',
        interactive: false
      }).addTo(map);
      elements.areaLabel.textContent = 'India · driving';
      elements.areaInfo.textContent = 'Driving directions use the public OSRM demo service.';
      map.fitBounds(bounds, { padding: [20, 20] });
    } else {
      await loadArea(selectedAreaId);
    }
  }

  elements.sunWeight.addEventListener('input', () => {
    elements.sunValue.value = Number(elements.sunWeight.value).toFixed(1);
    elements.sunValue.textContent = Number(elements.sunWeight.value).toFixed(1);
  });
  elements.floodWeight.addEventListener('input', () => {
    elements.floodValue.value = Number(elements.floodWeight.value).toFixed(1);
    elements.floodValue.textContent = Number(elements.floodWeight.value).toFixed(1);
  });
  elements.findRoute.addEventListener('click', findRoutes);
  elements.reset.addEventListener('click', reset);
  elements.travelMode.addEventListener('change', changeTravelMode);
  elements.showNetwork.addEventListener('change', toggleNetwork);
  elements.networkScore.addEventListener('change', renderNetwork);
  initialize();
})();
