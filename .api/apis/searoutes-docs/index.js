const Oas = require('oas').default || require('oas');
const APICore = require('api/dist/core/index.js').default || require('api/dist/core/index.js');
const definition = require('./openapi.json');

class SDK {
    constructor() {
        this.spec = Oas.init(definition);
        this.core = new APICore(this.spec, 'searoutes-docs/2.10.0 (api/6.1.3)');
    }
    config(config) {
        this.core.setConfig(config);
    }
    auth(...values) {
        this.core.setAuth(...values);
        return this;
    }
    server(url, variables = {}) {
        this.core.setServer(url, variables);
    }
    getSeaRoute(metadata) {
        return this.core.fetch('/route/v2/sea/{locations}', 'get', metadata);
    }
    getPlanSeaRoute(metadata) {
        return this.core.fetch('/route/v2/sea/{locations}/plan', 'get', metadata);
    }
    getItinerariesFromProformas(metadata) {
        return this.core.fetch('/itinerary/v2/proformas', 'get', metadata);
    }
    getItineraryByHash(metadata) {
        return this.core.fetch('/itinerary/v2/proformas/{hash}', 'get', metadata);
    }
    getItineraryPerDeparture(metadata) {
        return this.core.fetch('/itinerary/v2/execution', 'get', metadata);
    }
}

const createSDK = new SDK();
module.exports = createSDK;
