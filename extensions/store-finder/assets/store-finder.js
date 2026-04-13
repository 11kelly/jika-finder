(function () {
  const container = document.getElementById('jika-store-finder-app');
  if (!container) return;

  const proxyUrl = container.getAttribute('data-proxy-url');

  async function init() {
    try {
      const response = await fetch(proxyUrl);
      const data = await response.json();

      const { stores, settings } = data;
      const apiKey = settings?.googleMapsApiKey;

      if (settings) {
        container.style.setProperty('--jika-primary-color',   settings.primaryColor   || '#000000');
        container.style.setProperty('--jika-secondary-color', settings.secondaryColor || '#666666');
        container.style.setProperty('--jika-accent-color',    settings.accentColor    || '#000000');
        container.style.setProperty('--jika-text-color',      settings.textColor      || '#333333');
        container.style.setProperty('--jika-bg-color',        settings.bgColor        || '#ffffff');
      }

      if (!apiKey) {
        container.innerHTML = '<div class="jika-error">Google Maps API Key is missing in app settings.</div>';
        return;
      }

      const markerColor = settings?.markerColor || '#000000';
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&callback=initStoreFinder`;
      script.async = true;
      window.initStoreFinder = () => renderStoreFinder(stores, markerColor);
      document.head.appendChild(script);

    } catch (error) {
      console.error('Store Finder Error:', error);
      container.innerHTML = '<div class="jika-error">Failed to load store finder.</div>';
    }
  }

  function directionsUrl(store) {
    if (store.latitude && store.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
    }
    const addr = [store.address, store.city, store.province, store.country].filter(Boolean).join(', ');
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
  }

  function renderStoreFinder(stores, markerColor) {
    const currentLayout = container.getAttribute('data-layout') || 'classic';
    container.innerHTML = '';
    container.className = `jika-layout-${currentLayout}`;

    const sidebar = document.createElement('div');
    sidebar.className = 'jika-sidebar';

    const mapDiv = document.createElement('div');
    mapDiv.className = 'jika-map';
    mapDiv.id = 'jika-map-canvas';

    if (currentLayout === 'stacked') {
      container.appendChild(mapDiv);
      container.appendChild(sidebar);
    } else {
      container.appendChild(sidebar);
      container.appendChild(mapDiv);
    }

    // ── Search ───────────────────────────────────────────────────────────────
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'jika-search-wrap';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search stores...';
    searchInput.className = 'jika-search-input';
    searchWrapper.appendChild(searchInput);
    sidebar.appendChild(searchWrapper);

    // ── List ─────────────────────────────────────────────────────────────────
    const list = document.createElement('div');
    list.className = 'jika-list';

    function renderList(filteredStores) {
      list.innerHTML = '';
      filteredStores.forEach((store) => {
        const idx = stores.findIndex(s => s.id === store.id);
        const hasCoords = store.latitude && store.longitude;
        const item = document.createElement('div');
        item.className = 'jika-item';
        item.innerHTML = `
          <h3 class="jika-item-name">${store.name}</h3>
          <p class="jika-item-addr">${[store.address, [store.city, store.province].filter(Boolean).join(', ')].filter(Boolean).join('<br>')}</p>
          ${store.phone ? `<p class="jika-item-phone"><a href="tel:${store.phone}">${store.phone}</a></p>` : ''}
          <div class="jika-item-actions">
            ${hasCoords ? `<button class="jika-view-btn" data-idx="${idx}">View on map</button>` : ''}
            <a class="jika-dir-btn" href="${directionsUrl(store)}" target="_blank" rel="noopener noreferrer">Get directions ↗</a>
          </div>
        `;
        list.appendChild(item);
      });

      list.querySelectorAll('.jika-view-btn').forEach(btn => {
        btn.addEventListener('click', () => window.jikaFocusStore(parseInt(btn.dataset.idx)));
      });
    }

    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = stores.filter(s =>
        s.name.toLowerCase().includes(term) ||
        (s.address || '').toLowerCase().includes(term) ||
        (s.city || '').toLowerCase().includes(term)
      );
      renderList(filtered);
      markers.forEach((marker, i) => {
        if (!marker) return;
        marker.map = filtered.some(f => f.id === stores[i].id) ? map : null;
      });
    });

    renderList(stores);
    sidebar.appendChild(list);

    // ── Map ──────────────────────────────────────────────────────────────────
    const map = new google.maps.Map(mapDiv, {
      center:            { lat: 0, lng: 0 },
      zoom:              2,
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: false,
      mapId:             'DEMO_MAP_ID',
    });

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;
    let infoWindow = null;

    const markers = stores.map((store) => {
      if (!store.latitude || !store.longitude) return null;
      const position = { lat: store.latitude, lng: store.longitude };
      const pin = new google.maps.marker.PinElement({
        background:  markerColor,
        borderColor: '#ffffff',
        glyphColor:  '#ffffff',
        scale:       1.1,
      });
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map,
        title:   store.name,
        content: pin.element,
      });
      bounds.extend(position);
      hasCoords = true;

      marker.addListener('click', () => {
        if (!infoWindow) infoWindow = new google.maps.InfoWindow();
        const lines = [store.address, [store.city, store.province].filter(Boolean).join(', ')].filter(Boolean);
        infoWindow.setContent(
          `<div style="padding:2px 4px;min-width:150px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${store.name}</div>
            ${lines.map(l => `<div style="font-size:12px;color:#555">${l}</div>`).join('')}
            ${store.phone ? `<div style="margin-top:5px;font-size:12px"><a href="tel:${store.phone}">${store.phone}</a></div>` : ''}
            <div style="margin-top:8px">
              <a href="${directionsUrl(store)}" target="_blank" rel="noopener noreferrer"
                 style="font-size:12px;font-weight:600;color:#1a73e8;text-decoration:none">
                Get directions ↗
              </a>
            </div>
          </div>`
        );
        infoWindow.open({ map, anchor: marker });
      });

      return marker;
    });

    if (hasCoords) map.fitBounds(bounds);

    window.jikaFocusStore = (index) => {
      const store = stores[index];
      if (store.latitude && store.longitude && markers[index]) {
        map.panTo({ lat: store.latitude, lng: store.longitude });
        map.setZoom(15);
        google.maps.event.trigger(markers[index], 'click');
      }
    };
  }

  init();
})();
