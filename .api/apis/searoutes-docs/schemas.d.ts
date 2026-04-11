declare const GetItinerariesFromProformas: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly fromLocode: {
                    readonly type: "string";
                    readonly examples: readonly ["CNSHA"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The UNLOCODE of the departure port.";
                };
                readonly toLocode: {
                    readonly type: "string";
                    readonly examples: readonly ["FRLEH"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The UNLOCODE of the arrival port.";
                };
                readonly carrierId: {
                    readonly type: "number";
                    readonly examples: readonly [21];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The ID of the carrier (can be found via the search endpoints). Either a SCAC or a carrier ID must be provided.";
                };
                readonly carrierScac: {
                    readonly type: "string";
                    readonly examples: readonly ["CMDU"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The Standard Carrier Alpha Code (SCAC) of the carrier. Either a SCAC or a carrier ID must be provided.";
                };
                readonly services: {
                    readonly type: "number";
                    readonly examples: readonly [1961];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The ID of the service(s) (up to three) that must be included in the itinerary.";
                };
                readonly nContainers: {
                    readonly type: "number";
                    readonly examples: readonly [1];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The number of shipped containers.";
                };
                readonly containerSizeTypeCode: {
                    readonly type: "string";
                    readonly examples: readonly ["20GP"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Code to identify the size and the type of the container (e.g., 20GP).";
                };
                readonly weight: {
                    readonly type: "integer";
                    readonly examples: readonly [10000];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The weight of the shipped goods in kilograms.";
                };
                readonly sortBy: {
                    readonly default: "TRANSIT_TIME";
                    readonly type: "string";
                    readonly examples: readonly ["TRANSIT_TIME"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Defines sorting criteria for the results, whether by `CO2` or `TRANSIT_TIME`.";
                };
            };
            readonly required: readonly ["fromLocode", "toLocode"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "404": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetItineraryByHash: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly hash: {
                    readonly type: "string";
                    readonly examples: readonly ["7bOn2n2AelF"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The hash of the itinerary to retrieve.";
                };
            };
            readonly required: readonly ["hash"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetItineraryPerDeparture: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly fromLocode: {
                    readonly default: "BRSSZ";
                    readonly type: "string";
                    readonly examples: readonly ["BRSSZ"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The UNLOCODE of the departure port.";
                };
                readonly toLocode: {
                    readonly default: "COCTG";
                    readonly type: "string";
                    readonly examples: readonly ["COCTG"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The UNLOCODE of the arrival port.";
                };
                readonly carrierScac: {
                    readonly default: "CMDU";
                    readonly type: "string";
                    readonly examples: readonly ["CMDU"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The Standard Carrier Alpha Code (SCAC) of the carrier. Note that you must provide either a SCAC or a carrier id.";
                };
                readonly carrierId: {
                    readonly type: "number";
                    readonly examples: readonly [21];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The id of the carrier (can be found via the search endpoints). Note that you must provide either a SCAC or a carrier id.";
                };
                readonly fromDate: {
                    readonly type: "string";
                    readonly examples: readonly ["2023-12-07T15:00:00Z"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies the sailing date from which the itineraries are retrieved, in the ISO 8601 format.";
                };
                readonly toDate: {
                    readonly type: "string";
                    readonly examples: readonly ["2023-12-25T15:00:00Z"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies the sailing date until which the itineraries are retrieved, in the ISO 8601 format.";
                };
                readonly nContainers: {
                    readonly default: 1;
                    readonly type: "number";
                    readonly examples: readonly [1];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The number of shipped containers.";
                };
                readonly containerSizeTypeCode: {
                    readonly type: "string";
                    readonly examples: readonly ["20GP"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Code to identify the size and the type of the container (e.g., 20GP).";
                };
                readonly weight: {
                    readonly default: 1000;
                    readonly type: "integer";
                    readonly examples: readonly [5000];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The weight of the shipped goods in kilograms.";
                };
                readonly sortBy: {
                    readonly type: "string";
                    readonly examples: readonly ["CO2"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Defines the sorting of the itinerary results, whether by `CO2` or `TRANSIT_TIME`. By default, results will be sorted by CO2.";
                };
            };
            readonly required: readonly ["fromLocode", "toLocode"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "404": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetPlanSeaRoute: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly locations: {
                    readonly type: "string";
                    readonly examples: readonly ["NOOSL;9.964964437275171,53.533339906296874"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "A list of locations given as `longitude,latitude` pairs or UN/LOCODEs, separated by `;`. Longitude should be between -180 and 180 degrees, and latitude between -90 and 90 degrees. You can specify up to 20 locations.";
                };
            };
            readonly required: readonly ["locations"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly continuousCoordinates: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Allows to return either continuous longitudes when crossing the antimeridian (`true`) or longitudes always between -180° and 180° (`false`)";
                };
                readonly allowIceAreas: {
                    readonly type: "boolean";
                    readonly default: false;
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies if sailing in ice areas (Northern Sea route, deep South Pacific, deep South Atlantic, Bering Sea, etc) is possible.";
                };
                readonly avoidHRA: {
                    readonly type: "boolean";
                    readonly default: false;
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies if travel in HRA zone should be avoided";
                };
                readonly avoidSeca: {
                    readonly type: "boolean";
                    readonly default: false;
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies if travel in SECA zones should be avoided";
                };
                readonly blockAreas: {
                    readonly type: "integer";
                    readonly examples: readonly [11112];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies a particular routing area to block, or a list of routing areas to block (separated by `,`). Typical routing areas are `PANAMA:11112` and `SUEZ:11117`, other area Ids can be found using the [/geocoding/area/{name}](/reference/getgeocodingarea).";
                };
                readonly departure: {
                    readonly type: "integer";
                    readonly examples: readonly [1570095939000];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies departure time in unix time in ms.";
                };
                readonly imo: {
                    readonly type: "integer";
                    readonly examples: readonly [9776418];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The IMO number of the vessel.";
                };
                readonly speed: {
                    readonly type: "number";
                    readonly examples: readonly [42];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The speed of the vessel in km/h.";
                };
                readonly speedInKts: {
                    readonly type: "number";
                    readonly examples: readonly [23.5];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The speed of the vessel in knots.";
                };
                readonly vesselDraft: {
                    readonly type: "number";
                    readonly examples: readonly [17];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The draft of the vessel in meters.";
                };
            };
            readonly required: readonly [];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly description: "GeoJSon object\nThe coordinate reference system for all GeoJSON coordinates is a geographic coordinate reference system, using the World Geodetic System 1984 (WGS 84) datum, with longitude and latitude units of decimal degrees. This is equivalent to the coordinate reference system identified by the Open Geospatial Consortium (OGC) URN An OPTIONAL third-position element SHALL be the height in meters above or below the WGS 84 reference ellipsoid. In the absence of elevation values, applications sensitive to height or depth SHOULD interpret positions as being at local ground or sea level.\n";
            readonly type: "object";
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["Feature", "FeatureCollection", "Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"];
                    readonly description: "`Feature` `FeatureCollection` `Point` `MultiPoint` `LineString` `MultiLineString` `Polygon` `MultiPolygon` `GeometryCollection`";
                };
                readonly bbox: {
                    readonly description: "A GeoJSON object MAY have a member named \"bbox\" to include information on the coordinate range for its Geometries, Features, or FeatureCollections. The value of the bbox member MUST be an array of length 2*n where n is the number of dimensions represented in the contained geometries, with all axes of the most southwesterly point followed by all axes of the more northeasterly point. The axes order of a bbox follows the axes order of geometries.\n";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "number";
                    };
                };
            };
            readonly required: readonly ["type"];
            readonly discriminator: {
                readonly propertyName: "type";
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "404": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetSeaRoute: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly locations: {
                    readonly type: "string";
                    readonly examples: readonly ["NOOSL;9.964964437275171,53.533339906296874"];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "A list of locations given as `longitude,latitude` pairs or UN/LOCODEs, separated by `;`. Longitude should be between -180 and 180 degrees, and latitude between -90 and 90 degrees. You can specify up to 20 locations.";
                };
            };
            readonly required: readonly ["locations"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly continuousCoordinates: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Allows to return either continuous longitudes when crossing the antimeridian (`true`) or longitudes always between -180° and 180° (`false`)";
                };
                readonly allowIceAreas: {
                    readonly type: "boolean";
                    readonly default: false;
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies if sailing in ice areas (Northern Sea route, deep South Pacific, deep South Atlantic, Bering Sea, etc) is possible.";
                };
                readonly avoidHRA: {
                    readonly type: "boolean";
                    readonly default: false;
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies if travel in HRA zone should be avoided";
                };
                readonly avoidSeca: {
                    readonly type: "boolean";
                    readonly default: false;
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies if travel in SECA zones should be avoided";
                };
                readonly blockAreas: {
                    readonly type: "integer";
                    readonly examples: readonly [11112];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies a particular routing area to block, or a list of routing areas to block (separated by `,`). Typical routing areas are `PANAMA:11112` and `SUEZ:11117`, other area Ids can be found using the [/geocoding/area/{name}](/reference/getgeocodingarea).";
                };
                readonly departure: {
                    readonly type: "integer";
                    readonly examples: readonly [1570095939000];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Specifies departure time in unix time (in ms).";
                };
                readonly imo: {
                    readonly type: "integer";
                    readonly examples: readonly [9776418];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The IMO number of the vessel.";
                };
                readonly speed: {
                    readonly type: "number";
                    readonly examples: readonly [42];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The speed of the vessel in km/h.";
                };
                readonly speedInKts: {
                    readonly type: "number";
                    readonly examples: readonly [23.5];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The speed of the vessel in knots.";
                };
                readonly vesselDraft: {
                    readonly type: "number";
                    readonly examples: readonly [17];
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "The draft of the vessel in meters.";
                };
            };
            readonly required: readonly [];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly description: "GeoJSon object\nThe coordinate reference system for all GeoJSON coordinates is a geographic coordinate reference system, using the World Geodetic System 1984 (WGS 84) datum, with longitude and latitude units of decimal degrees. This is equivalent to the coordinate reference system identified by the Open Geospatial Consortium (OGC) URN An OPTIONAL third-position element SHALL be the height in meters above or below the WGS 84 reference ellipsoid. In the absence of elevation values, applications sensitive to height or depth SHOULD interpret positions as being at local ground or sea level.\n";
            readonly type: "object";
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["Feature", "FeatureCollection", "Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"];
                    readonly description: "`Feature` `FeatureCollection` `Point` `MultiPoint` `LineString` `MultiLineString` `Polygon` `MultiPolygon` `GeometryCollection`";
                };
                readonly bbox: {
                    readonly description: "A GeoJSON object MAY have a member named \"bbox\" to include information on the coordinate range for its Geometries, Features, or FeatureCollections. The value of the bbox member MUST be an array of length 2*n where n is the number of dimensions represented in the contained geometries, with all axes of the most southwesterly point followed by all axes of the more northeasterly point. The axes order of a bbox follows the axes order of geometries.\n";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "number";
                    };
                };
            };
            readonly required: readonly ["type"];
            readonly discriminator: {
                readonly propertyName: "type";
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "404": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
export { GetItinerariesFromProformas, GetItineraryByHash, GetItineraryPerDeparture, GetPlanSeaRoute, GetSeaRoute };
