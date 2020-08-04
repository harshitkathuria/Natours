const locations = JSON.parse(document.getElementById('map').dataset.locations);
console.log(locations);

mapboxgl.accessToken = 'pk.eyJ1IjoiaGFyc2hpdC1rYXRodXJpYSIsImEiOiJja2Rjdmd6eXMwb3lzMnNuYmtyamg0bTUzIn0.25Whd4jnNOG-_La3h-DlYQ';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/harshit-kathuria/ckdcvl12n0br51iobupruppvq',
  //Disable zoom
  scrollZoom: false
  // //Center of map
  // center: [-111.65, 134.5],
  // //Zoom level
  // zoom: 4,
  // //Interactivity of map
  // interactive: false
});

const bounds = new mapboxgl.LngLatBounds();

locations.forEach(location => {
  //Create marker
  const marker = document.createElement('div');
  marker.className = 'marker';

  //Add marker
  new mapboxgl.Marker({
    element: marker,
    anchor: 'bottom'
  })
    .setLngLat(location.coordinates)
    .addTo(map);

  //Add popup
  new mapboxgl.Popup({
    offset: 30
  })
    .setLngLat(location.coordinates)
    .setHTML(`<p>Day ${location.day} ${location.description}</p>`)
    .addTo(map);

  //Extends the map bound to inlcude the current location
  bounds.extend(location.coordinates);
});

map.fitBounds(bounds, {
  padding: {
    top: 200,
    bottom: 200,
    left: 100,
    right: 100
  }
});