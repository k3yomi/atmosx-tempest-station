const {TempestStation} = require(`atmosx-tempest-station`);

const tempest = new TempestStation({
    api: "api_key_here",
    deviceId: 0,
    stationId: 0,
    journal: true,
});


tempest.on(`onForecast`, (data) => {
    console.log(JSON.stringify(data, null, 2));
});

tempest.on(`onObservation`, (data) => {
    console.log(JSON.stringify(data, null, 2));
});

tempest.on(`onRapidWind`, (data) => {
    console.log(JSON.stringify(data, null, 2));
});

tempest.on(`onLightning`, (data) => {
    console.log(JSON.stringify(data, null, 2));
});