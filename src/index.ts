/*
                                            _               _     __   __
         /\  | |                           | |             (_)    \ \ / /
        /  \ | |_ _ __ ___   ___  ___ _ __ | |__   ___ _ __ _  ___ \ V / 
       / /\ \| __| "_ ` _ \ / _ \/ __| "_ \| "_ \ / _ \ "__| |/ __| > <  
      / ____ \ |_| | | | | | (_) \__ \ |_) | | | |  __/ |  | | (__ / . \ 
     /_/    \_\__|_| |_| |_|\___/|___/ .__/|_| |_|\___|_|  |_|\___/_/ \_\
                                     | |                                 
                                     |_|                                                                                                                
    
    Written by: KiyoWx (k3yomi)                
*/


import * as loader from './bootstrap';
import * as types from './types';
import Utils from './utils';
import Handler from './handler';

export class TempestStation {
    job: any 
    latitude: number = 0;
    longitude: number = 0;
    websocket: any = null;
    constructor(metadata: types.ClientSettingsTypes) { this.start(metadata) }
    
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
    public async setSettings(settings: types.ClientSettingsTypes) {
        this.stop();
        Utils.mergeClientSettings(loader.settings, settings);
        this.start(loader.settings);
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
    public on(event: string, callback: (...args: any[]) => void) {
        loader.cache.events.on(event, callback);
        return () => loader.cache.events.off(event, callback);
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
    public async start(metadata: types.ClientSettingsTypes): Promise<void> {
        Utils.mergeClientSettings(loader.settings, metadata);
        const settings = loader.settings as types.ClientSettingsTypes
        if (!settings?.api || !settings?.deviceId) return
        const wsUrl =
            `wss://ws.weatherflow.com/swd/data?api_key=${settings.api}` +
            `&location_id=${settings.deviceId}&ver=tempest-20250728`
        this.websocket = new loader.packages.ws(wsUrl)
        this.websocket.on('open', async () => {
            Utils.warn(loader.definitions.messages.websocket_established, true)
            loader.cache.events.emit(`onConnection`)
            if (settings.stationId) {
                const stationsUrl =
                    `https://swd.weatherflow.com/swd/rest/stations/${settings.stationId}?api_key=${settings.api}`
                const responseStations = await Utils.createHttpRequest(stationsUrl)
                if (!responseStations.error) {
                    const station = responseStations.message as Record<string, any>
                    if (station && typeof station === 'object' && Array.isArray(station.stations) && station.stations[0]) {
                        const s = station.stations[0]
                        this.latitude = Number(s.latitude)
                        this.longitude = Number(s.longitude)
                    }
                }
                if (this.websocket) {
                    if (Number.isFinite(this.latitude) && Number.isFinite(this.longitude)) {
                        this.websocket.send(JSON.stringify({
                            type: "geo_strike_listen_start",
                            lat_min: this.latitude - 5, lat_max: this.latitude + 5,
                            lon_min: this.longitude - 5, lon_max: this.longitude + 5
                        }))
                    }
                    this.websocket.send(JSON.stringify({
                        type: "listen_start", device_id: settings.deviceId
                    }))
                    this.websocket.send(JSON.stringify({
                        type: "listen_rapid_start", device_id: settings.deviceId
                    }))
                }
            }
        })
        Handler.forecastHandler(await this.getForecast())
        this.websocket.on('message', async (response) => {
            let data
            try { data = JSON.parse(response) } catch { return }
            const type = data?.type || null
            if (type == `ack`) loader.cache.events.emit(`onAcknowledge`, data)
            if (type == `obs_st`) { Handler.observationHandler(data); Handler.forecastHandler(await this.getForecast()) }
            if (type == `rapid_wind`) Handler.rapidWindHandler(data)
            if (type == `evt_strike`) Handler.lightningHandler(data)
        })
        this.websocket.on('error', err => {
            Utils.warn(`WebSocket error: ${err}`)
        })
    }

    /**
     * @function getForecast
     * @description
     *     Fetches the weather forecast data from the TempestStation API.
     * 
     * @async
     * @returns {Promise<{ error: boolean; message: any | string }>}
     */
    public async getForecast() {
        const settings = loader.settings as types.ClientSettingsTypes;
        const forecastUrl =
            `https://swd.weatherflow.com/swd/rest/better_forecast?api_key=${settings.api}` +
            `&station_id=${settings.stationId}&units_temp=f&units_wind=mph&units_pressure=inhg` +
            `&units_distance=mi&units_precip=in&units_other=imperial&units_direction=mph`
        return await Utils.createHttpRequest(forecastUrl);
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
    public async getClosestStation(coordinates: types.Coordinates) {
        if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lon !== 'number') return null
        const latMin = coordinates.lat - 5, latMax = coordinates.lat + 5
        const lonMin = coordinates.lon - 5, lonMax = coordinates.lon + 5
        const settings = loader.settings as types.ClientSettingsTypes
        if (!settings?.api) return null
        const stationsUrl =
            `https://swd.weatherflow.com/swd/rest/map/stations?` +
            `api_key=${settings.api}&build=160&limit=500&lat_min=${latMin}` +
            `&lon_min=${lonMin}&lat_max=${latMax}&lon_max=${lonMax}&_=${Date.now()}`
        const responseStations = await Utils.createHttpRequest(stationsUrl)
        if (responseStations.error) return null
        const data = responseStations.message as Record<string, any>
        const features = Array.isArray(data?.features) ? data.features : []
        if (!features.length) return null
        const refLat = coordinates.lat
        const refLon = coordinates.lon
        const toRad = (deg: number) => (deg * Math.PI) / 180
        const earthRadiusKm = 6371
        const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const dLat = toRad(lat2 - lat1)
            const dLon = toRad(lon2 - lon1)
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) *
                    Math.cos(toRad(lat2)) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            return earthRadiusKm * c
        }
        let minDistance = Infinity
        let bestStation: any = null
        for (const feature of features) {
            const coords = feature?.geometry?.coordinates
            if (!Array.isArray(coords) || coords.length < 2) continue
            const [lon, lat] = coords.map(Number)
            if (Number.isNaN(lat) || Number.isNaN(lon)) continue
            const d = haversine(refLat, refLon, lat, lon)
            if (d < minDistance) {
                minDistance = d
                bestStation = feature
            }
        }
        if (!bestStation || !isFinite(minDistance)) return null
        return bestStation
    }

    /**
     * @function stop
     * @description
     *     Stops active connections and cleans up resources.
     *
     * @async
     * @returns {Promise<void>}
     */
    public async stop(): Promise<void> {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        Utils.warn(loader.definitions.messages.client_stopped, true)
    }
}

export default TempestStation;