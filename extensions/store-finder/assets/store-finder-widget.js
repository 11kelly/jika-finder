/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */
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
        if (data.settings) {
          var s = data.settings;
          overlay.style.setProperty('--jika-primary-color',   s.primaryColor   || '#000000');
          overlay.style.setProperty('--jika-secondary-color', s.secondaryColor || '#666666');
          overlay.style.setProperty('--jika-accent-color',    s.accentColor    || '#000000');
          overlay.style.setProperty('--jika-text-color',      s.textColor      || '#111111');
          overlay.style.setProperty('--jika-bg-color',        s.bgColor        || '#ffffff');
        }
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

    function buildMapStylesFromUserColors(land, water, road, label) {
      var L = land || '#e5e3df';
      var W = water || '#c0d8e8';
      var R = road || '#ffffff';
      var T = label || '#616161';
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

    var mapStylePresets = {
      silver:    [{"elementType":"geometry","stylers":[{"color":"#f5f5f5"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#f5f5f5"}]},{"featureType":"road","elementType":"geometry","stylers":[{"color":"#ffffff"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#dadada"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#c9c9c9"}]}],
      dark:      [{"elementType":"geometry","stylers":[{"color":"#1d2c4d"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#8ec3b9"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#1a3646"}]},{"featureType":"road","elementType":"geometry","stylers":[{"color":"#304a7d"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#2c6675"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#0e1626"}]}],
      retro:     [{"elementType":"geometry","stylers":[{"color":"#ebe3cd"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#523735"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#f5f1e6"}]},{"featureType":"road","elementType":"geometry","stylers":[{"color":"#f5f1e6"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#f8c967"}]},{"featureType":"water","elementType":"geometry.fill","stylers":[{"color":"#b9d3c2"}]}],
    };
    var stylePreset = settings.mapStyle || 'default';
    var mapTypeId   = settings.mapType  || 'roadmap';
    var validPreset = ['default', 'silver', 'dark', 'retro'].indexOf(stylePreset) !== -1 ? stylePreset : 'default';
    var useCustomMapColors = settings.mapUseCustomColors === true || settings.mapUseCustomColors === 1;
    var styles = [];
    if (useCustomMapColors) {
      styles = buildMapStylesFromUserColors(
        settings.mapColorLand,
        settings.mapColorWater,
        settings.mapColorRoad,
        settings.mapColorLabel
      );
    } else if (validPreset !== 'default') {
      styles = mapStylePresets[validPreset] || [];
    }

    var hasCustomIcon = !!settings.markerIconUrl;
    var providedMapId = settings.googleMapId;
    var useAdvanced   = hasCustomIcon || !!providedMapId;
    var markerSize    = settings.markerSize || 32;
    var markerColor   = settings.markerColor || config.color;

    var mapOptions = {
      center:            { lat: 0, lng: 0 },
      zoom:              2,
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeId:         mapTypeId,
    };
    if (styles.length && !useAdvanced) {
      mapOptions.styles = styles;
    }
    if (useAdvanced) {
      mapOptions.mapId = providedMapId || 'DEMO_MAP_ID';
    }

    mapInstance = new google.maps.Map(mapCanvas, mapOptions);

    var bounds = new google.maps.LatLngBounds();
    var hasAny = false;

    markers = stores.map(function (store) {
      if (!store.latitude || !store.longitude) return null;
      var pos = { lat: store.latitude, lng: store.longitude };
      var marker;

      if (useAdvanced) {
        var markerContent;
        if (hasCustomIcon) {
          var img = document.createElement('img');
          img.src = settings.markerIconUrl;
          img.style.width = markerSize + 'px';
          img.style.height = 'auto';
          markerContent = img;
        } else {
          var pin = new google.maps.marker.PinElement({
            background:  markerColor,
            borderColor: '#ffffff',
            glyphColor:  '#ffffff',
            scale:       (markerSize / 32) * 1.1,
          });
          markerContent = pin.element;
        }
        marker = new google.maps.marker.AdvancedMarkerElement({
          map:      mapInstance,
          position: pos,
          title:    store.name,
          content:  markerContent,
        });
      } else {
        var height = (markerSize / 32) * 44;
        var svg =
          '<svg width="' + markerSize + '" height="' + height + '" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M16 0C7.163 0 0 7.163 0 16c0 10.627 14.222 26.48 15.168 27.537a1.1 1.1 0 001.664 0C17.778 42.48 32 26.627 32 16 32 7.163 24.837 0 16 0z" fill="' + markerColor + '"/>' +
          '<circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.85"/></svg>';
        var encoded = window.btoa(svg);
        marker = new google.maps.Marker({
          position: pos,
          map:      mapInstance,
          title:    store.name,
          icon: {
            url:         'data:image/svg+xml;base64,' + encoded,
            scaledSize:  new google.maps.Size(markerSize, height),
            anchor:      new google.maps.Point(markerSize / 2, height),
          },
        });
      }

      bounds.extend(pos);
      hasAny = true;
      marker.addListener('click', function () { showInfo(store, marker, settings); });
      return marker;
    });

    if (hasAny) mapInstance.fitBounds(bounds);

    setTimeout(function () {
      google.maps.event.trigger(mapInstance, 'resize');
      if (hasAny) mapInstance.fitBounds(bounds);
    }, 150);
  }

  function showInfo(store, marker, settings) {
    if (!infoWindow) infoWindow = new google.maps.InfoWindow();
    var lines = [store.address, [store.city, store.province].filter(Boolean).join(', ')].filter(Boolean);
    var textColor = settings.textColor || '#333333';
    var primaryColor = settings.primaryColor || '#000000';
    var secondaryColor = settings.secondaryColor || '#666666';

    infoWindow.setContent(
      '<div style="padding:4px;min-width:180px;font-family:inherit;color:' + textColor + '">' +
        '<div style="font-weight:700;font-size:14px;margin-bottom:6px;color:' + primaryColor + '">' + esc(store.name) + '</div>' +
        lines.map(function (l) {
          return '<div style="font-size:13px;color:' + secondaryColor + ';line-height:1.4">' + esc(l) + '</div>';
        }).join('') +
        (store.phone
          ? '<div style="margin-top:6px;font-size:13px"><a href="tel:' + esc(store.phone) + '" style="color:' + primaryColor + ';text-decoration:none">' + esc(store.phone) + '</a></div>'
          : '') +
        '<div style="margin-top:10px;border-top:1px solid #eee;padding-top:10px">' +
          '<a href="' + directionsUrl(store) + '" target="_blank" rel="noopener noreferrer"' +
             ' style="font-size:12px;font-weight:700;color:' + primaryColor + ';text-decoration:none;text-transform:uppercase;letter-spacing:0.5px">' +
            'Get directions ↗' +
          '</a>' +
        '</div>' +
      '</div>'
    );
    infoWindow.open({ map: mapInstance, anchor: marker });
  }

  function focusMarker(idx) {
    var store = dataCache.stores[idx];
    var settings = dataCache.settings || {};
    if (!store || !store.latitude || !mapInstance) return;
    mapInstance.panTo({ lat: store.latitude, lng: store.longitude });
    mapInstance.setZoom(15);
    if (markers[idx]) showInfo(store, markers[idx], settings);
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
