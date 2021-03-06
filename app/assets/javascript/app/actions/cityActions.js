import api from './api';
import types from './types';

export function updateCity(city) {
  return {
    type: types.CITY.UPDATE,
    city,
  };
}

export function fetchCity(city) {
  return async (dispatch, getState) => {
    const city = await api.getCity(city);
    return dispatch(updateCity(city));
  };
}
