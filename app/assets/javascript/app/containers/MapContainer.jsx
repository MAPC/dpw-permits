import { connect } from 'react-redux';
import Map from '../components/Map';

import constants from './../constants/constants';

// Format a line layer for display in Mapbox
const formatLineLayer = (id, version, color, geometry, isDashed) => {
  const features = [{
    type: 'Feature',
    properties: {
    },
    geometry,
  }];
  const dashedProps = isDashed ? {
    'line-dasharray': [8, 8],
  } : {};
  return {
    id,
    version,
    type: 'line',
    source: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features,
      },
    },
    layout: {
        'line-join': 'round',
        'line-cap': 'round',
    },
    paint: Object.assign({}, {
        'line-color': color,
        'line-width': 8,
    }, dashedProps),
  };
};

// Format a point layer for display in Mapbox
const formatPointLayer = (id, version, color, coordinates) => {
  const features = [{
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates,
    },
  }];
  return {
    id,
    version,
    type: 'circle',
    source: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features,
      },
    },
    layout: {
    },
    paint: {
      'circle-color': color,
      'circle-radius': 10,
    },
  };
};

const formatCityLayers = (outline, mask) => {
  return [{
    id: 'city-mask',
    version: 1,
    type: 'fill',
    source: {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: mask,
      },
    },
    layout: {
    },
    paint: {
      'fill-color': '#000',
      'fill-opacity': 0.1,
    },
  }, {
    id: 'city-outline',
    version: 1,
    type: 'line',
    source: {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: outline,
      },
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': '#f5a87c',
      'line-width': 4,
    },
  }];
};

// Use the GeoJSON in the nodes geometries to assemble a LineString
const createGeometryFromNodes = (path, nodeCache) => {
  const coordinates = path
      .map(id => nodeCache[id].geojson.coordinates);
  return {
    type: 'LineString',
    coordinates,
  }
};

const flatten = (arr, depth) => {
  return arr.reduce((acc, arr) => {
    return acc.concat(Array.isArray(arr) && depth > 1 ? flatten(arr, depth - 1) : arr);
  }, [])
};

const mapStateToProps = (state, props) => {
  const cityName = props.match.params.city.toUpperCase();
  const city = state.city.cache[cityName];
  // Find the active segment that will be zoomed to
  const activeSegment = state.workingPlan.activeSegment || null;
  // ActiveCoordinates reflect the points that must be fit within the map's
  // viewing bounds
  let activeCoordinates = null;
  if (activeSegment && state.road.cache[activeSegment.road_id]) {
    const activeSegmentRoad = state.road.cache[activeSegment.road_id];
    activeCoordinates = activeSegmentRoad.nodes
        .map(id => state.node.cache[id].geojson.coordinates);
  } else if (city && city.mask) {
    activeCoordinates = flatten(city.geojson.coordinates, 2);
  }
  const nodeCache = state.node.cache;
  // Calculate all of the properly formatted layers for display on the map
  const segmentLayers = state.workingPlan.timeframes
      .reduce((layers, timeframe, timeframeIndex) =>
    layers.concat(timeframe.segments.reduce((layers, segment, segmentIndex) => {
      // Fetch the base road for the current segment
      const segmentRoad = state.road.cache[segment.road_id];
      const layerId = `${timeframeIndex.toString()}-${segmentIndex.toString()}`;
      if (segment.nodes.length) {
        // If the segment is not the whole road, plot the calculated path between
        // the orig and dest nodes
        const geometry = createGeometryFromNodes(
          segment.nodes,
          Object.assign({}, nodeCache, segment.custom_nodes)
        );
        return layers.concat([
          formatLineLayer(
            layerId,
            segment.version,
            '#aaa',
            JSON.parse(segmentRoad.geojson)
          ),
          formatLineLayer(
           `${layerId}-s_line`,
            segment.version,
            '#f00',
            geometry
          ),
          formatPointLayer(
            `${layerId}-s_start`,
            segment.version,
            '#f00',
            geometry.coordinates[0]
          ),
          formatPointLayer(
            `${layerId}-s_end`,
            segment.version,
            '#f00',
            geometry.coordinates[geometry.coordinates.length - 1]
          ),
        ]);
      } else if (segmentRoad && segmentRoad.nodes.length) {
        // Plot the whole road, if no partial path has been calculated
        return layers.concat([
          formatLineLayer(
            layerId,
            segment.version,
            '#f00',
            JSON.parse(segmentRoad.geojson)
          ),
        ]);
      }
      return layers;
    }, []))
  , []);

  const cityLayers = city ? formatCityLayers(city.geojson, city.mask) : [];
  return {
    layers: segmentLayers.concat(cityLayers),
    activeCoordinates,
    centroid: city ? city.centroid.coordinates : constants.MAP.DEFAULT_CENTROID,
    bounds: city ? flatten(city.bounds.coordinates, 1) : null,
  };
};

const mapDispatchToProps = (dispatch) => ({
});

export default connect(mapStateToProps, mapDispatchToProps)(Map);
