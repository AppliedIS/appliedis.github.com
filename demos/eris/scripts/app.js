/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {

    'use strict';

    var LAYOUT_KEY = 'erisLayoutConfig';
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

    var app = angular.module('eris', [
        'eris.config',
        'ngMaterial',
        'ngCookies',
        'ngResource',
        'ngSanitize',
        'ngAnimate',
        'ngWebworker',
        'nemLogging',
        'ui-leaflet',
        'LocalStorageModule',
        'cfp.hotkeys',
        'es.ngUtcDatepicker',
        'emguo.poller'
    ]);

    app.config(['$provide', '$mdThemingProvider', 'WebworkerProvider', '$locationProvider', 'pollerConfig', function ($provide, $mdThemingProvider, WebworkerProvider, $locationProvider, pollerConfig) {
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

        pollerConfig.smart = true;

        $mdThemingProvider.theme('default').primaryPalette('grey').accentPalette('blue').dark();
        $mdThemingProvider.theme('success-toast');
        $mdThemingProvider.theme('fail-toast');
        $mdThemingProvider.theme('warn-toast');
        $mdThemingProvider.theme('info-toast');

        WebworkerProvider.setHelperPath('./scripts/webworkerDeps/worker_wrapper.js');

        $locationProvider.html5Mode(true);
    }])
    .value('moment', window.moment)
    .value('_', window._)
    .value('L', window.L)
    .value('tokml', window.tokml)
    .value('localStorage', window.localStorage)
    .value('d3', window.d3)
    .value('$', window.$)
    .value('c3', window.c3)
    .value('XMLHttpRequest', window.XMLHttpRequest)
    .value('LLtoMGRS', window.LLtoMGRS)
    .value('GoldenLayout', window.GoldenLayout)
    .value('Blob', window.Blob)
    .value('URL', window.URL);

    app.run(['$rootScope', '$http', '$compile', '$mdToast', '$window', '$location', 'erisConfig', 'erisService', 'localStorageService', 'stateService', 'searchService', 'voteService', 'GoldenLayout', '_', 'moment', function($rootScope, $http, $compile, $mdToast, $window, $location, erisConfig, erisService, localStorageService, stateService, searchService, voteService, GoldenLayout, _, moment) {
        // set a global scope param for the <title> element
        $rootScope.pageTitle = erisConfig.title;

        // retrieve/set voting info
        voteService.getVoter().then(function (result) {
            if (result.data.length > 0) {
                var voter = result.data[0];
                // user has voted before
                stateService.setVoter(voter);
                // check to see if voter is admin
                var isAdmin = _.indexOf(erisConfig.admins, _.toLower(voter.voter_name)) > -1;
                console.log(voter.voter_name, isAdmin);
                stateService.setIsAdmin(isAdmin);
                voteService.getVotesByVoter(voter.voter_name).then(function (votes) {
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

        var initializeLayout = function (layoutConfig) {
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

            layout.on('stateChanged', function () {
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

        var doLayout = function () {
            if ($location.search().reset) {
                initializeLayout(DEFAULT_LAYOUT);
            } else {
                // Try to use the layout configuration from local storage, but if
                // for whatever reason that fails, fallback to the default
                try {
                    initializeLayout(layoutConfig);
                    stateService.setLayoutConfig(layoutConfig);
                }
                catch (e) {
                    initializeLayout(DEFAULT_LAYOUT);
                    stateService.setLayoutConfig(layoutConfig);
                }
            }
        };

        var initialize = function () {
            var qs = $location.search();
            // check for values in querystring and go to an event if applicable
            if (qs[erisConfig.server.productField] && qs[erisConfig.server.datasetField]) {
                var eventParams = {};

                eventParams[erisConfig.server.productField] = qs[erisConfig.server.productField];
                eventParams[erisConfig.server.datasetField] = parseInt(qs[erisConfig.server.datasetField]);

                searchService.getEvent(eventParams).then(function (data) {
                    if (data.features.length > 0) {
                        var event = data.features[0];
                        var temporalFilter = {
                            start: moment.utc(event.properties[erisConfig.server.dateField]).subtract(1, 'h').toISOString(),
                            stop: moment.utc(event.properties[erisConfig.server.dateField]).add(1, 'h').toISOString(),
                            duration: null,
                            durationLength: null
                        };
                        var mapCenter = {
                            lat: event.properties[erisConfig.server.latField],
                            lng: event.properties[erisConfig.server.lonField],
                            zoom: stateService.getMapZoom() || 6
                        };
                        stateService.setMapZoom(mapCenter.zoom);
                        stateService.setMapCenter(mapCenter);
                        stateService.setTemporalFilter(temporalFilter);
                    } else {
                        $mdToast.show($mdToast.simple().textContent('Error: The specified product and dataset IDs returned 0 features.').theme('warn-toast').position('top right'));
                    }
                    doLayout();
                });
            } else {
                doLayout();
            }
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

    angular.module('eris').service('erisConfig', ['erisConfigLocal', 'moment', '_', 'L', function (erisConfigLocal, moment, _, L) {
        var cfg = {
            title: 'Eris',
            logo: 'Δ Eris',
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
                    units: -30,
                    unitOfTime: 'minutes',
                    label: '30 Min'
                },
                {
                    units: -1,
                    unitOfTime: 'hours',
                    label: 'Hour'
                },
                {
                    units: -6,
                    unitOfTime: 'hours',
                    label: '6 Hrs'
                },
                {
                    units: -12,
                    unitOfTime: 'hours',
                    label: '12 Hrs'
                },
                {
                    units: -24,
                    unitOfTime: 'hours',
                    label: '24 Hrs'
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
                eventFilters: true,
                countryFilter: true,
                fmvFilter: false,
                sensorFilter: true,
                voteFilter: true
            },
            onlyCorrelations: 'all',
            filterStrategy: 'server',
            strikeVisibility: 'hidden',
            fmvFilter: 'disabled',
            voteFilter: 'disabled',
            voteFilterType: 'Up',
            totalVotes: 1,
            activeColor: 'blue-800',
            inactiveColor: 'grey-900',
            defaultSortConfig: {}
        };

        // recursively merge the local config onto the default config
        angular.merge(cfg, erisConfigLocal);

        if (typeof cfg.defaultProjection === 'string') {
            // defaultProjection has been overwritten in local config
            // only a string value can be specified in local config, so use eval to produce the proper JS object
            cfg.defaultProjection = eval(cfg.defaultProjection); // jshint ignore:line
        }

        if (typeof cfg.layers.baselayers.cycle.layerParams.crs === 'string') {
            cfg.layers.baselayers.cycle.layerParams.crs = eval(cfg.layers.baselayers.cycle.layerParams.crs); // jshint ignore:line
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

    angular.module('eris').factory('Vote', ['erisConfig', function (
        erisConfig
    ) {
        // Constructor
        var Vote = function (vote_id, product_id, dataset_id, identity, voter_name, vote, reason, type, event_time) {
            this.vote_id = vote_id || null;
            this[erisConfig.server.productField] = product_id || '';
            this[erisConfig.server.datasetField] = dataset_id || '';
            this[erisConfig.server.identityField] = identity || null;
            this.voter_name = voter_name || '';
            this.vote = typeof(vote) === 'undefined' ? null : vote;
            this.reason = reason || '';
            this.type = type || null;
            this[erisConfig.server.dateField] = event_time;
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
                    data[erisConfig.server.identityField],
                    data.voter_name,
                    data.vote,
                    data.reason,
                    data.type,
                    data.event_time
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
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('eris').service('alertService', ['$http', '$q', 'erisConfig', function (
        $http,
        $q,
        erisConfig
    ) {
        return {
            getAlerts: function () {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: erisConfig.erisApi.url + '/alerts'
                }).then(function (result) {
                    d.resolve(result);
                });

                return d.promise;
            },
            getAlert: function (id) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: erisConfig.erisApi.url + '/alerts/' + id
                }).then(function (result) {
                    d.resolve(result);
                });

                return d.promise;
            },
            addAlert: function (alert) {
                var d = $q.defer();

                $http.post(erisConfig.erisApi.url + '/alerts', alert).then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            },
            updateAlert: function (alert) {
                var d = $q.defer();

                $http.put(erisConfig.erisApi.url + '/alerts/' + alert.alert_id, alert).then(function (result) {
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

    angular.module('eris').factory('coordinateConversionService', ['LLtoMGRS', function (LLtoMGRS) {
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

    angular.module('eris').service('erisService', ['erisConfig', 'coordinateConversionService', 'moment', '_', function (erisConfig, coordinateConversionService, moment, _) {
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
                    if (feature.properties[erisConfig.server.latField] && feature.properties[erisConfig.server.lonField]) {
                        tpl += '<li>' + feature.properties[erisConfig.server.latField].toFixed(3) + ', ' + feature.properties[erisConfig.server.lonField].toFixed(3) + '</li>';
                    }
                    if (feature.properties[erisConfig.server.dateField]) {
                        tpl += '<li>' + moment.utc(feature.properties[erisConfig.server.dateField]).format('YYYY-MM-DD HH:mm:ss[Z]') + '</li>';
                    }
                    tpl += '<li>' + feature.properties[erisConfig.server.sensorField] + '</li>';
                    tpl += feature.properties.is_correlated ? '<li>Correlated</li>' : '';
                    tpl += '<li>Confidence: ' + feature.properties[erisConfig.server.confidenceField] + '</li>';
                    if (feature.properties[erisConfig.server.locationUncertaintyField] !== null) {
                        tpl += '<li>Location Uncertainty: ' + feature.properties[erisConfig.server.locationUncertaintyField] + 'm</li>';
                    }
                    tpl += '<li>Max Intensity: ' + feature.properties[erisConfig.server.intensityField]/1000 + ' (kW/sr/µm)</li>';
                    tpl += '<li>Max SNR: ' + feature.properties[erisConfig.server.snrField] + '</li>';
                    tpl += '<li>Duration: ' + feature.properties[erisConfig.server.durationField] + '</li>';
                    tpl += '</ul>';

                    return tpl;
                }
                return '';
            },
            getStrikePopupContent: function (feature) {
                if (feature.properties) {
                    var ords = '<ul class="list-unstyled">';
                    for (var i = 1; i < 11; i++) {
                        if (feature.properties['ORDNANCE_' + i] && feature.properties['ORDNANCE_' + i] !== '') {
                            ords += '<li>' + i + ': ' + feature.properties['ORDNANCE_' + i] + '</li>';
                        }
                    }
                    ords += '</ul>';
                    var tpl = '<ul class="list-unstyled event-details-popup">';

                    tpl += '<li><b>' + feature.properties['ENTITY NAME'] + '</b></li>';
                    tpl += '<li>' + _.capitalize(feature.properties['TARGETS REMARK']) + '</li>';
                    tpl += '<li>' + ords + '<hr/></li>';
                    tpl += '<li>' + feature.properties.LAT + ', ' + feature.properties.LONG + '</li>';
                    tpl += '<li>' + moment.utc(feature.properties.date_time).format('YYYY-MM-DD HH:mm:ss[Z]') + '</li>';
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

    angular.module('eris').service('fmvService', ['$http', '$q', '$mdToast', 'erisConfig', 'stateService', 'moment', function (
        $http,
        $q,
        $mdToast,
        erisConfig,
        stateService,
        moment
    ) {
        var getRecordingsParams = function (params) {
            var starttime = moment.utc(params[erisConfig.server.dateField]).subtract(1, 's').unix(),
                endtime = moment.utc(params[erisConfig.server.dateField]).add(1, 's').unix(),
                coords = params[erisConfig.server.lonField].toString() + ' ' + params[erisConfig.server.latField].toString();

            return {
                geometry: 'CIRCLE',
                coords: coords,
                radius: 2500,
                starttime: starttime,
                endtime: endtime
            };
        };

        var getAllRecordingsParams = function () {
            var temporalFilter = stateService.getTemporalFilter(),
                starttime = moment.utc(temporalFilter.start).unix(),
                endtime = moment.utc(temporalFilter.stop).unix(),
                mapBounds = stateService.getMapBBox(),
                coords = mapBounds.east + ' ' + mapBounds.north + ',' + mapBounds.east + ' ' + mapBounds.south + ',' + mapBounds.west + ' ' + mapBounds.south + ',' + mapBounds.west + ' ' + mapBounds.north + ',' + mapBounds.east + ' ' + mapBounds.north;

            return {
                geometry: 'POLYGON',
                coords: coords,
                starttime: starttime,
                endtime: endtime
            };
        };

        return {
            getRecordings: function (params) {
                var d = $q.defer(),
                    recordingsParams = getRecordingsParams(params);

                $http({
                    method: 'GET',
                    url: erisConfig.fmv.url + '/recording/search?starttime=' + recordingsParams.starttime + '&endtime=' + recordingsParams.endtime + '&geometry=' + recordingsParams.geometry + '&radius=' + recordingsParams.radius + '&coords=' + recordingsParams.coords
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    d.reject(err);
                });

                return d.promise;
            },
            getAllRecordings: function () {
                var d = $q.defer(),
                    params = getAllRecordingsParams();

                $http({
                    method: 'GET',
                    url: erisConfig.fmv.url + '/recording/search?starttime=' + params.starttime + '&endtime=' + params.endtime + '&geometry=' + params.geometry + '&coords=' + params.coords
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    if (err.status === -1) {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving recordings. (CORS)').theme('warn-toast').position('top right'));
                    } else {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving recordings. Status: ' + err.status).theme('warn-toast').position('top right'));
                    }
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

    angular.module('eris').service('searchService', ['$http', '$resource', '$q', '$mdToast', 'erisConfig', 'erisService', 'stateService', 'moment', 'poller', '_', function (
        $http,
        $resource,
        $q,
        $mdToast,
        erisConfig,
        erisService,
        stateService,
        moment,
        poller,
        _
    ) {
        var eventsResource = null,
            eventsPoller = null;

        var getEventParams = function (params) {
            return {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                typeName: erisConfig.server.layers.events.workspace + ':' + erisConfig.server.layers.events.layer,
                cql_filter: erisConfig.server.productField + '=\'' + params[erisConfig.server.productField] + '\' AND ' + erisConfig.server.datasetField + '=' + params[erisConfig.server.datasetField],
                outputFormat: 'application/json'
            };
        };

        var getEventsParams = function (sources, votedEvents) {
            var temporalFilter = stateService.getTemporalFilter(),
                start = typeof temporalFilter.start === 'string' ? temporalFilter.start : temporalFilter.start.toISOString(),
                stop = typeof temporalFilter.stop === 'string' ? temporalFilter.stop : temporalFilter.stop.toISOString(),
                sourceType = stateService.getSourceType(),
                identities = _.map(sources, 'identity'),
                identityFilter = '',
                onlyCorrelations = stateService.getOnlyCorrelations(),
                correlationFilter = onlyCorrelations === 1 ? 'is_correlated=true AND ' : 'is_correlated IS NOT NULL AND ',
                filterStrategy = stateService.getFilterStrategy(),
                confidenceFilter = filterStrategy === 'server' ? erisConfig.server.confidenceField + '>=' + stateService.getConfidence() + ' AND ' : '',
                locationUncertaintyFilter = filterStrategy === 'server' ? '(' + erisConfig.server.locationUncertaintyField + '<=' + stateService.getLocationUncertainty() + ' OR ' + erisConfig.server.locationUncertaintyField + ' IS NULL)' + ' AND ' : '',
                intensity = stateService.getIntensity(),
                intensityFilter = filterStrategy === 'server' ? erisConfig.server.intensityField + '>=' + intensity.min + ' AND ' + erisConfig.server.intensityField + '<=' + intensity.max + ' AND ' : '',
                snr = stateService.getSnr(),
                snrFilter = filterStrategy === 'server' ? erisConfig.server.snrField + '>=' + snr.min + ' AND ' + erisConfig.server.snrField + '<=' + snr.max + ' AND ' : '',
                duration = stateService.getDuration(),
                durationFilter = filterStrategy === 'server' ? erisConfig.server.durationField + '>=\'' + moment.duration(duration.min, 's').format('mm:ss.SSS', { trim: false }) + '\' AND ' + erisConfig.server.durationField + '<=\'' + moment.duration(duration.max, 's').format('mm:ss.SSS', { trim: false }) + '\' AND ' : '',
                bbox = stateService.getMapBBox(),
                locationFilter = filterStrategy === 'server' ? 'BBOX(' + erisConfig.server.layers.events.geomField + ',' + bbox.west + ',' + bbox.south + ',' + bbox.east + ',' + bbox.north + ') AND ' : '',
                eventFilter = '';

            var sourceTypeFilter = sourceType === 'All' ?
                erisConfig.server.sourceTypeField + ' IS NOT NULL AND ' :
                erisConfig.server.sourceTypeField + '=\'' + sourceType + '\' AND ';

            // if the amount of identities selected is fewer than the total available, query on those identities to speed things up
            if (identities.length < erisConfig.sources.length) {
                _.forEach(identities, function (value) {
                    identityFilter += erisConfig.server.identityField + '=' + value + ' AND ';
                });
            } else {
                identityFilter = erisConfig.server.identityField + ' IS NOT NULL AND ';
            }

            if (stateService.getVoteFilter() === 'enabled') {
                _.forEach(votedEvents, function (e) {
                    eventFilter = eventFilter + '(product_id=\'' + e.product_id + '\' AND dataset_id=\'' + e.dataset_id + '\') OR ';
                });
                if (eventFilter === '') {
                    eventFilter = 'product_id=\'0\' AND dataset_id=\'0\' AND ';
                } else {
                    // strip off the last ' OR ' and use ' AND ' instead
                    eventFilter = '(' + eventFilter.substring(0, (eventFilter.length - 4)) + ') AND ';
                }
            }

            return {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                typeName: erisConfig.server.layers.events.workspace + ':' + erisConfig.server.layers.events.layer,
                cql_filter: sourceTypeFilter + identityFilter + correlationFilter + confidenceFilter + locationUncertaintyFilter + intensityFilter + snrFilter + durationFilter + locationFilter + eventFilter + erisConfig.server.dateField + '>=' + start + ' AND ' + erisConfig.server.dateField + '<=' + stop,
                outputFormat: 'application/json'
            };
        };

        var getEventTracksParams = function (params) {
            return {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                typeName: erisConfig.server.layers.tracks.workspace + ':' + erisConfig.server.layers.tracks.layer,
                cql_filter: erisConfig.server.productField + '=\'' + params[erisConfig.server.productField] + '\' AND ' + erisConfig.server.datasetField + '=' + params[erisConfig.server.datasetField],
                outputFormat: 'application/json'
            };
        };

        var getCorrelatingEventsParams = function (eventFeature) {
            if (eventFeature) {
                return {
                    service: 'WFS',
                    version: '1.0.0',
                    request: 'GetFeature',
                    typeName: erisConfig.server.layers.tracks.workspace + ':' + erisConfig.server.layers.correlating_events.layer,
                    cql_filter: erisConfig.server.productField + '_1=\'' + eventFeature.properties[erisConfig.server.productField] + '\' AND ' + erisConfig.server.datasetField + '_1=' + eventFeature.properties[erisConfig.server.datasetField],
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
                y_scale: params.y_scale || 'linear',
                y_units: params.y_units || erisConfig.intensityUnits,
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
                typeName: erisConfig.localServer.layers.countries.workspace + ':' + erisConfig.localServer.layers.countries.layer,
                outputFormat: 'application/json'
            };
        };

        var getStrikesParams = function () {
            var temporalFilter = stateService.getTemporalFilter(),
                start = typeof temporalFilter.start === 'string' ? temporalFilter.start : temporalFilter.start ? temporalFilter.start.toISOString() : moment.utc().subtract(6, 'h').toISOString(),
                stop = typeof temporalFilter.stop === 'string' ? temporalFilter.stop : temporalFilter.stop ? temporalFilter.stop.toISOString() : moment.utc().toISOString(),
                bbox = stateService.getMapBBox(),
                locationFilter = 'BBOX(geom,' + bbox.west + ',' + bbox.south + ',' + bbox.east + ',' + bbox.north + ') AND ';

            return {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                typeName: erisConfig.localServer.layers.strikes.workspace + ':' + erisConfig.localServer.layers.strikes.layer,
                cql_filter: locationFilter + erisConfig.localServer.layers.strikes.dateField + '>=' + start + ' AND ' + erisConfig.localServer.layers.strikes.dateField + '<=' + stop,
                outputFormat: 'application/json'
            };
        };

        return {
            getEvent: function (params) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: erisConfig.server.url,
                    params: getEventParams(params)
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    d.reject(err);
                });

                return d.promise;
            },
            getEvents: function (sources, votedEvents) {
                if (eventsPoller) {
                    eventsPoller.stop();
                }

                // poll for changes
                eventsResource = $resource(erisConfig.server.url + '?requestTime=' + moment.utc().unix(), {
                    eventsQuery: {
                        method: 'POST',
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        // we are overriding the transformRequest function to convert our POST
                        // data to urlencoded data as GeoServer requires this format for
                        // POSTs to work properly.
                        transformRequest: function (obj) {
                            var str = [];
                            for (var p in obj) {
                                if (obj.hasOwnProperty(p)) {
                                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                                }
                            }
                            return str.join('&');
                        }
                    }
                });

                // Get poller.
                eventsPoller = poller.get(eventsResource, {
                    delay: 300000, // 5 minutes
                    catchError: true,
                    argumentsArray: function () {
                        // set start and stop to always be the most current times according to the requested range
                        var temporalFilter = stateService.getTemporalFilter(),
                            start = typeof temporalFilter.start === 'string' ? temporalFilter.start : temporalFilter.start.toISOString(),
                            stop = typeof temporalFilter.stop === 'string' ? temporalFilter.stop : temporalFilter.stop.toISOString(),
                            temporalDiff = moment.utc(stop).diff(moment.utc(start), 'm');

                        stateService.setTemporalFilter({
                            start: moment.utc().subtract(temporalDiff, 'm').toDate(),
                            stop: moment.utc().toDate(),
                            isolated: true
                        });
                        return [getEventsParams(sources, votedEvents)];
                    }
                });

                return eventsPoller.promise.then(null, null, function (data) {
                    if (!data.$resolved) {
                        eventsPoller.stop();
                    }

                    return data;
                });
            },
            getEventsOnce: function (sources, votedEvents) {
                if (eventsPoller) {
                    eventsPoller.stop();
                }
                var d = $q.defer();

                $http({
                    method: 'POST',
                    url: erisConfig.server.url + '?requestTime=' + moment.utc().unix(),
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    // we are overriding the transformRequest function to convert our POST
                    // data to urlencoded data as GeoServer requires this format for
                    // POSTs to work properly.
                    transformRequest: function (obj) {
                        var str = [];
                        for (var p in obj) {
                            if (obj.hasOwnProperty(p)) {
                                str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                            }
                        }
                        return str.join('&');
                    },
                    data: getEventsParams(sources, votedEvents)
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    if (err.status === -1) {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving events. (CORS)').theme('warn-toast').position('top right'));
                    } else {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving events. Status: ' + err.status).theme('warn-toast').position('top right'));
                    }
                    d.reject(err);
                });

                return d.promise;
            },
            getEventTracks: function (params) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: erisConfig.server.url,
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
                    url: erisConfig.server.url,
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
                    url: erisConfig.eventServer.ajaxUrl + '/plot-data/',
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
                    url: erisConfig.eventServer.ajaxUrl + '/frames/',
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
                    url: erisConfig.localServer.url,
                    params: getCountriesParams()
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    d.reject(err);
                });

                return d.promise;
            },
            getScaleData: function (file) {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: erisConfig.scale.ajaxUrl + '/?file_name=' + file
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    d.reject(err);
                });

                return d.promise;
            },
            downloadGif: function (frames, dimensions) {
                var d = $q.defer();

                $http({
                    method: 'POST',
                    url: erisConfig.erisApi.url + '/gif',
                    data: {
                        frames: frames,
                        dimensions: dimensions
                    },
                    responseType: 'arraybuffer'
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    d.reject(err);
                });

                return d.promise;
            },
            getStrikes: function () {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: erisConfig.localServer.url,
                    params: getStrikesParams()
                }).then(function (result) {
                    d.resolve(result.data);
                }, function (err) {
                    console.log(err);
                    if(err.status === -1) {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving strikes. (CORS)').theme('warn-toast').position('top right'));
                    } else {
                        $mdToast.show($mdToast.simple().textContent('Error retrieving strikes. Status: ' + err.status).theme('warn-toast').position('top right'));
                        d.reject(err);
                    }
                });

                return d.promise;
            },
            downloadExtFiles: function (urlArr) {
                var d = $q.defer();

                $http({
                    method: 'POST',
                    url: erisConfig.extDownloadUrl + '/ext',
                    data: {
                        urls: urlArr
                    }
                }).then(function (result) {
                    d.resolve(result);
                }, function (err) {
                    console.log(err);
                    d.reject(err);
                });

                return d.promise;
            },
            exportKml: function (kml) {
                var d = $q.defer();

                $http({
                    method: 'POST',
                    url: erisConfig.extDownloadUrl + '/kml',
                    data: {
                        kml: kml
                    }
                }).then(function (result) {
                    d.resolve(result);
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

    angular.module('eris').service('stateService', ['$location', '$timeout', '$mdToast', 'erisConfig', 'moment', '_', function (
        $location,
        $timeout,
        $mdToast,
        erisConfig,
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
            eventFiltersExpanded = false,
            adminExpanded = false,
            locationFormat = queryString.locationFormat,
            mapBounds = null,
            mapBBox = {},
            mapZoom = queryString.zoom,
            mapCenter = erisConfig.mapCenter,
            temporalFilter = {
                start: queryString.start,
                stop: queryString.stop,
                duration: queryString.duration,
                durationLength: queryString.durationLength,
                isolated: false
            },
            baselayer = null,
            overlays = [],
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
            locationUncertainty = null,
            intensity = {},
            snr = {},
            duration = {},
            onlyCorrelations = queryString.onlyCorrelations,
            countryList = [],
            countries = [],
            sensorList = [],
            sensors = [],
            filterStrategy = queryString.filterStrategy,
            strikeVisibility = queryString.strikeVisibility,
            fmvFilter = queryString.fmvFilter,
            fmvLayers = null,
            voteFilter = queryString.voteFilter,
            voteFilterType = queryString.voteFilterType,
            votedEvents = null,
            totalVotes = null,
            centerOnActiveEvent = true,
            sortConfig = _.clone(erisConfig.defaultSortConfig),
            currSort = _.find(sortConfig, { enabled: true }),
            alert = null,
            isAdmin = false,
            poll = false;

        if (queryString.sortColumn) {
            currSort.enabled = false;
            currSort = sortConfig[queryString.sortColumn];
            currSort.enabled = true;
        }

        if (queryString.sortDirection) {
            currSort.direction = queryString.sortDirection;
        }

        if (filterStrategy !== 'server') {
            // don't let this happen if temporal filter is too large
            var temporalDiff = moment.utc(temporalFilter.stop).diff(moment.utc(temporalFilter.start), 'h');

            if (temporalDiff > 24) {
                filterStrategy = 'server';
                queryString.filterStrategy = filterStrategy;
                $location.search(queryString).replace();
                $mdToast.show($mdToast.simple().textContent('Temporal filter range must be shorter than 24 hours to filter client-side.').theme('warn-toast').position('top right'));
            }
        }

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
                        location.format = erisConfig.defaultLocationFormat;
                        self.setLocationFormat(location.format);
                    }
                    // if anything change, update $location.search() and broadcast notification of change
                    if (queryString.n !== location.north.toString() || queryString.s !== location.south.toString() || queryString.e !== location.east.toString() || queryString.w !== location.west.toString() || queryString.locationFormat !== location.format || queryString.ne !== location.mgrsNE.toString() || queryString.sw !== location.mgrsSW.toString()) {
                        if (location.north !== '' && location.south !== '' && location.east !== '' && location.west !== '' && location.format === 'dd') {
                            location.north = parseFloat(location.north).toFixed(6);
                            location.south = parseFloat(location.south).toFixed(6);
                            location.east = parseFloat(location.east).toFixed(6);
                            location.west = parseFloat(location.west).toFixed(6);
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
                        $location.search(queryString).replace();
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
            getEventFiltersExpanded: function () {
                return eventFiltersExpanded;
            },
            setEventFiltersExpanded: function (data) {
                eventFiltersExpanded = data;
            },
            getAdminExpanded: function () {
                return adminExpanded;
            },
            setAdminExpanded: function (data) {
                adminExpanded = data;
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
                $location.search(queryString).replace();
            },
            getMapCenter: function () {
                return mapCenter;
            },
            setMapCenter: function (data) {
                mapCenter = data;
            },
            getLocationFormat: function () {
                return locationFormat;
            },
            setLocationFormat: function (format) {
                locationFormat = format;
                queryString.locationFormat = locationFormat;
                $location.search(queryString).replace();
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
                    $location.search(queryString).replace();
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
                $location.search(queryString).replace();
            },
            getOverlays: function () {
                return overlays;
            },
            setOverlays: function (data) {
                overlays = data;
                queryString.overlays = overlays;
                $location.search(queryString).replace();
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
                $location.search(queryString).replace();
            },
            getActiveTypes: function () {
                return activeTypes;
            },
            setActiveTypes: function (data) {
                activeTypes = data;
                var typeString = _.map(activeTypes, 'name').join(',');
                queryString.types = typeString !== '' ? typeString : null;
                $location.search(queryString).replace();
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
            setActiveEvent: function (data, isMapClick) {
                isMapClick = isMapClick || false;
                centerOnActiveEvent = !isMapClick;
                activeEvent = data;
                queryString[erisConfig.server.productField] = data ? data.properties[erisConfig.server.productField] : null;
                queryString[erisConfig.server.datasetField] = data ? data.properties[erisConfig.server.datasetField] : null;
                $location.search(queryString).replace();
            },
            getCenterOnActiveEvent: function () {
                return centerOnActiveEvent;
            },
            setCenterOnActiveEvent: function (data) {
                centerOnActiveEvent = data;
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
                $location.search(queryString).replace();
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
                $location.search(queryString).replace();
            },
            getLocationUncertainty: function () {
                return locationUncertainty;
            },
            setLocationUncertainty: function (data) {
                locationUncertainty = data;
                queryString.locationUncertainty = locationUncertainty;
                $location.search(queryString).replace();
            },
            getIntensity: function () {
                return intensity;
            },
            setIntensity: function (data) {
                intensity = data;
                queryString.intensityMin = intensity.min;
                queryString.intensityMax = intensity.max;
                $location.search(queryString).replace();
            },
            getSnr: function () {
                return snr;
            },
            setSnr: function (data) {
                snr = data;
                queryString.snrMin = snr.min;
                queryString.snrMax = snr.max;
                $location.search(queryString).replace();
            },
            getDuration: function () {
                return duration;
            },
            setDuration: function (data) {
                duration = data;
                queryString.durationMin = duration.min;
                queryString.durationMax = duration.max;
                $location.search(queryString).replace();
            },
            getOnlyCorrelations: function () {
                return onlyCorrelations;
            },
            setOnlyCorrelations: function (data) {
                onlyCorrelations = data;
                queryString.onlyCorrelations = onlyCorrelations;
                $location.search(queryString).replace();
            },
            getCountryList: function () {
                return countryList;
            },
            setCountryList: function (data) {
                countryList = data;
            },
            getCountries: function () {
                return countries;
            },
            setCountries: function (data) {
                countries = data;
                queryString.countries = countries;
                $location.search(queryString).replace();
            },
            getSensorList: function () {
                return sensorList;
            },
            setSensorList: function (data) {
                sensorList = data;
            },
            getSensors: function () {
                return sensors;
            },
            setSensors: function (data) {
                sensors = data;
                queryString.sensors = sensors;
                $location.search(queryString).replace();
            },
            getFilterStrategy: function () {
                return filterStrategy;
            },
            setFilterStrategy: function (data) {
                filterStrategy = data;
                queryString.filterStrategy = filterStrategy;
                $location.search(queryString).replace();
            },
            getStrikeVisibility: function () {
                return strikeVisibility;
            },
            setStrikeVisibility: function (data) {
                strikeVisibility = data;
                queryString.strikeVisibility = strikeVisibility;
                $location.search(queryString).replace();
            },
            getFMVFilter: function () {
                return fmvFilter;
            },
            setFMVFilter: function (data) {
                fmvFilter = data;
                queryString.fmvFilter = fmvFilter;
                $location.search(queryString).replace();
            },
            getFMVLayers: function () {
                return fmvLayers;
            },
            setFMVLayers: function (data) {
                fmvLayers = data;
            },
            getVoteFilter: function () {
                return voteFilter;
            },
            setVoteFilter: function (data) {
                voteFilter = data;
                queryString.voteFilter = voteFilter;
                $location.search(queryString).replace();
            },
            getVoteFilterType: function () {
                return voteFilterType;
            },
            setVoteFilterType: function (data) {
                voteFilterType = data;
                queryString.voteFilterType = voteFilterType;
                $location.search(queryString).replace();
            },
            getVotedEvents: function () {
                return votedEvents;
            },
            setVotedEvents: function (data) {
                votedEvents = data;
            },
            getTotalVotes: function () {
                return totalVotes;
            },
            setTotalVotes: function (data) {
                totalVotes = data;
                queryString.totalVotes = totalVotes;
                $location.search(queryString).replace();
            },
            getSortConfig: function () {
                return sortConfig;
            },
            setSortConfig: function (data) {
                sortConfig = data;
                currSort = _.find(sortConfig, { enabled: true });
                queryString.sortColumn = currSort.column;
                queryString.sortDirection = currSort.direction;
                $location.search(queryString).replace();
            },
            getAlert: function () {
                return alert;
            },
            setAlert: function(data) {
                alert = data;
            },
            getIsAdmin: function () {
                return isAdmin;
            },
            setIsAdmin: function (data) {
                isAdmin = data;
            },
            getPoll: function () {
                return poll;
            },
            setPoll: function (data) {
                poll = data;
                queryString.poll = poll;
                $location.search(queryString).replace();
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

    angular.module('eris').service('voteService', ['$http', '$q', 'erisConfig', function (
        $http,
        $q,
        erisConfig
    ) {
        return {
            getReasons: function () {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: erisConfig.erisApi.url + '/reasons'
                }).then(function (result) {
                    d.resolve(result);
                });

                return d.promise;
            },
            getVoters: function () {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: erisConfig.erisApi.url + '/voters'
                }).then(function (result) {
                    d.resolve(result);
                });

                return d.promise;
            },
            getVoter: function () {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: erisConfig.erisApi.url + '/voters/voter'
                }).then(function (result) {
                    d.resolve(result);
                });

                return d.promise;
            },
            addVoter: function () {
                var d = $q.defer();

                $http.post(erisConfig.erisApi.url + '/voters').then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            },
            getVotes: function (params) {
                params = params || null;
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: erisConfig.erisApi.url + '/votes',
                    params: params
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
                    url: erisConfig.erisApi.url + '/votes/voter/' + voter_name
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
                    url: erisConfig.erisApi.url + '/votes/' + vote_id
                }).then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            },
            castVote: function (vote) {
                var d = $q.defer();

                $http.post(erisConfig.erisApi.url + '/votes', vote).then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            },
            updateVote: function (vote) {
                var d = $q.defer();

                $http.put(erisConfig.erisApi.url + '/votes/' + vote.vote_id, vote).then(function (result) {
                    d.resolve(result);
                }).catch(function (error) {
                    d.reject(error);
                });

                return d.promise;
            },
            deleteVote: function (vote_id) {
                var d = $q.defer();

                $http.delete(erisConfig.erisApi.url + '/votes/' + vote_id).then(function (result) {
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

    angular.module('eris').controller('adminController', ['$scope', 'moment', 'stateService', 'alertService', function (
        $scope,
        moment,
        stateService,
        alertService
    ) {
        var vm = this;

        vm.stateService = stateService;
        vm.expanded = $scope.expanded;
        vm.alertId = null;
        vm.alertClass = null;
        vm.alertMessage = null;
        vm.alertIsActive = false;
        vm.types = [{
            label: 'Warning',
            value: 'md-warn'
        }, {
            label: 'Info',
            value: 'md-accent'
        }];

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setAdminExpanded(vm.expanded);
        };

        vm.updateAlert = function () {
            var alert = {
                alert_id: vm.alertId,
                class: vm.alertClass,
                message: vm.alertMessage,
                started: null,
                ended: null,
                is_active: vm.alertIsActive
            };

            if (vm.alertId) {
                alertService.updateAlert(alert).then(function () {
                    stateService.setAlert(alert);
                }).catch(function (err) {
                    console.log(err);
                });
            } else {
                alertService.addAlert(alert).then(function () {
                    stateService.setAlert(alert);
                }).catch(function (err) {
                    console.log(err);
                });
            }
        };

        $scope.$watchCollection('vm.stateService.getAlert()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.alertId = newValue.alert_id || null;
            vm.alertClass = newValue.class || null;
            vm.alertMessage = newValue.message || null;
            vm.alertIsActive = newValue.is_active || false;
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

    angular.module('eris').directive('erisAdmin', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/admin/adminTemplate.html',
            controller: 'adminController',
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

    angular.module('eris').controller('alertController', ['$scope', 'stateService', 'alertService', '_', function (
        $scope,
        stateService,
        alertService,
        _
    ) {
        var vm = this,
            initialized = false;

        vm.stateService = stateService;
        vm.alert = null;
        vm.closeIcon = '<i class="fa fa-remove"></i>';
        vm.close = function () {
            vm.alert.class = 'hide';
        };

        var initialize = function () {
            alertService.getAlerts().then(function (result) {
                if (result.data.length > 0) {
                    vm.alert = _.orderBy(result.data, ['alert_id'], ['desc'])[0];
                }
                stateService.setAlert(vm.alert);
                initialized = true;
            });
        };

        initialize();

        $scope.$watchCollection('vm.stateService.getAlert()', function (newValue, oldValue) {
            if (initialized) {
                if (angular.equals(newValue, oldValue)) {
                    return;
                }
                vm.alert = newValue;
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

    angular.module('eris').directive('erisAlert', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/alert/alertTemplate.html',
            controller: 'alertController',
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

    angular.module('eris').controller('eventFiltersController', ['$scope', '$location', '$timeout', 'stateService', 'erisConfig', '_', function (
        $scope,
        $location,
        $timeout,
        stateService,
        erisConfig,
        _
    ) {
        var vm = this,
            qs = $location.search(),
            filterStrategy = qs.filterStrategy ? qs.filterStrategy : erisConfig.filterStrategy;

        vm.stateService = stateService;
        vm.erisConfig = erisConfig;
        vm.expanded = $scope.expanded;
        vm.confidence = _.clone(erisConfig.defaultConfidence);
        vm.locationUncertainty = _.clone(erisConfig.defaultLocationUncertainty);
        vm.intensity = {
            min: _.clone(erisConfig.intensityFloor) / 1000,
            max: _.clone(erisConfig.intensityCeiling) / 1000
        };
        vm.snr = {
            min: _.clone(erisConfig.snrFloor),
            max: _.clone(erisConfig.snrCeiling)
        };
        vm.duration = {
            min: _.clone(erisConfig.durationFloor),
            max: _.clone(erisConfig.durationCeiling)
        };

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setEventFiltersExpanded(vm.expanded);
        };

        var initialize = function () {
            if (qs.confidence) {
                vm.confidence = parseFloat(qs.confidence);
            }
            stateService.setConfidence(vm.confidence);
            if (qs.locationUncertainty) {
                vm.locationUncertainty = parseInt(qs.locationUncertainty);
            }
            stateService.setLocationUncertainty(vm.locationUncertainty);
            var initIntensity = _.clone(vm.intensity);
            if (qs.intensityMin) {
                vm.intensity.min = parseFloat(qs.intensityMin) / 1000;
                initIntensity.min = parseFloat(qs.intensityMin);
            } else {
                initIntensity.min = initIntensity.min * 1000;
            }
            if (qs.intensityMax) {
                vm.intensity.max = parseFloat(qs.intensityMax) / 1000;
                initIntensity.max = parseFloat(qs.intensityMax);
            } else {
                initIntensity.max = initIntensity.max * 1000;
            }
            stateService.setIntensity(initIntensity);
            if (qs.snrMin) {
                vm.snr.min = parseFloat(qs.snrMin);
            }
            if (qs.snrMax) {
                vm.snr.max = parseFloat(qs.snrMax);
            }
            stateService.setSnr(vm.snr);
            if (qs.durationMin) {
                vm.duration.min = parseInt(qs.durationMin);
            }
            if (qs.durationMax) {
                vm.duration.max = parseInt(qs.durationMax);
            }
            stateService.setDuration(vm.duration);
        };

        initialize();

        $scope.$watch('vm.stateService.getFilterStrategy()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            filterStrategy = newValue;
        });

        $scope.$watch('vm.confidence', _.debounce(function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            $timeout(function () {
                stateService.setConfidence(parseFloat(newValue));
            });
        }, filterStrategy === 'server' ? 500 : 50));

        $scope.$watch('vm.locationUncertainty', _.debounce(function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            $timeout(function () {
                stateService.setLocationUncertainty(parseInt(newValue));
            });
        }, filterStrategy === 'server' ? 500 : 50));

        $scope.$watchCollection('vm.intensity', _.debounce(function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if (newValue.min >= newValue.max) {
                newValue.min = newValue.max - 1;
            }
            if (newValue.max <= newValue.min) {
                newValue.max = newValue.min + 1;
            }
            var newIntensity = {
                min: newValue.min * 1000,
                max: newValue.max * 1000
            };
            $timeout(function () {
                stateService.setIntensity(newIntensity);
            });
        }, filterStrategy === 'server' ? 500 : 50));

        $scope.$watchCollection('vm.snr', _.debounce(function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if (newValue.min >= newValue.max) {
                newValue.min = newValue.max - 1;
            }
            if (newValue.max <= newValue.min) {
                newValue.max = newValue.min + 1;
            }
            $timeout(function () {
                stateService.setSnr(newValue);
            });
        }, filterStrategy === 'server' ? 500 : 50));

        $scope.$watchCollection('vm.duration', _.debounce(function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if (newValue.min >= newValue.max) {
                newValue.min = newValue.max - 1;
            }
            if (newValue.max <= newValue.min) {
                newValue.max = newValue.min + 1;
            }
            $timeout(function () {
                stateService.setDuration(newValue);
            });
        }, filterStrategy === 'server' ? 500 : 50));
    }]);
})();

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('eris').directive('erisEventFilters', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/eventFilters/eventFiltersTemplate.html',
            controller: 'eventFiltersController',
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

    angular.module('eris').controller('eventViewerController', ['$scope', '$q', '$timeout', '$window', '$location', '$mdDialog', '$mdToast', 'erisConfig', 'stateService', 'searchService', 'fmvService', 'voteService', 'Vote', 'Webworker', 'moment', 'hotkeys', 'leafletData', 'c3', 'd3', 'L', '_', 'Blob', 'URL', function (
        $scope,
        $q,
        $timeout,
        $window,
        $location,
        $mdDialog,
        $mdToast,
        erisConfig,
        stateService,
        searchService,
        fmvService,
        voteService,
        Vote,
        Webworker,
        moment,
        hotkeys,
        leafletData,
        c3,
        d3,
        L,
        _,
        Blob,
        URL
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
            correlatingFrameRange,
            scaleData,
            fmvLayers;

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
            scaleData = null;
            fmvLayers = new L.featureGroup();

            vm._ = _;
            vm.erisConfig = erisConfig;
            vm.stateService = stateService;
            vm.eventData = null;
            vm.loading = true;
            vm.loadingScaleData = null;
            vm.loadingStatus = null;
            vm.loadingGif = null;
            vm.loadingCorrelatedGif = null;
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
            vm.eventTypes = _.clone(erisConfig.types);
            vm.voteObj = new Vote();
            vm.scaleJobUrl = null;
            vm.h5Url = null;
            vm.correlatedH5Url = null;
            vm.scaleFile = null;
            vm.playbackState = true;
            vm.playbackDirection = 'forward';
            vm.eventProps = [];
            vm.correlatedEventProps = [];
            vm.internalSource = _.find(erisConfig.sources, { identity: true });
            vm.externalSource = _.find(erisConfig.sources, { identity: false });
            vm.loadingFMV = null;
            vm.fmvResults = [];
            vm.chartLoading = false;
            var hotKeysConfig = hotkeys.bindTo($scope)
                .add({
                    combo: 'left',
                    description: 'Rewind',
                    callback: function () {
                        if (vm.selectedFeature) {
                            vm.setPlaybackDirection('backward');
                        }
                    }
                }).add({
                    combo: 'right',
                    description: 'Forward',
                    callback: function () {
                        if (vm.selectedFeature) {
                            vm.setPlaybackDirection('forward');
                        }
                    }
                }).add({
                    combo: 'up',
                    description: 'Play/Pause',
                    callback: function () {
                        if (vm.selectedFeature) {
                            vm.setPlaybackState(!vm.playbackState);
                        }
                    }
                }).add({
                    combo: 'w',
                    description: 'Upvote',
                    callback: function () {
                        if (vm.selectedFeature) {
                            vm.voteUp(null, true);
                        }
                    }
                }).add({
                    combo: 'a',
                    description: 'Previous Event',
                    callback: function () {
                        if (vm.selectedFeature) {
                            previousEvent();
                        }
                    }
                }).add({
                    combo: 's',
                    description: 'Downvote',
                    callback: function () {
                        if (vm.selectedFeature) {
                            vm.voteDown(null, true);
                        }
                    }
                }).add({
                    combo: 'd',
                    description: 'Next Event',
                    callback: function () {
                        if (vm.selectedFeature) {
                            nextEvent();
                        }
                    }
                }).add({
                    combo: 'esc',
                    description: 'Close Event',
                    callback: function () {
                        if (vm.selectedFeature) {
                            vm.close();
                        }
                    }
                });

            // add hotkeys for event types
            _.forEach(vm.eventTypes, function (type, idx) {
                hotKeysConfig.add({
                    combo: (idx + 1).toString(),
                    description: type.title,
                    callback: function () {
                        if (vm.selectedFeature) {
                            vm.voteUp(type.value, true);
                        }
                    }
                });
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

            animate = function () {
                if (playbackFrames.length > 0) {
                    if (gridLine) {
                        gridLine.style.display = 'none';
                    }
                    gridLine = frameIdx < playbackFrames - 1 ? angular.element('.time-' + _.replace(playbackFrames[frameIdx].timestamp, '.', ''))[0] : null;
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

        var getEventVote = function (event) {
            event = event || vm.selectedFeature;
            if (vm.voter) {
                // look for existing vote for this event
                var eventVote = _.find(vm.votes, { dataset_id: event.properties[erisConfig.server.datasetField], product_id: event.properties[erisConfig.server.productField] });
                vm.voteObj = eventVote ? Vote.transformer(eventVote) : new Vote();
            }
        };

        function nextEvent () { // jshint ignore:line
            var events = _.orderBy(stateService.getEvents(), ['properties.event_time'], ['desc']),
                currIdx = _.findIndex(events, function (e) {
                    return e.properties[erisConfig.server.productField] === vm.selectedFeature.properties[erisConfig.server.productField] && e.properties[erisConfig.server.datasetField] === vm.selectedFeature.properties[erisConfig.server.datasetField];
                }),
                nextEvent = currIdx < (events.length - 1) ? events[currIdx + 1] : events[0];

            getEventVote(nextEvent);

            while(vm.voteObj.vote_id !== null) {
                currIdx++;
                if (currIdx < events.length - 1) {
                    nextEvent = events[currIdx + 1];
                } else {
                    currIdx = 0;
                    nextEvent = events[0];
                }
                getEventVote(nextEvent);
            }

            nextEvent.scrollTo = true;
            stateService.setActiveEvent(nextEvent, true);
        }

        function previousEvent () { // jshint ignore:line
            var events = _.orderBy(stateService.getEvents(), ['properties.event_time'], ['desc']),
                currIdx = _.findIndex(events, function (e) {
                    return e.properties[erisConfig.server.productField] === vm.selectedFeature.properties[erisConfig.server.productField] && e.properties[erisConfig.server.datasetField] === vm.selectedFeature.properties[erisConfig.server.datasetField];
                }),
                previousEvent = currIdx > 0 ? events[currIdx - 1] : _.last(events);

            getEventVote(previousEvent);

            while(vm.voteObj.vote_id !== null) {
                currIdx--;
                if (currIdx > 0) {
                    previousEvent = events[currIdx - 1];
                } else {
                    currIdx = events.length;
                    previousEvent = _.last(events);
                }
                getEventVote(previousEvent);
            }

            previousEvent.scrollTo = true;
            stateService.setActiveEvent(previousEvent, true);
        }

        function formatChartData (plotData, correlatingDateDiff, baseUrl) {
            if (!location.origin) { // jshint ignore:line
                location.origin = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port: ''); // jshint ignore:line
            }
            importScripts(location.origin + baseUrl + '/scripts/webworkerDeps/lodash.js'); // jshint ignore:line

            var plotArr = [];
            _.forEach(plotData, function (data) {
                // the convention for a point is a 4 item array [time, sensor index, object index, intensity]
                _.forEach(data.points, function (point) {
                    var pointData = {},
                        pointValue = point[3];

                    // format values for log scale. set negative values to null
                    pointValue = pointValue < 0 ? null : Math.log(pointValue + 1) / Math.LN10;

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
                            return (Math.pow(10, value).toFixed(6)) - 1 + ' ' + defaultPlotData.y_column.units.label;
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
                                if (t !== 0) {
                                    t = t < 1 ? Math.pow(10, t) : Math.round(Math.pow(10, t));
                                    t = d < 0 ? 1 / t : t;

                                    if (t < 0.00001 || t > 100000) {
                                        return expFormat(t);
                                    }

                                    // Trim remaining floating values when they get too long
                                    // This avoids undesired zero padding provided by D3
                                    var result = numFormat(t);
                                    var parts = result.toString().split('.');
                                    if (parts.length > 1 && parts[1].length > 4) {
                                        return parts[0] + '.' + parts[1].substring(0, 2);
                                    }

                                    return result;
                                }
                                return 0;
                            }
                        }
                    }
                },
                zoom: {
                    enabled: true
                },
                subchart: {
                    show: false
                },
                onmouseout: function () {
                    chart.focus(chartFocus);
                }
            });
        };

        var sortSensors = function (sensors) {
            return _.sortBy(sensors, function (sensor) {
                if (_.startsWith(sensor, erisConfig.defaultSensor)) {
                    return sensor.split(' ')[1];
                }
                return sensor;
            });
        };

        var renderChart = function () {
            vm.chartLoading = true;
            // instantiate the web worker
            chartWorker = Webworker.create(formatChartData);

            // start the web worker and wait for the result
            chartWorker.run(plotData, correlatingDateDiff, erisConfig.baseUrl).then(function (result) {
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
                        if (_.endsWith(key, erisConfig.externalSourceLabel)) {
                            chartColors[key] = _.find(erisConfig.sources, { identity: false }).chartColors[source0Idx];
                            source0Idx++;
                        } else {
                            chartColors[key] = _.find(erisConfig.sources, { identity: true }).chartColors[source1Idx];
                            source1Idx++;
                        }
                    });

                    var data = {
                        json: chartData,
                        keys: {
                            x: 'time',
                            value: keys
                        },
                        colors: chartColors,
                        done: function () {
                            var gridLines = _.map(chartData, function (frame) {
                                return {
                                    value: frame.time,
                                    class: 'frame-line time-' + _.replace(frame.time, '.', ''),
                                    sensor: frame.sensor
                                };
                            });
                            chart.xgrids(gridLines);
                            vm.chartLoading = false;
                        }
                    };

                    chart.load(data);

                    // determine color for card title based on color in chart
                    _.forEach(vm.chipCards, function (card) {
                        card.color = chart.data.colors()[card.chartId];
                    });

                    updateChartFocus();

                    _.forEach(vm.correlatingChipCards, function (card) {
                        card.color = chart.data.colors()[card.chartId];
                    });
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
                var canvasClass = vm.selectedFeature.properties[erisConfig.server.identityField] ? _.replace(card[0], ' ', '') : _.replace(card[0], ' ', '') + erisConfig.externalSourceLabel,
                    chartId = vm.selectedFeature.properties[erisConfig.server.identityField] ? card[0] : card[0] + erisConfig.externalSourceLabel;

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
                        class: vm.selectedFeature.properties[erisConfig.server.identityField] ? _.replace(card[0], ' ', '') + erisConfig.externalSourceLabel : _.replace(card[0], ' ', ''),
                        chartId: vm.selectedFeature.properties[erisConfig.server.identityField] ? card[0] + erisConfig.externalSourceLabel : card[0]
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
            vm.loading = false;
            renderChart();
            renderFrames();
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
                if (vm.selectedFeature.properties[erisConfig.server.identityField]) {
                    // selected feature is us, so correlated data needs to be labeled
                    if (isCorrelation) {
                        result.sensors = _.map(result.sensors, function (sensor) {
                            return sensor + erisConfig.externalSourceLabel;
                        });
                    }
                } else {
                    // selected feature is them, so non-correlated data needs to be labeled
                    if (!isCorrelation) {
                        result.sensors = _.map(result.sensors, function (sensor) {
                            return sensor + erisConfig.externalSourceLabel;
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
                    if (vm.selectedFeature.properties[erisConfig.server.identityField]) {
                        r.sensorTitle = isCorrelation ? r.sensor + erisConfig.externalSourceLabel : r.sensor;
                    } else {
                        r.sensorTitle = !isCorrelation ? r.sensor + erisConfig.externalSourceLabel : r.sensor;
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

        var deleteVote = function () {
            voteService.deleteVote(vm.voteObj.vote_id).then(function () {
                _.remove(vm.votes, function (vote) {
                    return vote.vote_id === vm.voteObj.vote_id;
                });
                vm.voteObj = new Vote();
                $mdToast.show($mdToast.simple().textContent('Vote Removed').theme('success-toast').position('top right'));
            });
        };

        var castVote = function (isKeyboard) {
            voteService.castVote(vm.voteObj).then(function (result) {
                vm.voteObj = Vote.transformer(result.data);
                vm.votes.push(vm.voteObj);
                stateService.setVotes(vm.votes);
                if (vm.voteObj.vote) {
                    $mdToast.show($mdToast.simple().textContent('Upvote recorded').theme('success-toast').position('top right'));
                } else {
                    $mdToast.show($mdToast.simple().textContent('Downvote recorded').theme('fail-toast').position('top right'));
                }
                if (isKeyboard) {
                    nextEvent();
                }
            }).catch(function (error) {
                console.log(error);
                vm.voteObj.vote = null;
                $mdToast.show($mdToast.simple().textContent('Error Submitting Vote').theme('warn-toast').position('top right'));
            });
        };

        var updateVote = function (isKeyboard) {
            voteService.updateVote(vm.voteObj).then(function () {
                // look for existing vote for this event
                var eventVoteIdx = _.findIndex(vm.votes, { dataset_id: vm.voteObj[erisConfig.server.datasetField], product_id: vm.voteObj[erisConfig.server.productField] });
                var tempVotes = _.cloneDeep(vm.votes);
                if (eventVoteIdx >= 0) {
                    tempVotes[eventVoteIdx].vote = vm.voteObj.vote;
                    stateService.setVotes(tempVotes);
                }
                if (vm.voteObj.vote) {
                    $mdToast.show($mdToast.simple().textContent('Upvote recorded').theme('success-toast').position('top right'));
                } else {
                    $mdToast.show($mdToast.simple().textContent('Downvote recorded (' + vm.voteObj.reason + ')').theme('fail-toast').position('top right'));
                }
                if (isKeyboard) {
                    nextEvent();
                }
            }).catch(function (error) {
                console.log(error);
                vm.voteObj.vote = null;
                $mdToast.show($mdToast.simple().textContent('Error Submitting Vote').theme('warn-toast').position('top right'));
            });
        };

        vm.getScaleData = function () {
            vm.loadingScaleData = true;
            searchService.getScaleData(vm.scaleFile).then(function (data) {
                if (data.results.length > 0) {
                    vm.scaleJobUrl = erisConfig.scale.url + '/#/jobs/job/' + data.results[0].job.id;
                }
                vm.loadingScaleData = false;
            }, function (error) {
                console.log(error);
                vm.loadingScaleData = false;
                vm.scaleJobUrl = null;
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

        vm.voteUp = function (type, isKeyboard) {
            type = type || 'UTYP';
            isKeyboard = isKeyboard || false;

            vm.voteObj[erisConfig.server.productField] = vm.selectedFeature.properties[erisConfig.server.productField];
            vm.voteObj[erisConfig.server.datasetField] = vm.selectedFeature.properties[erisConfig.server.datasetField];
            vm.voteObj[erisConfig.server.identityField] = vm.selectedFeature.properties[erisConfig.server.identityField];
            vm.voteObj[erisConfig.server.typeField] = type;
            vm.voteObj.vote = true;
            vm.voteObj.reason = '';
            vm.voteObj[erisConfig.server.dateField] = vm.selectedFeature.properties[erisConfig.server.dateField];

            if (vm.voteObj.vote_id) {
                // vote has already been cast, so update instead
                updateVote(isKeyboard);
            } else {
                // new vote
                castVote(isKeyboard);
            }
        };

        vm.voteDown = function (reason, isKeyboard) {
            reason = reason || '';
            isKeyboard = isKeyboard || false;

            vm.voteObj[erisConfig.server.productField] = vm.selectedFeature.properties[erisConfig.server.productField];
            vm.voteObj[erisConfig.server.datasetField] = vm.selectedFeature.properties[erisConfig.server.datasetField];
            vm.voteObj[erisConfig.server.identityField] = vm.selectedFeature.properties[erisConfig.server.identityField];
            vm.voteObj.vote = false;
            vm.voteObj.reason = reason;
            vm.voteObj[erisConfig.server.dateField] = vm.selectedFeature.properties[erisConfig.server.dateField];

            if (vm.voteObj.vote_id) {
                // vote has already been cast, so update instead
                updateVote(isKeyboard);
            } else {
                // new vote
                castVote(isKeyboard);
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

        vm.support = function () {
            $window.location = 'mailto:' + erisConfig.supportPOC.join(';') + '?subject=Eris%20Event%20Question&body=Please review this event and provide feedback:%0D%0A%0D%0A' + encodeURIComponent($location.absUrl());
        };

        vm.downloadGif = function (ev, isCorrelation) {
            var fileName = '';

            if (isCorrelation) {
                fileName = '_correlated.gif';
                vm.loadingCorrelatedGif = true;
            } else {
                fileName = '.gif';
                vm.loadingGif = true;
            }

            var frames = _.filter(playbackFrames, { isCorrelation: isCorrelation }),
                canvas = angular.element('.' + _.replace(frames[0].sensorTitle, ' ', ''))[0],
                dimensions = { width: canvas.width, height: canvas.height };

            fileName = vm.selectedFeature.properties[erisConfig.server.productField] + '_' + vm.selectedFeature.properties[erisConfig.server.datasetField] + fileName;

            searchService.downloadGif(frames, dimensions).then(function (data) {
                if (isCorrelation) {
                    vm.loadingCorrelatedGif = false;
                } else {
                    vm.loadingGif = false;
                }
                var a = document.createElement('a');
                document.body.appendChild(a);
                var file = new Blob([new Uint8Array(data)], {type: 'image/gif'});
                a.href = URL.createObjectURL(file);
                a.download = fileName;
                a.click();
            }).catch(function (err) {
                console.log(err);
                $mdToast.show($mdToast.simple().textContent('Error Downloading GIF').theme('warn-toast').position('top right'));
                if (isCorrelation) {
                    vm.loadingCorrelatedGif = false;
                } else {
                    vm.loadingGif = false;
                }
            });
        };

        vm.gotoVideo = function (fmvResult) {
            $window.open(erisConfig.fmv.watchUrl + fmvResult.id, '_blank');
        };

        vm.onUpVoteClick = function ($mdMenu, ev) {
            if (vm.voteObj.vote === true) {
                // vote exists, so undo it
                deleteVote();
            } else {
                $mdMenu.open(ev);
            }
        };

        vm.onDownVoteClick = function ($mdMenu, ev) {
            if (vm.voteObj.vote === false) {
                // vote exists, so undo it
                deleteVote();
            } else {
                $mdMenu.open(ev);
            }
        };

        vm.openMenu = function ($mdMenu, ev) {
            $mdMenu.open(ev);
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

            fmvLayers.clearLayers();

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

                getEventVote();

                if (vm.selectedFeature && vm.selectedFeature.properties.file_path) {
                    vm.h5Url = _.startsWith(vm.selectedFeature.properties.file_path, 'http') ? vm.selectedFeature.properties.file_path : erisConfig.eventServer.filePathUrl + vm.selectedFeature.properties.file_path;
                    promises.push(getPlotData(vm.h5Url));
                    promises.push(getFrameData(vm.h5Url));
                }

                $q.all(promises).then(function () {
                    getCorrelatingEvents().then(function (result) {
                        if (result && result.features && result.features.length > 0) {
                            var correlatingPromises = [],
                                feature = result.features[0];

                            if (feature.properties.file_path_2) {
                                var filePath = _.startsWith(feature.properties.file_path_2, 'http') ? feature.properties.file_path_2 : erisConfig.eventServer.filePathUrl + feature.properties.file_path_2,
                                    eventParams = {};

                                vm.correlatedH5Url = filePath;
                                eventParams[erisConfig.server.productField] = feature.properties[erisConfig.server.productField + '_2'];
                                eventParams[erisConfig.server.datasetField] = feature.properties[erisConfig.server.datasetField + '_2'];
                                correlatingPromises.push(getCorrelatingEventData(eventParams));
                                correlatingPromises.push(getPlotData(filePath, true));
                                correlatingPromises.push(getFrameData(filePath, true));
                            }

                            $q.all(correlatingPromises).then(function () {
                                console.log('correlation present');
                                if (correlatingEventData) {
                                    hasCorrelation = true;
                                    defaultPlotData = _.find(plotData, { isCorrelation: false });
                                    correlatingPlotData = _.find(plotData, { isCorrelation: true });
                                    vm.correlatedEventProps = _.map(correlatingEventData.features, 'properties');
                                    if (feature.properties[erisConfig.server.identityField + '_1']) {
                                        vm.scaleFile = _.last(feature.properties.file_path_1.split('/'));
                                        vm.getScaleData();
                                    }
                                    if (feature.properties[erisConfig.server.identityField + '_2']) {
                                        vm.scaleFile = _.last(feature.properties.file_path_2.split('/'));
                                        vm.getScaleData();
                                    }
                                    initEventData();
                                }
                            });
                        } else {
                            hasCorrelation = false;
                            defaultPlotData = _.find(plotData, { isCorrelation: false });
                            if (vm.selectedFeature.properties[erisConfig.server.identityField]) {
                                vm.scaleFile = _.last(vm.selectedFeature.properties.file_path.split('/'));
                                vm.getScaleData();
                            }
                            initEventData();
                        }
                    });
                });

                // // query fmv service for a circle with a radius of 1000 meters for 5 minutes before and after the event using vm.selectedFeature properties
                // vm.loadingFMV = true;
                // var recordingsParams = {};
                // recordingsParams[erisConfig.server.dateField] = vm.selectedFeature.properties[erisConfig.server.dateField];
                // recordingsParams[erisConfig.server.latField] = vm.selectedFeature.properties[erisConfig.server.latField];
                // recordingsParams[erisConfig.server.lonField] = vm.selectedFeature.properties[erisConfig.server.lonField];
                //
                // fmvService.getRecordings(recordingsParams).then(function (result) {
                //     _.forEach(result.data.data, function (fmvResult) {
                //         vm.fmvResults.push(fmvResult);
                //     });
                //     vm.loadingFMV = false;
                // }, function (err) {
                //     console.log(err);
                //     $mdToast.show($mdToast.simple().textContent('Unable to retrieve video.').theme('fail-toast').position('top right'));
                //     vm.loadingFMV = false;
                // });
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

    angular.module('eris').controller('metadataDialogController', ['$scope', '$mdDialog', 'eventMetadatas', function (
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

    angular.module('eris').controller('gotoController', ['$scope', '$location', 'erisConfig', 'erisService', 'stateService', 'L', 'leafletData', function (
        $scope,
        $location,
        erisConfig,
        erisService,
        stateService,
        L,
        leafletData
    ) {
        var vm = this,
            qs = $location.search(),
            map = {};

        $scope.mode = $scope.$parent.mode;
        vm.erisConfig = erisConfig;
        vm.stateService = stateService;
        vm.expanded = $scope.expanded;
        vm.lat = '';
        vm.lng = '';
        vm.mgrs = '';
        vm.locationFormat = qs.locationFormat ? qs.locationFormat : erisConfig.defaultLocationFormat;

        var convertLatLng = function (newFormat) {
            return erisService.convertLatLng({
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

    angular.module('eris').directive('erisGoto', function () {
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

    angular.module('eris').controller('eventsController', ['$scope', '$timeout', '$location', 'erisConfig', 'erisService', 'searchService', 'stateService', 'leafletData', 'moment', 'L', '$', '_', function (
        $scope,
        $timeout,
        $location,
        erisConfig,
        erisService,
        searchService,
        stateService,
        leafletData,
        moment,
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
            locationUncertainty = 0,
            intensity = {
                min: 0,
                max: 0
            },
            snr = {
                min: 0,
                max: 0
            },
            duration = {
                min: 0,
                max: 0
            },
            onlyCorrelations = 'all',
            allEvents = [],
            votes = stateService.getVotes(),
            filterStrategy = qs.filterStrategy ? qs.filterStrategy : erisConfig.filterStrategy;

        vm.moment = moment;
        vm.stateService = stateService;
        vm.erisConfig = erisConfig;
        vm.eventsHeight = '';
        vm.eventsWidth = '';
        vm.mapEvents = [];
        vm.loading = true;
        vm.sortConfig = stateService.getSortConfig();

        var activateMapEvent = function (mapEvent) {
            var activeMapLayer = _.find(eventLayers, { feature: mapEvent });
            if (activeMapLayer) {
                activeMapLayer.setStyle({ color: '#b2ff59', fillOpacity: 0.8 });
                activeMapLayer.bringToFront();
            }
        };

        vm.showPopup = function ($event, mapEvent) {
            L.popup({ autoPan: false })
                .setLatLng(L.latLng(mapEvent.properties[erisConfig.server.latField], mapEvent.properties[erisConfig.server.lonField]))
                .setContent(erisService.getLeafletPopupContent(mapEvent))
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
            activeEvent = mapEvent;
            // update the event currently being viewed
            stateService.setActiveEvent(activeEvent, true);
            $event.stopPropagation();
        };

        vm.changeSort = function (col) {
            var currSort = _.find(vm.sortConfig, { enabled: true });
            if (angular.equals(vm.sortConfig[col], currSort)) {
                // change sort direction
                vm.sortConfig[col].direction = vm.sortConfig[col].direction === 'desc' ? 'asc' : 'desc';
            } else {
                // change column
                currSort.enabled = false;
                vm.sortConfig[col].enabled = true;
            }
            vm.mapEvents = _.orderBy(vm.mapEvents, [vm.sortConfig[col].field], [vm.sortConfig[col].direction]);
            stateService.setSortConfig(vm.sortConfig);
        };

        vm.getSortClass = function (col) {
            var currSort = _.find(vm.sortConfig, { enabled: true });
            if (angular.equals(vm.sortConfig[col], currSort)) {
                return currSort.direction === 'desc' ? 'fa fa-arrow-down' : 'fa fa-arrow-up';
            }
            return 'empty';
        };

        var initialize = function () {
            leafletData.getMap().then(function (data) {
                map = data;
                stateService.setSortConfig(vm.sortConfig);
            });
        };

        initialize();

        var getEventVotes = function () {
            _.forEach(vm.mapEvents, function (event) {
                // look for existing vote for this event
                event.vote = _.find(votes, { dataset_id: event.properties.dataset_id, product_id: event.properties.product_id });
                if (event.vote) {
                    if (typeof event.vote.vote === 'string') {
                        event.vote.vote = event.vote.vote === 'true'; // vote value comes back as a string, so cast to bool
                    }
                    event.vote.voteClass = event.vote.vote === true ? 'fa-thumbs-up' : event.vote.vote === false ? 'fa-thumbs-down' : '';
                    event.vote.voteColor = event.vote.vote === true ? 'green-700' : event.vote.vote === false ? 'red-700' : 'grey-700';
                }
            });
        };

        var filterEvents = function () {
            vm.mapEvents = _.filter(allEvents, function (event) {
                var eventDuration = moment.duration('00:' + event.properties[erisConfig.server.durationField]).asSeconds();
                if (onlyCorrelations === 'correlated') {
                    return event.properties.is_correlated && event.properties[erisConfig.server.confidenceField] >= confidence && (event.properties[erisConfig.server.locationUncertaintyField] <= locationUncertainty || confidence && event.properties[erisConfig.server.locationUncertaintyField] === null) && event.properties[erisConfig.server.intensityField] >= intensity.min && event.properties[erisConfig.server.intensityField] <= intensity.max && event.properties[erisConfig.server.snrField] >= snr.min && event.properties[erisConfig.server.snrField] <= snr.max && eventDuration >= duration.min && eventDuration <= duration.max;
                } else if (onlyCorrelations === 'noncorrelated') {
                    return !event.properties.is_correlated && event.properties[erisConfig.server.confidenceField] >= confidence && (event.properties[erisConfig.server.locationUncertaintyField] <= locationUncertainty || confidence && event.properties[erisConfig.server.locationUncertaintyField] === null) && event.properties[erisConfig.server.intensityField] >= intensity.min && event.properties[erisConfig.server.intensityField] <= intensity.max && event.properties[erisConfig.server.snrField] >= snr.min && event.properties[erisConfig.server.snrField] <= snr.max && eventDuration >= duration.min && eventDuration <= duration.max;
                } else if (filterStrategy !== 'server') {
                    return event.properties[erisConfig.server.confidenceField] >= confidence && (event.properties[erisConfig.server.locationUncertaintyField] <= locationUncertainty || confidence && event.properties[erisConfig.server.locationUncertaintyField] === null) && event.properties[erisConfig.server.intensityField] >= intensity.min && event.properties[erisConfig.server.intensityField] <= intensity.max && event.properties[erisConfig.server.snrField] >= snr.min && event.properties[erisConfig.server.snrField] <= snr.max && eventDuration >= duration.min && eventDuration <= duration.max;
                }
                return true;
            });

            var currSort = _.find(vm.sortConfig, { enabled: true });
            vm.mapEvents = _.orderBy(vm.mapEvents, [currSort.field], [currSort.direction]);

            getEventVotes();

            // update panel title
            if (eventsLayoutComponent) {
                eventsLayoutComponent.container.setTitle(eventsLayoutComponent.state.templateTitle + ' (' + vm.mapEvents.length + ')');
            }
        };

        $scope.$watchCollection('vm.stateService.getEventLayers()', function (newValue) {
            eventLayers = newValue;
            if (activeEvent) {
                var eventLayersOrdered = _.orderBy(eventLayers, ['feature.properties.event_time'], ['desc']);
                var activeMapEvent = _.find(eventLayersOrdered, function (l) {
                    return l.feature.properties[erisConfig.server.productField] === activeEvent.properties[erisConfig.server.productField] && l.feature.properties[erisConfig.server.datasetField] === activeEvent.properties[erisConfig.server.datasetField];
                });
                currIdx = _.indexOf(eventLayersOrdered, activeMapEvent);
                // use a $timeout to notify angular of the change
                $timeout(function () {
                    vm.topIndex = currIdx - 1;
                }, 250);
            }
        });

        $scope.$watchCollection('vm.stateService.getEvents()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            var currSort = _.find(vm.sortConfig, { enabled: true });
            allEvents = _.orderBy(newValue, [currSort.field], [currSort.direction]);
            filterEvents();

            // check for values in querystring and go to an event if applicable
            if (qs[erisConfig.server.productField] && qs[erisConfig.server.datasetField]) {
                var productId = qs[erisConfig.server.productField],
                    datasetId = parseInt(qs[erisConfig.server.datasetField]),
                    preExistingActiveEvent = _.clone(activeEvent);

                activeEvent = _.find(allEvents, function (e) {
                    return e.properties[erisConfig.server.productField] === productId && e.properties[erisConfig.server.datasetField] === datasetId;
                });

                if (activeEvent) {
                    activeEvent.scrollTo = true;
                    if (!preExistingActiveEvent) {
                        // update the event currently being viewed
                        stateService.setActiveEvent(activeEvent);
                    } else {
                        activateMapEvent(activeEvent);
                    }
                }
            }
        });

        $scope.$watch('vm.stateService.getFilterStrategy()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            filterStrategy = newValue;
        });

        $scope.$watch('vm.stateService.getConfidence()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            confidence = newValue;
            filterEvents();
        });

        $scope.$watch('vm.stateService.getLocationUncertainty()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            locationUncertainty = newValue;
            filterEvents();
        });

        $scope.$watchCollection('vm.stateService.getIntensity()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            intensity = newValue;
            filterEvents();
        });

        $scope.$watchCollection('vm.stateService.getSnr()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            snr = newValue;
            filterEvents();
        });

        $scope.$watchCollection('vm.stateService.getDuration()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            duration = newValue;
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

        $scope.$watchCollection('vm.stateService.getVotes()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            votes = newValue;
            getEventVotes();
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

    angular.module('eris').controller('mapController', ['$scope', '$window', '$location', '$timeout', '$mdToast', '$q', 'erisConfig', 'erisService', 'stateService', 'searchService', 'fmvService', 'leafletData', 'moment', 'tokml', 'L', '_', function (
        $scope,
        $window,
        $location,
        $timeout,
        $mdToast,
        $q,
        erisConfig,
        erisService,
        stateService,
        searchService,
        fmvService,
        leafletData,
        moment,
        tokml,
        L,
        _
    ) {
        var vm = this,
            qs = $location.search(),
            map = {},
            mapZoom = qs.zoom ? parseInt(qs.zoom) : erisConfig.mapCenter.zoom,
            mapLayers = new L.FeatureGroup(),
            strikeLayers = new L.FeatureGroup(),
            fmvLayers = new L.FeatureGroup(),
            overlays = qs.overlays || [],
            events = [],
            filteredEvents = [],
            voteFilter = qs.voteFilter ? qs.voteFilter : null,
            votedEvents = [],
            totalVotes = qs.totalVotes ? qs.totalVotes : 0,
            sources = [],
            types = [],
            confidence = 0,
            locationUncertainty = 0,
            intensity = {
                min: 0,
                max: 0
            },
            snr = {
                min: 0,
                max: 0
            },
            duration = {
                min: 0,
                max: 0
            },
            sourceType = qs.sourceType,
            mapLayoutComponent = null,
            onlyCorrelations = qs.onlyCorrelations ? qs.onlyCorrelations : erisConfig.onlyCorrelations,
            countryList = [],
            countries = qs.countries ? qs.countries : [],
            sensors = qs.sensors ? qs.sensors : [],
            filterStrategy = qs.filterStrategy ? qs.filterStrategy : erisConfig.filterStrategy,
            strikeVisibility = qs.strikeVisibility ? qs.strikeVisibility : erisConfig.strikeVisibility,
            fmvFilter = qs.fmvFilter ? qs.fmvFilter : null,
            ellipseLayer = new L.FeatureGroup();

        if (typeof overlays === 'string') {
            overlays = [overlays];
        }

        vm.mapHeight = 0;
        vm.loaderHeight = '';
        vm.stateService = stateService;
        vm.trackLayers = null;
        vm.activeEvent = null;
        vm.loading = false;

        if (qs.n || qs.ne) {
            var ddBounds = erisService.getDDBounds({
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
            vm.center = stateService.getMapCenter() || erisConfig.mapCenter;
        }

        // ui-leaflet defaults
        vm.defaults = {
            crs: erisConfig.defaultProjection,
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
        vm.layers = _.cloneDeep(erisConfig.layers);

        var updateOverlays = function (layers) {
            layers = layers || null;
            var doUpdate = function () {
                _.forEach(overlays, function (overlayId) {
                    var mapOverlay = layers.overlays[overlayId];
                    map.addLayer(mapOverlay);
                    mapOverlay.bringToFront();
                });
            };
            if (layers) {
                doUpdate();
            } else {
                leafletData.getLayers().then(function (mapLayers) {
                    layers = _.cloneDeep(mapLayers);
                    doUpdate();
                });
            }
        };

        var updateBaselayer = function (layer) {
            leafletData.getLayers().then(function (layers) {
                _.forEach(layers.baselayers, function (layer) {
                    map.removeLayer(layer);
                });
                map.addLayer(layers.baselayers[layer.id]);
                updateOverlays(layers);
            });
        };

        var mergeProps = function (feature, layer) {
            var activeEvent = stateService.getActiveEvent();
            layer.feature.properties = feature.properties;
            if (activeEvent.properties[erisConfig.server.productField] === layer.feature.properties[erisConfig.server.productField] && activeEvent.properties[erisConfig.server.datasetField] === layer.feature.properties[erisConfig.server.datasetField]) {
                _.merge(layer.feature.properties, activeEvent.properties);
            }
            return layer;
        };

        var showEventTrack = function () {
            // if (map.getZoom() > 10) {
            //     vm.loading = true;
            // }

            // get tracks from event
            var eventParams = {};
            eventParams[erisConfig.server.productField] = vm.activeEvent.properties[erisConfig.server.productField];
            eventParams[erisConfig.server.datasetField] = vm.activeEvent.properties[erisConfig.server.datasetField];
            searchService.getEventTracks(eventParams).then(function (data) {
                // draw the tracks
                var trackLayers = new L.FeatureGroup(),
                    geoJSON = null,
                    source0Idx = 0,
                    source1Idx = 0;

                _.forEach(data.features, function (feature) {
                    var trackColor = '';
                    if (feature.properties[erisConfig.server.identityField]) {
                        trackColor = _.find(erisConfig.sources, { identity: true }).chartColors[source0Idx];
                        source0Idx++;
                    } else {
                        trackColor = _.find(erisConfig.sources, {identity: false }).chartColors[source1Idx];
                        source1Idx++;
                    }
                    // use feature geometry when available, otherwise use the feature lat/lon point to create a geometry
                    if (feature.geometry !== null) {
                        geoJSON = L.geoJson(feature.geometry, {
                            style: { color: trackColor },
                            onEachFeature: function (featureData, layer) {
                                layer = mergeProps(feature, layer);
                            },
                            pointToLayer: function (feature, latlng) {
                                if (feature.type === 'Point') {
                                    return L.circleMarker(latlng, { color: trackColor, stroke: false, fillOpacity: 1, radius: 5 });
                                }
                            }
                        });
                        trackLayers.addLayer(geoJSON);
                    } else {
                        var latlng = L.latLng(feature.properties[erisConfig.server.latField], feature.properties[erisConfig.server.lonField]);

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
                                    layer = mergeProps(feature, layer);
                                }
                            });
                            trackLayers.addLayer(geoJSON);
                        }
                    }
                    if (geoJSON) {
                        geoJSON.eachLayer(function (layer) {
                            layer.feature.eventSource = _.find(erisConfig.sources, { identity: layer.feature.properties[erisConfig.server.identityField]});
                            layer.feature.eventType = _.find(erisConfig.types, { value: layer.feature.properties[erisConfig.server.typeField] });
                        });
                        geoJSON.on('mouseover', function (e) {
                            e.layer.bindPopup(erisService.getLeafletPopupContent(e.layer.feature), { 'offset': L.point(0, -10), 'autoPan': false }).openPopup();
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
                // vm.loading = false;
            });
        };

        var filterEventByType = function (event) {
            if (types.length > 0) {
                if (_.find(types, { value: event.feature.eventType.value })) {
                    return true;
                }
                return false;
            }
            return true;
        };

        var filterEventBySensor = function (event) {
            if (sensors.length > 0) {
                if (_.indexOf(sensors, event.feature.properties[erisConfig.server.sensorField]) > -1) {
                    return true;
                }
                return false;
            }
            return true;
        };

        var filterEvents = function () {
            var mapBounds = stateService.getMapBounds();
            filteredEvents = _.filter(events, function (event) {
                var returnVal = true;
                if (filterStrategy === 'server') {
                    // filter by correlation, type, and sensor
                    returnVal = onlyCorrelations === 'correlated' ?
                        event.feature.properties.is_correlated && filterEventByType(event) && filterEventBySensor(event) :
                        onlyCorrelations === 'noncorrelated' ?
                            !event.feature.properties.is_correlated && filterEventByType(event) && filterEventBySensor(event) :
                            filterEventByType(event) && filterEventBySensor(event);
                } else {
                    // filter by correlation, confidence, locationUncertainty, intensity, snr, duration, map bounds, type, and sensor
                    var eventDuration = moment.duration('00:' + event.feature.properties[erisConfig.server.durationField]).asSeconds();
                    returnVal = onlyCorrelations === 'correlated' ?
                        event.feature.properties.is_correlated && event.feature.properties[erisConfig.server.confidenceField] >= confidence && (event.feature.properties[erisConfig.server.locationUncertaintyField] <= locationUncertainty || confidence && event.feature.properties[erisConfig.server.locationUncertaintyField] === null) && event.feature.properties[erisConfig.server.intensityField] >= intensity.min && event.feature.properties[erisConfig.server.intensityField] <= intensity.max && event.feature.properties[erisConfig.server.snrField] >= snr.min && event.feature.properties[erisConfig.server.snrField] <= snr.max && eventDuration >= duration.min && eventDuration <= duration.max && mapBounds.contains(event._latlng) && filterEventByType(event) && filterEventBySensor(event) :
                        onlyCorrelations === 'noncorrelated' ?
                            !event.feature.properties.is_correlated && event.feature.properties[erisConfig.server.confidenceField] >= confidence && (event.feature.properties[erisConfig.server.locationUncertaintyField] <= locationUncertainty || confidence && event.feature.properties[erisConfig.server.locationUncertaintyField] === null) && event.feature.properties[erisConfig.server.intensityField] >= intensity.min && event.feature.properties[erisConfig.server.intensityField] <= intensity.max && event.feature.properties[erisConfig.server.snrField] >= snr.min && event.feature.properties[erisConfig.server.snrField] <= snr.max && eventDuration >= duration.min && eventDuration <= duration.max && mapBounds.contains(event._latlng) && filterEventByType(event) && filterEventBySensor(event) :
                            event.feature.properties[erisConfig.server.confidenceField] >= confidence && event.feature.properties[erisConfig.server.intensityField] >= intensity.min && event.feature.properties[erisConfig.server.intensityField] <= intensity.max && event.feature.properties[erisConfig.server.snrField] >= snr.min && event.feature.properties[erisConfig.server.snrField] <= snr.max && eventDuration >= duration.min && eventDuration <= duration.max && mapBounds.contains(event._latlng) && filterEventByType(event) && filterEventBySensor(event);
                }

                if (returnVal) {
                    if (fmvFilter === 'enabled') {
                        var hasFMV = false;
                        _.forEach(fmvLayers.getLayers(), function (fmv) {
                            if (L.latLngBounds(fmv._latlngs).contains(event._latlng)) {
                                mapLayers.addLayer(event);
                                hasFMV = true;
                                return false; // exit forEach loop
                            }
                        });
                        if (!hasFMV) {
                            mapLayers.removeLayer(event);
                            returnVal = false;
                        }
                    } else {
                        mapLayers.addLayer(event);
                    }
                } else {
                    mapLayers.removeLayer(event);
                }

                return returnVal;
            });
            stateService.setEvents(_.map(filteredEvents, 'feature'));
        };

        var updateStrikes = function () {
            strikeLayers.clearLayers();
            if (strikeVisibility === 'visible') {
                searchService.getStrikes().then(function (data) {
                    var geoJSON = L.geoJson(data.features, {
                        pointToLayer: function (feature, latlng) {
                            return L.circleMarker(latlng, { color: '#ffd600', stroke: false, fillOpacity: 1, radius: 5, className: 'strike-marker' });
                        }
                    });
                    geoJSON.on('mouseover', function (e) {
                        e.layer.bindPopup(erisService.getStrikePopupContent(e.layer.feature), { 'offset': L.point(0, -10), 'autoPan': false }).openPopup();
                    });
                    geoJSON.on('mouseout', function (e) {
                        e.layer.closePopup();
                    });
                    geoJSON.eachLayer(function (layer) {
                        strikeLayers.addLayer(layer).bringToBack();
                    });
                });
            }
        };

        var updateEvents = _.debounce(function () {
            events = [];
            mapLayers.clearLayers();
            if (sources.length > 0) {
                console.log('update events');
                vm.loading = true;
                stateService.setLoadingEvents(vm.loading);
                var handleData = function (data) {
                    if (data.features && data.features.length > 0) {
                        stateService.setSensorList(_.orderBy(_.uniq(_.map(data.features, 'properties.' + erisConfig.server.sensorField))));
                        var geoJSON = L.geoJson(data.features, {
                            pointToLayer: function (feature, latlng) {
                                var source = _.find(erisConfig.sources, { identity: feature.properties[erisConfig.server.identityField]}),
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
                            stateService.setActiveEvent(mapEvent, true);
                        });
                        geoJSON.on('mouseover', function (e) {
                            e.layer.bindPopup(erisService.getLeafletPopupContent(e.layer.feature), { 'offset': L.point(0, -10), 'autoPan': false }).openPopup();
                        });
                        geoJSON.on('mouseout', function (e) {
                            e.layer.closePopup();
                        });
                        geoJSON.eachLayer(function (layer) {
                            if (vm.activeEvent) {
                                if (layer.feature.properties[erisConfig.server.productField] === vm.activeEvent.properties[erisConfig.server.productField] && layer.feature.properties[erisConfig.server.datasetField] === vm.activeEvent.properties[erisConfig.server.datasetField]) {
                                    layer.feature.active = true;
                                }
                            }
                            var countryCodes = [];
                            _.forEach(countries, function (countryId) {
                                var countryObj = _.find(countryList, { gid: countryId });
                                if (countryObj) {
                                    countryCodes.push(countryObj.cc);
                                }
                            });
                            // filter by countries and votes
                            if ((countries.length > 0 && _.indexOf(countryCodes, layer.feature.properties.country_code) > -1) || countries.length === 0) {
                                // either event falls within country or no country filter was specified
                                layer.feature.eventSource = _.find(erisConfig.sources, {identity: layer.feature.properties[erisConfig.server.identityField]});
                                layer.feature.eventType = _.find(erisConfig.types, {value: layer.feature.properties[erisConfig.server.typeField]});
                                if (voteFilter === 'enabled' && votedEvents && votedEvents.length > 0) {
                                    // only add events that have votes
                                    var votes = _.filter(votedEvents, function (event) {
                                        return event[erisConfig.server.productField] === layer.feature.properties[erisConfig.server.productField] && event[erisConfig.server.datasetField] === layer.feature.properties[erisConfig.server.datasetField];
                                    });
                                    if (votes.length >= totalVotes) {
                                        mapLayers.addLayer(layer);
                                    }
                                } else {
                                    // no filtering necessary, just add the layer
                                    mapLayers.addLayer(layer);
                                }
                            }
                        });
                        events = mapLayers.getLayers();
                        if (vm.activeEvent) {
                            showEventTrack();
                        }
                        filterEvents();
                    } else {
                        stateService.setEvents([]);
                    }
                    updateStrikes();
                    stateService.setEventLayers(mapLayers.getLayers());
                    vm.loading = false;
                    stateService.setLoadingEvents(vm.loading);
                };

                if (stateService.getPoll()) {
                    // poll for changes
                    searchService.getEvents(sources, votedEvents).then(null, null, function (data) {
                        events = [];
                        mapLayers.clearLayers();
                        stateService.setEvents([]);
                        if (data.$resolved) {
                            $timeout(function () {
                                handleData(data);
                            });
                        } else {
                            vm.loading = false;
                        }
                    });
                } else {
                    // just do a single request
                    searchService.getEventsOnce(sources, votedEvents).then(function (data) {
                        handleData(data);
                    }).catch(function () {
                        vm.loading = false;
                    });
                }
            }
        }, 1000);

        var initialize = function () {
            leafletData.getMap().then(function (data) {
                map = data;

                var southWest = L.latLng(-90, -180),
                    northEast = L.latLng(90, 180);
                var bounds = L.latLngBounds(southWest, northEast);

                map.setMaxBounds(bounds);
                map.on('drag', function () {
                	map.panInsideBounds(bounds, { animate: false });
                });

                // add scale control
                L.control.scale({
                    imperial: false
                }).addTo(map);

                // disable leaflet keyboard shortcuts to prevent collision with angular hotkeys
                map.keyboard.disable();

                // set the default icon path
                L.Icon.Default.imagePath = '/stylesheets/images';

                // add feature group to the map
                mapLayers.addTo(map);
                strikeLayers.addTo(map);
                fmvLayers.addTo(map);
                ellipseLayer.addTo(map);

                stateService.setMapBounds(map.getBounds());
                stateService.setMapZoom(map.getZoom());
                stateService.setOnlyCorrelations(onlyCorrelations);
                stateService.setFilterStrategy(filterStrategy);
                stateService.setStrikeVisibility(strikeVisibility);

                // add coordinates control
                L.control.coordinates({
                    enableUserInput: false,
                    useLatLngOrder: true
                }).addTo(map);

                // add control to only show events with correlations
                var correlatedBtn = L.easyButton({
                    states: [{
                        stateName: 'correlated',
                        icon: 'eris-mapbtn eris-mapbtn-correlated',
                        title: 'Showing events with correlations',
                        onClick: function (btn) {
                            btn.state('noncorrelated');
                            onlyCorrelations = 'noncorrelated';
                            stateService.setOnlyCorrelations(onlyCorrelations);
                        }
                    }, {
                        stateName: 'noncorrelated',
                        icon: 'eris-mapbtn eris-mapbtn-noncorrelated',
                        title: 'Showing events with no correlations',
                        onClick: function (btn) {
                            btn.state('all');
                            onlyCorrelations = 'all';
                            stateService.setOnlyCorrelations(onlyCorrelations);
                        }
                    }, {
                        stateName: 'all',
                        icon: 'eris-mapbtn eris-mapbtn-all',
                        title: 'Showing all events',
                        onClick: function (btn) {
                            btn.state('correlated');
                            onlyCorrelations = 'correlated';
                            stateService.setOnlyCorrelations(onlyCorrelations);
                        }
                    }]
                });
                correlatedBtn.state(onlyCorrelations);

                // add control to determine how data is filtered
                var filterStrategyBtn = L.easyButton({
                    states: [{
                        stateName: 'server',
                        icon: 'fa-server',
                        title: 'Filtering Data on Server',
                        onClick: function (btn) {
                            // don't let this happen if temporal filter is too large
                            var temporalFilter = stateService.getTemporalFilter(),
                                temporalDiff = moment.utc(temporalFilter.stop).diff(moment.utc(temporalFilter.start), 'h');

                            if (temporalDiff <= 24) {
                                btn.state('client');
                                filterStrategy = 'client';
                                stateService.setFilterStrategy(filterStrategy);
                            } else {
                                $mdToast.show($mdToast.simple().textContent('Temporal filter range must be shorter than 24 hours to filter client-side.').theme('warn-toast').position('top right'));
                            }
                        }
                    }, {
                        stateName: 'client',
                        icon: 'fa-user',
                        title: 'Filtering Data on Client',
                        onClick: function (btn) {
                            btn.state('server');
                            filterStrategy = 'server';
                            stateService.setFilterStrategy(filterStrategy);
                        }
                    }]
                });
                filterStrategyBtn.state(filterStrategy);

                // add control to show/hide strike events
                var strikeBtn = L.easyButton({
                    states: [{
                        stateName: 'visible',
                        icon: 'fa-bolt',
                        title: 'Showing Strike Events',
                        onClick: function (btn) {
                            btn.state('hidden');
                            strikeVisibility = 'hidden';
                            stateService.setStrikeVisibility(strikeVisibility);
                        }
                    }, {
                        stateName: 'hidden',
                        icon: 'fa-bolt eris-mapbtn-disabled',
                        title: 'Hiding Strike Events',
                        onClick: function (btn) {
                            btn.state('visible');
                            strikeVisibility = 'visible';
                            stateService.setStrikeVisibility(strikeVisibility);
                        }
                    }]
                });
                strikeBtn.state(strikeVisibility);

                L.easyBar([correlatedBtn, filterStrategyBtn]).addTo(map);

                var fileLayerControl = L.Control.fileLayerLoad({
                    // Allows you to use a customized version of L.geoJson.
                    // For example if you are using the Proj4Leaflet leaflet plugin,
                    // you can pass L.Proj.geoJson and load the files into the
                    // L.Proj.GeoJson instead of the L.geoJson.
                    layer: L.geoJson,
                    // See http://leafletjs.com/reference.html#geojson-options
                    layerOptions: {style: {color:'yellow'}},
                    // Add to map after loading (default: true) ?
                    addToMap: true,
                    // File size limit in kb (default: 1024) ?
                    fileSizeLimit: 10240,
                    // Restrict accepted file formats (default: .geojson, .json, .kml, and .gpx) ?
                    formats: [
                        '.kml'
                    ]
                }).addTo(map);

                fileLayerControl.loader.on('data:loaded', function (event) {
                    console.log(event);
                });

                fileLayerControl.loader.on('data:error', function (error) {
                    console.log(error);
                });

                // add control to upload KML
                var uploadKmlBtn = L.easyButton({
                    states: [{
                        stateName: 'upload',
                        icon: 'eris-mapbtn eris-mapbtn-kml-upload',
                        title: 'Upload KML File',
                        onClick: function () {
                            angular.element('a.leaflet-control-filelayer')[0].click();
                        }
                    }]
                });

                // add control to download KML
                var downloadKmlBtn = L.easyButton({
                    states: [{
                        stateName: 'download',
                        icon: 'eris-mapbtn eris-mapbtn-kml-download',
                        title: 'Download Events as KML',
                        onClick: function (btn) {
                            var events = stateService.getEvents();
                            if (events.length > 0) {
                                searchService.exportKml(tokml(mapLayers.toGeoJSON(), { timestamp: 'event_time' })).then(function (data) {
                                    $window.location.href = data.data.file;
                                }, function (err) {
                                    btn.state('download');
                                    $mdToast.show($mdToast.simple().textContent('Error downloading KML').theme('fail-toast').position('top right'));
                                    console.log(err);
                                });
                            } else {
                                $mdToast.show($mdToast.simple().textContent('No events found. Try changing your search parameters.').theme('warn-toast').position('top right'));
                            }
                        }
                    }]
                });

                L.easyBar([uploadKmlBtn, downloadKmlBtn]).addTo(map);

                // add control to download all EXT's
                var extDownloadBtn = L.easyButton({
                    states: [{
                        stateName: 'download',
                        icon: 'fa-download',
                        title: 'Download Event H5 Files',
                        onClick: function (btn) {
                            var events = stateService.getEvents();
                            if (events.length > 0) {
                                if (events.length > erisConfig.extDownloadLimit) {
                                    $mdToast.show($mdToast.simple().textContent('Event limit exceeded. Adjust your search parameters to reduce events shown to fewer than ' + erisConfig.extDownloadLimit + '.').theme('warn-toast').position('top right'));
                                } else {
                                    btn.state('loading');
                                    searchService.downloadExtFiles(_.map(events, 'properties.file_path')).then(function (data) {
                                        btn.state('download');
                                        $window.location.href = data.data.file;
                                    }).catch(function (err) {
                                        btn.state('download');
                                        $mdToast.show($mdToast.simple().textContent('Error downloading events').theme('fail-toast').position('top right'));
                                        console.log(err);
                                    });
                                }
                            } else {
                                $mdToast.show($mdToast.simple().textContent('No events found. Try changing your search parameters.').theme('warn-toast').position('top right'));
                            }
                        }
                    }, {
                        stateName: 'loading',
                        icon: 'fa-cog fa-spin',
                        title: 'Downloading Files'
                    }]
                });

                L.easyBar([extDownloadBtn]).addTo(map);

                var baselayerId = qs.baselayer,
                    baselayer = {};
                if (baselayerId) {
                    // add requested baselayer to vm.layers.baselayers first
                    baselayer = _.find(erisConfig.layers.baselayers, { id: baselayerId });
                    updateBaselayer(baselayer);
                } else {
                    // baselayer not present in querystring, so just go with defaults
                    baselayer = erisConfig.layers.baselayers[erisConfig.defaultBaselayer];
                    vm.layers = _.cloneDeep(erisConfig.layers);
                    stateService.setBaselayer(baselayer);
                    updateOverlays();
                }

                map.on('baselayerchange', function (e) {
                    var baselayer = _.find(erisConfig.layers.baselayers, { name: e.name });
                    stateService.setBaselayer(baselayer);
                });

                map.on('overlayadd', function (e) {
                    console.log('overlayadd');
                    var overlay = _.find(erisConfig.layers.overlays, { name: e.name });
                    if (_.indexOf(overlays, overlay.id) < 0) {
                        overlays.push(overlay.id);
                        stateService.setOverlays(overlays);
                    }
                });

                map.on('overlayremove', function (e) {
                    console.log('overlayremove');
                    var overlay = _.find(erisConfig.layers.overlays, { name: e.name });
                    overlays = _.remove(overlays, overlay.id);
                    stateService.setOverlays(overlays);
                });

                map.on('moveend', _.debounce(function (e) {
                    stateService.setMapZoom(e.target.getZoom());
                    stateService.setMapBounds(e.target.getBounds());
                    var centerOnActiveEvent = stateService.getCenterOnActiveEvent();
                    if (!centerOnActiveEvent) {
                        // map was moved by user
                        if (filterStrategy === 'server') {
                            updateEvents();
                        } else {
                            filterEvents();
                            updateStrikes();
                        }
                    } else {
                        // map was moved by app while loading active event
                        stateService.setCenterOnActiveEvent(false);
                    }
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
                // isolated will be true when events polling is active
                if (angular.equals(newValue, oldValue) || newValue.isolated) {
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
            filterEvents();
        });

        $scope.$watch('vm.stateService.getSourceType()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            sourceType = newValue;
            updateEvents();
        });

        $scope.$watch('vm.stateService.getFilterStrategy()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            filterStrategy = newValue;
            updateEvents();
        });

        $scope.$watch('vm.stateService.getStrikeVisibility()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            strikeVisibility = newValue;
            updateStrikes();
        });

        $scope.$watch('vm.stateService.getFMVFilter()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            fmvFilter = newValue;
            if (fmvFilter === 'disabled') {
                stateService.setFMVLayers(new L.FeatureGroup());
            }
            filterEvents();
        });

        $scope.$watchCollection('vm.stateService.getFMVLayers()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if (fmvLayers.getLayers().length > 0) {
                fmvLayers.clearLayers();
            }
            if (newValue && newValue.getLayers().length > 0 && fmvFilter === 'enabled') {
                newValue.eachLayer(function (layer) {
                    fmvLayers.addLayer(layer);
                });
                filterEvents();
            }
        });

        $scope.$watch('vm.stateService.getConfidence()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            confidence = newValue;
            if (filterStrategy === 'server') {
                updateEvents();
            } else {
                filterEvents();
            }
        });

        $scope.$watch('vm.stateService.getLocationUncertainty()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            locationUncertainty = newValue;
            if (filterStrategy === 'server') {
                updateEvents();
            } else {
                filterEvents();
            }
        });

        $scope.$watchCollection('vm.stateService.getIntensity()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            intensity = newValue;
            if (filterStrategy === 'server') {
                updateEvents();
            } else {
                filterEvents();
            }
        });

        $scope.$watchCollection('vm.stateService.getSnr()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            snr = newValue;
            if (filterStrategy === 'server') {
                updateEvents();
            } else {
                filterEvents();
            }
        });

        $scope.$watchCollection('vm.stateService.getDuration()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            duration = newValue;
            if (filterStrategy === 'server') {
                updateEvents();
            } else {
                filterEvents();
            }
        });

        $scope.$watchCollection('vm.stateService.getActiveEvent()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue) || (newValue && oldValue && newValue.properties[erisConfig.server.productField] === oldValue.properties[erisConfig.server.productField] && newValue.properties[erisConfig.server.datasetField] === oldValue.properties[erisConfig.server.datasetField])) {
                return;
            }

            var getActiveMapLayer = function () {
                if (vm.activeEvent) {
                    return _.find(mapLayers.getLayers(), function (layer) {
                        if (layer.feature) {
                            return layer.feature.properties[erisConfig.server.productField] === vm.activeEvent.properties[erisConfig.server.productField] && layer.feature.properties[erisConfig.server.datasetField] === vm.activeEvent.properties[erisConfig.server.datasetField];
                        }
                        return null;
                    });
                }
                return null;
            };

            var activeMapLayer = getActiveMapLayer();

            if (vm.activeEvent) {
                vm.activeEvent.active = false;
                if (activeMapLayer) {
                    activeMapLayer.setStyle({ color: activeMapLayer.feature.eventSource.color, fillOpacity: 0.2 });
                    activeMapLayer.feature.active = false;
                }
            }
            if (vm.trackLayers) {
                vm.trackLayers.clearLayers();
            }
            if (ellipseLayer.getLayers().length > 0) {
                ellipseLayer.clearLayers();
            }
            vm.activeEvent = newValue;
            if (vm.activeEvent) {
                var centerOnActiveEvent = stateService.getCenterOnActiveEvent();
                if (centerOnActiveEvent) {
                    vm.center = {
                        lat: vm.activeEvent.properties.event_lat,
                        lng: vm.activeEvent.properties.event_lon,
                        zoom: stateService.getMapZoom() || mapZoom
                    };
                }
                if (vm.activeEvent.properties[erisConfig.server.locationUncertaintyField] !== null) {
                    L.ellipse(
                        [vm.activeEvent.properties.event_lat, vm.activeEvent.properties.event_lon],
                        [vm.activeEvent.properties[erisConfig.server.locationUncertaintyField], vm.activeEvent.properties.loc_minor_axis],
                        // data is oriented north, plugin is oriented west - so add 90 degrees to account for the difference
                        vm.activeEvent.properties.ellipse_orientation + 90,
                        {
                            color: '#00ff00',
                            weight: 1,
                            fillColor: '#00ff00'
                        }
                    ).addTo(ellipseLayer).bringToBack();
                }
                vm.activeEvent.active = true;
                activeMapLayer = getActiveMapLayer();
                if (activeMapLayer) {
                    activeMapLayer.setStyle({ color: '#b2ff59', fillOpacity: 0.8 });
                    activeMapLayer.bringToFront();
                }
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
                    vm.loaderHeight = mapLayoutComponent.container.height;

                    // set event listener for container resize
                    mapLayoutComponent.container.on('resize', function () {
                        // use a $timeout to notify angular of the change
                        $timeout(function () {
                            vm.mapHeight = mapLayoutComponent.container.height;
                            vm.loaderHeight = mapLayoutComponent.container.height;
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
            countryList = stateService.getCountryList();
            updateEvents();
        });

        $scope.$watchCollection('vm.stateService.getSensors()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            sensors = newValue.constructor !== Array ? [newValue] : newValue;
            filterEvents();
        });

        $scope.$watchCollection('vm.stateService.getVoteFilter()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            voteFilter = newValue;
        });

        $scope.$watchCollection('vm.stateService.getVotedEvents()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            votedEvents = newValue;
            updateEvents();
        });

        $scope.$watchCollection('vm.stateService.getTotalVotes()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            totalVotes = newValue;
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

    angular.module('eris').controller('locationFormatController', ['$scope', '$location', 'erisConfig', 'stateService', 'coordinateConversionService', '_', function (
        $scope,
        $location,
        erisConfig,
        stateService,
        coordinateConversionService,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.stateService = stateService;
        vm.erisConfig = erisConfig;
        vm.location = {
            format: qs.locationFormat || erisConfig.defaultLocationFormat,
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

    angular.module('eris').directive('erisLocationFormat', function () {
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

    angular.module('eris').controller('sidebarController', ['$scope', '$location', 'erisService', 'stateService', '_', 'erisConfig', function (
        $scope,
        $location,
        erisService,
        stateService,
        _,
        erisConfig
    ) {
        var vm = this;

        vm.logo = erisConfig.logo;
        vm.stateService = stateService;
        vm.erisConfig = erisConfig;
        vm.sourceFilterExpanded = stateService.getSourceFilterExpanded();
        vm.typeFilterExpanded = stateService.getTypeFilterExpanded();
        vm.temporalFilterExpanded = stateService.getTemporalFilterExpanded();
        vm.gotoExpanded = stateService.getGotoExpanded();
        vm.userGuideUrl = erisConfig.userGuideUrl;
        vm.infoUrl = erisConfig.infoUrl;
        vm.infoLabel = erisConfig.infoLabel;
        vm.isAdmin = stateService.getIsAdmin();

        vm.openMenu = function($mdMenu, ev) {
            $mdMenu.open(ev);
        };

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

        $scope.$watch('vm.stateService.getIsAdmin()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.isAdmin = newValue;
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

    angular.module('eris').controller('sourceFilterController', ['$scope', '$location', 'stateService', 'erisConfig', '_', function (
        $scope,
        $location,
        stateService,
        erisConfig,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.erisConfig = erisConfig;
        vm.expanded = $scope.expanded;
        vm.sources = _.cloneDeep(erisConfig.sources);
        vm.activeSources = [];
        vm.sourceTypes = _.cloneDeep(erisConfig.sourceTypes);
        vm.sourceType = qs.sourceType ? _.find(vm.sourceTypes, { name: qs.sourceType }) : _.find(erisConfig.sourceTypes, { active: true });

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

    angular.module('eris').directive('erisSourceFilter', function () {
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

    angular.module('eris').controller('temporalFilterController', ['$scope', '$location', 'stateService', '$timeout', 'moment', 'erisConfig', '$mdToast', '_', function (
        $scope,
        $location,
        stateService,
        $timeout,
        moment,
        erisConfig,
		$mdToast,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.moment = moment;
        vm.erisConfig = erisConfig;
        vm.expanded = $scope.expanded;
        vm.mode = $scope.mode;
        vm.stateService = stateService;
        vm.moment = moment;
        vm.start = '';
        vm.stop = '';
        vm.startTime = {
            hour: null,
            minute: null,
            second: null
        };
        vm.stopTime = {
            hour: null,
            minute: null,
            second: null
        };
        vm.ranges = _.clone(erisConfig.ranges);
        vm.invalid = false;
        vm.applyBtnDisabled = true;
        vm.poll = false;

        var setPoll = function (start) {
            // poll for changes if temporal diff is 60 mins or less
            var temporalDiff = moment.utc().diff(moment.utc(start), 'm');
            vm.poll = temporalDiff <= 60;
            stateService.setPoll(vm.poll);
        };

        $scope.isError = function () {
            return vm.invalid;
        };

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setTemporalFilterExpanded(vm.expanded);
        };

        vm.setRange = function (units, unitOfTime) {
            var start = moment.utc().add(units, unitOfTime).startOf(unitOfTime),
                stop = moment.utc().startOf(unitOfTime);

            if ((units === -1 && unitOfTime === 'hours') || (units === -30 && unitOfTime === 'minutes')) {
                start = moment.utc().add(units, unitOfTime);
                stop = moment.utc();
            }

            setPoll(start);

            stateService.setTemporalFilter({
                start: start.toDate(),
                stop: stop.toDate()
            });
        };

        vm.setTime = function (type) {
            var isValid = moment.utc(vm[type], 'YYYY-MM-DD').isValid(),
                hour = isValid ? ('0' + moment.utc(vm[type], 'YYYY-MM-DD').hour()).slice(-2) : '00',
                minute = isValid ? ('0' + moment.utc(vm[type], 'YYYY-MM-DD').minute()).slice(-2) : '00',
                second = isValid ? ('0' + moment.utc(vm[type], 'YYYY-MM-DD').second()).slice(-2) : '00';

            if (type === 'start') {
                vm.startTime = {
                    hour: hour,
                    minute: minute,
                    second: second
                };
            } else {
                vm.stopTime = {
                    hour: hour,
                    minute: minute,
                    second: second
                };
            }
        };

        vm.changeTime = function (type, unit) {
            if (vm[type][unit].length > 2) {
                vm[type][unit] = ('0' + vm[type].hour).slice(-2);
            }
            if (!isNaN(vm[type][unit])) {
                if (vm[type].hour > 23 || vm[type].hour < 0) {
                    vm[type].hour = vm[type].hour > 23 ? 23 : 0;
                }
                if (vm[type].minute > 59 || vm[type].minute < 0) {
                    vm[type].minute = vm[type].minute > 59 ? 59 : 0;
                }
                if (vm[type].second > 59 || vm[type].second < 0) {
                    vm[type].second = vm[type].second > 59 ? 59 : 0;
                }
                var timeSet = type === 'startTime' ? moment.utc(vm.start.toISOString()) : moment.utc(vm.stop.toISOString());
                timeSet.set({
                    'hour': ('0' + vm[type].hour).slice(-2),
                    'minute': ('0' + vm[type].minute).slice(-2),
                    'second': ('0' + vm[type].second).slice(-2)
                });
                if (type === 'startTime') {
                    vm.start = timeSet.toDate();
                } else if (type === 'stopTime') {
                    vm.stop = timeSet.toDate();
                }
            }
        };

        vm.keydown = function ($event, unit, type) {
            var max = 0;
            if (unit === 'hour') {
                max = 23;
            } else if (unit === 'minute' || unit === 'second') {
                max = 60;
            }
            if ($event.keyCode === 38) {
                // up arrow
                if (isNaN(vm[type][unit])) {
                    vm[type][unit] = ('0' + 0).slice(-2);
                }
                if (vm[type][unit] < max) {
                    vm[type][unit]++;
                }
                vm[type][unit] = ('0' + vm[type][unit]).slice(-2);
                vm.changeTime(type, unit);
            } else if ($event.keyCode === 40) {
                // down arrow
                if (isNaN(vm[type][unit])) {
                    vm[type][unit] = ('0' + 0).slice(-2);
                }
                if (vm[type][unit] > 0) {
                    vm[type][unit]--;
                }
                vm[type][unit] = ('0' + vm[type][unit]).slice(-2);
                vm.changeTime(type, unit);
            }
        };

        vm.stepRange = function (direction) {
            var start = moment.utc(vm.start);
            var stop = moment.utc(vm.stop);
            var diff = stop.diff(start);

            setPoll(start.toISOString());

            stateService.setTemporalFilter({
                start: direction === 'forward' ? start.add(diff) : start.subtract(diff),
                stop: direction === 'forward' ? stop.add(diff) : stop.subtract(diff)
            });
        };

        vm.setTemporalFilter = function () {
            if (vm.start && vm.stop && moment.utc(vm.start).isValid() && moment.utc(vm.stop).isValid()) {
                vm.applyBtnDisabled = true;
                var momentStart = moment.utc(vm.start.toISOString()),
                    momentStop = moment.utc(vm.stop.toISOString());

                if (momentStart.isBefore(momentStop)) {
                    vm.invalid = false;
                    setPoll(vm.start);
                    stateService.setTemporalFilter({
                        start: vm.start,
                        stop: vm.stop
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

            vm.start = qs.start ? moment.utc(qs.start).toDate() : moment.utc().subtract(erisConfig.defaultTimeRangeValue, erisConfig.defaultTimeRangeType).startOf(erisConfig.defaultTimeRangeType).toDate();
            vm.stop = qs.stop ? moment.utc(qs.stop).toDate() : moment.utc().startOf(erisConfig.defaultTimeRangeType).toDate();

            vm.setTime('start');
            vm.setTime('stop');
            vm.setTemporalFilter();
        };
        initialize();

        $scope.$watch('vm.start', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.applyBtnDisabled = false;
        });

        $scope.$watch('vm.stop', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.applyBtnDisabled = false;
        });

        $scope.$watchCollection('vm.stateService.getTemporalFilter()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }

            vm.start = moment.utc(newValue.start.toISOString()).toDate();
            vm.stop = moment.utc(newValue.stop.toISOString()).toDate();

            vm.setTime('start');
            vm.setTime('stop');

            $timeout(function () {
                vm.applyBtnDisabled = true;
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

    angular.module('eris').directive('erisTemporalFilter', function () {
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

    angular.module('eris').controller('typeFilterController', ['$scope', '$location', 'stateService', 'erisConfig', '_', function (
        $scope,
        $location,
        stateService,
        erisConfig,
        _
    ) {
        var vm = this;

        vm.stateService = stateService;
        vm.erisConfig = erisConfig;
        vm.expanded = $scope.expanded;
        vm.activeSources = stateService.getActiveSources();
        vm.types = _.cloneDeep(erisConfig.types);
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

    angular.module('eris').directive('erisTypeFilter', function () {
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

    angular.module('eris').controller('countryFilterController', ['$scope', '$location', '$timeout', '$mdToast', 'searchService', 'stateService', 'erisConfig', '_', function (
        $scope,
        $location,
        $timeout,
        $mdToast,
        searchService,
        stateService,
        erisConfig,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.erisConfig = erisConfig;
        vm.expanded = $scope.expanded;
        vm.countries = [];
        vm.selectedCountries = [];
        vm.loadingCountries = true;

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
            stateService.setCountryFilterExpanded(vm.expanded);
        };

        vm.filterByCountries = function () {
            stateService.setCountries(_.map(vm.selectedCountries, 'gid'));
        };

        var initialize = function () {
            searchService.getCountries().then(function (data) {
                vm.countries = _.sortBy(_.map(data.features, 'properties'), function (prop) {
                    if (_.indexOf(erisConfig.defaultCountries, prop.country) > -1) {
                        vm.selectedCountries.push(prop);
                    }
                    return prop.country;
                });
                stateService.setCountryList(vm.countries);
                if (qs.countries) {
                    if (qs.countries.constructor === Array) {
                        _.forEach(qs.countries, function (country) {
                            vm.selectedCountries.push(_.find(vm.countries, { gid: parseInt(country) }));
                        });
                    } else {
                        vm.selectedCountries.push(_.find(vm.countries, { gid: parseInt(qs.countries) }));
                    }
                }
                if (vm.selectedCountries.length > 0) {
                    vm.filterByCountries();
                }
                vm.loadingCountries = false;
            }, function (error) {
                console.log(error);
                $mdToast.show($mdToast.simple().textContent('Error Retrieving Countries').theme('warn-toast').position('top right'));
                vm.loadingCountries = false;
            });
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

    angular.module('eris').directive('erisCountryFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/eventFilters/countryFilter/countryFilterTemplate.html',
            controller: 'countryFilterController',
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

    angular.module('eris').controller('fmvFilterController', ['$scope', '$location', '$mdToast', 'stateService', 'fmvService', 'erisConfig', 'L', '_', function (
        $scope,
        $location,
        $mdToast,
        stateService,
        fmvService,
        erisConfig,
        L,
        _
    ) {
        var vm = this,
            qs = $location.search(),
            filterStrategy = qs.filterStrategy ? qs.filterStrategy : erisConfig.filterStrategy,
            fmvLayers = new L.featureGroup();

        vm.erisConfig = erisConfig;
        vm.stateService = stateService;
        vm.zoomLevel = stateService.getMapZoom();
        vm.fmvFilter = qs.fmvFilter ? qs.fmvFilter : erisConfig.fmvFilter;
        vm.fmvFilterChecked = vm.fmvFilter === 'enabled';
        vm.fmvResults = null;
        vm.refreshFMVClass = '';

        vm.updateFMV = function (fetchNewResults) {
            var doUpdate = function () {
                _.forEach(vm.fmvResults, function (d) {
                    var lnglats = _.initial(d.boundingbox.coordinates[0]),
                        latlngs = [];
                    _.forEach(lnglats, function (lnglat) {
                        latlngs.push([lnglat[1], lnglat[0]]);
                    });
                    fmvLayers.addLayer(L.polygon(latlngs, { color: '#ff9800', stroke: false, className: 'fmv-layer' }));
                });
                stateService.setFMVLayers(fmvLayers);
            };

            fmvLayers.clearLayers();
            fmvLayers = new L.featureGroup();
            if (fetchNewResults || !vm.fmvResults) {
                vm.refreshFMVClass = 'fa-spin';
                fmvService.getAllRecordings().then(function (result) {
                    vm.refreshFMVClass = '';
                    vm.fmvResults = result.data.data;
                    doUpdate();
                }, function () {
                    stateService.setFMVFilter('disabled');
                });
            } else {
                doUpdate();
            }
        };

        var initialize = function () {
            stateService.setFMVFilter(vm.fmvFilter);
            if (vm.fmvFilter === 'enabled') {
                vm.updateFMV(true);
            }
        };

        initialize();

        $scope.$watch('vm.stateService.getFilterStrategy()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            filterStrategy = newValue;
        });

        $scope.$watch('vm.fmvFilterChecked', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.fmvFilter = newValue ? 'enabled' : 'disabled';
            stateService.setFMVFilter(vm.fmvFilter);
            if (vm.fmvFilter === 'enabled') {
                vm.updateFMV(vm.fmvResults === null);
            }
        });

        $scope.$watchCollection('vm.stateService.getMapZoom()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.zoomLevel = newValue;
            if (newValue < 6) {
                if (vm.fmvFilter === 'enabled') {
                    fmvLayers.clearLayers();
                    stateService.setFMVLayers(fmvLayers);
                    vm.fmvFilter = 'disabled';
                    vm.fmvFilterChecked = false;
                    $mdToast.show($mdToast.simple().textContent('FMV filter disabled due to current zoom level. Zoom in to re-enable.').theme('info-toast').position('top right'));
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

    angular.module('eris').directive('erisFmvFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/eventFilters/fmvFilter/fmvFilterTemplate.html',
            controller: 'fmvFilterController',
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

    angular.module('eris').controller('sensorFilterController', ['$scope', '$location', 'stateService', 'erisConfig', function (
        $scope,
        $location,
        stateService,
        erisConfig
    ) {
        var vm = this,
            qs = $location.search();

        vm.erisConfig = erisConfig;
        vm.stateService = stateService;
        vm.sensorList = [];
        vm.sensors = [];

        vm.filterBySensors = function () {
            stateService.setSensors(vm.sensors);
        };

        var initialize = function () {
            if (qs.sensors) {
                vm.sensors = qs.sensors.constructor !== Array ? [qs.sensors] : qs.sensors;
                vm.filterBySensors();
            }
        };

        initialize();

        $scope.$watchCollection('vm.stateService.getSensorList()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.sensorList = newValue;
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

    angular.module('eris').directive('erisSensorFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/eventFilters/sensorFilter/sensorFilterTemplate.html',
            controller: 'sensorFilterController',
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

    angular.module('eris').controller('voteFilterController', ['$scope', '$location', '$mdToast', 'moment', '_', 'stateService', 'voteService', 'erisConfig', function (
        $scope,
        $location,
        $mdToast,
        moment,
        _,
        stateService,
        voteService,
        erisConfig
    ) {
        var vm = this,
            qs = $location.search();

        vm.erisConfig = erisConfig;
        vm.stateService = stateService;
        vm.voteFilter = qs.voteFilter ? qs.voteFilter : erisConfig.voteFilter;
        vm.voteFilterType = qs.voteFilterType ? qs.voteFilterType : erisConfig.voteFilterType;
        vm.voteFilterChecked = vm.voteFilter === 'enabled';
        vm.totalVotes = qs.totalVotes ? parseInt(qs.totalVotes, 10) : erisConfig.totalVotes;
        vm.voteResults = null;

        var updateEvents = function () {
            var temporalFilter = stateService.getTemporalFilter();
            voteService.getVotes({ type: vm.voteFilterType, start: temporalFilter.start, stop: temporalFilter.stop, total: vm.totalVotes }).then(function (results) {
                var votedEvents = [];
                if (typeof results.data !== 'string') {
                    votedEvents = Array.isArray(results.data) ? results.data : [results.data];
                }
                stateService.setVotedEvents(votedEvents);
            });
        };

        var initialize = function () {
            stateService.setVoteFilter(vm.voteFilter);
            stateService.setTotalVotes(vm.totalVotes);
            if (vm.voteFilter === 'enabled') {
                updateEvents();
            }
        };

        initialize();

        vm.voteUpBtnColor = function () {
            if (vm.voteFilter === 'enabled') {
                return vm.voteFilterType === 'Up' ? 'green-700' : 'grey-700';
            }
            return 'grey-700';
        };

        vm.voteDownBtnColor = function () {
            if (vm.voteFilter === 'enabled') {
                return vm.voteFilterType === 'Down' ? 'red-700' : 'grey-700';
            }
            return 'grey-700';
        };

        vm.setVoteType = function (value) {
            vm.voteFilterType = vm.voteFilterType === value ? 'none' : value;
            stateService.setVoteFilterType(vm.voteFilterType);
            if (vm.voteFilter === 'enabled') {
                updateEvents();
            }
        };

        $scope.$watch('vm.voteFilterChecked', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.voteFilter = newValue ? 'enabled' : 'disabled';
            stateService.setVoteFilter(vm.voteFilter);
            if (vm.voteFilter === 'enabled') {
                updateEvents();
            } else {
                var temporalFilter = stateService.getTemporalFilter();
                if (moment.utc(temporalFilter.stop).diff(moment.utc(temporalFilter.start), 'd') > 7) {
                    stateService.setTemporalFilter({
                        start: moment.utc(temporalFilter.stop).subtract(6, 'h').toISOString(),
                        stop: temporalFilter.stop
                    });
                    $mdToast.show($mdToast.simple().textContent('Temporal filter adjusted to 6 hours').theme('info-toast').position('top right'));
                }
                stateService.setVotedEvents(null);
            }
        });

        $scope.$watch('vm.totalVotes', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            stateService.setTotalVotes(newValue);
        });

        $scope.$watchCollection('vm.stateService.getTemporalFilter()', function (newValue, oldValue) {
            if (_.keys(newValue).length > 0) {
                // isolated will be true when events polling is active
                if (angular.equals(newValue, oldValue) || newValue.isolated) {
                    return;
                }
                updateEvents();
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

    angular.module('eris').directive('erisVoteFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/eventFilters/voteFilter/voteFilterTemplate.html',
            controller: 'voteFilterController',
            controllerAs: 'vm',
            scope: {}
        };
    });
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImVyaXNDb25maWcuanMiLCJtb2RlbHMvVm90ZS5qcyIsInNlcnZpY2VzL2FsZXJ0U2VydmljZS5qcyIsInNlcnZpY2VzL2Nvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5qcyIsInNlcnZpY2VzL2VyaXNTZXJ2aWNlLmpzIiwic2VydmljZXMvZm12U2VydmljZS5qcyIsInNlcnZpY2VzL3NlYXJjaFNlcnZpY2UuanMiLCJzZXJ2aWNlcy9zdGF0ZVNlcnZpY2UuanMiLCJzZXJ2aWNlcy92b3RlU2VydmljZS5qcyIsImNvbXBvbmVudHMvYWRtaW4vYWRtaW5Db250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9hZG1pbi9hZG1pbkRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvYWxlcnQvYWxlcnRDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9hbGVydC9hbGVydERpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvZXZlbnRGaWx0ZXJzL2V2ZW50RmlsdGVyc0NvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2V2ZW50RmlsdGVycy9ldmVudEZpbHRlcnNEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2V2ZW50Vmlld2VyL2V2ZW50Vmlld2VyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZXZlbnRWaWV3ZXIvbWV0YWRhdGFEaWFsb2dDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9nb3RvL2dvdG9Db250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9nb3RvL2dvdG9EaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2V2ZW50cy9ldmVudHNDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9tYXAvbWFwQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvbG9jYXRpb25Gb3JtYXQvbG9jYXRpb25Gb3JtYXRDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9sb2NhdGlvbkZvcm1hdC9sb2NhdGlvbkZvcm1hdERpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvc2lkZWJhci9zaWRlYmFyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvc291cmNlRmlsdGVyL3NvdXJjZUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3NvdXJjZUZpbHRlci9zb3VyY2VGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3RlbXBvcmFsRmlsdGVyL3RlbXBvcmFsRmlsdGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvdGVtcG9yYWxGaWx0ZXIvdGVtcG9yYWxGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3R5cGVGaWx0ZXIvdHlwZUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3R5cGVGaWx0ZXIvdHlwZUZpbHRlckRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvZXZlbnRGaWx0ZXJzL2NvdW50cnlGaWx0ZXIvY291bnRyeUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2V2ZW50RmlsdGVycy9jb3VudHJ5RmlsdGVyL2NvdW50cnlGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2V2ZW50RmlsdGVycy9mbXZGaWx0ZXIvZm12RmlsdGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZXZlbnRGaWx0ZXJzL2ZtdkZpbHRlci9mbXZGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2V2ZW50RmlsdGVycy9zZW5zb3JGaWx0ZXIvc2Vuc29yRmlsdGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZXZlbnRGaWx0ZXJzL3NlbnNvckZpbHRlci9zZW5zb3JGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2V2ZW50RmlsdGVycy92b3RlRmlsdGVyL3ZvdGVGaWx0ZXJDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9ldmVudEZpbHRlcnMvdm90ZUZpbHRlci92b3RlRmlsdGVyRGlyZWN0aXZlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUFNQSxDQUFBLFlBQUE7O0lBRUE7O0lBRUEsSUFBQSxhQUFB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SUFBQSxvQkFBQSxLQUFBLElBQUE7OztRQUdBLElBQUEsT0FBQSxJQUFBLE9BQUEsV0FBQSxNQUFBLFlBQUEsUUFBQSxVQUFBO1lBQ0EsSUFBQSxPQUFBLFdBQUEsTUFBQSxZQUFBLE1BQUEsS0FBQSxJQUFBLE9BQUEsV0FBQSxNQUFBLFlBQUE7O1FBRUEsT0FBQTs7Ozs7Ozs7OztBQzVHQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxRQUFBLHVCQUFBO1FBQ0E7TUFDQTs7UUFFQSxJQUFBLE9BQUEsVUFBQSxTQUFBLFlBQUEsWUFBQSxVQUFBLFlBQUEsTUFBQSxRQUFBLE1BQUEsWUFBQTtZQUNBLEtBQUEsVUFBQSxXQUFBO1lBQ0EsS0FBQSxXQUFBLE9BQUEsZ0JBQUEsY0FBQTtZQUNBLEtBQUEsV0FBQSxPQUFBLGdCQUFBLGNBQUE7WUFDQSxLQUFBLFdBQUEsT0FBQSxpQkFBQSxZQUFBO1lBQ0EsS0FBQSxhQUFBLGNBQUE7WUFDQSxLQUFBLE9BQUEsT0FBQSxVQUFBLGNBQUEsT0FBQTtZQUNBLEtBQUEsU0FBQSxVQUFBO1lBQ0EsS0FBQSxPQUFBLFFBQUE7WUFDQSxLQUFBLFdBQUEsT0FBQSxhQUFBOzs7O1FBSUEsS0FBQSxZQUFBOzs7OztRQUtBLEtBQUEsUUFBQSxVQUFBLE1BQUE7WUFDQSxJQUFBLE1BQUE7Z0JBQ0EsSUFBQSxPQUFBLEtBQUEsVUFBQSxVQUFBO29CQUNBLEtBQUEsT0FBQSxLQUFBLFNBQUE7O2dCQUVBLE9BQUEsSUFBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBLFdBQUEsT0FBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7OztZQUdBLE9BQUEsSUFBQTs7O1FBR0EsS0FBQSxjQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsUUFBQSxRQUFBLE9BQUE7Z0JBQ0EsT0FBQSxLQUFBLElBQUEsS0FBQTs7WUFFQSxPQUFBLEtBQUEsTUFBQTs7O1FBR0EsT0FBQTs7Ozs7Ozs7OztBQ3BEQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxRQUFBLDhDQUFBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxPQUFBO1lBQ0EsV0FBQSxZQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxXQUFBLFFBQUEsTUFBQTttQkFDQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsVUFBQSxVQUFBLElBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFdBQUEsUUFBQSxNQUFBLGFBQUE7bUJBQ0EsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOztZQUVBLFVBQUEsVUFBQSxPQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBLEtBQUEsV0FBQSxRQUFBLE1BQUEsV0FBQSxPQUFBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsYUFBQSxVQUFBLE9BQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUEsSUFBQSxXQUFBLFFBQUEsTUFBQSxhQUFBLE1BQUEsVUFBQSxPQUFBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7Ozs7Ozs7Ozs7OztBQ3JEQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxRQUFBLDRDQUFBLFVBQUEsVUFBQTs7UUFFQSxJQUFBLFdBQUEsVUFBQSxRQUFBO1lBQ0EsSUFBQSxTQUFBLEdBQUE7Z0JBQ0EsT0FBQSxLQUFBLEtBQUE7O2lCQUVBO2dCQUNBLE9BQUEsS0FBQSxNQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE1BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxJQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE9BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxLQUFBO2dCQUNBLFVBQUEsVUFBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxlQUFBOzs7Ozs7O1FBT0EsYUFBQSxxQkFBQSxVQUFBLEtBQUEsS0FBQTtZQUNBLElBQUEsQ0FBQSxPQUFBLFFBQUEsTUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLE9BQUEsT0FBQSxRQUFBLE1BQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxLQUFBO2dCQUNBLElBQUEsVUFBQTtvQkFDQSxLQUFBLENBQUEsY0FBQSxNQUFBLGNBQUE7b0JBQ0EsSUFBQSxDQUFBLEtBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLElBQUE7b0JBQ0EsUUFBQSxPQUFBLFNBQUEsS0FBQSxLQUFBOztnQkFFQSxPQUFBO21CQUNBLElBQUEsRUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQSxJQUFBLEVBQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxNQUFBO2dCQUNBLE9BQUE7Ozs7Ozs7OztRQVNBLGFBQUEsc0JBQUEsVUFBQSxRQUFBLFFBQUE7WUFDQSxJQUFBLFdBQUEsV0FBQSxXQUFBLFdBQUEsV0FBQTtZQUNBLFNBQUEsT0FBQSxRQUFBLFdBQUEsSUFBQSxNQUFBO1lBQ0EsU0FBQSxPQUFBLFFBQUEsV0FBQSxJQUFBLE1BQUE7O1lBRUEsSUFBQSxPQUFBLFVBQUEsR0FBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsSUFBQTttQkFDQSxJQUFBLE9BQUEsV0FBQSxHQUFBO2dCQUNBLFNBQUEsT0FBQSxHQUFBLE1BQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsS0FBQSxNQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxJQUFBOztZQUVBLElBQUEsT0FBQSxVQUFBLEdBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLElBQUE7bUJBQ0EsSUFBQSxPQUFBLFdBQUEsR0FBQTtnQkFDQSxTQUFBLE9BQUEsR0FBQSxNQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEtBQUEsTUFBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsTUFBQSxHQUFBLENBQUEsSUFBQTs7O1lBR0E7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLENBQUEsT0FBQSxhQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQSxDQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUE7Y0FDQTtnQkFDQSxJQUFBLFVBQUE7b0JBQ0EsS0FBQTt3QkFDQSxZQUFBLE1BQUEsWUFBQSxPQUFBLFlBQUE7d0JBQ0EsWUFBQSxNQUFBLFlBQUEsT0FBQSxZQUFBO29CQUNBLElBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsUUFBQSxHQUFBLE1BQUEsSUFBQTtvQkFDQSxRQUFBLE9BQUEsU0FBQSxRQUFBLEdBQUEsSUFBQSxRQUFBLEdBQUEsSUFBQTs7Z0JBRUEsT0FBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7Ozs7Ozs7Ozs7UUFlQSxhQUFBLHVCQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsU0FBQTtZQUNBLFNBQUEsT0FBQSxJQUFBOztZQUVBLElBQUEsTUFBQSxPQUFBLE9BQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQTs7Z0JBRUEsT0FBQSxLQUFBLEtBQUEsTUFBQSxPQUFBLEtBQUEsT0FBQTtnQkFDQSxPQUFBLEtBQUEsS0FBQSxNQUFBLE9BQUEsS0FBQSxPQUFBO2dCQUNBLE9BQUE7b0JBQ0EsTUFBQTtvQkFDQSxJQUFBO29CQUNBLEtBQUEsQ0FBQSxjQUFBLE9BQUEsS0FBQSxjQUFBLE9BQUE7Ozs7O1FBS0EsYUFBQSxlQUFBLFVBQUEsS0FBQTtZQUNBLFFBQUEsQ0FBQSxPQUFBLFFBQUEsS0FBQSxRQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsT0FBQTs7UUFFQSxhQUFBLGVBQUEsVUFBQSxLQUFBO1lBQ0EsU0FBQSxDQUFBLE9BQUEsUUFBQSxLQUFBLFFBQUEsT0FBQSxPQUFBLENBQUEsT0FBQSxPQUFBOzs7UUFHQSxhQUFBLGdCQUFBLFVBQUEsUUFBQTtZQUNBLElBQUEsV0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxXQUFBLFdBQUE7WUFDQSxTQUFBLE9BQUEsUUFBQSxXQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsVUFBQSxHQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxJQUFBO21CQUNBLElBQUEsT0FBQSxXQUFBLEdBQUE7Z0JBQ0EsU0FBQSxPQUFBLEdBQUEsTUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLElBQUE7O1lBRUE7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZ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LE9BQUEsbUJBQUE7b0JBQ0EsWUFBQSxXQUFBLE9BQUEsZUFBQSxVQUFBLGFBQUEsV0FBQSxXQUFBLE9BQUEsZ0JBQUEsWUFBQSxXQUFBLE9BQUEsZUFBQSxRQUFBLGFBQUEsV0FBQSxXQUFBLE9BQUE7b0JBQ0EsY0FBQTs7Ozs7UUFLQSxJQUFBLG9CQUFBLFVBQUEsUUFBQTtZQUNBLE9BQUE7Z0JBQ0EsS0FBQSxPQUFBO2dCQUNBLFVBQUEsT0FBQSxZQUFBO2dCQUNBLFNBQUEsT0FBQSxXQUFBO2dCQUNBLFNBQUEsT0FBQSxXQUFBO2dCQUNBLFVBQUEsT0FBQSxZQUFBO2dCQUNBLFNBQUEsT0FBQSxXQUFBO2dCQUNBLFNBQUEsT0FBQSxXQUFBLFdBQUE7Z0JBQ0EsUUFBQSxPQUFBLFVBQUE7Ozs7UUFJQSxJQUFBLHFCQUFBLFVBQUEsUUFBQTtZQUNBLE9BQUE7Z0JBQ0EsS0FBQSxPQUFBO2dCQUNBLFFBQUEsT0FBQSxVQUFBOzs7O1FBSUEsSUFBQSxxQkFBQSxZQUFBO1lBQ0EsT0FBQTtnQkFDQSxTQUFBO2dCQUNBLFNBQUE7Z0JBQ0EsU0FBQTtnQkFDQSxVQUFBLFdBQUEsWUFBQSxPQUFBLFVBQUEsWUFBQSxNQUFBLFdBQUEsWUFBQSxPQUFBLFVBQUE7Z0JBQ0EsY0FBQTs7OztRQUlBLElBQUEsbUJBQUEsWUFBQTtZQUNBLElBQUEsaUJBQUEsYUFBQTtnQkFDQSxRQUFBLE9BQUEsZUFBQSxVQUFBLFdBQUEsZUFBQSxRQUFBLGVBQUEsUUFBQSxlQUFBLE1BQUEsZ0JBQUEsT0FBQSxNQUFBLFNBQUEsR0FBQSxLQUFBO2dCQUNBLE9BQUEsT0FBQSxlQUFBLFNBQUEsV0FBQSxlQUFBLE9BQUEsZUFBQSxPQUFBLGVBQUEsS0FBQSxnQkFBQSxPQUFBLE1BQUE7Z0JBQ0EsT0FBQSxhQUFBO2dCQUNBLGlCQUFBLGVBQUEsS0FBQSxPQUFBLE1BQUEsS0FBQSxRQUFBLE1BQUEsS0FBQSxPQUFBLE1BQUEsS0FBQSxRQUFBOztZQUVBLE9BQUE7Z0JBQ0EsU0FBQTtnQkFDQSxTQUFBO2dCQUNBLFNBQUE7Z0JBQ0Es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QUFBOztZQUVBLFFBQUEsVUFBQSxNQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsWUFBQSxTQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLElBQUE7Z0JBQ0EsVUFBQSxPQUFBLGFBQUE7O1lBRUEsYUFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsYUFBQSxVQUFBLE1BQUE7Z0JBQ0EsV0FBQTtnQkFDQSxZQUFBLGNBQUEsU0FBQTtnQkFDQSxZQUFBLGNBQUEsU0FBQTtnQkFDQSxVQUFBLE9BQUEsYUFBQTs7WUFFQSxxQkFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEscUJBQUEsVUFBQSxNQUFBO2dCQUNBLG1CQUFBO2dCQUNBLFlBQUEsbUJBQUE7Z0JBQ0EsVUFBQSxPQUFBLGFBQUE7O1lBRUEsZ0JBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGdCQUFBLFVBQUEsTUFBQTtnQkFDQSxjQUFBOztZQUVBLGNBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGNBQUEsVUFBQSxNQUFBO2dCQUNBLFlBQUE7Z0JBQ0EsWUFBQSxZQUFBO2dCQUNBLFVBQUEsT0FBQSxhQUFBOztZQUVBLGVBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGVBQUEsVUFBQSxNQUFBO2dCQUNBLGFBQUE7O1lBRUEsWUFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsWUFBQSxVQUFBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxZQUFBLFVBQUE7Z0JBQ0EsVUFBQSxPQUFBLGFBQUE7O1lBRUEsbUJBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLG1CQUFBLFVBQUEsTUFBQTtnQkFDQSxpQkFBQTtnQkFDQSxZQUFBLGlCQUFBO2dCQUNBLFVBQUEsT0FBQSxhQUFBOztZQUVBLHFCQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxxQkFBQSxVQUFBLE1BQUE7Z0JBQ0EsbUJBQUE7Z0JBQ0EsWUFBQSxtQkFBQTtnQkFDQSxVQUFBLE9BQUEsYUFBQTs7WUFFQSxjQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxjQUFBLFVBQUEsTUFBQTtnQkFDQSxZQUFBO2dCQUNBLFlBQUEsWUFBQTtnQkFDQSxVQUFBLE9BQUEsYUFBQTs7WUFFQSxjQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxjQUFBLFVBQUEsTUFBQTtnQkFDQSxZQUFBOztZQUVBLGVBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGVBQUEsVUFBQSxNQUFBO2dCQUNBLGFBQUE7Z0JBQ0EsWUFBQSxhQUFBO2dCQUNBLFVBQUEsT0FBQSxhQUFBOztZQUVBLG1CQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxtQkFBQSxVQUFBLE1BQUE7Z0JBQ0EsaUJBQUE7Z0JBQ0EsWUFBQSxpQkFBQTtnQkFDQSxVQUFBLE9BQUEsYUFBQTs7WUFFQSxnQkFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsZ0JBQUEsVUFBQSxNQUFBO2dCQUNBLGNBQUE7O1lBRUEsZUFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsZUFBQSxVQUFBLE1BQUE7Z0JBQ0EsYUFBQTtnQkFDQSxZQUFBLGFBQUE7Z0JBQ0EsVUFBQSxPQUFBLGFBQUE7O1lBRUEsZUFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsZUFBQSxVQUFBLE1BQUE7Z0JBQ0EsYUFBQTtnQkFDQSxXQUFBLEVBQUEsS0FBQSxZQUFBLEVBQUEsU0FBQTtnQkFDQSxZQUFBLGFBQUEsU0FBQTtnQkFDQSxZQUFBLGdCQUFBLFNBQUE7Z0JBQ0EsVUFBQSxPQUFBLGFBQUE7O1lBRUEsVUFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsVUFBQSxTQUFBLE1BQUE7Z0JBQ0EsUUFBQTs7WUFFQSxZQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxZQUFBLFVBQUEsTUFBQTtnQkFDQSxVQUFBOztZQUVBLFNBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLFNBQUEsVUFBQSxNQUFBO2dCQUNBLE9BQUE7Z0JBQ0EsWUFBQSxPQUFBO2dCQUNBLFVBQUEsT0FBQSxhQUFBOzs7Ozs7Ozs7Ozs7QUN0aUJBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxRQUFBLFFBQUEsNkNBQUE7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLE9BQUE7WUFDQSxZQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFdBQUEsUUFBQSxNQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxXQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFdBQUEsUUFBQSxNQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxVQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFdBQUEsUUFBQSxNQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxVQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUEsS0FBQSxXQUFBLFFBQUEsTUFBQSxXQUFBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsVUFBQSxVQUFBLFFBQUE7Z0JBQ0EsU0FBQSxVQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxXQUFBLFFBQUEsTUFBQTtvQkFDQSxRQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsaUJBQUEsVUFBQSxZQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxXQUFBLFFBQUEsTUFBQSxrQkFBQTttQkFDQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUE7bUJBQ0EsTUFBQSxVQUFBLE9BQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOztZQUVBLGFBQUEsVUFBQSxTQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxXQUFBLFFBQUEsTUFBQSxZQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsVUFBQSxVQUFBLE1BQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUEsS0FBQSxXQUFBLFFBQUEsTUFBQSxVQUFBLE1BQUEsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLE1BQUEsVUFBQSxPQUFBO29CQUNBLEVBQUEsT0FBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxZQUFBLFVBQUEsTUFBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTs7Z0JBRUEsTUFBQSxJQUFBLFdBQUEsUUFBQSxNQUFBLFlBQUEsS0FBQSxTQUFBLE1BQUEsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLE1BQUEsVUFBQSxPQUFBO29CQUNBLEVBQUEsT0FBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxZQUFBLFVBQUEsU0FBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTs7Z0JBRUEsTUFBQSxPQUFBLFdBQUEsUUFBQSxNQUFBLFlBQUEsU0FBQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUE7bUJBQ0EsTUFBQSxVQUFBLE9BQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOzs7Ozs7Ozs7Ozs7QUNuSUEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsV0FBQSx3RUFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7O1FBRUEsR0FBQSxlQUFBO1FBQ0EsR0FBQSxXQUFBLE9BQUE7UUFDQSxHQUFBLFVBQUE7UUFDQSxHQUFBLGFBQUE7UUFDQSxHQUFBLGVBQUE7UUFDQSxHQUFBLGdCQUFBO1FBQ0EsR0FBQSxRQUFBLENBQUE7WUFDQSxPQUFBO1lBQ0EsT0FBQTtXQUNBO1lBQ0EsT0FBQTtZQUNBLE9BQUE7OztRQUdBLEdBQUEsaUJBQUEsWUFBQTtZQUNBLEdBQUEsV0FBQSxDQUFBLEdBQUE7WUFDQSxhQUFBLGlCQUFBLEdBQUE7OztRQUdBLEdBQUEsY0FBQSxZQUFBO1lBQ0EsSUFBQSxRQUFBO2dCQUNBLFVBQUEsR0FBQTtnQkFDQSxPQUFBLEdBQUE7Z0JBQ0EsU0FBQSxHQUFBO2dCQUNBLFNBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxXQUFBLEdBQUE7OztZQUdBLElBQUEsR0FBQSxTQUFBO2dCQUNBLGFBQUEsWUFBQSxPQUFBLEtBQUEsWUFBQTtvQkFDQSxhQUFBLFNBQUE7bUJBQ0EsTUFBQSxVQUFBLEtBQUE7b0JBQ0EsUUFBQSxJQUFBOzttQkFFQTtnQkFDQSxhQUFBLFNBQUEsT0FBQSxLQUFBLFlBQUE7b0JBQ0EsYUFBQSxTQUFBO21CQUNBLE1BQUEsVUFBQSxLQUFBO29CQUNBLFFBQUEsSUFBQTs7Ozs7UUFLQSxPQUFBLGlCQUFBLDhCQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEdBQUEsVUFBQSxTQUFBLFlBQUE7WUFDQSxHQUFBLGFBQUEsU0FBQSxTQUFBO1lBQ0EsR0FBQSxlQUFBLFNBQUEsV0FBQTtZQUNBLEdBQUEsZ0JBQUEsU0FBQSxhQUFBOzs7Ozs7Ozs7OztBQzlEQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxVQUFBLGFBQUEsWUFBQTtRQUNBLE9BQUE7WUFDQSxVQUFBO1lBQ0EsYUFBQTtZQUNBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsT0FBQTtnQkFDQSxVQUFBOzs7Ozs7Ozs7Ozs7QUNWQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxXQUFBLG1FQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsS0FBQTtZQUNBLGNBQUE7O1FBRUEsR0FBQSxlQUFBO1FBQ0EsR0FBQSxRQUFBO1FBQ0EsR0FBQSxZQUFBO1FBQ0EsR0FBQSxRQUFBLFlBQUE7WUFDQSxHQUFBLE1BQUEsUUFBQTs7O1FBR0EsSUFBQSxhQUFBLFlBQUE7WUFDQSxhQUFBLFlBQUEsS0FBQSxVQUFBLFFBQUE7Z0JBQ0EsSUFBQSxPQUFBLEtBQUEsU0FBQSxHQUFBO29CQUNBLEdBQUEsUUFBQSxFQUFBLFFBQUEsT0FBQSxNQUFBLENBQUEsYUFBQSxDQUFBLFNBQUE7O2dCQUVBLGFBQUEsU0FBQSxHQUFBO2dCQUNBLGNBQUE7Ozs7UUFJQTs7UUFFQSxPQUFBLGlCQUFBLDhCQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxhQUFBO2dCQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtvQkFDQTs7Z0JBRUEsR0FBQSxRQUFBOzs7Ozs7Ozs7Ozs7QUNwQ0EsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsVUFBQSxhQUFBLFlBQUE7UUFDQSxPQUFBO1lBQ0EsVUFBQTtZQUNBLGFBQUE7WUFDQSxZQUFBO1lBQ0EsY0FBQTtZQUNBLE9BQUE7Ozs7Ozs7Ozs7O0FDVEEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsV0FBQSxpR0FBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxLQUFBO1lBQ0EsS0FBQSxVQUFBO1lBQ0EsaUJBQUEsR0FBQSxpQkFBQSxHQUFBLGlCQUFBLFdBQUE7O1FBRUEsR0FBQSxlQUFBO1FBQ0EsR0FBQSxhQUFBO1FBQ0EsR0FBQSxXQUFBLE9BQUE7UUFDQSxHQUFBLGFBQUEsRUFBQSxNQUFBLFdBQUE7UUFDQSxHQUFBLHNCQUFBLEVBQUEsTUFBQSxXQUFBO1FBQ0EsR0FBQSxZQUFBO1lBQ0EsS0FBQSxFQUFBLE1BQUEsV0FBQSxrQkFBQTtZQUNBLEtBQUEsRUFBQSxNQUFBLFdBQUEsb0JBQUE7O1FBRUEsR0FBQSxNQUFBO1lBQ0EsS0FBQSxFQUFBLE1BQUEsV0FBQTtZQUNBLEtBQUEsRUFBQSxNQUFBLFdBQUE7O1FBRUEsR0FBQSxXQUFBO1lBQ0EsS0FBQSxFQUFBLE1BQUEsV0FBQTtZQUNBLEtBQUEsRUFBQSxNQUFBLFdBQUE7OztRQUdBLEdBQUEsaUJBQUEsWUFBQTtZQUNBLEdBQUEsV0FBQSxDQUFBLEdBQUE7WUFDQSxhQUFBLHdCQUFBLEdBQUE7OztRQUdBLElBQUEsYUFBQSxZQUFBO1lBQ0EsSUFBQSxHQUFBLFlBQUE7Z0JBQ0EsR0FBQSxhQUFBLFdBQUEsR0FBQTs7WUFFQSxhQUFBLGNBQUEsR0FBQTtZQUNBLElBQUEsR0FBQSxxQkFBQTtnQkFDQSxHQUFBLHNCQUFBLFNBQUEsR0FBQTs7WUFFQSxhQUFBLHVCQUFBLEdBQUE7WUFDQSxJQUFBLGdCQUFBLEVBQUEsTUFBQSxHQUFBO1lBQ0EsSUFBQSxHQUFBLGNBQUE7Z0JBQ0EsR0FBQSxVQUFBLE1BQUEsV0FBQSxHQUFBLGdCQUFBO2dCQUNBLGNBQUEsTUFBQSxXQUFBLEdBQUE7bUJBQ0E7Z0JBQ0EsY0FBQSxNQUFBLGNBQUEsTUFBQTs7WUFFQSxJQUFBLEdBQUEsY0FBQTtnQkFDQSxHQUFBLFVBQUEsTUFBQSxXQUFBLEdBQUEsZ0JBQUE7Z0JBQ0EsY0FBQSxNQUFBLFdBQUEsR0FBQTttQkFDQTtnQkFDQSxjQUFBLE1BQUEsY0FBQSxNQUFBOztZQUVBLGFBQUEsYUFBQTtZQUNBLElBQUEsR0FBQSxRQUFBO2dCQUNBLEdBQUEsSUFBQSxNQUFBLFdBQUEsR0FBQTs7WUFFQSxJQUFBLEdBQUEsUUFBQTtnQkFDQSxHQUFBLElBQUEsTUFBQSxXQUFBLEdBQUE7O1lBRUEsYUFBQSxPQUFBLEdBQUE7WUFDQSxJQUFBLEdBQUEsYUFBQTtnQkFDQSxHQUFBLFNBQUEsTUFBQSxTQUFBLEdBQUE7O1lBRUEsSUFBQSxHQUFBLGFBQUE7Z0JBQ0EsR0FBQSxTQUFBLE1BQUEsU0FBQSxHQUFBOztZQUVBLGFBQUEsWUFBQSxHQUFBOzs7UUFHQTs7UUFFQSxPQUFBLE9BQUEsdUNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsaUJBQUE7OztRQUdBLE9BQUEsT0FBQSxpQkFBQSxFQUFBLFNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsU0FBQSxZQUFBO2dCQUNBLGFBQUEsY0FBQSxXQUFBOztXQUVBLG1CQUFBLFdBQUEsTUFBQTs7UUFFQSxPQUFBLE9BQUEsMEJBQUEsRUFBQSxTQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLFNBQUEsWUFBQTtnQkFDQSxhQUFBLHVCQUFBLFNBQUE7O1dBRUEsbUJBQUEsV0FBQSxNQUFBOztRQUVBLE9BQUEsaUJBQUEsZ0JBQUEsRUFBQSxTQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLElBQUEsU0FBQSxPQUFBLFNBQUEsS0FBQTtnQkFDQSxTQUFBLE1BQUEsU0FBQSxNQUFBOztZQUVBLElBQUEsU0FBQSxPQUFBLFNBQUEsS0FBQTtnQkFDQSxTQUFBLE1BQUEsU0FBQSxNQUFBOztZQUVBLElBQUEsZUFBQTtnQkFDQSxLQUFBLFNBQUEsTUFBQTtnQkFDQSxLQUFBLFNBQUEsTUFBQTs7WUFFQSxTQUFBLFlBQUE7Z0JBQ0EsYUFBQSxhQUFBOztXQUVBLG1CQUFBLFdBQUEsTUFBQTs7UUFFQSxPQUFBLGlCQUFBLFVBQUEsRUFBQSxTQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLElBQUEsU0FBQSxPQUFBLFNBQUEsS0FBQTtnQkFDQSxTQUFBLE1BQUEsU0FBQSxNQUFBOztZQUVBLElBQUEsU0FBQSxPQUFBLFNBQUEsS0FBQTtnQkFDQSxTQUFBLE1BQUEsU0FBQSxNQUFBOztZQUVBLFNBQUEsWUFBQTtnQkFDQSxhQUFBLE9BQUE7O1dBRUEsbUJBQUEsV0FBQSxNQUFBOztRQUVBLE9BQUEsaUJBQUEsZUFBQSxFQUFBLFNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsSUFBQSxTQUFBLE9BQUEsU0FBQSxLQUFBO2dCQUNBLFNBQUEsTUFBQSxTQUFBLE1BQUE7O1lBRUEsSUFBQSxTQUFBLE9BQUEsU0FBQSxLQUFBO2dCQUNBLFNBQUEsTUFBQSxTQUFBLE1BQUE7O1lBRUEsU0FBQSxZQUFBO2dCQUNBLGFBQUEsWUFBQTs7V0FFQSxtQkFBQSxXQUFBLE1BQUE7Ozs7Ozs7Ozs7QUN2SkEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsVUFBQSxvQkFBQSxZQUFBO1FBQ0EsT0FBQTtZQUNBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBO2dCQUNBLFVBQUE7Ozs7Ozs7Ozs7OztBQ1ZBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxRQUFBLFdBQUEsaVJBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7WUFDQSw2QkFBQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7O1FBRUEsR0FBQSxvQkFBQTtRQUNBLEdBQUEsbUJBQUE7O1FBRUEsSUFBQSxhQUFBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsV0FBQTtZQUNBLFlBQUE7WUFDQSxZQUFBO1lBQ0EsVUFBQTtZQUNBLGlCQUFBO1lBQ0EsUUFB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QUNBLFVBQUE7O3dCQUVBLE1BQUE7NEJBQ0EsUUFBQSxVQUFBLEdBQUE7O2dDQUVBLElBQUEsSUFBQSxLQUFBLElBQUE7Z0NBQ0EsSUFBQSxNQUFBLEdBQUE7b0NBQ0EsSUFBQSxJQUFBLElBQUEsS0FBQSxJQUFBLElBQUEsS0FBQSxLQUFBLE1BQUEsS0FBQSxJQUFBLElBQUE7b0NBQ0EsSUFBQSxJQUFBLElBQUEsSUFBQSxJQUFBOztvQ0FFQSxJQUFBLElBQUEsV0FBQSxJQUFBLFFBQUE7d0NBQ0EsT0FBQSxVQUFBOzs7OztvQ0FLQSxJQUFBLFNBQUEsVUFBQTtvQ0FDQSxJQUFBLFFBQUEsT0FBQSxXQUFBLE1BQUE7b0NBQ0EsSUFBQSxNQUFBLFNBQUEsS0FBQSxNQUFBLEdBQUEsU0FBQSxHQUFBO3dDQUNBLE9BQUEsTUFBQSxLQUFBLE1BQUEsTUFBQSxHQUFBLFVBQUEsR0FBQTs7O29DQUdBLE9BQUE7O2dDQUVBLE9BQUE7Ozs7O2dCQUtBLE1BQUE7b0JBQ0EsU0FBQTs7Z0JBRUEsVUFBQTtvQkFDQSxNQUFBOztnQkFFQSxZQUFBLFlBQUE7b0JBQ0EsTUFBQSxNQUFBOzs7OztRQUtBLElBQUEsY0FBQSxVQUFBLFNBQUE7WUFDQSxPQUFBLEVBQUEsT0FBQSxTQUFBLFVBQUEsUUFBQTtnQkFDQSxJQUFBLEVBQUEsV0FBQSxRQUFBLFdBQUEsZ0JBQUE7b0JBQ0EsT0FBQSxPQUFBLE1BQUEsS0FBQTs7Z0JBRUEsT0FBQTs7OztRQUlBLElBQUEsY0FBQSxZQUFBO1lBQ0EsR0FBQSxlQUFBOztZQUVBLGNBQUEsVUFBQSxPQUFBOzs7WUFHQSxZQUFBLElBQUEsVUFBQSxxQkFBQSxXQUFBLFNBQUEsS0FBQSxVQUFBLFFBQUE7Z0JBQ0EsSUFBQSxpQkFBQTtvQkFDQSxZQUFBO29CQUNBLEdBQUEsVUFBQTtvQkFDQTs7b0JBRUEsSUFBQSxPQUFBLHNCQUFBLEVBQUEsT0FBQSxnQkFBQSxTQUFBLG9CQUFBLFdBQUEsZ0JBQUE7b0JBQ0EsT0FBQSxZQUFBOztvQkFFQSxJQUFBLGFBQUE7d0JBQ0EsYUFBQTs7O29C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LEVBQUEsS0FBQSxhQUFBLEVBQUEsU0FBQTtZQUNBLElBQUEsZ0JBQUE7Z0JBQ0EsZUFBQSxTQUFBLEVBQUEsT0FBQSxXQUFBLGFBQUE7Z0JBQ0EsZUFBQTs7OztRQUlBLEdBQUEsWUFBQSxVQUFBLFFBQUEsVUFBQTtZQUNBLEVBQUEsTUFBQSxFQUFBLFNBQUE7aUJBQ0EsVUFBQSxFQUFBLE9BQUEsU0FBQSxXQUFBLFdBQUEsT0FBQSxXQUFBLFNBQUEsV0FBQSxXQUFBLE9BQUE7aUJBQ0EsV0FBQSxZQUFBLHVCQUFBO2lCQUNBLE9BQUE7OztRQUdBLEdBQUEsWUFBQSxZQUFBO1lBQ0EsSUFBQTs7O1FBR0EsR0FBQSxZQUFBLFVBQUEsUUFBQSxVQUFBOztZQUVBLElBQUEsYUFBQTtnQkFDQSxJQUFBLGlCQUFBLEVBQUEsS0FBQSxhQUFBLEVBQUEsU0FBQTtnQkFDQSxJQUFBLGdCQUFBO29CQUNBLGVBQUEsU0FBQSxDQUFBLE9BQUEsZUFBQSxRQUFBLFlBQUEsT0FBQSxhQUFBOzs7O1lBSUEsYUFBQSxhQUFBO1lBQ0EsSUFBQTtZQUNBLFNBQUEsV0FBQTtZQUNBLGNBQUE7O1lBRUEsYUFBQSxlQUFBLGFBQUE7WUFDQSxPQUFBOzs7UUFHQSxHQUFBLGFBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQSxXQUFBLEVBQUEsS0FBQSxHQUFBLFlBQUEsRUFBQSxTQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsR0FBQSxXQUFBLE1BQUEsV0FBQTs7Z0JBRUEsR0FBQSxXQUFBLEtBQUEsWUFBQSxHQUFBLFdBQUEsS0FBQSxjQUFBLFNBQUEsUUFBQTttQkFDQTs7Z0JBRUEsU0FBQSxVQUFBO2dCQUNBLEdBQUEsV0FBQSxLQUFBLFVBQUE7O1lBRUEsR0FBQSxZQUFBLEVBQUEsUUFBQSxHQUFBLFdBQUEsQ0FBQSxHQUFBLFdBQUEsS0FBQSxRQUFBLENBQUEsR0FBQSxXQUFBLEtBQUE7WUFDQSxhQUFBLGNBQUEsR0FBQTs7O1FBR0EsR0FBQSxlQUFBLFVBQUEsS0FBQTtZQUNBLElBQUEsV0FBQSxFQUFBLEtBQUEsR0FBQSxZQUFB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QUFBLEdBQUE7Z0JBQ0EsU0FBQSxFQUFBLGFBQUEsV0FBQTtnQkFDQSxTQUFBLE9BQUE7O1lBRUEsR0FBQSxTQUFBO2dCQUNBLEtBQUEsT0FBQTtnQkFDQSxLQUFBLE9BQUE7Z0JBQ0EsTUFBQTs7ZUFFQTtZQUNBLEdBQUEsU0FBQSxhQUFBLGtCQUFBLFdBQUE7Ozs7UUFJQSxHQUFBLFdBQUE7WUFDQSxLQUFBLFdBQUE7WUFDQSxhQUFBO1lBQ0Esb0JBQUE7WUFDQSxVQUFBO2dCQUNBLFFBQUE7b0JBQ0EsU0FBQTtvQkFDQSxVQUFBO29CQUNBLFdBQUE7Ozs7OztRQU1BLEdBQUEsU0FBQSxFQUFBLFVBQUEsV0FBQTs7UUFFQSxJQUFBLGlCQUFBLFVBQUEsUUFBQTtZQUNBLFNBQUEsVUFBQTtZQUNBLElBQUEsV0FBQSxZQUFBO2dCQUNBLEVBQUEsUUFBQSxVQUFBLFVBQUEsV0FBQTtvQkFDQSxJQUFBLGFBQUEsT0FBQSxTQUFBO29CQUNBLElBQUEsU0FBQTtvQkFDQSxXQUFBOzs7WUFHQSxJQUFBLFFBQUE7Z0JBQ0E7bUJBQ0E7Z0JBQ0EsWUFBQSxZQUFBLEtBQUEsVUFBQSxXQUFBO29CQUNBLFNBQUEsRUFBQSxVQUFBO29CQUNBOzs7OztRQUtBLElBQUEsa0JBQUEsVUFBQSxPQUFBO1lBQ0EsWUFBQSxZQUFBLEtBQUEsVUFBQSxRQUFBO2dCQUNBLEVBQUEsUUFBQSxPQUFBLFlBQUEsVUFBQSxPQUFBO29CQUNBLElBQUEsWUFBQTs7Z0JBRUEsSUFBQSxTQUFBLE9BQUEsV0FBQSxNQUFBO2dCQUNBLGVBQUE7Ozs7UUFJQSxJQUFBLGFBQUEsVUFBQSxTQUFBLE9BQUE7WUFDQSxJQUFBLGNBQUEsYUFBQTtZQUNBLE1BQUEsUUFBQSxhQUFBLFFBQUE7WUFDQSxJQUFBLFlBQUEsV0FBQSxXQUFBLE9BQUEsa0JBQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLGlCQUFBLFlBQUEsV0FBQSxXQUFBLE9BQUEsa0JBQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLGVBQUE7Z0JBQ0EsRUFBQSxNQUFBLE1BQUEs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QUEsS0FBQTtZQUNBLFFBQUEsR0FBQSxNQUFBO1lBQ0EsUUFBQSxHQUFBLE1BQUE7O1FBRUEsR0FBQSxPQUFBLE9BQUEsUUFBQTs7UUFFQSxHQUFBLFlBQUEsVUFBQSxXQUFBO1lBQ0EsSUFBQSxJQUFBO1lBQ0EsUUFBQSxHQUFBLFNBQUE7Z0JBQ0EsS0FBQTtvQkFDQSxLQUFBLDRCQUFBLG1CQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUEsU0FBQTtvQkFDQSxLQUFBLDRCQUFBLG1CQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUEsU0FBQTtvQkFDQTtnQkFDQSxLQUFBO29CQUNBLEtBQUEsNEJBQUEsb0JBQUEsR0FBQSxTQUFBLE9BQUEsR0FBQSxTQUFBO29CQUNBLEtBQUEsNEJBQUEsb0JBQUEsR0FBQSxTQUFBLE9BQUEsR0FBQSxTQUFBO29CQUNBO2dCQUNBLEtBQUE7b0JBQ0EsSUFBQSxHQUFBLFNBQUEsUUFBQTt3QkFDQSxLQUFBLDRCQUFBLHFCQUFBLEdBQUEsU0FBQTs7b0JBRUEsSUFBQSxHQUFBLFNBQUEsUUFBQTt3QkFDQSxLQUFBLDRCQUFBLHFCQUFBLEdBQUEsU0FBQTs7b0JBRUE7O1lBRUEsR0FBQSxTQUFBLFFBQUE7WUFDQSxHQUFBLFNBQUEsT0FBQTtZQUNBLEdBQUEsU0FBQSxRQUFBO1lBQ0EsR0FBQSxTQUFBLE9BQUE7WUFDQSxHQUFBLFNBQUEsU0FBQTtZQUNBLEdBQUEsU0FBQSxTQUFBOztZQUVBLFFBQUE7Z0JBQ0EsS0FBQTtvQkFDQSxJQUFBLE1BQUEsSUFBQTt3QkFDQSxHQUFBLFNBQUEsUUFBQSxHQUFBLEdBQUE7d0JBQ0EsR0FBQSxTQUFBLE9BQUEsR0FBQSxHQUFBO3dCQUNBLEdBQUEsU0FBQSxRQUFBLEdBQUEsR0FBQTt3QkFDQSxHQUFBLFNBQUEsT0FBQSxHQUFBLEdBQUE7O29CQUVBO2dCQUNBLEtBQUE7b0JBQ0EsSUFBQSxNQUFBLElBQUE7d0JBQ0EsR0FBQSxTQUFBLFFBQUEsR0FBQSxJQUFBO3dCQUNBLEdBQUEsU0FBQSxPQUFBLEdBQUEsSUFBQTt3QkFDQSxHQUFBLFNB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QUNBLEdBQUEsZUFBQTtRQUNBLEdBQUEsU0FBQTtRQUNBLEdBQUEsUUFBQTtRQUNBLEdBQUEsT0FBQTtRQUNBLEdBQUEsWUFBQTtZQUNBLE1BQUE7WUFDQSxRQUFBO1lBQ0EsUUFBQTs7UUFFQSxHQUFBLFdBQUE7WUFDQSxNQUFBO1lBQ0EsUUFBQTtZQUNBLFFBQUE7O1FBRUEsR0FBQSxTQUFBLEVBQUEsTUFBQSxXQUFBO1FBQ0EsR0FBQSxVQUFBO1FBQ0EsR0FBQSxtQkFBQTtRQUNBLEdBQUEsT0FBQTs7UUFFQSxJQUFBLFVBQUEsVUFBQSxPQUFBOztZQUVBLElBQUEsZUFBQSxPQUFBLE1BQUEsS0FBQSxPQUFBLElBQUEsUUFBQTtZQUNBLEdBQUEsT0FBQSxnQkFBQTtZQUNBLGFBQUEsUUFBQSxHQUFBOzs7UUFHQSxPQUFBLFVBQUEsWUFBQTtZQUNBLE9BQUEsR0FBQTs7O1FBR0EsR0FBQSxpQkFBQSxZQUFBO1lBQ0EsR0FBQSxXQUFBLENBQUEsR0FBQTtZQUNBLGFBQUEsMEJBQUEsR0FBQTs7O1FBR0EsR0FBQSxXQUFBLFVBQUEsT0FBQSxZQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsTUFBQSxJQUFBLE9BQUEsWUFBQSxRQUFBO2dCQUNBLE9BQUEsT0FBQSxNQUFBLFFBQUE7O1lBRUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLGVBQUEsYUFBQSxVQUFBLENBQUEsTUFBQSxlQUFBLFlBQUE7Z0JBQ0EsUUFBQSxPQUFBLE1BQUEsSUFBQSxPQUFBO2dCQUNBLE9BQUEsT0FBQTs7O1lBR0EsUUFBQTs7WUFFQSxhQUFBLGtCQUFBO2dCQUNBLE9BQUEsTUFBQTtnQkFDQSxNQUFBLEtBQUE7Ozs7UUFJQSxHQUFBLFVBQUEsVUFBQSxNQUFBO1lBQ0EsSUFBQSxVQUFBLE9BQUEsSUFBQSxHQUFBLE9BQUEsY0FBQTtnQkFDQSxPQUFBLFVBQUEsQ0FBQSxNQUFBLE9BQUEsSUFBQSxHQUFBLE9BQUEsY0FBQSxRQUFBLE1BQUEsQ0FBQSxLQUFBO2dCQUNBLFNBQUEsVUFBQSxDQUFBLE1BQUEsT0FBQSxJQUFBLEdBQUEsT0FBQSxjQUFBLFVBQUEsTUFBQSxDQUFBLEtBQUE7Z0JBQ0EsU0FBQSxVQUFBLENBQUEsTUFBQSxPQUFBLElBQUEsR0FBQSxPQUFBLGNBQUEsVUFBQSxNQUFBLENBQUEsS0FBQTs7WUFFQSxJQUFBLFNBQUEsU0FBQTtnQkFDQSxHQUFBLFlBQUE7b0JBQ0EsTUFBQTtvQkFDQSxRQUFBO29CQUNBLFFBQUE7O21CQUVBO2dCQUNBLEdBQUEsV0FBQTtvQkFDQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsUUFBQTs7Ozs7UUFLQSxHQUFBLGFBQUEsVUFBQSxNQUFBLE1BQUE7WUFDQSxJQUFBLEdBQUEsTUFBQSxNQUFBLFNBQUEsR0FBQTtnQkFDQSxHQUFBLE1BQUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLE1BQUEsTUFBQSxDQUFBOztZQUVBLElBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxRQUFBO2dCQUNBLElBQUEsR0FBQSxNQUFBLE9BQUEsTUFBQSxHQUFBLE1BQUEsT0FBQSxHQUFBO29CQUNBLEdBQUEsTUFBQSxPQUFBLEdBQUEsTUFBQSxPQUFBLEtBQUEsS0FBQTs7Z0JBRUEsSUFBQSxHQUFBLE1BQUEsU0FBQSxNQUFBLEdBQUEsTUFBQSxTQUFBLEdBQUE7b0JBQ0EsR0FBQSxNQUFBLFNBQUEsR0FBQSxNQUFBLFNBQUEsS0FBQSxLQUFBOztnQkFFQSxJQUFBLEdBQUEsTUFBQSxTQUFBLE1BQUEsR0FBQSxNQUFBLFNBQUEsR0FBQTtvQkFDQSxHQUFBLE1BQUEsU0FBQSxHQUFBLE1BQUEsU0FBQSxLQUFBLEtBQUE7O2dCQUVBLElBQUEsVUFBQSxTQUFBLGNBQUEsT0FBQSxJQUFBLEdBQUEsTUFBQSxpQkFBQSxPQUFBLElBQUEsR0FBQSxLQUFBO2dCQUNBLFFBQUEsSUFBQTtvQkFDQSxRQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsTUFBQSxNQUFBLENBQUE7b0JBQ0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLFFBQUEsTUFBQSxDQUFBO29CQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxRQUFBLE1BQUEsQ0FBQTs7Z0JBRUEsSUFBQSxTQUFBLGFBQUE7b0JBQ0EsR0FBQSxRQUFBLFFBQUE7dUJBQ0EsSUFBQSxTQUFBLFlBQUE7b0JBQ0EsR0FBQSxPQUFBLFFBQUE7Ozs7O1FBS0EsR0FBQSxVQUFBLFVBQUEsUUFBQSxNQUFBLE1BQUE7WUFDQSxJQUFBLE1BQUE7WUFDQSxJQUFBLFNBQUEsUUFBQTtnQkFDQSxNQUFBO21CQUNBLElBQUEsU0FBQSxZQUFBLFNBQUEsVUFBQTtnQkFDQSxNQUFBOztZQUVBLElBQUEsT0FBQSxZQUFBLElBQUE7O2dCQUVBLElBQUEsTUFBQSxHQUFBLE1BQUEsUUFBQTtvQkFDQSxHQUFBLE1BQUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUE7O2dCQUVBLElBQUEsR0FBQSxNQUFBLFFBQUEsS0FBQTtvQkFDQSxHQUFBLE1BQUE7O2dCQUVBLEdBQUEsTUFBQSxRQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsT0FBQSxNQUFBLENBQUE7Z0JBQ0EsR0FBQSxXQUFBLE1BQUE7bUJBQ0EsSUFBQSxPQUFBLFlBQUEsSUFBQTs7Z0JBRUEsSUFBQSxNQUFBLEdBQUEsTUFBQSxRQUFBO29CQUNBLEdBQUEsTUFBQSxRQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTs7Z0JBRUEsSUFBQSxHQUFBLE1BQUEsUUFBQSxHQUFBO29CQUNBLEdBQUEsTUFBQTs7Z0JBRUEsR0FBQSxNQUFBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxPQUFBLE1BQUEsQ0FBQTtnQkFDQSxHQUFBLFdBQUEsTUFBQTs7OztRQUlBLEdBQUEsWUFBQSxVQUFBLFdBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxJQUFBLEdBQUE7WUFDQSxJQUFBLE9BQUEsT0FBQSxJQUFBLEdBQUE7WUFDQSxJQUFBLE9BQUEsS0FBQSxLQUFBOztZQUVBLFFBQUEsTUFBQTs7WUFFQSxhQUFBLGtCQUFBO2dCQUNBLE9BQUEsY0FBQSxZQUFBLE1BQUEsSUFBQSxRQUFBLE1BQUEsU0FBQTtnQkFDQSxNQUFBLGNBQUEsWUFBQSxLQUFBLElBQUEsUUFBQSxLQUFBLFNBQUE7Ozs7UUFJQSxHQUFBLG9CQUFBLFlBQUE7WUFDQSxJQUFBLEdBQUEsU0FBQSxHQUFBLFFBQUEsT0FBQSxJQUFBLEdBQUEsT0FBQSxhQUFBLE9BQUEsSUFBQSxHQUFBLE1BQUEsV0FBQTtnQkFDQSxHQUFBLG1CQUFBO2dCQUNBLElBQUEsY0FBQSxPQUFBLElBQUEsR0FBQSxNQUFBO29CQUNBLGFBQUEsT0FBQSxJQUFBLEdBQUEsS0FBQTs7Z0JBRUEsSUFBQSxZQUFBLFNBQUEsYUFBQTtvQkFDQSxHQUFBLFVBQUE7b0JBQ0EsUUFBQSxHQUFBO29CQUNBLGFBQUEsa0JBQUE7d0JBQ0EsT0FBQSxHQUFBO3dCQUNBLE1BQUEsR0FBQTs7dUJBRUE7b0JBQ0EsR0FBQSxVQUFBO29CQUNBLFNBQUEsS0FBQSxTQUFBLFNBQUEsWUFBQSxtQ0FBQSxNQUFBLGNBQUEsU0FBQTs7bUJBRUE7Z0JBQ0EsR0FBQSxVQUFBO2dCQUNBLFNBQUEsS0FBQSxTQUFBLFNBQUEsWUFBQSxzREFBQSxNQUFBLGNBQUEsU0FBQTs7OztRQUlBLElBQUEsYUFBQSxXQUFBO1lBQ0EsS0FBQSxVQUFBOztZQUVBLEdBQUEsUUFBQSxHQUFBLFFBQUEsT0FBQSxJQUFBLEdBQUEsT0FBQSxXQUFBLE9BQUEsTUFBQSxTQUFBLFdBQUEsdUJBQUEsV0FBQSxzQkFBQSxRQUFBLFdBQUEsc0JBQUE7WUFDQSxHQUFBLE9BQUEsR0FBQSxPQUFBLE9BQUEsSUFBQSxHQUFBLE1BQUEsV0FBQSxPQUFBLE1BQUEsUUFBQSxXQUFBLHNCQUFBOztZQUVBLEdBQUEsUUFBQTtZQUNBLEdBQUEsUUFBQTtZQUNBLEdBQUE7O1FBRUE7O1FBRUEsT0FBQSxPQUFBLFlBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsR0FBQSxtQkFBQTs7O1FBR0EsT0FBQSxPQUFBLFdBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsR0FBQSxtQkFBQTs7O1FBR0EsT0FBQSxpQkFBQSx1Q0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7O1lBR0EsR0FBQSxRQUFBLE9BQUEsSUFBQSxTQUFBLE1BQUEsZUFBQTtZQUNBLEdBQUEsT0FBQSxPQUFBLElBQUEsU0FBQSxLQUFBLGVBQUE7O1lBRUEsR0FBQSxRQUFBO1lBQ0EsR0FBQSxRQUFBOztZQUVBLFNBQUEsWUFBQTtnQkFDQSxHQUFBLG1CQUFBOzs7Ozs7Ozs7Ozs7QUNqT0EsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsVUFBQSxzQkFBQSxZQUFBO1FBQ0EsT0FBQTtZQUNBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsTUFBQTs7Ozs7Ozs7Ozs7O0FDWEEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsV0FBQSxtRkFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsS0FBQTs7UUFFQSxHQUFBLGVBQUE7UUFDQSxHQUFBLGFBQUE7UUFDQSxHQUFBLFdBQUEsT0FBQTtRQUNBLEdBQUEsZ0JBQUEsYUFBQTtRQUNBLEdBQUEsUUFBQSxFQUFBLFVBQUEsV0FBQTtRQUNBLEdBQUEsY0FBQTs7UUFFQSxHQUFBLGlCQUFBLFlBQUE7WUFDQSxHQUFBLFdBQUEsQ0FBQSxHQUFBO1lBQ0EsYUFBQSxzQkFBQSxHQUFBOzs7UUFHQSxHQUFBLGFBQUEsVUFBQSxNQUFBO1lBQ0EsS0FBQSxTQUFBLENBQUEsS0FBQTtZQUNBLElBQUEsS0FBQSxRQUFBO2dCQUNBLElBQUEsQ0FBQSxFQUFBLEtBQUEsR0FBQSxhQUFBLE9BQUE7b0JBQ0EsR0FBQSxZQUFBLEtBQUE7b0JBQ0EsYUFBQSxlQUFBLEdBQUE7O21CQUVBO2dCQUNBLElBQUEsRUFBQSxLQUFBLEdBQUEsYUFBQSxPQUFBO29CQUNBLEVBQUEsT0FBQSxHQUFBLGFBQUE7b0JBQ0EsYUFBQSxlQUFBLEdBQUE7Ozs7O1FBS0EsSUFBQSxhQUFBLFlBQUE7WUFDQSxJQUFBLFVBQUEsVUFBQSxTQUFBOztZQUVBLElBQUEsU0FBQTtnQkFDQSxVQUFBLFFBQUEsTUFBQTtnQkFDQSxFQUFBLFFBQUEsU0FBQSxVQUFBLFVBQUE7b0JBQ0EsSUFBQSxPQUFBLEVBQUEsS0FBQSxHQUFBLE9BQUEsRUFBQSxNQUFBO29CQUNBLEdBQUEsV0FBQTs7Ozs7UUFLQTs7UUFFQSxPQUFBLGlCQUFBLHNDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEdBQUEsZ0JBQUE7Ozs7Ozs7Ozs7O0FDekRBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxRQUFBLFVBQUEsa0JBQUEsWUFBQTtRQUNBLE9BQUE7WUFDQSxVQUFBO1lBQ0EsYUFBQTtZQUNBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsT0FBQTtnQkFDQSxVQUFBOzs7Ozs7Ozs7Ozs7QUNWQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxXQUFBLCtIQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxLQUFBO1lBQ0EsS0FBQSxVQUFBOztRQUVBLEdBQUEsYUFBQTtRQUNBLEdBQUEsV0FBQSxPQUFBO1FBQ0EsR0FBQSxZQUFBO1FBQ0EsR0FBQSxvQkFBQTtRQUNBLEdBQUEsbUJBQUE7O1FBRUEsR0FBQSxpQkFBQSxZQUFBO1lBQ0EsR0FBQSxXQUFBLENBQUEsR0FBQTtZQUNBLGFBQUEseUJBQUEsR0FBQTs7O1FBR0EsR0FBQSxvQkFBQSxZQUFBO1lBQ0EsYUFBQSxhQUFBLEVBQUEsSUFBQSxHQUFBLG1CQUFBOzs7UUFHQSxJQUFBLGFBQUEsWUFBQTtZQUNBLGNBQUEsZUFBQSxLQUFBLFVBQUEsTUFBQTtnQkFDQSxHQUFBLFlBQUEsRUFBQSxPQUFBLEVBQUEsSUFBQSxLQUFBLFVBQUEsZUFBQSxVQUFBLE1BQUE7b0JBQ0EsSUFBQSxFQUFBLFFBQUEsV0FBQSxrQkFBQSxLQUFBLFdBQUEsQ0FBQSxHQUFBO3dCQUNBLEdBQUEsa0JBQUEsS0FBQTs7b0JBRUEsT0FBQSxLQUFBOztnQkFFQSxhQUFBLGVBQUEsR0FBQTtnQkFDQSxJQUFBLEdBQUEsV0FBQTtvQkFDQSxJQUFBLEdBQUEsVUFBQSxnQkFBQSxPQUFBO3dCQUNBLEVBQUEsUUFBQSxHQUFBLFdBQUEsVUFBQSxTQUFBOzRCQUNBLEdBQUEsa0JBQUEsS0FBQSxFQUFBLEtBQUEsR0FBQSxXQUFBLEVBQUEsS0FBQSxTQUFBOzsyQkFFQTt3QkFDQSxHQUFBLGtCQUFBLEtBQUEsRUFBQSxLQUFBLEdBQUEsV0FBQSxFQUFBLEtBQUEsU0FBQSxHQUFBOzs7Z0JBR0EsSUFBQSxHQUFBLGtCQUFBLFNBQUEsR0FBQTtvQkFDQSxHQUFBOztnQkFFQSxHQUFBLG1CQUFBO2VBQ0EsVUFBQSxPQUFBO2dCQUNBLFFBQUEsSUFBQTtnQkFDQSxTQUFBLEtBQUEsU0FBQSxTQUFBLFlBQUEsOEJBQUEsTUFBQSxjQUFBLFNBQUE7Z0JBQ0EsR0FBQSxtQkFBQTs7OztRQUlBOzs7Ozs7Ozs7O0FDNURBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxRQUFBLFVBQUEscUJBQUEsWUFBQTtRQUNBLE9BQUE7WUFDQSxVQUFBO1lBQ0EsYUFBQTtZQUNBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsT0FBQTs7Ozs7Ozs7Ozs7QUNUQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxXQUFBLGlIQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxLQUFBO1lBQ0EsS0FBQSxVQUFBO1lBQ0EsaUJBQUEsR0FBQSxpQkFBQSxHQUFBLGlCQUFBLFdBQUE7WUFDQSxZQUFBLElBQUEsRUFBQTs7UUFFQSxHQUFBLGFBQUE7UUFDQSxHQUFBLGVBQUE7UUFDQSxHQUFBLFlBQUEsYUFBQTtRQUNBLEdBQUEsWUFBQSxHQUFBLFlBQUEsR0FBQSxZQUFBLFdBQUE7UUFDQSxHQUFBLG1CQUFBLEdBQUEsY0FBQTtRQUNBLEdBQUEsYUFBQTtRQUNBLEdBQUEsa0JBQUE7O1FBRUEsR0FBQSxZQUFBLFVBQUEsaUJBQUE7WUFDQSxJQUFBLFdBQUEsWUFBQTtnQkFDQSxFQUFBLFFBQUEsR0FBQSxZQUFBLFVBQUEsR0FBQTtvQkFDQSxJQUFBLFVBQUEsRUFBQSxRQUFBLEVBQUEsWUFBQSxZQUFBO3dCQUNBLFVBQUE7b0JBQ0EsRUFBQSxRQUFBLFNBQUEsVUFBQSxRQUFBO3dCQUNBLFFBQUEsS0FBQSxDQUFBLE9BQUEsSUFBQSxPQUFBOztvQkFFQSxVQUFBLFNBQUEsRUFBQSxRQUFBLFNBQUEsRUFBQSxPQUFBLFdBQUEsUUFBQSxPQUFBLFdBQUE7O2dCQUVBLGFBQUEsYUFBQTs7O1lBR0EsVUFBQTtZQUNBLFlBQUEsSUFBQSxFQUFBO1lBQ0EsSUFBQSxtQkFBQSxDQUFBLEdBQUEsWUFBQTtnQkFDQSxHQUFBLGtCQUFBO2dCQUNBLFdBQUEsbUJBQUEsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsR0FBQSxrQkFBQTtvQkFDQSxHQUFBLGFBQUEsT0FBQSxLQUFBO29CQUNBO21CQUNBLFlBQUE7b0JBQ0EsYUFBQSxhQUFBOzttQkFFQTtnQkFDQTs7OztRQUlBLElBQUEsYUFBQSxZQUFBO1lBQ0EsYUFBQSxhQUFBLEdBQUE7WUFDQSxJQUFBLEdBQUEsY0FBQSxXQUFBO2dCQUNBLEdBQUEsVUFBQTs7OztRQUlBOztRQUVBLE9BQUEsT0FBQSx1Q0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxpQkFBQTs7O1FBR0EsT0FBQSxPQUFBLHVCQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEdBQUEsWUFBQSxXQUFBLFlBQUE7WUFDQSxhQUFBLGFBQUEsR0FBQTtZQUNBLElBQUEsR0FBQSxjQUFBLFdBQUE7Z0JBQ0EsR0FBQSxVQUFBLEdBQUEsZUFBQTs7OztRQUlBLE9BQUEsaUJBQUEsZ0NBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsR0FBQSxZQUFBO1lBQ0EsSUFBQSxXQUFBLEdBQUE7Z0JBQ0EsSUFBQSxHQUFBLGNBQUEsV0FBQTtvQkFDQSxVQUFBO29CQUNBLGFBQUEsYUFBQTtvQkFDQSxHQUFBLFlBQUE7b0JBQ0EsR0FBQSxtQkFBQTtvQkFDQSxTQUFBLEtBQUEsU0FBQSxTQUFBLFlBQUEsd0VBQUEsTUFBQSxjQUFBLFNBQUE7Ozs7Ozs7Ozs7Ozs7QUM3RkEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsVUFBQSxpQkFBQSxZQUFBO1FBQ0EsT0FBQTtZQUNBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBOzs7Ozs7Ozs7OztBQ1RBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxRQUFBLFdBQUEsZ0ZBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxLQUFBO1lBQ0EsS0FBQSxVQUFBOztRQUVBLEdBQUEsYUFBQTtRQUNBLEdBQUEsZUFBQTtRQUNBLEdBQUEsYUFBQTtRQUNBLEdBQUEsVUFBQTs7UUFFQSxHQUFBLGtCQUFBLFlBQUE7WUFDQSxhQUFBLFdBQUEsR0FBQTs7O1FBR0EsSUFBQSxhQUFBLFlBQUE7WUFDQSxJQUFBLEdBQUEsU0FBQTtnQkFDQSxHQUFBLFVBQUEsR0FBQSxRQUFBLGdCQUFBLFFBQUEsQ0FBQSxHQUFBLFdBQUEsR0FBQTtnQkFDQSxHQUFBOzs7O1FBSUE7O1FBRUEsT0FBQSxpQkFBQSxtQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxHQUFBLGFBQUE7Ozs7Ozs7Ozs7O0FDbENBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxRQUFBLFVBQUEsb0JBQUEsWUFBQTtRQUNBLE9BQUE7WUFDQSxVQUFBO1lBQ0EsYUFBQTtZQUNBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsT0FBQTs7Ozs7Ozs7Ozs7QUNUQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxXQUFBLHdIQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxLQUFBO1lBQ0EsS0FBQSxVQUFBOztRQUVBLEdBQUEsYUFBQTtRQUNBLEdBQUEsZUFBQTtRQUNBLEdBQUEsYUFBQSxHQUFBLGFBQUEsR0FBQSxhQUFBLFdBQUE7UUFDQSxHQUFBLGlCQUFBLEdBQUEsaUJBQUEsR0FBQSxpQkFBQSxXQUFBO1FBQ0EsR0FBQSxvQkFBQSxHQUFBLGVBQUE7UUFDQSxHQUFBLGFBQUEsR0FBQSxhQUFBLFNBQUEsR0FBQSxZQUFBLE1BQUEsV0FBQTtRQUNBLEdBQUEsY0FBQTs7UUFFQSxJQUFBLGVBQUEsWUFBQTtZQUNBLElBQUEsaUJBQUEsYUFBQTtZQUNBLFlBQUEsU0FBQSxFQUFBLE1BQUEsR0FBQSxnQkFBQSxPQUFBLGVBQUEsT0FBQSxNQUFBLGVBQUEsTUFBQSxPQUFBLEdBQUEsY0FBQSxLQUFBLFVBQUEsU0FBQTtnQkFDQSxJQUFBLGNBQUE7Z0JBQ0EsSUFBQSxPQUFBLFFBQUEsU0FBQSxVQUFBO29CQUNBLGNBQUEsTUFBQSxRQUFBLFFBQUEsUUFBQSxRQUFBLE9BQUEsQ0FBQSxRQUFBOztnQkFFQSxhQUFBLGVBQUE7Ozs7UUFJQSxJQUFBLGFBQUEsWUFBQTtZQUNBLGFBQUEsY0FBQSxHQUFBO1lBQ0EsYUFBQSxjQUFBLEdBQUE7WUFDQSxJQUFBLEdBQUEsZUFBQSxXQUFBO2dCQUNBOzs7O1FBSUE7O1FBRUEsR0FBQSxpQkFBQSxZQUFBO1lBQ0EsSUFBQSxHQUFBLGVBQUEsV0FBQTtnQkFDQSxPQUFBLEdBQUEsbUJBQUEsT0FBQSxjQUFBOztZQUVBLE9BQUE7OztRQUdBLEdBQUEsbUJBQUEsWUFBQTtZQUNBLElBQUEsR0FBQSxlQUFBLFdBQUE7Z0JBQ0EsT0FBQSxHQUFBLG1CQUFBLFNBQUEsWUFBQTs7WUFFQSxPQUFBOzs7UUFHQSxHQUFBLGNBQUEsVUFBQSxPQUFBO1lBQ0EsR0FBQSxpQkFBQSxHQUFBLG1CQUFBLFFBQUEsU0FBQTtZQUNBLGFBQUEsa0JBQUEsR0FBQTtZQUNBLElBQUEsR0FBQSxlQUFBLFdBQUE7Z0JBQ0E7Ozs7UUFJQSxPQUFBLE9BQUEsd0JBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsR0FBQSxhQUFBLFdBQUEsWUFBQTtZQUNBLGFBQUEsY0FBQSxHQUFBO1lBQ0EsSUFBQSxHQUFBLGVBQUEsV0FBQTtnQkFDQTttQkFDQTtnQkFDQSxJQUFBLGlCQUFBLGFBQUE7Z0JBQ0EsSUFBQSxPQUFBLElBQUEsZUFBQSxNQUFBLEtBQUEsT0FBQSxJQUFBLGVBQUEsUUFBQSxPQUFBLEdBQUE7b0JBQ0EsYUFBQSxrQkFBQTt3QkFDQSxPQUFBLE9BQUEsSUFBQSxlQUFBLE1BQUEsU0FBQSxHQUFBLEtBQUE7d0JBQ0EsTUFBQSxlQUFBOztvQkFFQSxTQUFBLEtBQUEsU0FBQSxTQUFBLFlBQUEsdUNBQUEsTUFBQSxjQUFBLFNBQUE7O2dCQUVBLGFBQUEsZUFBQTs7OztRQUlBLE9BQUEsT0FBQSxpQkFBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxhQUFBLGNBQUE7OztRQUdBLE9BQUEsaUJBQUEsdUNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLEVBQUEsS0FBQSxVQUFBLFNBQUEsR0FBQTs7Z0JBRUEsSUFBQSxRQUFBLE9BQUEsVUFBQSxhQUFBLFNBQUEsVUFBQTtvQkFDQTs7Z0JBRUE7Ozs7Ozs7Ozs7OztBQ3JHQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxVQUFBLGtCQUFBLFlBQUE7UUFDQSxPQUFBO1lBQ0EsVUFBQTtZQUNBLGFBQUE7WUFDQSxZQUFBO1lBQ0EsY0FBQTtZQUNBLE9BQUE7Ozs7QUFJQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIExBWU9VVF9LRVkgPSAnZXJpc0xheW91dENvbmZpZyc7XHJcbiAgICAvLyBERUZBVUxUX0xBWU9VVCBpcyB0aGUgY29uZmlndXJhdGlvbiBmb3IgR29sZGVuTGF5b3V0IHdlJ2xsIHVzZSBpZiB0aGVcclxuICAgIC8vIHVzZXIgaGFzbid0IHNhdmVkIG9uZSB5ZXQgb3IgaWYgdGhlIG9uZSB0aGV5IGhhdmUgc2F2ZWQgY2F1c2VzIGFuIGVycm9yXHJcbiAgICAvLyBvZiBzb21lIHNvcnQuXHJcbiAgICB2YXIgREVGQVVMVF9MQVlPVVQgPSB7XHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgICAgaGFzSGVhZGVyczogdHJ1ZSxcclxuICAgICAgICAgICAgc2hvd1BvcG91dEljb246IGZhbHNlLFxyXG4gICAgICAgICAgICBzaG93TWF4aW1pc2VJY29uOiB0cnVlLFxyXG4gICAgICAgICAgICBzaG93Q2xvc2VJY29uOiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbGFiZWxzOiB7XHJcbiAgICAgICAgICAgIG1heGltaXNlOiAnbWF4aW1pemUnLFxyXG4gICAgICAgICAgICBtaW5pbWlzZTogJ21pbmltaXplJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgdHlwZTogJ3JvdycsXHJcbiAgICAgICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnY29sdW1uJyxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAyMixcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NvbXBvbmVudCcsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50TmFtZTogJ3RlbXBsYXRlJyxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRTdGF0ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZUlkOiAnbW9kdWxlcy9jb21wb25lbnRzL3NpZGViYXIvc2lkZWJhclRlbXBsYXRlLmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZU5hbWU6ICduYXZpZ2F0aW9uJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVUaXRsZTogJ05hdmlnYXRpb24nXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnY29sdW1uJyxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAzOSxcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdycsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiA3MCxcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY29tcG9uZW50JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50TmFtZTogJ3RlbXBsYXRlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50U3RhdGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlSWQ6ICdtb2R1bGVzL2NvbXBvbmVudHMvbWFwL21hcFRlbXBsYXRlLmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVOYW1lOiAnbWFwJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVGl0bGU6ICdNYXAnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdycsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAzMCxcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY29tcG9uZW50JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50TmFtZTogJ3RlbXBsYXRlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50U3RhdGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlSWQ6ICdtb2R1bGVzL2NvbXBvbmVudHMvZXZlbnRzL2V2ZW50c1RlbXBsYXRlLmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVOYW1lOiAnZXZlbnRzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVGl0bGU6ICdFdmVudHMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnY29sdW1uJyxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAzOSxcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NvbXBvbmVudCcsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50TmFtZTogJ3RlbXBsYXRlJyxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRTdGF0ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZUlkOiAnbW9kdWxlcy9jb21wb25lbnRzL2V2ZW50Vmlld2VyL2V2ZW50Vmlld2VyVGVtcGxhdGUuaHRtbCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlTmFtZTogJ2V2ZW50Vmlld2VyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVUaXRsZTogJ0V2ZW50IERldGFpbHMnXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgfV1cclxuICAgICAgICB9XVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2VyaXMnLCBbXHJcbiAgICAgICAgJ2VyaXMuY29uZmlnJyxcclxuICAgICAgICAnbmdNYXRlcmlhbCcsXHJcbiAgICAgICAgJ25nQ29va2llcycsXHJcbiAgICAgICAgJ25nUmVzb3VyY2UnLFxyXG4gICAgICAgICduZ1Nhbml0aXplJyxcclxuICAgICAgICAnbmdBbmltYXRlJyxcclxuICAgICAgICAnbmdXZWJ3b3JrZXInLFxyXG4gICAgICAgICduZW1Mb2dnaW5nJyxcclxuICAgICAgICAndWktbGVhZmxldCcsXHJcbiAgICAgICAgJ0xvY2FsU3RvcmFnZU1vZHVsZScsXHJcbiAgICAgICAgJ2NmcC5ob3RrZXlzJyxcclxuICAgICAgICAnZXMubmdVdGNEYXRlcGlja2VyJyxcclxuICAgICAgICAnZW1ndW8ucG9sbGVyJ1xyXG4gICAgXSk7XHJcblxyXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHByb3ZpZGUsICRtZFRoZW1pbmdQcm92aWRlciwgV2Vid29ya2VyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCBwb2xsZXJDb25maWcpIHtcclxuICAgICAgICAvLyBGaXggc291cmNlbWFwc1xyXG4gICAgICAgIC8vIEB1cmwgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci5qcy9pc3N1ZXMvNTIxNyNpc3N1ZWNvbW1lbnQtNTA5OTM1MTNcclxuICAgICAgICAkcHJvdmlkZS5kZWNvcmF0b3IoJyRleGNlcHRpb25IYW5kbGVyJywgZnVuY3Rpb24gKCRkZWxlZ2F0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGV4Y2VwdGlvbiwgY2F1c2UpIHtcclxuICAgICAgICAgICAgICAgICRkZWxlZ2F0ZShleGNlcHRpb24sIGNhdXNlKTtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHBvbGxlckNvbmZpZy5zbWFydCA9IHRydWU7XHJcblxyXG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGVmYXVsdCcpLnByaW1hcnlQYWxldHRlKCdncmV5JykuYWNjZW50UGFsZXR0ZSgnYmx1ZScpLmRhcmsoKTtcclxuICAgICAgICAkbWRUaGVtaW5nUHJvdmlkZXIudGhlbWUoJ3N1Y2Nlc3MtdG9hc3QnKTtcclxuICAgICAgICAkbWRUaGVtaW5nUHJvdmlkZXIudGhlbWUoJ2ZhaWwtdG9hc3QnKTtcclxuICAgICAgICAkbWRUaGVtaW5nUHJvdmlkZXIudGhlbWUoJ3dhcm4tdG9hc3QnKTtcclxuICAgICAgICAkbWRUaGVtaW5nUHJvdmlkZXIudGhlbWUoJ2luZm8tdG9hc3QnKTtcclxuXHJcbiAgICAgICAgV2Vid29ya2VyUHJvdmlkZXIuc2V0SGVscGVyUGF0aCgnLi9zY3JpcHRzL3dlYndvcmtlckRlcHMvd29ya2VyX3dyYXBwZXIuanMnKTtcclxuXHJcbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xyXG4gICAgfSlcclxuICAgIC52YWx1ZSgnbW9tZW50Jywgd2luZG93Lm1vbWVudClcclxuICAgIC52YWx1ZSgnXycsIHdpbmRvdy5fKVxyXG4gICAgLnZhbHVlKCdMJywgd2luZG93LkwpXHJcbiAgICAudmFsdWUoJ3Rva21sJywgd2luZG93LnRva21sKVxyXG4gICAgLnZhbHVlKCdsb2NhbFN0b3JhZ2UnLCB3aW5kb3cubG9jYWxTdG9yYWdlKVxyXG4gICAgLnZhbHVlKCdkMycsIHdpbmRvdy5kMylcclxuICAgIC52YWx1ZSgnJCcsIHdpbmRvdy4kKVxyXG4gICAgLnZhbHVlKCdjMycsIHdpbmRvdy5jMylcclxuICAgIC52YWx1ZSgnWE1MSHR0cFJlcXVlc3QnLCB3aW5kb3cuWE1MSHR0cFJlcXVlc3QpXHJcbiAgICAudmFsdWUoJ0xMdG9NR1JTJywgd2luZG93LkxMdG9NR1JTKVxyXG4gICAgLnZhbHVlKCdHb2xkZW5MYXlvdXQnLCB3aW5kb3cuR29sZGVuTGF5b3V0KVxyXG4gICAgLnZhbHVlKCdCbG9iJywgd2luZG93LkJsb2IpXHJcbiAgICAudmFsdWUoJ1VSTCcsIHdpbmRvdy5VUkwpO1xyXG5cclxuICAgIGFwcC5ydW4oZnVuY3Rpb24oJHJvb3RTY29wZSwgJGh0dHAsICRjb21waWxlLCAkbWRUb2FzdCwgJHdpbmRvdywgJGxvY2F0aW9uLCBlcmlzQ29uZmlnLCBlcmlzU2VydmljZSwgbG9jYWxTdG9yYWdlU2VydmljZSwgc3RhdGVTZXJ2aWNlLCBzZWFyY2hTZXJ2aWNlLCB2b3RlU2VydmljZSwgR29sZGVuTGF5b3V0LCBfLCBtb21lbnQpIHtcclxuICAgICAgICAvLyBzZXQgYSBnbG9iYWwgc2NvcGUgcGFyYW0gZm9yIHRoZSA8dGl0bGU+IGVsZW1lbnRcclxuICAgICAgICAkcm9vdFNjb3BlLnBhZ2VUaXRsZSA9IGVyaXNDb25maWcudGl0bGU7XHJcblxyXG4gICAgICAgIC8vIHJldHJpZXZlL3NldCB2b3RpbmcgaW5mb1xyXG4gICAgICAgIHZvdGVTZXJ2aWNlLmdldFZvdGVyKCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuZGF0YS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdm90ZXIgPSByZXN1bHQuZGF0YVswXTtcclxuICAgICAgICAgICAgICAgIC8vIHVzZXIgaGFzIHZvdGVkIGJlZm9yZVxyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVyKHZvdGVyKTtcclxuICAgICAgICAgICAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiB2b3RlciBpcyBhZG1pblxyXG4gICAgICAgICAgICAgICAgdmFyIGlzQWRtaW4gPSBfLmluZGV4T2YoZXJpc0NvbmZpZy5hZG1pbnMsIF8udG9Mb3dlcih2b3Rlci52b3Rlcl9uYW1lKSkgPiAtMTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHZvdGVyLnZvdGVyX25hbWUsIGlzQWRtaW4pO1xyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldElzQWRtaW4oaXNBZG1pbik7XHJcbiAgICAgICAgICAgICAgICB2b3RlU2VydmljZS5nZXRWb3Rlc0J5Vm90ZXIodm90ZXIudm90ZXJfbmFtZSkudGhlbihmdW5jdGlvbiAodm90ZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZXModm90ZXMuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVzKG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiByaWdodCBub3cgdGhlIHNlcnZpY2Ugc2ltcGx5IHJlYWRzIHRoZSB1c2VyJ3MgSVAsXHJcbiAgICAgICAgICAgICAgICAvLyB0aGVyZWZvcmUgbm8gcGF5bG9hZCBkYXRhIGlzIHJlcXVpcmVkLiBXaGVuIFBLSSBhdXRoIGlzXHJcbiAgICAgICAgICAgICAgICAvLyBhdmFpbGFibGUsIGFuIG9iamVjdCB3aWxsIG5lZWQgdG8gYmUgcGFzc2VkIHRvIHRoZSBhZGRWb3RlclxyXG4gICAgICAgICAgICAgICAgLy8gZnVuY3Rpb25cclxuICAgICAgICAgICAgICAgIHZvdGVTZXJ2aWNlLmFkZFZvdGVyKCkudGhlbihmdW5jdGlvbiAodm90ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZXIodm90ZXIuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVyKG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yOiBVbmFibGUgdG8gYWRkIHZvdGVyIHRvIGRhdGFiYXNlLiBWb3Rpbmcgd2lsbCBiZSB1bmF2YWlsYWJsZS4nKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3RlcihudWxsKTtcclxuICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3I6IFVuYWJsZSB0byBxdWVyeSB2b3RlIGRhdGFiYXNlLiBWb3Rpbmcgd2lsbCBiZSB1bmF2YWlsYWJsZS4nKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIGxvYWQgcmVhc29ucyB0byBsaXN0IGZvciBkb3dudm90ZSBidXR0b25cclxuICAgICAgICB2b3RlU2VydmljZS5nZXRSZWFzb25zKCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIHZhciB2b3RlUmVhc29ucyA9IF8uZmlsdGVyKHJlc3VsdC5kYXRhLCBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEucmVhc29uLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZVJlYXNvbnModm90ZVJlYXNvbnMpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgcmV0cmlldmluZyB2b3RlIGluZm9ybWF0aW9uJyk7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHZhciBpbml0aWFsaXplTGF5b3V0ID0gZnVuY3Rpb24gKGxheW91dENvbmZpZykge1xyXG4gICAgICAgICAgICB2YXIgbGF5b3V0ID0gbmV3IEdvbGRlbkxheW91dChsYXlvdXRDb25maWcpO1xyXG4gICAgICAgICAgICB2YXIgY29tcG9uZW50cyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgbGF5b3V0LnJlZ2lzdGVyQ29tcG9uZW50KCd0ZW1wbGF0ZScsIGZ1bmN0aW9uIChjb250YWluZXIsIHN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIuc2V0VGl0bGUoc3RhdGUudGVtcGxhdGVUaXRsZSk7XHJcbiAgICAgICAgICAgICAgICAkaHR0cC5nZXQoc3RhdGUudGVtcGxhdGVJZCwgeyBjYWNoZTogdHJ1ZSB9KS5zdWNjZXNzKGZ1bmN0aW9uIChodG1sKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCA9ICRjb21waWxlKCc8ZGl2PicgKyBodG1sICsgJzwvZGl2PicpKCRyb290U2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5nZXRFbGVtZW50KCkuaHRtbChodG1sKTtcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzLnB1c2goeyBjb250YWluZXI6IGNvbnRhaW5lciwgc3RhdGU6IHN0YXRlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMYXlvdXRDb21wb25lbnRzKGNvbXBvbmVudHMpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgbGF5b3V0Lm9uKCdzdGF0ZUNoYW5nZWQnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc3RhdGUgPSBsYXlvdXQudG9Db25maWcoKTtcclxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0KExBWU9VVF9LRVksIHN0YXRlKTtcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMYXlvdXRDb25maWcoc3RhdGUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxheW91dC5pbml0KCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gZ29sZGVuIGxheW91dCBjb25maWcgLSBldmVudHVhbGx5IHVzZSBzdGF0ZVNlcnZpY2UgZm9yIHRoaXMuLi5cclxuICAgICAgICB2YXIgbGF5b3V0Q29uZmlnID0gREVGQVVMVF9MQVlPVVQ7XHJcbiAgICAgICAgaWYgKGxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KExBWU9VVF9LRVkpKSB7XHJcbiAgICAgICAgICAgIGxheW91dENvbmZpZyA9IGxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KExBWU9VVF9LRVkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGRvTGF5b3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAoJGxvY2F0aW9uLnNlYXJjaCgpLnJlc2V0KSB7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplTGF5b3V0KERFRkFVTFRfTEFZT1VUKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFRyeSB0byB1c2UgdGhlIGxheW91dCBjb25maWd1cmF0aW9uIGZyb20gbG9jYWwgc3RvcmFnZSwgYnV0IGlmXHJcbiAgICAgICAgICAgICAgICAvLyBmb3Igd2hhdGV2ZXIgcmVhc29uIHRoYXQgZmFpbHMsIGZhbGxiYWNrIHRvIHRoZSBkZWZhdWx0XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemVMYXlvdXQobGF5b3V0Q29uZmlnKTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TGF5b3V0Q29uZmlnKGxheW91dENvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemVMYXlvdXQoREVGQVVMVF9MQVlPVVQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMYXlvdXRDb25maWcobGF5b3V0Q29uZmlnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGZvciB2YWx1ZXMgaW4gcXVlcnlzdHJpbmcgYW5kIGdvIHRvIGFuIGV2ZW50IGlmIGFwcGxpY2FibGVcclxuICAgICAgICAgICAgaWYgKHFzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gJiYgcXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50UGFyYW1zID0ge307XHJcblxyXG4gICAgICAgICAgICAgICAgZXZlbnRQYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9IHFzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF07XHJcbiAgICAgICAgICAgICAgICBldmVudFBhcmFtc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID0gcGFyc2VJbnQocXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRFdmVudChldmVudFBhcmFtcykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmZlYXR1cmVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGV2ZW50ID0gZGF0YS5mZWF0dXJlc1swXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBvcmFsRmlsdGVyID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IG1vbWVudC51dGMoZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRlRmllbGRdKS5zdWJ0cmFjdCgxLCAnaCcpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9wOiBtb21lbnQudXRjKGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXSkuYWRkKDEsICdoJykudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25MZW5ndGg6IG51bGxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hcENlbnRlciA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhdDogZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sYXRGaWVsZF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9uRmllbGRdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgem9vbTogc3RhdGVTZXJ2aWNlLmdldE1hcFpvb20oKSB8fCA2XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBab29tKG1hcENlbnRlci56b29tKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE1hcENlbnRlcihtYXBDZW50ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGVtcG9yYWxGaWx0ZXIodGVtcG9yYWxGaWx0ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yOiBUaGUgc3BlY2lmaWVkIHByb2R1Y3QgYW5kIGRhdGFzZXQgSURzIHJldHVybmVkIDAgZmVhdHVyZXMuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBkb0xheW91dCgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBkb0xheW91dCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuc2VydmljZSgnZXJpc0NvbmZpZycsIGZ1bmN0aW9uIChlcmlzQ29uZmlnTG9jYWwsIG1vbWVudCwgXywgTCkge1xuICAgICAgICB2YXIgY2ZnID0ge1xuICAgICAgICAgICAgdGl0bGU6ICdFcmlzJyxcbiAgICAgICAgICAgIGxvZ286ICfOlCBFcmlzJyxcbiAgICAgICAgICAgIG1hcENlbnRlcjoge1xuICAgICAgICAgICAgICAgIGxhdDogNDQuMzY2NDI4LFxuICAgICAgICAgICAgICAgIGxuZzogLTgxLjQ1Mzk0NSxcbiAgICAgICAgICAgICAgICB6b29tOiA4XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGF5ZXJzOiB7XG4gICAgICAgICAgICAgICAgYmFzZWxheWVyczoge31cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWZhdWx0TG9jYXRpb25Gb3JtYXQ6ICdkZCcsXG4gICAgICAgICAgICBkZWZhdWx0QmFzZWxheWVyOiAnJyxcbiAgICAgICAgICAgIG1heERheXNCYWNrOiAxMDAwMCxcbiAgICAgICAgICAgIGRlZmF1bHRUaW1lUmFuZ2VWYWx1ZTogNixcbiAgICAgICAgICAgIGRlZmF1bHRUaW1lUmFuZ2VUeXBlOiAnaCcsXG4gICAgICAgICAgICByYW5nZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzOiAtMzAsXG4gICAgICAgICAgICAgICAgICAgIHVuaXRPZlRpbWU6ICdtaW51dGVzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICczMCBNaW4nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzOiAtMSxcbiAgICAgICAgICAgICAgICAgICAgdW5pdE9mVGltZTogJ2hvdXJzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdIb3VyJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB1bml0czogLTYsXG4gICAgICAgICAgICAgICAgICAgIHVuaXRPZlRpbWU6ICdob3VycycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnNiBIcnMnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzOiAtMTIsXG4gICAgICAgICAgICAgICAgICAgIHVuaXRPZlRpbWU6ICdob3VycycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnMTIgSHJzJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB1bml0czogLTI0LFxuICAgICAgICAgICAgICAgICAgICB1bml0T2ZUaW1lOiAnaG91cnMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJzI0IEhycydcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZGVmYXVsdER1cmF0aW9uTGVuZ3RoOiAxLFxuICAgICAgICAgICAgZHVyYXRpb25zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ2RheXMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJ0RheXMnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ3dlZWtzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdXZWVrcycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnbW9udGhzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdNb250aHMnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAneWVhcnMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJ1llYXJzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZGVmYXVsdFByb2plY3Rpb246IEwuQ1JTLkVQU0c0MzI2LFxuICAgICAgICAgICAgZGVib3VuY2VUaW1lOiAzMDAsXG4gICAgICAgICAgICBtYXhpbXVtUmVjZW50QU9JczogNSxcbiAgICAgICAgICAgIGNvbXBvbmVudHM6IHtcbiAgICAgICAgICAgICAgICBnb3RvOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNvdXJjZUZpbHRlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICB0ZW1wb3JhbEZpbHRlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICB0eXBlRmlsdGVyOiB0cnVlLFxuICAgICAgICAgICAgICAgIGV2ZW50RmlsdGVyczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb3VudHJ5RmlsdGVyOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZtdkZpbHRlcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2Vuc29yRmlsdGVyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZvdGVGaWx0ZXI6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zOiAnYWxsJyxcbiAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5OiAnc2VydmVyJyxcbiAgICAgICAgICAgIHN0cmlrZVZpc2liaWxpdHk6ICdoaWRkZW4nLFxuICAgICAgICAgICAgZm12RmlsdGVyOiAnZGlzYWJsZWQnLFxuICAgICAgICAgICAgdm90ZUZpbHRlcjogJ2Rpc2FibGVkJyxcbiAgICAgICAgICAgIHZvdGVGaWx0ZXJUeXBlOiAnVXAnLFxuICAgICAgICAgICAgdG90YWxWb3RlczogMSxcbiAgICAgICAgICAgIGFjdGl2ZUNvbG9yOiAnYmx1ZS04MDAnLFxuICAgICAgICAgICAgaW5hY3RpdmVDb2xvcjogJ2dyZXktOTAwJyxcbiAgICAgICAgICAgIGRlZmF1bHRTb3J0Q29uZmlnOiB7fVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHJlY3Vyc2l2ZWx5IG1lcmdlIHRoZSBsb2NhbCBjb25maWcgb250byB0aGUgZGVmYXVsdCBjb25maWdcbiAgICAgICAgYW5ndWxhci5tZXJnZShjZmcsIGVyaXNDb25maWdMb2NhbCk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjZmcuZGVmYXVsdFByb2plY3Rpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBkZWZhdWx0UHJvamVjdGlvbiBoYXMgYmVlbiBvdmVyd3JpdHRlbiBpbiBsb2NhbCBjb25maWdcbiAgICAgICAgICAgIC8vIG9ubHkgYSBzdHJpbmcgdmFsdWUgY2FuIGJlIHNwZWNpZmllZCBpbiBsb2NhbCBjb25maWcsIHNvIHVzZSBldmFsIHRvIHByb2R1Y2UgdGhlIHByb3BlciBKUyBvYmplY3RcbiAgICAgICAgICAgIGNmZy5kZWZhdWx0UHJvamVjdGlvbiA9IGV2YWwoY2ZnLmRlZmF1bHRQcm9qZWN0aW9uKTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNmZy5sYXllcnMuYmFzZWxheWVycy5jeWNsZS5sYXllclBhcmFtcy5jcnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjZmcubGF5ZXJzLmJhc2VsYXllcnMuY3ljbGUubGF5ZXJQYXJhbXMuY3JzID0gZXZhbChjZmcubGF5ZXJzLmJhc2VsYXllcnMuY3ljbGUubGF5ZXJQYXJhbXMuY3JzKTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNmZztcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmZhY3RvcnkoJ1ZvdGUnLCBmdW5jdGlvbiAoXHJcbiAgICAgICAgZXJpc0NvbmZpZ1xyXG4gICAgKSB7XHJcbiAgICAgICAgLy8gQ29uc3RydWN0b3JcclxuICAgICAgICB2YXIgVm90ZSA9IGZ1bmN0aW9uICh2b3RlX2lkLCBwcm9kdWN0X2lkLCBkYXRhc2V0X2lkLCBpZGVudGl0eSwgdm90ZXJfbmFtZSwgdm90ZSwgcmVhc29uLCB0eXBlLCBldmVudF90aW1lKSB7XHJcbiAgICAgICAgICAgIHRoaXMudm90ZV9pZCA9IHZvdGVfaWQgfHwgbnVsbDtcclxuICAgICAgICAgICAgdGhpc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID0gcHJvZHVjdF9pZCB8fCAnJztcclxuICAgICAgICAgICAgdGhpc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID0gZGF0YXNldF9pZCB8fCAnJztcclxuICAgICAgICAgICAgdGhpc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSA9IGlkZW50aXR5IHx8IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMudm90ZXJfbmFtZSA9IHZvdGVyX25hbWUgfHwgJyc7XHJcbiAgICAgICAgICAgIHRoaXMudm90ZSA9IHR5cGVvZih2b3RlKSA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogdm90ZTtcclxuICAgICAgICAgICAgdGhpcy5yZWFzb24gPSByZWFzb24gfHwgJyc7XHJcbiAgICAgICAgICAgIHRoaXMudHlwZSA9IHR5cGUgfHwgbnVsbDtcclxuICAgICAgICAgICAgdGhpc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRlRmllbGRdID0gZXZlbnRfdGltZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBwdWJsaWMgbWV0aG9kc1xyXG4gICAgICAgIFZvdGUucHJvdG90eXBlID0ge1xyXG5cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBzdGF0aWMgbWV0aG9kc1xyXG4gICAgICAgIFZvdGUuYnVpbGQgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICBpZiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZihkYXRhLnZvdGUpID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudm90ZSA9IGRhdGEudm90ZSA9PT0gJ3RydWUnO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBWb3RlKFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudm90ZV9pZCxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnByb2R1Y3RfaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5kYXRhc2V0X2lkLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGFbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0sXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS52b3Rlcl9uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudm90ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnJlYXNvbixcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5ldmVudF90aW1lXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgVm90ZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIFZvdGUudHJhbnNmb3JtZXIgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tYXAoVm90ZS5idWlsZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFZvdGUuYnVpbGQoZGF0YSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIFZvdGU7XHJcbiAgICB9KTtcclxufSkoKTtcclxuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5zZXJ2aWNlKCdhbGVydFNlcnZpY2UnLCBmdW5jdGlvbiAoXG4gICAgICAgICRodHRwLFxuICAgICAgICAkcSxcbiAgICAgICAgZXJpc0NvbmZpZ1xuICAgICkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0QWxlcnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL2FsZXJ0cydcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEFsZXJ0OiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvYWxlcnRzLycgKyBpZFxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkQWxlcnQ6IGZ1bmN0aW9uIChhbGVydCkge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwLnBvc3QoZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvYWxlcnRzJywgYWxlcnQpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1cGRhdGVBbGVydDogZnVuY3Rpb24gKGFsZXJ0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAucHV0KGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL2FsZXJ0cy8nICsgYWxlcnQuYWxlcnRfaWQsIGFsZXJ0KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5mYWN0b3J5KCdjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UnLCBmdW5jdGlvbiAoTEx0b01HUlMpIHtcbiAgICAgICAgLy90cnVuY2F0ZSBpcyBhIHNpZ24gYXBwcm9wcmlhdGUgdHJ1bmNhdGlvbiBmdW5jdGlvblxuICAgICAgICB2YXIgdHJ1bmNhdGUgPSBmdW5jdGlvbiAoX3ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoX3ZhbHVlIDwgMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmNlaWwoX3ZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKF92YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLypcbiAgICAgICAgIENvbnZlcnRzIGxhdGl0dWRlIGRlY2ltYWwgZGVncmVlcyAoZmxvYXQpIGludG8gZGVncmVlcywgbWludXRlcywgc2Vjb25kcyBhcyBhIHN0cmluZyBpbiB0aGUgZm9ybWF0OlxuICAgICAgICAgJ1hYwrBYWCdYWC5YWFgnXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgZGRMYXRUb0RNU0xhdCA9IGZ1bmN0aW9uIChsYXQpIHtcbiAgICAgICAgICAgIHZhciBkZWdyZWVzO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXM7XG4gICAgICAgICAgICB2YXIgc2Vjb25kcztcbiAgICAgICAgICAgIGlmIChsYXQgPD0gOTAgJiYgbGF0ID49IDApIHtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gdHJ1bmNhdGUobGF0KTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdHJ1bmNhdGUoKGxhdCAtIGRlZ3JlZXMpICogNjApO1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSAoKCgobGF0IC0gZGVncmVlcykgKiA2MCkgLSBtaW51dGVzKSAqIDYwKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWdyZWVzICsgJ8KwJyArIG1pbnV0ZXMgKyAnXFwnJyArIHNlY29uZHMgKyAnXCInO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXQgPCAwICYmIGxhdCA+PSAtOTApIHtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gdHJ1bmNhdGUobGF0KTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdHJ1bmNhdGUoKE1hdGguYWJzKGxhdCkgLSBNYXRoLmFicyhkZWdyZWVzKSkgKiA2MCk7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9ICgoKChNYXRoLmFicyhsYXQpIC0gTWF0aC5hYnMoZGVncmVlcykpICogNjApIC0gbWludXRlcykgKiA2MCkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVncmVlcyArICfCsCcgKyBtaW51dGVzICsgJ1xcJycgKyBzZWNvbmRzICsgJ1wiJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdJbnZhbGlkIExhdGl0dWRlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgbG9uZ2l0dWRlIGRlY2ltYWwgZGVncmVlcyAoZmxvYXQpIGludG8gZGVncmVlcywgbWludXRlcywgc2Vjb25kcyBhcyBhIHN0cmluZyBpbiB0aGUgZm9ybWF0OlxuICAgICAgICAgJ1hYwrBYWCdYWC5YWFgnXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgZGRMb25Ub0RNU0xvbiA9IGZ1bmN0aW9uIChsb24pIHtcbiAgICAgICAgICAgIHZhciBkZWdyZWVzO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXM7XG4gICAgICAgICAgICB2YXIgc2Vjb25kcztcbiAgICAgICAgICAgIGlmIChsb24gPD0gMTgwICYmIGxvbiA+PSAwKSB7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHRydW5jYXRlKGxvbik7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IHRydW5jYXRlKChsb24gLSBkZWdyZWVzKSAqIDYwKTtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gKCgoKGxvbiAtIGRlZ3JlZXMpICogNjApIC0gbWludXRlcykgKiA2MCkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVncmVlcyArICfCsCcgKyBtaW51dGVzICsgJ1xcJycgKyBzZWNvbmRzICsgJ1wiJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9uIDwgMCAmJiBsb24gPj0gLTE4MCkge1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSB0cnVuY2F0ZSgobG9uKSk7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IHRydW5jYXRlKChNYXRoLmFicyhsb24pIC0gTWF0aC5hYnMoZGVncmVlcykpICogNjApO1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSAoKCgoTWF0aC5hYnMobG9uKSAtIE1hdGguYWJzKGRlZ3JlZXMpKSAqIDYwKSAtIG1pbnV0ZXMpICogNjApLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZ3JlZXMgKyAnwrAnICsgbWludXRlcyArICdcXCcnICsgc2Vjb25kcyArICdcIic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnSW52YWxpZCBsb25naXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyBsYXRpdHVkZSBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIGludG8gZGVjaW1hbCBkZWdyZWVzIChmbG9hdClcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkbXNMYXRUb0RETGF0ID0gZnVuY3Rpb24gKGxhdERlZ3JlZSwgbGF0TWludXRlLCBsYXRTZWNvbmQpIHtcbiAgICAgICAgICAgIHZhciBkZWdyZWVzO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXM7XG4gICAgICAgICAgICB2YXIgc2Vjb25kcztcbiAgICAgICAgICAgIGlmIChwYXJzZUZsb2F0KGxhdERlZ3JlZSkgPCAwKSB7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9IHBhcnNlRmxvYXQobGF0U2Vjb25kKSAvIDYwO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSAocGFyc2VGbG9hdChsYXRNaW51dGUpICsgc2Vjb25kcykgLyA2MDtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gcGFyc2VGbG9hdChNYXRoLmFicyhsYXREZWdyZWUpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKChkZWdyZWVzICsgbWludXRlcykgKiAtMSkudG9GaXhlZCg2KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGFyc2VGbG9hdChsYXREZWdyZWUpID49IDApIHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gcGFyc2VGbG9hdChsYXRTZWNvbmQpIC8gNjA7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IChwYXJzZUZsb2F0KGxhdE1pbnV0ZSkgKyBzZWNvbmRzKSAvIDYwO1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSBwYXJzZUZsb2F0KGxhdERlZ3JlZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChkZWdyZWVzICsgbWludXRlcykudG9GaXhlZCg2KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdJbnZhbGlkIExhdGl0dWRlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgbG9uZ2l0dWRlIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgaW50byBkZWNpbWFsIGRlZ3JlZXMgKGZsb2F0KVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGRtc0xvblRvRERMb24gPSBmdW5jdGlvbiAobG9uRGVncmVlLCBsb25NaW51dGUsIGxvblNlY29uZCkge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKHBhcnNlRmxvYXQobG9uRGVncmVlKSA8IDApIHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gcGFyc2VGbG9hdChsb25TZWNvbmQpIC8gNjA7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IChwYXJzZUZsb2F0KGxvbk1pbnV0ZSkgKyBzZWNvbmRzKSAvIDYwO1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSBwYXJzZUZsb2F0KE1hdGguYWJzKGxvbkRlZ3JlZSkpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoKGRlZ3JlZXMgKyBtaW51dGVzKSAqIC0xKS50b0ZpeGVkKDYpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXJzZUZsb2F0KGxvbkRlZ3JlZSkgPj0gMCkge1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBwYXJzZUZsb2F0KGxvblNlY29uZCkgLyA2MDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gKHBhcnNlRmxvYXQobG9uTWludXRlKSArIHNlY29uZHMpIC8gNjA7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHBhcnNlRmxvYXQobG9uRGVncmVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGRlZ3JlZXMgKyBtaW51dGVzKS50b0ZpeGVkKDYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ludmFsaWQgTG9uZ2l0dWRlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvL015U2VydmljZSBpcyBhbiBvYmplY3QgdG8gY29udGFpbiBhbGwgZmllbGRzIGFuZFxuICAgICAgICAvL2Z1bmN0aW9ucyBuZWNlc3NhcnkgdG8gY29tbXVuaWNhdGUgd2l0aCB0aGUgdmFyaW91c1xuICAgICAgICAvL2NvbnRyb2xsZXJzXG4gICAgICAgIHZhciBjb29yZFNlcnZpY2UgPSB7fTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgdGhlIGRlY2ltYWwgZGVncmVlcyBvZiBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlIGlucHV0IGJveCB0aGUgb3RoZXIgZm9ybWF0cyAoRE1TIGFuZCBNR1JTKSBzb1xuICAgICAgICAgdGhhdCB0aG9zZSBpbnB1dCBib3hlcyBtYXRjaCBhcyBjb252ZXJ0ZWQgdmFsdWVzLiAgV2lsbCBkbyBkYXRhIHZhbGlkYXRpb24gYnkgY2hlY2tpbmcgaW5wdXQgY29vcmRpbmF0ZXNcbiAgICAgICAgIGZhbGwgYmV0d2VlbiAtODAgYW5kIDg0IGxhdGl0dWRlIGFuZCAtMTgwIGFuZCAxODAgZm9yIGxvbmdpdHVkZVxuICAgICAgICAgKi9cbiAgICAgICAgY29vcmRTZXJ2aWNlLnByZXBGb3JEREJyb2FkY2FzdCA9IGZ1bmN0aW9uIChsYXQsIGxvbikge1xuICAgICAgICAgICAgaWYgKChsYXQgfHwgbGF0ID09PSAwKSAmJiBsYXQgPj0gLTkwICYmIGxhdCA8PSA5MCAmJiAobG9uIHx8IGxvbiA9PT0gMCkgJiYgbG9uID49IC0xODAgJiYgbG9uIDw9IDE4MCkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0ge1xuICAgICAgICAgICAgICAgICAgICBkbXM6IFtkZExhdFRvRE1TTGF0KGxhdCksIGRkTG9uVG9ETVNMb24obG9uKV0sXG4gICAgICAgICAgICAgICAgICAgIGRkOiBbbGF0LCBsb25dLFxuICAgICAgICAgICAgICAgICAgICBtZ3JzOiAnJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKGxhdCA+PSAtODAgJiYgbGF0IDw9IDg0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMubWdycyA9IExMdG9NR1JTKGxhdCwgbG9uLCA1KTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghKGxhdCA+PSAtODAgJiYgbGF0IDw9IDg0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghKGxvbiA+PSAtMTgwICYmIGxvbiA8PSAxODApKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLypcbiAgICAgICAgIENvbnZlcnRzIHRoZSBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIHN0cmluZ3Mgb2YgbGF0aXR1ZGUgYW5kIGxvbmdpdHVkZSBpbnB1dCBib3ggdGhlIG90aGVyIGZvcm1hdHMgKEREIGFuZCBNR1JTKSBzb1xuICAgICAgICAgdGhhdCB0aG9zZSBpbnB1dCBib3hlcyBtYXRjaCBhcyBjb252ZXJ0ZWQgdmFsdWVzLiAgV2lsbCBkbyBkYXRhIHZhbGlkYXRpb24gYnkgY2hlY2tpbmcgaW5wdXQgY29vcmRpbmF0ZXNcbiAgICAgICAgIGZhbGwgYmV0d2VlbiAtODAgYW5kIDg0IGxhdGl0dWRlIGFuZCAtMTgwIGFuZCAxODAgZm9yIGxvbmdpdHVkZVxuICAgICAgICAgKi9cbiAgICAgICAgY29vcmRTZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3QgPSBmdW5jdGlvbiAobGF0RE1TLCBsb25ETVMpIHtcbiAgICAgICAgICAgIHZhciBsYXREZWdyZWUsIGxhdE1pbnV0ZSwgbGF0U2Vjb25kLCBsb25EZWdyZWUsIGxvbk1pbnV0ZSwgbG9uU2Vjb25kO1xuICAgICAgICAgICAgbGF0RE1TID0gbGF0RE1TLnJlcGxhY2UoL1tOUyBdL2lnLCAnJykuc3BsaXQoL1vCsCdcIl0vKTtcbiAgICAgICAgICAgIGxvbkRNUyA9IGxvbkRNUy5yZXBsYWNlKC9bRVcgXS9pZywgJycpLnNwbGl0KC9bwrAnXCJdLyk7XG5cbiAgICAgICAgICAgIGlmIChsYXRETVMubGVuZ3RoID49IDMpIHtcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPSBwYXJzZUludChsYXRETVNbMF0sIDEwKTtcbiAgICAgICAgICAgICAgICBsYXRNaW51dGUgPSBwYXJzZUludChsYXRETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPSBwYXJzZUZsb2F0KGxhdERNU1syXSwgMTApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXRETVMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgbGF0RE1TID0gbGF0RE1TWzBdLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgbGF0U2Vjb25kID0gcGFyc2VGbG9hdChsYXRETVNbMF0uc3Vic3RyKC0yKSArICcuJyArIGxhdERNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA9IHBhcnNlSW50KGxhdERNU1swXS5zdWJzdHIoLTQsIDIpLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0RGVncmVlID0gcGFyc2VJbnQobGF0RE1TWzBdLnNsaWNlKDAsIC00KSwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGxvbkRNUy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgIGxvbkRlZ3JlZSA9IHBhcnNlSW50KGxvbkRNU1swXSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA9IHBhcnNlSW50KGxvbkRNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxvblNlY29uZCA9IHBhcnNlRmxvYXQobG9uRE1TWzJdLCAxMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxvbkRNUy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsb25ETVMgPSBsb25ETVNbMF0uc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICBsb25TZWNvbmQgPSBwYXJzZUZsb2F0KGxvbkRNU1swXS5zdWJzdHIoLTIpICsgJy4nICsgbG9uRE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uTWludXRlID0gcGFyc2VJbnQobG9uRE1TWzBdLnN1YnN0cigtNCwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPSBwYXJzZUludChsb25ETVNbMF0uc2xpY2UoMCwgLTQpLCAxMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPj0gLTkwICYmIGxhdERlZ3JlZSA8PSA5MCAmJlxuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA+PSAwICYmIGxhdE1pbnV0ZSA8PSA2MCAmJlxuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA+PSAwICYmIGxhdFNlY29uZCA8PSA2MCAmJlxuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA+PSAwICYmIGxvbk1pbnV0ZSA8PSA2MCAmJlxuICAgICAgICAgICAgICAgIGxvblNlY29uZCA+PSAwICYmIGxvblNlY29uZCA8PSA2MCAmJlxuICAgICAgICAgICAgICAgIGxvbkRlZ3JlZSA+PSAtMTgwICYmIGxvbkRlZ3JlZSA8PSAxODAgJiZcbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGxhdERlZ3JlZSkgLSBwYXJzZUZsb2F0KGxhdE1pbnV0ZSAqIDAuMDEpIC0gcGFyc2VGbG9hdChsYXRTZWNvbmQgKiAwLjAwMDEpID49IC05MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobGF0RGVncmVlKSArIHBhcnNlRmxvYXQobGF0TWludXRlICogMC4wMSkgKyBwYXJzZUZsb2F0KGxhdFNlY29uZCAqIDAuMDAwMSkgPD0gOTAgJiZcbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGxvbkRlZ3JlZSkgLSBwYXJzZUZsb2F0KGxvbk1pbnV0ZSAqIDAuMDEpIC0gcGFyc2VGbG9hdChsb25TZWNvbmQgKiAwLjAwMDEpID49IC0xODAgJiZcbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGxvbkRlZ3JlZSkgKyBwYXJzZUZsb2F0KGxvbk1pbnV0ZSAqIDAuMDEpICsgcGFyc2VGbG9hdChsb25TZWNvbmQgKiAwLjAwMDEpIDw9IDE4MFxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGRtczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0RGVncmVlICsgJ8KwJyArIGxhdE1pbnV0ZSArICdcXCcnICsgbGF0U2Vjb25kICsgJ1wiJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvbkRlZ3JlZSArICfCsCcgKyBsb25NaW51dGUgKyAnXFwnJyArIGxvblNlY29uZCArICdcIiddLFxuICAgICAgICAgICAgICAgICAgICBkZDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgZG1zTGF0VG9ERExhdChsYXREZWdyZWUsIGxhdE1pbnV0ZSwgbGF0U2Vjb25kKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRtc0xvblRvRERMb24obG9uRGVncmVlLCBsb25NaW51dGUsIGxvblNlY29uZCldLFxuICAgICAgICAgICAgICAgICAgICBtZ3JzOiAnJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHMuZGRbMF0gPj0gLTgwICYmIHJlc3VsdHMuZGRbMF0gPD0gODQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5tZ3JzID0gTEx0b01HUlMocmVzdWx0cy5kZFswXSwgcmVzdWx0cy5kZFsxXSwgNSk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLypcbiAgICAgICAgIENvbnZlcnRzIHRoZSBNR1JTLWVuY29kZWQgc3RyaW5nIG9mIGxhdGl0dWRlIGFuZCBsb25naXR1ZGUgaW5wdXQgYm94IHRoZSBvdGhlciBmb3JtYXRzIChETVMgYW5kIEREKSBzb1xuICAgICAgICAgdGhhdCB0aG9zZSBpbnB1dCBib3hlcyBtYXRjaCBhcyBjb252ZXJ0ZWQgdmFsdWVzLiAgV2lsbCBkbyBkYXRhIHZhbGlkYXRpb24gYnkgY2hlY2tpbmcgaW5wdXQgY29vcmRpbmF0ZXNcbiAgICAgICAgIGZhbGwgYmV0d2VlbiAtODAgYW5kIDg0IGxhdGl0dWRlIGFuZCAtMTgwIGFuZCAxODAgZm9yIGxvbmdpdHVkZVxuICAgICAgICAgKi9cbiAgICAgICAgLy9wcmVwRm9yTUdSU0Jyb2FkY2FzdCBpcyB0aGUgZnVuY3Rpb24gdGhhdCBjb252ZXJ0cyB0aGVcbiAgICAgICAgLy9jb29yZGluYXRlcyBlbnRlcmVkIGluIHRoZSBNR1JTIGlucHV0IGJveGVzIGFuZCBzZXRzXG4gICAgICAgIC8vdGhlIHJlc3Qgb2YgdGhlIGZpZWxkcyBpbiB0aGUgbXlTZXJ2aWNlIG9iamVjdC4gZGF0YVxuICAgICAgICAvL3ZhbGlkYXRpb24gaXMgY29tcGxldGVkIGJ5IGNoZWNraW5nIGlmIHRoZSBpbnB1dFxuICAgICAgICAvL2Nvb3JkaW5hdGVzIHJldHVybiB2YWx1ZXMgdG8gdGhlIGxhdExvbltdIGZyb20gdGhlXG4gICAgICAgIC8vVVNOR3RvTEwoKSBmdW5jdGlvbiBvZiB0aGUgdXNuZy5qcyBsaWJyYXJ5LlxuICAgICAgICBjb29yZFNlcnZpY2UucHJlcEZvck1HUlNCcm9hZGNhc3QgPSBmdW5jdGlvbiAoTUdSUykge1xuICAgICAgICAgICAgdmFyIGxhdExvbiA9IFtdO1xuICAgICAgICAgICAgVVNOR3RvTEwoTUdSUyArICcnLCBsYXRMb24pOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxuICAgICAgICAgICAgaWYgKGlzTmFOKGxhdExvblswXSkgfHwgaXNOYU4obGF0TG9uWzFdKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBhZnRlciA1IGRlY2ltYWwgcGxhY2VzLCB0aGUgcmVzdWx0cyBzdGFydCBnb2luZyBvZmZcbiAgICAgICAgICAgICAgICBsYXRMb25bMF0gPSBNYXRoLnJvdW5kKGxhdExvblswXSAqIDFlNSkgLyAxLmU1O1xuICAgICAgICAgICAgICAgIGxhdExvblsxXSA9IE1hdGgucm91bmQobGF0TG9uWzFdICogMWU1KSAvIDEuZTU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbWdyczogTUdSUyxcbiAgICAgICAgICAgICAgICAgICAgZGQ6IGxhdExvbixcbiAgICAgICAgICAgICAgICAgICAgZG1zOiBbZGRMYXRUb0RNU0xhdChsYXRMb25bMF0pLCBkZExvblRvRE1TTG9uKGxhdExvblsxXSldXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb29yZFNlcnZpY2UuaXNWYWxpZExhdEREID0gZnVuY3Rpb24gKGxhdCkge1xuICAgICAgICAgICAgcmV0dXJuICgobGF0IHx8IGxhdCA9PT0gMCB8fCBsYXQgPT09ICcnKSAmJiBsYXQgPj0gLTkwICYmIGxhdCA8PSA5MCk7XG4gICAgICAgIH07XG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTG9uREQgPSBmdW5jdGlvbiAobG9uKSB7XG4gICAgICAgICAgICByZXR1cm4gKCAobG9uIHx8IGxvbiA9PT0gMCB8fCBsb24gPT09ICcnKSAmJiBsb24gPj0gLTE4MCAmJiBsb24gPD0gMTgwKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb29yZFNlcnZpY2UuaXNWYWxpZExhdERNUyA9IGZ1bmN0aW9uIChsYXRETVMpIHtcbiAgICAgICAgICAgIGlmIChsYXRETVMgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbGF0RGVncmVlLCBsYXRNaW51dGUsIGxhdFNlY29uZDtcbiAgICAgICAgICAgIGxhdERNUyA9IGxhdERNUy5yZXBsYWNlKC9bTlMgXS9pZywgJycpLnNwbGl0KC9bwrAnXCJdLyk7XG5cbiAgICAgICAgICAgIGlmIChsYXRETVMubGVuZ3RoID49IDMpIHtcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPSBwYXJzZUludChsYXRETVNbMF0sIDEwKTtcbiAgICAgICAgICAgICAgICBsYXRNaW51dGUgPSBwYXJzZUludChsYXRETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPSBwYXJzZUZsb2F0KGxhdERNU1syXSwgMTApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXRETVMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgbGF0RE1TID0gbGF0RE1TWzBdLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgbGF0U2Vjb25kID0gcGFyc2VGbG9hdChsYXRETVNbMF0uc3Vic3RyKC0yKSArICcuJyArIGxhdERNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA9IHBhcnNlSW50KGxhdERNU1swXS5zdWJzdHIoLTQsIDIpLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0RGVncmVlID0gcGFyc2VJbnQobGF0RE1TWzBdLnNsaWNlKDAsIC00KSwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPj0gLTkwICYmIGxhdERlZ3JlZSA8PSA5MCAmJlxuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA+PSAwICYmIGxhdE1pbnV0ZSA8IDYwICYmXG4gICAgICAgICAgICAgICAgbGF0U2Vjb25kID49IDAgJiYgbGF0U2Vjb25kIDwgNjAgJiZcbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGxhdERlZ3JlZSkgLSBwYXJzZUZsb2F0KGxhdE1pbnV0ZSAqIDAuMDEpIC0gcGFyc2VGbG9hdChsYXRTZWNvbmQgKiAwLjAwMDEpID49IC05MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobGF0RGVncmVlKSArIHBhcnNlRmxvYXQobGF0TWludXRlICogMC4wMSkgKyBwYXJzZUZsb2F0KGxhdFNlY29uZCAqIDAuMDAwMSkgPD0gOTBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRMb25ETVMgPSBmdW5jdGlvbiAobG9uRE1TKSB7XG4gICAgICAgICAgICBpZiAobG9uRE1TID09PSAnJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxvbkRlZ3JlZSwgbG9uTWludXRlLCBsb25TZWNvbmQ7XG4gICAgICAgICAgICBsb25ETVMgPSBsb25ETVMucmVwbGFjZSgvW0VXIF0vaWcsICcnKS5zcGxpdCgvW8KwJ1wiXS8pO1xuXG4gICAgICAgICAgICBpZiAobG9uRE1TLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID0gcGFyc2VJbnQobG9uRE1TWzBdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uTWludXRlID0gcGFyc2VJbnQobG9uRE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID0gcGFyc2VGbG9hdChsb25ETVNbMl0sIDEwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9uRE1TLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGxvbkRNUyA9IGxvbkRNU1swXS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgICAgIGxvblNlY29uZCA9IHBhcnNlRmxvYXQobG9uRE1TWzBdLnN1YnN0cigtMikgKyAnLicgKyBsb25ETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPSBwYXJzZUludChsb25ETVNbMF0uc3Vic3RyKC00LCAyKSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbkRlZ3JlZSA9IHBhcnNlSW50KGxvbkRNU1swXS5zbGljZSgwLCAtNCksIDEwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPj0gMCAmJiBsb25NaW51dGUgPCA2MCAmJlxuICAgICAgICAgICAgICAgIGxvblNlY29uZCA+PSAwICYmIGxvblNlY29uZCA8IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID49IC0xODAgJiYgbG9uRGVncmVlIDw9IDE4MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobG9uRGVncmVlKSAtIHBhcnNlRmxvYXQobG9uTWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxvblNlY29uZCAqIDAuMDAwMSkgPj0gLTE4MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobG9uRGVncmVlKSArIHBhcnNlRmxvYXQobG9uTWludXRlICogMC4wMSkgKyBwYXJzZUZsb2F0KGxvblNlY29uZCAqIDAuMDAwMSkgPD0gMTgwXG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTUdSUyA9IGZ1bmN0aW9uIChtZ3JzKSB7XG4gICAgICAgICAgICBpZiAobWdycyA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1ncnMgPSBtZ3JzICsgJyc7XG4gICAgICAgICAgICByZXR1cm4gISFtZ3JzLm1hdGNoKC9eKFswLTVdWzAtOV1bQy1YXXw2MFtDLVhdfFtBQllaXSlbQS1aXXsyfVxcZHs0LDE0fSQvaSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGNvb3JkU2VydmljZTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLnNlcnZpY2UoJ2VyaXNTZXJ2aWNlJywgZnVuY3Rpb24gKGVyaXNDb25maWcsIGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZSwgbW9tZW50LCBfKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXRWaWV3cG9ydFNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdyA9IHdpbmRvdyxcbiAgICAgICAgICAgICAgICAgICAgZCA9IGRvY3VtZW50LFxuICAgICAgICAgICAgICAgICAgICBlID0gZC5kb2N1bWVudEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIGcgPSBkb2N1bWVudC5ib2R5LFxuICAgICAgICAgICAgICAgICAgICB4ID0gdy5pbm5lcldpZHRoIHx8IGUuY2xpZW50V2lkdGggfHwgZy5jbGllbnRXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgeSA9IHcuaW5uZXJIZWlnaHQgfHwgZS5jbGllbnRIZWlnaHQgfHwgZy5jbGllbnRIZWlnaHQ7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB3aWR0aDogeCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB5XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmb3JtYXRMYXRMbmc6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIGVuc3VyZSBib3VuZHMgdmFsdWVzIGhhdmUgYXQgbGVhc3QgMSBkZWNpbWFsIHBsYWNlXG4gICAgICAgICAgICAgICAgcmV0dXJuICh2YWx1ZSAlIDEgPT09IDApID8gdmFsdWUudG9GaXhlZCgxKSA6IHZhbHVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEREQm91bmRzOiBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgc3csIG5lLCBib3VuZHM7XG4gICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ2RtcycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3cgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdChsb2NhdGlvbi5zb3V0aCwgbG9jYXRpb24ud2VzdCk7XG4gICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3QobG9jYXRpb24ubm9ydGgsIGxvY2F0aW9uLmVhc3QpO1xuICAgICAgICAgICAgICAgICAgICBib3VuZHMgPSBbW3N3LmRkWzBdLCBuZS5kZFsxXV0sIFtuZS5kZFswXSwgc3cuZGRbMV1dXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ21ncnMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3ID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KGxvY2F0aW9uLm1ncnNTVyk7XG4gICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KGxvY2F0aW9uLm1ncnNORSk7XG4gICAgICAgICAgICAgICAgICAgIGJvdW5kcyA9IFtzdy5kZCwgbmUuZGRdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRlZmluZSByZWN0YW5nbGUgZ2VvZ3JhcGhpY2FsIGJvdW5kc1xuICAgICAgICAgICAgICAgICAgICBib3VuZHMgPSBbW2xvY2F0aW9uLnNvdXRoLCBsb2NhdGlvbi53ZXN0XSwgW2xvY2F0aW9uLm5vcnRoLCBsb2NhdGlvbi5lYXN0XV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJvdW5kcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb252ZXJ0TGF0TG5nOiBmdW5jdGlvbiAobG9jYXRpb24sIG5ld0Zvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciBjb29yZGluYXRlcywgbGF0TG5nO1xuICAgICAgICAgICAgICAgIGlmIChsb2NhdGlvbi5mb3JtYXQgPT09ICdkbXMnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3QobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sbmcpO1xuICAgICAgICAgICAgICAgICAgICBsYXRMbmcgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IHBhcnNlRmxvYXQoY29vcmRpbmF0ZXMuZGRbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ21ncnMnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KGxvY2F0aW9uLm1ncnMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV3Rm9ybWF0ID09PSAnZGQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRMbmcgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzBdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IHBhcnNlRmxvYXQoY29vcmRpbmF0ZXMuZGRbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmV3Rm9ybWF0ID09PSAnZG1zJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhdDogY29vcmRpbmF0ZXMuZG1zWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxuZzogY29vcmRpbmF0ZXMuZG1zWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ2RkJykge1xuICAgICAgICAgICAgICAgICAgICBjb29yZGluYXRlcyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRERCcm9hZGNhc3QobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sbmcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV3Rm9ybWF0ID09PSAnZG1zJyB8fCBuZXdGb3JtYXQgPT09ICdtZ3JzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhdDogY29vcmRpbmF0ZXMuZG1zWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxuZzogY29vcmRpbmF0ZXMuZG1zWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRMbmcgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzBdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IHBhcnNlRmxvYXQoY29vcmRpbmF0ZXMuZGRbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnM6IGNvb3JkaW5hdGVzLm1ncnNcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxhdExuZztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRMZWFmbGV0UG9wdXBDb250ZW50OiBmdW5jdGlvbiAoZmVhdHVyZSkge1xuICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRwbCA9ICc8dWwgY2xhc3M9XCJsaXN0LXVuc3R5bGVkIGV2ZW50LWRldGFpbHMtcG9wdXBcIj4nO1xuXG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPGxpIHN0eWxlPVwiY29sb3I6ICcgKyBmZWF0dXJlLmV2ZW50U291cmNlLmNvbG9yICsgJ1wiPjxpIGNsYXNzPVwiZmEgJyArIGZlYXR1cmUuZXZlbnRUeXBlLmljb24gKyAnXCI+PC9pPiA8Yj4nICsgZmVhdHVyZS5ldmVudFR5cGUudGl0bGUgKyAnPC9iPjwvbGk+JztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sYXRGaWVsZF0gJiYgZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvbkZpZWxkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+JyArIGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sYXRGaWVsZF0udG9GaXhlZCgzKSArICcsICcgKyBmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9uRmllbGRdLnRvRml4ZWQoMykgKyAnPC9saT4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+JyArIG1vbWVudC51dGMoZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGVGaWVsZF0pLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzc1taXScpICsgJzwvbGk+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT4nICsgZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnNlbnNvckZpZWxkXSArICc8L2xpPic7XG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSBmZWF0dXJlLnByb3BlcnRpZXMuaXNfY29ycmVsYXRlZCA/ICc8bGk+Q29ycmVsYXRlZDwvbGk+JyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT5Db25maWRlbmNlOiAnICsgZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmNvbmZpZGVuY2VGaWVsZF0gKyAnPC9saT4nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvY2F0aW9uVW5jZXJ0YWludHlGaWVsZF0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPGxpPkxvY2F0aW9uIFVuY2VydGFpbnR5OiAnICsgZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvY2F0aW9uVW5jZXJ0YWludHlGaWVsZF0gKyAnbTwvbGk+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT5NYXggSW50ZW5zaXR5OiAnICsgZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXS8xMDAwICsgJyAoa1cvc3IvwrVtKTwvbGk+JztcbiAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+TWF4IFNOUjogJyArIGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gKyAnPC9saT4nO1xuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT5EdXJhdGlvbjogJyArIGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kdXJhdGlvbkZpZWxkXSArICc8L2xpPic7XG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPC91bD4nO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRTdHJpa2VQb3B1cENvbnRlbnQ6IGZ1bmN0aW9uIChmZWF0dXJlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb3JkcyA9ICc8dWwgY2xhc3M9XCJsaXN0LXVuc3R5bGVkXCI+JztcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCAxMTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5wcm9wZXJ0aWVzWydPUkROQU5DRV8nICsgaV0gJiYgZmVhdHVyZS5wcm9wZXJ0aWVzWydPUkROQU5DRV8nICsgaV0gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JkcyArPSAnPGxpPicgKyBpICsgJzogJyArIGZlYXR1cmUucHJvcGVydGllc1snT1JETkFOQ0VfJyArIGldICsgJzwvbGk+JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvcmRzICs9ICc8L3VsPic7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0cGwgPSAnPHVsIGNsYXNzPVwibGlzdC11bnN0eWxlZCBldmVudC1kZXRhaWxzLXBvcHVwXCI+JztcblxuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT48Yj4nICsgZmVhdHVyZS5wcm9wZXJ0aWVzWydFTlRJVFkgTkFNRSddICsgJzwvYj48L2xpPic7XG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPGxpPicgKyBfLmNhcGl0YWxpemUoZmVhdHVyZS5wcm9wZXJ0aWVzWydUQVJHRVRTIFJFTUFSSyddKSArICc8L2xpPic7XG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPGxpPicgKyBvcmRzICsgJzxoci8+PC9saT4nO1xuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT4nICsgZmVhdHVyZS5wcm9wZXJ0aWVzLkxBVCArICcsICcgKyBmZWF0dXJlLnByb3BlcnRpZXMuTE9ORyArICc8L2xpPic7XG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPGxpPicgKyBtb21lbnQudXRjKGZlYXR1cmUucHJvcGVydGllcy5kYXRlX3RpbWUpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzc1taXScpICsgJzwvbGk+JztcbiAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8L3VsPic7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRwbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuc2VydmljZSgnZm12U2VydmljZScsIGZ1bmN0aW9uIChcbiAgICAgICAgJGh0dHAsXG4gICAgICAgICRxLFxuICAgICAgICAkbWRUb2FzdCxcbiAgICAgICAgZXJpc0NvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBtb21lbnRcbiAgICApIHtcbiAgICAgICAgdmFyIGdldFJlY29yZGluZ3NQYXJhbXMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgc3RhcnR0aW1lID0gbW9tZW50LnV0YyhwYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXSkuc3VidHJhY3QoMSwgJ3MnKS51bml4KCksXG4gICAgICAgICAgICAgICAgZW5kdGltZSA9IG1vbWVudC51dGMocGFyYW1zW2VyaXNDb25maWcuc2VydmVyLmRhdGVGaWVsZF0pLmFkZCgxLCAncycpLnVuaXgoKSxcbiAgICAgICAgICAgICAgICBjb29yZHMgPSBwYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9uRmllbGRdLnRvU3RyaW5nKCkgKyAnICcgKyBwYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIubGF0RmllbGRdLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZ2VvbWV0cnk6ICdDSVJDTEUnLFxuICAgICAgICAgICAgICAgIGNvb3JkczogY29vcmRzLFxuICAgICAgICAgICAgICAgIHJhZGl1czogMjUwMCxcbiAgICAgICAgICAgICAgICBzdGFydHRpbWU6IHN0YXJ0dGltZSxcbiAgICAgICAgICAgICAgICBlbmR0aW1lOiBlbmR0aW1lXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRBbGxSZWNvcmRpbmdzUGFyYW1zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRlbXBvcmFsRmlsdGVyID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgc3RhcnR0aW1lID0gbW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdGFydCkudW5peCgpLFxuICAgICAgICAgICAgICAgIGVuZHRpbWUgPSBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0b3ApLnVuaXgoKSxcbiAgICAgICAgICAgICAgICBtYXBCb3VuZHMgPSBzdGF0ZVNlcnZpY2UuZ2V0TWFwQkJveCgpLFxuICAgICAgICAgICAgICAgIGNvb3JkcyA9IG1hcEJvdW5kcy5lYXN0ICsgJyAnICsgbWFwQm91bmRzLm5vcnRoICsgJywnICsgbWFwQm91bmRzLmVhc3QgKyAnICcgKyBtYXBCb3VuZHMuc291dGggKyAnLCcgKyBtYXBCb3VuZHMud2VzdCArICcgJyArIG1hcEJvdW5kcy5zb3V0aCArICcsJyArIG1hcEJvdW5kcy53ZXN0ICsgJyAnICsgbWFwQm91bmRzLm5vcnRoICsgJywnICsgbWFwQm91bmRzLmVhc3QgKyAnICcgKyBtYXBCb3VuZHMubm9ydGg7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZ2VvbWV0cnk6ICdQT0xZR09OJyxcbiAgICAgICAgICAgICAgICBjb29yZHM6IGNvb3JkcyxcbiAgICAgICAgICAgICAgICBzdGFydHRpbWU6IHN0YXJ0dGltZSxcbiAgICAgICAgICAgICAgICBlbmR0aW1lOiBlbmR0aW1lXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXRSZWNvcmRpbmdzOiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmRpbmdzUGFyYW1zID0gZ2V0UmVjb3JkaW5nc1BhcmFtcyhwYXJhbXMpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZm12LnVybCArICcvcmVjb3JkaW5nL3NlYXJjaD9zdGFydHRpbWU9JyArIHJlY29yZGluZ3NQYXJhbXMuc3RhcnR0aW1lICsgJyZlbmR0aW1lPScgKyByZWNvcmRpbmdzUGFyYW1zLmVuZHRpbWUgKyAnJmdlb21ldHJ5PScgKyByZWNvcmRpbmdzUGFyYW1zLmdlb21ldHJ5ICsgJyZyYWRpdXM9JyArIHJlY29yZGluZ3NQYXJhbXMucmFkaXVzICsgJyZjb29yZHM9JyArIHJlY29yZGluZ3NQYXJhbXMuY29vcmRzXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRBbGxSZWNvcmRpbmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSBnZXRBbGxSZWNvcmRpbmdzUGFyYW1zKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5mbXYudXJsICsgJy9yZWNvcmRpbmcvc2VhcmNoP3N0YXJ0dGltZT0nICsgcGFyYW1zLnN0YXJ0dGltZSArICcmZW5kdGltZT0nICsgcGFyYW1zLmVuZHRpbWUgKyAnJmdlb21ldHJ5PScgKyBwYXJhbXMuZ2VvbWV0cnkgKyAnJmNvb3Jkcz0nICsgcGFyYW1zLmNvb3Jkc1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5zdGF0dXMgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciByZXRyaWV2aW5nIHJlY29yZGluZ3MuIChDT1JTKScpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIHJldHJpZXZpbmcgcmVjb3JkaW5ncy4gU3RhdHVzOiAnICsgZXJyLnN0YXR1cykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuc2VydmljZSgnc2VhcmNoU2VydmljZScsIGZ1bmN0aW9uIChcbiAgICAgICAgJGh0dHAsXG4gICAgICAgICRyZXNvdXJjZSxcbiAgICAgICAgJHEsXG4gICAgICAgICRtZFRvYXN0LFxuICAgICAgICBlcmlzQ29uZmlnLFxuICAgICAgICBlcmlzU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBtb21lbnQsXG4gICAgICAgIHBvbGxlcixcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgZXZlbnRzUmVzb3VyY2UgPSBudWxsLFxuICAgICAgICAgICAgZXZlbnRzUG9sbGVyID0gbnVsbDtcblxuICAgICAgICB2YXIgZ2V0RXZlbnRQYXJhbXMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlcnZpY2U6ICdXRlMnLFxuICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgICAgICAgICAgcmVxdWVzdDogJ0dldEZlYXR1cmUnLFxuICAgICAgICAgICAgICAgIHR5cGVOYW1lOiBlcmlzQ29uZmlnLnNlcnZlci5sYXllcnMuZXZlbnRzLndvcmtzcGFjZSArICc6JyArIGVyaXNDb25maWcuc2VydmVyLmxheWVycy5ldmVudHMubGF5ZXIsXG4gICAgICAgICAgICAgICAgY3FsX2ZpbHRlcjogZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkICsgJz1cXCcnICsgcGFyYW1zW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gKyAnXFwnIEFORCAnICsgZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkICsgJz0nICsgcGFyYW1zW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0sXG4gICAgICAgICAgICAgICAgb3V0cHV0Rm9ybWF0OiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldEV2ZW50c1BhcmFtcyA9IGZ1bmN0aW9uIChzb3VyY2VzLCB2b3RlZEV2ZW50cykge1xuICAgICAgICAgICAgdmFyIHRlbXBvcmFsRmlsdGVyID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgc3RhcnQgPSB0eXBlb2YgdGVtcG9yYWxGaWx0ZXIuc3RhcnQgPT09ICdzdHJpbmcnID8gdGVtcG9yYWxGaWx0ZXIuc3RhcnQgOiB0ZW1wb3JhbEZpbHRlci5zdGFydC50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHN0b3AgPSB0eXBlb2YgdGVtcG9yYWxGaWx0ZXIuc3RvcCA9PT0gJ3N0cmluZycgPyB0ZW1wb3JhbEZpbHRlci5zdG9wIDogdGVtcG9yYWxGaWx0ZXIuc3RvcC50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHNvdXJjZVR5cGUgPSBzdGF0ZVNlcnZpY2UuZ2V0U291cmNlVHlwZSgpLFxuICAgICAgICAgICAgICAgIGlkZW50aXRpZXMgPSBfLm1hcChzb3VyY2VzLCAnaWRlbnRpdHknKSxcbiAgICAgICAgICAgICAgICBpZGVudGl0eUZpbHRlciA9ICcnLFxuICAgICAgICAgICAgICAgIG9ubHlDb3JyZWxhdGlvbnMgPSBzdGF0ZVNlcnZpY2UuZ2V0T25seUNvcnJlbGF0aW9ucygpLFxuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW9uRmlsdGVyID0gb25seUNvcnJlbGF0aW9ucyA9PT0gMSA/ICdpc19jb3JyZWxhdGVkPXRydWUgQU5EICcgOiAnaXNfY29ycmVsYXRlZCBJUyBOT1QgTlVMTCBBTkQgJyxcbiAgICAgICAgICAgICAgICBmaWx0ZXJTdHJhdGVneSA9IHN0YXRlU2VydmljZS5nZXRGaWx0ZXJTdHJhdGVneSgpLFxuICAgICAgICAgICAgICAgIGNvbmZpZGVuY2VGaWx0ZXIgPSBmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicgPyBlcmlzQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGQgKyAnPj0nICsgc3RhdGVTZXJ2aWNlLmdldENvbmZpZGVuY2UoKSArICcgQU5EICcgOiAnJyxcbiAgICAgICAgICAgICAgICBsb2NhdGlvblVuY2VydGFpbnR5RmlsdGVyID0gZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInID8gJygnICsgZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkICsgJzw9JyArIHN0YXRlU2VydmljZS5nZXRMb2NhdGlvblVuY2VydGFpbnR5KCkgKyAnIE9SICcgKyBlcmlzQ29uZmlnLnNlcnZlci5sb2NhdGlvblVuY2VydGFpbnR5RmllbGQgKyAnIElTIE5VTEwpJyArICcgQU5EICcgOiAnJyxcbiAgICAgICAgICAgICAgICBpbnRlbnNpdHkgPSBzdGF0ZVNlcnZpY2UuZ2V0SW50ZW5zaXR5KCksXG4gICAgICAgICAgICAgICAgaW50ZW5zaXR5RmlsdGVyID0gZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInID8gZXJpc0NvbmZpZy5zZXJ2ZXIuaW50ZW5zaXR5RmllbGQgKyAnPj0nICsgaW50ZW5zaXR5Lm1pbiArICcgQU5EICcgKyBlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZCArICc8PScgKyBpbnRlbnNpdHkubWF4ICsgJyBBTkQgJyA6ICcnLFxuICAgICAgICAgICAgICAgIHNuciA9IHN0YXRlU2VydmljZS5nZXRTbnIoKSxcbiAgICAgICAgICAgICAgICBzbnJGaWx0ZXIgPSBmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicgPyBlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZCArICc+PScgKyBzbnIubWluICsgJyBBTkQgJyArIGVyaXNDb25maWcuc2VydmVyLnNuckZpZWxkICsgJzw9JyArIHNuci5tYXggKyAnIEFORCAnIDogJycsXG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBzdGF0ZVNlcnZpY2UuZ2V0RHVyYXRpb24oKSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbkZpbHRlciA9IGZpbHRlclN0cmF0ZWd5ID09PSAnc2VydmVyJyA/IGVyaXNDb25maWcuc2VydmVyLmR1cmF0aW9uRmllbGQgKyAnPj1cXCcnICsgbW9tZW50LmR1cmF0aW9uKGR1cmF0aW9uLm1pbiwgJ3MnKS5mb3JtYXQoJ21tOnNzLlNTUycsIHsgdHJpbTogZmFsc2UgfSkgKyAnXFwnIEFORCAnICsgZXJpc0NvbmZpZy5zZXJ2ZXIuZHVyYXRpb25GaWVsZCArICc8PVxcJycgKyBtb21lbnQuZHVyYXRpb24oZHVyYXRpb24ubWF4LCAncycpLmZvcm1hdCgnbW06c3MuU1NTJywgeyB0cmltOiBmYWxzZSB9KSArICdcXCcgQU5EICcgOiAnJyxcbiAgICAgICAgICAgICAgICBiYm94ID0gc3RhdGVTZXJ2aWNlLmdldE1hcEJCb3goKSxcbiAgICAgICAgICAgICAgICBsb2NhdGlvbkZpbHRlciA9IGZpbHRlclN0cmF0ZWd5ID09PSAnc2VydmVyJyA/ICdCQk9YKCcgKyBlcmlzQ29uZmlnLnNlcnZlci5sYXllcnMuZXZlbnRzLmdlb21GaWVsZCArICcsJyArIGJib3gud2VzdCArICcsJyArIGJib3guc291dGggKyAnLCcgKyBiYm94LmVhc3QgKyAnLCcgKyBiYm94Lm5vcnRoICsgJykgQU5EICcgOiAnJyxcbiAgICAgICAgICAgICAgICBldmVudEZpbHRlciA9ICcnO1xuXG4gICAgICAgICAgICB2YXIgc291cmNlVHlwZUZpbHRlciA9IHNvdXJjZVR5cGUgPT09ICdBbGwnID9cbiAgICAgICAgICAgICAgICBlcmlzQ29uZmlnLnNlcnZlci5zb3VyY2VUeXBlRmllbGQgKyAnIElTIE5PVCBOVUxMIEFORCAnIDpcbiAgICAgICAgICAgICAgICBlcmlzQ29uZmlnLnNlcnZlci5zb3VyY2VUeXBlRmllbGQgKyAnPVxcJycgKyBzb3VyY2VUeXBlICsgJ1xcJyBBTkQgJztcblxuICAgICAgICAgICAgLy8gaWYgdGhlIGFtb3VudCBvZiBpZGVudGl0aWVzIHNlbGVjdGVkIGlzIGZld2VyIHRoYW4gdGhlIHRvdGFsIGF2YWlsYWJsZSwgcXVlcnkgb24gdGhvc2UgaWRlbnRpdGllcyB0byBzcGVlZCB0aGluZ3MgdXBcbiAgICAgICAgICAgIGlmIChpZGVudGl0aWVzLmxlbmd0aCA8IGVyaXNDb25maWcuc291cmNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goaWRlbnRpdGllcywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlkZW50aXR5RmlsdGVyICs9IGVyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGQgKyAnPScgKyB2YWx1ZSArICcgQU5EICc7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlkZW50aXR5RmlsdGVyID0gZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZCArICcgSVMgTk9UIE5VTEwgQU5EICc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0ZVNlcnZpY2UuZ2V0Vm90ZUZpbHRlcigpID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2godm90ZWRFdmVudHMsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50RmlsdGVyID0gZXZlbnRGaWx0ZXIgKyAnKHByb2R1Y3RfaWQ9XFwnJyArIGUucHJvZHVjdF9pZCArICdcXCcgQU5EIGRhdGFzZXRfaWQ9XFwnJyArIGUuZGF0YXNldF9pZCArICdcXCcpIE9SICc7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50RmlsdGVyID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBldmVudEZpbHRlciA9ICdwcm9kdWN0X2lkPVxcJzBcXCcgQU5EIGRhdGFzZXRfaWQ9XFwnMFxcJyBBTkQgJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBzdHJpcCBvZmYgdGhlIGxhc3QgJyBPUiAnIGFuZCB1c2UgJyBBTkQgJyBpbnN0ZWFkXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50RmlsdGVyID0gJygnICsgZXZlbnRGaWx0ZXIuc3Vic3RyaW5nKDAsIChldmVudEZpbHRlci5sZW5ndGggLSA0KSkgKyAnKSBBTkQgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2VydmljZTogJ1dGUycsXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0OiAnR2V0RmVhdHVyZScsXG4gICAgICAgICAgICAgICAgdHlwZU5hbWU6IGVyaXNDb25maWcuc2VydmVyLmxheWVycy5ldmVudHMud29ya3NwYWNlICsgJzonICsgZXJpc0NvbmZpZy5zZXJ2ZXIubGF5ZXJzLmV2ZW50cy5sYXllcixcbiAgICAgICAgICAgICAgICBjcWxfZmlsdGVyOiBzb3VyY2VUeXBlRmlsdGVyICsgaWRlbnRpdHlGaWx0ZXIgKyBjb3JyZWxhdGlvbkZpbHRlciArIGNvbmZpZGVuY2VGaWx0ZXIgKyBsb2NhdGlvblVuY2VydGFpbnR5RmlsdGVyICsgaW50ZW5zaXR5RmlsdGVyICsgc25yRmlsdGVyICsgZHVyYXRpb25GaWx0ZXIgKyBsb2NhdGlvbkZpbHRlciArIGV2ZW50RmlsdGVyICsgZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkICsgJz49JyArIHN0YXJ0ICsgJyBBTkQgJyArIGVyaXNDb25maWcuc2VydmVyLmRhdGVGaWVsZCArICc8PScgKyBzdG9wLFxuICAgICAgICAgICAgICAgIG91dHB1dEZvcm1hdDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRFdmVudFRyYWNrc1BhcmFtcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2VydmljZTogJ1dGUycsXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0OiAnR2V0RmVhdHVyZScsXG4gICAgICAgICAgICAgICAgdHlwZU5hbWU6IGVyaXNDb25maWcuc2VydmVyLmxheWVycy50cmFja3Mud29ya3NwYWNlICsgJzonICsgZXJpc0NvbmZpZy5zZXJ2ZXIubGF5ZXJzLnRyYWNrcy5sYXllcixcbiAgICAgICAgICAgICAgICBjcWxfZmlsdGVyOiBlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGQgKyAnPVxcJycgKyBwYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSArICdcXCcgQU5EICcgKyBlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGQgKyAnPScgKyBwYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSxcbiAgICAgICAgICAgICAgICBvdXRwdXRGb3JtYXQ6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0Q29ycmVsYXRpbmdFdmVudHNQYXJhbXMgPSBmdW5jdGlvbiAoZXZlbnRGZWF0dXJlKSB7XG4gICAgICAgICAgICBpZiAoZXZlbnRGZWF0dXJlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc2VydmljZTogJ1dGUycsXG4gICAgICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3Q6ICdHZXRGZWF0dXJlJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZU5hbWU6IGVyaXNDb25maWcuc2VydmVyLmxheWVycy50cmFja3Mud29ya3NwYWNlICsgJzonICsgZXJpc0NvbmZpZy5zZXJ2ZXIubGF5ZXJzLmNvcnJlbGF0aW5nX2V2ZW50cy5sYXllcixcbiAgICAgICAgICAgICAgICAgICAgY3FsX2ZpbHRlcjogZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkICsgJ18xPVxcJycgKyBldmVudEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICsgJ1xcJyBBTkQgJyArIGVyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZCArICdfMT0nICsgZXZlbnRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSxcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0Rm9ybWF0OiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRQbG90RGF0YVBhcmFtcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdXJsOiBwYXJhbXMudXJsLFxuICAgICAgICAgICAgICAgIHhfY29sdW1uOiBwYXJhbXMueF9jb2x1bW4gfHwgJ3RpbWUnLFxuICAgICAgICAgICAgICAgIHhfc2NhbGU6IHBhcmFtcy54X3NjYWxlIHx8ICdsaW5lYXInLFxuICAgICAgICAgICAgICAgIHhfdW5pdHM6IHBhcmFtcy54X3VuaXRzIHx8ICdldmVudF9zZWNzJyxcbiAgICAgICAgICAgICAgICB5X2NvbHVtbjogcGFyYW1zLnlfY29sdW1uIHx8ICdpbnRlbnNpdHknLFxuICAgICAgICAgICAgICAgIHlfc2NhbGU6IHBhcmFtcy55X3NjYWxlIHx8ICdsaW5lYXInLFxuICAgICAgICAgICAgICAgIHlfdW5pdHM6IHBhcmFtcy55X3VuaXRzIHx8IGVyaXNDb25maWcuaW50ZW5zaXR5VW5pdHMsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiBwYXJhbXMuZm9ybWF0IHx8ICdqc29uJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0RnJhbWVEYXRhUGFyYW1zID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB1cmw6IHBhcmFtcy51cmwsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiBwYXJhbXMuZm9ybWF0IHx8ICdqc29uJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0Q291bnRyaWVzUGFyYW1zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlOiAnV0ZTJyxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgICAgICAgICAgICAgIHJlcXVlc3Q6ICdHZXRGZWF0dXJlJyxcbiAgICAgICAgICAgICAgICB0eXBlTmFtZTogZXJpc0NvbmZpZy5sb2NhbFNlcnZlci5sYXllcnMuY291bnRyaWVzLndvcmtzcGFjZSArICc6JyArIGVyaXNDb25maWcubG9jYWxTZXJ2ZXIubGF5ZXJzLmNvdW50cmllcy5sYXllcixcbiAgICAgICAgICAgICAgICBvdXRwdXRGb3JtYXQ6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0U3RyaWtlc1BhcmFtcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0ZW1wb3JhbEZpbHRlciA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpLFxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gdHlwZW9mIHRlbXBvcmFsRmlsdGVyLnN0YXJ0ID09PSAnc3RyaW5nJyA/IHRlbXBvcmFsRmlsdGVyLnN0YXJ0IDogdGVtcG9yYWxGaWx0ZXIuc3RhcnQgPyB0ZW1wb3JhbEZpbHRlci5zdGFydC50b0lTT1N0cmluZygpIDogbW9tZW50LnV0YygpLnN1YnRyYWN0KDYsICdoJykudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBzdG9wID0gdHlwZW9mIHRlbXBvcmFsRmlsdGVyLnN0b3AgPT09ICdzdHJpbmcnID8gdGVtcG9yYWxGaWx0ZXIuc3RvcCA6IHRlbXBvcmFsRmlsdGVyLnN0b3AgPyB0ZW1wb3JhbEZpbHRlci5zdG9wLnRvSVNPU3RyaW5nKCkgOiBtb21lbnQudXRjKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBiYm94ID0gc3RhdGVTZXJ2aWNlLmdldE1hcEJCb3goKSxcbiAgICAgICAgICAgICAgICBsb2NhdGlvbkZpbHRlciA9ICdCQk9YKGdlb20sJyArIGJib3gud2VzdCArICcsJyArIGJib3guc291dGggKyAnLCcgKyBiYm94LmVhc3QgKyAnLCcgKyBiYm94Lm5vcnRoICsgJykgQU5EICc7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2VydmljZTogJ1dGUycsXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0OiAnR2V0RmVhdHVyZScsXG4gICAgICAgICAgICAgICAgdHlwZU5hbWU6IGVyaXNDb25maWcubG9jYWxTZXJ2ZXIubGF5ZXJzLnN0cmlrZXMud29ya3NwYWNlICsgJzonICsgZXJpc0NvbmZpZy5sb2NhbFNlcnZlci5sYXllcnMuc3RyaWtlcy5sYXllcixcbiAgICAgICAgICAgICAgICBjcWxfZmlsdGVyOiBsb2NhdGlvbkZpbHRlciArIGVyaXNDb25maWcubG9jYWxTZXJ2ZXIubGF5ZXJzLnN0cmlrZXMuZGF0ZUZpZWxkICsgJz49JyArIHN0YXJ0ICsgJyBBTkQgJyArIGVyaXNDb25maWcubG9jYWxTZXJ2ZXIubGF5ZXJzLnN0cmlrZXMuZGF0ZUZpZWxkICsgJzw9JyArIHN0b3AsXG4gICAgICAgICAgICAgICAgb3V0cHV0Rm9ybWF0OiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGdldEV2ZW50OiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuc2VydmVyLnVybCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBnZXRFdmVudFBhcmFtcyhwYXJhbXMpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRFdmVudHM6IGZ1bmN0aW9uIChzb3VyY2VzLCB2b3RlZEV2ZW50cykge1xuICAgICAgICAgICAgICAgIGlmIChldmVudHNQb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzUG9sbGVyLnN0b3AoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBwb2xsIGZvciBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgZXZlbnRzUmVzb3VyY2UgPSAkcmVzb3VyY2UoZXJpc0NvbmZpZy5zZXJ2ZXIudXJsICsgJz9yZXF1ZXN0VGltZT0nICsgbW9tZW50LnV0YygpLnVuaXgoKSwge1xuICAgICAgICAgICAgICAgICAgICBldmVudHNRdWVyeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGFyZSBvdmVycmlkaW5nIHRoZSB0cmFuc2Zvcm1SZXF1ZXN0IGZ1bmN0aW9uIHRvIGNvbnZlcnQgb3VyIFBPU1RcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRhdGEgdG8gdXJsZW5jb2RlZCBkYXRhIGFzIEdlb1NlcnZlciByZXF1aXJlcyB0aGlzIGZvcm1hdCBmb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBPU1RzIHRvIHdvcmsgcHJvcGVybHkuXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm1SZXF1ZXN0OiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHN0ciA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHAgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ci5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChwKSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChvYmpbcF0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RyLmpvaW4oJyYnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gR2V0IHBvbGxlci5cbiAgICAgICAgICAgICAgICBldmVudHNQb2xsZXIgPSBwb2xsZXIuZ2V0KGV2ZW50c1Jlc291cmNlLCB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiAzMDAwMDAsIC8vIDUgbWludXRlc1xuICAgICAgICAgICAgICAgICAgICBjYXRjaEVycm9yOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHNBcnJheTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHN0YXJ0IGFuZCBzdG9wIHRvIGFsd2F5cyBiZSB0aGUgbW9zdCBjdXJyZW50IHRpbWVzIGFjY29yZGluZyB0byB0aGUgcmVxdWVzdGVkIHJhbmdlXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcG9yYWxGaWx0ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IHR5cGVvZiB0ZW1wb3JhbEZpbHRlci5zdGFydCA9PT0gJ3N0cmluZycgPyB0ZW1wb3JhbEZpbHRlci5zdGFydCA6IHRlbXBvcmFsRmlsdGVyLnN0YXJ0LnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcCA9IHR5cGVvZiB0ZW1wb3JhbEZpbHRlci5zdG9wID09PSAnc3RyaW5nJyA/IHRlbXBvcmFsRmlsdGVyLnN0b3AgOiB0ZW1wb3JhbEZpbHRlci5zdG9wLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcG9yYWxEaWZmID0gbW9tZW50LnV0YyhzdG9wKS5kaWZmKG1vbWVudC51dGMoc3RhcnQpLCAnbScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGVtcG9yYWxGaWx0ZXIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBtb21lbnQudXRjKCkuc3VidHJhY3QodGVtcG9yYWxEaWZmLCAnbScpLnRvRGF0ZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3A6IG1vbWVudC51dGMoKS50b0RhdGUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc29sYXRlZDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2dldEV2ZW50c1BhcmFtcyhzb3VyY2VzLCB2b3RlZEV2ZW50cyldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnRzUG9sbGVyLnByb21pc2UudGhlbihudWxsLCBudWxsLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEuJHJlc29sdmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudHNQb2xsZXIuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0RXZlbnRzT25jZTogZnVuY3Rpb24gKHNvdXJjZXMsIHZvdGVkRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50c1BvbGxlcikge1xuICAgICAgICAgICAgICAgICAgICBldmVudHNQb2xsZXIuc3RvcCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuc2VydmVyLnVybCArICc/cmVxdWVzdFRpbWU9JyArIG1vbWVudC51dGMoKS51bml4KCksXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCd9LFxuICAgICAgICAgICAgICAgICAgICAvLyB3ZSBhcmUgb3ZlcnJpZGluZyB0aGUgdHJhbnNmb3JtUmVxdWVzdCBmdW5jdGlvbiB0byBjb252ZXJ0IG91ciBQT1NUXG4gICAgICAgICAgICAgICAgICAgIC8vIGRhdGEgdG8gdXJsZW5jb2RlZCBkYXRhIGFzIEdlb1NlcnZlciByZXF1aXJlcyB0aGlzIGZvcm1hdCBmb3JcbiAgICAgICAgICAgICAgICAgICAgLy8gUE9TVHMgdG8gd29yayBwcm9wZXJseS5cbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtUmVxdWVzdDogZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHN0ciA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ci5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChwKSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChvYmpbcF0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RyLmpvaW4oJyYnKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogZ2V0RXZlbnRzUGFyYW1zKHNvdXJjZXMsIHZvdGVkRXZlbnRzKVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5zdGF0dXMgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciByZXRyaWV2aW5nIGV2ZW50cy4gKENPUlMpJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgcmV0cmlldmluZyBldmVudHMuIFN0YXR1czogJyArIGVyci5zdGF0dXMpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRFdmVudFRyYWNrczogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLnNlcnZlci51cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0RXZlbnRUcmFja3NQYXJhbXMocGFyYW1zKVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q29ycmVsYXRpbmdFdmVudHM6IGZ1bmN0aW9uIChldmVudERhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5zZXJ2ZXIudXJsLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IGdldENvcnJlbGF0aW5nRXZlbnRzUGFyYW1zKGV2ZW50RGF0YSlcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFBsb3REYXRhOiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICBjYWNoZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLmV2ZW50U2VydmVyLmFqYXhVcmwgKyAnL3Bsb3QtZGF0YS8nLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IGdldFBsb3REYXRhUGFyYW1zKHBhcmFtcylcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEZyYW1lRGF0YTogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgY2FjaGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5ldmVudFNlcnZlci5hamF4VXJsICsgJy9mcmFtZXMvJyxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBnZXRGcmFtZURhdGFQYXJhbXMocGFyYW1zKVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q291bnRyaWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcubG9jYWxTZXJ2ZXIudXJsLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IGdldENvdW50cmllc1BhcmFtcygpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRTY2FsZURhdGE6IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuc2NhbGUuYWpheFVybCArICcvP2ZpbGVfbmFtZT0nICsgZmlsZVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZG93bmxvYWRHaWY6IGZ1bmN0aW9uIChmcmFtZXMsIGRpbWVuc2lvbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL2dpZicsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lczogZnJhbWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uczogZGltZW5zaW9uc1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcidcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFN0cmlrZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5sb2NhbFNlcnZlci51cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0U3RyaWtlc1BhcmFtcygpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBpZihlcnIuc3RhdHVzID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgcmV0cmlldmluZyBzdHJpa2VzLiAoQ09SUyknKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciByZXRyaWV2aW5nIHN0cmlrZXMuIFN0YXR1czogJyArIGVyci5zdGF0dXMpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZG93bmxvYWRFeHRGaWxlczogZnVuY3Rpb24gKHVybEFycikge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5leHREb3dubG9hZFVybCArICcvZXh0JyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXJsczogdXJsQXJyXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBleHBvcnRLbWw6IGZ1bmN0aW9uIChrbWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXh0RG93bmxvYWRVcmwgKyAnL2ttbCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGttbDoga21sXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLnNlcnZpY2UoJ3N0YXRlU2VydmljZScsIGZ1bmN0aW9uIChcclxuICAgICAgICAkbG9jYXRpb24sXHJcbiAgICAgICAgJHRpbWVvdXQsXHJcbiAgICAgICAgJG1kVG9hc3QsXHJcbiAgICAgICAgZXJpc0NvbmZpZyxcclxuICAgICAgICBtb21lbnQsXHJcbiAgICAgICAgX1xyXG4gICAgKSB7XHJcbiAgICAgICAgdmFyIHF1ZXJ5U3RyaW5nID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xyXG5cclxuICAgICAgICB2YXIgZ290b0V4cGFuZGVkID0gZmFsc2UsXHJcbiAgICAgICAgICAgIGxvY2F0aW9uRmlsdGVyRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgcmVjZW50RXZlbnRMaXN0RXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXJFeHBhbmRlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICBzb3VyY2VGaWx0ZXJFeHBhbmRlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICB0eXBlRmlsdGVyRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgZXZlbnRGaWx0ZXJzRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgYWRtaW5FeHBhbmRlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICBsb2NhdGlvbkZvcm1hdCA9IHF1ZXJ5U3RyaW5nLmxvY2F0aW9uRm9ybWF0LFxyXG4gICAgICAgICAgICBtYXBCb3VuZHMgPSBudWxsLFxyXG4gICAgICAgICAgICBtYXBCQm94ID0ge30sXHJcbiAgICAgICAgICAgIG1hcFpvb20gPSBxdWVyeVN0cmluZy56b29tLFxyXG4gICAgICAgICAgICBtYXBDZW50ZXIgPSBlcmlzQ29uZmlnLm1hcENlbnRlcixcclxuICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXIgPSB7XHJcbiAgICAgICAgICAgICAgICBzdGFydDogcXVlcnlTdHJpbmcuc3RhcnQsXHJcbiAgICAgICAgICAgICAgICBzdG9wOiBxdWVyeVN0cmluZy5zdG9wLFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IHF1ZXJ5U3RyaW5nLmR1cmF0aW9uLFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb25MZW5ndGg6IHF1ZXJ5U3RyaW5nLmR1cmF0aW9uTGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgaXNvbGF0ZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGJhc2VsYXllciA9IG51bGwsXHJcbiAgICAgICAgICAgIG92ZXJsYXlzID0gW10sXHJcbiAgICAgICAgICAgIHZpZXdwb3J0U2l6ZSA9IHt9LFxyXG4gICAgICAgICAgICBhY3RpdmVTb3VyY2VzID0gW10sXHJcbiAgICAgICAgICAgIGFjdGl2ZVR5cGVzID0gW10sXHJcbiAgICAgICAgICAgIGV2ZW50cyA9IFtdLFxyXG4gICAgICAgICAgICBhY3RpdmVFdmVudCA9IG51bGwsXHJcbiAgICAgICAgICAgIGV2ZW50TGF5ZXJzID0gbnVsbCxcclxuICAgICAgICAgICAgc291cmNlVHlwZSA9IHF1ZXJ5U3RyaW5nLnNvdXJjZVR5cGUsXHJcbiAgICAgICAgICAgIGV2ZW50RGF0YSA9IG51bGwsXHJcbiAgICAgICAgICAgIGxheW91dENvbmZpZyA9IG51bGwsXHJcbiAgICAgICAgICAgIGxheW91dENvbXBvbmVudHMgPSBbXSxcclxuICAgICAgICAgICAgbG9hZGluZ0V2ZW50cyA9IGZhbHNlLFxyXG4gICAgICAgICAgICB2b3RlciA9IG51bGwsXHJcbiAgICAgICAgICAgIHZvdGVzID0gW10sXHJcbiAgICAgICAgICAgIHZvdGVSZWFzb25zID0gW10sXHJcbiAgICAgICAgICAgIGNvbmZpZGVuY2UgPSBudWxsLFxyXG4gICAgICAgICAgICBsb2NhdGlvblVuY2VydGFpbnR5ID0gbnVsbCxcclxuICAgICAgICAgICAgaW50ZW5zaXR5ID0ge30sXHJcbiAgICAgICAgICAgIHNuciA9IHt9LFxyXG4gICAgICAgICAgICBkdXJhdGlvbiA9IHt9LFxyXG4gICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gcXVlcnlTdHJpbmcub25seUNvcnJlbGF0aW9ucyxcclxuICAgICAgICAgICAgY291bnRyeUxpc3QgPSBbXSxcclxuICAgICAgICAgICAgY291bnRyaWVzID0gW10sXHJcbiAgICAgICAgICAgIHNlbnNvckxpc3QgPSBbXSxcclxuICAgICAgICAgICAgc2Vuc29ycyA9IFtdLFxyXG4gICAgICAgICAgICBmaWx0ZXJTdHJhdGVneSA9IHF1ZXJ5U3RyaW5nLmZpbHRlclN0cmF0ZWd5LFxyXG4gICAgICAgICAgICBzdHJpa2VWaXNpYmlsaXR5ID0gcXVlcnlTdHJpbmcuc3RyaWtlVmlzaWJpbGl0eSxcclxuICAgICAgICAgICAgZm12RmlsdGVyID0gcXVlcnlTdHJpbmcuZm12RmlsdGVyLFxyXG4gICAgICAgICAgICBmbXZMYXllcnMgPSBudWxsLFxyXG4gICAgICAgICAgICB2b3RlRmlsdGVyID0gcXVlcnlTdHJpbmcudm90ZUZpbHRlcixcclxuICAgICAgICAgICAgdm90ZUZpbHRlclR5cGUgPSBxdWVyeVN0cmluZy52b3RlRmlsdGVyVHlwZSxcclxuICAgICAgICAgICAgdm90ZWRFdmVudHMgPSBudWxsLFxyXG4gICAgICAgICAgICB0b3RhbFZvdGVzID0gbnVsbCxcclxuICAgICAgICAgICAgY2VudGVyT25BY3RpdmVFdmVudCA9IHRydWUsXHJcbiAgICAgICAgICAgIHNvcnRDb25maWcgPSBfLmNsb25lKGVyaXNDb25maWcuZGVmYXVsdFNvcnRDb25maWcpLFxyXG4gICAgICAgICAgICBjdXJyU29ydCA9IF8uZmluZChzb3J0Q29uZmlnLCB7IGVuYWJsZWQ6IHRydWUgfSksXHJcbiAgICAgICAgICAgIGFsZXJ0ID0gbnVsbCxcclxuICAgICAgICAgICAgaXNBZG1pbiA9IGZhbHNlLFxyXG4gICAgICAgICAgICBwb2xsID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmIChxdWVyeVN0cmluZy5zb3J0Q29sdW1uKSB7XHJcbiAgICAgICAgICAgIGN1cnJTb3J0LmVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgY3VyclNvcnQgPSBzb3J0Q29uZmlnW3F1ZXJ5U3RyaW5nLnNvcnRDb2x1bW5dO1xyXG4gICAgICAgICAgICBjdXJyU29ydC5lbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChxdWVyeVN0cmluZy5zb3J0RGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIGN1cnJTb3J0LmRpcmVjdGlvbiA9IHF1ZXJ5U3RyaW5nLnNvcnREaXJlY3Rpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZmlsdGVyU3RyYXRlZ3kgIT09ICdzZXJ2ZXInKSB7XHJcbiAgICAgICAgICAgIC8vIGRvbid0IGxldCB0aGlzIGhhcHBlbiBpZiB0ZW1wb3JhbCBmaWx0ZXIgaXMgdG9vIGxhcmdlXHJcbiAgICAgICAgICAgIHZhciB0ZW1wb3JhbERpZmYgPSBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0b3ApLmRpZmYobW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdGFydCksICdoJyk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGVtcG9yYWxEaWZmID4gMjQpIHtcclxuICAgICAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5ID0gJ3NlcnZlcic7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5maWx0ZXJTdHJhdGVneSA9IGZpbHRlclN0cmF0ZWd5O1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnVGVtcG9yYWwgZmlsdGVyIHJhbmdlIG11c3QgYmUgc2hvcnRlciB0aGFuIDI0IGhvdXJzIHRvIGZpbHRlciBjbGllbnQtc2lkZS4nKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChxdWVyeVN0cmluZy5uIHx8IHF1ZXJ5U3RyaW5nLm5lKSB7XHJcbiAgICAgICAgICAgIG1hcEJCb3ggPSB7XHJcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IGxvY2F0aW9uRm9ybWF0LFxyXG4gICAgICAgICAgICAgICAgbm9ydGg6IGxvY2F0aW9uRm9ybWF0ID09PSAnZGQnID8gcGFyc2VGbG9hdChxdWVyeVN0cmluZy5uKSA6IHF1ZXJ5U3RyaW5nLm4sXHJcbiAgICAgICAgICAgICAgICBzb3V0aDogbG9jYXRpb25Gb3JtYXQgPT09ICdkZCcgPyBwYXJzZUZsb2F0KHF1ZXJ5U3RyaW5nLnMpIDogcXVlcnlTdHJpbmcucyxcclxuICAgICAgICAgICAgICAgIGVhc3Q6IGxvY2F0aW9uRm9ybWF0ID09PSAnZGQnID8gcGFyc2VGbG9hdChxdWVyeVN0cmluZy5lKSA6IHF1ZXJ5U3RyaW5nLmUsXHJcbiAgICAgICAgICAgICAgICB3ZXN0OiBsb2NhdGlvbkZvcm1hdCA9PT0gJ2RkJyA/IHBhcnNlRmxvYXQocXVlcnlTdHJpbmcudykgOiBxdWVyeVN0cmluZy53LFxyXG4gICAgICAgICAgICAgICAgbWdyc05FOiBxdWVyeVN0cmluZy5uZSB8fCAnJyxcclxuICAgICAgICAgICAgICAgIG1ncnNTVzogcXVlcnlTdHJpbmcuc3cgfHwgJydcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHNldE1hcEJCb3hQYXJhbXM6IGZ1bmN0aW9uIChsb2NhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghbG9jYXRpb24uZm9ybWF0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmZvcm1hdCA9IGVyaXNDb25maWcuZGVmYXVsdExvY2F0aW9uRm9ybWF0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnNldExvY2F0aW9uRm9ybWF0KGxvY2F0aW9uLmZvcm1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIGFueXRoaW5nIGNoYW5nZSwgdXBkYXRlICRsb2NhdGlvbi5zZWFyY2goKSBhbmQgYnJvYWRjYXN0IG5vdGlmaWNhdGlvbiBvZiBjaGFuZ2VcclxuICAgICAgICAgICAgICAgICAgICBpZiAocXVlcnlTdHJpbmcubiAhPT0gbG9jYXRpb24ubm9ydGgudG9TdHJpbmcoKSB8fCBxdWVyeVN0cmluZy5zICE9PSBsb2NhdGlvbi5zb3V0aC50b1N0cmluZygpIHx8IHF1ZXJ5U3RyaW5nLmUgIT09IGxvY2F0aW9uLmVhc3QudG9TdHJpbmcoKSB8fCBxdWVyeVN0cmluZy53ICE9PSBsb2NhdGlvbi53ZXN0LnRvU3RyaW5nKCkgfHwgcXVlcnlTdHJpbmcubG9jYXRpb25Gb3JtYXQgIT09IGxvY2F0aW9uLmZvcm1hdCB8fCBxdWVyeVN0cmluZy5uZSAhPT0gbG9jYXRpb24ubWdyc05FLnRvU3RyaW5nKCkgfHwgcXVlcnlTdHJpbmcuc3cgIT09IGxvY2F0aW9uLm1ncnNTVy50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsb2NhdGlvbi5ub3J0aCAhPT0gJycgJiYgbG9jYXRpb24uc291dGggIT09ICcnICYmIGxvY2F0aW9uLmVhc3QgIT09ICcnICYmIGxvY2F0aW9uLndlc3QgIT09ICcnICYmIGxvY2F0aW9uLmZvcm1hdCA9PT0gJ2RkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubm9ydGggPSBwYXJzZUZsb2F0KGxvY2F0aW9uLm5vcnRoKS50b0ZpeGVkKDYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uc291dGggPSBwYXJzZUZsb2F0KGxvY2F0aW9uLnNvdXRoKS50b0ZpeGVkKDYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uZWFzdCA9IHBhcnNlRmxvYXQobG9jYXRpb24uZWFzdCkudG9GaXhlZCg2KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLndlc3QgPSBwYXJzZUZsb2F0KGxvY2F0aW9uLndlc3QpLnRvRml4ZWQoNik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXRNYXBCQm94KGxvY2F0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcubiA9IGxvY2F0aW9uLm5vcnRoID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5ub3J0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcucyA9IGxvY2F0aW9uLnNvdXRoID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5zb3V0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZSA9IGxvY2F0aW9uLmVhc3QgPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLmVhc3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLncgPSBsb2NhdGlvbi53ZXN0ID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi53ZXN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCA9IGxvY2F0aW9uLmZvcm1hdCA9PT0gJycgPyBudWxsIDogbG9jYXRpb24uZm9ybWF0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5uZSA9IGxvY2F0aW9uLm1ncnNORSA9PT0gJycgPyBudWxsIDogbG9jYXRpb24ubWdyc05FO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zdyA9IGxvY2F0aW9uLm1ncnNTVyA9PT0gJycgPyBudWxsIDogbG9jYXRpb24ubWdyc1NXO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnNldExvY2F0aW9uRm9ybWF0KHF1ZXJ5U3RyaW5nLmxvY2F0aW9uRm9ybWF0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRHb3RvRXhwYW5kZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBnb3RvRXhwYW5kZWQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEdvdG9FeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGdvdG9FeHBhbmRlZCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldExvY2F0aW9uRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbkZpbHRlckV4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRMb2NhdGlvbkZpbHRlckV4cGFuZGVkOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgbG9jYXRpb25GaWx0ZXJFeHBhbmRlZCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFJlY2VudEV2ZW50TGlzdEV4cGFuZGVkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjZW50RXZlbnRMaXN0RXhwYW5kZWQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFJlY2VudEV2ZW50TGlzdEV4cGFuZGVkOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcmVjZW50RXZlbnRMaXN0RXhwYW5kZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRUZW1wb3JhbEZpbHRlckV4cGFuZGVkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGVtcG9yYWxGaWx0ZXJFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0VGVtcG9yYWxGaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyRXhwYW5kZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRTb3VyY2VGaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZUZpbHRlckV4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRTb3VyY2VGaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHNvdXJjZUZpbHRlckV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0VHlwZUZpbHRlckV4cGFuZGVkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUZpbHRlckV4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRUeXBlRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlRmlsdGVyRXhwYW5kZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRFdmVudEZpbHRlcnNFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50RmlsdGVyc0V4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRFdmVudEZpbHRlcnNFeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50RmlsdGVyc0V4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0QWRtaW5FeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFkbWluRXhwYW5kZWQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEFkbWluRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBhZG1pbkV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0TWFwQkJveDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hcEJCb3g7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldE1hcEJCb3g6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgICAgICAgIG1hcEJCb3ggPSB2YWw7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldE1hcFpvb206IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtYXBab29tO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRNYXBab29tOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgbWFwWm9vbSA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy56b29tID0gbWFwWm9vbTtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0TWFwQ2VudGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFwQ2VudGVyO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRNYXBDZW50ZXI6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBtYXBDZW50ZXIgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMb2NhdGlvbkZvcm1hdDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uRm9ybWF0O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRMb2NhdGlvbkZvcm1hdDogZnVuY3Rpb24gKGZvcm1hdCkge1xyXG4gICAgICAgICAgICAgICAgbG9jYXRpb25Gb3JtYXQgPSBmb3JtYXQ7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCA9IGxvY2F0aW9uRm9ybWF0O1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRNYXBCb3VuZHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtYXBCb3VuZHM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldE1hcEJvdW5kczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIG1hcEJvdW5kcyA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1hcEJCb3hQYXJhbXMoe1xyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDogdGhpcy5sb2NhdGlvbkZvcm1hdCxcclxuICAgICAgICAgICAgICAgICAgICBub3J0aDogbWFwQm91bmRzLmdldE5vcnRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgc291dGg6IG1hcEJvdW5kcy5nZXRTb3V0aCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGVhc3Q6IG1hcEJvdW5kcy5nZXRFYXN0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgd2VzdDogbWFwQm91bmRzLmdldFdlc3QoKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFRlbXBvcmFsRmlsdGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGVtcG9yYWxGaWx0ZXI7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyOiBmdW5jdGlvbiAoZmlsdGVyKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcXNGaWx0ZXIgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHF1ZXJ5U3RyaW5nLnN0YXJ0LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0b3A6IHF1ZXJ5U3RyaW5nLnN0b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IHF1ZXJ5U3RyaW5nLmR1cmF0aW9uID8gcXVlcnlTdHJpbmcuZHVyYXRpb24gOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uTGVuZ3RoOiBxdWVyeVN0cmluZy5kdXJhdGlvbkxlbmd0aCA/IHBhcnNlSW50KHF1ZXJ5U3RyaW5nLmR1cmF0aW9uTGVuZ3RoKSA6IG51bGxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB2YXIgZmlsdGVyU3RhcnQgPSAnJyxcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdG9wID0gJyc7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXIuZXF1YWxzKHFzRmlsdGVyLCBmaWx0ZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbHRlci5kdXJhdGlvbiAmJiBmaWx0ZXIuZHVyYXRpb25MZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RhcnQgPSBtb21lbnQudXRjKCkuc3VidHJhY3QoZmlsdGVyLmR1cmF0aW9uTGVuZ3RoLCBmaWx0ZXIuZHVyYXRpb24pLnN0YXJ0T2YoJ2QnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RvcCA9IG1vbWVudC51dGMoKS5lbmRPZignZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zdGFydCA9IGZpbHRlclN0YXJ0LnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnN0b3AgPSBmaWx0ZXJTdG9wLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmR1cmF0aW9uID0gZmlsdGVyLmR1cmF0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5kdXJhdGlvbkxlbmd0aCA9IGZpbHRlci5kdXJhdGlvbkxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdGFydCA9IG1vbWVudC51dGMoZmlsdGVyLnN0YXJ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RvcCA9IG1vbWVudC51dGMoZmlsdGVyLnN0b3ApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zdGFydCA9IGZpbHRlclN0YXJ0LnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnN0b3AgPSBmaWx0ZXJTdG9wLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmR1cmF0aW9uID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZHVyYXRpb25MZW5ndGggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIuc3RhcnQgPSBmaWx0ZXJTdGFydC50b0RhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIuc3RvcCA9IGZpbHRlclN0b3AudG9EYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXIgPSBmaWx0ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRlbXBvcmFsRmlsdGVyLnN0YXJ0IHx8ICF0ZW1wb3JhbEZpbHRlci5zdG9wKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyID0gZmlsdGVyO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0QmFzZWxheWVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYmFzZWxheWVyO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRCYXNlbGF5ZXI6IGZ1bmN0aW9uIChsYXllcikge1xyXG4gICAgICAgICAgICAgICAgYmFzZWxheWVyID0gbGF5ZXI7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5iYXNlbGF5ZXIgPSBiYXNlbGF5ZXIuaWQ7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldE92ZXJsYXlzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb3ZlcmxheXM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldE92ZXJsYXlzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgb3ZlcmxheXMgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcub3ZlcmxheXMgPSBvdmVybGF5cztcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vmlld3BvcnRTaXplOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmlld3BvcnRTaXplO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRWaWV3cG9ydFNpemU6IGZ1bmN0aW9uIChzaXplKSB7XHJcbiAgICAgICAgICAgICAgICB2aWV3cG9ydFNpemUgPSBzaXplO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRBY3RpdmVTb3VyY2VzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWN0aXZlU291cmNlcztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0QWN0aXZlU291cmNlczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGFjdGl2ZVNvdXJjZXMgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgdmFyIHNvdXJjZVN0cmluZyA9IF8ubWFwKGFjdGl2ZVNvdXJjZXMsICduYW1lJykuam9pbignLCcpO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc291cmNlcyA9IHNvdXJjZVN0cmluZyAhPT0gJycgPyBzb3VyY2VTdHJpbmcgOiBudWxsO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRBY3RpdmVUeXBlczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjdGl2ZVR5cGVzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRBY3RpdmVUeXBlczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGFjdGl2ZVR5cGVzID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHZhciB0eXBlU3RyaW5nID0gXy5tYXAoYWN0aXZlVHlwZXMsICduYW1lJykuam9pbignLCcpO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcudHlwZXMgPSB0eXBlU3RyaW5nICE9PSAnJyA/IHR5cGVTdHJpbmcgOiBudWxsO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRFdmVudHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudHM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEV2ZW50czogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50cyA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEFjdGl2ZUV2ZW50OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWN0aXZlRXZlbnQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEFjdGl2ZUV2ZW50OiBmdW5jdGlvbiAoZGF0YSwgaXNNYXBDbGljaykge1xyXG4gICAgICAgICAgICAgICAgaXNNYXBDbGljayA9IGlzTWFwQ2xpY2sgfHwgZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBjZW50ZXJPbkFjdGl2ZUV2ZW50ID0gIWlzTWFwQ2xpY2s7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmVFdmVudCA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZ1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID0gZGF0YSA/IGRhdGEucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdIDogbnVsbDtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPSBkYXRhID8gZGF0YS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gOiBudWxsO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRDZW50ZXJPbkFjdGl2ZUV2ZW50OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY2VudGVyT25BY3RpdmVFdmVudDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Q2VudGVyT25BY3RpdmVFdmVudDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGNlbnRlck9uQWN0aXZlRXZlbnQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRFdmVudExheWVyczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50TGF5ZXJzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRFdmVudExheWVyczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50TGF5ZXJzID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0U291cmNlVHlwZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZVR5cGU7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFNvdXJjZVR5cGU6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBzb3VyY2VUeXBlID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnNvdXJjZVR5cGUgPSBzb3VyY2VUeXBlO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRFdmVudERhdGE6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudERhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEV2ZW50RGF0YTogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50RGF0YSA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldExheW91dENvbmZpZzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGF5b3V0Q29uZmlnO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRMYXlvdXRDb25maWc6IGZ1bmN0aW9uKGNvbmZpZykge1xyXG4gICAgICAgICAgICAgICAgbGF5b3V0Q29uZmlnID0gY29uZmlnO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMYXlvdXRDb21wb25lbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGF5b3V0Q29tcG9uZW50cztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TGF5b3V0Q29tcG9uZW50czogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGxheW91dENvbXBvbmVudHMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMb2FkaW5nRXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9hZGluZ0V2ZW50cztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TG9hZGluZ0V2ZW50czogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGxvYWRpbmdFdmVudHMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3RlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZvdGVyO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRWb3RlcjogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHZvdGVyID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2b3RlcztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Vm90ZXM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB2b3RlcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVSZWFzb25zOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdm90ZVJlYXNvbnM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFZvdGVSZWFzb25zOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdm90ZVJlYXNvbnMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRDb25maWRlbmNlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY29uZmlkZW5jZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Q29uZmlkZW5jZTogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZGVuY2UgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuY29uZmlkZW5jZSA9IGNvbmZpZGVuY2U7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldExvY2F0aW9uVW5jZXJ0YWludHk6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvblVuY2VydGFpbnR5O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRMb2NhdGlvblVuY2VydGFpbnR5OiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgbG9jYXRpb25VbmNlcnRhaW50eSA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5sb2NhdGlvblVuY2VydGFpbnR5ID0gbG9jYXRpb25VbmNlcnRhaW50eTtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0SW50ZW5zaXR5OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaW50ZW5zaXR5O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRJbnRlbnNpdHk6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBpbnRlbnNpdHkgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuaW50ZW5zaXR5TWluID0gaW50ZW5zaXR5Lm1pbjtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmludGVuc2l0eU1heCA9IGludGVuc2l0eS5tYXg7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFNucjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNucjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0U25yOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgc25yID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnNuck1pbiA9IHNuci5taW47XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zbnJNYXggPSBzbnIubWF4O1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXREdXJhdGlvbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGR1cmF0aW9uO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXREdXJhdGlvbjogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmR1cmF0aW9uTWluID0gZHVyYXRpb24ubWluO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZHVyYXRpb25NYXggPSBkdXJhdGlvbi5tYXg7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldE9ubHlDb3JyZWxhdGlvbnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvbmx5Q29ycmVsYXRpb25zO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRPbmx5Q29ycmVsYXRpb25zOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5vbmx5Q29ycmVsYXRpb25zID0gb25seUNvcnJlbGF0aW9ucztcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Q291bnRyeUxpc3Q6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb3VudHJ5TGlzdDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Q291bnRyeUxpc3Q6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBjb3VudHJ5TGlzdCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldENvdW50cmllczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50cmllcztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Q291bnRyaWVzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgY291bnRyaWVzID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmNvdW50cmllcyA9IGNvdW50cmllcztcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0U2Vuc29yTGlzdDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbnNvckxpc3Q7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFNlbnNvckxpc3Q6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBzZW5zb3JMaXN0ID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0U2Vuc29yczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbnNvcnM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFNlbnNvcnM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBzZW5zb3JzID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnNlbnNvcnMgPSBzZW5zb3JzO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRGaWx0ZXJTdHJhdGVneTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlclN0cmF0ZWd5O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRGaWx0ZXJTdHJhdGVneTogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5ID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmZpbHRlclN0cmF0ZWd5ID0gZmlsdGVyU3RyYXRlZ3k7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFN0cmlrZVZpc2liaWxpdHk6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzdHJpa2VWaXNpYmlsaXR5O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRTdHJpa2VWaXNpYmlsaXR5OiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgc3RyaWtlVmlzaWJpbGl0eSA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zdHJpa2VWaXNpYmlsaXR5ID0gc3RyaWtlVmlzaWJpbGl0eTtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Rk1WRmlsdGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZm12RmlsdGVyO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRGTVZGaWx0ZXI6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBmbXZGaWx0ZXIgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZm12RmlsdGVyID0gZm12RmlsdGVyO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRGTVZMYXllcnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmbXZMYXllcnM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEZNVkxheWVyczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGZtdkxheWVycyA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVGaWx0ZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2b3RlRmlsdGVyO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRWb3RlRmlsdGVyOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdm90ZUZpbHRlciA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy52b3RlRmlsdGVyID0gdm90ZUZpbHRlcjtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZUZpbHRlclR5cGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2b3RlRmlsdGVyVHlwZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Vm90ZUZpbHRlclR5cGU6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB2b3RlRmlsdGVyVHlwZSA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy52b3RlRmlsdGVyVHlwZSA9IHZvdGVGaWx0ZXJUeXBlO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3RlZEV2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZvdGVkRXZlbnRzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRWb3RlZEV2ZW50czogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHZvdGVkRXZlbnRzID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0VG90YWxWb3RlczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsVm90ZXM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFRvdGFsVm90ZXM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB0b3RhbFZvdGVzID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnRvdGFsVm90ZXMgPSB0b3RhbFZvdGVzO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRTb3J0Q29uZmlnOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc29ydENvbmZpZztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0U29ydENvbmZpZzogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHNvcnRDb25maWcgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgY3VyclNvcnQgPSBfLmZpbmQoc29ydENvbmZpZywgeyBlbmFibGVkOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc29ydENvbHVtbiA9IGN1cnJTb3J0LmNvbHVtbjtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnNvcnREaXJlY3Rpb24gPSBjdXJyU29ydC5kaXJlY3Rpb247XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEFsZXJ0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWxlcnQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEFsZXJ0OiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBhbGVydCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldElzQWRtaW46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpc0FkbWluO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRJc0FkbWluOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgaXNBZG1pbiA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFBvbGw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwb2xsO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRQb2xsOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcG9sbCA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5wb2xsID0gcG9sbDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxufSkoKTtcclxuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5zZXJ2aWNlKCd2b3RlU2VydmljZScsIGZ1bmN0aW9uIChcclxuICAgICAgICAkaHR0cCxcclxuICAgICAgICAkcSxcclxuICAgICAgICBlcmlzQ29uZmlnXHJcbiAgICApIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBnZXRSZWFzb25zOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy9yZWFzb25zJ1xyXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3RlcnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL3ZvdGVycydcclxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL3ZvdGVycy92b3RlcidcclxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYWRkVm90ZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL3ZvdGVycycpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZXM6IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtcyA9IHBhcmFtcyB8fCBudWxsO1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvdm90ZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogcGFyYW1zXHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVzQnlWb3RlcjogZnVuY3Rpb24gKHZvdGVyX25hbWUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL3ZvdGVzL3ZvdGVyLycgKyB2b3Rlcl9uYW1lXHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVCeUlkOiBmdW5jdGlvbiAodm90ZV9pZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvdm90ZXMvJyArIHZvdGVfaWRcclxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY2FzdFZvdGU6IGZ1bmN0aW9uICh2b3RlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy92b3RlcycsIHZvdGUpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdXBkYXRlVm90ZTogZnVuY3Rpb24gKHZvdGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cC5wdXQoZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvdm90ZXMvJyArIHZvdGUudm90ZV9pZCwgdm90ZSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWxldGVWb3RlOiBmdW5jdGlvbiAodm90ZV9pZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwLmRlbGV0ZShlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy92b3Rlcy8nICsgdm90ZV9pZCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ2FkbWluQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICBtb21lbnQsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgYWxlcnRTZXJ2aWNlXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXM7XG5cbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0uYWxlcnRJZCA9IG51bGw7XG4gICAgICAgIHZtLmFsZXJ0Q2xhc3MgPSBudWxsO1xuICAgICAgICB2bS5hbGVydE1lc3NhZ2UgPSBudWxsO1xuICAgICAgICB2bS5hbGVydElzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHZtLnR5cGVzID0gW3tcbiAgICAgICAgICAgIGxhYmVsOiAnV2FybmluZycsXG4gICAgICAgICAgICB2YWx1ZTogJ21kLXdhcm4nXG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIGxhYmVsOiAnSW5mbycsXG4gICAgICAgICAgICB2YWx1ZTogJ21kLWFjY2VudCdcbiAgICAgICAgfV07XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBZG1pbkV4cGFuZGVkKHZtLmV4cGFuZGVkKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS51cGRhdGVBbGVydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhbGVydCA9IHtcbiAgICAgICAgICAgICAgICBhbGVydF9pZDogdm0uYWxlcnRJZCxcbiAgICAgICAgICAgICAgICBjbGFzczogdm0uYWxlcnRDbGFzcyxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiB2bS5hbGVydE1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgc3RhcnRlZDogbnVsbCxcbiAgICAgICAgICAgICAgICBlbmRlZDogbnVsbCxcbiAgICAgICAgICAgICAgICBpc19hY3RpdmU6IHZtLmFsZXJ0SXNBY3RpdmVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh2bS5hbGVydElkKSB7XG4gICAgICAgICAgICAgICAgYWxlcnRTZXJ2aWNlLnVwZGF0ZUFsZXJ0KGFsZXJ0KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFsZXJ0KGFsZXJ0KTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFsZXJ0U2VydmljZS5hZGRBbGVydChhbGVydCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBbGVydChhbGVydCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QWxlcnQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0uYWxlcnRJZCA9IG5ld1ZhbHVlLmFsZXJ0X2lkIHx8IG51bGw7XG4gICAgICAgICAgICB2bS5hbGVydENsYXNzID0gbmV3VmFsdWUuY2xhc3MgfHwgbnVsbDtcbiAgICAgICAgICAgIHZtLmFsZXJ0TWVzc2FnZSA9IG5ld1ZhbHVlLm1lc3NhZ2UgfHwgbnVsbDtcbiAgICAgICAgICAgIHZtLmFsZXJ0SXNBY3RpdmUgPSBuZXdWYWx1ZS5pc19hY3RpdmUgfHwgZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuZGlyZWN0aXZlKCdlcmlzQWRtaW4nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvYWRtaW4vYWRtaW5UZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdhZG1pbkNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCdhbGVydENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBhbGVydFNlcnZpY2UsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIGluaXRpYWxpemVkID0gZmFsc2U7XG5cbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5hbGVydCA9IG51bGw7XG4gICAgICAgIHZtLmNsb3NlSWNvbiA9ICc8aSBjbGFzcz1cImZhIGZhLXJlbW92ZVwiPjwvaT4nO1xuICAgICAgICB2bS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmFsZXJ0LmNsYXNzID0gJ2hpZGUnO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYWxlcnRTZXJ2aWNlLmdldEFsZXJ0cygpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuZGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmFsZXJ0ID0gXy5vcmRlckJ5KHJlc3VsdC5kYXRhLCBbJ2FsZXJ0X2lkJ10sIFsnZGVzYyddKVswXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFsZXJ0KHZtLmFsZXJ0KTtcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRBbGVydCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2bS5hbGVydCA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmRpcmVjdGl2ZSgnZXJpc0FsZXJ0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2FsZXJ0L2FsZXJ0VGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnYWxlcnRDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcignZXZlbnRGaWx0ZXJzQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgICR0aW1lb3V0LFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGVyaXNDb25maWcsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpLFxuICAgICAgICAgICAgZmlsdGVyU3RyYXRlZ3kgPSBxcy5maWx0ZXJTdHJhdGVneSA/IHFzLmZpbHRlclN0cmF0ZWd5IDogZXJpc0NvbmZpZy5maWx0ZXJTdHJhdGVneTtcblxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0uY29uZmlkZW5jZSA9IF8uY2xvbmUoZXJpc0NvbmZpZy5kZWZhdWx0Q29uZmlkZW5jZSk7XG4gICAgICAgIHZtLmxvY2F0aW9uVW5jZXJ0YWludHkgPSBfLmNsb25lKGVyaXNDb25maWcuZGVmYXVsdExvY2F0aW9uVW5jZXJ0YWludHkpO1xuICAgICAgICB2bS5pbnRlbnNpdHkgPSB7XG4gICAgICAgICAgICBtaW46IF8uY2xvbmUoZXJpc0NvbmZpZy5pbnRlbnNpdHlGbG9vcikgLyAxMDAwLFxuICAgICAgICAgICAgbWF4OiBfLmNsb25lKGVyaXNDb25maWcuaW50ZW5zaXR5Q2VpbGluZykgLyAxMDAwXG4gICAgICAgIH07XG4gICAgICAgIHZtLnNuciA9IHtcbiAgICAgICAgICAgIG1pbjogXy5jbG9uZShlcmlzQ29uZmlnLnNuckZsb29yKSxcbiAgICAgICAgICAgIG1heDogXy5jbG9uZShlcmlzQ29uZmlnLnNuckNlaWxpbmcpXG4gICAgICAgIH07XG4gICAgICAgIHZtLmR1cmF0aW9uID0ge1xuICAgICAgICAgICAgbWluOiBfLmNsb25lKGVyaXNDb25maWcuZHVyYXRpb25GbG9vciksXG4gICAgICAgICAgICBtYXg6IF8uY2xvbmUoZXJpc0NvbmZpZy5kdXJhdGlvbkNlaWxpbmcpXG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudEZpbHRlcnNFeHBhbmRlZCh2bS5leHBhbmRlZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAocXMuY29uZmlkZW5jZSkge1xuICAgICAgICAgICAgICAgIHZtLmNvbmZpZGVuY2UgPSBwYXJzZUZsb2F0KHFzLmNvbmZpZGVuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldENvbmZpZGVuY2Uodm0uY29uZmlkZW5jZSk7XG4gICAgICAgICAgICBpZiAocXMubG9jYXRpb25VbmNlcnRhaW50eSkge1xuICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uVW5jZXJ0YWludHkgPSBwYXJzZUludChxcy5sb2NhdGlvblVuY2VydGFpbnR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2NhdGlvblVuY2VydGFpbnR5KHZtLmxvY2F0aW9uVW5jZXJ0YWludHkpO1xuICAgICAgICAgICAgdmFyIGluaXRJbnRlbnNpdHkgPSBfLmNsb25lKHZtLmludGVuc2l0eSk7XG4gICAgICAgICAgICBpZiAocXMuaW50ZW5zaXR5TWluKSB7XG4gICAgICAgICAgICAgICAgdm0uaW50ZW5zaXR5Lm1pbiA9IHBhcnNlRmxvYXQocXMuaW50ZW5zaXR5TWluKSAvIDEwMDA7XG4gICAgICAgICAgICAgICAgaW5pdEludGVuc2l0eS5taW4gPSBwYXJzZUZsb2F0KHFzLmludGVuc2l0eU1pbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluaXRJbnRlbnNpdHkubWluID0gaW5pdEludGVuc2l0eS5taW4gKiAxMDAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHFzLmludGVuc2l0eU1heCkge1xuICAgICAgICAgICAgICAgIHZtLmludGVuc2l0eS5tYXggPSBwYXJzZUZsb2F0KHFzLmludGVuc2l0eU1heCkgLyAxMDAwO1xuICAgICAgICAgICAgICAgIGluaXRJbnRlbnNpdHkubWF4ID0gcGFyc2VGbG9hdChxcy5pbnRlbnNpdHlNYXgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbml0SW50ZW5zaXR5Lm1heCA9IGluaXRJbnRlbnNpdHkubWF4ICogMTAwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRJbnRlbnNpdHkoaW5pdEludGVuc2l0eSk7XG4gICAgICAgICAgICBpZiAocXMuc25yTWluKSB7XG4gICAgICAgICAgICAgICAgdm0uc25yLm1pbiA9IHBhcnNlRmxvYXQocXMuc25yTWluKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChxcy5zbnJNYXgpIHtcbiAgICAgICAgICAgICAgICB2bS5zbnIubWF4ID0gcGFyc2VGbG9hdChxcy5zbnJNYXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFNucih2bS5zbnIpO1xuICAgICAgICAgICAgaWYgKHFzLmR1cmF0aW9uTWluKSB7XG4gICAgICAgICAgICAgICAgdm0uZHVyYXRpb24ubWluID0gcGFyc2VJbnQocXMuZHVyYXRpb25NaW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHFzLmR1cmF0aW9uTWF4KSB7XG4gICAgICAgICAgICAgICAgdm0uZHVyYXRpb24ubWF4ID0gcGFyc2VJbnQocXMuZHVyYXRpb25NYXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldER1cmF0aW9uKHZtLmR1cmF0aW9uKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldEZpbHRlclN0cmF0ZWd5KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5ID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLmNvbmZpZGVuY2UnLCBfLmRlYm91bmNlKGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRDb25maWRlbmNlKHBhcnNlRmxvYXQobmV3VmFsdWUpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicgPyA1MDAgOiA1MCkpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLmxvY2F0aW9uVW5jZXJ0YWludHknLCBfLmRlYm91bmNlKGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2NhdGlvblVuY2VydGFpbnR5KHBhcnNlSW50KG5ld1ZhbHVlKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInID8gNTAwIDogNTApKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uaW50ZW5zaXR5JywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZS5taW4gPj0gbmV3VmFsdWUubWF4KSB7XG4gICAgICAgICAgICAgICAgbmV3VmFsdWUubWluID0gbmV3VmFsdWUubWF4IC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZS5tYXggPD0gbmV3VmFsdWUubWluKSB7XG4gICAgICAgICAgICAgICAgbmV3VmFsdWUubWF4ID0gbmV3VmFsdWUubWluICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBuZXdJbnRlbnNpdHkgPSB7XG4gICAgICAgICAgICAgICAgbWluOiBuZXdWYWx1ZS5taW4gKiAxMDAwLFxuICAgICAgICAgICAgICAgIG1heDogbmV3VmFsdWUubWF4ICogMTAwMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0SW50ZW5zaXR5KG5ld0ludGVuc2l0eSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInID8gNTAwIDogNTApKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc25yJywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZS5taW4gPj0gbmV3VmFsdWUubWF4KSB7XG4gICAgICAgICAgICAgICAgbmV3VmFsdWUubWluID0gbmV3VmFsdWUubWF4IC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZS5tYXggPD0gbmV3VmFsdWUubWluKSB7XG4gICAgICAgICAgICAgICAgbmV3VmFsdWUubWF4ID0gbmV3VmFsdWUubWluICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U25yKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicgPyA1MDAgOiA1MCkpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5kdXJhdGlvbicsIF8uZGVib3VuY2UoZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUubWluID49IG5ld1ZhbHVlLm1heCkge1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLm1pbiA9IG5ld1ZhbHVlLm1heCAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUubWF4IDw9IG5ld1ZhbHVlLm1pbikge1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLm1heCA9IG5ld1ZhbHVlLm1pbiArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldER1cmF0aW9uKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicgPyA1MDAgOiA1MCkpO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuZGlyZWN0aXZlKCdlcmlzRXZlbnRGaWx0ZXJzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2V2ZW50RmlsdGVycy9ldmVudEZpbHRlcnNUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdldmVudEZpbHRlcnNDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcignZXZlbnRWaWV3ZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRxLFxuICAgICAgICAkdGltZW91dCxcbiAgICAgICAgJHdpbmRvdyxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICAkbWREaWFsb2csXG4gICAgICAgICRtZFRvYXN0LFxuICAgICAgICBlcmlzQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIHNlYXJjaFNlcnZpY2UsXG4gICAgICAgIGZtdlNlcnZpY2UsXG4gICAgICAgIHZvdGVTZXJ2aWNlLFxuICAgICAgICBWb3RlLFxuICAgICAgICBXZWJ3b3JrZXIsXG4gICAgICAgIG1vbWVudCxcbiAgICAgICAgaG90a2V5cyxcbiAgICAgICAgbGVhZmxldERhdGEsXG4gICAgICAgIGMzLFxuICAgICAgICBkMyxcbiAgICAgICAgTCxcbiAgICAgICAgXyxcbiAgICAgICAgQmxvYixcbiAgICAgICAgVVJMXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBldmVudFZpZXdlckxheW91dENvbXBvbmVudCA9IG51bGwsXG4gICAgICAgICAgICBjaGFydFdvcmtlcixcbiAgICAgICAgICAgIHBsb3REYXRhLFxuICAgICAgICAgICAgY2hhcnREYXRhLFxuICAgICAgICAgICAgZnJhbWVEYXRhLFxuICAgICAgICAgICAgYW5pbWF0ZSxcbiAgICAgICAgICAgIHBsYXliYWNrRnJhbWVzLFxuICAgICAgICAgICAgY2hhcnQsXG4gICAgICAgICAgICBoYXNDb3JyZWxhdGlvbixcbiAgICAgICAgICAgIGZyYW1lSWR4LFxuICAgICAgICAgICAgY29ycmVsYXRpbmdEYXRlRGlmZixcbiAgICAgICAgICAgIGNoYXJ0Rm9jdXMsXG4gICAgICAgICAgICBjaGFydENvbG9ycyxcbiAgICAgICAgICAgIGRlZmF1bHRQbG90RGF0YSxcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nUGxvdERhdGEsXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0V2ZW50RGF0YSxcbiAgICAgICAgICAgIGZyYW1lTWluVmFsLFxuICAgICAgICAgICAgZnJhbWVNYXhWYWwsXG4gICAgICAgICAgICBmcmFtZVJhbmdlLFxuICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZU1pblZhbCxcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVNYXhWYWwsXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lUmFuZ2UsXG4gICAgICAgICAgICBzY2FsZURhdGEsXG4gICAgICAgICAgICBmbXZMYXllcnM7XG5cbiAgICAgICAgdm0uZXZlbnRWaWV3ZXJIZWlnaHQgPSAnJztcbiAgICAgICAgdm0uZXZlbnRWaWV3ZXJXaWR0aCA9ICcnO1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2hhcnRXb3JrZXIgPSBudWxsO1xuICAgICAgICAgICAgcGxvdERhdGEgPSBbXTtcbiAgICAgICAgICAgIGNoYXJ0RGF0YSA9IG51bGw7XG4gICAgICAgICAgICBmcmFtZURhdGEgPSBbXTtcbiAgICAgICAgICAgIGFuaW1hdGUgPSBudWxsO1xuICAgICAgICAgICAgcGxheWJhY2tGcmFtZXMgPSBbXTtcbiAgICAgICAgICAgIGNoYXJ0ID0gbnVsbDtcbiAgICAgICAgICAgIGhhc0NvcnJlbGF0aW9uID0gZmFsc2U7XG4gICAgICAgICAgICBmcmFtZUlkeCA9IDA7XG4gICAgICAgICAgICBjb3JyZWxhdGluZ0RhdGVEaWZmID0gbnVsbDtcbiAgICAgICAgICAgIGNoYXJ0Rm9jdXMgPSBudWxsO1xuICAgICAgICAgICAgY2hhcnRDb2xvcnMgPSB7fTtcbiAgICAgICAgICAgIGRlZmF1bHRQbG90RGF0YSA9IG51bGw7XG4gICAgICAgICAgICBjb3JyZWxhdGluZ1Bsb3REYXRhID0gbnVsbDtcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nRXZlbnREYXRhID0gbnVsbDtcbiAgICAgICAgICAgIGZyYW1lTWluVmFsID0gbnVsbDtcbiAgICAgICAgICAgIGZyYW1lTWF4VmFsID0gbnVsbDtcbiAgICAgICAgICAgIGZyYW1lUmFuZ2UgPSBudWxsO1xuICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZU1pblZhbCA9IG51bGw7XG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWF4VmFsID0gbnVsbDtcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVSYW5nZSA9IG51bGw7XG4gICAgICAgICAgICBzY2FsZURhdGEgPSBudWxsO1xuICAgICAgICAgICAgZm12TGF5ZXJzID0gbmV3IEwuZmVhdHVyZUdyb3VwKCk7XG5cbiAgICAgICAgICAgIHZtLl8gPSBfO1xuICAgICAgICAgICAgdm0uZXJpc0NvbmZpZyA9IGVyaXNDb25maWc7XG4gICAgICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgICAgICB2bS5ldmVudERhdGEgPSBudWxsO1xuICAgICAgICAgICAgdm0ubG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICB2bS5sb2FkaW5nU2NhbGVEYXRhID0gbnVsbDtcbiAgICAgICAgICAgIHZtLmxvYWRpbmdTdGF0dXMgPSBudWxsO1xuICAgICAgICAgICAgdm0ubG9hZGluZ0dpZiA9IG51bGw7XG4gICAgICAgICAgICB2bS5sb2FkaW5nQ29ycmVsYXRlZEdpZiA9IG51bGw7XG4gICAgICAgICAgICB2bS5zZWxlY3RlZEZlYXR1cmUgPSBudWxsO1xuICAgICAgICAgICAgdm0uZXZlbnRFcnJvciA9IG51bGw7XG4gICAgICAgICAgICB2bS5zZW5zb3JzID0gbnVsbDtcbiAgICAgICAgICAgIHZtLmNoaXBDYXJkcyA9IFtdO1xuICAgICAgICAgICAgdm0uY29ycmVsYXRpbmdDaGlwQ2FyZHMgPSBbXTtcbiAgICAgICAgICAgIHZtLmF2YWlsYWJsZUNoaXBDYXJkcyA9IFtdO1xuICAgICAgICAgICAgdm0uYWN0aXZlQ2hpcENhcmQgPSBudWxsO1xuICAgICAgICAgICAgdm0uYWN0aXZlQ29ycmVsYXRpbmdDaGlwQ2FyZCA9IG51bGw7XG4gICAgICAgICAgICB2bS5wbGF5YmFja0RlbGF5ID0gMDtcbiAgICAgICAgICAgIHZtLnZvdGVyID0gc3RhdGVTZXJ2aWNlLmdldFZvdGVyKCk7XG4gICAgICAgICAgICB2bS52b3RlcyA9IHN0YXRlU2VydmljZS5nZXRWb3RlcygpO1xuICAgICAgICAgICAgdm0udm90ZVJlYXNvbnMgPSBzdGF0ZVNlcnZpY2UuZ2V0Vm90ZVJlYXNvbnMoKTtcbiAgICAgICAgICAgIHZtLmV2ZW50VHlwZXMgPSBfLmNsb25lKGVyaXNDb25maWcudHlwZXMpO1xuICAgICAgICAgICAgdm0udm90ZU9iaiA9IG5ldyBWb3RlKCk7XG4gICAgICAgICAgICB2bS5zY2FsZUpvYlVybCA9IG51bGw7XG4gICAgICAgICAgICB2bS5oNVVybCA9IG51bGw7XG4gICAgICAgICAgICB2bS5jb3JyZWxhdGVkSDVVcmwgPSBudWxsO1xuICAgICAgICAgICAgdm0uc2NhbGVGaWxlID0gbnVsbDtcbiAgICAgICAgICAgIHZtLnBsYXliYWNrU3RhdGUgPSB0cnVlO1xuICAgICAgICAgICAgdm0ucGxheWJhY2tEaXJlY3Rpb24gPSAnZm9yd2FyZCc7XG4gICAgICAgICAgICB2bS5ldmVudFByb3BzID0gW107XG4gICAgICAgICAgICB2bS5jb3JyZWxhdGVkRXZlbnRQcm9wcyA9IFtdO1xuICAgICAgICAgICAgdm0uaW50ZXJuYWxTb3VyY2UgPSBfLmZpbmQoZXJpc0NvbmZpZy5zb3VyY2VzLCB7IGlkZW50aXR5OiB0cnVlIH0pO1xuICAgICAgICAgICAgdm0uZXh0ZXJuYWxTb3VyY2UgPSBfLmZpbmQoZXJpc0NvbmZpZy5zb3VyY2VzLCB7IGlkZW50aXR5OiBmYWxzZSB9KTtcbiAgICAgICAgICAgIHZtLmxvYWRpbmdGTVYgPSBudWxsO1xuICAgICAgICAgICAgdm0uZm12UmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgdm0uY2hhcnRMb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgaG90S2V5c0NvbmZpZyA9IGhvdGtleXMuYmluZFRvKCRzY29wZSlcbiAgICAgICAgICAgICAgICAuYWRkKHtcbiAgICAgICAgICAgICAgICAgICAgY29tYm86ICdsZWZ0JyxcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZXdpbmQnLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNldFBsYXliYWNrRGlyZWN0aW9uKCdiYWNrd2FyZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuYWRkKHtcbiAgICAgICAgICAgICAgICAgICAgY29tYm86ICdyaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9yd2FyZCcsXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodm0uc2VsZWN0ZWRGZWF0dXJlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uc2V0UGxheWJhY2tEaXJlY3Rpb24oJ2ZvcndhcmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAndXAnLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BsYXkvUGF1c2UnLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNldFBsYXliYWNrU3RhdGUoIXZtLnBsYXliYWNrU3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuYWRkKHtcbiAgICAgICAgICAgICAgICAgICAgY29tYm86ICd3JyxcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVcHZvdGUnLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLnZvdGVVcChudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAnYScsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJldmlvdXMgRXZlbnQnLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzRXZlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAncycsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRG93bnZvdGUnLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLnZvdGVEb3duKG51bGwsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuYWRkKHtcbiAgICAgICAgICAgICAgICAgICAgY29tYm86ICdkJyxcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOZXh0IEV2ZW50JyxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0RXZlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAnZXNjJyxcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDbG9zZSBFdmVudCcsXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodm0uc2VsZWN0ZWRGZWF0dXJlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBhZGQgaG90a2V5cyBmb3IgZXZlbnQgdHlwZXNcbiAgICAgICAgICAgIF8uZm9yRWFjaCh2bS5ldmVudFR5cGVzLCBmdW5jdGlvbiAodHlwZSwgaWR4KSB7XG4gICAgICAgICAgICAgICAgaG90S2V5c0NvbmZpZy5hZGQoe1xuICAgICAgICAgICAgICAgICAgICBjb21ibzogKGlkeCArIDEpLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0eXBlLnRpdGxlLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLnZvdGVVcCh0eXBlLnZhbHVlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiAoY2hhcnQpID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZSBoYXMgbmV2ZXIgYmVlbiBjYWxsZWRcbiAgICAgICAgICAgIGluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkcmF3RnJhbWUgPSBmdW5jdGlvbiAoZnJhbWVBcnIpIHtcbiAgICAgICAgICAgIGlmIChwbGF5YmFja0ZyYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGZyYW1lQXJyLCBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNhbnZhcyA9IGFuZ3VsYXIuZWxlbWVudCgnLicgKyBfLnJlcGxhY2UoZnJhbWUuc2Vuc29yVGl0bGUsICcgJywgJycpKVswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNsZWFyIHByZXZpb3VzIGRyYXdpbmdcbiAgICAgICAgICAgICAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCB3aWR0aCBhbmQgaGVpZ2h0IHRvIG1hdGNoIGltYWdlXG4gICAgICAgICAgICAgICAgICAgIGN0eC5jYW52YXMuaGVpZ2h0ID0gZnJhbWUuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBjdHguY2FudmFzLndpZHRoID0gZnJhbWUud2lkdGg7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGEgcG9pbnRlciB0byB0aGUgY3VycmVudCBsb2NhdGlvbiBpbiB0aGUgZnJhbWUuXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYWxldHRlID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpOyAvL3gseSx3LGhcbiAgICAgICAgICAgICAgICAgICAgLy8gV3JhcCB5b3VyIGFycmF5IGFzIGEgVWludDhBcnJheVxuICAgICAgICAgICAgICAgICAgICBwYWxldHRlLmRhdGEuc2V0KGZyYW1lLnJnYmEpO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZXBvc3QgdGhlIGRhdGEuXG4gICAgICAgICAgICAgICAgICAgIGN0eC5wdXRJbWFnZURhdGEocGFsZXR0ZSwgMCwgMCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldEZyYW1lID0gZnVuY3Rpb24gKGZyYW1lQXJyKSB7XG4gICAgICAgICAgICBpZiAocGxheWJhY2tGcmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciByZXR1cm5GcmFtZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goZnJhbWVBcnIsIGZ1bmN0aW9uIChmcmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWZyYW1lLnJnYmEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZyYW1lIGhhcyBub3QgeWV0IGhhZCBhIFVpbnQ4QXJyYXkgY2FsY3VsYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZ2JhID0gXy5mbGF0TWFwKGZyYW1lLnZhbHVlcywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBmcmFtZS5pc0NvcnJlbGF0aW9uID8gdmFsdWUgLSBjb3JyZWxhdGluZ0ZyYW1lTWluVmFsIDogdmFsdWUgLSBmcmFtZU1pblZhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID49IDAgPyB2YWx1ZSA6IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBmcmFtZS5pc0NvcnJlbGF0aW9uID8gTWF0aC5yb3VuZCgodmFsdWUgLyBjb3JyZWxhdGluZ0ZyYW1lUmFuZ2UpICogMjU0LjApIDogTWF0aC5yb3VuZCgodmFsdWUgLyBmcmFtZVJhbmdlKSAqIDI1NC4wKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3ZhbHVlLCB2YWx1ZSwgdmFsdWUsIDI1NV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lLnJnYmEgPSBuZXcgVWludDhBcnJheShyZ2JhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm5GcmFtZXMucHVzaChmcmFtZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldHVybkZyYW1lcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdXBkYXRlRnJhbWVzVG9SZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZnJhbWVPYmogPSBfLmdyb3VwQnkoZnJhbWVEYXRhWzBdLnJlc3VsdHMsICdzZW5zb3InKSxcbiAgICAgICAgICAgICAgICBmcmFtZXNUb1JlbmRlciA9IGZyYW1lT2JqW3ZtLmFjdGl2ZUNoaXBDYXJkLnNlbnNvcl0sXG4gICAgICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZU9iaiA9IHt9LFxuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVzVG9SZW5kZXIgPSBbXTtcblxuICAgICAgICAgICAgaWYgKGhhc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZU9iaiA9IF8uZ3JvdXBCeShmcmFtZURhdGFbMV0ucmVzdWx0cywgJ3NlbnNvcicpO1xuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVzVG9SZW5kZXIgPSBjb3JyZWxhdGluZ0ZyYW1lT2JqW3ZtLmFjdGl2ZUNoaXBDYXJkLnNlbnNvcl07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSBtaW4sIG1heCwgYW5kIHJhbmdlIGZvciBib3RoIHNldHMgb2YgZnJhbWVzXG4gICAgICAgICAgICBmcmFtZU1pblZhbCA9IF8ubWluKF8ubWFwKGZyYW1lc1RvUmVuZGVyLCAnbWluJykpO1xuICAgICAgICAgICAgZnJhbWVNYXhWYWwgPSBfLm1heChfLm1hcChmcmFtZXNUb1JlbmRlciwgJ21heCcpKTtcbiAgICAgICAgICAgIGZyYW1lTWF4VmFsID0gZnJhbWVNaW5WYWwgPj0gMCA/IGZyYW1lTWF4VmFsIDogZnJhbWVNYXhWYWwgKyBNYXRoLmFicyhmcmFtZU1pblZhbCk7XG4gICAgICAgICAgICBmcmFtZU1pblZhbCA9IGZyYW1lTWluVmFsID49IDAgPyBmcmFtZU1pblZhbCA6IDA7XG4gICAgICAgICAgICBmcmFtZVJhbmdlID0gZnJhbWVNYXhWYWwgLSBmcmFtZU1pblZhbDtcbiAgICAgICAgICAgIGlmIChoYXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVNaW5WYWwgPSBfLm1pbihfLm1hcChjb3JyZWxhdGluZ0ZyYW1lc1RvUmVuZGVyLCAnbWluJykpO1xuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVNYXhWYWwgPSBfLm1heChfLm1hcChjb3JyZWxhdGluZ0ZyYW1lc1RvUmVuZGVyLCAnbWF4JykpO1xuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVNYXhWYWwgPSBjb3JyZWxhdGluZ0ZyYW1lTWluVmFsID49IDAgPyBjb3JyZWxhdGluZ0ZyYW1lTWF4VmFsIDogY29ycmVsYXRpbmdGcmFtZU1heFZhbCArIE1hdGguYWJzKGNvcnJlbGF0aW5nRnJhbWVNaW5WYWwpO1xuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVNaW5WYWwgPSBjb3JyZWxhdGluZ0ZyYW1lTWluVmFsID49IDAgPyBjb3JyZWxhdGluZ0ZyYW1lTWluVmFsIDogMDtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lUmFuZ2UgPSBjb3JyZWxhdGluZ0ZyYW1lTWF4VmFsIC0gY29ycmVsYXRpbmdGcmFtZU1pblZhbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY29tYmluZSBmcmFtZXMgc28gdGhlcmUncyBvbmx5IG9uZSBwbGF5YmFjayBzb3VyY2VcbiAgICAgICAgICAgIHBsYXliYWNrRnJhbWVzID0gXy5zb3J0QnkoXy51bmlvbihmcmFtZXNUb1JlbmRlciwgY29ycmVsYXRpbmdGcmFtZXNUb1JlbmRlciksICd0aW1lc3RhbXAnKTtcblxuICAgICAgICAgICAgLy8gYWRqdXN0IGluaXRpYWwgcGxheWJhY2sgc3BlZWQgYmFzZWQgb24gcGxheWJhY2tGcmFtZXMgbGVuZ3RoXG4gICAgICAgICAgICBpZiAocGxheWJhY2tGcmFtZXMubGVuZ3RoIDwgMjUpIHtcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0RlbGF5ID0gMTAwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGF5YmFja0ZyYW1lcy5sZW5ndGggPj0gMjUgJiYgcGxheWJhY2tGcmFtZXMubGVuZ3RoIDwgNTApIHtcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0RlbGF5ID0gNTA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBsYXliYWNrRnJhbWVzLmxlbmd0aCA+PSA1MCAmJiBwbGF5YmFja0ZyYW1lcy5sZW5ndGggPCAxMDApIHtcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0RlbGF5ID0gMjA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBsYXliYWNrRnJhbWVzLmxlbmd0aCA+PSAxMDAgJiYgcGxheWJhY2tGcmFtZXMubGVuZ3RoIDwgMjAwKSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEZWxheSA9IDEwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0RlbGF5ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdXBkYXRlQ2hhcnRGb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYXJ0Rm9jdXMgPSBbdm0uYWN0aXZlQ2hpcENhcmQuY2hhcnRJZF07XG4gICAgICAgICAgICBpZiAodm0uYWN0aXZlQ29ycmVsYXRpbmdDaGlwQ2FyZCkge1xuICAgICAgICAgICAgICAgIGNoYXJ0Rm9jdXMucHVzaCh2bS5hY3RpdmVDb3JyZWxhdGluZ0NoaXBDYXJkLmNoYXJ0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoYXJ0KSB7XG4gICAgICAgICAgICAgICAgY2hhcnQuZm9jdXMoY2hhcnRGb2N1cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHJlbmRlckZyYW1lcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBncmlkTGluZSA9IG51bGw7XG5cbiAgICAgICAgICAgIHVwZGF0ZUZyYW1lc1RvUmVuZGVyKCk7XG5cbiAgICAgICAgICAgIGFuaW1hdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsYXliYWNrRnJhbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdyaWRMaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBncmlkTGluZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGdyaWRMaW5lID0gZnJhbWVJZHggPCBwbGF5YmFja0ZyYW1lcyAtIDEgPyBhbmd1bGFyLmVsZW1lbnQoJy50aW1lLScgKyBfLnJlcGxhY2UocGxheWJhY2tGcmFtZXNbZnJhbWVJZHhdLnRpbWVzdGFtcCwgJy4nLCAnJykpWzBdIDogbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdyaWRMaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBncmlkTGluZS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGxheWJhY2tGcmFtZXNbZnJhbWVJZHhdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgbXVsdGlwbGUgZnJhbWVzIGhhdmUgdGhlIHNhbWUgdGltZXN0YW1wIHRoZW4gcGxheSB0aGVtIGFsbCBhdCB0aGUgc2FtZSB0aW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZyYW1lQXJyID0gXy5maWx0ZXIocGxheWJhY2tGcmFtZXMsIHt0aW1lc3RhbXA6IHBsYXliYWNrRnJhbWVzW2ZyYW1lSWR4XS50aW1lc3RhbXB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmF3RnJhbWUoZ2V0RnJhbWUoZnJhbWVBcnIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodm0ucGxheWJhY2tEaXJlY3Rpb24gPT09ICdmb3J3YXJkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IGZyYW1lSWR4ICsgZnJhbWVBcnIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnJhbWVJZHggPj0gcGxheWJhY2tGcmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IGZyYW1lSWR4IC0gZnJhbWVBcnIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnJhbWVJZHggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IHBsYXliYWNrRnJhbWVzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnBsYXliYWNrU3RhdGUgJiYgYW5pbWF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCB2bS5wbGF5YmFja0RlbGF5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBhbmltYXRlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldEV2ZW50Vm90ZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgZXZlbnQgPSBldmVudCB8fCB2bS5zZWxlY3RlZEZlYXR1cmU7XG4gICAgICAgICAgICBpZiAodm0udm90ZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBsb29rIGZvciBleGlzdGluZyB2b3RlIGZvciB0aGlzIGV2ZW50XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50Vm90ZSA9IF8uZmluZCh2bS52b3RlcywgeyBkYXRhc2V0X2lkOiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0sIHByb2R1Y3RfaWQ6IGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSB9KTtcbiAgICAgICAgICAgICAgICB2bS52b3RlT2JqID0gZXZlbnRWb3RlID8gVm90ZS50cmFuc2Zvcm1lcihldmVudFZvdGUpIDogbmV3IFZvdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBuZXh0RXZlbnQgKCkgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgIHZhciBldmVudHMgPSBfLm9yZGVyQnkoc3RhdGVTZXJ2aWNlLmdldEV2ZW50cygpLCBbJ3Byb3BlcnRpZXMuZXZlbnRfdGltZSddLCBbJ2Rlc2MnXSksXG4gICAgICAgICAgICAgICAgY3VycklkeCA9IF8uZmluZEluZGV4KGV2ZW50cywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID09PSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICYmIGUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID09PSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdO1xuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIG5leHRFdmVudCA9IGN1cnJJZHggPCAoZXZlbnRzLmxlbmd0aCAtIDEpID8gZXZlbnRzW2N1cnJJZHggKyAxXSA6IGV2ZW50c1swXTtcblxuICAgICAgICAgICAgZ2V0RXZlbnRWb3RlKG5leHRFdmVudCk7XG5cbiAgICAgICAgICAgIHdoaWxlKHZtLnZvdGVPYmoudm90ZV9pZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGN1cnJJZHgrKztcbiAgICAgICAgICAgICAgICBpZiAoY3VycklkeCA8IGV2ZW50cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRFdmVudCA9IGV2ZW50c1tjdXJySWR4ICsgMV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycklkeCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIG5leHRFdmVudCA9IGV2ZW50c1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZ2V0RXZlbnRWb3RlKG5leHRFdmVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5leHRFdmVudC5zY3JvbGxUbyA9IHRydWU7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlRXZlbnQobmV4dEV2ZW50LCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHByZXZpb3VzRXZlbnQgKCkgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgIHZhciBldmVudHMgPSBfLm9yZGVyQnkoc3RhdGVTZXJ2aWNlLmdldEV2ZW50cygpLCBbJ3Byb3BlcnRpZXMuZXZlbnRfdGltZSddLCBbJ2Rlc2MnXSksXG4gICAgICAgICAgICAgICAgY3VycklkeCA9IF8uZmluZEluZGV4KGV2ZW50cywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID09PSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICYmIGUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID09PSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdO1xuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIHByZXZpb3VzRXZlbnQgPSBjdXJySWR4ID4gMCA/IGV2ZW50c1tjdXJySWR4IC0gMV0gOiBfLmxhc3QoZXZlbnRzKTtcblxuICAgICAgICAgICAgZ2V0RXZlbnRWb3RlKHByZXZpb3VzRXZlbnQpO1xuXG4gICAgICAgICAgICB3aGlsZSh2bS52b3RlT2JqLnZvdGVfaWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjdXJySWR4LS07XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJJZHggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXZpb3VzRXZlbnQgPSBldmVudHNbY3VycklkeCAtIDFdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJJZHggPSBldmVudHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0V2ZW50ID0gXy5sYXN0KGV2ZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGdldEV2ZW50Vm90ZShwcmV2aW91c0V2ZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJldmlvdXNFdmVudC5zY3JvbGxUbyA9IHRydWU7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlRXZlbnQocHJldmlvdXNFdmVudCwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmb3JtYXRDaGFydERhdGEgKHBsb3REYXRhLCBjb3JyZWxhdGluZ0RhdGVEaWZmLCBiYXNlVXJsKSB7XG4gICAgICAgICAgICBpZiAoIWxvY2F0aW9uLm9yaWdpbikgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICBsb2NhdGlvbi5vcmlnaW4gPSBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0bmFtZSArIChsb2NhdGlvbi5wb3J0ID8gJzonICsgbG9jYXRpb24ucG9ydDogJycpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGltcG9ydFNjcmlwdHMobG9jYXRpb24ub3JpZ2luICsgYmFzZVVybCArICcvc2NyaXB0cy93ZWJ3b3JrZXJEZXBzL2xvZGFzaC5qcycpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxuICAgICAgICAgICAgdmFyIHBsb3RBcnIgPSBbXTtcbiAgICAgICAgICAgIF8uZm9yRWFjaChwbG90RGF0YSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGUgY29udmVudGlvbiBmb3IgYSBwb2ludCBpcyBhIDQgaXRlbSBhcnJheSBbdGltZSwgc2Vuc29yIGluZGV4LCBvYmplY3QgaW5kZXgsIGludGVuc2l0eV1cbiAgICAgICAgICAgICAgICBfLmZvckVhY2goZGF0YS5wb2ludHMsIGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcG9pbnREYXRhID0ge30sXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludFZhbHVlID0gcG9pbnRbM107XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gZm9ybWF0IHZhbHVlcyBmb3IgbG9nIHNjYWxlLiBzZXQgbmVnYXRpdmUgdmFsdWVzIHRvIG51bGxcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRWYWx1ZSA9IHBvaW50VmFsdWUgPCAwID8gbnVsbCA6IE1hdGgubG9nKHBvaW50VmFsdWUgKyAxKSAvIE1hdGguTE4xMDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5pc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBub3JtYWxpemUgdGltZSB2YWx1ZXMgaWYgYSBkaWZmZXJlbmNlIGluIHN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkYXRlcyBpcyBwcmVzZW50LiBjb3JyZWxhdGluZ0RhdGVEaWZmIHdpbGwgYmUgcG9zaXRpdmVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gdGhlIGNvcnJlbGF0aW5nIGV2ZW50IHN0YXJ0ZWQgdmFsdWUgaXMgbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoYW4gdGhlIGV2ZW50IHN0YXJ0ZWQgdmFsdWUsIGFuZCB2aWNlIHZlcnNhXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludERhdGEudGltZSA9IGNvcnJlbGF0aW5nRGF0ZURpZmYgPyBwb2ludFswXSAtIGNvcnJlbGF0aW5nRGF0ZURpZmYgOiBwb2ludFswXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFsd2F5cyB1c2UgdGhlIGdpdmVuIHRpbWUgdmFsdWUgZm9yIHRoZSBzZWxlY3RlZCBldmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnREYXRhLnRpbWUgPSBwb2ludFswXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwb2ludERhdGFbZGF0YS5zZW5zb3JzW3BvaW50WzFdXV0gPSBwb2ludFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBwb2ludERhdGEuc2Vuc29yID0gZGF0YS5zZW5zb3JzW3BvaW50WzFdXTtcbiAgICAgICAgICAgICAgICAgICAgcGxvdEFyci5wdXNoKHBvaW50RGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHBsb3RBcnI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaW5pdENoYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGV4cEZvcm1hdCA9IGQzLmZvcm1hdCgnLjFlJyksXG4gICAgICAgICAgICAgICAgbnVtRm9ybWF0ID0gZDMuZm9ybWF0KCduJyk7XG5cbiAgICAgICAgICAgIC8vIGdlbmVyYXRlIHRpbWUvaW50ZW5zaXR5IGNoYXJ0IHVzaW5nIEMzXG4gICAgICAgICAgICBjaGFydCA9IGMzLmdlbmVyYXRlKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGpzb246IFtdXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaXplOiB7XG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiB2bS5ldmVudFZpZXdlcldpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZtLmV2ZW50Vmlld2VySGVpZ2h0IC8gMlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFkZGluZzoge1xuICAgICAgICAgICAgICAgICAgICB0b3A6IDEwLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRvb2x0aXA6IHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geC50b0ZpeGVkKDIpICsgJyBzZWNvbmRzJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChNYXRoLnBvdygxMCwgdmFsdWUpLnRvRml4ZWQoNikpIC0gMSArICcgJyArIGRlZmF1bHRQbG90RGF0YS55X2NvbHVtbi51bml0cy5sYWJlbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbGluZToge1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0TnVsbDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXhpczoge1xuICAgICAgICAgICAgICAgICAgICB4OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aWNrOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZml0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ1NlY29uZHMgc2luY2UgJyArIG1vbWVudC51dGMoZGVmYXVsdFBsb3REYXRhLnN0YXJ0ZWQpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzc1taXScpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnb3V0ZXItbGVmdCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBkZWZhdWx0UGxvdERhdGEueV9jb2x1bW4udW5pdHMubGFiZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdvdXRlci1taWRkbGUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGljazoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZm9ybWF0IGN1c3RvbSB0aWNrcyBmb3IgbG9nIHNjYWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ID0gTWF0aC5hYnMoZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ID0gdCA8IDEgPyBNYXRoLnBvdygxMCwgdCkgOiBNYXRoLnJvdW5kKE1hdGgucG93KDEwLCB0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ID0gZCA8IDAgPyAxIC8gdCA6IHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0IDwgMC4wMDAwMSB8fCB0ID4gMTAwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV4cEZvcm1hdCh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpbSByZW1haW5pbmcgZmxvYXRpbmcgdmFsdWVzIHdoZW4gdGhleSBnZXQgdG9vIGxvbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgYXZvaWRzIHVuZGVzaXJlZCB6ZXJvIHBhZGRpbmcgcHJvdmlkZWQgYnkgRDNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBudW1Gb3JtYXQodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFydHMgPSByZXN1bHQudG9TdHJpbmcoKS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEgJiYgcGFydHNbMV0ubGVuZ3RoID4gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJ0c1swXSArICcuJyArIHBhcnRzWzFdLnN1YnN0cmluZygwLCAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHpvb206IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3ViY2hhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgc2hvdzogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9ubW91c2VvdXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hhcnQuZm9jdXMoY2hhcnRGb2N1cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNvcnRTZW5zb3JzID0gZnVuY3Rpb24gKHNlbnNvcnMpIHtcbiAgICAgICAgICAgIHJldHVybiBfLnNvcnRCeShzZW5zb3JzLCBmdW5jdGlvbiAoc2Vuc29yKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uc3RhcnRzV2l0aChzZW5zb3IsIGVyaXNDb25maWcuZGVmYXVsdFNlbnNvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbnNvci5zcGxpdCgnICcpWzFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2Vuc29yO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHJlbmRlckNoYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uY2hhcnRMb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIGluc3RhbnRpYXRlIHRoZSB3ZWIgd29ya2VyXG4gICAgICAgICAgICBjaGFydFdvcmtlciA9IFdlYndvcmtlci5jcmVhdGUoZm9ybWF0Q2hhcnREYXRhKTtcblxuICAgICAgICAgICAgLy8gc3RhcnQgdGhlIHdlYiB3b3JrZXIgYW5kIHdhaXQgZm9yIHRoZSByZXN1bHRcbiAgICAgICAgICAgIGNoYXJ0V29ya2VyLnJ1bihwbG90RGF0YSwgY29ycmVsYXRpbmdEYXRlRGlmZiwgZXJpc0NvbmZpZy5iYXNlVXJsKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdFBsb3REYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoYXJ0RGF0YSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBpbml0Q2hhcnQoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9IGNvcnJlbGF0aW5nUGxvdERhdGEgPyBfLmNvbmNhdChkZWZhdWx0UGxvdERhdGEuc2Vuc29ycywgY29ycmVsYXRpbmdQbG90RGF0YS5zZW5zb3JzKSA6IGRlZmF1bHRQbG90RGF0YS5zZW5zb3JzO1xuICAgICAgICAgICAgICAgICAgICBrZXlzID0gc29ydFNlbnNvcnMoa2V5cyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHNvdXJjZTBJZHggPSAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlMUlkeCA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHVwIGNoYXJ0IGNvbG9ycyBiYXNlZCBvbiBzb3VyY2UgdHlwZVxuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goa2V5cywgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uZW5kc1dpdGgoa2V5LCBlcmlzQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhcnRDb2xvcnNba2V5XSA9IF8uZmluZChlcmlzQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IGZhbHNlIH0pLmNoYXJ0Q29sb3JzW3NvdXJjZTBJZHhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTBJZHgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhcnRDb2xvcnNba2V5XSA9IF8uZmluZChlcmlzQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IHRydWUgfSkuY2hhcnRDb2xvcnNbc291cmNlMUlkeF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlMUlkeCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb246IGNoYXJ0RGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiAndGltZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGtleXNcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xvcnM6IGNoYXJ0Q29sb3JzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBncmlkTGluZXMgPSBfLm1hcChjaGFydERhdGEsIGZ1bmN0aW9uIChmcmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGZyYW1lLnRpbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzczogJ2ZyYW1lLWxpbmUgdGltZS0nICsgXy5yZXBsYWNlKGZyYW1lLnRpbWUsICcuJywgJycpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vuc29yOiBmcmFtZS5zZW5zb3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFydC54Z3JpZHMoZ3JpZExpbmVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5jaGFydExvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBjaGFydC5sb2FkKGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGRldGVybWluZSBjb2xvciBmb3IgY2FyZCB0aXRsZSBiYXNlZCBvbiBjb2xvciBpbiBjaGFydFxuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2godm0uY2hpcENhcmRzLCBmdW5jdGlvbiAoY2FyZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FyZC5jb2xvciA9IGNoYXJ0LmRhdGEuY29sb3JzKClbY2FyZC5jaGFydElkXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlQ2hhcnRGb2N1cygpO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh2bS5jb3JyZWxhdGluZ0NoaXBDYXJkcywgZnVuY3Rpb24gKGNhcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmQuY29sb3IgPSBjaGFydC5kYXRhLmNvbG9ycygpW2NhcmQuY2hhcnRJZF07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0RXZlbnREYXRhID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0ubG9hZGluZ1N0YXR1cyA9ICdJbml0aWFsaXppbmcuLi4nO1xuXG4gICAgICAgICAgICAvLyBmbGF0dGVuIGZyYW1lRGF0YSBhbmQgZ3JvdXAgYnkgc2Vuc29yLCB0aGVuIGNvbnZlcnRcbiAgICAgICAgICAgIC8vIHRvIHBhaXJzIHNvIHRoZSB0ZW1wbGF0ZSBrbm93cyBob3cgbWFueSBpbWFnZSBjYXJkc1xuICAgICAgICAgICAgLy8gdG8gZGlzcGxheSBhbmQgd2hhdCB0aGVpciBsYWJlbHMgc2hvdWxkIGJlXG4gICAgICAgICAgICB2YXIgY2hpcENhcmRzID0gXy50b1BhaXJzKF8uZ3JvdXBCeShfLmZsYXR0ZW4oXy5tYXAoZnJhbWVEYXRhLCAncmVzdWx0cycpKSwgJ3NlbnNvcicpKTtcbiAgICAgICAgICAgIHZhciBjaGlwQ2FyZE9ianMgPSBfLm1hcChjaGlwQ2FyZHMsIGZ1bmN0aW9uIChjYXJkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNhbnZhc0NsYXNzID0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0gPyBfLnJlcGxhY2UoY2FyZFswXSwgJyAnLCAnJykgOiBfLnJlcGxhY2UoY2FyZFswXSwgJyAnLCAnJykgKyBlcmlzQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwsXG4gICAgICAgICAgICAgICAgICAgIGNoYXJ0SWQgPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSA/IGNhcmRbMF0gOiBjYXJkWzBdICsgZXJpc0NvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vuc29yOiBjYXJkWzBdLFxuICAgICAgICAgICAgICAgICAgICBpbWFnZXM6IGNhcmRbMV0sXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBjYW52YXNDbGFzcyxcbiAgICAgICAgICAgICAgICAgICAgY2hhcnRJZDogY2hhcnRJZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIGNoaXBDYXJkT3JkZXIgPSBzb3J0U2Vuc29ycyhfLm1hcChjaGlwQ2FyZE9ianMsICdzZW5zb3InKSk7XG5cbiAgICAgICAgICAgIF8uZm9yRWFjaChjaGlwQ2FyZE9yZGVyLCBmdW5jdGlvbiAoc2Vuc29yKSB7XG4gICAgICAgICAgICAgICAgdm0uY2hpcENhcmRzLnB1c2goXy5maW5kKGNoaXBDYXJkT2JqcywgeyBzZW5zb3I6IHNlbnNvciB9KSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdm0uYWN0aXZlQ2hpcENhcmQgPSB2bS5jaGlwQ2FyZHNbMF07XG4gICAgICAgICAgICB2bS5hY3RpdmVDaGlwQ2FyZC5hY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgdm0uYXZhaWxhYmxlQ2hpcENhcmRzID0gXy5jbG9uZURlZXAodm0uY2hpcENhcmRzKTtcblxuICAgICAgICAgICAgaWYgKGhhc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gc2V0IHVwIGNvcnJlbGF0aW5nIGNoaXAgY2FyZHNcbiAgICAgICAgICAgICAgICB2bS5jb3JyZWxhdGluZ0NoaXBDYXJkcyA9IF8ubWFwKGNoaXBDYXJkcywgZnVuY3Rpb24gKGNhcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbnNvcjogY2FyZFswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlczogY2FyZFsxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogY2FyZFswXSA9PT0gdm0uYWN0aXZlQ2hpcENhcmQuc2Vuc29yLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdID8gXy5yZXBsYWNlKGNhcmRbMF0sICcgJywgJycpICsgZXJpc0NvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsIDogXy5yZXBsYWNlKGNhcmRbMF0sICcgJywgJycpLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhcnRJZDogdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0gPyBjYXJkWzBdICsgZXJpc0NvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsIDogY2FyZFswXVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZtLmFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQgPSBfLmZpbmQodm0uY29ycmVsYXRpbmdDaGlwQ2FyZHMsIHsgc2Vuc29yOiB2bS5hY3RpdmVDaGlwQ2FyZC5zZW5zb3IgfSk7XG4gICAgICAgICAgICAgICAgdm0uYXZhaWxhYmxlQ2hpcENhcmRzID0gXy51bmlxQnkodm0uYXZhaWxhYmxlQ2hpcENhcmRzLmNvbmNhdCh2bS5jb3JyZWxhdGluZ0NoaXBDYXJkcyksICdzZW5zb3InKTtcblxuICAgICAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSBjb3JyZWxhdGluZyBldmVudCB0aW1lIGRpZmZlcmVuY2VcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0RhdGVEaWZmID0gbW9tZW50KGRlZmF1bHRQbG90RGF0YS5zdGFydGVkKS5kaWZmKG1vbWVudChjb3JyZWxhdGluZ1Bsb3REYXRhLnN0YXJ0ZWQpLCAncycpO1xuXG4gICAgICAgICAgICAgICAgLy8gYWRqdXN0IGZvciBwb3NzaWJsZSB0aW1lc3RhbXAgZGlmZmVyZW5jZVxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChmcmFtZURhdGEsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChkYXRhLnJlc3VsdHMsIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuaXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC50aW1lc3RhbXAgPSBjb3JyZWxhdGluZ0RhdGVEaWZmID8gcmVzdWx0LnRpbWVzdGFtcCAtIGNvcnJlbGF0aW5nRGF0ZURpZmYgOiByZXN1bHQudGltZXN0YW1wO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHJlbmRlckNoYXJ0KCk7XG4gICAgICAgICAgICByZW5kZXJGcmFtZXMoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0Q29ycmVsYXRpbmdFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldENvcnJlbGF0aW5nRXZlbnRzKHZtLnNlbGVjdGVkRmVhdHVyZSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdm0uZXZlbnRFcnJvciA9IGVycm9yLnN0YXR1cyA+IC0xID8gZXJyb3Iuc3RhdHVzICsgJzogJyArIGVycm9yLnN0YXR1c1RleHQgOiAnQ29ubmVjdGlvbiBlcnJvcjsgdW5hYmxlIHRvIHJldHJpZXZlIGNvcnJlbGF0aW5nIGV2ZW50cy4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRQbG90RGF0YSA9IGZ1bmN0aW9uIChmaWxlUGF0aCwgaXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgaXNDb3JyZWxhdGlvbiA9IGlzQ29ycmVsYXRpb24gfHwgZmFsc2U7XG4gICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldFBsb3REYXRhKHsgdXJsOiBmaWxlUGF0aCB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuaXNDb3JyZWxhdGlvbiA9IGlzQ29ycmVsYXRpb247XG4gICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNlbGVjdGVkIGZlYXR1cmUgaXMgdXMsIHNvIGNvcnJlbGF0ZWQgZGF0YSBuZWVkcyB0byBiZSBsYWJlbGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2Vuc29ycyA9IF8ubWFwKHJlc3VsdC5zZW5zb3JzLCBmdW5jdGlvbiAoc2Vuc29yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbnNvciArIGVyaXNDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2VsZWN0ZWQgZmVhdHVyZSBpcyB0aGVtLCBzbyBub24tY29ycmVsYXRlZCBkYXRhIG5lZWRzIHRvIGJlIGxhYmVsZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2Vuc29ycyA9IF8ubWFwKHJlc3VsdC5zZW5zb3JzLCBmdW5jdGlvbiAoc2Vuc29yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbnNvciArIGVyaXNDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGQucmVzb2x2ZShwbG90RGF0YS5wdXNoKHJlc3VsdCkpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZtLmV2ZW50RXJyb3IgPSBlcnJvci5zdGF0dXMgPiAtMSA/IGVycm9yLnN0YXR1cyArICc6ICcgKyBlcnJvci5zdGF0dXNUZXh0IDogJ0Nvbm5lY3Rpb24gZXJyb3I7IHVuYWJsZSB0byByZXRyaWV2ZSBwbG90IGRhdGEuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0RnJhbWVEYXRhID0gZnVuY3Rpb24gKGZpbGVQYXRoLCBpc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICBpc0NvcnJlbGF0aW9uID0gaXNDb3JyZWxhdGlvbiB8fCBmYWxzZTtcbiAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0RnJhbWVEYXRhKHsgdXJsOiBmaWxlUGF0aCB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2gocmVzdWx0LnJlc3VsdHMsIGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgci5zZW5zb3JUaXRsZSA9IGlzQ29ycmVsYXRpb24gPyByLnNlbnNvciArIGVyaXNDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbCA6IHIuc2Vuc29yO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgci5zZW5zb3JUaXRsZSA9ICFpc0NvcnJlbGF0aW9uID8gci5zZW5zb3IgKyBlcmlzQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwgOiByLnNlbnNvcjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByLmlzQ29ycmVsYXRpb24gPSBpc0NvcnJlbGF0aW9uO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGQucmVzb2x2ZShmcmFtZURhdGEucHVzaChyZXN1bHQpKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2bS5ldmVudEVycm9yID0gZXJyb3Iuc3RhdHVzID4gLTEgPyBlcnJvci5zdGF0dXMgKyAnOiAnICsgZXJyb3Iuc3RhdHVzVGV4dCA6ICdDb25uZWN0aW9uIGVycm9yOyB1bmFibGUgdG8gcmV0cmlldmUgZnJhbWUgZGF0YS4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRDb3JyZWxhdGluZ0V2ZW50RGF0YSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0RXZlbnRUcmFja3MocGFyYW1zKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgZC5yZXNvbHZlKGNvcnJlbGF0aW5nRXZlbnREYXRhID0gZGF0YSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdm0uZXZlbnRFcnJvciA9IGVycm9yLnN0YXR1cyA+IC0xID8gZXJyb3Iuc3RhdHVzICsgJzogJyArIGVycm9yLnN0YXR1c1RleHQgOiAnQ29ubmVjdGlvbiBlcnJvcjsgdW5hYmxlIHRvIHJldHJpZXZlIGNvcnJlbGF0aW5nIGV2ZW50IGRhdGEuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZGVsZXRlVm90ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZvdGVTZXJ2aWNlLmRlbGV0ZVZvdGUodm0udm90ZU9iai52b3RlX2lkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBfLnJlbW92ZSh2bS52b3RlcywgZnVuY3Rpb24gKHZvdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZvdGUudm90ZV9pZCA9PT0gdm0udm90ZU9iai52b3RlX2lkO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZtLnZvdGVPYmogPSBuZXcgVm90ZSgpO1xuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1ZvdGUgUmVtb3ZlZCcpLnRoZW1lKCdzdWNjZXNzLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBjYXN0Vm90ZSA9IGZ1bmN0aW9uIChpc0tleWJvYXJkKSB7XG4gICAgICAgICAgICB2b3RlU2VydmljZS5jYXN0Vm90ZSh2bS52b3RlT2JqKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB2bS52b3RlT2JqID0gVm90ZS50cmFuc2Zvcm1lcihyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgdm0udm90ZXMucHVzaCh2bS52b3RlT2JqKTtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZXModm0udm90ZXMpO1xuICAgICAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnVXB2b3RlIHJlY29yZGVkJykudGhlbWUoJ3N1Y2Nlc3MtdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Rvd252b3RlIHJlY29yZGVkJykudGhlbWUoJ2ZhaWwtdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNLZXlib2FyZCkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0RXZlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgdm0udm90ZU9iai52b3RlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciBTdWJtaXR0aW5nIFZvdGUnKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdXBkYXRlVm90ZSA9IGZ1bmN0aW9uIChpc0tleWJvYXJkKSB7XG4gICAgICAgICAgICB2b3RlU2VydmljZS51cGRhdGVWb3RlKHZtLnZvdGVPYmopLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIGxvb2sgZm9yIGV4aXN0aW5nIHZvdGUgZm9yIHRoaXMgZXZlbnRcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRWb3RlSWR4ID0gXy5maW5kSW5kZXgodm0udm90ZXMsIHsgZGF0YXNldF9pZDogdm0udm90ZU9ialtlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdLCBwcm9kdWN0X2lkOiB2bS52b3RlT2JqW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gfSk7XG4gICAgICAgICAgICAgICAgdmFyIHRlbXBWb3RlcyA9IF8uY2xvbmVEZWVwKHZtLnZvdGVzKTtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRWb3RlSWR4ID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGVtcFZvdGVzW2V2ZW50Vm90ZUlkeF0udm90ZSA9IHZtLnZvdGVPYmoudm90ZTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVzKHRlbXBWb3Rlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnVXB2b3RlIHJlY29yZGVkJykudGhlbWUoJ3N1Y2Nlc3MtdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Rvd252b3RlIHJlY29yZGVkICgnICsgdm0udm90ZU9iai5yZWFzb24gKyAnKScpLnRoZW1lKCdmYWlsLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGlzS2V5Ym9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dEV2ZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgIHZtLnZvdGVPYmoudm90ZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgU3VibWl0dGluZyBWb3RlJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uZ2V0U2NhbGVEYXRhID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0ubG9hZGluZ1NjYWxlRGF0YSA9IHRydWU7XG4gICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldFNjYWxlRGF0YSh2bS5zY2FsZUZpbGUpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uc2NhbGVKb2JVcmwgPSBlcmlzQ29uZmlnLnNjYWxlLnVybCArICcvIy9qb2JzL2pvYi8nICsgZGF0YS5yZXN1bHRzWzBdLmpvYi5pZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZ1NjYWxlRGF0YSA9IGZhbHNlO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdTY2FsZURhdGEgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2bS5zY2FsZUpvYlVybCA9IG51bGw7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRBY3RpdmVDaGlwQ2FyZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHBsYXliYWNrRnJhbWVzID0gW107XG4gICAgICAgICAgICBmcmFtZUlkeCA9IDA7XG4gICAgICAgICAgICB2YXIgY3VyckFjdGl2ZUNoaXBDYXJkID0gXy5maW5kKHZtLmNoaXBDYXJkcywgeyBhY3RpdmU6IHRydWUgfSksXG4gICAgICAgICAgICAgICAgY3VyckFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQgPSBfLmZpbmQodm0uY29ycmVsYXRpbmdDaGlwQ2FyZHMsIHsgYWN0aXZlOiB0cnVlIH0pO1xuXG4gICAgICAgICAgICBpZiAoY3VyckFjdGl2ZUNoaXBDYXJkKSB7XG4gICAgICAgICAgICAgICAgY3VyckFjdGl2ZUNoaXBDYXJkLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGN1cnJBY3RpdmVDb3JyZWxhdGluZ0NoaXBDYXJkKSB7XG4gICAgICAgICAgICAgICAgY3VyckFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQuYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZtLmFjdGl2ZUNoaXBDYXJkID0gXy5maW5kKHZtLmNoaXBDYXJkcywgeyBzZW5zb3I6IHZtLmFjdGl2ZUNoaXBDYXJkLnNlbnNvciB9KTtcbiAgICAgICAgICAgIHZtLmFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQgPSBfLmZpbmQodm0uY29ycmVsYXRpbmdDaGlwQ2FyZHMsIHsgc2Vuc29yOiB2bS5hY3RpdmVDaGlwQ2FyZC5zZW5zb3IgfSk7XG5cbiAgICAgICAgICAgIGlmICh2bS5hY3RpdmVDaGlwQ2FyZCkge1xuICAgICAgICAgICAgICAgIHZtLmFjdGl2ZUNoaXBDYXJkLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodm0uYWN0aXZlQ29ycmVsYXRpbmdDaGlwQ2FyZCkge1xuICAgICAgICAgICAgICAgIHZtLmFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdXBkYXRlQ2hhcnRGb2N1cygpO1xuICAgICAgICAgICAgdXBkYXRlRnJhbWVzVG9SZW5kZXIoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudERhdGEobnVsbCk7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlRXZlbnQobnVsbCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udm90ZVVwQnRuQ29sb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodm0udm90ZU9iai52b3RlID09PSBudWxsIHx8IHZtLnZvdGVPYmoudm90ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JlZW4tNzAwJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodm0udm90ZU9iai52b3RlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleS03MDAnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnZvdGVEb3duQnRuQ29sb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodm0udm90ZU9iai52b3RlID09PSBudWxsIHx8IHZtLnZvdGVPYmoudm90ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3JlZC03MDAnO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2bS52b3RlT2JqLnZvdGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXktNzAwJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS52b3RlVXAgPSBmdW5jdGlvbiAodHlwZSwgaXNLZXlib2FyZCkge1xuICAgICAgICAgICAgdHlwZSA9IHR5cGUgfHwgJ1VUWVAnO1xuICAgICAgICAgICAgaXNLZXlib2FyZCA9IGlzS2V5Ym9hcmQgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIHZtLnZvdGVPYmpbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF07XG4gICAgICAgICAgICB2bS52b3RlT2JqW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdO1xuICAgICAgICAgICAgdm0udm90ZU9ialtlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdO1xuICAgICAgICAgICAgdm0udm90ZU9ialtlcmlzQ29uZmlnLnNlcnZlci50eXBlRmllbGRdID0gdHlwZTtcbiAgICAgICAgICAgIHZtLnZvdGVPYmoudm90ZSA9IHRydWU7XG4gICAgICAgICAgICB2bS52b3RlT2JqLnJlYXNvbiA9ICcnO1xuICAgICAgICAgICAgdm0udm90ZU9ialtlcmlzQ29uZmlnLnNlcnZlci5kYXRlRmllbGRdID0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXTtcblxuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZV9pZCkge1xuICAgICAgICAgICAgICAgIC8vIHZvdGUgaGFzIGFscmVhZHkgYmVlbiBjYXN0LCBzbyB1cGRhdGUgaW5zdGVhZFxuICAgICAgICAgICAgICAgIHVwZGF0ZVZvdGUoaXNLZXlib2FyZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5ldyB2b3RlXG4gICAgICAgICAgICAgICAgY2FzdFZvdGUoaXNLZXlib2FyZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udm90ZURvd24gPSBmdW5jdGlvbiAocmVhc29uLCBpc0tleWJvYXJkKSB7XG4gICAgICAgICAgICByZWFzb24gPSByZWFzb24gfHwgJyc7XG4gICAgICAgICAgICBpc0tleWJvYXJkID0gaXNLZXlib2FyZCB8fCBmYWxzZTtcblxuICAgICAgICAgICAgdm0udm90ZU9ialtlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXTtcbiAgICAgICAgICAgIHZtLnZvdGVPYmpbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF07XG4gICAgICAgICAgICB2bS52b3RlT2JqW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdID0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF07XG4gICAgICAgICAgICB2bS52b3RlT2JqLnZvdGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHZtLnZvdGVPYmoucmVhc29uID0gcmVhc29uO1xuICAgICAgICAgICAgdm0udm90ZU9ialtlcmlzQ29uZmlnLnNlcnZlci5kYXRlRmllbGRdID0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXTtcblxuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZV9pZCkge1xuICAgICAgICAgICAgICAgIC8vIHZvdGUgaGFzIGFscmVhZHkgYmVlbiBjYXN0LCBzbyB1cGRhdGUgaW5zdGVhZFxuICAgICAgICAgICAgICAgIHVwZGF0ZVZvdGUoaXNLZXlib2FyZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5ldyB2b3RlXG4gICAgICAgICAgICAgICAgY2FzdFZvdGUoaXNLZXlib2FyZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2hvd01ldGFkYXRhID0gZnVuY3Rpb24oZXYsIGV2TWV0YWRhdGFzKSB7XG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyh7XG4gICAgICAgICAgICAgICAgY2xpY2tPdXRzaWRlVG9DbG9zZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnbWV0YWRhdGFEaWFsb2dDb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9ldmVudFZpZXdlci9tZXRhZGF0YURpYWxvZ1RlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50OiBldixcbiAgICAgICAgICAgICAgICBsb2NhbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRNZXRhZGF0YXM6IGV2TWV0YWRhdGFzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0ubWF0Y2hTaWduYXR1cmUgPSBmdW5jdGlvbiAoc2Vuc29yKSB7XG4gICAgICAgICAgICB2YXIgY2hhcnREYXRhID0gXy5maW5kKGNoYXJ0LmRhdGEoKSwgeyBpZDogc2Vuc29yIH0pLFxuICAgICAgICAgICAgICAgIHZhbHVlcyA9IGNoYXJ0RGF0YSA/IGNoYXJ0RGF0YS52YWx1ZXMgOiBudWxsO1xuXG4gICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IG51bGwgdmFsdWVzXG4gICAgICAgICAgICB2YWx1ZXMgPSBfLmZpbHRlcih2YWx1ZXMsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHYudmFsdWUgIT09IG51bGw7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHZhbHVlcyk7XG5cbiAgICAgICAgICAgIC8vdmFyIHNpZyA9IHtcbiAgICAgICAgICAgIC8vICAgIHNpZ190ZW1wbGF0ZTogW1t0aW1lc10sW2ludGVuc2l0aWVzXV0sXG4gICAgICAgICAgICAvLyAgICBldmVudF9kYXRhOiBbW2V2ZW50VGltZXNdLFtldmVudEludGVuc2l0aWVzXV1cbiAgICAgICAgICAgIC8vfTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRQbGF5YmFja1N0YXRlID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgICAgICB2bS5wbGF5YmFja1N0YXRlID0gc3RhdGU7XG4gICAgICAgICAgICBpZiAodm0ucGxheWJhY2tTdGF0ZSkge1xuICAgICAgICAgICAgICAgIGFuaW1hdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRQbGF5YmFja0RpcmVjdGlvbiA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBvbGREaXJlY3Rpb24gPSB2bS5wbGF5YmFja0RpcmVjdGlvbjtcbiAgICAgICAgICAgIHZtLnBsYXliYWNrRGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICAgICAgICAgICAgaWYgKCF2bS5wbGF5YmFja1N0YXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhbmd1bGFyLmVxdWFscyhvbGREaXJlY3Rpb24sIGRpcmVjdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdXNlciBjaGFuZ2VkIGRpcmVjdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnZm9yd2FyZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4ID0gZnJhbWVJZHggPCBwbGF5YmFja0ZyYW1lcy5sZW5ndGggLSAyID8gZnJhbWVJZHggKyAyIDogMDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSWR4ID0gZnJhbWVJZHggPiAxID8gZnJhbWVJZHggLSAyIDogcGxheWJhY2tGcmFtZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhbmltYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc3VwcG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICR3aW5kb3cubG9jYXRpb24gPSAnbWFpbHRvOicgKyBlcmlzQ29uZmlnLnN1cHBvcnRQT0Muam9pbignOycpICsgJz9zdWJqZWN0PUVyaXMlMjBFdmVudCUyMFF1ZXN0aW9uJmJvZHk9UGxlYXNlIHJldmlldyB0aGlzIGV2ZW50IGFuZCBwcm92aWRlIGZlZWRiYWNrOiUwRCUwQSUwRCUwQScgKyBlbmNvZGVVUklDb21wb25lbnQoJGxvY2F0aW9uLmFic1VybCgpKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5kb3dubG9hZEdpZiA9IGZ1bmN0aW9uIChldiwgaXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgdmFyIGZpbGVOYW1lID0gJyc7XG5cbiAgICAgICAgICAgIGlmIChpc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgZmlsZU5hbWUgPSAnX2NvcnJlbGF0ZWQuZ2lmJztcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nQ29ycmVsYXRlZEdpZiA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpbGVOYW1lID0gJy5naWYnO1xuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdHaWYgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZnJhbWVzID0gXy5maWx0ZXIocGxheWJhY2tGcmFtZXMsIHsgaXNDb3JyZWxhdGlvbjogaXNDb3JyZWxhdGlvbiB9KSxcbiAgICAgICAgICAgICAgICBjYW52YXMgPSBhbmd1bGFyLmVsZW1lbnQoJy4nICsgXy5yZXBsYWNlKGZyYW1lc1swXS5zZW5zb3JUaXRsZSwgJyAnLCAnJykpWzBdLFxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbnMgPSB7IHdpZHRoOiBjYW52YXMud2lkdGgsIGhlaWdodDogY2FudmFzLmhlaWdodCB9O1xuXG4gICAgICAgICAgICBmaWxlTmFtZSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gKyAnXycgKyB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdICsgZmlsZU5hbWU7XG5cbiAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZG93bmxvYWRHaWYoZnJhbWVzLCBkaW1lbnNpb25zKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQ29ycmVsYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NvcnJlbGF0ZWRHaWYgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2bS5sb2FkaW5nR2lmID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbbmV3IFVpbnQ4QXJyYXkoZGF0YSldLCB7dHlwZTogJ2ltYWdlL2dpZid9KTtcbiAgICAgICAgICAgICAgICBhLmhyZWYgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgICAgIGEuZG93bmxvYWQgPSBmaWxlTmFtZTtcbiAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciBEb3dubG9hZGluZyBHSUYnKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgaWYgKGlzQ29ycmVsYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NvcnJlbGF0ZWRHaWYgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2bS5sb2FkaW5nR2lmID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uZ290b1ZpZGVvID0gZnVuY3Rpb24gKGZtdlJlc3VsdCkge1xuICAgICAgICAgICAgJHdpbmRvdy5vcGVuKGVyaXNDb25maWcuZm12LndhdGNoVXJsICsgZm12UmVzdWx0LmlkLCAnX2JsYW5rJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0ub25VcFZvdGVDbGljayA9IGZ1bmN0aW9uICgkbWRNZW51LCBldikge1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIHZvdGUgZXhpc3RzLCBzbyB1bmRvIGl0XG4gICAgICAgICAgICAgICAgZGVsZXRlVm90ZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkbWRNZW51Lm9wZW4oZXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLm9uRG93blZvdGVDbGljayA9IGZ1bmN0aW9uICgkbWRNZW51LCBldikge1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAvLyB2b3RlIGV4aXN0cywgc28gdW5kbyBpdFxuICAgICAgICAgICAgICAgIGRlbGV0ZVZvdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJG1kTWVudS5vcGVuKGV2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5vcGVuTWVudSA9IGZ1bmN0aW9uICgkbWRNZW51LCBldikge1xuICAgICAgICAgICAgJG1kTWVudS5vcGVuKGV2KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEV2ZW50RGF0YSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjbGVhbiB1cCBhbnkgbGVmdG92ZXIgZGF0YSBmcm9tIGEgcHJldmlvdXNseSB2aWV3ZWQgZXZlbnRcbiAgICAgICAgICAgIGlmIChjaGFydFdvcmtlcikge1xuICAgICAgICAgICAgICAgIGNoYXJ0V29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY2hhcnQpIHtcbiAgICAgICAgICAgICAgICBjaGFydC5kZXN0cm95KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZtdkxheWVycy5jbGVhckxheWVycygpO1xuXG4gICAgICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdTdGF0dXMgPSAnUmVxdWVzdGluZyBEYXRhLi4uJztcbiAgICAgICAgICAgICAgICB2bS5ldmVudERhdGEgPSBuZXdWYWx1ZTtcblxuICAgICAgICAgICAgICAgIC8vIHJldHJpZXZlIHBsb3QgYW5kIGltYWdlIGRhdGEgZm9yIGFjdGl2ZSBldmVudFxuICAgICAgICAgICAgICAgIHZhciB0cmFja3MgPSB2bS5ldmVudERhdGEuZ2V0TGF5ZXJzKCksXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2VzID0gW107XG5cbiAgICAgICAgICAgICAgICB2bS5ldmVudFByb3BzID0gXy5tYXAodHJhY2tzLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5nZXRMYXllcnMoKVswXS5mZWF0dXJlLnByb3BlcnRpZXM7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB2bS5zZWxlY3RlZEZlYXR1cmUgPSB0cmFja3NbMF0uZ2V0TGF5ZXJzKClbMF0uZmVhdHVyZTtcblxuICAgICAgICAgICAgICAgIGdldEV2ZW50Vm90ZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZSAmJiB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uaDVVcmwgPSBfLnN0YXJ0c1dpdGgodm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoLCAnaHR0cCcpID8gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoIDogZXJpc0NvbmZpZy5ldmVudFNlcnZlci5maWxlUGF0aFVybCArIHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aDtcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaChnZXRQbG90RGF0YSh2bS5oNVVybCkpO1xuICAgICAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKGdldEZyYW1lRGF0YSh2bS5oNVVybCkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRxLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGdldENvcnJlbGF0aW5nRXZlbnRzKCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5mZWF0dXJlcyAmJiByZXN1bHQuZmVhdHVyZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb3JyZWxhdGluZ1Byb21pc2VzID0gW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmUgPSByZXN1bHQuZmVhdHVyZXNbMF07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aF8yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmaWxlUGF0aCA9IF8uc3RhcnRzV2l0aChmZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoXzIsICdodHRwJykgPyBmZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoXzIgOiBlcmlzQ29uZmlnLmV2ZW50U2VydmVyLmZpbGVQYXRoVXJsICsgZmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aF8yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRQYXJhbXMgPSB7fTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5jb3JyZWxhdGVkSDVVcmwgPSBmaWxlUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRQYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9IGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGQgKyAnXzInXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRQYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9IGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGQgKyAnXzInXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdQcm9taXNlcy5wdXNoKGdldENvcnJlbGF0aW5nRXZlbnREYXRhKGV2ZW50UGFyYW1zKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nUHJvbWlzZXMucHVzaChnZXRQbG90RGF0YShmaWxlUGF0aCwgdHJ1ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ1Byb21pc2VzLnB1c2goZ2V0RnJhbWVEYXRhKGZpbGVQYXRoLCB0cnVlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHEuYWxsKGNvcnJlbGF0aW5nUHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29ycmVsYXRpb24gcHJlc2VudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29ycmVsYXRpbmdFdmVudERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvcnJlbGF0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRQbG90RGF0YSA9IF8uZmluZChwbG90RGF0YSwgeyBpc0NvcnJlbGF0aW9uOiBmYWxzZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nUGxvdERhdGEgPSBfLmZpbmQocGxvdERhdGEsIHsgaXNDb3JyZWxhdGlvbjogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLmNvcnJlbGF0ZWRFdmVudFByb3BzID0gXy5tYXAoY29ycmVsYXRpbmdFdmVudERhdGEuZmVhdHVyZXMsICdwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGQgKyAnXzEnXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNjYWxlRmlsZSA9IF8ubGFzdChmZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoXzEuc3BsaXQoJy8nKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uZ2V0U2NhbGVEYXRhKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGQgKyAnXzInXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNjYWxlRmlsZSA9IF8ubGFzdChmZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoXzIuc3BsaXQoJy8nKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uZ2V0U2NhbGVEYXRhKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0RXZlbnREYXRhKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzQ29ycmVsYXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0UGxvdERhdGEgPSBfLmZpbmQocGxvdERhdGEsIHsgaXNDb3JyZWxhdGlvbjogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNjYWxlRmlsZSA9IF8ubGFzdCh2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGguc3BsaXQoJy8nKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLmdldFNjYWxlRGF0YSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0RXZlbnREYXRhKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gLy8gcXVlcnkgZm12IHNlcnZpY2UgZm9yIGEgY2lyY2xlIHdpdGggYSByYWRpdXMgb2YgMTAwMCBtZXRlcnMgZm9yIDUgbWludXRlcyBiZWZvcmUgYW5kIGFmdGVyIHRoZSBldmVudCB1c2luZyB2bS5zZWxlY3RlZEZlYXR1cmUgcHJvcGVydGllc1xuICAgICAgICAgICAgICAgIC8vIHZtLmxvYWRpbmdGTVYgPSB0cnVlO1xuICAgICAgICAgICAgICAgIC8vIHZhciByZWNvcmRpbmdzUGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgLy8gcmVjb3JkaW5nc1BhcmFtc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRlRmllbGRdID0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXTtcbiAgICAgICAgICAgICAgICAvLyByZWNvcmRpbmdzUGFyYW1zW2VyaXNDb25maWcuc2VydmVyLmxhdEZpZWxkXSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxhdEZpZWxkXTtcbiAgICAgICAgICAgICAgICAvLyByZWNvcmRpbmdzUGFyYW1zW2VyaXNDb25maWcuc2VydmVyLmxvbkZpZWxkXSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvbkZpZWxkXTtcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIGZtdlNlcnZpY2UuZ2V0UmVjb3JkaW5ncyhyZWNvcmRpbmdzUGFyYW1zKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgXy5mb3JFYWNoKHJlc3VsdC5kYXRhLmRhdGEsIGZ1bmN0aW9uIChmbXZSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIHZtLmZtdlJlc3VsdHMucHVzaChmbXZSZXN1bHQpO1xuICAgICAgICAgICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyAgICAgdm0ubG9hZGluZ0ZNViA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIC8vIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnVW5hYmxlIHRvIHJldHJpZXZlIHZpZGVvLicpLnRoZW1lKCdmYWlsLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgdm0ubG9hZGluZ0ZNViA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldExheW91dENvbXBvbmVudHMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQgPSBfLmZpbmQobmV3VmFsdWUsIHsgc3RhdGU6IHsgdGVtcGxhdGVOYW1lOiAnZXZlbnRWaWV3ZXInIH0gfSk7XG4gICAgICAgICAgICAgICAgZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLnNldFRpdGxlKGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LnN0YXRlLnRlbXBsYXRlVGl0bGUpO1xuXG4gICAgICAgICAgICAgICAgdm0uZXZlbnRWaWV3ZXJIZWlnaHQgPSBldmVudFZpZXdlckxheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIHZtLmV2ZW50Vmlld2VyV2lkdGggPSBldmVudFZpZXdlckxheW91dENvbXBvbmVudC5jb250YWluZXIud2lkdGg7XG5cbiAgICAgICAgICAgICAgICAvLyBzZXQgZXZlbnQgbGlzdGVuZXIgZm9yIGNvbnRhaW5lciByZXNpemVcbiAgICAgICAgICAgICAgICBldmVudFZpZXdlckxheW91dENvbXBvbmVudC5jb250YWluZXIub24oJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdXNlIGEgJHRpbWVvdXQgdG8gbm90aWZ5IGFuZ3VsYXIgb2YgdGhlIGNoYW5nZVxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5ldmVudFZpZXdlckhlaWdodCA9IGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5ldmVudFZpZXdlcldpZHRoID0gZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhcnQucmVzaXplKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2bS5ldmVudFZpZXdlckhlaWdodCAvIDIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiB2bS5ldmVudFZpZXdlcldpZHRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ21ldGFkYXRhRGlhbG9nQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcclxuICAgICAgICAkc2NvcGUsXHJcblx0XHQkbWREaWFsb2csXHJcblx0XHRldmVudE1ldGFkYXRhc1xyXG5cdCl7XHJcblx0XHQkc2NvcGUuZXZlbnRNZXRhZGF0YXMgPSBldmVudE1ldGFkYXRhcztcclxuXHRcdCRzY29wZS5oaWRlID0gZnVuY3Rpb24oKXtcclxuXHRcdFx0JG1kRGlhbG9nLmhpZGUoKTtcclxuXHRcdH07XHJcblx0fSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcignZ290b0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBlcmlzQ29uZmlnLFxuICAgICAgICBlcmlzU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBMLFxuICAgICAgICBsZWFmbGV0RGF0YVxuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXG4gICAgICAgICAgICBtYXAgPSB7fTtcblxuICAgICAgICAkc2NvcGUubW9kZSA9ICRzY29wZS4kcGFyZW50Lm1vZGU7XG4gICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5sYXQgPSAnJztcbiAgICAgICAgdm0ubG5nID0gJyc7XG4gICAgICAgIHZtLm1ncnMgPSAnJztcbiAgICAgICAgdm0ubG9jYXRpb25Gb3JtYXQgPSBxcy5sb2NhdGlvbkZvcm1hdCA/IHFzLmxvY2F0aW9uRm9ybWF0IDogZXJpc0NvbmZpZy5kZWZhdWx0TG9jYXRpb25Gb3JtYXQ7XG5cbiAgICAgICAgdmFyIGNvbnZlcnRMYXRMbmcgPSBmdW5jdGlvbiAobmV3Rm9ybWF0KSB7XG4gICAgICAgICAgICByZXR1cm4gZXJpc1NlcnZpY2UuY29udmVydExhdExuZyh7XG4gICAgICAgICAgICAgICAgbGF0OiB2bS5sYXQsXG4gICAgICAgICAgICAgICAgbG5nOiB2bS5sbmcsXG4gICAgICAgICAgICAgICAgbWdyczogdm0ubWdycyxcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IHZtLmxvY2F0aW9uRm9ybWF0XG4gICAgICAgICAgICB9LCBuZXdGb3JtYXQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0R290b0V4cGFuZGVkKHZtLmV4cGFuZGVkKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5nb3RvID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGRkTGF0TG5nID0gY29udmVydExhdExuZygnZGQnKTtcbiAgICAgICAgICAgIG1hcC5zZXRWaWV3KEwubGF0TG5nKGRkTGF0TG5nLmxhdCwgZGRMYXRMbmcubG5nKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0TG9jYXRpb25Gb3JtYXQgPSBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TG9jYXRpb25Gb3JtYXQoZm9ybWF0KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBtYXAgPSBkYXRhO1xuICAgICAgICAgICAgICAgIHZtLnNldExvY2F0aW9uRm9ybWF0KHZtLmxvY2F0aW9uRm9ybWF0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TG9jYXRpb25Gb3JtYXQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCh2bS5sYXQgIT09ICcnICYmIHZtLmxuZyAhPT0gJycpIHx8IHZtLm1ncnMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnZlcnRlZExhdExuZyA9IGNvbnZlcnRMYXRMbmcobmV3VmFsdWUpO1xuICAgICAgICAgICAgICAgIHZtLmxhdCA9IGNvbnZlcnRlZExhdExuZy5sYXQ7XG4gICAgICAgICAgICAgICAgdm0ubG5nID0gY29udmVydGVkTGF0TG5nLmxuZztcbiAgICAgICAgICAgICAgICB2bS5tZ3JzID0gY29udmVydGVkTGF0TG5nLm1ncnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5sb2NhdGlvbkZvcm1hdCA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmRpcmVjdGl2ZSgnZXJpc0dvdG8nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvZ290by9nb3RvVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZ290b0NvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCdldmVudHNDb250cm9sbGVyJywgZnVuY3Rpb24gKFxyXG4gICAgICAgICRzY29wZSxcclxuICAgICAgICAkdGltZW91dCxcclxuICAgICAgICAkbG9jYXRpb24sXHJcbiAgICAgICAgZXJpc0NvbmZpZyxcclxuICAgICAgICBlcmlzU2VydmljZSxcclxuICAgICAgICBzZWFyY2hTZXJ2aWNlLFxyXG4gICAgICAgIHN0YXRlU2VydmljZSxcclxuICAgICAgICBsZWFmbGV0RGF0YSxcclxuICAgICAgICBtb21lbnQsXHJcbiAgICAgICAgTCxcclxuICAgICAgICAkLFxyXG4gICAgICAgIF9cclxuICAgICkge1xyXG4gICAgICAgIHZhciB2bSA9IHRoaXMsXHJcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpLFxyXG4gICAgICAgICAgICBtYXAgPSB7fSxcclxuICAgICAgICAgICAgZXZlbnRzTGF5b3V0Q29tcG9uZW50ID0gbnVsbCxcclxuICAgICAgICAgICAgY3VycklkeCA9IDAsXHJcbiAgICAgICAgICAgIGV2ZW50TGF5ZXJzID0gW10sXHJcbiAgICAgICAgICAgIGFjdGl2ZUV2ZW50ID0gbnVsbCxcclxuICAgICAgICAgICAgY29uZmlkZW5jZSA9IDAsXHJcbiAgICAgICAgICAgIGxvY2F0aW9uVW5jZXJ0YWludHkgPSAwLFxyXG4gICAgICAgICAgICBpbnRlbnNpdHkgPSB7XHJcbiAgICAgICAgICAgICAgICBtaW46IDAsXHJcbiAgICAgICAgICAgICAgICBtYXg6IDBcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc25yID0ge1xyXG4gICAgICAgICAgICAgICAgbWluOiAwLFxyXG4gICAgICAgICAgICAgICAgbWF4OiAwXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgbWluOiAwLFxyXG4gICAgICAgICAgICAgICAgbWF4OiAwXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9ubHlDb3JyZWxhdGlvbnMgPSAnYWxsJyxcclxuICAgICAgICAgICAgYWxsRXZlbnRzID0gW10sXHJcbiAgICAgICAgICAgIHZvdGVzID0gc3RhdGVTZXJ2aWNlLmdldFZvdGVzKCksXHJcbiAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5ID0gcXMuZmlsdGVyU3RyYXRlZ3kgPyBxcy5maWx0ZXJTdHJhdGVneSA6IGVyaXNDb25maWcuZmlsdGVyU3RyYXRlZ3k7XHJcblxyXG4gICAgICAgIHZtLm1vbWVudCA9IG1vbWVudDtcclxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XHJcbiAgICAgICAgdm0uZXJpc0NvbmZpZyA9IGVyaXNDb25maWc7XHJcbiAgICAgICAgdm0uZXZlbnRzSGVpZ2h0ID0gJyc7XHJcbiAgICAgICAgdm0uZXZlbnRzV2lkdGggPSAnJztcclxuICAgICAgICB2bS5tYXBFdmVudHMgPSBbXTtcclxuICAgICAgICB2bS5sb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICB2bS5zb3J0Q29uZmlnID0gc3RhdGVTZXJ2aWNlLmdldFNvcnRDb25maWcoKTtcclxuXHJcbiAgICAgICAgdmFyIGFjdGl2YXRlTWFwRXZlbnQgPSBmdW5jdGlvbiAobWFwRXZlbnQpIHtcclxuICAgICAgICAgICAgdmFyIGFjdGl2ZU1hcExheWVyID0gXy5maW5kKGV2ZW50TGF5ZXJzLCB7IGZlYXR1cmU6IG1hcEV2ZW50IH0pO1xyXG4gICAgICAgICAgICBpZiAoYWN0aXZlTWFwTGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGFjdGl2ZU1hcExheWVyLnNldFN0eWxlKHsgY29sb3I6ICcjYjJmZjU5JywgZmlsbE9wYWNpdHk6IDAuOCB9KTtcclxuICAgICAgICAgICAgICAgIGFjdGl2ZU1hcExheWVyLmJyaW5nVG9Gcm9udCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0uc2hvd1BvcHVwID0gZnVuY3Rpb24gKCRldmVudCwgbWFwRXZlbnQpIHtcclxuICAgICAgICAgICAgTC5wb3B1cCh7IGF1dG9QYW46IGZhbHNlIH0pXHJcbiAgICAgICAgICAgICAgICAuc2V0TGF0TG5nKEwubGF0TG5nKG1hcEV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubGF0RmllbGRdLCBtYXBFdmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvbkZpZWxkXSkpXHJcbiAgICAgICAgICAgICAgICAuc2V0Q29udGVudChlcmlzU2VydmljZS5nZXRMZWFmbGV0UG9wdXBDb250ZW50KG1hcEV2ZW50KSlcclxuICAgICAgICAgICAgICAgIC5vcGVuT24obWFwKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5oaWRlUG9wdXAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIG1hcC5jbG9zZVBvcHVwKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0uc2hvd0V2ZW50ID0gZnVuY3Rpb24gKCRldmVudCwgbWFwRXZlbnQpIHtcclxuICAgICAgICAgICAgLy8gY2xlYXIgb2xkIGV2ZW50IGRhdGFcclxuICAgICAgICAgICAgaWYgKGFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYWN0aXZlTWFwTGF5ZXIgPSBfLmZpbmQoZXZlbnRMYXllcnMsIHsgZmVhdHVyZTogYWN0aXZlRXZlbnQgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aXZlTWFwTGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVNYXBMYXllci5zZXRTdHlsZSh7Y29sb3I6IGFjdGl2ZU1hcExheWVyLmZlYXR1cmUuZXZlbnRTb3VyY2UuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjJ9KTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBhY3RpdmVNYXBMYXllci5icmluZ1RvQmFjaygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudERhdGEobnVsbCk7XHJcbiAgICAgICAgICAgIG1hcC5jbG9zZVBvcHVwKCk7XHJcbiAgICAgICAgICAgIG1hcEV2ZW50LnNjcm9sbFRvID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGFjdGl2ZUV2ZW50ID0gbWFwRXZlbnQ7XHJcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgZXZlbnQgY3VycmVudGx5IGJlaW5nIHZpZXdlZFxyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlRXZlbnQoYWN0aXZlRXZlbnQsIHRydWUpO1xyXG4gICAgICAgICAgICAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0uY2hhbmdlU29ydCA9IGZ1bmN0aW9uIChjb2wpIHtcclxuICAgICAgICAgICAgdmFyIGN1cnJTb3J0ID0gXy5maW5kKHZtLnNvcnRDb25maWcsIHsgZW5hYmxlZDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKHZtLnNvcnRDb25maWdbY29sXSwgY3VyclNvcnQpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjaGFuZ2Ugc29ydCBkaXJlY3Rpb25cclxuICAgICAgICAgICAgICAgIHZtLnNvcnRDb25maWdbY29sXS5kaXJlY3Rpb24gPSB2bS5zb3J0Q29uZmlnW2NvbF0uZGlyZWN0aW9uID09PSAnZGVzYycgPyAnYXNjJyA6ICdkZXNjJztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGNoYW5nZSBjb2x1bW5cclxuICAgICAgICAgICAgICAgIGN1cnJTb3J0LmVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHZtLnNvcnRDb25maWdbY29sXS5lbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2bS5tYXBFdmVudHMgPSBfLm9yZGVyQnkodm0ubWFwRXZlbnRzLCBbdm0uc29ydENvbmZpZ1tjb2xdLmZpZWxkXSwgW3ZtLnNvcnRDb25maWdbY29sXS5kaXJlY3Rpb25dKTtcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFNvcnRDb25maWcodm0uc29ydENvbmZpZyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdm0uZ2V0U29ydENsYXNzID0gZnVuY3Rpb24gKGNvbCkge1xyXG4gICAgICAgICAgICB2YXIgY3VyclNvcnQgPSBfLmZpbmQodm0uc29ydENvbmZpZywgeyBlbmFibGVkOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHModm0uc29ydENvbmZpZ1tjb2xdLCBjdXJyU29ydCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyU29ydC5kaXJlY3Rpb24gPT09ICdkZXNjJyA/ICdmYSBmYS1hcnJvdy1kb3duJyA6ICdmYSBmYS1hcnJvdy11cCc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuICdlbXB0eSc7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIG1hcCA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U29ydENvbmZpZyh2bS5zb3J0Q29uZmlnKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAgICAgICB2YXIgZ2V0RXZlbnRWb3RlcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgXy5mb3JFYWNoKHZtLm1hcEV2ZW50cywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBsb29rIGZvciBleGlzdGluZyB2b3RlIGZvciB0aGlzIGV2ZW50XHJcbiAgICAgICAgICAgICAgICBldmVudC52b3RlID0gXy5maW5kKHZvdGVzLCB7IGRhdGFzZXRfaWQ6IGV2ZW50LnByb3BlcnRpZXMuZGF0YXNldF9pZCwgcHJvZHVjdF9pZDogZXZlbnQucHJvcGVydGllcy5wcm9kdWN0X2lkIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LnZvdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGV2ZW50LnZvdGUudm90ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQudm90ZS52b3RlID0gZXZlbnQudm90ZS52b3RlID09PSAndHJ1ZSc7IC8vIHZvdGUgdmFsdWUgY29tZXMgYmFjayBhcyBhIHN0cmluZywgc28gY2FzdCB0byBib29sXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnZvdGUudm90ZUNsYXNzID0gZXZlbnQudm90ZS52b3RlID09PSB0cnVlID8gJ2ZhLXRodW1icy11cCcgOiBldmVudC52b3RlLnZvdGUgPT09IGZhbHNlID8gJ2ZhLXRodW1icy1kb3duJyA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnZvdGUudm90ZUNvbG9yID0gZXZlbnQudm90ZS52b3RlID09PSB0cnVlID8gJ2dyZWVuLTcwMCcgOiBldmVudC52b3RlLnZvdGUgPT09IGZhbHNlID8gJ3JlZC03MDAnIDogJ2dyZXktNzAwJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGZpbHRlckV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdm0ubWFwRXZlbnRzID0gXy5maWx0ZXIoYWxsRXZlbnRzLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBldmVudER1cmF0aW9uID0gbW9tZW50LmR1cmF0aW9uKCcwMDonICsgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kdXJhdGlvbkZpZWxkXSkuYXNTZWNvbmRzKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAob25seUNvcnJlbGF0aW9ucyA9PT0gJ2NvcnJlbGF0ZWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnByb3BlcnRpZXMuaXNfY29ycmVsYXRlZCAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmNvbmZpZGVuY2VGaWVsZF0gPj0gY29uZmlkZW5jZSAmJiAoZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb2NhdGlvblVuY2VydGFpbnR5RmllbGRdIDw9IGxvY2F0aW9uVW5jZXJ0YWludHkgfHwgY29uZmlkZW5jZSAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvY2F0aW9uVW5jZXJ0YWludHlGaWVsZF0gPT09IG51bGwpICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaW50ZW5zaXR5RmllbGRdID49IGludGVuc2l0eS5taW4gJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0gPD0gaW50ZW5zaXR5Lm1heCAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnNuckZpZWxkXSA+PSBzbnIubWluICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGRdIDw9IHNuci5tYXggJiYgZXZlbnREdXJhdGlvbiA+PSBkdXJhdGlvbi5taW4gJiYgZXZlbnREdXJhdGlvbiA8PSBkdXJhdGlvbi5tYXg7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9ubHlDb3JyZWxhdGlvbnMgPT09ICdub25jb3JyZWxhdGVkJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhZXZlbnQucHJvcGVydGllcy5pc19jb3JyZWxhdGVkICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuY29uZmlkZW5jZUZpZWxkXSA+PSBjb25maWRlbmNlICYmIChldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvY2F0aW9uVW5jZXJ0YWludHlGaWVsZF0gPD0gbG9jYXRpb25VbmNlcnRhaW50eSB8fCBjb25maWRlbmNlICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkXSA9PT0gbnVsbCkgJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0gPj0gaW50ZW5zaXR5Lm1pbiAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA8PSBpbnRlbnNpdHkubWF4ICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGRdID49IHNuci5taW4gJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gPD0gc25yLm1heCAmJiBldmVudER1cmF0aW9uID49IGR1cmF0aW9uLm1pbiAmJiBldmVudER1cmF0aW9uIDw9IGR1cmF0aW9uLm1heDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZmlsdGVyU3RyYXRlZ3kgIT09ICdzZXJ2ZXInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuY29uZmlkZW5jZUZpZWxkXSA+PSBjb25maWRlbmNlICYmIChldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvY2F0aW9uVW5jZXJ0YWludHlGaWVsZF0gPD0gbG9jYXRpb25VbmNlcnRhaW50eSB8fCBjb25maWRlbmNlICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkXSA9PT0gbnVsbCkgJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0gPj0gaW50ZW5zaXR5Lm1pbiAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA8PSBpbnRlbnNpdHkubWF4ICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGRdID49IHNuci5taW4gJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gPD0gc25yLm1heCAmJiBldmVudER1cmF0aW9uID49IGR1cmF0aW9uLm1pbiAmJiBldmVudER1cmF0aW9uIDw9IGR1cmF0aW9uLm1heDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBjdXJyU29ydCA9IF8uZmluZCh2bS5zb3J0Q29uZmlnLCB7IGVuYWJsZWQ6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIHZtLm1hcEV2ZW50cyA9IF8ub3JkZXJCeSh2bS5tYXBFdmVudHMsIFtjdXJyU29ydC5maWVsZF0sIFtjdXJyU29ydC5kaXJlY3Rpb25dKTtcclxuXHJcbiAgICAgICAgICAgIGdldEV2ZW50Vm90ZXMoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBwYW5lbCB0aXRsZVxyXG4gICAgICAgICAgICBpZiAoZXZlbnRzTGF5b3V0Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLnNldFRpdGxlKGV2ZW50c0xheW91dENvbXBvbmVudC5zdGF0ZS50ZW1wbGF0ZVRpdGxlICsgJyAoJyArIHZtLm1hcEV2ZW50cy5sZW5ndGggKyAnKScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRFdmVudExheWVycygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgIGV2ZW50TGF5ZXJzID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGlmIChhY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50TGF5ZXJzT3JkZXJlZCA9IF8ub3JkZXJCeShldmVudExheWVycywgWydmZWF0dXJlLnByb3BlcnRpZXMuZXZlbnRfdGltZSddLCBbJ2Rlc2MnXSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgYWN0aXZlTWFwRXZlbnQgPSBfLmZpbmQoZXZlbnRMYXllcnNPcmRlcmVkLCBmdW5jdGlvbiAobCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID09PSBhY3RpdmVFdmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gJiYgbC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9PT0gYWN0aXZlRXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBjdXJySWR4ID0gXy5pbmRleE9mKGV2ZW50TGF5ZXJzT3JkZXJlZCwgYWN0aXZlTWFwRXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgLy8gdXNlIGEgJHRpbWVvdXQgdG8gbm90aWZ5IGFuZ3VsYXIgb2YgdGhlIGNoYW5nZVxyXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLnRvcEluZGV4ID0gY3VycklkeCAtIDE7XHJcbiAgICAgICAgICAgICAgICB9LCAyNTApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RXZlbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGN1cnJTb3J0ID0gXy5maW5kKHZtLnNvcnRDb25maWcsIHsgZW5hYmxlZDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgYWxsRXZlbnRzID0gXy5vcmRlckJ5KG5ld1ZhbHVlLCBbY3VyclNvcnQuZmllbGRdLCBbY3VyclNvcnQuZGlyZWN0aW9uXSk7XHJcbiAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG5cclxuICAgICAgICAgICAgLy8gY2hlY2sgZm9yIHZhbHVlcyBpbiBxdWVyeXN0cmluZyBhbmQgZ28gdG8gYW4gZXZlbnQgaWYgYXBwbGljYWJsZVxyXG4gICAgICAgICAgICBpZiAocXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSAmJiBxc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHJvZHVjdElkID0gcXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhc2V0SWQgPSBwYXJzZUludChxc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdKSxcclxuICAgICAgICAgICAgICAgICAgICBwcmVFeGlzdGluZ0FjdGl2ZUV2ZW50ID0gXy5jbG9uZShhY3RpdmVFdmVudCk7XHJcblxyXG4gICAgICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBfLmZpbmQoYWxsRXZlbnRzLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9PT0gcHJvZHVjdElkICYmIGUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID09PSBkYXRhc2V0SWQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVFdmVudC5zY3JvbGxUbyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmVFeGlzdGluZ0FjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgZXZlbnQgY3VycmVudGx5IGJlaW5nIHZpZXdlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlRXZlbnQoYWN0aXZlRXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRlTWFwRXZlbnQoYWN0aXZlRXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RmlsdGVyU3RyYXRlZ3koKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmaWx0ZXJTdHJhdGVneSA9IG5ld1ZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q29uZmlkZW5jZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbmZpZGVuY2UgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRMb2NhdGlvblVuY2VydGFpbnR5KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9jYXRpb25VbmNlcnRhaW50eSA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRJbnRlbnNpdHkoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpbnRlbnNpdHkgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0U25yKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc25yID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldER1cmF0aW9uKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZHVyYXRpb24gPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRPbmx5Q29ycmVsYXRpb25zKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRMYXlvdXRDb21wb25lbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKCFldmVudHNMYXlvdXRDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGhhc24ndCBiZWVuIHNldCB5ZXQsIHNvIHRyeSB0byBmaW5kIGl0XHJcbiAgICAgICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQgPSBfLmZpbmQobmV3VmFsdWUsIHtzdGF0ZToge3RlbXBsYXRlTmFtZTogJ2V2ZW50cyd9fSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRzTGF5b3V0Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZm91bmQgaXQsIHNvIHNldCB1cCB2YXJzIGFuZCBldmVudHNcclxuICAgICAgICAgICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLnNldFRpdGxlKGV2ZW50c0xheW91dENvbXBvbmVudC5zdGF0ZS50ZW1wbGF0ZVRpdGxlICsgJyAoJyArIHZtLm1hcEV2ZW50cy5sZW5ndGggKyAnKScpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2bS5ldmVudHNIZWlnaHQgPSBldmVudHNMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLmhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICB2bS5ldmVudHNXaWR0aCA9IGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIud2lkdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCBldmVudCBsaXN0ZW5lciBmb3IgY29udGFpbmVyIHJlc2l6ZVxyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXNpemUgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uIChtYXApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhICR0aW1lb3V0IHRvIG5vdGlmeSBhbmd1bGFyIG9mIHRoZSBjaGFuZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uZXZlbnRzSGVpZ2h0ID0gZXZlbnRzTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5ldmVudHNXaWR0aCA9IGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIud2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0cmlnZ2VyIGEgZmFrZSB3aW5kb3cgcmVzaXplIHRvIGZvcmNlIG1kLXZpcnV0YWwtcmVwZWF0LWNvbnRhaW5lciB0byByZWRyYXdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLnRyaWdnZXJIYW5kbGVyKCdyZXNpemUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLm9uKCdyZXNpemUnLCByZXNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIub24oJ3Nob3cnLCByZXNpemUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRMb2FkaW5nRXZlbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdm0ubG9hZGluZyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEFjdGl2ZUV2ZW50KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XHJcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgY3VycklkeCA9IF8uaW5kZXhPZih2bS5tYXBFdmVudHMsIG5ld1ZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZS5zY3JvbGxUbykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhICR0aW1lb3V0IHRvIG5vdGlmeSBhbmd1bGFyIG9mIHRoZSBjaGFuZ2VcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnRvcEluZGV4ID0gY3VycklkeCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjUwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFZvdGVzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdm90ZXMgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgZ2V0RXZlbnRWb3RlcygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuIFVOQ0xBU1NJRklFRFxyXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXHJcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXHJcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcignbWFwQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcclxuICAgICAgICAkc2NvcGUsXHJcbiAgICAgICAgJHdpbmRvdyxcclxuICAgICAgICAkbG9jYXRpb24sXHJcbiAgICAgICAgJHRpbWVvdXQsXHJcbiAgICAgICAgJG1kVG9hc3QsXHJcbiAgICAgICAgJHEsXHJcbiAgICAgICAgZXJpc0NvbmZpZyxcclxuICAgICAgICBlcmlzU2VydmljZSxcclxuICAgICAgICBzdGF0ZVNlcnZpY2UsXHJcbiAgICAgICAgc2VhcmNoU2VydmljZSxcclxuICAgICAgICBmbXZTZXJ2aWNlLFxyXG4gICAgICAgIGxlYWZsZXREYXRhLFxyXG4gICAgICAgIG1vbWVudCxcclxuICAgICAgICB0b2ttbCxcclxuICAgICAgICBMLFxyXG4gICAgICAgIF9cclxuICAgICkge1xyXG4gICAgICAgIHZhciB2bSA9IHRoaXMsXHJcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpLFxyXG4gICAgICAgICAgICBtYXAgPSB7fSxcclxuICAgICAgICAgICAgbWFwWm9vbSA9IHFzLnpvb20gPyBwYXJzZUludChxcy56b29tKSA6IGVyaXNDb25maWcubWFwQ2VudGVyLnpvb20sXHJcbiAgICAgICAgICAgIG1hcExheWVycyA9IG5ldyBMLkZlYXR1cmVHcm91cCgpLFxyXG4gICAgICAgICAgICBzdHJpa2VMYXllcnMgPSBuZXcgTC5GZWF0dXJlR3JvdXAoKSxcclxuICAgICAgICAgICAgZm12TGF5ZXJzID0gbmV3IEwuRmVhdHVyZUdyb3VwKCksXHJcbiAgICAgICAgICAgIG92ZXJsYXlzID0gcXMub3ZlcmxheXMgfHwgW10sXHJcbiAgICAgICAgICAgIGV2ZW50cyA9IFtdLFxyXG4gICAgICAgICAgICBmaWx0ZXJlZEV2ZW50cyA9IFtdLFxyXG4gICAgICAgICAgICB2b3RlRmlsdGVyID0gcXMudm90ZUZpbHRlciA/IHFzLnZvdGVGaWx0ZXIgOiBudWxsLFxyXG4gICAgICAgICAgICB2b3RlZEV2ZW50cyA9IFtdLFxyXG4gICAgICAgICAgICB0b3RhbFZvdGVzID0gcXMudG90YWxWb3RlcyA/IHFzLnRvdGFsVm90ZXMgOiAwLFxyXG4gICAgICAgICAgICBzb3VyY2VzID0gW10sXHJcbiAgICAgICAgICAgIHR5cGVzID0gW10sXHJcbiAgICAgICAgICAgIGNvbmZpZGVuY2UgPSAwLFxyXG4gICAgICAgICAgICBsb2NhdGlvblVuY2VydGFpbnR5ID0gMCxcclxuICAgICAgICAgICAgaW50ZW5zaXR5ID0ge1xyXG4gICAgICAgICAgICAgICAgbWluOiAwLFxyXG4gICAgICAgICAgICAgICAgbWF4OiAwXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNuciA9IHtcclxuICAgICAgICAgICAgICAgIG1pbjogMCxcclxuICAgICAgICAgICAgICAgIG1heDogMFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkdXJhdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgIG1pbjogMCxcclxuICAgICAgICAgICAgICAgIG1heDogMFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzb3VyY2VUeXBlID0gcXMuc291cmNlVHlwZSxcclxuICAgICAgICAgICAgbWFwTGF5b3V0Q29tcG9uZW50ID0gbnVsbCxcclxuICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9IHFzLm9ubHlDb3JyZWxhdGlvbnMgPyBxcy5vbmx5Q29ycmVsYXRpb25zIDogZXJpc0NvbmZpZy5vbmx5Q29ycmVsYXRpb25zLFxyXG4gICAgICAgICAgICBjb3VudHJ5TGlzdCA9IFtdLFxyXG4gICAgICAgICAgICBjb3VudHJpZXMgPSBxcy5jb3VudHJpZXMgPyBxcy5jb3VudHJpZXMgOiBbXSxcclxuICAgICAgICAgICAgc2Vuc29ycyA9IHFzLnNlbnNvcnMgPyBxcy5zZW5zb3JzIDogW10sXHJcbiAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5ID0gcXMuZmlsdGVyU3RyYXRlZ3kgPyBxcy5maWx0ZXJTdHJhdGVneSA6IGVyaXNDb25maWcuZmlsdGVyU3RyYXRlZ3ksXHJcbiAgICAgICAgICAgIHN0cmlrZVZpc2liaWxpdHkgPSBxcy5zdHJpa2VWaXNpYmlsaXR5ID8gcXMuc3RyaWtlVmlzaWJpbGl0eSA6IGVyaXNDb25maWcuc3RyaWtlVmlzaWJpbGl0eSxcclxuICAgICAgICAgICAgZm12RmlsdGVyID0gcXMuZm12RmlsdGVyID8gcXMuZm12RmlsdGVyIDogbnVsbCxcclxuICAgICAgICAgICAgZWxsaXBzZUxheWVyID0gbmV3IEwuRmVhdHVyZUdyb3VwKCk7XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygb3ZlcmxheXMgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgIG92ZXJsYXlzID0gW292ZXJsYXlzXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZtLm1hcEhlaWdodCA9IDA7XHJcbiAgICAgICAgdm0ubG9hZGVySGVpZ2h0ID0gJyc7XHJcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xyXG4gICAgICAgIHZtLnRyYWNrTGF5ZXJzID0gbnVsbDtcclxuICAgICAgICB2bS5hY3RpdmVFdmVudCA9IG51bGw7XHJcbiAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAocXMubiB8fCBxcy5uZSkge1xyXG4gICAgICAgICAgICB2YXIgZGRCb3VuZHMgPSBlcmlzU2VydmljZS5nZXREREJvdW5kcyh7XHJcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IHFzLmxvY2F0aW9uRm9ybWF0LFxyXG4gICAgICAgICAgICAgICAgbm9ydGg6IHFzLm4gPyBwYXJzZUZsb2F0KHFzLm4pIDogJycsXHJcbiAgICAgICAgICAgICAgICBzb3V0aDogcXMucyA/IHBhcnNlRmxvYXQocXMucykgOiAnJyxcclxuICAgICAgICAgICAgICAgIGVhc3Q6IHFzLmUgPyBwYXJzZUZsb2F0KHFzLmUpIDogJycsXHJcbiAgICAgICAgICAgICAgICB3ZXN0OiBxcy53ID8gcGFyc2VGbG9hdChxcy53KSA6ICcnLFxyXG4gICAgICAgICAgICAgICAgbWdyc05FOiBxcy5uZSB8fCAnJyxcclxuICAgICAgICAgICAgICAgIG1ncnNTVzogcXMuc3cgfHwgJydcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgc291dGhXZXN0ID0gTC5sYXRMbmcoZGRCb3VuZHNbMF1bMF0sIGRkQm91bmRzWzBdWzFdKSxcclxuICAgICAgICAgICAgICAgIG5vcnRoRWFzdCA9IEwubGF0TG5nKGRkQm91bmRzWzFdWzBdLCBkZEJvdW5kc1sxXVsxXSksXHJcbiAgICAgICAgICAgICAgICBib3VuZHMgPSBMLmxhdExuZ0JvdW5kcyhzb3V0aFdlc3QsIG5vcnRoRWFzdCksXHJcbiAgICAgICAgICAgICAgICBjZW50ZXIgPSBib3VuZHMuZ2V0Q2VudGVyKCk7XHJcblxyXG4gICAgICAgICAgICB2bS5jZW50ZXIgPSB7XHJcbiAgICAgICAgICAgICAgICBsYXQ6IGNlbnRlci5sYXQsXHJcbiAgICAgICAgICAgICAgICBsbmc6IGNlbnRlci5sbmcsXHJcbiAgICAgICAgICAgICAgICB6b29tOiBtYXBab29tXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdm0uY2VudGVyID0gc3RhdGVTZXJ2aWNlLmdldE1hcENlbnRlcigpIHx8IGVyaXNDb25maWcubWFwQ2VudGVyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdWktbGVhZmxldCBkZWZhdWx0c1xyXG4gICAgICAgIHZtLmRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICBjcnM6IGVyaXNDb25maWcuZGVmYXVsdFByb2plY3Rpb24sXHJcbiAgICAgICAgICAgIHpvb21Db250cm9sOiB0cnVlLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGlvbkNvbnRyb2w6IGZhbHNlLFxyXG4gICAgICAgICAgICBjb250cm9sczoge1xyXG4gICAgICAgICAgICAgICAgbGF5ZXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcHJpZ2h0JyxcclxuICAgICAgICAgICAgICAgICAgICBjb2xsYXBzZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIHVpLWxlYWZsZXQgYmFzZWxheWVycyBvYmplY3RcclxuICAgICAgICB2bS5sYXllcnMgPSBfLmNsb25lRGVlcChlcmlzQ29uZmlnLmxheWVycyk7XHJcblxyXG4gICAgICAgIHZhciB1cGRhdGVPdmVybGF5cyA9IGZ1bmN0aW9uIChsYXllcnMpIHtcclxuICAgICAgICAgICAgbGF5ZXJzID0gbGF5ZXJzIHx8IG51bGw7XHJcbiAgICAgICAgICAgIHZhciBkb1VwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChvdmVybGF5cywgZnVuY3Rpb24gKG92ZXJsYXlJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXBPdmVybGF5ID0gbGF5ZXJzLm92ZXJsYXlzW292ZXJsYXlJZF07XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwLmFkZExheWVyKG1hcE92ZXJsYXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcE92ZXJsYXkuYnJpbmdUb0Zyb250KCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaWYgKGxheWVycykge1xyXG4gICAgICAgICAgICAgICAgZG9VcGRhdGUoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldExheWVycygpLnRoZW4oZnVuY3Rpb24gKG1hcExheWVycykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxheWVycyA9IF8uY2xvbmVEZWVwKG1hcExheWVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9VcGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHVwZGF0ZUJhc2VsYXllciA9IGZ1bmN0aW9uIChsYXllcikge1xyXG4gICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRMYXllcnMoKS50aGVuKGZ1bmN0aW9uIChsYXllcnMpIHtcclxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChsYXllcnMuYmFzZWxheWVycywgZnVuY3Rpb24gKGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwLnJlbW92ZUxheWVyKGxheWVyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbWFwLmFkZExheWVyKGxheWVycy5iYXNlbGF5ZXJzW2xheWVyLmlkXSk7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVPdmVybGF5cyhsYXllcnMpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgbWVyZ2VQcm9wcyA9IGZ1bmN0aW9uIChmZWF0dXJlLCBsYXllcikge1xyXG4gICAgICAgICAgICB2YXIgYWN0aXZlRXZlbnQgPSBzdGF0ZVNlcnZpY2UuZ2V0QWN0aXZlRXZlbnQoKTtcclxuICAgICAgICAgICAgbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzID0gZmVhdHVyZS5wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICBpZiAoYWN0aXZlRXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID09PSBsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSAmJiBhY3RpdmVFdmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPT09IGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdKSB7XHJcbiAgICAgICAgICAgICAgICBfLm1lcmdlKGxheWVyLmZlYXR1cmUucHJvcGVydGllcywgYWN0aXZlRXZlbnQucHJvcGVydGllcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGxheWVyO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBzaG93RXZlbnRUcmFjayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgLy8gaWYgKG1hcC5nZXRab29tKCkgPiAxMCkge1xyXG4gICAgICAgICAgICAvLyAgICAgdm0ubG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGdldCB0cmFja3MgZnJvbSBldmVudFxyXG4gICAgICAgICAgICB2YXIgZXZlbnRQYXJhbXMgPSB7fTtcclxuICAgICAgICAgICAgZXZlbnRQYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9IHZtLmFjdGl2ZUV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXTtcclxuICAgICAgICAgICAgZXZlbnRQYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9IHZtLmFjdGl2ZUV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXTtcclxuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRFdmVudFRyYWNrcyhldmVudFBhcmFtcykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgLy8gZHJhdyB0aGUgdHJhY2tzXHJcbiAgICAgICAgICAgICAgICB2YXIgdHJhY2tMYXllcnMgPSBuZXcgTC5GZWF0dXJlR3JvdXAoKSxcclxuICAgICAgICAgICAgICAgICAgICBnZW9KU09OID0gbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2UwSWR4ID0gMCxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2UxSWR4ID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goZGF0YS5mZWF0dXJlcywgZnVuY3Rpb24gKGZlYXR1cmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdHJhY2tDb2xvciA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2tDb2xvciA9IF8uZmluZChlcmlzQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IHRydWUgfSkuY2hhcnRDb2xvcnNbc291cmNlMElkeF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTBJZHgrKztcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFja0NvbG9yID0gXy5maW5kKGVyaXNDb25maWcuc291cmNlcywge2lkZW50aXR5OiBmYWxzZSB9KS5jaGFydENvbG9yc1tzb3VyY2UxSWR4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlMUlkeCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyB1c2UgZmVhdHVyZSBnZW9tZXRyeSB3aGVuIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIHVzZSB0aGUgZmVhdHVyZSBsYXQvbG9uIHBvaW50IHRvIGNyZWF0ZSBhIGdlb21ldHJ5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUuZ2VvbWV0cnkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTiA9IEwuZ2VvSnNvbihmZWF0dXJlLmdlb21ldHJ5LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZTogeyBjb2xvcjogdHJhY2tDb2xvciB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25FYWNoRmVhdHVyZTogZnVuY3Rpb24gKGZlYXR1cmVEYXRhLCBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyID0gbWVyZ2VQcm9wcyhmZWF0dXJlLCBsYXllcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRUb0xheWVyOiBmdW5jdGlvbiAoZmVhdHVyZSwgbGF0bG5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUudHlwZSA9PT0gJ1BvaW50Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTC5jaXJjbGVNYXJrZXIobGF0bG5nLCB7IGNvbG9yOiB0cmFja0NvbG9yLCBzdHJva2U6IGZhbHNlLCBmaWxsT3BhY2l0eTogMSwgcmFkaXVzOiA1IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrTGF5ZXJzLmFkZExheWVyKGdlb0pTT04pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsYXRsbmcgPSBMLmxhdExuZyhmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubGF0RmllbGRdLCBmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9uRmllbGRdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYXRsbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjaXJjbGVNYXJrZXIgPSBMLmNpcmNsZU1hcmtlcihsYXRsbmcsIHsgY29sb3I6IHZtLmFjdGl2ZUV2ZW50LmV2ZW50U291cmNlLmNvbG9yIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04gPSBMLmdlb0pzb24oY2lyY2xlTWFya2VyLnRvR2VvSlNPTigpLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkRGF0YTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2lyY2xlTWFya2VyLnRvR2VvSlNPTigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRUb0xheWVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaXJjbGVNYXJrZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkVhY2hGZWF0dXJlOiBmdW5jdGlvbiAoZmVhdHVyZURhdGEsIGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyID0gbWVyZ2VQcm9wcyhmZWF0dXJlLCBsYXllcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFja0xheWVycy5hZGRMYXllcihnZW9KU09OKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZ2VvSlNPTikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9KU09OLmVhY2hMYXllcihmdW5jdGlvbiAobGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLmZlYXR1cmUuZXZlbnRTb3VyY2UgPSBfLmZpbmQoZXJpc0NvbmZpZy5zb3VyY2VzLCB7IGlkZW50aXR5OiBsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF19KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLmZlYXR1cmUuZXZlbnRUeXBlID0gXy5maW5kKGVyaXNDb25maWcudHlwZXMsIHsgdmFsdWU6IGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci50eXBlRmllbGRdIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5vbignbW91c2VvdmVyJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUubGF5ZXIuYmluZFBvcHVwKGVyaXNTZXJ2aWNlLmdldExlYWZsZXRQb3B1cENvbnRlbnQoZS5sYXllci5mZWF0dXJlKSwgeyAnb2Zmc2V0JzogTC5wb2ludCgwLCAtMTApLCAnYXV0b1Bhbic6IGZhbHNlIH0pLm9wZW5Qb3B1cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5vbignbW91c2VvdXQnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5sYXllci5jbG9zZVBvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChfLmtleXModHJhY2tMYXllcnMuZ2V0Qm91bmRzKCkpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnREYXRhKHRyYWNrTGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodm0udHJhY2tMYXllcnMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIG90aGVyIHRyYWNrcyBiZWZvcmUgYWRkaW5nIG5ldyBvbmVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnRyYWNrTGF5ZXJzLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNsb25lIHRyYWNrTGF5ZXJzIGZvciB1c2UgZWxzZXdoZXJlIHRvIGF2b2lkIHRyaWdnZXJpbmdcclxuICAgICAgICAgICAgICAgICAgICAvLyBhbiBhbmd1bGFyIHdhdGNoIHVwZGF0ZVxyXG4gICAgICAgICAgICAgICAgICAgIHZtLnRyYWNrTGF5ZXJzID0gXy5jbG9uZURlZXAodHJhY2tMYXllcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXAuZ2V0Wm9vbSgpID4gMTApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZExheWVyKHZtLnRyYWNrTGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIERyYXdpbmcgVHJhY2tzOiBHZW9tZXRyeSBhbmQgTGF0L0xvbiB2YWx1ZXMgYXJlIG51bGwuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gdm0ubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZmlsdGVyRXZlbnRCeVR5cGUgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGlmIChfLmZpbmQodHlwZXMsIHsgdmFsdWU6IGV2ZW50LmZlYXR1cmUuZXZlbnRUeXBlLnZhbHVlIH0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGZpbHRlckV2ZW50QnlTZW5zb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgaWYgKHNlbnNvcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKF8uaW5kZXhPZihzZW5zb3JzLCBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc2Vuc29yRmllbGRdKSA+IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGZpbHRlckV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIG1hcEJvdW5kcyA9IHN0YXRlU2VydmljZS5nZXRNYXBCb3VuZHMoKTtcclxuICAgICAgICAgICAgZmlsdGVyZWRFdmVudHMgPSBfLmZpbHRlcihldmVudHMsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJldHVyblZhbCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyIGJ5IGNvcnJlbGF0aW9uLCB0eXBlLCBhbmQgc2Vuc29yXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsID0gb25seUNvcnJlbGF0aW9ucyA9PT0gJ2NvcnJlbGF0ZWQnID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzLmlzX2NvcnJlbGF0ZWQgJiYgZmlsdGVyRXZlbnRCeVR5cGUoZXZlbnQpICYmIGZpbHRlckV2ZW50QnlTZW5zb3IoZXZlbnQpIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9PT0gJ25vbmNvcnJlbGF0ZWQnID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICFldmVudC5mZWF0dXJlLnByb3BlcnRpZXMuaXNfY29ycmVsYXRlZCAmJiBmaWx0ZXJFdmVudEJ5VHlwZShldmVudCkgJiYgZmlsdGVyRXZlbnRCeVNlbnNvcihldmVudCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyRXZlbnRCeVR5cGUoZXZlbnQpICYmIGZpbHRlckV2ZW50QnlTZW5zb3IoZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgYnkgY29ycmVsYXRpb24sIGNvbmZpZGVuY2UsIGxvY2F0aW9uVW5jZXJ0YWludHksIGludGVuc2l0eSwgc25yLCBkdXJhdGlvbiwgbWFwIGJvdW5kcywgdHlwZSwgYW5kIHNlbnNvclxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBldmVudER1cmF0aW9uID0gbW9tZW50LmR1cmF0aW9uKCcwMDonICsgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmR1cmF0aW9uRmllbGRdKS5hc1NlY29uZHMoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWwgPSBvbmx5Q29ycmVsYXRpb25zID09PSAnY29ycmVsYXRlZCcgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC5mZWF0dXJlLnByb3BlcnRpZXMuaXNfY29ycmVsYXRlZCAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuY29uZmlkZW5jZUZpZWxkXSA+PSBjb25maWRlbmNlICYmIChldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkXSA8PSBsb2NhdGlvblVuY2VydGFpbnR5IHx8IGNvbmZpZGVuY2UgJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvY2F0aW9uVW5jZXJ0YWludHlGaWVsZF0gPT09IG51bGwpICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0gPj0gaW50ZW5zaXR5Lm1pbiAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaW50ZW5zaXR5RmllbGRdIDw9IGludGVuc2l0eS5tYXggJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnNuckZpZWxkXSA+PSBzbnIubWluICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gPD0gc25yLm1heCAmJiBldmVudER1cmF0aW9uID49IGR1cmF0aW9uLm1pbiAmJiBldmVudER1cmF0aW9uIDw9IGR1cmF0aW9uLm1heCAmJiBtYXBCb3VuZHMuY29udGFpbnMoZXZlbnQuX2xhdGxuZykgJiYgZmlsdGVyRXZlbnRCeVR5cGUoZXZlbnQpICYmIGZpbHRlckV2ZW50QnlTZW5zb3IoZXZlbnQpIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9PT0gJ25vbmNvcnJlbGF0ZWQnID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICFldmVudC5mZWF0dXJlLnByb3BlcnRpZXMuaXNfY29ycmVsYXRlZCAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuY29uZmlkZW5jZUZpZWxkXSA+PSBjb25maWRlbmNlICYmIChldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkXSA8PSBsb2NhdGlvblVuY2VydGFpbnR5IHx8IGNvbmZpZGVuY2UgJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvY2F0aW9uVW5jZXJ0YWludHlGaWVsZF0gPT09IG51bGwpICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0gPj0gaW50ZW5zaXR5Lm1pbiAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaW50ZW5zaXR5RmllbGRdIDw9IGludGVuc2l0eS5tYXggJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnNuckZpZWxkXSA+PSBzbnIubWluICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gPD0gc25yLm1heCAmJiBldmVudER1cmF0aW9uID49IGR1cmF0aW9uLm1pbiAmJiBldmVudER1cmF0aW9uIDw9IGR1cmF0aW9uLm1heCAmJiBtYXBCb3VuZHMuY29udGFpbnMoZXZlbnQuX2xhdGxuZykgJiYgZmlsdGVyRXZlbnRCeVR5cGUoZXZlbnQpICYmIGZpbHRlckV2ZW50QnlTZW5zb3IoZXZlbnQpIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGRdID49IGNvbmZpZGVuY2UgJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA+PSBpbnRlbnNpdHkubWluICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0gPD0gaW50ZW5zaXR5Lm1heCAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGRdID49IHNuci5taW4gJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnNuckZpZWxkXSA8PSBzbnIubWF4ICYmIGV2ZW50RHVyYXRpb24gPj0gZHVyYXRpb24ubWluICYmIGV2ZW50RHVyYXRpb24gPD0gZHVyYXRpb24ubWF4ICYmIG1hcEJvdW5kcy5jb250YWlucyhldmVudC5fbGF0bG5nKSAmJiBmaWx0ZXJFdmVudEJ5VHlwZShldmVudCkgJiYgZmlsdGVyRXZlbnRCeVNlbnNvcihldmVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJldHVyblZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmbXZGaWx0ZXIgPT09ICdlbmFibGVkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFzRk1WID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChmbXZMYXllcnMuZ2V0TGF5ZXJzKCksIGZ1bmN0aW9uIChmbXYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChMLmxhdExuZ0JvdW5kcyhmbXYuX2xhdGxuZ3MpLmNvbnRhaW5zKGV2ZW50Ll9sYXRsbmcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZExheWVyKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNGTVYgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gZXhpdCBmb3JFYWNoIGxvb3BcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzRk1WKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMucmVtb3ZlTGF5ZXIoZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMuYWRkTGF5ZXIoZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLnJlbW92ZUxheWVyKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0dXJuVmFsO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEV2ZW50cyhfLm1hcChmaWx0ZXJlZEV2ZW50cywgJ2ZlYXR1cmUnKSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHVwZGF0ZVN0cmlrZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHN0cmlrZUxheWVycy5jbGVhckxheWVycygpO1xyXG4gICAgICAgICAgICBpZiAoc3RyaWtlVmlzaWJpbGl0eSA9PT0gJ3Zpc2libGUnKSB7XHJcbiAgICAgICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldFN0cmlrZXMoKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdlb0pTT04gPSBMLmdlb0pzb24oZGF0YS5mZWF0dXJlcywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludFRvTGF5ZXI6IGZ1bmN0aW9uIChmZWF0dXJlLCBsYXRsbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMLmNpcmNsZU1hcmtlcihsYXRsbmcsIHsgY29sb3I6ICcjZmZkNjAwJywgc3Ryb2tlOiBmYWxzZSwgZmlsbE9wYWNpdHk6IDEsIHJhZGl1czogNSwgY2xhc3NOYW1lOiAnc3RyaWtlLW1hcmtlcicgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBnZW9KU09OLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLmxheWVyLmJpbmRQb3B1cChlcmlzU2VydmljZS5nZXRTdHJpa2VQb3B1cENvbnRlbnQoZS5sYXllci5mZWF0dXJlKSwgeyAnb2Zmc2V0JzogTC5wb2ludCgwLCAtMTApLCAnYXV0b1Bhbic6IGZhbHNlIH0pLm9wZW5Qb3B1cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGdlb0pTT04ub24oJ21vdXNlb3V0JywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5sYXllci5jbG9zZVBvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5lYWNoTGF5ZXIoZnVuY3Rpb24gKGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmlrZUxheWVycy5hZGRMYXllcihsYXllcikuYnJpbmdUb0JhY2soKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHVwZGF0ZUV2ZW50cyA9IF8uZGVib3VuY2UoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBldmVudHMgPSBbXTtcclxuICAgICAgICAgICAgbWFwTGF5ZXJzLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2VzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgZXZlbnRzJyk7XHJcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2FkaW5nRXZlbnRzKHZtLmxvYWRpbmcpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGhhbmRsZURhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmZlYXR1cmVzICYmIGRhdGEuZmVhdHVyZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U2Vuc29yTGlzdChfLm9yZGVyQnkoXy51bmlxKF8ubWFwKGRhdGEuZmVhdHVyZXMsICdwcm9wZXJ0aWVzLicgKyBlcmlzQ29uZmlnLnNlcnZlci5zZW5zb3JGaWVsZCkpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZW9KU09OID0gTC5nZW9Kc29uKGRhdGEuZmVhdHVyZXMsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50VG9MYXllcjogZnVuY3Rpb24gKGZlYXR1cmUsIGxhdGxuZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzb3VyY2UgPSBfLmZpbmQoZXJpc0NvbmZpZy5zb3VyY2VzLCB7IGlkZW50aXR5OiBmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF19KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3IgPSBzb3VyY2UgPyBzb3VyY2UuY29sb3IgOiAnIzU1NSc7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMLmNpcmNsZU1hcmtlcihsYXRsbmcsIHsgY29sb3I6IGNvbG9yIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFjdGl2ZU1hcEV2ZW50ID0gXy5maW5kKGV2ZW50cywgeyBmZWF0dXJlOiB2bS5hY3RpdmVFdmVudCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aXZlTWFwRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTWFwRXZlbnQuc2V0U3R5bGUoeyBjb2xvcjogYWN0aXZlTWFwRXZlbnQuZmVhdHVyZS5ldmVudFNvdXJjZS5jb2xvciwgZmlsbE9wYWNpdHk6IDAuMiB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWN0aXZlTWFwRXZlbnQuYnJpbmdUb0JhY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFwRXZlbnQgPSBlLmxheWVyLmZlYXR1cmU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBFdmVudC5zY3JvbGxUbyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlRXZlbnQobWFwRXZlbnQsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5vbignbW91c2VvdmVyJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUubGF5ZXIuYmluZFBvcHVwKGVyaXNTZXJ2aWNlLmdldExlYWZsZXRQb3B1cENvbnRlbnQoZS5sYXllci5mZWF0dXJlKSwgeyAnb2Zmc2V0JzogTC5wb2ludCgwLCAtMTApLCAnYXV0b1Bhbic6IGZhbHNlIH0pLm9wZW5Qb3B1cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5vbignbW91c2VvdXQnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5sYXllci5jbG9zZVBvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9KU09OLmVhY2hMYXllcihmdW5jdGlvbiAobGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5hY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9PT0gdm0uYWN0aXZlRXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICYmIGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID09PSB2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZmVhdHVyZS5hY3RpdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb3VudHJ5Q29kZXMgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChjb3VudHJpZXMsIGZ1bmN0aW9uIChjb3VudHJ5SWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY291bnRyeU9iaiA9IF8uZmluZChjb3VudHJ5TGlzdCwgeyBnaWQ6IGNvdW50cnlJZCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY291bnRyeU9iaikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudHJ5Q29kZXMucHVzaChjb3VudHJ5T2JqLmNjKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZpbHRlciBieSBjb3VudHJpZXMgYW5kIHZvdGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGNvdW50cmllcy5sZW5ndGggPiAwICYmIF8uaW5kZXhPZihjb3VudHJ5Q29kZXMsIGxheWVyLmZlYXR1cmUucHJvcGVydGllcy5jb3VudHJ5X2NvZGUpID4gLTEpIHx8IGNvdW50cmllcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBlaXRoZXIgZXZlbnQgZmFsbHMgd2l0aGluIGNvdW50cnkgb3Igbm8gY291bnRyeSBmaWx0ZXIgd2FzIHNwZWNpZmllZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLmZlYXR1cmUuZXZlbnRTb3VyY2UgPSBfLmZpbmQoZXJpc0NvbmZpZy5zb3VyY2VzLCB7aWRlbnRpdHk6IGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXX0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLmZlYXR1cmUuZXZlbnRUeXBlID0gXy5maW5kKGVyaXNDb25maWcudHlwZXMsIHt2YWx1ZTogbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnR5cGVGaWVsZF19KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodm90ZUZpbHRlciA9PT0gJ2VuYWJsZWQnICYmIHZvdGVkRXZlbnRzICYmIHZvdGVkRXZlbnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBhZGQgZXZlbnRzIHRoYXQgaGF2ZSB2b3Rlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdm90ZXMgPSBfLmZpbHRlcih2b3RlZEV2ZW50cywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnRbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9PT0gbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gJiYgZXZlbnRbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9PT0gbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodm90ZXMubGVuZ3RoID49IHRvdGFsVm90ZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcExheWVycy5hZGRMYXllcihsYXllcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBubyBmaWx0ZXJpbmcgbmVjZXNzYXJ5LCBqdXN0IGFkZCB0aGUgbGF5ZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZExheWVyKGxheWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudHMgPSBtYXBMYXllcnMuZ2V0TGF5ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5hY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hvd0V2ZW50VHJhY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnRzKFtdKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlU3RyaWtlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudExheWVycyhtYXBMYXllcnMuZ2V0TGF5ZXJzKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLmxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TG9hZGluZ0V2ZW50cyh2bS5sb2FkaW5nKTtcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlU2VydmljZS5nZXRQb2xsKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBwb2xsIGZvciBjaGFuZ2VzXHJcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRFdmVudHMoc291cmNlcywgdm90ZWRFdmVudHMpLnRoZW4obnVsbCwgbnVsbCwgZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcExheWVycy5jbGVhckxheWVycygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnRzKFtdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuJHJlc29sdmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlRGF0YShkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGp1c3QgZG8gYSBzaW5nbGUgcmVxdWVzdFxyXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0RXZlbnRzT25jZShzb3VyY2VzLCB2b3RlZEV2ZW50cykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVEYXRhKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMTAwMCk7XHJcblxyXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBtYXAgPSBkYXRhO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBzb3V0aFdlc3QgPSBMLmxhdExuZygtOTAsIC0xODApLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vcnRoRWFzdCA9IEwubGF0TG5nKDkwLCAxODApO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJvdW5kcyA9IEwubGF0TG5nQm91bmRzKHNvdXRoV2VzdCwgbm9ydGhFYXN0KTtcclxuXHJcbiAgICAgICAgICAgICAgICBtYXAuc2V0TWF4Qm91bmRzKGJvdW5kcyk7XHJcbiAgICAgICAgICAgICAgICBtYXAub24oJ2RyYWcnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBcdG1hcC5wYW5JbnNpZGVCb3VuZHMoYm91bmRzLCB7IGFuaW1hdGU6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkIHNjYWxlIGNvbnRyb2xcclxuICAgICAgICAgICAgICAgIEwuY29udHJvbC5zY2FsZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgaW1wZXJpYWw6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9KS5hZGRUbyhtYXApO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGRpc2FibGUgbGVhZmxldCBrZXlib2FyZCBzaG9ydGN1dHMgdG8gcHJldmVudCBjb2xsaXNpb24gd2l0aCBhbmd1bGFyIGhvdGtleXNcclxuICAgICAgICAgICAgICAgIG1hcC5rZXlib2FyZC5kaXNhYmxlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBkZWZhdWx0IGljb24gcGF0aFxyXG4gICAgICAgICAgICAgICAgTC5JY29uLkRlZmF1bHQuaW1hZ2VQYXRoID0gJy9zdHlsZXNoZWV0cy9pbWFnZXMnO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFkZCBmZWF0dXJlIGdyb3VwIHRvIHRoZSBtYXBcclxuICAgICAgICAgICAgICAgIG1hcExheWVycy5hZGRUbyhtYXApO1xyXG4gICAgICAgICAgICAgICAgc3RyaWtlTGF5ZXJzLmFkZFRvKG1hcCk7XHJcbiAgICAgICAgICAgICAgICBmbXZMYXllcnMuYWRkVG8obWFwKTtcclxuICAgICAgICAgICAgICAgIGVsbGlwc2VMYXllci5hZGRUbyhtYXApO1xyXG5cclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBCb3VuZHMobWFwLmdldEJvdW5kcygpKTtcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBab29tKG1hcC5nZXRab29tKCkpO1xyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE9ubHlDb3JyZWxhdGlvbnMob25seUNvcnJlbGF0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RmlsdGVyU3RyYXRlZ3koZmlsdGVyU3RyYXRlZ3kpO1xyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFN0cmlrZVZpc2liaWxpdHkoc3RyaWtlVmlzaWJpbGl0eSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkIGNvb3JkaW5hdGVzIGNvbnRyb2xcclxuICAgICAgICAgICAgICAgIEwuY29udHJvbC5jb29yZGluYXRlcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlVXNlcklucHV0OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB1c2VMYXRMbmdPcmRlcjogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSkuYWRkVG8obWFwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhZGQgY29udHJvbCB0byBvbmx5IHNob3cgZXZlbnRzIHdpdGggY29ycmVsYXRpb25zXHJcbiAgICAgICAgICAgICAgICB2YXIgY29ycmVsYXRlZEJ0biA9IEwuZWFzeUJ1dHRvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZU5hbWU6ICdjb3JyZWxhdGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2VyaXMtbWFwYnRuIGVyaXMtbWFwYnRuLWNvcnJlbGF0ZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1Nob3dpbmcgZXZlbnRzIHdpdGggY29ycmVsYXRpb25zJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKGJ0bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuLnN0YXRlKCdub25jb3JyZWxhdGVkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gJ25vbmNvcnJlbGF0ZWQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE9ubHlDb3JyZWxhdGlvbnMob25seUNvcnJlbGF0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlTmFtZTogJ25vbmNvcnJlbGF0ZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uOiAnZXJpcy1tYXBidG4gZXJpcy1tYXBidG4tbm9uY29ycmVsYXRlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnU2hvd2luZyBldmVudHMgd2l0aCBubyBjb3JyZWxhdGlvbnMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoYnRuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG4uc3RhdGUoJ2FsbCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9ICdhbGwnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE9ubHlDb3JyZWxhdGlvbnMob25seUNvcnJlbGF0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlTmFtZTogJ2FsbCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdlcmlzLW1hcGJ0biBlcmlzLW1hcGJ0bi1hbGwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1Nob3dpbmcgYWxsIGV2ZW50cycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uIChidG4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bi5zdGF0ZSgnY29ycmVsYXRlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9ICdjb3JyZWxhdGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRPbmx5Q29ycmVsYXRpb25zKG9ubHlDb3JyZWxhdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgY29ycmVsYXRlZEJ0bi5zdGF0ZShvbmx5Q29ycmVsYXRpb25zKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhZGQgY29udHJvbCB0byBkZXRlcm1pbmUgaG93IGRhdGEgaXMgZmlsdGVyZWRcclxuICAgICAgICAgICAgICAgIHZhciBmaWx0ZXJTdHJhdGVneUJ0biA9IEwuZWFzeUJ1dHRvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZU5hbWU6ICdzZXJ2ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uOiAnZmEtc2VydmVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdGaWx0ZXJpbmcgRGF0YSBvbiBTZXJ2ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoYnRuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkb24ndCBsZXQgdGhpcyBoYXBwZW4gaWYgdGVtcG9yYWwgZmlsdGVyIGlzIHRvbyBsYXJnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBvcmFsRmlsdGVyID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcG9yYWxEaWZmID0gbW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdG9wKS5kaWZmKG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RhcnQpLCAnaCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZW1wb3JhbERpZmYgPD0gMjQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG4uc3RhdGUoJ2NsaWVudCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5ID0gJ2NsaWVudCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZpbHRlclN0cmF0ZWd5KGZpbHRlclN0cmF0ZWd5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnVGVtcG9yYWwgZmlsdGVyIHJhbmdlIG11c3QgYmUgc2hvcnRlciB0aGFuIDI0IGhvdXJzIHRvIGZpbHRlciBjbGllbnQtc2lkZS4nKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlTmFtZTogJ2NsaWVudCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdmYS11c2VyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdGaWx0ZXJpbmcgRGF0YSBvbiBDbGllbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoYnRuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG4uc3RhdGUoJ3NlcnZlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RyYXRlZ3kgPSAnc2VydmVyJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGaWx0ZXJTdHJhdGVneShmaWx0ZXJTdHJhdGVneSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJTdHJhdGVneUJ0bi5zdGF0ZShmaWx0ZXJTdHJhdGVneSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkIGNvbnRyb2wgdG8gc2hvdy9oaWRlIHN0cmlrZSBldmVudHNcclxuICAgICAgICAgICAgICAgIHZhciBzdHJpa2VCdG4gPSBMLmVhc3lCdXR0b24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlczogW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVOYW1lOiAndmlzaWJsZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdmYS1ib2x0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdTaG93aW5nIFN0cmlrZSBFdmVudHMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoYnRuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG4uc3RhdGUoJ2hpZGRlbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWtlVmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFN0cmlrZVZpc2liaWxpdHkoc3RyaWtlVmlzaWJpbGl0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlTmFtZTogJ2hpZGRlbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdmYS1ib2x0IGVyaXMtbWFwYnRuLWRpc2FibGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdIaWRpbmcgU3RyaWtlIEV2ZW50cycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uIChidG4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bi5zdGF0ZSgndmlzaWJsZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWtlVmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRTdHJpa2VWaXNpYmlsaXR5KHN0cmlrZVZpc2liaWxpdHkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgc3RyaWtlQnRuLnN0YXRlKHN0cmlrZVZpc2liaWxpdHkpO1xyXG5cclxuICAgICAgICAgICAgICAgIEwuZWFzeUJhcihbY29ycmVsYXRlZEJ0biwgZmlsdGVyU3RyYXRlZ3lCdG5dKS5hZGRUbyhtYXApO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBmaWxlTGF5ZXJDb250cm9sID0gTC5Db250cm9sLmZpbGVMYXllckxvYWQoe1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsbG93cyB5b3UgdG8gdXNlIGEgY3VzdG9taXplZCB2ZXJzaW9uIG9mIEwuZ2VvSnNvbi5cclxuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgZXhhbXBsZSBpZiB5b3UgYXJlIHVzaW5nIHRoZSBQcm9qNExlYWZsZXQgbGVhZmxldCBwbHVnaW4sXHJcbiAgICAgICAgICAgICAgICAgICAgLy8geW91IGNhbiBwYXNzIEwuUHJvai5nZW9Kc29uIGFuZCBsb2FkIHRoZSBmaWxlcyBpbnRvIHRoZVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEwuUHJvai5HZW9Kc29uIGluc3RlYWQgb2YgdGhlIEwuZ2VvSnNvbi5cclxuICAgICAgICAgICAgICAgICAgICBsYXllcjogTC5nZW9Kc29uLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFNlZSBodHRwOi8vbGVhZmxldGpzLmNvbS9yZWZlcmVuY2UuaHRtbCNnZW9qc29uLW9wdGlvbnNcclxuICAgICAgICAgICAgICAgICAgICBsYXllck9wdGlvbnM6IHtzdHlsZToge2NvbG9yOid5ZWxsb3cnfX0sXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHRvIG1hcCBhZnRlciBsb2FkaW5nIChkZWZhdWx0OiB0cnVlKSA/XHJcbiAgICAgICAgICAgICAgICAgICAgYWRkVG9NYXA6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsZSBzaXplIGxpbWl0IGluIGtiIChkZWZhdWx0OiAxMDI0KSA/XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVNpemVMaW1pdDogMTAyNDAsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzdHJpY3QgYWNjZXB0ZWQgZmlsZSBmb3JtYXRzIChkZWZhdWx0OiAuZ2VvanNvbiwgLmpzb24sIC5rbWwsIGFuZCAuZ3B4KSA/XHJcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0czogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAnLmttbCdcclxuICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICB9KS5hZGRUbyhtYXApO1xyXG5cclxuICAgICAgICAgICAgICAgIGZpbGVMYXllckNvbnRyb2wubG9hZGVyLm9uKCdkYXRhOmxvYWRlZCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGZpbGVMYXllckNvbnRyb2wubG9hZGVyLm9uKCdkYXRhOmVycm9yJywgZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkIGNvbnRyb2wgdG8gdXBsb2FkIEtNTFxyXG4gICAgICAgICAgICAgICAgdmFyIHVwbG9hZEttbEJ0biA9IEwuZWFzeUJ1dHRvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZU5hbWU6ICd1cGxvYWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uOiAnZXJpcy1tYXBidG4gZXJpcy1tYXBidG4ta21sLXVwbG9hZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnVXBsb2FkIEtNTCBGaWxlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KCdhLmxlYWZsZXQtY29udHJvbC1maWxlbGF5ZXInKVswXS5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFkZCBjb250cm9sIHRvIGRvd25sb2FkIEtNTFxyXG4gICAgICAgICAgICAgICAgdmFyIGRvd25sb2FkS21sQnRuID0gTC5lYXN5QnV0dG9uKHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZXM6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlTmFtZTogJ2Rvd25sb2FkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2VyaXMtbWFwYnRuIGVyaXMtbWFwYnRuLWttbC1kb3dubG9hZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnRG93bmxvYWQgRXZlbnRzIGFzIEtNTCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uIChidG4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBldmVudHMgPSBzdGF0ZVNlcnZpY2UuZ2V0RXZlbnRzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmV4cG9ydEttbCh0b2ttbChtYXBMYXllcnMudG9HZW9KU09OKCksIHsgdGltZXN0YW1wOiAnZXZlbnRfdGltZScgfSkpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gZGF0YS5kYXRhLmZpbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG4uc3RhdGUoJ2Rvd25sb2FkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIGRvd25sb2FkaW5nIEtNTCcpLnRoZW1lKCdmYWlsLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnTm8gZXZlbnRzIGZvdW5kLiBUcnkgY2hhbmdpbmcgeW91ciBzZWFyY2ggcGFyYW1ldGVycy4nKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgTC5lYXN5QmFyKFt1cGxvYWRLbWxCdG4sIGRvd25sb2FkS21sQnRuXSkuYWRkVG8obWFwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhZGQgY29udHJvbCB0byBkb3dubG9hZCBhbGwgRVhUJ3NcclxuICAgICAgICAgICAgICAgIHZhciBleHREb3dubG9hZEJ0biA9IEwuZWFzeUJ1dHRvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZU5hbWU6ICdkb3dubG9hZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdmYS1kb3dubG9hZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnRG93bmxvYWQgRXZlbnQgSDUgRmlsZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoYnRuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZXZlbnRzID0gc3RhdGVTZXJ2aWNlLmdldEV2ZW50cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50cy5sZW5ndGggPiBlcmlzQ29uZmlnLmV4dERvd25sb2FkTGltaXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXZlbnQgbGltaXQgZXhjZWVkZWQuIEFkanVzdCB5b3VyIHNlYXJjaCBwYXJhbWV0ZXJzIHRvIHJlZHVjZSBldmVudHMgc2hvd24gdG8gZmV3ZXIgdGhhbiAnICsgZXJpc0NvbmZpZy5leHREb3dubG9hZExpbWl0ICsgJy4nKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuLnN0YXRlKCdsb2FkaW5nJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZG93bmxvYWRFeHRGaWxlcyhfLm1hcChldmVudHMsICdwcm9wZXJ0aWVzLmZpbGVfcGF0aCcpKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG4uc3RhdGUoJ2Rvd25sb2FkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LmxvY2F0aW9uLmhyZWYgPSBkYXRhLmRhdGEuZmlsZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuLnN0YXRlKCdkb3dubG9hZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgZG93bmxvYWRpbmcgZXZlbnRzJykudGhlbWUoJ2ZhaWwtdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdObyBldmVudHMgZm91bmQuIFRyeSBjaGFuZ2luZyB5b3VyIHNlYXJjaCBwYXJhbWV0ZXJzLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVOYW1lOiAnbG9hZGluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdmYS1jb2cgZmEtc3BpbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnRG93bmxvYWRpbmcgRmlsZXMnXHJcbiAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIEwuZWFzeUJhcihbZXh0RG93bmxvYWRCdG5dKS5hZGRUbyhtYXApO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBiYXNlbGF5ZXJJZCA9IHFzLmJhc2VsYXllcixcclxuICAgICAgICAgICAgICAgICAgICBiYXNlbGF5ZXIgPSB7fTtcclxuICAgICAgICAgICAgICAgIGlmIChiYXNlbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCByZXF1ZXN0ZWQgYmFzZWxheWVyIHRvIHZtLmxheWVycy5iYXNlbGF5ZXJzIGZpcnN0XHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZWxheWVyID0gXy5maW5kKGVyaXNDb25maWcubGF5ZXJzLmJhc2VsYXllcnMsIHsgaWQ6IGJhc2VsYXllcklkIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUJhc2VsYXllcihiYXNlbGF5ZXIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBiYXNlbGF5ZXIgbm90IHByZXNlbnQgaW4gcXVlcnlzdHJpbmcsIHNvIGp1c3QgZ28gd2l0aCBkZWZhdWx0c1xyXG4gICAgICAgICAgICAgICAgICAgIGJhc2VsYXllciA9IGVyaXNDb25maWcubGF5ZXJzLmJhc2VsYXllcnNbZXJpc0NvbmZpZy5kZWZhdWx0QmFzZWxheWVyXTtcclxuICAgICAgICAgICAgICAgICAgICB2bS5sYXllcnMgPSBfLmNsb25lRGVlcChlcmlzQ29uZmlnLmxheWVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJhc2VsYXllcihiYXNlbGF5ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZU92ZXJsYXlzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbWFwLm9uKCdiYXNlbGF5ZXJjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBiYXNlbGF5ZXIgPSBfLmZpbmQoZXJpc0NvbmZpZy5sYXllcnMuYmFzZWxheWVycywgeyBuYW1lOiBlLm5hbWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJhc2VsYXllcihiYXNlbGF5ZXIpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbWFwLm9uKCdvdmVybGF5YWRkJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb3ZlcmxheWFkZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvdmVybGF5ID0gXy5maW5kKGVyaXNDb25maWcubGF5ZXJzLm92ZXJsYXlzLCB7IG5hbWU6IGUubmFtZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoXy5pbmRleE9mKG92ZXJsYXlzLCBvdmVybGF5LmlkKSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheXMucHVzaChvdmVybGF5LmlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE92ZXJsYXlzKG92ZXJsYXlzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBtYXAub24oJ292ZXJsYXlyZW1vdmUnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdmVybGF5cmVtb3ZlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG92ZXJsYXkgPSBfLmZpbmQoZXJpc0NvbmZpZy5sYXllcnMub3ZlcmxheXMsIHsgbmFtZTogZS5uYW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIG92ZXJsYXlzID0gXy5yZW1vdmUob3ZlcmxheXMsIG92ZXJsYXkuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRPdmVybGF5cyhvdmVybGF5cyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBtYXAub24oJ21vdmVlbmQnLCBfLmRlYm91bmNlKGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE1hcFpvb20oZS50YXJnZXQuZ2V0Wm9vbSgpKTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TWFwQm91bmRzKGUudGFyZ2V0LmdldEJvdW5kcygpKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgY2VudGVyT25BY3RpdmVFdmVudCA9IHN0YXRlU2VydmljZS5nZXRDZW50ZXJPbkFjdGl2ZUV2ZW50KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjZW50ZXJPbkFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hcCB3YXMgbW92ZWQgYnkgdXNlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlU3RyaWtlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFwIHdhcyBtb3ZlZCBieSBhcHAgd2hpbGUgbG9hZGluZyBhY3RpdmUgZXZlbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldENlbnRlck9uQWN0aXZlRXZlbnQoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodm0uYWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2hvdy9oaWRlIGV2ZW50IHRyYWNrIGJhc2VkIG9uIHpvb20gbGV2ZWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8ua2V5cyh2bS50cmFja0xheWVycy5nZXRCb3VuZHMoKSkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0LmdldFpvb20oKSA+IDEwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZExheWVyKHZtLnRyYWNrTGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLnJlbW92ZUxheWVyKHZtLnRyYWNrTGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sIDc1MCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QmFzZWxheWVyKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdXBkYXRlQmFzZWxheWVyKG5ld1ZhbHVlKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpc29sYXRlZCB3aWxsIGJlIHRydWUgd2hlbiBldmVudHMgcG9sbGluZyBpcyBhY3RpdmVcclxuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpIHx8IG5ld1ZhbHVlLmlzb2xhdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRBY3RpdmVTb3VyY2VzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc291cmNlcyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRBY3RpdmVUeXBlcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHR5cGVzID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0U291cmNlVHlwZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNvdXJjZVR5cGUgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRGaWx0ZXJTdHJhdGVneSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5ID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0U3RyaWtlVmlzaWJpbGl0eSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHN0cmlrZVZpc2liaWxpdHkgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgdXBkYXRlU3RyaWtlcygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Rk1WRmlsdGVyKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm12RmlsdGVyID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGlmIChmbXZGaWx0ZXIgPT09ICdkaXNhYmxlZCcpIHtcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGTVZMYXllcnMobmV3IEwuRmVhdHVyZUdyb3VwKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEZNVkxheWVycygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChmbXZMYXllcnMuZ2V0TGF5ZXJzKCkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgZm12TGF5ZXJzLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlICYmIG5ld1ZhbHVlLmdldExheWVycygpLmxlbmd0aCA+IDAgJiYgZm12RmlsdGVyID09PSAnZW5hYmxlZCcpIHtcclxuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLmVhY2hMYXllcihmdW5jdGlvbiAobGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBmbXZMYXllcnMuYWRkTGF5ZXIobGF5ZXIpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q29uZmlkZW5jZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbmZpZGVuY2UgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgaWYgKGZpbHRlclN0cmF0ZWd5ID09PSAnc2VydmVyJykge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TG9jYXRpb25VbmNlcnRhaW50eSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvY2F0aW9uVW5jZXJ0YWludHkgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgaWYgKGZpbHRlclN0cmF0ZWd5ID09PSAnc2VydmVyJykge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEludGVuc2l0eSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGludGVuc2l0eSA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBpZiAoZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInKSB7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0U25yKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc25yID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGlmIChmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicpIHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXREdXJhdGlvbigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGR1cmF0aW9uID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGlmIChmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicpIHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRBY3RpdmVFdmVudCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSB8fCAobmV3VmFsdWUgJiYgb2xkVmFsdWUgJiYgbmV3VmFsdWUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID09PSBvbGRWYWx1ZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gJiYgbmV3VmFsdWUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID09PSBvbGRWYWx1ZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0pKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBnZXRBY3RpdmVNYXBMYXllciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICh2bS5hY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfLmZpbmQobWFwTGF5ZXJzLmdldExheWVycygpLCBmdW5jdGlvbiAobGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyLmZlYXR1cmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9PT0gdm0uYWN0aXZlRXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICYmIGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID09PSB2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciBhY3RpdmVNYXBMYXllciA9IGdldEFjdGl2ZU1hcExheWVyKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodm0uYWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIHZtLmFjdGl2ZUV2ZW50LmFjdGl2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFjdGl2ZU1hcExheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTWFwTGF5ZXIuc2V0U3R5bGUoeyBjb2xvcjogYWN0aXZlTWFwTGF5ZXIuZmVhdHVyZS5ldmVudFNvdXJjZS5jb2xvciwgZmlsbE9wYWNpdHk6IDAuMiB9KTtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVNYXBMYXllci5mZWF0dXJlLmFjdGl2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh2bS50cmFja0xheWVycykge1xyXG4gICAgICAgICAgICAgICAgdm0udHJhY2tMYXllcnMuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZWxsaXBzZUxheWVyLmdldExheWVycygpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGVsbGlwc2VMYXllci5jbGVhckxheWVycygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZtLmFjdGl2ZUV2ZW50ID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGlmICh2bS5hY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNlbnRlck9uQWN0aXZlRXZlbnQgPSBzdGF0ZVNlcnZpY2UuZ2V0Q2VudGVyT25BY3RpdmVFdmVudCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNlbnRlck9uQWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2bS5jZW50ZXIgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdDogdm0uYWN0aXZlRXZlbnQucHJvcGVydGllcy5ldmVudF9sYXQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxuZzogdm0uYWN0aXZlRXZlbnQucHJvcGVydGllcy5ldmVudF9sb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHpvb206IHN0YXRlU2VydmljZS5nZXRNYXBab29tKCkgfHwgbWFwWm9vbVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodm0uYWN0aXZlRXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb2NhdGlvblVuY2VydGFpbnR5RmllbGRdICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTC5lbGxpcHNlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBbdm0uYWN0aXZlRXZlbnQucHJvcGVydGllcy5ldmVudF9sYXQsIHZtLmFjdGl2ZUV2ZW50LnByb3BlcnRpZXMuZXZlbnRfbG9uXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgW3ZtLmFjdGl2ZUV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkXSwgdm0uYWN0aXZlRXZlbnQucHJvcGVydGllcy5sb2NfbWlub3JfYXhpc10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRhdGEgaXMgb3JpZW50ZWQgbm9ydGgsIHBsdWdpbiBpcyBvcmllbnRlZCB3ZXN0IC0gc28gYWRkIDkwIGRlZ3JlZXMgdG8gYWNjb3VudCBmb3IgdGhlIGRpZmZlcmVuY2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0uYWN0aXZlRXZlbnQucHJvcGVydGllcy5lbGxpcHNlX29yaWVudGF0aW9uICsgOTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiAnIzAwZmYwMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZWlnaHQ6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxsQ29sb3I6ICcjMDBmZjAwJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgKS5hZGRUbyhlbGxpcHNlTGF5ZXIpLmJyaW5nVG9CYWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVFdmVudC5hY3RpdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlTWFwTGF5ZXIgPSBnZXRBY3RpdmVNYXBMYXllcigpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFjdGl2ZU1hcExheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTWFwTGF5ZXIuc2V0U3R5bGUoeyBjb2xvcjogJyNiMmZmNTknLCBmaWxsT3BhY2l0eTogMC44IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZU1hcExheWVyLmJyaW5nVG9Gcm9udCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCFzdGF0ZVNlcnZpY2UuZ2V0RXZlbnRMYXllcnMoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudExheWVycyhtYXBMYXllcnMuZ2V0TGF5ZXJzKCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc2hvd0V2ZW50VHJhY2soKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldExheW91dENvbXBvbmVudHMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIW1hcExheW91dENvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgLy8gaGFzbid0IGJlZW4gc2V0IHlldCwgc28gdHJ5IHRvIGZpbmQgaXRcclxuICAgICAgICAgICAgICAgIG1hcExheW91dENvbXBvbmVudCA9IF8uZmluZChuZXdWYWx1ZSwgeyBzdGF0ZTogeyB0ZW1wbGF0ZU5hbWU6ICdtYXAnIH0gfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobWFwTGF5b3V0Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZm91bmQgaXQsIHNvIHNldCB1cCB2YXJzIGFuZCBldmVudHNcclxuICAgICAgICAgICAgICAgICAgICB2bS5tYXBIZWlnaHQgPSBtYXBMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLmhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICB2bS5sb2FkZXJIZWlnaHQgPSBtYXBMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLmhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IGV2ZW50IGxpc3RlbmVyIGZvciBjb250YWluZXIgcmVzaXplXHJcbiAgICAgICAgICAgICAgICAgICAgbWFwTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5vbigncmVzaXplJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1c2UgYSAkdGltZW91dCB0byBub3RpZnkgYW5ndWxhciBvZiB0aGUgY2hhbmdlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLm1hcEhlaWdodCA9IG1hcExheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGVySGVpZ2h0ID0gbWFwTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRPbmx5Q29ycmVsYXRpb25zKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRDb3VudHJpZXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb3VudHJpZXMgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgY291bnRyeUxpc3QgPSBzdGF0ZVNlcnZpY2UuZ2V0Q291bnRyeUxpc3QoKTtcclxuICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0U2Vuc29ycygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNlbnNvcnMgPSBuZXdWYWx1ZS5jb25zdHJ1Y3RvciAhPT0gQXJyYXkgPyBbbmV3VmFsdWVdIDogbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFZvdGVGaWx0ZXIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2b3RlRmlsdGVyID0gbmV3VmFsdWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vm90ZWRFdmVudHMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2b3RlZEV2ZW50cyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRUb3RhbFZvdGVzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdG90YWxWb3RlcyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ2xvY2F0aW9uRm9ybWF0Q29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIGVyaXNDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLFxuICAgICAgICBfXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcblxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICB2bS5sb2NhdGlvbiA9IHtcbiAgICAgICAgICAgIGZvcm1hdDogcXMubG9jYXRpb25Gb3JtYXQgfHwgZXJpc0NvbmZpZy5kZWZhdWx0TG9jYXRpb25Gb3JtYXQsXG4gICAgICAgICAgICBub3J0aDogcXMubiB8fCAnJyxcbiAgICAgICAgICAgIHNvdXRoOiBxcy5zIHx8ICcnLFxuICAgICAgICAgICAgZWFzdDogcXMuZSB8fCAnJyxcbiAgICAgICAgICAgIHdlc3Q6IHFzLncgfHwgJycsXG4gICAgICAgICAgICBtZ3JzTkU6IHFzLm5lIHx8ICcnLFxuICAgICAgICAgICAgbWdyc1NXOiBxcy5zdyB8fCAnJ1xuICAgICAgICB9O1xuICAgICAgICB2bS5tb2RlID0gJHNjb3BlLiRwYXJlbnQubW9kZTtcblxuICAgICAgICB2bS5zZXRGb3JtYXQgPSBmdW5jdGlvbiAobmV3Rm9ybWF0KSB7XG4gICAgICAgICAgICB2YXIgbmUsIHN3O1xuICAgICAgICAgICAgc3dpdGNoICh2bS5sb2NhdGlvbi5mb3JtYXQpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdkZCc6XG4gICAgICAgICAgICAgICAgICAgIHN3ID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JEREJyb2FkY2FzdCh2bS5sb2NhdGlvbi5zb3V0aCwgdm0ubG9jYXRpb24ud2VzdCk7XG4gICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JEREJyb2FkY2FzdCh2bS5sb2NhdGlvbi5ub3J0aCwgdm0ubG9jYXRpb24uZWFzdCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Rtcyc6XG4gICAgICAgICAgICAgICAgICAgIHN3ID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3Qodm0ubG9jYXRpb24uc291dGgsIHZtLmxvY2F0aW9uLndlc3QpO1xuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KHZtLmxvY2F0aW9uLm5vcnRoLCB2bS5sb2NhdGlvbi5lYXN0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbWdycyc6XG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5sb2NhdGlvbi5tZ3JzU1cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3ID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KHZtLmxvY2F0aW9uLm1ncnNTVyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHZtLmxvY2F0aW9uLm1ncnNORSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmUgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvck1HUlNCcm9hZGNhc3Qodm0ubG9jYXRpb24ubWdyc05FKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLnNvdXRoID0gJyc7XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi53ZXN0ID0gJyc7XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5ub3J0aCA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24uZWFzdCA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ubWdyc05FID0gJyc7XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5tZ3JzU1cgPSAnJztcblxuICAgICAgICAgICAgc3dpdGNoIChuZXdGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdkZCc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdyAmJiBuZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24uc291dGggPSBzdy5kZFswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLndlc3QgPSBzdy5kZFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLm5vcnRoID0gbmUuZGRbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5lYXN0ID0gbmUuZGRbMV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZG1zJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN3ICYmIG5lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5zb3V0aCA9IHN3LmRtc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLndlc3QgPSBzdy5kbXNbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5ub3J0aCA9IG5lLmRtc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLmVhc3QgPSBuZS5kbXNbMV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbWdycyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdyAmJiBuZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24ubWdyc1NXID0gc3cubWdycyB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLm1ncnNORSA9IG5lLm1ncnMgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLmZvcm1hdCA9IG5ld0Zvcm1hdDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBCQm94UGFyYW1zKHZtLmxvY2F0aW9uKTtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2NhdGlvbkZvcm1hdChuZXdGb3JtYXQpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TWFwQkJveCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbiA9IHt9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuZGlyZWN0aXZlKCdlcmlzTG9jYXRpb25Gb3JtYXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvbG9jYXRpb25Gb3JtYXQvbG9jYXRpb25Gb3JtYXRUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdsb2NhdGlvbkZvcm1hdENvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHt9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCdzaWRlYmFyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIGVyaXNTZXJ2aWNlLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIF8sXG4gICAgICAgIGVyaXNDb25maWdcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcblxuICAgICAgICB2bS5sb2dvID0gZXJpc0NvbmZpZy5sb2dvO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICB2bS5zb3VyY2VGaWx0ZXJFeHBhbmRlZCA9IHN0YXRlU2VydmljZS5nZXRTb3VyY2VGaWx0ZXJFeHBhbmRlZCgpO1xuICAgICAgICB2bS50eXBlRmlsdGVyRXhwYW5kZWQgPSBzdGF0ZVNlcnZpY2UuZ2V0VHlwZUZpbHRlckV4cGFuZGVkKCk7XG4gICAgICAgIHZtLnRlbXBvcmFsRmlsdGVyRXhwYW5kZWQgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXJFeHBhbmRlZCgpO1xuICAgICAgICB2bS5nb3RvRXhwYW5kZWQgPSBzdGF0ZVNlcnZpY2UuZ2V0R290b0V4cGFuZGVkKCk7XG4gICAgICAgIHZtLnVzZXJHdWlkZVVybCA9IGVyaXNDb25maWcudXNlckd1aWRlVXJsO1xuICAgICAgICB2bS5pbmZvVXJsID0gZXJpc0NvbmZpZy5pbmZvVXJsO1xuICAgICAgICB2bS5pbmZvTGFiZWwgPSBlcmlzQ29uZmlnLmluZm9MYWJlbDtcbiAgICAgICAgdm0uaXNBZG1pbiA9IHN0YXRlU2VydmljZS5nZXRJc0FkbWluKCk7XG5cbiAgICAgICAgdm0ub3Blbk1lbnUgPSBmdW5jdGlvbigkbWRNZW51LCBldikge1xuICAgICAgICAgICAgJG1kTWVudS5vcGVuKGV2KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0U291cmNlRmlsdGVyRXhwYW5kZWQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0uc291cmNlRmlsdGVyRXhwYW5kZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFR5cGVGaWx0ZXJFeHBhbmRlZCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS50eXBlRmlsdGVyRXhwYW5kZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyRXhwYW5kZWQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0udGVtcG9yYWxGaWx0ZXJFeHBhbmRlZCA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0R290b0V4cGFuZGVkKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmdvdG9FeHBhbmRlZCA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0SXNBZG1pbigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5pc0FkbWluID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcignc291cmNlRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgZXJpc0NvbmZpZyxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0uZXJpc0NvbmZpZyA9IGVyaXNDb25maWc7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5zb3VyY2VzID0gXy5jbG9uZURlZXAoZXJpc0NvbmZpZy5zb3VyY2VzKTtcbiAgICAgICAgdm0uYWN0aXZlU291cmNlcyA9IFtdO1xuICAgICAgICB2bS5zb3VyY2VUeXBlcyA9IF8uY2xvbmVEZWVwKGVyaXNDb25maWcuc291cmNlVHlwZXMpO1xuICAgICAgICB2bS5zb3VyY2VUeXBlID0gcXMuc291cmNlVHlwZSA/IF8uZmluZCh2bS5zb3VyY2VUeXBlcywgeyBuYW1lOiBxcy5zb3VyY2VUeXBlIH0pIDogXy5maW5kKGVyaXNDb25maWcuc291cmNlVHlwZXMsIHsgYWN0aXZlOiB0cnVlIH0pO1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U291cmNlRmlsdGVyRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZVNvdXJjZSA9IGZ1bmN0aW9uIChzb3VyY2UsIGlnbm9yZUFjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKCFpZ25vcmVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzb3VyY2UuYWN0aXZlID0gIXNvdXJjZS5hY3RpdmU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc291cmNlLmFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmICghXy5maW5kKHZtLmFjdGl2ZVNvdXJjZXMsIHNvdXJjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uYWN0aXZlU291cmNlcy5wdXNoKHNvdXJjZSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBY3RpdmVTb3VyY2VzKHZtLmFjdGl2ZVNvdXJjZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uZmluZCh2bS5hY3RpdmVTb3VyY2VzLCBzb3VyY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIF8ucmVtb3ZlKHZtLmFjdGl2ZVNvdXJjZXMsIHNvdXJjZSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBY3RpdmVTb3VyY2VzKHZtLmFjdGl2ZVNvdXJjZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRTb3VyY2VUeXBlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFNvdXJjZVR5cGUodm0uc291cmNlVHlwZS5uYW1lKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxc1NvdXJjZXMgPSBxcy5zb3VyY2VzO1xuXG4gICAgICAgICAgICBpZiAocXNTb3VyY2VzKSB7XG4gICAgICAgICAgICAgICAgLy8gYWN0aXZhdGUgc291cmNlcyBiYXNlZCBvbiBxdWVyeXN0cmluZ1xuICAgICAgICAgICAgICAgIHFzU291cmNlcyA9IHFzU291cmNlcy5zcGxpdCgnLCcpO1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh2bS5zb3VyY2VzLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZS5hY3RpdmUgPSBfLmluZGV4T2YocXNTb3VyY2VzLCBzb3VyY2UubmFtZSkgPiAtMTtcbiAgICAgICAgICAgICAgICAgICAgdm0udG9nZ2xlU291cmNlKHNvdXJjZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGFjdGl2YXRlIHNvdXJjZXMgYmFzZWQgb24gY29uZmlnXG4gICAgICAgICAgICAgICAgdm0uYWN0aXZlU291cmNlcyA9IF8uZmlsdGVyKHZtLnNvdXJjZXMsIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZS5hY3RpdmUgPT09IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodm0uYWN0aXZlU291cmNlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBY3RpdmVTb3VyY2VzKHZtLmFjdGl2ZVNvdXJjZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdm0uc2V0U291cmNlVHlwZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmRpcmVjdGl2ZSgnZXJpc1NvdXJjZUZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9zb3VyY2VGaWx0ZXIvc291cmNlRmlsdGVyVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnc291cmNlRmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ3RlbXBvcmFsRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgJHRpbWVvdXQsXG4gICAgICAgIG1vbWVudCxcbiAgICAgICAgZXJpc0NvbmZpZyxcblx0XHQkbWRUb2FzdCxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0ubW9tZW50ID0gbW9tZW50O1xuICAgICAgICB2bS5lcmlzQ29uZmlnID0gZXJpc0NvbmZpZztcbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLm1vZGUgPSAkc2NvcGUubW9kZTtcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5tb21lbnQgPSBtb21lbnQ7XG4gICAgICAgIHZtLnN0YXJ0ID0gJyc7XG4gICAgICAgIHZtLnN0b3AgPSAnJztcbiAgICAgICAgdm0uc3RhcnRUaW1lID0ge1xuICAgICAgICAgICAgaG91cjogbnVsbCxcbiAgICAgICAgICAgIG1pbnV0ZTogbnVsbCxcbiAgICAgICAgICAgIHNlY29uZDogbnVsbFxuICAgICAgICB9O1xuICAgICAgICB2bS5zdG9wVGltZSA9IHtcbiAgICAgICAgICAgIGhvdXI6IG51bGwsXG4gICAgICAgICAgICBtaW51dGU6IG51bGwsXG4gICAgICAgICAgICBzZWNvbmQ6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdm0ucmFuZ2VzID0gXy5jbG9uZShlcmlzQ29uZmlnLnJhbmdlcyk7XG4gICAgICAgIHZtLmludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgdm0uYXBwbHlCdG5EaXNhYmxlZCA9IHRydWU7XG4gICAgICAgIHZtLnBvbGwgPSBmYWxzZTtcblxuICAgICAgICB2YXIgc2V0UG9sbCA9IGZ1bmN0aW9uIChzdGFydCkge1xuICAgICAgICAgICAgLy8gcG9sbCBmb3IgY2hhbmdlcyBpZiB0ZW1wb3JhbCBkaWZmIGlzIDYwIG1pbnMgb3IgbGVzc1xuICAgICAgICAgICAgdmFyIHRlbXBvcmFsRGlmZiA9IG1vbWVudC51dGMoKS5kaWZmKG1vbWVudC51dGMoc3RhcnQpLCAnbScpO1xuICAgICAgICAgICAgdm0ucG9sbCA9IHRlbXBvcmFsRGlmZiA8PSA2MDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRQb2xsKHZtLnBvbGwpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5pc0Vycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHZtLmludmFsaWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUZW1wb3JhbEZpbHRlckV4cGFuZGVkKHZtLmV4cGFuZGVkKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRSYW5nZSA9IGZ1bmN0aW9uICh1bml0cywgdW5pdE9mVGltZSkge1xuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gbW9tZW50LnV0YygpLmFkZCh1bml0cywgdW5pdE9mVGltZSkuc3RhcnRPZih1bml0T2ZUaW1lKSxcbiAgICAgICAgICAgICAgICBzdG9wID0gbW9tZW50LnV0YygpLnN0YXJ0T2YodW5pdE9mVGltZSk7XG5cbiAgICAgICAgICAgIGlmICgodW5pdHMgPT09IC0xICYmIHVuaXRPZlRpbWUgPT09ICdob3VycycpIHx8ICh1bml0cyA9PT0gLTMwICYmIHVuaXRPZlRpbWUgPT09ICdtaW51dGVzJykpIHtcbiAgICAgICAgICAgICAgICBzdGFydCA9IG1vbWVudC51dGMoKS5hZGQodW5pdHMsIHVuaXRPZlRpbWUpO1xuICAgICAgICAgICAgICAgIHN0b3AgPSBtb21lbnQudXRjKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNldFBvbGwoc3RhcnQpO1xuXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGVtcG9yYWxGaWx0ZXIoe1xuICAgICAgICAgICAgICAgIHN0YXJ0OiBzdGFydC50b0RhdGUoKSxcbiAgICAgICAgICAgICAgICBzdG9wOiBzdG9wLnRvRGF0ZSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRUaW1lID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgICAgICAgIHZhciBpc1ZhbGlkID0gbW9tZW50LnV0Yyh2bVt0eXBlXSwgJ1lZWVktTU0tREQnKS5pc1ZhbGlkKCksXG4gICAgICAgICAgICAgICAgaG91ciA9IGlzVmFsaWQgPyAoJzAnICsgbW9tZW50LnV0Yyh2bVt0eXBlXSwgJ1lZWVktTU0tREQnKS5ob3VyKCkpLnNsaWNlKC0yKSA6ICcwMCcsXG4gICAgICAgICAgICAgICAgbWludXRlID0gaXNWYWxpZCA/ICgnMCcgKyBtb21lbnQudXRjKHZtW3R5cGVdLCAnWVlZWS1NTS1ERCcpLm1pbnV0ZSgpKS5zbGljZSgtMikgOiAnMDAnLFxuICAgICAgICAgICAgICAgIHNlY29uZCA9IGlzVmFsaWQgPyAoJzAnICsgbW9tZW50LnV0Yyh2bVt0eXBlXSwgJ1lZWVktTU0tREQnKS5zZWNvbmQoKSkuc2xpY2UoLTIpIDogJzAwJztcblxuICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdzdGFydCcpIHtcbiAgICAgICAgICAgICAgICB2bS5zdGFydFRpbWUgPSB7XG4gICAgICAgICAgICAgICAgICAgIGhvdXI6IGhvdXIsXG4gICAgICAgICAgICAgICAgICAgIG1pbnV0ZTogbWludXRlLFxuICAgICAgICAgICAgICAgICAgICBzZWNvbmQ6IHNlY29uZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZtLnN0b3BUaW1lID0ge1xuICAgICAgICAgICAgICAgICAgICBob3VyOiBob3VyLFxuICAgICAgICAgICAgICAgICAgICBtaW51dGU6IG1pbnV0ZSxcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kOiBzZWNvbmRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmNoYW5nZVRpbWUgPSBmdW5jdGlvbiAodHlwZSwgdW5pdCkge1xuICAgICAgICAgICAgaWYgKHZtW3R5cGVdW3VuaXRdLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgICAgICB2bVt0eXBlXVt1bml0XSA9ICgnMCcgKyB2bVt0eXBlXS5ob3VyKS5zbGljZSgtMik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWlzTmFOKHZtW3R5cGVdW3VuaXRdKSkge1xuICAgICAgICAgICAgICAgIGlmICh2bVt0eXBlXS5ob3VyID4gMjMgfHwgdm1bdHlwZV0uaG91ciA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdm1bdHlwZV0uaG91ciA9IHZtW3R5cGVdLmhvdXIgPiAyMyA/IDIzIDogMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZtW3R5cGVdLm1pbnV0ZSA+IDU5IHx8IHZtW3R5cGVdLm1pbnV0ZSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdm1bdHlwZV0ubWludXRlID0gdm1bdHlwZV0ubWludXRlID4gNTkgPyA1OSA6IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2bVt0eXBlXS5zZWNvbmQgPiA1OSB8fCB2bVt0eXBlXS5zZWNvbmQgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtW3R5cGVdLnNlY29uZCA9IHZtW3R5cGVdLnNlY29uZCA+IDU5ID8gNTkgOiAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgdGltZVNldCA9IHR5cGUgPT09ICdzdGFydFRpbWUnID8gbW9tZW50LnV0Yyh2bS5zdGFydC50b0lTT1N0cmluZygpKSA6IG1vbWVudC51dGModm0uc3RvcC50b0lTT1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICB0aW1lU2V0LnNldCh7XG4gICAgICAgICAgICAgICAgICAgICdob3VyJzogKCcwJyArIHZtW3R5cGVdLmhvdXIpLnNsaWNlKC0yKSxcbiAgICAgICAgICAgICAgICAgICAgJ21pbnV0ZSc6ICgnMCcgKyB2bVt0eXBlXS5taW51dGUpLnNsaWNlKC0yKSxcbiAgICAgICAgICAgICAgICAgICAgJ3NlY29uZCc6ICgnMCcgKyB2bVt0eXBlXS5zZWNvbmQpLnNsaWNlKC0yKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnc3RhcnRUaW1lJykge1xuICAgICAgICAgICAgICAgICAgICB2bS5zdGFydCA9IHRpbWVTZXQudG9EYXRlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RvcFRpbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLnN0b3AgPSB0aW1lU2V0LnRvRGF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5rZXlkb3duID0gZnVuY3Rpb24gKCRldmVudCwgdW5pdCwgdHlwZSkge1xuICAgICAgICAgICAgdmFyIG1heCA9IDA7XG4gICAgICAgICAgICBpZiAodW5pdCA9PT0gJ2hvdXInKSB7XG4gICAgICAgICAgICAgICAgbWF4ID0gMjM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHVuaXQgPT09ICdtaW51dGUnIHx8IHVuaXQgPT09ICdzZWNvbmQnKSB7XG4gICAgICAgICAgICAgICAgbWF4ID0gNjA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJGV2ZW50LmtleUNvZGUgPT09IDM4KSB7XG4gICAgICAgICAgICAgICAgLy8gdXAgYXJyb3dcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4odm1bdHlwZV1bdW5pdF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtW3R5cGVdW3VuaXRdID0gKCcwJyArIDApLnNsaWNlKC0yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZtW3R5cGVdW3VuaXRdIDwgbWF4KSB7XG4gICAgICAgICAgICAgICAgICAgIHZtW3R5cGVdW3VuaXRdKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZtW3R5cGVdW3VuaXRdID0gKCcwJyArIHZtW3R5cGVdW3VuaXRdKS5zbGljZSgtMik7XG4gICAgICAgICAgICAgICAgdm0uY2hhbmdlVGltZSh0eXBlLCB1bml0KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJGV2ZW50LmtleUNvZGUgPT09IDQwKSB7XG4gICAgICAgICAgICAgICAgLy8gZG93biBhcnJvd1xuICAgICAgICAgICAgICAgIGlmIChpc05hTih2bVt0eXBlXVt1bml0XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdm1bdHlwZV1bdW5pdF0gPSAoJzAnICsgMCkuc2xpY2UoLTIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodm1bdHlwZV1bdW5pdF0gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtW3R5cGVdW3VuaXRdLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZtW3R5cGVdW3VuaXRdID0gKCcwJyArIHZtW3R5cGVdW3VuaXRdKS5zbGljZSgtMik7XG4gICAgICAgICAgICAgICAgdm0uY2hhbmdlVGltZSh0eXBlLCB1bml0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zdGVwUmFuZ2UgPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICB2YXIgc3RhcnQgPSBtb21lbnQudXRjKHZtLnN0YXJ0KTtcbiAgICAgICAgICAgIHZhciBzdG9wID0gbW9tZW50LnV0Yyh2bS5zdG9wKTtcbiAgICAgICAgICAgIHZhciBkaWZmID0gc3RvcC5kaWZmKHN0YXJ0KTtcblxuICAgICAgICAgICAgc2V0UG9sbChzdGFydC50b0lTT1N0cmluZygpKTtcblxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsRmlsdGVyKHtcbiAgICAgICAgICAgICAgICBzdGFydDogZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgPyBzdGFydC5hZGQoZGlmZikgOiBzdGFydC5zdWJ0cmFjdChkaWZmKSxcbiAgICAgICAgICAgICAgICBzdG9wOiBkaXJlY3Rpb24gPT09ICdmb3J3YXJkJyA/IHN0b3AuYWRkKGRpZmYpIDogc3RvcC5zdWJ0cmFjdChkaWZmKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0VGVtcG9yYWxGaWx0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodm0uc3RhcnQgJiYgdm0uc3RvcCAmJiBtb21lbnQudXRjKHZtLnN0YXJ0KS5pc1ZhbGlkKCkgJiYgbW9tZW50LnV0Yyh2bS5zdG9wKS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgICAgICB2bS5hcHBseUJ0bkRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgbW9tZW50U3RhcnQgPSBtb21lbnQudXRjKHZtLnN0YXJ0LnRvSVNPU3RyaW5nKCkpLFxuICAgICAgICAgICAgICAgICAgICBtb21lbnRTdG9wID0gbW9tZW50LnV0Yyh2bS5zdG9wLnRvSVNPU3RyaW5nKCkpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vbWVudFN0YXJ0LmlzQmVmb3JlKG1vbWVudFN0b3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgc2V0UG9sbCh2bS5zdGFydCk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUZW1wb3JhbEZpbHRlcih7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogdm0uc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9wOiB2bS5zdG9wXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdTdG9wIERhdGUgaXMgYmVmb3JlIFN0YXJ0IERhdGUuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdm0uaW52YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnVGVtcG9yYWwgZmlsdGVyIGNvbnRhaW5zIGludmFsaWQgZGF0ZS90aW1lIHZhbHVlcy4nKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgICAgICB2bS5zdGFydCA9IHFzLnN0YXJ0ID8gbW9tZW50LnV0Yyhxcy5zdGFydCkudG9EYXRlKCkgOiBtb21lbnQudXRjKCkuc3VidHJhY3QoZXJpc0NvbmZpZy5kZWZhdWx0VGltZVJhbmdlVmFsdWUsIGVyaXNDb25maWcuZGVmYXVsdFRpbWVSYW5nZVR5cGUpLnN0YXJ0T2YoZXJpc0NvbmZpZy5kZWZhdWx0VGltZVJhbmdlVHlwZSkudG9EYXRlKCk7XG4gICAgICAgICAgICB2bS5zdG9wID0gcXMuc3RvcCA/IG1vbWVudC51dGMocXMuc3RvcCkudG9EYXRlKCkgOiBtb21lbnQudXRjKCkuc3RhcnRPZihlcmlzQ29uZmlnLmRlZmF1bHRUaW1lUmFuZ2VUeXBlKS50b0RhdGUoKTtcblxuICAgICAgICAgICAgdm0uc2V0VGltZSgnc3RhcnQnKTtcbiAgICAgICAgICAgIHZtLnNldFRpbWUoJ3N0b3AnKTtcbiAgICAgICAgICAgIHZtLnNldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgIH07XG4gICAgICAgIGluaXRpYWxpemUoKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGFydCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0uYXBwbHlCdG5EaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdG9wJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5hcHBseUJ0bkRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2bS5zdGFydCA9IG1vbWVudC51dGMobmV3VmFsdWUuc3RhcnQudG9JU09TdHJpbmcoKSkudG9EYXRlKCk7XG4gICAgICAgICAgICB2bS5zdG9wID0gbW9tZW50LnV0YyhuZXdWYWx1ZS5zdG9wLnRvSVNPU3RyaW5nKCkpLnRvRGF0ZSgpO1xuXG4gICAgICAgICAgICB2bS5zZXRUaW1lKCdzdGFydCcpO1xuICAgICAgICAgICAgdm0uc2V0VGltZSgnc3RvcCcpO1xuXG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdm0uYXBwbHlCdG5EaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5kaXJlY3RpdmUoJ2VyaXNUZW1wb3JhbEZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy90ZW1wb3JhbEZpbHRlci90ZW1wb3JhbEZpbHRlclRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ3RlbXBvcmFsRmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPScsXG4gICAgICAgICAgICAgICAgbW9kZTogJ0AnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCd0eXBlRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgZXJpc0NvbmZpZyxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzO1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uZXJpc0NvbmZpZyA9IGVyaXNDb25maWc7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5hY3RpdmVTb3VyY2VzID0gc3RhdGVTZXJ2aWNlLmdldEFjdGl2ZVNvdXJjZXMoKTtcbiAgICAgICAgdm0udHlwZXMgPSBfLmNsb25lRGVlcChlcmlzQ29uZmlnLnR5cGVzKTtcbiAgICAgICAgdm0uYWN0aXZlVHlwZXMgPSBbXTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFR5cGVGaWx0ZXJFeHBhbmRlZCh2bS5leHBhbmRlZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udG9nZ2xlVHlwZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgICAgICB0eXBlLmFjdGl2ZSA9ICF0eXBlLmFjdGl2ZTtcbiAgICAgICAgICAgIGlmICh0eXBlLmFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmICghXy5maW5kKHZtLmFjdGl2ZVR5cGVzLCB0eXBlKSkge1xuICAgICAgICAgICAgICAgICAgICB2bS5hY3RpdmVUeXBlcy5wdXNoKHR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlVHlwZXModm0uYWN0aXZlVHlwZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uZmluZCh2bS5hY3RpdmVUeXBlcywgdHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5yZW1vdmUodm0uYWN0aXZlVHlwZXMsIHR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlVHlwZXModm0uYWN0aXZlVHlwZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxc1R5cGVzID0gJGxvY2F0aW9uLnNlYXJjaCgpLnR5cGVzO1xuXG4gICAgICAgICAgICBpZiAocXNUeXBlcykge1xuICAgICAgICAgICAgICAgIHFzVHlwZXMgPSBxc1R5cGVzLnNwbGl0KCcsJyk7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHFzVHlwZXMsIGZ1bmN0aW9uICh0eXBlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IF8uZmluZCh2bS50eXBlcywgeyBuYW1lOiB0eXBlTmFtZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgdm0udG9nZ2xlVHlwZSh0eXBlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRBY3RpdmVTb3VyY2VzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmFjdGl2ZVNvdXJjZXMgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5kaXJlY3RpdmUoJ2VyaXNUeXBlRmlsdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL3R5cGVGaWx0ZXIvdHlwZUZpbHRlclRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ3R5cGVGaWx0ZXJDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcignY291bnRyeUZpbHRlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICAkdGltZW91dCxcbiAgICAgICAgJG1kVG9hc3QsXG4gICAgICAgIHNlYXJjaFNlcnZpY2UsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgZXJpc0NvbmZpZyxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0uZXJpc0NvbmZpZyA9IGVyaXNDb25maWc7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5jb3VudHJpZXMgPSBbXTtcbiAgICAgICAgdm0uc2VsZWN0ZWRDb3VudHJpZXMgPSBbXTtcbiAgICAgICAgdm0ubG9hZGluZ0NvdW50cmllcyA9IHRydWU7XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRDb3VudHJ5RmlsdGVyRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmZpbHRlckJ5Q291bnRyaWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldENvdW50cmllcyhfLm1hcCh2bS5zZWxlY3RlZENvdW50cmllcywgJ2dpZCcpKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0Q291bnRyaWVzKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHZtLmNvdW50cmllcyA9IF8uc29ydEJ5KF8ubWFwKGRhdGEuZmVhdHVyZXMsICdwcm9wZXJ0aWVzJyksIGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmluZGV4T2YoZXJpc0NvbmZpZy5kZWZhdWx0Q291bnRyaWVzLCBwcm9wLmNvdW50cnkpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkQ291bnRyaWVzLnB1c2gocHJvcCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb3AuY291bnRyeTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q291bnRyeUxpc3Qodm0uY291bnRyaWVzKTtcbiAgICAgICAgICAgICAgICBpZiAocXMuY291bnRyaWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxcy5jb3VudHJpZXMuY29uc3RydWN0b3IgPT09IEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2gocXMuY291bnRyaWVzLCBmdW5jdGlvbiAoY291bnRyeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkQ291bnRyaWVzLnB1c2goXy5maW5kKHZtLmNvdW50cmllcywgeyBnaWQ6IHBhcnNlSW50KGNvdW50cnkpIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0uc2VsZWN0ZWRDb3VudHJpZXMucHVzaChfLmZpbmQodm0uY291bnRyaWVzLCB7IGdpZDogcGFyc2VJbnQocXMuY291bnRyaWVzKSB9KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkQ291bnRyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uZmlsdGVyQnlDb3VudHJpZXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NvdW50cmllcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIFJldHJpZXZpbmcgQ291bnRyaWVzJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdDb3VudHJpZXMgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmRpcmVjdGl2ZSgnZXJpc0NvdW50cnlGaWx0ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvZXZlbnRGaWx0ZXJzL2NvdW50cnlGaWx0ZXIvY291bnRyeUZpbHRlclRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2NvdW50cnlGaWx0ZXJDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcignZm12RmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgICRtZFRvYXN0LFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGZtdlNlcnZpY2UsXG4gICAgICAgIGVyaXNDb25maWcsXG4gICAgICAgIEwsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpLFxuICAgICAgICAgICAgZmlsdGVyU3RyYXRlZ3kgPSBxcy5maWx0ZXJTdHJhdGVneSA/IHFzLmZpbHRlclN0cmF0ZWd5IDogZXJpc0NvbmZpZy5maWx0ZXJTdHJhdGVneSxcbiAgICAgICAgICAgIGZtdkxheWVycyA9IG5ldyBMLmZlYXR1cmVHcm91cCgpO1xuXG4gICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLnpvb21MZXZlbCA9IHN0YXRlU2VydmljZS5nZXRNYXBab29tKCk7XG4gICAgICAgIHZtLmZtdkZpbHRlciA9IHFzLmZtdkZpbHRlciA/IHFzLmZtdkZpbHRlciA6IGVyaXNDb25maWcuZm12RmlsdGVyO1xuICAgICAgICB2bS5mbXZGaWx0ZXJDaGVja2VkID0gdm0uZm12RmlsdGVyID09PSAnZW5hYmxlZCc7XG4gICAgICAgIHZtLmZtdlJlc3VsdHMgPSBudWxsO1xuICAgICAgICB2bS5yZWZyZXNoRk1WQ2xhc3MgPSAnJztcblxuICAgICAgICB2bS51cGRhdGVGTVYgPSBmdW5jdGlvbiAoZmV0Y2hOZXdSZXN1bHRzKSB7XG4gICAgICAgICAgICB2YXIgZG9VcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHZtLmZtdlJlc3VsdHMsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsbmdsYXRzID0gXy5pbml0aWFsKGQuYm91bmRpbmdib3guY29vcmRpbmF0ZXNbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGF0bG5ncyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2gobG5nbGF0cywgZnVuY3Rpb24gKGxuZ2xhdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0bG5ncy5wdXNoKFtsbmdsYXRbMV0sIGxuZ2xhdFswXV0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgZm12TGF5ZXJzLmFkZExheWVyKEwucG9seWdvbihsYXRsbmdzLCB7IGNvbG9yOiAnI2ZmOTgwMCcsIHN0cm9rZTogZmFsc2UsIGNsYXNzTmFtZTogJ2Ztdi1sYXllcicgfSkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGTVZMYXllcnMoZm12TGF5ZXJzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGZtdkxheWVycy5jbGVhckxheWVycygpO1xuICAgICAgICAgICAgZm12TGF5ZXJzID0gbmV3IEwuZmVhdHVyZUdyb3VwKCk7XG4gICAgICAgICAgICBpZiAoZmV0Y2hOZXdSZXN1bHRzIHx8ICF2bS5mbXZSZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgdm0ucmVmcmVzaEZNVkNsYXNzID0gJ2ZhLXNwaW4nO1xuICAgICAgICAgICAgICAgIGZtdlNlcnZpY2UuZ2V0QWxsUmVjb3JkaW5ncygpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICB2bS5yZWZyZXNoRk1WQ2xhc3MgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgdm0uZm12UmVzdWx0cyA9IHJlc3VsdC5kYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgIGRvVXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Rk1WRmlsdGVyKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkb1VwZGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZNVkZpbHRlcih2bS5mbXZGaWx0ZXIpO1xuICAgICAgICAgICAgaWYgKHZtLmZtdkZpbHRlciA9PT0gJ2VuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgdm0udXBkYXRlRk1WKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RmlsdGVyU3RyYXRlZ3koKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmlsdGVyU3RyYXRlZ3kgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uZm12RmlsdGVyQ2hlY2tlZCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0uZm12RmlsdGVyID0gbmV3VmFsdWUgPyAnZW5hYmxlZCcgOiAnZGlzYWJsZWQnO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZNVkZpbHRlcih2bS5mbXZGaWx0ZXIpO1xuICAgICAgICAgICAgaWYgKHZtLmZtdkZpbHRlciA9PT0gJ2VuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgdm0udXBkYXRlRk1WKHZtLmZtdlJlc3VsdHMgPT09IG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldE1hcFpvb20oKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0uem9vbUxldmVsID0gbmV3VmFsdWU7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgPCA2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHZtLmZtdkZpbHRlciA9PT0gJ2VuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGZtdkxheWVycy5jbGVhckxheWVycygpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Rk1WTGF5ZXJzKGZtdkxheWVycyk7XG4gICAgICAgICAgICAgICAgICAgIHZtLmZtdkZpbHRlciA9ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICAgICAgICAgIHZtLmZtdkZpbHRlckNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRk1WIGZpbHRlciBkaXNhYmxlZCBkdWUgdG8gY3VycmVudCB6b29tIGxldmVsLiBab29tIGluIHRvIHJlLWVuYWJsZS4nKS50aGVtZSgnaW5mby10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmRpcmVjdGl2ZSgnZXJpc0ZtdkZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9ldmVudEZpbHRlcnMvZm12RmlsdGVyL2ZtdkZpbHRlclRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2ZtdkZpbHRlckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHt9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCdzZW5zb3JGaWx0ZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBlcmlzQ29uZmlnXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcblxuICAgICAgICB2bS5lcmlzQ29uZmlnID0gZXJpc0NvbmZpZztcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5zZW5zb3JMaXN0ID0gW107XG4gICAgICAgIHZtLnNlbnNvcnMgPSBbXTtcblxuICAgICAgICB2bS5maWx0ZXJCeVNlbnNvcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U2Vuc29ycyh2bS5zZW5zb3JzKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChxcy5zZW5zb3JzKSB7XG4gICAgICAgICAgICAgICAgdm0uc2Vuc29ycyA9IHFzLnNlbnNvcnMuY29uc3RydWN0b3IgIT09IEFycmF5ID8gW3FzLnNlbnNvcnNdIDogcXMuc2Vuc29ycztcbiAgICAgICAgICAgICAgICB2bS5maWx0ZXJCeVNlbnNvcnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRTZW5zb3JMaXN0KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLnNlbnNvckxpc3QgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5kaXJlY3RpdmUoJ2VyaXNTZW5zb3JGaWx0ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvZXZlbnRGaWx0ZXJzL3NlbnNvckZpbHRlci9zZW5zb3JGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdzZW5zb3JGaWx0ZXJDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcigndm90ZUZpbHRlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICAkbWRUb2FzdCxcbiAgICAgICAgbW9tZW50LFxuICAgICAgICBfLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIHZvdGVTZXJ2aWNlLFxuICAgICAgICBlcmlzQ29uZmlnXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcblxuICAgICAgICB2bS5lcmlzQ29uZmlnID0gZXJpc0NvbmZpZztcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS52b3RlRmlsdGVyID0gcXMudm90ZUZpbHRlciA/IHFzLnZvdGVGaWx0ZXIgOiBlcmlzQ29uZmlnLnZvdGVGaWx0ZXI7XG4gICAgICAgIHZtLnZvdGVGaWx0ZXJUeXBlID0gcXMudm90ZUZpbHRlclR5cGUgPyBxcy52b3RlRmlsdGVyVHlwZSA6IGVyaXNDb25maWcudm90ZUZpbHRlclR5cGU7XG4gICAgICAgIHZtLnZvdGVGaWx0ZXJDaGVja2VkID0gdm0udm90ZUZpbHRlciA9PT0gJ2VuYWJsZWQnO1xuICAgICAgICB2bS50b3RhbFZvdGVzID0gcXMudG90YWxWb3RlcyA/IHBhcnNlSW50KHFzLnRvdGFsVm90ZXMsIDEwKSA6IGVyaXNDb25maWcudG90YWxWb3RlcztcbiAgICAgICAgdm0udm90ZVJlc3VsdHMgPSBudWxsO1xuXG4gICAgICAgIHZhciB1cGRhdGVFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGVtcG9yYWxGaWx0ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKTtcbiAgICAgICAgICAgIHZvdGVTZXJ2aWNlLmdldFZvdGVzKHsgdHlwZTogdm0udm90ZUZpbHRlclR5cGUsIHN0YXJ0OiB0ZW1wb3JhbEZpbHRlci5zdGFydCwgc3RvcDogdGVtcG9yYWxGaWx0ZXIuc3RvcCwgdG90YWw6IHZtLnRvdGFsVm90ZXMgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0cykge1xuICAgICAgICAgICAgICAgIHZhciB2b3RlZEV2ZW50cyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0cy5kYXRhICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICB2b3RlZEV2ZW50cyA9IEFycmF5LmlzQXJyYXkocmVzdWx0cy5kYXRhKSA/IHJlc3VsdHMuZGF0YSA6IFtyZXN1bHRzLmRhdGFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZWRFdmVudHModm90ZWRFdmVudHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZUZpbHRlcih2bS52b3RlRmlsdGVyKTtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUb3RhbFZvdGVzKHZtLnRvdGFsVm90ZXMpO1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVGaWx0ZXIgPT09ICdlbmFibGVkJykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcblxuICAgICAgICB2bS52b3RlVXBCdG5Db2xvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh2bS52b3RlRmlsdGVyID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdm0udm90ZUZpbHRlclR5cGUgPT09ICdVcCcgPyAnZ3JlZW4tNzAwJyA6ICdncmV5LTcwMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJ2dyZXktNzAwJztcbiAgICAgICAgfTtcblxuICAgICAgICB2bS52b3RlRG93bkJ0bkNvbG9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVGaWx0ZXIgPT09ICdlbmFibGVkJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB2bS52b3RlRmlsdGVyVHlwZSA9PT0gJ0Rvd24nID8gJ3JlZC03MDAnIDogJ2dyZXktNzAwJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnZ3JleS03MDAnO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldFZvdGVUeXBlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICB2bS52b3RlRmlsdGVyVHlwZSA9IHZtLnZvdGVGaWx0ZXJUeXBlID09PSB2YWx1ZSA/ICdub25lJyA6IHZhbHVlO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVGaWx0ZXJUeXBlKHZtLnZvdGVGaWx0ZXJUeXBlKTtcbiAgICAgICAgICAgIGlmICh2bS52b3RlRmlsdGVyID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS52b3RlRmlsdGVyQ2hlY2tlZCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0udm90ZUZpbHRlciA9IG5ld1ZhbHVlID8gJ2VuYWJsZWQnIDogJ2Rpc2FibGVkJztcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3RlRmlsdGVyKHZtLnZvdGVGaWx0ZXIpO1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVGaWx0ZXIgPT09ICdlbmFibGVkJykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgdGVtcG9yYWxGaWx0ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAobW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdG9wKS5kaWZmKG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RhcnQpLCAnZCcpID4gNykge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGVtcG9yYWxGaWx0ZXIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RvcCkuc3VidHJhY3QoNiwgJ2gnKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogdGVtcG9yYWxGaWx0ZXIuc3RvcFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnVGVtcG9yYWwgZmlsdGVyIGFkanVzdGVkIHRvIDYgaG91cnMnKS50aGVtZSgnaW5mby10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3RlZEV2ZW50cyhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0udG90YWxWb3RlcycsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRvdGFsVm90ZXMobmV3VmFsdWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gaXNvbGF0ZWQgd2lsbCBiZSB0cnVlIHdoZW4gZXZlbnRzIHBvbGxpbmcgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgfHwgbmV3VmFsdWUuaXNvbGF0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5kaXJlY3RpdmUoJ2VyaXNWb3RlRmlsdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2V2ZW50RmlsdGVycy92b3RlRmlsdGVyL3ZvdGVGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICd2b3RlRmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge31cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iXX0=
