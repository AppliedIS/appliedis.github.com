/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    var app = angular.module('delta', [
        'delta.config',
        'ngMaterial',
        'ngCookies',
        'ngResource',
        'ngSanitize',
        'ngAnimate',
        'ngWebworker',
        'nemLogging',
        'mdPickers',
        'ui-leaflet',
        'LocalStorageModule',
        'cfp.hotkeys'
    ]);

    app.config(['$provide', '$mdThemingProvider', function ($provide, $mdThemingProvider) {
        // Fix sourcemaps
        // @url https://github.com/angular/angular.js/issues/5217#issuecomment-50993513
        $provide.decorator('$exceptionHandler', ['$delegate', function ($delegate) {
            return function (exception, cause) {
                $delegate(exception, cause);
                setTimeout(function() {
                    throw exception;
                });
            };
        }]);

        $mdThemingProvider.theme('default').primaryPalette('grey').accentPalette('blue').dark();
        $mdThemingProvider.theme('success-toast');
        $mdThemingProvider.theme('fail-toast');
        $mdThemingProvider.theme('warn-toast');
    }])
    .value('moment', window.moment)
    .value('_', window._)
    .value('L', window.L)
    .value('localStorage', window.localStorage)
    .value('d3', window.d3)
    .value('$', window.$)
    .value('toastr', window.toastr)
    .value('c3', window.c3)
    .value('XMLHttpRequest', window.XMLHttpRequest)
    .value('LLtoMGRS', window.LLtoMGRS)
    .value('GoldenLayout', window.GoldenLayout);

    app.run(['$rootScope', '$http', '$compile', '$mdToast', 'deltaConfig', 'deltaService', 'stateService', 'voteService', 'GoldenLayout', '_', function($rootScope, $http, $compile, $mdToast, deltaConfig, deltaService, stateService, voteService, GoldenLayout, _) {
        // set a global scope param for the <title> element
        $rootScope.pageTitle = deltaConfig.title;

        // retrieve/set voting info
        voteService.getVoter('voter_name').then(function (result) {
            if (result.data.length > 0) {
                // user has voted before
                stateService.setVoter(result.data[0]);
                voteService.getVotesByVoter(result.data[0].voter_name).then(function (votes) {
                    stateService.setVotes(votes.data);
                }).catch(function (error) {
                    console.log(error);
                    stateService.setVotes(null);
                });
            } else {
                // TODO: right now the service simply reads the user's IP,
                // therefore no payload data is required. When PKI auth is
                // available, an object will need to be passed to the addVoter
                // function
                voteService.addVoter().then(function (voter) {
                    stateService.setVoter(voter.data);
                }).catch(function (error) {
                    console.log(error);
                    stateService.setVoter(null);
                    $mdToast.show($mdToast.simple().textContent('Error: Unable to add voter to database. Voting will be unavailable.').theme('warn-toast').position('top right'));
                });
            }
        }).catch(function (error) {
            console.log(error);
            stateService.setVoter(null);
            $mdToast.show($mdToast.simple().textContent('Error: Unable to query vote database. Voting will be unavailable.').theme('warn-toast').position('top right'));
        });

        // load reasons to list for downvote button
        voteService.getReasons().then(function (result) {
            var voteReasons = _.filter(result.data, function (data) {
                return data.reason.length > 0;
            });
            stateService.setVoteReasons(voteReasons);
        }).catch(function (error) {
            $mdToast.simple().textContent('Error retrieving vote information');
            if (error) {
                console.log(error);
            }
        });

        // golden layout config
        var config = {
            settings: {
                hasHeaders: true,
                showPopoutIcon: false,
                showMaximiseIcon: true,
                showCloseIcon: false
            },
            labels: {
                maximise: 'maximize',
                minimise: 'minimize'
            },
            content: [{
                type: 'row',
                content: [{
                    type: 'column',
                    width: 22,
                    content: [{
                        type: 'component',
                        componentName: 'template',
                        componentState: {
                            templateId: 'modules/components/sidebar/sidebarTemplate.html',
                            templateName: 'navigation',
                            templateTitle: 'Navigation'
                        }
                    }]
                },{
                    type: 'column',
                    width: 39,
                    content: [{
                        type: 'row',
                        height: 70,
                        content: [{
                            type: 'component',
                            componentName: 'template',
                            componentState: {
                                templateId: 'modules/components/map/mapTemplate.html',
                                templateName: 'map',
                                templateTitle: 'Map'
                            }
                        }]
                    },{
                        type: 'row',
                        height: 30,
                        content: [{
                            type: 'component',
                            componentName: 'template',
                            componentState: {
                                templateId: 'modules/components/events/eventsTemplate.html',
                                templateName: 'events',
                                templateTitle: 'Events'
                            }
                        }]
                    }]
                },{
                    type: 'column',
                    width: 39,
                    content: [{
                        type: 'component',
                        componentName: 'template',
                        componentState: {
                            templateId: 'modules/components/eventViewer/eventViewerTemplate.html',
                            templateName: 'eventViewer',
                            templateTitle: 'Event Details'
                        }
                    }]
                }]
            }]
        };

        var myLayout = new GoldenLayout(config),
            components = [];

        myLayout.registerComponent('template', function (container, state) {
            container.setTitle(state.templateTitle);
            $http.get(state.templateId, { cache: true }).success(function (html) {
                html = $compile('<div>' + html + '</div>')($rootScope);
                container.getElement().html(html);
                components.push({ container: container, state: state });
                stateService.setLayoutComponents(components);
            });
        });

        myLayout.init();
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').service('deltaConfig', ['deltaConfigLocal', 'moment', '_', 'L', function (deltaConfigLocal, moment, _, L) {
        var cfg = {
            title: 'Delta',
            logo: 'Δ Delta',
            mapCenter: {
                lat: 44.366428,
                lng: -81.453945,
                zoom: 8
            },
            layers: {
                baselayers: {}
            },
            defaultLocationFormat: 'dd',
            defaultBaselayer: '',
            maxDaysBack: 10000,
            defaultDaysBack: 1,
            ranges: [
                {
                    units: -7,
                    unitOfTime: 'days',
                    label: '7 Days'
                },
                {
                    units: -1,
                    unitOfTime: 'days',
                    label: '1 Day'
                },
                {
                    units: -12,
                    unitOfTime: 'hours',
                    label: '12 Hours'
                }
            ],
            defaultDurationLength: 1,
            durations: [
                {
                    value: 'days',
                    label: 'Days',
                    default: false
                },
                {
                    value: 'weeks',
                    label: 'Weeks',
                    default: false
                },
                {
                    value: 'months',
                    label: 'Months',
                    default: true
                },
                {
                    value: 'years',
                    label: 'Years',
                    default: false
                }
            ],
            defaultProjection: L.CRS.EPSG4326,
            debounceTime: 300,
            maximumRecentAOIs: 5,
            components: {
                goto: true,
                sourceFilter: true,
                temporalFilter: true,
                typeFilter: true
            }
        };

        // recursively merge the local config onto the default config
        angular.merge(cfg, deltaConfigLocal);

        if (typeof cfg.defaultProjection === 'string') {
            // defaultProjection has been overwritten in local config
            // only a string value can be specified in local config, so use eval to produce the proper JS object
            cfg.defaultProjection = eval(cfg.defaultProjection); // jshint ignore:line
        }
        return cfg;
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').factory('Vote', function (

    ) {
        // Constructor
        var Vote = function (vote_id, product_id, dataset_id, identity, voter_name, vote, reason) {
            this.vote_id = vote_id || null;
            this.product_id = product_id || '';
            this.dataset_id = dataset_id || '';
            this.identity = identity || null;
            this.voter_name = voter_name || '';
            this.vote = typeof(vote) === 'undefined' ? null : vote;
            this.reason = reason || '';
        };

        // public methods
        Vote.prototype = {

        };

        // static methods
        Vote.build = function (data) {
            if (data) {
                if (typeof(data.vote) === 'string') {
                    data.vote = data.vote === 'true';
                }
                return new Vote(
                    data.vote_id,
                    data.product_id,
                    data.dataset_id,
                    data.identity,
                    data.voter_name,
                    data.vote,
                    data.reason
                );
            }
            return new Vote();
        };

        Vote.transformer = function (data) {
            if (angular.isArray(data)) {
                return data.map(Vote.build);
            }
            return Vote.build(data);
        };

        return Vote;
    });
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').factory('coordinateConversionService', ['LLtoMGRS', function (LLtoMGRS) {
        //truncate is a sign appropriate truncation function
        var truncate = function (_value) {
            if (_value < 0) {
                return Math.ceil(_value);
            }
            else {
                return Math.floor(_value);
            }
        };

        /*
         Converts latitude decimal degrees (float) into degrees, minutes, seconds as a string in the format:
         'XX°XX'XX.XXX'
         */
        var ddLatToDMSLat = function (lat) {
            var degrees;
            var minutes;
            var seconds;
            if (lat <= 90 && lat >= 0) {
                degrees = truncate(lat);
                minutes = truncate((lat - degrees) * 60);
                seconds = ((((lat - degrees) * 60) - minutes) * 60).toFixed(3);
                return degrees + '°' + minutes + '\'' + seconds + '"';
            } else if (lat < 0 && lat >= -90) {
                degrees = truncate(lat);
                minutes = truncate((Math.abs(lat) - Math.abs(degrees)) * 60);
                seconds = ((((Math.abs(lat) - Math.abs(degrees)) * 60) - minutes) * 60).toFixed(3);
                return degrees + '°' + minutes + '\'' + seconds + '"';
            } else {
                return 'Invalid Latitude';
            }
        };

        /*
         Converts longitude decimal degrees (float) into degrees, minutes, seconds as a string in the format:
         'XX°XX'XX.XXX'
         */
        var ddLonToDMSLon = function (lon) {
            var degrees;
            var minutes;
            var seconds;
            if (lon <= 180 && lon >= 0) {
                degrees = truncate(lon);
                minutes = truncate((lon - degrees) * 60);
                seconds = ((((lon - degrees) * 60) - minutes) * 60).toFixed(3);
                return degrees + '°' + minutes + '\'' + seconds + '"';
            } else if (lon < 0 && lon >= -180) {
                degrees = truncate((lon));
                minutes = truncate((Math.abs(lon) - Math.abs(degrees)) * 60);
                seconds = ((((Math.abs(lon) - Math.abs(degrees)) * 60) - minutes) * 60).toFixed(3);
                return degrees + '°' + minutes + '\'' + seconds + '"';
            } else {
                return 'Invalid longitude';
            }
        };

        /*
         Converts latitude degrees, minutes, seconds into decimal degrees (float)
         */
        var dmsLatToDDLat = function (latDegree, latMinute, latSecond) {
            var degrees;
            var minutes;
            var seconds;
            if (parseFloat(latDegree) < 0) {
                seconds = parseFloat(latSecond) / 60;
                minutes = (parseFloat(latMinute) + seconds) / 60;
                degrees = parseFloat(Math.abs(latDegree));
                return ((degrees + minutes) * -1).toFixed(6);
            } else if (parseFloat(latDegree) >= 0) {
                seconds = parseFloat(latSecond) / 60;
                minutes = (parseFloat(latMinute) + seconds) / 60;
                degrees = parseFloat(latDegree);
                return (degrees + minutes).toFixed(6);
            } else {
                return 'Invalid Latitude';
            }
        };

        /*
         Converts longitude degrees, minutes, seconds into decimal degrees (float)
         */
        var dmsLonToDDLon = function (lonDegree, lonMinute, lonSecond) {
            var degrees;
            var minutes;
            var seconds;
            if (parseFloat(lonDegree) < 0) {
                seconds = parseFloat(lonSecond) / 60;
                minutes = (parseFloat(lonMinute) + seconds) / 60;
                degrees = parseFloat(Math.abs(lonDegree));
                return ((degrees + minutes) * -1).toFixed(6);
            } else if (parseFloat(lonDegree) >= 0) {
                seconds = parseFloat(lonSecond) / 60;
                minutes = (parseFloat(lonMinute) + seconds) / 60;
                degrees = parseFloat(lonDegree);
                return (degrees + minutes).toFixed(6);
            } else {
                return 'Invalid Longitude';
            }
        };

        //MyService is an object to contain all fields and
        //functions necessary to communicate with the various
        //controllers
        var coordService = {};

        /*
         Converts the decimal degrees of latitude and longitude input box the other formats (DMS and MGRS) so
         that those input boxes match as converted values.  Will do data validation by checking input coordinates
         fall between -80 and 84 latitude and -180 and 180 for longitude
         */
        coordService.prepForDDBroadcast = function (lat, lon) {
            if ((lat || lat === 0) && lat >= -90 && lat <= 90 && (lon || lon === 0) && lon >= -180 && lon <= 180) {
                var results = {
                    dms: [ddLatToDMSLat(lat), ddLonToDMSLon(lon)],
                    dd: [lat, lon],
                    mgrs: ''
                };
                if (lat >= -80 && lat <= 84) {
                    results.mgrs = LLtoMGRS(lat, lon, 5); // jshint ignore:line
                }
                return results;
            } else if (!(lat >= -80 && lat <= 84)) {
                return null;
            } else if (!(lon >= -180 && lon <= 180)) {
                return null;
            }
        };

        /*
         Converts the degrees, minutes, seconds strings of latitude and longitude input box the other formats (DD and MGRS) so
         that those input boxes match as converted values.  Will do data validation by checking input coordinates
         fall between -80 and 84 latitude and -180 and 180 for longitude
         */
        coordService.prepForDMSBroadcast = function (latDMS, lonDMS) {
            var latDegree, latMinute, latSecond, lonDegree, lonMinute, lonSecond;
            latDMS = latDMS.replace(/[NS ]/ig, '').split(/[°'"]/);
            lonDMS = lonDMS.replace(/[EW ]/ig, '').split(/[°'"]/);

            if (latDMS.length >= 3) {
                latDegree = parseInt(latDMS[0], 10);
                latMinute = parseInt(latDMS[1], 10);
                latSecond = parseFloat(latDMS[2], 10);
            } else if (latDMS.length === 1) {
                latDMS = latDMS[0].split('.');
                latSecond = parseFloat(latDMS[0].substr(-2) + '.' + latDMS[1], 10);
                latMinute = parseInt(latDMS[0].substr(-4, 2), 10);
                latDegree = parseInt(latDMS[0].slice(0, -4), 10);
            }
            if (lonDMS.length >= 3) {
                lonDegree = parseInt(lonDMS[0], 10);
                lonMinute = parseInt(lonDMS[1], 10);
                lonSecond = parseFloat(lonDMS[2], 10);
            } else if (lonDMS.length === 1) {
                lonDMS = lonDMS[0].split('.');
                lonSecond = parseFloat(lonDMS[0].substr(-2) + '.' + lonDMS[1], 10);
                lonMinute = parseInt(lonDMS[0].substr(-4, 2), 10);
                lonDegree = parseInt(lonDMS[0].slice(0, -4), 10);
            }

            if (
                latDegree >= -90 && latDegree <= 90 &&
                latMinute >= 0 && latMinute <= 60 &&
                latSecond >= 0 && latSecond <= 60 &&
                lonMinute >= 0 && lonMinute <= 60 &&
                lonSecond >= 0 && lonSecond <= 60 &&
                lonDegree >= -180 && lonDegree <= 180 &&
                parseFloat(latDegree) - parseFloat(latMinute * 0.01) - parseFloat(latSecond * 0.0001) >= -90 &&
                parseFloat(latDegree) + parseFloat(latMinute * 0.01) + parseFloat(latSecond * 0.0001) <= 90 &&
                parseFloat(lonDegree) - parseFloat(lonMinute * 0.01) - parseFloat(lonSecond * 0.0001) >= -180 &&
                parseFloat(lonDegree) + parseFloat(lonMinute * 0.01) + parseFloat(lonSecond * 0.0001) <= 180
            ) {
                var results = {
                    dms: [
                        latDegree + '°' + latMinute + '\'' + latSecond + '"',
                        lonDegree + '°' + lonMinute + '\'' + lonSecond + '"'],
                    dd: [
                        dmsLatToDDLat(latDegree, latMinute, latSecond),
                        dmsLonToDDLon(lonDegree, lonMinute, lonSecond)],
                    mgrs: ''
                };
                if (results.dd[0] >= -80 && results.dd[0] <= 84) {
                    results.mgrs = LLtoMGRS(results.dd[0], results.dd[1], 5); // jshint ignore:line
                }
                return results;
            } else {
                return null;
            }
        };

        /*
         Converts the MGRS-encoded string of latitude and longitude input box the other formats (DMS and DD) so
         that those input boxes match as converted values.  Will do data validation by checking input coordinates
         fall between -80 and 84 latitude and -180 and 180 for longitude
         */
        //prepForMGRSBroadcast is the function that converts the
        //coordinates entered in the MGRS input boxes and sets
        //the rest of the fields in the myService object. data
        //validation is completed by checking if the input
        //coordinates return values to the latLon[] from the
        //USNGtoLL() function of the usng.js library.
        coordService.prepForMGRSBroadcast = function (MGRS) {
            var latLon = [];
            USNGtoLL(MGRS + '', latLon); // jshint ignore:line

            if (isNaN(latLon[0]) || isNaN(latLon[1])) {
                return null;
            } else {
                // after 5 decimal places, the results start going off
                latLon[0] = Math.round(latLon[0] * 1e5) / 1.e5;
                latLon[1] = Math.round(latLon[1] * 1e5) / 1.e5;
                return {
                    mgrs: MGRS,
                    dd: latLon,
                    dms: [ddLatToDMSLat(latLon[0]), ddLonToDMSLon(latLon[1])]
                };
            }
        };

        coordService.isValidLatDD = function (lat) {
            return ((lat || lat === 0 || lat === '') && lat >= -90 && lat <= 90);
        };
        coordService.isValidLonDD = function (lon) {
            return ( (lon || lon === 0 || lon === '') && lon >= -180 && lon <= 180);
        };

        coordService.isValidLatDMS = function (latDMS) {
            if (latDMS === '') {
                return true;
            }
            var latDegree, latMinute, latSecond;
            latDMS = latDMS.replace(/[NS ]/ig, '').split(/[°'"]/);

            if (latDMS.length >= 3) {
                latDegree = parseInt(latDMS[0], 10);
                latMinute = parseInt(latDMS[1], 10);
                latSecond = parseFloat(latDMS[2], 10);
            } else if (latDMS.length === 1) {
                latDMS = latDMS[0].split('.');
                latSecond = parseFloat(latDMS[0].substr(-2) + '.' + latDMS[1], 10);
                latMinute = parseInt(latDMS[0].substr(-4, 2), 10);
                latDegree = parseInt(latDMS[0].slice(0, -4), 10);
            }
            return (
                latDegree >= -90 && latDegree <= 90 &&
                latMinute >= 0 && latMinute < 60 &&
                latSecond >= 0 && latSecond < 60 &&
                parseFloat(latDegree) - parseFloat(latMinute * 0.01) - parseFloat(latSecond * 0.0001) >= -90 &&
                parseFloat(latDegree) + parseFloat(latMinute * 0.01) + parseFloat(latSecond * 0.0001) <= 90
            );
        };

        coordService.isValidLonDMS = function (lonDMS) {
            if (lonDMS === '') {
                return true;
            }
            var lonDegree, lonMinute, lonSecond;
            lonDMS = lonDMS.replace(/[EW ]/ig, '').split(/[°'"]/);

            if (lonDMS.length >= 3) {
                lonDegree = parseInt(lonDMS[0], 10);
                lonMinute = parseInt(lonDMS[1], 10);
                lonSecond = parseFloat(lonDMS[2], 10);
            } else if (lonDMS.length === 1) {
                lonDMS = lonDMS[0].split('.');
                lonSecond = parseFloat(lonDMS[0].substr(-2) + '.' + lonDMS[1], 10);
                lonMinute = parseInt(lonDMS[0].substr(-4, 2), 10);
                lonDegree = parseInt(lonDMS[0].slice(0, -4), 10);
            }

            return (
                lonMinute >= 0 && lonMinute < 60 &&
                lonSecond >= 0 && lonSecond < 60 &&
                lonDegree >= -180 && lonDegree <= 180 &&
                parseFloat(lonDegree) - parseFloat(lonMinute * 0.01) - parseFloat(lonSecond * 0.0001) >= -180 &&
                parseFloat(lonDegree) + parseFloat(lonMinute * 0.01) + parseFloat(lonSecond * 0.0001) <= 180
            );
        };

        coordService.isValidMGRS = function (mgrs) {
            if (mgrs === '') {
                return true;
            }
            mgrs = mgrs + '';
            return !!mgrs.match(/^([0-5][0-9][C-X]|60[C-X]|[ABYZ])[A-Z]{2}\d{4,14}$/i);
        };

        return coordService;
    }]);
})();
/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').service('deltaService', ['deltaConfig', 'coordinateConversionService', 'moment', function (deltaConfig, coordinateConversionService, moment) {
        return {
            getViewportSize: function () {
                var w = window,
                    d = document,
                    e = d.documentElement,
                    g = document.body,
                    x = w.innerWidth || e.clientWidth || g.clientWidth,
                    y = w.innerHeight || e.clientHeight || g.clientHeight;

                return {
                    width: x,
                    height: y
                };
            },
            formatLatLng: function (value) {
                // ensure bounds values have at least 1 decimal place
                return (value % 1 === 0) ? value.toFixed(1) : value;
            },
            getDDBounds: function (location) {
                var sw, ne, bounds;
                if (location.format === 'dms') {
                    sw = coordinateConversionService.prepForDMSBroadcast(location.south, location.west);
                    ne = coordinateConversionService.prepForDMSBroadcast(location.north, location.east);
                    bounds = [[sw.dd[0], ne.dd[1]], [ne.dd[0], sw.dd[1]]];
                } else if (location.format === 'mgrs') {
                    sw = coordinateConversionService.prepForMGRSBroadcast(location.mgrsSW);
                    ne = coordinateConversionService.prepForMGRSBroadcast(location.mgrsNE);
                    bounds = [sw.dd, ne.dd];
                } else {
                    // define rectangle geographical bounds
                    bounds = [[location.south, location.west], [location.north, location.east]];
                }

                return bounds;
            },
            convertLatLng: function (location, newFormat) {
                var coordinates, latLng;
                if (location.format === 'dms') {
                    coordinates = coordinateConversionService.prepForDMSBroadcast(location.lat, location.lng);
                    latLng = {
                        lat: parseFloat(coordinates.dd[0]),
                        lng: parseFloat(coordinates.dd[1]),
                        mgrs: coordinates.mgrs
                    };
                } else if (location.format === 'mgrs') {
                    coordinates = coordinateConversionService.prepForMGRSBroadcast(location.mgrs);
                    if (newFormat === 'dd') {
                        latLng = {
                            lat: parseFloat(coordinates.dd[0]),
                            lng: parseFloat(coordinates.dd[1]),
                            mgrs: coordinates.mgrs
                        };
                    } else if (newFormat === 'dms') {
                        latLng = {
                            lat: coordinates.dms[0],
                            lng: coordinates.dms[1],
                            mgrs: coordinates.mgrs
                        };
                    }
                } else if (location.format === 'dd') {
                    coordinates = coordinateConversionService.prepForDDBroadcast(location.lat, location.lng);
                    if (newFormat === 'dms' || newFormat === 'mgrs') {
                        latLng = {
                            lat: coordinates.dms[0],
                            lng: coordinates.dms[1],
                            mgrs: coordinates.mgrs
                        };
                    } else {
                        latLng = {
                            lat: parseFloat(coordinates.dd[0]),
                            lng: parseFloat(coordinates.dd[1]),
                            mgrs: coordinates.mgrs
                        };
                    }
                }
                return latLng;
            },
            getLeafletPopupContent: function (feature) {
                if (feature.properties) {
                    var tpl = '<ul class="list-unstyled event-details-popup">',
                        eventTypeIcon = feature.properties.event_type === 'Dynamic' ? 'fa-bolt' : 'fa-ellipsis-h';

                    tpl += '<li style="color: ' + feature.eventSource.color + '"><i class="fa ' + feature.eventType.icon + '"></i> <b>' + feature.eventType.title + '</b></li>';
                    if (feature.properties[deltaConfig.server.latField] && feature.properties[deltaConfig.server.lonField]) {
                        tpl += '<li>' + feature.properties[deltaConfig.server.latField].toFixed(3) + ', ' + feature.properties[deltaConfig.server.lonField].toFixed(3) + '</li>';
                    }
                    if (feature.properties[deltaConfig.server.dateField]) {
                        tpl += '<li>' + moment.utc(feature.properties[deltaConfig.server.dateField]).format('YYYY-MM-DD hh:mm:ss[Z]') + '</li>';
                    }
                    tpl += '<li><i class="fa ' + eventTypeIcon + '"></i> ' + feature.properties.event_type + '</li>';
                    tpl += '</ul>';

                    return tpl;
                }
                return '';
            }
        };
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').service('searchService', ['$http', '$q', '$mdToast', 'deltaConfig', 'deltaService', 'stateService', '_', function (
        $http,
        $q,
        $mdToast,
        deltaConfig,
        deltaService,
        stateService,
        _
    ) {
        var getEventsParams = function (sources) {
            var temporalFilter = stateService.getTemporalFilter(),
                start = typeof temporalFilter.start === 'string' ? temporalFilter.start : temporalFilter.start.toISOString(),
                stop = typeof temporalFilter.stop === 'string' ? temporalFilter.stop : temporalFilter.stop.toISOString(),
                sourceType = stateService.getSourceType(),
                sourceTypeFilter = deltaConfig.server.sourceTypeField + '=\'' + sourceType + '\' AND ',
                identities = _.map(sources, 'identity'),
                identityFilter = '';

            // if the amount of identities selected is fewer than the total available, query on those identities to speed things up
            if (identities.length < deltaConfig.sourceTypes.length) {
                _.forEach(identities, function (value) {
                    identityFilter += deltaConfig.server.identityField + '=' + value + ' AND ';
                });
            } else {
                identityFilter = deltaConfig.server.identityField + ' IS NOT NULL AND ';
            }

            return {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                typeName: deltaConfig.server.layers.events.workspace + ':' + deltaConfig.server.layers.events.layer,
                cql_filter: sourceTypeFilter + identityFilter + deltaConfig.server.dateField + '>=' + start + ' AND ' + deltaConfig.server.dateField + '<=' + stop + ' AND BBOX(' + deltaConfig.server.layers.events.geomField + ', ' + stateService.getMapBounds().toBBoxString() + ')',
                outputFormat: 'application/json'
            };
        };

        var getEventTracksParams = function (activeEvent) {
            return {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                typeName: deltaConfig.server.layers.tracks.workspace + ':' + deltaConfig.server.layers.tracks.layer,
                cql_filter: deltaConfig.server.productField + '=\'' + activeEvent.properties[deltaConfig.server.productField] + '\' AND ' + deltaConfig.server.datasetField + '=' + activeEvent.properties[deltaConfig.server.datasetField],
                outputFormat: 'application/json'
            };
        };

        var getCorrelatingEventsParams = function (eventFeature) {
            if (eventFeature) {
                return {
                    service: 'WFS',
                    version: '1.0.0',
                    request: 'GetFeature',
                    typeName: deltaConfig.server.layers.tracks.workspace + ':' + deltaConfig.server.layers.correlating_events.layer,
                    cql_filter: deltaConfig.server.productField + '_1=\'' + eventFeature.properties[deltaConfig.server.productField] + '\' AND ' + deltaConfig.server.datasetField + '_1=' + eventFeature.properties[deltaConfig.server.datasetField],
                    outputFormat: 'application/json'
                };
            }
        };

        var getEventPlotDataParams = function (params) {
            return {
                url: params.url,
                x_column: params.x_column || 'time',
                x_scale: params.x_scale || 'linear',
                x_units: params.x_units || 'event_secs',
                y_column: params.y_column || 'intensity',
                y_scale: params.y_scale || 'log',
                y_units: params.y_units || deltaConfig.intensityUnits,
                format: params.format || 'json'
            };
        };

        var getEventImageDataParams = function (params) {
            return {
                url: params.url,
                format: params.format || 'json'
            };
        };

        return {
            getEvents: function (sources) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.server.url,
                    params: getEventsParams(sources)
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err){
                    console.log(err);
                    if(err.status === -1){
                        $mdToast.show($mdToast.simple().textContent('Error retrieving events. (CORS)').theme('warn-toast').position('top right'));
                    } else {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving events. Status: ' + err.status).theme('warn-toast').position('top right'));
                        d.reject(err);
                    }
                });

                return d.promise;
            },
            getEventTracks: function (activeEvent) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.server.url,
                    params: getEventTracksParams(activeEvent)
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err){
                    console.log(err);
                    if(err.status === -1){
                        $mdToast.show($mdToast.simple().textContent('Error retrieving event tracks. (CORS)').theme('warn-toast').position('top right'));
                    } else {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving event tracks. Status: ' + err.status).theme('warn-toast').position('top right'));
                        d.reject(err);
                    }
                });

                return d.promise;
            },
            getCorrelatingEvents: function (eventData) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.server.url,
                    params: getCorrelatingEventsParams(eventData)
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err){
                    console.log(err);
                    if(err.status === -1){
                        $mdToast.show($mdToast.simple().textContent('Error retrieving correlating events. (CORS)').theme('warn-toast').position('top right'));
                    } else {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving correlating events. Status: ' + err.status).theme('warn-toast').position('top right'));
                        d.reject(err);
                    }
                });

                return d.promise;
            },
            getEventPlotData: function (params) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.eventServer.ajaxUrl + '/plot-data/',
                    params: getEventPlotDataParams(params)
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err){
                    console.log(err);
                    if (err.status === -1) {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving plot data. (CORS)').theme('warn-toast').position('top right'));
                    }
                });

                return d.promise;
            },
            getEventImageData: function (params) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.eventServer.ajaxUrl + '/frames/',
                    params: getEventImageDataParams(params)
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err){
                    console.log(err);
                    if (err.status === -1) {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving image data. (CORS)').theme('warn-toast').position('top right'));
                    }
                });

                return d.promise;
            }
        };
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').service('stateService', ['$location', '$timeout', 'deltaConfig', 'moment', '_', function (
        $location,
        $timeout,
        deltaConfig,
        moment,
        _
    ) {
        var queryString = $location.search();

        var gotoExpanded = false,
            locationFilterExpanded = false,
            recentEventListExpanded = false,
            temporalFilterExpanded = false,
            sourceFilterExpanded = false,
            typeFilterExpanded = false,
            locationFormat = queryString.locationFormat,
            mapBounds = {},
            mapBBox = {},
            mapZoom = null,
            temporalFilter = {
                start: queryString.start,
                stop: queryString.stop,
                duration: queryString.duration,
                durationLength: queryString.durationLength
            },
            baselayer = null,
            viewportSize = {},
            activeSources = [],
            activeTypes = [],
            events = [],
            activeEvent = null,
            eventLayers = null,
            sourceType = queryString.sourceType,
            eventData = null,
            layoutComponents = [],
            loadingEvents = false,
            voter = null,
            votes = [],
            voteReasons = [];

        if (queryString.n || queryString.ne) {
            mapBBox = {
                format: locationFormat,
                north: locationFormat === 'dd' ? parseFloat(queryString.n) : queryString.n,
                south: locationFormat === 'dd' ? parseFloat(queryString.s) : queryString.s,
                east: locationFormat === 'dd' ? parseFloat(queryString.e) : queryString.e,
                west: locationFormat === 'dd' ? parseFloat(queryString.w) : queryString.w,
                mgrsNE: queryString.ne || '',
                mgrsSW: queryString.sw || ''
            };
        }

        return {
            setMapBBoxParams: function (location) {
                var self = this;
                $timeout(function () {
                    if (!location.format) {
                        location.format = deltaConfig.defaultLocationFormat;
                        self.setLocationFormat(location.format);
                    }
                    // if anything change, update $location.search() and broadcast notification of change
                    if (queryString.n !== location.north.toString() || queryString.s !== location.south.toString() || queryString.e !== location.east.toString() || queryString.w !== location.west.toString() || queryString.locationFormat !== location.format || queryString.ne !== location.mgrsNE.toString() || queryString.sw !== location.mgrsSW.toString()) {
                        if (location.north !== '' && location.south !== '' && location.east !== '' && location.west !== '' && location.format === 'dd') {
                            location.north = parseFloat(location.north).toFixed(2);
                            location.south = parseFloat(location.south).toFixed(2);
                            location.east = parseFloat(location.east).toFixed(2);
                            location.west = parseFloat(location.west).toFixed(2);
                        }
                        self.setMapBBox(location);
                        queryString.n = location.north === '' ? null : location.north;
                        queryString.s = location.south === '' ? null : location.south;
                        queryString.e = location.east === '' ? null : location.east;
                        queryString.w = location.west === '' ? null : location.west;
                        queryString.locationFormat = location.format === '' ? null : location.format;
                        queryString.ne = location.mgrsNE === '' ? null : location.mgrsNE;
                        queryString.sw = location.mgrsSW === '' ? null : location.mgrsSW;
                        self.setLocationFormat(queryString.locationFormat);
                        $location.search(queryString);
                    }
                });
            },
            getGotoExpanded: function () {
                return gotoExpanded;
            },
            setGotoExpanded: function (data) {
                gotoExpanded = data;
            },
            getLocationFilterExpanded: function () {
                return locationFilterExpanded;
            },
            setLocationFilterExpanded: function (data) {
                locationFilterExpanded = data;
            },
            getRecentEventListExpanded: function () {
                return recentEventListExpanded;
            },
            setRecentEventListExpanded: function (data) {
                recentEventListExpanded = data;
            },
            getTemporalFilterExpanded: function () {
                return temporalFilterExpanded;
            },
            setTemporalFilterExpanded: function (data) {
                temporalFilterExpanded = data;
            },
            getSourceFilterExpanded: function () {
                return sourceFilterExpanded;
            },
            setSourceFilterExpanded: function (data) {
                sourceFilterExpanded = data;
            },
            getTypeFilterExpanded: function () {
                return typeFilterExpanded;
            },
            setTypeFilterExpanded: function (data) {
                typeFilterExpanded = data;
            },
            getMapBBox: function () {
                return mapBBox;
            },
            setMapBBox: function (val) {
                mapBBox = val;
            },
            getMapZoom: function () {
                return mapZoom;
            },
            setMapZoom: function (data) {
                mapZoom = data;
                queryString.zoom = mapZoom;
                $location.search(queryString);
            },
            getLocationFormat: function () {
                return locationFormat;
            },
            setLocationFormat: function (format) {
                locationFormat = format;
                queryString.locationFormat = locationFormat;
                $location.search(queryString);
            },
            getMapBounds: function () {
                return mapBounds;
            },
            setMapBounds: function (data) {
                mapBounds = data;
                this.setMapBBoxParams({
                    format: this.locationFormat,
                    north: mapBounds.getNorth(),
                    south: mapBounds.getSouth(),
                    east: mapBounds.getEast(),
                    west: mapBounds.getWest()
                });
            },
            getTemporalFilter: function () {
                return temporalFilter;
            },
            setTemporalFilter: function (filter) {
                var qsFilter = {
                    start: queryString.start,
                    stop: queryString.stop,
                    duration: queryString.duration ? queryString.duration : null,
                    durationLength: queryString.durationLength ? parseInt(queryString.durationLength) : null
                };
                var filterStart = '',
                    filterStop = '';
                if (!angular.equals(qsFilter, filter)) {
                    if (filter.duration && filter.durationLength) {
                        filterStart = moment.utc().subtract(filter.durationLength, filter.duration).startOf('d');
                        filterStop = moment.utc().endOf('d');
                        queryString.start = filterStart.toISOString();
                        queryString.stop = filterStop.toISOString();
                        queryString.duration = filter.duration;
                        queryString.durationLength = filter.durationLength;
                    } else {
                        filterStart = moment.utc(filter.start);
                        filterStop = moment.utc(filter.stop);
                        queryString.start = filterStart.toISOString();
                        queryString.stop = filterStop.toISOString();
                        queryString.duration = null;
                        queryString.durationLength = null;
                    }
                    filter.start = filterStart.toDate();
                    filter.stop = filterStop.toDate();
                    temporalFilter = filter;
                    $location.search(queryString);
                } else {
                    if (!temporalFilter.start || !temporalFilter.stop) {
                        temporalFilter = filter;
                    }
                }
            },
            getBaselayer: function () {
                return baselayer;
            },
            setBaselayer: function (layer) {
                baselayer = layer;
                queryString.baselayer = baselayer.id;
                $location.search(queryString);
            },
            getViewportSize: function () {
                return viewportSize;
            },
            setViewportSize: function (size) {
                viewportSize = size;
            },
            getActiveSources: function () {
                return activeSources;
            },
            setActiveSources: function (data) {
                activeSources = data;
                var sourceString = _.map(activeSources, 'name').join(',');
                queryString.sources = sourceString !== '' ? sourceString : null;
                $location.search(queryString);
            },
            getActiveTypes: function () {
                return activeTypes;
            },
            setActiveTypes: function (data) {
                activeTypes = data;
                var typeString = _.map(activeTypes, 'name').join(',');
                queryString.types = typeString !== '' ? typeString : null;
                $location.search(queryString);
            },
            getEvents: function () {
                return events;
            },
            setEvents: function (data) {
                events = data;
            },
            getActiveEvent: function () {
                return activeEvent;
            },
            setActiveEvent: function (data) {
                activeEvent = data;
                queryString[deltaConfig.server.productField] = data ? data.properties[deltaConfig.server.productField] : null;
                queryString[deltaConfig.server.datasetField] = data ? data.properties[deltaConfig.server.datasetField] : null;
                $location.search(queryString);
            },
            getEventLayers: function () {
                return eventLayers;
            },
            setEventLayers: function (data) {
                eventLayers = data;
            },
            getSourceType: function () {
                return sourceType;
            },
            setSourceType: function (data) {
                sourceType = data;
                queryString.sourceType = sourceType;
                $location.search(queryString);
            },
            getEventData: function () {
                return eventData;
            },
            setEventData: function (data) {
                eventData = data;
            },
            getLayoutComponents: function () {
                return layoutComponents;
            },
            setLayoutComponents: function (data) {
                layoutComponents = data;
            },
            getLoadingEvents: function () {
                return loadingEvents;
            },
            setLoadingEvents: function (data) {
                loadingEvents = data;
            },
            getVoter: function () {
                return voter;
            },
            setVoter: function (data) {
                voter = data;
            },
            getVotes: function () {
                return votes;
            },
            setVotes: function (data) {
                votes = data;
            },
            getVoteReasons: function () {
                return voteReasons;
            },
            setVoteReasons: function (data) {
                voteReasons = data;
            }
        };
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').service('voteService', ['$http', '$q', 'deltaConfig', function (
        $http,
        $q,
        deltaConfig
    ) {
        return {
            getReasons: function () {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.voteApi.url + '/reasons'
                }).then(function (result) {
                    d.resolve(result);
                });

                return d.promise;
            },
            getVoters: function () {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.voteApi.url + '/voters'
                }).then(function (result) {
                    d.resolve(result);
                });

                return d.promise;
            },
            getVoter: function (voter_name) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.voteApi.url + '/voters/' + voter_name
                }).then(function (result) {
                    d.resolve(result);
                });

                return d.promise;
            },
            addVoter: function (voter) {
                var d = $q.defer();

                $http.post(deltaConfig.voteApi.url + '/voters', voter).then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            },
            getVotes: function () {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.voteApi.url + '/votes'
                }).then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            },
            getVotesByVoter: function (voter_name) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.voteApi.url + '/votes/voter/' + voter_name
                }).then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            },
            getVoteById: function (vote_id) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.voteApi.url + '/votes/' + vote_id
                }).then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            },
            castVote: function (vote) {
                var d = $q.defer();

                $http.post(deltaConfig.voteApi.url + '/votes', vote).then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            },
            updateVote: function (vote) {
                var d = $q.defer();

                $http.put(deltaConfig.voteApi.url + '/votes/' + vote.vote_id, vote).then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            }
        };
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/
 
(function () {
    'use strict';

    angular.module('delta').controller('eventsController', ['$scope', '$timeout', '$location', 'deltaConfig', 'deltaService', 'searchService', 'stateService', 'leafletData', 'L', '$', '_', function (
        $scope,
        $timeout,
        $location,
        deltaConfig,
        deltaService,
        searchService,
        stateService,
        leafletData,
        L,
        $,
        _
    ) {
        var vm = this,
            qs = $location.search(),
            map = {},
            eventsLayoutComponent = null,
            currIdx = 0,
            eventLayers = [],
            activeEvent = null;

        vm.stateService = stateService;
        vm.deltaConfig = deltaConfig;
        vm.eventsHeight = '';
        vm.eventsWidth = '';
        vm.mapEvents = [];
        vm.loading = true;

        var activateMapEvent = function (mapEvent) {
            var activeMapLayer = _.find(eventLayers, { feature: mapEvent });
            if (activeMapLayer) {
                activeMapLayer.setStyle({ color: '#b2ff59', fillOpacity: 0.8 });
                activeMapLayer.bringToFront();
            }
        };

        vm.showPopup = function ($event, mapEvent) {
            L.popup({ autoPan: false })
                .setLatLng(L.latLng(mapEvent.properties[deltaConfig.server.latField], mapEvent.properties[deltaConfig.server.lonField]))
                .setContent(deltaService.getLeafletPopupContent(mapEvent))
                .openOn(map);
        };

        vm.hidePopup = function () {
            map.closePopup();
        };

        vm.showEvent = function ($event, mapEvent) {
            // clear old event data
            if (activeEvent) {
                var activeMapLayer = _.find(eventLayers, { feature: activeEvent });
                activeMapLayer.setStyle({ color: activeMapLayer.feature.eventSource.color, fillOpacity: 0.2 });
                activeMapLayer.bringToBack();
            }
            stateService.setEventData(null);
            map.closePopup();
            mapEvent.scrollTo = false;
            activateMapEvent(mapEvent);
            activeEvent = mapEvent;
            // update the event currently being viewed
            stateService.setActiveEvent(activeEvent);
            $event.stopPropagation();
        };

        var initialize = function () {
            leafletData.getMap().then(function (data) {
                map = data;
            });
        };

        initialize();

        $scope.$watchCollection('vm.stateService.getEventLayers()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            eventLayers = newValue;
        });

        $scope.$watchCollection('vm.stateService.getEvents()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.mapEvents = _.orderBy(newValue, ['properties.event_lat', 'properties.event_lon']);

            // check for values in querystring and go to an event if applicable
            if (qs[deltaConfig.server.productField] && qs[deltaConfig.server.datasetField]) {
                var product_id = qs[deltaConfig.server.productField],
                    dataset_id = parseInt(qs[deltaConfig.server.datasetField]);

                activeEvent = _.find(vm.mapEvents, function (e) {
                    return e.properties[deltaConfig.server.productField] === product_id && e.properties[deltaConfig.server.datasetField] === dataset_id;
                });

                if (activeEvent) {
                    activateMapEvent(activeEvent);
                    activeEvent.scrollTo = true;
                    // update the event currently being viewed
                    stateService.setActiveEvent(activeEvent);
                }
            }

            if (eventsLayoutComponent) {
                eventsLayoutComponent.container.setTitle(eventsLayoutComponent.state.templateTitle + ' (' + vm.mapEvents.length + ')');
            }
        });

        $scope.$watchCollection('vm.stateService.getLayoutComponents()', function (newValue) {
            eventsLayoutComponent = _.find(newValue, { state: { templateName: 'events' } });
            eventsLayoutComponent.container.setTitle(eventsLayoutComponent.state.templateTitle + ' (' + vm.mapEvents.length + ')');

            vm.eventsHeight = eventsLayoutComponent.container.height;
            vm.eventsWidth = eventsLayoutComponent.container.width;

            // set event listener for container resize
            eventsLayoutComponent.container.on('resize', function () {
                // use a $timeout to notify angular of the change
                $timeout(function () {
                    vm.eventsHeight = eventsLayoutComponent.container.height;
                    vm.eventsWidth = eventsLayoutComponent.container.width;
                    // trigger a fake window resize to force md-virutal-repeat-container to redraw
                    angular.element(window).triggerHandler('resize');
                });
            });
        });

        $scope.$watch('vm.stateService.getLoadingEvents()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.loading = newValue;
        });

        $scope.$watchCollection('vm.stateService.getActiveEvent()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            activeEvent = newValue;
            qs = $location.search();
            if (newValue) {
                currIdx = _.indexOf(vm.mapEvents, newValue);
                if (newValue.scrollTo) {
                    // use a $timeout to notify angular of the change
                    $timeout(function () {
                        vm.topIndex = currIdx - 1;
                    }, 250);
                }
            }
        });
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/
 
(function () {
    'use strict';

    angular.module('delta').controller('eventViewerController', ['$scope', '$q', '$timeout', '$mdDialog', '$mdToast', 'deltaConfig', 'stateService', 'searchService', 'voteService', 'Vote', 'Webworker', 'moment', 'hotkeys', 'c3', 'd3', '_', function (
        $scope,
        $q,
        $timeout,
		    $mdDialog,
        $mdToast,
        deltaConfig,
        stateService,
        searchService,
        voteService,
        Vote,
        Webworker,
        moment,
        hotkeys,
        c3,
        d3,
        _
    ) {
        var vm = this,
            plotResults,
            plotResultsArr,
            imageResults,
            correlatingPlotResults,
            correlatingImageResults,
            eventViewerLayoutComponent = null,
            frames,
            correlatingFrames,
            animationFrames,
            xStarted,
            correlatingDateDiff,
            chart,
            chartData,
            chartWorker,
            imageWorker,
            correlatingImageWorker,
            startGridLineEl,
            stopGridLineEl,
            animate,
            frameIdx,
            hasCorrelation,
            chartFocus,
            animationDelay,
            isAnimating;

        vm.eventViewerHeight = '';
        vm.eventViewerWidth = '';

        var initialize = function () {
            plotResults = [];
            plotResultsArr = [];
            imageResults = [];
            correlatingPlotResults = [];
            correlatingImageResults = [];
            frames = [];
            correlatingFrames = [];
            animationFrames = [];
            xStarted = null;
            correlatingDateDiff = null;
            chart = null;
            chartData = [];
            chartWorker = null;
            imageWorker = null;
            correlatingImageWorker = null;
            startGridLineEl = null;
            stopGridLineEl = null;
            animate = null;
            frameIdx = 0;
            hasCorrelation = null;
            chartFocus = [];
            animationDelay = null;
            isAnimating = false;

            vm.stateService = stateService;
            vm.deltaConfig = deltaConfig;
            vm._ = _;
            vm.trackFeature = null;
			vm.eventProps = null;
			vm.event_h5_url = null;
			vm.correlatedEventProps = null;
			vm.correlated_h5_url = null;
            vm.eventData = null;
            vm.activeImageCard = null;
            vm.selectedImageCard = null;
            vm.eventImageCards = [];
            vm.correlatingEventImageCards = [];
            vm.availableImageCards = [];
            vm.loadingChart = false;
            vm.loadingAnimation = false;
            vm.voter = stateService.getVoter();
            vm.votes = stateService.getVotes();
            vm.voteReasons = stateService.getVoteReasons();
            vm.voteObj = new Vote();
            vm.sensors = [];
            vm.activeSensor = {};
            vm.playback = true;
            vm.playbackDirection = 'forward';
            vm.eventError = null;

            vm.internalSource = _.find(deltaConfig.sources, { identity: true });
            vm.externalSource = _.find(deltaConfig.sources, { identity: false });

            hotkeys.bindTo($scope)
                .add({
                    combo: 'left',
                    description: 'Step Back',
                    callback: function () {
                        vm.step('backward');
                    }
                }).add({
                    combo: 'right',
                    description: 'Step Forward',
                    callback: function () {
                        vm.step('forward');
                    }
                }).add({
                    combo: 'up',
                    description: 'Play/Pause Forward',
                    callback: function () {
                        vm.playbackDirection = 'forward';
                        vm.togglePlayback();
                    }
                }).add({
                    combo: 'down',
                    description: 'Play/Pause Backward',
                    callback: function () {
                        vm.playbackDirection = 'backward';
                        vm.togglePlayback();
                    }
                });
        };

        if (typeof (chart) === 'undefined') {
            // initialize has never been called
            initialize();
        }

        function createImageArr (imageResults, correlatingDateDiff) {
            importScripts(location.origin + '/scripts/webworkerDeps/lodash.js'); // jshint ignore:line

            var imageArrs = [];
            _.forEach(imageResults, function (imageResult) {
                _.forEach(imageResult.results, function (image) {
                    if (image.isCorrelation) {
                        // normalize time values if a difference in start
                        // dates is present. correlatingDateDiff will be positive
                        // when the correlating event started value is later
                        // than the event started value, and vice versa
                        image.timestamp = correlatingDateDiff ? image.timestamp - correlatingDateDiff : image.timestamp;
                    }

                    image.values = _.flatMap(image.values, function (value) {
                        if (image.min < 0 || image.max > 255) {
                            // apply proper 0-255 scale to invalid values
                            var multiplier = 255 / Math.abs(image.max - image.min);
                            value = (value - image.min) * multiplier;
                        }
                        return [value, value, value, 255];
                    });
                    imageArrs.push(image);
                });
            });

            return imageArrs;
        }

        var updateAnimationFrames = function () {
            console.log('updateAnimationFrames');
            animationFrames = [];
            frameIdx = 0;

            // isolate frames for currently active sensor card
            animationFrames = _.filter(hasCorrelation ? correlatingFrames : frames, function (f) {
                return f.sensor.includes(vm.activeImageCard.sensor);
            });

            // order frames array by value (time)
            animationFrames = _.sortBy(animationFrames, 'value');

            // divide larger frame arrays into chunks to improve playback
            console.log(animationFrames.length);
            if (animationFrames.length > 100) {
                var chunkSize = 0;
                if (animationFrames.length < 200) {
                    chunkSize = Math.floor(animationFrames.length / 20);
                } else if (animationFrames.length >= 200 && animationFrames.length < 500) {
                    chunkSize = Math.floor(animationFrames.length / 15);
                } else {
                    chunkSize = Math.floor(animationFrames.length / 10);
                }
                animationFrames = _.chunk(animationFrames, chunkSize);
            } else {
                animationFrames = _.chunk(animationFrames, 1);
            }

            if (animationFrames.length < 25) {
                animationDelay = 50;
            } else if (animationFrames.length >= 25 && animationFrames.length < 50) {
                animationDelay = 25;
            } else if (animationFrames.length >= 50 && animationFrames.length < 100) {
                animationDelay = 10;
            } else if (animationFrames.length >= 100 && animationFrames.length < 200) {
                animationDelay = 5;
            } else {
                animationDelay = 0;
            }

            if (animationFrames.length > 0 && !isAnimating && animate) {
                // previous animationFrames had no length, so init animation
                animate();
            }
        };

        var generateImages = function () {
            // create the animation image array in a web worker to avoid blocking the UI
            imageWorker = Webworker.create(createImageArr);

            // start the web worker and wait for the result
            imageWorker.run(imageResults, correlatingDateDiff).then(function (imageArrs) {
                // group image arrays by sensor value
                imageArrs = _.groupBy(imageArrs, 'sensor');

                // init vars used inside animate function
                var frameImages = _.flatten(_.values(imageArrs));

                frameIdx = 0;

                // create array of all points in imageArrs
                frames = _.map(chartData, function (d) {
                    var keys = _.keys(d),
                        sensor = _.find(keys, function (k) {
                            return k !== 'isCorrelation' && k !== 'time';
                        });

                    return {
                        value: d.time,
                        class: 'frame-line time-' + _.replace(d.time, '.', ''),
                        sensor: sensor
                    };
                });

                if (frames.length > 0) {
                    // sort by value (time) and draw playback lines using C3 xgrids api
                    frames = _.sortBy(frames, 'value');
                    chart.xgrids(frames);

                    // only animate frames for selected sensor
                    updateAnimationFrames();

                    var drawImage = function (ctx, canvas, image) {
                        // clear previous drawing
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // set width and height to match image
                        ctx.canvas.height = image.height;
                        ctx.canvas.width = image.width;

                        // Get a pointer to the current location in the image.
                        var palette = ctx.getImageData(0, 0, canvas.width, canvas.height); //x,y,w,h
                        // Wrap your array as a Uint8Array
                        palette.data.set(new Uint8Array(image.values));
                        // Repost the data.
                        ctx.putImageData(palette, 0, 0);
                    };

                    var animateInit = function () {
                        // draw the initial image for each chip
                        _.forEach(_.values(imageArrs), function (imageArr) {
                            var canvas = angular.element('.' + _.replace(imageArr[0].sensor, ' ', ''))[0],
                                ctx = canvas.getContext('2d');

                            drawImage(ctx, canvas, imageArr[0]);
                        });
                    };

                    animateInit();

                    animate = function () {
                        if (animationFrames.length > 0) {
                            isAnimating = true;
                            // hide previous grid line if defined
                            if (startGridLineEl) {
                                startGridLineEl.style.display = 'none';
                            }
                            if (stopGridLineEl) {
                                stopGridLineEl.style.display = 'none';
                            }
                            // get grid line associated with current frame and show it
                            startGridLineEl = angular.element('.time-' + _.replace(animationFrames[frameIdx][0].value, '.', ''))[0];
                            stopGridLineEl = angular.element('.time-' + _.replace(animationFrames[frameIdx][animationFrames[frameIdx].length - 1].value, '.', ''))[0];
                            if (frameIdx >= correlatingFrames.length - 2) {
                                if (stopGridLineEl) {
                                    stopGridLineEl.style.display = 'block';
                                }
                            } else {
                                if (startGridLineEl) {
                                    startGridLineEl.style.display = 'block';
                                }
                            }

                            // draw images for the current frame
                            _.forEach(animationFrames[frameIdx], function (currFrame) {
                                var frameImage = _.find(frameImages, { timestamp: currFrame.value });
                                if (frameImage) {
                                    var canvas = angular.element('.' + _.replace(frameImage.sensor, ' ', ''))[0],
                                        ctx = canvas.getContext('2d');

                                    // draw the current frame's image on the appropriate canvas
                                    drawImage(ctx, canvas, frameImage);
                                }
                            });

                            // adjust currFrame
                            if (vm.playbackDirection === 'forward') {
                                if (frameIdx < animationFrames.length - 1) {
                                    frameIdx++;
                                } else {
                                    animateInit();
                                    frameIdx = 0;
                                }
                            } else {
                                if (frameIdx > 0) {
                                    frameIdx--;
                                } else {
                                    frameIdx = animationFrames.length - 1;
                                }
                            }

                            // recursively call function. adjust timeout delay to change animation rate
                            if (vm.playback) {
                                $timeout(function () {
                                    if (animate) {
                                        animate();
                                    }
                                }, animationDelay);
                            }
                        } else {
                            isAnimating = false;
                        }
                    };
                    animate();
                    vm.loadingAnimation = false;
                }
            });
        };

        var generateCorrelatingImages = function (currFrameIdx) {
            frameIdx = currFrameIdx !== null && typeof currFrameIdx !== 'undefined' ? currFrameIdx : frameIdx;
            // create the animation image array in a web worker to avoid blocking the UI
            correlatingImageWorker = Webworker.create(createImageArr);
            _.forEach(correlatingImageResults, function (imageResults) {
                imageResults.results = _.flatMap(imageResults.results, function (result) {
                    result.isCorrelation = true;
                    return result;
                });
            });
            correlatingImageResults = correlatingImageResults.concat(imageResults);

            // start the web worker and wait for the result
            correlatingImageWorker.run(correlatingImageResults, correlatingDateDiff).then(function (imageArrs) {
                _.forEach(imageArrs, function (arr, idx) {
                    if (arr.isCorrelation) {
                        if (vm.trackFeature.properties[deltaConfig.server.identityField]) {
                            imageArrs[idx].sensor = arr.sensor + deltaConfig.externalSourceLabel;
                        } else {
                            imageArrs[idx].sensor = arr.sensor;
                        }
                    } else {
                        if (vm.trackFeature.properties[deltaConfig.server.identityField]) {
                            imageArrs[idx].sensor = arr.sensor;
                        } else {
                            imageArrs[idx].sensor = arr.sensor + deltaConfig.externalSourceLabel;
                        }
                    }
                });
                // group image arrays by sensor value
                imageArrs = _.groupBy(imageArrs, 'sensor');

                // init vars used inside animate function
                var frameImages = _.flatten(_.values(imageArrs));

                frameIdx = 0;

                // create array of all points in imageArrs
                correlatingFrames = _.map(chartData, function (d) {
                    var keys = _.keys(d),
                        sensor = _.find(keys, function (k) {
                            return k !== 'isCorrelation' && k !== 'time';
                        });

                    return {
                        value: d.time,
                        class: 'frame-line time-' + _.replace(d.time, '.', ''),
                        sensor: sensor
                    };
                });

                if (correlatingFrames.length > 0) {
                    // sort by value (time) and draw playback lines using C3 xgrids api
                    correlatingFrames = _.sortBy(correlatingFrames, 'value');
                    chart.xgrids(correlatingFrames);

                    // only animate frames for selected sensor
                    updateAnimationFrames();

                    var drawImage = function (ctx, canvas, image) {
                        // clear previous drawing
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // set width and height to match image
                        ctx.canvas.height = image.height;
                        ctx.canvas.width = image.width;

                        // Get a pointer to the current location in the image.
                        var palette = ctx.getImageData(0, 0, canvas.width, canvas.height); //x,y,w,h
                        // Wrap your array as a Uint8Array
                        palette.data.set(new Uint8Array(image.values));
                        // Repost the data.
                        ctx.putImageData(palette, 0, 0);
                    };

                    var animateInit = function () {
                        // draw the initial image for each chip
                        _.forEach(_.values(imageArrs), function (imageArr) {
                            var canvas = angular.element('.' + _.replace(imageArr[0].sensor, ' ', ''))[0],
                                ctx = canvas.getContext('2d');

                            drawImage(ctx, canvas, imageArr[0]);
                        });
                    };

                    animateInit();

                    animate = function () {
                        if (animationFrames.length > 0) {
                            isAnimating = true;
                            // hide previous grid line if defined
                            if (startGridLineEl) {
                                startGridLineEl.style.display = 'none';
                            }
                            if (stopGridLineEl) {
                                stopGridLineEl.style.display = 'none';
                            }
                            // get grid line associated with current frame and show it
                            startGridLineEl = angular.element('.time-' + _.replace(animationFrames[frameIdx][0].value, '.', ''))[0];
                            stopGridLineEl = angular.element('.time-' + _.replace(animationFrames[frameIdx][animationFrames[frameIdx].length - 1].value, '.', ''))[0];
                            if (startGridLineEl && stopGridLineEl) {
                                if (frameIdx >= animationFrames.length - 2) {
                                    stopGridLineEl.style.display = 'block';
                                } else {
                                    startGridLineEl.style.display = 'block';
                                }
                            }

                            // draw images for the current frame
                            _.forEach(animationFrames[frameIdx], function (currFrame) {
                                var frameImage = _.filter(frameImages, { timestamp: currFrame.value });
                                if (frameImage.length > 0) {
                                    _.forEach(frameImage, function (image) {
                                        var canvas = angular.element('.' + _.replace(image.sensor, ' ', ''))[0],
                                            ctx = canvas.getContext('2d');

                                        // draw the current frame's image on the appropriate canvas
                                        drawImage(ctx, canvas, image);
                                    });
                                }
                            });

                            // adjust currFrame
                            if (vm.playbackDirection === 'forward') {
                                if (frameIdx < animationFrames.length - 1) {
                                    frameIdx++;
                                } else {
                                    animateInit();
                                    frameIdx = 0;
                                }
                            } else {
                                if (frameIdx > 0) {
                                    frameIdx--;
                                } else {
                                    frameIdx = animationFrames.length - 1;
                                }
                            }

                            // recursively call function. adjust timeout delay to change animation rate
                            if (vm.playback) {
                                $timeout(function () {
                                    if (animate) {
                                        animate();
                                    }
                                }, animationDelay);
                            }
                        } else {
                            isAnimating = false;
                        }
                    };
                    animate();
                    vm.loadingAnimation = false;
                }
            });
        };

        var generateEventData = function () {
            // create the chart data array in a web worker to avoid blocking the UI
            function createChartData (eventPlotResults, identity, hasCorrelation, correlatingDateDiff, externalSourceLabel) {
                var chartDataArr = [],
                    correlatingChartDataArr = [];

                eventPlotResults.results.forEach(function (eventPlotResult) {
                    // the convention for a point is a 4 item array [time, sensor index, object index, intensity]
                    eventPlotResult.points.forEach(function (point) {
                        var pointData = {},
                            pointValue = point[3];

                        // store a value to indicate whether this point belongs
                        // to correlated data
                        pointData.isCorrelation = false;

                        // always use the given time value for the selected event
                        pointData.time = point[0];
                        if (hasCorrelation) {
                            // the identity value tells you the source of the
                            // selected event
                            if (identity) {
                                // us
                                pointData[eventPlotResult.sensors[point[1]]] = pointValue;
                            } else {
                                // them
                                pointData[eventPlotResult.sensors[point[1]] + externalSourceLabel] = pointValue;
                            }
                        } else {
                            pointData[eventPlotResult.sensors[point[1]]] = pointValue;
                        }
                        chartDataArr.push(pointData);
                    });
                });

                eventPlotResults.correlatingResults.forEach(function (eventPlotResult) {
                    // the convention for a point is a 4 item array [time, sensor index, object index, intensity]
                    eventPlotResult.points.forEach(function (point) {
                        var pointData = {},
                            pointValue = point[3];

                        // store a value to indicate whether this point belongs
                        // to correlated data
                        pointData.isCorrelation = true;

                        // normalize time values if a difference in start
                        // dates is present. correlatingDateDiff will be positive
                        // when the correlating event started value is later
                        // than the event started value, and vice versa
                        pointData.time = correlatingDateDiff ? point[0] - correlatingDateDiff : point[0];

                        // the identity value tells you the source of the
                        // selected event
                        if (identity) {
                            pointData[eventPlotResult.sensors[point[1]] + externalSourceLabel] = pointValue;
                        } else {
                            pointData[eventPlotResult.sensors[point[1]]] = pointValue;
                        }
                        correlatingChartDataArr.push(pointData);
                    });
                });

                return correlatingChartDataArr.length > 0 ? chartDataArr.concat(correlatingChartDataArr) : chartDataArr;
            }

            // instantiate the web worker
            chartWorker = Webworker.create(createChartData);

            // start the web worker and wait for the result
            chartWorker.run(plotResults, vm.trackFeature.properties[deltaConfig.server.identityField], plotResults.correlatingResults.length > 0, correlatingDateDiff, deltaConfig.externalSourceLabel).then(function (chartDataArr) {
                chartData = chartDataArr;
                if (correlatingImageResults.length > 0) {
                    generateCorrelatingImages();
                } else {
                    generateImages();
                }
                var sensorArr = _.sortBy(_.uniq(_.flatten(_.map(plotResults.results, 'sensors')))),
                    expFormat = d3.format('.1e'),
                    numFormat = d3.format('n');

                if (plotResults.correlatingResults.length > 0) {
                    var correlatingSensorArr = _.sortBy(_.uniq(_.flatten(_.map(plotResults.correlatingResults, 'sensors'))));
                    if (vm.trackFeature.properties[deltaConfig.server.identityField]) {
                        _.forEach(correlatingSensorArr, function (sensor, idx) {
                            correlatingSensorArr[idx] = sensor + deltaConfig.externalSourceLabel;
                        });
                    } else {
                        _.forEach(sensorArr, function (sensor, idx) {
                            sensorArr[idx] = sensor + deltaConfig.externalSourceLabel;
                        });
                    }
                    sensorArr = sensorArr.concat(correlatingSensorArr);
                }

                var dataColors = {},
                    source0Idx = 0,
                    source1Idx = 0;

                _.forEach(sensorArr, function (sensor) {
                    if (plotResults.correlatingResults.length > 0) {
                        // showing multiple event types, so determine color
                        // based on current sensor name
                        if (_.endsWith(sensor, deltaConfig.externalSourceLabel)) {
                            dataColors[sensor] =  _.find(deltaConfig.sources, { identity: false }).chartColors[source0Idx];
                            source0Idx++;
                        } else {
                            dataColors[sensor] =  _.find(deltaConfig.sources, { identity: true }).chartColors[source1Idx];
                            source1Idx++;
                        }
                    } else {
                        // only showing one kind of event, so determine color
                        // using vm.trackFeature.properties
                        dataColors[sensor] = _.find(deltaConfig.sources, { identity: vm.trackFeature.properties[deltaConfig.server.identityField] }).chartColors[source0Idx];
                        source0Idx++;
                    }
                });

                // generate time/intensity chart using C3
                chart = c3.generate({
                    data: {
                        json: chartData,
                        keys: {
                            x: 'time',
                            value: sensorArr
                        },
                        colors: dataColors
                    },
                    size: {
                        width: vm.eventViewerWidth,
                        height: vm.eventViewerHeight / 2
                    },
                    padding: {
                        top: 10,
                        right: 30
                    },
                    tooltip: {
                        format: {
                            title: function (x) {
                                return x.toFixed(2) + ' seconds';
                            },
                            value: function (value) {
                                return Math.pow(10, value).toFixed(6) + ' ' + plotResults.results[0].y_column.units.label;
                            }
                        }
                    },
                    line: {
                        connectNull: true
                    },
                    axis: {
                        x: {
                            tick: {
                                fit: false,
                                format: function (d) {
                                    return d.toFixed(2);
                                }
                            },
                            label: {
                                text: 'Seconds since ' + moment.utc(xStarted).format('YYYY-MM-DD HH:mm:ss[Z]'),
                                position: 'outer-left'
                            }
                        },
                        y: {
                            label: {
                                text: plotResults && plotResults.results && plotResults.results.length > 0 ? plotResults.results[0].y_column.units.label : '',
                                position: 'outer-middle'
                            },
                            tick: {
                                format: function (d) {
                                    // format custom ticks for log scale
                                    var t = Math.abs(d);
                                    t = t < 1 ? Math.pow(10, t) : Math.round(Math.pow(10, t));
                                    t = d < 0 ? 1 / t : t;

                                    if (t < 0.00001 || t > 100000) {
                                        return expFormat(t);
                                    }

                                    var result = numFormat(t);
                                    return parseFloat(result).toFixed(2);
                                }
                            }
                        }
                    },
                    zoom: {
                        enabled: true
                    },
                    onrendered: function () {
                        vm.loadingChart = false;
                        if (chart) {
                            var colorArr = _.toPairs(chart.data.colors());
                            _.forEach(colorArr, function (d) {
                                var card = _.find(vm.eventImageCards, function (c) {
                                    return c.chartId === d[0];
                                });
                                if (card) {
                                    card.color = d[1];
                                }

                                var correlatingCard = _.find(vm.correlatingEventImageCards, function (cc) {
                                    return cc.chartId === d[0];
                                });
                                if (correlatingCard) {
                                    correlatingCard.color = d[1];
                                }
                            });
                        }
                    },
                    onmouseout: function () {
                        chart.focus(chartFocus);
                    }
                });
                vm.setActiveImageCard();
            });
        };

        var castVote = function () {
            voteService.castVote(vm.voteObj).then(function (result) {
                vm.voteObj = Vote.transformer(result.data);
                vm.votes.push(vm.voteObj);
                stateService.setVotes(vm.votes);
                if (vm.voteObj.vote) {
                    $mdToast.show($mdToast.simple().textContent('Upvote recorded').theme('success-toast').position('top right'));
                } else {
                    $mdToast.show($mdToast.simple().textContent('Downvote recorded (' + vm.voteObj.reason + ')').theme('fail-toast').position('top right'));
                }
            }).catch(function (error) {
                console.log(error);
                vm.voteObj.vote = null;
                $mdToast.show($mdToast.simple().textContent('Error Submitting Vote').theme('warn-toast').position('top right'));
            });
        };

        var updateVote = function () {
            voteService.updateVote(vm.voteObj).then(function () {
                // look for existing vote for this event
                var eventVote = _.find(vm.votes, { dataset_id: vm.voteObj.dataset_id, product_id: vm.voteObj.product_id });
                if (eventVote) {
                    eventVote.vote = vm.voteObj.vote;
                    eventVote.reason = vm.voteObj.reason;
                    stateService.setVotes(vm.votes);
                }
                if (vm.voteObj.vote) {
                    $mdToast.show($mdToast.simple().textContent('Upvote recorded').theme('success-toast').position('top right'));
                } else {
                    $mdToast.show($mdToast.simple().textContent('Downvote recorded (' + vm.voteObj.reason + ')').theme('fail-toast').position('top right'));
                }
            }).catch(function (error) {
                console.log(error);
                vm.voteObj.vote = null;
                $mdToast.show($mdToast.simple().textContent('Error Submitting Vote').theme('warn-toast').position('top right'));
            });
        };

        var getCorrelatingEvents = function () {
            var d = $q.defer();
            searchService.getCorrelatingEvents(vm.trackFeature).then(function (result) {
                d.resolve(result);
            });
            return d.promise;
        };

        var getPlotData = function (filePath, isCorrelation) {
            var d = $q.defer();
            searchService.getEventPlotData({ url: filePath }).then(function (result) {
                if (isCorrelation) {
                    d.resolve(correlatingPlotResults.push(result));
                } else {
                    d.resolve(plotResultsArr.push(result));
                }
            }, function (error) {
                vm.loadingChart = false;
                vm.eventError = error.status + ': ' + error.statusText;
            });
            return d.promise;
        };

        var getImageData = function (filePath, isCorrelation) {
            var d = $q.defer();
            searchService.getEventImageData({ url: filePath }).then(function (result) {
                if (isCorrelation) {
                    d.resolve(correlatingImageResults.push(result));
                } else {
                    d.resolve(imageResults.push(result));
                }
            }, function (error) {
                vm.loadingChart = false;
                vm.eventError = error.status + ': ' + error.statusText;
            });
            return d.promise;
        };

        var initEventData = function () {
            var eventStarted = _.map(plotResults.results, 'started'),
                correlatingEventStarted = _.map(plotResults.correlatingResults, 'started');

            if (eventStarted.length > 0 && correlatingEventStarted.length > 0) {
                // figure out the difference, if any, between the
                // start dates
                var eventMoment = moment(eventStarted[0]),
                    correlatingEventMoment = moment(correlatingEventStarted[0]);

                correlatingDateDiff = eventMoment.diff(correlatingEventMoment, 's');
            }

            // x axis values are the same for all plot results, so
            // set up the extents using the first available value
            xStarted = plotResults && plotResults.results && plotResults.results.length > 0 ? plotResults.results[0].started : '';

            // flatten imageResults and group by sensor, then convert
            // to pairs so the template knows how many image cards
            // to display and what their labels should be
            var imageCards = _.toPairs(_.groupBy(_.flatten(_.map(imageResults, 'results')), 'sensor'));
            vm.eventImageCards = _.map(imageCards, function (card, idx) {
                var canvasClass = '',
                    chartId = '';
                if (hasCorrelation) {
                    canvasClass = vm.trackFeature.properties[vm.deltaConfig.server.identityField] ? _.replace(card[0], ' ', '') : _.replace(card[0], ' ', '') + deltaConfig.externalSourceLabel;
                    chartId = vm.trackFeature.properties[vm.deltaConfig.server.identityField] ? card[0] : card[0] + deltaConfig.externalSourceLabel;
                } else {
                    canvasClass = _.replace(card[0], ' ', '');
                    chartId = card[0];
                }
                return {
                    sensor: card[0],
                    images: card[1],
                    active: idx === 0,
                    class: canvasClass,
                    chartId: chartId
                };
            });
            vm.activeImageCard = vm.eventImageCards[0];
            vm.availableImageCards = _.cloneDeep(vm.eventImageCards);
            vm.selectedImageCard = vm.availableImageCards[0];

            if (hasCorrelation) {
                var correlatingImageCards = _.toPairs(_.groupBy(_.flatten(_.map(correlatingImageResults, 'results')), 'sensor'));
                vm.correlatingEventImageCards = _.map(correlatingImageCards, function (card) {
                    return {
                        sensor: card[0],
                        images: card[1],
                        active: card[0] === vm.activeImageCard.sensor,
                        class: vm.trackFeature.properties[vm.deltaConfig.server.identityField] ? _.replace(card[0], ' ', '') + deltaConfig.externalSourceLabel : _.replace(card[0], ' ', ''),
                        chartId: vm.trackFeature.properties[vm.deltaConfig.server.identityField] ? card[0] + deltaConfig.externalSourceLabel : card[0]
                    };
                });
                vm.activeCorrelatingImageCard = _.find(vm.correlatingEventImageCards, { sensor: vm.activeImageCard.sensor });
                vm.availableImageCards = _.uniqBy(vm.availableImageCards.concat(vm.correlatingEventImageCards), 'sensor');
            }

            // generate the chart and images
            generateEventData();
        };

        vm.close = function () {
            stateService.setEventData(null);
            stateService.setActiveEvent(null);
            stateService.setEventData(null);
        };

        vm.voteUpBtnColor = function () {
            if (vm.voteObj.vote === null || vm.voteObj.vote === true) {
                return 'green-700';
            } else if (vm.voteObj.vote === false) {
                return 'grey-700';
            }
        };

        vm.voteDownBtnColor = function () {
            if (vm.voteObj.vote === null || vm.voteObj.vote === false) {
                return 'red-700';
            } else if (vm.voteObj.vote === true) {
                return 'grey-700';
            }
        };

        vm.openMenu = function ($mdOpenMenu, ev) {
            $mdOpenMenu(ev);
        };

		vm.showMetadata = function(ev, evMetadatas) {
			$mdDialog.show({
					clickOutsideToClose: true,
					controller: 'metadataDialogController',
					templateUrl: 'modules/components/eventViewer/metadataDialogTemplate.html',
					targetEvent: ev,
					locals: {
						eventMetadatas: evMetadatas
					}
				});
        };

        vm.voteUp = function () {
            vm.voteObj.vote = true;
            vm.voteObj.reason = '';
            if (vm.voteObj.vote_id) {
                // vote has already been cast, so update instead
                updateVote();
            } else {
                // new vote
                castVote();
            }
        };

        vm.voteDown = function (reason) {
            vm.voteObj.vote = false;
            vm.voteObj.reason = reason;
            if (vm.voteObj.vote_id) {
                // vote has already been cast, so update instead
                updateVote();
            } else {
                // new vote
                castVote();
            }
        };

        vm.setActiveImageCard = function () {
            var currActiveImageCard = _.find(vm.eventImageCards, { active: true }),
                currActiveCorrelatingImageCard = _.find(vm.correlatingEventImageCards, { active: true });

            if (currActiveImageCard) {
                currActiveImageCard.active = false;
            }
            if (currActiveCorrelatingImageCard) {
                currActiveCorrelatingImageCard.active = false;
            }

            vm.activeImageCard = _.find(vm.eventImageCards, { sensor: vm.selectedImageCard.sensor });
            vm.activeCorrelatingImageCard = _.find(vm.correlatingEventImageCards, { sensor: vm.selectedImageCard.sensor });

            if (vm.activeImageCard) {
                vm.activeImageCard.active = true;
            }
            if (vm.activeCorrelatingImageCard) {
                vm.activeCorrelatingImageCard.active = true;
            }
            
            chartFocus = [vm.activeImageCard.chartId];
            if (vm.activeCorrelatingImageCard) {
                chartFocus.push(vm.activeCorrelatingImageCard.chartId);
            }
            chart.focus(chartFocus);

            if ((hasCorrelation && correlatingFrames.length > 0) || (!hasCorrelation && frames.length > 0)) {
                updateAnimationFrames();
            }
        };

        vm.togglePlayback = function () {
            vm.playback = !vm.playback;
            if (vm.playback) {
                animate();
            }
        };

        vm.step = function (direction) {
            vm.playback = false;
            if (!angular.equals(direction, vm.playbackDirection)) {
                // user changed direction
                if (direction === 'forward') {
                    frameIdx = frameIdx < animationFrames.length - 2 ? frameIdx + 2 : 0;
                } else {
                    frameIdx = frameIdx > 1 ? frameIdx - 2 : animationFrames.length - 1;
                }
            }
            vm.playbackDirection = direction;
            animate();
        };

        vm.matchSignature = function (sensor) {
            var chartData = _.find(chart.data(), { id: sensor });
            var values = chartData ? chartData.values : null;

            // filter out null values
            values = _.filter(values, function(v){
                return v.values !== null;
            });
            console.log(values);
            debugger;

            //var sig = {
            //    sig_template: [[times],[intensities]],
            //    event_data: [[eventTimes],[eventIntensities]]
            //};
        };

        $scope.$watchCollection('vm.stateService.getEventData()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }

            // clean up any leftover data from a previously viewed event
            if (chartWorker) {
                chartWorker.terminate();
            }

            if (imageWorker) {
                imageWorker.terminate();
            }

            if (correlatingImageWorker) {
                correlatingImageWorker.terminate();
            }

            // reinit controller values
            initialize();

            if (newValue) {
                vm.loadingChart = true;
                vm.loadingAnimation = true;

                // capture new event data
                vm.eventData = newValue;

                // retrieve plot and image data for active event
                var tracks = vm.eventData.getLayers(),
                    promises = [];

				vm.eventProps = _.map(tracks, function(d){ return d.getLayers()[0].feature.properties; });

                vm.trackFeature = tracks[0].getLayers()[0].feature;
				vm.event_h5_url = deltaConfig.eventServer.filePathUrl + vm.trackFeature.properties.file_path;

                if (vm.voter) {
                    // dataset_id, product_id, and nasic values are the same for
                    // all tracks at this point, so set up the vote object
                    vm.voteObj.dataset_id = vm.trackFeature.properties[deltaConfig.server.datasetField];
                    vm.voteObj.product_id = vm.trackFeature.properties[deltaConfig.server.productField];
                    vm.voteObj.nasic = vm.trackFeature.properties[deltaConfig.server.identityField];
                    vm.voteObj.voter_name = vm.voter.voter_name;

                    // look for existing vote for this event
                    var eventVote = _.find(vm.votes, { dataset_id: vm.voteObj.dataset_id, product_id: vm.voteObj.product_id });
                    if (eventVote) {
                        vm.voteObj = Vote.transformer(eventVote);
                    }
                }

                _.forEach(tracks, function (track) {
                    var layer = track.getLayers()[0];

                    if (layer.feature && layer.feature.properties.file_path) {
                        var filePath = deltaConfig.eventServer.filePathUrl + layer.feature.properties.file_path;
                        promises.push(getPlotData(filePath));
                        promises.push(getImageData(filePath));
                    }
                });

                $q.all(promises).then(function () {
                    getCorrelatingEvents().then(function (correlatingEventResult) {
                        if (correlatingEventResult && correlatingEventResult.features && correlatingEventResult.features.length > 0) {
                            var correlatingPromises = [];
							vm.correlatedEventProps = [];
                            _.forEach(correlatingEventResult.features, function (feature) {
								vm.correlatedEventProps.push(feature.properties);
                                if (feature.properties.file_path_2) {
                                    var filePath = deltaConfig.eventServer.filePathUrl + feature.properties.file_path_2;
									vm.correlated_h5_url = filePath;
                                    correlatingPromises.push(getPlotData(filePath, true));
                                    correlatingPromises.push(getImageData(filePath, true));
                                }
                            });
                            $q.all(correlatingPromises).then(function () {
                                console.log('correlation present');
                                hasCorrelation = true;
                                plotResults = {
                                    results: plotResultsArr,
                                    correlatingResults: correlatingPlotResults
                                };
                                initEventData();
                            });
                        } else {
                            hasCorrelation = false;
                            plotResults = {
                                results: plotResultsArr,
                                correlatingResults: []
                            };
                            initEventData();
                        }
                    });
                }, function (error) {
                    console.log(error);
                });
            }
        });

        $scope.$watchCollection('vm.stateService.getLayoutComponents()', function (newValue) {
            if (newValue) {
                eventViewerLayoutComponent = _.find(newValue, { state: { templateName: 'eventViewer' } });
                eventViewerLayoutComponent.container.setTitle(eventViewerLayoutComponent.state.templateTitle);

                vm.eventViewerHeight = eventViewerLayoutComponent.container.height;
                vm.eventViewerWidth = eventViewerLayoutComponent.container.width;

                // set event listener for container resize
                eventViewerLayoutComponent.container.on('resize', function () {
                    // use a $timeout to notify angular of the change
                    $timeout(function () {
                        vm.eventViewerHeight = eventViewerLayoutComponent.container.height;
                        vm.eventViewerWidth = eventViewerLayoutComponent.container.width;
                        if (chart) {
                            chart.resize({
                                height: vm.eventViewerHeight / 2,
                                width: vm.eventViewerWidth
                            });
                        }
                    });
                });
            }
        });

        $scope.$watchCollection('vm.stateService.getVoter()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.voter = newValue;
        });

        $scope.$watchCollection('vm.stateService.getVotes()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.votes = newValue;
        });

        $scope.$watchCollection('vm.stateService.getVoteReasons()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.voteReasons = newValue;
        });
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/
 
(function () {
    'use strict';

    angular.module('delta').controller('metadataDialogController', ['$scope', '$mdDialog', 'eventMetadatas', function (
        $scope,
		$mdDialog,
		eventMetadatas
	){
		$scope.eventMetadatas = eventMetadatas;
		$scope.hide = function(){
			$mdDialog.hide();
		};
	}]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';
    
    angular.module('delta').controller('gotoController', ['$scope', '$location', 'deltaConfig', 'deltaService', 'stateService', 'L', 'leafletData', function (
        $scope,
        $location,
        deltaConfig,
        deltaService,
        stateService,
        L,
        leafletData
    ) {
        var vm = this,
            qs = $location.search(),
            map = {};

        $scope.mode = $scope.$parent.mode;
        vm.deltaConfig = deltaConfig;
        vm.stateService = stateService;
        vm.expanded = $scope.expanded;
        vm.lat = '';
        vm.lng = '';
        vm.mgrs = '';
        vm.locationFormat = qs.locationFormat ? qs.locationFormat : deltaConfig.defaultLocationFormat;

        var convertLatLng = function (newFormat) {
            return deltaService.convertLatLng({
                lat: vm.lat,
                lng: vm.lng,
                mgrs: vm.mgrs,
                format: vm.locationFormat
            }, newFormat);
        };

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setGotoExpanded(vm.expanded);
        };
        
        vm.goto = function () {
            var ddLatLng = convertLatLng('dd');
            map.setView(L.latLng(ddLatLng.lat, ddLatLng.lng));
        };

        vm.setLocationFormat = function (format) {
            stateService.setLocationFormat(format);
        };

        var initialize = function () {
            leafletData.getMap().then(function (data) {
                map = data;
                vm.setLocationFormat(vm.locationFormat);
            });
        };

        initialize();

        $scope.$watch('vm.stateService.getLocationFormat()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if ((vm.lat !== '' && vm.lng !== '') || vm.mgrs !== '') {
                var convertedLatLng = convertLatLng(newValue);
                vm.lat = convertedLatLng.lat;
                vm.lng = convertedLatLng.lng;
                vm.mgrs = convertedLatLng.mgrs;
            }
            vm.locationFormat = newValue;
        });
    }]);
})();
/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';
    
    angular.module('delta').directive('deltaGoto', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/goto/gotoTemplate.html',
            controller: 'gotoController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();
/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/
 
(function () {
    'use strict';

    angular.module('delta').controller('locationFormatController', ['$scope', '$location', 'deltaConfig', 'stateService', 'coordinateConversionService', '_', function (
        $scope,
        $location,
        deltaConfig,
        stateService,
        coordinateConversionService,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.stateService = stateService;
        vm.location = {
            format: qs.locationFormat || deltaConfig.defaultLocationFormat,
            north: qs.n || '',
            south: qs.s || '',
            east: qs.e || '',
            west: qs.w || '',
            mgrsNE: qs.ne || '',
            mgrsSW: qs.sw || ''
        };
        vm.mode = $scope.$parent.mode;

        vm.setFormat = function (newFormat) {
            var ne, sw;
            switch (vm.location.format) {
                case 'dd':
                    sw = coordinateConversionService.prepForDDBroadcast(vm.location.south, vm.location.west);
                    ne = coordinateConversionService.prepForDDBroadcast(vm.location.north, vm.location.east);
                    break;
                case 'dms':
                    sw = coordinateConversionService.prepForDMSBroadcast(vm.location.south, vm.location.west);
                    ne = coordinateConversionService.prepForDMSBroadcast(vm.location.north, vm.location.east);
                    break;
                case 'mgrs':
                    if (vm.location.mgrsSW) {
                        sw = coordinateConversionService.prepForMGRSBroadcast(vm.location.mgrsSW);
                    }
                    if (vm.location.mgrsNE) {
                        ne = coordinateConversionService.prepForMGRSBroadcast(vm.location.mgrsNE);
                    }
                    break;
            }
            vm.location.south = '';
            vm.location.west = '';
            vm.location.north = '';
            vm.location.east = '';
            vm.location.mgrsNE = '';
            vm.location.mgrsSW = '';

            switch (newFormat) {
                case 'dd':
                    if (sw && ne) {
                        vm.location.south = sw.dd[0];
                        vm.location.west = sw.dd[1];
                        vm.location.north = ne.dd[0];
                        vm.location.east = ne.dd[1];
                    }
                    break;
                case 'dms':
                    if (sw && ne) {
                        vm.location.south = sw.dms[0];
                        vm.location.west = sw.dms[1];
                        vm.location.north = ne.dms[0];
                        vm.location.east = ne.dms[1];
                    }
                    break;
                case 'mgrs':
                    if (sw && ne) {
                        vm.location.mgrsSW = sw.mgrs || '';
                        vm.location.mgrsNE = ne.mgrs || '';
                    }
                    break;
            }

            vm.location.format = newFormat;
            stateService.setMapBBoxParams(vm.location);
            stateService.setLocationFormat(newFormat);
        };

        $scope.$watchCollection('vm.stateService.getMapBBox()', function (newValue) {
            if (newValue) {
                if (_.keys(newValue).length > 0) {
                    vm.location = newValue;
                }
            } else {
                vm.location = {};
            }

        });
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').directive('deltaLocationFormat', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/locationFormat/locationFormatTemplate.html',
            controller: 'locationFormatController',
            controllerAs: 'vm',
            scope: {}
        };
    });
})();
/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/
 
(function () {
    'use strict';

    angular.module('delta').controller('mapController', ['$scope', '$location', '$timeout', '$mdToast', 'deltaConfig', 'deltaService', 'stateService', 'searchService', 'leafletData', 'toastr', 'L', '_', function (
        $scope,
        $location,
        $timeout,
        $mdToast,
        deltaConfig,
        deltaService,
        stateService,
        searchService,
        leafletData,
        toastr,
        L,
        _
    ) {
        var vm = this,
            qs = $location.search(),
            map = {},
            mapZoom = qs.zoom ? parseInt(qs.zoom) : deltaConfig.mapCenter.zoom,
            mapLayers = new L.FeatureGroup(),
            events = [],
            sources = [],
            types = [],
            sourceType = qs.sourceType,
            mapLayoutComponent = {};

        vm.mapHeight = '';
        vm.stateService = stateService;
        vm.trackLayers = null;
        vm.activeEvent = null;
        vm.loading = false;

        if (qs.n || qs.ne) {
            var ddBounds = deltaService.getDDBounds({
                format: qs.locationFormat,
                north: qs.n ? parseFloat(qs.n) : '',
                south: qs.s ? parseFloat(qs.s) : '',
                east: qs.e ? parseFloat(qs.e) : '',
                west: qs.w ? parseFloat(qs.w) : '',
                mgrsNE: qs.ne || '',
                mgrsSW: qs.sw || ''
            });

            var southWest = L.latLng(ddBounds[0][0], ddBounds[0][1]),
                northEast = L.latLng(ddBounds[1][0], ddBounds[1][1]),
                bounds = L.latLngBounds(southWest, northEast),
                center = bounds.getCenter();

            vm.center = {
                lat: center.lat,
                lng: center.lng,
                zoom: mapZoom
            };
        } else {
            vm.center = deltaConfig.mapCenter;
        }

        // ui-leaflet defaults
        vm.defaults = {
            crs: deltaConfig.defaultProjection,
            zoomControl: true,
            attributionControl: false,
            controls: {
                layers: {
                    visible: true,
                    position: 'topright',
                    collapsed: true
                }
            }
        };

        // ui-leaflet baselayers object
        vm.layers = _.cloneDeep(deltaConfig.layers);

        var updateBaselayer = function (layer) {
            leafletData.getLayers().then(function (layers) {
                _.forEach(layers.baselayers, function (layer) {
                    map.removeLayer(layer);
                });
                map.addLayer(layers.baselayers[layer.id]);
            });
        };

        var showEventTrack = function () {
            if (map.getZoom() > 10) {
                vm.loading = true;
            }

            // get tracks from event
            searchService.getEventTracks(vm.activeEvent).then(function (data) {
                // draw the tracks
                var trackLayers = new L.FeatureGroup(),
                    geoJSON = null,
                    source0Idx = 0,
                    source1Idx = 0;

                _.forEach(data.features, function (feature) {
                    var trackColor = '';
                    if (feature.properties[deltaConfig.server.identityField]) {
                        trackColor = _.find(deltaConfig.sources, { identity: true }).chartColors[source0Idx];
                        source0Idx++;
                    } else {
                        trackColor = _.find(deltaConfig.sources, {identity: false }).chartColors[source1Idx];
                        source1Idx++;
                    }
                    // use feature geometry when available, otherwise use the feature lat/lon point to create a geometry
                    if (feature.geometry !== null) {
                        geoJSON = L.geoJson(feature.geometry, {
                            style: { color: trackColor },
                            onEachFeature: function (featureData, layer) {
                                layer.feature.properties = feature.properties;
                            }
                        });
                        trackLayers.addLayer(geoJSON);
                    } else {
                        var latlng = L.latLng(feature.properties[deltaConfig.server.latField], feature.properties[deltaConfig.server.lonField]);

                        if (latlng) {
                            var circleMarker = L.circleMarker(latlng, { color: vm.activeEvent.eventSource.color });

                            geoJSON = L.geoJson(circleMarker.toGeoJSON(), {
                                addData: function () {
                                    return circleMarker.toGeoJSON();
                                },
                                pointToLayer: function () {
                                    return circleMarker;
                                },
                                onEachFeature: function (featureData, layer) {
                                    layer.feature.properties = feature.properties;
                                }
                            });
                            trackLayers.addLayer(geoJSON);
                        }
                    }
                    if (geoJSON) {
                        geoJSON.eachLayer(function (layer) {
                            layer.feature.eventSource = _.find(deltaConfig.sources, { identity: layer.feature.properties[deltaConfig.server.identityField]});
                            layer.feature.eventType = _.find(deltaConfig.types, { value: layer.feature.properties[deltaConfig.server.typeField] });
                        });
                        geoJSON.on('mouseover', function (e) {
                            e.layer.bindPopup(deltaService.getLeafletPopupContent(e.layer.feature), { 'offset': L.point(0, -10), 'autoPan': false }).openPopup();
                        });
                        geoJSON.on('mouseout', function (e) {
                            e.layer.closePopup();
                        });
                    }
                });

                if (_.keys(trackLayers.getBounds()).length > 0) {
                    stateService.setEventData(trackLayers);
                    if (vm.trackLayers) {
                        // remove other tracks before adding new ones
                        vm.trackLayers.clearLayers();
                    }
                    // clone trackLayers for use elsewhere to avoid triggering
                    // an angular watch update
                    vm.trackLayers = _.cloneDeep(trackLayers);
                    if (map.getZoom() > 10) {
                        mapLayers.addLayer(vm.trackLayers);
                    }
                } else {
                    $mdToast.show($mdToast.simple().textContent('Error Drawing Tracks: Geometry and Lat/Lon values are null.').theme('warn-toast').position('top right'));
                }
                vm.loading = false;
            });
        };

        var updateEvents = _.debounce(function () {
            events = [];
            stateService.setEvents([]);
            mapLayers.clearLayers();
            if (sources.length > 0) {
                console.log('update events');
                vm.loading = true;
                stateService.setLoadingEvents(vm.loading);
                searchService.getEvents(sources).then(function (data) {
                    if (data.features && data.features.length > 0) {
                        var geoJSON = L.geoJson(data.features, {
                            pointToLayer: function (feature, latlng) {
                                var source = _.find(deltaConfig.sources, { identity: feature.properties[deltaConfig.server.identityField]}),
                                    color = source ? source.color : '#555';

                                return L.circleMarker(latlng, { color: color });
                            }
                        });
                        geoJSON.on('click', function (e) {
                            if (vm.activeEvent) {
                                var activeMapEvent = _.find(events, { feature: vm.activeEvent });
                                if (activeMapEvent) {
                                    activeMapEvent.setStyle({ color: activeMapEvent.feature.eventSource.color, fillOpacity: 0.2 });
                                    activeMapEvent.bringToBack();
                                }
                            }
                            var mapEvent = e.layer.feature;
                            mapEvent.scrollTo = true;
                            stateService.setActiveEvent(mapEvent);
                            e.layer.setStyle({ color: '#b2ff59', fillOpacity: 0.8 });
                            e.layer.bringToFront();
                        });
                        geoJSON.on('mouseover', function (e) {
                            e.layer.bindPopup(deltaService.getLeafletPopupContent(e.layer.feature), { 'offset': L.point(0, -10), 'autoPan': false }).openPopup();
                        });
                        geoJSON.on('mouseout', function (e) {
                            e.layer.closePopup();
                        });
                        geoJSON.eachLayer(function (layer) {
                            layer.feature.eventSource = _.find(deltaConfig.sources, { identity: layer.feature.properties[deltaConfig.server.identityField]});
                            layer.feature.eventType = _.find(deltaConfig.types, { value: layer.feature.properties[deltaConfig.server.typeField] });
                            if (types.length === 0) {
                                // no type filters, so just add all source features to the map
                                mapLayers.addLayer(layer);
                            } else {
                                // iterate over type filters and only add features that match the criteria
                                _.forEach(types, function (type) {
                                    if (layer.feature.properties[type.field] === type.value) {
                                        mapLayers.addLayer(layer);
                                    }
                                });
                            }
                        });
                        events = mapLayers.getLayers();
                    }
                    stateService.setEvents(_.map(events, 'feature'));
                    stateService.setEventLayers(mapLayers.getLayers());
                    vm.loading = false;
                    stateService.setLoadingEvents(vm.loading);
                }).catch(function (){
                    vm.loading = false;
                });
            }
        }, 750);

        var initialize = function () {
            leafletData.getMap().then(function (data) {
                map = data;

                // set the default icon path
                L.Icon.Default.imagePath = '/stylesheets/images';

                // add feature group to the map
                mapLayers.addTo(map);

                stateService.setMapBounds(map.getBounds());
                stateService.setMapZoom(map.getZoom());

                // add coordinates control
                L.control.coordinates({
                    enableUserInput: false
                }).addTo(map);

                var baselayerId = qs.baselayer,
                    baselayer = {};
                if (baselayerId) {
                    // add requested baselayer to vm.layers.baselayers first
                    baselayer = _.find(deltaConfig.layers.baselayers, { id: baselayerId });
                    updateBaselayer(baselayer);
                } else {
                    // baselayer not present in querystring, so just go with defaults
                    baselayer = deltaConfig.layers.baselayers[deltaConfig.defaultBaselayer];
                    vm.layers = _.cloneDeep(deltaConfig.layers);
                    stateService.setBaselayer(baselayer);
                }

                map.on('baselayerchange', function (e) {
                    var baselayer = _.find(deltaConfig.layers.baselayers, { name: e.name });
                    stateService.setBaselayer(baselayer);
                });

                map.on('moveend', _.debounce(function (e) {
                    stateService.setMapZoom(e.target.getZoom());
                    stateService.setMapBounds(e.target.getBounds());
                    updateEvents();
                    if (vm.activeEvent) {
                        // show/hide event track based on zoom level
                        if (_.keys(vm.trackLayers.getBounds()).length > 0) {
                            if (e.target.getZoom() > 10) {
                                mapLayers.addLayer(vm.trackLayers);
                            } else {
                                mapLayers.removeLayer(vm.trackLayers);
                            }
                        }
                    }
                }, 750));
            });
        };

        initialize();

        $scope.$watchCollection('vm.stateService.getBaselayer()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            updateBaselayer(newValue);
        });

        $scope.$watchCollection('vm.stateService.getTemporalFilter()', function (newValue, oldValue) {
            if (_.keys(newValue).length > 0) {
                if (angular.equals(newValue, oldValue)) {
                    return;
                }
                updateEvents();
            }
        });

        $scope.$watchCollection('vm.stateService.getActiveSources()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            sources = newValue;
            updateEvents();
        });

        $scope.$watchCollection('vm.stateService.getActiveTypes()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            types = newValue;
            updateEvents();
        });

        $scope.$watch('vm.stateService.getSourceType()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            sourceType = newValue;
            updateEvents();
        });

        $scope.$watchCollection('vm.stateService.getActiveEvent()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }

            if (vm.activeEvent) {
                vm.activeEvent.active = false;
                var activeMapLayer = _.find(mapLayers.getLayers(), { feature: vm.activeEvent });
                if (activeMapLayer) {
                    activeMapLayer.setStyle({ color: activeMapLayer.feature.eventSource.color, fillOpacity: 0.2 });
                    activeMapLayer.bringToBack();
                }
            }
            if (newValue) {
                vm.activeEvent = newValue;
                vm.activeEvent.active = true;
                if (!stateService.getEventLayers()) {
                    stateService.setEventLayers(mapLayers.getLayers());
                }
                showEventTrack();
            }
        });

        $scope.$watchCollection('vm.stateService.getLayoutComponents()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            mapLayoutComponent = _.find(newValue, { state: { templateName: 'map' } });
            vm.mapHeight = mapLayoutComponent.container.height;

            // set event listener for container resize
            mapLayoutComponent.container.on('resize', function () {
                // use a $timeout to notify angular of the change
                $timeout(function () {
                    vm.mapHeight = mapLayoutComponent.container.height;
                });
            });
        });
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/
 
(function () {
    'use strict';

    angular.module('delta').controller('sidebarController', ['$scope', '$location', 'deltaService', 'stateService', '_', 'deltaConfig', function (
        $scope,
        $location,
        deltaService,
        stateService,
        _,
        deltaConfig
    ) {
        var vm = this;

        vm.logo = deltaConfig.logo;
        vm.stateService = stateService;
        vm.sourceFilterExpanded = stateService.getSourceFilterExpanded();
        vm.typeFilterExpanded = stateService.getTypeFilterExpanded();
        vm.temporalFilterExpanded = stateService.getTemporalFilterExpanded();
        vm.gotoExpanded = stateService.getGotoExpanded();

        $scope.$watch('vm.stateService.getSourceFilterExpanded()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.sourceFilterExpanded = newValue;
        });

        $scope.$watch('vm.stateService.getTypeFilterExpanded()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.typeFilterExpanded = newValue;
        });

        $scope.$watch('vm.stateService.getTemporalFilterExpanded()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.temporalFilterExpanded = newValue;
        });

        $scope.$watch('vm.stateService.getGotoExpanded()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.gotoExpanded = newValue;
        });
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/
 
(function () {
    'use strict';

    angular.module('delta').controller('sourceFilterController', ['$scope', '$location', 'stateService', 'deltaConfig', '_', function (
        $scope,
        $location,
        stateService,
        deltaConfig,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.deltaConfig = deltaConfig;
        vm.expanded = $scope.expanded;
        vm.sources = _.cloneDeep(deltaConfig.sources);
        vm.activeSources = [];
        vm.sourceTypes = _.cloneDeep(deltaConfig.sourceTypes);
        vm.sourceType = qs.sourceType ? _.find(vm.sourceTypes, { name: qs.sourceType }) : _.find(deltaConfig.sourceTypes, { active: true });

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setSourceFilterExpanded(vm.expanded);
        };

        vm.toggleSource = function (source) {
            source.active = !source.active;
            if (source.active) {
                if (!_.find(vm.activeSources, source)) {
                    vm.activeSources.push(source);
                    stateService.setActiveSources(vm.activeSources);
                }
            } else {
                if (_.find(vm.activeSources, source)) {
                    _.remove(vm.activeSources, source);
                    stateService.setActiveSources(vm.activeSources);
                }
            }
        };

        vm.setSourceType = function () {
            stateService.setSourceType(vm.sourceType.name);
        };

        var initialize = function () {
            var qsSources = qs.sources;

            if (qsSources) {
                qsSources = qsSources.split(',');
                _.forEach(qsSources, function (sourceName) {
                    var source = _.find(vm.sources, { name: sourceName });
                    vm.toggleSource(source);
                });
            }

            vm.setSourceType();
        };

        initialize();
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').directive('deltaSourceFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/sourceFilter/sourceFilterTemplate.html',
            controller: 'sourceFilterController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();
/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/
 
(function () {
    'use strict';

    angular.module('delta').controller('temporalFilterController', ['$scope', '$location', 'stateService', 'moment', 'deltaConfig', '$mdToast', '_', function (
        $scope,
        $location,
        stateService,
        moment,
        deltaConfig,
		$mdToast,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.moment = moment;
        vm.deltaConfig = deltaConfig;
        vm.expanded = $scope.expanded;
        vm.mode = $scope.mode;
        vm.expandedRange = qs.duration ? false : true;
        vm.expandedDuration = qs.duration ? true : false;
        vm.stateService = stateService;
        vm.moment = moment;
        vm.start = '';
        vm.stop = '';
        vm.durationLength = qs.durationLength ? parseInt(qs.durationLength) : deltaConfig.defaultDurationLength;
        vm.durations = deltaConfig.durations;
        vm.selectedDuration = qs.duration ? _.find(deltaConfig.durations, { value: qs.duration }) : _.find(deltaConfig.durations, { default: true });
        vm.ranges = deltaConfig.ranges;
        vm.temporalZoom = '';
        vm.invalid = false;

        $scope.isError = function () {
            return vm.invalid;
        };

        var setTemporalFilter = function () {
            if (vm.expandedDuration) {
                vm.start = moment.utc(moment.utc().endOf('d')).subtract(vm.durationLength, vm.selectedDuration.value).startOf('d').toDate();
                vm.stop = moment.utc().endOf('d').toDate();
            }

            if (vm.start && vm.stop) {
                var momentStart = moment.utc(vm.start.toISOString()),
                    momentStop = moment.utc(vm.stop.toISOString());

                if (momentStart.isBefore(momentStop)) {
                    vm.invalid = false;
                    stateService.setTemporalFilter({
                        start: vm.start,
                        stop: vm.stop,
                        duration: vm.expandedDuration ? vm.selectedDuration.value : null,
                        durationLength: vm.expandedDuration ? parseInt(vm.durationLength) : null
                    });
                } else {
                    vm.invalid = true;
                    $mdToast.show($mdToast.simple().textContent('Stop Date is before Start Date.').theme('warn-toast').position('top right'));
                }
            } else {
                vm.invalid = true;
                $mdToast.show($mdToast.simple().textContent('Temporal filter contains invalid date/time values.').theme('warn-toast').position('top right'));
            }
        };

        var initialize = function() {
            qs = $location.search();

            if (vm.expandedRange) {
                vm.start = qs.start ? moment.utc(qs.start).toDate() : moment.utc().subtract(deltaConfig.defaultDaysBack, 'days').startOf('d').toDate();
                vm.stop = qs.stop ? moment.utc(qs.stop).toDate() : moment.utc().endOf('d').toDate();
            } else if (vm.expandedDuration) {
                vm.selectedDuration = qs.duration ? _.find(vm.durations, { value: qs.duration }) : _.find(vm.durations, { default: true });
                vm.durationLength = qs.durationLength ? parseInt(qs.durationLength) : deltaConfig.defaultDurationLength;
                vm.start = moment.utc(moment.utc().endOf('d')).subtract(vm.durationLength, vm.selectedDuration.value).startOf('d').toDate();
                vm.stop = moment.utc().endOf('d').toDate();
            }

            setTemporalFilter();
        };

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setTemporalFilterExpanded(vm.expanded);
        };

        vm.toggleExpandedFilter = function () {
            vm.expandedRange = !vm.expandedRange;
            vm.expandedDuration = !vm.expandedDuration;

            setTemporalFilter();
        };

        vm.setRange = function (units, unitOfTime) {
            vm.start = moment.utc().add(units, unitOfTime).startOf('day').toDate();
            vm.stop = moment.utc().endOf('d').toDate();
            setTemporalFilter();
        };

        vm.stepBackward = function ($event) {
            $event.stopPropagation();
            var diff = moment.utc(vm.stop.toISOString()).diff(moment.utc(vm.start.toISOString()), 'd');
            vm.start = moment.utc(vm.start.toISOString()).subtract(diff, 'd').toDate();
            vm.stop = moment.utc(vm.stop.toISOString()).subtract(diff, 'd').toDate();
            setTemporalFilter();
        };

        vm.stepForward = function ($event) {
            $event.stopPropagation();
            var diff = moment.utc(vm.stop.toISOString()).diff(moment.utc(vm.start.toISOString()), 'd');
            vm.stop = moment.utc(vm.stop.toISOString()).add(diff, 'd').toDate();
            vm.start = moment.utc(vm.start.toISOString()).add(diff, 'd').toDate();
            setTemporalFilter();
        };

        initialize();

        $scope.$watch('vm.start', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }

            setTemporalFilter();
        });

        $scope.$watch('vm.stop', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }

            setTemporalFilter();
        });

        $scope.$watchCollection('vm.stateService.getTemporalFilter()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }

            console.log(newValue);
            vm.start = moment.utc(newValue.start.toISOString()).toDate();
			vm.stop = moment.utc(newValue.stop.toISOString()).toDate();

            if (typeof newValue.duration !== 'undefined' && newValue.duration !== null) {
                if (newValue.duration) {
                    vm.selectedDuration = _.find(vm.durations, {value: newValue.duration});
                }

                if (newValue.durationLength) {
                    vm.durationLength = newValue.durationLength;
                }

                vm.expandedRange = false;
                vm.expandedDuration = true;
            } else {
                vm.expandedRange = true;
                vm.expandedDuration = false;
            }
        });

        if (vm.mode === 'analyze') {
            $scope.$watch('vm.stateService.getTemporalZoom()', function (newValue) {
                vm.temporalZoom = newValue;
            });
        }
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').directive('deltaTemporalFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/temporalFilter/temporalFilterTemplate.html',
            controller: 'temporalFilterController',
            controllerAs: 'vm',
            scope: {
                expanded: '=',
                mode: '@'
            }
        };
    });
})();
/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').controller('typeFilterController', ['$scope', '$location', 'stateService', 'deltaConfig', '_', function (
        $scope,
        $location,
        stateService,
        deltaConfig,
        _
    ) {
        var vm = this;

        vm.stateService = stateService;
        vm.deltaConfig = deltaConfig;
        vm.expanded = $scope.expanded;
        vm.activeSources = stateService.getActiveSources();
        vm.types = _.cloneDeep(deltaConfig.types);
        vm.activeTypes = [];

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setTypeFilterExpanded(vm.expanded);
        };

        vm.toggleType = function (type) {
            type.active = !type.active;
            if (type.active) {
                if (!_.find(vm.activeTypes, type)) {
                    vm.activeTypes.push(type);
                    stateService.setActiveTypes(vm.activeTypes);
                }
            } else {
                if (_.find(vm.activeTypes, type)) {
                    _.remove(vm.activeTypes, type);
                    stateService.setActiveTypes(vm.activeTypes);
                }
            }
        };

        var initialize = function () {
            var qsTypes = $location.search().types;

            if (qsTypes) {
                qsTypes = qsTypes.split(',');
                _.forEach(qsTypes, function (typeName) {
                    var type = _.find(vm.types, { name: typeName });
                    vm.toggleType(type);
                });
            }
        };

        initialize();

        $scope.$watchCollection('vm.stateService.getActiveSources()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.activeSources = newValue;
        });
    }]);
})();
/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').directive('deltaTypeFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/typeFilter/typeFilterTemplate.html',
            controller: 'typeFilterController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImRlbHRhQ29uZmlnLmpzIiwibW9kZWxzL1ZvdGUuanMiLCJzZXJ2aWNlcy9jb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UuanMiLCJzZXJ2aWNlcy9kZWx0YVNlcnZpY2UuanMiLCJzZXJ2aWNlcy9zZWFyY2hTZXJ2aWNlLmpzIiwic2VydmljZXMvc3RhdGVTZXJ2aWNlLmpzIiwic2VydmljZXMvdm90ZVNlcnZpY2UuanMiLCJjb21wb25lbnRzL2V2ZW50cy9ldmVudHNDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9ldmVudFZpZXdlci9ldmVudFZpZXdlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2V2ZW50Vmlld2VyL21ldGFkYXRhRGlhbG9nQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZ290by9nb3RvQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZ290by9nb3RvRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9sb2NhdGlvbkZvcm1hdC9sb2NhdGlvbkZvcm1hdENvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2xvY2F0aW9uRm9ybWF0L2xvY2F0aW9uRm9ybWF0RGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9tYXAvbWFwQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvc2lkZWJhci9zaWRlYmFyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvc291cmNlRmlsdGVyL3NvdXJjZUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3NvdXJjZUZpbHRlci9zb3VyY2VGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3RlbXBvcmFsRmlsdGVyL3RlbXBvcmFsRmlsdGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvdGVtcG9yYWxGaWx0ZXIvdGVtcG9yYWxGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3R5cGVGaWx0ZXIvdHlwZUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3R5cGVGaWx0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Q0EsV0FBQTtnQkFDQTtvQkFDQSxPQUFBO29CQUNBLE9BQUE7b0JBQ0EsU0FBQTs7Z0JBRUE7b0JBQ0EsT0FBQTtvQkFDQSxPQUFBO29CQUNBLFNBQUE7O2dCQUVBO29CQUNBLE9BQUE7b0JBQ0EsT0FBQTtvQkFDQSxTQUFBOztnQkFFQTtvQkFDQSxPQUFBO29CQUNBLE9BQUE7b0JBQ0EsU0FBQTs7O1lBR0EsbUJBQUEsRUFBQSxJQUFBO1lBQ0EsY0FBQTtZQUNBLG1CQUFBO1lBQ0EsWUFBQTtnQkFDQSxNQUFBO2dCQUNBLGNBQUE7Z0JBQ0EsZ0JBQUE7Z0JBQ0EsWUFBQTs7Ozs7UUFLQSxRQUFBLE1BQUEsS0FBQTs7UUFFQSxJQUFBLE9BQUEsSUFBQSxzQkFBQSxVQUFBOzs7WUFHQSxJQUFBLG9CQUFBLEtBQUEsSUFBQTs7UUFFQSxPQUFBOzs7Ozs7Ozs7O0FDOUVBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFFBQUEsUUFBQTs7TUFFQTs7UUFFQSxJQUFBLE9BQUEsVUFBQSxTQUFBLFlBQUEsWUFBQSxVQUFBLFlBQUEsTUFBQSxRQUFBO1lBQ0EsS0FBQSxVQUFBLFdBQUE7WUFDQSxLQUFBLGFBQUEsY0FBQTtZQUNBLEtBQUEsYUFBQSxjQUFBO1lBQ0EsS0FBQSxXQUFBLFlBQUE7WUFDQSxLQUFBLGFBQUEsY0FBQTtZQUNBLEtBQUEsT0FBQSxPQUFBLFVBQUEsY0FBQSxPQUFBO1lBQ0EsS0FBQSxTQUFBLFVBQUE7Ozs7UUFJQSxLQUFBLFlBQUE7Ozs7O1FBS0EsS0FBQSxRQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsTUFBQTtnQkFDQSxJQUFBLE9BQUEsS0FBQSxVQUFBLFVBQUE7b0JBQ0EsS0FBQSxPQUFBLEtBQUEsU0FBQTs7Z0JBRUEsT0FBQSxJQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7OztZQUdBLE9BQUEsSUFBQTs7O1FBR0EsS0FBQSxjQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsUUFBQSxRQUFBLE9BQUE7Z0JBQ0EsT0FBQSxLQUFBLElBQUEsS0FBQTs7WUFFQSxPQUFBLEtBQUEsTUFBQTs7O1FBR0EsT0FBQTs7Ozs7Ozs7OztBQ2hEQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxRQUFBLDRDQUFBLFVBQUEsVUFBQTs7UUFFQSxJQUFBLFdBQUEsVUFBQSxRQUFBO1lBQ0EsSUFBQSxTQUFBLEdBQUE7Z0JBQ0EsT0FBQSxLQUFBLEtBQUE7O2lCQUVBO2dCQUNBLE9BQUEsS0FBQSxNQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE1BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxJQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE9BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxLQUFBO2dCQUNBLFVBQUEsVUFBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxlQUFBOzs7Ozs7O1FBT0EsYUFBQSxxQkFBQSxVQUFBLEtBQUEsS0FBQTtZQUNBLElBQUEsQ0FBQSxPQUFBLFFBQUEsTUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLE9BQUEsT0FBQSxRQUFBLE1BQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxLQUFBO2dCQUNBLElBQUEsVUFBQTtvQkFDQSxLQUFBLENBQUEsY0FBQSxNQUFBLGNBQUE7b0JBQ0EsSUFBQSxDQUFBLEtBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLElBQUE7b0JBQ0EsUUFBQSxPQUFBLFNBQUEsS0FBQSxLQUFBOztnQkFFQSxPQUFBO21CQUNBLElBQUEsRUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQSxJQUFBLEVBQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxNQUFBO2dCQUNBLE9BQUE7Ozs7Ozs7OztRQVNBLGFBQUEsc0JBQUEsVUFBQSxRQUFBLFFBQUE7WUFDQSxJQUFBLFdBQUEsV0FBQSxXQUFBLFdBQUEsV0FBQTtZQUNBLFNBQUEsT0FBQSxRQUFBLFdBQUEsSUFBQSxNQUFBO1lBQ0EsU0FBQSxPQUFBLFFBQUEsV0FBQSxJQUFBLE1BQUE7O1lBRUEsSUFBQSxPQUFBLFVBQUEsR0FBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsSUFBQTttQkFDQSxJQUFBLE9BQUEsV0FBQSxHQUFBO2dCQUNBLFNBQUEsT0FBQSxHQUFBLE1BQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsS0FBQSxNQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxJQUFBOztZQUVBLElBQUEsT0FBQSxVQUFBLEdBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLElBQUE7bUJBQ0EsSUFBQSxPQUFBLFdBQUEsR0FBQTtnQkFDQSxTQUFBLE9BQUEsR0FBQSxNQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEtBQUEsTUFBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsTUFBQSxHQUFBLENBQUEsSUFBQTs7O1lBR0E7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLENBQUEsT0FBQSxhQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQSxDQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUE7Y0FDQTtnQkFDQSxJQUFBLFVBQUE7b0JBQ0EsS0FBQTt3QkFDQSxZQUFBLE1BQUEsWUFBQSxPQUFBLFlBQUE7d0JBQ0EsWUFBQSxNQUFBLFlBQUEsT0FBQSxZQUFBO29CQUNBLElBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsUUFBQSxHQUFBLE1BQUEsSUFBQTtvQkFDQSxRQUFBLE9BQUEsU0FBQSxRQUFBLEdBQUEsSUFBQSxRQUFBLEdBQUEsSUFBQTs7Z0JBRUEsT0FBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7Ozs7Ozs7Ozs7UUFlQSxhQUFBLHVCQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsU0FBQTtZQUNBLFNBQUEsT0FBQSxJQUFBOztZQUVBLElBQUEsTUFBQSxPQUFBLE9BQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQTs7Z0JBRUEsT0FBQSxLQUFBLEtBQUEsTUFBQSxPQUFBLEtBQUEsT0FBQTtnQkFDQSxPQUFBLEtBQUEsS0FBQSxNQUFBLE9BQUEsS0FBQSxPQUFBO2dCQUNBLE9BQUE7b0JBQ0EsTUFBQTtvQkFDQSxJQUFBO29CQUNBLEtBQUEsQ0FBQSxjQUFBLE9BQUEsS0FBQSxjQUFBLE9BQUE7Ozs7O1FBS0EsYUFBQSxlQUFBLFVBQUEsS0FBQTtZQUNBLFFBQUEsQ0FBQSxPQUFBLFFBQUEsS0FBQSxRQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsT0FBQTs7UUFFQSxhQUFBLGVBQUEsVUFBQSxLQUFBO1lBQ0EsU0FBQSxDQUFBLE9BQUEsUUFBQSxLQUFBLFFBQUEsT0FBQSxPQUFBLENBQUEsT0FBQSxPQUFBOzs7UUFHQSxhQUFBLGdCQUFBLFVBQUEsUUFBQTtZQUNBLElBQUEsV0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxXQUFBLFdBQUE7WUFDQSxTQUFBLE9BQUEsUUFBQSxXQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsVUFBQSxHQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxJQUFBO21CQUNBLElBQUEsT0FBQSxXQUFBLEdBQUE7Z0JBQ0EsU0FBQSxPQUFBLEdBQUEsTUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLElBQUE7O1lBRUE7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUE7Ozs7UUFJQSxhQUFBLGdCQUFBLFVBQUEsUUFBQTtZQUNBLElBQUEsV0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxXQUFBLFdBQUE7WUFDQSxTQUFBLE9BQUEsUUFBQSxXQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsVUFBQSxHQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxJQUFBO21CQUNBLElBQUEsT0FBQSxXQUFBLEdBQUE7Z0JBQ0EsU0FBQSxPQUFBLEdBQUEsTUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLElBQUE7OztZQUdBO2dCQUNBLGFBQUEsS0FBQSxZQUFBO2dCQUNBLGFBQUEsS0FBQSxZQUFBO2dCQUNBLGFBQUEsQ0FBQSxPQUFBLGFBQUE7Z0JBQ0EsV0FBQSxhQUFBLFdBQUEsWUFBQSxRQUFBLFdBQUEsWUFBQSxXQUFBLENBQUE7Z0JBQ0EsV0FBQSxhQUFBLFdBQUEsWUFBQSxRQUFBLFdBQUEsWUFBQSxXQUFBOzs7O1FBSUEsYUFBQSxjQUFBLFVBQUEsTUFBQTtZQUNB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O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxVQUFBLFVBQUEsWUFBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTs7Z0JBRUEsTUFBQTtvQkFDQSxRQUFBO29CQUNBLEtBQUEsWUFBQSxRQUFBLE1BQUEsYUFBQTttQkFDQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsVUFBQSxVQUFBLE9BQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUEsS0FBQSxZQUFBLFFBQUEsTUFBQSxXQUFBLE9BQUEsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLE1BQUEsVUFBQSxPQUFBO29CQUNBLEVBQUEsT0FBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxVQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFlBQUEsUUFBQSxNQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsaUJBQUEsVUFBQSxZQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxZQUFBLFFBQUEsTUFBQSxrQkFBQTttQkFDQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUE7bUJBQ0EsTUFBQSxVQUFBLE9BQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOztZQUVBLGFBQUEsVUFBQSxTQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxZQUFBLFFBQUEsTUFBQSxZQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsVUFBQSxVQUFBLE1BQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUEsS0FBQSxZQUFBLFFBQUEsTUFBQSxVQUFBLE1BQUEsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLE1BQUEsVUFBQSxPQUFBO29CQUNBLEVBQUEsT0FBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxZQUFBLFVBQUEsTUFBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTs7Z0JBRUEsTUFBQSxJQUFBLFlBQUEsUUFBQSxNQUFBLFlBQUEsS0FBQSxTQUFBLE1BQUEsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLE1BQUEsVUFBQSxPQUFBO29CQUNBLEVBQUEsT0FBQTs7O2dCQUdBLE9BQUEsRUFBQTs7Ozs7Ozs7Ozs7O0FDdEhBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFdBQUEsc0pBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7WUFDQSxLQUFBLFVBQUE7WUFDQSxNQUFBO1lBQ0Esd0JBQUE7WUFDQSxVQUFBO1lBQ0EsY0FBQTtZQUNBLGNBQUE7O1FBRUEsR0FBQSxlQUFBO1FBQ0EsR0FBQSxjQUFBO1FBQ0EsR0FBQSxlQUFBO1FBQ0EsR0FBQSxjQUFBO1FBQ0EsR0FBQSxZQUFBO1FBQ0EsR0FBQSxVQUFBOztRQUVBLElBQUEsbUJBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxpQkFBQSxFQUFBLEtBQUEsYUFBQSxFQUFBLFNBQUE7WUFDQSxJQUFBLGdCQUFBO2dCQUNBLGVBQUEsU0FBQSxFQUFBLE9BQUEsV0FBQSxhQUFBO2dCQUNBLGVBQUE7Ozs7UUFJQSxHQUFBLFlBQUEsVUFBQSxRQUFBLFVBQUE7WUFDQSxFQUFBLE1BQUEsRUFBQSxTQUFBO2lCQUNBLFVBQUEsRUFBQSxPQUFBLFNBQUEsV0FBQSxZQUFBLE9BQUEsV0FBQSxTQUFBLFdBQUEsWUFBQSxPQUFBO2lCQUNB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QSxNQUFBLEVBQUEsUUFBQSxTQUFBLEdBQUEsUUFBQSxLQUFBLEtBQUE7Z0NBQ0EsTUFBQSxPQUFBLFdBQUE7OzRCQUVBLFVBQUEsS0FBQSxRQUFBLFNBQUE7Ozs7b0JBSUE7O29CQUVBLFVBQUEsWUFBQTt3QkFDQSxJQUFBLGdCQUFBLFNBQUEsR0FBQTs0QkFDQSxjQUFBOzs0QkFFQSxJQUFBLGlCQUFBO2dDQUNBLGdCQUFBLE1BQUEsVUFBQTs7NEJBRUEsSUFBQSxnQkFBQTtnQ0FDQSxlQUFBLE1BQUEsVUFBQTs7OzRCQUdBLGtCQUFBLFFBQUEsUUFBQSxXQUFBLEVBQUEsUUFBQSxnQkFBQSxVQUFBLEdBQUEsT0FBQSxLQUFBLEtBQUE7NEJBQ0EsaUJBQUEsUUFBQSxRQUFBLFdBQUEsRUFBQSxRQUFBLGdCQUFBLFVBQUEsZ0JBQUEsVUFBQSxTQUFBLEdBQUEsT0FBQSxLQUFBLEtBQUE7NEJBQ0EsSUFBQSxtQkFBQSxnQkFBQTtnQ0FDQSxJQUFBLFlBQUEsZ0JBQUEsU0FBQSxHQUFBO29DQUNBLGVBQUEsTUFBQSxVQUFBO3VDQUNBO29DQUNBLGdCQUFBLE1BQUEsVUFBQTs7Ozs7NEJBS0EsRUFBQSxRQUFBLGdCQUFBLFdBQUEsVUFBQSxXQUFBO2dDQUNBLElBQUEsYUFBQSxFQUFBLE9BQUEsYUFBQSxFQUFBLFdBQUEsVUFBQTtnQ0FDQSxJQUFBLFdBQUEsU0FBQSxHQUFBO29DQUNBLEVBQUEsUUFBQSxZQUFBLFVBQUEsT0FBQTt3Q0FDQSxJQUFBLFNBQUEsUUFBQSxRQUFBLE1BQUEsRUFBQSxRQUFBLE1BQUEsUUFBQSxLQUFBLEtBQUE7NENBQ0EsTUFBQSxPQUFBLFdBQUE7Ozt3Q0FHQSxVQUFBLEtBQUEsUUFBQTs7Ozs7OzRCQU1BLElBQUEsR0FBQSxzQkFBQSxXQUFBO2dDQUNBLElBQUEsV0FBQSxnQkFBQSxTQUFBLEdBQUE7b0NBQ0E7dUNBQ0E7b0NBQ0E7b0NBQ0EsV0FBQTs7bUNBRUE7Z0NBQ0EsSUFBQSxXQUFBLEdBQUE7b0NBQ0E7dUNBQ0E7b0NBQ0EsV0FBQSxnQkFBQSxTQUFBOzs7Ozs0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QUFBO3dCQUNBOzs7OztnQkFLQSxRQUFBLEdBQUEsU0FBQTtvQkFDQSxNQUFBO3dCQUNBLE1BQUE7d0JBQ0EsTUFBQTs0QkFDQSxHQUFBOzRCQUNBLE9BQUE7O3dCQUVBLFFBQUE7O29CQUVBLE1BQUE7d0JBQ0EsT0FBQSxHQUFBO3dCQUNBLFFBQUEsR0FBQSxvQkFBQTs7b0JBRUEsU0FBQTt3QkFDQSxLQUFBO3dCQUNBLE9BQUE7O29CQUVBLFNBQUE7d0JBQ0EsUUFBQTs0QkFDQSxPQUFBLFVBQUEsR0FBQTtnQ0FDQSxPQUFBLEVBQUEsUUFBQSxLQUFBOzs0QkFFQSxPQUFBLFVBQUEsT0FBQTtnQ0FDQSxPQUFBLEtBQUEsSUFBQSxJQUFBLE9BQUEsUUFBQSxLQUFBLE1BQUEsWUFBQSxRQUFBLEdBQUEsU0FBQSxNQUFBOzs7O29CQUlBLE1BQUE7d0JBQ0EsYUFBQTs7b0JBRUEsTUFBQTt3QkFDQSxHQUFBOzRCQUNBLE1BQUE7Z0NBQ0EsS0FBQTtnQ0FDQSxRQUFBLFVBQUEsR0FBQTtvQ0FDQSxPQUFBLEVBQUEsUUFBQTs7OzRCQUdBLE9BQUE7Z0NBQ0EsTUFBQSxtQkFBQSxPQUFBLElBQUEsVUFBQSxPQUFBO2dDQUNBLFVBQUE7Ozt3QkFHQSxHQUFBOzRCQUNBLE9BQUE7Z0NBQ0EsTUFBQSxlQUFBLFlBQUEsV0FBQSxZQUFBLFFBQUEsU0FBQSxJQUFBLFlBQUEsUUFBQSxHQUFBLFNBQUEsTUFBQSxRQUFBO2dDQUNBLFVBQUE7OzRCQUVBLE1BQUE7Z0NBQ0EsUUFBQSxVQUFBLEdBQUE7O29DQUVBLElBQUEsSUFBQSxLQUFBLElBQUE7b0NBQ0EsSUFBQSxJQUFBLElBQUEsS0FBQSxJQUFBLElBQUEsS0FBQSxLQUFBLE1BQUEsS0FBQSxJQUFBLElBQUE7b0NBQ0EsSUFBQSxJQUFBLElBQUEsSUFBQSxJQUFBOztvQ0FFQSxJQUFBLElBQUEsV0FBQSxJQUFBLFFBQUE7d0NBQ0EsT0FBQSxVQUFBOzs7b0NBR0EsSUFBQSxTQUFBLFVBQUE7b0NBQ0EsT0FBQSxXQUFBLFFBQUEsUUFBQTs7Ozs7b0JBS0EsTUFB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LFNBQUEsUUFBQTt3QkFDQSxLQUFBLDRCQUFBLHFCQUFBLEdBQUEsU0FBQTs7b0JBRUEsSUFBQSxHQUFBLFNBQUEsUUFBQTt3QkFDQSxLQUFBLDRCQUFBLHFCQUFBLEdBQUEsU0FBQTs7b0JBRUE7O1lBRUEsR0FBQSxTQUFBLFFBQUE7WUFDQSxHQUFBLFNBQUEsT0FBQTtZQUNBLEdBQUEsU0FBQSxRQUFBO1lBQ0EsR0FBQSxTQUFBLE9BQUE7WUFDQSxHQUFBLFNBQUEsU0FBQTtZQUNBLEdBQUEsU0FBQSxTQUFBOztZQUVBLFFBQUE7Z0JBQ0EsS0FBQTtvQkFDQSxJQUFBLE1BQUEsSUFBQTt3QkFDQSxHQUFBLFNBQUEsUUFBQSxHQUFBLEdBQUE7d0JBQ0EsR0FBQSxTQUFBLE9BQUEsR0FBQSxHQUFBO3dCQUNBLEdBQUEsU0FBQSxRQUFBLEdBQUEsR0FBQTt3QkFDQSxHQUFBLFNBQUEsT0FBQSxHQUFBLEdBQUE7O29CQUVBO2dCQUNBLEtBQUE7b0JBQ0EsSUFBQSxNQUFBLElBQUE7d0JBQ0EsR0FBQSxTQUFBLFFBQUEsR0FBQSxJQUFBO3dCQUNBLEdBQUEsU0FBQSxPQUFBLEdBQUEsSUFBQTt3QkFDQSxHQUFBLFNBQUEsUUFBQSxHQUFBLElBQUE7d0JBQ0EsR0FBQSxTQUFBLE9BQUEsR0FBQSxJQUFBOztvQkFFQTtnQkFDQSxLQUFBO29CQUNBLElBQUEsTUFBQSxJQUFBO3dCQUNBLEdBQUEsU0FBQSxTQUFBLEdBQUEsUUFBQTt3QkFDQSxHQUFBLFNBQUEsU0FBQSxHQUFBLFFBQUE7O29CQUVBOzs7WUFHQSxHQUFBLFNBQUEsU0FBQTtZQUNBLGFBQUEsaUJBQUEsR0FBQTtZQUNBLGFBQUEsa0JBQUE7OztRQUdBLE9BQUEsaUJBQUEsZ0NBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxVQUFBO2dCQUNBLElBQUEsRUFBQSxLQUFBLFVBQUEsU0FBQSxHQUFBO29CQUNBLEdBQUEsV0FBQTs7bUJBRUE7Z0JBQ0EsR0FBQSxXQUFBOzs7Ozs7Ozs7Ozs7O0FDekZBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFVBQUEsdUJBQUEsWUFBQTtRQUNBLE9BQUE7WUFDQSxVQUFBO1lBQ0EsYUFBQTtZQUNBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsT0FBQTs7Ozs7Ozs7OztBQ1RBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFdBQUEsb0tBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsS0FBQTtZQUNBLEtBQUEsVUFBQTtZQUNBLE1BQUE7WUFDQSxVQUFBLEdBQUEsT0FBQSxTQUFBLEdBQUEsUUFBQSxZQUFBLFVBQUE7WUFDQSxZQUFBLElBQUEsRUFBQTtZQUNBLFNBQUE7WUFDQSxVQUFBO1lBQ0EsUUFBQTtZQUNBLGFBQUEsR0FBQTtZQUNBLHFCQUFBOztRQUVBLEdBQUEsWUFBQTtRQUNBLEdBQUEsZUFBQTtRQUNBLEdBQUEsY0FBQTtRQUNBLEdBQUEsY0FBQTtRQUNBLEdBQUEsVUFBQTs7UUFFQSxJQUFBLEdBQUEsS0FBQSxHQUFBLElBQUE7WUFDQSxJQUFBLFdBQUEsYUFBQSxZQUFBO2dCQUNBLFFBQUEsR0FBQTtnQkFDQSxPQUFBLEdBQUEsSUFBQSxXQUFBLEdBQUEsS0FBQTtnQkFDQSxPQUFBLEdBQUEsSUFBQSxXQUFBLEdBQUEsS0FBQTtnQkFDQSxNQUFBLEdBQUEsSUFBQSxXQUFBLEdBQUEsS0FBQTtnQkFDQSxNQUFBLEdBQUEsSUFBQSxXQUFBLEdBQUEsS0FBQTtnQkFDQSxRQUFBLEdBQUEsTUFBQTtnQkFDQSxRQUFBLEdBQUEsTUFBQTs7O1lBR0EsSUFBQSxZQUFBLEVBQUEsT0FBQSxTQUFBLEdBQUEsSUFBQSxTQUFBLEdBQUE7Z0JBQ0EsWUFBQSxFQUFBLE9BQUEsU0FBQSxHQUFBLElBQUEsU0FBQSxHQUFBO2dCQUNBLFNBQUEsRUFBQSxhQUFBLFdBQUE7Z0JBQ0EsU0FBQSxPQUFBOztZQUVBLEdBQUEsU0FBQTtnQkFDQSxLQUFBLE9BQUE7Z0JBQ0EsS0FBQSxPQUFBO2dCQUNBLE1B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QUEsU0FBQSxHQUFBLGtCQUFBLFlBQUE7Z0JBQ0EsR0FBQSxRQUFBLE9BQUEsSUFBQSxPQUFBLE1BQUEsTUFBQSxNQUFBLFNBQUEsR0FBQSxnQkFBQSxHQUFBLGlCQUFBLE9BQUEsUUFBQSxLQUFBO2dCQUNBLEdBQUEsT0FBQSxPQUFBLE1BQUEsTUFBQSxLQUFBOzs7WUFHQTs7O1FBR0EsR0FBQSxpQkFBQSxZQUFBO1lBQ0EsR0FBQSxXQUFBLENBQUEsR0FBQTtZQUNBLGFBQUEsMEJBQUEsR0FBQTs7O1FBR0EsR0FBQSx1QkFBQSxZQUFBO1lBQ0EsR0FBQSxnQkFBQSxDQUFBLEdBQUE7WUFDQSxHQUFBLG1CQUFBLENBQUEsR0FBQTs7WUFFQTs7O1FBR0EsR0FBQSxXQUFBLFVBQUEsT0FBQSxZQUFBO1lBQ0EsR0FBQSxRQUFBLE9BQUEsTUFBQSxJQUFBLE9BQUEsWUFBQSxRQUFBLE9BQUE7WUFDQSxHQUFBLE9BQUEsT0FBQSxNQUFBLE1BQUEsS0FBQTtZQUNBOzs7UUFHQSxHQUFBLGVBQUEsVUFBQSxRQUFBO1lBQ0EsT0FBQTtZQUNBLElBQUEsT0FBQSxPQUFBLElBQUEsR0FBQSxLQUFBLGVBQUEsS0FBQSxPQUFBLElBQUEsR0FBQSxNQUFBLGdCQUFBO1lBQ0EsR0FBQSxRQUFBLE9BQUEsSUFBQSxHQUFBLE1BQUEsZUFBQSxTQUFBLE1BQUEsS0FBQTtZQUNBLEdBQUEsT0FBQSxPQUFBLElBQUEsR0FBQSxLQUFBLGVBQUEsU0FBQSxNQUFBLEtBQUE7WUFDQTs7O1FBR0EsR0FBQSxjQUFBLFVBQUEsUUFBQTtZQUNBLE9BQUE7WUFDQSxJQUFBLE9BQUEsT0FBQSxJQUFBLEdBQUEsS0FBQSxlQUFBLEtBQUEsT0FBQSxJQUFBLEdBQUEsTUFBQSxnQkFBQTtZQUNBLEdBQUEsT0FBQSxPQUFBLElBQUEsR0FBQSxLQUFBLGVBQUEsSUFBQSxNQUFBLEtBQUE7WUFDQSxHQUFBLFFBQUEsT0FBQSxJQUFBLEdBQUEsTUFBQSxlQUFBLElBQUEsTUFBQSxLQUFBO1lBQ0E7OztRQUdBOztRQUVBLE9BQUEsT0FBQSxZQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOzs7WUFHQTs7O1FBR0EsT0FBQSxPQUFBLFdBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7OztZQUdBOzs7UUFHQSxPQUFBLGlCQUFBLHVDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOzs7WUFHQSxRQUFBLElBQUE7WUFDQSxHQUFBLFFBQUEsT0FBQSxJQUFBLFNBQUEsTUFBQSxlQUFBO0dBQ0EsR0FBQSxPQUFBLE9BQUEsSUFBQSxTQUFBLEtBQUEsZUFBQTs7WUFFQSxJQUFBLE9BQUEsU0FBQSxhQUFBLGVBQUEsU0FBQSxhQUFBLE1BQUE7Z0JBQ0EsSUFBQSxTQUFBLFVBQUE7b0JBQ0EsR0FBQSxtQkFBQSxFQUFBLEtBQUEsR0FBQSxXQUFBLENBQUEsT0FBQSxTQUFBOzs7Z0JBR0EsSUFBQSxTQUFBLGdCQUFBO29CQUNBLEdBQUEsaUJBQUEsU0FBQTs7O2dCQUdBLEdBQUEsZ0JBQUE7Z0JBQ0EsR0FBQSxtQkFBQTttQkFDQTtnQkFDQSxHQUFBLGdCQUFBO2dCQUNBLEdBQUEsbUJBQUE7Ozs7UUFJQSxJQUFBLEdBQUEsU0FBQSxXQUFBO1lBQ0EsT0FBQSxPQUFBLHFDQUFBLFVBQUEsVUFBQTtnQkFDQSxHQUFBLGVBQUE7Ozs7Ozs7Ozs7OztBQ2hLQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxVQUFBLHVCQUFBLFlBQUE7UUFDQSxPQUFBO1lBQ0EsVUFBQTtZQUNBLGFBQUE7WUFDQSxZQUFBO1lBQ0EsY0FBQTtZQUNBLE9BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxNQUFBOzs7Ozs7Ozs7OztBQ1hBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFdBQUEsb0ZBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7O1FBRUEsR0FBQSxlQUFBO1FBQ0EsR0FBQSxjQUFBO1FBQ0EsR0FBQSxXQUFBLE9BQUE7UUFDQSxHQUFBLGdCQUFBLGFBQUE7UUFDQSxHQUFBLFFBQUEsRUFBQSxVQUFBLFlBQUE7UUFDQSxHQUFBLGNBQUE7O1FBRUEsR0FBQSxpQkFBQSxZQUFBO1lBQ0EsR0FBQSxXQUFBLENBQUEsR0FBQTtZQUNBLGFBQUEsc0JBQUEsR0FBQTs7O1FBR0EsR0FBQSxhQUFBLFVBQUEsTUFBQTtZQUNBLEtBQUEsU0FBQSxDQUFBLEtBQUE7WUFDQSxJQUFBLEtBQUEsUUFBQTtnQkFDQSxJQUFBLENBQUEsRUFBQSxLQUFBLEdBQUEsYUFBQSxPQUFBO29CQUNBLEdBQUEsWUFBQSxLQUFBO29CQUNBLGFBQUEsZUFBQSxHQUFBOzttQkFFQTtnQkFDQSxJQUFBLEVBQUEsS0FBQSxHQUFBLGFBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUEsR0FBQSxhQUFBO29CQUNBLGFBQUEsZUFBQSxHQUFBOzs7OztRQUtBLElBQUEsYUFBQSxZQUFBO1lBQ0EsSUFBQSxVQUFBLFVBQUEsU0FBQTs7WUFFQSxJQUFBLFNBQUE7Z0JBQ0EsVUFBQSxRQUFBLE1BQUE7Z0JBQ0EsRUFBQSxRQUFBLFNBQUEsVUFBQSxVQUFBO29CQUNBLElBQUEsT0FBQSxFQUFBLEtBQUEsR0FBQSxPQUFBLEVBQUEsTUFBQTtvQkFDQSxHQUFBLFdBQUE7Ozs7O1FBS0E7O1FBRUEsT0FBQSxpQkFBQSxzQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxHQUFBLGdCQUFBOzs7Ozs7Ozs7O0FDekRBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFVBQUEsbUJBQUEsWUFBQTtRQUNBLE9BQUE7WUFDQSxVQUFBO1lBQ0EsYUFBQTtZQUNBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsT0FBQTtnQkFDQSxVQUFBOzs7O0tBSUEiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdkZWx0YScsIFtcclxuICAgICAgICAnZGVsdGEuY29uZmlnJyxcclxuICAgICAgICAnbmdNYXRlcmlhbCcsXHJcbiAgICAgICAgJ25nQ29va2llcycsXHJcbiAgICAgICAgJ25nUmVzb3VyY2UnLFxyXG4gICAgICAgICduZ1Nhbml0aXplJyxcclxuICAgICAgICAnbmdBbmltYXRlJyxcclxuICAgICAgICAnbmdXZWJ3b3JrZXInLFxyXG4gICAgICAgICduZW1Mb2dnaW5nJyxcclxuICAgICAgICAnbWRQaWNrZXJzJyxcclxuICAgICAgICAndWktbGVhZmxldCcsXHJcbiAgICAgICAgJ0xvY2FsU3RvcmFnZU1vZHVsZScsXHJcbiAgICAgICAgJ2NmcC5ob3RrZXlzJ1xyXG4gICAgXSk7XHJcblxyXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHByb3ZpZGUsICRtZFRoZW1pbmdQcm92aWRlcikge1xyXG4gICAgICAgIC8vIEZpeCBzb3VyY2VtYXBzXHJcbiAgICAgICAgLy8gQHVybCBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLmpzL2lzc3Vlcy81MjE3I2lzc3VlY29tbWVudC01MDk5MzUxM1xyXG4gICAgICAgICRwcm92aWRlLmRlY29yYXRvcignJGV4Y2VwdGlvbkhhbmRsZXInLCBmdW5jdGlvbiAoJGRlbGVnYXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXhjZXB0aW9uLCBjYXVzZSkge1xyXG4gICAgICAgICAgICAgICAgJGRlbGVnYXRlKGV4Y2VwdGlvbiwgY2F1c2UpO1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBleGNlcHRpb247XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdkZWZhdWx0JykucHJpbWFyeVBhbGV0dGUoJ2dyZXknKS5hY2NlbnRQYWxldHRlKCdibHVlJykuZGFyaygpO1xyXG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnc3VjY2Vzcy10b2FzdCcpO1xyXG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZmFpbC10b2FzdCcpO1xyXG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnd2Fybi10b2FzdCcpO1xyXG4gICAgfSlcclxuICAgIC52YWx1ZSgnbW9tZW50Jywgd2luZG93Lm1vbWVudClcclxuICAgIC52YWx1ZSgnXycsIHdpbmRvdy5fKVxyXG4gICAgLnZhbHVlKCdMJywgd2luZG93LkwpXHJcbiAgICAudmFsdWUoJ2xvY2FsU3RvcmFnZScsIHdpbmRvdy5sb2NhbFN0b3JhZ2UpXHJcbiAgICAudmFsdWUoJ2QzJywgd2luZG93LmQzKVxyXG4gICAgLnZhbHVlKCckJywgd2luZG93LiQpXHJcbiAgICAudmFsdWUoJ3RvYXN0cicsIHdpbmRvdy50b2FzdHIpXHJcbiAgICAudmFsdWUoJ2MzJywgd2luZG93LmMzKVxyXG4gICAgLnZhbHVlKCdYTUxIdHRwUmVxdWVzdCcsIHdpbmRvdy5YTUxIdHRwUmVxdWVzdClcclxuICAgIC52YWx1ZSgnTEx0b01HUlMnLCB3aW5kb3cuTEx0b01HUlMpXHJcbiAgICAudmFsdWUoJ0dvbGRlbkxheW91dCcsIHdpbmRvdy5Hb2xkZW5MYXlvdXQpO1xyXG5cclxuICAgIGFwcC5ydW4oZnVuY3Rpb24oJHJvb3RTY29wZSwgJGh0dHAsICRjb21waWxlLCAkbWRUb2FzdCwgZGVsdGFDb25maWcsIGRlbHRhU2VydmljZSwgc3RhdGVTZXJ2aWNlLCB2b3RlU2VydmljZSwgR29sZGVuTGF5b3V0LCBfKSB7XHJcbiAgICAgICAgLy8gc2V0IGEgZ2xvYmFsIHNjb3BlIHBhcmFtIGZvciB0aGUgPHRpdGxlPiBlbGVtZW50XHJcbiAgICAgICAgJHJvb3RTY29wZS5wYWdlVGl0bGUgPSBkZWx0YUNvbmZpZy50aXRsZTtcclxuXHJcbiAgICAgICAgLy8gcmV0cmlldmUvc2V0IHZvdGluZyBpbmZvXHJcbiAgICAgICAgdm90ZVNlcnZpY2UuZ2V0Vm90ZXIoJ3ZvdGVyX25hbWUnKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIHVzZXIgaGFzIHZvdGVkIGJlZm9yZVxyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVyKHJlc3VsdC5kYXRhWzBdKTtcclxuICAgICAgICAgICAgICAgIHZvdGVTZXJ2aWNlLmdldFZvdGVzQnlWb3RlcihyZXN1bHQuZGF0YVswXS52b3Rlcl9uYW1lKS50aGVuKGZ1bmN0aW9uICh2b3Rlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3Rlcyh2b3Rlcy5kYXRhKTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZXMobnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHJpZ2h0IG5vdyB0aGUgc2VydmljZSBzaW1wbHkgcmVhZHMgdGhlIHVzZXIncyBJUCxcclxuICAgICAgICAgICAgICAgIC8vIHRoZXJlZm9yZSBubyBwYXlsb2FkIGRhdGEgaXMgcmVxdWlyZWQuIFdoZW4gUEtJIGF1dGggaXNcclxuICAgICAgICAgICAgICAgIC8vIGF2YWlsYWJsZSwgYW4gb2JqZWN0IHdpbGwgbmVlZCB0byBiZSBwYXNzZWQgdG8gdGhlIGFkZFZvdGVyXHJcbiAgICAgICAgICAgICAgICAvLyBmdW5jdGlvblxyXG4gICAgICAgICAgICAgICAgdm90ZVNlcnZpY2UuYWRkVm90ZXIoKS50aGVuKGZ1bmN0aW9uICh2b3Rlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3Rlcih2b3Rlci5kYXRhKTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZXIobnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3I6IFVuYWJsZSB0byBhZGQgdm90ZXIgdG8gZGF0YWJhc2UuIFZvdGluZyB3aWxsIGJlIHVuYXZhaWxhYmxlLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVyKG51bGwpO1xyXG4gICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvcjogVW5hYmxlIHRvIHF1ZXJ5IHZvdGUgZGF0YWJhc2UuIFZvdGluZyB3aWxsIGJlIHVuYXZhaWxhYmxlLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gbG9hZCByZWFzb25zIHRvIGxpc3QgZm9yIGRvd252b3RlIGJ1dHRvblxyXG4gICAgICAgIHZvdGVTZXJ2aWNlLmdldFJlYXNvbnMoKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgdmFyIHZvdGVSZWFzb25zID0gXy5maWx0ZXIocmVzdWx0LmRhdGEsIGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5yZWFzb24ubGVuZ3RoID4gMDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3RlUmVhc29ucyh2b3RlUmVhc29ucyk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciByZXRyaWV2aW5nIHZvdGUgaW5mb3JtYXRpb24nKTtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gZ29sZGVuIGxheW91dCBjb25maWdcclxuICAgICAgICB2YXIgY29uZmlnID0ge1xyXG4gICAgICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgICAgICAgaGFzSGVhZGVyczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHNob3dQb3BvdXRJY29uOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHNob3dNYXhpbWlzZUljb246IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzaG93Q2xvc2VJY29uOiBmYWxzZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsYWJlbHM6IHtcclxuICAgICAgICAgICAgICAgIG1heGltaXNlOiAnbWF4aW1pemUnLFxyXG4gICAgICAgICAgICAgICAgbWluaW1pc2U6ICdtaW5pbWl6ZSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdyb3cnLFxyXG4gICAgICAgICAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY29sdW1uJyxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogMjIsXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NvbXBvbmVudCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6ICd0ZW1wbGF0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFN0YXRlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZUlkOiAnbW9kdWxlcy9jb21wb25lbnRzL3NpZGViYXIvc2lkZWJhclRlbXBsYXRlLmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVOYW1lOiAnbmF2aWdhdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVRpdGxlOiAnTmF2aWdhdGlvbidcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgICAgICB9LHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY29sdW1uJyxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogMzksXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogNzAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY29tcG9uZW50JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6ICd0ZW1wbGF0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRTdGF0ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlSWQ6ICdtb2R1bGVzL2NvbXBvbmVudHMvbWFwL21hcFRlbXBsYXRlLmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlTmFtZTogJ21hcCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVUaXRsZTogJ01hcCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgICAgICB9LHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMzAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY29tcG9uZW50JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6ICd0ZW1wbGF0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRTdGF0ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlSWQ6ICdtb2R1bGVzL2NvbXBvbmVudHMvZXZlbnRzL2V2ZW50c1RlbXBsYXRlLmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlTmFtZTogJ2V2ZW50cycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVUaXRsZTogJ0V2ZW50cydcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NvbHVtbicsXHJcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDM5LFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjb21wb25lbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lOiAndGVtcGxhdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRTdGF0ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVJZDogJ21vZHVsZXMvY29tcG9uZW50cy9ldmVudFZpZXdlci9ldmVudFZpZXdlclRlbXBsYXRlLmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVOYW1lOiAnZXZlbnRWaWV3ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVUaXRsZTogJ0V2ZW50IERldGFpbHMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgfV1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgbXlMYXlvdXQgPSBuZXcgR29sZGVuTGF5b3V0KGNvbmZpZyksXHJcbiAgICAgICAgICAgIGNvbXBvbmVudHMgPSBbXTtcclxuXHJcbiAgICAgICAgbXlMYXlvdXQucmVnaXN0ZXJDb21wb25lbnQoJ3RlbXBsYXRlJywgZnVuY3Rpb24gKGNvbnRhaW5lciwgc3RhdGUpIHtcclxuICAgICAgICAgICAgY29udGFpbmVyLnNldFRpdGxlKHN0YXRlLnRlbXBsYXRlVGl0bGUpO1xyXG4gICAgICAgICAgICAkaHR0cC5nZXQoc3RhdGUudGVtcGxhdGVJZCwgeyBjYWNoZTogdHJ1ZSB9KS5zdWNjZXNzKGZ1bmN0aW9uIChodG1sKSB7XHJcbiAgICAgICAgICAgICAgICBodG1sID0gJGNvbXBpbGUoJzxkaXY+JyArIGh0bWwgKyAnPC9kaXY+JykoJHJvb3RTY29wZSk7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIuZ2V0RWxlbWVudCgpLmh0bWwoaHRtbCk7XHJcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzLnB1c2goeyBjb250YWluZXI6IGNvbnRhaW5lciwgc3RhdGU6IHN0YXRlIH0pO1xyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExheW91dENvbXBvbmVudHMoY29tcG9uZW50cyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBteUxheW91dC5pbml0KCk7XHJcbiAgICB9KTtcclxufSkoKTtcclxuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuc2VydmljZSgnZGVsdGFDb25maWcnLCBmdW5jdGlvbiAoZGVsdGFDb25maWdMb2NhbCwgbW9tZW50LCBfLCBMKSB7XG4gICAgICAgIHZhciBjZmcgPSB7XG4gICAgICAgICAgICB0aXRsZTogJ0RlbHRhJyxcbiAgICAgICAgICAgIGxvZ286ICfOlCBEZWx0YScsXG4gICAgICAgICAgICBtYXBDZW50ZXI6IHtcbiAgICAgICAgICAgICAgICBsYXQ6IDQ0LjM2NjQyOCxcbiAgICAgICAgICAgICAgICBsbmc6IC04MS40NTM5NDUsXG4gICAgICAgICAgICAgICAgem9vbTogOFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxheWVyczoge1xuICAgICAgICAgICAgICAgIGJhc2VsYXllcnM6IHt9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVmYXVsdExvY2F0aW9uRm9ybWF0OiAnZGQnLFxuICAgICAgICAgICAgZGVmYXVsdEJhc2VsYXllcjogJycsXG4gICAgICAgICAgICBtYXhEYXlzQmFjazogMTAwMDAsXG4gICAgICAgICAgICBkZWZhdWx0RGF5c0JhY2s6IDEsXG4gICAgICAgICAgICByYW5nZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzOiAtNyxcbiAgICAgICAgICAgICAgICAgICAgdW5pdE9mVGltZTogJ2RheXMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJzcgRGF5cydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdW5pdHM6IC0xLFxuICAgICAgICAgICAgICAgICAgICB1bml0T2ZUaW1lOiAnZGF5cycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnMSBEYXknXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzOiAtMTIsXG4gICAgICAgICAgICAgICAgICAgIHVuaXRPZlRpbWU6ICdob3VycycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnMTIgSG91cnMnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRlZmF1bHREdXJhdGlvbkxlbmd0aDogMSxcbiAgICAgICAgICAgIGR1cmF0aW9uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdkYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdEYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICd3ZWVrcycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnV2Vla3MnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ21vbnRocycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnTW9udGhzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ3llYXJzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdZZWFycycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRlZmF1bHRQcm9qZWN0aW9uOiBMLkNSUy5FUFNHNDMyNixcbiAgICAgICAgICAgIGRlYm91bmNlVGltZTogMzAwLFxuICAgICAgICAgICAgbWF4aW11bVJlY2VudEFPSXM6IDUsXG4gICAgICAgICAgICBjb21wb25lbnRzOiB7XG4gICAgICAgICAgICAgICAgZ290bzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzb3VyY2VGaWx0ZXI6IHRydWUsXG4gICAgICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXI6IHRydWUsXG4gICAgICAgICAgICAgICAgdHlwZUZpbHRlcjogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHJlY3Vyc2l2ZWx5IG1lcmdlIHRoZSBsb2NhbCBjb25maWcgb250byB0aGUgZGVmYXVsdCBjb25maWdcbiAgICAgICAgYW5ndWxhci5tZXJnZShjZmcsIGRlbHRhQ29uZmlnTG9jYWwpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY2ZnLmRlZmF1bHRQcm9qZWN0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gZGVmYXVsdFByb2plY3Rpb24gaGFzIGJlZW4gb3ZlcndyaXR0ZW4gaW4gbG9jYWwgY29uZmlnXG4gICAgICAgICAgICAvLyBvbmx5IGEgc3RyaW5nIHZhbHVlIGNhbiBiZSBzcGVjaWZpZWQgaW4gbG9jYWwgY29uZmlnLCBzbyB1c2UgZXZhbCB0byBwcm9kdWNlIHRoZSBwcm9wZXIgSlMgb2JqZWN0XG4gICAgICAgICAgICBjZmcuZGVmYXVsdFByb2plY3Rpb24gPSBldmFsKGNmZy5kZWZhdWx0UHJvamVjdGlvbik7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjZmc7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuZmFjdG9yeSgnVm90ZScsIGZ1bmN0aW9uIChcclxuXHJcbiAgICApIHtcclxuICAgICAgICAvLyBDb25zdHJ1Y3RvclxyXG4gICAgICAgIHZhciBWb3RlID0gZnVuY3Rpb24gKHZvdGVfaWQsIHByb2R1Y3RfaWQsIGRhdGFzZXRfaWQsIGlkZW50aXR5LCB2b3Rlcl9uYW1lLCB2b3RlLCByZWFzb24pIHtcclxuICAgICAgICAgICAgdGhpcy52b3RlX2lkID0gdm90ZV9pZCB8fCBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLnByb2R1Y3RfaWQgPSBwcm9kdWN0X2lkIHx8ICcnO1xyXG4gICAgICAgICAgICB0aGlzLmRhdGFzZXRfaWQgPSBkYXRhc2V0X2lkIHx8ICcnO1xyXG4gICAgICAgICAgICB0aGlzLmlkZW50aXR5ID0gaWRlbnRpdHkgfHwgbnVsbDtcclxuICAgICAgICAgICAgdGhpcy52b3Rlcl9uYW1lID0gdm90ZXJfbmFtZSB8fCAnJztcclxuICAgICAgICAgICAgdGhpcy52b3RlID0gdHlwZW9mKHZvdGUpID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiB2b3RlO1xyXG4gICAgICAgICAgICB0aGlzLnJlYXNvbiA9IHJlYXNvbiB8fCAnJztcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBwdWJsaWMgbWV0aG9kc1xyXG4gICAgICAgIFZvdGUucHJvdG90eXBlID0ge1xyXG5cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBzdGF0aWMgbWV0aG9kc1xyXG4gICAgICAgIFZvdGUuYnVpbGQgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICBpZiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZihkYXRhLnZvdGUpID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudm90ZSA9IGRhdGEudm90ZSA9PT0gJ3RydWUnO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBWb3RlKFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudm90ZV9pZCxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnByb2R1Y3RfaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5kYXRhc2V0X2lkLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaWRlbnRpdHksXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS52b3Rlcl9uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudm90ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnJlYXNvblxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZvdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBWb3RlLnRyYW5zZm9ybWVyID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubWFwKFZvdGUuYnVpbGQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBWb3RlLmJ1aWxkKGRhdGEpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBWb3RlO1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLmZhY3RvcnkoJ2Nvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZScsIGZ1bmN0aW9uIChMTHRvTUdSUykge1xuICAgICAgICAvL3RydW5jYXRlIGlzIGEgc2lnbiBhcHByb3ByaWF0ZSB0cnVuY2F0aW9uIGZ1bmN0aW9uXG4gICAgICAgIHZhciB0cnVuY2F0ZSA9IGZ1bmN0aW9uIChfdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChfdmFsdWUgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguY2VpbChfdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoX3ZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgbGF0aXR1ZGUgZGVjaW1hbCBkZWdyZWVzIChmbG9hdCkgaW50byBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIGFzIGEgc3RyaW5nIGluIHRoZSBmb3JtYXQ6XG4gICAgICAgICAnWFjCsFhYJ1hYLlhYWCdcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZExhdFRvRE1TTGF0ID0gZnVuY3Rpb24gKGxhdCkge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKGxhdCA8PSA5MCAmJiBsYXQgPj0gMCkge1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSB0cnVuY2F0ZShsYXQpO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB0cnVuY2F0ZSgobGF0IC0gZGVncmVlcykgKiA2MCk7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9ICgoKChsYXQgLSBkZWdyZWVzKSAqIDYwKSAtIG1pbnV0ZXMpICogNjApLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZ3JlZXMgKyAnwrAnICsgbWludXRlcyArICdcXCcnICsgc2Vjb25kcyArICdcIic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdCA8IDAgJiYgbGF0ID49IC05MCkge1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSB0cnVuY2F0ZShsYXQpO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB0cnVuY2F0ZSgoTWF0aC5hYnMobGF0KSAtIE1hdGguYWJzKGRlZ3JlZXMpKSAqIDYwKTtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gKCgoKE1hdGguYWJzKGxhdCkgLSBNYXRoLmFicyhkZWdyZWVzKSkgKiA2MCkgLSBtaW51dGVzKSAqIDYwKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWdyZWVzICsgJ8KwJyArIG1pbnV0ZXMgKyAnXFwnJyArIHNlY29uZHMgKyAnXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ludmFsaWQgTGF0aXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyBsb25naXR1ZGUgZGVjaW1hbCBkZWdyZWVzIChmbG9hdCkgaW50byBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIGFzIGEgc3RyaW5nIGluIHRoZSBmb3JtYXQ6XG4gICAgICAgICAnWFjCsFhYJ1hYLlhYWCdcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZExvblRvRE1TTG9uID0gZnVuY3Rpb24gKGxvbikge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKGxvbiA8PSAxODAgJiYgbG9uID49IDApIHtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gdHJ1bmNhdGUobG9uKTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdHJ1bmNhdGUoKGxvbiAtIGRlZ3JlZXMpICogNjApO1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSAoKCgobG9uIC0gZGVncmVlcykgKiA2MCkgLSBtaW51dGVzKSAqIDYwKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWdyZWVzICsgJ8KwJyArIG1pbnV0ZXMgKyAnXFwnJyArIHNlY29uZHMgKyAnXCInO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb24gPCAwICYmIGxvbiA+PSAtMTgwKSB7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHRydW5jYXRlKChsb24pKTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdHJ1bmNhdGUoKE1hdGguYWJzKGxvbikgLSBNYXRoLmFicyhkZWdyZWVzKSkgKiA2MCk7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9ICgoKChNYXRoLmFicyhsb24pIC0gTWF0aC5hYnMoZGVncmVlcykpICogNjApIC0gbWludXRlcykgKiA2MCkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVncmVlcyArICfCsCcgKyBtaW51dGVzICsgJ1xcJycgKyBzZWNvbmRzICsgJ1wiJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdJbnZhbGlkIGxvbmdpdHVkZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLypcbiAgICAgICAgIENvbnZlcnRzIGxhdGl0dWRlIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgaW50byBkZWNpbWFsIGRlZ3JlZXMgKGZsb2F0KVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGRtc0xhdFRvRERMYXQgPSBmdW5jdGlvbiAobGF0RGVncmVlLCBsYXRNaW51dGUsIGxhdFNlY29uZCkge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKHBhcnNlRmxvYXQobGF0RGVncmVlKSA8IDApIHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gcGFyc2VGbG9hdChsYXRTZWNvbmQpIC8gNjA7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IChwYXJzZUZsb2F0KGxhdE1pbnV0ZSkgKyBzZWNvbmRzKSAvIDYwO1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSBwYXJzZUZsb2F0KE1hdGguYWJzKGxhdERlZ3JlZSkpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoKGRlZ3JlZXMgKyBtaW51dGVzKSAqIC0xKS50b0ZpeGVkKDYpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXJzZUZsb2F0KGxhdERlZ3JlZSkgPj0gMCkge1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBwYXJzZUZsb2F0KGxhdFNlY29uZCkgLyA2MDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gKHBhcnNlRmxvYXQobGF0TWludXRlKSArIHNlY29uZHMpIC8gNjA7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHBhcnNlRmxvYXQobGF0RGVncmVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGRlZ3JlZXMgKyBtaW51dGVzKS50b0ZpeGVkKDYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ludmFsaWQgTGF0aXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyBsb25naXR1ZGUgZGVncmVlcywgbWludXRlcywgc2Vjb25kcyBpbnRvIGRlY2ltYWwgZGVncmVlcyAoZmxvYXQpXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgZG1zTG9uVG9ERExvbiA9IGZ1bmN0aW9uIChsb25EZWdyZWUsIGxvbk1pbnV0ZSwgbG9uU2Vjb25kKSB7XG4gICAgICAgICAgICB2YXIgZGVncmVlcztcbiAgICAgICAgICAgIHZhciBtaW51dGVzO1xuICAgICAgICAgICAgdmFyIHNlY29uZHM7XG4gICAgICAgICAgICBpZiAocGFyc2VGbG9hdChsb25EZWdyZWUpIDwgMCkge1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBwYXJzZUZsb2F0KGxvblNlY29uZCkgLyA2MDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gKHBhcnNlRmxvYXQobG9uTWludXRlKSArIHNlY29uZHMpIC8gNjA7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHBhcnNlRmxvYXQoTWF0aC5hYnMobG9uRGVncmVlKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgoZGVncmVlcyArIG1pbnV0ZXMpICogLTEpLnRvRml4ZWQoNik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnNlRmxvYXQobG9uRGVncmVlKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9IHBhcnNlRmxvYXQobG9uU2Vjb25kKSAvIDYwO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSAocGFyc2VGbG9hdChsb25NaW51dGUpICsgc2Vjb25kcykgLyA2MDtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gcGFyc2VGbG9hdChsb25EZWdyZWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoZGVncmVlcyArIG1pbnV0ZXMpLnRvRml4ZWQoNik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnSW52YWxpZCBMb25naXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vTXlTZXJ2aWNlIGlzIGFuIG9iamVjdCB0byBjb250YWluIGFsbCBmaWVsZHMgYW5kXG4gICAgICAgIC8vZnVuY3Rpb25zIG5lY2Vzc2FyeSB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSB2YXJpb3VzXG4gICAgICAgIC8vY29udHJvbGxlcnNcbiAgICAgICAgdmFyIGNvb3JkU2VydmljZSA9IHt9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyB0aGUgZGVjaW1hbCBkZWdyZWVzIG9mIGxhdGl0dWRlIGFuZCBsb25naXR1ZGUgaW5wdXQgYm94IHRoZSBvdGhlciBmb3JtYXRzIChETVMgYW5kIE1HUlMpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICBjb29yZFNlcnZpY2UucHJlcEZvckREQnJvYWRjYXN0ID0gZnVuY3Rpb24gKGxhdCwgbG9uKSB7XG4gICAgICAgICAgICBpZiAoKGxhdCB8fCBsYXQgPT09IDApICYmIGxhdCA+PSAtOTAgJiYgbGF0IDw9IDkwICYmIChsb24gfHwgbG9uID09PSAwKSAmJiBsb24gPj0gLTE4MCAmJiBsb24gPD0gMTgwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGRtczogW2RkTGF0VG9ETVNMYXQobGF0KSwgZGRMb25Ub0RNU0xvbihsb24pXSxcbiAgICAgICAgICAgICAgICAgICAgZGQ6IFtsYXQsIGxvbl0sXG4gICAgICAgICAgICAgICAgICAgIG1ncnM6ICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAobGF0ID49IC04MCAmJiBsYXQgPD0gODQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5tZ3JzID0gTEx0b01HUlMobGF0LCBsb24sIDUpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCEobGF0ID49IC04MCAmJiBsYXQgPD0gODQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCEobG9uID49IC0xODAgJiYgbG9uIDw9IDE4MCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgdGhlIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgc3RyaW5ncyBvZiBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlIGlucHV0IGJveCB0aGUgb3RoZXIgZm9ybWF0cyAoREQgYW5kIE1HUlMpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICBjb29yZFNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdCA9IGZ1bmN0aW9uIChsYXRETVMsIGxvbkRNUykge1xuICAgICAgICAgICAgdmFyIGxhdERlZ3JlZSwgbGF0TWludXRlLCBsYXRTZWNvbmQsIGxvbkRlZ3JlZSwgbG9uTWludXRlLCBsb25TZWNvbmQ7XG4gICAgICAgICAgICBsYXRETVMgPSBsYXRETVMucmVwbGFjZSgvW05TIF0vaWcsICcnKS5zcGxpdCgvW8KwJ1wiXS8pO1xuICAgICAgICAgICAgbG9uRE1TID0gbG9uRE1TLnJlcGxhY2UoL1tFVyBdL2lnLCAnJykuc3BsaXQoL1vCsCdcIl0vKTtcblxuICAgICAgICAgICAgaWYgKGxhdERNUy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA9IHBhcnNlSW50KGxhdERNU1swXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA9IHBhcnNlSW50KGxhdERNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA9IHBhcnNlRmxvYXQobGF0RE1TWzJdLCAxMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdERNUy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsYXRETVMgPSBsYXRETVNbMF0uc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPSBwYXJzZUZsb2F0KGxhdERNU1swXS5zdWJzdHIoLTIpICsgJy4nICsgbGF0RE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0TWludXRlID0gcGFyc2VJbnQobGF0RE1TWzBdLnN1YnN0cigtNCwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPSBwYXJzZUludChsYXRETVNbMF0uc2xpY2UoMCwgLTQpLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobG9uRE1TLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID0gcGFyc2VJbnQobG9uRE1TWzBdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uTWludXRlID0gcGFyc2VJbnQobG9uRE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID0gcGFyc2VGbG9hdChsb25ETVNbMl0sIDEwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9uRE1TLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGxvbkRNUyA9IGxvbkRNU1swXS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgICAgIGxvblNlY29uZCA9IHBhcnNlRmxvYXQobG9uRE1TWzBdLnN1YnN0cigtMikgKyAnLicgKyBsb25ETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPSBwYXJzZUludChsb25ETVNbMF0uc3Vic3RyKC00LCAyKSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbkRlZ3JlZSA9IHBhcnNlSW50KGxvbkRNU1swXS5zbGljZSgwLCAtNCksIDEwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA+PSAtOTAgJiYgbGF0RGVncmVlIDw9IDkwICYmXG4gICAgICAgICAgICAgICAgbGF0TWludXRlID49IDAgJiYgbGF0TWludXRlIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbGF0U2Vjb25kID49IDAgJiYgbGF0U2Vjb25kIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uTWludXRlID49IDAgJiYgbG9uTWludXRlIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID49IDAgJiYgbG9uU2Vjb25kIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID49IC0xODAgJiYgbG9uRGVncmVlIDw9IDE4MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobGF0RGVncmVlKSAtIHBhcnNlRmxvYXQobGF0TWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxhdFNlY29uZCAqIDAuMDAwMSkgPj0gLTkwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsYXREZWdyZWUpICsgcGFyc2VGbG9hdChsYXRNaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobGF0U2Vjb25kICogMC4wMDAxKSA8PSA5MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobG9uRGVncmVlKSAtIHBhcnNlRmxvYXQobG9uTWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxvblNlY29uZCAqIDAuMDAwMSkgPj0gLTE4MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobG9uRGVncmVlKSArIHBhcnNlRmxvYXQobG9uTWludXRlICogMC4wMSkgKyBwYXJzZUZsb2F0KGxvblNlY29uZCAqIDAuMDAwMSkgPD0gMTgwXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgZG1zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXREZWdyZWUgKyAnwrAnICsgbGF0TWludXRlICsgJ1xcJycgKyBsYXRTZWNvbmQgKyAnXCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9uRGVncmVlICsgJ8KwJyArIGxvbk1pbnV0ZSArICdcXCcnICsgbG9uU2Vjb25kICsgJ1wiJ10sXG4gICAgICAgICAgICAgICAgICAgIGRkOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBkbXNMYXRUb0RETGF0KGxhdERlZ3JlZSwgbGF0TWludXRlLCBsYXRTZWNvbmQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZG1zTG9uVG9ERExvbihsb25EZWdyZWUsIGxvbk1pbnV0ZSwgbG9uU2Vjb25kKV0sXG4gICAgICAgICAgICAgICAgICAgIG1ncnM6ICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0cy5kZFswXSA+PSAtODAgJiYgcmVzdWx0cy5kZFswXSA8PSA4NCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLm1ncnMgPSBMTHRvTUdSUyhyZXN1bHRzLmRkWzBdLCByZXN1bHRzLmRkWzFdLCA1KTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgdGhlIE1HUlMtZW5jb2RlZCBzdHJpbmcgb2YgbGF0aXR1ZGUgYW5kIGxvbmdpdHVkZSBpbnB1dCBib3ggdGhlIG90aGVyIGZvcm1hdHMgKERNUyBhbmQgREQpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICAvL3ByZXBGb3JNR1JTQnJvYWRjYXN0IGlzIHRoZSBmdW5jdGlvbiB0aGF0IGNvbnZlcnRzIHRoZVxuICAgICAgICAvL2Nvb3JkaW5hdGVzIGVudGVyZWQgaW4gdGhlIE1HUlMgaW5wdXQgYm94ZXMgYW5kIHNldHNcbiAgICAgICAgLy90aGUgcmVzdCBvZiB0aGUgZmllbGRzIGluIHRoZSBteVNlcnZpY2Ugb2JqZWN0LiBkYXRhXG4gICAgICAgIC8vdmFsaWRhdGlvbiBpcyBjb21wbGV0ZWQgYnkgY2hlY2tpbmcgaWYgdGhlIGlucHV0XG4gICAgICAgIC8vY29vcmRpbmF0ZXMgcmV0dXJuIHZhbHVlcyB0byB0aGUgbGF0TG9uW10gZnJvbSB0aGVcbiAgICAgICAgLy9VU05HdG9MTCgpIGZ1bmN0aW9uIG9mIHRoZSB1c25nLmpzIGxpYnJhcnkuXG4gICAgICAgIGNvb3JkU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdCA9IGZ1bmN0aW9uIChNR1JTKSB7XG4gICAgICAgICAgICB2YXIgbGF0TG9uID0gW107XG4gICAgICAgICAgICBVU05HdG9MTChNR1JTICsgJycsIGxhdExvbik7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuXG4gICAgICAgICAgICBpZiAoaXNOYU4obGF0TG9uWzBdKSB8fCBpc05hTihsYXRMb25bMV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGFmdGVyIDUgZGVjaW1hbCBwbGFjZXMsIHRoZSByZXN1bHRzIHN0YXJ0IGdvaW5nIG9mZlxuICAgICAgICAgICAgICAgIGxhdExvblswXSA9IE1hdGgucm91bmQobGF0TG9uWzBdICogMWU1KSAvIDEuZTU7XG4gICAgICAgICAgICAgICAgbGF0TG9uWzFdID0gTWF0aC5yb3VuZChsYXRMb25bMV0gKiAxZTUpIC8gMS5lNTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBtZ3JzOiBNR1JTLFxuICAgICAgICAgICAgICAgICAgICBkZDogbGF0TG9uLFxuICAgICAgICAgICAgICAgICAgICBkbXM6IFtkZExhdFRvRE1TTGF0KGxhdExvblswXSksIGRkTG9uVG9ETVNMb24obGF0TG9uWzFdKV1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTGF0REQgPSBmdW5jdGlvbiAobGF0KSB7XG4gICAgICAgICAgICByZXR1cm4gKChsYXQgfHwgbGF0ID09PSAwIHx8IGxhdCA9PT0gJycpICYmIGxhdCA+PSAtOTAgJiYgbGF0IDw9IDkwKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRMb25ERCA9IGZ1bmN0aW9uIChsb24pIHtcbiAgICAgICAgICAgIHJldHVybiAoIChsb24gfHwgbG9uID09PSAwIHx8IGxvbiA9PT0gJycpICYmIGxvbiA+PSAtMTgwICYmIGxvbiA8PSAxODApO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTGF0RE1TID0gZnVuY3Rpb24gKGxhdERNUykge1xuICAgICAgICAgICAgaWYgKGxhdERNUyA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsYXREZWdyZWUsIGxhdE1pbnV0ZSwgbGF0U2Vjb25kO1xuICAgICAgICAgICAgbGF0RE1TID0gbGF0RE1TLnJlcGxhY2UoL1tOUyBdL2lnLCAnJykuc3BsaXQoL1vCsCdcIl0vKTtcblxuICAgICAgICAgICAgaWYgKGxhdERNUy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA9IHBhcnNlSW50KGxhdERNU1swXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA9IHBhcnNlSW50KGxhdERNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA9IHBhcnNlRmxvYXQobGF0RE1TWzJdLCAxMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdERNUy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsYXRETVMgPSBsYXRETVNbMF0uc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPSBwYXJzZUZsb2F0KGxhdERNU1swXS5zdWJzdHIoLTIpICsgJy4nICsgbGF0RE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0TWludXRlID0gcGFyc2VJbnQobGF0RE1TWzBdLnN1YnN0cigtNCwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPSBwYXJzZUludChsYXRETVNbMF0uc2xpY2UoMCwgLTQpLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA+PSAtOTAgJiYgbGF0RGVncmVlIDw9IDkwICYmXG4gICAgICAgICAgICAgICAgbGF0TWludXRlID49IDAgJiYgbGF0TWludXRlIDwgNjAgJiZcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPj0gMCAmJiBsYXRTZWNvbmQgPCA2MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobGF0RGVncmVlKSAtIHBhcnNlRmxvYXQobGF0TWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxhdFNlY29uZCAqIDAuMDAwMSkgPj0gLTkwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsYXREZWdyZWUpICsgcGFyc2VGbG9hdChsYXRNaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobGF0U2Vjb25kICogMC4wMDAxKSA8PSA5MFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb29yZFNlcnZpY2UuaXNWYWxpZExvbkRNUyA9IGZ1bmN0aW9uIChsb25ETVMpIHtcbiAgICAgICAgICAgIGlmIChsb25ETVMgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbG9uRGVncmVlLCBsb25NaW51dGUsIGxvblNlY29uZDtcbiAgICAgICAgICAgIGxvbkRNUyA9IGxvbkRNUy5yZXBsYWNlKC9bRVcgXS9pZywgJycpLnNwbGl0KC9bwrAnXCJdLyk7XG5cbiAgICAgICAgICAgIGlmIChsb25ETVMubGVuZ3RoID49IDMpIHtcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPSBwYXJzZUludChsb25ETVNbMF0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPSBwYXJzZUludChsb25ETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25TZWNvbmQgPSBwYXJzZUZsb2F0KGxvbkRNU1syXSwgMTApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb25ETVMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgbG9uRE1TID0gbG9uRE1TWzBdLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID0gcGFyc2VGbG9hdChsb25ETVNbMF0uc3Vic3RyKC0yKSArICcuJyArIGxvbkRNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA9IHBhcnNlSW50KGxvbkRNU1swXS5zdWJzdHIoLTQsIDIpLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID0gcGFyc2VJbnQobG9uRE1TWzBdLnNsaWNlKDAsIC00KSwgMTApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA+PSAwICYmIGxvbk1pbnV0ZSA8IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID49IDAgJiYgbG9uU2Vjb25kIDwgNjAgJiZcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPj0gLTE4MCAmJiBsb25EZWdyZWUgPD0gMTgwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsb25EZWdyZWUpIC0gcGFyc2VGbG9hdChsb25NaW51dGUgKiAwLjAxKSAtIHBhcnNlRmxvYXQobG9uU2Vjb25kICogMC4wMDAxKSA+PSAtMTgwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsb25EZWdyZWUpICsgcGFyc2VGbG9hdChsb25NaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobG9uU2Vjb25kICogMC4wMDAxKSA8PSAxODBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRNR1JTID0gZnVuY3Rpb24gKG1ncnMpIHtcbiAgICAgICAgICAgIGlmIChtZ3JzID09PSAnJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWdycyA9IG1ncnMgKyAnJztcbiAgICAgICAgICAgIHJldHVybiAhIW1ncnMubWF0Y2goL14oWzAtNV1bMC05XVtDLVhdfDYwW0MtWF18W0FCWVpdKVtBLVpdezJ9XFxkezQsMTR9JC9pKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gY29vcmRTZXJ2aWNlO1xuICAgIH0pO1xufSkoKTsiLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5zZXJ2aWNlKCdkZWx0YVNlcnZpY2UnLCBmdW5jdGlvbiAoZGVsdGFDb25maWcsIGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZSwgbW9tZW50KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZ2V0Vmlld3BvcnRTaXplOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdyA9IHdpbmRvdyxcclxuICAgICAgICAgICAgICAgICAgICBkID0gZG9jdW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgZSA9IGQuZG9jdW1lbnRFbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIGcgPSBkb2N1bWVudC5ib2R5LFxyXG4gICAgICAgICAgICAgICAgICAgIHggPSB3LmlubmVyV2lkdGggfHwgZS5jbGllbnRXaWR0aCB8fCBnLmNsaWVudFdpZHRoLFxyXG4gICAgICAgICAgICAgICAgICAgIHkgPSB3LmlubmVySGVpZ2h0IHx8IGUuY2xpZW50SGVpZ2h0IHx8IGcuY2xpZW50SGVpZ2h0O1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHgsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB5XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmb3JtYXRMYXRMbmc6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gZW5zdXJlIGJvdW5kcyB2YWx1ZXMgaGF2ZSBhdCBsZWFzdCAxIGRlY2ltYWwgcGxhY2VcclxuICAgICAgICAgICAgICAgIHJldHVybiAodmFsdWUgJSAxID09PSAwKSA/IHZhbHVlLnRvRml4ZWQoMSkgOiB2YWx1ZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0RERCb3VuZHM6IGZ1bmN0aW9uIChsb2NhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdmFyIHN3LCBuZSwgYm91bmRzO1xyXG4gICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ2RtcycpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KGxvY2F0aW9uLnNvdXRoLCBsb2NhdGlvbi53ZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KGxvY2F0aW9uLm5vcnRoLCBsb2NhdGlvbi5lYXN0KTtcclxuICAgICAgICAgICAgICAgICAgICBib3VuZHMgPSBbW3N3LmRkWzBdLCBuZS5kZFsxXV0sIFtuZS5kZFswXSwgc3cuZGRbMV1dXTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobG9jYXRpb24uZm9ybWF0ID09PSAnbWdycycpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdChsb2NhdGlvbi5tZ3JzU1cpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KGxvY2F0aW9uLm1ncnNORSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gW3N3LmRkLCBuZS5kZF07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlZmluZSByZWN0YW5nbGUgZ2VvZ3JhcGhpY2FsIGJvdW5kc1xyXG4gICAgICAgICAgICAgICAgICAgIGJvdW5kcyA9IFtbbG9jYXRpb24uc291dGgsIGxvY2F0aW9uLndlc3RdLCBbbG9jYXRpb24ubm9ydGgsIGxvY2F0aW9uLmVhc3RdXTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYm91bmRzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb252ZXJ0TGF0TG5nOiBmdW5jdGlvbiAobG9jYXRpb24sIG5ld0Zvcm1hdCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNvb3JkaW5hdGVzLCBsYXRMbmc7XHJcbiAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24uZm9ybWF0ID09PSAnZG1zJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3QobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sbmcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxhdExuZyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzBdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWdyczogY29vcmRpbmF0ZXMubWdyc1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ21ncnMnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZXMgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvck1HUlNCcm9hZGNhc3QobG9jYXRpb24ubWdycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRMbmcgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IHBhcnNlRmxvYXQoY29vcmRpbmF0ZXMuZGRbMF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RtcycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBjb29yZGluYXRlcy5kbXNbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGNvb3JkaW5hdGVzLmRtc1sxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ2RkJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JEREJyb2FkY2FzdChsb2NhdGlvbi5sYXQsIGxvY2F0aW9uLmxuZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RtcycgfHwgbmV3Rm9ybWF0ID09PSAnbWdycycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBjb29yZGluYXRlcy5kbXNbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGNvb3JkaW5hdGVzLmRtc1sxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRMbmcgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IHBhcnNlRmxvYXQoY29vcmRpbmF0ZXMuZGRbMF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGF0TG5nO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMZWFmbGV0UG9wdXBDb250ZW50OiBmdW5jdGlvbiAoZmVhdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0cGwgPSAnPHVsIGNsYXNzPVwibGlzdC11bnN0eWxlZCBldmVudC1kZXRhaWxzLXBvcHVwXCI+JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRUeXBlSWNvbiA9IGZlYXR1cmUucHJvcGVydGllcy5ldmVudF90eXBlID09PSAnRHluYW1pYycgPyAnZmEtYm9sdCcgOiAnZmEtZWxsaXBzaXMtaCc7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPGxpIHN0eWxlPVwiY29sb3I6ICcgKyBmZWF0dXJlLmV2ZW50U291cmNlLmNvbG9yICsgJ1wiPjxpIGNsYXNzPVwiZmEgJyArIGZlYXR1cmUuZXZlbnRUeXBlLmljb24gKyAnXCI+PC9pPiA8Yj4nICsgZmVhdHVyZS5ldmVudFR5cGUudGl0bGUgKyAnPC9iPjwvbGk+JztcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5sYXRGaWVsZF0gJiYgZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5sb25GaWVsZF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+JyArIGZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIubGF0RmllbGRdLnRvRml4ZWQoMykgKyAnLCAnICsgZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5sb25GaWVsZF0udG9GaXhlZCgzKSArICc8L2xpPic7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmRhdGVGaWVsZF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+JyArIG1vbWVudC51dGMoZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5kYXRlRmllbGRdKS5mb3JtYXQoJ1lZWVktTU0tREQgaGg6bW06c3NbWl0nKSArICc8L2xpPic7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPGxpPjxpIGNsYXNzPVwiZmEgJyArIGV2ZW50VHlwZUljb24gKyAnXCI+PC9pPiAnICsgZmVhdHVyZS5wcm9wZXJ0aWVzLmV2ZW50X3R5cGUgKyAnPC9saT4nO1xyXG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPC91bD4nO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHBsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5zZXJ2aWNlKCdzZWFyY2hTZXJ2aWNlJywgZnVuY3Rpb24gKFxuICAgICAgICAkaHR0cCxcbiAgICAgICAgJHEsXG4gICAgICAgICRtZFRvYXN0LFxuICAgICAgICBkZWx0YUNvbmZpZyxcbiAgICAgICAgZGVsdGFTZXJ2aWNlLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIGdldEV2ZW50c1BhcmFtcyA9IGZ1bmN0aW9uIChzb3VyY2VzKSB7XG4gICAgICAgICAgICB2YXIgdGVtcG9yYWxGaWx0ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBzdGFydCA9IHR5cGVvZiB0ZW1wb3JhbEZpbHRlci5zdGFydCA9PT0gJ3N0cmluZycgPyB0ZW1wb3JhbEZpbHRlci5zdGFydCA6IHRlbXBvcmFsRmlsdGVyLnN0YXJ0LnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgc3RvcCA9IHR5cGVvZiB0ZW1wb3JhbEZpbHRlci5zdG9wID09PSAnc3RyaW5nJyA/IHRlbXBvcmFsRmlsdGVyLnN0b3AgOiB0ZW1wb3JhbEZpbHRlci5zdG9wLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgc291cmNlVHlwZSA9IHN0YXRlU2VydmljZS5nZXRTb3VyY2VUeXBlKCksXG4gICAgICAgICAgICAgICAgc291cmNlVHlwZUZpbHRlciA9IGRlbHRhQ29uZmlnLnNlcnZlci5zb3VyY2VUeXBlRmllbGQgKyAnPVxcJycgKyBzb3VyY2VUeXBlICsgJ1xcJyBBTkQgJyxcbiAgICAgICAgICAgICAgICBpZGVudGl0aWVzID0gXy5tYXAoc291cmNlcywgJ2lkZW50aXR5JyksXG4gICAgICAgICAgICAgICAgaWRlbnRpdHlGaWx0ZXIgPSAnJztcblxuICAgICAgICAgICAgLy8gaWYgdGhlIGFtb3VudCBvZiBpZGVudGl0aWVzIHNlbGVjdGVkIGlzIGZld2VyIHRoYW4gdGhlIHRvdGFsIGF2YWlsYWJsZSwgcXVlcnkgb24gdGhvc2UgaWRlbnRpdGllcyB0byBzcGVlZCB0aGluZ3MgdXBcbiAgICAgICAgICAgIGlmIChpZGVudGl0aWVzLmxlbmd0aCA8IGRlbHRhQ29uZmlnLnNvdXJjZVR5cGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChpZGVudGl0aWVzLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpdHlGaWx0ZXIgKz0gZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGQgKyAnPScgKyB2YWx1ZSArICcgQU5EICc7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlkZW50aXR5RmlsdGVyID0gZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGQgKyAnIElTIE5PVCBOVUxMIEFORCAnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlcnZpY2U6ICdXRlMnLFxuICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgICAgICAgICAgcmVxdWVzdDogJ0dldEZlYXR1cmUnLFxuICAgICAgICAgICAgICAgIHR5cGVOYW1lOiBkZWx0YUNvbmZpZy5zZXJ2ZXIubGF5ZXJzLmV2ZW50cy53b3Jrc3BhY2UgKyAnOicgKyBkZWx0YUNvbmZpZy5zZXJ2ZXIubGF5ZXJzLmV2ZW50cy5sYXllcixcbiAgICAgICAgICAgICAgICBjcWxfZmlsdGVyOiBzb3VyY2VUeXBlRmlsdGVyICsgaWRlbnRpdHlGaWx0ZXIgKyBkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkICsgJz49JyArIHN0YXJ0ICsgJyBBTkQgJyArIGRlbHRhQ29uZmlnLnNlcnZlci5kYXRlRmllbGQgKyAnPD0nICsgc3RvcCArICcgQU5EIEJCT1goJyArIGRlbHRhQ29uZmlnLnNlcnZlci5sYXllcnMuZXZlbnRzLmdlb21GaWVsZCArICcsICcgKyBzdGF0ZVNlcnZpY2UuZ2V0TWFwQm91bmRzKCkudG9CQm94U3RyaW5nKCkgKyAnKScsXG4gICAgICAgICAgICAgICAgb3V0cHV0Rm9ybWF0OiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldEV2ZW50VHJhY2tzUGFyYW1zID0gZnVuY3Rpb24gKGFjdGl2ZUV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlcnZpY2U6ICdXRlMnLFxuICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgICAgICAgICAgcmVxdWVzdDogJ0dldEZlYXR1cmUnLFxuICAgICAgICAgICAgICAgIHR5cGVOYW1lOiBkZWx0YUNvbmZpZy5zZXJ2ZXIubGF5ZXJzLnRyYWNrcy53b3Jrc3BhY2UgKyAnOicgKyBkZWx0YUNvbmZpZy5zZXJ2ZXIubGF5ZXJzLnRyYWNrcy5sYXllcixcbiAgICAgICAgICAgICAgICBjcWxfZmlsdGVyOiBkZWx0YUNvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkICsgJz1cXCcnICsgYWN0aXZlRXZlbnQucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSArICdcXCcgQU5EICcgKyBkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkICsgJz0nICsgYWN0aXZlRXZlbnQucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSxcbiAgICAgICAgICAgICAgICBvdXRwdXRGb3JtYXQ6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0Q29ycmVsYXRpbmdFdmVudHNQYXJhbXMgPSBmdW5jdGlvbiAoZXZlbnRGZWF0dXJlKSB7XG4gICAgICAgICAgICBpZiAoZXZlbnRGZWF0dXJlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc2VydmljZTogJ1dGUycsXG4gICAgICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3Q6ICdHZXRGZWF0dXJlJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZU5hbWU6IGRlbHRhQ29uZmlnLnNlcnZlci5sYXllcnMudHJhY2tzLndvcmtzcGFjZSArICc6JyArIGRlbHRhQ29uZmlnLnNlcnZlci5sYXllcnMuY29ycmVsYXRpbmdfZXZlbnRzLmxheWVyLFxuICAgICAgICAgICAgICAgICAgICBjcWxfZmlsdGVyOiBkZWx0YUNvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkICsgJ18xPVxcJycgKyBldmVudEZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSArICdcXCcgQU5EICcgKyBkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkICsgJ18xPScgKyBldmVudEZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSxcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0Rm9ybWF0OiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRFdmVudFBsb3REYXRhUGFyYW1zID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB1cmw6IHBhcmFtcy51cmwsXG4gICAgICAgICAgICAgICAgeF9jb2x1bW46IHBhcmFtcy54X2NvbHVtbiB8fCAndGltZScsXG4gICAgICAgICAgICAgICAgeF9zY2FsZTogcGFyYW1zLnhfc2NhbGUgfHwgJ2xpbmVhcicsXG4gICAgICAgICAgICAgICAgeF91bml0czogcGFyYW1zLnhfdW5pdHMgfHwgJ2V2ZW50X3NlY3MnLFxuICAgICAgICAgICAgICAgIHlfY29sdW1uOiBwYXJhbXMueV9jb2x1bW4gfHwgJ2ludGVuc2l0eScsXG4gICAgICAgICAgICAgICAgeV9zY2FsZTogcGFyYW1zLnlfc2NhbGUgfHwgJ2xvZycsXG4gICAgICAgICAgICAgICAgeV91bml0czogcGFyYW1zLnlfdW5pdHMgfHwgZGVsdGFDb25maWcuaW50ZW5zaXR5VW5pdHMsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiBwYXJhbXMuZm9ybWF0IHx8ICdqc29uJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0RXZlbnRJbWFnZURhdGFQYXJhbXMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHVybDogcGFyYW1zLnVybCxcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IHBhcmFtcy5mb3JtYXQgfHwgJ2pzb24nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXRFdmVudHM6IGZ1bmN0aW9uIChzb3VyY2VzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGRlbHRhQ29uZmlnLnNlcnZlci51cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0RXZlbnRzUGFyYW1zKHNvdXJjZXMpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGlmKGVyci5zdGF0dXMgPT09IC0xKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIHJldHJpZXZpbmcgZXZlbnRzLiAoQ09SUyknKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciByZXRyaWV2aW5nIGV2ZW50cy4gU3RhdHVzOiAnICsgZXJyLnN0YXR1cykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRFdmVudFRyYWNrczogZnVuY3Rpb24gKGFjdGl2ZUV2ZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGRlbHRhQ29uZmlnLnNlcnZlci51cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0RXZlbnRUcmFja3NQYXJhbXMoYWN0aXZlRXZlbnQpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGlmKGVyci5zdGF0dXMgPT09IC0xKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIHJldHJpZXZpbmcgZXZlbnQgdHJhY2tzLiAoQ09SUyknKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciByZXRyaWV2aW5nIGV2ZW50IHRyYWNrcy4gU3RhdHVzOiAnICsgZXJyLnN0YXR1cykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRDb3JyZWxhdGluZ0V2ZW50czogZnVuY3Rpb24gKGV2ZW50RGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBkZWx0YUNvbmZpZy5zZXJ2ZXIudXJsLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IGdldENvcnJlbGF0aW5nRXZlbnRzUGFyYW1zKGV2ZW50RGF0YSlcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoZXJyLnN0YXR1cyA9PT0gLTEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgcmV0cmlldmluZyBjb3JyZWxhdGluZyBldmVudHMuIChDT1JTKScpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIHJldHJpZXZpbmcgY29ycmVsYXRpbmcgZXZlbnRzLiBTdGF0dXM6ICcgKyBlcnIuc3RhdHVzKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEV2ZW50UGxvdERhdGE6IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZGVsdGFDb25maWcuZXZlbnRTZXJ2ZXIuYWpheFVybCArICcvcGxvdC1kYXRhLycsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0RXZlbnRQbG90RGF0YVBhcmFtcyhwYXJhbXMpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgcmV0cmlldmluZyBwbG90IGRhdGEuIChDT1JTKScpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRFdmVudEltYWdlRGF0YTogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBkZWx0YUNvbmZpZy5ldmVudFNlcnZlci5hamF4VXJsICsgJy9mcmFtZXMvJyxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBnZXRFdmVudEltYWdlRGF0YVBhcmFtcyhwYXJhbXMpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgcmV0cmlldmluZyBpbWFnZSBkYXRhLiAoQ09SUyknKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuc2VydmljZSgnc3RhdGVTZXJ2aWNlJywgZnVuY3Rpb24gKFxyXG4gICAgICAgICRsb2NhdGlvbixcclxuICAgICAgICAkdGltZW91dCxcclxuICAgICAgICBkZWx0YUNvbmZpZyxcclxuICAgICAgICBtb21lbnQsXHJcbiAgICAgICAgX1xyXG4gICAgKSB7XHJcbiAgICAgICAgdmFyIHF1ZXJ5U3RyaW5nID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xyXG5cclxuICAgICAgICB2YXIgZ290b0V4cGFuZGVkID0gZmFsc2UsXHJcbiAgICAgICAgICAgIGxvY2F0aW9uRmlsdGVyRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgcmVjZW50RXZlbnRMaXN0RXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXJFeHBhbmRlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICBzb3VyY2VGaWx0ZXJFeHBhbmRlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICB0eXBlRmlsdGVyRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgbG9jYXRpb25Gb3JtYXQgPSBxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCxcclxuICAgICAgICAgICAgbWFwQm91bmRzID0ge30sXHJcbiAgICAgICAgICAgIG1hcEJCb3ggPSB7fSxcclxuICAgICAgICAgICAgbWFwWm9vbSA9IG51bGwsXHJcbiAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyID0ge1xyXG4gICAgICAgICAgICAgICAgc3RhcnQ6IHF1ZXJ5U3RyaW5nLnN0YXJ0LFxyXG4gICAgICAgICAgICAgICAgc3RvcDogcXVlcnlTdHJpbmcuc3RvcCxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBxdWVyeVN0cmluZy5kdXJhdGlvbixcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uTGVuZ3RoOiBxdWVyeVN0cmluZy5kdXJhdGlvbkxlbmd0aFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBiYXNlbGF5ZXIgPSBudWxsLFxyXG4gICAgICAgICAgICB2aWV3cG9ydFNpemUgPSB7fSxcclxuICAgICAgICAgICAgYWN0aXZlU291cmNlcyA9IFtdLFxyXG4gICAgICAgICAgICBhY3RpdmVUeXBlcyA9IFtdLFxyXG4gICAgICAgICAgICBldmVudHMgPSBbXSxcclxuICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBudWxsLFxyXG4gICAgICAgICAgICBldmVudExheWVycyA9IG51bGwsXHJcbiAgICAgICAgICAgIHNvdXJjZVR5cGUgPSBxdWVyeVN0cmluZy5zb3VyY2VUeXBlLFxyXG4gICAgICAgICAgICBldmVudERhdGEgPSBudWxsLFxyXG4gICAgICAgICAgICBsYXlvdXRDb21wb25lbnRzID0gW10sXHJcbiAgICAgICAgICAgIGxvYWRpbmdFdmVudHMgPSBmYWxzZSxcclxuICAgICAgICAgICAgdm90ZXIgPSBudWxsLFxyXG4gICAgICAgICAgICB2b3RlcyA9IFtdLFxyXG4gICAgICAgICAgICB2b3RlUmVhc29ucyA9IFtdO1xyXG5cclxuICAgICAgICBpZiAocXVlcnlTdHJpbmcubiB8fCBxdWVyeVN0cmluZy5uZSkge1xyXG4gICAgICAgICAgICBtYXBCQm94ID0ge1xyXG4gICAgICAgICAgICAgICAgZm9ybWF0OiBsb2NhdGlvbkZvcm1hdCxcclxuICAgICAgICAgICAgICAgIG5vcnRoOiBsb2NhdGlvbkZvcm1hdCA9PT0gJ2RkJyA/IHBhcnNlRmxvYXQocXVlcnlTdHJpbmcubikgOiBxdWVyeVN0cmluZy5uLFxyXG4gICAgICAgICAgICAgICAgc291dGg6IGxvY2F0aW9uRm9ybWF0ID09PSAnZGQnID8gcGFyc2VGbG9hdChxdWVyeVN0cmluZy5zKSA6IHF1ZXJ5U3RyaW5nLnMsXHJcbiAgICAgICAgICAgICAgICBlYXN0OiBsb2NhdGlvbkZvcm1hdCA9PT0gJ2RkJyA/IHBhcnNlRmxvYXQocXVlcnlTdHJpbmcuZSkgOiBxdWVyeVN0cmluZy5lLFxyXG4gICAgICAgICAgICAgICAgd2VzdDogbG9jYXRpb25Gb3JtYXQgPT09ICdkZCcgPyBwYXJzZUZsb2F0KHF1ZXJ5U3RyaW5nLncpIDogcXVlcnlTdHJpbmcudyxcclxuICAgICAgICAgICAgICAgIG1ncnNORTogcXVlcnlTdHJpbmcubmUgfHwgJycsXHJcbiAgICAgICAgICAgICAgICBtZ3JzU1c6IHF1ZXJ5U3RyaW5nLnN3IHx8ICcnXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzZXRNYXBCQm94UGFyYW1zOiBmdW5jdGlvbiAobG9jYXRpb24pIHtcclxuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWxvY2F0aW9uLmZvcm1hdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5mb3JtYXQgPSBkZWx0YUNvbmZpZy5kZWZhdWx0TG9jYXRpb25Gb3JtYXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0TG9jYXRpb25Gb3JtYXQobG9jYXRpb24uZm9ybWF0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgYW55dGhpbmcgY2hhbmdlLCB1cGRhdGUgJGxvY2F0aW9uLnNlYXJjaCgpIGFuZCBicm9hZGNhc3Qgbm90aWZpY2F0aW9uIG9mIGNoYW5nZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeVN0cmluZy5uICE9PSBsb2NhdGlvbi5ub3J0aC50b1N0cmluZygpIHx8IHF1ZXJ5U3RyaW5nLnMgIT09IGxvY2F0aW9uLnNvdXRoLnRvU3RyaW5nKCkgfHwgcXVlcnlTdHJpbmcuZSAhPT0gbG9jYXRpb24uZWFzdC50b1N0cmluZygpIHx8IHF1ZXJ5U3RyaW5nLncgIT09IGxvY2F0aW9uLndlc3QudG9TdHJpbmcoKSB8fCBxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCAhPT0gbG9jYXRpb24uZm9ybWF0IHx8IHF1ZXJ5U3RyaW5nLm5lICE9PSBsb2NhdGlvbi5tZ3JzTkUudG9TdHJpbmcoKSB8fCBxdWVyeVN0cmluZy5zdyAhPT0gbG9jYXRpb24ubWdyc1NXLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uLm5vcnRoICE9PSAnJyAmJiBsb2NhdGlvbi5zb3V0aCAhPT0gJycgJiYgbG9jYXRpb24uZWFzdCAhPT0gJycgJiYgbG9jYXRpb24ud2VzdCAhPT0gJycgJiYgbG9jYXRpb24uZm9ybWF0ID09PSAnZGQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5ub3J0aCA9IHBhcnNlRmxvYXQobG9jYXRpb24ubm9ydGgpLnRvRml4ZWQoMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5zb3V0aCA9IHBhcnNlRmxvYXQobG9jYXRpb24uc291dGgpLnRvRml4ZWQoMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5lYXN0ID0gcGFyc2VGbG9hdChsb2NhdGlvbi5lYXN0KS50b0ZpeGVkKDIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ud2VzdCA9IHBhcnNlRmxvYXQobG9jYXRpb24ud2VzdCkudG9GaXhlZCgyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnNldE1hcEJCb3gobG9jYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5uID0gbG9jYXRpb24ubm9ydGggPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLm5vcnRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zID0gbG9jYXRpb24uc291dGggPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLnNvdXRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5lID0gbG9jYXRpb24uZWFzdCA9PT0gJycgPyBudWxsIDogbG9jYXRpb24uZWFzdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcudyA9IGxvY2F0aW9uLndlc3QgPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLndlc3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmxvY2F0aW9uRm9ybWF0ID0gbG9jYXRpb24uZm9ybWF0ID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5mb3JtYXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLm5lID0gbG9jYXRpb24ubWdyc05FID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5tZ3JzTkU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnN3ID0gbG9jYXRpb24ubWdyc1NXID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5tZ3JzU1c7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0TG9jYXRpb25Gb3JtYXQocXVlcnlTdHJpbmcubG9jYXRpb25Gb3JtYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0R290b0V4cGFuZGVkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ290b0V4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRHb3RvRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBnb3RvRXhwYW5kZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMb2NhdGlvbkZpbHRlckV4cGFuZGVkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb25GaWx0ZXJFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TG9jYXRpb25GaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uRmlsdGVyRXhwYW5kZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRSZWNlbnRFdmVudExpc3RFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY2VudEV2ZW50TGlzdEV4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRSZWNlbnRFdmVudExpc3RFeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHJlY2VudEV2ZW50TGlzdEV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0VGVtcG9yYWxGaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRlbXBvcmFsRmlsdGVyRXhwYW5kZWQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB0ZW1wb3JhbEZpbHRlckV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0U291cmNlRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2VGaWx0ZXJFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0U291cmNlRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBzb3VyY2VGaWx0ZXJFeHBhbmRlZCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFR5cGVGaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVGaWx0ZXJFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0VHlwZUZpbHRlckV4cGFuZGVkOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdHlwZUZpbHRlckV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0TWFwQkJveDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hcEJCb3g7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldE1hcEJCb3g6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgICAgICAgIG1hcEJCb3ggPSB2YWw7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldE1hcFpvb206IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtYXBab29tO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRNYXBab29tOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgbWFwWm9vbSA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy56b29tID0gbWFwWm9vbTtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMb2NhdGlvbkZvcm1hdDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uRm9ybWF0O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRMb2NhdGlvbkZvcm1hdDogZnVuY3Rpb24gKGZvcm1hdCkge1xyXG4gICAgICAgICAgICAgICAgbG9jYXRpb25Gb3JtYXQgPSBmb3JtYXQ7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCA9IGxvY2F0aW9uRm9ybWF0O1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldE1hcEJvdW5kczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hcEJvdW5kcztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TWFwQm91bmRzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgbWFwQm91bmRzID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0TWFwQkJveFBhcmFtcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB0aGlzLmxvY2F0aW9uRm9ybWF0LFxyXG4gICAgICAgICAgICAgICAgICAgIG5vcnRoOiBtYXBCb3VuZHMuZ2V0Tm9ydGgoKSxcclxuICAgICAgICAgICAgICAgICAgICBzb3V0aDogbWFwQm91bmRzLmdldFNvdXRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgZWFzdDogbWFwQm91bmRzLmdldEVhc3QoKSxcclxuICAgICAgICAgICAgICAgICAgICB3ZXN0OiBtYXBCb3VuZHMuZ2V0V2VzdCgpXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0VGVtcG9yYWxGaWx0ZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0ZW1wb3JhbEZpbHRlcjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0VGVtcG9yYWxGaWx0ZXI6IGZ1bmN0aW9uIChmaWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHZhciBxc0ZpbHRlciA9IHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFydDogcXVlcnlTdHJpbmcuc3RhcnQsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RvcDogcXVlcnlTdHJpbmcuc3RvcCxcclxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogcXVlcnlTdHJpbmcuZHVyYXRpb24gPyBxdWVyeVN0cmluZy5kdXJhdGlvbiA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25MZW5ndGg6IHF1ZXJ5U3RyaW5nLmR1cmF0aW9uTGVuZ3RoID8gcGFyc2VJbnQocXVlcnlTdHJpbmcuZHVyYXRpb25MZW5ndGgpIDogbnVsbFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHZhciBmaWx0ZXJTdGFydCA9ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclN0b3AgPSAnJztcclxuICAgICAgICAgICAgICAgIGlmICghYW5ndWxhci5lcXVhbHMocXNGaWx0ZXIsIGZpbHRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsdGVyLmR1cmF0aW9uICYmIGZpbHRlci5kdXJhdGlvbkxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdGFydCA9IG1vbWVudC51dGMoKS5zdWJ0cmFjdChmaWx0ZXIuZHVyYXRpb25MZW5ndGgsIGZpbHRlci5kdXJhdGlvbikuc3RhcnRPZignZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdG9wID0gbW9tZW50LnV0YygpLmVuZE9mKCdkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnN0YXJ0ID0gZmlsdGVyU3RhcnQudG9JU09TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc3RvcCA9IGZpbHRlclN0b3AudG9JU09TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZHVyYXRpb24gPSBmaWx0ZXIuZHVyYXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmR1cmF0aW9uTGVuZ3RoID0gZmlsdGVyLmR1cmF0aW9uTGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlclN0YXJ0ID0gbW9tZW50LnV0YyhmaWx0ZXIuc3RhcnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdG9wID0gbW9tZW50LnV0YyhmaWx0ZXIuc3RvcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnN0YXJ0ID0gZmlsdGVyU3RhcnQudG9JU09TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc3RvcCA9IGZpbHRlclN0b3AudG9JU09TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZHVyYXRpb24gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5kdXJhdGlvbkxlbmd0aCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlci5zdGFydCA9IGZpbHRlclN0YXJ0LnRvRGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlci5zdG9wID0gZmlsdGVyU3RvcC50b0RhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB0ZW1wb3JhbEZpbHRlciA9IGZpbHRlcjtcclxuICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0ZW1wb3JhbEZpbHRlci5zdGFydCB8fCAhdGVtcG9yYWxGaWx0ZXIuc3RvcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wb3JhbEZpbHRlciA9IGZpbHRlcjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEJhc2VsYXllcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VsYXllcjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0QmFzZWxheWVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGJhc2VsYXllciA9IGxheWVyO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuYmFzZWxheWVyID0gYmFzZWxheWVyLmlkO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZpZXdwb3J0U2l6ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZpZXdwb3J0U2l6ZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Vmlld3BvcnRTaXplOiBmdW5jdGlvbiAoc2l6ZSkge1xyXG4gICAgICAgICAgICAgICAgdmlld3BvcnRTaXplID0gc2l6ZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0QWN0aXZlU291cmNlczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjdGl2ZVNvdXJjZXM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEFjdGl2ZVNvdXJjZXM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmVTb3VyY2VzID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHZhciBzb3VyY2VTdHJpbmcgPSBfLm1hcChhY3RpdmVTb3VyY2VzLCAnbmFtZScpLmpvaW4oJywnKTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnNvdXJjZXMgPSBzb3VyY2VTdHJpbmcgIT09ICcnID8gc291cmNlU3RyaW5nIDogbnVsbDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRBY3RpdmVUeXBlczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjdGl2ZVR5cGVzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRBY3RpdmVUeXBlczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGFjdGl2ZVR5cGVzID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHZhciB0eXBlU3RyaW5nID0gXy5tYXAoYWN0aXZlVHlwZXMsICduYW1lJykuam9pbignLCcpO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcudHlwZXMgPSB0eXBlU3RyaW5nICE9PSAnJyA/IHR5cGVTdHJpbmcgOiBudWxsO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEV2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50cztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0RXZlbnRzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnRzID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0QWN0aXZlRXZlbnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhY3RpdmVFdmVudDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0QWN0aXZlRXZlbnQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmVFdmVudCA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZ1tkZWx0YUNvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9IGRhdGEgPyBkYXRhLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gOiBudWxsO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmdbZGVsdGFDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPSBkYXRhID8gZGF0YS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdIDogbnVsbDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRFdmVudExheWVyczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50TGF5ZXJzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRFdmVudExheWVyczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50TGF5ZXJzID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0U291cmNlVHlwZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZVR5cGU7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFNvdXJjZVR5cGU6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBzb3VyY2VUeXBlID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnNvdXJjZVR5cGUgPSBzb3VyY2VUeXBlO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEV2ZW50RGF0YTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50RGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0RXZlbnREYXRhOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnREYXRhID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0TGF5b3V0Q29tcG9uZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxheW91dENvbXBvbmVudHM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldExheW91dENvbXBvbmVudHM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBsYXlvdXRDb21wb25lbnRzID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0TG9hZGluZ0V2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvYWRpbmdFdmVudHM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldExvYWRpbmdFdmVudHM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBsb2FkaW5nRXZlbnRzID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2b3RlcjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Vm90ZXI6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB2b3RlciA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdm90ZXM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFZvdGVzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdm90ZXMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3RlUmVhc29uczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZvdGVSZWFzb25zO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRWb3RlUmVhc29uczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHZvdGVSZWFzb25zID0gZGF0YTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxufSkoKTtcclxuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuc2VydmljZSgndm90ZVNlcnZpY2UnLCBmdW5jdGlvbiAoXHJcbiAgICAgICAgJGh0dHAsXHJcbiAgICAgICAgJHEsXHJcbiAgICAgICAgZGVsdGFDb25maWdcclxuICAgICkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGdldFJlYXNvbnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGRlbHRhQ29uZmlnLnZvdGVBcGkudXJsICsgJy9yZWFzb25zJ1xyXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3RlcnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGRlbHRhQ29uZmlnLnZvdGVBcGkudXJsICsgJy92b3RlcnMnXHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVyOiBmdW5jdGlvbiAodm90ZXJfbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogZGVsdGFDb25maWcudm90ZUFwaS51cmwgKyAnL3ZvdGVycy8nICsgdm90ZXJfbmFtZVxyXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBhZGRWb3RlcjogZnVuY3Rpb24gKHZvdGVyKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChkZWx0YUNvbmZpZy52b3RlQXBpLnVybCArICcvdm90ZXJzJywgdm90ZXIpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGRlbHRhQ29uZmlnLnZvdGVBcGkudXJsICsgJy92b3RlcydcclxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZXNCeVZvdGVyOiBmdW5jdGlvbiAodm90ZXJfbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogZGVsdGFDb25maWcudm90ZUFwaS51cmwgKyAnL3ZvdGVzL3ZvdGVyLycgKyB2b3Rlcl9uYW1lXHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVCeUlkOiBmdW5jdGlvbiAodm90ZV9pZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogZGVsdGFDb25maWcudm90ZUFwaS51cmwgKyAnL3ZvdGVzLycgKyB2b3RlX2lkXHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNhc3RWb3RlOiBmdW5jdGlvbiAodm90ZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwLnBvc3QoZGVsdGFDb25maWcudm90ZUFwaS51cmwgKyAnL3ZvdGVzJywgdm90ZSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB1cGRhdGVWb3RlOiBmdW5jdGlvbiAodm90ZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwLnB1dChkZWx0YUNvbmZpZy52b3RlQXBpLnVybCArICcvdm90ZXMvJyArIHZvdGUudm90ZV9pZCwgdm90ZSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG4gXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuY29udHJvbGxlcignZXZlbnRzQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcclxuICAgICAgICAkc2NvcGUsXHJcbiAgICAgICAgJHRpbWVvdXQsXHJcbiAgICAgICAgJGxvY2F0aW9uLFxyXG4gICAgICAgIGRlbHRhQ29uZmlnLFxyXG4gICAgICAgIGRlbHRhU2VydmljZSxcclxuICAgICAgICBzZWFyY2hTZXJ2aWNlLFxyXG4gICAgICAgIHN0YXRlU2VydmljZSxcclxuICAgICAgICBsZWFmbGV0RGF0YSxcclxuICAgICAgICBMLFxyXG4gICAgICAgICQsXHJcbiAgICAgICAgX1xyXG4gICAgKSB7XHJcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcclxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXHJcbiAgICAgICAgICAgIG1hcCA9IHt9LFxyXG4gICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQgPSBudWxsLFxyXG4gICAgICAgICAgICBjdXJySWR4ID0gMCxcclxuICAgICAgICAgICAgZXZlbnRMYXllcnMgPSBbXSxcclxuICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBudWxsO1xyXG5cclxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XHJcbiAgICAgICAgdm0uZGVsdGFDb25maWcgPSBkZWx0YUNvbmZpZztcclxuICAgICAgICB2bS5ldmVudHNIZWlnaHQgPSAnJztcclxuICAgICAgICB2bS5ldmVudHNXaWR0aCA9ICcnO1xyXG4gICAgICAgIHZtLm1hcEV2ZW50cyA9IFtdO1xyXG4gICAgICAgIHZtLmxvYWRpbmcgPSB0cnVlO1xyXG5cclxuICAgICAgICB2YXIgYWN0aXZhdGVNYXBFdmVudCA9IGZ1bmN0aW9uIChtYXBFdmVudCkge1xyXG4gICAgICAgICAgICB2YXIgYWN0aXZlTWFwTGF5ZXIgPSBfLmZpbmQoZXZlbnRMYXllcnMsIHsgZmVhdHVyZTogbWFwRXZlbnQgfSk7XHJcbiAgICAgICAgICAgIGlmIChhY3RpdmVNYXBMYXllcikge1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlTWFwTGF5ZXIuc2V0U3R5bGUoeyBjb2xvcjogJyNiMmZmNTknLCBmaWxsT3BhY2l0eTogMC44IH0pO1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlTWFwTGF5ZXIuYnJpbmdUb0Zyb250KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5zaG93UG9wdXAgPSBmdW5jdGlvbiAoJGV2ZW50LCBtYXBFdmVudCkge1xyXG4gICAgICAgICAgICBMLnBvcHVwKHsgYXV0b1BhbjogZmFsc2UgfSlcclxuICAgICAgICAgICAgICAgIC5zZXRMYXRMbmcoTC5sYXRMbmcobWFwRXZlbnQucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIubGF0RmllbGRdLCBtYXBFdmVudC5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5sb25GaWVsZF0pKVxyXG4gICAgICAgICAgICAgICAgLnNldENvbnRlbnQoZGVsdGFTZXJ2aWNlLmdldExlYWZsZXRQb3B1cENvbnRlbnQobWFwRXZlbnQpKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5PbihtYXApO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZtLmhpZGVQb3B1cCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgbWFwLmNsb3NlUG9wdXAoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5zaG93RXZlbnQgPSBmdW5jdGlvbiAoJGV2ZW50LCBtYXBFdmVudCkge1xyXG4gICAgICAgICAgICAvLyBjbGVhciBvbGQgZXZlbnQgZGF0YVxyXG4gICAgICAgICAgICBpZiAoYWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhY3RpdmVNYXBMYXllciA9IF8uZmluZChldmVudExheWVycywgeyBmZWF0dXJlOiBhY3RpdmVFdmVudCB9KTtcclxuICAgICAgICAgICAgICAgIGFjdGl2ZU1hcExheWVyLnNldFN0eWxlKHsgY29sb3I6IGFjdGl2ZU1hcExheWVyLmZlYXR1cmUuZXZlbnRTb3VyY2UuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjIgfSk7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmVNYXBMYXllci5icmluZ1RvQmFjaygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudERhdGEobnVsbCk7XHJcbiAgICAgICAgICAgIG1hcC5jbG9zZVBvcHVwKCk7XHJcbiAgICAgICAgICAgIG1hcEV2ZW50LnNjcm9sbFRvID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGFjdGl2YXRlTWFwRXZlbnQobWFwRXZlbnQpO1xyXG4gICAgICAgICAgICBhY3RpdmVFdmVudCA9IG1hcEV2ZW50O1xyXG4gICAgICAgICAgICAvLyB1cGRhdGUgdGhlIGV2ZW50IGN1cnJlbnRseSBiZWluZyB2aWV3ZWRcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZUV2ZW50KGFjdGl2ZUV2ZW50KTtcclxuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBtYXAgPSBkYXRhO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RXZlbnRMYXllcnMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBldmVudExheWVycyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEV2ZW50cygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZtLm1hcEV2ZW50cyA9IF8ub3JkZXJCeShuZXdWYWx1ZSwgWydwcm9wZXJ0aWVzLmV2ZW50X2xhdCcsICdwcm9wZXJ0aWVzLmV2ZW50X2xvbiddKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGZvciB2YWx1ZXMgaW4gcXVlcnlzdHJpbmcgYW5kIGdvIHRvIGFuIGV2ZW50IGlmIGFwcGxpY2FibGVcclxuICAgICAgICAgICAgaWYgKHFzW2RlbHRhQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICYmIHFzW2RlbHRhQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHJvZHVjdF9pZCA9IHFzW2RlbHRhQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGFzZXRfaWQgPSBwYXJzZUludChxc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBfLmZpbmQodm0ubWFwRXZlbnRzLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gPT09IHByb2R1Y3RfaWQgJiYgZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID09PSBkYXRhc2V0X2lkO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZhdGVNYXBFdmVudChhY3RpdmVFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlRXZlbnQuc2Nyb2xsVG8gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgZXZlbnQgY3VycmVudGx5IGJlaW5nIHZpZXdlZFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBY3RpdmVFdmVudChhY3RpdmVFdmVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChldmVudHNMYXlvdXRDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIuc2V0VGl0bGUoZXZlbnRzTGF5b3V0Q29tcG9uZW50LnN0YXRlLnRlbXBsYXRlVGl0bGUgKyAnICgnICsgdm0ubWFwRXZlbnRzLmxlbmd0aCArICcpJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRMYXlvdXRDb21wb25lbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgZXZlbnRzTGF5b3V0Q29tcG9uZW50ID0gXy5maW5kKG5ld1ZhbHVlLCB7IHN0YXRlOiB7IHRlbXBsYXRlTmFtZTogJ2V2ZW50cycgfSB9KTtcclxuICAgICAgICAgICAgZXZlbnRzTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5zZXRUaXRsZShldmVudHNMYXlvdXRDb21wb25lbnQuc3RhdGUudGVtcGxhdGVUaXRsZSArICcgKCcgKyB2bS5tYXBFdmVudHMubGVuZ3RoICsgJyknKTtcclxuXHJcbiAgICAgICAgICAgIHZtLmV2ZW50c0hlaWdodCA9IGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xyXG4gICAgICAgICAgICB2bS5ldmVudHNXaWR0aCA9IGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIud2lkdGg7XHJcblxyXG4gICAgICAgICAgICAvLyBzZXQgZXZlbnQgbGlzdGVuZXIgZm9yIGNvbnRhaW5lciByZXNpemVcclxuICAgICAgICAgICAgZXZlbnRzTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5vbigncmVzaXplJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgLy8gdXNlIGEgJHRpbWVvdXQgdG8gbm90aWZ5IGFuZ3VsYXIgb2YgdGhlIGNoYW5nZVxyXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLmV2ZW50c0hlaWdodCA9IGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLmV2ZW50c1dpZHRoID0gZXZlbnRzTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci53aWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAvLyB0cmlnZ2VyIGEgZmFrZSB3aW5kb3cgcmVzaXplIHRvIGZvcmNlIG1kLXZpcnV0YWwtcmVwZWF0LWNvbnRhaW5lciB0byByZWRyYXdcclxuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQod2luZG93KS50cmlnZ2VySGFuZGxlcigncmVzaXplJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRMb2FkaW5nRXZlbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdm0ubG9hZGluZyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEFjdGl2ZUV2ZW50KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XHJcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgY3VycklkeCA9IF8uaW5kZXhPZih2bS5tYXBFdmVudHMsIG5ld1ZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZS5zY3JvbGxUbykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhICR0aW1lb3V0IHRvIG5vdGlmeSBhbmd1bGFyIG9mIHRoZSBjaGFuZ2VcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnRvcEluZGV4ID0gY3VycklkeCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjUwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuIFVOQ0xBU1NJRklFRFxyXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXHJcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXHJcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXHJcbiBcclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5jb250cm9sbGVyKCdldmVudFZpZXdlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHNjb3BlLFxyXG4gICAgICAgICRxLFxyXG4gICAgICAgICR0aW1lb3V0LFxyXG5cdFx0ICAgICRtZERpYWxvZyxcclxuICAgICAgICAkbWRUb2FzdCxcclxuICAgICAgICBkZWx0YUNvbmZpZyxcclxuICAgICAgICBzdGF0ZVNlcnZpY2UsXHJcbiAgICAgICAgc2VhcmNoU2VydmljZSxcclxuICAgICAgICB2b3RlU2VydmljZSxcclxuICAgICAgICBWb3RlLFxyXG4gICAgICAgIFdlYndvcmtlcixcclxuICAgICAgICBtb21lbnQsXHJcbiAgICAgICAgaG90a2V5cyxcclxuICAgICAgICBjMyxcclxuICAgICAgICBkMyxcclxuICAgICAgICBfXHJcbiAgICApIHtcclxuICAgICAgICB2YXIgdm0gPSB0aGlzLFxyXG4gICAgICAgICAgICBwbG90UmVzdWx0cyxcclxuICAgICAgICAgICAgcGxvdFJlc3VsdHNBcnIsXHJcbiAgICAgICAgICAgIGltYWdlUmVzdWx0cyxcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdQbG90UmVzdWx0cyxcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdJbWFnZVJlc3VsdHMsXHJcbiAgICAgICAgICAgIGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50ID0gbnVsbCxcclxuICAgICAgICAgICAgZnJhbWVzLFxyXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lcyxcclxuICAgICAgICAgICAgYW5pbWF0aW9uRnJhbWVzLFxyXG4gICAgICAgICAgICB4U3RhcnRlZCxcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdEYXRlRGlmZixcclxuICAgICAgICAgICAgY2hhcnQsXHJcbiAgICAgICAgICAgIGNoYXJ0RGF0YSxcclxuICAgICAgICAgICAgY2hhcnRXb3JrZXIsXHJcbiAgICAgICAgICAgIGltYWdlV29ya2VyLFxyXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ltYWdlV29ya2VyLFxyXG4gICAgICAgICAgICBzdGFydEdyaWRMaW5lRWwsXHJcbiAgICAgICAgICAgIHN0b3BHcmlkTGluZUVsLFxyXG4gICAgICAgICAgICBhbmltYXRlLFxyXG4gICAgICAgICAgICBmcmFtZUlkeCxcclxuICAgICAgICAgICAgaGFzQ29ycmVsYXRpb24sXHJcbiAgICAgICAgICAgIGNoYXJ0Rm9jdXMsXHJcbiAgICAgICAgICAgIGFuaW1hdGlvbkRlbGF5LFxyXG4gICAgICAgICAgICBpc0FuaW1hdGluZztcclxuXHJcbiAgICAgICAgdm0uZXZlbnRWaWV3ZXJIZWlnaHQgPSAnJztcclxuICAgICAgICB2bS5ldmVudFZpZXdlcldpZHRoID0gJyc7XHJcblxyXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBwbG90UmVzdWx0cyA9IFtdO1xyXG4gICAgICAgICAgICBwbG90UmVzdWx0c0FyciA9IFtdO1xyXG4gICAgICAgICAgICBpbWFnZVJlc3VsdHMgPSBbXTtcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdQbG90UmVzdWx0cyA9IFtdO1xyXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ltYWdlUmVzdWx0cyA9IFtdO1xyXG4gICAgICAgICAgICBmcmFtZXMgPSBbXTtcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZXMgPSBbXTtcclxuICAgICAgICAgICAgYW5pbWF0aW9uRnJhbWVzID0gW107XHJcbiAgICAgICAgICAgIHhTdGFydGVkID0gbnVsbDtcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdEYXRlRGlmZiA9IG51bGw7XHJcbiAgICAgICAgICAgIGNoYXJ0ID0gbnVsbDtcclxuICAgICAgICAgICAgY2hhcnREYXRhID0gW107XHJcbiAgICAgICAgICAgIGNoYXJ0V29ya2VyID0gbnVsbDtcclxuICAgICAgICAgICAgaW1hZ2VXb3JrZXIgPSBudWxsO1xyXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ltYWdlV29ya2VyID0gbnVsbDtcclxuICAgICAgICAgICAgc3RhcnRHcmlkTGluZUVsID0gbnVsbDtcclxuICAgICAgICAgICAgc3RvcEdyaWRMaW5lRWwgPSBudWxsO1xyXG4gICAgICAgICAgICBhbmltYXRlID0gbnVsbDtcclxuICAgICAgICAgICAgZnJhbWVJZHggPSAwO1xyXG4gICAgICAgICAgICBoYXNDb3JyZWxhdGlvbiA9IG51bGw7XHJcbiAgICAgICAgICAgIGNoYXJ0Rm9jdXMgPSBbXTtcclxuICAgICAgICAgICAgYW5pbWF0aW9uRGVsYXkgPSBudWxsO1xyXG4gICAgICAgICAgICBpc0FuaW1hdGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xyXG4gICAgICAgICAgICB2bS5kZWx0YUNvbmZpZyA9IGRlbHRhQ29uZmlnO1xyXG4gICAgICAgICAgICB2bS5fID0gXztcclxuICAgICAgICAgICAgdm0udHJhY2tGZWF0dXJlID0gbnVsbDtcclxuXHRcdFx0dm0uZXZlbnRQcm9wcyA9IG51bGw7XHJcblx0XHRcdHZtLmV2ZW50X2g1X3VybCA9IG51bGw7XHJcblx0XHRcdHZtLmNvcnJlbGF0ZWRFdmVudFByb3BzID0gbnVsbDtcclxuXHRcdFx0dm0uY29ycmVsYXRlZF9oNV91cmwgPSBudWxsO1xyXG4gICAgICAgICAgICB2bS5ldmVudERhdGEgPSBudWxsO1xyXG4gICAgICAgICAgICB2bS5hY3RpdmVJbWFnZUNhcmQgPSBudWxsO1xyXG4gICAgICAgICAgICB2bS5zZWxlY3RlZEltYWdlQ2FyZCA9IG51bGw7XHJcbiAgICAgICAgICAgIHZtLmV2ZW50SW1hZ2VDYXJkcyA9IFtdO1xyXG4gICAgICAgICAgICB2bS5jb3JyZWxhdGluZ0V2ZW50SW1hZ2VDYXJkcyA9IFtdO1xyXG4gICAgICAgICAgICB2bS5hdmFpbGFibGVJbWFnZUNhcmRzID0gW107XHJcbiAgICAgICAgICAgIHZtLmxvYWRpbmdDaGFydCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB2bS5sb2FkaW5nQW5pbWF0aW9uID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHZtLnZvdGVyID0gc3RhdGVTZXJ2aWNlLmdldFZvdGVyKCk7XHJcbiAgICAgICAgICAgIHZtLnZvdGVzID0gc3RhdGVTZXJ2aWNlLmdldFZvdGVzKCk7XHJcbiAgICAgICAgICAgIHZtLnZvdGVSZWFzb25zID0gc3RhdGVTZXJ2aWNlLmdldFZvdGVSZWFzb25zKCk7XHJcbiAgICAgICAgICAgIHZtLnZvdGVPYmogPSBuZXcgVm90ZSgpO1xyXG4gICAgICAgICAgICB2bS5zZW5zb3JzID0gW107XHJcbiAgICAgICAgICAgIHZtLmFjdGl2ZVNlbnNvciA9IHt9O1xyXG4gICAgICAgICAgICB2bS5wbGF5YmFjayA9IHRydWU7XHJcbiAgICAgICAgICAgIHZtLnBsYXliYWNrRGlyZWN0aW9uID0gJ2ZvcndhcmQnO1xyXG4gICAgICAgICAgICB2bS5ldmVudEVycm9yID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHZtLmludGVybmFsU291cmNlID0gXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIHZtLmV4dGVybmFsU291cmNlID0gXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IGZhbHNlIH0pO1xyXG5cclxuICAgICAgICAgICAgaG90a2V5cy5iaW5kVG8oJHNjb3BlKVxyXG4gICAgICAgICAgICAgICAgLmFkZCh7XHJcbiAgICAgICAgICAgICAgICAgICAgY29tYm86ICdsZWZ0JyxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1N0ZXAgQmFjaycsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0uc3RlcCgnYmFja3dhcmQnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KS5hZGQoe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAncmlnaHQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU3RlcCBGb3J3YXJkJyxcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5zdGVwKCdmb3J3YXJkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSkuYWRkKHtcclxuICAgICAgICAgICAgICAgICAgICBjb21ibzogJ3VwJyxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BsYXkvUGF1c2UgRm9yd2FyZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEaXJlY3Rpb24gPSAnZm9yd2FyZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnRvZ2dsZVBsYXliYWNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSkuYWRkKHtcclxuICAgICAgICAgICAgICAgICAgICBjb21ibzogJ2Rvd24nLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGxheS9QYXVzZSBCYWNrd2FyZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEaXJlY3Rpb24gPSAnYmFja3dhcmQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS50b2dnbGVQbGF5YmFjaygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2YgKGNoYXJ0KSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZSBoYXMgbmV2ZXIgYmVlbiBjYWxsZWRcclxuICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlSW1hZ2VBcnIgKGltYWdlUmVzdWx0cywgY29ycmVsYXRpbmdEYXRlRGlmZikge1xyXG4gICAgICAgICAgICBpbXBvcnRTY3JpcHRzKGxvY2F0aW9uLm9yaWdpbiArICcvc2NyaXB0cy93ZWJ3b3JrZXJEZXBzL2xvZGFzaC5qcycpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcclxuXHJcbiAgICAgICAgICAgIHZhciBpbWFnZUFycnMgPSBbXTtcclxuICAgICAgICAgICAgXy5mb3JFYWNoKGltYWdlUmVzdWx0cywgZnVuY3Rpb24gKGltYWdlUmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goaW1hZ2VSZXN1bHQucmVzdWx0cywgZnVuY3Rpb24gKGltYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGltYWdlLmlzQ29ycmVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm9ybWFsaXplIHRpbWUgdmFsdWVzIGlmIGEgZGlmZmVyZW5jZSBpbiBzdGFydFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkYXRlcyBpcyBwcmVzZW50LiBjb3JyZWxhdGluZ0RhdGVEaWZmIHdpbGwgYmUgcG9zaXRpdmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hlbiB0aGUgY29ycmVsYXRpbmcgZXZlbnQgc3RhcnRlZCB2YWx1ZSBpcyBsYXRlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGFuIHRoZSBldmVudCBzdGFydGVkIHZhbHVlLCBhbmQgdmljZSB2ZXJzYVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWFnZS50aW1lc3RhbXAgPSBjb3JyZWxhdGluZ0RhdGVEaWZmID8gaW1hZ2UudGltZXN0YW1wIC0gY29ycmVsYXRpbmdEYXRlRGlmZiA6IGltYWdlLnRpbWVzdGFtcDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGltYWdlLnZhbHVlcyA9IF8uZmxhdE1hcChpbWFnZS52YWx1ZXMsIGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1hZ2UubWluIDwgMCB8fCBpbWFnZS5tYXggPiAyNTUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFwcGx5IHByb3BlciAwLTI1NSBzY2FsZSB0byBpbnZhbGlkIHZhbHVlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG11bHRpcGxpZXIgPSAyNTUgLyBNYXRoLmFicyhpbWFnZS5tYXggLSBpbWFnZS5taW4pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSAodmFsdWUgLSBpbWFnZS5taW4pICogbXVsdGlwbGllcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3ZhbHVlLCB2YWx1ZSwgdmFsdWUsIDI1NV07XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VBcnJzLnB1c2goaW1hZ2UpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGltYWdlQXJycztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB1cGRhdGVBbmltYXRpb25GcmFtZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGVBbmltYXRpb25GcmFtZXMnKTtcclxuICAgICAgICAgICAgYW5pbWF0aW9uRnJhbWVzID0gW107XHJcbiAgICAgICAgICAgIGZyYW1lSWR4ID0gMDtcclxuXHJcbiAgICAgICAgICAgIC8vIGlzb2xhdGUgZnJhbWVzIGZvciBjdXJyZW50bHkgYWN0aXZlIHNlbnNvciBjYXJkXHJcbiAgICAgICAgICAgIGFuaW1hdGlvbkZyYW1lcyA9IF8uZmlsdGVyKGhhc0NvcnJlbGF0aW9uID8gY29ycmVsYXRpbmdGcmFtZXMgOiBmcmFtZXMsIGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZi5zZW5zb3IuaW5jbHVkZXModm0uYWN0aXZlSW1hZ2VDYXJkLnNlbnNvcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gb3JkZXIgZnJhbWVzIGFycmF5IGJ5IHZhbHVlICh0aW1lKVxyXG4gICAgICAgICAgICBhbmltYXRpb25GcmFtZXMgPSBfLnNvcnRCeShhbmltYXRpb25GcmFtZXMsICd2YWx1ZScpO1xyXG5cclxuICAgICAgICAgICAgLy8gZGl2aWRlIGxhcmdlciBmcmFtZSBhcnJheXMgaW50byBjaHVua3MgdG8gaW1wcm92ZSBwbGF5YmFja1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhhbmltYXRpb25GcmFtZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgaWYgKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPiAxMDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBjaHVua1NpemUgPSAwO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPCAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjaHVua1NpemUgPSBNYXRoLmZsb29yKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggLyAyMCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPj0gMjAwICYmIGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPCA1MDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjaHVua1NpemUgPSBNYXRoLmZsb29yKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggLyAxNSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNodW5rU2l6ZSA9IE1hdGguZmxvb3IoYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCAvIDEwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGFuaW1hdGlvbkZyYW1lcyA9IF8uY2h1bmsoYW5pbWF0aW9uRnJhbWVzLCBjaHVua1NpemUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uRnJhbWVzID0gXy5jaHVuayhhbmltYXRpb25GcmFtZXMsIDEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCA8IDI1KSB7XHJcbiAgICAgICAgICAgICAgICBhbmltYXRpb25EZWxheSA9IDUwO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPj0gMjUgJiYgYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCA8IDUwKSB7XHJcbiAgICAgICAgICAgICAgICBhbmltYXRpb25EZWxheSA9IDI1O1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPj0gNTAgJiYgYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCA8IDEwMCkge1xyXG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uRGVsYXkgPSAxMDtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChhbmltYXRpb25GcmFtZXMubGVuZ3RoID49IDEwMCAmJiBhbmltYXRpb25GcmFtZXMubGVuZ3RoIDwgMjAwKSB7XHJcbiAgICAgICAgICAgICAgICBhbmltYXRpb25EZWxheSA9IDU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBhbmltYXRpb25EZWxheSA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhbmltYXRpb25GcmFtZXMubGVuZ3RoID4gMCAmJiAhaXNBbmltYXRpbmcgJiYgYW5pbWF0ZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gcHJldmlvdXMgYW5pbWF0aW9uRnJhbWVzIGhhZCBubyBsZW5ndGgsIHNvIGluaXQgYW5pbWF0aW9uXHJcbiAgICAgICAgICAgICAgICBhbmltYXRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZ2VuZXJhdGVJbWFnZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgYW5pbWF0aW9uIGltYWdlIGFycmF5IGluIGEgd2ViIHdvcmtlciB0byBhdm9pZCBibG9ja2luZyB0aGUgVUlcclxuICAgICAgICAgICAgaW1hZ2VXb3JrZXIgPSBXZWJ3b3JrZXIuY3JlYXRlKGNyZWF0ZUltYWdlQXJyKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHN0YXJ0IHRoZSB3ZWIgd29ya2VyIGFuZCB3YWl0IGZvciB0aGUgcmVzdWx0XHJcbiAgICAgICAgICAgIGltYWdlV29ya2VyLnJ1bihpbWFnZVJlc3VsdHMsIGNvcnJlbGF0aW5nRGF0ZURpZmYpLnRoZW4oZnVuY3Rpb24gKGltYWdlQXJycykge1xyXG4gICAgICAgICAgICAgICAgLy8gZ3JvdXAgaW1hZ2UgYXJyYXlzIGJ5IHNlbnNvciB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgaW1hZ2VBcnJzID0gXy5ncm91cEJ5KGltYWdlQXJycywgJ3NlbnNvcicpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGluaXQgdmFycyB1c2VkIGluc2lkZSBhbmltYXRlIGZ1bmN0aW9uXHJcbiAgICAgICAgICAgICAgICB2YXIgZnJhbWVJbWFnZXMgPSBfLmZsYXR0ZW4oXy52YWx1ZXMoaW1hZ2VBcnJzKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZnJhbWVJZHggPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhcnJheSBvZiBhbGwgcG9pbnRzIGluIGltYWdlQXJyc1xyXG4gICAgICAgICAgICAgICAgZnJhbWVzID0gXy5tYXAoY2hhcnREYXRhLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gXy5rZXlzKGQpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5zb3IgPSBfLmZpbmQoa2V5cywgZnVuY3Rpb24gKGspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBrICE9PSAnaXNDb3JyZWxhdGlvbicgJiYgayAhPT0gJ3RpbWUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGQudGltZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6ICdmcmFtZS1saW5lIHRpbWUtJyArIF8ucmVwbGFjZShkLnRpbWUsICcuJywgJycpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5zb3I6IHNlbnNvclxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZnJhbWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBzb3J0IGJ5IHZhbHVlICh0aW1lKSBhbmQgZHJhdyBwbGF5YmFjayBsaW5lcyB1c2luZyBDMyB4Z3JpZHMgYXBpXHJcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVzID0gXy5zb3J0QnkoZnJhbWVzLCAndmFsdWUnKTtcclxuICAgICAgICAgICAgICAgICAgICBjaGFydC54Z3JpZHMoZnJhbWVzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSBhbmltYXRlIGZyYW1lcyBmb3Igc2VsZWN0ZWQgc2Vuc29yXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlQW5pbWF0aW9uRnJhbWVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkcmF3SW1hZ2UgPSBmdW5jdGlvbiAoY3R4LCBjYW52YXMsIGltYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNsZWFyIHByZXZpb3VzIGRyYXdpbmdcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHdpZHRoIGFuZCBoZWlnaHQgdG8gbWF0Y2ggaW1hZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBpbWFnZS5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5jYW52YXMud2lkdGggPSBpbWFnZS53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCBhIHBvaW50ZXIgdG8gdGhlIGN1cnJlbnQgbG9jYXRpb24gaW4gdGhlIGltYWdlLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFsZXR0ZSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTsgLy94LHksdyxoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdyYXAgeW91ciBhcnJheSBhcyBhIFVpbnQ4QXJyYXlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFsZXR0ZS5kYXRhLnNldChuZXcgVWludDhBcnJheShpbWFnZS52YWx1ZXMpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVwb3N0IHRoZSBkYXRhLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHgucHV0SW1hZ2VEYXRhKHBhbGV0dGUsIDAsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhbmltYXRlSW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZHJhdyB0aGUgaW5pdGlhbCBpbWFnZSBmb3IgZWFjaCBjaGlwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChfLnZhbHVlcyhpbWFnZUFycnMpLCBmdW5jdGlvbiAoaW1hZ2VBcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBhbmd1bGFyLmVsZW1lbnQoJy4nICsgXy5yZXBsYWNlKGltYWdlQXJyWzBdLnNlbnNvciwgJyAnLCAnJykpWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYXdJbWFnZShjdHgsIGNhbnZhcywgaW1hZ2VBcnJbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlSW5pdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQW5pbWF0aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhpZGUgcHJldmlvdXMgZ3JpZCBsaW5lIGlmIGRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydEdyaWRMaW5lRWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydEdyaWRMaW5lRWwuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdG9wR3JpZExpbmVFbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BHcmlkTGluZUVsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgZ3JpZCBsaW5lIGFzc29jaWF0ZWQgd2l0aCBjdXJyZW50IGZyYW1lIGFuZCBzaG93IGl0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydEdyaWRMaW5lRWwgPSBhbmd1bGFyLmVsZW1lbnQoJy50aW1lLScgKyBfLnJlcGxhY2UoYW5pbWF0aW9uRnJhbWVzW2ZyYW1lSWR4XVswXS52YWx1ZSwgJy4nLCAnJykpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcEdyaWRMaW5lRWwgPSBhbmd1bGFyLmVsZW1lbnQoJy50aW1lLScgKyBfLnJlcGxhY2UoYW5pbWF0aW9uRnJhbWVzW2ZyYW1lSWR4XVthbmltYXRpb25GcmFtZXNbZnJhbWVJZHhdLmxlbmd0aCAtIDFdLnZhbHVlLCAnLicsICcnKSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnJhbWVJZHggPj0gY29ycmVsYXRpbmdGcmFtZXMubGVuZ3RoIC0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdG9wR3JpZExpbmVFbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9wR3JpZExpbmVFbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydEdyaWRMaW5lRWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRHcmlkTGluZUVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkcmF3IGltYWdlcyBmb3IgdGhlIGN1cnJlbnQgZnJhbWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChhbmltYXRpb25GcmFtZXNbZnJhbWVJZHhdLCBmdW5jdGlvbiAoY3VyckZyYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZyYW1lSW1hZ2UgPSBfLmZpbmQoZnJhbWVJbWFnZXMsIHsgdGltZXN0YW1wOiBjdXJyRnJhbWUudmFsdWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSW1hZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbnZhcyA9IGFuZ3VsYXIuZWxlbWVudCgnLicgKyBfLnJlcGxhY2UoZnJhbWVJbWFnZS5zZW5zb3IsICcgJywgJycpKVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZHJhdyB0aGUgY3VycmVudCBmcmFtZSdzIGltYWdlIG9uIHRoZSBhcHByb3ByaWF0ZSBjYW52YXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhd0ltYWdlKGN0eCwgY2FudmFzLCBmcmFtZUltYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhZGp1c3QgY3VyckZyYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodm0ucGxheWJhY2tEaXJlY3Rpb24gPT09ICdmb3J3YXJkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmcmFtZUlkeCA8IGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZUluaXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSWR4ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4ID0gYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlY3Vyc2l2ZWx5IGNhbGwgZnVuY3Rpb24uIGFkanVzdCB0aW1lb3V0IGRlbGF5IHRvIGNoYW5nZSBhbmltYXRpb24gcmF0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnBsYXliYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5pbWF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgYW5pbWF0aW9uRGVsYXkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNBbmltYXRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdBbmltYXRpb24gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGdlbmVyYXRlQ29ycmVsYXRpbmdJbWFnZXMgPSBmdW5jdGlvbiAoY3VyckZyYW1lSWR4KSB7XHJcbiAgICAgICAgICAgIGZyYW1lSWR4ID0gY3VyckZyYW1lSWR4ICE9PSBudWxsICYmIHR5cGVvZiBjdXJyRnJhbWVJZHggIT09ICd1bmRlZmluZWQnID8gY3VyckZyYW1lSWR4IDogZnJhbWVJZHg7XHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgYW5pbWF0aW9uIGltYWdlIGFycmF5IGluIGEgd2ViIHdvcmtlciB0byBhdm9pZCBibG9ja2luZyB0aGUgVUlcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdJbWFnZVdvcmtlciA9IFdlYndvcmtlci5jcmVhdGUoY3JlYXRlSW1hZ2VBcnIpO1xyXG4gICAgICAgICAgICBfLmZvckVhY2goY29ycmVsYXRpbmdJbWFnZVJlc3VsdHMsIGZ1bmN0aW9uIChpbWFnZVJlc3VsdHMpIHtcclxuICAgICAgICAgICAgICAgIGltYWdlUmVzdWx0cy5yZXN1bHRzID0gXy5mbGF0TWFwKGltYWdlUmVzdWx0cy5yZXN1bHRzLCBmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmlzQ29ycmVsYXRpb24gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nSW1hZ2VSZXN1bHRzID0gY29ycmVsYXRpbmdJbWFnZVJlc3VsdHMuY29uY2F0KGltYWdlUmVzdWx0cyk7XHJcblxyXG4gICAgICAgICAgICAvLyBzdGFydCB0aGUgd2ViIHdvcmtlciBhbmQgd2FpdCBmb3IgdGhlIHJlc3VsdFxyXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ltYWdlV29ya2VyLnJ1bihjb3JyZWxhdGluZ0ltYWdlUmVzdWx0cywgY29ycmVsYXRpbmdEYXRlRGlmZikudGhlbihmdW5jdGlvbiAoaW1hZ2VBcnJzKSB7XHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goaW1hZ2VBcnJzLCBmdW5jdGlvbiAoYXJyLCBpZHgpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJyLmlzQ29ycmVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VBcnJzW2lkeF0uc2Vuc29yID0gYXJyLnNlbnNvciArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWFnZUFycnNbaWR4XS5zZW5zb3IgPSBhcnIuc2Vuc29yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VBcnJzW2lkeF0uc2Vuc29yID0gYXJyLnNlbnNvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlQXJyc1tpZHhdLnNlbnNvciA9IGFyci5zZW5zb3IgKyBkZWx0YUNvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAvLyBncm91cCBpbWFnZSBhcnJheXMgYnkgc2Vuc29yIHZhbHVlXHJcbiAgICAgICAgICAgICAgICBpbWFnZUFycnMgPSBfLmdyb3VwQnkoaW1hZ2VBcnJzLCAnc2Vuc29yJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaW5pdCB2YXJzIHVzZWQgaW5zaWRlIGFuaW1hdGUgZnVuY3Rpb25cclxuICAgICAgICAgICAgICAgIHZhciBmcmFtZUltYWdlcyA9IF8uZmxhdHRlbihfLnZhbHVlcyhpbWFnZUFycnMpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFycmF5IG9mIGFsbCBwb2ludHMgaW4gaW1hZ2VBcnJzXHJcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lcyA9IF8ubWFwKGNoYXJ0RGF0YSwgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9IF8ua2V5cyhkKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vuc29yID0gXy5maW5kKGtleXMsIGZ1bmN0aW9uIChrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gayAhPT0gJ2lzQ29ycmVsYXRpb24nICYmIGsgIT09ICd0aW1lJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBkLnRpbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOiAnZnJhbWUtbGluZSB0aW1lLScgKyBfLnJlcGxhY2UoZC50aW1lLCAnLicsICcnKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vuc29yOiBzZW5zb3JcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNvcnJlbGF0aW5nRnJhbWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBzb3J0IGJ5IHZhbHVlICh0aW1lKSBhbmQgZHJhdyBwbGF5YmFjayBsaW5lcyB1c2luZyBDMyB4Z3JpZHMgYXBpXHJcbiAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZXMgPSBfLnNvcnRCeShjb3JyZWxhdGluZ0ZyYW1lcywgJ3ZhbHVlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhcnQueGdyaWRzKGNvcnJlbGF0aW5nRnJhbWVzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSBhbmltYXRlIGZyYW1lcyBmb3Igc2VsZWN0ZWQgc2Vuc29yXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlQW5pbWF0aW9uRnJhbWVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkcmF3SW1hZ2UgPSBmdW5jdGlvbiAoY3R4LCBjYW52YXMsIGltYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNsZWFyIHByZXZpb3VzIGRyYXdpbmdcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHdpZHRoIGFuZCBoZWlnaHQgdG8gbWF0Y2ggaW1hZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBpbWFnZS5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5jYW52YXMud2lkdGggPSBpbWFnZS53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCBhIHBvaW50ZXIgdG8gdGhlIGN1cnJlbnQgbG9jYXRpb24gaW4gdGhlIGltYWdlLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFsZXR0ZSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTsgLy94LHksdyxoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdyYXAgeW91ciBhcnJheSBhcyBhIFVpbnQ4QXJyYXlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFsZXR0ZS5kYXRhLnNldChuZXcgVWludDhBcnJheShpbWFnZS52YWx1ZXMpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVwb3N0IHRoZSBkYXRhLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHgucHV0SW1hZ2VEYXRhKHBhbGV0dGUsIDAsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhbmltYXRlSW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZHJhdyB0aGUgaW5pdGlhbCBpbWFnZSBmb3IgZWFjaCBjaGlwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChfLnZhbHVlcyhpbWFnZUFycnMpLCBmdW5jdGlvbiAoaW1hZ2VBcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBhbmd1bGFyLmVsZW1lbnQoJy4nICsgXy5yZXBsYWNlKGltYWdlQXJyWzBdLnNlbnNvciwgJyAnLCAnJykpWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYXdJbWFnZShjdHgsIGNhbnZhcywgaW1hZ2VBcnJbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlSW5pdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQW5pbWF0aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhpZGUgcHJldmlvdXMgZ3JpZCBsaW5lIGlmIGRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydEdyaWRMaW5lRWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydEdyaWRMaW5lRWwuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdG9wR3JpZExpbmVFbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BHcmlkTGluZUVsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgZ3JpZCBsaW5lIGFzc29jaWF0ZWQgd2l0aCBjdXJyZW50IGZyYW1lIGFuZCBzaG93IGl0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydEdyaWRMaW5lRWwgPSBhbmd1bGFyLmVsZW1lbnQoJy50aW1lLScgKyBfLnJlcGxhY2UoYW5pbWF0aW9uRnJhbWVzW2ZyYW1lSWR4XVswXS52YWx1ZSwgJy4nLCAnJykpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcEdyaWRMaW5lRWwgPSBhbmd1bGFyLmVsZW1lbnQoJy50aW1lLScgKyBfLnJlcGxhY2UoYW5pbWF0aW9uRnJhbWVzW2ZyYW1lSWR4XVthbmltYXRpb25GcmFtZXNbZnJhbWVJZHhdLmxlbmd0aCAtIDFdLnZhbHVlLCAnLicsICcnKSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnRHcmlkTGluZUVsICYmIHN0b3BHcmlkTGluZUVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSWR4ID49IGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggLSAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BHcmlkTGluZUVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0R3JpZExpbmVFbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZHJhdyBpbWFnZXMgZm9yIHRoZSBjdXJyZW50IGZyYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goYW5pbWF0aW9uRnJhbWVzW2ZyYW1lSWR4XSwgZnVuY3Rpb24gKGN1cnJGcmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUltYWdlID0gXy5maWx0ZXIoZnJhbWVJbWFnZXMsIHsgdGltZXN0YW1wOiBjdXJyRnJhbWUudmFsdWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSW1hZ2UubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goZnJhbWVJbWFnZSwgZnVuY3Rpb24gKGltYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FudmFzID0gYW5ndWxhci5lbGVtZW50KCcuJyArIF8ucmVwbGFjZShpbWFnZS5zZW5zb3IsICcgJywgJycpKVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkcmF3IHRoZSBjdXJyZW50IGZyYW1lJ3MgaW1hZ2Ugb24gdGhlIGFwcHJvcHJpYXRlIGNhbnZhc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhd0ltYWdlKGN0eCwgY2FudmFzLCBpbWFnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFkanVzdCBjdXJyRnJhbWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5wbGF5YmFja0RpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSWR4IDwgYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHgrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlSW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnJhbWVJZHggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHggPSBhbmltYXRpb25GcmFtZXMubGVuZ3RoIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVjdXJzaXZlbHkgY2FsbCBmdW5jdGlvbi4gYWRqdXN0IHRpbWVvdXQgZGVsYXkgdG8gY2hhbmdlIGFuaW1hdGlvbiByYXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodm0ucGxheWJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbmltYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBhbmltYXRpb25EZWxheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0FuaW1hdGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZ0FuaW1hdGlvbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZ2VuZXJhdGVFdmVudERhdGEgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgY2hhcnQgZGF0YSBhcnJheSBpbiBhIHdlYiB3b3JrZXIgdG8gYXZvaWQgYmxvY2tpbmcgdGhlIFVJXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNyZWF0ZUNoYXJ0RGF0YSAoZXZlbnRQbG90UmVzdWx0cywgaWRlbnRpdHksIGhhc0NvcnJlbGF0aW9uLCBjb3JyZWxhdGluZ0RhdGVEaWZmLCBleHRlcm5hbFNvdXJjZUxhYmVsKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY2hhcnREYXRhQXJyID0gW10sXHJcbiAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdDaGFydERhdGFBcnIgPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICBldmVudFBsb3RSZXN1bHRzLnJlc3VsdHMuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnRQbG90UmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGNvbnZlbnRpb24gZm9yIGEgcG9pbnQgaXMgYSA0IGl0ZW0gYXJyYXkgW3RpbWUsIHNlbnNvciBpbmRleCwgb2JqZWN0IGluZGV4LCBpbnRlbnNpdHldXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRQbG90UmVzdWx0LnBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwb2ludCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcG9pbnREYXRhID0ge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludFZhbHVlID0gcG9pbnRbM107XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdG9yZSBhIHZhbHVlIHRvIGluZGljYXRlIHdoZXRoZXIgdGhpcyBwb2ludCBiZWxvbmdzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGNvcnJlbGF0ZWQgZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludERhdGEuaXNDb3JyZWxhdGlvbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWx3YXlzIHVzZSB0aGUgZ2l2ZW4gdGltZSB2YWx1ZSBmb3IgdGhlIHNlbGVjdGVkIGV2ZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50RGF0YS50aW1lID0gcG9pbnRbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNDb3JyZWxhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGlkZW50aXR5IHZhbHVlIHRlbGxzIHlvdSB0aGUgc291cmNlIG9mIHRoZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VsZWN0ZWQgZXZlbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZGVudGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnREYXRhW2V2ZW50UGxvdFJlc3VsdC5zZW5zb3JzW3BvaW50WzFdXV0gPSBwb2ludFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGVtXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnREYXRhW2V2ZW50UGxvdFJlc3VsdC5zZW5zb3JzW3BvaW50WzFdXSArIGV4dGVybmFsU291cmNlTGFiZWxdID0gcG9pbnRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50RGF0YVtldmVudFBsb3RSZXN1bHQuc2Vuc29yc1twb2ludFsxXV1dID0gcG9pbnRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFydERhdGFBcnIucHVzaChwb2ludERhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZXZlbnRQbG90UmVzdWx0cy5jb3JyZWxhdGluZ1Jlc3VsdHMuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnRQbG90UmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGNvbnZlbnRpb24gZm9yIGEgcG9pbnQgaXMgYSA0IGl0ZW0gYXJyYXkgW3RpbWUsIHNlbnNvciBpbmRleCwgb2JqZWN0IGluZGV4LCBpbnRlbnNpdHldXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRQbG90UmVzdWx0LnBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwb2ludCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcG9pbnREYXRhID0ge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludFZhbHVlID0gcG9pbnRbM107XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdG9yZSBhIHZhbHVlIHRvIGluZGljYXRlIHdoZXRoZXIgdGhpcyBwb2ludCBiZWxvbmdzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGNvcnJlbGF0ZWQgZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludERhdGEuaXNDb3JyZWxhdGlvbiA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBub3JtYWxpemUgdGltZSB2YWx1ZXMgaWYgYSBkaWZmZXJlbmNlIGluIHN0YXJ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRhdGVzIGlzIHByZXNlbnQuIGNvcnJlbGF0aW5nRGF0ZURpZmYgd2lsbCBiZSBwb3NpdGl2ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3aGVuIHRoZSBjb3JyZWxhdGluZyBldmVudCBzdGFydGVkIHZhbHVlIGlzIGxhdGVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoYW4gdGhlIGV2ZW50IHN0YXJ0ZWQgdmFsdWUsIGFuZCB2aWNlIHZlcnNhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50RGF0YS50aW1lID0gY29ycmVsYXRpbmdEYXRlRGlmZiA/IHBvaW50WzBdIC0gY29ycmVsYXRpbmdEYXRlRGlmZiA6IHBvaW50WzBdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGlkZW50aXR5IHZhbHVlIHRlbGxzIHlvdSB0aGUgc291cmNlIG9mIHRoZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZWxlY3RlZCBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRlbnRpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50RGF0YVtldmVudFBsb3RSZXN1bHQuc2Vuc29yc1twb2ludFsxXV0gKyBleHRlcm5hbFNvdXJjZUxhYmVsXSA9IHBvaW50VmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludERhdGFbZXZlbnRQbG90UmVzdWx0LnNlbnNvcnNbcG9pbnRbMV1dXSA9IHBvaW50VmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdDaGFydERhdGFBcnIucHVzaChwb2ludERhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvcnJlbGF0aW5nQ2hhcnREYXRhQXJyLmxlbmd0aCA+IDAgPyBjaGFydERhdGFBcnIuY29uY2F0KGNvcnJlbGF0aW5nQ2hhcnREYXRhQXJyKSA6IGNoYXJ0RGF0YUFycjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gaW5zdGFudGlhdGUgdGhlIHdlYiB3b3JrZXJcclxuICAgICAgICAgICAgY2hhcnRXb3JrZXIgPSBXZWJ3b3JrZXIuY3JlYXRlKGNyZWF0ZUNoYXJ0RGF0YSk7XHJcblxyXG4gICAgICAgICAgICAvLyBzdGFydCB0aGUgd2ViIHdvcmtlciBhbmQgd2FpdCBmb3IgdGhlIHJlc3VsdFxyXG4gICAgICAgICAgICBjaGFydFdvcmtlci5ydW4ocGxvdFJlc3VsdHMsIHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSwgcGxvdFJlc3VsdHMuY29ycmVsYXRpbmdSZXN1bHRzLmxlbmd0aCA+IDAsIGNvcnJlbGF0aW5nRGF0ZURpZmYsIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwpLnRoZW4oZnVuY3Rpb24gKGNoYXJ0RGF0YUFycikge1xyXG4gICAgICAgICAgICAgICAgY2hhcnREYXRhID0gY2hhcnREYXRhQXJyO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvcnJlbGF0aW5nSW1hZ2VSZXN1bHRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUNvcnJlbGF0aW5nSW1hZ2VzKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlSW1hZ2VzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgc2Vuc29yQXJyID0gXy5zb3J0QnkoXy51bmlxKF8uZmxhdHRlbihfLm1hcChwbG90UmVzdWx0cy5yZXN1bHRzLCAnc2Vuc29ycycpKSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cEZvcm1hdCA9IGQzLmZvcm1hdCgnLjFlJyksXHJcbiAgICAgICAgICAgICAgICAgICAgbnVtRm9ybWF0ID0gZDMuZm9ybWF0KCduJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHBsb3RSZXN1bHRzLmNvcnJlbGF0aW5nUmVzdWx0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvcnJlbGF0aW5nU2Vuc29yQXJyID0gXy5zb3J0QnkoXy51bmlxKF8uZmxhdHRlbihfLm1hcChwbG90UmVzdWx0cy5jb3JyZWxhdGluZ1Jlc3VsdHMsICdzZW5zb3JzJykpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goY29ycmVsYXRpbmdTZW5zb3JBcnIsIGZ1bmN0aW9uIChzZW5zb3IsIGlkeCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdTZW5zb3JBcnJbaWR4XSA9IHNlbnNvciArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChzZW5zb3JBcnIsIGZ1bmN0aW9uIChzZW5zb3IsIGlkeCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vuc29yQXJyW2lkeF0gPSBzZW5zb3IgKyBkZWx0YUNvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgc2Vuc29yQXJyID0gc2Vuc29yQXJyLmNvbmNhdChjb3JyZWxhdGluZ1NlbnNvckFycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGRhdGFDb2xvcnMgPSB7fSxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2UwSWR4ID0gMCxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2UxSWR4ID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goc2Vuc29yQXJyLCBmdW5jdGlvbiAoc2Vuc29yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBsb3RSZXN1bHRzLmNvcnJlbGF0aW5nUmVzdWx0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNob3dpbmcgbXVsdGlwbGUgZXZlbnQgdHlwZXMsIHNvIGRldGVybWluZSBjb2xvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBiYXNlZCBvbiBjdXJyZW50IHNlbnNvciBuYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLmVuZHNXaXRoKHNlbnNvciwgZGVsdGFDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFDb2xvcnNbc2Vuc29yXSA9ICBfLmZpbmQoZGVsdGFDb25maWcuc291cmNlcywgeyBpZGVudGl0eTogZmFsc2UgfSkuY2hhcnRDb2xvcnNbc291cmNlMElkeF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UwSWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhQ29sb3JzW3NlbnNvcl0gPSAgXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IHRydWUgfSkuY2hhcnRDb2xvcnNbc291cmNlMUlkeF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UxSWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IHNob3dpbmcgb25lIGtpbmQgb2YgZXZlbnQsIHNvIGRldGVybWluZSBjb2xvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1c2luZyB2bS50cmFja0ZlYXR1cmUucHJvcGVydGllc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhQ29sb3JzW3NlbnNvcl0gPSBfLmZpbmQoZGVsdGFDb25maWcuc291cmNlcywgeyBpZGVudGl0eTogdm0udHJhY2tGZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdIH0pLmNoYXJ0Q29sb3JzW3NvdXJjZTBJZHhdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UwSWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gZ2VuZXJhdGUgdGltZS9pbnRlbnNpdHkgY2hhcnQgdXNpbmcgQzNcclxuICAgICAgICAgICAgICAgIGNoYXJ0ID0gYzMuZ2VuZXJhdGUoe1xyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbjogY2hhcnREYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiAndGltZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc2Vuc29yQXJyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yczogZGF0YUNvbG9yc1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2l6ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogdm0uZXZlbnRWaWV3ZXJXaWR0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2bS5ldmVudFZpZXdlckhlaWdodCAvIDJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiAxMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDMwXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sdGlwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGZ1bmN0aW9uICh4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHgudG9GaXhlZCgyKSArICcgc2Vjb25kcyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnBvdygxMCwgdmFsdWUpLnRvRml4ZWQoNikgKyAnICcgKyBwbG90UmVzdWx0cy5yZXN1bHRzWzBdLnlfY29sdW1uLnVuaXRzLmxhYmVsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBsaW5lOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3ROdWxsOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBheGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpY2s6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQudG9GaXhlZCgyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnU2Vjb25kcyBzaW5jZSAnICsgbW9tZW50LnV0Yyh4U3RhcnRlZCkuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tOnNzW1pdJyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdvdXRlci1sZWZ0J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHBsb3RSZXN1bHRzICYmIHBsb3RSZXN1bHRzLnJlc3VsdHMgJiYgcGxvdFJlc3VsdHMucmVzdWx0cy5sZW5ndGggPiAwID8gcGxvdFJlc3VsdHMucmVzdWx0c1swXS55X2NvbHVtbi51bml0cy5sYWJlbCA6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnb3V0ZXItbWlkZGxlJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpY2s6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvcm1hdCBjdXN0b20gdGlja3MgZm9yIGxvZyBzY2FsZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdCA9IE1hdGguYWJzKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ID0gdCA8IDEgPyBNYXRoLnBvdygxMCwgdCkgOiBNYXRoLnJvdW5kKE1hdGgucG93KDEwLCB0KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQgPSBkIDwgMCA/IDEgLyB0IDogdDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0IDwgMC4wMDAwMSB8fCB0ID4gMTAwMDAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXhwRm9ybWF0KHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gbnVtRm9ybWF0KHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChyZXN1bHQpLnRvRml4ZWQoMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB6b29tOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9ucmVuZGVyZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NoYXJ0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGFydCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbG9yQXJyID0gXy50b1BhaXJzKGNoYXJ0LmRhdGEuY29sb3JzKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGNvbG9yQXJyLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYXJkID0gXy5maW5kKHZtLmV2ZW50SW1hZ2VDYXJkcywgZnVuY3Rpb24gKGMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGMuY2hhcnRJZCA9PT0gZFswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FyZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXJkLmNvbG9yID0gZFsxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb3JyZWxhdGluZ0NhcmQgPSBfLmZpbmQodm0uY29ycmVsYXRpbmdFdmVudEltYWdlQ2FyZHMsIGZ1bmN0aW9uIChjYykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2MuY2hhcnRJZCA9PT0gZFswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29ycmVsYXRpbmdDYXJkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nQ2FyZC5jb2xvciA9IGRbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9ubW91c2VvdXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhcnQuZm9jdXMoY2hhcnRGb2N1cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB2bS5zZXRBY3RpdmVJbWFnZUNhcmQoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGNhc3RWb3RlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2b3RlU2VydmljZS5jYXN0Vm90ZSh2bS52b3RlT2JqKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIHZtLnZvdGVPYmogPSBWb3RlLnRyYW5zZm9ybWVyKHJlc3VsdC5kYXRhKTtcclxuICAgICAgICAgICAgICAgIHZtLnZvdGVzLnB1c2godm0udm90ZU9iaik7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZXModm0udm90ZXMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1Vwdm90ZSByZWNvcmRlZCcpLnRoZW1lKCdzdWNjZXNzLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRG93bnZvdGUgcmVjb3JkZWQgKCcgKyB2bS52b3RlT2JqLnJlYXNvbiArICcpJykudGhlbWUoJ2ZhaWwtdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgICAgIHZtLnZvdGVPYmoudm90ZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciBTdWJtaXR0aW5nIFZvdGUnKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciB1cGRhdGVWb3RlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2b3RlU2VydmljZS51cGRhdGVWb3RlKHZtLnZvdGVPYmopLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgLy8gbG9vayBmb3IgZXhpc3Rpbmcgdm90ZSBmb3IgdGhpcyBldmVudFxyXG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50Vm90ZSA9IF8uZmluZCh2bS52b3RlcywgeyBkYXRhc2V0X2lkOiB2bS52b3RlT2JqLmRhdGFzZXRfaWQsIHByb2R1Y3RfaWQ6IHZtLnZvdGVPYmoucHJvZHVjdF9pZCB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChldmVudFZvdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudFZvdGUudm90ZSA9IHZtLnZvdGVPYmoudm90ZTtcclxuICAgICAgICAgICAgICAgICAgICBldmVudFZvdGUucmVhc29uID0gdm0udm90ZU9iai5yZWFzb247XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVzKHZtLnZvdGVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdVcHZvdGUgcmVjb3JkZWQnKS50aGVtZSgnc3VjY2Vzcy10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Rvd252b3RlIHJlY29yZGVkICgnICsgdm0udm90ZU9iai5yZWFzb24gKyAnKScpLnRoZW1lKCdmYWlsLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB2bS52b3RlT2JqLnZvdGUgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgU3VibWl0dGluZyBWb3RlJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZ2V0Q29ycmVsYXRpbmdFdmVudHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRDb3JyZWxhdGluZ0V2ZW50cyh2bS50cmFja0ZlYXR1cmUpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBnZXRQbG90RGF0YSA9IGZ1bmN0aW9uIChmaWxlUGF0aCwgaXNDb3JyZWxhdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0RXZlbnRQbG90RGF0YSh7IHVybDogZmlsZVBhdGggfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNDb3JyZWxhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShjb3JyZWxhdGluZ1Bsb3RSZXN1bHRzLnB1c2gocmVzdWx0KSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShwbG90UmVzdWx0c0Fyci5wdXNoKHJlc3VsdCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdDaGFydCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdm0uZXZlbnRFcnJvciA9IGVycm9yLnN0YXR1cyArICc6ICcgKyBlcnJvci5zdGF0dXNUZXh0O1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZ2V0SW1hZ2VEYXRhID0gZnVuY3Rpb24gKGZpbGVQYXRoLCBpc0NvcnJlbGF0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRFdmVudEltYWdlRGF0YSh7IHVybDogZmlsZVBhdGggfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNDb3JyZWxhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShjb3JyZWxhdGluZ0ltYWdlUmVzdWx0cy5wdXNoKHJlc3VsdCkpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUoaW1hZ2VSZXN1bHRzLnB1c2gocmVzdWx0KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NoYXJ0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB2bS5ldmVudEVycm9yID0gZXJyb3Iuc3RhdHVzICsgJzogJyArIGVycm9yLnN0YXR1c1RleHQ7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBpbml0RXZlbnREYXRhID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgZXZlbnRTdGFydGVkID0gXy5tYXAocGxvdFJlc3VsdHMucmVzdWx0cywgJ3N0YXJ0ZWQnKSxcclxuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRXZlbnRTdGFydGVkID0gXy5tYXAocGxvdFJlc3VsdHMuY29ycmVsYXRpbmdSZXN1bHRzLCAnc3RhcnRlZCcpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGV2ZW50U3RhcnRlZC5sZW5ndGggPiAwICYmIGNvcnJlbGF0aW5nRXZlbnRTdGFydGVkLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIGZpZ3VyZSBvdXQgdGhlIGRpZmZlcmVuY2UsIGlmIGFueSwgYmV0d2VlbiB0aGVcclxuICAgICAgICAgICAgICAgIC8vIHN0YXJ0IGRhdGVzXHJcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRNb21lbnQgPSBtb21lbnQoZXZlbnRTdGFydGVkWzBdKSxcclxuICAgICAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0V2ZW50TW9tZW50ID0gbW9tZW50KGNvcnJlbGF0aW5nRXZlbnRTdGFydGVkWzBdKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0RhdGVEaWZmID0gZXZlbnRNb21lbnQuZGlmZihjb3JyZWxhdGluZ0V2ZW50TW9tZW50LCAncycpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyB4IGF4aXMgdmFsdWVzIGFyZSB0aGUgc2FtZSBmb3IgYWxsIHBsb3QgcmVzdWx0cywgc29cclxuICAgICAgICAgICAgLy8gc2V0IHVwIHRoZSBleHRlbnRzIHVzaW5nIHRoZSBmaXJzdCBhdmFpbGFibGUgdmFsdWVcclxuICAgICAgICAgICAgeFN0YXJ0ZWQgPSBwbG90UmVzdWx0cyAmJiBwbG90UmVzdWx0cy5yZXN1bHRzICYmIHBsb3RSZXN1bHRzLnJlc3VsdHMubGVuZ3RoID4gMCA/IHBsb3RSZXN1bHRzLnJlc3VsdHNbMF0uc3RhcnRlZCA6ICcnO1xyXG5cclxuICAgICAgICAgICAgLy8gZmxhdHRlbiBpbWFnZVJlc3VsdHMgYW5kIGdyb3VwIGJ5IHNlbnNvciwgdGhlbiBjb252ZXJ0XHJcbiAgICAgICAgICAgIC8vIHRvIHBhaXJzIHNvIHRoZSB0ZW1wbGF0ZSBrbm93cyBob3cgbWFueSBpbWFnZSBjYXJkc1xyXG4gICAgICAgICAgICAvLyB0byBkaXNwbGF5IGFuZCB3aGF0IHRoZWlyIGxhYmVscyBzaG91bGQgYmVcclxuICAgICAgICAgICAgdmFyIGltYWdlQ2FyZHMgPSBfLnRvUGFpcnMoXy5ncm91cEJ5KF8uZmxhdHRlbihfLm1hcChpbWFnZVJlc3VsdHMsICdyZXN1bHRzJykpLCAnc2Vuc29yJykpO1xyXG4gICAgICAgICAgICB2bS5ldmVudEltYWdlQ2FyZHMgPSBfLm1hcChpbWFnZUNhcmRzLCBmdW5jdGlvbiAoY2FyZCwgaWR4KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzQ2xhc3MgPSAnJyxcclxuICAgICAgICAgICAgICAgICAgICBjaGFydElkID0gJyc7XHJcbiAgICAgICAgICAgICAgICBpZiAoaGFzQ29ycmVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBjYW52YXNDbGFzcyA9IHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW3ZtLmRlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSA/IF8ucmVwbGFjZShjYXJkWzBdLCAnICcsICcnKSA6IF8ucmVwbGFjZShjYXJkWzBdLCAnICcsICcnKSArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhcnRJZCA9IHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW3ZtLmRlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSA/IGNhcmRbMF0gOiBjYXJkWzBdICsgZGVsdGFDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FudmFzQ2xhc3MgPSBfLnJlcGxhY2UoY2FyZFswXSwgJyAnLCAnJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhcnRJZCA9IGNhcmRbMF07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbnNvcjogY2FyZFswXSxcclxuICAgICAgICAgICAgICAgICAgICBpbWFnZXM6IGNhcmRbMV0sXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBpZHggPT09IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IGNhbnZhc0NsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgIGNoYXJ0SWQ6IGNoYXJ0SWRcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB2bS5hY3RpdmVJbWFnZUNhcmQgPSB2bS5ldmVudEltYWdlQ2FyZHNbMF07XHJcbiAgICAgICAgICAgIHZtLmF2YWlsYWJsZUltYWdlQ2FyZHMgPSBfLmNsb25lRGVlcCh2bS5ldmVudEltYWdlQ2FyZHMpO1xyXG4gICAgICAgICAgICB2bS5zZWxlY3RlZEltYWdlQ2FyZCA9IHZtLmF2YWlsYWJsZUltYWdlQ2FyZHNbMF07XHJcblxyXG4gICAgICAgICAgICBpZiAoaGFzQ29ycmVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgIHZhciBjb3JyZWxhdGluZ0ltYWdlQ2FyZHMgPSBfLnRvUGFpcnMoXy5ncm91cEJ5KF8uZmxhdHRlbihfLm1hcChjb3JyZWxhdGluZ0ltYWdlUmVzdWx0cywgJ3Jlc3VsdHMnKSksICdzZW5zb3InKSk7XHJcbiAgICAgICAgICAgICAgICB2bS5jb3JyZWxhdGluZ0V2ZW50SW1hZ2VDYXJkcyA9IF8ubWFwKGNvcnJlbGF0aW5nSW1hZ2VDYXJkcywgZnVuY3Rpb24gKGNhcmQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5zb3I6IGNhcmRbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlczogY2FyZFsxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBjYXJkWzBdID09PSB2bS5hY3RpdmVJbWFnZUNhcmQuc2Vuc29yLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczogdm0udHJhY2tGZWF0dXJlLnByb3BlcnRpZXNbdm0uZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdID8gXy5yZXBsYWNlKGNhcmRbMF0sICcgJywgJycpICsgZGVsdGFDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbCA6IF8ucmVwbGFjZShjYXJkWzBdLCAnICcsICcnKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhcnRJZDogdm0udHJhY2tGZWF0dXJlLnByb3BlcnRpZXNbdm0uZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdID8gY2FyZFswXSArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwgOiBjYXJkWzBdXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdm0uYWN0aXZlQ29ycmVsYXRpbmdJbWFnZUNhcmQgPSBfLmZpbmQodm0uY29ycmVsYXRpbmdFdmVudEltYWdlQ2FyZHMsIHsgc2Vuc29yOiB2bS5hY3RpdmVJbWFnZUNhcmQuc2Vuc29yIH0pO1xyXG4gICAgICAgICAgICAgICAgdm0uYXZhaWxhYmxlSW1hZ2VDYXJkcyA9IF8udW5pcUJ5KHZtLmF2YWlsYWJsZUltYWdlQ2FyZHMuY29uY2F0KHZtLmNvcnJlbGF0aW5nRXZlbnRJbWFnZUNhcmRzKSwgJ3NlbnNvcicpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBnZW5lcmF0ZSB0aGUgY2hhcnQgYW5kIGltYWdlc1xyXG4gICAgICAgICAgICBnZW5lcmF0ZUV2ZW50RGF0YSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZtLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnREYXRhKG51bGwpO1xyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlRXZlbnQobnVsbCk7XHJcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudERhdGEobnVsbCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0udm90ZVVwQnRuQ29sb3IgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGUgPT09IG51bGwgfHwgdm0udm90ZU9iai52b3RlID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZWVuLTcwMCc7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodm0udm90ZU9iai52b3RlID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5LTcwMCc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS52b3RlRG93bkJ0bkNvbG9yID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAodm0udm90ZU9iai52b3RlID09PSBudWxsIHx8IHZtLnZvdGVPYmoudm90ZSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAncmVkLTcwMCc7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodm0udm90ZU9iai52b3RlID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXktNzAwJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZtLm9wZW5NZW51ID0gZnVuY3Rpb24gKCRtZE9wZW5NZW51LCBldikge1xyXG4gICAgICAgICAgICAkbWRPcGVuTWVudShldik7XHJcbiAgICAgICAgfTtcclxuXHJcblx0XHR2bS5zaG93TWV0YWRhdGEgPSBmdW5jdGlvbihldiwgZXZNZXRhZGF0YXMpIHtcclxuXHRcdFx0JG1kRGlhbG9nLnNob3coe1xyXG5cdFx0XHRcdFx0Y2xpY2tPdXRzaWRlVG9DbG9zZTogdHJ1ZSxcclxuXHRcdFx0XHRcdGNvbnRyb2xsZXI6ICdtZXRhZGF0YURpYWxvZ0NvbnRyb2xsZXInLFxyXG5cdFx0XHRcdFx0dGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvZXZlbnRWaWV3ZXIvbWV0YWRhdGFEaWFsb2dUZW1wbGF0ZS5odG1sJyxcclxuXHRcdFx0XHRcdHRhcmdldEV2ZW50OiBldixcclxuXHRcdFx0XHRcdGxvY2Fsczoge1xyXG5cdFx0XHRcdFx0XHRldmVudE1ldGFkYXRhczogZXZNZXRhZGF0YXNcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS52b3RlVXAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZtLnZvdGVPYmoudm90ZSA9IHRydWU7XHJcbiAgICAgICAgICAgIHZtLnZvdGVPYmoucmVhc29uID0gJyc7XHJcbiAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGVfaWQpIHtcclxuICAgICAgICAgICAgICAgIC8vIHZvdGUgaGFzIGFscmVhZHkgYmVlbiBjYXN0LCBzbyB1cGRhdGUgaW5zdGVhZFxyXG4gICAgICAgICAgICAgICAgdXBkYXRlVm90ZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gbmV3IHZvdGVcclxuICAgICAgICAgICAgICAgIGNhc3RWb3RlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS52b3RlRG93biA9IGZ1bmN0aW9uIChyZWFzb24pIHtcclxuICAgICAgICAgICAgdm0udm90ZU9iai52b3RlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHZtLnZvdGVPYmoucmVhc29uID0gcmVhc29uO1xyXG4gICAgICAgICAgICBpZiAodm0udm90ZU9iai52b3RlX2lkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyB2b3RlIGhhcyBhbHJlYWR5IGJlZW4gY2FzdCwgc28gdXBkYXRlIGluc3RlYWRcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVZvdGUoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIG5ldyB2b3RlXHJcbiAgICAgICAgICAgICAgICBjYXN0Vm90ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0uc2V0QWN0aXZlSW1hZ2VDYXJkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgY3VyckFjdGl2ZUltYWdlQ2FyZCA9IF8uZmluZCh2bS5ldmVudEltYWdlQ2FyZHMsIHsgYWN0aXZlOiB0cnVlIH0pLFxyXG4gICAgICAgICAgICAgICAgY3VyckFjdGl2ZUNvcnJlbGF0aW5nSW1hZ2VDYXJkID0gXy5maW5kKHZtLmNvcnJlbGF0aW5nRXZlbnRJbWFnZUNhcmRzLCB7IGFjdGl2ZTogdHJ1ZSB9KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjdXJyQWN0aXZlSW1hZ2VDYXJkKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyQWN0aXZlSW1hZ2VDYXJkLmFjdGl2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjdXJyQWN0aXZlQ29ycmVsYXRpbmdJbWFnZUNhcmQpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJBY3RpdmVDb3JyZWxhdGluZ0ltYWdlQ2FyZC5hY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdm0uYWN0aXZlSW1hZ2VDYXJkID0gXy5maW5kKHZtLmV2ZW50SW1hZ2VDYXJkcywgeyBzZW5zb3I6IHZtLnNlbGVjdGVkSW1hZ2VDYXJkLnNlbnNvciB9KTtcclxuICAgICAgICAgICAgdm0uYWN0aXZlQ29ycmVsYXRpbmdJbWFnZUNhcmQgPSBfLmZpbmQodm0uY29ycmVsYXRpbmdFdmVudEltYWdlQ2FyZHMsIHsgc2Vuc29yOiB2bS5zZWxlY3RlZEltYWdlQ2FyZC5zZW5zb3IgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodm0uYWN0aXZlSW1hZ2VDYXJkKSB7XHJcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVJbWFnZUNhcmQuYWN0aXZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodm0uYWN0aXZlQ29ycmVsYXRpbmdJbWFnZUNhcmQpIHtcclxuICAgICAgICAgICAgICAgIHZtLmFjdGl2ZUNvcnJlbGF0aW5nSW1hZ2VDYXJkLmFjdGl2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNoYXJ0Rm9jdXMgPSBbdm0uYWN0aXZlSW1hZ2VDYXJkLmNoYXJ0SWRdO1xyXG4gICAgICAgICAgICBpZiAodm0uYWN0aXZlQ29ycmVsYXRpbmdJbWFnZUNhcmQpIHtcclxuICAgICAgICAgICAgICAgIGNoYXJ0Rm9jdXMucHVzaCh2bS5hY3RpdmVDb3JyZWxhdGluZ0ltYWdlQ2FyZC5jaGFydElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjaGFydC5mb2N1cyhjaGFydEZvY3VzKTtcclxuXHJcbiAgICAgICAgICAgIGlmICgoaGFzQ29ycmVsYXRpb24gJiYgY29ycmVsYXRpbmdGcmFtZXMubGVuZ3RoID4gMCkgfHwgKCFoYXNDb3JyZWxhdGlvbiAmJiBmcmFtZXMubGVuZ3RoID4gMCkpIHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZUFuaW1hdGlvbkZyYW1lcygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0udG9nZ2xlUGxheWJhY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZtLnBsYXliYWNrID0gIXZtLnBsYXliYWNrO1xyXG4gICAgICAgICAgICBpZiAodm0ucGxheWJhY2spIHtcclxuICAgICAgICAgICAgICAgIGFuaW1hdGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZtLnN0ZXAgPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHZtLnBsYXliYWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICghYW5ndWxhci5lcXVhbHMoZGlyZWN0aW9uLCB2bS5wbGF5YmFja0RpcmVjdGlvbikpIHtcclxuICAgICAgICAgICAgICAgIC8vIHVzZXIgY2hhbmdlZCBkaXJlY3Rpb25cclxuICAgICAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICdmb3J3YXJkJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4ID0gZnJhbWVJZHggPCBhbmltYXRpb25GcmFtZXMubGVuZ3RoIC0gMiA/IGZyYW1lSWR4ICsgMiA6IDA7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4ID0gZnJhbWVJZHggPiAxID8gZnJhbWVJZHggLSAyIDogYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdm0ucGxheWJhY2tEaXJlY3Rpb24gPSBkaXJlY3Rpb247XHJcbiAgICAgICAgICAgIGFuaW1hdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5tYXRjaFNpZ25hdHVyZSA9IGZ1bmN0aW9uIChzZW5zb3IpIHtcclxuICAgICAgICAgICAgdmFyIGNoYXJ0RGF0YSA9IF8uZmluZChjaGFydC5kYXRhKCksIHsgaWQ6IHNlbnNvciB9KTtcclxuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IGNoYXJ0RGF0YSA/IGNoYXJ0RGF0YS52YWx1ZXMgOiBudWxsO1xyXG5cclxuICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBudWxsIHZhbHVlc1xyXG4gICAgICAgICAgICB2YWx1ZXMgPSBfLmZpbHRlcih2YWx1ZXMsIGZ1bmN0aW9uKHYpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHYudmFsdWVzICE9PSBudWxsO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2codmFsdWVzKTtcclxuICAgICAgICAgICAgZGVidWdnZXI7XHJcblxyXG4gICAgICAgICAgICAvL3ZhciBzaWcgPSB7XHJcbiAgICAgICAgICAgIC8vICAgIHNpZ190ZW1wbGF0ZTogW1t0aW1lc10sW2ludGVuc2l0aWVzXV0sXHJcbiAgICAgICAgICAgIC8vICAgIGV2ZW50X2RhdGE6IFtbZXZlbnRUaW1lc10sW2V2ZW50SW50ZW5zaXRpZXNdXVxyXG4gICAgICAgICAgICAvL307XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRFdmVudERhdGEoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gY2xlYW4gdXAgYW55IGxlZnRvdmVyIGRhdGEgZnJvbSBhIHByZXZpb3VzbHkgdmlld2VkIGV2ZW50XHJcbiAgICAgICAgICAgIGlmIChjaGFydFdvcmtlcikge1xyXG4gICAgICAgICAgICAgICAgY2hhcnRXb3JrZXIudGVybWluYXRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbWFnZVdvcmtlcikge1xyXG4gICAgICAgICAgICAgICAgaW1hZ2VXb3JrZXIudGVybWluYXRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChjb3JyZWxhdGluZ0ltYWdlV29ya2VyKSB7XHJcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ltYWdlV29ya2VyLnRlcm1pbmF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyByZWluaXQgY29udHJvbGxlciB2YWx1ZXNcclxuICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nQ2hhcnQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZ0FuaW1hdGlvbiA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY2FwdHVyZSBuZXcgZXZlbnQgZGF0YVxyXG4gICAgICAgICAgICAgICAgdm0uZXZlbnREYXRhID0gbmV3VmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gcmV0cmlldmUgcGxvdCBhbmQgaW1hZ2UgZGF0YSBmb3IgYWN0aXZlIGV2ZW50XHJcbiAgICAgICAgICAgICAgICB2YXIgdHJhY2tzID0gdm0uZXZlbnREYXRhLmdldExheWVycygpLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2VzID0gW107XHJcblxyXG5cdFx0XHRcdHZtLmV2ZW50UHJvcHMgPSBfLm1hcCh0cmFja3MsIGZ1bmN0aW9uKGQpeyByZXR1cm4gZC5nZXRMYXllcnMoKVswXS5mZWF0dXJlLnByb3BlcnRpZXM7IH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHZtLnRyYWNrRmVhdHVyZSA9IHRyYWNrc1swXS5nZXRMYXllcnMoKVswXS5mZWF0dXJlO1xyXG5cdFx0XHRcdHZtLmV2ZW50X2g1X3VybCA9IGRlbHRhQ29uZmlnLmV2ZW50U2VydmVyLmZpbGVQYXRoVXJsICsgdm0udHJhY2tGZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh2bS52b3Rlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGRhdGFzZXRfaWQsIHByb2R1Y3RfaWQsIGFuZCBuYXNpYyB2YWx1ZXMgYXJlIHRoZSBzYW1lIGZvclxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFsbCB0cmFja3MgYXQgdGhpcyBwb2ludCwgc28gc2V0IHVwIHRoZSB2b3RlIG9iamVjdFxyXG4gICAgICAgICAgICAgICAgICAgIHZtLnZvdGVPYmouZGF0YXNldF9pZCA9IHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdO1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLnZvdGVPYmoucHJvZHVjdF9pZCA9IHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdO1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLnZvdGVPYmoubmFzaWMgPSB2bS50cmFja0ZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF07XHJcbiAgICAgICAgICAgICAgICAgICAgdm0udm90ZU9iai52b3Rlcl9uYW1lID0gdm0udm90ZXIudm90ZXJfbmFtZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbG9vayBmb3IgZXhpc3Rpbmcgdm90ZSBmb3IgdGhpcyBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBldmVudFZvdGUgPSBfLmZpbmQodm0udm90ZXMsIHsgZGF0YXNldF9pZDogdm0udm90ZU9iai5kYXRhc2V0X2lkLCBwcm9kdWN0X2lkOiB2bS52b3RlT2JqLnByb2R1Y3RfaWQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50Vm90ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS52b3RlT2JqID0gVm90ZS50cmFuc2Zvcm1lcihldmVudFZvdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2godHJhY2tzLCBmdW5jdGlvbiAodHJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXIgPSB0cmFjay5nZXRMYXllcnMoKVswXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyLmZlYXR1cmUgJiYgbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmlsZVBhdGggPSBkZWx0YUNvbmZpZy5ldmVudFNlcnZlci5maWxlUGF0aFVybCArIGxheWVyLmZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2goZ2V0UGxvdERhdGEoZmlsZVBhdGgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaChnZXRJbWFnZURhdGEoZmlsZVBhdGgpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAkcS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGdldENvcnJlbGF0aW5nRXZlbnRzKCkudGhlbihmdW5jdGlvbiAoY29ycmVsYXRpbmdFdmVudFJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29ycmVsYXRpbmdFdmVudFJlc3VsdCAmJiBjb3JyZWxhdGluZ0V2ZW50UmVzdWx0LmZlYXR1cmVzICYmIGNvcnJlbGF0aW5nRXZlbnRSZXN1bHQuZmVhdHVyZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvcnJlbGF0aW5nUHJvbWlzZXMgPSBbXTtcclxuXHRcdFx0XHRcdFx0XHR2bS5jb3JyZWxhdGVkRXZlbnRQcm9wcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGNvcnJlbGF0aW5nRXZlbnRSZXN1bHQuZmVhdHVyZXMsIGZ1bmN0aW9uIChmZWF0dXJlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2bS5jb3JyZWxhdGVkRXZlbnRQcm9wcy5wdXNoKGZlYXR1cmUucHJvcGVydGllcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGhfMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmlsZVBhdGggPSBkZWx0YUNvbmZpZy5ldmVudFNlcnZlci5maWxlUGF0aFVybCArIGZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGhfMjtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dm0uY29ycmVsYXRlZF9oNV91cmwgPSBmaWxlUGF0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdQcm9taXNlcy5wdXNoKGdldFBsb3REYXRhKGZpbGVQYXRoLCB0cnVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nUHJvbWlzZXMucHVzaChnZXRJbWFnZURhdGEoZmlsZVBhdGgsIHRydWUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRxLmFsbChjb3JyZWxhdGluZ1Byb21pc2VzKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29ycmVsYXRpb24gcHJlc2VudCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvcnJlbGF0aW9uID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbG90UmVzdWx0cyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogcGxvdFJlc3VsdHNBcnIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nUmVzdWx0czogY29ycmVsYXRpbmdQbG90UmVzdWx0c1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdEV2ZW50RGF0YSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNDb3JyZWxhdGlvbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxvdFJlc3VsdHMgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogcGxvdFJlc3VsdHNBcnIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdSZXN1bHRzOiBbXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRFdmVudERhdGEoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRMYXlvdXRDb21wb25lbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudFZpZXdlckxheW91dENvbXBvbmVudCA9IF8uZmluZChuZXdWYWx1ZSwgeyBzdGF0ZTogeyB0ZW1wbGF0ZU5hbWU6ICdldmVudFZpZXdlcicgfSB9KTtcclxuICAgICAgICAgICAgICAgIGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5zZXRUaXRsZShldmVudFZpZXdlckxheW91dENvbXBvbmVudC5zdGF0ZS50ZW1wbGF0ZVRpdGxlKTtcclxuXHJcbiAgICAgICAgICAgICAgICB2bS5ldmVudFZpZXdlckhlaWdodCA9IGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICB2bS5ldmVudFZpZXdlcldpZHRoID0gZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLndpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHNldCBldmVudCBsaXN0ZW5lciBmb3IgY29udGFpbmVyIHJlc2l6ZVxyXG4gICAgICAgICAgICAgICAgZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLm9uKCdyZXNpemUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdXNlIGEgJHRpbWVvdXQgdG8gbm90aWZ5IGFuZ3VsYXIgb2YgdGhlIGNoYW5nZVxyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0uZXZlbnRWaWV3ZXJIZWlnaHQgPSBldmVudFZpZXdlckxheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5ldmVudFZpZXdlcldpZHRoID0gZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLndpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhcnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJ0LnJlc2l6ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2bS5ldmVudFZpZXdlckhlaWdodCAvIDIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZtLmV2ZW50Vmlld2VyV2lkdGhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFZvdGVyKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdm0udm90ZXIgPSBuZXdWYWx1ZTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRWb3RlcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZtLnZvdGVzID0gbmV3VmFsdWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vm90ZVJlYXNvbnMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2bS52b3RlUmVhc29ucyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuIFVOQ0xBU1NJRklFRFxyXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXHJcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXHJcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXHJcbiBcclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5jb250cm9sbGVyKCdtZXRhZGF0YURpYWxvZ0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHNjb3BlLFxyXG5cdFx0JG1kRGlhbG9nLFxyXG5cdFx0ZXZlbnRNZXRhZGF0YXNcclxuXHQpe1xyXG5cdFx0JHNjb3BlLmV2ZW50TWV0YWRhdGFzID0gZXZlbnRNZXRhZGF0YXM7XHJcblx0XHQkc2NvcGUuaGlkZSA9IGZ1bmN0aW9uKCl7XHJcblx0XHRcdCRtZERpYWxvZy5oaWRlKCk7XHJcblx0XHR9O1xyXG5cdH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuY29udHJvbGxlcignZ290b0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBkZWx0YUNvbmZpZyxcbiAgICAgICAgZGVsdGFTZXJ2aWNlLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIEwsXG4gICAgICAgIGxlYWZsZXREYXRhXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKSxcbiAgICAgICAgICAgIG1hcCA9IHt9O1xuXG4gICAgICAgICRzY29wZS5tb2RlID0gJHNjb3BlLiRwYXJlbnQubW9kZTtcbiAgICAgICAgdm0uZGVsdGFDb25maWcgPSBkZWx0YUNvbmZpZztcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0ubGF0ID0gJyc7XG4gICAgICAgIHZtLmxuZyA9ICcnO1xuICAgICAgICB2bS5tZ3JzID0gJyc7XG4gICAgICAgIHZtLmxvY2F0aW9uRm9ybWF0ID0gcXMubG9jYXRpb25Gb3JtYXQgPyBxcy5sb2NhdGlvbkZvcm1hdCA6IGRlbHRhQ29uZmlnLmRlZmF1bHRMb2NhdGlvbkZvcm1hdDtcblxuICAgICAgICB2YXIgY29udmVydExhdExuZyA9IGZ1bmN0aW9uIChuZXdGb3JtYXQpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWx0YVNlcnZpY2UuY29udmVydExhdExuZyh7XG4gICAgICAgICAgICAgICAgbGF0OiB2bS5sYXQsXG4gICAgICAgICAgICAgICAgbG5nOiB2bS5sbmcsXG4gICAgICAgICAgICAgICAgbWdyczogdm0ubWdycyxcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IHZtLmxvY2F0aW9uRm9ybWF0XG4gICAgICAgICAgICB9LCBuZXdGb3JtYXQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0R290b0V4cGFuZGVkKHZtLmV4cGFuZGVkKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHZtLmdvdG8gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZGRMYXRMbmcgPSBjb252ZXJ0TGF0TG5nKCdkZCcpO1xuICAgICAgICAgICAgbWFwLnNldFZpZXcoTC5sYXRMbmcoZGRMYXRMbmcubGF0LCBkZExhdExuZy5sbmcpKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRMb2NhdGlvbkZvcm1hdCA9IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2NhdGlvbkZvcm1hdChmb3JtYXQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIG1hcCA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdm0uc2V0TG9jYXRpb25Gb3JtYXQodm0ubG9jYXRpb25Gb3JtYXQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRMb2NhdGlvbkZvcm1hdCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKHZtLmxhdCAhPT0gJycgJiYgdm0ubG5nICE9PSAnJykgfHwgdm0ubWdycyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29udmVydGVkTGF0TG5nID0gY29udmVydExhdExuZyhuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgICAgdm0ubGF0ID0gY29udmVydGVkTGF0TG5nLmxhdDtcbiAgICAgICAgICAgICAgICB2bS5sbmcgPSBjb252ZXJ0ZWRMYXRMbmcubG5nO1xuICAgICAgICAgICAgICAgIHZtLm1ncnMgPSBjb252ZXJ0ZWRMYXRMbmcubWdycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmxvY2F0aW9uRm9ybWF0ID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTsiLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuZGlyZWN0aXZlKCdkZWx0YUdvdG8nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvZ290by9nb3RvVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZ290b0NvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpOyIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuIFxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5jb250cm9sbGVyKCdsb2NhdGlvbkZvcm1hdENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBkZWx0YUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0ubG9jYXRpb24gPSB7XG4gICAgICAgICAgICBmb3JtYXQ6IHFzLmxvY2F0aW9uRm9ybWF0IHx8IGRlbHRhQ29uZmlnLmRlZmF1bHRMb2NhdGlvbkZvcm1hdCxcbiAgICAgICAgICAgIG5vcnRoOiBxcy5uIHx8ICcnLFxuICAgICAgICAgICAgc291dGg6IHFzLnMgfHwgJycsXG4gICAgICAgICAgICBlYXN0OiBxcy5lIHx8ICcnLFxuICAgICAgICAgICAgd2VzdDogcXMudyB8fCAnJyxcbiAgICAgICAgICAgIG1ncnNORTogcXMubmUgfHwgJycsXG4gICAgICAgICAgICBtZ3JzU1c6IHFzLnN3IHx8ICcnXG4gICAgICAgIH07XG4gICAgICAgIHZtLm1vZGUgPSAkc2NvcGUuJHBhcmVudC5tb2RlO1xuXG4gICAgICAgIHZtLnNldEZvcm1hdCA9IGZ1bmN0aW9uIChuZXdGb3JtYXQpIHtcbiAgICAgICAgICAgIHZhciBuZSwgc3c7XG4gICAgICAgICAgICBzd2l0Y2ggKHZtLmxvY2F0aW9uLmZvcm1hdCkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2RkJzpcbiAgICAgICAgICAgICAgICAgICAgc3cgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckREQnJvYWRjYXN0KHZtLmxvY2F0aW9uLnNvdXRoLCB2bS5sb2NhdGlvbi53ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgbmUgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckREQnJvYWRjYXN0KHZtLmxvY2F0aW9uLm5vcnRoLCB2bS5sb2NhdGlvbi5lYXN0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZG1zJzpcbiAgICAgICAgICAgICAgICAgICAgc3cgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdCh2bS5sb2NhdGlvbi5zb3V0aCwgdm0ubG9jYXRpb24ud2VzdCk7XG4gICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3Qodm0ubG9jYXRpb24ubm9ydGgsIHZtLmxvY2F0aW9uLmVhc3QpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdtZ3JzJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZtLmxvY2F0aW9uLm1ncnNTVykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3cgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvck1HUlNCcm9hZGNhc3Qodm0ubG9jYXRpb24ubWdyc1NXKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodm0ubG9jYXRpb24ubWdyc05FKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdCh2bS5sb2NhdGlvbi5tZ3JzTkUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0ubG9jYXRpb24uc291dGggPSAnJztcbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLndlc3QgPSAnJztcbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLm5vcnRoID0gJyc7XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5lYXN0ID0gJyc7XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5tZ3JzTkUgPSAnJztcbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLm1ncnNTVyA9ICcnO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG5ld0Zvcm1hdCkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2RkJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN3ICYmIG5lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5zb3V0aCA9IHN3LmRkWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24ud2VzdCA9IHN3LmRkWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24ubm9ydGggPSBuZS5kZFswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLmVhc3QgPSBuZS5kZFsxXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdkbXMnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3cgJiYgbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLnNvdXRoID0gc3cuZG1zWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24ud2VzdCA9IHN3LmRtc1sxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLm5vcnRoID0gbmUuZG1zWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24uZWFzdCA9IG5lLmRtc1sxXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdtZ3JzJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN3ICYmIG5lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5tZ3JzU1cgPSBzdy5tZ3JzIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24ubWdyc05FID0gbmUubWdycyB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdm0ubG9jYXRpb24uZm9ybWF0ID0gbmV3Rm9ybWF0O1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE1hcEJCb3hQYXJhbXModm0ubG9jYXRpb24pO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExvY2F0aW9uRm9ybWF0KG5ld0Zvcm1hdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRNYXBCQm94KCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uID0ge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuZGlyZWN0aXZlKCdkZWx0YUxvY2F0aW9uRm9ybWF0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2xvY2F0aW9uRm9ybWF0L2xvY2F0aW9uRm9ybWF0VGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnbG9jYXRpb25Gb3JtYXRDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG4gXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuY29udHJvbGxlcignbWFwQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcclxuICAgICAgICAkc2NvcGUsXHJcbiAgICAgICAgJGxvY2F0aW9uLFxyXG4gICAgICAgICR0aW1lb3V0LFxyXG4gICAgICAgICRtZFRvYXN0LFxyXG4gICAgICAgIGRlbHRhQ29uZmlnLFxyXG4gICAgICAgIGRlbHRhU2VydmljZSxcclxuICAgICAgICBzdGF0ZVNlcnZpY2UsXHJcbiAgICAgICAgc2VhcmNoU2VydmljZSxcclxuICAgICAgICBsZWFmbGV0RGF0YSxcclxuICAgICAgICB0b2FzdHIsXHJcbiAgICAgICAgTCxcclxuICAgICAgICBfXHJcbiAgICApIHtcclxuICAgICAgICB2YXIgdm0gPSB0aGlzLFxyXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKSxcclxuICAgICAgICAgICAgbWFwID0ge30sXHJcbiAgICAgICAgICAgIG1hcFpvb20gPSBxcy56b29tID8gcGFyc2VJbnQocXMuem9vbSkgOiBkZWx0YUNvbmZpZy5tYXBDZW50ZXIuem9vbSxcclxuICAgICAgICAgICAgbWFwTGF5ZXJzID0gbmV3IEwuRmVhdHVyZUdyb3VwKCksXHJcbiAgICAgICAgICAgIGV2ZW50cyA9IFtdLFxyXG4gICAgICAgICAgICBzb3VyY2VzID0gW10sXHJcbiAgICAgICAgICAgIHR5cGVzID0gW10sXHJcbiAgICAgICAgICAgIHNvdXJjZVR5cGUgPSBxcy5zb3VyY2VUeXBlLFxyXG4gICAgICAgICAgICBtYXBMYXlvdXRDb21wb25lbnQgPSB7fTtcclxuXHJcbiAgICAgICAgdm0ubWFwSGVpZ2h0ID0gJyc7XHJcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xyXG4gICAgICAgIHZtLnRyYWNrTGF5ZXJzID0gbnVsbDtcclxuICAgICAgICB2bS5hY3RpdmVFdmVudCA9IG51bGw7XHJcbiAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAocXMubiB8fCBxcy5uZSkge1xyXG4gICAgICAgICAgICB2YXIgZGRCb3VuZHMgPSBkZWx0YVNlcnZpY2UuZ2V0RERCb3VuZHMoe1xyXG4gICAgICAgICAgICAgICAgZm9ybWF0OiBxcy5sb2NhdGlvbkZvcm1hdCxcclxuICAgICAgICAgICAgICAgIG5vcnRoOiBxcy5uID8gcGFyc2VGbG9hdChxcy5uKSA6ICcnLFxyXG4gICAgICAgICAgICAgICAgc291dGg6IHFzLnMgPyBwYXJzZUZsb2F0KHFzLnMpIDogJycsXHJcbiAgICAgICAgICAgICAgICBlYXN0OiBxcy5lID8gcGFyc2VGbG9hdChxcy5lKSA6ICcnLFxyXG4gICAgICAgICAgICAgICAgd2VzdDogcXMudyA/IHBhcnNlRmxvYXQocXMudykgOiAnJyxcclxuICAgICAgICAgICAgICAgIG1ncnNORTogcXMubmUgfHwgJycsXHJcbiAgICAgICAgICAgICAgICBtZ3JzU1c6IHFzLnN3IHx8ICcnXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIHNvdXRoV2VzdCA9IEwubGF0TG5nKGRkQm91bmRzWzBdWzBdLCBkZEJvdW5kc1swXVsxXSksXHJcbiAgICAgICAgICAgICAgICBub3J0aEVhc3QgPSBMLmxhdExuZyhkZEJvdW5kc1sxXVswXSwgZGRCb3VuZHNbMV1bMV0pLFxyXG4gICAgICAgICAgICAgICAgYm91bmRzID0gTC5sYXRMbmdCb3VuZHMoc291dGhXZXN0LCBub3J0aEVhc3QpLFxyXG4gICAgICAgICAgICAgICAgY2VudGVyID0gYm91bmRzLmdldENlbnRlcigpO1xyXG5cclxuICAgICAgICAgICAgdm0uY2VudGVyID0ge1xyXG4gICAgICAgICAgICAgICAgbGF0OiBjZW50ZXIubGF0LFxyXG4gICAgICAgICAgICAgICAgbG5nOiBjZW50ZXIubG5nLFxyXG4gICAgICAgICAgICAgICAgem9vbTogbWFwWm9vbVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZtLmNlbnRlciA9IGRlbHRhQ29uZmlnLm1hcENlbnRlcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHVpLWxlYWZsZXQgZGVmYXVsdHNcclxuICAgICAgICB2bS5kZWZhdWx0cyA9IHtcclxuICAgICAgICAgICAgY3JzOiBkZWx0YUNvbmZpZy5kZWZhdWx0UHJvamVjdGlvbixcclxuICAgICAgICAgICAgem9vbUNvbnRyb2w6IHRydWUsXHJcbiAgICAgICAgICAgIGF0dHJpYnV0aW9uQ29udHJvbDogZmFsc2UsXHJcbiAgICAgICAgICAgIGNvbnRyb2xzOiB7XHJcbiAgICAgICAgICAgICAgICBsYXllcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wcmlnaHQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbGxhcHNlZDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gdWktbGVhZmxldCBiYXNlbGF5ZXJzIG9iamVjdFxyXG4gICAgICAgIHZtLmxheWVycyA9IF8uY2xvbmVEZWVwKGRlbHRhQ29uZmlnLmxheWVycyk7XHJcblxyXG4gICAgICAgIHZhciB1cGRhdGVCYXNlbGF5ZXIgPSBmdW5jdGlvbiAobGF5ZXIpIHtcclxuICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TGF5ZXJzKCkudGhlbihmdW5jdGlvbiAobGF5ZXJzKSB7XHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2gobGF5ZXJzLmJhc2VsYXllcnMsIGZ1bmN0aW9uIChsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcC5yZW1vdmVMYXllcihsYXllcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIG1hcC5hZGRMYXllcihsYXllcnMuYmFzZWxheWVyc1tsYXllci5pZF0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgc2hvd0V2ZW50VHJhY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChtYXAuZ2V0Wm9vbSgpID4gMTApIHtcclxuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBnZXQgdHJhY2tzIGZyb20gZXZlbnRcclxuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRFdmVudFRyYWNrcyh2bS5hY3RpdmVFdmVudCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgLy8gZHJhdyB0aGUgdHJhY2tzXHJcbiAgICAgICAgICAgICAgICB2YXIgdHJhY2tMYXllcnMgPSBuZXcgTC5GZWF0dXJlR3JvdXAoKSxcclxuICAgICAgICAgICAgICAgICAgICBnZW9KU09OID0gbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2UwSWR4ID0gMCxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2UxSWR4ID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goZGF0YS5mZWF0dXJlcywgZnVuY3Rpb24gKGZlYXR1cmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdHJhY2tDb2xvciA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrQ29sb3IgPSBfLmZpbmQoZGVsdGFDb25maWcuc291cmNlcywgeyBpZGVudGl0eTogdHJ1ZSB9KS5jaGFydENvbG9yc1tzb3VyY2UwSWR4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlMElkeCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrQ29sb3IgPSBfLmZpbmQoZGVsdGFDb25maWcuc291cmNlcywge2lkZW50aXR5OiBmYWxzZSB9KS5jaGFydENvbG9yc1tzb3VyY2UxSWR4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlMUlkeCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyB1c2UgZmVhdHVyZSBnZW9tZXRyeSB3aGVuIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIHVzZSB0aGUgZmVhdHVyZSBsYXQvbG9uIHBvaW50IHRvIGNyZWF0ZSBhIGdlb21ldHJ5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUuZ2VvbWV0cnkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTiA9IEwuZ2VvSnNvbihmZWF0dXJlLmdlb21ldHJ5LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZTogeyBjb2xvcjogdHJhY2tDb2xvciB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25FYWNoRmVhdHVyZTogZnVuY3Rpb24gKGZlYXR1cmVEYXRhLCBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLmZlYXR1cmUucHJvcGVydGllcyA9IGZlYXR1cmUucHJvcGVydGllcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrTGF5ZXJzLmFkZExheWVyKGdlb0pTT04pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsYXRsbmcgPSBMLmxhdExuZyhmZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmxhdEZpZWxkXSwgZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5sb25GaWVsZF0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhdGxuZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNpcmNsZU1hcmtlciA9IEwuY2lyY2xlTWFya2VyKGxhdGxuZywgeyBjb2xvcjogdm0uYWN0aXZlRXZlbnQuZXZlbnRTb3VyY2UuY29sb3IgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTiA9IEwuZ2VvSnNvbihjaXJjbGVNYXJrZXIudG9HZW9KU09OKCksIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGREYXRhOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaXJjbGVNYXJrZXIudG9HZW9KU09OKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludFRvTGF5ZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNpcmNsZU1hcmtlcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRWFjaEZlYXR1cmU6IGZ1bmN0aW9uIChmZWF0dXJlRGF0YSwgbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzID0gZmVhdHVyZS5wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2tMYXllcnMuYWRkTGF5ZXIoZ2VvSlNPTik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdlb0pTT04pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5lYWNoTGF5ZXIoZnVuY3Rpb24gKGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXllci5mZWF0dXJlLmV2ZW50U291cmNlID0gXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF19KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLmZlYXR1cmUuZXZlbnRUeXBlID0gXy5maW5kKGRlbHRhQ29uZmlnLnR5cGVzLCB7IHZhbHVlOiBsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLnR5cGVGaWVsZF0gfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9KU09OLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5sYXllci5iaW5kUG9wdXAoZGVsdGFTZXJ2aWNlLmdldExlYWZsZXRQb3B1cENvbnRlbnQoZS5sYXllci5mZWF0dXJlKSwgeyAnb2Zmc2V0JzogTC5wb2ludCgwLCAtMTApLCAnYXV0b1Bhbic6IGZhbHNlIH0pLm9wZW5Qb3B1cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5vbignbW91c2VvdXQnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5sYXllci5jbG9zZVBvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChfLmtleXModHJhY2tMYXllcnMuZ2V0Qm91bmRzKCkpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnREYXRhKHRyYWNrTGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodm0udHJhY2tMYXllcnMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIG90aGVyIHRyYWNrcyBiZWZvcmUgYWRkaW5nIG5ldyBvbmVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnRyYWNrTGF5ZXJzLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNsb25lIHRyYWNrTGF5ZXJzIGZvciB1c2UgZWxzZXdoZXJlIHRvIGF2b2lkIHRyaWdnZXJpbmdcclxuICAgICAgICAgICAgICAgICAgICAvLyBhbiBhbmd1bGFyIHdhdGNoIHVwZGF0ZVxyXG4gICAgICAgICAgICAgICAgICAgIHZtLnRyYWNrTGF5ZXJzID0gXy5jbG9uZURlZXAodHJhY2tMYXllcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXAuZ2V0Wm9vbSgpID4gMTApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZExheWVyKHZtLnRyYWNrTGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIERyYXdpbmcgVHJhY2tzOiBHZW9tZXRyeSBhbmQgTGF0L0xvbiB2YWx1ZXMgYXJlIG51bGwuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgdXBkYXRlRXZlbnRzID0gXy5kZWJvdW5jZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGV2ZW50cyA9IFtdO1xyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnRzKFtdKTtcclxuICAgICAgICAgICAgbWFwTGF5ZXJzLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2VzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgZXZlbnRzJyk7XHJcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2FkaW5nRXZlbnRzKHZtLmxvYWRpbmcpO1xyXG4gICAgICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRFdmVudHMoc291cmNlcykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmZlYXR1cmVzICYmIGRhdGEuZmVhdHVyZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2VvSlNPTiA9IEwuZ2VvSnNvbihkYXRhLmZlYXR1cmVzLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludFRvTGF5ZXI6IGZ1bmN0aW9uIChmZWF0dXJlLCBsYXRsbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc291cmNlID0gXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IGZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF19KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3IgPSBzb3VyY2UgPyBzb3VyY2UuY29sb3IgOiAnIzU1NSc7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMLmNpcmNsZU1hcmtlcihsYXRsbmcsIHsgY29sb3I6IGNvbG9yIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFjdGl2ZU1hcEV2ZW50ID0gXy5maW5kKGV2ZW50cywgeyBmZWF0dXJlOiB2bS5hY3RpdmVFdmVudCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aXZlTWFwRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTWFwRXZlbnQuc2V0U3R5bGUoeyBjb2xvcjogYWN0aXZlTWFwRXZlbnQuZmVhdHVyZS5ldmVudFNvdXJjZS5jb2xvciwgZmlsbE9wYWNpdHk6IDAuMiB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTWFwRXZlbnQuYnJpbmdUb0JhY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFwRXZlbnQgPSBlLmxheWVyLmZlYXR1cmU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBFdmVudC5zY3JvbGxUbyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlRXZlbnQobWFwRXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5sYXllci5zZXRTdHlsZSh7IGNvbG9yOiAnI2IyZmY1OScsIGZpbGxPcGFjaXR5OiAwLjggfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLmxheWVyLmJyaW5nVG9Gcm9udCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5vbignbW91c2VvdmVyJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUubGF5ZXIuYmluZFBvcHVwKGRlbHRhU2VydmljZS5nZXRMZWFmbGV0UG9wdXBDb250ZW50KGUubGF5ZXIuZmVhdHVyZSksIHsgJ29mZnNldCc6IEwucG9pbnQoMCwgLTEwKSwgJ2F1dG9QYW4nOiBmYWxzZSB9KS5vcGVuUG9wdXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04ub24oJ21vdXNlb3V0JywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUubGF5ZXIuY2xvc2VQb3B1cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5lYWNoTGF5ZXIoZnVuY3Rpb24gKGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXllci5mZWF0dXJlLmV2ZW50U291cmNlID0gXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF19KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLmZlYXR1cmUuZXZlbnRUeXBlID0gXy5maW5kKGRlbHRhQ29uZmlnLnR5cGVzLCB7IHZhbHVlOiBsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLnR5cGVGaWVsZF0gfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm8gdHlwZSBmaWx0ZXJzLCBzbyBqdXN0IGFkZCBhbGwgc291cmNlIGZlYXR1cmVzIHRvIHRoZSBtYXBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMuYWRkTGF5ZXIobGF5ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpdGVyYXRlIG92ZXIgdHlwZSBmaWx0ZXJzIGFuZCBvbmx5IGFkZCBmZWF0dXJlcyB0aGF0IG1hdGNoIHRoZSBjcml0ZXJpYVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0eXBlcywgZnVuY3Rpb24gKHR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyLmZlYXR1cmUucHJvcGVydGllc1t0eXBlLmZpZWxkXSA9PT0gdHlwZS52YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZExheWVyKGxheWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzID0gbWFwTGF5ZXJzLmdldExheWVycygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnRzKF8ubWFwKGV2ZW50cywgJ2ZlYXR1cmUnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEV2ZW50TGF5ZXJzKG1hcExheWVycy5nZXRMYXllcnMoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2FkaW5nRXZlbnRzKHZtLmxvYWRpbmcpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCl7XHJcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCA3NTApO1xyXG5cclxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgbWFwID0gZGF0YTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIGRlZmF1bHQgaWNvbiBwYXRoXHJcbiAgICAgICAgICAgICAgICBMLkljb24uRGVmYXVsdC5pbWFnZVBhdGggPSAnL3N0eWxlc2hlZXRzL2ltYWdlcyc7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkIGZlYXR1cmUgZ3JvdXAgdG8gdGhlIG1hcFxyXG4gICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZFRvKG1hcCk7XHJcblxyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE1hcEJvdW5kcyhtYXAuZ2V0Qm91bmRzKCkpO1xyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE1hcFpvb20obWFwLmdldFpvb20oKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkIGNvb3JkaW5hdGVzIGNvbnRyb2xcclxuICAgICAgICAgICAgICAgIEwuY29udHJvbC5jb29yZGluYXRlcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlVXNlcklucHV0OiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSkuYWRkVG8obWFwKTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgYmFzZWxheWVySWQgPSBxcy5iYXNlbGF5ZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZWxheWVyID0ge307XHJcbiAgICAgICAgICAgICAgICBpZiAoYmFzZWxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgcmVxdWVzdGVkIGJhc2VsYXllciB0byB2bS5sYXllcnMuYmFzZWxheWVycyBmaXJzdFxyXG4gICAgICAgICAgICAgICAgICAgIGJhc2VsYXllciA9IF8uZmluZChkZWx0YUNvbmZpZy5sYXllcnMuYmFzZWxheWVycywgeyBpZDogYmFzZWxheWVySWQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlQmFzZWxheWVyKGJhc2VsYXllcik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGJhc2VsYXllciBub3QgcHJlc2VudCBpbiBxdWVyeXN0cmluZywgc28ganVzdCBnbyB3aXRoIGRlZmF1bHRzXHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZWxheWVyID0gZGVsdGFDb25maWcubGF5ZXJzLmJhc2VsYXllcnNbZGVsdGFDb25maWcuZGVmYXVsdEJhc2VsYXllcl07XHJcbiAgICAgICAgICAgICAgICAgICAgdm0ubGF5ZXJzID0gXy5jbG9uZURlZXAoZGVsdGFDb25maWcubGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmFzZWxheWVyKGJhc2VsYXllcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbWFwLm9uKCdiYXNlbGF5ZXJjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBiYXNlbGF5ZXIgPSBfLmZpbmQoZGVsdGFDb25maWcubGF5ZXJzLmJhc2VsYXllcnMsIHsgbmFtZTogZS5uYW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRCYXNlbGF5ZXIoYmFzZWxheWVyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIG1hcC5vbignbW92ZWVuZCcsIF8uZGVib3VuY2UoZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TWFwWm9vbShlLnRhcmdldC5nZXRab29tKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBCb3VuZHMoZS50YXJnZXQuZ2V0Qm91bmRzKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5hY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaG93L2hpZGUgZXZlbnQgdHJhY2sgYmFzZWQgb24gem9vbSBsZXZlbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5rZXlzKHZtLnRyYWNrTGF5ZXJzLmdldEJvdW5kcygpKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQuZ2V0Wm9vbSgpID4gMTApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMuYWRkTGF5ZXIodm0udHJhY2tMYXllcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMucmVtb3ZlTGF5ZXIodm0udHJhY2tMYXllcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgNzUwKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRCYXNlbGF5ZXIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB1cGRhdGVCYXNlbGF5ZXIobmV3VmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRBY3RpdmVTb3VyY2VzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc291cmNlcyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRBY3RpdmVUeXBlcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHR5cGVzID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0U291cmNlVHlwZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNvdXJjZVR5cGUgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QWN0aXZlRXZlbnQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVFdmVudC5hY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHZhciBhY3RpdmVNYXBMYXllciA9IF8uZmluZChtYXBMYXllcnMuZ2V0TGF5ZXJzKCksIHsgZmVhdHVyZTogdm0uYWN0aXZlRXZlbnQgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aXZlTWFwTGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVNYXBMYXllci5zZXRTdHlsZSh7IGNvbG9yOiBhY3RpdmVNYXBMYXllci5mZWF0dXJlLmV2ZW50U291cmNlLmNvbG9yLCBmaWxsT3BhY2l0eTogMC4yIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZU1hcExheWVyLmJyaW5nVG9CYWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVFdmVudCA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICAgICAgdm0uYWN0aXZlRXZlbnQuYWN0aXZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGlmICghc3RhdGVTZXJ2aWNlLmdldEV2ZW50TGF5ZXJzKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnRMYXllcnMobWFwTGF5ZXJzLmdldExheWVycygpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHNob3dFdmVudFRyYWNrKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRMYXlvdXRDb21wb25lbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbWFwTGF5b3V0Q29tcG9uZW50ID0gXy5maW5kKG5ld1ZhbHVlLCB7IHN0YXRlOiB7IHRlbXBsYXRlTmFtZTogJ21hcCcgfSB9KTtcclxuICAgICAgICAgICAgdm0ubWFwSGVpZ2h0ID0gbWFwTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5oZWlnaHQ7XHJcblxyXG4gICAgICAgICAgICAvLyBzZXQgZXZlbnQgbGlzdGVuZXIgZm9yIGNvbnRhaW5lciByZXNpemVcclxuICAgICAgICAgICAgbWFwTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5vbigncmVzaXplJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgLy8gdXNlIGEgJHRpbWVvdXQgdG8gbm90aWZ5IGFuZ3VsYXIgb2YgdGhlIGNoYW5nZVxyXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLm1hcEhlaWdodCA9IG1hcExheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuIFxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5jb250cm9sbGVyKCdzaWRlYmFyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIGRlbHRhU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBfLFxuICAgICAgICBkZWx0YUNvbmZpZ1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzO1xuXG4gICAgICAgIHZtLmxvZ28gPSBkZWx0YUNvbmZpZy5sb2dvO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLnNvdXJjZUZpbHRlckV4cGFuZGVkID0gc3RhdGVTZXJ2aWNlLmdldFNvdXJjZUZpbHRlckV4cGFuZGVkKCk7XG4gICAgICAgIHZtLnR5cGVGaWx0ZXJFeHBhbmRlZCA9IHN0YXRlU2VydmljZS5nZXRUeXBlRmlsdGVyRXhwYW5kZWQoKTtcbiAgICAgICAgdm0udGVtcG9yYWxGaWx0ZXJFeHBhbmRlZCA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlckV4cGFuZGVkKCk7XG4gICAgICAgIHZtLmdvdG9FeHBhbmRlZCA9IHN0YXRlU2VydmljZS5nZXRHb3RvRXhwYW5kZWQoKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0U291cmNlRmlsdGVyRXhwYW5kZWQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0uc291cmNlRmlsdGVyRXhwYW5kZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFR5cGVGaWx0ZXJFeHBhbmRlZCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS50eXBlRmlsdGVyRXhwYW5kZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyRXhwYW5kZWQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0udGVtcG9yYWxGaWx0ZXJFeHBhbmRlZCA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0R290b0V4cGFuZGVkKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmdvdG9FeHBhbmRlZCA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbiBcbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuY29udHJvbGxlcignc291cmNlRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgZGVsdGFDb25maWcsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLmRlbHRhQ29uZmlnID0gZGVsdGFDb25maWc7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5zb3VyY2VzID0gXy5jbG9uZURlZXAoZGVsdGFDb25maWcuc291cmNlcyk7XG4gICAgICAgIHZtLmFjdGl2ZVNvdXJjZXMgPSBbXTtcbiAgICAgICAgdm0uc291cmNlVHlwZXMgPSBfLmNsb25lRGVlcChkZWx0YUNvbmZpZy5zb3VyY2VUeXBlcyk7XG4gICAgICAgIHZtLnNvdXJjZVR5cGUgPSBxcy5zb3VyY2VUeXBlID8gXy5maW5kKHZtLnNvdXJjZVR5cGVzLCB7IG5hbWU6IHFzLnNvdXJjZVR5cGUgfSkgOiBfLmZpbmQoZGVsdGFDb25maWcuc291cmNlVHlwZXMsIHsgYWN0aXZlOiB0cnVlIH0pO1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U291cmNlRmlsdGVyRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZVNvdXJjZSA9IGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgICAgICAgIHNvdXJjZS5hY3RpdmUgPSAhc291cmNlLmFjdGl2ZTtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFfLmZpbmQodm0uYWN0aXZlU291cmNlcywgc291cmNlKSkge1xuICAgICAgICAgICAgICAgICAgICB2bS5hY3RpdmVTb3VyY2VzLnB1c2goc291cmNlKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZVNvdXJjZXModm0uYWN0aXZlU291cmNlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5maW5kKHZtLmFjdGl2ZVNvdXJjZXMsIHNvdXJjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5yZW1vdmUodm0uYWN0aXZlU291cmNlcywgc291cmNlKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZVNvdXJjZXModm0uYWN0aXZlU291cmNlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldFNvdXJjZVR5cGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U291cmNlVHlwZSh2bS5zb3VyY2VUeXBlLm5hbWUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHFzU291cmNlcyA9IHFzLnNvdXJjZXM7XG5cbiAgICAgICAgICAgIGlmIChxc1NvdXJjZXMpIHtcbiAgICAgICAgICAgICAgICBxc1NvdXJjZXMgPSBxc1NvdXJjZXMuc3BsaXQoJywnKTtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2gocXNTb3VyY2VzLCBmdW5jdGlvbiAoc291cmNlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc291cmNlID0gXy5maW5kKHZtLnNvdXJjZXMsIHsgbmFtZTogc291cmNlTmFtZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgdm0udG9nZ2xlU291cmNlKHNvdXJjZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZtLnNldFNvdXJjZVR5cGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuZGlyZWN0aXZlKCdkZWx0YVNvdXJjZUZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9zb3VyY2VGaWx0ZXIvc291cmNlRmlsdGVyVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnc291cmNlRmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7IiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4gXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLmNvbnRyb2xsZXIoJ3RlbXBvcmFsRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgbW9tZW50LFxuICAgICAgICBkZWx0YUNvbmZpZyxcblx0XHQkbWRUb2FzdCxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0ubW9tZW50ID0gbW9tZW50O1xuICAgICAgICB2bS5kZWx0YUNvbmZpZyA9IGRlbHRhQ29uZmlnO1xuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0ubW9kZSA9ICRzY29wZS5tb2RlO1xuICAgICAgICB2bS5leHBhbmRlZFJhbmdlID0gcXMuZHVyYXRpb24gPyBmYWxzZSA6IHRydWU7XG4gICAgICAgIHZtLmV4cGFuZGVkRHVyYXRpb24gPSBxcy5kdXJhdGlvbiA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5tb21lbnQgPSBtb21lbnQ7XG4gICAgICAgIHZtLnN0YXJ0ID0gJyc7XG4gICAgICAgIHZtLnN0b3AgPSAnJztcbiAgICAgICAgdm0uZHVyYXRpb25MZW5ndGggPSBxcy5kdXJhdGlvbkxlbmd0aCA/IHBhcnNlSW50KHFzLmR1cmF0aW9uTGVuZ3RoKSA6IGRlbHRhQ29uZmlnLmRlZmF1bHREdXJhdGlvbkxlbmd0aDtcbiAgICAgICAgdm0uZHVyYXRpb25zID0gZGVsdGFDb25maWcuZHVyYXRpb25zO1xuICAgICAgICB2bS5zZWxlY3RlZER1cmF0aW9uID0gcXMuZHVyYXRpb24gPyBfLmZpbmQoZGVsdGFDb25maWcuZHVyYXRpb25zLCB7IHZhbHVlOiBxcy5kdXJhdGlvbiB9KSA6IF8uZmluZChkZWx0YUNvbmZpZy5kdXJhdGlvbnMsIHsgZGVmYXVsdDogdHJ1ZSB9KTtcbiAgICAgICAgdm0ucmFuZ2VzID0gZGVsdGFDb25maWcucmFuZ2VzO1xuICAgICAgICB2bS50ZW1wb3JhbFpvb20gPSAnJztcbiAgICAgICAgdm0uaW52YWxpZCA9IGZhbHNlO1xuXG4gICAgICAgICRzY29wZS5pc0Vycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHZtLmludmFsaWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNldFRlbXBvcmFsRmlsdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHZtLmV4cGFuZGVkRHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB2bS5zdGFydCA9IG1vbWVudC51dGMobW9tZW50LnV0YygpLmVuZE9mKCdkJykpLnN1YnRyYWN0KHZtLmR1cmF0aW9uTGVuZ3RoLCB2bS5zZWxlY3RlZER1cmF0aW9uLnZhbHVlKS5zdGFydE9mKCdkJykudG9EYXRlKCk7XG4gICAgICAgICAgICAgICAgdm0uc3RvcCA9IG1vbWVudC51dGMoKS5lbmRPZignZCcpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodm0uc3RhcnQgJiYgdm0uc3RvcCkge1xuICAgICAgICAgICAgICAgIHZhciBtb21lbnRTdGFydCA9IG1vbWVudC51dGModm0uc3RhcnQudG9JU09TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgICAgIG1vbWVudFN0b3AgPSBtb21lbnQudXRjKHZtLnN0b3AudG9JU09TdHJpbmcoKSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobW9tZW50U3RhcnQuaXNCZWZvcmUobW9tZW50U3RvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uaW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGVtcG9yYWxGaWx0ZXIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHZtLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogdm0uc3RvcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiB2bS5leHBhbmRlZER1cmF0aW9uID8gdm0uc2VsZWN0ZWREdXJhdGlvbi52YWx1ZSA6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbkxlbmd0aDogdm0uZXhwYW5kZWREdXJhdGlvbiA/IHBhcnNlSW50KHZtLmR1cmF0aW9uTGVuZ3RoKSA6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uaW52YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1N0b3AgRGF0ZSBpcyBiZWZvcmUgU3RhcnQgRGF0ZS4nKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5pbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdUZW1wb3JhbCBmaWx0ZXIgY29udGFpbnMgaW52YWxpZCBkYXRlL3RpbWUgdmFsdWVzLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgICAgIGlmICh2bS5leHBhbmRlZFJhbmdlKSB7XG4gICAgICAgICAgICAgICAgdm0uc3RhcnQgPSBxcy5zdGFydCA/IG1vbWVudC51dGMocXMuc3RhcnQpLnRvRGF0ZSgpIDogbW9tZW50LnV0YygpLnN1YnRyYWN0KGRlbHRhQ29uZmlnLmRlZmF1bHREYXlzQmFjaywgJ2RheXMnKS5zdGFydE9mKCdkJykudG9EYXRlKCk7XG4gICAgICAgICAgICAgICAgdm0uc3RvcCA9IHFzLnN0b3AgPyBtb21lbnQudXRjKHFzLnN0b3ApLnRvRGF0ZSgpIDogbW9tZW50LnV0YygpLmVuZE9mKCdkJykudG9EYXRlKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZtLmV4cGFuZGVkRHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB2bS5zZWxlY3RlZER1cmF0aW9uID0gcXMuZHVyYXRpb24gPyBfLmZpbmQodm0uZHVyYXRpb25zLCB7IHZhbHVlOiBxcy5kdXJhdGlvbiB9KSA6IF8uZmluZCh2bS5kdXJhdGlvbnMsIHsgZGVmYXVsdDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICB2bS5kdXJhdGlvbkxlbmd0aCA9IHFzLmR1cmF0aW9uTGVuZ3RoID8gcGFyc2VJbnQocXMuZHVyYXRpb25MZW5ndGgpIDogZGVsdGFDb25maWcuZGVmYXVsdER1cmF0aW9uTGVuZ3RoO1xuICAgICAgICAgICAgICAgIHZtLnN0YXJ0ID0gbW9tZW50LnV0Yyhtb21lbnQudXRjKCkuZW5kT2YoJ2QnKSkuc3VidHJhY3Qodm0uZHVyYXRpb25MZW5ndGgsIHZtLnNlbGVjdGVkRHVyYXRpb24udmFsdWUpLnN0YXJ0T2YoJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgICAgICB2bS5zdG9wID0gbW9tZW50LnV0YygpLmVuZE9mKCdkJykudG9EYXRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUZW1wb3JhbEZpbHRlckV4cGFuZGVkKHZtLmV4cGFuZGVkKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZEZpbHRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkUmFuZ2UgPSAhdm0uZXhwYW5kZWRSYW5nZTtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkRHVyYXRpb24gPSAhdm0uZXhwYW5kZWREdXJhdGlvbjtcblxuICAgICAgICAgICAgc2V0VGVtcG9yYWxGaWx0ZXIoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRSYW5nZSA9IGZ1bmN0aW9uICh1bml0cywgdW5pdE9mVGltZSkge1xuICAgICAgICAgICAgdm0uc3RhcnQgPSBtb21lbnQudXRjKCkuYWRkKHVuaXRzLCB1bml0T2ZUaW1lKS5zdGFydE9mKCdkYXknKS50b0RhdGUoKTtcbiAgICAgICAgICAgIHZtLnN0b3AgPSBtb21lbnQudXRjKCkuZW5kT2YoJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc3RlcEJhY2t3YXJkID0gZnVuY3Rpb24gKCRldmVudCkge1xuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgdmFyIGRpZmYgPSBtb21lbnQudXRjKHZtLnN0b3AudG9JU09TdHJpbmcoKSkuZGlmZihtb21lbnQudXRjKHZtLnN0YXJ0LnRvSVNPU3RyaW5nKCkpLCAnZCcpO1xuICAgICAgICAgICAgdm0uc3RhcnQgPSBtb21lbnQudXRjKHZtLnN0YXJ0LnRvSVNPU3RyaW5nKCkpLnN1YnRyYWN0KGRpZmYsICdkJykudG9EYXRlKCk7XG4gICAgICAgICAgICB2bS5zdG9wID0gbW9tZW50LnV0Yyh2bS5zdG9wLnRvSVNPU3RyaW5nKCkpLnN1YnRyYWN0KGRpZmYsICdkJykudG9EYXRlKCk7XG4gICAgICAgICAgICBzZXRUZW1wb3JhbEZpbHRlcigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnN0ZXBGb3J3YXJkID0gZnVuY3Rpb24gKCRldmVudCkge1xuICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgdmFyIGRpZmYgPSBtb21lbnQudXRjKHZtLnN0b3AudG9JU09TdHJpbmcoKSkuZGlmZihtb21lbnQudXRjKHZtLnN0YXJ0LnRvSVNPU3RyaW5nKCkpLCAnZCcpO1xuICAgICAgICAgICAgdm0uc3RvcCA9IG1vbWVudC51dGModm0uc3RvcC50b0lTT1N0cmluZygpKS5hZGQoZGlmZiwgJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgIHZtLnN0YXJ0ID0gbW9tZW50LnV0Yyh2bS5zdGFydC50b0lTT1N0cmluZygpKS5hZGQoZGlmZiwgJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXJ0JywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0b3AnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2V0VGVtcG9yYWxGaWx0ZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIHZtLnN0YXJ0ID0gbW9tZW50LnV0YyhuZXdWYWx1ZS5zdGFydC50b0lTT1N0cmluZygpKS50b0RhdGUoKTtcblx0XHRcdHZtLnN0b3AgPSBtb21lbnQudXRjKG5ld1ZhbHVlLnN0b3AudG9JU09TdHJpbmcoKSkudG9EYXRlKCk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbmV3VmFsdWUuZHVyYXRpb24gIT09ICd1bmRlZmluZWQnICYmIG5ld1ZhbHVlLmR1cmF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkRHVyYXRpb24gPSBfLmZpbmQodm0uZHVyYXRpb25zLCB7dmFsdWU6IG5ld1ZhbHVlLmR1cmF0aW9ufSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlLmR1cmF0aW9uTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmR1cmF0aW9uTGVuZ3RoID0gbmV3VmFsdWUuZHVyYXRpb25MZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdm0uZXhwYW5kZWRSYW5nZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZtLmV4cGFuZGVkRHVyYXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5leHBhbmRlZFJhbmdlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2bS5leHBhbmRlZER1cmF0aW9uID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh2bS5tb2RlID09PSAnYW5hbHl6ZScpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbFpvb20oKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHZtLnRlbXBvcmFsWm9vbSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5kaXJlY3RpdmUoJ2RlbHRhVGVtcG9yYWxGaWx0ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvdGVtcG9yYWxGaWx0ZXIvdGVtcG9yYWxGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICd0ZW1wb3JhbEZpbHRlckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nLFxuICAgICAgICAgICAgICAgIG1vZGU6ICdAJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5jb250cm9sbGVyKCd0eXBlRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgZGVsdGFDb25maWcsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcblxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmRlbHRhQ29uZmlnID0gZGVsdGFDb25maWc7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5hY3RpdmVTb3VyY2VzID0gc3RhdGVTZXJ2aWNlLmdldEFjdGl2ZVNvdXJjZXMoKTtcbiAgICAgICAgdm0udHlwZXMgPSBfLmNsb25lRGVlcChkZWx0YUNvbmZpZy50eXBlcyk7XG4gICAgICAgIHZtLmFjdGl2ZVR5cGVzID0gW107XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUeXBlRmlsdGVyRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZVR5cGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICAgICAgdHlwZS5hY3RpdmUgPSAhdHlwZS5hY3RpdmU7XG4gICAgICAgICAgICBpZiAodHlwZS5hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIV8uZmluZCh2bS5hY3RpdmVUeXBlcywgdHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uYWN0aXZlVHlwZXMucHVzaCh0eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZVR5cGVzKHZtLmFjdGl2ZVR5cGVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChfLmZpbmQodm0uYWN0aXZlVHlwZXMsIHR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIF8ucmVtb3ZlKHZtLmFjdGl2ZVR5cGVzLCB0eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZVR5cGVzKHZtLmFjdGl2ZVR5cGVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXNUeXBlcyA9ICRsb2NhdGlvbi5zZWFyY2goKS50eXBlcztcblxuICAgICAgICAgICAgaWYgKHFzVHlwZXMpIHtcbiAgICAgICAgICAgICAgICBxc1R5cGVzID0gcXNUeXBlcy5zcGxpdCgnLCcpO1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChxc1R5cGVzLCBmdW5jdGlvbiAodHlwZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBfLmZpbmQodm0udHlwZXMsIHsgbmFtZTogdHlwZU5hbWUgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZtLnRvZ2dsZVR5cGUodHlwZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QWN0aXZlU291cmNlcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5hY3RpdmVTb3VyY2VzID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTsiLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5kaXJlY3RpdmUoJ2RlbHRhVHlwZUZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy90eXBlRmlsdGVyL3R5cGVGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICd0eXBlRmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
