/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('eris').config(function ($provide) {
        $provide.decorator('$httpBackend', angular.mock.e2e.$httpBackendDecorator);
    }).run(function ($httpBackend, erisConfig, stateService, XMLHttpRequest, moment, _){
        var getSync = function (url) {
            var request = new XMLHttpRequest();
            request.open('GET', url, false);
            request.send(null);
            return [request.status, request.response, {}];
        };

        var voterNameRegex = new RegExp('^' + erisConfig.erisApi.url + '/voters', 'i'),
            voterRegex = new RegExp('^' + erisConfig.erisApi.url + '/votes/voter', 'i'),
            votesRegex = new RegExp('^' + erisConfig.erisApi.url + '/votes', 'i'),
            reasonsOverrideUrl = './static/data/reasons.json',
            reasonsRegex = new RegExp('^' + erisConfig.erisApi.url + '/reasons', 'i'),
            eventsRegex = new RegExp('^' + erisConfig.server.url, 'i'),
            plotDataRegex = new RegExp('^' + erisConfig.eventServer.ajaxUrl + '/plot-data', 'i'),
            framesRegex = new RegExp('^' + erisConfig.eventServer.ajaxUrl + '/frames', 'i'),
            gifRegex = new RegExp('^' + erisConfig.erisApi.url + '/gif', 'i'),
            fmvRegex = new RegExp('^' + erisConfig.fmv.url, 'i'),
            correlationOverrideUrl = './static/data/correlation.json',
            countriesOverrideUrl = './static/data/countries.json',
            strikeRegex = new RegExp('^' + erisConfig.localServer.url, 'i'),
            scaleRegex = new RegExp('^' + erisConfig.scale.ajaxUrl, 'i'),
            kmlRegex = new RegExp('^' + erisConfig.erisApi.url + '/kml', 'i'),
            alertRegex = new RegExp('^' + erisConfig.erisApi.url + '/alerts', 'i'),
            eventsData = {
                type: 'FeatureCollection',
                totalFeatures: 0,
                features: null
            },
            strikeData = {
                type: 'FeatureCollection',
                totalFeatures: 0,
                features: null
            },
            filteredEventsData = null,
            filteredStrikeData = null,
            plotData = [];

        var countryCodes = ['UA', 'CN', 'US', 'MY', 'PL', 'PS', 'JP', 'PT', 'EG', 'TM', 'SE', 'ID', 'YE', 'CZ', 'BR', 'CY', 'MA', 'KH', 'NG', 'RU', 'FM', 'KZ', 'PH', 'GR', 'CA', 'FR', 'IE'];

        var event = {
            type: 'FeatureCollection',
            totalFeatures: 1,
            features: [{
                type: 'Feature',
                id: 'events.fid',
                geometry: {
                    type: 'Point',
                    coordinates: [-100, 35]
                },
                geometry_name: 'event_location',
                properties: {
                    product_id: '1111111111',
                    identity: true,
                    dataset_id: 10,
                    event_type: 'Static',
                    file_path: 'file1.h5',
                    event_lon: -100,
                    event_lat: 35,
                    event_time: '2017-03-05T12:56:38Z',
                    event_class: 'UTYP',
                    event_confidence: 91,
                    peak_intensity: 767,
                    peak_snr: 401,
                    is_correlated: false,
                    country_code: countryCodes[5],
                    payload_id: 'Sensor 1',
                    loc_minor_axis: 700,
                    loc_major_axis: 2500,
                    ellipse_orientation: -45
                }
            }]
        };

        var generateEvents = function () {
            eventsData.features = [];

            var temporalFilter = stateService.getTemporalFilter(),
                start = moment.utc(temporalFilter.start),
                stop = moment.utc(temporalFilter.stop),
                range = stop.diff(start, 'd'),
                mapBounds = stateService.getMapBounds(),
                minLat = mapBounds._southWest.lat,
                maxLat = mapBounds._northEast.lat,
                minLng = mapBounds._southWest.lng,
                maxLng = mapBounds._northEast.lng,
                maxFeatures = 0;

            if (range <= 1) {
                maxFeatures = 100;
            } else if (range > 1 && range <= 3) {
                maxFeatures = 200;
            } else if (range > 3 && range <= 7) {
                maxFeatures = 500;
            } else {
                maxFeatures = 1000;
            }

            var fileList = [
                'https://support.hdfgroup.org/ftp/HDF5/examples/examples-by-api/matlab/HDF5_M_Examples/h5ex_d_alloc.h5',
                'https://support.hdfgroup.org/ftp/HDF5/examples/examples-by-api/matlab/HDF5_M_Examples/h5ex_d_checksum.h5',
                'https://support.hdfgroup.org/ftp/HDF5/examples/examples-by-api/matlab/HDF5_M_Examples/h5ex_d_chunk.h5',
                'https://support.hdfgroup.org/ftp/HDF5/examples/examples-by-api/matlab/HDF5_M_Examples/h5ex_d_compact.h5',
                'https://support.hdfgroup.org/ftp/HDF5/examples/examples-by-api/matlab/HDF5_M_Examples/h5ex_d_extern.h5'
            ];

            eventsData.totalFeatures = (Math.floor(Math.random() * (maxFeatures - 1 + 1)) + 1) + 1;

            for (var i = 0; i < eventsData.totalFeatures; i++) {
                var lat = parseFloat((Math.random() * (maxLat - minLat) + minLat).toFixed(6)),
                    lng = parseFloat((Math.random() * (maxLng - minLng) + minLng).toFixed(6)),
                    date = moment.utc(start.valueOf() + Math.random() * (stop.valueOf() - start.valueOf())).toISOString(),
                    duration = Math.floor(Math.random() * (300 - 1 + 1)) + 1,
                    rand = Math.floor(Math.random() * (2 - 1 + 1)) + 1,
                    rand2 = Math.floor(Math.random() * (2 - 1 + 1)) + 1,
                    identity = rand === 1,
                    sensor = Math.floor(Math.random() * (5 - 1 + 1)) + 1;

                var feature = {
                    type: 'Feature',
                    id: 'events.fid',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    geometry_name: 'event_location',
                    properties: {
                        product_id: Math.floor(Math.random() * 10000000000).toString(),
                        identity: identity,
                        dataset_id: Math.floor(Math.random() * (1000 - 1 + 1)) + 1,
                        event_type: 'Static',
                        file_path: fileList[Math.floor(Math.random() * (5 - 1) + 1)],
                        event_lon: lng,
                        event_lat: lat,
                        event_time: date,
                        event_class: 'UTYP',
                        event_confidence: Math.floor(Math.random() * (100 - 1 + 1)) + 1,
                        peak_intensity: Math.floor(Math.random() * (1000 - 1 + 1)) + 1,
                        peak_snr: Math.floor(Math.random() * (500 - 1 + 1)) + 1,
                        event_start: moment.utc(date).subtract(Math.floor(duration / 2), 's'),
                        event_end: moment.utc(date).add(Math.ceil(duration / 2), 's'),
                        event_duration: moment.duration(duration, 's').format('mm:ss.SSS'),
                        is_correlated: (Math.floor(Math.random() * (10 - 1) + 1)) % 2 !== 0,
                        country_code: countryCodes[(Math.floor(Math.random() * (27)))],
                        payload_id: 'Sensor ' + sensor,
                        loc_minor_axis: rand2 === 1 ? Math.floor(Math.random() * (1000 - 100) + 100) + 1 : null,
                        loc_major_axis: rand2 === 1 ? Math.floor(Math.random() * (10000 - 1001) + 1001) : null,
                        // loc_minor_axis: null,
                        // loc_major_axis: null,
                        ellipse_orientation: identity ? Math.floor(Math.random() * (360 + (-180)) + (-180)) : null
                    }
                };

                eventsData.features.push(feature);
            }
            eventsData.features.push(event.features[0]);
            filteredEventsData = _.clone(eventsData);
        };

        var generateEventTracks = function () {
            var activeEvent = stateService.getActiveEvent();

            var request = new XMLHttpRequest();
            request.open('GET', './static/data/eventTracks.json', false);
            request.send(null);

            var eventTracks = JSON.parse(request.response);
            eventTracks.features[0].geometry.coordinates = activeEvent.geometry.coordinates;
            eventTracks.features[0].properties = activeEvent.properties;

            return [200, JSON.stringify(eventTracks), {}];
        };

        var generatePlotData = function () {
            var request = new XMLHttpRequest();
            request.open('GET', './static/data/plotData.json', false);
            request.send(null);

            var data = JSON.parse(request.response),
                startTime = 0,
                points = [];

            for (var i = 0; i < 25; i++) {
                var intensity = Math.random() * (10 - (-10)) + (-10),
                    sensorIdx = Math.floor(Math.random() * (6));

                points.push([(startTime + i), sensorIdx, 0, intensity]);
            }

            data.points = points;

            plotData = data;
            return [200, JSON.stringify(plotData), {}];
        };

        var generateFrameData = function () {
            var frameData = {
                    count: plotData.points.length,
                    results: []
                },
                results = [];

            for (var frameIdx = 0; frameIdx < frameData.count; frameIdx++) {
                var frame = {
                    width: 45,
                    values: [],
                    timestamp: plotData.points[frameIdx][0],
                    min: -10,
                    max: 10,
                    object: 'UTYP',
                    sensor: plotData.sensors[plotData.points[frameIdx][1]],
                    height: 45
                };

                for (var i = 0; i < 2025; i++) {
                    frame.values.push(Math.floor(Math.random() * (frame.max - frame.min) + frame.min));
                }

                results.push(frame);
            }
            frameData.results = results;

            return [200, JSON.stringify(frameData), {}];
        };

        var generateFMVData = function (params) {
            var mapBounds = stateService.getMapBounds(),
                minLat = mapBounds._southWest.lat,
                maxLat = mapBounds._northEast.lat,
                minLng = mapBounds._southWest.lng,
                maxLng = mapBounds._northEast.lng;

            var fmvData = {
                code: 'OK',
                message: 'Successfully searched recordings.',
                data: {
                    total: (Math.floor(Math.random() * (1000 - 10 + 1)) + 10).toString(),
                    filteredTotal: (Math.floor(Math.random() * (50 - 5 + 1)) + 5).toString(),
                    data: []
                },
                securityclassification: 'UNCLASSIFIED'
            };

            for (var i = 0; i < fmvData.data.filteredTotal; i++) {
                var tRand = (Math.floor(Math.random() * (parseInt(params.endtime) - parseInt(params.starttime) + 1)) + parseInt(params.starttime)) * 1000,
                    startTime = moment.utc((params.starttime * 1000) + tRand),
                    duration = Math.floor(Math.random() * (600 - 10 + 1)) + 10,
                    endTime = moment.utc(startTime).add(duration, 's'),
                    north = parseFloat((Math.random() * (maxLat - minLat) + minLat).toFixed(4)),
                    south = north - 0.1,
                    east = parseFloat((Math.random() * (maxLng - minLng) + minLng).toFixed(4)),
                    west = east - 0.1;

                fmvData.data.data.push({
                    id: 12345678,
                    nid: 123,
                    feedname: 'My Feed',
                    starttime: startTime.unix(),
                    endtime: endTime.unix(),
                    mca: '123.45.678.901:2345',
                    duration: duration,
                    lookups: {
                        sensor: [],
                        platform: ['My Platform'],
                        mission: [],
                        country: ['US']
                    },
                    boundingbox: {
                        type: 'Polygon',
                        coordinates: [[[east,north],[west,north],[west,south],[east,south],[east,north]]]
                    },
                    downloadurl: '/api/download/12345678'
                });
            }

            return [200, JSON.stringify(fmvData), {}];
        };

        var generateStrikes = function () {
            strikeData.features = [];

            var temporalFilter = stateService.getTemporalFilter(),
                start = moment.utc(temporalFilter.start),
                stop = moment.utc(temporalFilter.stop),
                range = stop.diff(start, 'd'),
                mapBounds = stateService.getMapBounds(),
                minLat = mapBounds._southWest.lat,
                maxLat = mapBounds._northEast.lat,
                minLng = mapBounds._southWest.lng,
                maxLng = mapBounds._northEast.lng,
                maxFeatures = 0;

            if (range <= 1) {
                maxFeatures = 50;
            } else if (range > 1 && range <= 3) {
                maxFeatures = 100;
            } else if (range > 3 && range <= 7) {
                maxFeatures = 250;
            } else {
                maxFeatures = 500;
            }

            strikeData.totalFeatures = (Math.floor(Math.random() * (maxFeatures - 1 + 1)) + 1) + 1;

            for (var i = 0; i < strikeData.totalFeatures; i++) {
                var lat = parseFloat((Math.random() * (maxLat - minLat) + minLat).toFixed(6)),
                    lng = parseFloat((Math.random() * (maxLng - minLng) + minLng).toFixed(6)),
                    date = moment.utc(start.valueOf() + Math.random() * (stop.valueOf() - start.valueOf())).toISOString();

                var feature = {
                    type: 'Feature',
                    id: 'events.fid',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    geometry_name: 'geom',
                    properties: {
                        'ENTITY NAME': 'My Strike',
                        ORD1: '1',
                        ORDNANCE_1: 'Water-Balloon',
                        ORD2: '',
                        ORDNANCE_2: '',
                        ORD3: '',
                        ORDNANCE_3: 'Super-Soaker',
                        ORD4: '',
                        ORDNANCE_4: '',
                        ORD5: '',
                        ORDNANCE_5: '',
                        ORD6: '',
                        ORDNANCE_6: '',
                        ORD7: '',
                        ORDNANCE_7: '',
                        'TARGETs REMARK': 'DUDE IS ALL SOAKED',
                        LONG: lng,
                        LAT: lat,
                        date_time: date
                    }
                };

                strikeData.features.push(feature);
            }
            filteredStrikeData = _.clone(strikeData);
        };

        // Templates requests must pass through
        $httpBackend.whenGET(/html$/).passThrough();

        // Scale requests pass through
        $httpBackend.whenGET(scaleRegex).passThrough();

        // Vote requests pass through
        $httpBackend.whenGET(voterRegex).passThrough();
        $httpBackend.whenGET(votesRegex).passThrough();
        $httpBackend.whenPOST(votesRegex).passThrough();
        $httpBackend.whenPUT(votesRegex).passThrough();

        // Voter Name requests pass through
        $httpBackend.whenGET(voterNameRegex).passThrough();
        $httpBackend.whenPOST(voterNameRegex).passThrough();

        // Gif requests pass through
        $httpBackend.whenPOST(gifRegex).passThrough();

        $httpBackend.whenPOST(kmlRegex).passThrough();

        // Reasons service
        $httpBackend.whenGET(reasonsRegex).respond(function () {
            return getSync(reasonsOverrideUrl);
        });

        // Events service
        $httpBackend.whenPOST(eventsRegex).respond(function (method, url) {
            var mapBounds = stateService.getMapBounds();
            if (mapBounds) {
                if (eventsData.features === null) {
                    generateEvents();
                }
                var intensity = stateService.getIntensity();
                var snr = stateService.getSnr();
                var duration = stateService.getDuration();
                filteredEventsData.features = _.filter(eventsData.features, function (event) {
                    return event.properties[erisConfig.server.confidenceField] > stateService.getConfidence() && (event.properties.loc_major_axis > stateService.getLocationUncertainty() || event.properties.loc_major_axis === null) && event.properties[erisConfig.server.intensityField] >= intensity.min && event.properties[erisConfig.server.intensityField] <= intensity.max && event.properties[erisConfig.server.snrField] >= snr.min && event.properties[erisConfig.server.snrField] <= snr.max && event.properties[erisConfig.server.durationField] >= moment.duration(duration.min, 's').format('mm:ss.SSS') && event.properties[erisConfig.server.durationField] <= moment.duration(duration.max, 's').format('mm:ss.SSS') && mapBounds.contains(L.latLng(event.properties[erisConfig.server.latField], event.properties[erisConfig.server.lonField]));
                });

                return [200, JSON.stringify(filteredEventsData), {}];
            }
            return [200, JSON.stringify(event), {}];
        });
        $httpBackend.whenGET(eventsRegex).respond(function (method, url) {
            var urlParams = _.fromPairs(_.map(url.split('?')[1].split('&'), function (s) { return s.split('='); })),
                mapBounds = stateService.getMapBounds();

            if (urlParams.typeName === 'eris:events') {
                if (mapBounds) {
                    if (eventsData.features === null) {
                        generateEvents();
                    }
                    var intensity = stateService.getIntensity();
                    var snr = stateService.getSnr();
                    var duration = stateService.getDuration();
                    var temporalFilter = stateService.getTemporalFilter();
                    filteredEventsData.features = _.filter(eventsData.features, function (event) {
                        return moment.utc(event.properties[erisConfig.server.dateField]).isBetween(moment.utc(temporalFilter.start), moment.utc(temporalFilter.stop)) && event.properties[erisConfig.server.confidenceField] > stateService.getConfidence() && (event.properties.loc_major_axis > stateService.getLocationUncertainty() || event.properties.loc_major_axis === null) && event.properties[erisConfig.server.intensityField] >= intensity.min && event.properties[erisConfig.server.intensityField] <= intensity.max && event.properties[erisConfig.server.snrField] >= snr.min && event.properties[erisConfig.server.snrField] <= snr.max && event.properties[erisConfig.server.durationField] >= moment.duration(duration.min, 's').format('mm:ss.SSS') && event.properties[erisConfig.server.durationField] <= moment.duration(duration.max, 's').format('mm:ss.SSS') && mapBounds.contains(L.latLng(event.properties[erisConfig.server.latField], event.properties[erisConfig.server.lonField]));
                    });

                    return [200, JSON.stringify(filteredEventsData), {}];
                }
                return [200, JSON.stringify(event), {}];
            } else if (urlParams.typeName === 'eris:tracks') {
                return generateEventTracks();
            } else if (urlParams.typeName === 'eris:correlating_events') {
                return getSync(correlationOverrideUrl);
            }
        });

        // Plot data service
        $httpBackend.whenGET(plotDataRegex).respond(function () {
            return generatePlotData();
        });

        // Frames service
        $httpBackend.whenGET(framesRegex).respond(function () {
            return generateFrameData();
        });

        // FMV service
        $httpBackend.whenGET(fmvRegex).respond(function (method, url) {
            var urlParams = _.fromPairs(_.map(url.split('?')[1].split('&'), function (s) { return s.split('='); }));
            return generateFMVData(urlParams);
        });

        // Strike service
        $httpBackend.whenGET(strikeRegex).respond(function (method, url) {
            var urlParams = _.fromPairs(_.map(url.split('?')[1].split('&'), function (s) { return s.split('='); })),
                mapBounds = stateService.getMapBounds();

            if (urlParams.typeName === 'eris:countries') {
                return getSync(countriesOverrideUrl);
            }

            if (mapBounds) {
                if (strikeData.features === null) {
                    generateStrikes();
                }
                filteredStrikeData.features = _.filter(strikeData.features, function (strike) {
                    return mapBounds.contains(L.latLng(strike.properties.LAT, strike.properties.LONG));
                });

                return [200, JSON.stringify(filteredStrikeData), {}];
            }
        });

        // Alert service
        $httpBackend.whenGET(alertRegex).respond(function (method, url) {
            console.log(url);
            var alertData = [{
                alert_id: 1,
                class: 'md-warn',
                message: 'Don\'t Panic',
                started: '2018-02-14T10:08:45.000Z',
                ended: '2018-02-14T10:08:45.000Z',
                is_active: true
            }];
            return [200, JSON.stringify(alertData), {}];
        });
    });
})();
