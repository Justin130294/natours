/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibGlnaHRtYXN0ZXIzMCIsImEiOiJjbHo1YjQ5OXczcjEzMnJzNndzbzBoOHFsIn0.JBhUHlTnBfE_CN9jlLRsQg';
  var map = new mapboxgl.Map({
    // Place the map on the element with id map
    container: 'map',
    style: 'mapbox://styles/lightmaster30/clz5bofxw00od01nvf1h086sl',
    scrollZoom: false,
  });
  // Set up the bounds object for the map
  const bounds = new mapboxgl.LngLatBounds();
  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';
    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom', // Set the bottom of marker at the location
    })
      .setLngLat(loc.coordinates)
      .addTo(map);
    // Add popup
    new mapboxgl.Popup({
      offset: 30, // pixels
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });
  // Set the map to fit the bounds
  map.fitBounds(bounds, {
    padding: {
      // pixels
      top: 200,
      bottom: 100,
      left: 100,
      right: 100,
    },
  });
};
