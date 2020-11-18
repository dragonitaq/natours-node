export const displayMap = (locations) => {
  // It's advisable to have one unique token for each project.
  mapboxgl.accessToken = 'pk.eyJ1IjoiZHJhZ29uaXRhcSIsImEiOiJja2hpaTFpbHQwZXpvMnpwaHVhc3B0bGFoIn0.ziZCMSl6coQRL5TfFB7F3g';
  var map = new mapboxgl.Map({
    // This point to id='map' in DOM. I think we can rename it accordingly if we want.
    container: 'map',
    // We can customize style in mapbox studio.
    style: 'mapbox://styles/dragonitaq/ckhik7n0j10n319o0p4iu5lbj',
    // // It works the same as MongoDB, first long then lat.
    // center: [-118.113491, 34.111745],
    // // If we don't specify zoom level, it will display the whole Earth. Higher number zoom in.
    // zoom: 8,
    // // If we set to false, the map is for display only. If we set to true, users can interact with it. Default to true.
    // interactive: false,
    // We only disable the zooming functionality, but users still can pan around.
    scrollZoom: false,
  });

  // We create new bound. A bound is a viewing boundary that covers all location points we specified.
  const bounds = new mapboxgl.LngLatBounds();

  // We loop through each location point in our tour to create new html element to be shown in the map.
  locations.forEach((loc) => {
    // CREATE MARKER
    // We have styling image in CSS for marker which is a pin icon.
    const el = document.createElement('div');
    el.className = 'marker';

    // ADD MARKER
    // Add marker to map object in the form of HTML element by passing in our newly created "el" HTML element.
    new mapboxgl.Marker({
      element: el,
      // We specify where the marker should anchor to our HTML image element.
      anchor: 'bottom',
    })
      // We define the marker coordinates.
      .setLngLat(loc.coordinates)
      // Then finally add this marker HTML element inside the id="map" HTML element.
      .addTo(map);

    // APP POPUP
    new mapboxgl.Popup({
      // We set the popup info offset 30 pixel at Y-axis.
      offset: 30,
    })
      // We define the popup coordinates.
      .setLngLat(loc.coordinates)
      // We directly set the HTML element properties for this popup.
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      // Then finally add this popup HTML element inside the id="map" HTML element.
      .addTo(map);

    // We set the viewing boundary to include this new location point in this iteration.
    bounds.extend(loc.coordinates);
  });

  // We specify the viewing boundary should be fitting all location points with some padding values.
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });

  // I get this from SO. A method to add zoom in/out buttons on map.
  const nav = new mapboxgl.NavigationControl();
  map.addControl(nav, 'top-right');
};
