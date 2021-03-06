import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import mapboxgl from 'mapbox-gl';
import { Provider } from 'react-redux';
import { store } from './../store/appStore';

import constants from './../constants/constants';
import MapLabelContainer from './../containers/MapLabelContainer';

import {
  formatLayer,
} from '../util/geojson';

import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = constants.MAPBOX_PUBLIC_API_KEY;

class Map extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      markerMap: {},
    };
    this.fitBounds = this.fitBounds.bind(this);
    this.setMaxBounds = this.setMaxBounds.bind(this);
    this.redrawLayers = this.redrawLayers.bind(this);
    this.geomToZoneKey = this.geomToZoneKey.bind(this);
    this.geomToCollisionKeys = this.geomToCollisionKeys.bind(this);
    this.findFirstBestCombination = this.findFirstBestCombination.bind(this);
  }

  geomToZoneKey(geom) {
    if (!geom) { return null; }
    const inv = 1.0 / constants.MAP.LABELS.COLLISION_ROUNDING;
    const roundedLng = Math.round(geom.coordinates[0] * inv) / inv;
    const roundedLat = Math.round(geom.coordinates[1] * inv) / inv;
    return `${roundedLng},${roundedLat}`;
  }

  geomToCollisionKeys(geom) {
    const r = constants.MAP.LABELS.COLLISION_ROUNDING;
    const inv = 1.0 / r;
    const roundedLng = Math.round(geom.coordinates[0] * inv) / inv;
    const roundedLat = Math.round(geom.coordinates[1] * inv) / inv;
    return [
      `${roundedLng},${roundedLat}`,
      `${roundedLng + r},${roundedLat}`,
      `${roundedLng - r},${roundedLat}`,
      `${roundedLng},${roundedLat + r}`,
      `${roundedLng},${roundedLat - r}`,
      `${roundedLng + r},${roundedLat + r}`,
      `${roundedLng - r},${roundedLat - r}`,
      `${roundedLng - r},${roundedLat + r}`,
      `${roundedLng + r},${roundedLat - r}`,
    ];
  }

  componentDidMount() {
    this.control = new mapboxgl.NavigationControl();
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/mapbox/light-v9',
      center: this.props.centroid,
      maxBounds: constants.MAP.MAX_BOUNDS,
      zoom: 12,
      minZoom: 8,
      maxZoom: 18,
    });

    this.map.addControl(this.control, 'top-right');
    this.map.on('load', () => {
      this.map.resize();
      this.redrawLayers(this.props.layers, []);
      this.redrawMarkers(this.props.markers, []);
      if (this.props.fitBounds) {
        this.fitBounds(this.props.fitBounds);
      }
      this.setState({ loaded: true });
    });
    this.map.on('zoomend', () => {
      const zoom = this.map.getZoom();
      if (zoom < constants.MAP.MARKER_MAX_ZOOM && !this.props.markersHidden) {
        this.props.hideMarkers();
      } else if (zoom > constants.MAP.MARKER_MAX_ZOOM && this.props.markersHidden) {
        this.props.showMarkers();
      }
    });
  }

  componentWillUnmount() {
    this.map.remove();
  }

  fitBounds(mapboxBounds, maxBounds) {
    this.setMaxBounds(null);
    this.map.fitBounds(mapboxBounds, {
      padding: {
        top: 64,
        left: 600,
        right: 64,
        bottom: 64,
      }
    });
    const setMaxBounds = () => {
      this.setMaxBounds(maxBounds);
      this.map.off('moveend', setMaxBounds);
    };
    this.map.on('moveend', setMaxBounds);
  }

  setMaxBounds(newBounds) {
    this.map.setMaxBounds(newBounds);
  }

  redrawLayers(layers, prevLayers) {
    const prevLayerMap = prevLayers.reduce((map, l) =>
        Object.assign(map, { [l.id]: l }), {});
    const layerMap = layers.reduce((map, l) =>
        Object.assign(map, { [l.id]: l }), {});

    const layersToBeAdded = Object.keys(layerMap).filter((id) =>
        (!prevLayerMap[id] ||
        layerMap[id].version != prevLayerMap[id].version) ||
        (layerMap[id].options && prevLayerMap[id].options && layerMap[id].options.offset != prevLayerMap[id].options.offset));
    const layersToBeRemoved = Object.keys(prevLayerMap).filter((id) =>
        (!layerMap[id] ||
        layerMap[id].version != prevLayerMap[id].version) ||
        (layerMap[id].options && prevLayerMap[id].options && layerMap[id].options.offset != prevLayerMap[id].options.offset));

    layersToBeRemoved.forEach((id) => {
      this.map.removeLayer(id);
      this.map.removeSource(id);
    });

    layersToBeAdded.forEach((id) => {
      const mapboxLayer = formatLayer(
        id,
        layerMap[id].type,
        layerMap[id].color,
        layerMap[id].geometry,
        layerMap[id].options,
      );
      if (layerMap[id].options && layerMap[id].options.before) {
        return this.map.addLayer(mapboxLayer, layerMap[id].options.before);
      }
      return this.map.addLayer(mapboxLayer);
    });
  }

  findFirstBestCombination(path, arr, test) {
    const [first, ...rest] = arr;
    let bestSolution = null;
    first.some((option) => {
      const newPath = path.concat([option]);
      const isValidSolution = test(newPath);
      if (isValidSolution) {
        bestSolution = newPath;
        if (rest.length) {
          const found = this.findFirstBestCombination(newPath, rest, test);
          if (found) {
            bestSolution = found;
            return bestSolution.length == arr.length;
          }
          return false;
        }
      }
      return false;
    });
    return bestSolution;
  }

  preventCollisions(markerMap) {
    // By truncating the lat and lng of the markers in geomToZoneKey to create a
    // unique key, we can limit the number of labels in a single square "zone".
    // If two labels appear within the same one thousandth by one thousandth lat
    // and lng square, we move the label to an alternate point.
    const zoneMap = {};
    Object.values(markerMap).forEach((marker) => {
      const collisionKeys = this.geomToCollisionKeys(marker.geometry);
      collisionKeys.forEach((key) => {
        zoneMap[key] = zoneMap[key]
            ? zoneMap[key].concat([marker.id])
            : [marker.id];
      });
    });

    // Pull out all of the markers that conflict.
    const conflictSets = Object.values(Object.values(zoneMap)
        .filter((markerIds) => markerIds.length > 1)
        .reduce((map, ids) => Object.assign({}, map, { [ids.sort().toString()]: ids }), {}));

    // Amend the markers that conflict, either by selecting the next alternate
    // or shifting the point arbitrarily if no alternates are available.
    const amendedMarkers = conflictSets.reduce((map, markerIds) => {
      const optionsMap = markerIds.reduce((optMap, id) => {
        const marker = markerMap[id];
        const options = marker.alternates && marker.alternates.length
            ? marker.alternates.filter((geom) => !zoneMap[this.geomToZoneKey(geom)])
            : [marker.geometry];
        return Object.assign(optMap, { [id]: options });
      }, {});
      const combo = this.findFirstBestCombination([], Object.values(optionsMap), (points) => {
        const keyMap = {};
        return points.every((geom) => {
          const key = this.geomToZoneKey(geom);
          if (keyMap[key]) { return false; }
          keyMap[key] = true;
          return true;
        });
      });
      const partialAmendment = combo
        ? markerIds.reduce((amendMap, id, index) => {
            const newMarker = Object.assign({}, markerMap[id], {
              geometry: combo[index] || Object.assign({}, markerMap[id].geometry, {
                coordinates: [
                  markerMap[id].geometry.coordinates[0] +
                      (index - combo.length) * constants.MAP.LABELS.COLLISION_OFFSET,
                  markerMap[id].geometry.coordinates[1] +
                      (index - combo.length) * constants.MAP.LABELS.COLLISION_OFFSET,
                ],
              }),
              _redraw: true,
            });
            return Object.assign({}, amendMap, { [id]: newMarker });
          }, {})
        : markerIds.reduce((amendMap, id, index) => {
            const newMarker = Object.assign({}, markerMap[id], {
              geometry: Object.assign({}, markerMap[id].geometry, {
                coordinates: [
                  markerMap[id].geometry.coordinates[0] +
                      index * constants.MAP.LABELS.COLLISION_OFFSET,
                  markerMap[id].geometry.coordinates[1] +
                      index * constants.MAP.LABELS.COLLISION_OFFSET,
                ],
              }),
              _redraw: true,
            });
            return Object.assign({}, amendMap, { [id]: newMarker });
          }, {});
      return Object.assign({}, map, partialAmendment);
    }, {});

    return Object.assign({}, markerMap, amendedMarkers);
  }

  redrawMarkers(unresolvedMarkers, prevMarkers) {
    const unresolvedMarkerMap = unresolvedMarkers.reduce((map, m) =>
        Object.assign(map, { [m.id]: m }), {});
    const markerMap = this.preventCollisions(unresolvedMarkerMap);
    const markers = Object.values(markerMap);
    const prevMarkerMap = prevMarkers.reduce((map, m) =>
        Object.assign(map, { [m.id]: m }), {});

    // const prevMarkerIds = prevMarkers.map((m) => m.id);
    // const markerIds = markers.map((m) => m.id);
    const markersToBeAdded = markers.filter((m) => (
        !prevMarkerMap[m.id] ||
        !Object.keys(this.state.markerMap).includes(m.id.toString()) ||
        prevMarkerMap[m.id].version != markerMap[m.id].version));
    const markersToBeRemoved = prevMarkers.filter((m) => (
        !markerMap[m.id] ||
        prevMarkerMap[m.id].version != markerMap[m.id].version));
    const markerMapRemove = markersToBeRemoved.reduce((map, marker) => {
      const mbMarker = this.state.markerMap[marker.id];
      const element = mbMarker.getElement();
      ReactDOM.unmountComponentAtNode(element);
      element.remove();
      mbMarker.remove();
      return Object.assign(map, { [marker.id]: null });
    }, {});

    const markerMapAdd = markersToBeAdded.reduce((map, marker) => {
      const div = document.createElement('div');
      const mbMarker = new mapboxgl.Marker(div)
          .setLngLat(marker.geometry.coordinates);
      mbMarker.setOffset([0, -22])
      ReactDOM.render(
        <Provider store={store}>
          <MapLabelContainer
            id={marker.id}
            type={marker.type}
            items={[{
              top: marker.label.top,
              bottom: marker.label.bottom,
              color: marker.color,
            }]}
          />
        </Provider>,
        div,
        () => mbMarker.addTo(this.map)
      );
      return Object.assign(map, { [marker.id]: mbMarker });
    }, {});

    if (markersToBeAdded.length || markersToBeRemoved.length) {
      this.setState({
        markerMap: Object.assign({}, this.state.markerMap, markerMapRemove, markerMapAdd),
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    if ((nextProps.fitBounds && !this.props.fitBounds) ||
        (nextProps.fitBounds &&
        nextProps.fitBounds.toString() != this.props.fitBounds.toString())) {
      this.fitBounds(nextProps.fitBounds, nextProps.maxBounds);
    }
    if (this.state.loaded) {
      this.redrawLayers(nextProps.layers, this.props.layers);
      this.redrawMarkers(nextProps.markers, this.props.markers);
    }
  }

  render() {
    return (
      <section className="component Map">
        <div className="map-layer" ref={el => this.mapContainer = el} />
      </section>
    );
  }
}

Map.propTypes = {
  layers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    version: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired,
    options: PropTypes.object,
    geometry: PropTypes.shape({
      type: PropTypes.string,
      coordinates: PropTypes.array,
    }).isRequired,
    label: PropTypes.shape({
      top: PropTypes.string,
      bottom: PropTypes.string,
    }),
  })),
  markers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    geometry: PropTypes.shape({
      type: PropTypes.string,
      coordinates: PropTypes.array,
    }).isRequired,
    label: PropTypes.shape({
      top: PropTypes.string,
      bottom: PropTypes.string,
    }).isRequired,
  })),
  fitBounds: PropTypes.object,
};

export default Map;
