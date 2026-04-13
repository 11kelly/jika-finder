(function () {
  if (window.__jikaWidget) return;
  window.__jikaWidget = true;

  const root = document.getElementById('jika-widget-root');
  if (!root) return;

  const config = {
    proxyUrl: root.dataset.proxyUrl || '/apps/store-finder',
    color:    root.dataset.buttonColor || '#000000',
    heading:  root.dataset.heading || 'Find a Store',
    position: root.dataset.position || 'bottom-right',
  };

  document.documentElement.style.setProperty('--jika-w-color', config.color);

  // ── State ──────────────────────────────────────────────────────────────────
  let isOpen     = false;
  let dataCache  = null;
  let mapInstance = null;
  let markers    = [];
  let infoWindow = null;

  // ── Floating button ────────────────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.className = 'jika-w-fab jika-w-fab--' + config.position;
  fab.setAttribute('aria-label', 'Find a store');
  fab.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' +
            'm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>' +
    '</svg>';
  document.body.appendChild(fab);

  // ── Modal scaffold ─────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'jika-w-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML =
    '<div class="jika-w-modal">' +
      '<div class="jika-w-header">' +
        '<span class="jika-w-title">' + config.heading + '</span>' +
        '<button class="jika-w-close" aria-label="Close">' +
          '<svg width="18" height="18" viewBox="0 0 18 18" fill="none">' +
            '<path d="M14 4L4 14M4 4l10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<div class="jika-w-body">' +
        '<div class="jika-w-sidebar">' +
          '<div class="jika-w-search-wrap">' +
            '<svg class="jika-w-search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none">' +
              '<circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.4"/>' +
              '<path d="M10 10L13.5 13.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
            '</svg>' +
            '<input class="jika-w-search" type="text" placeholder="Search stores…" autocomplete="off">' +
          '</div>' +
          '<div class="jika-w-list"></div>' +
        '</div>' +
        '<div class="jika-w-map-pane">' +
          '<div class="jika-w-map-canvas"></div>' +
          '<div class="jika-w-loading">' +
            '<div class="jika-w-spinner"></div>' +
            '<span>Loading stores…</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const closeBtn   = overlay.querySelector('.jika-w-close');
  const searchEl   = overlay.querySelector('.jika-w-search');
  const listEl     = overlay.querySelector('.jika-w-list');
  const mapCanvas  = overlay.querySelector('.jika-w-map-canvas');
  const loadingEl  = overlay.querySelector('.jika-w-loading');

  // ── Open / close ───────────────────────────────────────────────────────────
  fab.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });

  function open() {
    isOpen = true;
    overlay.classList.add('jika-w-overlay--open');
    document.body.style.overflow = 'hidden';
    if (!dataCache) {
      fetchData();
    } else if (mapInstance) {
      setTimeout(function () {
        google.maps.event.trigger(mapInstance, 'resize');
      }, 150);
    }
  }

  function close() {
    isOpen = false;
    overlay.classList.remove('jika-w-overlay--open');
    document.body.style.overflow = '';
  }

  // ── Fetch store data ───────────────────────────────────────────────────────
  function fetchData() {
    fetch(config.proxyUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(function (data) {
        dataCache = data;
        initWidget(data);
      })
      .catch(function () {
        showError('Failed to load stores. Please try again.');
      });
  }

  function initWidget(data) {
    var stores   = data.stores || [];
    var settings = data.settings || {};
    var apiKey   = settings.googleMapsApiKey;

    if (!apiKey) {
      showError('Google Maps API key is not configured.');
      return;
    }

    renderList(stores, stores);

    searchEl.addEventListener('input', function () {
      var q = searchEl.value.trim().toLowerCase();
      var filtered = q
        ? stores.filter(function (s) {
            return (s.name  || '').toLowerCase().includes(q) ||
                   (s.address || '').toLowerCase().includes(q) ||
                   (s.city  || '').toLowerCase().includes(q);
          })
        : stores;
      renderList(filtered, stores);
      updateMarkers(filtered, stores);
    });

    loadMaps(apiKey, function () { initMap(stores, settings); });
  }

  // ── Store list ─────────────────────────────────────────────────────────────
  function renderList(filtered, allStores) {
    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="jika-w-empty">No stores found.</p>';
      return;
    }
    listEl.innerHTML = filtered.map(function (store) {
      var idx   = allStores.indexOf(store);
      var addr  = [store.address, [store.city, store.province].filter(Boolean).join(', ')].filter(Boolean).join('<br>');
      var hasMap = store.latitude && store.longitude;
      return (
        '<div class="jika-w-item">' +
          '<div class="jika-w-item-name">' + esc(store.name) + '</div>' +
          (addr ? '<div class="jika-w-item-addr">' + esc(store.address || '') +
            (store.city ? '<br>' + esc([store.city, store.province].filter(Boolean).join(', ')) : '') +
            '</div>' : '') +
          (store.phone ? '<a class="jika-w-item-phone" href="tel:' + esc(store.phone) + '">' + esc(store.phone) + '</a>' : '') +
          '<div class="jika-w-item-actions">' +
            (hasMap ? '<button class="jika-w-view-btn" data-idx="' + idx + '">View on map</button>' : '') +
            '<a class="jika-w-dir-btn" href="' + directionsUrl(store) + '" target="_blank" rel="noopener noreferrer">Get directions ↗</a>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    listEl.querySelectorAll('.jika-w-view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        focusMarker(parseInt(btn.dataset.idx));
      });
    });
  }

  // ── Google Maps ────────────────────────────────────────────────────────────
  function loadMaps(apiKey, cb) {
    if (window.google && window.google.maps && window.google.maps.marker) {
      cb();
      return;
    }
    if (window.__jikaMapCbs) {
      window.__jikaMapCbs.push(cb);
      return;
    }
    window.__jikaMapCbs = [cb];
    window.__jikaMapReady = function () {
      window.__jikaMapCbs.forEach(function (fn) { fn(); });
    };
    var s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey +
            '&libraries=places,marker&callback=__jikaMapReady';
    s.async = true;
    document.head.appendChild(s);
  }

  function initMap(stores, settings) {
    loadingEl.style.display = 'none';
    mapCanvas.style.display = 'block';

    mapInstance = new google.maps.Map(mapCanvas, {
      center:            { lat: 25.033, lng: 121.5654 },
      zoom:              10,
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: false,
      mapId:             'DEMO_MAP_ID',
    });

    var bounds     = new google.maps.LatLngBounds();
    var markerColor = settings.markerColor || config.color;
    var hasAny     = false;

    markers = stores.map(function (store) {
      if (!store.latitude || !store.longitude) return null;
      var pos = { lat: store.latitude, lng: store.longitude };
      var pin = new google.maps.marker.PinElement({
        background:   markerColor,
        borderColor:  '#ffffff',
        glyphColor:   '#ffffff',
        scale:        1.1,
      });
      var marker = new google.maps.marker.AdvancedMarkerElement({
        map:      mapInstance,
        position: pos,
        title:    store.name,
        content:  pin.element,
      });
      bounds.extend(pos);
      hasAny = true;
      marker.addListener('click', function () { showInfo(store, marker); });
      return marker;
    });

    if (hasAny) mapInstance.fitBounds(bounds);

    setTimeout(function () {
      google.maps.event.trigger(mapInstance, 'resize');
      if (hasAny) mapInstance.fitBounds(bounds);
    }, 150);
  }

  function showInfo(store, marker) {
    if (!infoWindow) infoWindow = new google.maps.InfoWindow();
    var lines = [store.address, [store.city, store.province].filter(Boolean).join(', ')].filter(Boolean);
    infoWindow.setContent(
      '<div style="padding:2px 4px;min-width:150px;font-family:inherit">' +
        '<div style="font-weight:700;font-size:13px;margin-bottom:3px">' + esc(store.name) + '</div>' +
        lines.map(function (l) {
          return '<div style="font-size:12px;color:#555;line-height:1.5">' + esc(l) + '</div>';
        }).join('') +
        (store.phone
          ? '<div style="margin-top:5px"><a href="tel:' + esc(store.phone) + '" style="font-size:12px">' + esc(store.phone) + '</a></div>'
          : '') +
      '</div>'
    );
    infoWindow.open({ map: mapInstance, anchor: marker });
  }

  function focusMarker(idx) {
    var store = dataCache.stores[idx];
    if (!store || !store.latitude || !mapInstance) return;
    mapInstance.panTo({ lat: store.latitude, lng: store.longitude });
    mapInstance.setZoom(15);
    if (markers[idx]) showInfo(store, markers[idx]);
  }

  function updateMarkers(filtered, allStores) {
    if (!markers.length) return;
    var ids = new Set(filtered.map(function (s) { return s.id; }));
    allStores.forEach(function (store, i) {
      if (!markers[i]) return;
      markers[i].map = ids.has(store.id) ? mapInstance : null;
    });
  }

  function showError(msg) {
    loadingEl.innerHTML = '<p class="jika-w-error">' + msg + '</p>';
  }

  function directionsUrl(store) {
    if (store.latitude && store.longitude) {
      return 'https://www.google.com/maps/dir/?api=1&destination=' + store.latitude + ',' + store.longitude;
    }
    var addr = [store.address, store.city, store.province, store.country].filter(Boolean).join(', ');
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(addr);
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
