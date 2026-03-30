(function() {
  const container = document.getElementById('jika-store-finder-app');
  if (!container) return;

  const proxyUrl = container.getAttribute('data-proxy-url');

  async function init() {
    try {
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      const { stores, settings } = data;
      const apiKey = settings?.googleMapsApiKey;
      const layout = settings?.layout || 'classic';

      // Apply appearance settings as CSS variables
      if (settings) {
        container.style.setProperty('--jika-primary-color', settings.primaryColor || '#000000');
        container.style.setProperty('--jika-secondary-color', settings.secondaryColor || '#666666');
        container.style.setProperty('--jika-accent-color', settings.accentColor || '#000000');
        container.style.setProperty('--jika-text-color', settings.textColor || '#333333');
        container.style.setProperty('--jika-bg-color', settings.bgColor || '#ffffff');
        // markerColor logic can be added later to customize Google Maps markers
      }

      if (!apiKey) {
        container.innerHTML = '<div class="jika-error">Google Maps API Key is missing in app settings.</div>';
        return;
      }

      // Load Google Maps API
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initStoreFinder`;
      script.async = true;
      script.defer = true;
      window.initStoreFinder = () => renderStoreFinder(stores, layout);
      document.head.appendChild(script);

    } catch (error) {
      console.error('Store Finder Error:', error);
      container.innerHTML = '<div class="jika-error">Failed to load store finder.</div>';
    }
  }

  function renderStoreFinder(stores, layoutSetting) {
    // 优先使用 Liquid 传入的 layout，如果没有则使用 API 传入的，最后默认为 classic
    const currentLayout = container.getAttribute('data-layout') || layoutSetting || 'classic';
    container.innerHTML = '';
    container.className = `jika-layout-${currentLayout}`;

    const sidebar = document.createElement('div');
    sidebar.className = 'jika-sidebar';

    const mapDiv = document.createElement('div');
    mapDiv.className = 'jika-map';
    mapDiv.id = 'jika-map-canvas';

    // 根据布局决定插入顺序
    if (currentLayout === 'stacked') {
      // 堆叠模式：地图在上，列表在下
      container.appendChild(mapDiv);
      container.appendChild(sidebar);
    } else {
      // 经典模式：列表在左，地图在右
      container.appendChild(sidebar);
      container.appendChild(mapDiv);
    }

    // 搜索框容器
    const searchWrapper = document.createElement('div');
    searchWrapper.style.padding = '15px';
    searchWrapper.style.borderBottom = '1px solid #eee';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search stores...';
    searchInput.style.width = '100%';
    searchInput.style.padding = '8px';
    searchInput.style.boxSizing = 'border-box';
    searchWrapper.appendChild(searchInput);
    sidebar.appendChild(searchWrapper);

    const list = document.createElement('div');
    list.className = 'jika-list';
    
    function renderList(filteredStores) {
      list.innerHTML = '';
      filteredStores.forEach((store) => {
        const item = document.createElement('div');
        item.className = 'jika-item';
        // 查找原始索引以便定位
        const originalIndex = stores.findIndex(s => s.id === store.id);
        item.innerHTML = `
          <h3>${store.name}</h3>
          <p>${store.address}, ${store.city || ''}</p>
          <p>${store.phone || ''}</p>
          <button onclick="window.jikaFocusStore(${originalIndex})">View on Map</button>
        `;
        list.appendChild(item);
      });
    }

    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = stores.filter(s => 
        s.name.toLowerCase().includes(term) || 
        s.address.toLowerCase().includes(term) ||
        (s.city && s.city.toLowerCase().includes(term))
      );
      renderList(filtered);
      
      // 联动地图：只显示过滤后的 Marker
      markers.forEach((marker, index) => {
        if (!marker) return;
        const store = stores[index];
        const isMatch = filtered.some(f => f.id === store.id);
        marker.setMap(isMatch ? map : null);
      });
    });

    renderList(stores);
    sidebar.appendChild(list);

    const map = new google.maps.Map(mapDiv, {
      center: { lat: 0, lng: 0 },
      zoom: 2
    });

    const bounds = new google.maps.LatLngBounds();
    const markers = stores.map((store, index) => {
      if (store.latitude && store.longitude) {
        const position = { lat: store.latitude, lng: store.longitude };
        const marker = new google.maps.Marker({
          position,
          map,
          title: store.name
        });
        bounds.extend(position);
        
        marker.addListener('click', () => {
          new google.maps.InfoWindow({
            content: `<div><strong>${store.name}</strong><p>${store.address}</p></div>`
          }).open(map, marker);
        });

        return marker;
      }
      return null;
    });

    if (stores.length > 0) {
      map.fitBounds(bounds);
    }

    window.jikaFocusStore = (index) => {
      const store = stores[index];
      if (store.latitude && store.longitude) {
        map.setCenter({ lat: store.latitude, lng: store.longitude });
        map.setZoom(15);
        google.maps.event.trigger(markers[index], 'click');
      }
    };
  }

  init();
})();
