import PropTypes from 'prop-types';
import React from 'react';
import mapboxgl from 'mapbox-gl';

import constants from './../constants/constants';

import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = constants.MAPBOX_PUBLIC_API_KEY;

class Map extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
    };
    this.fitBounds = this.fitBounds.bind(this);
    this.setMaxBounds = this.setMaxBounds.bind(this);
    this.redrawLayers = this.redrawLayers.bind(this);
  }

  componentDidMount() {
    this.control = new mapboxgl.NavigationControl();
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/mapbox/light-v9',
      center: this.props.centroid,
      maxBounds: constants.MAP.MAX_BOUNDS,
      zoom: 12,
    });
    this.map.addControl(this.control, 'top-right');
    this.map.on('load', () => {
      this.map.resize();
      this.props.layers.map((layer) => {
        this.map.addLayer(layer);
      });
      if (this.props.activeCoordinates) {
        this.fitBounds(this.props.activeCoordinates);
      }
      this.setState({ loaded: true });
    })
  }

  componentWillUnmount() {
    this.map.remove();
  }

  fitBounds(coordinates) {
    const newBounds = coordinates.reduce(
      (bounds, coord) => bounds.extend(coord),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
    );
    this.map.fitBounds(newBounds, {
      padding: {
        top: 64,
        left: 600,
        right: 64,
        bottom: 64,
      }
    });
  }

  setMaxBounds(coordinates) {
    const newBounds = coordinates.reduce(
      (bounds, coord) => bounds.extend(coord),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
    );
    this.map.setMaxBounds(newBounds);
  }

  redrawLayers(layers, prevLayers) {
    const layerMap = {};
    const prevLayerMap = {};
    layers.forEach((layer) => {
      layerMap[layer.id] = layer;
      prevLayerMap[layer.id] = prevLayerMap[layer.id] || null;
    });
    prevLayers.forEach((layer) => {
      layerMap[layer.id] = layerMap[layer.id] || null;
      prevLayerMap[layer.id] = layer;
    });
    Object.keys(layerMap).forEach((key) => {
      const layersChanged = prevLayerMap[key] && layerMap[key] &&
          layerMap[key].version !== prevLayerMap[key].version;
      if ((prevLayerMap[key] && !layerMap[key]) || layersChanged) {
        this.map.removeLayer(key);
        this.map.removeSource(key);
      }
      if ((!prevLayerMap[key] && layerMap[key]) || layersChanged) {
        this.map.addLayer(layerMap[key]);
      }
    });

  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.activeCoordinates &&
        this.props.activeCoordinates != prevProps.activeCoordinates) {
      this.fitBounds(this.props.activeCoordinates);
    }
    if (this.props.bounds &&
        this.props.bounds != prevProps.bounds) {
      this.setMaxBounds(this.props.bounds);
    }
    if (this.state.loaded) {
      this.redrawLayers(this.props.layers, prevProps.layers);
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
    id: PropTypes.string,
    type: PropTypes.string,
    source: PropTypes.shape({
      type: PropTypes.string,
      data: PropTypes.shape({
        type: PropTypes.string,
        features: PropTypes.arrayOf(PropTypes.shape({
          type: PropTypes.string,
          properties: PropTypes.shape({
            name: PropTypes.string,
            start: PropTypes.string,
            end: PropTypes.string,
            year: PropTypes.number,
          }),
          geometry: PropTypes.shape({
            type: PropTypes.string,
            coordinates: PropTypes.array,
          }),
        })),
      }),
    }),
    layout: PropTypes.object,
    paint: PropTypes.object,
  })),
  activeCoordinates: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
};

export default Map;
