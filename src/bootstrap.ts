/*
                                            _               _     __   __
         /\  | |                           | |             (_)    \ \ / /
        /  \ | |_ _ __ ___   ___  ___ _ __ | |__   ___ _ __ _  ___ \ V / 
       / /\ \| __| '_ ` _ \ / _ \/ __| '_ \| '_ \ / _ \ '__| |/ __| > <  
      / ____ \ |_| | | | | | (_) \__ \ |_) | | | |  __/ |  | | (__ / . \ 
     /_/    \_\__|_| |_| |_|\___/|___/ .__/|_| |_|\___|_|  |_|\___/_/ \_\
                                     | |                                 
                                     |_|                                                                                                                
    
    Written by: k3yomi@GitHub                        
*/


import * as fs from 'fs';
import * as path from 'path';
import * as events from 'events';
import * as jobs from 'croner';
import axios from 'axios';
import ws from 'ws';

export const packages = {
    fs, 
    path, 
    events, 
    jobs, 
    axios, 
    crypto, 
    ws
};

export const cache = {
    events: new events.EventEmitter(),
    lastWarn: null,
    isReady: true,
};

export const settings = { 
    api: null,
    deviceId: null,
    stationId: null,
    journal: true,
};

export const definitions = {
    messages: {
        client_stopped: `Client has been stopped.`,
        websocket_established: `WebSocket connection established.`,
    },
};