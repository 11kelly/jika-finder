/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */
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
      const markerSize  = settings?.markerSize  || 32;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&callback=initStoreFinder&loading=async`;
      script.async = true;
      window.initStoreFinder = () => renderStoreFinder(stores, markerColor, markerSize, settings);
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

  function renderStoreFinder(stores, markerColor, markerSize, settings) {
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
    function buildMapStylesFromUserColors(land, water, road, label) {
      const L = land || '#e5e3df';
      const W = water || '#c0d8e8';
      const R = road || '#ffffff';
      const T = label || '#616161';
      return [
        { elementType: 'geometry', stylers: [{ color: L }] },
        { elementType: 'labels.text.fill', stylers: [{ color: T }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: L }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: L }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: L }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: R }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: R }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: W }] },
      ];
    }

    const mapStylePresets = {
      silver: [
        { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
        { "elementType": "labels.icon", "stylers": [{ "visibility": "on" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
        { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
        { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
        { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
        { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
        { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
        { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
        { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
        { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
        { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
        { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
        { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
        { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
        { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
      ],
      dark: [
        { "elementType": "geometry", "stylers": [{ "color": "#1d2c4d" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a3646" }] },
        { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b6878" }] },
        { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#64779e" }] },
        { "featureType": "administrative.province", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b6878" }] },
        { "featureType": "landscape.man_made", "elementType": "geometry.stroke", "stylers": [{ "color": "#334e87" }] },
        { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#023e58" }] },
        { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#283d6a" }] },
        { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#6f9ba5" }] },
        { "featureType": "poi", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1d2c4d" }] },
        { "featureType": "poi.park", "elementType": "geometry.fill", "stylers": [{ "color": "#023e58" }] },
        { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#3C7680" }] },
        { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#304a7d" }] },
        { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#98a5be" }] },
        { "featureType": "road", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1d2c4d" }] },
        { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#2c6675" }] },
        { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#255762" }] },
        { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#b0d5ce" }] },
        { "featureType": "road.highway", "elementType": "labels.text.stroke", "stylers": [{ "color": "#023e58" }] },
        { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#98a5be" }] },
        { "featureType": "transit", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1d2c4d" }] },
        { "featureType": "transit.line", "elementType": "geometry.fill", "stylers": [{ "color": "#283d6a" }] },
        { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#3a4762" }] },
        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0e1626" }] },
        { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#4e6d70" }] }
      ],
      retro: [
        { "elementType": "geometry", "stylers": [{ "color": "#ebe3cd" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#523735" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f1e6" }] },
        { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#c9b2a6" }] },
        { "featureType": "administrative.land_parcel", "elementType": "geometry.stroke", "stylers": [{ "color": "#dcd2be" }] },
        { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#ae9e90" }] },
        { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#93817a" }] },
        { "featureType": "poi.park", "elementType": "geometry.fill", "stylers": [{ "color": "#a5b076" }] },
        { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#447530" }] },
        { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#f5f1e6" }] },
        { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#fdfcf8" }] },
        { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#f8c967" }] },
        { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#e9bc62" }] },
        { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#e98d58" }] },
        { "featureType": "road.highway.controlled_access", "elementType": "geometry.stroke", "stylers": [{ "color": "#db8555" }] },
        { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#806b63" }] },
        { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "featureType": "transit.line", "elementType": "labels.text.fill", "stylers": [{ "color": "#8f7d77" }] },
        { "featureType": "transit.line", "elementType": "labels.text.stroke", "stylers": [{ "color": "#ebe3cd" }] },
        { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "featureType": "water", "elementType": "geometry.fill", "stylers": [{ "color": "#b9d3c2" }] },
        { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#92998d" }] }
      ]
    };
    const stylePreset = settings?.mapStyle || 'default';
    const mapTypeId   = settings?.mapType  || 'roadmap';
    const validPreset = ['default', 'silver', 'dark', 'retro'].includes(stylePreset) ? stylePreset : 'default';
    const useCustomMapColors = settings?.mapUseCustomColors === true || settings?.mapUseCustomColors === 1;

    let styles = [];
    if (useCustomMapColors) {
      styles = buildMapStylesFromUserColors(
        settings?.mapColorLand,
        settings?.mapColorWater,
        settings?.mapColorRoad,
        settings?.mapColorLabel,
      );
    } else if (validPreset !== 'default') {
      styles = mapStylePresets[validPreset] || [];
    }
    
    // Logic: If user has a custom icon OR provided a Map ID, we MUST use Advanced Markers (and thus Map ID).
    // If not, we omit Map ID so that JSON styles (Themes like Silver/Dark) can work.
    const hasCustomIcon = !!settings?.markerIconUrl;
    const providedMapId = settings?.googleMapId;
    const useAdvanced   = hasCustomIcon || !!providedMapId;

    const mapOptions = {
      center:            { lat: 0, lng: 0 },
      zoom:              2,
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeId,
      ...(styles.length && !useAdvanced ? { styles } : {}),
    };

    if (useAdvanced) {
      mapOptions.mapId = providedMapId || 'DEMO_MAP_ID';
    }

    const map = new google.maps.Map(mapDiv, mapOptions);

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;
    let infoWindow = null;

    const markers = stores.map((store) => {
      if (!store.latitude || !store.longitude) return null;
      const position = { lat: store.latitude, lng: store.longitude };

      let marker;
      if (useAdvanced) {
        // --- Advanced Marker Mode ---
        let markerContent;
        if (hasCustomIcon) {
          const img = document.createElement('img');
          img.src = settings.markerIconUrl;
          img.style.width = `${markerSize}px`;
          img.style.height = 'auto';
          markerContent = img;
        } else {
          const pin = new google.maps.marker.PinElement({
            background:  markerColor,
            borderColor: '#ffffff',
            glyphColor:  '#ffffff',
            scale:       (markerSize / 32) * 1.1,
          });
          markerContent = pin.element;
        }

        marker = new google.maps.marker.AdvancedMarkerElement({
          position,
          map,
          title:   store.name,
          content: markerContent,
        });
      } else {
        // --- Legacy Marker Mode (to support JSON Themes) ---
        // We use a Data URI to reliably show the drop-shaped pin matching our preview
        const height = (markerSize / 32) * 44;
        const svg = `<svg width="${markerSize}" height="${height}" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.163 0 0 7.163 0 16c0 10.627 14.222 26.48 15.168 27.537a1.1 1.1 0 001.664 0C17.778 42.48 32 26.627 32 16 32 7.163 24.837 0 16 0z" fill="${markerColor}"/><circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.85"/></svg>`;
        const encoded = window.btoa(svg);
        
        marker = new google.maps.Marker({
          position,
          map,
          title: store.name,
          icon: {
            url: `data:image/svg+xml;base64,${encoded}`,
            scaledSize: new google.maps.Size(markerSize, height),
            anchor: new google.maps.Point(markerSize / 2, height)
          }
        });
      }

      bounds.extend(position);
      hasCoords = true;

      marker.addListener('click', () => {
        if (!infoWindow) infoWindow = new google.maps.InfoWindow();
        const lines = [store.address, [store.city, store.province].filter(Boolean).join(', ')].filter(Boolean);
        const textColor = settings?.textColor || '#333333';
        const primaryColor = settings?.primaryColor || '#000000';
        const secondaryColor = settings?.secondaryColor || '#666666';

        infoWindow.setContent(
          `<div style="padding:4px;min-width:180px;font-family:inherit;color:${textColor}">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:${primaryColor}">${store.name}</div>
            ${lines.map(l => `<div style="font-size:13px;color:${secondaryColor};line-height:1.4">${l}</div>`).join('')}
            ${store.phone ? `<div style="margin-top:6px;font-size:13px"><a href="tel:${store.phone}" style="color:${primaryColor};text-decoration:none">${store.phone}</a></div>` : ''}
            <div style="margin-top:10px;border-top:1px solid #eee;padding-top:10px">
              <a href="${directionsUrl(store)}" target="_blank" rel="noopener noreferrer"
                 style="font-size:12px;font-weight:700;color:${primaryColor};text-decoration:none;text-transform:uppercase;letter-spacing:0.5px">
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
