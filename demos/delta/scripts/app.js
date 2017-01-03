/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {

    'use strict';

    var LAYOUT_KEY = 'deltaLayoutConfig';
    // DEFAULT_LAYOUT is the configuration for GoldenLayout we'll use if the
    // user hasn't saved one yet or if the one they have saved causes an error
    // of some sort.
    var DEFAULT_LAYOUT = {
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

    app.config(['$provide', '$mdThemingProvider', 'WebworkerProvider', function ($provide, $mdThemingProvider, WebworkerProvider) {
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

        WebworkerProvider.setHelperPath('./scripts/webworkerDeps/worker_wrapper.js');
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

    app.run(['$rootScope', '$http', '$compile', '$mdToast', '$window', 'deltaConfig', 'deltaService', 'localStorageService', 'stateService', 'voteService', 'GoldenLayout', '_', function($rootScope, $http, $compile, $mdToast, $window, deltaConfig, deltaService, localStorageService, stateService, voteService, GoldenLayout, _) {
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

        var initializeLayoutWithConfig = function(layoutConfig) {
            var layout = new GoldenLayout(layoutConfig);
            var components = [];

            layout.registerComponent('template', function (container, state) {
                container.setTitle(state.templateTitle);
                $http.get(state.templateId, { cache: true }).success(function (html) {
                    html = $compile('<div>' + html + '</div>')($rootScope);
                    container.getElement().html(html);
                    components.push({ container: container, state: state });
                    stateService.setLayoutComponents(components);
                });
            });

            layout.on('stateChanged', function() {
                var state = layout.toConfig();
                localStorageService.set(LAYOUT_KEY, state);
                stateService.setLayoutConfig(state);
            });

            layout.init();
        };

        // golden layout config - eventually use stateService for this...
        var layoutConfig = DEFAULT_LAYOUT;
        if (localStorageService.get(LAYOUT_KEY)) {
            layoutConfig = localStorageService.get(LAYOUT_KEY);
        }

        // Try to use the layout configuration from local storage, but if
        // for whatever reason that fails, fallback to the default
        try {
            initializeLayoutWithConfig(layoutConfig);
            stateService.setLayoutConfig(layoutConfig);
        }
        catch(e) {
            initializeLayoutWithConfig(DEFAULT_LAYOUT);
            stateService.setLayoutConfig(layoutConfig);
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
            defaultTimeRangeValue: 6,
            defaultTimeRangeType: 'h',
            ranges: [
                {
                    units: -6,
                    unitOfTime: 'hours',
                    label: '6 Hours'
                },
                {
                    units: -12,
                    unitOfTime: 'hours',
                    label: '12 Hours'
                },
                {
                    units: -24,
                    unitOfTime: 'hours',
                    label: '24 Hours'
                },
                {
                    units: -7,
                    unitOfTime: 'days',
                    label: '7 Days'
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
                typeFilter: true,
                confidenceFilter: true,
                countryFilter: true
            },
            onlyCorrelations: 'all'
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
                    var tpl = '<ul class="list-unstyled event-details-popup">';

                    tpl += '<li style="color: ' + feature.eventSource.color + '"><i class="fa ' + feature.eventType.icon + '"></i> <b>' + feature.eventType.title + '</b></li>';
                    if (feature.properties[deltaConfig.server.latField] && feature.properties[deltaConfig.server.lonField]) {
                        tpl += '<li>' + feature.properties[deltaConfig.server.latField].toFixed(3) + ', ' + feature.properties[deltaConfig.server.lonField].toFixed(3) + '</li>';
                    }
                    if (feature.properties[deltaConfig.server.dateField]) {
                        tpl += '<li>' + moment.utc(feature.properties[deltaConfig.server.dateField]).format('YYYY-MM-DD hh:mm:ss[Z]') + '</li>';
                    }
                    tpl += feature.properties.is_correlated ? '<li>Correlated</li>' : '';
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
                identities = _.map(sources, 'identity'),
                identityFilter = '',
                onlyCorrelations = stateService.getOnlyCorrelations(),
                correlationFilter = onlyCorrelations === 1 ? 'is_correlated=true AND ' : 'is_correlated IS NOT NULL AND ';

            var sourceTypeFilter = sourceType === 'All' ?
                deltaConfig.server.sourceTypeField + ' IS NOT NULL AND ' :
                deltaConfig.server.sourceTypeField + '=\'' + sourceType + '\' AND ';

            // if the amount of identities selected is fewer than the total available, query on those identities to speed things up
            if (identities.length < deltaConfig.sources.length) {
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
                cql_filter: sourceTypeFilter + identityFilter + correlationFilter + deltaConfig.server.dateField + '>=' + start + ' AND ' + deltaConfig.server.dateField + '<=' + stop,
                outputFormat: 'application/json'
            };
        };

        var getEventTracksParams = function (params) {
            return {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                typeName: deltaConfig.server.layers.tracks.workspace + ':' + deltaConfig.server.layers.tracks.layer,
                cql_filter: deltaConfig.server.productField + '=\'' + params[deltaConfig.server.productField] + '\' AND ' + deltaConfig.server.datasetField + '=' + params[deltaConfig.server.datasetField],
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

        var getPlotDataParams = function (params) {
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

        var getFrameDataParams = function (params) {
            return {
                url: params.url,
                format: params.format || 'json'
            };
        };

        var getCountriesParams = function () {
            return {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                typeName: deltaConfig.server.layers.countries.workspace + ':' + deltaConfig.server.layers.countries.layer,
                outputFormat: 'application/json'
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
                }, function (err) {
                    console.log(err);
                    if(err.status === -1) {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving events. (CORS)').theme('warn-toast').position('top right'));
                    } else {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving events. Status: ' + err.status).theme('warn-toast').position('top right'));
                        d.reject(err);
                    }
                });

                return d.promise;
            },
            getEventTracks: function (params) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.server.url,
                    params: getEventTracksParams(params)
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    d.reject(err);
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
                }, function (err) {
                    console.log(err);
                    d.reject(err);
                });

                return d.promise;
            },
            getPlotData: function (params) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    cache: true,
                    url: deltaConfig.eventServer.ajaxUrl + '/plot-data/',
                    params: getPlotDataParams(params)
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    d.reject(err);
                });

                return d.promise;
            },
            getFrameData: function (params) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    cache: true,
                    url: deltaConfig.eventServer.ajaxUrl + '/frames/',
                    params: getFrameDataParams(params)
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    d.reject(err);
                });

                return d.promise;
            },
            getCountries: function () {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: deltaConfig.server.url,
                    params: getCountriesParams()
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    d.reject(err);
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
            confidenceFilterExpanded = false,
            countryFilterExpanded = false,
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
            layoutConfig = null,
            layoutComponents = [],
            loadingEvents = false,
            voter = null,
            votes = [],
            voteReasons = [],
            confidence = null,
            onlyCorrelations = queryString.onlyCorrelations,
            countries = [];

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
            getConfidenceFilterExpanded: function () {
                return confidenceFilterExpanded;
            },
            setConfidenceFilterExpanded: function (data) {
                confidenceFilterExpanded = data;
            },
            getCountryFilterExpanded: function () {
                return countryFilterExpanded;
            },
            setCountryFilterExpanded: function (data) {
                countryFilterExpanded = data;
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
            getLayoutConfig: function() {
                return layoutConfig;
            },
            setLayoutConfig: function(config) {
                layoutConfig = config;
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
            },
            getConfidence: function () {
                return confidence;
            },
            setConfidence: function (data) {
                confidence = data;
                queryString.confidence = confidence;
                $location.search(queryString);
            },
            getOnlyCorrelations: function () {
                return onlyCorrelations;
            },
            setOnlyCorrelations: function (data) {
                onlyCorrelations = data;
                queryString.onlyCorrelations = onlyCorrelations;
                $location.search(queryString);
            },
            getCountries: function () {
                return countries;
            },
            setCountries: function (data) {
                countries = data;
                queryString.countries = countries;
                $location.search(queryString);
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

    angular.module('delta').controller('confidenceFilterController', ['$scope', '$location', '$timeout', 'stateService', 'deltaConfig', '_', function (
        $scope,
        $location,
        $timeout,
        stateService,
        deltaConfig,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.deltaConfig = deltaConfig;
        vm.expanded = $scope.expanded;
        vm.confidence = _.clone(deltaConfig.defaultConfidence);

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setConfidenceFilterExpanded(vm.expanded);
        };

        var initialize = function () {
            if (qs.confidence) {
                vm.confidence = parseFloat(qs.confidence);
            }
            stateService.setConfidence(vm.confidence);
        };

        initialize();

        $scope.$watch('vm.confidence', _.debounce(function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            $timeout(function () {
                stateService.setConfidence(parseFloat(newValue));
            });
        }, 50));
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('delta').directive('deltaConfidenceFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/confidenceFilter/confidenceFilterTemplate.html',
            controller: 'confidenceFilterController',
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

    angular.module('delta').controller('countryFilterController', ['$scope', '$location', '$timeout', '$mdToast', 'searchService', 'stateService', 'deltaConfig', '_', function (
        $scope,
        $location,
        $timeout,
        $mdToast,
        searchService,
        stateService,
        deltaConfig,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.deltaConfig = deltaConfig;
        vm.expanded = $scope.expanded;
        vm.countries = [];
        vm.selectedCountries = [];
        vm.loadingCountries = true;

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setCountryFilterExpanded(vm.expanded);
        };

        vm.filterByCountries = function () {
            stateService.setCountries(_.map(vm.selectedCountries, 'genc_2'));
        };

        var getCountries = function () {
            searchService.getCountries().then(function (data) {
                vm.countries = _.sortBy(_.map(data.features, 'properties'), function (prop) {
                    return prop.country;
                });
                if (qs.countries) {
                    if (qs.countries.constructor === Array) {
                        _.forEach(qs.countries, function (country) {
                            vm.selectedCountries.push(_.find(vm.countries, { genc_2: country }));
                        });
                    } else {
                        vm.selectedCountries.push(_.find(vm.countries, { genc_2: qs.countries }));
                    }
                    if (vm.selectedCountries.length > 0) {
                        vm.filterByCountries();
                    }
                }
                vm.loadingCountries = false;
            }, function (error) {
                console.log(error);
                $mdToast.show($mdToast.simple().textContent('Error Retrieving Countries').theme('warn-toast').position('top right'));
                vm.loadingCountries = false;
            });
        };

        var initialize = function () {
            getCountries();
            if (qs.countries) {
                vm.countries = qs.countries;
            }
            stateService.setCountries(vm.countries);
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

    angular.module('delta').directive('deltaCountryFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/countryFilter/countryFilterTemplate.html',
            controller: 'countryFilterController',
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
            eventViewerLayoutComponent = null,
            chartWorker,
            plotData,
            chartData,
            frameData,
            animate,
            playbackFrames,
            chart,
            hasCorrelation,
            frameIdx,
            correlatingDateDiff,
            chartFocus,
            chartColors,
            defaultPlotData,
            correlatingPlotData,
            correlatingEventData,
            frameMinVal,
            frameMaxVal,
            frameRange,
            correlatingFrameMinVal,
            correlatingFrameMaxVal,
            correlatingFrameRange;

        vm.eventViewerHeight = '';
        vm.eventViewerWidth = '';

        var initialize = function () {
            chartWorker = null;
            plotData = [];
            chartData = null;
            frameData = [];
            animate = null;
            playbackFrames = [];
            chart = null;
            hasCorrelation = false;
            frameIdx = 0;
            correlatingDateDiff = null;
            chartFocus = null;
            chartColors = {};
            defaultPlotData = null;
            correlatingPlotData = null;
            correlatingEventData = null;
            frameMinVal = null;
            frameMaxVal = null;
            frameRange = null;
            correlatingFrameMinVal = null;
            correlatingFrameMaxVal = null;
            correlatingFrameRange = null;

            vm._ = _;
            vm.deltaConfig = deltaConfig;
            vm.stateService = stateService;
            vm.eventData = null;
            vm.loading = true;
            vm.loadingStatus = null;
            vm.selectedFeature = null;
            vm.eventError = null;
            vm.sensors = null;
            vm.chipCards = [];
            vm.correlatingChipCards = [];
            vm.availableChipCards = [];
            vm.activeChipCard = null;
            vm.activeCorrelatingChipCard = null;
            vm.playbackDelay = 0;
            vm.voter = stateService.getVoter();
            vm.votes = stateService.getVotes();
            vm.voteReasons = stateService.getVoteReasons();
            vm.voteObj = new Vote();
            vm.h5Url = null;
            vm.correlatedH5Url = null;
            vm.playbackState = true;
            vm.playbackDirection = 'forward';
            vm.eventProps = [];
            vm.correlatedEventProps = [];
            vm.internalSource = _.find(deltaConfig.sources, { identity: true });
            vm.externalSource = _.find(deltaConfig.sources, { identity: false });
            hotkeys.bindTo($scope)
                .add({
                    combo: 'left',
                    description: 'Rewind',
                    callback: function () {
                        vm.setPlaybackDirection('backward');
                    }
                }).add({
                    combo: 'right',
                    description: 'Forward',
                    callback: function () {
                        vm.setPlaybackDirection('forward');
                    }
                }).add({
                    combo: 'up',
                    description: 'Play/Pause',
                    callback: function () {
                        vm.setPlaybackState(!vm.playbackState);
                    }
                });
        };

        if (typeof (chart) === 'undefined') {
            // initialize has never been called
            initialize();
        }

        var drawFrame = function (frameArr) {
            if (playbackFrames.length > 0) {
                _.forEach(frameArr, function (frame) {
                    var canvas = angular.element('.' + _.replace(frame.sensorTitle, ' ', ''))[0],
                        ctx = canvas.getContext('2d');

                    // clear previous drawing
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // set width and height to match image
                    ctx.canvas.height = frame.height;
                    ctx.canvas.width = frame.width;

                    // Get a pointer to the current location in the frame.
                    var palette = ctx.getImageData(0, 0, canvas.width, canvas.height); //x,y,w,h
                    // Wrap your array as a Uint8Array
                    palette.data.set(frame.rgba);
                    // Repost the data.
                    ctx.putImageData(palette, 0, 0);
                });
            }
        };

        var getFrame = function (frameArr) {
            if (playbackFrames.length > 0) {
                var returnFrames = [];
                _.forEach(frameArr, function (frame) {
                    if (!frame.rgba) {
                        // frame has not yet had a Uint8Array calculation
                        var rgba = _.flatMap(frame.values, function (value) {
                            value = frame.isCorrelation ? value - correlatingFrameMinVal : value - frameMinVal;
                            value = value >= 0 ? value : 0;
                            value = frame.isCorrelation ? Math.round((value / correlatingFrameRange) * 254.0) : Math.round((value / frameRange) * 254.0);
                            return [value, value, value, 255];
                        });
                        frame.rgba = new Uint8Array(rgba);
                    }
                    returnFrames.push(frame);
                });
                return returnFrames;
            }
        };

        var updateFramesToRender = function () {
            var frameObj = _.groupBy(frameData[0].results, 'sensor'),
                framesToRender = frameObj[vm.activeChipCard.sensor],
                correlatingFrameObj = {},
                correlatingFramesToRender = [];

            if (hasCorrelation) {
                correlatingFrameObj = _.groupBy(frameData[1].results, 'sensor');
                correlatingFramesToRender = correlatingFrameObj[vm.activeChipCard.sensor];
            }

            // calculate min, max, and range for both sets of frames
            frameMinVal = _.min(_.map(framesToRender, 'min'));
            frameMaxVal = _.max(_.map(framesToRender, 'max'));
            frameMaxVal = frameMinVal >= 0 ? frameMaxVal : frameMaxVal + Math.abs(frameMinVal);
            frameMinVal = frameMinVal >= 0 ? frameMinVal : 0;
            frameRange = frameMaxVal - frameMinVal;
            if (hasCorrelation) {
                correlatingFrameMinVal = _.min(_.map(correlatingFramesToRender, 'min'));
                correlatingFrameMaxVal = _.max(_.map(correlatingFramesToRender, 'max'));
                correlatingFrameMaxVal = correlatingFrameMinVal >= 0 ? correlatingFrameMaxVal : correlatingFrameMaxVal + Math.abs(correlatingFrameMinVal);
                correlatingFrameMinVal = correlatingFrameMinVal >= 0 ? correlatingFrameMinVal : 0;
                correlatingFrameRange = correlatingFrameMaxVal - correlatingFrameMinVal;
            }

            // combine frames so there's only one playback source
            playbackFrames = _.sortBy(_.union(framesToRender, correlatingFramesToRender), 'timestamp');

            // adjust initial playback speed based on playbackFrames length
            if (playbackFrames.length < 25) {
                vm.playbackDelay = 100;
            } else if (playbackFrames.length >= 25 && playbackFrames.length < 50) {
                vm.playbackDelay = 50;
            } else if (playbackFrames.length >= 50 && playbackFrames.length < 100) {
                vm.playbackDelay = 20;
            } else if (playbackFrames.length >= 100 && playbackFrames.length < 200) {
                vm.playbackDelay = 10;
            } else {
                vm.playbackDelay = 0;
            }
        };

        var updateChartFocus = function () {
            chartFocus = [vm.activeChipCard.chartId];
            if (vm.activeCorrelatingChipCard) {
                chartFocus.push(vm.activeCorrelatingChipCard.chartId);
            }
            if (chart) {
                chart.focus(chartFocus);
            }
        };

        var renderFrames = function () {
            var gridLine = null;

            updateFramesToRender();

            var gridLines = _.map(chartData, function (frame) {
                return {
                    value: frame.time,
                    class: 'frame-line time-' + _.replace(frame.time, '.', ''),
                    sensor: frame.sensor
                };
            });
            chart.xgrids(gridLines);

            animate = function () {
                if (playbackFrames.length > 0) {
                    if (gridLine) {
                        gridLine.style.display = 'none';
                    }
                    gridLine = angular.element('.time-' + _.replace(playbackFrames[frameIdx].timestamp, '.', ''))[0];
                    if (gridLine) {
                        gridLine.style.display = 'block';
                    }
                    $timeout(function () {
                        if (playbackFrames[frameIdx]) {
                            // if multiple frames have the same timestamp then play them all at the same time
                            var frameArr = _.filter(playbackFrames, {timestamp: playbackFrames[frameIdx].timestamp});
                            drawFrame(getFrame(frameArr));
                            if (vm.playbackDirection === 'forward') {
                                frameIdx = frameIdx + frameArr.length;
                                if (frameIdx >= playbackFrames.length) {
                                    frameIdx = 0;
                                }
                            } else {
                                frameIdx = frameIdx - frameArr.length;
                                if (frameIdx < 0) {
                                    frameIdx = playbackFrames.length - 1;
                                }
                            }
                            if (vm.playbackState && animate) {
                                animate();
                            }
                        }
                    }, vm.playbackDelay);
                }
            };

            animate();
        };

        function formatChartData (plotData, correlatingDateDiff, baseUrl) {
            if (!location.origin) { // jshint ignore:line
                location.origin = location.protocol + "//" + location.hostname + (location.port ? ':' + location.port: ''); // jshint ignore:line
            }
            importScripts(location.origin + baseUrl + '/scripts/webworkerDeps/lodash.js'); // jshint ignore:line

            var plotArr = [];
            _.forEach(plotData, function (data) {
                // the convention for a point is a 4 item array [time, sensor index, object index, intensity]
                _.forEach(data.points, function (point) {
                    var pointData = {},
                        pointValue = point[3];

                    if (data.isCorrelation) {
                        // normalize time values if a difference in start
                        // dates is present. correlatingDateDiff will be positive
                        // when the correlating event started value is later
                        // than the event started value, and vice versa
                        pointData.time = correlatingDateDiff ? point[0] - correlatingDateDiff : point[0];
                    } else {
                        // always use the given time value for the selected event
                        pointData.time = point[0];
                    }
                    pointData[data.sensors[point[1]]] = pointValue;
                    pointData.sensor = data.sensors[point[1]];
                    plotArr.push(pointData);
                });
            });

            return plotArr;
        }

        var initChart = function () {
            var expFormat = d3.format('.1e'),
                numFormat = d3.format('n');

            // generate time/intensity chart using C3
            chart = c3.generate({
                data: {
                    json: []
                },
                transition: {
                    duration: null
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
                            return Math.pow(10, value).toFixed(6) + ' ' + defaultPlotData.y_column.units.label;
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
                            text: 'Seconds since ' + moment.utc(defaultPlotData.started).format('YYYY-MM-DD HH:mm:ss[Z]'),
                            position: 'outer-left'
                        }
                    },
                    y: {
                        label: {
                            text: defaultPlotData.y_column.units.label,
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
                subchart: {
                    show: true
                },
                onmouseout: function () {
                    chart.focus(chartFocus);
                }
            });
        };

        var sortSensors = function (sensors) {
            return _.sortBy(sensors, function (sensor) {
                if (_.startsWith(sensor, deltaConfig.defaultSensor)) {
                    return sensor.split(' ')[1];
                }
                return sensor;
            });
        };

        var renderChart = function () {
            // instantiate the web worker
            chartWorker = Webworker.create(formatChartData);

            // start the web worker and wait for the result
            chartWorker.run(plotData, correlatingDateDiff, deltaConfig.baseUrl).then(function (result) {
                if (defaultPlotData) {
                    chartData = result;
                    vm.loading = false;
                    initChart();

                    var keys = correlatingPlotData ? _.concat(defaultPlotData.sensors, correlatingPlotData.sensors) : defaultPlotData.sensors;
                    keys = sortSensors(keys);

                    var source0Idx = 0,
                        source1Idx = 0;

                    // set up chart colors based on source type
                    _.forEach(keys, function (key) {
                        if (_.endsWith(key, deltaConfig.externalSourceLabel)) {
                            chartColors[key] = _.find(deltaConfig.sources, { identity: false }).chartColors[source0Idx];
                            source0Idx++;
                        } else {
                            chartColors[key] = _.find(deltaConfig.sources, { identity: true }).chartColors[source1Idx];
                            source1Idx++;
                        }
                    });

                    var data = {
                        json: chartData,
                        keys: {
                            x: 'time',
                            value: keys
                        },
                        colors: chartColors
                    };
                    chart.load(data);

                    // determine color for card title based on color in chart
                    _.forEach(vm.chipCards, function (card) {
                        card.color = chart.data.colors()[card.chartId];
                    });

                    _.forEach(vm.correlatingChipCards, function (card) {
                        card.color = chart.data.colors()[card.chartId];
                    });

                    updateChartFocus();
                    renderFrames();
                }
            });
        };

        var initEventData = function () {
            vm.loadingStatus = 'Initializing...';

            // flatten frameData and group by sensor, then convert
            // to pairs so the template knows how many image cards
            // to display and what their labels should be
            var chipCards = _.toPairs(_.groupBy(_.flatten(_.map(frameData, 'results')), 'sensor'));
            var chipCardObjs = _.map(chipCards, function (card) {
                var canvasClass = vm.selectedFeature.properties[deltaConfig.server.identityField] ? _.replace(card[0], ' ', '') : _.replace(card[0], ' ', '') + deltaConfig.externalSourceLabel,
                    chartId = vm.selectedFeature.properties[deltaConfig.server.identityField] ? card[0] : card[0] + deltaConfig.externalSourceLabel;

                return {
                    sensor: card[0],
                    images: card[1],
                    active: false,
                    class: canvasClass,
                    chartId: chartId
                };
            });

            var chipCardOrder = sortSensors(_.map(chipCardObjs, 'sensor'));

            _.forEach(chipCardOrder, function (sensor) {
                vm.chipCards.push(_.find(chipCardObjs, { sensor: sensor }));
            });

            vm.activeChipCard = vm.chipCards[0];
            vm.activeChipCard.active = true;
            vm.availableChipCards = _.cloneDeep(vm.chipCards);

            if (hasCorrelation) {
                // set up correlating chip cards
                vm.correlatingChipCards = _.map(chipCards, function (card) {
                    return {
                        sensor: card[0],
                        images: card[1],
                        active: card[0] === vm.activeChipCard.sensor,
                        class: vm.selectedFeature.properties[deltaConfig.server.identityField] ? _.replace(card[0], ' ', '') + deltaConfig.externalSourceLabel : _.replace(card[0], ' ', ''),
                        chartId: vm.selectedFeature.properties[deltaConfig.server.identityField] ? card[0] + deltaConfig.externalSourceLabel : card[0]
                    };
                });
                vm.activeCorrelatingChipCard = _.find(vm.correlatingChipCards, { sensor: vm.activeChipCard.sensor });
                vm.availableChipCards = _.uniqBy(vm.availableChipCards.concat(vm.correlatingChipCards), 'sensor');

                // calculate correlating event time difference
                correlatingDateDiff = moment(defaultPlotData.started).diff(moment(correlatingPlotData.started), 's');

                // adjust for possible timestamp difference
                _.forEach(frameData, function (data) {
                    _.forEach(data.results, function (result) {
                        if (result.isCorrelation) {
                            result.timestamp = correlatingDateDiff ? result.timestamp - correlatingDateDiff : result.timestamp;
                        }
                    });
                });
            }
            renderChart();
        };

        var getCorrelatingEvents = function () {
            var d = $q.defer();
            searchService.getCorrelatingEvents(vm.selectedFeature).then(function (result) {
                d.resolve(result);
            }, function (error) {
                vm.loading = false;
                vm.eventError = error.status > -1 ? error.status + ': ' + error.statusText : 'Connection error; unable to retrieve correlating events.';
            });
            return d.promise;
        };

        var getPlotData = function (filePath, isCorrelation) {
            isCorrelation = isCorrelation || false;
            var d = $q.defer();
            searchService.getPlotData({ url: filePath }).then(function (result) {
                result.isCorrelation = isCorrelation;
                if (vm.selectedFeature.properties[deltaConfig.server.identityField]) {
                    // selected feature is us, so correlated data needs to be labeled
                    if (isCorrelation) {
                        result.sensors = _.map(result.sensors, function (sensor) {
                            return sensor + deltaConfig.externalSourceLabel;
                        });
                    }
                } else {
                    // selected feature is them, so non-correlated data needs to be labeled
                    if (!isCorrelation) {
                        result.sensors = _.map(result.sensors, function (sensor) {
                            return sensor + deltaConfig.externalSourceLabel;
                        });
                    }
                }
                d.resolve(plotData.push(result));
            }, function (error) {
                vm.loading = false;
                vm.eventError = error.status > -1 ? error.status + ': ' + error.statusText : 'Connection error; unable to retrieve plot data.';
            });
            return d.promise;
        };

        var getFrameData = function (filePath, isCorrelation) {
            isCorrelation = isCorrelation || false;
            var d = $q.defer();
            searchService.getFrameData({ url: filePath }).then(function (result) {
                _.forEach(result.results, function (r) {
                    if (vm.selectedFeature.properties[deltaConfig.server.identityField]) {
                        r.sensorTitle = isCorrelation ? r.sensor + deltaConfig.externalSourceLabel : r.sensor;
                    } else {
                        r.sensorTitle = !isCorrelation ? r.sensor + deltaConfig.externalSourceLabel : r.sensor;
                    }
                    r.isCorrelation = isCorrelation;
                });
                d.resolve(frameData.push(result));
            }, function (error) {
                vm.loading = false;
                vm.eventError = error.status > -1 ? error.status + ': ' + error.statusText : 'Connection error; unable to retrieve frame data.';
            });
            return d.promise;
        };

        var getCorrelatingEventData = function (params) {
            var d = $q.defer();
            searchService.getEventTracks(params).then(function (data) {
                d.resolve(correlatingEventData = data);
            }, function (error) {
                vm.loading = false;
                vm.eventError = error.status > -1 ? error.status + ': ' + error.statusText : 'Connection error; unable to retrieve correlating event data.';
            });
            return d.promise;
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

        vm.setActiveChipCard = function () {
            playbackFrames = [];
            frameIdx = 0;
            var currActiveChipCard = _.find(vm.chipCards, { active: true }),
                currActiveCorrelatingChipCard = _.find(vm.correlatingChipCards, { active: true });

            if (currActiveChipCard) {
                currActiveChipCard.active = false;
            }
            if (currActiveCorrelatingChipCard) {
                currActiveCorrelatingChipCard.active = false;
            }

            vm.activeChipCard = _.find(vm.chipCards, { sensor: vm.activeChipCard.sensor });
            vm.activeCorrelatingChipCard = _.find(vm.correlatingChipCards, { sensor: vm.activeChipCard.sensor });

            if (vm.activeChipCard) {
                vm.activeChipCard.active = true;
            }
            if (vm.activeCorrelatingChipCard) {
                vm.activeCorrelatingChipCard.active = true;
            }

            updateChartFocus();
            updateFramesToRender();
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

        vm.matchSignature = function (sensor) {
            var chartData = _.find(chart.data(), { id: sensor }),
                values = chartData ? chartData.values : null;

            // filter out null values
            values = _.filter(values, function (v) {
                return v.value !== null;
            });
            console.log(values);

            //var sig = {
            //    sig_template: [[times],[intensities]],
            //    event_data: [[eventTimes],[eventIntensities]]
            //};
        };

        vm.setPlaybackState = function (state) {
            vm.playbackState = state;
            if (vm.playbackState) {
                animate();
            }
        };

        vm.setPlaybackDirection = function (direction) {
            var oldDirection = vm.playbackDirection;
            vm.playbackDirection = direction;
            if (!vm.playbackState) {
                if (!angular.equals(oldDirection, direction)) {
                    // user changed direction
                    if (direction === 'forward') {
                        frameIdx = frameIdx < playbackFrames.length - 2 ? frameIdx + 2 : 0;
                    } else {
                        frameIdx = frameIdx > 1 ? frameIdx - 2 : playbackFrames.length - 1;
                    }
                }
                animate();
            }
        };

        $scope.$watchCollection('vm.stateService.getEventData()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            // clean up any leftover data from a previously viewed event
            if (chartWorker) {
                chartWorker.terminate();
            }

            if (chart) {
                chart.destroy();
            }

            initialize();

            if (newValue) {
                vm.loading = true;
                vm.loadingStatus = 'Requesting Data...';
                vm.eventData = newValue;

                // retrieve plot and image data for active event
                var tracks = vm.eventData.getLayers(),
                    promises = [];

                vm.eventProps = _.map(tracks, function (d) {
                    return d.getLayers()[0].feature.properties;
                });

                vm.selectedFeature = tracks[0].getLayers()[0].feature;
                vm.h5Url = deltaConfig.eventServer.filePathUrl + vm.selectedFeature.properties.file_path;

                if (vm.voter) {
                    vm.voteObj.dataset_id = vm.selectedFeature.properties[deltaConfig.server.datasetField];
                    vm.voteObj.product_id = vm.selectedFeature.properties[deltaConfig.server.productField];
                    vm.voteObj.nasic = vm.selectedFeature.properties[deltaConfig.server.identityField];
                    vm.voteObj.voter_name = vm.voter.voter_name;

                    // look for existing vote for this event
                    var eventVote = _.find(vm.votes, { dataset_id: vm.voteObj.dataset_id, product_id: vm.voteObj.product_id });
                    if (eventVote) {
                        vm.voteObj = Vote.transformer(eventVote);
                    }
                }

                if (vm.selectedFeature && vm.selectedFeature.properties.file_path) {
                    var filePath = deltaConfig.eventServer.filePathUrl + vm.selectedFeature.properties.file_path;
                    promises.push(getPlotData(filePath));
                    promises.push(getFrameData(filePath));
                }

                $q.all(promises).then(function () {
                    getCorrelatingEvents().then(function (result) {
                        if (result && result.features && result.features.length > 0) {
                            var correlatingPromises = [],
                                feature = result.features[0];

                            if (feature.properties.file_path_2) {
                                var filePath = deltaConfig.eventServer.filePathUrl + feature.properties.file_path_2,
                                    eventParams = {};

                                vm.correlatedH5Url = filePath;
                                eventParams[deltaConfig.server.productField] = feature.properties[deltaConfig.server.productField + '_2'];
                                eventParams[deltaConfig.server.datasetField] = feature.properties[deltaConfig.server.datasetField + '_2'];
                                correlatingPromises.push(getCorrelatingEventData(eventParams));
                                correlatingPromises.push(getPlotData(filePath, true));
                                correlatingPromises.push(getFrameData(filePath, true));
                            }

                            $q.all(correlatingPromises).then(function () {
                                console.log('correlation present');
                                hasCorrelation = true;
                                defaultPlotData = _.find(plotData, { isCorrelation: false });
                                correlatingPlotData = _.find(plotData, { isCorrelation: true });
                                vm.correlatedEventProps = _.map(correlatingEventData.features, 'properties');
                                initEventData();
                            });
                        } else {
                            hasCorrelation = false;
                            defaultPlotData = _.find(plotData, { isCorrelation: false });
                            initEventData();
                        }
                    });
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
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/
 
(function () {
    'use strict';

    angular.module('delta').controller('eventViewerControllerSave', ['$scope', '$q', '$timeout', '$mdDialog', '$mdToast', 'deltaConfig', 'stateService', 'searchService', 'voteService', 'Vote', 'Webworker', 'moment', 'hotkeys', 'c3', 'd3', '_', function (
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
            }, function (error) {
                vm.loadingChart = false;
                vm.eventError = error.status > -1 ? error.status + ': ' + error.statusText : 'Connection error; unable to retrieve correlating events.';
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
                vm.eventError = error.status > -1 ? error.status + ': ' + error.statusText : 'Connection error; unable to retrieve plot data.';
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
                vm.eventError = error.status > -1 ? error.status + ': ' + error.statusText : 'Connection error; unable to retrieve image data.';
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
            activeEvent = null,
            confidence = 0,
            onlyCorrelations = 'all',
            totalEvents = [];

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
                if (activeMapLayer) {
                    activeMapLayer.setStyle({color: activeMapLayer.feature.eventSource.color, fillOpacity: 0.2});
                    // activeMapLayer.bringToBack();
                }
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

        var filterEvents = function () {
            vm.mapEvents = _.filter(totalEvents, function (event) {
                if (onlyCorrelations === 'correlated') {
                    return event.properties.is_correlated && event.properties[deltaConfig.server.confidenceField] >= confidence;
                } else if (onlyCorrelations === 'noncorrelated') {
                    return !event.properties.is_correlated && event.properties[deltaConfig.server.confidenceField] >= confidence;
                }
                return event.properties[deltaConfig.server.confidenceField] >= confidence;
            });

            // update panel title
            if (eventsLayoutComponent) {
                eventsLayoutComponent.container.setTitle(eventsLayoutComponent.state.templateTitle + ' (' + vm.mapEvents.length + ')');
            }
        };

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
            totalEvents = _.orderBy(newValue, ['properties.event_lat', 'properties.event_lon']);
            filterEvents();

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
        });

        $scope.$watch('vm.stateService.getConfidence()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            confidence = newValue;
            filterEvents();
        });

        $scope.$watch('vm.stateService.getOnlyCorrelations()', function (newValue) {
            onlyCorrelations = newValue;
            filterEvents();
        });

        $scope.$watchCollection('vm.stateService.getLayoutComponents()', function (newValue) {
            if (!eventsLayoutComponent) {
                // hasn't been set yet, so try to find it
                eventsLayoutComponent = _.find(newValue, {state: {templateName: 'events'}});
                if (eventsLayoutComponent) {
                    // found it, so set up vars and events
                    eventsLayoutComponent.container.setTitle(eventsLayoutComponent.state.templateTitle + ' (' + vm.mapEvents.length + ')');

                    vm.eventsHeight = eventsLayoutComponent.container.height;
                    vm.eventsWidth = eventsLayoutComponent.container.width;

                    // set event listener for container resize
                    var resize = function () {

                        leafletData.getMap().then(function (map) {
                            map.invalidateSize();
                        });

                        // use a $timeout to notify angular of the change
                        $timeout(function () {
                            vm.eventsHeight = eventsLayoutComponent.container.height;
                            vm.eventsWidth = eventsLayoutComponent.container.width;
                            // trigger a fake window resize to force md-virutal-repeat-container to redraw
                            angular.element(window).triggerHandler('resize');
                        });
                    };
                    eventsLayoutComponent.container.on('resize', resize);
                    eventsLayoutComponent.container.on('show', resize);
                }
            }
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
            confidence = 0,
            sourceType = qs.sourceType,
            mapLayoutComponent = null,
            onlyCorrelations = qs.onlyCorrelations ? qs.onlyCorrelations : deltaConfig.onlyCorrelations,
            countries = qs.countries ? qs.countries : [];

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
            var eventParams = {};
            eventParams[deltaConfig.server.productField] = vm.activeEvent.properties[deltaConfig.server.productField];
            eventParams[deltaConfig.server.datasetField] = vm.activeEvent.properties[deltaConfig.server.datasetField];
            searchService.getEventTracks(eventParams).then(function (data) {
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

        var filterEvents = function () {
            _.forEach(events, function (event) {
                if (onlyCorrelations === 'correlated') {
                    if (event.feature.properties.is_correlated && event.feature.properties[deltaConfig.server.confidenceField] >= confidence) {
                        mapLayers.addLayer(event);
                    } else {
                        mapLayers.removeLayer(event);
                    }
                } else if (onlyCorrelations === 'noncorrelated') {
                    if (!event.feature.properties.is_correlated && event.feature.properties[deltaConfig.server.confidenceField] >= confidence) {
                        mapLayers.addLayer(event);
                    } else {
                        mapLayers.removeLayer(event);
                    }
                } else if (onlyCorrelations === 'all') {
                    if (event.feature.properties[deltaConfig.server.confidenceField] >= confidence) {
                        mapLayers.addLayer(event);
                    } else {
                        mapLayers.removeLayer(event);
                    }
                }
            });
        };

        var filterEventsByLocation = function () {
            var mapBounds = stateService.getMapBounds(),
                filteredEvents = _.filter(events, function (event) {
                    return mapBounds.contains(event._latlng);
                });

            stateService.setEvents(_.map(filteredEvents, 'feature'));
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
                                    // activeMapEvent.bringToBack();
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
                            if ((countries.length > 0 && _.indexOf(countries, layer.feature.properties.country_code) > -1) || countries.length === 0) {
                                layer.feature.eventSource = _.find(deltaConfig.sources, {identity: layer.feature.properties[deltaConfig.server.identityField]});
                                layer.feature.eventType = _.find(deltaConfig.types, {value: layer.feature.properties[deltaConfig.server.typeField]});
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
                            }
                        });
                        events = mapLayers.getLayers();
                        filterEvents();
                    }
                    filterEventsByLocation();
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

                // disable leaflet keyboard shortcuts to prevent collision with angular hotkeys
                map.keyboard.disable();

                // set the default icon path
                L.Icon.Default.imagePath = '/stylesheets/images';

                // add feature group to the map
                mapLayers.addTo(map);

                stateService.setMapBounds(map.getBounds());
                stateService.setMapZoom(map.getZoom());
                stateService.setOnlyCorrelations(onlyCorrelations);

                // add coordinates control
                L.control.coordinates({
                    enableUserInput: false,
                    useLatLngOrder: true
                }).addTo(map);

                // add control to only show events with correlations
                var correlatedBtn = L.easyButton({
                    states: [{
                        stateName: 'correlated',
                        icon: 'delta-mapbtn delta-mapbtn-correlated',
                        title: 'Showing events with correlations',
                        onClick: function (btn) {
                            btn.state('noncorrelated');
                            onlyCorrelations = 'noncorrelated';
                            stateService.setOnlyCorrelations(onlyCorrelations);
                        }
                    }, {
                        stateName: 'noncorrelated',
                        icon: 'delta-mapbtn delta-mapbtn-noncorrelated',
                        title: 'Showing events with no correlations',
                        onClick: function (btn) {
                            btn.state('all');
                            onlyCorrelations = 'all';
                            stateService.setOnlyCorrelations(onlyCorrelations);
                        }
                    }, {
                        stateName: 'all',
                        icon: 'delta-mapbtn delta-mapbtn-all',
                        title: 'Showing all events',
                        onClick: function (btn) {
                            btn.state('correlated');
                            onlyCorrelations = 'correlated';
                            stateService.setOnlyCorrelations(onlyCorrelations);
                        }
                    }]
                });
                correlatedBtn.state(onlyCorrelations);
                correlatedBtn.addTo(map);

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
                    filterEventsByLocation();
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

        $scope.$watch('vm.stateService.getConfidence()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            confidence = newValue;
            filterEvents();
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
                    // activeMapLayer.bringToBack();
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
            if (!mapLayoutComponent) {
                // hasn't been set yet, so try to find it
                mapLayoutComponent = _.find(newValue, { state: { templateName: 'map' } });
                if (mapLayoutComponent) {
                    // found it, so set up vars and events
                    vm.mapHeight = mapLayoutComponent.container.height;

                    // set event listener for container resize
                    mapLayoutComponent.container.on('resize', function () {
                        // use a $timeout to notify angular of the change
                        $timeout(function () {
                            vm.mapHeight = mapLayoutComponent.container.height;
                        });
                    });
                }
            }
        });

        $scope.$watch('vm.stateService.getOnlyCorrelations()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            onlyCorrelations = newValue;
            filterEvents();
        });

        $scope.$watchCollection('vm.stateService.getCountries()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            countries = newValue;
            updateEvents();
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
        vm.stateService = stateService;
        vm.moment = moment;
        vm.start = '';
        vm.stop = '';
        vm.durationLength = qs.durationLength ? parseInt(qs.durationLength) : deltaConfig.defaultDurationLength;
        vm.durations = deltaConfig.durations;
        vm.selectedDuration = qs.duration ? _.find(deltaConfig.durations, { value: qs.duration }) : _.find(deltaConfig.durations, { default: true });
        vm.ranges = deltaConfig.ranges;
        vm.invalid = false;

        // toggle to tell whether change was made from a range button or
        // the date/time input
        vm.setFromRange = false;


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

            vm.start = qs.start ? moment.utc(qs.start).toDate() : moment.utc().subtract(deltaConfig.defaultTimeRangeValue, deltaConfig.defaultTimeRangeType).startOf(deltaConfig.defaultTimeRangeType).toDate();
            vm.stop = qs.stop ? moment.utc(qs.stop).toDate() : moment.utc().endOf(deltaConfig.defaultTimeRangeType).toDate();

            setTemporalFilter();
        };
        initialize();

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setTemporalFilterExpanded(vm.expanded);
        };

        vm.setRange = function (units, unitOfTime) {
            var now = moment.utc();
            vm.start = moment.utc(now).add(units, unitOfTime).toDate();
            vm.stop = now.toDate();
            vm.setFromRange = true;
        };

        $scope.$watch('vm.start', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }

            // update the stop time keeping the current duration
            if (!vm.setFromRange) {
                var oldTime = moment.utc(oldValue);
                var newTime = moment.utc(newValue);
                var diff = moment.duration(newTime.diff(oldTime)).asMinutes();
                vm.stop = moment.utc(vm.stop.toISOString()).add(diff, 'Minutes').toDate();
            }
            vm.setFromRange = false;

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

            vm.start = moment.utc(newValue.start.toISOString()).toDate();
            vm.stop = moment.utc(newValue.stop.toISOString()).toDate();

            if (typeof newValue.duration !== 'undefined' && newValue.duration !== null) {
                if (newValue.duration) {
                    vm.selectedDuration = _.find(vm.durations, {value: newValue.duration});
                }

                if (newValue.durationLength) {
                    vm.durationLength = newValue.durationLength;
                }

            } else {
                vm.expandedRange = true;
                vm.expandedDuration = false;
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

        vm.toggleSource = function (source, ignoreActive) {
            if (!ignoreActive) {
                source.active = !source.active;
            }
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
                // activate sources based on querystring
                qsSources = qsSources.split(',');
                _.forEach(vm.sources, function (source) {
                    source.active = _.indexOf(qsSources, source.name) > -1;
                    vm.toggleSource(source, true);
                });
            } else {
                // activate sources based on config
                vm.activeSources = _.filter(vm.sources, function (source) {
                    return source.active === true;
                });

                if (vm.activeSources.length > 0) {
                    stateService.setActiveSources(vm.activeSources);
                }
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

    angular.module('delta').config(['$provide', function ($provide) {
        $provide.decorator('$httpBackend', angular.mock.e2e.$httpBackendDecorator);
    }]).run(['$httpBackend', 'deltaConfig', 'stateService', 'XMLHttpRequest', 'moment', '_', function ($httpBackend, deltaConfig, stateService, XMLHttpRequest, moment, _){
        var getSync = function (url) {
            var request = new XMLHttpRequest();
            request.open('GET', url, false);
            request.send(null);
            return [request.status, request.response, {}];
        };

        var voterNameOverrideUrl = './static/data/voterName.json',
            voterNameRegex = new RegExp('^' + deltaConfig.voteApi.url + '/voters', 'i'),
            votesOverrideUrl = './static/data/votes.json',
            votesRegex = new RegExp('^' + deltaConfig.voteApi.url + '/votes/voter', 'i'),
            reasonsOverrideUrl = './static/data/reasons.json',
            reasonsRegex = new RegExp('^' + deltaConfig.voteApi.url + '/reasons', 'i'),
            eventsRegex = new RegExp('^' + deltaConfig.server.url, 'i'),
            plotDataRegex = new RegExp('^' + deltaConfig.eventServer.ajaxUrl + '/plot-data', 'i'),
            framesRegex = new RegExp('^' + deltaConfig.eventServer.ajaxUrl + '/frames', 'i'),
            correlationOverrideUrl = './static/data/correlation.json',
            countriesOverrideUrl = './static/data/countries.json',
            plotData = [];

        var countryCodes = ['UA', 'CN', 'US', 'MY', 'PL', 'PS', 'JP', 'PT', 'EG', 'TM', 'SE', 'ID', 'YE', 'CZ', 'BR', 'CY', 'MA', 'KH', 'NG', 'RU', 'FM', 'KZ', 'PH', 'GR', 'CA', 'FR', 'IE'];

        var initialize = function () {
            var request = new XMLHttpRequest();
            request.open('GET', './static/data/plotData.json', false);
            request.send(null);

            var data = JSON.parse(request.response),
                startTime = 0,
                points = [];

            for (var i = 0; i < 250; i++) {
                var intensity = Math.random() * (10 - (-10)) + (-10),
                    sensorIdx = Math.floor(Math.random() * (6));

                points.push([(startTime + i), sensorIdx, 0, intensity]);
            }

            data.points = points;

            plotData = data;
        };
        
        var generateEvents = function (urlParams) {
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

            // determine requested source
            var identity = _.find(decodeURIComponent(urlParams.cql_filter).split('+AND+'), function (d) {
                return d.search('identity') > -1;
            });
            if (identity.search('=') > -1) {
                identity = identity.split('=')[1] === 'true';
            } else {
                identity = null;
            }

            if (range <= 1) {
                maxFeatures = 1000;
            } else if (range > 1 && range <= 3) {
                maxFeatures = 10000;
            } else if (range > 3 && range <= 7) {
                maxFeatures = 100000;
            } else {
                maxFeatures = 1000000;
            }

            var totalFeatures = Math.floor(Math.random() * (maxFeatures - 1 + 1)) + 1;

            var events = {
                type: 'FeatureCollection',
                totalFeatures: totalFeatures,
                features: []
            };

            for (var i = 0; i < totalFeatures; i++) {
                var lat = parseFloat((Math.random() * (maxLat - minLat) + minLat).toFixed(6)),
                    lng = parseFloat((Math.random() * (maxLng - minLng) + minLng).toFixed(6)),
                    date = moment.utc(start.valueOf() + Math.random() * (stop.valueOf() - start.valueOf())).toISOString(),
                    identityValue = identity;

                if (identity === null) {
                    var rand = Math.floor(Math.random() * (2 - 1 + 1)) + 1;
                    identityValue = rand === 1;
                }

                var feature = {
                    type: 'Feature',
                    id: 'events.fid',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    geometry_name: 'event_location',
                    properties: {
                        product_id: '0000000000',
                        identity: identityValue,
                        dataset_id: 7,
                        event_type: 'Static',
                        file_path: 'file1.h5',
                        event_lon: lng,
                        event_lat: lat,
                        event_time: date,
                        event_class: 'UTYP',
                        event_confidence: Math.floor(Math.random() * (100 - 1 + 1)) + 1,
                        is_correlated: (Math.floor(Math.random() * (10 - 1) + 1)) % 2 !== 0,
                        country_code: countryCodes[(Math.floor(Math.random() * (27)))]
                    }
                };

                events.features.push(feature);
            }

            return [200, JSON.stringify(events), {}];
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
            initialize();
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

        // Templates requests must pass through
        $httpBackend.whenGET(/html$/).passThrough();

        // Voter Name service
        $httpBackend.whenGET(voterNameRegex).respond(function () {
            return getSync(voterNameOverrideUrl);
        });

        // Votes service
        $httpBackend.whenGET(votesRegex).respond(function () {
            return getSync(votesOverrideUrl);
        });

        // Reasons service
        $httpBackend.whenGET(reasonsRegex).respond(function () {
            return getSync(reasonsOverrideUrl);
        });

        // Events service
        $httpBackend.whenGET(eventsRegex).respond(function (method, url) {
            var urlParams = _.fromPairs(_.map(url.split('?')[1].split('&'), function (s) { return s.split('='); }));
            if (urlParams.typeName === 'delta:events') {
                return generateEvents(urlParams);
            } else if (urlParams.typeName === 'delta:tracks') {
                return generateEventTracks();
            } else if (urlParams.typeName === 'delta:correlating_events') {
                return getSync(correlationOverrideUrl);
            } else if (urlParams.typeName === 'delta:countries') {
                return getSync(countriesOverrideUrl);
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
    }]);
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImRlbHRhQ29uZmlnLmpzIiwibW9kZWxzL1ZvdGUuanMiLCJzZXJ2aWNlcy9jb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UuanMiLCJzZXJ2aWNlcy9kZWx0YVNlcnZpY2UuanMiLCJzZXJ2aWNlcy9zZWFyY2hTZXJ2aWNlLmpzIiwic2VydmljZXMvc3RhdGVTZXJ2aWNlLmpzIiwic2VydmljZXMvdm90ZVNlcnZpY2UuanMiLCJjb21wb25lbnRzL2NvbmZpZGVuY2VGaWx0ZXIvY29uZmlkZW5jZUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2NvbmZpZGVuY2VGaWx0ZXIvY29uZmlkZW5jZUZpbHRlckRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvY291bnRyeUZpbHRlci9jb3VudHJ5RmlsdGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvY291bnRyeUZpbHRlci9jb3VudHJ5RmlsdGVyRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9ldmVudFZpZXdlci9ldmVudFZpZXdlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2V2ZW50Vmlld2VyL2V2ZW50Vmlld2VyQ29udHJvbGxlclNhdmUuanMiLCJjb21wb25lbnRzL2V2ZW50Vmlld2VyL21ldGFkYXRhRGlhbG9nQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZXZlbnRzL2V2ZW50c0NvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2dvdG8vZ290b0NvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2dvdG8vZ290b0RpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvbG9jYXRpb25Gb3JtYXQvbG9jYXRpb25Gb3JtYXRDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9sb2NhdGlvbkZvcm1hdC9sb2NhdGlvbkZvcm1hdERpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvbWFwL21hcENvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3NpZGViYXIvc2lkZWJhckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3RlbXBvcmFsRmlsdGVyL3RlbXBvcmFsRmlsdGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvdGVtcG9yYWxGaWx0ZXIvdGVtcG9yYWxGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3R5cGVGaWx0ZXIvdHlwZUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3R5cGVGaWx0ZXIvdHlwZUZpbHRlckRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvc291cmNlRmlsdGVyL3NvdXJjZUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3NvdXJjZUZpbHRlci9zb3VyY2VGaWx0ZXJEaXJlY3RpdmUuanMiLCJiYWNrZW5kU3R1YnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQU1BLENBQUEsWUFBQTs7SUFFQTs7SUFFQSxJQUFBLGFBQUE7Ozs7SUFJQSxJQUFBLGlCQUFBO1FBQ0EsVUFBQTtZQUNBLFlBQUE7WUFDQSxnQkFBQTtZQUNBLGtCQUFBO1lBQ0EsZUFBQTs7UUFFQSxRQUFBO1lBQ0EsVUFBQTtZQUNBLFVBQUE7O1FBRUEsU0FBQSxDQUFBO1lBQ0EsTUFBQTtZQUNBLFNBQUEsQ0FBQTtnQkFDQSxNQUFBO2dCQUNBLE9BQUE7Z0JBQ0EsU0FBQSxDQUFBO29CQUNBLE1BQUE7b0JBQ0EsZUFBQTtvQkFDQSxnQkFBQTt3QkFDQSxZQUFBO3dCQUNBLGNBQUE7d0JBQ0EsZUFBQTs7O2NBR0E7Z0JBQ0EsTUFBQTtnQkFDQSxPQUFBO2dCQUNBLFNBQUEsQ0FBQTtvQkFDQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsU0FBQSxDQUFBO3dCQUNBLE1BQUE7d0JBQ0EsZUFBQTt3QkFDQSxnQkFBQTs0QkFDQSxZQUFBOzRCQUNBLGNBQUE7NEJBQ0EsZUFBQTs7O2tCQUdBO29CQUNBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxTQUFBLENBQUE7d0JBQ0EsTUFBQTt3QkFDQSxlQUFBO3dCQUNBLGdCQUFBOzRCQUNBLFlBQUE7NEJBQ0EsY0FBQTs0QkFD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Z0JBQ0EsT0FBQSxLQUFBLEtBQUE7O2lCQUVBO2dCQUNBLE9BQUEsS0FBQSxNQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE1BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxJQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE9BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxLQUFBO2dCQUNBLFVBQUEsVUFBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxlQUFBOzs7Ozs7O1FBT0EsYUFBQSxxQkFBQSxVQUFBLEtBQUEsS0FBQTtZQUNBLElBQUEsQ0FBQSxPQUFBLFFBQUEsTUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLE9BQUEsT0FBQSxRQUFBLE1BQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxLQUFBO2dCQUNBLElBQUEsVUFBQTtvQkFDQSxLQUFBLENBQUEsY0FBQSxNQUFBLGNBQUE7b0JBQ0EsSUFBQSxDQUFBLEtBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLElBQUE7b0JBQ0EsUUFBQSxPQUFBLFNBQUEsS0FBQSxLQUFBOztnQkFFQSxPQUFBO21CQUNBLElBQUEsRUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQSxJQUFBLEVBQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxNQUFBO2dCQUNBLE9BQUE7Ozs7Ozs7OztRQVNBLGFBQUEsc0JBQUEsVUFBQSxRQUFBLFFBQUE7WUFDQSxJQUFBLFdBQUEsV0FBQSxXQUFBLFdBQUEsV0FBQTtZQUNBLFNBQUEsT0FBQSxRQUFBLFdBQUEsSUFBQSxNQUFBO1lBQ0EsU0FBQSxPQUFBLFFBQUEsV0FBQSxJQUFBLE1BQUE7O1lBRUEsSUFBQSxPQUFBLFVBQUEsR0FBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsSUFBQTttQkFDQSxJQUFBLE9BQUEsV0FBQSxHQUFBO2dCQUNBLFNBQUEsT0FBQSxHQUFBLE1BQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsS0FBQSxNQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxJQUFBOztZQUVBLElBQUEsT0FBQSxVQUFBLEdBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLElBQUE7bUJBQ0EsSUFBQSxPQUFBLFdBQUEsR0FBQTtnQkFDQSxTQUFBLE9BQUEsR0FBQSxNQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEtBQUEsTUFBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsTUFBQSxHQUFBLENBQUEsSUFBQTs7O1lBR0E7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLENBQUEsT0FBQSxhQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQSxDQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUE7Y0FDQTtnQkFDQSxJQUFBLFVBQUE7b0JBQ0EsS0FBQTt3QkFDQSxZQUFBLE1BQUEsWUFBQSxPQUFBLFlBQUE7d0JBQ0EsWUFBQSxNQUFBLFlBQUEsT0FBQSxZQUFBO29CQUNBLElBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsUUFBQSxHQUFBLE1BQUEsSUFBQTtvQkFDQSxRQUFBLE9BQUEsU0FBQSxRQUFBLEdBQUEsSUFBQSxRQUFBLEdBQUEsSUFBQTs7Z0JBRUEsT0FBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7Ozs7Ozs7Ozs7UUFlQSxhQUFBLHVCQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsU0FBQTtZQUNBLFNBQUEsT0FBQSxJQUFBOztZQUVBLElBQUEsTUFBQSxPQUFBLE9BQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQTs7Z0JBRUEsT0FBQSxLQUFBLEtBQUEsTUFBQSxPQUFBLEtBQUEsT0FBQTtnQkFDQSxPQUFBLEtBQUEsS0FBQSxNQUFBLE9BQUEsS0FBQSxPQUFBO2dCQUNBLE9BQUE7b0JBQ0EsTUFBQTtvQkFDQSxJQUFBO29CQUNBLEtBQUEsQ0FBQSxjQUFBLE9BQUEsS0FBQSxjQUFBLE9BQUE7Ozs7O1FBS0EsYUFBQSxlQUFBLFVBQUEsS0FBQTtZQUNBLFFBQUEsQ0FBQSxPQUFBLFFBQUEsS0FBQSxRQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsT0FBQTs7UUFFQSxhQUFBLGVBQUEsVUFBQSxLQUFBO1lBQ0EsU0FBQSxDQUFBLE9BQUEsUUFBQSxLQUFBLFFBQUEsT0FBQSxPQUFBLENBQUEsT0FBQSxPQUFBOzs7UUFHQSxhQUFBLGdCQUFBLFVBQUEsUUFBQTtZQUNBLElBQUEsV0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxXQUFBLFdBQUE7WUFDQSxTQUFBLE9BQUEsUUFBQSxXQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsVUFBQSxHQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxJQUFBO21CQUNBLElBQUEsT0FBQSxXQUFBLEdBQUE7Z0JBQ0EsU0FBQSxPQUFBLEdBQUEsTUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLElBQUE7O1lBRUE7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUE7Ozs7UUFJQSxhQUFBLGdCQUFBLFVBQUEsUUFBQTtZQUNBLElBQUEsV0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxXQUFBLFdBQUE7WUFDQSxTQUFBLE9BQUEsUUFBQSxXQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsVUFBQSxHQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxJQUFBO21CQUNBLElBQUEsT0FBQSxXQUFBLEdBQUE7Z0JBQ0EsU0FBQSxPQUFBLEdBQUEsTUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLElBQUE7OztZQUdBO2dCQUNBLGFBQUEsS0FBQSxZQUFBO2dCQUNBLGFBQUEsS0FBQSxZQUFBO2dCQUNBLGFBQUEsQ0FBQSxPQUFBLGFBQUE7Z0JBQ0EsV0FBQSxhQUFBLFdBQUEsWUFBQSxRQUFBLFdBQUEsWUFBQSxXQUFBLENBQUE7Z0JBQ0EsV0FBQSxhQUFBLFdBQUEsWUFBQSxRQUFBLFdBQUEsWUFBQSxXQUFBOzs7O1FBSUEsYUFBQSxjQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsU0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsT0FBQSxPQUFBO1lBQ0EsT0FBQSxDQUFBLENBQUEsS0FBQSxNQUFBOzs7UUFHQSxPQUFBOzs7Ozs7Ozs7QUNsU0EsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsUUFBQSx5RUFBQSxVQUFBLGFBQUEsNkJBQUEsUUFBQTtRQUNBLE9BQUE7WUFDQSxpQkFBQSxZQUFBO2dCQUNB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QUNBLFlBQUEsWUFBQSxPQUFBLGVBQUEsUUFBQSxPQUFBLFlBQUEsT0FBQSxnQkFBQSxZQUFBLFlBQUEsT0FBQSxlQUFBLE1BQUEsT0FBQSxZQUFBLE9BQUE7Z0JBQ0EsY0FBQTs7OztRQUlBLElBQUEsNkJBQUEsVUFBQSxjQUFBO1lBQ0EsSUFBQSxjQUFBO2dCQUNBLE9BQUE7b0JBQ0EsU0FBQTtvQkFDQSxTQUFBO29CQUNBLFNBQUE7b0JBQ0EsVUFBQSxZQUFBLE9BQUEsT0FBQSxPQUFBLFlBQUEsTUFBQSxZQUFBLE9BQUEsT0FBQSxtQkFBQTtvQkFDQSxZQUFBLFlBQUEsT0FBQSxlQUFBLFVBQUEsYUFBQSxXQUFBLFlBQUEsT0FBQSxnQkFBQSxZQUFBLFlBQUEsT0FBQSxlQUFBLFFBQUEsYUFBQSxXQUFBLFlBQUEsT0FBQTtvQkFDQSxjQUFBOzs7OztRQUtBLElBQUEsb0JBQUEsVUFBQSxRQUFBO1lBQ0EsT0FBQTtnQkFDQSxLQUFBLE9BQUE7Z0JBQ0EsVUFBQSxPQUFBLFlBQUE7Z0JBQ0EsU0FBQSxPQUFBLFdBQUE7Z0JBQ0EsU0FBQSxPQUFBLFdBQUE7Z0JBQ0EsVUFBQSxPQUFBLFlBQUE7Z0JBQ0EsU0FBQSxPQUFBLFdBQUE7Z0JBQ0EsU0FBQSxPQUFBLFdBQUEsWUFBQTtnQkFDQSxRQUFBLE9BQUEsVUFBQTs7OztRQUlBLElBQUEscUJBQUEsVUFBQSxRQUFBO1lBQ0EsT0FBQTtnQkFDQSxLQUFBLE9BQUE7Z0JBQ0EsUUFBQSxPQUFBLFVBQUE7Ozs7UUFJQSxJQUFBLHFCQUFBLFlBQUE7WUFDQSxPQUFBO2dCQUNBLFNBQUE7Z0JBQ0EsU0FBQTtnQkFDQSxTQUFBO2dCQUNBLFVBQUEsWUFBQSxPQUFBLE9BQUEsVUFBQSxZQUFBLE1BQUEsWUFBQSxPQUFBLE9BQUEsVUFBQTtnQkFDQSxjQUFBOzs7O1FBSUEsT0FBQTtZQUNBLFdBQUEsVUFBQSxTQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxZQUFBLE9BQUE7b0JBQ0EsUUFBQSxnQkFB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LE9BQUE7O1lBRUEsZUFBQSxVQUFBLE1BQUE7Z0JBQ0EsYUFBQTtnQkFDQSxZQUFBLGFBQUE7Z0JBQ0EsVUFBQSxPQUFBOztZQUVBLGNBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGNBQUEsVUFBQSxNQUFBO2dCQUNBLFlBQUE7O1lBRUEsaUJBQUEsV0FBQTtnQkFDQSxPQUFBOztZQUVBLGlCQUFBLFNBQUEsUUFBQTtnQkFDQSxlQUFBOztZQUVBLHFCQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxxQkFBQSxVQUFBLE1BQUE7Z0JBQ0EsbUJBQUE7O1lBRUEsa0JBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGtCQUFBLFVBQUEsTUFBQTtnQkFDQSxnQkFBQTs7WUFFQSxVQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxVQUFBLFVBQUEsTUFBQTtnQkFDQSxRQUFBOztZQUVBLFVBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLFVBQUEsVUFBQSxNQUFBO2dCQUNBLFFBQUE7O1lBRUEsZ0JBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGdCQUFBLFVBQUEsTUFBQTtnQkFDQSxjQUFBOztZQUVBLGVBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGVBQUEsVUFBQSxNQUFBO2dCQUNBLGFBQUE7Z0JBQ0EsWUFBQSxhQUFBO2dCQUNBLFVBQUEsT0FBQTs7WUFFQSxxQkFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEscUJBQUEsVUFBQSxNQUFBO2dCQUNBLG1CQUFBO2dCQUNBLFlBQUEsbUJBQUE7Z0JBQ0EsVUFBQSxPQUFBOztZQUVBLGNBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGNBQUEsVUFBQSxNQUFBO2dCQUNBLFlBQUE7Z0JBQ0EsWUFBQSxZQUFBO2dCQUNBLFVBQUEsT0FBQTs7Ozs7Ozs7Ozs7O0FDaFZBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFFBQUEsOENBQUE7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLE9BQUE7WUFDQSxZQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFlBQUEsUUFBQSxNQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxXQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFlBQUEsUUFBQSxNQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxVQUFBLFVBQUEsWUFBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTs7Z0JBRUEsTUFBQTtvQkFDQSxRQUFBO29CQUNBLEtBQUEsWUFBQSxRQUFBLE1BQUEsYUFBQTttQkFDQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsVUFBQSxVQUFBLE9BQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUEsS0FBQSxZQUFBLFFBQUEsTUFBQSxXQUFBLE9BQUEsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLE1BQUEsVUFBQSxPQUFBO29CQUNBLEVBQUEsT0FBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxVQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFlBQUEsUUFBQSxNQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsaUJBQUEsVUFBQSxZQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxZQUFBLFFBQUEsTUFBQSxrQkFBQTttQkFDQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUE7bUJBQ0EsTUFBQSxVQUFBLE9BQUE7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QSxzQkFBQSxNQUFBLEtBQUEsc0JBQUEsTUFBQTsyQkFDQTs7d0JBRUEsVUFBQSxPQUFBLE1BQUE7O29CQUVBLFVBQUEsS0FBQSxRQUFBLE1BQUEsT0FBQTtvQkFDQSxVQUFBLFNBQUEsS0FBQSxRQUFBLE1BQUE7b0JBQ0EsUUFBQSxLQUFBOzs7O1lBSUEsT0FBQTs7O1FBR0EsSUFBQSxZQUFBLFlBQUE7WUFDQSxJQUFBLFlBQUEsR0FBQSxPQUFBO2dCQUNBLFlBQUEsR0FBQSxPQUFBOzs7WUFHQSxRQUFBLEdBQUEsU0FBQTtnQkFDQSxNQUFBO29CQUNBLE1BQUE7O2dCQUVBLFlBQUE7b0JBQ0EsVUFBQTs7Z0JBRUEsTUFBQTtvQkFDQSxPQUFBLEdBQUE7b0JBQ0EsUUFBQSxHQUFBLG9CQUFBOztnQkFFQSxTQUFBO29CQUNBLEtBQUE7b0JBQ0EsT0FBQTs7Z0JBRUEsU0FBQTtvQkFDQSxRQUFBO3dCQUNBLE9BQUEsVUFBQSxHQUFBOzRCQUNBLE9BQUEsRUFBQSxRQUFBLEtBQUE7O3dCQUVBLE9BQUEsVUFBQSxPQUFBOzRCQUNBLE9BQUEsS0FBQSxJQUFBLElBQUEsT0FBQSxRQUFBLEtBQUEsTUFBQSxnQkFBQSxTQUFBLE1BQUE7Ozs7Z0JBSUEsTUFBQTtvQkFDQSxhQUFBOztnQkFFQSxNQUFBO29CQUNBLEdBQUE7d0JBQ0EsTUFBQTs0QkFDQSxLQUFBOzRCQUNBLFFBQUEsVUFBQSxHQUFBO2dDQUNBLE9BQUEsRUFBQSxRQUFBOzs7d0JBR0EsT0FBQTs0QkFDQSxNQUFBLG1CQUFBLE9BQUEsSUFBQSxnQkFBQSxTQUFBLE9BQUE7NEJBQ0EsVUFBQTs7O29CQUdBLEdBQUE7d0JBQ0EsT0FBQTs0QkFDQSxNQUFBLGdCQUFBLFNBQUEsTUFBQTs0QkFDQSxVQUFBOzt3QkFFQSxNQUFBOzRCQUNBLFFBQUEsVUFBQSxHQUFBOztnQ0FFQSxJQUFBLElBQUEsS0FBQSxJQUFBO2dDQUNBLElBQUEsSUFBQSxJQUFBLEtBQUEsSUFBQSxJQUFBLEtBQUEsS0FBQSxNQUFBLEtBQUEsSUFBQSxJQUFBO2dDQUNBLElBQUEs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QUFBLE9BQUE7O3dCQUVBLFFBQUEsS0FBQSxJQUFBLElBQUEsV0FBQSxNQUFBOzt3QkFFQSxJQUFBLGFBQUEsU0FBQSxHQUFBOzs7b0JBR0EsSUFBQSxjQUFBLFlBQUE7O3dCQUVBLEVBQUEsUUFBQSxFQUFBLE9BQUEsWUFBQSxVQUFBLFVBQUE7NEJBQ0EsSUFBQSxTQUFBLFFBQUEsUUFBQSxNQUFBLEVBQUEsUUFBQSxTQUFBLEdBQUEsUUFBQSxLQUFBLEtBQUE7Z0NBQ0EsTUFBQSxPQUFBLFdBQUE7OzRCQUVBLFVBQUEsS0FBQSxRQUFBLFNBQUE7Ozs7b0JBSUE7O29CQUVBLFVBQUEsWUFBQTt3QkFDQSxJQUFBLGdCQUFBLFNBQUEsR0FBQTs0QkFDQSxjQUFBOzs0QkFFQSxJQUFBLGlCQUFBO2dDQUNBLGdCQUFBLE1BQUEsVUFBQTs7NEJBRUEsSUFBQSxnQkFBQTtnQ0FDQSxlQUFBLE1BQUEsVUFBQTs7OzRCQUdBLGtCQUFBLFFBQUEsUUFBQSxXQUFBLEVBQUEsUUFBQSxnQkFBQSxVQUFBLEdBQUEsT0FBQSxLQUFBLEtBQUE7NEJBQ0EsaUJBQUEsUUFBQSxRQUFBLFdBQUEsRUFBQSxRQUFBLGdCQUFBLFVBQUEsZ0JBQUEsVUFBQSxTQUFBLEdBQUEsT0FBQSxLQUFBLEtBQUE7NEJBQ0EsSUFBQSxtQkFBQSxnQkFBQTtnQ0FDQSxJQUFBLFlBQUEsZ0JBQUEsU0FBQSxHQUFBO29DQUNBLGVBQUEsTUFBQSxVQUFBO3VDQUNBO29DQUNBLGdCQUFBLE1BQUEsVUFBQTs7Ozs7NEJBS0EsRUFBQSxRQUFBLGdCQUFBLFdBQUEsVUFBQSxXQUFBO2dDQUNBLElBQUEsYUFBQSxFQUFBLE9BQUEsYUFBQSxFQUFBLFdBQUEsVUFBQTtnQ0FDQSxJQUFBLFdBQUEsU0FBQSxHQUFBO29DQUNBLEVBQUEsUUFBQSxZQUFBLFVBQUEsT0FBQTt3Q0FDQSxJQUFBLFNBQUEsUUFBQSxRQUFBLE1BQUEsRUFBQSxRQUFBLE1BQUEsUUFBQSxLQUFBLEtBQUE7NENBQ0EsTUFBQSxPQUFBLFdBQUE7Ozt3Q0FHQSxVQUFBLEtBQUEsUUFB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OzRCQUNBOytCQUNBOzRCQUNBLFdBQUEsV0FBQSxFQUFBLEtBQUEsWUFBQSxTQUFBLEVBQUEsVUFBQSxRQUFBLFlBQUE7NEJBQ0E7OzJCQUVBOzs7d0JBR0EsV0FBQSxVQUFBLEVBQUEsS0FBQSxZQUFBLFNBQUEsRUFBQSxVQUFBLEdBQUEsYUFBQSxXQUFBLFlBQUEsT0FBQSxrQkFBQSxZQUFBO3dCQUNBOzs7OztnQkFLQSxRQUFBLEdBQUEsU0FBQTtvQkFDQSxNQUFBO3dCQUNBLE1BQUE7d0JBQ0EsTUFBQTs0QkFDQSxHQUFBOzRCQUNBLE9BQUE7O3dCQUVBLFFBQUE7O29CQUVBLE1BQUE7d0JBQ0EsT0FBQSxHQUFBO3dCQUNBLFFBQUEsR0FBQSxvQkFBQTs7b0JBRUEsU0FBQTt3QkFDQSxLQUFBO3dCQUNBLE9BQUE7O29CQUVBLFNBQUE7d0JBQ0EsUUFBQTs0QkFDQSxPQUFBLFVBQUEsR0FBQTtnQ0FDQSxPQUFBLEVBQUEsUUFBQSxLQUFBOzs0QkFFQSxPQUFBLFVBQUEsT0FBQTtnQ0FDQSxPQUFBLEtBQUEsSUFBQSxJQUFBLE9BQUEsUUFBQSxLQUFBLE1BQUEsWUFBQSxRQUFBLEdBQUEsU0FBQSxNQUFBOzs7O29CQUlBLE1BQUE7d0JBQ0EsYUFBQTs7b0JBRUEsTUFBQTt3QkFDQSxHQUFBOzRCQUNBLE1BQUE7Z0NBQ0EsS0FBQTtnQ0FDQSxRQUFBLFVBQUEsR0FBQTtvQ0FDQSxPQUFBLEVBQUEsUUFBQTs7OzRCQUdBLE9BQUE7Z0NBQ0EsTUFBQSxtQkFBQSxPQUFBLElBQUEsVUFBQSxPQUFBO2dDQUNBLFVBQUE7Ozt3QkFHQSxHQUFBOzRCQUNBLE9BQUE7Z0NBQ0EsTUFBQSxlQUFBLFlBQUEsV0FBQSxZQUFBLFFBQUEsU0FBQSxJQUFBLFlBQUEsUUFBQSxHQUFBLFNBQUEsTUFBQSxRQUFBO2dDQUNBLFVBQUE7OzRCQUVBLE1BQUE7Z0NBQ0EsUUFBQSxVQUFBLEdBQUE7O29DQUVBLElBQUEsSUFBQSxLQUFBLElBQUE7b0NBQ0EsSUFBQSxJQUFBLElBQUEsS0FBQSxJQUFBLElBQUEsS0FBQSxLQUFBLE1BQUEsS0FBQSxJQUFBLElBQUE7b0NBQ0EsSUFBQSxJQUFBLElBQUEsSUFBQSxJQUFBOztvQ0FFQSxJQUFBLElBQUEsV0FBQSxJQUFBLFFBQUE7d0NBQ0EsT0FBQSxVQUFBOzs7b0NBR0EsSUFBQSxTQUFBLFVBQUE7b0NBQ0EsT0FBQSxXQUFBLFFBQUEsUUFBQTs7Ozs7b0JBS0EsTUFBQTt3QkFDQSxTQUFBOztvQkFFQSxZQUFBLFlBQUE7d0JBQ0EsR0FBQSxlQUFBO3dCQUNBLElBQUEsT0FBQTs0QkFDQSxJQUFBLFdBQUEsRUFBQSxRQUFBLE1BQUEsS0FBQTs0QkFDQSxFQUFBLFFBQUEsVUFBQSxVQUFBLEdBQUE7Z0NBQ0EsSUFBQSxPQUFBLEVBQUEsS0FBQSxHQUFBLGlCQUFBLFVBQUEsR0FBQTtvQ0FDQSxPQUFBLEVBQUEsWUFBQSxFQUFBOztnQ0FFQSxJQUFBLE1BQUE7b0NBQ0EsS0FBQSxRQUFBLEVBQUE7OztnQ0FHQSxJQUFBLGtCQUFBLEVBQUEsS0FBQSxHQUFBLDRCQUFBLFVBQUEsSUFBQTtvQ0FDQSxPQUFBLEdBQUEsWUFBQSxFQUFBOztnQ0FFQSxJQUFBLGlCQUFBO29DQUNBLGdCQUFBLFFBQUEsRUFBQTs7Ozs7b0JBS0EsWUFBQSxZQUFBO3dCQUNBLE1BQUEsTUFBQTs7O2dCQUdBLEdBQUE7Ozs7UUFJQSxJQUFBLFdBQUEsWUFBQTtZQUNBLFlBQUEsU0FBQSxHQUFBLFNBQUEsS0FBQSxVQUFBLFFBQUE7Z0JBQ0EsR0FBQSxVQUFBLEtBQUEsWUFBQSxPQUFBO2dCQUNBLEdBQUEsTUFBQSxLQUFBLEdBQUE7Z0JBQ0EsYUFBQSxTQUFBLEdBQUE7Z0JBQ0EsSUFBQSxHQUFBLFFBQUEsTUFBQTtvQkFDQSxTQUFBLEtBQUEsU0FBQSxTQUFBLFlBQUEsbUJBQUEsTUFBQSxpQkFBQSxTQUFBO3VCQUNBO29CQUNBLFNBQUEsS0FBQSxTQUFBLFNBQUEsWUFBQSx3QkFBQSxHQUFBLFFBQUEsU0FBQSxLQUFBLE1BQUEsY0FBQSxTQUFBOztlQUVBLE1BQUEsVUFBQSxPQUFBO2dCQUNBLFFBQUEsSUFB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QTtZQUNBLElBQUEsUUFBQSxFQUFBLE9BQUEsU0FBQSxLQUFBLFNBQUE7OztRQUdBLEdBQUEsb0JBQUEsVUFBQSxRQUFBO1lBQ0EsYUFBQSxrQkFBQTs7O1FBR0EsSUFBQSxhQUFBLFlBQUE7WUFDQSxZQUFBLFNBQUEsS0FBQSxVQUFBLE1BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxHQUFBLGtCQUFBLEdBQUE7Ozs7UUFJQTs7UUFFQSxPQUFBLE9BQUEsdUNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsSUFBQSxDQUFBLEdBQUEsUUFBQSxNQUFBLEdBQUEsUUFBQSxPQUFBLEdBQUEsU0FBQSxJQUFBO2dCQUNBLElBQUEsa0JBQUEsY0FBQTtnQkFDQSxHQUFBLE1BQUEsZ0JBQUE7Z0JBQ0EsR0FBQSxNQUFBLGdCQUFBO2dCQUNBLEdBQUEsT0FBQSxnQkFBQTs7WUFFQSxHQUFBLGlCQUFBOzs7Ozs7Ozs7O0FDbkVBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFVBQUEsYUFBQSxZQUFBO1FBQ0EsT0FBQTtZQUNBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBO2dCQUNBLFVBQUE7Ozs7Ozs7Ozs7O0FDVkEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsV0FBQSx1SEFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxLQUFBO1lBQ0EsS0FBQSxVQUFBOztRQUVBLEdBQUEsZUFBQTtRQUNBLEdBQUEsV0FBQTtZQUNBLFFBQUEsR0FBQSxrQkFBQSxZQUFBO1lBQ0EsT0FBQSxHQUFBLEtBQUE7WUFDQSxPQUFBLEdBQUEsS0FBQTtZQUNBLE1BQUEsR0FBQSxLQUFBO1lBQ0EsTUFBQSxHQUFBLEtBQUE7WUFDQSxRQUFBLEdBQUEsTUFBQTtZQUNBLFFBQUEsR0FBQSxNQUFBOztRQUVBLEdBQUEsT0FBQSxPQUFBLFFBQUE7O1FBRUEsR0FBQSxZQUFBLFVBQUEsV0FBQTtZQUNBLElBQUEsSUFBQTtZQUNBLFFBQUEsR0FBQSxTQUFBO2dCQUNBLEtBQUE7b0JBQ0EsS0FBQSw0QkFBQSxtQkFBQSxHQUFBLFNBQUEsT0FBQSxHQUFBLFNBQUE7b0JBQ0EsS0FBQSw0QkFBQSxtQkFBQSxHQUFBLFNBQUEsT0FBQSxHQUFBLFNBQUE7b0JBQ0E7Z0JBQ0EsS0FBQTtvQkFDQSxLQUFBLDRCQUFBLG9CQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUEsU0FBQTtvQkFDQSxLQUFBLDRCQUFBLG9CQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUEsU0FBQTtvQkFDQTtnQkFDQSxLQUFBO29CQUNBLElBQUEsR0FBQSxTQUFBLFFBQUE7d0JBQ0EsS0FBQSw0QkFBQSxxQkFBQSxHQUFBLFNBQUE7O29CQUVBLElBQUEsR0FBQSxTQUFBLFFBQUE7d0JBQ0EsS0FBQSw0QkFBQSxxQkFBQSxHQUFBLFNBQUE7O29CQUVBOztZQUVBLEdBQUEsU0FBQSxRQUFBO1lBQ0EsR0FBQSxTQUFBLE9BQUE7WUFDQSxHQUFBLFNBQUEsUUFBQTtZQUNBLEdBQUEsU0FBQSxPQUFBO1lBQ0EsR0FBQSxTQUFBLFNBQUE7WUFDQSxHQUFBLFNBQUEsU0FBQTs7WUFFQSxRQUFBO2dCQUNBLEtBQUE7b0JBQ0EsSUFBQSxNQUFBLElBQUE7d0JBQ0EsR0FBQSxTQUFBLFFBQUEsR0FBQSxHQUFBO3dCQUNBLEdBQUEsU0FBQSxPQUFBLEdBQUEsR0FBQTt3QkFDQSxHQUFBLFNBQUEsUUFBQSxHQUFBLEdBQUE7d0JBQ0EsR0FBQSxTQUFBLE9BQUEsR0FBQSxHQUFBOztvQkFFQTtnQkFDQSxLQUFBO29CQUNBLElBQUEsTUFBQSxJQUFBO3dCQUNBLEdBQUEsU0FBQSxRQUFBLEdBQUEsSUFBQTt3QkFDQSxHQUFBLFNBQUEsT0FBQSxHQUFBLElBQUE7d0JBQ0EsR0FBQSxTQUFBLFFBQUEsR0FBQSxJQUFBO3dCQUNBLEdBQUEsU0FBQSxPQUFBLEdBQUEsSUFBQTs7b0JBRUE7Z0JBQ0EsS0FBQTtvQkFDQSxJQUFBLE1BQUEsSUFBQTt3QkFDQSxHQUFBLFNBQUEsU0FBQSxHQUFBLFFBQUE7d0JBQ0EsR0FBQSxTQUFBLFNBQUEsR0FBQSxRQUFBOztvQkFFQTs7O1lBR0EsR0FBQSxTQUFBLFNBQUE7WUFDQSxhQUFBLGlCQUFBLEdBQUE7WUFDQSxhQUFBLGtCQUFBOzs7UUFHQSxPQUFBLGlCQUFBLGdDQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsVUFBQTtnQkFDQSxJQUFBLEVBQUEsS0FBQSxVQUFBLFNBQUEsR0FBQTtvQkFDQSxHQUFBLFdBQUE7O21CQUVBO2dCQUNBLEdBQUEsV0FBQTs7Ozs7Ozs7Ozs7OztBQ3pGQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxVQUFBLHVCQUFBLFlBQUE7UUFDQSxPQUFBO1lBQ0EsVUFBQTtZQUNBLGFBQUE7WUFDQSxZQUFBO1lBQ0EsY0FBQTtZQUNBLE9BQUE7Ozs7Ozs7Ozs7QUNUQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxXQUFBLG9LQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7WUFDQSxLQUFBLFVBQUE7WUFDQSxNQUFBO1lBQ0EsVUFBQSxHQUFBLE9BQUEsU0FBQSxHQUFBLFFBQUEsWUFBQSxVQUFBO1lBQ0EsWUFBQSxJQUFBLEVBQUE7WUFDQSxTQUFBO1lBQ0EsVUFBQTtZQUNBLFFBQUE7WUFDQSxhQUFBO1lBQ0EsYUFBQSxHQUFBO1lBQ0EscUJBQUE7WUFDQSxtQkFBQSxHQUFBLG1CQUFBLEdBQUEsbUJBQUEsWUFBQTtZQUNBLFlBQUEsR0FBQSxZQUFBLEdBQUEsWUFBQTs7UUFFQSxHQUFBLFlBQUE7UUFDQSxHQUFBLGVBQUE7UUFDQSxHQUFBLGNBQUE7UUFDQSxHQUFBLGNBQUE7UUFDQSxHQUFBLFVBQUE7O1FBRUEsSUFBQSxHQUFBLEtBQUEsR0FBQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsWUFBQTtnQkFDQSxRQUFBLEdBQUE7Z0JBQ0EsT0FBQSxHQUFBLElBQUEsV0FBQSxHQUFBLEtBQUE7Z0JBQ0EsT0FBQSxHQUFBLElBQUEsV0FBQSxHQUFBLEtBQUE7Z0JBQ0EsTUFBQSxHQUFBLElBQUEsV0FBQSxHQUFBLEtBQUE7Z0JBQ0EsTUFBQSxHQUFBLElBQUEsV0FBQSxHQUFBLEtBQUE7Z0JBQ0EsUUFBQSxHQUFBLE1BQUE7Z0JBQ0EsUUFBQSxHQUFBLE1BQUE7OztZQUdBLElBQUEsWUFBQSxFQUFBLE9BQUEsU0FBQSxHQUFBLElBQUEsU0FBQSxHQUFBO2dCQUNBLFlBQUEsRUFBQSxPQUFBLFNBQUEsR0FBQSxJQUFBLFNBQUEsR0FBQTtnQkFDQSxTQUFBLEVBQUEsYUFBQSxXQUFBO2dCQUNBLFNBQUEsT0FBQTs7WUFFQSxHQUFBLFNBQUE7Z0JBQ0EsS0FBQSxPQUFBO2dCQUNBLEtBQUEsT0FBQTtnQkFDQSxNQUFBOztlQUVBO1lBQ0EsR0FBQSxTQUFBLFlBQUE7Ozs7UUFJQSxHQUFBLFdBQUE7WUFDQSxLQUFBLFlBQUE7WUFDQSxhQUFBO1lBQ0Esb0JBQUE7WUFDQSxVQUFBO2dCQUNBLFFBQUE7b0JBQ0EsU0FBQTtvQkFDQSxVQUFBO29CQUNBLFdBQUE7Ozs7OztRQU1BLEdBQUEsU0FBQSxFQUFBLFVBQUEsWUFBQTs7UUFFQSxJQUFBLGtCQUFBLFVBQUEsT0FBQTtZQUNBLFlBQUEsWUFBQSxLQUFBLFVBQUEsUUFBQTtnQkFDQSxFQUFBLFFBQUEsT0FBQSxZQUFBLFVBQUEsT0FBQTtvQkFDQSxJQUFBLFlBQUE7O2dCQUVBLElBQUEsU0FBQSxPQUFBLFdBQUEsTUFBQTs7OztRQUlBLElBQUEsaUJBQUEsWUFBQTtZQUNBLElBQUEsSUFBQSxZQUFBLElBQUE7Z0JBQ0EsR0FBQSxVQUFBOzs7O1lBSUEsSUFBQSxjQUFBO1lBQ0EsWUFBQSxZQUFBLE9BQUEsZ0JBQUEsR0FBQSxZQUFBLFdBQUEsWUFBQSxPQUFBO1lBQ0EsWUFBQSxZQUFBLE9BQUEsZ0JBQUEsR0FBQSxZQUFBLFdBQUEsWUFBQSxPQUFBO1lBQ0EsY0FBQSxlQUFBLGFBQUEsS0FBQSxVQUFBLE1BQUE7O2dCQUVBLElBQUEsY0FBQSxJQUFBLEVBQUE7b0JBQ0EsVUFBQTtvQkFDQSxhQUFBO29CQUNBLGFBQUE7O2dCQUVBLEVBQUEsUUFBQSxLQUFBLFVBQUEsVUFBQSxTQUFBO29CQUNBLElBQUEsYUFBQTtvQkFDQSxJQUFBLFFBQUEsV0FBQSxZQUFBLE9BQUEsZ0JBQUE7d0JBQ0EsYUFBQSxFQUFBLEtBQUEsWUFBQSxTQUFBLEVBQUEsVUFBQSxRQUFBLFlBQUE7d0JBQ0E7MkJBQ0E7d0JBQ0EsYUFBQSxFQUFBLEtBQUEsWUFBQSxTQUFBLENBQUEsVUFBQSxTQUFBLFlBQUE7d0JBQ0E7OztvQkFHQSxJQUFBLFFBQUEsYUFBQSxNQUFBO3dCQUNBLFVBQUEsRUFBQSxRQUFBLFFBQUEsVUFBQTs0QkFDQSxPQUFBLEVBQUEsT0FBQTs0QkFDQSxlQUFBLFVBQUEsYUFBQSxPQUFBO2dDQUNBLE1BQUEsUUFBQSxhQUFBLFFBQUE7Ozt3QkFHQSxZQUFBLFNBQUE7MkJBQ0E7d0JBQ0EsSUFBQSxTQUFBLEVBQUEsT0FBQSxRQUFBLFdBQUEsWUFBQSxPQUFBLFdBQUEsUUFBQSxXQUFBLFlBQUEsT0FBQTs7d0JBRUEsSUFBQSxRQUFBOzRCQUNBLElBQUEsZUFBQSxFQUFBLGFBQUEsUUFBQSxFQUFBLE9BQUEsR0FBQSxZQUFBLFlBQUE7OzRCQUVBLFVBQUEsRUFBQSxRQUFBLGFBQUEsYUFBQTtnQ0FDQSxTQUFBLFlBQUE7b0NBQ0EsT0FBQSxhQUFBOztnQ0FFQSxjQUFBLFlBQUE7b0NBQ0EsT0FBQTs7Z0NBRUEsZUFBQSxVQUFBLGFBQUEsT0FBQTtvQ0FDQSxNQUFBLFFBQUEsYUFBQSxRQUFBOzs7NEJBR0EsWUFBQSxTQUFBOzs7b0JBR0EsSUFBQSxTQUFBO3dCQUNBLFFBQUEsVUFBQSxVQUFBLE9BQUE7NEJBQ0EsTUFBQSxRQUFBLGNBQUEsRUFBQSxLQUFBLFlBQUEsU0FBQSxFQUFBLFVBQUEsTUFBQSxRQUFBLFdBQUEsWUFBQSxPQUFBOzRCQUNBLE1BQUEsUUFBQSxZQUFBLEVBQUEsS0FBQSxZQUFBLE9BQUEsRUFBQSxPQUFBLE1BQUEsUUFBQSxXQUFBLFlBQUEsT0FBQTs7d0JBRUEsUUFBQSxHQUFBLGFBQUEsVUFBQSxHQUFBOzRCQUNBLEVBQUEsTUFBQSxVQUFBLGFBQUEsdUJBQUEsRUFBQSxNQUFBLFVBQUEsRUFBQSxVQUFBLEVBQUEsTUFBQSxHQUFBLENBQUEsS0FBQSxXQUFBLFNBQUE7O3dCQUVBLFFBQUEsR0FBQSxZQUFBLFVBQUEsR0FBQTs0QkFDQSxFQUFBLE1BQUE7Ozs7O2dCQUtBLElBQUEsRUFBQSxLQUFBLFlBQUEsYUFBQSxTQUFBLEdBQUE7b0JBQ0EsYUFBQSxhQUFBO29CQUNBLElBQUEsR0FBQSxhQUFBOzt3QkFFQSxHQUFBLFlBQUE7Ozs7b0JBSUEsR0FBQSxjQUFBLEVBQUEsVUFBQTtvQkFDQSxJQUFBLElBQUEsWUFBQSxJQUFBO3dCQUNBLFVBQUEsU0FBQSxHQUFBOzt1QkFFQTtvQkFDQSxTQUFBLEtBQUEsU0FBQSxTQUFBLFlBQUEsK0RBQUEsTUFBQSxjQUFBLFNBQUE7O2dCQUVBLEdBQUEsVUFBQTs7OztRQUlBLElBQUEsZUFBQSxZQUFBO1lBQ0EsRUFBQSxRQUFBLFFBQUEsVUFBQSxPQUFBO2dCQUNBLElBQUEscUJBQUEsY0FBQTtvQkFDQSxJQUFBLE1BQUEsUUFBQSxXQUFBLGlCQUFBLE1BQUEsUUFBQSxXQUFBLFlBQUEsT0FBQSxvQkFBQSxZQUFBO3dCQUNBLFVBQUEsU0FBQTsyQkFDQTt3QkFDQSxVQUFBLFlBQUE7O3VCQUVBLElBQUEscUJBQUEsaUJBQUE7b0JBQ0EsSUFBQSxDQUFBLE1BQUEsUUFBQSxXQUFBLGlCQUFBLE1BQUEsUUFBQSxXQUFBLFlBQUEsT0FBQSxvQkFBQSxZQUFBO3dCQUNBLFVBQUEsU0FBQTsyQkFDQTt3QkFDQSxVQUFBLFlBQUE7O3VCQUVBLElBQUEscUJBQUEsT0FBQTtvQkFDQSxJQUFBLE1BQUEsUUFBQSxXQUFBLFlBQUEsT0FBQSxvQkFBQSxZQUFBO3dCQUNBLFVBQUEsU0FBQTsyQkFDQTt3QkFDQSxVQUFBLFlBQUE7Ozs7OztRQU1BLElBQUEseUJBQUEsWUFBQTtZQUNBLElBQUEsWUFBQSxhQUFBO2dCQUNBLGlCQUFBLEVBQUEsT0FBQSxRQUFBLFVBQUEsT0FBQTtvQkFDQSxPQUFBLFVBQUEsU0FBQSxNQUFBOzs7WUFHQSxhQUFBLFVBQUEsRUFBQSxJQUFBLGdCQUFBOzs7UUFHQSxJQUFBLGVBQUEsRUFBQSxTQUFBLFlBQUE7WUFDQSxTQUFBO1lBQ0EsYUFBQSxVQUFBO1lBQ0EsVUFBQTtZQUNBLElBQUEsUUFBQSxTQUFBLEdBQUE7Z0JBQ0EsUUFBQSxJQUFBO2dCQUNBLEdBQUEsVUFBQTtnQkFDQSxhQUFBLGlCQUFBLEdBQUE7Z0JBQ0EsY0FBQSxVQUFBLFNBQUEsS0FBQSxVQUFBLE1BQUE7b0JBQ0EsSUFBQSxLQUFBLFlBQUEsS0FBQSxTQUFBLFNBQUEsR0FBQTt3QkFDQSxJQUFBLFVBQUEsRUFBQSxRQUFBLEtBQUEsVUFBQTs0QkFDQSxjQUFBLFVBQUEsU0FBQSxRQUFBO2dDQUNBLElBQUEsU0FBQSxFQUFBLEtBQUEsWUFBQSxTQUFBLEVBQUEsVUFBQSxRQUFBLFdBQUEsWUFBQSxPQUFBO29DQUNBLFFBQUEsU0FBQSxPQUFBLFFBQUE7O2dDQUVBLE9BQUEsRUFBQSxhQUFBLFFBQUEsRUFBQSxPQUFBOzs7d0JBR0EsUUFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBOzRCQUNBLElBQUEsR0FBQSxhQUFBO2dDQUNBLElBQUEsaUJBQUEsRUFBQSxLQUFBLFFBQUEsRUFBQSxTQUFBLEdBQUE7Z0NBQ0EsSUFBQSxnQkFBQTtvQ0FDQSxlQUFBLFNBQUEsRUFBQSxPQUFBLGVBQUEsUUFBQSxZQUFBLE9BQUEsYUFBQTs7Ozs0QkFJQSxJQUFBLFdBQUEsRUFBQSxNQUFBOzRCQUNBLFNBQUEsV0FBQTs0QkFDQSxhQUFBLGVBQUE7NEJBQ0EsRUFBQSxNQUFBLFNBQUEsRUFBQSxPQUFBLFdBQUEsYUFBQTs0QkFDQSxFQUFBLE1BQUE7O3dCQUVBLFFBQUEsR0FBQSxhQUFBLFVBQUEsR0FBQTs0QkFDQSxFQUFBLE1BQUEsVUFBQSxhQUFBLHVCQUFBLEVBQUEsTUFBQSxVQUFBLEVBQUEsVUFBQSxFQUFBLE1BQUEsR0FBQSxDQUFBLEtBQUEsV0FBQSxTQUFBOzt3QkFFQSxRQUFBLEdBQUEsWUFBQSxVQUFBLEdBQUE7NEJBQ0EsRUFBQSxNQUFBOzt3QkFFQSxRQUFBLFVBQUEsVUFBQSxPQUFBOzRCQUNBLElBQUEsQ0FBQSxVQUFBLFNBQUEsS0FBQSxFQUFBLFFBQUEsV0FBQSxNQUFBLFFBQUEsV0FBQSxnQkFBQSxDQUFBLE1BQUEsVUFBQSxXQUFBLEdBQUE7Z0NBQ0EsTUFBQSxRQUFBLGNBQUEsRUFBQSxLQUFBLFlBQUEsU0FBQSxDQUFBLFVBQUEsTUFBQSxRQUFBLFdBQUEsWUFBQSxPQUFBO2dDQUNBLE1BQUEsUUFBQSxZQUFBLEVBQUEsS0FBQSxZQUFBLE9BQUEsQ0FBQSxPQUFBLE1BQUEsUUFBQSxXQUFBLFlBQUEsT0FBQTtnQ0FDQSxJQUFBLE1BQUEsV0FBQSxHQUFBOztvQ0FFQSxVQUFBLFNBQUE7dUNBQ0E7O29DQUVBLEVBQUEsUUFBQSxPQUFBLFVBQUEsTUFBQTt3Q0FDQSxJQUFBLE1BQUEsUUFBQSxXQUFBLEtBQUEsV0FBQSxLQUFBLE9BQUE7NENBQ0EsVUFBQSxTQUFBOzs7Ozs7d0JBTUEsU0FBQSxVQUFBO3dCQUNBOztvQkFFQTtvQkFDQSxhQUFBLGVBQUEsVUFBQTtvQkFDQSxHQUFBLFVBQUE7b0JBQ0EsYUFBQSxpQkFBQSxHQUFBO21CQUNBLE1BQUEsV0FBQTtvQkFDQSxHQUFBLFVBQUE7OztXQUdBOztRQUVBLElBQUEsYUFBQSxZQUFBO1lBQ0EsWUFBQSxTQUFBLEtBQUEsVUFBQSxNQUFBO2dCQUNBLE1BQUE7OztnQkFHQSxJQUFBLFNBQUE7OztnQkFHQSxFQUFBLEtBQUEsUUFBQSxZQUFBOzs7Z0JBR0EsVUFBQSxNQUFBOztnQkFFQSxhQUFBLGFBQUEsSUFBQTtnQkFDQSxhQUFBLFdBQUEsSUFBQTtnQkFDQSxhQUFBLG9CQUFBOzs7Z0JBR0EsRUFBQSxRQUFBLFlBQUE7b0JBQ0EsaUJBQUE7b0JBQ0EsZ0JBQUE7bUJBQ0EsTUFBQTs7O2dCQUdBLElBQUEsZ0JBQUEsRUFBQSxXQUFBO29CQUNBLFFBQUEsQ0FBQTt3QkFDQSxXQUFBO3dCQUNBLE1BQUE7d0JBQ0EsT0FBQTt3QkFDQSxTQUFBLFVBQUEsS0FBQTs0QkFDQSxJQUFBLE1BQUE7NEJBQ0EsbUJBQUE7NEJBQ0EsYUFBQSxvQkFBQTs7dUJBRUE7d0JBQ0EsV0FBQTt3QkFDQSxNQUFBO3dCQUNBLE9BQUE7d0JBQ0EsU0FBQSxVQUFBLEtBQUE7NEJBQ0EsSUFBQSxNQUFBOzRCQUNBLG1CQUFBOzRCQUNBLGFBQUEsb0JBQUE7O3VCQUVBO3dCQUNBLFdBQUE7d0JBQ0EsTUFBQTt3QkFDQSxPQUFBO3dCQUNBLFNBQUEsVUFBQSxLQUFBOzRCQUNBLElBQUEsTUFBQTs0QkFDQSxtQkFBQTs0QkFDQSxhQUFBLG9CQUFBOzs7O2dCQUlBLGNBQUEsTUFBQTtnQkFDQSxjQUFBLE1BQUE7O2dCQUVBLElBQUEsY0FBQSxHQUFBO29CQUNBLFlBQUE7Z0JBQ0EsSUFBQSxhQUFBOztvQkFFQSxZQUFBLEVBQUEsS0FBQSxZQUFBLE9BQUEsWUFBQSxFQUFBLElBQUE7b0JBQ0EsZ0JBQUE7dUJBQ0E7O29CQUVBLFlBQUEsWUFBQSxPQUFBLFdBQUEsWUFBQTtvQkFDQSxHQUFBLFNBQUEsRUFBQSxVQUFBLFlBQUE7b0JBQ0EsYUFBQSxhQUFBOzs7Z0JBR0EsSUFBQSxHQUFBLG1CQUFBLFVBQUEsR0FBQTtvQkFDQSxJQUFBLFlBQUEsRUFBQSxLQUFBLFlBQUEsT0FBQSxZQUFBLEVBQUEsTUFBQSxFQUFBO29CQUNBLGFBQUEsYUFBQTs7O2dCQUdBLElBQUEsR0FBQSxXQUFBLEVBQUEsU0FBQSxVQUFBLEdBQUE7b0JBQ0EsYUFBQSxXQUFBLEVBQUEsT0FBQTtvQkFDQSxhQUFBLGFBQUEsRUFBQSxPQUFBO29CQUNBO29CQUNBLElBQUEsR0FBQSxhQUFBOzt3QkFFQSxJQUFBLEVBQUEsS0FBQSxHQUFBLFlBQUEsYUFBQSxTQUFBLEdBQUE7NEJBQ0EsSUFBQSxFQUFBLE9BQUEsWUFBQSxJQUFBO2dDQUNBLFVBQUEsU0FBQSxHQUFBO21DQUNBO2dDQUNBLFVBQUEsWUFBQSxHQUFBOzs7O21CQUlBOzs7O1FBSUE7O1FBRUEsT0FBQSxpQkFBQSxrQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxnQkFBQTs7O1FBR0EsT0FBQSxpQkFBQSx1Q0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsRUFBQSxLQUFBLFVBQUEsU0FBQSxHQUFBO2dCQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtvQkFDQTs7Z0JBRUE7Ozs7UUFJQSxPQUFBLGlCQUFBLHNDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLFVBQUE7WUFDQTs7O1FBR0EsT0FBQSxpQkFBQSxvQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxRQUFBO1lBQ0E7OztRQUdBLE9BQUEsT0FBQSxtQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxhQUFBO1lBQ0E7OztRQUdBLE9BQUEsT0FBQSxtQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxhQUFBO1lBQ0E7OztRQUdBLE9BQUEsaUJBQUEsb0NBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7OztZQUdBLElBQUEsR0FBQSxhQUFBO2dCQUNBLEdBQUEsWUFBQSxTQUFBO2dCQUNBLElBQUEsaUJBQUEsRUFBQSxLQUFBLFVBQUEsYUFBQSxFQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLGdCQUFBO29CQUNBLGVBQUEsU0FBQSxFQUFBLE9BQUEsZUFBQSxRQUFBLFlBQUEsT0FBQSxhQUFBOzs7O1lBSUEsSUFBQSxVQUFBO2dCQUNBLEdBQUEsY0FBQTtnQkFDQSxHQUFBLFlBQUEsU0FBQTtnQkFDQSxJQUFBLENBQUEsYUFBQSxrQkFBQTtvQkFDQSxhQUFBLGVBQUEsVUFBQTs7Z0JBRUE7Ozs7UUFJQSxPQUFBLGlCQUFBLHlDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLElBQUEsQ0FBQSxvQkFBQTs7Z0JBRUEscUJBQUEsRUFBQSxLQUFBLFVBQUEsRUFBQSxPQUFBLEVBQUEsY0FBQTtnQkFDQSxJQUFBLG9CQUFBOztvQkFFQSxHQUFBLFlBQUEsbUJBQUEsVUFBQTs7O29CQUdBLG1CQUFBLFVBQUEsR0FBQSxVQUFBLFlBQUE7O3dCQUVBLFNBQUEsWUFBQTs0QkFDQSxHQUFBLFlBQUEsbUJBQUEsVUFBQTs7Ozs7OztRQU9BLE9BQUEsT0FBQSx5Q0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxtQkFBQTtZQUNBOzs7UUFHQSxPQUFBLGlCQUFBLGtDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLFlBQUE7WUFDQTs7Ozs7Ozs7Ozs7QUM3ZEEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsV0FBQSxpR0FBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxLQUFBOztRQUVBLEdBQUEsT0FBQSxZQUFBO1FBQ0EsR0FBQSxlQUFBO1FBQ0EsR0FBQSx1QkFBQSxhQUFBO1FBQ0EsR0FBQSxxQkFBQSxhQUFBO1FBQ0EsR0FBQSx5QkFBQSxhQUFBO1FBQ0EsR0FBQSxlQUFBLGFBQUE7O1FBRUEsT0FBQSxPQUFBLDZDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEdBQUEsdUJBQUE7OztRQUdBLE9BQUEsT0FBQSwyQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxHQUFBLHFCQUFBOzs7UUFHQSxPQUFBLE9BQUEsK0NBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsR0FBQSx5QkFBQTs7O1FBR0EsT0FBQSxPQUFBLHFDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEdBQUEsZUFBQTs7Ozs7Ozs7Ozs7QUM3Q0EsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsV0FBQSw4R0FBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7RUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7WUFDQSxLQUFBLFVBQUE7O1FBRUEsR0FBQSxTQUFBO1FBQ0EsR0FBQSxjQUFBO1FBQ0EsR0FBQSxXQUFBLE9BQUE7UUFDQSxHQUFBLE9BQUEsT0FBQTtRQUNBLEdBQUEsZUFBQTtRQUNBLEdBQUEsU0FBQTtRQUNBLEdBQUEsUUFBQTtRQUNBLEdBQUEsT0FBQTtRQUNBLEdBQUEsaUJBQUEsR0FBQSxpQkFBQSxTQUFBLEdBQUEsa0JBQUEsWUFBQTtRQUNBLEdBQUEsWUFBQSxZQUFBO1FBQ0EsR0FBQSxtQkFBQSxHQUFBLFdBQUEsRUFBQSxLQUFBLFlBQUEsV0FBQSxFQUFBLE9BQUEsR0FBQSxjQUFBLEVBQUEsS0FBQSxZQUFBLFdBQUEsRUFBQSxTQUFBO1FBQ0EsR0FBQSxTQUFBLFlBQUE7UUFDQSxHQUFBLFVBQUE7Ozs7UUFJQSxHQUFBLGVBQUE7OztRQUdBLE9BQUEsVUFBQSxZQUFBO1lBQ0EsT0FBQSxHQUFBOzs7UUFHQSxJQUFBLG9CQUFBLFlBQUE7WUFDQSxJQUFBLEdBQUEsa0JBQUE7Z0JBQ0EsR0FBQSxRQUFBLE9BQUEsSUFBQSxPQUFBLE1BQUEsTUFBQSxNQUFBLFNBQUEsR0FBQSxnQkFBQSxHQUFBLGlCQUFBLE9BQUEsUUFBQSxLQUFBO2dCQUNBLEdBQUEsT0FBQSxPQUFBLE1BQUEsTUFBQSxLQUFBOzs7WUFHQSxJQUFBLEdBQUEsU0FBQSxHQUFBLE1BQUE7Z0JBQ0EsSUFBQSxjQUFBLE9BQUEsSUFBQSxHQUFBLE1BQUE7b0JBQ0EsYUFBQSxPQUFBLElBQUEsR0FBQSxLQUFBOztnQkFFQSxJQUFBLFlBQUEsU0FBQSxhQUFBO29CQUNBLEdBQUEsVUFBQTtvQkFDQSxhQUFBLGtCQUFBO3dCQUNBLE9BQUEsR0FBQTt3QkFDQSxNQUFBLEdBQUE7d0JBQ0EsVUFBQSxHQUFBLG1CQUFBLEdBQUEsaUJBQUEsUUFBQTt3QkFDQSxnQkFBQSxHQUFBLG1CQUFBLFNBQUEsR0FBQSxrQkFBQTs7dUJBRUE7b0JBQ0EsR0FBQSxVQUFBO29CQUNBLFNBQUEsS0FBQSxTQUFBLFNBQUEsWUFBQSxtQ0FBQSxNQUFBLGNBQUEsU0FBQTs7bUJBRUE7Z0JBQ0EsR0FBQSxVQUFBO2dCQUNBLFNBQUEsS0FBQSxTQUFBLFNBQUEsWUFBQSxzREFBQSxNQUFBLGNBQUEsU0FBQTs7OztRQUlBLElBQUEsYUFBQSxXQUFBO1lBQ0EsS0FBQSxVQUFBOztZQUVBLEdBQUEsUUFBQSxHQUFBLFFBQUEsT0FBQSxJQUFBLEdBQUEsT0FBQSxXQUFBLE9BQUEsTUFBQSxTQUFBLFlBQUEsdUJBQUEsWUFBQSxzQkFBQSxRQUFBLFlBQUEsc0JBQUE7WUFDQSxHQUFBLE9BQUEsR0FBQSxPQUFBLE9BQUEsSUFBQSxHQUFBLE1BQUEsV0FBQSxPQUFBLE1BQUEsTUFBQSxZQUFBLHNCQUFBOztZQUVBOztRQUVBOztRQUVBLEdBQUEsaUJBQUEsWUFBQTtZQUNBLEdBQUEsV0FBQSxDQUFBLEdBQUE7WUFDQSxhQUFBLDBCQUFBLEdBQUE7OztRQUdBLEdBQUEsV0FBQSxVQUFBLE9BQUEsWUFBQTtZQUNBLElBQUEsTUFBQSxPQUFBO1lBQ0EsR0FBQSxRQUFBLE9BQUEsSUFBQSxLQUFBLElBQUEsT0FBQSxZQUFBO1lBQ0EsR0FBQSxPQUFBLElBQUE7WUFDQSxHQUFBLGVBQUE7OztRQUdBLE9BQUEsT0FBQSxZQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOzs7O1lBSUEsSUFBQSxDQUFBLEdBQUEsY0FBQTtnQkFDQSxJQUFBLFVBQUEsT0FBQSxJQUFBO2dCQUNBLElBQUEsVUFBQSxPQUFBLElBQUE7Z0JBQ0EsSUFBQSxPQUFBLE9BQUEsU0FBQSxRQUFBLEtBQUEsVUFBQTtnQkFDQSxHQUFBLE9BQUEsT0FBQSxJQUFBLEdBQUEsS0FBQSxlQUFBLElBQUEsTUFBQSxXQUFBOztZQUVBLEdBQUEsZUFBQTs7WUFFQTs7O1FBR0EsT0FBQSxPQUFBLFdBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7OztZQUdBOzs7UUFHQSxPQUFBLGlCQUFBLHVDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOzs7WUFHQSxHQUFBLFFBQUEsT0FBQSxJQUFBLFNBQUEsTUFBQSxlQUFBO1lBQ0EsR0FBQSxPQUFBLE9BQUEsSUFBQSxTQUFBLEtBQUEsZUFBQTs7WUFFQSxJQUFBLE9BQUEsU0FBQSxhQUFBLGVBQUEsU0FBQSxhQUFBLE1BQUE7Z0JBQ0EsSUFBQSxTQUFBLFVBQUE7b0JBQ0EsR0FBQSxtQkFBQSxFQUFBLEtBQUEsR0FBQSxXQUFBLENBQUEsT0FBQSxTQUFBOzs7Z0JBR0EsSUFBQSxTQUFBLGdCQUFBO29CQUNBLEdBQUEsaUJBQUEsU0FBQTs7O21CQUdBO2dCQUNBLEdBQUEsZ0JBQUE7Z0JBQ0EsR0FBQSxtQkFBQTs7Ozs7Ozs7Ozs7O0FDcElBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFVBQUEsdUJBQUEsWUFBQTtRQUNBLE9BQUE7WUFDQSxVQUFBO1lBQ0EsYUFBQTtZQUNBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsT0FBQTtnQkFDQSxVQUFBO2dCQUNBLE1BQUE7Ozs7Ozs7Ozs7O0FDWEEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsV0FBQSxvRkFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsS0FBQTs7UUFFQSxHQUFBLGVBQUE7UUFDQSxHQUFBLGNBQUE7UUFDQSxHQUFBLFdBQUEsT0FBQTtRQUNBLEdBQUEsZ0JBQUEsYUFBQTtRQUNBLEdBQUEsUUFBQSxFQUFBLFVBQUEsWUFBQTtRQUNBLEdBQUEsY0FBQTs7UUFFQSxHQUFBLGlCQUFBLFlBQUE7WUFDQSxHQUFBLFdBQUEsQ0FBQSxHQUFBO1lBQ0EsYUFBQSxzQkFBQSxHQUFBOzs7UUFHQSxHQUFBLGFBQUEsVUFBQSxNQUFBO1lBQ0EsS0FBQSxTQUFBLENBQUEsS0FBQTtZQUNBLElBQUEsS0FBQSxRQUFBO2dCQUNBLElBQUEsQ0FBQSxFQUFBLEtBQUEsR0FBQSxhQUFBLE9BQUE7b0JBQ0EsR0FBQSxZQUFBLEtBQUE7b0JBQ0EsYUFBQSxlQUFBLEdBQUE7O21CQUVBO2dCQUNBLElBQUEsRUFBQSxLQUFBLEdBQUEsYUFBQSxPQUFBO29CQUNBLEVBQUEsT0FBQSxHQUFBLGFBQUE7b0JBQ0EsYUFBQSxlQUFBLEdBQUE7Ozs7O1FBS0EsSUFBQSxhQUFBLFlBQUE7WUFDQSxJQUFBLFVBQUEsVUFBQSxTQUFBOztZQUVBLElBQUEsU0FBQTtnQkFDQSxVQUFBLFFBQUEsTUFBQTtnQkFDQSxFQUFBLFFBQUEsU0FBQSxVQUFBLFVBQUE7b0JBQ0EsSUFBQSxPQUFBLEVBQUEsS0FBQSxHQUFBLE9BQUEsRUFBQSxNQUFBO29CQUNBLEdBQUEsV0FBQTs7Ozs7UUFLQTs7UUFFQSxPQUFBLGlCQUFBLHNDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEdBQUEsZ0JBQUE7Ozs7Ozs7Ozs7QUN6REEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsVUFBQSxtQkFBQSxZQUFBO1FBQ0EsT0FBQTtZQUNBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBO2dCQUNBLFVBQUE7Ozs7Ozs7Ozs7O0FDVkEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEs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QUFBLFFBQUEsY0FBQSxRQUFBLFlBQUE7WUFDQSxPQUFBLFFBQUE7Ozs7UUFJQSxhQUFBLFFBQUEsYUFBQSxRQUFBLFVBQUEsUUFBQSxLQUFBO1lBQ0EsSUFBQSxZQUFBLEVBQUEsVUFBQSxFQUFBLElBQUEsSUFBQSxNQUFBLEtBQUEsR0FBQSxNQUFBLE1BQUEsVUFBQSxHQUFBLEVBQUEsT0FBQSxFQUFBLE1BQUE7WUFDQSxJQUFBLFVBQUEsYUFBQSxnQkFBQTtnQkFDQSxPQUFBLGVBQUE7bUJBQ0EsSUFBQSxVQUFBLGFBQUEsZ0JBQUE7Z0JBQ0EsT0FBQTttQkFDQSxJQUFBLFVBQUEsYUFBQSw0QkFBQTtnQkFDQSxPQUFBLFFBQUE7bUJBQ0EsSUFBQSxVQUFBLGFBQUEsbUJBQUE7Z0JBQ0EsT0FBQSxRQUFBOzs7OztRQUtBLGFBQUEsUUFBQSxlQUFBLFFBQUEsWUFBQTtZQUNBLE9BQUE7Ozs7UUFJQSxhQUFBLFFBQUEsYUFBQSxRQUFBLFlBQUE7WUFDQSxPQUFBOzs7O0FBSUEiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBMQVlPVVRfS0VZID0gJ2RlbHRhTGF5b3V0Q29uZmlnJztcclxuICAgIC8vIERFRkFVTFRfTEFZT1VUIGlzIHRoZSBjb25maWd1cmF0aW9uIGZvciBHb2xkZW5MYXlvdXQgd2UnbGwgdXNlIGlmIHRoZVxyXG4gICAgLy8gdXNlciBoYXNuJ3Qgc2F2ZWQgb25lIHlldCBvciBpZiB0aGUgb25lIHRoZXkgaGF2ZSBzYXZlZCBjYXVzZXMgYW4gZXJyb3JcclxuICAgIC8vIG9mIHNvbWUgc29ydC5cclxuICAgIHZhciBERUZBVUxUX0xBWU9VVCA9IHtcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgICBoYXNIZWFkZXJzOiB0cnVlLFxyXG4gICAgICAgICAgICBzaG93UG9wb3V0SWNvbjogZmFsc2UsXHJcbiAgICAgICAgICAgIHNob3dNYXhpbWlzZUljb246IHRydWUsXHJcbiAgICAgICAgICAgIHNob3dDbG9zZUljb246IGZhbHNlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBsYWJlbHM6IHtcclxuICAgICAgICAgICAgbWF4aW1pc2U6ICdtYXhpbWl6ZScsXHJcbiAgICAgICAgICAgIG1pbmltaXNlOiAnbWluaW1pemUnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjb250ZW50OiBbe1xyXG4gICAgICAgICAgICB0eXBlOiAncm93JyxcclxuICAgICAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdjb2x1bW4nLFxyXG4gICAgICAgICAgICAgICAgd2lkdGg6IDIyLFxyXG4gICAgICAgICAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY29tcG9uZW50JyxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lOiAndGVtcGxhdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFN0YXRlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlSWQ6ICdtb2R1bGVzL2NvbXBvbmVudHMvc2lkZWJhci9zaWRlYmFyVGVtcGxhdGUuaHRtbCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlTmFtZTogJ25hdmlnYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVRpdGxlOiAnTmF2aWdhdGlvbidcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICB9LHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdjb2x1bW4nLFxyXG4gICAgICAgICAgICAgICAgd2lkdGg6IDM5LFxyXG4gICAgICAgICAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm93JyxcclxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDcwLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjb21wb25lbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lOiAndGVtcGxhdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRTdGF0ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVJZDogJ21vZHVsZXMvY29tcG9uZW50cy9tYXAvbWFwVGVtcGxhdGUuaHRtbCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZU5hbWU6ICdtYXAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVUaXRsZTogJ01hcCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgICAgICB9LHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm93JyxcclxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDMwLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjb21wb25lbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lOiAndGVtcGxhdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRTdGF0ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVJZDogJ21vZHVsZXMvY29tcG9uZW50cy9ldmVudHMvZXZlbnRzVGVtcGxhdGUuaHRtbCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZU5hbWU6ICdldmVudHMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVUaXRsZTogJ0V2ZW50cydcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICB9LHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdjb2x1bW4nLFxyXG4gICAgICAgICAgICAgICAgd2lkdGg6IDM5LFxyXG4gICAgICAgICAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY29tcG9uZW50JyxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lOiAndGVtcGxhdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFN0YXRlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlSWQ6ICdtb2R1bGVzL2NvbXBvbmVudHMvZXZlbnRWaWV3ZXIvZXZlbnRWaWV3ZXJUZW1wbGF0ZS5odG1sJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVOYW1lOiAnZXZlbnRWaWV3ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVRpdGxlOiAnRXZlbnQgRGV0YWlscydcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICB9XVxyXG4gICAgICAgIH1dXHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnLCBbXHJcbiAgICAgICAgJ2RlbHRhLmNvbmZpZycsXHJcbiAgICAgICAgJ25nTWF0ZXJpYWwnLFxyXG4gICAgICAgICduZ0Nvb2tpZXMnLFxyXG4gICAgICAgICduZ1Jlc291cmNlJyxcclxuICAgICAgICAnbmdTYW5pdGl6ZScsXHJcbiAgICAgICAgJ25nQW5pbWF0ZScsXHJcbiAgICAgICAgJ25nV2Vid29ya2VyJyxcclxuICAgICAgICAnbmVtTG9nZ2luZycsXHJcbiAgICAgICAgJ21kUGlja2VycycsXHJcbiAgICAgICAgJ3VpLWxlYWZsZXQnLFxyXG4gICAgICAgICdMb2NhbFN0b3JhZ2VNb2R1bGUnLFxyXG4gICAgICAgICdjZnAuaG90a2V5cydcclxuICAgIF0pO1xyXG5cclxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRwcm92aWRlLCAkbWRUaGVtaW5nUHJvdmlkZXIsIFdlYndvcmtlclByb3ZpZGVyKSB7XHJcbiAgICAgICAgLy8gRml4IHNvdXJjZW1hcHNcclxuICAgICAgICAvLyBAdXJsIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIuanMvaXNzdWVzLzUyMTcjaXNzdWVjb21tZW50LTUwOTkzNTEzXHJcbiAgICAgICAgJHByb3ZpZGUuZGVjb3JhdG9yKCckZXhjZXB0aW9uSGFuZGxlcicsIGZ1bmN0aW9uICgkZGVsZWdhdGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChleGNlcHRpb24sIGNhdXNlKSB7XHJcbiAgICAgICAgICAgICAgICAkZGVsZWdhdGUoZXhjZXB0aW9uLCBjYXVzZSk7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGV4Y2VwdGlvbjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkbWRUaGVtaW5nUHJvdmlkZXIudGhlbWUoJ2RlZmF1bHQnKS5wcmltYXJ5UGFsZXR0ZSgnZ3JleScpLmFjY2VudFBhbGV0dGUoJ2JsdWUnKS5kYXJrKCk7XHJcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdzdWNjZXNzLXRvYXN0Jyk7XHJcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdmYWlsLXRvYXN0Jyk7XHJcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCd3YXJuLXRvYXN0Jyk7XHJcblxyXG4gICAgICAgIFdlYndvcmtlclByb3ZpZGVyLnNldEhlbHBlclBhdGgoJy4vc2NyaXB0cy93ZWJ3b3JrZXJEZXBzL3dvcmtlcl93cmFwcGVyLmpzJyk7XHJcbiAgICB9KVxyXG4gICAgLnZhbHVlKCdtb21lbnQnLCB3aW5kb3cubW9tZW50KVxyXG4gICAgLnZhbHVlKCdfJywgd2luZG93Ll8pXHJcbiAgICAudmFsdWUoJ0wnLCB3aW5kb3cuTClcclxuICAgIC52YWx1ZSgnbG9jYWxTdG9yYWdlJywgd2luZG93LmxvY2FsU3RvcmFnZSlcclxuICAgIC52YWx1ZSgnZDMnLCB3aW5kb3cuZDMpXHJcbiAgICAudmFsdWUoJyQnLCB3aW5kb3cuJClcclxuICAgIC52YWx1ZSgndG9hc3RyJywgd2luZG93LnRvYXN0cilcclxuICAgIC52YWx1ZSgnYzMnLCB3aW5kb3cuYzMpXHJcbiAgICAudmFsdWUoJ1hNTEh0dHBSZXF1ZXN0Jywgd2luZG93LlhNTEh0dHBSZXF1ZXN0KVxyXG4gICAgLnZhbHVlKCdMTHRvTUdSUycsIHdpbmRvdy5MTHRvTUdSUylcclxuICAgIC52YWx1ZSgnR29sZGVuTGF5b3V0Jywgd2luZG93LkdvbGRlbkxheW91dCk7XHJcblxyXG4gICAgYXBwLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkaHR0cCwgJGNvbXBpbGUsICRtZFRvYXN0LCAkd2luZG93LCBkZWx0YUNvbmZpZywgZGVsdGFTZXJ2aWNlLCBsb2NhbFN0b3JhZ2VTZXJ2aWNlLCBzdGF0ZVNlcnZpY2UsIHZvdGVTZXJ2aWNlLCBHb2xkZW5MYXlvdXQsIF8pIHtcclxuICAgICAgICAvLyBzZXQgYSBnbG9iYWwgc2NvcGUgcGFyYW0gZm9yIHRoZSA8dGl0bGU+IGVsZW1lbnRcclxuICAgICAgICAkcm9vdFNjb3BlLnBhZ2VUaXRsZSA9IGRlbHRhQ29uZmlnLnRpdGxlO1xyXG5cclxuICAgICAgICAvLyByZXRyaWV2ZS9zZXQgdm90aW5nIGluZm9cclxuICAgICAgICB2b3RlU2VydmljZS5nZXRWb3Rlcigndm90ZXJfbmFtZScpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0LmRhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8gdXNlciBoYXMgdm90ZWQgYmVmb3JlXHJcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZXIocmVzdWx0LmRhdGFbMF0pO1xyXG4gICAgICAgICAgICAgICAgdm90ZVNlcnZpY2UuZ2V0Vm90ZXNCeVZvdGVyKHJlc3VsdC5kYXRhWzBdLnZvdGVyX25hbWUpLnRoZW4oZnVuY3Rpb24gKHZvdGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVzKHZvdGVzLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3RlcyhudWxsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogcmlnaHQgbm93IHRoZSBzZXJ2aWNlIHNpbXBseSByZWFkcyB0aGUgdXNlcidzIElQLFxyXG4gICAgICAgICAgICAgICAgLy8gdGhlcmVmb3JlIG5vIHBheWxvYWQgZGF0YSBpcyByZXF1aXJlZC4gV2hlbiBQS0kgYXV0aCBpc1xyXG4gICAgICAgICAgICAgICAgLy8gYXZhaWxhYmxlLCBhbiBvYmplY3Qgd2lsbCBuZWVkIHRvIGJlIHBhc3NlZCB0byB0aGUgYWRkVm90ZXJcclxuICAgICAgICAgICAgICAgIC8vIGZ1bmN0aW9uXHJcbiAgICAgICAgICAgICAgICB2b3RlU2VydmljZS5hZGRWb3RlcigpLnRoZW4oZnVuY3Rpb24gKHZvdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVyKHZvdGVyLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3RlcihudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvcjogVW5hYmxlIHRvIGFkZCB2b3RlciB0byBkYXRhYmFzZS4gVm90aW5nIHdpbGwgYmUgdW5hdmFpbGFibGUuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZXIobnVsbCk7XHJcbiAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yOiBVbmFibGUgdG8gcXVlcnkgdm90ZSBkYXRhYmFzZS4gVm90aW5nIHdpbGwgYmUgdW5hdmFpbGFibGUuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBsb2FkIHJlYXNvbnMgdG8gbGlzdCBmb3IgZG93bnZvdGUgYnV0dG9uXHJcbiAgICAgICAgdm90ZVNlcnZpY2UuZ2V0UmVhc29ucygpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICB2YXIgdm90ZVJlYXNvbnMgPSBfLmZpbHRlcihyZXN1bHQuZGF0YSwgZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLnJlYXNvbi5sZW5ndGggPiAwO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVSZWFzb25zKHZvdGVSZWFzb25zKTtcclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIHJldHJpZXZpbmcgdm90ZSBpbmZvcm1hdGlvbicpO1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB2YXIgaW5pdGlhbGl6ZUxheW91dFdpdGhDb25maWcgPSBmdW5jdGlvbihsYXlvdXRDb25maWcpIHtcclxuICAgICAgICAgICAgdmFyIGxheW91dCA9IG5ldyBHb2xkZW5MYXlvdXQobGF5b3V0Q29uZmlnKTtcclxuICAgICAgICAgICAgdmFyIGNvbXBvbmVudHMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGxheW91dC5yZWdpc3RlckNvbXBvbmVudCgndGVtcGxhdGUnLCBmdW5jdGlvbiAoY29udGFpbmVyLCBzdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnNldFRpdGxlKHN0YXRlLnRlbXBsYXRlVGl0bGUpO1xyXG4gICAgICAgICAgICAgICAgJGh0dHAuZ2V0KHN0YXRlLnRlbXBsYXRlSWQsIHsgY2FjaGU6IHRydWUgfSkuc3VjY2VzcyhmdW5jdGlvbiAoaHRtbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgPSAkY29tcGlsZSgnPGRpdj4nICsgaHRtbCArICc8L2Rpdj4nKSgkcm9vdFNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuZ2V0RWxlbWVudCgpLmh0bWwoaHRtbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5wdXNoKHsgY29udGFpbmVyOiBjb250YWluZXIsIHN0YXRlOiBzdGF0ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TGF5b3V0Q29tcG9uZW50cyhjb21wb25lbnRzKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxheW91dC5vbignc3RhdGVDaGFuZ2VkJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc3RhdGUgPSBsYXlvdXQudG9Db25maWcoKTtcclxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0KExBWU9VVF9LRVksIHN0YXRlKTtcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMYXlvdXRDb25maWcoc3RhdGUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxheW91dC5pbml0KCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gZ29sZGVuIGxheW91dCBjb25maWcgLSBldmVudHVhbGx5IHVzZSBzdGF0ZVNlcnZpY2UgZm9yIHRoaXMuLi5cclxuICAgICAgICB2YXIgbGF5b3V0Q29uZmlnID0gREVGQVVMVF9MQVlPVVQ7XHJcbiAgICAgICAgaWYgKGxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KExBWU9VVF9LRVkpKSB7XHJcbiAgICAgICAgICAgIGxheW91dENvbmZpZyA9IGxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KExBWU9VVF9LRVkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVHJ5IHRvIHVzZSB0aGUgbGF5b3V0IGNvbmZpZ3VyYXRpb24gZnJvbSBsb2NhbCBzdG9yYWdlLCBidXQgaWZcclxuICAgICAgICAvLyBmb3Igd2hhdGV2ZXIgcmVhc29uIHRoYXQgZmFpbHMsIGZhbGxiYWNrIHRvIHRoZSBkZWZhdWx0XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaW5pdGlhbGl6ZUxheW91dFdpdGhDb25maWcobGF5b3V0Q29uZmlnKTtcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExheW91dENvbmZpZyhsYXlvdXRDb25maWcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaChlKSB7XHJcbiAgICAgICAgICAgIGluaXRpYWxpemVMYXlvdXRXaXRoQ29uZmlnKERFRkFVTFRfTEFZT1VUKTtcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExheW91dENvbmZpZyhsYXlvdXRDb25maWcpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5zZXJ2aWNlKCdkZWx0YUNvbmZpZycsIGZ1bmN0aW9uIChkZWx0YUNvbmZpZ0xvY2FsLCBtb21lbnQsIF8sIEwpIHtcbiAgICAgICAgdmFyIGNmZyA9IHtcbiAgICAgICAgICAgIHRpdGxlOiAnRGVsdGEnLFxuICAgICAgICAgICAgbG9nbzogJ86UIERlbHRhJyxcbiAgICAgICAgICAgIG1hcENlbnRlcjoge1xuICAgICAgICAgICAgICAgIGxhdDogNDQuMzY2NDI4LFxuICAgICAgICAgICAgICAgIGxuZzogLTgxLjQ1Mzk0NSxcbiAgICAgICAgICAgICAgICB6b29tOiA4XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGF5ZXJzOiB7XG4gICAgICAgICAgICAgICAgYmFzZWxheWVyczoge31cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWZhdWx0TG9jYXRpb25Gb3JtYXQ6ICdkZCcsXG4gICAgICAgICAgICBkZWZhdWx0QmFzZWxheWVyOiAnJyxcbiAgICAgICAgICAgIG1heERheXNCYWNrOiAxMDAwMCxcbiAgICAgICAgICAgIGRlZmF1bHRUaW1lUmFuZ2VWYWx1ZTogNixcbiAgICAgICAgICAgIGRlZmF1bHRUaW1lUmFuZ2VUeXBlOiAnaCcsXG4gICAgICAgICAgICByYW5nZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzOiAtNixcbiAgICAgICAgICAgICAgICAgICAgdW5pdE9mVGltZTogJ2hvdXJzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICc2IEhvdXJzJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB1bml0czogLTEyLFxuICAgICAgICAgICAgICAgICAgICB1bml0T2ZUaW1lOiAnaG91cnMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJzEyIEhvdXJzJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB1bml0czogLTI0LFxuICAgICAgICAgICAgICAgICAgICB1bml0T2ZUaW1lOiAnaG91cnMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJzI0IEhvdXJzJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB1bml0czogLTcsXG4gICAgICAgICAgICAgICAgICAgIHVuaXRPZlRpbWU6ICdkYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICc3IERheXMnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRlZmF1bHREdXJhdGlvbkxlbmd0aDogMSxcbiAgICAgICAgICAgIGR1cmF0aW9uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdkYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdEYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICd3ZWVrcycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnV2Vla3MnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ21vbnRocycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnTW9udGhzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ3llYXJzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdZZWFycycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRlZmF1bHRQcm9qZWN0aW9uOiBMLkNSUy5FUFNHNDMyNixcbiAgICAgICAgICAgIGRlYm91bmNlVGltZTogMzAwLFxuICAgICAgICAgICAgbWF4aW11bVJlY2VudEFPSXM6IDUsXG4gICAgICAgICAgICBjb21wb25lbnRzOiB7XG4gICAgICAgICAgICAgICAgZ290bzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzb3VyY2VGaWx0ZXI6IHRydWUsXG4gICAgICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXI6IHRydWUsXG4gICAgICAgICAgICAgICAgdHlwZUZpbHRlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlRmlsdGVyOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvdW50cnlGaWx0ZXI6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zOiAnYWxsJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHJlY3Vyc2l2ZWx5IG1lcmdlIHRoZSBsb2NhbCBjb25maWcgb250byB0aGUgZGVmYXVsdCBjb25maWdcbiAgICAgICAgYW5ndWxhci5tZXJnZShjZmcsIGRlbHRhQ29uZmlnTG9jYWwpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY2ZnLmRlZmF1bHRQcm9qZWN0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gZGVmYXVsdFByb2plY3Rpb24gaGFzIGJlZW4gb3ZlcndyaXR0ZW4gaW4gbG9jYWwgY29uZmlnXG4gICAgICAgICAgICAvLyBvbmx5IGEgc3RyaW5nIHZhbHVlIGNhbiBiZSBzcGVjaWZpZWQgaW4gbG9jYWwgY29uZmlnLCBzbyB1c2UgZXZhbCB0byBwcm9kdWNlIHRoZSBwcm9wZXIgSlMgb2JqZWN0XG4gICAgICAgICAgICBjZmcuZGVmYXVsdFByb2plY3Rpb24gPSBldmFsKGNmZy5kZWZhdWx0UHJvamVjdGlvbik7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjZmc7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuZmFjdG9yeSgnVm90ZScsIGZ1bmN0aW9uIChcclxuXHJcbiAgICApIHtcclxuICAgICAgICAvLyBDb25zdHJ1Y3RvclxyXG4gICAgICAgIHZhciBWb3RlID0gZnVuY3Rpb24gKHZvdGVfaWQsIHByb2R1Y3RfaWQsIGRhdGFzZXRfaWQsIGlkZW50aXR5LCB2b3Rlcl9uYW1lLCB2b3RlLCByZWFzb24pIHtcclxuICAgICAgICAgICAgdGhpcy52b3RlX2lkID0gdm90ZV9pZCB8fCBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLnByb2R1Y3RfaWQgPSBwcm9kdWN0X2lkIHx8ICcnO1xyXG4gICAgICAgICAgICB0aGlzLmRhdGFzZXRfaWQgPSBkYXRhc2V0X2lkIHx8ICcnO1xyXG4gICAgICAgICAgICB0aGlzLmlkZW50aXR5ID0gaWRlbnRpdHkgfHwgbnVsbDtcclxuICAgICAgICAgICAgdGhpcy52b3Rlcl9uYW1lID0gdm90ZXJfbmFtZSB8fCAnJztcclxuICAgICAgICAgICAgdGhpcy52b3RlID0gdHlwZW9mKHZvdGUpID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiB2b3RlO1xyXG4gICAgICAgICAgICB0aGlzLnJlYXNvbiA9IHJlYXNvbiB8fCAnJztcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBwdWJsaWMgbWV0aG9kc1xyXG4gICAgICAgIFZvdGUucHJvdG90eXBlID0ge1xyXG5cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBzdGF0aWMgbWV0aG9kc1xyXG4gICAgICAgIFZvdGUuYnVpbGQgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICBpZiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZihkYXRhLnZvdGUpID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudm90ZSA9IGRhdGEudm90ZSA9PT0gJ3RydWUnO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBWb3RlKFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudm90ZV9pZCxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnByb2R1Y3RfaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5kYXRhc2V0X2lkLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaWRlbnRpdHksXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS52b3Rlcl9uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudm90ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnJlYXNvblxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZvdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBWb3RlLnRyYW5zZm9ybWVyID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubWFwKFZvdGUuYnVpbGQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBWb3RlLmJ1aWxkKGRhdGEpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBWb3RlO1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLmZhY3RvcnkoJ2Nvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZScsIGZ1bmN0aW9uIChMTHRvTUdSUykge1xuICAgICAgICAvL3RydW5jYXRlIGlzIGEgc2lnbiBhcHByb3ByaWF0ZSB0cnVuY2F0aW9uIGZ1bmN0aW9uXG4gICAgICAgIHZhciB0cnVuY2F0ZSA9IGZ1bmN0aW9uIChfdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChfdmFsdWUgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguY2VpbChfdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoX3ZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgbGF0aXR1ZGUgZGVjaW1hbCBkZWdyZWVzIChmbG9hdCkgaW50byBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIGFzIGEgc3RyaW5nIGluIHRoZSBmb3JtYXQ6XG4gICAgICAgICAnWFjCsFhYJ1hYLlhYWCdcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZExhdFRvRE1TTGF0ID0gZnVuY3Rpb24gKGxhdCkge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKGxhdCA8PSA5MCAmJiBsYXQgPj0gMCkge1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSB0cnVuY2F0ZShsYXQpO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB0cnVuY2F0ZSgobGF0IC0gZGVncmVlcykgKiA2MCk7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9ICgoKChsYXQgLSBkZWdyZWVzKSAqIDYwKSAtIG1pbnV0ZXMpICogNjApLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZ3JlZXMgKyAnwrAnICsgbWludXRlcyArICdcXCcnICsgc2Vjb25kcyArICdcIic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdCA8IDAgJiYgbGF0ID49IC05MCkge1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSB0cnVuY2F0ZShsYXQpO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB0cnVuY2F0ZSgoTWF0aC5hYnMobGF0KSAtIE1hdGguYWJzKGRlZ3JlZXMpKSAqIDYwKTtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gKCgoKE1hdGguYWJzKGxhdCkgLSBNYXRoLmFicyhkZWdyZWVzKSkgKiA2MCkgLSBtaW51dGVzKSAqIDYwKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWdyZWVzICsgJ8KwJyArIG1pbnV0ZXMgKyAnXFwnJyArIHNlY29uZHMgKyAnXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ludmFsaWQgTGF0aXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyBsb25naXR1ZGUgZGVjaW1hbCBkZWdyZWVzIChmbG9hdCkgaW50byBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIGFzIGEgc3RyaW5nIGluIHRoZSBmb3JtYXQ6XG4gICAgICAgICAnWFjCsFhYJ1hYLlhYWCdcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZExvblRvRE1TTG9uID0gZnVuY3Rpb24gKGxvbikge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKGxvbiA8PSAxODAgJiYgbG9uID49IDApIHtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gdHJ1bmNhdGUobG9uKTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdHJ1bmNhdGUoKGxvbiAtIGRlZ3JlZXMpICogNjApO1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSAoKCgobG9uIC0gZGVncmVlcykgKiA2MCkgLSBtaW51dGVzKSAqIDYwKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWdyZWVzICsgJ8KwJyArIG1pbnV0ZXMgKyAnXFwnJyArIHNlY29uZHMgKyAnXCInO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb24gPCAwICYmIGxvbiA+PSAtMTgwKSB7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHRydW5jYXRlKChsb24pKTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdHJ1bmNhdGUoKE1hdGguYWJzKGxvbikgLSBNYXRoLmFicyhkZWdyZWVzKSkgKiA2MCk7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9ICgoKChNYXRoLmFicyhsb24pIC0gTWF0aC5hYnMoZGVncmVlcykpICogNjApIC0gbWludXRlcykgKiA2MCkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVncmVlcyArICfCsCcgKyBtaW51dGVzICsgJ1xcJycgKyBzZWNvbmRzICsgJ1wiJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdJbnZhbGlkIGxvbmdpdHVkZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLypcbiAgICAgICAgIENvbnZlcnRzIGxhdGl0dWRlIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgaW50byBkZWNpbWFsIGRlZ3JlZXMgKGZsb2F0KVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGRtc0xhdFRvRERMYXQgPSBmdW5jdGlvbiAobGF0RGVncmVlLCBsYXRNaW51dGUsIGxhdFNlY29uZCkge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKHBhcnNlRmxvYXQobGF0RGVncmVlKSA8IDApIHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gcGFyc2VGbG9hdChsYXRTZWNvbmQpIC8gNjA7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IChwYXJzZUZsb2F0KGxhdE1pbnV0ZSkgKyBzZWNvbmRzKSAvIDYwO1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSBwYXJzZUZsb2F0KE1hdGguYWJzKGxhdERlZ3JlZSkpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoKGRlZ3JlZXMgKyBtaW51dGVzKSAqIC0xKS50b0ZpeGVkKDYpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXJzZUZsb2F0KGxhdERlZ3JlZSkgPj0gMCkge1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBwYXJzZUZsb2F0KGxhdFNlY29uZCkgLyA2MDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gKHBhcnNlRmxvYXQobGF0TWludXRlKSArIHNlY29uZHMpIC8gNjA7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHBhcnNlRmxvYXQobGF0RGVncmVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGRlZ3JlZXMgKyBtaW51dGVzKS50b0ZpeGVkKDYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ludmFsaWQgTGF0aXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyBsb25naXR1ZGUgZGVncmVlcywgbWludXRlcywgc2Vjb25kcyBpbnRvIGRlY2ltYWwgZGVncmVlcyAoZmxvYXQpXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgZG1zTG9uVG9ERExvbiA9IGZ1bmN0aW9uIChsb25EZWdyZWUsIGxvbk1pbnV0ZSwgbG9uU2Vjb25kKSB7XG4gICAgICAgICAgICB2YXIgZGVncmVlcztcbiAgICAgICAgICAgIHZhciBtaW51dGVzO1xuICAgICAgICAgICAgdmFyIHNlY29uZHM7XG4gICAgICAgICAgICBpZiAocGFyc2VGbG9hdChsb25EZWdyZWUpIDwgMCkge1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBwYXJzZUZsb2F0KGxvblNlY29uZCkgLyA2MDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gKHBhcnNlRmxvYXQobG9uTWludXRlKSArIHNlY29uZHMpIC8gNjA7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHBhcnNlRmxvYXQoTWF0aC5hYnMobG9uRGVncmVlKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgoZGVncmVlcyArIG1pbnV0ZXMpICogLTEpLnRvRml4ZWQoNik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnNlRmxvYXQobG9uRGVncmVlKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9IHBhcnNlRmxvYXQobG9uU2Vjb25kKSAvIDYwO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSAocGFyc2VGbG9hdChsb25NaW51dGUpICsgc2Vjb25kcykgLyA2MDtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gcGFyc2VGbG9hdChsb25EZWdyZWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoZGVncmVlcyArIG1pbnV0ZXMpLnRvRml4ZWQoNik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnSW52YWxpZCBMb25naXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vTXlTZXJ2aWNlIGlzIGFuIG9iamVjdCB0byBjb250YWluIGFsbCBmaWVsZHMgYW5kXG4gICAgICAgIC8vZnVuY3Rpb25zIG5lY2Vzc2FyeSB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSB2YXJpb3VzXG4gICAgICAgIC8vY29udHJvbGxlcnNcbiAgICAgICAgdmFyIGNvb3JkU2VydmljZSA9IHt9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyB0aGUgZGVjaW1hbCBkZWdyZWVzIG9mIGxhdGl0dWRlIGFuZCBsb25naXR1ZGUgaW5wdXQgYm94IHRoZSBvdGhlciBmb3JtYXRzIChETVMgYW5kIE1HUlMpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICBjb29yZFNlcnZpY2UucHJlcEZvckREQnJvYWRjYXN0ID0gZnVuY3Rpb24gKGxhdCwgbG9uKSB7XG4gICAgICAgICAgICBpZiAoKGxhdCB8fCBsYXQgPT09IDApICYmIGxhdCA+PSAtOTAgJiYgbGF0IDw9IDkwICYmIChsb24gfHwgbG9uID09PSAwKSAmJiBsb24gPj0gLTE4MCAmJiBsb24gPD0gMTgwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGRtczogW2RkTGF0VG9ETVNMYXQobGF0KSwgZGRMb25Ub0RNU0xvbihsb24pXSxcbiAgICAgICAgICAgICAgICAgICAgZGQ6IFtsYXQsIGxvbl0sXG4gICAgICAgICAgICAgICAgICAgIG1ncnM6ICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAobGF0ID49IC04MCAmJiBsYXQgPD0gODQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5tZ3JzID0gTEx0b01HUlMobGF0LCBsb24sIDUpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCEobGF0ID49IC04MCAmJiBsYXQgPD0gODQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCEobG9uID49IC0xODAgJiYgbG9uIDw9IDE4MCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgdGhlIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgc3RyaW5ncyBvZiBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlIGlucHV0IGJveCB0aGUgb3RoZXIgZm9ybWF0cyAoREQgYW5kIE1HUlMpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICBjb29yZFNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdCA9IGZ1bmN0aW9uIChsYXRETVMsIGxvbkRNUykge1xuICAgICAgICAgICAgdmFyIGxhdERlZ3JlZSwgbGF0TWludXRlLCBsYXRTZWNvbmQsIGxvbkRlZ3JlZSwgbG9uTWludXRlLCBsb25TZWNvbmQ7XG4gICAgICAgICAgICBsYXRETVMgPSBsYXRETVMucmVwbGFjZSgvW05TIF0vaWcsICcnKS5zcGxpdCgvW8KwJ1wiXS8pO1xuICAgICAgICAgICAgbG9uRE1TID0gbG9uRE1TLnJlcGxhY2UoL1tFVyBdL2lnLCAnJykuc3BsaXQoL1vCsCdcIl0vKTtcblxuICAgICAgICAgICAgaWYgKGxhdERNUy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA9IHBhcnNlSW50KGxhdERNU1swXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA9IHBhcnNlSW50KGxhdERNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA9IHBhcnNlRmxvYXQobGF0RE1TWzJdLCAxMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdERNUy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsYXRETVMgPSBsYXRETVNbMF0uc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPSBwYXJzZUZsb2F0KGxhdERNU1swXS5zdWJzdHIoLTIpICsgJy4nICsgbGF0RE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0TWludXRlID0gcGFyc2VJbnQobGF0RE1TWzBdLnN1YnN0cigtNCwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPSBwYXJzZUludChsYXRETVNbMF0uc2xpY2UoMCwgLTQpLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobG9uRE1TLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID0gcGFyc2VJbnQobG9uRE1TWzBdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uTWludXRlID0gcGFyc2VJbnQobG9uRE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID0gcGFyc2VGbG9hdChsb25ETVNbMl0sIDEwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9uRE1TLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGxvbkRNUyA9IGxvbkRNU1swXS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgICAgIGxvblNlY29uZCA9IHBhcnNlRmxvYXQobG9uRE1TWzBdLnN1YnN0cigtMikgKyAnLicgKyBsb25ETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPSBwYXJzZUludChsb25ETVNbMF0uc3Vic3RyKC00LCAyKSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbkRlZ3JlZSA9IHBhcnNlSW50KGxvbkRNU1swXS5zbGljZSgwLCAtNCksIDEwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA+PSAtOTAgJiYgbGF0RGVncmVlIDw9IDkwICYmXG4gICAgICAgICAgICAgICAgbGF0TWludXRlID49IDAgJiYgbGF0TWludXRlIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbGF0U2Vjb25kID49IDAgJiYgbGF0U2Vjb25kIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uTWludXRlID49IDAgJiYgbG9uTWludXRlIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID49IDAgJiYgbG9uU2Vjb25kIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID49IC0xODAgJiYgbG9uRGVncmVlIDw9IDE4MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobGF0RGVncmVlKSAtIHBhcnNlRmxvYXQobGF0TWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxhdFNlY29uZCAqIDAuMDAwMSkgPj0gLTkwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsYXREZWdyZWUpICsgcGFyc2VGbG9hdChsYXRNaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobGF0U2Vjb25kICogMC4wMDAxKSA8PSA5MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobG9uRGVncmVlKSAtIHBhcnNlRmxvYXQobG9uTWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxvblNlY29uZCAqIDAuMDAwMSkgPj0gLTE4MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobG9uRGVncmVlKSArIHBhcnNlRmxvYXQobG9uTWludXRlICogMC4wMSkgKyBwYXJzZUZsb2F0KGxvblNlY29uZCAqIDAuMDAwMSkgPD0gMTgwXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgZG1zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXREZWdyZWUgKyAnwrAnICsgbGF0TWludXRlICsgJ1xcJycgKyBsYXRTZWNvbmQgKyAnXCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9uRGVncmVlICsgJ8KwJyArIGxvbk1pbnV0ZSArICdcXCcnICsgbG9uU2Vjb25kICsgJ1wiJ10sXG4gICAgICAgICAgICAgICAgICAgIGRkOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBkbXNMYXRUb0RETGF0KGxhdERlZ3JlZSwgbGF0TWludXRlLCBsYXRTZWNvbmQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZG1zTG9uVG9ERExvbihsb25EZWdyZWUsIGxvbk1pbnV0ZSwgbG9uU2Vjb25kKV0sXG4gICAgICAgICAgICAgICAgICAgIG1ncnM6ICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0cy5kZFswXSA+PSAtODAgJiYgcmVzdWx0cy5kZFswXSA8PSA4NCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLm1ncnMgPSBMTHRvTUdSUyhyZXN1bHRzLmRkWzBdLCByZXN1bHRzLmRkWzFdLCA1KTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgdGhlIE1HUlMtZW5jb2RlZCBzdHJpbmcgb2YgbGF0aXR1ZGUgYW5kIGxvbmdpdHVkZSBpbnB1dCBib3ggdGhlIG90aGVyIGZvcm1hdHMgKERNUyBhbmQgREQpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICAvL3ByZXBGb3JNR1JTQnJvYWRjYXN0IGlzIHRoZSBmdW5jdGlvbiB0aGF0IGNvbnZlcnRzIHRoZVxuICAgICAgICAvL2Nvb3JkaW5hdGVzIGVudGVyZWQgaW4gdGhlIE1HUlMgaW5wdXQgYm94ZXMgYW5kIHNldHNcbiAgICAgICAgLy90aGUgcmVzdCBvZiB0aGUgZmllbGRzIGluIHRoZSBteVNlcnZpY2Ugb2JqZWN0LiBkYXRhXG4gICAgICAgIC8vdmFsaWRhdGlvbiBpcyBjb21wbGV0ZWQgYnkgY2hlY2tpbmcgaWYgdGhlIGlucHV0XG4gICAgICAgIC8vY29vcmRpbmF0ZXMgcmV0dXJuIHZhbHVlcyB0byB0aGUgbGF0TG9uW10gZnJvbSB0aGVcbiAgICAgICAgLy9VU05HdG9MTCgpIGZ1bmN0aW9uIG9mIHRoZSB1c25nLmpzIGxpYnJhcnkuXG4gICAgICAgIGNvb3JkU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdCA9IGZ1bmN0aW9uIChNR1JTKSB7XG4gICAgICAgICAgICB2YXIgbGF0TG9uID0gW107XG4gICAgICAgICAgICBVU05HdG9MTChNR1JTICsgJycsIGxhdExvbik7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuXG4gICAgICAgICAgICBpZiAoaXNOYU4obGF0TG9uWzBdKSB8fCBpc05hTihsYXRMb25bMV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGFmdGVyIDUgZGVjaW1hbCBwbGFjZXMsIHRoZSByZXN1bHRzIHN0YXJ0IGdvaW5nIG9mZlxuICAgICAgICAgICAgICAgIGxhdExvblswXSA9IE1hdGgucm91bmQobGF0TG9uWzBdICogMWU1KSAvIDEuZTU7XG4gICAgICAgICAgICAgICAgbGF0TG9uWzFdID0gTWF0aC5yb3VuZChsYXRMb25bMV0gKiAxZTUpIC8gMS5lNTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBtZ3JzOiBNR1JTLFxuICAgICAgICAgICAgICAgICAgICBkZDogbGF0TG9uLFxuICAgICAgICAgICAgICAgICAgICBkbXM6IFtkZExhdFRvRE1TTGF0KGxhdExvblswXSksIGRkTG9uVG9ETVNMb24obGF0TG9uWzFdKV1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTGF0REQgPSBmdW5jdGlvbiAobGF0KSB7XG4gICAgICAgICAgICByZXR1cm4gKChsYXQgfHwgbGF0ID09PSAwIHx8IGxhdCA9PT0gJycpICYmIGxhdCA+PSAtOTAgJiYgbGF0IDw9IDkwKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRMb25ERCA9IGZ1bmN0aW9uIChsb24pIHtcbiAgICAgICAgICAgIHJldHVybiAoIChsb24gfHwgbG9uID09PSAwIHx8IGxvbiA9PT0gJycpICYmIGxvbiA+PSAtMTgwICYmIGxvbiA8PSAxODApO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTGF0RE1TID0gZnVuY3Rpb24gKGxhdERNUykge1xuICAgICAgICAgICAgaWYgKGxhdERNUyA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsYXREZWdyZWUsIGxhdE1pbnV0ZSwgbGF0U2Vjb25kO1xuICAgICAgICAgICAgbGF0RE1TID0gbGF0RE1TLnJlcGxhY2UoL1tOUyBdL2lnLCAnJykuc3BsaXQoL1vCsCdcIl0vKTtcblxuICAgICAgICAgICAgaWYgKGxhdERNUy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA9IHBhcnNlSW50KGxhdERNU1swXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA9IHBhcnNlSW50KGxhdERNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA9IHBhcnNlRmxvYXQobGF0RE1TWzJdLCAxMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdERNUy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsYXRETVMgPSBsYXRETVNbMF0uc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPSBwYXJzZUZsb2F0KGxhdERNU1swXS5zdWJzdHIoLTIpICsgJy4nICsgbGF0RE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0TWludXRlID0gcGFyc2VJbnQobGF0RE1TWzBdLnN1YnN0cigtNCwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPSBwYXJzZUludChsYXRETVNbMF0uc2xpY2UoMCwgLTQpLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA+PSAtOTAgJiYgbGF0RGVncmVlIDw9IDkwICYmXG4gICAgICAgICAgICAgICAgbGF0TWludXRlID49IDAgJiYgbGF0TWludXRlIDwgNjAgJiZcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPj0gMCAmJiBsYXRTZWNvbmQgPCA2MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobGF0RGVncmVlKSAtIHBhcnNlRmxvYXQobGF0TWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxhdFNlY29uZCAqIDAuMDAwMSkgPj0gLTkwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsYXREZWdyZWUpICsgcGFyc2VGbG9hdChsYXRNaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobGF0U2Vjb25kICogMC4wMDAxKSA8PSA5MFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb29yZFNlcnZpY2UuaXNWYWxpZExvbkRNUyA9IGZ1bmN0aW9uIChsb25ETVMpIHtcbiAgICAgICAgICAgIGlmIChsb25ETVMgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbG9uRGVncmVlLCBsb25NaW51dGUsIGxvblNlY29uZDtcbiAgICAgICAgICAgIGxvbkRNUyA9IGxvbkRNUy5yZXBsYWNlKC9bRVcgXS9pZywgJycpLnNwbGl0KC9bwrAnXCJdLyk7XG5cbiAgICAgICAgICAgIGlmIChsb25ETVMubGVuZ3RoID49IDMpIHtcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPSBwYXJzZUludChsb25ETVNbMF0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPSBwYXJzZUludChsb25ETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25TZWNvbmQgPSBwYXJzZUZsb2F0KGxvbkRNU1syXSwgMTApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb25ETVMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgbG9uRE1TID0gbG9uRE1TWzBdLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID0gcGFyc2VGbG9hdChsb25ETVNbMF0uc3Vic3RyKC0yKSArICcuJyArIGxvbkRNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA9IHBhcnNlSW50KGxvbkRNU1swXS5zdWJzdHIoLTQsIDIpLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID0gcGFyc2VJbnQobG9uRE1TWzBdLnNsaWNlKDAsIC00KSwgMTApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA+PSAwICYmIGxvbk1pbnV0ZSA8IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID49IDAgJiYgbG9uU2Vjb25kIDwgNjAgJiZcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPj0gLTE4MCAmJiBsb25EZWdyZWUgPD0gMTgwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsb25EZWdyZWUpIC0gcGFyc2VGbG9hdChsb25NaW51dGUgKiAwLjAxKSAtIHBhcnNlRmxvYXQobG9uU2Vjb25kICogMC4wMDAxKSA+PSAtMTgwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsb25EZWdyZWUpICsgcGFyc2VGbG9hdChsb25NaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobG9uU2Vjb25kICogMC4wMDAxKSA8PSAxODBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRNR1JTID0gZnVuY3Rpb24gKG1ncnMpIHtcbiAgICAgICAgICAgIGlmIChtZ3JzID09PSAnJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWdycyA9IG1ncnMgKyAnJztcbiAgICAgICAgICAgIHJldHVybiAhIW1ncnMubWF0Y2goL14oWzAtNV1bMC05XVtDLVhdfDYwW0MtWF18W0FCWVpdKVtBLVpdezJ9XFxkezQsMTR9JC9pKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gY29vcmRTZXJ2aWNlO1xuICAgIH0pO1xufSkoKTsiLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5zZXJ2aWNlKCdkZWx0YVNlcnZpY2UnLCBmdW5jdGlvbiAoZGVsdGFDb25maWcsIGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZSwgbW9tZW50KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZ2V0Vmlld3BvcnRTaXplOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdyA9IHdpbmRvdyxcclxuICAgICAgICAgICAgICAgICAgICBkID0gZG9jdW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgZSA9IGQuZG9jdW1lbnRFbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIGcgPSBkb2N1bWVudC5ib2R5LFxyXG4gICAgICAgICAgICAgICAgICAgIHggPSB3LmlubmVyV2lkdGggfHwgZS5jbGllbnRXaWR0aCB8fCBnLmNsaWVudFdpZHRoLFxyXG4gICAgICAgICAgICAgICAgICAgIHkgPSB3LmlubmVySGVpZ2h0IHx8IGUuY2xpZW50SGVpZ2h0IHx8IGcuY2xpZW50SGVpZ2h0O1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHgsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB5XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmb3JtYXRMYXRMbmc6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gZW5zdXJlIGJvdW5kcyB2YWx1ZXMgaGF2ZSBhdCBsZWFzdCAxIGRlY2ltYWwgcGxhY2VcclxuICAgICAgICAgICAgICAgIHJldHVybiAodmFsdWUgJSAxID09PSAwKSA/IHZhbHVlLnRvRml4ZWQoMSkgOiB2YWx1ZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0RERCb3VuZHM6IGZ1bmN0aW9uIChsb2NhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdmFyIHN3LCBuZSwgYm91bmRzO1xyXG4gICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ2RtcycpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KGxvY2F0aW9uLnNvdXRoLCBsb2NhdGlvbi53ZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KGxvY2F0aW9uLm5vcnRoLCBsb2NhdGlvbi5lYXN0KTtcclxuICAgICAgICAgICAgICAgICAgICBib3VuZHMgPSBbW3N3LmRkWzBdLCBuZS5kZFsxXV0sIFtuZS5kZFswXSwgc3cuZGRbMV1dXTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobG9jYXRpb24uZm9ybWF0ID09PSAnbWdycycpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdChsb2NhdGlvbi5tZ3JzU1cpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KGxvY2F0aW9uLm1ncnNORSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gW3N3LmRkLCBuZS5kZF07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlZmluZSByZWN0YW5nbGUgZ2VvZ3JhcGhpY2FsIGJvdW5kc1xyXG4gICAgICAgICAgICAgICAgICAgIGJvdW5kcyA9IFtbbG9jYXRpb24uc291dGgsIGxvY2F0aW9uLndlc3RdLCBbbG9jYXRpb24ubm9ydGgsIGxvY2F0aW9uLmVhc3RdXTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYm91bmRzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb252ZXJ0TGF0TG5nOiBmdW5jdGlvbiAobG9jYXRpb24sIG5ld0Zvcm1hdCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNvb3JkaW5hdGVzLCBsYXRMbmc7XHJcbiAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24uZm9ybWF0ID09PSAnZG1zJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3QobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sbmcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxhdExuZyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzBdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWdyczogY29vcmRpbmF0ZXMubWdyc1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ21ncnMnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZXMgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvck1HUlNCcm9hZGNhc3QobG9jYXRpb24ubWdycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRMbmcgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IHBhcnNlRmxvYXQoY29vcmRpbmF0ZXMuZGRbMF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RtcycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBjb29yZGluYXRlcy5kbXNbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGNvb3JkaW5hdGVzLmRtc1sxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ2RkJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JEREJyb2FkY2FzdChsb2NhdGlvbi5sYXQsIGxvY2F0aW9uLmxuZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RtcycgfHwgbmV3Rm9ybWF0ID09PSAnbWdycycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBjb29yZGluYXRlcy5kbXNbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGNvb3JkaW5hdGVzLmRtc1sxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRMbmcgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IHBhcnNlRmxvYXQoY29vcmRpbmF0ZXMuZGRbMF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGF0TG5nO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMZWFmbGV0UG9wdXBDb250ZW50OiBmdW5jdGlvbiAoZmVhdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0cGwgPSAnPHVsIGNsYXNzPVwibGlzdC11bnN0eWxlZCBldmVudC1kZXRhaWxzLXBvcHVwXCI+JztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGkgc3R5bGU9XCJjb2xvcjogJyArIGZlYXR1cmUuZXZlbnRTb3VyY2UuY29sb3IgKyAnXCI+PGkgY2xhc3M9XCJmYSAnICsgZmVhdHVyZS5ldmVudFR5cGUuaWNvbiArICdcIj48L2k+IDxiPicgKyBmZWF0dXJlLmV2ZW50VHlwZS50aXRsZSArICc8L2I+PC9saT4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmxhdEZpZWxkXSAmJiBmZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmxvbkZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT4nICsgZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5sYXRGaWVsZF0udG9GaXhlZCgzKSArICcsICcgKyBmZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmxvbkZpZWxkXS50b0ZpeGVkKDMpICsgJzwvbGk+JztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT4nICsgbW9tZW50LnV0YyhmZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmRhdGVGaWVsZF0pLmZvcm1hdCgnWVlZWS1NTS1ERCBoaDptbTpzc1taXScpICsgJzwvbGk+JztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdHBsICs9IGZlYXR1cmUucHJvcGVydGllcy5pc19jb3JyZWxhdGVkID8gJzxsaT5Db3JyZWxhdGVkPC9saT4nIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8L3VsPic7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLnNlcnZpY2UoJ3NlYXJjaFNlcnZpY2UnLCBmdW5jdGlvbiAoXG4gICAgICAgICRodHRwLFxuICAgICAgICAkcSxcbiAgICAgICAgJG1kVG9hc3QsXG4gICAgICAgIGRlbHRhQ29uZmlnLFxuICAgICAgICBkZWx0YVNlcnZpY2UsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgZ2V0RXZlbnRzUGFyYW1zID0gZnVuY3Rpb24gKHNvdXJjZXMpIHtcbiAgICAgICAgICAgIHZhciB0ZW1wb3JhbEZpbHRlciA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpLFxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gdHlwZW9mIHRlbXBvcmFsRmlsdGVyLnN0YXJ0ID09PSAnc3RyaW5nJyA/IHRlbXBvcmFsRmlsdGVyLnN0YXJ0IDogdGVtcG9yYWxGaWx0ZXIuc3RhcnQudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBzdG9wID0gdHlwZW9mIHRlbXBvcmFsRmlsdGVyLnN0b3AgPT09ICdzdHJpbmcnID8gdGVtcG9yYWxGaWx0ZXIuc3RvcCA6IHRlbXBvcmFsRmlsdGVyLnN0b3AudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBzb3VyY2VUeXBlID0gc3RhdGVTZXJ2aWNlLmdldFNvdXJjZVR5cGUoKSxcbiAgICAgICAgICAgICAgICBpZGVudGl0aWVzID0gXy5tYXAoc291cmNlcywgJ2lkZW50aXR5JyksXG4gICAgICAgICAgICAgICAgaWRlbnRpdHlGaWx0ZXIgPSAnJyxcbiAgICAgICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gc3RhdGVTZXJ2aWNlLmdldE9ubHlDb3JyZWxhdGlvbnMoKSxcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGlvbkZpbHRlciA9IG9ubHlDb3JyZWxhdGlvbnMgPT09IDEgPyAnaXNfY29ycmVsYXRlZD10cnVlIEFORCAnIDogJ2lzX2NvcnJlbGF0ZWQgSVMgTk9UIE5VTEwgQU5EICc7XG5cbiAgICAgICAgICAgIHZhciBzb3VyY2VUeXBlRmlsdGVyID0gc291cmNlVHlwZSA9PT0gJ0FsbCcgP1xuICAgICAgICAgICAgICAgIGRlbHRhQ29uZmlnLnNlcnZlci5zb3VyY2VUeXBlRmllbGQgKyAnIElTIE5PVCBOVUxMIEFORCAnIDpcbiAgICAgICAgICAgICAgICBkZWx0YUNvbmZpZy5zZXJ2ZXIuc291cmNlVHlwZUZpZWxkICsgJz1cXCcnICsgc291cmNlVHlwZSArICdcXCcgQU5EICc7XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZSBhbW91bnQgb2YgaWRlbnRpdGllcyBzZWxlY3RlZCBpcyBmZXdlciB0aGFuIHRoZSB0b3RhbCBhdmFpbGFibGUsIHF1ZXJ5IG9uIHRob3NlIGlkZW50aXRpZXMgdG8gc3BlZWQgdGhpbmdzIHVwXG4gICAgICAgICAgICBpZiAoaWRlbnRpdGllcy5sZW5ndGggPCBkZWx0YUNvbmZpZy5zb3VyY2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChpZGVudGl0aWVzLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpdHlGaWx0ZXIgKz0gZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGQgKyAnPScgKyB2YWx1ZSArICcgQU5EICc7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlkZW50aXR5RmlsdGVyID0gZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGQgKyAnIElTIE5PVCBOVUxMIEFORCAnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlcnZpY2U6ICdXRlMnLFxuICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgICAgICAgICAgcmVxdWVzdDogJ0dldEZlYXR1cmUnLFxuICAgICAgICAgICAgICAgIHR5cGVOYW1lOiBkZWx0YUNvbmZpZy5zZXJ2ZXIubGF5ZXJzLmV2ZW50cy53b3Jrc3BhY2UgKyAnOicgKyBkZWx0YUNvbmZpZy5zZXJ2ZXIubGF5ZXJzLmV2ZW50cy5sYXllcixcbiAgICAgICAgICAgICAgICBjcWxfZmlsdGVyOiBzb3VyY2VUeXBlRmlsdGVyICsgaWRlbnRpdHlGaWx0ZXIgKyBjb3JyZWxhdGlvbkZpbHRlciArIGRlbHRhQ29uZmlnLnNlcnZlci5kYXRlRmllbGQgKyAnPj0nICsgc3RhcnQgKyAnIEFORCAnICsgZGVsdGFDb25maWcuc2VydmVyLmRhdGVGaWVsZCArICc8PScgKyBzdG9wLFxuICAgICAgICAgICAgICAgIG91dHB1dEZvcm1hdDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRFdmVudFRyYWNrc1BhcmFtcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2VydmljZTogJ1dGUycsXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0OiAnR2V0RmVhdHVyZScsXG4gICAgICAgICAgICAgICAgdHlwZU5hbWU6IGRlbHRhQ29uZmlnLnNlcnZlci5sYXllcnMudHJhY2tzLndvcmtzcGFjZSArICc6JyArIGRlbHRhQ29uZmlnLnNlcnZlci5sYXllcnMudHJhY2tzLmxheWVyLFxuICAgICAgICAgICAgICAgIGNxbF9maWx0ZXI6IGRlbHRhQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGQgKyAnPVxcJycgKyBwYXJhbXNbZGVsdGFDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gKyAnXFwnIEFORCAnICsgZGVsdGFDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZCArICc9JyArIHBhcmFtc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSxcbiAgICAgICAgICAgICAgICBvdXRwdXRGb3JtYXQ6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0Q29ycmVsYXRpbmdFdmVudHNQYXJhbXMgPSBmdW5jdGlvbiAoZXZlbnRGZWF0dXJlKSB7XG4gICAgICAgICAgICBpZiAoZXZlbnRGZWF0dXJlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc2VydmljZTogJ1dGUycsXG4gICAgICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3Q6ICdHZXRGZWF0dXJlJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZU5hbWU6IGRlbHRhQ29uZmlnLnNlcnZlci5sYXllcnMudHJhY2tzLndvcmtzcGFjZSArICc6JyArIGRlbHRhQ29uZmlnLnNlcnZlci5sYXllcnMuY29ycmVsYXRpbmdfZXZlbnRzLmxheWVyLFxuICAgICAgICAgICAgICAgICAgICBjcWxfZmlsdGVyOiBkZWx0YUNvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkICsgJ18xPVxcJycgKyBldmVudEZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSArICdcXCcgQU5EICcgKyBkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkICsgJ18xPScgKyBldmVudEZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSxcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0Rm9ybWF0OiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRQbG90RGF0YVBhcmFtcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdXJsOiBwYXJhbXMudXJsLFxuICAgICAgICAgICAgICAgIHhfY29sdW1uOiBwYXJhbXMueF9jb2x1bW4gfHwgJ3RpbWUnLFxuICAgICAgICAgICAgICAgIHhfc2NhbGU6IHBhcmFtcy54X3NjYWxlIHx8ICdsaW5lYXInLFxuICAgICAgICAgICAgICAgIHhfdW5pdHM6IHBhcmFtcy54X3VuaXRzIHx8ICdldmVudF9zZWNzJyxcbiAgICAgICAgICAgICAgICB5X2NvbHVtbjogcGFyYW1zLnlfY29sdW1uIHx8ICdpbnRlbnNpdHknLFxuICAgICAgICAgICAgICAgIHlfc2NhbGU6IHBhcmFtcy55X3NjYWxlIHx8ICdsb2cnLFxuICAgICAgICAgICAgICAgIHlfdW5pdHM6IHBhcmFtcy55X3VuaXRzIHx8IGRlbHRhQ29uZmlnLmludGVuc2l0eVVuaXRzLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogcGFyYW1zLmZvcm1hdCB8fCAnanNvbidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldEZyYW1lRGF0YVBhcmFtcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdXJsOiBwYXJhbXMudXJsLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogcGFyYW1zLmZvcm1hdCB8fCAnanNvbidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldENvdW50cmllc1BhcmFtcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2VydmljZTogJ1dGUycsXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0OiAnR2V0RmVhdHVyZScsXG4gICAgICAgICAgICAgICAgdHlwZU5hbWU6IGRlbHRhQ29uZmlnLnNlcnZlci5sYXllcnMuY291bnRyaWVzLndvcmtzcGFjZSArICc6JyArIGRlbHRhQ29uZmlnLnNlcnZlci5sYXllcnMuY291bnRyaWVzLmxheWVyLFxuICAgICAgICAgICAgICAgIG91dHB1dEZvcm1hdDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXRFdmVudHM6IGZ1bmN0aW9uIChzb3VyY2VzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGRlbHRhQ29uZmlnLnNlcnZlci51cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0RXZlbnRzUGFyYW1zKHNvdXJjZXMpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBpZihlcnIuc3RhdHVzID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgcmV0cmlldmluZyBldmVudHMuIChDT1JTKScpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIHJldHJpZXZpbmcgZXZlbnRzLiBTdGF0dXM6ICcgKyBlcnIuc3RhdHVzKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEV2ZW50VHJhY2tzOiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGRlbHRhQ29uZmlnLnNlcnZlci51cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0RXZlbnRUcmFja3NQYXJhbXMocGFyYW1zKVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q29ycmVsYXRpbmdFdmVudHM6IGZ1bmN0aW9uIChldmVudERhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZGVsdGFDb25maWcuc2VydmVyLnVybCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBnZXRDb3JyZWxhdGluZ0V2ZW50c1BhcmFtcyhldmVudERhdGEpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRQbG90RGF0YTogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgY2FjaGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZGVsdGFDb25maWcuZXZlbnRTZXJ2ZXIuYWpheFVybCArICcvcGxvdC1kYXRhLycsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0UGxvdERhdGFQYXJhbXMocGFyYW1zKVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0RnJhbWVEYXRhOiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICBjYWNoZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBkZWx0YUNvbmZpZy5ldmVudFNlcnZlci5hamF4VXJsICsgJy9mcmFtZXMvJyxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBnZXRGcmFtZURhdGFQYXJhbXMocGFyYW1zKVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q291bnRyaWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGRlbHRhQ29uZmlnLnNlcnZlci51cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0Q291bnRyaWVzUGFyYW1zKClcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuIFVOQ0xBU1NJRklFRFxyXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXHJcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXHJcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLnNlcnZpY2UoJ3N0YXRlU2VydmljZScsIGZ1bmN0aW9uIChcclxuICAgICAgICAkbG9jYXRpb24sXHJcbiAgICAgICAgJHRpbWVvdXQsXHJcbiAgICAgICAgZGVsdGFDb25maWcsXHJcbiAgICAgICAgbW9tZW50LFxyXG4gICAgICAgIF9cclxuICAgICkge1xyXG4gICAgICAgIHZhciBxdWVyeVN0cmluZyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcclxuXHJcbiAgICAgICAgdmFyIGdvdG9FeHBhbmRlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICBsb2NhdGlvbkZpbHRlckV4cGFuZGVkID0gZmFsc2UsXHJcbiAgICAgICAgICAgIHJlY2VudEV2ZW50TGlzdEV4cGFuZGVkID0gZmFsc2UsXHJcbiAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgc291cmNlRmlsdGVyRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgdHlwZUZpbHRlckV4cGFuZGVkID0gZmFsc2UsXHJcbiAgICAgICAgICAgIGNvbmZpZGVuY2VGaWx0ZXJFeHBhbmRlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICBjb3VudHJ5RmlsdGVyRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgbG9jYXRpb25Gb3JtYXQgPSBxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCxcclxuICAgICAgICAgICAgbWFwQm91bmRzID0ge30sXHJcbiAgICAgICAgICAgIG1hcEJCb3ggPSB7fSxcclxuICAgICAgICAgICAgbWFwWm9vbSA9IG51bGwsXHJcbiAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyID0ge1xyXG4gICAgICAgICAgICAgICAgc3RhcnQ6IHF1ZXJ5U3RyaW5nLnN0YXJ0LFxyXG4gICAgICAgICAgICAgICAgc3RvcDogcXVlcnlTdHJpbmcuc3RvcCxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBxdWVyeVN0cmluZy5kdXJhdGlvbixcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uTGVuZ3RoOiBxdWVyeVN0cmluZy5kdXJhdGlvbkxlbmd0aFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBiYXNlbGF5ZXIgPSBudWxsLFxyXG4gICAgICAgICAgICB2aWV3cG9ydFNpemUgPSB7fSxcclxuICAgICAgICAgICAgYWN0aXZlU291cmNlcyA9IFtdLFxyXG4gICAgICAgICAgICBhY3RpdmVUeXBlcyA9IFtdLFxyXG4gICAgICAgICAgICBldmVudHMgPSBbXSxcclxuICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBudWxsLFxyXG4gICAgICAgICAgICBldmVudExheWVycyA9IG51bGwsXHJcbiAgICAgICAgICAgIHNvdXJjZVR5cGUgPSBxdWVyeVN0cmluZy5zb3VyY2VUeXBlLFxyXG4gICAgICAgICAgICBldmVudERhdGEgPSBudWxsLFxyXG4gICAgICAgICAgICBsYXlvdXRDb25maWcgPSBudWxsLFxyXG4gICAgICAgICAgICBsYXlvdXRDb21wb25lbnRzID0gW10sXHJcbiAgICAgICAgICAgIGxvYWRpbmdFdmVudHMgPSBmYWxzZSxcclxuICAgICAgICAgICAgdm90ZXIgPSBudWxsLFxyXG4gICAgICAgICAgICB2b3RlcyA9IFtdLFxyXG4gICAgICAgICAgICB2b3RlUmVhc29ucyA9IFtdLFxyXG4gICAgICAgICAgICBjb25maWRlbmNlID0gbnVsbCxcclxuICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9IHF1ZXJ5U3RyaW5nLm9ubHlDb3JyZWxhdGlvbnMsXHJcbiAgICAgICAgICAgIGNvdW50cmllcyA9IFtdO1xyXG5cclxuICAgICAgICBpZiAocXVlcnlTdHJpbmcubiB8fCBxdWVyeVN0cmluZy5uZSkge1xyXG4gICAgICAgICAgICBtYXBCQm94ID0ge1xyXG4gICAgICAgICAgICAgICAgZm9ybWF0OiBsb2NhdGlvbkZvcm1hdCxcclxuICAgICAgICAgICAgICAgIG5vcnRoOiBsb2NhdGlvbkZvcm1hdCA9PT0gJ2RkJyA/IHBhcnNlRmxvYXQocXVlcnlTdHJpbmcubikgOiBxdWVyeVN0cmluZy5uLFxyXG4gICAgICAgICAgICAgICAgc291dGg6IGxvY2F0aW9uRm9ybWF0ID09PSAnZGQnID8gcGFyc2VGbG9hdChxdWVyeVN0cmluZy5zKSA6IHF1ZXJ5U3RyaW5nLnMsXHJcbiAgICAgICAgICAgICAgICBlYXN0OiBsb2NhdGlvbkZvcm1hdCA9PT0gJ2RkJyA/IHBhcnNlRmxvYXQocXVlcnlTdHJpbmcuZSkgOiBxdWVyeVN0cmluZy5lLFxyXG4gICAgICAgICAgICAgICAgd2VzdDogbG9jYXRpb25Gb3JtYXQgPT09ICdkZCcgPyBwYXJzZUZsb2F0KHF1ZXJ5U3RyaW5nLncpIDogcXVlcnlTdHJpbmcudyxcclxuICAgICAgICAgICAgICAgIG1ncnNORTogcXVlcnlTdHJpbmcubmUgfHwgJycsXHJcbiAgICAgICAgICAgICAgICBtZ3JzU1c6IHF1ZXJ5U3RyaW5nLnN3IHx8ICcnXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzZXRNYXBCQm94UGFyYW1zOiBmdW5jdGlvbiAobG9jYXRpb24pIHtcclxuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWxvY2F0aW9uLmZvcm1hdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5mb3JtYXQgPSBkZWx0YUNvbmZpZy5kZWZhdWx0TG9jYXRpb25Gb3JtYXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0TG9jYXRpb25Gb3JtYXQobG9jYXRpb24uZm9ybWF0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgYW55dGhpbmcgY2hhbmdlLCB1cGRhdGUgJGxvY2F0aW9uLnNlYXJjaCgpIGFuZCBicm9hZGNhc3Qgbm90aWZpY2F0aW9uIG9mIGNoYW5nZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeVN0cmluZy5uICE9PSBsb2NhdGlvbi5ub3J0aC50b1N0cmluZygpIHx8IHF1ZXJ5U3RyaW5nLnMgIT09IGxvY2F0aW9uLnNvdXRoLnRvU3RyaW5nKCkgfHwgcXVlcnlTdHJpbmcuZSAhPT0gbG9jYXRpb24uZWFzdC50b1N0cmluZygpIHx8IHF1ZXJ5U3RyaW5nLncgIT09IGxvY2F0aW9uLndlc3QudG9TdHJpbmcoKSB8fCBxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCAhPT0gbG9jYXRpb24uZm9ybWF0IHx8IHF1ZXJ5U3RyaW5nLm5lICE9PSBsb2NhdGlvbi5tZ3JzTkUudG9TdHJpbmcoKSB8fCBxdWVyeVN0cmluZy5zdyAhPT0gbG9jYXRpb24ubWdyc1NXLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uLm5vcnRoICE9PSAnJyAmJiBsb2NhdGlvbi5zb3V0aCAhPT0gJycgJiYgbG9jYXRpb24uZWFzdCAhPT0gJycgJiYgbG9jYXRpb24ud2VzdCAhPT0gJycgJiYgbG9jYXRpb24uZm9ybWF0ID09PSAnZGQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5ub3J0aCA9IHBhcnNlRmxvYXQobG9jYXRpb24ubm9ydGgpLnRvRml4ZWQoMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5zb3V0aCA9IHBhcnNlRmxvYXQobG9jYXRpb24uc291dGgpLnRvRml4ZWQoMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5lYXN0ID0gcGFyc2VGbG9hdChsb2NhdGlvbi5lYXN0KS50b0ZpeGVkKDIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ud2VzdCA9IHBhcnNlRmxvYXQobG9jYXRpb24ud2VzdCkudG9GaXhlZCgyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnNldE1hcEJCb3gobG9jYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5uID0gbG9jYXRpb24ubm9ydGggPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLm5vcnRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zID0gbG9jYXRpb24uc291dGggPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLnNvdXRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5lID0gbG9jYXRpb24uZWFzdCA9PT0gJycgPyBudWxsIDogbG9jYXRpb24uZWFzdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcudyA9IGxvY2F0aW9uLndlc3QgPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLndlc3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmxvY2F0aW9uRm9ybWF0ID0gbG9jYXRpb24uZm9ybWF0ID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5mb3JtYXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLm5lID0gbG9jYXRpb24ubWdyc05FID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5tZ3JzTkU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnN3ID0gbG9jYXRpb24ubWdyc1NXID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5tZ3JzU1c7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0TG9jYXRpb25Gb3JtYXQocXVlcnlTdHJpbmcubG9jYXRpb25Gb3JtYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0R290b0V4cGFuZGVkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ290b0V4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRHb3RvRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBnb3RvRXhwYW5kZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMb2NhdGlvbkZpbHRlckV4cGFuZGVkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb25GaWx0ZXJFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TG9jYXRpb25GaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uRmlsdGVyRXhwYW5kZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRSZWNlbnRFdmVudExpc3RFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY2VudEV2ZW50TGlzdEV4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRSZWNlbnRFdmVudExpc3RFeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHJlY2VudEV2ZW50TGlzdEV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0VGVtcG9yYWxGaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRlbXBvcmFsRmlsdGVyRXhwYW5kZWQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB0ZW1wb3JhbEZpbHRlckV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0U291cmNlRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2VGaWx0ZXJFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0U291cmNlRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBzb3VyY2VGaWx0ZXJFeHBhbmRlZCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFR5cGVGaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVGaWx0ZXJFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0VHlwZUZpbHRlckV4cGFuZGVkOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdHlwZUZpbHRlckV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Q29uZmlkZW5jZUZpbHRlckV4cGFuZGVkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY29uZmlkZW5jZUZpbHRlckV4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRDb25maWRlbmNlRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlRmlsdGVyRXhwYW5kZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRDb3VudHJ5RmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb3VudHJ5RmlsdGVyRXhwYW5kZWQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldENvdW50cnlGaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGNvdW50cnlGaWx0ZXJFeHBhbmRlZCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldE1hcEJCb3g6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtYXBCQm94O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRNYXBCQm94OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICAgICAgICBtYXBCQm94ID0gdmFsO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRNYXBab29tOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFwWm9vbTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TWFwWm9vbTogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIG1hcFpvb20gPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuem9vbSA9IG1hcFpvb207XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0TG9jYXRpb25Gb3JtYXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbkZvcm1hdDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TG9jYXRpb25Gb3JtYXQ6IGZ1bmN0aW9uIChmb3JtYXQpIHtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uRm9ybWF0ID0gZm9ybWF0O1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcubG9jYXRpb25Gb3JtYXQgPSBsb2NhdGlvbkZvcm1hdDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRNYXBCb3VuZHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtYXBCb3VuZHM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldE1hcEJvdW5kczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIG1hcEJvdW5kcyA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1hcEJCb3hQYXJhbXMoe1xyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDogdGhpcy5sb2NhdGlvbkZvcm1hdCxcclxuICAgICAgICAgICAgICAgICAgICBub3J0aDogbWFwQm91bmRzLmdldE5vcnRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgc291dGg6IG1hcEJvdW5kcy5nZXRTb3V0aCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGVhc3Q6IG1hcEJvdW5kcy5nZXRFYXN0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgd2VzdDogbWFwQm91bmRzLmdldFdlc3QoKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFRlbXBvcmFsRmlsdGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGVtcG9yYWxGaWx0ZXI7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyOiBmdW5jdGlvbiAoZmlsdGVyKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcXNGaWx0ZXIgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHF1ZXJ5U3RyaW5nLnN0YXJ0LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0b3A6IHF1ZXJ5U3RyaW5nLnN0b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IHF1ZXJ5U3RyaW5nLmR1cmF0aW9uID8gcXVlcnlTdHJpbmcuZHVyYXRpb24gOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uTGVuZ3RoOiBxdWVyeVN0cmluZy5kdXJhdGlvbkxlbmd0aCA/IHBhcnNlSW50KHF1ZXJ5U3RyaW5nLmR1cmF0aW9uTGVuZ3RoKSA6IG51bGxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB2YXIgZmlsdGVyU3RhcnQgPSAnJyxcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdG9wID0gJyc7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXIuZXF1YWxzKHFzRmlsdGVyLCBmaWx0ZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbHRlci5kdXJhdGlvbiAmJiBmaWx0ZXIuZHVyYXRpb25MZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RhcnQgPSBtb21lbnQudXRjKCkuc3VidHJhY3QoZmlsdGVyLmR1cmF0aW9uTGVuZ3RoLCBmaWx0ZXIuZHVyYXRpb24pLnN0YXJ0T2YoJ2QnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RvcCA9IG1vbWVudC51dGMoKS5lbmRPZignZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zdGFydCA9IGZpbHRlclN0YXJ0LnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnN0b3AgPSBmaWx0ZXJTdG9wLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmR1cmF0aW9uID0gZmlsdGVyLmR1cmF0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5kdXJhdGlvbkxlbmd0aCA9IGZpbHRlci5kdXJhdGlvbkxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdGFydCA9IG1vbWVudC51dGMoZmlsdGVyLnN0YXJ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RvcCA9IG1vbWVudC51dGMoZmlsdGVyLnN0b3ApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zdGFydCA9IGZpbHRlclN0YXJ0LnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnN0b3AgPSBmaWx0ZXJTdG9wLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmR1cmF0aW9uID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZHVyYXRpb25MZW5ndGggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIuc3RhcnQgPSBmaWx0ZXJTdGFydC50b0RhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIuc3RvcCA9IGZpbHRlclN0b3AudG9EYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXIgPSBmaWx0ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGVtcG9yYWxGaWx0ZXIuc3RhcnQgfHwgIXRlbXBvcmFsRmlsdGVyLnN0b3ApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXIgPSBmaWx0ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRCYXNlbGF5ZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBiYXNlbGF5ZXI7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEJhc2VsYXllcjogZnVuY3Rpb24gKGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICBiYXNlbGF5ZXIgPSBsYXllcjtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmJhc2VsYXllciA9IGJhc2VsYXllci5pZDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWaWV3cG9ydFNpemU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2aWV3cG9ydFNpemU7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFZpZXdwb3J0U2l6ZTogZnVuY3Rpb24gKHNpemUpIHtcclxuICAgICAgICAgICAgICAgIHZpZXdwb3J0U2l6ZSA9IHNpemU7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEFjdGl2ZVNvdXJjZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhY3RpdmVTb3VyY2VzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRBY3RpdmVTb3VyY2VzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlU291cmNlcyA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICB2YXIgc291cmNlU3RyaW5nID0gXy5tYXAoYWN0aXZlU291cmNlcywgJ25hbWUnKS5qb2luKCcsJyk7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zb3VyY2VzID0gc291cmNlU3RyaW5nICE9PSAnJyA/IHNvdXJjZVN0cmluZyA6IG51bGw7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0QWN0aXZlVHlwZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhY3RpdmVUeXBlcztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0QWN0aXZlVHlwZXM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmVUeXBlcyA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZVN0cmluZyA9IF8ubWFwKGFjdGl2ZVR5cGVzLCAnbmFtZScpLmpvaW4oJywnKTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnR5cGVzID0gdHlwZVN0cmluZyAhPT0gJycgPyB0eXBlU3RyaW5nIDogbnVsbDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRFdmVudHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudHM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEV2ZW50czogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50cyA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEFjdGl2ZUV2ZW50OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWN0aXZlRXZlbnQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEFjdGl2ZUV2ZW50OiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmdbZGVsdGFDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gPSBkYXRhID8gZGF0YS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdIDogbnVsbDtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nW2RlbHRhQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID0gZGF0YSA/IGRhdGEucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA6IG51bGw7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0RXZlbnRMYXllcnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudExheWVycztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0RXZlbnRMYXllcnM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudExheWVycyA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFNvdXJjZVR5cGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2VUeXBlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRTb3VyY2VUeXBlOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgc291cmNlVHlwZSA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zb3VyY2VUeXBlID0gc291cmNlVHlwZTtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRFdmVudERhdGE6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudERhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEV2ZW50RGF0YTogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50RGF0YSA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldExheW91dENvbmZpZzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGF5b3V0Q29uZmlnO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRMYXlvdXRDb25maWc6IGZ1bmN0aW9uKGNvbmZpZykge1xyXG4gICAgICAgICAgICAgICAgbGF5b3V0Q29uZmlnID0gY29uZmlnO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMYXlvdXRDb21wb25lbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGF5b3V0Q29tcG9uZW50cztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TGF5b3V0Q29tcG9uZW50czogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGxheW91dENvbXBvbmVudHMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMb2FkaW5nRXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9hZGluZ0V2ZW50cztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TG9hZGluZ0V2ZW50czogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGxvYWRpbmdFdmVudHMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3RlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZvdGVyO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRWb3RlcjogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHZvdGVyID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2b3RlcztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Vm90ZXM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB2b3RlcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVSZWFzb25zOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdm90ZVJlYXNvbnM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFZvdGVSZWFzb25zOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdm90ZVJlYXNvbnMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRDb25maWRlbmNlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY29uZmlkZW5jZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Q29uZmlkZW5jZTogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZGVuY2UgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuY29uZmlkZW5jZSA9IGNvbmZpZGVuY2U7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0T25seUNvcnJlbGF0aW9uczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9ubHlDb3JyZWxhdGlvbnM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldE9ubHlDb3JyZWxhdGlvbnM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLm9ubHlDb3JyZWxhdGlvbnMgPSBvbmx5Q29ycmVsYXRpb25zO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldENvdW50cmllczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50cmllcztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Q291bnRyaWVzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgY291bnRyaWVzID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmNvdW50cmllcyA9IGNvdW50cmllcztcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5zZXJ2aWNlKCd2b3RlU2VydmljZScsIGZ1bmN0aW9uIChcclxuICAgICAgICAkaHR0cCxcclxuICAgICAgICAkcSxcclxuICAgICAgICBkZWx0YUNvbmZpZ1xyXG4gICAgKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZ2V0UmVhc29uczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogZGVsdGFDb25maWcudm90ZUFwaS51cmwgKyAnL3JlYXNvbnMnXHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVyczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogZGVsdGFDb25maWcudm90ZUFwaS51cmwgKyAnL3ZvdGVycydcclxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZXI6IGZ1bmN0aW9uICh2b3Rlcl9uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBkZWx0YUNvbmZpZy52b3RlQXBpLnVybCArICcvdm90ZXJzLycgKyB2b3Rlcl9uYW1lXHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGFkZFZvdGVyOiBmdW5jdGlvbiAodm90ZXIpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KGRlbHRhQ29uZmlnLnZvdGVBcGkudXJsICsgJy92b3RlcnMnLCB2b3RlcikudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3RlczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogZGVsdGFDb25maWcudm90ZUFwaS51cmwgKyAnL3ZvdGVzJ1xyXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3Rlc0J5Vm90ZXI6IGZ1bmN0aW9uICh2b3Rlcl9uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBkZWx0YUNvbmZpZy52b3RlQXBpLnVybCArICcvdm90ZXMvdm90ZXIvJyArIHZvdGVyX25hbWVcclxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZUJ5SWQ6IGZ1bmN0aW9uICh2b3RlX2lkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBkZWx0YUNvbmZpZy52b3RlQXBpLnVybCArICcvdm90ZXMvJyArIHZvdGVfaWRcclxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY2FzdFZvdGU6IGZ1bmN0aW9uICh2b3RlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChkZWx0YUNvbmZpZy52b3RlQXBpLnVybCArICcvdm90ZXMnLCB2b3RlKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHVwZGF0ZVZvdGU6IGZ1bmN0aW9uICh2b3RlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAucHV0KGRlbHRhQ29uZmlnLnZvdGVBcGkudXJsICsgJy92b3Rlcy8nICsgdm90ZS52b3RlX2lkLCB2b3RlKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLmNvbnRyb2xsZXIoJ2NvbmZpZGVuY2VGaWx0ZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgJHRpbWVvdXQsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgZGVsdGFDb25maWcsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLmRlbHRhQ29uZmlnID0gZGVsdGFDb25maWc7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5jb25maWRlbmNlID0gXy5jbG9uZShkZWx0YUNvbmZpZy5kZWZhdWx0Q29uZmlkZW5jZSk7XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRDb25maWRlbmNlRmlsdGVyRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHFzLmNvbmZpZGVuY2UpIHtcbiAgICAgICAgICAgICAgICB2bS5jb25maWRlbmNlID0gcGFyc2VGbG9hdChxcy5jb25maWRlbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRDb25maWRlbmNlKHZtLmNvbmZpZGVuY2UpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5jb25maWRlbmNlJywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q29uZmlkZW5jZShwYXJzZUZsb2F0KG5ld1ZhbHVlKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgNTApKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5kaXJlY3RpdmUoJ2RlbHRhQ29uZmlkZW5jZUZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9jb25maWRlbmNlRmlsdGVyL2NvbmZpZGVuY2VGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdjb25maWRlbmNlRmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5jb250cm9sbGVyKCdjb3VudHJ5RmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgICR0aW1lb3V0LFxuICAgICAgICAkbWRUb2FzdCxcbiAgICAgICAgc2VhcmNoU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBkZWx0YUNvbmZpZyxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0uZGVsdGFDb25maWcgPSBkZWx0YUNvbmZpZztcbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLmNvdW50cmllcyA9IFtdO1xuICAgICAgICB2bS5zZWxlY3RlZENvdW50cmllcyA9IFtdO1xuICAgICAgICB2bS5sb2FkaW5nQ291bnRyaWVzID0gdHJ1ZTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldENvdW50cnlGaWx0ZXJFeHBhbmRlZCh2bS5leHBhbmRlZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uZmlsdGVyQnlDb3VudHJpZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q291bnRyaWVzKF8ubWFwKHZtLnNlbGVjdGVkQ291bnRyaWVzLCAnZ2VuY18yJykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRDb3VudHJpZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldENvdW50cmllcygpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2bS5jb3VudHJpZXMgPSBfLnNvcnRCeShfLm1hcChkYXRhLmZlYXR1cmVzLCAncHJvcGVydGllcycpLCBmdW5jdGlvbiAocHJvcCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvcC5jb3VudHJ5O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChxcy5jb3VudHJpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHFzLmNvdW50cmllcy5jb25zdHJ1Y3RvciA9PT0gQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChxcy5jb3VudHJpZXMsIGZ1bmN0aW9uIChjb3VudHJ5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uc2VsZWN0ZWRDb3VudHJpZXMucHVzaChfLmZpbmQodm0uY291bnRyaWVzLCB7IGdlbmNfMjogY291bnRyeSB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkQ291bnRyaWVzLnB1c2goXy5maW5kKHZtLmNvdW50cmllcywgeyBnZW5jXzI6IHFzLmNvdW50cmllcyB9KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkQ291bnRyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmZpbHRlckJ5Q291bnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NvdW50cmllcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIFJldHJpZXZpbmcgQ291bnRyaWVzJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdDb3VudHJpZXMgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZ2V0Q291bnRyaWVzKCk7XG4gICAgICAgICAgICBpZiAocXMuY291bnRyaWVzKSB7XG4gICAgICAgICAgICAgICAgdm0uY291bnRyaWVzID0gcXMuY291bnRyaWVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldENvdW50cmllcyh2bS5jb3VudHJpZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5kaXJlY3RpdmUoJ2RlbHRhQ291bnRyeUZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9jb3VudHJ5RmlsdGVyL2NvdW50cnlGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdjb3VudHJ5RmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5jb250cm9sbGVyKCdldmVudFZpZXdlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJHEsXG4gICAgICAgICR0aW1lb3V0LFxuICAgICAgICAkbWREaWFsb2csXG4gICAgICAgICRtZFRvYXN0LFxuICAgICAgICBkZWx0YUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBzZWFyY2hTZXJ2aWNlLFxuICAgICAgICB2b3RlU2VydmljZSxcbiAgICAgICAgVm90ZSxcbiAgICAgICAgV2Vid29ya2VyLFxuICAgICAgICBtb21lbnQsXG4gICAgICAgIGhvdGtleXMsXG4gICAgICAgIGMzLFxuICAgICAgICBkMyxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQgPSBudWxsLFxuICAgICAgICAgICAgY2hhcnRXb3JrZXIsXG4gICAgICAgICAgICBwbG90RGF0YSxcbiAgICAgICAgICAgIGNoYXJ0RGF0YSxcbiAgICAgICAgICAgIGZyYW1lRGF0YSxcbiAgICAgICAgICAgIGFuaW1hdGUsXG4gICAgICAgICAgICBwbGF5YmFja0ZyYW1lcyxcbiAgICAgICAgICAgIGNoYXJ0LFxuICAgICAgICAgICAgaGFzQ29ycmVsYXRpb24sXG4gICAgICAgICAgICBmcmFtZUlkeCxcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nRGF0ZURpZmYsXG4gICAgICAgICAgICBjaGFydEZvY3VzLFxuICAgICAgICAgICAgY2hhcnRDb2xvcnMsXG4gICAgICAgICAgICBkZWZhdWx0UGxvdERhdGEsXG4gICAgICAgICAgICBjb3JyZWxhdGluZ1Bsb3REYXRhLFxuICAgICAgICAgICAgY29ycmVsYXRpbmdFdmVudERhdGEsXG4gICAgICAgICAgICBmcmFtZU1pblZhbCxcbiAgICAgICAgICAgIGZyYW1lTWF4VmFsLFxuICAgICAgICAgICAgZnJhbWVSYW5nZSxcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVNaW5WYWwsXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWF4VmFsLFxuICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZVJhbmdlO1xuXG4gICAgICAgIHZtLmV2ZW50Vmlld2VySGVpZ2h0ID0gJyc7XG4gICAgICAgIHZtLmV2ZW50Vmlld2VyV2lkdGggPSAnJztcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYXJ0V29ya2VyID0gbnVsbDtcbiAgICAgICAgICAgIHBsb3REYXRhID0gW107XG4gICAgICAgICAgICBjaGFydERhdGEgPSBudWxsO1xuICAgICAgICAgICAgZnJhbWVEYXRhID0gW107XG4gICAgICAgICAgICBhbmltYXRlID0gbnVsbDtcbiAgICAgICAgICAgIHBsYXliYWNrRnJhbWVzID0gW107XG4gICAgICAgICAgICBjaGFydCA9IG51bGw7XG4gICAgICAgICAgICBoYXNDb3JyZWxhdGlvbiA9IGZhbHNlO1xuICAgICAgICAgICAgZnJhbWVJZHggPSAwO1xuICAgICAgICAgICAgY29ycmVsYXRpbmdEYXRlRGlmZiA9IG51bGw7XG4gICAgICAgICAgICBjaGFydEZvY3VzID0gbnVsbDtcbiAgICAgICAgICAgIGNoYXJ0Q29sb3JzID0ge307XG4gICAgICAgICAgICBkZWZhdWx0UGxvdERhdGEgPSBudWxsO1xuICAgICAgICAgICAgY29ycmVsYXRpbmdQbG90RGF0YSA9IG51bGw7XG4gICAgICAgICAgICBjb3JyZWxhdGluZ0V2ZW50RGF0YSA9IG51bGw7XG4gICAgICAgICAgICBmcmFtZU1pblZhbCA9IG51bGw7XG4gICAgICAgICAgICBmcmFtZU1heFZhbCA9IG51bGw7XG4gICAgICAgICAgICBmcmFtZVJhbmdlID0gbnVsbDtcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVNaW5WYWwgPSBudWxsO1xuICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZU1heFZhbCA9IG51bGw7XG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lUmFuZ2UgPSBudWxsO1xuXG4gICAgICAgICAgICB2bS5fID0gXztcbiAgICAgICAgICAgIHZtLmRlbHRhQ29uZmlnID0gZGVsdGFDb25maWc7XG4gICAgICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgICAgICB2bS5ldmVudERhdGEgPSBudWxsO1xuICAgICAgICAgICAgdm0ubG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICB2bS5sb2FkaW5nU3RhdHVzID0gbnVsbDtcbiAgICAgICAgICAgIHZtLnNlbGVjdGVkRmVhdHVyZSA9IG51bGw7XG4gICAgICAgICAgICB2bS5ldmVudEVycm9yID0gbnVsbDtcbiAgICAgICAgICAgIHZtLnNlbnNvcnMgPSBudWxsO1xuICAgICAgICAgICAgdm0uY2hpcENhcmRzID0gW107XG4gICAgICAgICAgICB2bS5jb3JyZWxhdGluZ0NoaXBDYXJkcyA9IFtdO1xuICAgICAgICAgICAgdm0uYXZhaWxhYmxlQ2hpcENhcmRzID0gW107XG4gICAgICAgICAgICB2bS5hY3RpdmVDaGlwQ2FyZCA9IG51bGw7XG4gICAgICAgICAgICB2bS5hY3RpdmVDb3JyZWxhdGluZ0NoaXBDYXJkID0gbnVsbDtcbiAgICAgICAgICAgIHZtLnBsYXliYWNrRGVsYXkgPSAwO1xuICAgICAgICAgICAgdm0udm90ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0Vm90ZXIoKTtcbiAgICAgICAgICAgIHZtLnZvdGVzID0gc3RhdGVTZXJ2aWNlLmdldFZvdGVzKCk7XG4gICAgICAgICAgICB2bS52b3RlUmVhc29ucyA9IHN0YXRlU2VydmljZS5nZXRWb3RlUmVhc29ucygpO1xuICAgICAgICAgICAgdm0udm90ZU9iaiA9IG5ldyBWb3RlKCk7XG4gICAgICAgICAgICB2bS5oNVVybCA9IG51bGw7XG4gICAgICAgICAgICB2bS5jb3JyZWxhdGVkSDVVcmwgPSBudWxsO1xuICAgICAgICAgICAgdm0ucGxheWJhY2tTdGF0ZSA9IHRydWU7XG4gICAgICAgICAgICB2bS5wbGF5YmFja0RpcmVjdGlvbiA9ICdmb3J3YXJkJztcbiAgICAgICAgICAgIHZtLmV2ZW50UHJvcHMgPSBbXTtcbiAgICAgICAgICAgIHZtLmNvcnJlbGF0ZWRFdmVudFByb3BzID0gW107XG4gICAgICAgICAgICB2bS5pbnRlcm5hbFNvdXJjZSA9IF8uZmluZChkZWx0YUNvbmZpZy5zb3VyY2VzLCB7IGlkZW50aXR5OiB0cnVlIH0pO1xuICAgICAgICAgICAgdm0uZXh0ZXJuYWxTb3VyY2UgPSBfLmZpbmQoZGVsdGFDb25maWcuc291cmNlcywgeyBpZGVudGl0eTogZmFsc2UgfSk7XG4gICAgICAgICAgICBob3RrZXlzLmJpbmRUbygkc2NvcGUpXG4gICAgICAgICAgICAgICAgLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAnbGVmdCcsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmV3aW5kJyxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNldFBsYXliYWNrRGlyZWN0aW9uKCdiYWNrd2FyZCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuYWRkKHtcbiAgICAgICAgICAgICAgICAgICAgY29tYm86ICdyaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9yd2FyZCcsXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5zZXRQbGF5YmFja0RpcmVjdGlvbignZm9yd2FyZCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuYWRkKHtcbiAgICAgICAgICAgICAgICAgICAgY29tYm86ICd1cCcsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGxheS9QYXVzZScsXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5zZXRQbGF5YmFja1N0YXRlKCF2bS5wbGF5YmFja1N0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgKGNoYXJ0KSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIGluaXRpYWxpemUgaGFzIG5ldmVyIGJlZW4gY2FsbGVkXG4gICAgICAgICAgICBpbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZHJhd0ZyYW1lID0gZnVuY3Rpb24gKGZyYW1lQXJyKSB7XG4gICAgICAgICAgICBpZiAocGxheWJhY2tGcmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChmcmFtZUFyciwgZnVuY3Rpb24gKGZyYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBhbmd1bGFyLmVsZW1lbnQoJy4nICsgXy5yZXBsYWNlKGZyYW1lLnNlbnNvclRpdGxlLCAnICcsICcnKSlbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjbGVhciBwcmV2aW91cyBkcmF3aW5nXG4gICAgICAgICAgICAgICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgd2lkdGggYW5kIGhlaWdodCB0byBtYXRjaCBpbWFnZVxuICAgICAgICAgICAgICAgICAgICBjdHguY2FudmFzLmhlaWdodCA9IGZyYW1lLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgY3R4LmNhbnZhcy53aWR0aCA9IGZyYW1lLndpZHRoO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCBhIHBvaW50ZXIgdG8gdGhlIGN1cnJlbnQgbG9jYXRpb24gaW4gdGhlIGZyYW1lLlxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFsZXR0ZSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTsgLy94LHksdyxoXG4gICAgICAgICAgICAgICAgICAgIC8vIFdyYXAgeW91ciBhcnJheSBhcyBhIFVpbnQ4QXJyYXlcbiAgICAgICAgICAgICAgICAgICAgcGFsZXR0ZS5kYXRhLnNldChmcmFtZS5yZ2JhKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVwb3N0IHRoZSBkYXRhLlxuICAgICAgICAgICAgICAgICAgICBjdHgucHV0SW1hZ2VEYXRhKHBhbGV0dGUsIDAsIDApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRGcmFtZSA9IGZ1bmN0aW9uIChmcmFtZUFycikge1xuICAgICAgICAgICAgaWYgKHBsYXliYWNrRnJhbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0dXJuRnJhbWVzID0gW107XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGZyYW1lQXJyLCBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmcmFtZS5yZ2JhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBmcmFtZSBoYXMgbm90IHlldCBoYWQgYSBVaW50OEFycmF5IGNhbGN1bGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmdiYSA9IF8uZmxhdE1hcChmcmFtZS52YWx1ZXMsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gZnJhbWUuaXNDb3JyZWxhdGlvbiA/IHZhbHVlIC0gY29ycmVsYXRpbmdGcmFtZU1pblZhbCA6IHZhbHVlIC0gZnJhbWVNaW5WYWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PSAwID8gdmFsdWUgOiAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gZnJhbWUuaXNDb3JyZWxhdGlvbiA/IE1hdGgucm91bmQoKHZhbHVlIC8gY29ycmVsYXRpbmdGcmFtZVJhbmdlKSAqIDI1NC4wKSA6IE1hdGgucm91bmQoKHZhbHVlIC8gZnJhbWVSYW5nZSkgKiAyNTQuMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt2YWx1ZSwgdmFsdWUsIHZhbHVlLCAyNTVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZS5yZ2JhID0gbmV3IFVpbnQ4QXJyYXkocmdiYSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuRnJhbWVzLnB1c2goZnJhbWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXR1cm5GcmFtZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHVwZGF0ZUZyYW1lc1RvUmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGZyYW1lT2JqID0gXy5ncm91cEJ5KGZyYW1lRGF0YVswXS5yZXN1bHRzLCAnc2Vuc29yJyksXG4gICAgICAgICAgICAgICAgZnJhbWVzVG9SZW5kZXIgPSBmcmFtZU9ialt2bS5hY3RpdmVDaGlwQ2FyZC5zZW5zb3JdLFxuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVPYmogPSB7fSxcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lc1RvUmVuZGVyID0gW107XG5cbiAgICAgICAgICAgIGlmIChoYXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVPYmogPSBfLmdyb3VwQnkoZnJhbWVEYXRhWzFdLnJlc3VsdHMsICdzZW5zb3InKTtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lc1RvUmVuZGVyID0gY29ycmVsYXRpbmdGcmFtZU9ialt2bS5hY3RpdmVDaGlwQ2FyZC5zZW5zb3JdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjYWxjdWxhdGUgbWluLCBtYXgsIGFuZCByYW5nZSBmb3IgYm90aCBzZXRzIG9mIGZyYW1lc1xuICAgICAgICAgICAgZnJhbWVNaW5WYWwgPSBfLm1pbihfLm1hcChmcmFtZXNUb1JlbmRlciwgJ21pbicpKTtcbiAgICAgICAgICAgIGZyYW1lTWF4VmFsID0gXy5tYXgoXy5tYXAoZnJhbWVzVG9SZW5kZXIsICdtYXgnKSk7XG4gICAgICAgICAgICBmcmFtZU1heFZhbCA9IGZyYW1lTWluVmFsID49IDAgPyBmcmFtZU1heFZhbCA6IGZyYW1lTWF4VmFsICsgTWF0aC5hYnMoZnJhbWVNaW5WYWwpO1xuICAgICAgICAgICAgZnJhbWVNaW5WYWwgPSBmcmFtZU1pblZhbCA+PSAwID8gZnJhbWVNaW5WYWwgOiAwO1xuICAgICAgICAgICAgZnJhbWVSYW5nZSA9IGZyYW1lTWF4VmFsIC0gZnJhbWVNaW5WYWw7XG4gICAgICAgICAgICBpZiAoaGFzQ29ycmVsYXRpb24pIHtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWluVmFsID0gXy5taW4oXy5tYXAoY29ycmVsYXRpbmdGcmFtZXNUb1JlbmRlciwgJ21pbicpKTtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWF4VmFsID0gXy5tYXgoXy5tYXAoY29ycmVsYXRpbmdGcmFtZXNUb1JlbmRlciwgJ21heCcpKTtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWF4VmFsID0gY29ycmVsYXRpbmdGcmFtZU1pblZhbCA+PSAwID8gY29ycmVsYXRpbmdGcmFtZU1heFZhbCA6IGNvcnJlbGF0aW5nRnJhbWVNYXhWYWwgKyBNYXRoLmFicyhjb3JyZWxhdGluZ0ZyYW1lTWluVmFsKTtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWluVmFsID0gY29ycmVsYXRpbmdGcmFtZU1pblZhbCA+PSAwID8gY29ycmVsYXRpbmdGcmFtZU1pblZhbCA6IDA7XG4gICAgICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZVJhbmdlID0gY29ycmVsYXRpbmdGcmFtZU1heFZhbCAtIGNvcnJlbGF0aW5nRnJhbWVNaW5WYWw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNvbWJpbmUgZnJhbWVzIHNvIHRoZXJlJ3Mgb25seSBvbmUgcGxheWJhY2sgc291cmNlXG4gICAgICAgICAgICBwbGF5YmFja0ZyYW1lcyA9IF8uc29ydEJ5KF8udW5pb24oZnJhbWVzVG9SZW5kZXIsIGNvcnJlbGF0aW5nRnJhbWVzVG9SZW5kZXIpLCAndGltZXN0YW1wJyk7XG5cbiAgICAgICAgICAgIC8vIGFkanVzdCBpbml0aWFsIHBsYXliYWNrIHNwZWVkIGJhc2VkIG9uIHBsYXliYWNrRnJhbWVzIGxlbmd0aFxuICAgICAgICAgICAgaWYgKHBsYXliYWNrRnJhbWVzLmxlbmd0aCA8IDI1KSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEZWxheSA9IDEwMDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGxheWJhY2tGcmFtZXMubGVuZ3RoID49IDI1ICYmIHBsYXliYWNrRnJhbWVzLmxlbmd0aCA8IDUwKSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEZWxheSA9IDUwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGF5YmFja0ZyYW1lcy5sZW5ndGggPj0gNTAgJiYgcGxheWJhY2tGcmFtZXMubGVuZ3RoIDwgMTAwKSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEZWxheSA9IDIwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGF5YmFja0ZyYW1lcy5sZW5ndGggPj0gMTAwICYmIHBsYXliYWNrRnJhbWVzLmxlbmd0aCA8IDIwMCkge1xuICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrRGVsYXkgPSAxMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEZWxheSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHVwZGF0ZUNoYXJ0Rm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjaGFydEZvY3VzID0gW3ZtLmFjdGl2ZUNoaXBDYXJkLmNoYXJ0SWRdO1xuICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQpIHtcbiAgICAgICAgICAgICAgICBjaGFydEZvY3VzLnB1c2godm0uYWN0aXZlQ29ycmVsYXRpbmdDaGlwQ2FyZC5jaGFydElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGFydCkge1xuICAgICAgICAgICAgICAgIGNoYXJ0LmZvY3VzKGNoYXJ0Rm9jdXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByZW5kZXJGcmFtZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZ3JpZExpbmUgPSBudWxsO1xuXG4gICAgICAgICAgICB1cGRhdGVGcmFtZXNUb1JlbmRlcigpO1xuXG4gICAgICAgICAgICB2YXIgZ3JpZExpbmVzID0gXy5tYXAoY2hhcnREYXRhLCBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZnJhbWUudGltZSxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6ICdmcmFtZS1saW5lIHRpbWUtJyArIF8ucmVwbGFjZShmcmFtZS50aW1lLCAnLicsICcnKSxcbiAgICAgICAgICAgICAgICAgICAgc2Vuc29yOiBmcmFtZS5zZW5zb3JcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjaGFydC54Z3JpZHMoZ3JpZExpbmVzKTtcblxuICAgICAgICAgICAgYW5pbWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGxheWJhY2tGcmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ3JpZExpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyaWRMaW5lLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZ3JpZExpbmUgPSBhbmd1bGFyLmVsZW1lbnQoJy50aW1lLScgKyBfLnJlcGxhY2UocGxheWJhY2tGcmFtZXNbZnJhbWVJZHhdLnRpbWVzdGFtcCwgJy4nLCAnJykpWzBdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ3JpZExpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyaWRMaW5lLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF5YmFja0ZyYW1lc1tmcmFtZUlkeF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBtdWx0aXBsZSBmcmFtZXMgaGF2ZSB0aGUgc2FtZSB0aW1lc3RhbXAgdGhlbiBwbGF5IHRoZW0gYWxsIGF0IHRoZSBzYW1lIHRpbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnJhbWVBcnIgPSBfLmZpbHRlcihwbGF5YmFja0ZyYW1lcywge3RpbWVzdGFtcDogcGxheWJhY2tGcmFtZXNbZnJhbWVJZHhdLnRpbWVzdGFtcH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYXdGcmFtZShnZXRGcmFtZShmcmFtZUFycikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5wbGF5YmFja0RpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4ID0gZnJhbWVJZHggKyBmcmFtZUFyci5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmcmFtZUlkeCA+PSBwbGF5YmFja0ZyYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4ID0gZnJhbWVJZHggLSBmcmFtZUFyci5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmcmFtZUlkeCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4ID0gcGxheWJhY2tGcmFtZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodm0ucGxheWJhY2tTdGF0ZSAmJiBhbmltYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIHZtLnBsYXliYWNrRGVsYXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGFuaW1hdGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBmb3JtYXRDaGFydERhdGEgKHBsb3REYXRhLCBjb3JyZWxhdGluZ0RhdGVEaWZmLCBiYXNlVXJsKSB7XG4gICAgICAgICAgICBpZiAoIWxvY2F0aW9uLm9yaWdpbikgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICBsb2NhdGlvbi5vcmlnaW4gPSBsb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIGxvY2F0aW9uLmhvc3RuYW1lICsgKGxvY2F0aW9uLnBvcnQgPyAnOicgKyBsb2NhdGlvbi5wb3J0OiAnJyk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW1wb3J0U2NyaXB0cyhsb2NhdGlvbi5vcmlnaW4gKyBiYXNlVXJsICsgJy9zY3JpcHRzL3dlYndvcmtlckRlcHMvbG9kYXNoLmpzJyk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuXG4gICAgICAgICAgICB2YXIgcGxvdEFyciA9IFtdO1xuICAgICAgICAgICAgXy5mb3JFYWNoKHBsb3REYXRhLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIHRoZSBjb252ZW50aW9uIGZvciBhIHBvaW50IGlzIGEgNCBpdGVtIGFycmF5IFt0aW1lLCBzZW5zb3IgaW5kZXgsIG9iamVjdCBpbmRleCwgaW50ZW5zaXR5XVxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChkYXRhLnBvaW50cywgZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwb2ludERhdGEgPSB7fSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50VmFsdWUgPSBwb2ludFszXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5pc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBub3JtYWxpemUgdGltZSB2YWx1ZXMgaWYgYSBkaWZmZXJlbmNlIGluIHN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkYXRlcyBpcyBwcmVzZW50LiBjb3JyZWxhdGluZ0RhdGVEaWZmIHdpbGwgYmUgcG9zaXRpdmVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gdGhlIGNvcnJlbGF0aW5nIGV2ZW50IHN0YXJ0ZWQgdmFsdWUgaXMgbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoYW4gdGhlIGV2ZW50IHN0YXJ0ZWQgdmFsdWUsIGFuZCB2aWNlIHZlcnNhXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludERhdGEudGltZSA9IGNvcnJlbGF0aW5nRGF0ZURpZmYgPyBwb2ludFswXSAtIGNvcnJlbGF0aW5nRGF0ZURpZmYgOiBwb2ludFswXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFsd2F5cyB1c2UgdGhlIGdpdmVuIHRpbWUgdmFsdWUgZm9yIHRoZSBzZWxlY3RlZCBldmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnREYXRhLnRpbWUgPSBwb2ludFswXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwb2ludERhdGFbZGF0YS5zZW5zb3JzW3BvaW50WzFdXV0gPSBwb2ludFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBwb2ludERhdGEuc2Vuc29yID0gZGF0YS5zZW5zb3JzW3BvaW50WzFdXTtcbiAgICAgICAgICAgICAgICAgICAgcGxvdEFyci5wdXNoKHBvaW50RGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHBsb3RBcnI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaW5pdENoYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGV4cEZvcm1hdCA9IGQzLmZvcm1hdCgnLjFlJyksXG4gICAgICAgICAgICAgICAgbnVtRm9ybWF0ID0gZDMuZm9ybWF0KCduJyk7XG5cbiAgICAgICAgICAgIC8vIGdlbmVyYXRlIHRpbWUvaW50ZW5zaXR5IGNoYXJ0IHVzaW5nIEMzXG4gICAgICAgICAgICBjaGFydCA9IGMzLmdlbmVyYXRlKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGpzb246IFtdXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaXplOiB7XG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiB2bS5ldmVudFZpZXdlcldpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZtLmV2ZW50Vmlld2VySGVpZ2h0IC8gMlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFkZGluZzoge1xuICAgICAgICAgICAgICAgICAgICB0b3A6IDEwLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRvb2x0aXA6IHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geC50b0ZpeGVkKDIpICsgJyBzZWNvbmRzJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucG93KDEwLCB2YWx1ZSkudG9GaXhlZCg2KSArICcgJyArIGRlZmF1bHRQbG90RGF0YS55X2NvbHVtbi51bml0cy5sYWJlbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbGluZToge1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0TnVsbDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXhpczoge1xuICAgICAgICAgICAgICAgICAgICB4OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aWNrOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZml0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ1NlY29uZHMgc2luY2UgJyArIG1vbWVudC51dGMoZGVmYXVsdFBsb3REYXRhLnN0YXJ0ZWQpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzc1taXScpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnb3V0ZXItbGVmdCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBkZWZhdWx0UGxvdERhdGEueV9jb2x1bW4udW5pdHMubGFiZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdvdXRlci1taWRkbGUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGljazoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZm9ybWF0IGN1c3RvbSB0aWNrcyBmb3IgbG9nIHNjYWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ID0gTWF0aC5hYnMoZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQgPSB0IDwgMSA/IE1hdGgucG93KDEwLCB0KSA6IE1hdGgucm91bmQoTWF0aC5wb3coMTAsIHQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdCA9IGQgPCAwID8gMSAvIHQgOiB0O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0IDwgMC4wMDAwMSB8fCB0ID4gMTAwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXhwRm9ybWF0KHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG51bUZvcm1hdCh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQocmVzdWx0KS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgem9vbToge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdWJjaGFydDoge1xuICAgICAgICAgICAgICAgICAgICBzaG93OiB0cnVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbm1vdXNlb3V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoYXJ0LmZvY3VzKGNoYXJ0Rm9jdXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzb3J0U2Vuc29ycyA9IGZ1bmN0aW9uIChzZW5zb3JzKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5zb3J0Qnkoc2Vuc29ycywgZnVuY3Rpb24gKHNlbnNvcikge1xuICAgICAgICAgICAgICAgIGlmIChfLnN0YXJ0c1dpdGgoc2Vuc29yLCBkZWx0YUNvbmZpZy5kZWZhdWx0U2Vuc29yKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2Vuc29yLnNwbGl0KCcgJylbMV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBzZW5zb3I7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcmVuZGVyQ2hhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBpbnN0YW50aWF0ZSB0aGUgd2ViIHdvcmtlclxuICAgICAgICAgICAgY2hhcnRXb3JrZXIgPSBXZWJ3b3JrZXIuY3JlYXRlKGZvcm1hdENoYXJ0RGF0YSk7XG5cbiAgICAgICAgICAgIC8vIHN0YXJ0IHRoZSB3ZWIgd29ya2VyIGFuZCB3YWl0IGZvciB0aGUgcmVzdWx0XG4gICAgICAgICAgICBjaGFydFdvcmtlci5ydW4ocGxvdERhdGEsIGNvcnJlbGF0aW5nRGF0ZURpZmYsIGRlbHRhQ29uZmlnLmJhc2VVcmwpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGlmIChkZWZhdWx0UGxvdERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hhcnREYXRhID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGluaXRDaGFydCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gY29ycmVsYXRpbmdQbG90RGF0YSA/IF8uY29uY2F0KGRlZmF1bHRQbG90RGF0YS5zZW5zb3JzLCBjb3JyZWxhdGluZ1Bsb3REYXRhLnNlbnNvcnMpIDogZGVmYXVsdFBsb3REYXRhLnNlbnNvcnM7XG4gICAgICAgICAgICAgICAgICAgIGtleXMgPSBzb3J0U2Vuc29ycyhrZXlzKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgc291cmNlMElkeCA9IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UxSWR4ID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdXAgY2hhcnQgY29sb3JzIGJhc2VkIG9uIHNvdXJjZSB0eXBlXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChrZXlzLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5lbmRzV2l0aChrZXksIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhcnRDb2xvcnNba2V5XSA9IF8uZmluZChkZWx0YUNvbmZpZy5zb3VyY2VzLCB7IGlkZW50aXR5OiBmYWxzZSB9KS5jaGFydENvbG9yc1tzb3VyY2UwSWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UwSWR4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJ0Q29sb3JzW2tleV0gPSBfLmZpbmQoZGVsdGFDb25maWcuc291cmNlcywgeyBpZGVudGl0eTogdHJ1ZSB9KS5jaGFydENvbG9yc1tzb3VyY2UxSWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UxSWR4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbjogY2hhcnREYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6ICd0aW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToga2V5c1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yczogY2hhcnRDb2xvcnNcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgY2hhcnQubG9hZChkYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBkZXRlcm1pbmUgY29sb3IgZm9yIGNhcmQgdGl0bGUgYmFzZWQgb24gY29sb3IgaW4gY2hhcnRcbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKHZtLmNoaXBDYXJkcywgZnVuY3Rpb24gKGNhcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmQuY29sb3IgPSBjaGFydC5kYXRhLmNvbG9ycygpW2NhcmQuY2hhcnRJZF07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh2bS5jb3JyZWxhdGluZ0NoaXBDYXJkcywgZnVuY3Rpb24gKGNhcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmQuY29sb3IgPSBjaGFydC5kYXRhLmNvbG9ycygpW2NhcmQuY2hhcnRJZF07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUNoYXJ0Rm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyRnJhbWVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRFdmVudERhdGEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5sb2FkaW5nU3RhdHVzID0gJ0luaXRpYWxpemluZy4uLic7XG5cbiAgICAgICAgICAgIC8vIGZsYXR0ZW4gZnJhbWVEYXRhIGFuZCBncm91cCBieSBzZW5zb3IsIHRoZW4gY29udmVydFxuICAgICAgICAgICAgLy8gdG8gcGFpcnMgc28gdGhlIHRlbXBsYXRlIGtub3dzIGhvdyBtYW55IGltYWdlIGNhcmRzXG4gICAgICAgICAgICAvLyB0byBkaXNwbGF5IGFuZCB3aGF0IHRoZWlyIGxhYmVscyBzaG91bGQgYmVcbiAgICAgICAgICAgIHZhciBjaGlwQ2FyZHMgPSBfLnRvUGFpcnMoXy5ncm91cEJ5KF8uZmxhdHRlbihfLm1hcChmcmFtZURhdGEsICdyZXN1bHRzJykpLCAnc2Vuc29yJykpO1xuICAgICAgICAgICAgdmFyIGNoaXBDYXJkT2JqcyA9IF8ubWFwKGNoaXBDYXJkcywgZnVuY3Rpb24gKGNhcmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzQ2xhc3MgPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0gPyBfLnJlcGxhY2UoY2FyZFswXSwgJyAnLCAnJykgOiBfLnJlcGxhY2UoY2FyZFswXSwgJyAnLCAnJykgKyBkZWx0YUNvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsLFxuICAgICAgICAgICAgICAgICAgICBjaGFydElkID0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdID8gY2FyZFswXSA6IGNhcmRbMF0gKyBkZWx0YUNvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vuc29yOiBjYXJkWzBdLFxuICAgICAgICAgICAgICAgICAgICBpbWFnZXM6IGNhcmRbMV0sXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBjYW52YXNDbGFzcyxcbiAgICAgICAgICAgICAgICAgICAgY2hhcnRJZDogY2hhcnRJZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIGNoaXBDYXJkT3JkZXIgPSBzb3J0U2Vuc29ycyhfLm1hcChjaGlwQ2FyZE9ianMsICdzZW5zb3InKSk7XG5cbiAgICAgICAgICAgIF8uZm9yRWFjaChjaGlwQ2FyZE9yZGVyLCBmdW5jdGlvbiAoc2Vuc29yKSB7XG4gICAgICAgICAgICAgICAgdm0uY2hpcENhcmRzLnB1c2goXy5maW5kKGNoaXBDYXJkT2JqcywgeyBzZW5zb3I6IHNlbnNvciB9KSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdm0uYWN0aXZlQ2hpcENhcmQgPSB2bS5jaGlwQ2FyZHNbMF07XG4gICAgICAgICAgICB2bS5hY3RpdmVDaGlwQ2FyZC5hY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgdm0uYXZhaWxhYmxlQ2hpcENhcmRzID0gXy5jbG9uZURlZXAodm0uY2hpcENhcmRzKTtcblxuICAgICAgICAgICAgaWYgKGhhc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gc2V0IHVwIGNvcnJlbGF0aW5nIGNoaXAgY2FyZHNcbiAgICAgICAgICAgICAgICB2bS5jb3JyZWxhdGluZ0NoaXBDYXJkcyA9IF8ubWFwKGNoaXBDYXJkcywgZnVuY3Rpb24gKGNhcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbnNvcjogY2FyZFswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlczogY2FyZFsxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogY2FyZFswXSA9PT0gdm0uYWN0aXZlQ2hpcENhcmQuc2Vuc29yLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSA/IF8ucmVwbGFjZShjYXJkWzBdLCAnICcsICcnKSArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwgOiBfLnJlcGxhY2UoY2FyZFswXSwgJyAnLCAnJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFydElkOiB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0gPyBjYXJkWzBdICsgZGVsdGFDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbCA6IGNhcmRbMF1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVDb3JyZWxhdGluZ0NoaXBDYXJkID0gXy5maW5kKHZtLmNvcnJlbGF0aW5nQ2hpcENhcmRzLCB7IHNlbnNvcjogdm0uYWN0aXZlQ2hpcENhcmQuc2Vuc29yIH0pO1xuICAgICAgICAgICAgICAgIHZtLmF2YWlsYWJsZUNoaXBDYXJkcyA9IF8udW5pcUJ5KHZtLmF2YWlsYWJsZUNoaXBDYXJkcy5jb25jYXQodm0uY29ycmVsYXRpbmdDaGlwQ2FyZHMpLCAnc2Vuc29yJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgY29ycmVsYXRpbmcgZXZlbnQgdGltZSBkaWZmZXJlbmNlXG4gICAgICAgICAgICAgICAgY29ycmVsYXRpbmdEYXRlRGlmZiA9IG1vbWVudChkZWZhdWx0UGxvdERhdGEuc3RhcnRlZCkuZGlmZihtb21lbnQoY29ycmVsYXRpbmdQbG90RGF0YS5zdGFydGVkKSwgJ3MnKTtcblxuICAgICAgICAgICAgICAgIC8vIGFkanVzdCBmb3IgcG9zc2libGUgdGltZXN0YW1wIGRpZmZlcmVuY2VcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goZnJhbWVEYXRhLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goZGF0YS5yZXN1bHRzLCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LmlzQ29ycmVsYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQudGltZXN0YW1wID0gY29ycmVsYXRpbmdEYXRlRGlmZiA/IHJlc3VsdC50aW1lc3RhbXAgLSBjb3JyZWxhdGluZ0RhdGVEaWZmIDogcmVzdWx0LnRpbWVzdGFtcDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZW5kZXJDaGFydCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRDb3JyZWxhdGluZ0V2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0Q29ycmVsYXRpbmdFdmVudHModm0uc2VsZWN0ZWRGZWF0dXJlKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2bS5ldmVudEVycm9yID0gZXJyb3Iuc3RhdHVzID4gLTEgPyBlcnJvci5zdGF0dXMgKyAnOiAnICsgZXJyb3Iuc3RhdHVzVGV4dCA6ICdDb25uZWN0aW9uIGVycm9yOyB1bmFibGUgdG8gcmV0cmlldmUgY29ycmVsYXRpbmcgZXZlbnRzLic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldFBsb3REYXRhID0gZnVuY3Rpb24gKGZpbGVQYXRoLCBpc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICBpc0NvcnJlbGF0aW9uID0gaXNDb3JyZWxhdGlvbiB8fCBmYWxzZTtcbiAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0UGxvdERhdGEoeyB1cmw6IGZpbGVQYXRoIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5pc0NvcnJlbGF0aW9uID0gaXNDb3JyZWxhdGlvbjtcbiAgICAgICAgICAgICAgICBpZiAodm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNlbGVjdGVkIGZlYXR1cmUgaXMgdXMsIHNvIGNvcnJlbGF0ZWQgZGF0YSBuZWVkcyB0byBiZSBsYWJlbGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2Vuc29ycyA9IF8ubWFwKHJlc3VsdC5zZW5zb3JzLCBmdW5jdGlvbiAoc2Vuc29yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbnNvciArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNlbGVjdGVkIGZlYXR1cmUgaXMgdGhlbSwgc28gbm9uLWNvcnJlbGF0ZWQgZGF0YSBuZWVkcyB0byBiZSBsYWJlbGVkXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNlbnNvcnMgPSBfLm1hcChyZXN1bHQuc2Vuc29ycywgZnVuY3Rpb24gKHNlbnNvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzZW5zb3IgKyBkZWx0YUNvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZC5yZXNvbHZlKHBsb3REYXRhLnB1c2gocmVzdWx0KSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdm0uZXZlbnRFcnJvciA9IGVycm9yLnN0YXR1cyA+IC0xID8gZXJyb3Iuc3RhdHVzICsgJzogJyArIGVycm9yLnN0YXR1c1RleHQgOiAnQ29ubmVjdGlvbiBlcnJvcjsgdW5hYmxlIHRvIHJldHJpZXZlIHBsb3QgZGF0YS4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRGcmFtZURhdGEgPSBmdW5jdGlvbiAoZmlsZVBhdGgsIGlzQ29ycmVsYXRpb24pIHtcbiAgICAgICAgICAgIGlzQ29ycmVsYXRpb24gPSBpc0NvcnJlbGF0aW9uIHx8IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRGcmFtZURhdGEoeyB1cmw6IGZpbGVQYXRoIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChyZXN1bHQucmVzdWx0cywgZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgci5zZW5zb3JUaXRsZSA9IGlzQ29ycmVsYXRpb24gPyByLnNlbnNvciArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwgOiByLnNlbnNvcjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHIuc2Vuc29yVGl0bGUgPSAhaXNDb3JyZWxhdGlvbiA/IHIuc2Vuc29yICsgZGVsdGFDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbCA6IHIuc2Vuc29yO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHIuaXNDb3JyZWxhdGlvbiA9IGlzQ29ycmVsYXRpb247XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZC5yZXNvbHZlKGZyYW1lRGF0YS5wdXNoKHJlc3VsdCkpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZtLmV2ZW50RXJyb3IgPSBlcnJvci5zdGF0dXMgPiAtMSA/IGVycm9yLnN0YXR1cyArICc6ICcgKyBlcnJvci5zdGF0dXNUZXh0IDogJ0Nvbm5lY3Rpb24gZXJyb3I7IHVuYWJsZSB0byByZXRyaWV2ZSBmcmFtZSBkYXRhLic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldENvcnJlbGF0aW5nRXZlbnREYXRhID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRFdmVudFRyYWNrcyhwYXJhbXMpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBkLnJlc29sdmUoY29ycmVsYXRpbmdFdmVudERhdGEgPSBkYXRhKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2bS5ldmVudEVycm9yID0gZXJyb3Iuc3RhdHVzID4gLTEgPyBlcnJvci5zdGF0dXMgKyAnOiAnICsgZXJyb3Iuc3RhdHVzVGV4dCA6ICdDb25uZWN0aW9uIGVycm9yOyB1bmFibGUgdG8gcmV0cmlldmUgY29ycmVsYXRpbmcgZXZlbnQgZGF0YS4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBjYXN0Vm90ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZvdGVTZXJ2aWNlLmNhc3RWb3RlKHZtLnZvdGVPYmopLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHZtLnZvdGVPYmogPSBWb3RlLnRyYW5zZm9ybWVyKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB2bS52b3Rlcy5wdXNoKHZtLnZvdGVPYmopO1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3Rlcyh2bS52b3Rlcyk7XG4gICAgICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZSkge1xuICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdVcHZvdGUgcmVjb3JkZWQnKS50aGVtZSgnc3VjY2Vzcy10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRG93bnZvdGUgcmVjb3JkZWQgKCcgKyB2bS52b3RlT2JqLnJlYXNvbiArICcpJykudGhlbWUoJ2ZhaWwtdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICB2bS52b3RlT2JqLnZvdGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIFN1Ym1pdHRpbmcgVm90ZScpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB1cGRhdGVWb3RlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm90ZVNlcnZpY2UudXBkYXRlVm90ZSh2bS52b3RlT2JqKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBsb29rIGZvciBleGlzdGluZyB2b3RlIGZvciB0aGlzIGV2ZW50XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50Vm90ZSA9IF8uZmluZCh2bS52b3RlcywgeyBkYXRhc2V0X2lkOiB2bS52b3RlT2JqLmRhdGFzZXRfaWQsIHByb2R1Y3RfaWQ6IHZtLnZvdGVPYmoucHJvZHVjdF9pZCB9KTtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRWb3RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50Vm90ZS52b3RlID0gdm0udm90ZU9iai52b3RlO1xuICAgICAgICAgICAgICAgICAgICBldmVudFZvdGUucmVhc29uID0gdm0udm90ZU9iai5yZWFzb247XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3Rlcyh2bS52b3Rlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnVXB2b3RlIHJlY29yZGVkJykudGhlbWUoJ3N1Y2Nlc3MtdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Rvd252b3RlIHJlY29yZGVkICgnICsgdm0udm90ZU9iai5yZWFzb24gKyAnKScpLnRoZW1lKCdmYWlsLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgdm0udm90ZU9iai52b3RlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciBTdWJtaXR0aW5nIFZvdGUnKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRBY3RpdmVDaGlwQ2FyZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHBsYXliYWNrRnJhbWVzID0gW107XG4gICAgICAgICAgICBmcmFtZUlkeCA9IDA7XG4gICAgICAgICAgICB2YXIgY3VyckFjdGl2ZUNoaXBDYXJkID0gXy5maW5kKHZtLmNoaXBDYXJkcywgeyBhY3RpdmU6IHRydWUgfSksXG4gICAgICAgICAgICAgICAgY3VyckFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQgPSBfLmZpbmQodm0uY29ycmVsYXRpbmdDaGlwQ2FyZHMsIHsgYWN0aXZlOiB0cnVlIH0pO1xuXG4gICAgICAgICAgICBpZiAoY3VyckFjdGl2ZUNoaXBDYXJkKSB7XG4gICAgICAgICAgICAgICAgY3VyckFjdGl2ZUNoaXBDYXJkLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGN1cnJBY3RpdmVDb3JyZWxhdGluZ0NoaXBDYXJkKSB7XG4gICAgICAgICAgICAgICAgY3VyckFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQuYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZtLmFjdGl2ZUNoaXBDYXJkID0gXy5maW5kKHZtLmNoaXBDYXJkcywgeyBzZW5zb3I6IHZtLmFjdGl2ZUNoaXBDYXJkLnNlbnNvciB9KTtcbiAgICAgICAgICAgIHZtLmFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQgPSBfLmZpbmQodm0uY29ycmVsYXRpbmdDaGlwQ2FyZHMsIHsgc2Vuc29yOiB2bS5hY3RpdmVDaGlwQ2FyZC5zZW5zb3IgfSk7XG5cbiAgICAgICAgICAgIGlmICh2bS5hY3RpdmVDaGlwQ2FyZCkge1xuICAgICAgICAgICAgICAgIHZtLmFjdGl2ZUNoaXBDYXJkLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodm0uYWN0aXZlQ29ycmVsYXRpbmdDaGlwQ2FyZCkge1xuICAgICAgICAgICAgICAgIHZtLmFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdXBkYXRlQ2hhcnRGb2N1cygpO1xuICAgICAgICAgICAgdXBkYXRlRnJhbWVzVG9SZW5kZXIoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudERhdGEobnVsbCk7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlRXZlbnQobnVsbCk7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnREYXRhKG51bGwpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnZvdGVVcEJ0bkNvbG9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gbnVsbCB8fCB2bS52b3RlT2JqLnZvdGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZWVuLTcwMCc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXktNzAwJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS52b3RlRG93bkJ0bkNvbG9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gbnVsbCB8fCB2bS52b3RlT2JqLnZvdGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyZWQtNzAwJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodm0udm90ZU9iai52b3RlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5LTcwMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0ub3Blbk1lbnUgPSBmdW5jdGlvbiAoJG1kT3Blbk1lbnUsIGV2KSB7XG4gICAgICAgICAgICAkbWRPcGVuTWVudShldik7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udm90ZVVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0udm90ZU9iai52b3RlID0gdHJ1ZTtcbiAgICAgICAgICAgIHZtLnZvdGVPYmoucmVhc29uID0gJyc7XG4gICAgICAgICAgICBpZiAodm0udm90ZU9iai52b3RlX2lkKSB7XG4gICAgICAgICAgICAgICAgLy8gdm90ZSBoYXMgYWxyZWFkeSBiZWVuIGNhc3QsIHNvIHVwZGF0ZSBpbnN0ZWFkXG4gICAgICAgICAgICAgICAgdXBkYXRlVm90ZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBuZXcgdm90ZVxuICAgICAgICAgICAgICAgIGNhc3RWb3RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udm90ZURvd24gPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgICAgICB2bS52b3RlT2JqLnZvdGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHZtLnZvdGVPYmoucmVhc29uID0gcmVhc29uO1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZV9pZCkge1xuICAgICAgICAgICAgICAgIC8vIHZvdGUgaGFzIGFscmVhZHkgYmVlbiBjYXN0LCBzbyB1cGRhdGUgaW5zdGVhZFxuICAgICAgICAgICAgICAgIHVwZGF0ZVZvdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gbmV3IHZvdGVcbiAgICAgICAgICAgICAgICBjYXN0Vm90ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNob3dNZXRhZGF0YSA9IGZ1bmN0aW9uKGV2LCBldk1ldGFkYXRhcykge1xuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coe1xuICAgICAgICAgICAgICAgIGNsaWNrT3V0c2lkZVRvQ2xvc2U6IHRydWUsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ21ldGFkYXRhRGlhbG9nQ29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvZXZlbnRWaWV3ZXIvbWV0YWRhdGFEaWFsb2dUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgICAgICB0YXJnZXRFdmVudDogZXYsXG4gICAgICAgICAgICAgICAgbG9jYWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50TWV0YWRhdGFzOiBldk1ldGFkYXRhc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLm1hdGNoU2lnbmF0dXJlID0gZnVuY3Rpb24gKHNlbnNvcikge1xuICAgICAgICAgICAgdmFyIGNoYXJ0RGF0YSA9IF8uZmluZChjaGFydC5kYXRhKCksIHsgaWQ6IHNlbnNvciB9KSxcbiAgICAgICAgICAgICAgICB2YWx1ZXMgPSBjaGFydERhdGEgPyBjaGFydERhdGEudmFsdWVzIDogbnVsbDtcblxuICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBudWxsIHZhbHVlc1xuICAgICAgICAgICAgdmFsdWVzID0gXy5maWx0ZXIodmFsdWVzLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIHJldHVybiB2LnZhbHVlICE9PSBudWxsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh2YWx1ZXMpO1xuXG4gICAgICAgICAgICAvL3ZhciBzaWcgPSB7XG4gICAgICAgICAgICAvLyAgICBzaWdfdGVtcGxhdGU6IFtbdGltZXNdLFtpbnRlbnNpdGllc11dLFxuICAgICAgICAgICAgLy8gICAgZXZlbnRfZGF0YTogW1tldmVudFRpbWVzXSxbZXZlbnRJbnRlbnNpdGllc11dXG4gICAgICAgICAgICAvL307XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0UGxheWJhY2tTdGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICAgICAgdm0ucGxheWJhY2tTdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgICAgaWYgKHZtLnBsYXliYWNrU3RhdGUpIHtcbiAgICAgICAgICAgICAgICBhbmltYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0UGxheWJhY2tEaXJlY3Rpb24gPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICB2YXIgb2xkRGlyZWN0aW9uID0gdm0ucGxheWJhY2tEaXJlY3Rpb247XG4gICAgICAgICAgICB2bS5wbGF5YmFja0RpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICAgICAgICAgIGlmICghdm0ucGxheWJhY2tTdGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmICghYW5ndWxhci5lcXVhbHMob2xkRGlyZWN0aW9uLCBkaXJlY3Rpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZXIgY2hhbmdlZCBkaXJlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IGZyYW1lSWR4IDwgcGxheWJhY2tGcmFtZXMubGVuZ3RoIC0gMiA/IGZyYW1lSWR4ICsgMiA6IDA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IGZyYW1lSWR4ID4gMSA/IGZyYW1lSWR4IC0gMiA6IHBsYXliYWNrRnJhbWVzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYW5pbWF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RXZlbnREYXRhKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGNsZWFuIHVwIGFueSBsZWZ0b3ZlciBkYXRhIGZyb20gYSBwcmV2aW91c2x5IHZpZXdlZCBldmVudFxuICAgICAgICAgICAgaWYgKGNoYXJ0V29ya2VyKSB7XG4gICAgICAgICAgICAgICAgY2hhcnRXb3JrZXIudGVybWluYXRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjaGFydCkge1xuICAgICAgICAgICAgICAgIGNoYXJ0LmRlc3Ryb3koKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nU3RhdHVzID0gJ1JlcXVlc3RpbmcgRGF0YS4uLic7XG4gICAgICAgICAgICAgICAgdm0uZXZlbnREYXRhID0gbmV3VmFsdWU7XG5cbiAgICAgICAgICAgICAgICAvLyByZXRyaWV2ZSBwbG90IGFuZCBpbWFnZSBkYXRhIGZvciBhY3RpdmUgZXZlbnRcbiAgICAgICAgICAgICAgICB2YXIgdHJhY2tzID0gdm0uZXZlbnREYXRhLmdldExheWVycygpLFxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlcyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgdm0uZXZlbnRQcm9wcyA9IF8ubWFwKHRyYWNrcywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQuZ2V0TGF5ZXJzKClbMF0uZmVhdHVyZS5wcm9wZXJ0aWVzO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdm0uc2VsZWN0ZWRGZWF0dXJlID0gdHJhY2tzWzBdLmdldExheWVycygpWzBdLmZlYXR1cmU7XG4gICAgICAgICAgICAgICAgdm0uaDVVcmwgPSBkZWx0YUNvbmZpZy5ldmVudFNlcnZlci5maWxlUGF0aFVybCArIHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aDtcblxuICAgICAgICAgICAgICAgIGlmICh2bS52b3Rlcikge1xuICAgICAgICAgICAgICAgICAgICB2bS52b3RlT2JqLmRhdGFzZXRfaWQgPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXTtcbiAgICAgICAgICAgICAgICAgICAgdm0udm90ZU9iai5wcm9kdWN0X2lkID0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF07XG4gICAgICAgICAgICAgICAgICAgIHZtLnZvdGVPYmoubmFzaWMgPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF07XG4gICAgICAgICAgICAgICAgICAgIHZtLnZvdGVPYmoudm90ZXJfbmFtZSA9IHZtLnZvdGVyLnZvdGVyX25hbWU7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gbG9vayBmb3IgZXhpc3Rpbmcgdm90ZSBmb3IgdGhpcyBldmVudFxuICAgICAgICAgICAgICAgICAgICB2YXIgZXZlbnRWb3RlID0gXy5maW5kKHZtLnZvdGVzLCB7IGRhdGFzZXRfaWQ6IHZtLnZvdGVPYmouZGF0YXNldF9pZCwgcHJvZHVjdF9pZDogdm0udm90ZU9iai5wcm9kdWN0X2lkIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnRWb3RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS52b3RlT2JqID0gVm90ZS50cmFuc2Zvcm1lcihldmVudFZvdGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZSAmJiB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGVQYXRoID0gZGVsdGFDb25maWcuZXZlbnRTZXJ2ZXIuZmlsZVBhdGhVcmwgKyB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGg7XG4gICAgICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2goZ2V0UGxvdERhdGEoZmlsZVBhdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaChnZXRGcmFtZURhdGEoZmlsZVBhdGgpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkcS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBnZXRDb3JyZWxhdGluZ0V2ZW50cygpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuZmVhdHVyZXMgJiYgcmVzdWx0LmZlYXR1cmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29ycmVsYXRpbmdQcm9taXNlcyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlID0gcmVzdWx0LmZlYXR1cmVzWzBdO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGhfMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmlsZVBhdGggPSBkZWx0YUNvbmZpZy5ldmVudFNlcnZlci5maWxlUGF0aFVybCArIGZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGhfMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50UGFyYW1zID0ge307XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uY29ycmVsYXRlZEg1VXJsID0gZmlsZVBhdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50UGFyYW1zW2RlbHRhQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID0gZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGQgKyAnXzInXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRQYXJhbXNbZGVsdGFDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPSBmZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZCArICdfMiddO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ1Byb21pc2VzLnB1c2goZ2V0Q29ycmVsYXRpbmdFdmVudERhdGEoZXZlbnRQYXJhbXMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdQcm9taXNlcy5wdXNoKGdldFBsb3REYXRhKGZpbGVQYXRoLCB0cnVlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nUHJvbWlzZXMucHVzaChnZXRGcmFtZURhdGEoZmlsZVBhdGgsIHRydWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcS5hbGwoY29ycmVsYXRpbmdQcm9taXNlcykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb3JyZWxhdGlvbiBwcmVzZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvcnJlbGF0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFBsb3REYXRhID0gXy5maW5kKHBsb3REYXRhLCB7IGlzQ29ycmVsYXRpb246IGZhbHNlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ1Bsb3REYXRhID0gXy5maW5kKHBsb3REYXRhLCB7IGlzQ29ycmVsYXRpb246IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLmNvcnJlbGF0ZWRFdmVudFByb3BzID0gXy5tYXAoY29ycmVsYXRpbmdFdmVudERhdGEuZmVhdHVyZXMsICdwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRFdmVudERhdGEoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzQ29ycmVsYXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0UGxvdERhdGEgPSBfLmZpbmQocGxvdERhdGEsIHsgaXNDb3JyZWxhdGlvbjogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdEV2ZW50RGF0YSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRMYXlvdXRDb21wb25lbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50ID0gXy5maW5kKG5ld1ZhbHVlLCB7IHN0YXRlOiB7IHRlbXBsYXRlTmFtZTogJ2V2ZW50Vmlld2VyJyB9IH0pO1xuICAgICAgICAgICAgICAgIGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5zZXRUaXRsZShldmVudFZpZXdlckxheW91dENvbXBvbmVudC5zdGF0ZS50ZW1wbGF0ZVRpdGxlKTtcblxuICAgICAgICAgICAgICAgIHZtLmV2ZW50Vmlld2VySGVpZ2h0ID0gZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLmhlaWdodDtcbiAgICAgICAgICAgICAgICB2bS5ldmVudFZpZXdlcldpZHRoID0gZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLndpZHRoO1xuXG4gICAgICAgICAgICAgICAgLy8gc2V0IGV2ZW50IGxpc3RlbmVyIGZvciBjb250YWluZXIgcmVzaXplXG4gICAgICAgICAgICAgICAgZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLm9uKCdyZXNpemUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhICR0aW1lb3V0IHRvIG5vdGlmeSBhbmd1bGFyIG9mIHRoZSBjaGFuZ2VcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0uZXZlbnRWaWV3ZXJIZWlnaHQgPSBldmVudFZpZXdlckxheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0uZXZlbnRWaWV3ZXJXaWR0aCA9IGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJ0LnJlc2l6ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdm0uZXZlbnRWaWV3ZXJIZWlnaHQgLyAyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogdm0uZXZlbnRWaWV3ZXJXaWR0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuIFxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLmNvbnRyb2xsZXIoJ2V2ZW50Vmlld2VyQ29udHJvbGxlclNhdmUnLCBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHNjb3BlLFxyXG4gICAgICAgICRxLFxyXG4gICAgICAgICR0aW1lb3V0LFxyXG4gICAgICAgICRtZERpYWxvZyxcclxuICAgICAgICAkbWRUb2FzdCxcclxuICAgICAgICBkZWx0YUNvbmZpZyxcclxuICAgICAgICBzdGF0ZVNlcnZpY2UsXHJcbiAgICAgICAgc2VhcmNoU2VydmljZSxcclxuICAgICAgICB2b3RlU2VydmljZSxcclxuICAgICAgICBWb3RlLFxyXG4gICAgICAgIFdlYndvcmtlcixcclxuICAgICAgICBtb21lbnQsXHJcbiAgICAgICAgaG90a2V5cyxcclxuICAgICAgICBjMyxcclxuICAgICAgICBkMyxcclxuICAgICAgICBfXHJcbiAgICApIHtcclxuICAgICAgICB2YXIgdm0gPSB0aGlzLFxyXG4gICAgICAgICAgICBwbG90UmVzdWx0cyxcclxuICAgICAgICAgICAgcGxvdFJlc3VsdHNBcnIsXHJcbiAgICAgICAgICAgIGltYWdlUmVzdWx0cyxcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdQbG90UmVzdWx0cyxcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdJbWFnZVJlc3VsdHMsXHJcbiAgICAgICAgICAgIGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50ID0gbnVsbCxcclxuICAgICAgICAgICAgZnJhbWVzLFxyXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lcyxcclxuICAgICAgICAgICAgYW5pbWF0aW9uRnJhbWVzLFxyXG4gICAgICAgICAgICB4U3RhcnRlZCxcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdEYXRlRGlmZixcclxuICAgICAgICAgICAgY2hhcnQsXHJcbiAgICAgICAgICAgIGNoYXJ0RGF0YSxcclxuICAgICAgICAgICAgY2hhcnRXb3JrZXIsXHJcbiAgICAgICAgICAgIGltYWdlV29ya2VyLFxyXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ltYWdlV29ya2VyLFxyXG4gICAgICAgICAgICBzdGFydEdyaWRMaW5lRWwsXHJcbiAgICAgICAgICAgIHN0b3BHcmlkTGluZUVsLFxyXG4gICAgICAgICAgICBhbmltYXRlLFxyXG4gICAgICAgICAgICBmcmFtZUlkeCxcclxuICAgICAgICAgICAgaGFzQ29ycmVsYXRpb24sXHJcbiAgICAgICAgICAgIGNoYXJ0Rm9jdXMsXHJcbiAgICAgICAgICAgIGFuaW1hdGlvbkRlbGF5LFxyXG4gICAgICAgICAgICBpc0FuaW1hdGluZztcclxuXHJcbiAgICAgICAgdm0uZXZlbnRWaWV3ZXJIZWlnaHQgPSAnJztcclxuICAgICAgICB2bS5ldmVudFZpZXdlcldpZHRoID0gJyc7XHJcblxyXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBwbG90UmVzdWx0cyA9IFtdO1xyXG4gICAgICAgICAgICBwbG90UmVzdWx0c0FyciA9IFtdO1xyXG4gICAgICAgICAgICBpbWFnZVJlc3VsdHMgPSBbXTtcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdQbG90UmVzdWx0cyA9IFtdO1xyXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ltYWdlUmVzdWx0cyA9IFtdO1xyXG4gICAgICAgICAgICBmcmFtZXMgPSBbXTtcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZXMgPSBbXTtcclxuICAgICAgICAgICAgYW5pbWF0aW9uRnJhbWVzID0gW107XHJcbiAgICAgICAgICAgIHhTdGFydGVkID0gbnVsbDtcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdEYXRlRGlmZiA9IG51bGw7XHJcbiAgICAgICAgICAgIGNoYXJ0ID0gbnVsbDtcclxuICAgICAgICAgICAgY2hhcnREYXRhID0gW107XHJcbiAgICAgICAgICAgIGNoYXJ0V29ya2VyID0gbnVsbDtcclxuICAgICAgICAgICAgaW1hZ2VXb3JrZXIgPSBudWxsO1xyXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ltYWdlV29ya2VyID0gbnVsbDtcclxuICAgICAgICAgICAgc3RhcnRHcmlkTGluZUVsID0gbnVsbDtcclxuICAgICAgICAgICAgc3RvcEdyaWRMaW5lRWwgPSBudWxsO1xyXG4gICAgICAgICAgICBhbmltYXRlID0gbnVsbDtcclxuICAgICAgICAgICAgZnJhbWVJZHggPSAwO1xyXG4gICAgICAgICAgICBoYXNDb3JyZWxhdGlvbiA9IG51bGw7XHJcbiAgICAgICAgICAgIGNoYXJ0Rm9jdXMgPSBbXTtcclxuICAgICAgICAgICAgYW5pbWF0aW9uRGVsYXkgPSBudWxsO1xyXG4gICAgICAgICAgICBpc0FuaW1hdGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xyXG4gICAgICAgICAgICB2bS5kZWx0YUNvbmZpZyA9IGRlbHRhQ29uZmlnO1xyXG4gICAgICAgICAgICB2bS5fID0gXztcclxuICAgICAgICAgICAgdm0udHJhY2tGZWF0dXJlID0gbnVsbDtcclxuXHRcdFx0dm0uZXZlbnRQcm9wcyA9IG51bGw7XHJcblx0XHRcdHZtLmV2ZW50X2g1X3VybCA9IG51bGw7XHJcblx0XHRcdHZtLmNvcnJlbGF0ZWRFdmVudFByb3BzID0gbnVsbDtcclxuXHRcdFx0dm0uY29ycmVsYXRlZF9oNV91cmwgPSBudWxsO1xyXG4gICAgICAgICAgICB2bS5ldmVudERhdGEgPSBudWxsO1xyXG4gICAgICAgICAgICB2bS5hY3RpdmVJbWFnZUNhcmQgPSBudWxsO1xyXG4gICAgICAgICAgICB2bS5zZWxlY3RlZEltYWdlQ2FyZCA9IG51bGw7XHJcbiAgICAgICAgICAgIHZtLmV2ZW50SW1hZ2VDYXJkcyA9IFtdO1xyXG4gICAgICAgICAgICB2bS5jb3JyZWxhdGluZ0V2ZW50SW1hZ2VDYXJkcyA9IFtdO1xyXG4gICAgICAgICAgICB2bS5hdmFpbGFibGVJbWFnZUNhcmRzID0gW107XHJcbiAgICAgICAgICAgIHZtLmxvYWRpbmdDaGFydCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB2bS5sb2FkaW5nQW5pbWF0aW9uID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHZtLnZvdGVyID0gc3RhdGVTZXJ2aWNlLmdldFZvdGVyKCk7XHJcbiAgICAgICAgICAgIHZtLnZvdGVzID0gc3RhdGVTZXJ2aWNlLmdldFZvdGVzKCk7XHJcbiAgICAgICAgICAgIHZtLnZvdGVSZWFzb25zID0gc3RhdGVTZXJ2aWNlLmdldFZvdGVSZWFzb25zKCk7XHJcbiAgICAgICAgICAgIHZtLnZvdGVPYmogPSBuZXcgVm90ZSgpO1xyXG4gICAgICAgICAgICB2bS5zZW5zb3JzID0gW107XHJcbiAgICAgICAgICAgIHZtLmFjdGl2ZVNlbnNvciA9IHt9O1xyXG4gICAgICAgICAgICB2bS5wbGF5YmFjayA9IHRydWU7XHJcbiAgICAgICAgICAgIHZtLnBsYXliYWNrRGlyZWN0aW9uID0gJ2ZvcndhcmQnO1xyXG4gICAgICAgICAgICB2bS5ldmVudEVycm9yID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHZtLmludGVybmFsU291cmNlID0gXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIHZtLmV4dGVybmFsU291cmNlID0gXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IGZhbHNlIH0pO1xyXG5cclxuICAgICAgICAgICAgaG90a2V5cy5iaW5kVG8oJHNjb3BlKVxyXG4gICAgICAgICAgICAgICAgLmFkZCh7XHJcbiAgICAgICAgICAgICAgICAgICAgY29tYm86ICdsZWZ0JyxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1N0ZXAgQmFjaycsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0uc3RlcCgnYmFja3dhcmQnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KS5hZGQoe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAncmlnaHQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU3RlcCBGb3J3YXJkJyxcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5zdGVwKCdmb3J3YXJkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSkuYWRkKHtcclxuICAgICAgICAgICAgICAgICAgICBjb21ibzogJ3VwJyxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BsYXkvUGF1c2UgRm9yd2FyZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEaXJlY3Rpb24gPSAnZm9yd2FyZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnRvZ2dsZVBsYXliYWNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSkuYWRkKHtcclxuICAgICAgICAgICAgICAgICAgICBjb21ibzogJ2Rvd24nLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGxheS9QYXVzZSBCYWNrd2FyZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEaXJlY3Rpb24gPSAnYmFja3dhcmQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS50b2dnbGVQbGF5YmFjaygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2YgKGNoYXJ0KSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZSBoYXMgbmV2ZXIgYmVlbiBjYWxsZWRcclxuICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlSW1hZ2VBcnIgKGltYWdlUmVzdWx0cywgY29ycmVsYXRpbmdEYXRlRGlmZikge1xyXG4gICAgICAgICAgICBpbXBvcnRTY3JpcHRzKGxvY2F0aW9uLm9yaWdpbiArICcvc2NyaXB0cy93ZWJ3b3JrZXJEZXBzL2xvZGFzaC5qcycpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcclxuXHJcbiAgICAgICAgICAgIHZhciBpbWFnZUFycnMgPSBbXTtcclxuICAgICAgICAgICAgXy5mb3JFYWNoKGltYWdlUmVzdWx0cywgZnVuY3Rpb24gKGltYWdlUmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goaW1hZ2VSZXN1bHQucmVzdWx0cywgZnVuY3Rpb24gKGltYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGltYWdlLmlzQ29ycmVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm9ybWFsaXplIHRpbWUgdmFsdWVzIGlmIGEgZGlmZmVyZW5jZSBpbiBzdGFydFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkYXRlcyBpcyBwcmVzZW50LiBjb3JyZWxhdGluZ0RhdGVEaWZmIHdpbGwgYmUgcG9zaXRpdmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hlbiB0aGUgY29ycmVsYXRpbmcgZXZlbnQgc3RhcnRlZCB2YWx1ZSBpcyBsYXRlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGFuIHRoZSBldmVudCBzdGFydGVkIHZhbHVlLCBhbmQgdmljZSB2ZXJzYVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWFnZS50aW1lc3RhbXAgPSBjb3JyZWxhdGluZ0RhdGVEaWZmID8gaW1hZ2UudGltZXN0YW1wIC0gY29ycmVsYXRpbmdEYXRlRGlmZiA6IGltYWdlLnRpbWVzdGFtcDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGltYWdlLnZhbHVlcyA9IF8uZmxhdE1hcChpbWFnZS52YWx1ZXMsIGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1hZ2UubWluIDwgMCB8fCBpbWFnZS5tYXggPiAyNTUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFwcGx5IHByb3BlciAwLTI1NSBzY2FsZSB0byBpbnZhbGlkIHZhbHVlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG11bHRpcGxpZXIgPSAyNTUgLyBNYXRoLmFicyhpbWFnZS5tYXggLSBpbWFnZS5taW4pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSAodmFsdWUgLSBpbWFnZS5taW4pICogbXVsdGlwbGllcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3ZhbHVlLCB2YWx1ZSwgdmFsdWUsIDI1NV07XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VBcnJzLnB1c2goaW1hZ2UpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGltYWdlQXJycztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB1cGRhdGVBbmltYXRpb25GcmFtZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGVBbmltYXRpb25GcmFtZXMnKTtcclxuICAgICAgICAgICAgYW5pbWF0aW9uRnJhbWVzID0gW107XHJcbiAgICAgICAgICAgIGZyYW1lSWR4ID0gMDtcclxuXHJcbiAgICAgICAgICAgIC8vIGlzb2xhdGUgZnJhbWVzIGZvciBjdXJyZW50bHkgYWN0aXZlIHNlbnNvciBjYXJkXHJcbiAgICAgICAgICAgIGFuaW1hdGlvbkZyYW1lcyA9IF8uZmlsdGVyKGhhc0NvcnJlbGF0aW9uID8gY29ycmVsYXRpbmdGcmFtZXMgOiBmcmFtZXMsIGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZi5zZW5zb3IuaW5jbHVkZXModm0uYWN0aXZlSW1hZ2VDYXJkLnNlbnNvcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gb3JkZXIgZnJhbWVzIGFycmF5IGJ5IHZhbHVlICh0aW1lKVxyXG4gICAgICAgICAgICBhbmltYXRpb25GcmFtZXMgPSBfLnNvcnRCeShhbmltYXRpb25GcmFtZXMsICd2YWx1ZScpO1xyXG5cclxuICAgICAgICAgICAgLy8gZGl2aWRlIGxhcmdlciBmcmFtZSBhcnJheXMgaW50byBjaHVua3MgdG8gaW1wcm92ZSBwbGF5YmFja1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhhbmltYXRpb25GcmFtZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgaWYgKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPiAxMDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBjaHVua1NpemUgPSAwO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPCAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjaHVua1NpemUgPSBNYXRoLmZsb29yKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggLyAyMCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPj0gMjAwICYmIGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPCA1MDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjaHVua1NpemUgPSBNYXRoLmZsb29yKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggLyAxNSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNodW5rU2l6ZSA9IE1hdGguZmxvb3IoYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCAvIDEwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGFuaW1hdGlvbkZyYW1lcyA9IF8uY2h1bmsoYW5pbWF0aW9uRnJhbWVzLCBjaHVua1NpemUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uRnJhbWVzID0gXy5jaHVuayhhbmltYXRpb25GcmFtZXMsIDEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCA8IDI1KSB7XHJcbiAgICAgICAgICAgICAgICBhbmltYXRpb25EZWxheSA9IDUwO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPj0gMjUgJiYgYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCA8IDUwKSB7XHJcbiAgICAgICAgICAgICAgICBhbmltYXRpb25EZWxheSA9IDI1O1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggPj0gNTAgJiYgYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCA8IDEwMCkge1xyXG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uRGVsYXkgPSAxMDtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChhbmltYXRpb25GcmFtZXMubGVuZ3RoID49IDEwMCAmJiBhbmltYXRpb25GcmFtZXMubGVuZ3RoIDwgMjAwKSB7XHJcbiAgICAgICAgICAgICAgICBhbmltYXRpb25EZWxheSA9IDU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBhbmltYXRpb25EZWxheSA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhbmltYXRpb25GcmFtZXMubGVuZ3RoID4gMCAmJiAhaXNBbmltYXRpbmcgJiYgYW5pbWF0ZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gcHJldmlvdXMgYW5pbWF0aW9uRnJhbWVzIGhhZCBubyBsZW5ndGgsIHNvIGluaXQgYW5pbWF0aW9uXHJcbiAgICAgICAgICAgICAgICBhbmltYXRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZ2VuZXJhdGVJbWFnZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgYW5pbWF0aW9uIGltYWdlIGFycmF5IGluIGEgd2ViIHdvcmtlciB0byBhdm9pZCBibG9ja2luZyB0aGUgVUlcclxuICAgICAgICAgICAgaW1hZ2VXb3JrZXIgPSBXZWJ3b3JrZXIuY3JlYXRlKGNyZWF0ZUltYWdlQXJyKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHN0YXJ0IHRoZSB3ZWIgd29ya2VyIGFuZCB3YWl0IGZvciB0aGUgcmVzdWx0XHJcbiAgICAgICAgICAgIGltYWdlV29ya2VyLnJ1bihpbWFnZVJlc3VsdHMsIGNvcnJlbGF0aW5nRGF0ZURpZmYpLnRoZW4oZnVuY3Rpb24gKGltYWdlQXJycykge1xyXG4gICAgICAgICAgICAgICAgLy8gZ3JvdXAgaW1hZ2UgYXJyYXlzIGJ5IHNlbnNvciB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgaW1hZ2VBcnJzID0gXy5ncm91cEJ5KGltYWdlQXJycywgJ3NlbnNvcicpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGluaXQgdmFycyB1c2VkIGluc2lkZSBhbmltYXRlIGZ1bmN0aW9uXHJcbiAgICAgICAgICAgICAgICB2YXIgZnJhbWVJbWFnZXMgPSBfLmZsYXR0ZW4oXy52YWx1ZXMoaW1hZ2VBcnJzKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZnJhbWVJZHggPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhcnJheSBvZiBhbGwgcG9pbnRzIGluIGltYWdlQXJyc1xyXG4gICAgICAgICAgICAgICAgZnJhbWVzID0gXy5tYXAoY2hhcnREYXRhLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gXy5rZXlzKGQpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5zb3IgPSBfLmZpbmQoa2V5cywgZnVuY3Rpb24gKGspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBrICE9PSAnaXNDb3JyZWxhdGlvbicgJiYgayAhPT0gJ3RpbWUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGQudGltZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6ICdmcmFtZS1saW5lIHRpbWUtJyArIF8ucmVwbGFjZShkLnRpbWUsICcuJywgJycpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5zb3I6IHNlbnNvclxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZnJhbWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBzb3J0IGJ5IHZhbHVlICh0aW1lKSBhbmQgZHJhdyBwbGF5YmFjayBsaW5lcyB1c2luZyBDMyB4Z3JpZHMgYXBpXHJcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVzID0gXy5zb3J0QnkoZnJhbWVzLCAndmFsdWUnKTtcclxuICAgICAgICAgICAgICAgICAgICBjaGFydC54Z3JpZHMoZnJhbWVzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSBhbmltYXRlIGZyYW1lcyBmb3Igc2VsZWN0ZWQgc2Vuc29yXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlQW5pbWF0aW9uRnJhbWVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkcmF3SW1hZ2UgPSBmdW5jdGlvbiAoY3R4LCBjYW52YXMsIGltYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNsZWFyIHByZXZpb3VzIGRyYXdpbmdcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHdpZHRoIGFuZCBoZWlnaHQgdG8gbWF0Y2ggaW1hZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBpbWFnZS5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5jYW52YXMud2lkdGggPSBpbWFnZS53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCBhIHBvaW50ZXIgdG8gdGhlIGN1cnJlbnQgbG9jYXRpb24gaW4gdGhlIGltYWdlLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFsZXR0ZSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTsgLy94LHksdyxoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdyYXAgeW91ciBhcnJheSBhcyBhIFVpbnQ4QXJyYXlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFsZXR0ZS5kYXRhLnNldChuZXcgVWludDhBcnJheShpbWFnZS52YWx1ZXMpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVwb3N0IHRoZSBkYXRhLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHgucHV0SW1hZ2VEYXRhKHBhbGV0dGUsIDAsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhbmltYXRlSW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZHJhdyB0aGUgaW5pdGlhbCBpbWFnZSBmb3IgZWFjaCBjaGlwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChfLnZhbHVlcyhpbWFnZUFycnMpLCBmdW5jdGlvbiAoaW1hZ2VBcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBhbmd1bGFyLmVsZW1lbnQoJy4nICsgXy5yZXBsYWNlKGltYWdlQXJyWzBdLnNlbnNvciwgJyAnLCAnJykpWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYXdJbWFnZShjdHgsIGNhbnZhcywgaW1hZ2VBcnJbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlSW5pdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQW5pbWF0aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhpZGUgcHJldmlvdXMgZ3JpZCBsaW5lIGlmIGRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydEdyaWRMaW5lRWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydEdyaWRMaW5lRWwuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdG9wR3JpZExpbmVFbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BHcmlkTGluZUVsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgZ3JpZCBsaW5lIGFzc29jaWF0ZWQgd2l0aCBjdXJyZW50IGZyYW1lIGFuZCBzaG93IGl0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydEdyaWRMaW5lRWwgPSBhbmd1bGFyLmVsZW1lbnQoJy50aW1lLScgKyBfLnJlcGxhY2UoYW5pbWF0aW9uRnJhbWVzW2ZyYW1lSWR4XVswXS52YWx1ZSwgJy4nLCAnJykpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcEdyaWRMaW5lRWwgPSBhbmd1bGFyLmVsZW1lbnQoJy50aW1lLScgKyBfLnJlcGxhY2UoYW5pbWF0aW9uRnJhbWVzW2ZyYW1lSWR4XVthbmltYXRpb25GcmFtZXNbZnJhbWVJZHhdLmxlbmd0aCAtIDFdLnZhbHVlLCAnLicsICcnKSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnJhbWVJZHggPj0gY29ycmVsYXRpbmdGcmFtZXMubGVuZ3RoIC0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdG9wR3JpZExpbmVFbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9wR3JpZExpbmVFbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydEdyaWRMaW5lRWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRHcmlkTGluZUVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkcmF3IGltYWdlcyBmb3IgdGhlIGN1cnJlbnQgZnJhbWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChhbmltYXRpb25GcmFtZXNbZnJhbWVJZHhdLCBmdW5jdGlvbiAoY3VyckZyYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZyYW1lSW1hZ2UgPSBfLmZpbmQoZnJhbWVJbWFnZXMsIHsgdGltZXN0YW1wOiBjdXJyRnJhbWUudmFsdWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSW1hZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbnZhcyA9IGFuZ3VsYXIuZWxlbWVudCgnLicgKyBfLnJlcGxhY2UoZnJhbWVJbWFnZS5zZW5zb3IsICcgJywgJycpKVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZHJhdyB0aGUgY3VycmVudCBmcmFtZSdzIGltYWdlIG9uIHRoZSBhcHByb3ByaWF0ZSBjYW52YXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhd0ltYWdlKGN0eCwgY2FudmFzLCBmcmFtZUltYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhZGp1c3QgY3VyckZyYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodm0ucGxheWJhY2tEaXJlY3Rpb24gPT09ICdmb3J3YXJkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmcmFtZUlkeCA8IGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZUluaXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSWR4ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4ID0gYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlY3Vyc2l2ZWx5IGNhbGwgZnVuY3Rpb24uIGFkanVzdCB0aW1lb3V0IGRlbGF5IHRvIGNoYW5nZSBhbmltYXRpb24gcmF0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnBsYXliYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5pbWF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgYW5pbWF0aW9uRGVsYXkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNBbmltYXRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdBbmltYXRpb24gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGdlbmVyYXRlQ29ycmVsYXRpbmdJbWFnZXMgPSBmdW5jdGlvbiAoY3VyckZyYW1lSWR4KSB7XHJcbiAgICAgICAgICAgIGZyYW1lSWR4ID0gY3VyckZyYW1lSWR4ICE9PSBudWxsICYmIHR5cGVvZiBjdXJyRnJhbWVJZHggIT09ICd1bmRlZmluZWQnID8gY3VyckZyYW1lSWR4IDogZnJhbWVJZHg7XHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgYW5pbWF0aW9uIGltYWdlIGFycmF5IGluIGEgd2ViIHdvcmtlciB0byBhdm9pZCBibG9ja2luZyB0aGUgVUlcclxuICAgICAgICAgICAgY29ycmVsYXRpbmdJbWFnZVdvcmtlciA9IFdlYndvcmtlci5jcmVhdGUoY3JlYXRlSW1hZ2VBcnIpO1xyXG4gICAgICAgICAgICBfLmZvckVhY2goY29ycmVsYXRpbmdJbWFnZVJlc3VsdHMsIGZ1bmN0aW9uIChpbWFnZVJlc3VsdHMpIHtcclxuICAgICAgICAgICAgICAgIGltYWdlUmVzdWx0cy5yZXN1bHRzID0gXy5mbGF0TWFwKGltYWdlUmVzdWx0cy5yZXN1bHRzLCBmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmlzQ29ycmVsYXRpb24gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nSW1hZ2VSZXN1bHRzID0gY29ycmVsYXRpbmdJbWFnZVJlc3VsdHMuY29uY2F0KGltYWdlUmVzdWx0cyk7XHJcblxyXG4gICAgICAgICAgICAvLyBzdGFydCB0aGUgd2ViIHdvcmtlciBhbmQgd2FpdCBmb3IgdGhlIHJlc3VsdFxyXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ltYWdlV29ya2VyLnJ1bihjb3JyZWxhdGluZ0ltYWdlUmVzdWx0cywgY29ycmVsYXRpbmdEYXRlRGlmZikudGhlbihmdW5jdGlvbiAoaW1hZ2VBcnJzKSB7XHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goaW1hZ2VBcnJzLCBmdW5jdGlvbiAoYXJyLCBpZHgpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJyLmlzQ29ycmVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VBcnJzW2lkeF0uc2Vuc29yID0gYXJyLnNlbnNvciArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWFnZUFycnNbaWR4XS5zZW5zb3IgPSBhcnIuc2Vuc29yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VBcnJzW2lkeF0uc2Vuc29yID0gYXJyLnNlbnNvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlQXJyc1tpZHhdLnNlbnNvciA9IGFyci5zZW5zb3IgKyBkZWx0YUNvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAvLyBncm91cCBpbWFnZSBhcnJheXMgYnkgc2Vuc29yIHZhbHVlXHJcbiAgICAgICAgICAgICAgICBpbWFnZUFycnMgPSBfLmdyb3VwQnkoaW1hZ2VBcnJzLCAnc2Vuc29yJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaW5pdCB2YXJzIHVzZWQgaW5zaWRlIGFuaW1hdGUgZnVuY3Rpb25cclxuICAgICAgICAgICAgICAgIHZhciBmcmFtZUltYWdlcyA9IF8uZmxhdHRlbihfLnZhbHVlcyhpbWFnZUFycnMpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFycmF5IG9mIGFsbCBwb2ludHMgaW4gaW1hZ2VBcnJzXHJcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lcyA9IF8ubWFwKGNoYXJ0RGF0YSwgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9IF8ua2V5cyhkKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vuc29yID0gXy5maW5kKGtleXMsIGZ1bmN0aW9uIChrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gayAhPT0gJ2lzQ29ycmVsYXRpb24nICYmIGsgIT09ICd0aW1lJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBkLnRpbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOiAnZnJhbWUtbGluZSB0aW1lLScgKyBfLnJlcGxhY2UoZC50aW1lLCAnLicsICcnKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vuc29yOiBzZW5zb3JcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNvcnJlbGF0aW5nRnJhbWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBzb3J0IGJ5IHZhbHVlICh0aW1lKSBhbmQgZHJhdyBwbGF5YmFjayBsaW5lcyB1c2luZyBDMyB4Z3JpZHMgYXBpXHJcbiAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZXMgPSBfLnNvcnRCeShjb3JyZWxhdGluZ0ZyYW1lcywgJ3ZhbHVlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhcnQueGdyaWRzKGNvcnJlbGF0aW5nRnJhbWVzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSBhbmltYXRlIGZyYW1lcyBmb3Igc2VsZWN0ZWQgc2Vuc29yXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlQW5pbWF0aW9uRnJhbWVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkcmF3SW1hZ2UgPSBmdW5jdGlvbiAoY3R4LCBjYW52YXMsIGltYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNsZWFyIHByZXZpb3VzIGRyYXdpbmdcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHdpZHRoIGFuZCBoZWlnaHQgdG8gbWF0Y2ggaW1hZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBpbWFnZS5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5jYW52YXMud2lkdGggPSBpbWFnZS53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCBhIHBvaW50ZXIgdG8gdGhlIGN1cnJlbnQgbG9jYXRpb24gaW4gdGhlIGltYWdlLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFsZXR0ZSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTsgLy94LHksdyxoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdyYXAgeW91ciBhcnJheSBhcyBhIFVpbnQ4QXJyYXlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFsZXR0ZS5kYXRhLnNldChuZXcgVWludDhBcnJheShpbWFnZS52YWx1ZXMpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVwb3N0IHRoZSBkYXRhLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHgucHV0SW1hZ2VEYXRhKHBhbGV0dGUsIDAsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhbmltYXRlSW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZHJhdyB0aGUgaW5pdGlhbCBpbWFnZSBmb3IgZWFjaCBjaGlwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChfLnZhbHVlcyhpbWFnZUFycnMpLCBmdW5jdGlvbiAoaW1hZ2VBcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBhbmd1bGFyLmVsZW1lbnQoJy4nICsgXy5yZXBsYWNlKGltYWdlQXJyWzBdLnNlbnNvciwgJyAnLCAnJykpWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYXdJbWFnZShjdHgsIGNhbnZhcywgaW1hZ2VBcnJbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlSW5pdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQW5pbWF0aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhpZGUgcHJldmlvdXMgZ3JpZCBsaW5lIGlmIGRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydEdyaWRMaW5lRWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydEdyaWRMaW5lRWwuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdG9wR3JpZExpbmVFbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BHcmlkTGluZUVsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgZ3JpZCBsaW5lIGFzc29jaWF0ZWQgd2l0aCBjdXJyZW50IGZyYW1lIGFuZCBzaG93IGl0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydEdyaWRMaW5lRWwgPSBhbmd1bGFyLmVsZW1lbnQoJy50aW1lLScgKyBfLnJlcGxhY2UoYW5pbWF0aW9uRnJhbWVzW2ZyYW1lSWR4XVswXS52YWx1ZSwgJy4nLCAnJykpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcEdyaWRMaW5lRWwgPSBhbmd1bGFyLmVsZW1lbnQoJy50aW1lLScgKyBfLnJlcGxhY2UoYW5pbWF0aW9uRnJhbWVzW2ZyYW1lSWR4XVthbmltYXRpb25GcmFtZXNbZnJhbWVJZHhdLmxlbmd0aCAtIDFdLnZhbHVlLCAnLicsICcnKSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnRHcmlkTGluZUVsICYmIHN0b3BHcmlkTGluZUVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSWR4ID49IGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggLSAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BHcmlkTGluZUVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0R3JpZExpbmVFbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZHJhdyBpbWFnZXMgZm9yIHRoZSBjdXJyZW50IGZyYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goYW5pbWF0aW9uRnJhbWVzW2ZyYW1lSWR4XSwgZnVuY3Rpb24gKGN1cnJGcmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUltYWdlID0gXy5maWx0ZXIoZnJhbWVJbWFnZXMsIHsgdGltZXN0YW1wOiBjdXJyRnJhbWUudmFsdWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSW1hZ2UubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goZnJhbWVJbWFnZSwgZnVuY3Rpb24gKGltYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FudmFzID0gYW5ndWxhci5lbGVtZW50KCcuJyArIF8ucmVwbGFjZShpbWFnZS5zZW5zb3IsICcgJywgJycpKVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkcmF3IHRoZSBjdXJyZW50IGZyYW1lJ3MgaW1hZ2Ugb24gdGhlIGFwcHJvcHJpYXRlIGNhbnZhc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhd0ltYWdlKGN0eCwgY2FudmFzLCBpbWFnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFkanVzdCBjdXJyRnJhbWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5wbGF5YmFja0RpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSWR4IDwgYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHgrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlSW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnJhbWVJZHggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHggPSBhbmltYXRpb25GcmFtZXMubGVuZ3RoIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVjdXJzaXZlbHkgY2FsbCBmdW5jdGlvbi4gYWRqdXN0IHRpbWVvdXQgZGVsYXkgdG8gY2hhbmdlIGFuaW1hdGlvbiByYXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodm0ucGxheWJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbmltYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBhbmltYXRpb25EZWxheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0FuaW1hdGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZ0FuaW1hdGlvbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZ2VuZXJhdGVFdmVudERhdGEgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgY2hhcnQgZGF0YSBhcnJheSBpbiBhIHdlYiB3b3JrZXIgdG8gYXZvaWQgYmxvY2tpbmcgdGhlIFVJXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNyZWF0ZUNoYXJ0RGF0YSAoZXZlbnRQbG90UmVzdWx0cywgaWRlbnRpdHksIGhhc0NvcnJlbGF0aW9uLCBjb3JyZWxhdGluZ0RhdGVEaWZmLCBleHRlcm5hbFNvdXJjZUxhYmVsKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY2hhcnREYXRhQXJyID0gW10sXHJcbiAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdDaGFydERhdGFBcnIgPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICBldmVudFBsb3RSZXN1bHRzLnJlc3VsdHMuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnRQbG90UmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGNvbnZlbnRpb24gZm9yIGEgcG9pbnQgaXMgYSA0IGl0ZW0gYXJyYXkgW3RpbWUsIHNlbnNvciBpbmRleCwgb2JqZWN0IGluZGV4LCBpbnRlbnNpdHldXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRQbG90UmVzdWx0LnBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwb2ludCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcG9pbnREYXRhID0ge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludFZhbHVlID0gcG9pbnRbM107XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdG9yZSBhIHZhbHVlIHRvIGluZGljYXRlIHdoZXRoZXIgdGhpcyBwb2ludCBiZWxvbmdzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGNvcnJlbGF0ZWQgZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludERhdGEuaXNDb3JyZWxhdGlvbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWx3YXlzIHVzZSB0aGUgZ2l2ZW4gdGltZSB2YWx1ZSBmb3IgdGhlIHNlbGVjdGVkIGV2ZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50RGF0YS50aW1lID0gcG9pbnRbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNDb3JyZWxhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGlkZW50aXR5IHZhbHVlIHRlbGxzIHlvdSB0aGUgc291cmNlIG9mIHRoZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VsZWN0ZWQgZXZlbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZGVudGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnREYXRhW2V2ZW50UGxvdFJlc3VsdC5zZW5zb3JzW3BvaW50WzFdXV0gPSBwb2ludFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGVtXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnREYXRhW2V2ZW50UGxvdFJlc3VsdC5zZW5zb3JzW3BvaW50WzFdXSArIGV4dGVybmFsU291cmNlTGFiZWxdID0gcG9pbnRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50RGF0YVtldmVudFBsb3RSZXN1bHQuc2Vuc29yc1twb2ludFsxXV1dID0gcG9pbnRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFydERhdGFBcnIucHVzaChwb2ludERhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZXZlbnRQbG90UmVzdWx0cy5jb3JyZWxhdGluZ1Jlc3VsdHMuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnRQbG90UmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGNvbnZlbnRpb24gZm9yIGEgcG9pbnQgaXMgYSA0IGl0ZW0gYXJyYXkgW3RpbWUsIHNlbnNvciBpbmRleCwgb2JqZWN0IGluZGV4LCBpbnRlbnNpdHldXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRQbG90UmVzdWx0LnBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwb2ludCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcG9pbnREYXRhID0ge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludFZhbHVlID0gcG9pbnRbM107XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdG9yZSBhIHZhbHVlIHRvIGluZGljYXRlIHdoZXRoZXIgdGhpcyBwb2ludCBiZWxvbmdzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGNvcnJlbGF0ZWQgZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludERhdGEuaXNDb3JyZWxhdGlvbiA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBub3JtYWxpemUgdGltZSB2YWx1ZXMgaWYgYSBkaWZmZXJlbmNlIGluIHN0YXJ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRhdGVzIGlzIHByZXNlbnQuIGNvcnJlbGF0aW5nRGF0ZURpZmYgd2lsbCBiZSBwb3NpdGl2ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3aGVuIHRoZSBjb3JyZWxhdGluZyBldmVudCBzdGFydGVkIHZhbHVlIGlzIGxhdGVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoYW4gdGhlIGV2ZW50IHN0YXJ0ZWQgdmFsdWUsIGFuZCB2aWNlIHZlcnNhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50RGF0YS50aW1lID0gY29ycmVsYXRpbmdEYXRlRGlmZiA/IHBvaW50WzBdIC0gY29ycmVsYXRpbmdEYXRlRGlmZiA6IHBvaW50WzBdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGlkZW50aXR5IHZhbHVlIHRlbGxzIHlvdSB0aGUgc291cmNlIG9mIHRoZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZWxlY3RlZCBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRlbnRpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50RGF0YVtldmVudFBsb3RSZXN1bHQuc2Vuc29yc1twb2ludFsxXV0gKyBleHRlcm5hbFNvdXJjZUxhYmVsXSA9IHBvaW50VmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludERhdGFbZXZlbnRQbG90UmVzdWx0LnNlbnNvcnNbcG9pbnRbMV1dXSA9IHBvaW50VmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdDaGFydERhdGFBcnIucHVzaChwb2ludERhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvcnJlbGF0aW5nQ2hhcnREYXRhQXJyLmxlbmd0aCA+IDAgPyBjaGFydERhdGFBcnIuY29uY2F0KGNvcnJlbGF0aW5nQ2hhcnREYXRhQXJyKSA6IGNoYXJ0RGF0YUFycjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gaW5zdGFudGlhdGUgdGhlIHdlYiB3b3JrZXJcclxuICAgICAgICAgICAgY2hhcnRXb3JrZXIgPSBXZWJ3b3JrZXIuY3JlYXRlKGNyZWF0ZUNoYXJ0RGF0YSk7XHJcblxyXG4gICAgICAgICAgICAvLyBzdGFydCB0aGUgd2ViIHdvcmtlciBhbmQgd2FpdCBmb3IgdGhlIHJlc3VsdFxyXG4gICAgICAgICAgICBjaGFydFdvcmtlci5ydW4ocGxvdFJlc3VsdHMsIHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSwgcGxvdFJlc3VsdHMuY29ycmVsYXRpbmdSZXN1bHRzLmxlbmd0aCA+IDAsIGNvcnJlbGF0aW5nRGF0ZURpZmYsIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwpLnRoZW4oZnVuY3Rpb24gKGNoYXJ0RGF0YUFycikge1xyXG4gICAgICAgICAgICAgICAgY2hhcnREYXRhID0gY2hhcnREYXRhQXJyO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvcnJlbGF0aW5nSW1hZ2VSZXN1bHRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUNvcnJlbGF0aW5nSW1hZ2VzKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlSW1hZ2VzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgc2Vuc29yQXJyID0gXy5zb3J0QnkoXy51bmlxKF8uZmxhdHRlbihfLm1hcChwbG90UmVzdWx0cy5yZXN1bHRzLCAnc2Vuc29ycycpKSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cEZvcm1hdCA9IGQzLmZvcm1hdCgnLjFlJyksXHJcbiAgICAgICAgICAgICAgICAgICAgbnVtRm9ybWF0ID0gZDMuZm9ybWF0KCduJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHBsb3RSZXN1bHRzLmNvcnJlbGF0aW5nUmVzdWx0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvcnJlbGF0aW5nU2Vuc29yQXJyID0gXy5zb3J0QnkoXy51bmlxKF8uZmxhdHRlbihfLm1hcChwbG90UmVzdWx0cy5jb3JyZWxhdGluZ1Jlc3VsdHMsICdzZW5zb3JzJykpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goY29ycmVsYXRpbmdTZW5zb3JBcnIsIGZ1bmN0aW9uIChzZW5zb3IsIGlkeCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdTZW5zb3JBcnJbaWR4XSA9IHNlbnNvciArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChzZW5zb3JBcnIsIGZ1bmN0aW9uIChzZW5zb3IsIGlkeCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vuc29yQXJyW2lkeF0gPSBzZW5zb3IgKyBkZWx0YUNvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgc2Vuc29yQXJyID0gc2Vuc29yQXJyLmNvbmNhdChjb3JyZWxhdGluZ1NlbnNvckFycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGRhdGFDb2xvcnMgPSB7fSxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2UwSWR4ID0gMCxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2UxSWR4ID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goc2Vuc29yQXJyLCBmdW5jdGlvbiAoc2Vuc29yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBsb3RSZXN1bHRzLmNvcnJlbGF0aW5nUmVzdWx0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNob3dpbmcgbXVsdGlwbGUgZXZlbnQgdHlwZXMsIHNvIGRldGVybWluZSBjb2xvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBiYXNlZCBvbiBjdXJyZW50IHNlbnNvciBuYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLmVuZHNXaXRoKHNlbnNvciwgZGVsdGFDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFDb2xvcnNbc2Vuc29yXSA9ICBfLmZpbmQoZGVsdGFDb25maWcuc291cmNlcywgeyBpZGVudGl0eTogZmFsc2UgfSkuY2hhcnRDb2xvcnNbc291cmNlMElkeF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UwSWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhQ29sb3JzW3NlbnNvcl0gPSAgXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IHRydWUgfSkuY2hhcnRDb2xvcnNbc291cmNlMUlkeF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UxSWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IHNob3dpbmcgb25lIGtpbmQgb2YgZXZlbnQsIHNvIGRldGVybWluZSBjb2xvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1c2luZyB2bS50cmFja0ZlYXR1cmUucHJvcGVydGllc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhQ29sb3JzW3NlbnNvcl0gPSBfLmZpbmQoZGVsdGFDb25maWcuc291cmNlcywgeyBpZGVudGl0eTogdm0udHJhY2tGZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdIH0pLmNoYXJ0Q29sb3JzW3NvdXJjZTBJZHhdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UwSWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gZ2VuZXJhdGUgdGltZS9pbnRlbnNpdHkgY2hhcnQgdXNpbmcgQzNcclxuICAgICAgICAgICAgICAgIGNoYXJ0ID0gYzMuZ2VuZXJhdGUoe1xyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbjogY2hhcnREYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiAndGltZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc2Vuc29yQXJyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yczogZGF0YUNvbG9yc1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2l6ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogdm0uZXZlbnRWaWV3ZXJXaWR0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2bS5ldmVudFZpZXdlckhlaWdodCAvIDJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiAxMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDMwXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sdGlwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGZ1bmN0aW9uICh4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHgudG9GaXhlZCgyKSArICcgc2Vjb25kcyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnBvdygxMCwgdmFsdWUpLnRvRml4ZWQoNikgKyAnICcgKyBwbG90UmVzdWx0cy5yZXN1bHRzWzBdLnlfY29sdW1uLnVuaXRzLmxhYmVsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBsaW5lOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3ROdWxsOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBheGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpY2s6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQudG9GaXhlZCgyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAnU2Vjb25kcyBzaW5jZSAnICsgbW9tZW50LnV0Yyh4U3RhcnRlZCkuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tOnNzW1pdJyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdvdXRlci1sZWZ0J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHBsb3RSZXN1bHRzICYmIHBsb3RSZXN1bHRzLnJlc3VsdHMgJiYgcGxvdFJlc3VsdHMucmVzdWx0cy5sZW5ndGggPiAwID8gcGxvdFJlc3VsdHMucmVzdWx0c1swXS55X2NvbHVtbi51bml0cy5sYWJlbCA6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnb3V0ZXItbWlkZGxlJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpY2s6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvcm1hdCBjdXN0b20gdGlja3MgZm9yIGxvZyBzY2FsZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdCA9IE1hdGguYWJzKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ID0gdCA8IDEgPyBNYXRoLnBvdygxMCwgdCkgOiBNYXRoLnJvdW5kKE1hdGgucG93KDEwLCB0KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQgPSBkIDwgMCA/IDEgLyB0IDogdDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0IDwgMC4wMDAwMSB8fCB0ID4gMTAwMDAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXhwRm9ybWF0KHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gbnVtRm9ybWF0KHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChyZXN1bHQpLnRvRml4ZWQoMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB6b29tOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9ucmVuZGVyZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NoYXJ0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGFydCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbG9yQXJyID0gXy50b1BhaXJzKGNoYXJ0LmRhdGEuY29sb3JzKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGNvbG9yQXJyLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYXJkID0gXy5maW5kKHZtLmV2ZW50SW1hZ2VDYXJkcywgZnVuY3Rpb24gKGMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGMuY2hhcnRJZCA9PT0gZFswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FyZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXJkLmNvbG9yID0gZFsxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb3JyZWxhdGluZ0NhcmQgPSBfLmZpbmQodm0uY29ycmVsYXRpbmdFdmVudEltYWdlQ2FyZHMsIGZ1bmN0aW9uIChjYykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2MuY2hhcnRJZCA9PT0gZFswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29ycmVsYXRpbmdDYXJkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nQ2FyZC5jb2xvciA9IGRbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9ubW91c2VvdXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhcnQuZm9jdXMoY2hhcnRGb2N1cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB2bS5zZXRBY3RpdmVJbWFnZUNhcmQoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGNhc3RWb3RlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2b3RlU2VydmljZS5jYXN0Vm90ZSh2bS52b3RlT2JqKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIHZtLnZvdGVPYmogPSBWb3RlLnRyYW5zZm9ybWVyKHJlc3VsdC5kYXRhKTtcclxuICAgICAgICAgICAgICAgIHZtLnZvdGVzLnB1c2godm0udm90ZU9iaik7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZXModm0udm90ZXMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1Vwdm90ZSByZWNvcmRlZCcpLnRoZW1lKCdzdWNjZXNzLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRG93bnZvdGUgcmVjb3JkZWQgKCcgKyB2bS52b3RlT2JqLnJlYXNvbiArICcpJykudGhlbWUoJ2ZhaWwtdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgICAgIHZtLnZvdGVPYmoudm90ZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciBTdWJtaXR0aW5nIFZvdGUnKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciB1cGRhdGVWb3RlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2b3RlU2VydmljZS51cGRhdGVWb3RlKHZtLnZvdGVPYmopLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgLy8gbG9vayBmb3IgZXhpc3Rpbmcgdm90ZSBmb3IgdGhpcyBldmVudFxyXG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50Vm90ZSA9IF8uZmluZCh2bS52b3RlcywgeyBkYXRhc2V0X2lkOiB2bS52b3RlT2JqLmRhdGFzZXRfaWQsIHByb2R1Y3RfaWQ6IHZtLnZvdGVPYmoucHJvZHVjdF9pZCB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChldmVudFZvdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudFZvdGUudm90ZSA9IHZtLnZvdGVPYmoudm90ZTtcclxuICAgICAgICAgICAgICAgICAgICBldmVudFZvdGUucmVhc29uID0gdm0udm90ZU9iai5yZWFzb247XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVzKHZtLnZvdGVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdVcHZvdGUgcmVjb3JkZWQnKS50aGVtZSgnc3VjY2Vzcy10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Rvd252b3RlIHJlY29yZGVkICgnICsgdm0udm90ZU9iai5yZWFzb24gKyAnKScpLnRoZW1lKCdmYWlsLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB2bS52b3RlT2JqLnZvdGUgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgU3VibWl0dGluZyBWb3RlJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZ2V0Q29ycmVsYXRpbmdFdmVudHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRDb3JyZWxhdGluZ0V2ZW50cyh2bS50cmFja0ZlYXR1cmUpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NoYXJ0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB2bS5ldmVudEVycm9yID0gZXJyb3Iuc3RhdHVzID4gLTEgPyBlcnJvci5zdGF0dXMgKyAnOiAnICsgZXJyb3Iuc3RhdHVzVGV4dCA6ICdDb25uZWN0aW9uIGVycm9yOyB1bmFibGUgdG8gcmV0cmlldmUgY29ycmVsYXRpbmcgZXZlbnRzLic7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBnZXRQbG90RGF0YSA9IGZ1bmN0aW9uIChmaWxlUGF0aCwgaXNDb3JyZWxhdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0RXZlbnRQbG90RGF0YSh7IHVybDogZmlsZVBhdGggfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNDb3JyZWxhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShjb3JyZWxhdGluZ1Bsb3RSZXN1bHRzLnB1c2gocmVzdWx0KSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShwbG90UmVzdWx0c0Fyci5wdXNoKHJlc3VsdCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdDaGFydCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdm0uZXZlbnRFcnJvciA9IGVycm9yLnN0YXR1cyA+IC0xID8gZXJyb3Iuc3RhdHVzICsgJzogJyArIGVycm9yLnN0YXR1c1RleHQgOiAnQ29ubmVjdGlvbiBlcnJvcjsgdW5hYmxlIHRvIHJldHJpZXZlIHBsb3QgZGF0YS4nO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZ2V0SW1hZ2VEYXRhID0gZnVuY3Rpb24gKGZpbGVQYXRoLCBpc0NvcnJlbGF0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRFdmVudEltYWdlRGF0YSh7IHVybDogZmlsZVBhdGggfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNDb3JyZWxhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShjb3JyZWxhdGluZ0ltYWdlUmVzdWx0cy5wdXNoKHJlc3VsdCkpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUoaW1hZ2VSZXN1bHRzLnB1c2gocmVzdWx0KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NoYXJ0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB2bS5ldmVudEVycm9yID0gZXJyb3Iuc3RhdHVzID4gLTEgPyBlcnJvci5zdGF0dXMgKyAnOiAnICsgZXJyb3Iuc3RhdHVzVGV4dCA6ICdDb25uZWN0aW9uIGVycm9yOyB1bmFibGUgdG8gcmV0cmlldmUgaW1hZ2UgZGF0YS4nO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgaW5pdEV2ZW50RGF0YSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGV2ZW50U3RhcnRlZCA9IF8ubWFwKHBsb3RSZXN1bHRzLnJlc3VsdHMsICdzdGFydGVkJyksXHJcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0V2ZW50U3RhcnRlZCA9IF8ubWFwKHBsb3RSZXN1bHRzLmNvcnJlbGF0aW5nUmVzdWx0cywgJ3N0YXJ0ZWQnKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChldmVudFN0YXJ0ZWQubGVuZ3RoID4gMCAmJiBjb3JyZWxhdGluZ0V2ZW50U3RhcnRlZC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBmaWd1cmUgb3V0IHRoZSBkaWZmZXJlbmNlLCBpZiBhbnksIGJldHdlZW4gdGhlXHJcbiAgICAgICAgICAgICAgICAvLyBzdGFydCBkYXRlc1xyXG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50TW9tZW50ID0gbW9tZW50KGV2ZW50U3RhcnRlZFswXSksXHJcbiAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdFdmVudE1vbWVudCA9IG1vbWVudChjb3JyZWxhdGluZ0V2ZW50U3RhcnRlZFswXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29ycmVsYXRpbmdEYXRlRGlmZiA9IGV2ZW50TW9tZW50LmRpZmYoY29ycmVsYXRpbmdFdmVudE1vbWVudCwgJ3MnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8geCBheGlzIHZhbHVlcyBhcmUgdGhlIHNhbWUgZm9yIGFsbCBwbG90IHJlc3VsdHMsIHNvXHJcbiAgICAgICAgICAgIC8vIHNldCB1cCB0aGUgZXh0ZW50cyB1c2luZyB0aGUgZmlyc3QgYXZhaWxhYmxlIHZhbHVlXHJcbiAgICAgICAgICAgIHhTdGFydGVkID0gcGxvdFJlc3VsdHMgJiYgcGxvdFJlc3VsdHMucmVzdWx0cyAmJiBwbG90UmVzdWx0cy5yZXN1bHRzLmxlbmd0aCA+IDAgPyBwbG90UmVzdWx0cy5yZXN1bHRzWzBdLnN0YXJ0ZWQgOiAnJztcclxuXHJcbiAgICAgICAgICAgIC8vIGZsYXR0ZW4gaW1hZ2VSZXN1bHRzIGFuZCBncm91cCBieSBzZW5zb3IsIHRoZW4gY29udmVydFxyXG4gICAgICAgICAgICAvLyB0byBwYWlycyBzbyB0aGUgdGVtcGxhdGUga25vd3MgaG93IG1hbnkgaW1hZ2UgY2FyZHNcclxuICAgICAgICAgICAgLy8gdG8gZGlzcGxheSBhbmQgd2hhdCB0aGVpciBsYWJlbHMgc2hvdWxkIGJlXHJcbiAgICAgICAgICAgIHZhciBpbWFnZUNhcmRzID0gXy50b1BhaXJzKF8uZ3JvdXBCeShfLmZsYXR0ZW4oXy5tYXAoaW1hZ2VSZXN1bHRzLCAncmVzdWx0cycpKSwgJ3NlbnNvcicpKTtcclxuICAgICAgICAgICAgdm0uZXZlbnRJbWFnZUNhcmRzID0gXy5tYXAoaW1hZ2VDYXJkcywgZnVuY3Rpb24gKGNhcmQsIGlkeCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNhbnZhc0NsYXNzID0gJycsXHJcbiAgICAgICAgICAgICAgICAgICAgY2hhcnRJZCA9ICcnO1xyXG4gICAgICAgICAgICAgICAgaWYgKGhhc0NvcnJlbGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FudmFzQ2xhc3MgPSB2bS50cmFja0ZlYXR1cmUucHJvcGVydGllc1t2bS5kZWx0YUNvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0gPyBfLnJlcGxhY2UoY2FyZFswXSwgJyAnLCAnJykgOiBfLnJlcGxhY2UoY2FyZFswXSwgJyAnLCAnJykgKyBkZWx0YUNvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsO1xyXG4gICAgICAgICAgICAgICAgICAgIGNoYXJ0SWQgPSB2bS50cmFja0ZlYXR1cmUucHJvcGVydGllc1t2bS5kZWx0YUNvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0gPyBjYXJkWzBdIDogY2FyZFswXSArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWw7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbnZhc0NsYXNzID0gXy5yZXBsYWNlKGNhcmRbMF0sICcgJywgJycpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNoYXJ0SWQgPSBjYXJkWzBdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBzZW5zb3I6IGNhcmRbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VzOiBjYXJkWzFdLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogaWR4ID09PSAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBjYW52YXNDbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICBjaGFydElkOiBjaGFydElkXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdm0uYWN0aXZlSW1hZ2VDYXJkID0gdm0uZXZlbnRJbWFnZUNhcmRzWzBdO1xyXG4gICAgICAgICAgICB2bS5hdmFpbGFibGVJbWFnZUNhcmRzID0gXy5jbG9uZURlZXAodm0uZXZlbnRJbWFnZUNhcmRzKTtcclxuICAgICAgICAgICAgdm0uc2VsZWN0ZWRJbWFnZUNhcmQgPSB2bS5hdmFpbGFibGVJbWFnZUNhcmRzWzBdO1xyXG5cclxuICAgICAgICAgICAgaWYgKGhhc0NvcnJlbGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY29ycmVsYXRpbmdJbWFnZUNhcmRzID0gXy50b1BhaXJzKF8uZ3JvdXBCeShfLmZsYXR0ZW4oXy5tYXAoY29ycmVsYXRpbmdJbWFnZVJlc3VsdHMsICdyZXN1bHRzJykpLCAnc2Vuc29yJykpO1xyXG4gICAgICAgICAgICAgICAgdm0uY29ycmVsYXRpbmdFdmVudEltYWdlQ2FyZHMgPSBfLm1hcChjb3JyZWxhdGluZ0ltYWdlQ2FyZHMsIGZ1bmN0aW9uIChjYXJkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vuc29yOiBjYXJkWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWFnZXM6IGNhcmRbMV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogY2FyZFswXSA9PT0gdm0uYWN0aXZlSW1hZ2VDYXJkLnNlbnNvcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6IHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW3ZtLmRlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSA/IF8ucmVwbGFjZShjYXJkWzBdLCAnICcsICcnKSArIGRlbHRhQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwgOiBfLnJlcGxhY2UoY2FyZFswXSwgJyAnLCAnJyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJ0SWQ6IHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzW3ZtLmRlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSA/IGNhcmRbMF0gKyBkZWx0YUNvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsIDogY2FyZFswXVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHZtLmFjdGl2ZUNvcnJlbGF0aW5nSW1hZ2VDYXJkID0gXy5maW5kKHZtLmNvcnJlbGF0aW5nRXZlbnRJbWFnZUNhcmRzLCB7IHNlbnNvcjogdm0uYWN0aXZlSW1hZ2VDYXJkLnNlbnNvciB9KTtcclxuICAgICAgICAgICAgICAgIHZtLmF2YWlsYWJsZUltYWdlQ2FyZHMgPSBfLnVuaXFCeSh2bS5hdmFpbGFibGVJbWFnZUNhcmRzLmNvbmNhdCh2bS5jb3JyZWxhdGluZ0V2ZW50SW1hZ2VDYXJkcyksICdzZW5zb3InKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gZ2VuZXJhdGUgdGhlIGNoYXJ0IGFuZCBpbWFnZXNcclxuICAgICAgICAgICAgZ2VuZXJhdGVFdmVudERhdGEoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEV2ZW50RGF0YShudWxsKTtcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZUV2ZW50KG51bGwpO1xyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnREYXRhKG51bGwpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZtLnZvdGVVcEJ0bkNvbG9yID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAodm0udm90ZU9iai52b3RlID09PSBudWxsIHx8IHZtLnZvdGVPYmoudm90ZSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmVlbi03MDAnO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleS03MDAnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0udm90ZURvd25CdG5Db2xvciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gbnVsbCB8fCB2bS52b3RlT2JqLnZvdGUgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3JlZC03MDAnO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5LTcwMCc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5vcGVuTWVudSA9IGZ1bmN0aW9uICgkbWRPcGVuTWVudSwgZXYpIHtcclxuICAgICAgICAgICAgJG1kT3Blbk1lbnUoZXYpO1xyXG4gICAgICAgIH07XHJcblxyXG5cdFx0dm0uc2hvd01ldGFkYXRhID0gZnVuY3Rpb24oZXYsIGV2TWV0YWRhdGFzKSB7XHJcblx0XHRcdCRtZERpYWxvZy5zaG93KHtcclxuXHRcdFx0XHRcdGNsaWNrT3V0c2lkZVRvQ2xvc2U6IHRydWUsXHJcblx0XHRcdFx0XHRjb250cm9sbGVyOiAnbWV0YWRhdGFEaWFsb2dDb250cm9sbGVyJyxcclxuXHRcdFx0XHRcdHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2V2ZW50Vmlld2VyL21ldGFkYXRhRGlhbG9nVGVtcGxhdGUuaHRtbCcsXHJcblx0XHRcdFx0XHR0YXJnZXRFdmVudDogZXYsXHJcblx0XHRcdFx0XHRsb2NhbHM6IHtcclxuXHRcdFx0XHRcdFx0ZXZlbnRNZXRhZGF0YXM6IGV2TWV0YWRhdGFzXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0udm90ZVVwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2bS52b3RlT2JqLnZvdGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB2bS52b3RlT2JqLnJlYXNvbiA9ICcnO1xyXG4gICAgICAgICAgICBpZiAodm0udm90ZU9iai52b3RlX2lkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyB2b3RlIGhhcyBhbHJlYWR5IGJlZW4gY2FzdCwgc28gdXBkYXRlIGluc3RlYWRcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVZvdGUoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIG5ldyB2b3RlXHJcbiAgICAgICAgICAgICAgICBjYXN0Vm90ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0udm90ZURvd24gPSBmdW5jdGlvbiAocmVhc29uKSB7XHJcbiAgICAgICAgICAgIHZtLnZvdGVPYmoudm90ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB2bS52b3RlT2JqLnJlYXNvbiA9IHJlYXNvbjtcclxuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZV9pZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gdm90ZSBoYXMgYWxyZWFkeSBiZWVuIGNhc3QsIHNvIHVwZGF0ZSBpbnN0ZWFkXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVWb3RlKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBuZXcgdm90ZVxyXG4gICAgICAgICAgICAgICAgY2FzdFZvdGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZtLnNldEFjdGl2ZUltYWdlQ2FyZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGN1cnJBY3RpdmVJbWFnZUNhcmQgPSBfLmZpbmQodm0uZXZlbnRJbWFnZUNhcmRzLCB7IGFjdGl2ZTogdHJ1ZSB9KSxcclxuICAgICAgICAgICAgICAgIGN1cnJBY3RpdmVDb3JyZWxhdGluZ0ltYWdlQ2FyZCA9IF8uZmluZCh2bS5jb3JyZWxhdGluZ0V2ZW50SW1hZ2VDYXJkcywgeyBhY3RpdmU6IHRydWUgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoY3VyckFjdGl2ZUltYWdlQ2FyZCkge1xyXG4gICAgICAgICAgICAgICAgY3VyckFjdGl2ZUltYWdlQ2FyZC5hY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoY3VyckFjdGl2ZUNvcnJlbGF0aW5nSW1hZ2VDYXJkKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyQWN0aXZlQ29ycmVsYXRpbmdJbWFnZUNhcmQuYWN0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZtLmFjdGl2ZUltYWdlQ2FyZCA9IF8uZmluZCh2bS5ldmVudEltYWdlQ2FyZHMsIHsgc2Vuc29yOiB2bS5zZWxlY3RlZEltYWdlQ2FyZC5zZW5zb3IgfSk7XHJcbiAgICAgICAgICAgIHZtLmFjdGl2ZUNvcnJlbGF0aW5nSW1hZ2VDYXJkID0gXy5maW5kKHZtLmNvcnJlbGF0aW5nRXZlbnRJbWFnZUNhcmRzLCB7IHNlbnNvcjogdm0uc2VsZWN0ZWRJbWFnZUNhcmQuc2Vuc29yIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUltYWdlQ2FyZCkge1xyXG4gICAgICAgICAgICAgICAgdm0uYWN0aXZlSW1hZ2VDYXJkLmFjdGl2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUNvcnJlbGF0aW5nSW1hZ2VDYXJkKSB7XHJcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVDb3JyZWxhdGluZ0ltYWdlQ2FyZC5hY3RpdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjaGFydEZvY3VzID0gW3ZtLmFjdGl2ZUltYWdlQ2FyZC5jaGFydElkXTtcclxuICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUNvcnJlbGF0aW5nSW1hZ2VDYXJkKSB7XHJcbiAgICAgICAgICAgICAgICBjaGFydEZvY3VzLnB1c2godm0uYWN0aXZlQ29ycmVsYXRpbmdJbWFnZUNhcmQuY2hhcnRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2hhcnQuZm9jdXMoY2hhcnRGb2N1cyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoKGhhc0NvcnJlbGF0aW9uICYmIGNvcnJlbGF0aW5nRnJhbWVzLmxlbmd0aCA+IDApIHx8ICghaGFzQ29ycmVsYXRpb24gJiYgZnJhbWVzLmxlbmd0aCA+IDApKSB7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVBbmltYXRpb25GcmFtZXMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZtLnRvZ2dsZVBsYXliYWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2bS5wbGF5YmFjayA9ICF2bS5wbGF5YmFjaztcclxuICAgICAgICAgICAgaWYgKHZtLnBsYXliYWNrKSB7XHJcbiAgICAgICAgICAgICAgICBhbmltYXRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5zdGVwID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xyXG4gICAgICAgICAgICB2bS5wbGF5YmFjayA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAoIWFuZ3VsYXIuZXF1YWxzKGRpcmVjdGlvbiwgdm0ucGxheWJhY2tEaXJlY3Rpb24pKSB7XHJcbiAgICAgICAgICAgICAgICAvLyB1c2VyIGNoYW5nZWQgZGlyZWN0aW9uXHJcbiAgICAgICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnZm9yd2FyZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IGZyYW1lSWR4IDwgYW5pbWF0aW9uRnJhbWVzLmxlbmd0aCAtIDIgPyBmcmFtZUlkeCArIDIgOiAwO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IGZyYW1lSWR4ID4gMSA/IGZyYW1lSWR4IC0gMiA6IGFuaW1hdGlvbkZyYW1lcy5sZW5ndGggLSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZtLnBsYXliYWNrRGlyZWN0aW9uID0gZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICBhbmltYXRlKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0ubWF0Y2hTaWduYXR1cmUgPSBmdW5jdGlvbiAoc2Vuc29yKSB7XHJcbiAgICAgICAgICAgIHZhciBjaGFydERhdGEgPSBfLmZpbmQoY2hhcnQuZGF0YSgpLCB7IGlkOiBzZW5zb3IgfSk7XHJcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBjaGFydERhdGEgPyBjaGFydERhdGEudmFsdWVzIDogbnVsbDtcclxuXHJcbiAgICAgICAgICAgIC8vIGZpbHRlciBvdXQgbnVsbCB2YWx1ZXNcclxuICAgICAgICAgICAgdmFsdWVzID0gXy5maWx0ZXIodmFsdWVzLCBmdW5jdGlvbih2KXtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2LnZhbHVlcyAhPT0gbnVsbDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHZhbHVlcyk7XHJcbiAgICAgICAgICAgIGRlYnVnZ2VyO1xyXG5cclxuICAgICAgICAgICAgLy92YXIgc2lnID0ge1xyXG4gICAgICAgICAgICAvLyAgICBzaWdfdGVtcGxhdGU6IFtbdGltZXNdLFtpbnRlbnNpdGllc11dLFxyXG4gICAgICAgICAgICAvLyAgICBldmVudF9kYXRhOiBbW2V2ZW50VGltZXNdLFtldmVudEludGVuc2l0aWVzXV1cclxuICAgICAgICAgICAgLy99O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RXZlbnREYXRhKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGNsZWFuIHVwIGFueSBsZWZ0b3ZlciBkYXRhIGZyb20gYSBwcmV2aW91c2x5IHZpZXdlZCBldmVudFxyXG4gICAgICAgICAgICBpZiAoY2hhcnRXb3JrZXIpIHtcclxuICAgICAgICAgICAgICAgIGNoYXJ0V29ya2VyLnRlcm1pbmF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaW1hZ2VXb3JrZXIpIHtcclxuICAgICAgICAgICAgICAgIGltYWdlV29ya2VyLnRlcm1pbmF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY29ycmVsYXRpbmdJbWFnZVdvcmtlcikge1xyXG4gICAgICAgICAgICAgICAgY29ycmVsYXRpbmdJbWFnZVdvcmtlci50ZXJtaW5hdGUoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gcmVpbml0IGNvbnRyb2xsZXIgdmFsdWVzXHJcbiAgICAgICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NoYXJ0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdBbmltYXRpb24gPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGNhcHR1cmUgbmV3IGV2ZW50IGRhdGFcclxuICAgICAgICAgICAgICAgIHZtLmV2ZW50RGF0YSA9IG5ld1ZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHJldHJpZXZlIHBsb3QgYW5kIGltYWdlIGRhdGEgZm9yIGFjdGl2ZSBldmVudFxyXG4gICAgICAgICAgICAgICAgdmFyIHRyYWNrcyA9IHZtLmV2ZW50RGF0YS5nZXRMYXllcnMoKSxcclxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlcyA9IFtdO1xyXG5cclxuXHRcdFx0XHR2bS5ldmVudFByb3BzID0gXy5tYXAodHJhY2tzLCBmdW5jdGlvbihkKXsgcmV0dXJuIGQuZ2V0TGF5ZXJzKClbMF0uZmVhdHVyZS5wcm9wZXJ0aWVzOyB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB2bS50cmFja0ZlYXR1cmUgPSB0cmFja3NbMF0uZ2V0TGF5ZXJzKClbMF0uZmVhdHVyZTtcclxuXHRcdFx0XHR2bS5ldmVudF9oNV91cmwgPSBkZWx0YUNvbmZpZy5ldmVudFNlcnZlci5maWxlUGF0aFVybCArIHZtLnRyYWNrRmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodm0udm90ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBkYXRhc2V0X2lkLCBwcm9kdWN0X2lkLCBhbmQgbmFzaWMgdmFsdWVzIGFyZSB0aGUgc2FtZSBmb3JcclxuICAgICAgICAgICAgICAgICAgICAvLyBhbGwgdHJhY2tzIGF0IHRoaXMgcG9pbnQsIHNvIHNldCB1cCB0aGUgdm90ZSBvYmplY3RcclxuICAgICAgICAgICAgICAgICAgICB2bS52b3RlT2JqLmRhdGFzZXRfaWQgPSB2bS50cmFja0ZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXTtcclxuICAgICAgICAgICAgICAgICAgICB2bS52b3RlT2JqLnByb2R1Y3RfaWQgPSB2bS50cmFja0ZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXTtcclxuICAgICAgICAgICAgICAgICAgICB2bS52b3RlT2JqLm5hc2ljID0gdm0udHJhY2tGZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdO1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLnZvdGVPYmoudm90ZXJfbmFtZSA9IHZtLnZvdGVyLnZvdGVyX25hbWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGxvb2sgZm9yIGV4aXN0aW5nIHZvdGUgZm9yIHRoaXMgZXZlbnRcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZXZlbnRWb3RlID0gXy5maW5kKHZtLnZvdGVzLCB7IGRhdGFzZXRfaWQ6IHZtLnZvdGVPYmouZGF0YXNldF9pZCwgcHJvZHVjdF9pZDogdm0udm90ZU9iai5wcm9kdWN0X2lkIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudFZvdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0udm90ZU9iaiA9IFZvdGUudHJhbnNmb3JtZXIoZXZlbnRWb3RlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHRyYWNrcywgZnVuY3Rpb24gKHRyYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxheWVyID0gdHJhY2suZ2V0TGF5ZXJzKClbMF07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsYXllci5mZWF0dXJlICYmIGxheWVyLmZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGVQYXRoID0gZGVsdGFDb25maWcuZXZlbnRTZXJ2ZXIuZmlsZVBhdGhVcmwgKyBsYXllci5mZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKGdldFBsb3REYXRhKGZpbGVQYXRoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2goZ2V0SW1hZ2VEYXRhKGZpbGVQYXRoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJHEuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBnZXRDb3JyZWxhdGluZ0V2ZW50cygpLnRoZW4oZnVuY3Rpb24gKGNvcnJlbGF0aW5nRXZlbnRSZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvcnJlbGF0aW5nRXZlbnRSZXN1bHQgJiYgY29ycmVsYXRpbmdFdmVudFJlc3VsdC5mZWF0dXJlcyAmJiBjb3JyZWxhdGluZ0V2ZW50UmVzdWx0LmZlYXR1cmVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb3JyZWxhdGluZ1Byb21pc2VzID0gW107XHJcblx0XHRcdFx0XHRcdFx0dm0uY29ycmVsYXRlZEV2ZW50UHJvcHMgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChjb3JyZWxhdGluZ0V2ZW50UmVzdWx0LmZlYXR1cmVzLCBmdW5jdGlvbiAoZmVhdHVyZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dm0uY29ycmVsYXRlZEV2ZW50UHJvcHMucHVzaChmZWF0dXJlLnByb3BlcnRpZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoXzIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGVQYXRoID0gZGVsdGFDb25maWcuZXZlbnRTZXJ2ZXIuZmlsZVBhdGhVcmwgKyBmZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoXzI7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZtLmNvcnJlbGF0ZWRfaDVfdXJsID0gZmlsZVBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nUHJvbWlzZXMucHVzaChnZXRQbG90RGF0YShmaWxlUGF0aCwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ1Byb21pc2VzLnB1c2goZ2V0SW1hZ2VEYXRhKGZpbGVQYXRoLCB0cnVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcS5hbGwoY29ycmVsYXRpbmdQcm9taXNlcykudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NvcnJlbGF0aW9uIHByZXNlbnQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNDb3JyZWxhdGlvbiA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxvdFJlc3VsdHMgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IHBsb3RSZXN1bHRzQXJyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ1Jlc3VsdHM6IGNvcnJlbGF0aW5nUGxvdFJlc3VsdHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRFdmVudERhdGEoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzQ29ycmVsYXRpb24gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsb3RSZXN1bHRzID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IHBsb3RSZXN1bHRzQXJyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nUmVzdWx0czogW11cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0RXZlbnREYXRhKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TGF5b3V0Q29tcG9uZW50cygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQgPSBfLmZpbmQobmV3VmFsdWUsIHsgc3RhdGU6IHsgdGVtcGxhdGVOYW1lOiAnZXZlbnRWaWV3ZXInIH0gfSk7XHJcbiAgICAgICAgICAgICAgICBldmVudFZpZXdlckxheW91dENvbXBvbmVudC5jb250YWluZXIuc2V0VGl0bGUoZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuc3RhdGUudGVtcGxhdGVUaXRsZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdm0uZXZlbnRWaWV3ZXJIZWlnaHQgPSBldmVudFZpZXdlckxheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgdm0uZXZlbnRWaWV3ZXJXaWR0aCA9IGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBzZXQgZXZlbnQgbGlzdGVuZXIgZm9yIGNvbnRhaW5lciByZXNpemVcclxuICAgICAgICAgICAgICAgIGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5vbigncmVzaXplJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhICR0aW1lb3V0IHRvIG5vdGlmeSBhbmd1bGFyIG9mIHRoZSBjaGFuZ2VcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmV2ZW50Vmlld2VySGVpZ2h0ID0gZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLmhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0uZXZlbnRWaWV3ZXJXaWR0aCA9IGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci53aWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFydC5yZXNpemUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdm0uZXZlbnRWaWV3ZXJIZWlnaHQgLyAyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiB2bS5ldmVudFZpZXdlcldpZHRoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRWb3RlcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZtLnZvdGVyID0gbmV3VmFsdWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vm90ZXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2bS52b3RlcyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFZvdGVSZWFzb25zKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdm0udm90ZVJlYXNvbnMgPSBuZXdWYWx1ZTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG4gXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuY29udHJvbGxlcignbWV0YWRhdGFEaWFsb2dDb250cm9sbGVyJywgZnVuY3Rpb24gKFxyXG4gICAgICAgICRzY29wZSxcclxuXHRcdCRtZERpYWxvZyxcclxuXHRcdGV2ZW50TWV0YWRhdGFzXHJcblx0KXtcclxuXHRcdCRzY29wZS5ldmVudE1ldGFkYXRhcyA9IGV2ZW50TWV0YWRhdGFzO1xyXG5cdFx0JHNjb3BlLmhpZGUgPSBmdW5jdGlvbigpe1xyXG5cdFx0XHQkbWREaWFsb2cuaGlkZSgpO1xyXG5cdFx0fTtcclxuXHR9KTtcclxufSkoKTtcclxuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuY29udHJvbGxlcignZXZlbnRzQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcclxuICAgICAgICAkc2NvcGUsXHJcbiAgICAgICAgJHRpbWVvdXQsXHJcbiAgICAgICAgJGxvY2F0aW9uLFxyXG4gICAgICAgIGRlbHRhQ29uZmlnLFxyXG4gICAgICAgIGRlbHRhU2VydmljZSxcclxuICAgICAgICBzZWFyY2hTZXJ2aWNlLFxyXG4gICAgICAgIHN0YXRlU2VydmljZSxcclxuICAgICAgICBsZWFmbGV0RGF0YSxcclxuICAgICAgICBMLFxyXG4gICAgICAgICQsXHJcbiAgICAgICAgX1xyXG4gICAgKSB7XHJcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcclxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXHJcbiAgICAgICAgICAgIG1hcCA9IHt9LFxyXG4gICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQgPSBudWxsLFxyXG4gICAgICAgICAgICBjdXJySWR4ID0gMCxcclxuICAgICAgICAgICAgZXZlbnRMYXllcnMgPSBbXSxcclxuICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBudWxsLFxyXG4gICAgICAgICAgICBjb25maWRlbmNlID0gMCxcclxuICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9ICdhbGwnLFxyXG4gICAgICAgICAgICB0b3RhbEV2ZW50cyA9IFtdO1xyXG5cclxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XHJcbiAgICAgICAgdm0uZGVsdGFDb25maWcgPSBkZWx0YUNvbmZpZztcclxuICAgICAgICB2bS5ldmVudHNIZWlnaHQgPSAnJztcclxuICAgICAgICB2bS5ldmVudHNXaWR0aCA9ICcnO1xyXG4gICAgICAgIHZtLm1hcEV2ZW50cyA9IFtdO1xyXG4gICAgICAgIHZtLmxvYWRpbmcgPSB0cnVlO1xyXG5cclxuICAgICAgICB2YXIgYWN0aXZhdGVNYXBFdmVudCA9IGZ1bmN0aW9uIChtYXBFdmVudCkge1xyXG4gICAgICAgICAgICB2YXIgYWN0aXZlTWFwTGF5ZXIgPSBfLmZpbmQoZXZlbnRMYXllcnMsIHsgZmVhdHVyZTogbWFwRXZlbnQgfSk7XHJcbiAgICAgICAgICAgIGlmIChhY3RpdmVNYXBMYXllcikge1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlTWFwTGF5ZXIuc2V0U3R5bGUoeyBjb2xvcjogJyNiMmZmNTknLCBmaWxsT3BhY2l0eTogMC44IH0pO1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlTWFwTGF5ZXIuYnJpbmdUb0Zyb250KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5zaG93UG9wdXAgPSBmdW5jdGlvbiAoJGV2ZW50LCBtYXBFdmVudCkge1xyXG4gICAgICAgICAgICBMLnBvcHVwKHsgYXV0b1BhbjogZmFsc2UgfSlcclxuICAgICAgICAgICAgICAgIC5zZXRMYXRMbmcoTC5sYXRMbmcobWFwRXZlbnQucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIubGF0RmllbGRdLCBtYXBFdmVudC5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5sb25GaWVsZF0pKVxyXG4gICAgICAgICAgICAgICAgLnNldENvbnRlbnQoZGVsdGFTZXJ2aWNlLmdldExlYWZsZXRQb3B1cENvbnRlbnQobWFwRXZlbnQpKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5PbihtYXApO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZtLmhpZGVQb3B1cCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgbWFwLmNsb3NlUG9wdXAoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5zaG93RXZlbnQgPSBmdW5jdGlvbiAoJGV2ZW50LCBtYXBFdmVudCkge1xyXG4gICAgICAgICAgICAvLyBjbGVhciBvbGQgZXZlbnQgZGF0YVxyXG4gICAgICAgICAgICBpZiAoYWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhY3RpdmVNYXBMYXllciA9IF8uZmluZChldmVudExheWVycywgeyBmZWF0dXJlOiBhY3RpdmVFdmVudCB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChhY3RpdmVNYXBMYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZU1hcExheWVyLnNldFN0eWxlKHtjb2xvcjogYWN0aXZlTWFwTGF5ZXIuZmVhdHVyZS5ldmVudFNvdXJjZS5jb2xvciwgZmlsbE9wYWNpdHk6IDAuMn0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFjdGl2ZU1hcExheWVyLmJyaW5nVG9CYWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEV2ZW50RGF0YShudWxsKTtcclxuICAgICAgICAgICAgbWFwLmNsb3NlUG9wdXAoKTtcclxuICAgICAgICAgICAgbWFwRXZlbnQuc2Nyb2xsVG8gPSBmYWxzZTtcclxuICAgICAgICAgICAgYWN0aXZhdGVNYXBFdmVudChtYXBFdmVudCk7XHJcbiAgICAgICAgICAgIGFjdGl2ZUV2ZW50ID0gbWFwRXZlbnQ7XHJcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgZXZlbnQgY3VycmVudGx5IGJlaW5nIHZpZXdlZFxyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlRXZlbnQoYWN0aXZlRXZlbnQpO1xyXG4gICAgICAgICAgICAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIG1hcCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgdmFyIGZpbHRlckV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdm0ubWFwRXZlbnRzID0gXy5maWx0ZXIodG90YWxFdmVudHMsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG9ubHlDb3JyZWxhdGlvbnMgPT09ICdjb3JyZWxhdGVkJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5wcm9wZXJ0aWVzLmlzX2NvcnJlbGF0ZWQgJiYgZXZlbnQucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuY29uZmlkZW5jZUZpZWxkXSA+PSBjb25maWRlbmNlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvbmx5Q29ycmVsYXRpb25zID09PSAnbm9uY29ycmVsYXRlZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWV2ZW50LnByb3BlcnRpZXMuaXNfY29ycmVsYXRlZCAmJiBldmVudC5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGRdID49IGNvbmZpZGVuY2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuY29uZmlkZW5jZUZpZWxkXSA+PSBjb25maWRlbmNlO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBwYW5lbCB0aXRsZVxyXG4gICAgICAgICAgICBpZiAoZXZlbnRzTGF5b3V0Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLnNldFRpdGxlKGV2ZW50c0xheW91dENvbXBvbmVudC5zdGF0ZS50ZW1wbGF0ZVRpdGxlICsgJyAoJyArIHZtLm1hcEV2ZW50cy5sZW5ndGggKyAnKScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRFdmVudExheWVycygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGV2ZW50TGF5ZXJzID0gbmV3VmFsdWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RXZlbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdG90YWxFdmVudHMgPSBfLm9yZGVyQnkobmV3VmFsdWUsIFsncHJvcGVydGllcy5ldmVudF9sYXQnLCAncHJvcGVydGllcy5ldmVudF9sb24nXSk7XHJcbiAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG5cclxuICAgICAgICAgICAgLy8gY2hlY2sgZm9yIHZhbHVlcyBpbiBxdWVyeXN0cmluZyBhbmQgZ28gdG8gYW4gZXZlbnQgaWYgYXBwbGljYWJsZVxyXG4gICAgICAgICAgICBpZiAocXNbZGVsdGFDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gJiYgcXNbZGVsdGFDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0pIHtcclxuICAgICAgICAgICAgICAgIHZhciBwcm9kdWN0X2lkID0gcXNbZGVsdGFDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0sXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YXNldF9pZCA9IHBhcnNlSW50KHFzW2RlbHRhQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdKTtcclxuXHJcbiAgICAgICAgICAgICAgICBhY3RpdmVFdmVudCA9IF8uZmluZCh2bS5tYXBFdmVudHMsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9PT0gcHJvZHVjdF9pZCAmJiBlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPT09IGRhdGFzZXRfaWQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmF0ZU1hcEV2ZW50KGFjdGl2ZUV2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVFdmVudC5zY3JvbGxUbyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBldmVudCBjdXJyZW50bHkgYmVpbmcgdmlld2VkXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZUV2ZW50KGFjdGl2ZUV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q29uZmlkZW5jZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbmZpZGVuY2UgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRPbmx5Q29ycmVsYXRpb25zKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRMYXlvdXRDb21wb25lbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKCFldmVudHNMYXlvdXRDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGhhc24ndCBiZWVuIHNldCB5ZXQsIHNvIHRyeSB0byBmaW5kIGl0XHJcbiAgICAgICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQgPSBfLmZpbmQobmV3VmFsdWUsIHtzdGF0ZToge3RlbXBsYXRlTmFtZTogJ2V2ZW50cyd9fSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRzTGF5b3V0Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZm91bmQgaXQsIHNvIHNldCB1cCB2YXJzIGFuZCBldmVudHNcclxuICAgICAgICAgICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLnNldFRpdGxlKGV2ZW50c0xheW91dENvbXBvbmVudC5zdGF0ZS50ZW1wbGF0ZVRpdGxlICsgJyAoJyArIHZtLm1hcEV2ZW50cy5sZW5ndGggKyAnKScpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2bS5ldmVudHNIZWlnaHQgPSBldmVudHNMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLmhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICB2bS5ldmVudHNXaWR0aCA9IGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIud2lkdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCBldmVudCBsaXN0ZW5lciBmb3IgY29udGFpbmVyIHJlc2l6ZVxyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXNpemUgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uIChtYXApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhICR0aW1lb3V0IHRvIG5vdGlmeSBhbmd1bGFyIG9mIHRoZSBjaGFuZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uZXZlbnRzSGVpZ2h0ID0gZXZlbnRzTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5ldmVudHNXaWR0aCA9IGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIud2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0cmlnZ2VyIGEgZmFrZSB3aW5kb3cgcmVzaXplIHRvIGZvcmNlIG1kLXZpcnV0YWwtcmVwZWF0LWNvbnRhaW5lciB0byByZWRyYXdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLnRyaWdnZXJIYW5kbGVyKCdyZXNpemUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLm9uKCdyZXNpemUnLCByZXNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIub24oJ3Nob3cnLCByZXNpemUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRMb2FkaW5nRXZlbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdm0ubG9hZGluZyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEFjdGl2ZUV2ZW50KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XHJcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgY3VycklkeCA9IF8uaW5kZXhPZih2bS5tYXBFdmVudHMsIG5ld1ZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZS5zY3JvbGxUbykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhICR0aW1lb3V0IHRvIG5vdGlmeSBhbmd1bGFyIG9mIHRoZSBjaGFuZ2VcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnRvcEluZGV4ID0gY3VycklkeCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjUwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBcbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5jb250cm9sbGVyKCdnb3RvQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIGRlbHRhQ29uZmlnLFxuICAgICAgICBkZWx0YVNlcnZpY2UsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgTCxcbiAgICAgICAgbGVhZmxldERhdGFcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpLFxuICAgICAgICAgICAgbWFwID0ge307XG5cbiAgICAgICAgJHNjb3BlLm1vZGUgPSAkc2NvcGUuJHBhcmVudC5tb2RlO1xuICAgICAgICB2bS5kZWx0YUNvbmZpZyA9IGRlbHRhQ29uZmlnO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5sYXQgPSAnJztcbiAgICAgICAgdm0ubG5nID0gJyc7XG4gICAgICAgIHZtLm1ncnMgPSAnJztcbiAgICAgICAgdm0ubG9jYXRpb25Gb3JtYXQgPSBxcy5sb2NhdGlvbkZvcm1hdCA/IHFzLmxvY2F0aW9uRm9ybWF0IDogZGVsdGFDb25maWcuZGVmYXVsdExvY2F0aW9uRm9ybWF0O1xuXG4gICAgICAgIHZhciBjb252ZXJ0TGF0TG5nID0gZnVuY3Rpb24gKG5ld0Zvcm1hdCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlbHRhU2VydmljZS5jb252ZXJ0TGF0TG5nKHtcbiAgICAgICAgICAgICAgICBsYXQ6IHZtLmxhdCxcbiAgICAgICAgICAgICAgICBsbmc6IHZtLmxuZyxcbiAgICAgICAgICAgICAgICBtZ3JzOiB2bS5tZ3JzLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogdm0ubG9jYXRpb25Gb3JtYXRcbiAgICAgICAgICAgIH0sIG5ld0Zvcm1hdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRHb3RvRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdm0uZ290byA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBkZExhdExuZyA9IGNvbnZlcnRMYXRMbmcoJ2RkJyk7XG4gICAgICAgICAgICBtYXAuc2V0VmlldyhMLmxhdExuZyhkZExhdExuZy5sYXQsIGRkTGF0TG5nLmxuZykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldExvY2F0aW9uRm9ybWF0ID0gZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExvY2F0aW9uRm9ybWF0KGZvcm1hdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgbWFwID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2bS5zZXRMb2NhdGlvbkZvcm1hdCh2bS5sb2NhdGlvbkZvcm1hdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldExvY2F0aW9uRm9ybWF0KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgodm0ubGF0ICE9PSAnJyAmJiB2bS5sbmcgIT09ICcnKSB8fCB2bS5tZ3JzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIHZhciBjb252ZXJ0ZWRMYXRMbmcgPSBjb252ZXJ0TGF0TG5nKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgICAgICB2bS5sYXQgPSBjb252ZXJ0ZWRMYXRMbmcubGF0O1xuICAgICAgICAgICAgICAgIHZtLmxuZyA9IGNvbnZlcnRlZExhdExuZy5sbmc7XG4gICAgICAgICAgICAgICAgdm0ubWdycyA9IGNvbnZlcnRlZExhdExuZy5tZ3JzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0ubG9jYXRpb25Gb3JtYXQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpOyIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBcbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5kaXJlY3RpdmUoJ2RlbHRhR290bycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9nb3RvL2dvdG9UZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdnb3RvQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7IiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4gXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLmNvbnRyb2xsZXIoJ2xvY2F0aW9uRm9ybWF0Q29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIGRlbHRhQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZSxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5sb2NhdGlvbiA9IHtcbiAgICAgICAgICAgIGZvcm1hdDogcXMubG9jYXRpb25Gb3JtYXQgfHwgZGVsdGFDb25maWcuZGVmYXVsdExvY2F0aW9uRm9ybWF0LFxuICAgICAgICAgICAgbm9ydGg6IHFzLm4gfHwgJycsXG4gICAgICAgICAgICBzb3V0aDogcXMucyB8fCAnJyxcbiAgICAgICAgICAgIGVhc3Q6IHFzLmUgfHwgJycsXG4gICAgICAgICAgICB3ZXN0OiBxcy53IHx8ICcnLFxuICAgICAgICAgICAgbWdyc05FOiBxcy5uZSB8fCAnJyxcbiAgICAgICAgICAgIG1ncnNTVzogcXMuc3cgfHwgJydcbiAgICAgICAgfTtcbiAgICAgICAgdm0ubW9kZSA9ICRzY29wZS4kcGFyZW50Lm1vZGU7XG5cbiAgICAgICAgdm0uc2V0Rm9ybWF0ID0gZnVuY3Rpb24gKG5ld0Zvcm1hdCkge1xuICAgICAgICAgICAgdmFyIG5lLCBzdztcbiAgICAgICAgICAgIHN3aXRjaCAodm0ubG9jYXRpb24uZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRERCcm9hZGNhc3Qodm0ubG9jYXRpb24uc291dGgsIHZtLmxvY2F0aW9uLndlc3QpO1xuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRERCcm9hZGNhc3Qodm0ubG9jYXRpb24ubm9ydGgsIHZtLmxvY2F0aW9uLmVhc3QpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdkbXMnOlxuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KHZtLmxvY2F0aW9uLnNvdXRoLCB2bS5sb2NhdGlvbi53ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgbmUgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdCh2bS5sb2NhdGlvbi5ub3J0aCwgdm0ubG9jYXRpb24uZWFzdCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ21ncnMnOlxuICAgICAgICAgICAgICAgICAgICBpZiAodm0ubG9jYXRpb24ubWdyc1NXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdCh2bS5sb2NhdGlvbi5tZ3JzU1cpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5sb2NhdGlvbi5tZ3JzTkUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KHZtLmxvY2F0aW9uLm1ncnNORSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5zb3V0aCA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ud2VzdCA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ubm9ydGggPSAnJztcbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLmVhc3QgPSAnJztcbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLm1ncnNORSA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ubWdyc1NXID0gJyc7XG5cbiAgICAgICAgICAgIHN3aXRjaCAobmV3Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3cgJiYgbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLnNvdXRoID0gc3cuZGRbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi53ZXN0ID0gc3cuZGRbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5ub3J0aCA9IG5lLmRkWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24uZWFzdCA9IG5lLmRkWzFdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Rtcyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdyAmJiBuZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24uc291dGggPSBzdy5kbXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi53ZXN0ID0gc3cuZG1zWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24ubm9ydGggPSBuZS5kbXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5lYXN0ID0gbmUuZG1zWzFdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ21ncnMnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3cgJiYgbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLm1ncnNTVyA9IHN3Lm1ncnMgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5tZ3JzTkUgPSBuZS5tZ3JzIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5mb3JtYXQgPSBuZXdGb3JtYXQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TWFwQkJveFBhcmFtcyh2bS5sb2NhdGlvbik7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TG9jYXRpb25Gb3JtYXQobmV3Rm9ybWF0KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldE1hcEJCb3goKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbiA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdm0ubG9jYXRpb24gPSB7fTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5kaXJlY3RpdmUoJ2RlbHRhTG9jYXRpb25Gb3JtYXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvbG9jYXRpb25Gb3JtYXQvbG9jYXRpb25Gb3JtYXRUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdsb2NhdGlvbkZvcm1hdENvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHt9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpOyIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuIFVOQ0xBU1NJRklFRFxyXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXHJcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXHJcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLmNvbnRyb2xsZXIoJ21hcENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHNjb3BlLFxyXG4gICAgICAgICRsb2NhdGlvbixcclxuICAgICAgICAkdGltZW91dCxcclxuICAgICAgICAkbWRUb2FzdCxcclxuICAgICAgICBkZWx0YUNvbmZpZyxcclxuICAgICAgICBkZWx0YVNlcnZpY2UsXHJcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxyXG4gICAgICAgIHNlYXJjaFNlcnZpY2UsXHJcbiAgICAgICAgbGVhZmxldERhdGEsXHJcbiAgICAgICAgdG9hc3RyLFxyXG4gICAgICAgIEwsXHJcbiAgICAgICAgX1xyXG4gICAgKSB7XHJcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcclxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXHJcbiAgICAgICAgICAgIG1hcCA9IHt9LFxyXG4gICAgICAgICAgICBtYXBab29tID0gcXMuem9vbSA/IHBhcnNlSW50KHFzLnpvb20pIDogZGVsdGFDb25maWcubWFwQ2VudGVyLnpvb20sXHJcbiAgICAgICAgICAgIG1hcExheWVycyA9IG5ldyBMLkZlYXR1cmVHcm91cCgpLFxyXG4gICAgICAgICAgICBldmVudHMgPSBbXSxcclxuICAgICAgICAgICAgc291cmNlcyA9IFtdLFxyXG4gICAgICAgICAgICB0eXBlcyA9IFtdLFxyXG4gICAgICAgICAgICBjb25maWRlbmNlID0gMCxcclxuICAgICAgICAgICAgc291cmNlVHlwZSA9IHFzLnNvdXJjZVR5cGUsXHJcbiAgICAgICAgICAgIG1hcExheW91dENvbXBvbmVudCA9IG51bGwsXHJcbiAgICAgICAgICAgIG9ubHlDb3JyZWxhdGlvbnMgPSBxcy5vbmx5Q29ycmVsYXRpb25zID8gcXMub25seUNvcnJlbGF0aW9ucyA6IGRlbHRhQ29uZmlnLm9ubHlDb3JyZWxhdGlvbnMsXHJcbiAgICAgICAgICAgIGNvdW50cmllcyA9IHFzLmNvdW50cmllcyA/IHFzLmNvdW50cmllcyA6IFtdO1xyXG5cclxuICAgICAgICB2bS5tYXBIZWlnaHQgPSAnJztcclxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XHJcbiAgICAgICAgdm0udHJhY2tMYXllcnMgPSBudWxsO1xyXG4gICAgICAgIHZtLmFjdGl2ZUV2ZW50ID0gbnVsbDtcclxuICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmIChxcy5uIHx8IHFzLm5lKSB7XHJcbiAgICAgICAgICAgIHZhciBkZEJvdW5kcyA9IGRlbHRhU2VydmljZS5nZXREREJvdW5kcyh7XHJcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IHFzLmxvY2F0aW9uRm9ybWF0LFxyXG4gICAgICAgICAgICAgICAgbm9ydGg6IHFzLm4gPyBwYXJzZUZsb2F0KHFzLm4pIDogJycsXHJcbiAgICAgICAgICAgICAgICBzb3V0aDogcXMucyA/IHBhcnNlRmxvYXQocXMucykgOiAnJyxcclxuICAgICAgICAgICAgICAgIGVhc3Q6IHFzLmUgPyBwYXJzZUZsb2F0KHFzLmUpIDogJycsXHJcbiAgICAgICAgICAgICAgICB3ZXN0OiBxcy53ID8gcGFyc2VGbG9hdChxcy53KSA6ICcnLFxyXG4gICAgICAgICAgICAgICAgbWdyc05FOiBxcy5uZSB8fCAnJyxcclxuICAgICAgICAgICAgICAgIG1ncnNTVzogcXMuc3cgfHwgJydcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgc291dGhXZXN0ID0gTC5sYXRMbmcoZGRCb3VuZHNbMF1bMF0sIGRkQm91bmRzWzBdWzFdKSxcclxuICAgICAgICAgICAgICAgIG5vcnRoRWFzdCA9IEwubGF0TG5nKGRkQm91bmRzWzFdWzBdLCBkZEJvdW5kc1sxXVsxXSksXHJcbiAgICAgICAgICAgICAgICBib3VuZHMgPSBMLmxhdExuZ0JvdW5kcyhzb3V0aFdlc3QsIG5vcnRoRWFzdCksXHJcbiAgICAgICAgICAgICAgICBjZW50ZXIgPSBib3VuZHMuZ2V0Q2VudGVyKCk7XHJcblxyXG4gICAgICAgICAgICB2bS5jZW50ZXIgPSB7XHJcbiAgICAgICAgICAgICAgICBsYXQ6IGNlbnRlci5sYXQsXHJcbiAgICAgICAgICAgICAgICBsbmc6IGNlbnRlci5sbmcsXHJcbiAgICAgICAgICAgICAgICB6b29tOiBtYXBab29tXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdm0uY2VudGVyID0gZGVsdGFDb25maWcubWFwQ2VudGVyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdWktbGVhZmxldCBkZWZhdWx0c1xyXG4gICAgICAgIHZtLmRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICBjcnM6IGRlbHRhQ29uZmlnLmRlZmF1bHRQcm9qZWN0aW9uLFxyXG4gICAgICAgICAgICB6b29tQ29udHJvbDogdHJ1ZSxcclxuICAgICAgICAgICAgYXR0cmlidXRpb25Db250cm9sOiBmYWxzZSxcclxuICAgICAgICAgICAgY29udHJvbHM6IHtcclxuICAgICAgICAgICAgICAgIGxheWVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHZpc2libGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3ByaWdodCcsXHJcbiAgICAgICAgICAgICAgICAgICAgY29sbGFwc2VkOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyB1aS1sZWFmbGV0IGJhc2VsYXllcnMgb2JqZWN0XHJcbiAgICAgICAgdm0ubGF5ZXJzID0gXy5jbG9uZURlZXAoZGVsdGFDb25maWcubGF5ZXJzKTtcclxuXHJcbiAgICAgICAgdmFyIHVwZGF0ZUJhc2VsYXllciA9IGZ1bmN0aW9uIChsYXllcikge1xyXG4gICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRMYXllcnMoKS50aGVuKGZ1bmN0aW9uIChsYXllcnMpIHtcclxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChsYXllcnMuYmFzZWxheWVycywgZnVuY3Rpb24gKGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwLnJlbW92ZUxheWVyKGxheWVyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbWFwLmFkZExheWVyKGxheWVycy5iYXNlbGF5ZXJzW2xheWVyLmlkXSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBzaG93RXZlbnRUcmFjayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKG1hcC5nZXRab29tKCkgPiAxMCkge1xyXG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGdldCB0cmFja3MgZnJvbSBldmVudFxyXG4gICAgICAgICAgICB2YXIgZXZlbnRQYXJhbXMgPSB7fTtcclxuICAgICAgICAgICAgZXZlbnRQYXJhbXNbZGVsdGFDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gPSB2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdO1xyXG4gICAgICAgICAgICBldmVudFBhcmFtc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9IHZtLmFjdGl2ZUV2ZW50LnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF07XHJcbiAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0RXZlbnRUcmFja3MoZXZlbnRQYXJhbXMpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGRyYXcgdGhlIHRyYWNrc1xyXG4gICAgICAgICAgICAgICAgdmFyIHRyYWNrTGF5ZXJzID0gbmV3IEwuRmVhdHVyZUdyb3VwKCksXHJcbiAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTiA9IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlMElkeCA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlMUlkeCA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGRhdGEuZmVhdHVyZXMsIGZ1bmN0aW9uIChmZWF0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRyYWNrQ29sb3IgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFja0NvbG9yID0gXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IHRydWUgfSkuY2hhcnRDb2xvcnNbc291cmNlMElkeF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTBJZHgrKztcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFja0NvbG9yID0gXy5maW5kKGRlbHRhQ29uZmlnLnNvdXJjZXMsIHtpZGVudGl0eTogZmFsc2UgfSkuY2hhcnRDb2xvcnNbc291cmNlMUlkeF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTFJZHgrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdXNlIGZlYXR1cmUgZ2VvbWV0cnkgd2hlbiBhdmFpbGFibGUsIG90aGVyd2lzZSB1c2UgdGhlIGZlYXR1cmUgbGF0L2xvbiBwb2ludCB0byBjcmVhdGUgYSBnZW9tZXRyeVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLmdlb21ldHJ5ICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04gPSBMLmdlb0pzb24oZmVhdHVyZS5nZW9tZXRyeSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHsgY29sb3I6IHRyYWNrQ29sb3IgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRWFjaEZlYXR1cmU6IGZ1bmN0aW9uIChmZWF0dXJlRGF0YSwgbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXllci5mZWF0dXJlLnByb3BlcnRpZXMgPSBmZWF0dXJlLnByb3BlcnRpZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFja0xheWVycy5hZGRMYXllcihnZW9KU09OKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGF0bG5nID0gTC5sYXRMbmcoZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5sYXRGaWVsZF0sIGZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIubG9uRmllbGRdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYXRsbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjaXJjbGVNYXJrZXIgPSBMLmNpcmNsZU1hcmtlcihsYXRsbmcsIHsgY29sb3I6IHZtLmFjdGl2ZUV2ZW50LmV2ZW50U291cmNlLmNvbG9yIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04gPSBMLmdlb0pzb24oY2lyY2xlTWFya2VyLnRvR2VvSlNPTigpLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkRGF0YTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2lyY2xlTWFya2VyLnRvR2VvSlNPTigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRUb0xheWVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaXJjbGVNYXJrZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkVhY2hGZWF0dXJlOiBmdW5jdGlvbiAoZmVhdHVyZURhdGEsIGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLmZlYXR1cmUucHJvcGVydGllcyA9IGZlYXR1cmUucHJvcGVydGllcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrTGF5ZXJzLmFkZExheWVyKGdlb0pTT04pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChnZW9KU09OKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04uZWFjaExheWVyKGZ1bmN0aW9uIChsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZmVhdHVyZS5ldmVudFNvdXJjZSA9IF8uZmluZChkZWx0YUNvbmZpZy5zb3VyY2VzLCB7IGlkZW50aXR5OiBsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXllci5mZWF0dXJlLmV2ZW50VHlwZSA9IF8uZmluZChkZWx0YUNvbmZpZy50eXBlcywgeyB2YWx1ZTogbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci50eXBlRmllbGRdIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5vbignbW91c2VvdmVyJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUubGF5ZXIuYmluZFBvcHVwKGRlbHRhU2VydmljZS5nZXRMZWFmbGV0UG9wdXBDb250ZW50KGUubGF5ZXIuZmVhdHVyZSksIHsgJ29mZnNldCc6IEwucG9pbnQoMCwgLTEwKSwgJ2F1dG9QYW4nOiBmYWxzZSB9KS5vcGVuUG9wdXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04ub24oJ21vdXNlb3V0JywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUubGF5ZXIuY2xvc2VQb3B1cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoXy5rZXlzKHRyYWNrTGF5ZXJzLmdldEJvdW5kcygpKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEV2ZW50RGF0YSh0cmFja0xheWVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnRyYWNrTGF5ZXJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBvdGhlciB0cmFja3MgYmVmb3JlIGFkZGluZyBuZXcgb25lc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS50cmFja0xheWVycy5jbGVhckxheWVycygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyBjbG9uZSB0cmFja0xheWVycyBmb3IgdXNlIGVsc2V3aGVyZSB0byBhdm9pZCB0cmlnZ2VyaW5nXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYW4gYW5ndWxhciB3YXRjaCB1cGRhdGVcclxuICAgICAgICAgICAgICAgICAgICB2bS50cmFja0xheWVycyA9IF8uY2xvbmVEZWVwKHRyYWNrTGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWFwLmdldFpvb20oKSA+IDEwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcExheWVycy5hZGRMYXllcih2bS50cmFja0xheWVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciBEcmF3aW5nIFRyYWNrczogR2VvbWV0cnkgYW5kIExhdC9Mb24gdmFsdWVzIGFyZSBudWxsLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGZpbHRlckV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgXy5mb3JFYWNoKGV2ZW50cywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob25seUNvcnJlbGF0aW9ucyA9PT0gJ2NvcnJlbGF0ZWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LmZlYXR1cmUucHJvcGVydGllcy5pc19jb3JyZWxhdGVkICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuY29uZmlkZW5jZUZpZWxkXSA+PSBjb25maWRlbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcExheWVycy5hZGRMYXllcihldmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLnJlbW92ZUxheWVyKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9ubHlDb3JyZWxhdGlvbnMgPT09ICdub25jb3JyZWxhdGVkJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzLmlzX2NvcnJlbGF0ZWQgJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGRdID49IGNvbmZpZGVuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZExheWVyKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMucmVtb3ZlTGF5ZXIoZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob25seUNvcnJlbGF0aW9ucyA9PT0gJ2FsbCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2RlbHRhQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGRdID49IGNvbmZpZGVuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZExheWVyKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMucmVtb3ZlTGF5ZXIoZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGZpbHRlckV2ZW50c0J5TG9jYXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBtYXBCb3VuZHMgPSBzdGF0ZVNlcnZpY2UuZ2V0TWFwQm91bmRzKCksXHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJlZEV2ZW50cyA9IF8uZmlsdGVyKGV2ZW50cywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1hcEJvdW5kcy5jb250YWlucyhldmVudC5fbGF0bG5nKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEV2ZW50cyhfLm1hcChmaWx0ZXJlZEV2ZW50cywgJ2ZlYXR1cmUnKSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHVwZGF0ZUV2ZW50cyA9IF8uZGVib3VuY2UoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBldmVudHMgPSBbXTtcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEV2ZW50cyhbXSk7XHJcbiAgICAgICAgICAgIG1hcExheWVycy5jbGVhckxheWVycygpO1xyXG4gICAgICAgICAgICBpZiAoc291cmNlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndXBkYXRlIGV2ZW50cycpO1xyXG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TG9hZGluZ0V2ZW50cyh2bS5sb2FkaW5nKTtcclxuICAgICAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0RXZlbnRzKHNvdXJjZXMpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5mZWF0dXJlcyAmJiBkYXRhLmZlYXR1cmVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdlb0pTT04gPSBMLmdlb0pzb24oZGF0YS5mZWF0dXJlcywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRUb0xheWVyOiBmdW5jdGlvbiAoZmVhdHVyZSwgbGF0bG5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNvdXJjZSA9IF8uZmluZChkZWx0YUNvbmZpZy5zb3VyY2VzLCB7IGlkZW50aXR5OiBmZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdfSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yID0gc291cmNlID8gc291cmNlLmNvbG9yIDogJyM1NTUnO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTC5jaXJjbGVNYXJrZXIobGF0bG5nLCB7IGNvbG9yOiBjb2xvciB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04ub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5hY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhY3RpdmVNYXBFdmVudCA9IF8uZmluZChldmVudHMsIHsgZmVhdHVyZTogdm0uYWN0aXZlRXZlbnQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGl2ZU1hcEV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZU1hcEV2ZW50LnNldFN0eWxlKHsgY29sb3I6IGFjdGl2ZU1hcEV2ZW50LmZlYXR1cmUuZXZlbnRTb3VyY2UuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjIgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFjdGl2ZU1hcEV2ZW50LmJyaW5nVG9CYWNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hcEV2ZW50ID0gZS5sYXllci5mZWF0dXJlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwRXZlbnQuc2Nyb2xsVG8gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZUV2ZW50KG1hcEV2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUubGF5ZXIuc2V0U3R5bGUoeyBjb2xvcjogJyNiMmZmNTknLCBmaWxsT3BhY2l0eTogMC44IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5sYXllci5icmluZ1RvRnJvbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04ub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLmxheWVyLmJpbmRQb3B1cChkZWx0YVNlcnZpY2UuZ2V0TGVhZmxldFBvcHVwQ29udGVudChlLmxheWVyLmZlYXR1cmUpLCB7ICdvZmZzZXQnOiBMLnBvaW50KDAsIC0xMCksICdhdXRvUGFuJzogZmFsc2UgfSkub3BlblBvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9KU09OLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLmxheWVyLmNsb3NlUG9wdXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04uZWFjaExheWVyKGZ1bmN0aW9uIChsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChjb3VudHJpZXMubGVuZ3RoID4gMCAmJiBfLmluZGV4T2YoY291bnRyaWVzLCBsYXllci5mZWF0dXJlLnByb3BlcnRpZXMuY291bnRyeV9jb2RlKSA+IC0xKSB8fCBjb3VudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZmVhdHVyZS5ldmVudFNvdXJjZSA9IF8uZmluZChkZWx0YUNvbmZpZy5zb3VyY2VzLCB7aWRlbnRpdHk6IGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tkZWx0YUNvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF19KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXllci5mZWF0dXJlLmV2ZW50VHlwZSA9IF8uZmluZChkZWx0YUNvbmZpZy50eXBlcywge3ZhbHVlOiBsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZGVsdGFDb25maWcuc2VydmVyLnR5cGVGaWVsZF19KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIHR5cGUgZmlsdGVycywgc28ganVzdCBhZGQgYWxsIHNvdXJjZSBmZWF0dXJlcyB0byB0aGUgbWFwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcExheWVycy5hZGRMYXllcihsYXllcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXRlcmF0ZSBvdmVyIHR5cGUgZmlsdGVycyBhbmQgb25seSBhZGQgZmVhdHVyZXMgdGhhdCBtYXRjaCB0aGUgY3JpdGVyaWFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKHR5cGVzLCBmdW5jdGlvbiAodHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyLmZlYXR1cmUucHJvcGVydGllc1t0eXBlLmZpZWxkXSA9PT0gdHlwZS52YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcExheWVycy5hZGRMYXllcihsYXllcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50cyA9IG1hcExheWVycy5nZXRMYXllcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlckV2ZW50c0J5TG9jYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnRMYXllcnMobWFwTGF5ZXJzLmdldExheWVycygpKTtcclxuICAgICAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExvYWRpbmdFdmVudHModm0ubG9hZGluZyk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKXtcclxuICAgICAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDc1MCk7XHJcblxyXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBtYXAgPSBkYXRhO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGRpc2FibGUgbGVhZmxldCBrZXlib2FyZCBzaG9ydGN1dHMgdG8gcHJldmVudCBjb2xsaXNpb24gd2l0aCBhbmd1bGFyIGhvdGtleXNcclxuICAgICAgICAgICAgICAgIG1hcC5rZXlib2FyZC5kaXNhYmxlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBkZWZhdWx0IGljb24gcGF0aFxyXG4gICAgICAgICAgICAgICAgTC5JY29uLkRlZmF1bHQuaW1hZ2VQYXRoID0gJy9zdHlsZXNoZWV0cy9pbWFnZXMnO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFkZCBmZWF0dXJlIGdyb3VwIHRvIHRoZSBtYXBcclxuICAgICAgICAgICAgICAgIG1hcExheWVycy5hZGRUbyhtYXApO1xyXG5cclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBCb3VuZHMobWFwLmdldEJvdW5kcygpKTtcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBab29tKG1hcC5nZXRab29tKCkpO1xyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE9ubHlDb3JyZWxhdGlvbnMob25seUNvcnJlbGF0aW9ucyk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkIGNvb3JkaW5hdGVzIGNvbnRyb2xcclxuICAgICAgICAgICAgICAgIEwuY29udHJvbC5jb29yZGluYXRlcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlVXNlcklucHV0OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB1c2VMYXRMbmdPcmRlcjogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSkuYWRkVG8obWFwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhZGQgY29udHJvbCB0byBvbmx5IHNob3cgZXZlbnRzIHdpdGggY29ycmVsYXRpb25zXHJcbiAgICAgICAgICAgICAgICB2YXIgY29ycmVsYXRlZEJ0biA9IEwuZWFzeUJ1dHRvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZU5hbWU6ICdjb3JyZWxhdGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2RlbHRhLW1hcGJ0biBkZWx0YS1tYXBidG4tY29ycmVsYXRlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnU2hvd2luZyBldmVudHMgd2l0aCBjb3JyZWxhdGlvbnMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoYnRuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG4uc3RhdGUoJ25vbmNvcnJlbGF0ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubHlDb3JyZWxhdGlvbnMgPSAnbm9uY29ycmVsYXRlZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0T25seUNvcnJlbGF0aW9ucyhvbmx5Q29ycmVsYXRpb25zKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVOYW1lOiAnbm9uY29ycmVsYXRlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdkZWx0YS1tYXBidG4gZGVsdGEtbWFwYnRuLW5vbmNvcnJlbGF0ZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1Nob3dpbmcgZXZlbnRzIHdpdGggbm8gY29ycmVsYXRpb25zJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKGJ0bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuLnN0YXRlKCdhbGwnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubHlDb3JyZWxhdGlvbnMgPSAnYWxsJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRPbmx5Q29ycmVsYXRpb25zKG9ubHlDb3JyZWxhdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZU5hbWU6ICdhbGwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uOiAnZGVsdGEtbWFwYnRuIGRlbHRhLW1hcGJ0bi1hbGwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1Nob3dpbmcgYWxsIGV2ZW50cycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uIChidG4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bi5zdGF0ZSgnY29ycmVsYXRlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9ICdjb3JyZWxhdGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRPbmx5Q29ycmVsYXRpb25zKG9ubHlDb3JyZWxhdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgY29ycmVsYXRlZEJ0bi5zdGF0ZShvbmx5Q29ycmVsYXRpb25zKTtcclxuICAgICAgICAgICAgICAgIGNvcnJlbGF0ZWRCdG4uYWRkVG8obWFwKTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgYmFzZWxheWVySWQgPSBxcy5iYXNlbGF5ZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZWxheWVyID0ge307XHJcbiAgICAgICAgICAgICAgICBpZiAoYmFzZWxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgcmVxdWVzdGVkIGJhc2VsYXllciB0byB2bS5sYXllcnMuYmFzZWxheWVycyBmaXJzdFxyXG4gICAgICAgICAgICAgICAgICAgIGJhc2VsYXllciA9IF8uZmluZChkZWx0YUNvbmZpZy5sYXllcnMuYmFzZWxheWVycywgeyBpZDogYmFzZWxheWVySWQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlQmFzZWxheWVyKGJhc2VsYXllcik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGJhc2VsYXllciBub3QgcHJlc2VudCBpbiBxdWVyeXN0cmluZywgc28ganVzdCBnbyB3aXRoIGRlZmF1bHRzXHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZWxheWVyID0gZGVsdGFDb25maWcubGF5ZXJzLmJhc2VsYXllcnNbZGVsdGFDb25maWcuZGVmYXVsdEJhc2VsYXllcl07XHJcbiAgICAgICAgICAgICAgICAgICAgdm0ubGF5ZXJzID0gXy5jbG9uZURlZXAoZGVsdGFDb25maWcubGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmFzZWxheWVyKGJhc2VsYXllcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbWFwLm9uKCdiYXNlbGF5ZXJjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBiYXNlbGF5ZXIgPSBfLmZpbmQoZGVsdGFDb25maWcubGF5ZXJzLmJhc2VsYXllcnMsIHsgbmFtZTogZS5uYW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRCYXNlbGF5ZXIoYmFzZWxheWVyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIG1hcC5vbignbW92ZWVuZCcsIF8uZGVib3VuY2UoZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TWFwWm9vbShlLnRhcmdldC5nZXRab29tKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBCb3VuZHMoZS50YXJnZXQuZ2V0Qm91bmRzKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlckV2ZW50c0J5TG9jYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodm0uYWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2hvdy9oaWRlIGV2ZW50IHRyYWNrIGJhc2VkIG9uIHpvb20gbGV2ZWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8ua2V5cyh2bS50cmFja0xheWVycy5nZXRCb3VuZHMoKSkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0LmdldFpvb20oKSA+IDEwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZExheWVyKHZtLnRyYWNrTGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLnJlbW92ZUxheWVyKHZtLnRyYWNrTGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sIDc1MCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QmFzZWxheWVyKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdXBkYXRlQmFzZWxheWVyKG5ld1ZhbHVlKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QWN0aXZlU291cmNlcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNvdXJjZXMgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QWN0aXZlVHlwZXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0eXBlcyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFNvdXJjZVR5cGUoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzb3VyY2VUeXBlID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q29uZmlkZW5jZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbmZpZGVuY2UgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QWN0aXZlRXZlbnQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVFdmVudC5hY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHZhciBhY3RpdmVNYXBMYXllciA9IF8uZmluZChtYXBMYXllcnMuZ2V0TGF5ZXJzKCksIHsgZmVhdHVyZTogdm0uYWN0aXZlRXZlbnQgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aXZlTWFwTGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVNYXBMYXllci5zZXRTdHlsZSh7IGNvbG9yOiBhY3RpdmVNYXBMYXllci5mZWF0dXJlLmV2ZW50U291cmNlLmNvbG9yLCBmaWxsT3BhY2l0eTogMC4yIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFjdGl2ZU1hcExheWVyLmJyaW5nVG9CYWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVFdmVudCA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICAgICAgdm0uYWN0aXZlRXZlbnQuYWN0aXZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGlmICghc3RhdGVTZXJ2aWNlLmdldEV2ZW50TGF5ZXJzKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnRMYXllcnMobWFwTGF5ZXJzLmdldExheWVycygpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHNob3dFdmVudFRyYWNrKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRMYXlvdXRDb21wb25lbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFtYXBMYXlvdXRDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGhhc24ndCBiZWVuIHNldCB5ZXQsIHNvIHRyeSB0byBmaW5kIGl0XHJcbiAgICAgICAgICAgICAgICBtYXBMYXlvdXRDb21wb25lbnQgPSBfLmZpbmQobmV3VmFsdWUsIHsgc3RhdGU6IHsgdGVtcGxhdGVOYW1lOiAnbWFwJyB9IH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKG1hcExheW91dENvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGZvdW5kIGl0LCBzbyBzZXQgdXAgdmFycyBhbmQgZXZlbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgdm0ubWFwSGVpZ2h0ID0gbWFwTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5oZWlnaHQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCBldmVudCBsaXN0ZW5lciBmb3IgY29udGFpbmVyIHJlc2l6ZVxyXG4gICAgICAgICAgICAgICAgICAgIG1hcExheW91dENvbXBvbmVudC5jb250YWluZXIub24oJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXNlIGEgJHRpbWVvdXQgdG8gbm90aWZ5IGFuZ3VsYXIgb2YgdGhlIGNoYW5nZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5tYXBIZWlnaHQgPSBtYXBMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLmhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldE9ubHlDb3JyZWxhdGlvbnMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldENvdW50cmllcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvdW50cmllcyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbiBcbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuY29udHJvbGxlcignc2lkZWJhckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBkZWx0YVNlcnZpY2UsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgXyxcbiAgICAgICAgZGVsdGFDb25maWdcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcblxuICAgICAgICB2bS5sb2dvID0gZGVsdGFDb25maWcubG9nbztcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5zb3VyY2VGaWx0ZXJFeHBhbmRlZCA9IHN0YXRlU2VydmljZS5nZXRTb3VyY2VGaWx0ZXJFeHBhbmRlZCgpO1xuICAgICAgICB2bS50eXBlRmlsdGVyRXhwYW5kZWQgPSBzdGF0ZVNlcnZpY2UuZ2V0VHlwZUZpbHRlckV4cGFuZGVkKCk7XG4gICAgICAgIHZtLnRlbXBvcmFsRmlsdGVyRXhwYW5kZWQgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXJFeHBhbmRlZCgpO1xuICAgICAgICB2bS5nb3RvRXhwYW5kZWQgPSBzdGF0ZVNlcnZpY2UuZ2V0R290b0V4cGFuZGVkKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFNvdXJjZUZpbHRlckV4cGFuZGVkKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLnNvdXJjZUZpbHRlckV4cGFuZGVkID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRUeXBlRmlsdGVyRXhwYW5kZWQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0udHlwZUZpbHRlckV4cGFuZGVkID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlckV4cGFuZGVkKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLnRlbXBvcmFsRmlsdGVyRXhwYW5kZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldEdvdG9FeHBhbmRlZCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5nb3RvRXhwYW5kZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuY29udHJvbGxlcigndGVtcG9yYWxGaWx0ZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBtb21lbnQsXG4gICAgICAgIGRlbHRhQ29uZmlnLFxuXHRcdCRtZFRvYXN0LFxuICAgICAgICBfXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcblxuICAgICAgICB2bS5tb21lbnQgPSBtb21lbnQ7XG4gICAgICAgIHZtLmRlbHRhQ29uZmlnID0gZGVsdGFDb25maWc7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5tb2RlID0gJHNjb3BlLm1vZGU7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0ubW9tZW50ID0gbW9tZW50O1xuICAgICAgICB2bS5zdGFydCA9ICcnO1xuICAgICAgICB2bS5zdG9wID0gJyc7XG4gICAgICAgIHZtLmR1cmF0aW9uTGVuZ3RoID0gcXMuZHVyYXRpb25MZW5ndGggPyBwYXJzZUludChxcy5kdXJhdGlvbkxlbmd0aCkgOiBkZWx0YUNvbmZpZy5kZWZhdWx0RHVyYXRpb25MZW5ndGg7XG4gICAgICAgIHZtLmR1cmF0aW9ucyA9IGRlbHRhQ29uZmlnLmR1cmF0aW9ucztcbiAgICAgICAgdm0uc2VsZWN0ZWREdXJhdGlvbiA9IHFzLmR1cmF0aW9uID8gXy5maW5kKGRlbHRhQ29uZmlnLmR1cmF0aW9ucywgeyB2YWx1ZTogcXMuZHVyYXRpb24gfSkgOiBfLmZpbmQoZGVsdGFDb25maWcuZHVyYXRpb25zLCB7IGRlZmF1bHQ6IHRydWUgfSk7XG4gICAgICAgIHZtLnJhbmdlcyA9IGRlbHRhQ29uZmlnLnJhbmdlcztcbiAgICAgICAgdm0uaW52YWxpZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIHRvZ2dsZSB0byB0ZWxsIHdoZXRoZXIgY2hhbmdlIHdhcyBtYWRlIGZyb20gYSByYW5nZSBidXR0b24gb3JcbiAgICAgICAgLy8gdGhlIGRhdGUvdGltZSBpbnB1dFxuICAgICAgICB2bS5zZXRGcm9tUmFuZ2UgPSBmYWxzZTtcblxuXG4gICAgICAgICRzY29wZS5pc0Vycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHZtLmludmFsaWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNldFRlbXBvcmFsRmlsdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHZtLmV4cGFuZGVkRHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB2bS5zdGFydCA9IG1vbWVudC51dGMobW9tZW50LnV0YygpLmVuZE9mKCdkJykpLnN1YnRyYWN0KHZtLmR1cmF0aW9uTGVuZ3RoLCB2bS5zZWxlY3RlZER1cmF0aW9uLnZhbHVlKS5zdGFydE9mKCdkJykudG9EYXRlKCk7XG4gICAgICAgICAgICAgICAgdm0uc3RvcCA9IG1vbWVudC51dGMoKS5lbmRPZignZCcpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodm0uc3RhcnQgJiYgdm0uc3RvcCkge1xuICAgICAgICAgICAgICAgIHZhciBtb21lbnRTdGFydCA9IG1vbWVudC51dGModm0uc3RhcnQudG9JU09TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgICAgIG1vbWVudFN0b3AgPSBtb21lbnQudXRjKHZtLnN0b3AudG9JU09TdHJpbmcoKSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobW9tZW50U3RhcnQuaXNCZWZvcmUobW9tZW50U3RvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uaW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGVtcG9yYWxGaWx0ZXIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHZtLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogdm0uc3RvcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiB2bS5leHBhbmRlZER1cmF0aW9uID8gdm0uc2VsZWN0ZWREdXJhdGlvbi52YWx1ZSA6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbkxlbmd0aDogdm0uZXhwYW5kZWREdXJhdGlvbiA/IHBhcnNlSW50KHZtLmR1cmF0aW9uTGVuZ3RoKSA6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uaW52YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1N0b3AgRGF0ZSBpcyBiZWZvcmUgU3RhcnQgRGF0ZS4nKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5pbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdUZW1wb3JhbCBmaWx0ZXIgY29udGFpbnMgaW52YWxpZCBkYXRlL3RpbWUgdmFsdWVzLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgICAgIHZtLnN0YXJ0ID0gcXMuc3RhcnQgPyBtb21lbnQudXRjKHFzLnN0YXJ0KS50b0RhdGUoKSA6IG1vbWVudC51dGMoKS5zdWJ0cmFjdChkZWx0YUNvbmZpZy5kZWZhdWx0VGltZVJhbmdlVmFsdWUsIGRlbHRhQ29uZmlnLmRlZmF1bHRUaW1lUmFuZ2VUeXBlKS5zdGFydE9mKGRlbHRhQ29uZmlnLmRlZmF1bHRUaW1lUmFuZ2VUeXBlKS50b0RhdGUoKTtcbiAgICAgICAgICAgIHZtLnN0b3AgPSBxcy5zdG9wID8gbW9tZW50LnV0Yyhxcy5zdG9wKS50b0RhdGUoKSA6IG1vbWVudC51dGMoKS5lbmRPZihkZWx0YUNvbmZpZy5kZWZhdWx0VGltZVJhbmdlVHlwZSkudG9EYXRlKCk7XG5cbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgIH07XG4gICAgICAgIGluaXRpYWxpemUoKTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsRmlsdGVyRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldFJhbmdlID0gZnVuY3Rpb24gKHVuaXRzLCB1bml0T2ZUaW1lKSB7XG4gICAgICAgICAgICB2YXIgbm93ID0gbW9tZW50LnV0YygpO1xuICAgICAgICAgICAgdm0uc3RhcnQgPSBtb21lbnQudXRjKG5vdykuYWRkKHVuaXRzLCB1bml0T2ZUaW1lKS50b0RhdGUoKTtcbiAgICAgICAgICAgIHZtLnN0b3AgPSBub3cudG9EYXRlKCk7XG4gICAgICAgICAgICB2bS5zZXRGcm9tUmFuZ2UgPSB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXJ0JywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgc3RvcCB0aW1lIGtlZXBpbmcgdGhlIGN1cnJlbnQgZHVyYXRpb25cbiAgICAgICAgICAgIGlmICghdm0uc2V0RnJvbVJhbmdlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9sZFRpbWUgPSBtb21lbnQudXRjKG9sZFZhbHVlKTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3VGltZSA9IG1vbWVudC51dGMobmV3VmFsdWUpO1xuICAgICAgICAgICAgICAgIHZhciBkaWZmID0gbW9tZW50LmR1cmF0aW9uKG5ld1RpbWUuZGlmZihvbGRUaW1lKSkuYXNNaW51dGVzKCk7XG4gICAgICAgICAgICAgICAgdm0uc3RvcCA9IG1vbWVudC51dGModm0uc3RvcC50b0lTT1N0cmluZygpKS5hZGQoZGlmZiwgJ01pbnV0ZXMnKS50b0RhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLnNldEZyb21SYW5nZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICBzZXRUZW1wb3JhbEZpbHRlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdG9wJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2bS5zdGFydCA9IG1vbWVudC51dGMobmV3VmFsdWUuc3RhcnQudG9JU09TdHJpbmcoKSkudG9EYXRlKCk7XG4gICAgICAgICAgICB2bS5zdG9wID0gbW9tZW50LnV0YyhuZXdWYWx1ZS5zdG9wLnRvSVNPU3RyaW5nKCkpLnRvRGF0ZSgpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG5ld1ZhbHVlLmR1cmF0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBuZXdWYWx1ZS5kdXJhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZS5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICB2bS5zZWxlY3RlZER1cmF0aW9uID0gXy5maW5kKHZtLmR1cmF0aW9ucywge3ZhbHVlOiBuZXdWYWx1ZS5kdXJhdGlvbn0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZS5kdXJhdGlvbkxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB2bS5kdXJhdGlvbkxlbmd0aCA9IG5ld1ZhbHVlLmR1cmF0aW9uTGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5leHBhbmRlZFJhbmdlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2bS5leHBhbmRlZER1cmF0aW9uID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLmRpcmVjdGl2ZSgnZGVsdGFUZW1wb3JhbEZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy90ZW1wb3JhbEZpbHRlci90ZW1wb3JhbEZpbHRlclRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ3RlbXBvcmFsRmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPScsXG4gICAgICAgICAgICAgICAgbW9kZTogJ0AnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpOyIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLmNvbnRyb2xsZXIoJ3R5cGVGaWx0ZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBkZWx0YUNvbmZpZyxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzO1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uZGVsdGFDb25maWcgPSBkZWx0YUNvbmZpZztcbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLmFjdGl2ZVNvdXJjZXMgPSBzdGF0ZVNlcnZpY2UuZ2V0QWN0aXZlU291cmNlcygpO1xuICAgICAgICB2bS50eXBlcyA9IF8uY2xvbmVEZWVwKGRlbHRhQ29uZmlnLnR5cGVzKTtcbiAgICAgICAgdm0uYWN0aXZlVHlwZXMgPSBbXTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFR5cGVGaWx0ZXJFeHBhbmRlZCh2bS5leHBhbmRlZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udG9nZ2xlVHlwZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgICAgICB0eXBlLmFjdGl2ZSA9ICF0eXBlLmFjdGl2ZTtcbiAgICAgICAgICAgIGlmICh0eXBlLmFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmICghXy5maW5kKHZtLmFjdGl2ZVR5cGVzLCB0eXBlKSkge1xuICAgICAgICAgICAgICAgICAgICB2bS5hY3RpdmVUeXBlcy5wdXNoKHR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlVHlwZXModm0uYWN0aXZlVHlwZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uZmluZCh2bS5hY3RpdmVUeXBlcywgdHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5yZW1vdmUodm0uYWN0aXZlVHlwZXMsIHR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlVHlwZXModm0uYWN0aXZlVHlwZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxc1R5cGVzID0gJGxvY2F0aW9uLnNlYXJjaCgpLnR5cGVzO1xuXG4gICAgICAgICAgICBpZiAocXNUeXBlcykge1xuICAgICAgICAgICAgICAgIHFzVHlwZXMgPSBxc1R5cGVzLnNwbGl0KCcsJyk7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHFzVHlwZXMsIGZ1bmN0aW9uICh0eXBlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IF8uZmluZCh2bS50eXBlcywgeyBuYW1lOiB0eXBlTmFtZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgdm0udG9nZ2xlVHlwZSh0eXBlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRBY3RpdmVTb3VyY2VzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmFjdGl2ZVNvdXJjZXMgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpOyIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdkZWx0YScpLmRpcmVjdGl2ZSgnZGVsdGFUeXBlRmlsdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL3R5cGVGaWx0ZXIvdHlwZUZpbHRlclRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ3R5cGVGaWx0ZXJDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbiBcbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2RlbHRhJykuY29udHJvbGxlcignc291cmNlRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgZGVsdGFDb25maWcsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLmRlbHRhQ29uZmlnID0gZGVsdGFDb25maWc7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5zb3VyY2VzID0gXy5jbG9uZURlZXAoZGVsdGFDb25maWcuc291cmNlcyk7XG4gICAgICAgIHZtLmFjdGl2ZVNvdXJjZXMgPSBbXTtcbiAgICAgICAgdm0uc291cmNlVHlwZXMgPSBfLmNsb25lRGVlcChkZWx0YUNvbmZpZy5zb3VyY2VUeXBlcyk7XG4gICAgICAgIHZtLnNvdXJjZVR5cGUgPSBxcy5zb3VyY2VUeXBlID8gXy5maW5kKHZtLnNvdXJjZVR5cGVzLCB7IG5hbWU6IHFzLnNvdXJjZVR5cGUgfSkgOiBfLmZpbmQoZGVsdGFDb25maWcuc291cmNlVHlwZXMsIHsgYWN0aXZlOiB0cnVlIH0pO1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U291cmNlRmlsdGVyRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZVNvdXJjZSA9IGZ1bmN0aW9uIChzb3VyY2UsIGlnbm9yZUFjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKCFpZ25vcmVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzb3VyY2UuYWN0aXZlID0gIXNvdXJjZS5hY3RpdmU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc291cmNlLmFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmICghXy5maW5kKHZtLmFjdGl2ZVNvdXJjZXMsIHNvdXJjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uYWN0aXZlU291cmNlcy5wdXNoKHNvdXJjZSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBY3RpdmVTb3VyY2VzKHZtLmFjdGl2ZVNvdXJjZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uZmluZCh2bS5hY3RpdmVTb3VyY2VzLCBzb3VyY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIF8ucmVtb3ZlKHZtLmFjdGl2ZVNvdXJjZXMsIHNvdXJjZSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBY3RpdmVTb3VyY2VzKHZtLmFjdGl2ZVNvdXJjZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRTb3VyY2VUeXBlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFNvdXJjZVR5cGUodm0uc291cmNlVHlwZS5uYW1lKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxc1NvdXJjZXMgPSBxcy5zb3VyY2VzO1xuXG4gICAgICAgICAgICBpZiAocXNTb3VyY2VzKSB7XG4gICAgICAgICAgICAgICAgLy8gYWN0aXZhdGUgc291cmNlcyBiYXNlZCBvbiBxdWVyeXN0cmluZ1xuICAgICAgICAgICAgICAgIHFzU291cmNlcyA9IHFzU291cmNlcy5zcGxpdCgnLCcpO1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh2bS5zb3VyY2VzLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZS5hY3RpdmUgPSBfLmluZGV4T2YocXNTb3VyY2VzLCBzb3VyY2UubmFtZSkgPiAtMTtcbiAgICAgICAgICAgICAgICAgICAgdm0udG9nZ2xlU291cmNlKHNvdXJjZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGFjdGl2YXRlIHNvdXJjZXMgYmFzZWQgb24gY29uZmlnXG4gICAgICAgICAgICAgICAgdm0uYWN0aXZlU291cmNlcyA9IF8uZmlsdGVyKHZtLnNvdXJjZXMsIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZS5hY3RpdmUgPT09IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodm0uYWN0aXZlU291cmNlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBY3RpdmVTb3VyY2VzKHZtLmFjdGl2ZVNvdXJjZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdm0uc2V0U291cmNlVHlwZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5kaXJlY3RpdmUoJ2RlbHRhU291cmNlRmlsdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL3NvdXJjZUZpbHRlci9zb3VyY2VGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdzb3VyY2VGaWx0ZXJDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZGVsdGEnKS5jb25maWcoZnVuY3Rpb24gKCRwcm92aWRlKSB7XG4gICAgICAgICRwcm92aWRlLmRlY29yYXRvcignJGh0dHBCYWNrZW5kJywgYW5ndWxhci5tb2NrLmUyZS4kaHR0cEJhY2tlbmREZWNvcmF0b3IpO1xuICAgIH0pLnJ1bihmdW5jdGlvbiAoJGh0dHBCYWNrZW5kLCBkZWx0YUNvbmZpZywgc3RhdGVTZXJ2aWNlLCBYTUxIdHRwUmVxdWVzdCwgbW9tZW50LCBfKXtcbiAgICAgICAgdmFyIGdldFN5bmMgPSBmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgcmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcbiAgICAgICAgICAgIHJlcXVlc3Quc2VuZChudWxsKTtcbiAgICAgICAgICAgIHJldHVybiBbcmVxdWVzdC5zdGF0dXMsIHJlcXVlc3QucmVzcG9uc2UsIHt9XTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdm90ZXJOYW1lT3ZlcnJpZGVVcmwgPSAnLi9zdGF0aWMvZGF0YS92b3Rlck5hbWUuanNvbicsXG4gICAgICAgICAgICB2b3Rlck5hbWVSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgZGVsdGFDb25maWcudm90ZUFwaS51cmwgKyAnL3ZvdGVycycsICdpJyksXG4gICAgICAgICAgICB2b3Rlc092ZXJyaWRlVXJsID0gJy4vc3RhdGljL2RhdGEvdm90ZXMuanNvbicsXG4gICAgICAgICAgICB2b3Rlc1JlZ2V4ID0gbmV3IFJlZ0V4cCgnXicgKyBkZWx0YUNvbmZpZy52b3RlQXBpLnVybCArICcvdm90ZXMvdm90ZXInLCAnaScpLFxuICAgICAgICAgICAgcmVhc29uc092ZXJyaWRlVXJsID0gJy4vc3RhdGljL2RhdGEvcmVhc29ucy5qc29uJyxcbiAgICAgICAgICAgIHJlYXNvbnNSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgZGVsdGFDb25maWcudm90ZUFwaS51cmwgKyAnL3JlYXNvbnMnLCAnaScpLFxuICAgICAgICAgICAgZXZlbnRzUmVnZXggPSBuZXcgUmVnRXhwKCdeJyArIGRlbHRhQ29uZmlnLnNlcnZlci51cmwsICdpJyksXG4gICAgICAgICAgICBwbG90RGF0YVJlZ2V4ID0gbmV3IFJlZ0V4cCgnXicgKyBkZWx0YUNvbmZpZy5ldmVudFNlcnZlci5hamF4VXJsICsgJy9wbG90LWRhdGEnLCAnaScpLFxuICAgICAgICAgICAgZnJhbWVzUmVnZXggPSBuZXcgUmVnRXhwKCdeJyArIGRlbHRhQ29uZmlnLmV2ZW50U2VydmVyLmFqYXhVcmwgKyAnL2ZyYW1lcycsICdpJyksXG4gICAgICAgICAgICBjb3JyZWxhdGlvbk92ZXJyaWRlVXJsID0gJy4vc3RhdGljL2RhdGEvY29ycmVsYXRpb24uanNvbicsXG4gICAgICAgICAgICBjb3VudHJpZXNPdmVycmlkZVVybCA9ICcuL3N0YXRpYy9kYXRhL2NvdW50cmllcy5qc29uJyxcbiAgICAgICAgICAgIHBsb3REYXRhID0gW107XG5cbiAgICAgICAgdmFyIGNvdW50cnlDb2RlcyA9IFsnVUEnLCAnQ04nLCAnVVMnLCAnTVknLCAnUEwnLCAnUFMnLCAnSlAnLCAnUFQnLCAnRUcnLCAnVE0nLCAnU0UnLCAnSUQnLCAnWUUnLCAnQ1onLCAnQlInLCAnQ1knLCAnTUEnLCAnS0gnLCAnTkcnLCAnUlUnLCAnRk0nLCAnS1onLCAnUEgnLCAnR1InLCAnQ0EnLCAnRlInLCAnSUUnXTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgICByZXF1ZXN0Lm9wZW4oJ0dFVCcsICcuL3N0YXRpYy9kYXRhL3Bsb3REYXRhLmpzb24nLCBmYWxzZSk7XG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQobnVsbCk7XG5cbiAgICAgICAgICAgIHZhciBkYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlKSxcbiAgICAgICAgICAgICAgICBzdGFydFRpbWUgPSAwLFxuICAgICAgICAgICAgICAgIHBvaW50cyA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDI1MDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGludGVuc2l0eSA9IE1hdGgucmFuZG9tKCkgKiAoMTAgLSAoLTEwKSkgKyAoLTEwKSxcbiAgICAgICAgICAgICAgICAgICAgc2Vuc29ySWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKDYpKTtcblxuICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKFsoc3RhcnRUaW1lICsgaSksIHNlbnNvcklkeCwgMCwgaW50ZW5zaXR5XSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRhdGEucG9pbnRzID0gcG9pbnRzO1xuXG4gICAgICAgICAgICBwbG90RGF0YSA9IGRhdGE7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB2YXIgZ2VuZXJhdGVFdmVudHMgPSBmdW5jdGlvbiAodXJsUGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgdGVtcG9yYWxGaWx0ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBzdGFydCA9IG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RhcnQpLFxuICAgICAgICAgICAgICAgIHN0b3AgPSBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0b3ApLFxuICAgICAgICAgICAgICAgIHJhbmdlID0gc3RvcC5kaWZmKHN0YXJ0LCAnZCcpLFxuICAgICAgICAgICAgICAgIG1hcEJvdW5kcyA9IHN0YXRlU2VydmljZS5nZXRNYXBCb3VuZHMoKSxcbiAgICAgICAgICAgICAgICBtaW5MYXQgPSBtYXBCb3VuZHMuX3NvdXRoV2VzdC5sYXQsXG4gICAgICAgICAgICAgICAgbWF4TGF0ID0gbWFwQm91bmRzLl9ub3J0aEVhc3QubGF0LFxuICAgICAgICAgICAgICAgIG1pbkxuZyA9IG1hcEJvdW5kcy5fc291dGhXZXN0LmxuZyxcbiAgICAgICAgICAgICAgICBtYXhMbmcgPSBtYXBCb3VuZHMuX25vcnRoRWFzdC5sbmcsXG4gICAgICAgICAgICAgICAgbWF4RmVhdHVyZXMgPSAwO1xuXG4gICAgICAgICAgICAvLyBkZXRlcm1pbmUgcmVxdWVzdGVkIHNvdXJjZVxuICAgICAgICAgICAgdmFyIGlkZW50aXR5ID0gXy5maW5kKGRlY29kZVVSSUNvbXBvbmVudCh1cmxQYXJhbXMuY3FsX2ZpbHRlcikuc3BsaXQoJytBTkQrJyksIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuc2VhcmNoKCdpZGVudGl0eScpID4gLTE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChpZGVudGl0eS5zZWFyY2goJz0nKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpdHkgPSBpZGVudGl0eS5zcGxpdCgnPScpWzFdID09PSAndHJ1ZSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlkZW50aXR5ID0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJhbmdlIDw9IDEpIHtcbiAgICAgICAgICAgICAgICBtYXhGZWF0dXJlcyA9IDEwMDA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJhbmdlID4gMSAmJiByYW5nZSA8PSAzKSB7XG4gICAgICAgICAgICAgICAgbWF4RmVhdHVyZXMgPSAxMDAwMDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmFuZ2UgPiAzICYmIHJhbmdlIDw9IDcpIHtcbiAgICAgICAgICAgICAgICBtYXhGZWF0dXJlcyA9IDEwMDAwMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWF4RmVhdHVyZXMgPSAxMDAwMDAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdG90YWxGZWF0dXJlcyA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXhGZWF0dXJlcyAtIDEgKyAxKSkgKyAxO1xuXG4gICAgICAgICAgICB2YXIgZXZlbnRzID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdGZWF0dXJlQ29sbGVjdGlvbicsXG4gICAgICAgICAgICAgICAgdG90YWxGZWF0dXJlczogdG90YWxGZWF0dXJlcyxcbiAgICAgICAgICAgICAgICBmZWF0dXJlczogW11cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG90YWxGZWF0dXJlczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxhdCA9IHBhcnNlRmxvYXQoKE1hdGgucmFuZG9tKCkgKiAobWF4TGF0IC0gbWluTGF0KSArIG1pbkxhdCkudG9GaXhlZCg2KSksXG4gICAgICAgICAgICAgICAgICAgIGxuZyA9IHBhcnNlRmxvYXQoKE1hdGgucmFuZG9tKCkgKiAobWF4TG5nIC0gbWluTG5nKSArIG1pbkxuZykudG9GaXhlZCg2KSksXG4gICAgICAgICAgICAgICAgICAgIGRhdGUgPSBtb21lbnQudXRjKHN0YXJ0LnZhbHVlT2YoKSArIE1hdGgucmFuZG9tKCkgKiAoc3RvcC52YWx1ZU9mKCkgLSBzdGFydC52YWx1ZU9mKCkpKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICBpZGVudGl0eVZhbHVlID0gaWRlbnRpdHk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaWRlbnRpdHkgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJhbmQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMiAtIDEgKyAxKSkgKyAxO1xuICAgICAgICAgICAgICAgICAgICBpZGVudGl0eVZhbHVlID0gcmFuZCA9PT0gMTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgZmVhdHVyZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ0ZlYXR1cmUnLFxuICAgICAgICAgICAgICAgICAgICBpZDogJ2V2ZW50cy5maWQnLFxuICAgICAgICAgICAgICAgICAgICBnZW9tZXRyeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1BvaW50JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzOiBbbG5nLCBsYXRdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdlb21ldHJ5X25hbWU6ICdldmVudF9sb2NhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2R1Y3RfaWQ6ICcwMDAwMDAwMDAwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aXR5OiBpZGVudGl0eVZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YXNldF9pZDogNyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50X3R5cGU6ICdTdGF0aWMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZV9wYXRoOiAnZmlsZTEuaDUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRfbG9uOiBsbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudF9sYXQ6IGxhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50X3RpbWU6IGRhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudF9jbGFzczogJ1VUWVAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRfY29uZmlkZW5jZTogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKDEwMCAtIDEgKyAxKSkgKyAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNfY29ycmVsYXRlZDogKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgxMCAtIDEpICsgMSkpICUgMiAhPT0gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50cnlfY29kZTogY291bnRyeUNvZGVzWyhNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMjcpKSldXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgZXZlbnRzLmZlYXR1cmVzLnB1c2goZmVhdHVyZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBbMjAwLCBKU09OLnN0cmluZ2lmeShldmVudHMpLCB7fV07XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB2YXIgZ2VuZXJhdGVFdmVudFRyYWNrcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhY3RpdmVFdmVudCA9IHN0YXRlU2VydmljZS5nZXRBY3RpdmVFdmVudCgpO1xuXG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgcmVxdWVzdC5vcGVuKCdHRVQnLCAnLi9zdGF0aWMvZGF0YS9ldmVudFRyYWNrcy5qc29uJywgZmFsc2UpO1xuICAgICAgICAgICAgcmVxdWVzdC5zZW5kKG51bGwpO1xuXG4gICAgICAgICAgICB2YXIgZXZlbnRUcmFja3MgPSBKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgICAgICAgZXZlbnRUcmFja3MuZmVhdHVyZXNbMF0uZ2VvbWV0cnkuY29vcmRpbmF0ZXMgPSBhY3RpdmVFdmVudC5nZW9tZXRyeS5jb29yZGluYXRlcztcbiAgICAgICAgICAgIGV2ZW50VHJhY2tzLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMgPSBhY3RpdmVFdmVudC5wcm9wZXJ0aWVzO1xuXG4gICAgICAgICAgICByZXR1cm4gWzIwMCwgSlNPTi5zdHJpbmdpZnkoZXZlbnRUcmFja3MpLCB7fV07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdlbmVyYXRlUGxvdERhdGEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpbml0aWFsaXplKCk7XG4gICAgICAgICAgICByZXR1cm4gWzIwMCwgSlNPTi5zdHJpbmdpZnkocGxvdERhdGEpLCB7fV07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdlbmVyYXRlRnJhbWVEYXRhID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGZyYW1lRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IHBsb3REYXRhLnBvaW50cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IFtdXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGZyYW1lSWR4ID0gMDsgZnJhbWVJZHggPCBmcmFtZURhdGEuY291bnQ7IGZyYW1lSWR4KyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZnJhbWUgPSB7XG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiA0NSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBwbG90RGF0YS5wb2ludHNbZnJhbWVJZHhdWzBdLFxuICAgICAgICAgICAgICAgICAgICBtaW46IC0xMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxMCxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiAnVVRZUCcsXG4gICAgICAgICAgICAgICAgICAgIHNlbnNvcjogcGxvdERhdGEuc2Vuc29yc1twbG90RGF0YS5wb2ludHNbZnJhbWVJZHhdWzFdXSxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiA0NVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDIwMjU7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBmcmFtZS52YWx1ZXMucHVzaChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoZnJhbWUubWF4IC0gZnJhbWUubWluKSArIGZyYW1lLm1pbikpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChmcmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcmFtZURhdGEucmVzdWx0cyA9IHJlc3VsdHM7XG5cbiAgICAgICAgICAgIHJldHVybiBbMjAwLCBKU09OLnN0cmluZ2lmeShmcmFtZURhdGEpLCB7fV07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVGVtcGxhdGVzIHJlcXVlc3RzIG11c3QgcGFzcyB0aHJvdWdoXG4gICAgICAgICRodHRwQmFja2VuZC53aGVuR0VUKC9odG1sJC8pLnBhc3NUaHJvdWdoKCk7XG5cbiAgICAgICAgLy8gVm90ZXIgTmFtZSBzZXJ2aWNlXG4gICAgICAgICRodHRwQmFja2VuZC53aGVuR0VUKHZvdGVyTmFtZVJlZ2V4KS5yZXNwb25kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTeW5jKHZvdGVyTmFtZU92ZXJyaWRlVXJsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVm90ZXMgc2VydmljZVxuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVCh2b3Rlc1JlZ2V4KS5yZXNwb25kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTeW5jKHZvdGVzT3ZlcnJpZGVVcmwpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZWFzb25zIHNlcnZpY2VcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQocmVhc29uc1JlZ2V4KS5yZXNwb25kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTeW5jKHJlYXNvbnNPdmVycmlkZVVybCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50cyBzZXJ2aWNlXG4gICAgICAgICRodHRwQmFja2VuZC53aGVuR0VUKGV2ZW50c1JlZ2V4KS5yZXNwb25kKGZ1bmN0aW9uIChtZXRob2QsIHVybCkge1xuICAgICAgICAgICAgdmFyIHVybFBhcmFtcyA9IF8uZnJvbVBhaXJzKF8ubWFwKHVybC5zcGxpdCgnPycpWzFdLnNwbGl0KCcmJyksIGZ1bmN0aW9uIChzKSB7IHJldHVybiBzLnNwbGl0KCc9Jyk7IH0pKTtcbiAgICAgICAgICAgIGlmICh1cmxQYXJhbXMudHlwZU5hbWUgPT09ICdkZWx0YTpldmVudHMnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlRXZlbnRzKHVybFBhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHVybFBhcmFtcy50eXBlTmFtZSA9PT0gJ2RlbHRhOnRyYWNrcycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVFdmVudFRyYWNrcygpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1cmxQYXJhbXMudHlwZU5hbWUgPT09ICdkZWx0YTpjb3JyZWxhdGluZ19ldmVudHMnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldFN5bmMoY29ycmVsYXRpb25PdmVycmlkZVVybCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHVybFBhcmFtcy50eXBlTmFtZSA9PT0gJ2RlbHRhOmNvdW50cmllcycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0U3luYyhjb3VudHJpZXNPdmVycmlkZVVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFBsb3QgZGF0YSBzZXJ2aWNlXG4gICAgICAgICRodHRwQmFja2VuZC53aGVuR0VUKHBsb3REYXRhUmVnZXgpLnJlc3BvbmQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUGxvdERhdGEoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRnJhbWVzIHNlcnZpY2VcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQoZnJhbWVzUmVnZXgpLnJlc3BvbmQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlRnJhbWVEYXRhKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiJdfQ==
