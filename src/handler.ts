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

export class Handler { 
       
    /**
     * @function observationHandler
     * @description
     *    Handles incoming observation data and emits an 'onObservation' event with formatted data.
     *
     * @public
     * @static
     * @param {*} data 
     */
    public static observationHandler(data: any) {
        loader.cache.events.emit(`onObservation`, {
            features: [{
                geometry: { type: "Point", coordinates: [] },
                type: "Feature",
                properties: {
                    pressure_trend: data.summary.pressure_trend,
                    latest: {
                        epoch_latest_lightning : data.summary.strike_last_epoch,
                        latest_lightning_distance : data.summary.strike_last_dist,
                        precipitation_time: data.summary.precip_minutes_local_day_final,
                    },
                    observation: {
                        time: data.obs[0][0],
                        wind_average: parseFloat((data.obs[0][2] * 2.23694).toFixed(2)),
                        wind_gust: parseFloat((data.obs[0][3] * 2.23694).toFixed(2)),
                        wind_direction: data.obs[0][4],
                        temperature: parseFloat(((data.obs[0][7] * 9/5) + 32).toFixed(2)),
                        humidity: data.obs[0][8],
                    }
                }
            }]
        })
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
    public static forecastHandler(data: any) {
        loader.cache.events.emit(`onForecast`, {
            features: [{
                geometry: { type: "Point", coordinates: [data.message.latitude, data.message.longitude] },
                type: "Feature",
                properties: {
                    feels_like: data.message.current_conditions.feels_like,
                    temperature: data.message.current_conditions.air_temperature,
                    densitity:data.message.current_conditions.air_density,
                    conditions: data.message.current_conditions.conditions,
                    dew_point: data.message.current_conditions.dew_point,
                    humidity: data.message.current_conditions.relative_humidity,
                    pressure_trend: data.message.current_conditions.pressure_trend,
                    wind_average: data.message.current_conditions.wind_avg,
                    wind_gust: data.message.current_conditions.wind_gust,
                    wind_direction: data.message.current_conditions.wind_direction,
                    station_name: data.message.location_name,
                    elevation: data.message.elevation,
                }
            }]
        })
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
    public static rapidWindHandler(data: any) {
        loader.cache.events.emit(`onRapidWind`, {
            features: [{
                geometry: { type: "Point", coordinates: [] },
                type: "Feature",
                properties: {
                    time: data.ob[0],
                    speed: data.ob[1],
                    direction: data.ob[2],
                }
            }]
        })
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
    public static lightningHandler(data: any) {
        loader.cache.events.emit(`onLightning`, {
            features: [{
                geometry: { type: "Point", coordinates: [] },
                type: "Feature",
                properties: {
                    time: data.evt[0],
                    distance: parseFloat((data.evt[1] / 0.621371).toFixed(2)),
                    energy: data.evt[2],
                }
            }]
        })
    }
}

export default Handler;