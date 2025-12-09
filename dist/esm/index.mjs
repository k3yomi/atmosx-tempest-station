var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/bootstrap.ts
import * as fs from "fs";
import * as path from "path";
import * as events from "events";
import * as jobs from "croner";
import axios from "axios";
import ws from "ws";
var packages = {
  fs,
  path,
  events,
  jobs,
  axios,
  crypto,
  ws
};
var cache = {
  events: new events.EventEmitter(),
  lastWarn: null,
  isReady: true
};
var settings = {
  api: null,
  deviceId: null,
  stationId: null,
  journal: true
};
var definitions = {
  messages: {
    client_stopped: `Disconnected from Tempest Weather Station.`,
    websocket_established: `Successfully connected to Tempest Weather Station.`,
    forecast_fetch_error: `Please make sure you have a valid station ID`,
    api_failed: `Request failed. Please check your API key and device ID.`
  },
  cardinal_direction_degrees: {
    N: [348.75, 360],
    NNE: [11.25, 33.75],
    NE: [33.75, 56.25],
    ENE: [56.25, 78.75],
    E: [78.75, 101.25],
    ESE: [101.25, 123.75],
    SE: [123.75, 146.25],
    SSE: [146.25, 168.75],
    S: [168.75, 191.25],
    SSW: [191.25, 213.75],
    SW: [213.75, 236.25],
    WSW: [236.25, 258.75],
    W: [258.75, 281.25],
    WNW: [281.25, 303.75],
    NW: [303.75, 326.25],
    NNW: [326.25, 348.75]
  }
};

// src/utils.ts
var Utils = class {
  /**
   * @function sleep
   * @description
   *     Pauses execution for a specified number of milliseconds.
   *
   * @static
   * @async
   * @param {number} ms
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return __async(this, null, function* () {
      return new Promise((resolve) => setTimeout(resolve, ms));
    });
  }
  /**
  * @function warn
  * @description
  *     Emits a log event and prints a warning to the console. Throttles repeated
  *     warnings within a short interval unless `force` is `true`.
  *
  * @static
  * @param {string} message
  * @param {boolean} [force=false]
  */
  static warn(message, force = false) {
    cache.events.emit("log", message);
    if (!settings.journal) return;
    if (cache.lastWarn != null && Date.now() - cache.lastWarn < 500 && !force) return;
    cache.lastWarn = Date.now();
    console.warn(`\x1B[33m[ATMOSX-TEMPEST]\x1B[0m [${(/* @__PURE__ */ new Date()).toLocaleString()}] ${message}`);
  }
  /**
   * @function createHttpRequest
   * @description
   *     Performs an HTTP GET request with default headers and timeout, returning
   *     either the response data or an error message.
   *
   * @static
   * @template T
   * @param {string} url
   * @param {types.HTTPSettings} [options]
   * @returns {Promise<{ error: boolean; message: T | string }>}
   */
  static createHttpRequest(url, options) {
    return __async(this, null, function* () {
      var _a;
      const defaultOptions = {
        timeout: 1e4,
        headers: {
          "User-Agent": "AtmosphericX",
          "Accept": "application/geo+json, text/plain, */*; q=0.9",
          "Accept-Language": "en-US,en;q=0.9"
        }
      };
      const requestOptions = __spreadProps(__spreadValues(__spreadValues({}, defaultOptions), options), {
        headers: __spreadValues(__spreadValues({}, defaultOptions.headers), (_a = options == null ? void 0 : options.headers) != null ? _a : {})
      });
      try {
        const resp = yield packages.axios.get(url, {
          headers: requestOptions.headers,
          timeout: requestOptions.timeout,
          maxRedirects: 0,
          validateStatus: (status) => status === 200 || status === 500
        });
        return { error: false, message: resp.data };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: true, message: msg };
      }
    });
  }
  /**
   * @function mergeClientSettings
   * @description
   *     Recursively merges a ClientSettings object into a target object,
   *     preserving nested structures and overriding existing values.
   *
   * @static
   * @param {Record<string, unknown>} target
   * @param {types.ClientSettingsTypes} settings
   * @returns {Record<string, unknown>}
   */
  static mergeClientSettings(target, settings2) {
    for (const key in settings2) {
      if (!Object.prototype.hasOwnProperty.call(settings2, key)) continue;
      const value = settings2[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
          target[key] = {};
        }
        this.mergeClientSettings(target[key], value);
      } else {
        target[key] = value;
      }
    }
    return target;
  }
};
var utils_default = Utils;

// src/handler.ts
var Handler = class {
  /**
   * @function observationHandler
   * @description
   *    Handles incoming observation data and emits an 'onObservation' event with formatted data.
   *
   * @public
   * @static
   * @param {*} data 
   */
  static observationHandler(data) {
    cache.events.emit(`onObservation`, {
      features: [{
        geometry: { type: "Point", coordinates: [] },
        type: "Feature",
        properties: {
          pressure_trend: data.summary.pressure_trend,
          latest: {
            epoch_latest_lightning: data.summary.strike_last_epoch,
            latest_lightning_distance: data.summary.strike_last_dist,
            precipitation_time: data.summary.precip_minutes_local_day_final
          },
          observation: {
            time: data.obs[0][0],
            wind_average: parseFloat((data.obs[0][2] * 2.23694).toFixed(2)),
            wind_gust: parseFloat((data.obs[0][3] * 2.23694).toFixed(2)),
            wind_direction: definitions.cardinal_direction_degrees ? Object.keys(definitions.cardinal_direction_degrees).find((dir) => {
              const [min, max] = definitions.cardinal_direction_degrees[dir];
              return data.obs[0][4] >= min && data.obs[0][4] < max;
            }) : data.obs[0][4],
            temperature: parseFloat((data.obs[0][7] * 9 / 5 + 32).toFixed(2)),
            humidity: data.obs[0][8]
          }
        }
      }]
    });
  }
  /**
   * @function forecastHandler
   * @description
   *    Handles incoming forecast data and emits an 'onForecast' event with formatted data.
   * 
   * @public
   * @static
   * @param {*} data
   */
  static forecastHandler(data) {
    if (data.error || data.message.status.status_code == 3) {
      return utils_default.warn(definitions.messages.forecast_fetch_error, true);
    }
    cache.events.emit(`onForecast`, {
      features: [{
        geometry: { type: "Point", coordinates: [data.message.latitude, data.message.longitude] },
        type: "Feature",
        properties: {
          feels_like: data.message.current_conditions.feels_like,
          temperature: data.message.current_conditions.air_temperature,
          densitity: data.message.current_conditions.air_density,
          conditions: data.message.current_conditions.conditions,
          dew_point: data.message.current_conditions.dew_point,
          humidity: data.message.current_conditions.relative_humidity,
          pressure_trend: data.message.current_conditions.pressure_trend,
          wind_average: data.message.current_conditions.wind_avg,
          wind_gust: data.message.current_conditions.wind_gust,
          wind_direction: definitions.cardinal_direction_degrees ? Object.keys(definitions.cardinal_direction_degrees).find((dir) => {
            const [min, max] = definitions.cardinal_direction_degrees[dir];
            return data.message.current_conditions.wind_direction >= min && data.message.current_conditions.wind_direction < max;
          }) : data.message.current_conditions.wind_direction,
          station_name: data.message.location_name,
          elevation: data.message.elevation
        }
      }]
    });
  }
  /**
   * @function rapidWindHandler
   * @description
   *    Handles incoming rapid wind data and emits an 'onRapidWind' event with formatted data.
   * 
   * @public
   * @static
   * @param {*} data
   */
  static rapidWindHandler(data) {
    cache.events.emit(`onRapidWind`, {
      features: [{
        geometry: { type: "Point", coordinates: [] },
        type: "Feature",
        properties: {
          time: data.ob[0],
          speed: data.ob[1],
          direction: definitions.cardinal_direction_degrees ? Object.keys(definitions.cardinal_direction_degrees).find((dir) => {
            const [min, max] = definitions.cardinal_direction_degrees[dir];
            return data.ob[2] >= min && data.ob[2] < max;
          }) : data.ob[2]
        }
      }]
    });
  }
  /**
   * @function lightningHandler
   * @description
   *   Handles incoming lightning event data and emits an 'onLightning' event with formatted data.
   * 
   * @public
   * @static
   * @param {*} data
   */
  static lightningHandler(data) {
    cache.events.emit(`onLightning`, {
      features: [{
        geometry: { type: "Point", coordinates: [] },
        type: "Feature",
        properties: {
          time: data.evt[0],
          distance: parseFloat((data.evt[1] / 0.621371).toFixed(2)),
          energy: data.evt[2]
        }
      }]
    });
  }
};
var handler_default = Handler;

// src/index.ts
var TempestStation = class {
  constructor(metadata) {
    this.latitude = 0;
    this.longitude = 0;
    this.websocket = null;
    this.start(metadata);
  }
  /**
   * @function setSettings
   * @description
   *     Merges the provided client settings into the current configuration,
   *     preserving nested structures.
   *
   * @async
   * @param {types.ClientSettingsTypes} settings
   * @returns {Promise<void>}
   */
  setSettings(settings2) {
    return __async(this, null, function* () {
      if (settings2.deviceId === settings.deviceId || settings2.stationId === settings.stationId) return;
      this.stop();
      utils_default.mergeClientSettings(settings, settings2);
      this.start(settings);
    });
  }
  /**
   * @function on
   * @description
   *     Registers a callback for a specific event and returns a function
   *     to unregister the listener.
   *
   * @param {string} event
   * @param {(...args: any[]) => void} callback
   * @returns {() => void}
   */
  on(event, callback) {
    cache.events.on(event, callback);
    return () => cache.events.off(event, callback);
  }
  /**
   * @function start
   * @description
   *     Initializes the client with the provided settings
   *
   * @async
   * @param {types.ClientSettingsTypes} metadata
   * @returns {Promise<void>}
   */
  start(metadata) {
    return __async(this, null, function* () {
      utils_default.mergeClientSettings(settings, metadata);
      const settings2 = settings;
      if (!(settings2 == null ? void 0 : settings2.api) || !(settings2 == null ? void 0 : settings2.deviceId)) return;
      const wsUrl = `wss://ws.weatherflow.com/swd/data?api_key=${settings2.api}&location_id=${settings2.deviceId}&ver=tempest-20250728`;
      this.websocket = new packages.ws(wsUrl);
      this.websocket.on("open", () => __async(this, null, function* () {
        utils_default.warn(definitions.messages.websocket_established, true);
        cache.events.emit(`onConnection`);
        if (settings2.stationId) {
          const stationsUrl = `https://swd.weatherflow.com/swd/rest/stations/${settings2.stationId}?api_key=${settings2.api}`;
          const responseStations = yield utils_default.createHttpRequest(stationsUrl);
          if (!responseStations.error) {
            const station = responseStations.message;
            if (station && typeof station === "object" && Array.isArray(station.stations) && station.stations[0]) {
              const s = station.stations[0];
              this.latitude = Number(s.latitude);
              this.longitude = Number(s.longitude);
            }
          }
          if (this.websocket) {
            if (Number.isFinite(this.latitude) && Number.isFinite(this.longitude)) {
              this.websocket.send(JSON.stringify({
                type: "geo_strike_listen_start",
                lat_min: this.latitude - 5,
                lat_max: this.latitude + 5,
                lon_min: this.longitude - 5,
                lon_max: this.longitude + 5
              }));
            }
            this.websocket.send(JSON.stringify({
              type: "listen_start",
              device_id: settings2.deviceId
            }));
            this.websocket.send(JSON.stringify({
              type: "listen_rapid_start",
              device_id: settings2.deviceId
            }));
          }
        }
      }));
      handler_default.forecastHandler(yield this.getForecast());
      this.websocket.on("message", (response) => __async(this, null, function* () {
        let data;
        try {
          data = JSON.parse(response);
        } catch (e) {
          return;
        }
        const type = (data == null ? void 0 : data.type) || null;
        if (type == `ack`) cache.events.emit(`onAcknowledge`, data);
        if (type == `obs_st`) {
          handler_default.observationHandler(data);
          handler_default.forecastHandler(yield this.getForecast());
        }
        if (type == `rapid_wind`) handler_default.rapidWindHandler(data);
        if (type == `evt_strike`) handler_default.lightningHandler(data);
      }));
      this.websocket.on("error", (error) => {
        utils_default.warn(definitions.messages.api_failed, true);
      });
    });
  }
  /**
   * @function getForecast
   * @description
   *     Fetches the weather forecast data from the TempestStation API.
   * 
   * @async
   * @returns {Promise<{ error: boolean; message: any | string }>}
   */
  getForecast() {
    return __async(this, null, function* () {
      const settings2 = settings;
      const forecastUrl = `https://swd.weatherflow.com/swd/rest/better_forecast?api_key=${settings2.api}&station_id=${settings2.stationId}&units_temp=f&units_wind=mph&units_pressure=inhg&units_distance=mi&units_precip=in&units_other=imperial&units_direction=mph`;
      return yield utils_default.createHttpRequest(forecastUrl);
    });
  }
  /**
   * @function getClosestStation
   * @description
   *    Fetches the closest weather station based on provided coordinates.
   * 
   * @public
   * @async
   * @param {types.Coordinates} coordinates 
   * @returns {unknown} 
   */
  getClosestStation(coordinates) {
    return __async(this, null, function* () {
      var _a;
      if (!coordinates || typeof coordinates.lat !== "number" || typeof coordinates.lon !== "number") return null;
      const latMin = coordinates.lat - 5, latMax = coordinates.lat + 5;
      const lonMin = coordinates.lon - 5, lonMax = coordinates.lon + 5;
      const settings2 = settings;
      if (!(settings2 == null ? void 0 : settings2.api)) return null;
      const stationsUrl = `https://swd.weatherflow.com/swd/rest/map/stations?api_key=${settings2.api}&build=160&limit=500&lat_min=${latMin}&lon_min=${lonMin}&lat_max=${latMax}&lon_max=${lonMax}&_=${Date.now()}`;
      const responseStations = yield utils_default.createHttpRequest(stationsUrl);
      if (responseStations.error) return null;
      const data = responseStations.message;
      const features = Array.isArray(data == null ? void 0 : data.features) ? data.features : [];
      if (!features.length) return null;
      const refLat = coordinates.lat;
      const refLon = coordinates.lon;
      const toRad = (deg) => deg * Math.PI / 180;
      const earthRadiusKm = 6371;
      const haversine = (lat1, lon1, lat2, lon2) => {
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
      };
      let minDistance = Infinity;
      let bestStation = null;
      for (const feature of features) {
        const coords = (_a = feature == null ? void 0 : feature.geometry) == null ? void 0 : _a.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) continue;
        const [lon, lat] = coords.map(Number);
        if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
        const d = haversine(refLat, refLon, lat, lon);
        if (d < minDistance) {
          minDistance = d;
          bestStation = feature;
        }
      }
      if (!bestStation || !isFinite(minDistance)) return null;
      return bestStation;
    });
  }
  /**
   * @function stop
   * @description
   *     Stops active connections and cleans up resources.
   *
   * @async
   * @returns {Promise<void>}
   */
  stop() {
    return __async(this, null, function* () {
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }
      utils_default.warn(definitions.messages.client_stopped, true);
    });
  }
};
var index_default = TempestStation;
export {
  TempestStation,
  index_default as default
};
