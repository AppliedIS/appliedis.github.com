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
                        templateId: '/demos/eris/modules/components/sidebar/sidebarTemplate.html',
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
                            templateId: '/demos/eris/modules/components/map/mapTemplate.html',
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
                            templateId: '/demos/eris/modules/components/events/eventsTemplate.html',
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
                        templateId: '/demos/eris/modules/components/eventViewer/eventViewerTemplate.html',
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

        WebworkerProvider.setHelperPath('/demos/eris/scripts/webworkerDeps/worker_wrapper.js');

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

/******************************************************************************
 UNCLASSIFIED
 © 2016 Applied Information Sciences
 See COPYRIGHT.txt for licensing information
 ******************************************************************************/

(function () {
    'use strict';

    angular.module('eris').config(['$provide', function ($provide) {
        $provide.decorator('$httpBackend', angular.mock.e2e.$httpBackendDecorator);
    }]).run(['$httpBackend', 'erisConfig', 'stateService', 'XMLHttpRequest', 'moment', '_', function ($httpBackend, erisConfig, stateService, XMLHttpRequest, moment, _){
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
    }]);
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImVyaXNDb25maWcuanMiLCJtb2RlbHMvVm90ZS5qcyIsInNlcnZpY2VzL2FsZXJ0U2VydmljZS5qcyIsInNlcnZpY2VzL2Nvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5qcyIsInNlcnZpY2VzL2VyaXNTZXJ2aWNlLmpzIiwic2VydmljZXMvZm12U2VydmljZS5qcyIsInNlcnZpY2VzL3NlYXJjaFNlcnZpY2UuanMiLCJzZXJ2aWNlcy9zdGF0ZVNlcnZpY2UuanMiLCJzZXJ2aWNlcy92b3RlU2VydmljZS5qcyIsImNvbXBvbmVudHMvYWRtaW4vYWRtaW5Db250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9hZG1pbi9hZG1pbkRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvYWxlcnQvYWxlcnRDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9hbGVydC9hbGVydERpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvZXZlbnRGaWx0ZXJzL2V2ZW50RmlsdGVyc0NvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2V2ZW50RmlsdGVycy9ldmVudEZpbHRlcnNEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2V2ZW50Vmlld2VyL2V2ZW50Vmlld2VyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZXZlbnRWaWV3ZXIvbWV0YWRhdGFEaWFsb2dDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9ldmVudHMvZXZlbnRzQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZ290by9nb3RvQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZ290by9nb3RvRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9sb2NhdGlvbkZvcm1hdC9sb2NhdGlvbkZvcm1hdENvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2xvY2F0aW9uRm9ybWF0L2xvY2F0aW9uRm9ybWF0RGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9tYXAvbWFwQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvc2lkZWJhci9zaWRlYmFyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvc291cmNlRmlsdGVyL3NvdXJjZUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3NvdXJjZUZpbHRlci9zb3VyY2VGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3RlbXBvcmFsRmlsdGVyL3RlbXBvcmFsRmlsdGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvdGVtcG9yYWxGaWx0ZXIvdGVtcG9yYWxGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3R5cGVGaWx0ZXIvdHlwZUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3R5cGVGaWx0ZXIvdHlwZUZpbHRlckRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvZXZlbnRGaWx0ZXJzL2NvdW50cnlGaWx0ZXIvY291bnRyeUZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2V2ZW50RmlsdGVycy9jb3VudHJ5RmlsdGVyL2NvdW50cnlGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2V2ZW50RmlsdGVycy9zZW5zb3JGaWx0ZXIvc2Vuc29yRmlsdGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZXZlbnRGaWx0ZXJzL3NlbnNvckZpbHRlci9zZW5zb3JGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2V2ZW50RmlsdGVycy9mbXZGaWx0ZXIvZm12RmlsdGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZXZlbnRGaWx0ZXJzL2ZtdkZpbHRlci9mbXZGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2V2ZW50RmlsdGVycy92b3RlRmlsdGVyL3ZvdGVGaWx0ZXJDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9ldmVudEZpbHRlcnMvdm90ZUZpbHRlci92b3RlRmlsdGVyRGlyZWN0aXZlLmpzIiwiYmFja2VuZFN0dWJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUFNQSxDQUFBLFlBQUE7O0lBRUE7O0lBRUEsSUFBQSxhQUFBOzs7O0lBSUEsSUFBQSxpQkFBQTtRQUNBLFVBQUE7WUFDQSxZQUFBO1lBQ0EsZ0JBQUE7WUFDQSxrQkFBQTtZQUNBLGVBQUE7O1FBRUEsUUFBQTtZQUNBLFVBQUE7WUFDQSxVQUFBOztRQUVBLFNBQUEsQ0FBQTtZQUNBLE1BQUE7WUFDQSxTQUFBLENBQUE7Z0JBQ0EsTUFBQTtnQkFDQSxPQUFBO2dCQUNBLFNBQUEsQ0FBQTtvQkFDQSxNQUFBO29CQUNBLGVBQUE7b0JBQ0EsZ0JBQUE7d0JBQ0EsWUFBQTt3QkFDQSxjQUFBO3dCQUNBLGVBQUE7OztjQUdBO2dCQUNBLE1BQUE7Z0JBQ0EsT0FBQTtnQkFDQSxTQUFBLENBQUE7b0JBQ0EsTUFBQTtvQkFDQSxRQUFBO29CQUNBLFNBQUEsQ0FBQTt3QkFDQSxNQUFBO3dCQUNBLGVBQUE7d0JBQ0EsZ0JBQUE7NEJBQ0EsWUFBQTs0QkFDQSxjQUFBOzRCQUNBLGVBQUE7OztrQkFHQTtvQkFDQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsU0FBQSxDQUFBO3dCQUNBLE1BQUE7d0JBQ0EsZUFBQTt3QkFDQSxnQkFBQTs0QkFDQSxZQUFBOzRCQUNBLGNBQUE7NEJBQ0EsZUFBQTs7OztjQUlBO2dCQUNBLE1BQUE7Z0JBQ0EsT0FBQTtnQkFDQSxTQUFBLENBQUE7b0JBQ0EsTUFBQTtvQkFDQSxlQUFBO29CQUNBLGdCQUFBO3dCQUNBLFlBQUE7d0JBQ0EsY0FBQTt3QkFDQSxlQUFBOzs7Ozs7O0lBT0EsSUFBQSxNQUFBLFFBQUEsT0FBQSxRQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7OztJQUdBLElBQUEsb0dBQUEsVUFBQSxVQUFBLG9CQUFBLG1CQUFBLG1CQUFBLGNBQUE7OztRQUdBLFNBQUEsVUFBQSxtQ0FBQSxVQUFBLFdBQUE7WUFDQSxPQUFBLFVBQUEsV0FBQSxPQUFBO2dCQUNBLFVBQUEsV0FBQTtnQkFDQSxXQUFBLFdBQUE7b0JBQ0EsTUFBQTs7Ozs7UUFLQSxhQUFBLFFBQUE7O1FBRUEsbUJBQUEsTUFBQSxXQUFBLGVBQUEsUUFBQSxjQUFBLFFBQUE7UUFDQSxtQkFBQSxNQUFBO1FBQ0EsbUJBQUEsTUFBQTtRQUNBLG1CQUFBLE1BQUE7UUFDQSxtQkFBQSxNQUFBOztRQUVBLGtCQUFBLGNBQUE7O1FBRUEsa0JBQUEsVUFBQTs7S0FFQSxNQUFBLFVBQUEsT0FBQTtLQUNBLE1BQUEsS0FBQSxPQUFBO0tBQ0EsTUFBQSxLQUFBLE9BQUE7S0FDQSxNQUFBLFNBQUEsT0FBQTtLQUNBLE1BQUEsZ0JBQUEsT0FBQTtLQUNBLE1BQUEsTUFBQSxPQUFBO0tBQ0EsTUFBQSxLQUFBLE9BQUE7S0FDQSxNQUFBLE1BQUEsT0FBQTtLQUNBLE1BQUEsa0JBQUEsT0FBQTtLQUNBLE1BQUEsWUFBQSxPQUFBO0tBQ0EsTUFBQSxnQkFBQSxPQUFBO0tBQ0EsTUFBQSxRQUFBLE9BQUE7S0FDQSxNQUFBLE9BQUEsT0FBQTs7SUFFQSxJQUFBLCtNQUFBLFNBQUEsWUFBQSxPQUFBLFVBQUEsVUFBQSxTQUFBLFdBQUEsWUFBQSxhQUFBLHFCQUFBLGNBQUEsZUFBQSxhQUFBLGNBQUEsR0FBQSxRQUFBOztRQUVBLFdBQUEsWUFBQSxXQUFBOzs7UUFHQSxZQUFBLFdBQUEsS0FBQSxVQUFBLFFBQUE7WUFDQSxJQUFBLE9BQUEsS0FBQSxTQUFBLEdBQUE7Z0JBQ0EsSUFBQSxRQUFBLE9BQUEsS0FBQTs7Z0JBRUEsYUFBQSxTQUFBOztnQkFFQSxJQUFBLFVBQUEsRUFBQSxRQUFBLFdBQUEsUUFBQSxFQUFBLFFBQUEsTUFBQSxlQUFBLENBQUE7Z0JBQ0EsUUFBQSxJQUFBLE1BQUEsWUFBQTtnQkFDQSxhQUFBLFdBQUE7Z0JBQ0EsWUFBQSxnQkFBQSxNQUFBLFlBQUEsS0FBQSxVQUFBLE9BQUE7b0JBQ0EsYUFBQSxTQUFBLE1BQUE7bUJBQ0EsTUFBQSxVQUFBLE9BQUE7b0JBQ0EsUUFBQSxJQUFBO29CQUNBLGFBQUEsU0FBQTs7bUJBRUE7Ozs7O2dCQUtBLFlBQUEsV0FBQSxLQUFBLFVBQUEs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O1FBR0EsT0FBQTs7Ozs7Ozs7OztBQ3BEQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxRQUFBLDhDQUFBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxPQUFBO1lBQ0EsV0FBQSxZQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxXQUFBLFFBQUEsTUFBQTttQkFDQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsVUFBQSxVQUFBLElBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFdBQUEsUUFBQSxNQUFBLGFBQUE7bUJBQ0EsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOztZQUVBLFVBQUEsVUFBQSxPQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBLEtBQUEsV0FBQSxRQUFBLE1BQUEsV0FBQSxPQUFBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsYUFBQSxVQUFBLE9BQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUEsSUFBQSxXQUFBLFFBQUEsTUFBQSxhQUFBLE1BQUEsVUFBQSxPQUFBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7Ozs7Ozs7Ozs7OztBQ3JEQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxRQUFBLDRDQUFBLFVBQUEsVUFBQTs7UUFFQSxJQUFBLFdBQUEsVUFBQSxRQUFBO1lBQ0EsSUFBQSxTQUFBLEdBQUE7Z0JBQ0EsT0FBQSxLQUFBLEtBQUE7O2lCQUVBO2dCQUNBLE9BQUEsS0FBQSxNQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE1BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxJQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE9BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxLQUFBO2dCQUNBLFVBQUEsVUFBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxlQUFBOzs7Ozs7O1FBT0EsYUFBQSxxQkFBQSxVQUFBLEtBQUEsS0FBQTtZQUNBLElBQUEsQ0FBQSxPQUFBLFFBQUEsTUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLE9BQUEsT0FBQSxRQUFBLE1BQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxLQUFBO2dCQUNBLElBQUEsVUFBQTtvQkFDQSxLQUFBLENBQUEsY0FBQSxNQUFBLGNBQUE7b0JBQ0EsSUFBQSxDQUFBLEtBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLElBQUE7b0JBQ0EsUUFBQSxPQUFBLFNBQUEsS0FBQSxLQUFBOztnQkFFQSxPQUFBO21CQUNBLElBQUEsRUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQSxJQUFBLEVBQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxNQUFBO2dCQUNBLE9BQUE7Ozs7Ozs7OztRQVNBLGFBQUEsc0JBQUEsVUFBQSxRQUFBLFFBQUE7WUFDQSxJQUFBLFdBQUEsV0FBQSxXQUFBLFdBQUEsV0FBQTtZQUNBLFNBQUEsT0FBQSxRQUFBLFdBQUEsSUFBQSxNQUFBO1lBQ0EsU0FBQSxPQUFBLFFBQUEsV0FBQSxJQUFBLE1BQUE7O1lBRUEsSUFBQSxPQUFBLFVBQUEsR0FBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsSUFBQTttQkFDQSxJQUFBLE9BQUEsV0FBQSxHQUFBO2dCQUNBLFNBQUEsT0FBQSxHQUFBLE1BQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsS0FBQSxNQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxJQUFBOztZQUVBLElBQUEsT0FBQSxVQUFBLEdBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLElBQUE7bUJBQ0EsSUFBQSxPQUFBLFdBQUEsR0FBQTtnQkFDQSxTQUFBLE9BQUEsR0FBQSxNQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEtBQUEsTUFBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsTUFBQSxHQUFBLENBQUEsSUFBQTs7O1lBR0E7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLENBQUEsT0FBQSxhQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQSxDQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUE7Y0FDQTtnQkFDQSxJQUFBLFVBQUE7b0JBQ0EsS0FBQTt3QkFDQSxZQUFBLE1BQUEsWUFBQSxPQUFBLFlBQUE7d0JBQ0EsWUFBQSxNQUFBLFlBQUEsT0FBQSxZQUFBO29CQUNBLElBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsUUFBQSxHQUFBLE1BQUEsSUFBQTtvQkFDQSxRQUFBLE9BQUEsU0FBQSxRQUFBLEdBQUEsSUFBQSxRQUFBLEdBQUEsSUFBQTs7Z0JBRUEsT0FBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7Ozs7Ozs7Ozs7UUFlQSxhQUFBLHVCQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsU0FBQTtZQUNBLFNBQUEsT0FBQSxJQUFBOztZQUVBLElBQUEsTUFBQSxPQUFBLE9BQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQTs7Z0JBRUEsT0FBQSxLQUFBLEtBQUEsTUFBQSxPQUFBLEtBQUEsT0FBQTtnQkFDQSxPQUFBLEtBQUEsS0FBQSxNQUFBLE9BQUEsS0FBQSxPQUFBO2dCQUNBLE9BQUE7b0JBQ0EsTUFBQTtvQkFDQSxJQUFBO29CQUNBLEtBQUEsQ0FBQSxjQUFBLE9BQUEsS0FBQSxjQUFBLE9BQUE7Ozs7O1FBS0EsYUFBQSxlQUFBLFVBQUEsS0FBQTtZQUNBLFFBQUEsQ0FBQSxPQUFBLFFBQUEsS0FBQSxRQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsT0FBQTs7UUFFQSxhQUFBLGVBQUEsVUFBQSxLQUFBO1lBQ0EsU0FBQSxDQUFBLE9BQUEsUUFBQSxLQUFBLFFBQUEsT0FBQSxPQUFBLENBQUEsT0FBQSxPQUFBOzs7UUFHQSxhQUFBLGdCQUFBLFVBQUEsUUFBQTtZQUNBLElBQUEsV0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxXQUFBLFdBQUE7WUFDQSxTQUFBLE9BQUEsUUFBQSxXQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsVUFBQSxHQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxJQUFBO21CQUNBLElBQUEsT0FBQSxXQUFBLEdBQUE7Z0JBQ0EsU0FBQSxPQUFBLEdBQUEsTUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLElBQUE7O1lBRUE7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFD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QUFBLE1BQUEsV0FBQSxPQUFBLE9BQUEsbUJBQUE7b0JBQ0EsWUFBQSxXQUFBLE9BQUEsZUFBQSxVQUFBLGFBQUEsV0FBQSxXQUFBLE9BQUEsZ0JBQUEsWUFBQSxXQUFBLE9BQUEsZUFBQSxRQUFBLGFBQUEsV0FBQSxXQUFBLE9BQUE7b0JBQ0EsY0FBQTs7Ozs7UUFLQSxJQUFBLG9CQUFBLFVBQUEsUUFBQTtZQUNBLE9BQUE7Z0JBQ0EsS0FBQSxPQUFBO2dCQUNBLFVBQUEsT0FBQSxZQUFBO2dCQUNBLFNBQUEsT0FBQSxXQUFBO2dCQUNBLFNBQUEsT0FBQSxXQUFBO2dCQUNBLFVBQUEsT0FBQSxZQUFBO2dCQUNBLFNBQUEsT0FBQSxXQUFBO2dCQUNBLFNBQUEsT0FBQSxXQUFBLFdBQUE7Z0JBQ0EsUUFBQSxPQUFBLFVBQUE7Ozs7UUFJQSxJQUFBLHFCQUFBLFVBQUEsUUFBQTtZQUNBLE9BQUE7Z0JBQ0EsS0FBQSxPQUFBO2dCQUNBLFFBQUEsT0FBQSxVQUFBOzs7O1FBSUEsSUFBQSxxQkFBQSxZQUFBO1lBQ0EsT0FBQTtnQkFDQSxTQUFBO2dCQUNBLFNBQUE7Z0JBQ0EsU0FBQTtnQkFDQSxVQUFBLFdBQUEsWUFBQSxPQUFBLFVBQUEsWUFBQSxNQUFBLFdBQUEsWUFBQSxPQUFBLFVBQUE7Z0JBQ0EsY0FBQTs7OztRQUlBLElBQUEsbUJBQUEsWUFBQTtZQUNBLElBQUEsaUJBQUEsYUFBQTtnQkFDQSxRQUFBLE9BQUEsZUFBQSxVQUFBLFdBQUEsZUFBQSxRQUFBLGVBQUEsUUFBQSxlQUFBLE1BQUEsZ0JBQUEsT0FBQSxNQUFBLFNBQUEsR0FBQSxLQUFBO2dCQUNBLE9BQUEsT0FBQSxlQUFBLFNBQUEsV0FBQSxlQUFBLE9BQUEsZUFBQSxPQUFBLGVBQUEsS0FBQSxnQkFBQSxPQUFBLE1BQUE7Z0JBQ0EsT0FBQSxhQUFBO2dCQUNBLGlCQUFBLGVBQUEsS0FBQSxPQUFBLE1BQUEsS0FBQSxRQUFBLE1BQUEsS0FBQSxPQUFBLE1BQUEsS0FBQSxRQUFBOztZQUVBLE9BQUE7Z0JBQ0EsU0FBQTtnQkFDQSxTQUFB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LFFBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLFFBQUEsVUFBQSxNQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsWUFBQSxTQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLElBQUE7Z0JBQ0EsVUFBQSxPQUFBLGFBQUE7O1lBRUEsYUFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsYUFBQSxVQUFBLE1BQUE7Z0JBQ0EsV0FBQTtnQkFDQSxZQUFBLGNBQUEsU0FBQTtnQkFDQSxZQUFBLGNBQUEsU0FBQTtnQkFDQSxVQUFBLE9BQUEsYUFBQTs7WUFFQSxxQkFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEscUJBQUEsVUFBQSxNQUFBO2dCQUNBLG1CQUFBO2dCQUNBLFlBQUEsbUJBQUE7Z0JBQ0EsVUFBQSxPQUFBLGFBQUE7O1lBRUEsZ0JBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGdCQUFBLFVBQUEsTUFBQTtnQkFDQSxjQUFBOztZQUVBLGNBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGNBQUEsVUFBQSxNQUFBO2dCQUNBLFlBQUE7Z0JBQ0EsWUFBQSxZQUFBO2dCQUNBLFVBQUEsT0FBQSxhQUFBOztZQUVBLGVBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGVBQUEsVUFBQSxNQUFBO2dCQUNBLGFBQUE7O1lBRUEsWUFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsWUFBQSxVQUFBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxZQUFBLFVBQUE7Z0JBQ0EsVUFBQSxPQUFBLGFBQUE7O1lBRUEsbUJBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLG1CQUFBLFVBQUEsTUFBQTtnQkFDQSxpQkFBQTtnQkFDQSxZQUFBLGlCQUFBO2dCQUNBLFVBQUEsT0FBQSxhQUFBOztZQUVBLHFCQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxxQkFBQSxVQUFBLE1BQUE7Z0JBQ0EsbUJBQUE7Z0JBQ0EsWUFBQSxtQkFBQTtnQkFDQSxVQUFBLE9BQUEsYUFBQTs7WUFFQSxjQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxjQUFBLFVBQUEsTUFBQTtnQkFDQSxZQUFBO2dCQUNBLFlBQUEsWUFBQTtnQkFDQSxVQUFBLE9BQUEsYUFBQTs7WUFFQSxjQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxjQUFBLFVBQUEsTUFBQTtnQkFDQSxZQUFBOztZQUVBLGVBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGVBQUEsVUFBQSxNQUFBO2dCQUNBLGFBQUE7Z0JBQ0EsWUFBQSxhQUFBO2dCQUNBLFVBQUEsT0FBQSxhQUFBOztZQUVBLG1CQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxtQkFBQSxVQUFBLE1BQUE7Z0JBQ0EsaUJBQUE7Z0JBQ0EsWUFBQSxpQkFBQTtnQkFDQSxVQUFBLE9BQUEsYUFBQTs7WUFFQSxnQkFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsZ0JBQUEsVUFBQSxNQUFBO2dCQUNBLGNBQUE7O1lBRUEsZUFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsZUFBQSxVQUFBLE1BQUE7Z0JBQ0EsYUFBQTtnQkFDQSxZQUFBLGFBQUE7Z0JBQ0EsVUFBQSxPQUFBLGFBQUE7O1lBRUEsZUFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsZUFBQSxVQUFBLE1BQUE7Z0JBQ0EsYUFBQTtnQkFDQSxXQUFBLEVBQUEsS0FBQSxZQUFBLEVBQUEsU0FBQTtnQkFDQSxZQUFBLGFBQUEsU0FBQTtnQkFDQSxZQUFBLGdCQUFBLFNBQUE7Z0JBQ0EsVUFBQSxPQUFBLGFBQUE7O1lBRUEsVUFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsVUFBQSxTQUFBLE1BQUE7Z0JBQ0EsUUFBQTs7WUFFQSxZQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxZQUFBLFVBQUEsTUFBQTtnQkFDQSxVQUFBOztZQUVBLFNBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLFNBQUEsVUFBQSxNQUFBO2dCQUNBLE9BQUE7Z0JBQ0EsWUFBQSxPQUFBO2dCQUNBLFVBQUEsT0FBQSxhQUFBOzs7Ozs7Ozs7Ozs7QUN0aUJBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxRQUFBLFFBQUEsNkNBQUE7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLE9BQUE7WUFDQSxZQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFdBQUEsUUFBQSxNQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxXQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFdBQUEsUUFBQSxNQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxVQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBLFdBQUEsUUFBQSxNQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxVQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUEsS0FBQSxXQUFBLFFBQUEsTUFBQSxXQUFBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsVUFBQSxVQUFBLFFBQUE7Z0JBQ0EsU0FBQSxVQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxXQUFBLFFBQUEsTUFBQTtvQkFDQSxRQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsaUJBQUEsVUFBQSxZQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxXQUFBLFFBQUEsTUFBQSxrQkFBQTttQkFDQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUE7bUJBQ0EsTUFBQSxVQUFBLE9BQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOztZQUVBLGFBQUEsVUFBQSxTQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQSxXQUFBLFFBQUEsTUFBQSxZQUFBO21CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxNQUFBLFVBQUEsT0FBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7O1lBRUEsVUFBQSxVQUFBLE1BQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUEsS0FBQSxXQUFBLFFBQUEsTUFBQSxVQUFBLE1BQUEsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLE1BQUEsVUFBQSxPQUFBO29CQUNBLEVBQUEsT0FBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxZQUFBLFVBQUEsTUFBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTs7Z0JBRUEsTUFBQSxJQUFBLFdBQUEsUUFBQSxNQUFBLFlBQUEsS0FBQSxTQUFBLE1BQUEsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLE1BQUEsVUFBQSxPQUFBO29CQUNBLEVBQUEsT0FBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxZQUFBLFVBQUEsU0FBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTs7Z0JBRUEsTUFBQSxPQUFBLFdBQUEsUUFBQSxNQUFBLFlBQUEsU0FBQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUE7bUJBQ0EsTUFBQSxVQUFBLE9BQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOzs7Ozs7Ozs7Ozs7QUNuSUEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsV0FBQSx3RUFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7O1FBRUEsR0FBQSxlQUFBO1FBQ0EsR0FBQSxXQUFBLE9BQUE7UUFDQSxHQUFBLFVBQUE7UUFDQSxHQUFBLGFBQUE7UUFDQSxHQUFBLGVBQUE7UUFDQSxHQUFBLGdCQUFBO1FBQ0EsR0FBQSxRQUFBLENBQUE7WUFDQSxPQUFBO1lBQ0EsT0FBQTtXQUNBO1lBQ0EsT0FBQTtZQUNBLE9BQUE7OztRQUdBLEdBQUEsaUJBQUEsWUFBQTtZQUNBLEdBQUEsV0FBQSxDQUFBLEdBQUE7WUFDQSxhQUFBLGlCQUFBLEdBQUE7OztRQUdBLEdBQUEsY0FBQSxZQUFBO1lBQ0EsSUFBQSxRQUFBO2dCQUNBLFVBQUEsR0FBQTtnQkFDQSxPQUFBLEdBQUE7Z0JBQ0EsU0FBQSxHQUFBO2dCQUNBLFNBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxXQUFBLEdBQUE7OztZQUdBLElBQUEsR0FBQSxTQUFBO2dCQUNBLGFBQUEsWUFBQSxPQUFBLEtBQUEsWUFBQTtvQkFDQSxhQUFBLFNBQUE7bUJBQ0EsTUFBQSxVQUFBLEtBQUE7b0JBQ0EsUUFBQSxJQUFBOzttQkFFQTtnQkFDQSxhQUFBLFNBQUEsT0FBQSxLQUFBLFlBQUE7b0JBQ0EsYUFBQSxTQUFBO21CQUNBLE1BQUEsVUFBQSxLQUFBO29CQUNBLFFBQUEsSUFBQTs7Ozs7UUFLQSxPQUFBLGlCQUFBLDhCQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEdBQUEsVUFBQSxTQUFBLFlBQUE7WUFDQSxHQUFBLGFBQUEsU0FBQSxTQUFBO1lBQ0EsR0FBQSxlQUFBLFNBQUEsV0FBQTtZQUNBLEdBQUEsZ0JBQUEsU0FBQSxhQUFBOzs7Ozs7Ozs7OztBQzlEQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxVQUFBLGFBQUEsWUFBQTtRQUNBLE9BQUE7WUFDQSxVQUFBO1lBQ0EsYUFBQTtZQUNBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsT0FBQTtnQkFDQSxVQUFBOzs7Ozs7Ozs7Ozs7QUNWQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxXQUFBLG1FQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsS0FBQTtZQUNBLGNBQUE7O1FBRUEsR0FBQSxlQUFBO1FBQ0EsR0FBQSxRQUFBO1FBQ0EsR0FBQSxZQUFBO1FBQ0EsR0FBQSxRQUFBLFlBQUE7WUFDQSxHQUFBLE1BQUEsUUFBQTs7O1FBR0EsSUFBQSxhQUFBLFlBQUE7WUFDQSxhQUFBLFlBQUEsS0FBQSxVQUFBLFFBQUE7Z0JBQ0EsSUFBQSxPQUFBLEtBQUEsU0FBQSxHQUFBO29CQUNBLEdBQUEsUUFBQSxFQUFBLFFBQUEsT0FBQSxNQUFBLENBQUEsYUFBQSxDQUFBLFNBQUE7O2dCQUVBLGFBQUEsU0FBQSxHQUFBO2dCQUNBLGNBQUE7Ozs7UUFJQTs7UUFFQSxPQUFBLGlCQUFBLDhCQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxhQUFBO2dCQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtvQkFDQTs7Z0JBRUEsR0FBQSxRQUFBOzs7Ozs7Ozs7Ozs7QUNwQ0EsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsVUFBQSxhQUFBLFlBQUE7UUFDQSxPQUFBO1lBQ0EsVUFBQTtZQUNBLGFBQUE7WUFDQSxZQUFBO1lBQ0EsY0FBQTtZQUNBLE9BQUE7Ozs7Ozs7Ozs7O0FDVEEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsV0FBQSxpR0FBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxLQUFBO1lBQ0EsS0FBQSxVQUFBO1lBQ0EsaUJBQUEsR0FBQSxpQkFBQSxHQUFBLGlCQUFBLFdBQUE7O1FBRUEsR0FBQSxlQUFBO1FBQ0EsR0FBQSxhQUFBO1FBQ0EsR0FBQSxXQUFBLE9BQUE7UUFDQSxHQUFBLGFBQUEsRUFBQSxNQUFBLFdBQUE7UUFDQSxHQUFBLHNCQUFBLEVBQUEsTUFBQSxXQUFBO1FBQ0EsR0FBQSxZQUFBO1lBQ0EsS0FBQSxFQUFBLE1BQUEsV0FBQSxrQkFBQTtZQUNBLEtBQUEsRUFBQSxNQUFBLFdBQUEsb0JBQUE7O1FBRUEsR0FBQSxNQUFBO1lBQ0EsS0FBQSxFQUFBLE1BQUEsV0FBQTtZQUNBLEtBQUEsRUFBQSxNQUFBLFdBQUE7O1FBRUEsR0FBQSxXQUFBO1lBQ0EsS0FBQSxFQUFBLE1BQUEsV0FBQTtZQUNBLEtBQUEsRUFBQSxNQUFBLFdBQUE7OztRQUdBLEdBQUEsaUJBQUEsWUFBQTtZQUNBLEdBQUEsV0FBQSxDQUFBLEdBQUE7WUFDQSxhQUFBLHdCQUFBLEdBQUE7OztRQUdBLElBQUEsYUFBQSxZQUFBO1lBQ0EsSUFBQSxHQUFBLFlBQUE7Z0JBQ0EsR0FBQSxhQUFBLFdBQUEsR0FBQTs7WUFFQSxhQUFBLGNBQUEsR0FBQTtZQUNBLElBQUEsR0FBQSxxQkFBQTtnQkFDQSxHQUFBLHNCQUFBLFNBQUEsR0FBQTs7WUFFQSxhQUFBLHVCQUFBLEdBQUE7WUFDQSxJQUFBLGdCQUFBLEVBQUEsTUFBQSxHQUFBO1lBQ0EsSUFBQSxHQUFBLGNBQUE7Z0JBQ0EsR0FBQSxVQUFBLE1BQUEsV0FBQSxHQUFBLGdCQUFBO2dCQUNBLGNBQUEsTUFBQSxXQUFBLEdBQUE7bUJBQ0E7Z0JBQ0EsY0FBQSxNQUFBLGNBQUEsTUFBQTs7WUFFQSxJQUFBLEdBQUEsY0FBQTtnQkFDQSxHQUFBLFVBQUEsTUFBQSxXQUFBLEdBQUEsZ0JBQUE7Z0JBQ0EsY0FBQSxNQUFBLFdBQUEsR0FBQTttQkFDQTtnQkFDQSxjQUFBLE1BQUEsY0FBQSxNQUFBOztZQUVBLGFBQUEsYUFBQTtZQUNBLElBQUEsR0FBQSxRQUFBO2dCQUNBLEdBQUEsSUFBQSxNQUFBLFdBQUEsR0FBQTs7WUFFQSxJQUFBLEdBQUEsUUFBQTtnQkFDQSxHQUFBLElBQUEsTUFBQSxXQUFBLEdBQUE7O1lBRUEsYUFBQSxPQUFBLEdBQUE7WUFDQSxJQUFBLEdBQUEsYUFBQTtnQkFDQSxHQUFBLFNBQUEsTUFBQSxTQUFBLEdBQUE7O1lBRUEsSUFBQSxHQUFBLGFBQUE7Z0JBQ0EsR0FBQSxTQUFBLE1BQUEsU0FBQSxHQUFBOztZQUVBLGFBQUEsWUFBQSxHQUFBOzs7UUFHQTs7UUFFQSxPQUFBLE9BQUEsdUNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsaUJBQUE7OztRQUdBLE9BQUEsT0FBQSxpQkFBQSxFQUFBLFNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsU0FBQSxZQUFBO2dCQUNBLGFBQUEsY0FBQSxXQUFBOztXQUVBLG1CQUFBLFdBQUEsTUFBQTs7UUFFQSxPQUFBLE9BQUEsMEJBQUEsRUFBQSxTQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLFNBQUEsWUFBQTtnQkFDQSxhQUFBLHVCQUFBLFNBQUE7O1dBRUEsbUJBQUEsV0FBQSxNQUFBOztRQUVBLE9BQUEsaUJBQUEsZ0JBQUEsRUFBQSxTQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLElBQUEsU0FBQSxPQUFBLFNBQUEsS0FBQTtnQkFDQSxTQUFBLE1BQUEsU0FBQSxNQUFBOztZQUVBLElBQUEsU0FBQSxPQUFBLFNBQUEsS0FBQTtnQkFDQSxTQUFBLE1BQUEsU0FBQSxNQUFBOztZQUVBLElBQUEsZUFBQTtnQkFDQSxLQUFBLFNBQUEsTUFBQTtnQkFDQSxLQUFBLFNBQUEsTUFBQTs7WUFFQSxTQUFBLFlBQUE7Z0JBQ0EsYUFBQSxhQUFBOztXQUVBLG1CQUFBLFdBQUEsTUFBQTs7UUFFQSxPQUFBLGlCQUFBLFVBQUEsRUFBQSxTQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLElBQUEsU0FBQSxPQUFBLFNBQUEsS0FBQTtnQkFDQSxTQUFBLE1BQUEsU0FBQSxNQUFBOztZQUVBLElBQUEsU0FBQSxPQUFBLFNBQUEsS0FBQTtnQkFDQSxTQUFBLE1BQUEsU0FBQSxNQUFBOztZQUVBLFNBQUEsWUFBQTtnQkFDQSxhQUFBLE9BQUE7O1dBRUEsbUJBQUEsV0FBQSxNQUFBOztRQUVBLE9BQUEsaUJBQUEsZUFBQSxFQUFBLFNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsSUFBQSxTQUFBLE9BQUEsU0FBQSxLQUFBO2dCQUNBLFNBQUEsTUFBQSxTQUFBLE1BQUE7O1lBRUEsSUFBQSxTQUFBLE9BQUEsU0FBQSxLQUFBO2dCQUNBLFNBQUEsTUFBQSxTQUFBLE1BQUE7O1lBRUEsU0FBQSxZQUFBO2dCQUNBLGFBQUEsWUFBQTs7V0FFQSxtQkFBQSxXQUFBLE1BQUE7Ozs7Ozs7Ozs7QUN2SkEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsVUFBQSxvQkFBQSxZQUFBO1FBQ0EsT0FBQTtZQUNBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBO2dCQUNBLFVBQUE7Ozs7Ozs7Ozs7OztBQ1ZBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxRQUFBLFdBQUEsaVJBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7WUFDQSw2QkFBQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7O1FBRUEsR0FBQSxvQkFBQTtRQUNBLEdBQUEsbUJBQUE7O1FBRUEsSUFBQSxhQUFBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsV0FBQTtZQUNBLFlBQUE7WUFDQSxZQUFBO1lBQ0EsVUFBQTtZ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Z0JBQUEsU0FBQSxNQUFBOzRCQUNBLFVBQUE7O3dCQUVBLE1BQUE7NEJBQ0EsUUFBQSxVQUFBLEdBQUE7O2dDQUVBLElBQUEsSUFBQSxLQUFBLElBQUE7Z0NBQ0EsSUFBQSxNQUFBLEdBQUE7b0NBQ0EsSUFBQSxJQUFBLElBQUEsS0FBQSxJQUFBLElBQUEsS0FBQSxLQUFBLE1BQUEsS0FBQSxJQUFBLElBQUE7b0NBQ0EsSUFBQSxJQUFBLElBQUEsSUFBQSxJQUFBOztvQ0FFQSxJQUFBLElBQUEsV0FBQSxJQUFBLFFBQUE7d0NBQ0EsT0FBQSxVQUFBOzs7OztvQ0FLQSxJQUFBLFNBQUEsVUFBQTtvQ0FDQSxJQUFBLFFBQUEsT0FBQSxXQUFBLE1BQUE7b0NBQ0EsSUFBQSxNQUFBLFNBQUEsS0FBQSxNQUFBLEdBQUEsU0FBQSxHQUFBO3dDQUNBLE9BQUEsTUFBQSxLQUFBLE1BQUEsTUFBQSxHQUFBLFVBQUEsR0FBQTs7O29DQUdBLE9BQUE7O2dDQUVBLE9BQUE7Ozs7O2dCQUtBLE1BQUE7b0JBQ0EsU0FBQTs7Z0JBRUEsVUFBQTtvQkFDQSxNQUFBOztnQkFFQSxZQUFBLFlBQUE7b0JBQ0EsTUFBQSxNQUFBOzs7OztRQUtBLElBQUEsY0FBQSxVQUFBLFNBQUE7WUFDQSxPQUFBLEVBQUEsT0FBQSxTQUFBLFVBQUEsUUFBQTtnQkFDQSxJQUFBLEVBQUEsV0FBQSxRQUFBLFdBQUEsZ0JBQUE7b0JBQ0EsT0FBQSxPQUFBLE1BQUEsS0FBQTs7Z0JBRUEsT0FBQTs7OztRQUlBLElBQUEsY0FBQSxZQUFBO1lBQ0EsR0FBQSxlQUFBOztZQUVBLGNBQUEsVUFBQSxPQUFBOzs7WUFHQSxZQUFBLElBQUEsVUFBQSxxQkFBQSxXQUFBLFNBQUEsS0FBQSxVQUFBLFFBQUE7Z0JBQ0EsSUFBQSxpQkFBQTtvQkFDQSxZQUFBO29CQUNBLEdBQUEsVUFBQTtvQkFDQTs7b0JBRUEsSUFBQSxPQUFBLHNCQUFBLEVBQUEsT0FBQSxnQkFBQSxTQUFBLG9CQUFBLFdBQUEsZ0JBQUE7b0JBQ0EsT0FBQSxZQUFBOztvQkFFQSxJQUFBLGFB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LFdBQUE7WUFDQSxJQUFBLElBQUE7WUFDQSxRQUFBLEdBQUEsU0FBQTtnQkFDQSxLQUFBO29CQUNBLEtBQUEsNEJBQUEsbUJBQUEsR0FBQSxTQUFBLE9BQUEsR0FBQSxTQUFBO29CQUNBLEtBQUEsNEJBQUEsbUJBQUEsR0FBQSxTQUFBLE9BQUEsR0FBQSxTQUFBO29CQUNBO2dCQUNBLEtBQUE7b0JBQ0EsS0FBQSw0QkFBQSxvQkFBQSxHQUFBLFNBQUEsT0FBQSxHQUFBLFNBQUE7b0JBQ0EsS0FBQSw0QkFBQSxvQkFBQSxHQUFBLFNBQUEsT0FBQSxHQUFBLFNBQUE7b0JBQ0E7Z0JBQ0EsS0FBQTtvQkFDQSxJQUFBLEdBQUEsU0FBQSxRQUFBO3dCQUNBLEtBQUEsNEJBQUEscUJBQUEsR0FBQSxTQUFBOztvQkFFQSxJQUFBLEdBQUEsU0FBQSxRQUFBO3dCQUNBLEtBQUEsNEJBQUEscUJBQUEsR0FBQSxTQUFBOztvQkFFQTs7WUFFQSxHQUFBLFNBQUEsUUFBQTtZQUNBLEdBQUEsU0FBQSxPQUFBO1lBQ0EsR0FBQSxTQUFBLFFBQUE7WUFDQSxHQUFBLFNBQUEsT0FBQTtZQUNBLEdBQUEsU0FBQSxTQUFBO1lBQ0EsR0FBQSxTQUFBLFNBQUE7O1lBRUEsUUFBQTtnQkFDQSxLQUFBO29CQUNBLElBQUEsTUFBQSxJQUFBO3dCQUNBLEdBQUEsU0FBQSxRQUFBLEdBQUEsR0FBQTt3QkFDQSxHQUFBLFNBQUEsT0FBQSxHQUFBLEdBQUE7d0JBQ0EsR0FBQSxTQUFBLFFBQUEsR0FBQSxHQUFBO3dCQUNBLEdBQUEsU0FBQSxPQUFBLEdBQUEsR0FBQTs7b0JBRUE7Z0JBQ0EsS0FBQTtvQkFDQSxJQUFBLE1BQUEsSUFBQTt3QkFDQSxHQUFBLFNBQUEsUUFBQSxHQUFBLElBQUE7d0JBQ0EsR0FBQSxTQUFBLE9BQUEsR0FBQSxJQUFBO3dCQUNBLEdBQUEsU0FBQSxRQUFBLEdBQUEsSUFBQTt3QkFDQSxHQUFBLFNBQUEsT0FBQSxHQUFBLElBQUE7O29CQUVBO2dCQUNBLEtBQUE7b0JBQ0EsSUFBQSxNQUFBLElBQUE7d0JBQ0EsR0FBQSxTQUFBLFNBQUEsR0FBQSxRQUFBO3dCQUNBLEdBQUEsU0FBQSxTQUFBLEdBQUEsUUFBQTs7b0JBRUE7OztZQUdBLEdBQUEsU0FBQSxTQUFBO1lBQ0EsYUFBQSxpQkFBQSxHQUFBO1lBQ0EsYUFBQSxrQkFBQTs7O1FBR0EsT0FBQSxpQkFBQSxnQ0FBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFVBQUE7Z0JBQ0EsSUFBQSxFQUFBLEtBQUEsVUFBQSxTQUFBLEdBQUE7b0JBQ0EsR0FBQSxXQUFBOzttQkFFQTtnQkFDQSxHQUFBLFdBQUE7Ozs7Ozs7Ozs7Ozs7QUMxRkEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsVUFBQSxzQkFBQSxZQUFBO1FBQ0EsT0FBQTtZQUNBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBOzs7Ozs7Ozs7OztBQ1RBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxRQUFBLFdBQUEsME1BQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxLQUFBO1lBQ0EsS0FBQSxVQUFBO1lBQ0EsTUFBQTtZQUNBLFVBQUEsR0FBQSxPQUFBLFNBQUEsR0FBQSxRQUFBLFdBQUEsVUFBQTtZQUNBLFlBQUEsSUFBQSxFQUFBO1lBQ0EsZUFBQSxJQUFBLEVBQUE7WUFDQSxZQUFBLElBQUEsRUFBQTtZQUNBLFdBQUEsR0FBQSxZQUFBO1lBQ0EsU0FBQTtZQUNBLGlCQUFBO1lBQ0EsYUFBQSxHQUFBLGFBQUEsR0FBQSxhQUFBO1lBQ0EsY0FBQTtZQUNBLGFBQUEsR0FBQSxhQUFBLEdBQUEsYUFBQTtZQUNBLFVBQUE7WUFDQSxRQUFBO1lBQ0EsYUFBQTtZQUNBLHNCQUFBO1lBQ0EsWUFBQTtnQkFDQSxLQUFBO2dCQUNBLEtBQUE7O1lBRUEsTUFBQTtnQkFDQSxLQUFBO2dCQUNBLEtBQUE7O1lBRUEsV0FBQTtnQkFDQSxLQUFBO2dCQUNBLEtBQUE7O1lBRUEsYUFBQSxHQUFBO1lBQ0EscUJBQUE7WUFDQSxtQkFBQSxHQUFBLG1CQUFBLEdBQUEsbUJBQUEsV0FBQTtZQUNBLGNBQUE7WUFDQSxZQUFBLEdBQUEsWUFBQSxHQUFBLFlBQUE7WUFDQSxVQUFBLEdBQUEsVUFBQSxHQUFBLFVBQUE7WUFDQSxpQkFBQSxHQUFBLGlCQUFBLEdBQUEsaUJBQUEsV0FBQTtZQUNBLG1CQUFBLEdBQUEsbUJBQUEsR0FBQSxtQkFBQSxXQUFBO1lBQ0EsWUFBQSxHQUFBLFlBQUEsR0FBQSxZQUFBO1lBQ0EsZUFBQSxJQUFBLEVBQUE7O1FBRUEsSUFBQSxPQUFBLGFBQUEsVUFBQTtZQUNBLFdBQUEsQ0FBQTs7O1FBR0EsR0FBQSxZQUFBO1FBQ0EsR0FBQSxlQUFBO1FBQ0EsR0FBQSxlQUFBO1FBQ0EsR0FBQSxjQUFBO1FBQ0EsR0FBQSxjQUFBO1FBQ0EsR0FBQSxVQUFBOztRQUVBLElBQUEsR0FBQSxLQUFBLEdBQUEsSUFBQTtZQUNBLElBQUEsV0FBQSxZQUFBLFlBQUE7Z0JBQ0EsUUFBQSxHQUFBO2dCQUNBLE9BQUEsR0FBQSxJQUFBLFdBQUEsR0FBQSxLQUFBO2dCQUNBLE9BQUEsR0FBQSxJQUFBLFdBQUEsR0FBQSxLQUFBO2dCQUNBLE1BQUEsR0FBQSxJQUFBLFdBQUEsR0FBQSxLQUFBO2dCQUNBLE1BQUEsR0FBQSxJQUFBLFdBQUEsR0FBQSxLQUFBO2dCQUNBLFFBQUEsR0FBQSxNQUFBO2dCQUNBLFFBQUEsR0FBQSxNQUFBOzs7WUFHQSxJQUFBLFlBQUEsRUFBQSxPQUFBLFNBQUEsR0FBQSxJQUFBLFNBQUEsR0FBQTtnQkFDQSxZQUFBLEVBQUEsT0FBQSxTQUFBLEdBQUEsSUFBQSxTQUFBLEdBQUE7Z0JBQ0EsU0FBQSxFQUFBLGFBQUEsV0FBQTtnQkFDQSxTQUFBLE9BQUE7O1lBRUEsR0FBQSxTQUFBO2dCQUNBLEtBQUEsT0FBQTtnQkFDQSxLQUFBLE9BQUE7Z0JBQ0EsTUFBQTs7ZUFFQTtZQUNBLEdBQUEsU0FBQSxhQUFBLGtCQUFBLFdBQUE7Ozs7UUFJQSxHQUFBLFdBQUE7WUFDQSxLQUFBLFdBQUE7WUFDQSxhQUFBO1lBQ0Esb0JBQUE7WUFDQSxVQUFBO2dCQUNBLFFBQUE7b0JBQ0EsU0FBQTtvQkFDQSxVQUFBO29CQUNBLFdBQUE7Ozs7OztRQU1BLEdBQUEsU0FBQSxFQUFBLFVBQUEsV0FBQTs7UUFFQSxJQUFBLGlCQUFBLFVBQUEsUUFBQTtZQUNBLFNBQUEsVUFBQTtZQUNBLElBQUEsV0FBQSxZQUFBO2dCQUNBLEVBQUEsUUFBQSxVQUFBLFVBQUEsV0FBQTtvQkFDQSxJQUFBLGFBQUEsT0FBQSxTQUFBO29CQUNBLElBQUEsU0FBQTtvQkFDQSxXQUFBOzs7WUFHQSxJQUFBLFFBQUE7Z0JBQ0E7bUJBQ0E7Z0JBQ0EsWUFBQSxZQUFBLEtBQUEsVUFBQSxXQUFBO29CQUNBLFNBQUEsRUFBQSxVQUFBO29CQUNBOzs7OztRQUtBLElBQUEsa0JBQUEsVUFBQSxPQUFBO1lBQ0EsWUFBQSxZQUFBLEtBQUEsVUFBQSxRQUFBO2dCQUNBLEVBQUEsUUFBQSxPQUFBLFlBQUEsVUFBQSxPQUFBO29CQUNBLElBQUEsWUFBQTs7Z0JBRUEsSUFBQSxTQUFBLE9BQUEsV0FBQSxNQUFBO2dCQUNBLGVBQUE7Ozs7UUFJQSxJQUFBLGFBQUEsVUFBQSxTQUFBLE9BQUE7WUFDQSxJQUFBLGNBQUEsYUFBQTtZQUNBLE1BQUEsUUFBQSxhQUFBLFFBQUE7WUFDQSxJQUFBLFlBQUEsV0FBQSxXQUFBLE9BQUEsa0JBQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLGlCQUFBLFlBQUEsV0FBQSxXQUFBLE9BQUEsa0JBQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLGVBQUE7Z0JBQ0EsRUFBQSxNQUFBLE1BQUEsUUFBQSxZQUFBLFlBQUE7O1lBRUEsT0FBQTs7O1FBR0EsSUFBQSxpQkFBQSxZQUFBOzs7Ozs7WUFNQSxJQUFBLGNBQUE7WUFDQSxZQUFBLFdBQUEsT0FBQSxnQkFBQSxHQUFBLFlBQUEsV0FBQSxXQUFBLE9BQUE7WUFDQSxZQUFBLFdBQUEsT0FBQSxnQkFBQSxHQUFBLFlBQUEsV0FBQSxXQUFBLE9BQUE7WUFDQSxjQUFBLGVBQUEsYUFBQSxLQUFBLFVBQUEsTUFBQTs7Z0JBRUEsSUFBQSxjQUFBLElBQUEsRUFBQTtvQkFDQSxVQUFBO29CQUNBLGFBQUE7b0JBQ0EsYUFBQTs7Z0JBRUEsRUFBQSxRQUFBLEtBQUEsVUFBQSxVQUFBLFNBQUE7b0JBQ0EsSUFBQSxhQUFBO29CQUNBLElBQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSxnQkFBQTt3QkFDQSxhQUFBLEVBQUEsS0FBQSxXQUFBLFNBQUEsRUFBQSxVQUFBLFFBQUEsWUFBQTt3QkFDQTsyQkFDQTt3QkFDQSxhQUFBLEVBQUEsS0FBQSxXQUFBLFNBQUEsQ0FBQSxVQUFBLFNBQUEsWUFBQTt3QkFDQTs7O29CQUdBLElBQUEsUUFBQSxhQUFBLE1BQUE7d0JBQ0EsVUFBQSxFQUFBLFFBQUEsUUFBQSxVQUFBOzRCQUNBLE9BQUEsRUFBQSxPQUFBOzRCQUNBLGVBQUEsVUFBQSxhQUFBLE9BQUE7Z0NBQ0EsUUFBQSxXQUFBLFNBQUE7OzRCQUVBLGNBQUEsVUFBQSxTQUFBLFFBQUE7Z0NBQ0EsSUFBQSxRQUFBLFNBQUEsU0FBQTtvQ0FDQSxPQUFBLEVBQUEsYUFBQSxRQUFBLEVBQUEsT0FBQSxZQUFBLFFBQUEsT0FBQSxhQUFBLEdBQUEsUUFBQTs7Ozt3QkFJQSxZQUFBLFNBQUE7MkJBQ0E7d0JBQ0EsSUFBQSxTQUFBLEVBQUEsT0FBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLFdBQUEsUUFBQSxXQUFBLFdBQUEsT0FBQTs7d0JBRUEsSUFBQSxRQUFBOzRCQUNBLElBQUEsZUFBQSxFQUFBLGFBQUEsUUFBQSxFQUFBLE9BQUEsR0FBQSxZQUFBLFlBQUE7OzRCQUVBLFVBQUEsRUFBQSxRQUFBLGFBQUEsYUFBQTtnQ0FDQSxTQUFBLFlBQUE7b0NBQ0EsT0FBQSxhQUFBOztnQ0FFQSxjQUFBLFlBQUE7b0NBQ0EsT0FBQTs7Z0NBRUEsZUFBQSxVQUFBLGFBQUEsT0FBQTtvQ0FDQSxRQUFBLFdBQUEsU0FBQTs7OzRCQUdBLFlBQUEsU0FBQTs7O29CQUdBLElBQUEsU0FBQTt3QkFDQSxRQUFBLFVBQUEsVUFBQSxPQUFBOzRCQUNBLE1BQUEsUUFBQSxjQUFBLEVBQUEsS0FBQSxXQUFBLFNBQUEsRUFBQSxVQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQTs0QkFDQSxNQUFBLFFBQUEsWUFBQSxFQUFBLEtBQUEsV0FBQSxPQUFBLEVBQUEsT0FBQSxNQUFBLFFBQUEsV0FBQSxXQUFBLE9BQUE7O3dCQUVBLFFBQUEsR0FBQSxhQUFBLFVBQUEsR0FBQTs0QkFDQSxFQUFBLE1BQUEsVUFBQSxZQUFBLHVCQUFBLEVBQUEsTUFBQSxVQUFBLEVBQUEsVUFBQSxFQUFBLE1BQUEsR0FBQSxDQUFBLEtBQUEsV0FBQSxTQUFBOzt3QkFFQSxRQUFBLEdBQUEsWUFBQSxVQUFBLEdBQUE7NEJBQ0EsRUFBQSxNQUFBOzs7OztnQkFLQSxJQUFBLEVBQUEsS0FBQSxZQUFBLGFBQUEsU0FBQSxHQUFBO29CQUNBLGFBQUEsYUFBQTtvQkFDQSxJQUFBLEdBQUEsYUFBQTs7d0JBRUEsR0FBQSxZQUFBOzs7O29CQUlBLEdBQUEsY0FBQSxFQUFBLFVBQUE7b0JBQ0EsSUFBQSxJQUFBLFlBQUEsSUFBQTt3QkFDQSxVQUFBLFNBQUEsR0FBQTs7dUJBRUE7b0JBQ0EsU0FBQSxLQUFBLFNBQUEsU0FBQSxZQUFBLCtEQUFBLE1BQUEsY0FBQSxTQUFBOzs7Ozs7UUFNQSxJQUFBLG9CQUFBLFVBQUEsT0FBQTtZQUNBLElBQUEsTUFBQSxTQUFBLEdBQUE7Z0JBQ0EsSUFBQSxFQUFBLEtBQUEsT0FBQSxFQUFBLE9BQUEsTUFBQSxRQUFBLFVBQUEsVUFBQTtvQkFDQSxPQUFBOztnQkFFQSxPQUFBOztZQUVBLE9BQUE7OztRQUdBLElBQUEsc0JBQUEsVUFBQSxPQUFBO1lBQ0EsSUFBQSxRQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLEVBQUEsUUFBQSxTQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSxnQkFBQSxDQUFBLEdBQUE7b0JBQ0EsT0FBQTs7Z0JBRUEsT0FBQTs7WUFFQSxPQUFBOzs7UUFHQSxJQUFBLGVBQUEsWUFBQTtZQUNBLElBQUEsWUFBQSxhQUFBO1lBQ0EsaUJBQUEsRUFBQSxPQUFBLFFBQUEsVUFBQSxPQUFBO2dCQUNBLElBQUEsWUFBQTtnQkFDQSxJQUFBLG1CQUFBLFVBQUE7O29CQUVBLFlBQUEscUJBQUE7d0JBQ0EsTUFBQSxRQUFBLFdBQUEsaUJBQUEsa0JBQUEsVUFBQSxvQkFBQTt3QkFDQSxxQkFBQTs0QkFDQSxDQUFBLE1BQUEsUUFBQSxXQUFBLGlCQUFBLGtCQUFBLFVBQUEsb0JBQUE7NEJBQ0Esa0JBQUEsVUFBQSxvQkFBQTt1QkFDQTs7b0JBRUEsSUFBQSxnQkFBQSxPQUFBLFNBQUEsUUFBQSxNQUFBLFFBQUEsV0FBQSxXQUFBLE9BQUEsZ0JBQUE7b0JBQ0EsWUFBQSxxQkFBQTt3QkFDQSxNQUFBLFFBQUEsV0FBQSxpQkFBQSxNQUFBLFFBQUEsV0FBQSxXQUFBLE9BQUEsb0JBQUEsZUFBQSxNQUFBLFFBQUEsV0FBQSxXQUFBLE9BQUEsNkJBQUEsdUJBQUEsY0FBQSxNQUFBLFFBQUEsV0FBQSxXQUFBLE9BQUEsOEJBQUEsU0FBQSxNQUFBLFFBQUEsV0FBQSxXQUFBLE9BQUEsbUJBQUEsVUFBQSxPQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSxtQkFBQSxVQUFBLE9BQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLGFBQUEsSUFBQSxPQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSxhQUFBLElBQUEsT0FBQSxpQkFBQSxTQUFBLE9BQUEsaUJBQUEsU0FBQSxPQUFBLFVBQUEsU0FBQSxNQUFBLFlBQUEsa0JBQUEsVUFBQSxvQkFBQTt3QkFDQSxxQkFBQTs0QkFDQSxDQUFBLE1BQUEsUUFBQSxXQUFBLGlCQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSxvQkFBQSxlQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSw2QkFBQSx1QkFBQSxjQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSw4QkFBQSxTQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSxtQkFBQSxVQUFBLE9BQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLG1CQUFBLFVBQUEsT0FBQSxNQUFBLFFBQUEsV0FBQSxXQUFBLE9BQUEsYUFBQSxJQUFBLE9BQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLGFBQUEsSUFBQSxPQUFBLGlCQUFBLFNBQUEsT0FBQSxpQkFBQSxTQUFBLE9BQUEsVUFBQSxTQUFBLE1BQUEsWUFBQSxrQkFBQSxVQUFBLG9CQUFBOzRCQUNBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSxvQkFBQSxjQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSxtQkFBQSxVQUFBLE9BQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLG1CQUFBLFVBQUEsT0FBQSxNQUFBLFFBQUEsV0FBQSxXQUFBLE9BQUEsYUFBQSxJQUFBLE9BQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLGFBQUEsSUFBQSxPQUFBLGlCQUFBLFNBQUEsT0FBQSxpQkFBQSxTQUFBLE9BQUEsVUFBQSxTQUFBLE1BQUEsWUFBQSxrQkFBQSxVQUFBLG9CQUFBOzs7Z0JBR0EsSUFBQSxXQUFBO29CQUNBLElBQUEsY0FBQSxXQUFBO3dCQUNBLElBQUEsU0FBQTt3QkFDQSxFQUFBLFFBQUEsVUFBQSxhQUFBLFVBQUEsS0FBQTs0QkFDQSxJQUFBLEVBQUEsYUFBQSxJQUFBLFVBQUEsU0FBQSxNQUFBLFVBQUE7Z0NBQ0EsVUFBQSxTQUFBO2dDQUNBLFNBQUE7Z0NBQ0EsT0FBQTs7O3dCQUdBLElBQUEsQ0FBQSxRQUFBOzRCQUNBLFVBQUEsWUFBQTs0QkFDQSxZQUFBOzsyQkFFQTt3QkFDQSxVQUFBLFNBQUE7O3VCQUVBO29CQUNBLFVBQUEsWUFBQTs7O2dCQUdBLE9BQUE7O1lBRUEsYUFBQSxVQUFBLEVBQUEsSUFBQSxnQkFBQTs7O1FBR0EsSUFBQSxnQkFBQSxZQUFBO1lBQ0EsYUFBQTtZQUNBLElBQUEscUJBQUEsV0FBQTtnQkFDQSxjQUFBLGFBQUEsS0FBQSxVQUFBLE1BQUE7b0JBQ0EsSUFBQSxVQUFBLEVBQUEsUUFBQSxLQUFBLFVBQUE7d0JBQ0EsY0FBQSxVQUFBLFNBQUEsUUFBQTs0QkFDQSxPQUFBLEVBQUEsYUFBQSxRQUFBLEVBQUEsT0FBQSxXQUFBLFFBQUEsT0FBQSxhQUFBLEdBQUEsUUFBQSxHQUFBLFdBQUE7OztvQkFHQSxRQUFBLEdBQUEsYUFBQSxVQUFBLEdBQUE7d0JBQ0EsRUFBQSxNQUFBLFVBQUEsWUFBQSxzQkFBQSxFQUFBLE1BQUEsVUFBQSxFQUFBLFVBQUEsRUFBQSxNQUFBLEdBQUEsQ0FBQSxLQUFBLFdBQUEsU0FBQTs7b0JBRUEsUUFBQSxHQUFBLFlBQUEsVUFBQSxHQUFBO3dCQUNBLEVBQUEsTUFBQTs7b0JBRUEsUUFBQSxVQUFBLFVBQUEsT0FBQTt3QkFDQSxhQUFBLFNBQUEsT0FBQTs7Ozs7O1FBTUEsSUFBQSxlQUFBLEVBQUEsU0FBQSxZQUFBO1lBQ0EsU0FBQTtZQUNBLFVBQUE7WUFDQSxJQUFBLFFBQUEsU0FBQSxHQUFBO2dCQUNBLFFBQUEsSUFBQTtnQkFDQSxHQUFBLFVBQUE7Z0JBQ0EsYUFBQSxpQkFBQSxHQUFBO2dCQUNBLElBQUEsYUFBQSxVQUFBLE1BQUE7b0JBQ0EsSUFBQSxLQUFBLFlBQUEsS0FBQSxTQUFBLFNBQUEsR0FBQTt3QkFDQSxhQUFBLGNBQUEsRUFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsS0FBQSxVQUFBLGdCQUFBLFdBQUEsT0FBQTt3QkFDQSxJQUFBLFVBQUEsRUFBQSxRQUFBLEtBQUEsVUFBQTs0QkFDQSxjQUFBLFVBQUEsU0FBQSxRQUFBO2dDQUNBLElBQUEsU0FBQSxFQUFBLEtBQUEsV0FBQSxTQUFBLEVBQUEsVUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBO29DQUNBLFFBQUEsU0FBQSxPQUFBLFFBQUE7O2dDQUVBLE9BQUEsRUFBQSxhQUFBLFFBQUEsRUFBQSxPQUFBOzs7d0JBR0EsUUFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBOzRCQUNBLElBQUEsR0FBQSxhQUFBO2dDQUNBLElBQUEsaUJBQUEsRUFBQSxLQUFBLFFBQUEsRUFBQSxTQUFBLEdBQUE7Z0NBQ0EsSUFBQSxnQkFBQTtvQ0FDQSxlQUFBLFNBQUEsRUFBQSxPQUFBLGVBQUEsUUFBQSxZQUFBLE9BQUEsYUFBQTs7Ozs0QkFJQSxJQUFBLFdBQUEsRUFBQSxNQUFBOzRCQUNBLFNBQUEsV0FBQTs0QkFDQSxhQUFBLGVBQUEsVUFBQTs7d0JBRUEsUUFBQSxHQUFBLGFBQUEsVUFBQSxHQUFBOzRCQUNBLEVBQUEsTUFBQSxVQUFBLFlBQUEsdUJBQUEsRUFBQSxNQUFBLFVBQUEsRUFBQSxVQUFBLEVBQUEsTUFBQSxHQUFBLENBQUEsS0FBQSxXQUFBLFNBQUE7O3dCQUVBLFFBQUEsR0FBQSxZQUFBLFVBQUEsR0FBQTs0QkFDQSxFQUFBLE1BQUE7O3dCQUVBLFFBQUEsVUFBQSxVQUFBLE9BQUE7NEJBQ0EsSUFBQSxHQUFBLGFBQUE7Z0NBQ0EsSUFBQSxNQUFBLFFBQUEsV0FBQSxXQUFBLE9BQUEsa0JBQUEsR0FBQSxZQUFBLFdBQUEsV0FBQSxPQUFBLGlCQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSxrQkFBQSxHQUFBLFlBQUEsV0FBQSxXQUFBLE9BQUEsZUFBQTtvQ0FDQSxNQUFBLFFBQUEsU0FBQTs7OzRCQUdBLElBQUEsZUFBQTs0QkFDQSxFQUFBLFFBQUEsV0FBQSxVQUFBLFdBQUE7Z0NBQ0EsSUFBQSxhQUFBLEVBQUEsS0FBQSxhQUFBLEVBQUEsS0FBQTtnQ0FDQSxJQUFBLFlBQUE7b0NBQ0EsYUFBQSxLQUFBLFdBQUE7Ozs7NEJBSUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxLQUFBLEVBQUEsUUFBQSxjQUFBLE1BQUEsUUFBQSxXQUFBLGdCQUFBLENBQUEsTUFBQSxVQUFBLFdBQUEsR0FBQTs7Z0NBRUEsTUFBQSxRQUFBLGNBQUEsRUFBQSxLQUFBLFdBQUEsU0FBQSxDQUFBLFVBQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBO2dDQUNBLE1BQUEsUUFBQSxZQUFBLEVBQUEsS0FBQSxXQUFBLE9BQUEsQ0FBQSxPQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQTtnQ0FDQSxJQUFBLGVBQUEsYUFBQSxlQUFBLFlBQUEsU0FBQSxHQUFBOztvQ0FFQSxJQUFBLFFBQUEsRUFBQSxPQUFBLGFBQUEsVUFBQSxPQUFBO3dDQUNBLE9BQUEsTUFBQSxXQUFBLE9BQUEsa0JBQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLGlCQUFBLE1BQUEsV0FBQSxPQUFBLGtCQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQTs7b0NBRUEsSUFBQSxNQUFBLFVBQUEsWUFBQTt3Q0FDQSxVQUFBLFNBQUE7O3VDQUVBOztvQ0FFQSxVQUFBLFNBQUE7Ozs7d0JBSUEsU0FBQSxVQUFBO3dCQUNBLElBQUEsR0FBQSxhQUFBOzRCQUNBOzt3QkFFQTsyQkFDQTt3QkFDQSxhQUFBLFVBQUE7O29CQUVBO29CQUNBLGFBQUEsZUFBQSxVQUFBO29CQUNBLEdBQUEsVUFBQTtvQkFDQSxhQUFBLGlCQUFBLEdBQUE7OztnQkFHQSxJQUFBLGFBQUEsV0FBQTs7b0JBRUEsY0FBQSxVQUFBLFNBQUEsYUFBQSxLQUFBLE1BQUEsTUFBQSxVQUFBLE1BQUE7d0JBQ0EsU0FBQTt3QkFDQSxVQUFBO3dCQUNBLGFBQUEsVUFBQTt3QkFDQSxJQUFBLEtBQUEsV0FBQTs0QkFDQSxTQUFBLFlBQUE7Z0NBQ0EsV0FBQTs7K0JBRUE7NEJBQ0EsR0FBQSxVQUFBOzs7dUJBR0E7O29CQUVBLGNBQUEsY0FBQSxTQUFBLGFBQUEsS0FBQSxVQUFBLE1BQUE7d0JBQ0EsV0FBQTt1QkFDQSxNQUFBLFlBQUE7d0JBQ0EsR0FBQSxVQUFBOzs7O1dBSUE7O1FBRUEsSUFBQSxhQUFBLFlBQUE7WUFDQSxZQUFBLFNBQUEsS0FBQSxVQUFBLE1BQUE7Z0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtvQkFDQSxZQUFBLEVBQUEsT0FBQSxJQUFBO2dCQUNBLElBQUEsU0FBQSxFQUFBLGFBQUEsV0FBQTs7Z0JBRUEsSUFBQSxhQUFBO2dCQUNBLElBQUEsR0FBQSxRQUFBLFlBQUE7aUJBQ0EsSUFBQSxnQkFBQSxRQUFBLEVBQUEsU0FBQTs7OztnQkFJQSxFQUFBLFFBQUEsTUFBQTtvQkFDQSxVQUFBO21CQUNBLE1BQUE7OztnQkFHQSxJQUFBLFNBQUE7OztnQkFHQSxFQUFBLEtBQUEsUUFBQSxZQUFBOzs7Z0JBR0EsVUFBQSxNQUFBO2dCQUNBLGFBQUEsTUFBQTtnQkFDQSxVQUFBLE1BQUE7Z0JBQ0EsYUFBQSxNQUFBOztnQkFFQSxhQUFBLGFBQUEsSUFBQTtnQkFDQSxhQUFBLFdBQUEsSUFBQTtnQkFDQSxhQUFBLG9CQUFBO2dCQUNBLGFBQUEsa0JBQUE7Z0JBQ0EsYUFBQSxvQkFBQTs7O2dCQUdBLEVBQUEsUUFBQSxZQUFBO29CQUNBLGlCQUFBO29CQUNBLGdCQUFBO21CQUNBLE1BQUE7OztnQkFHQSxJQUFBLGdCQUFBLEVBQUEsV0FBQTtvQkFDQSxRQUFBLENBQUE7d0JBQ0EsV0FBQTt3QkFDQSxNQUFBO3dCQUNBLE9BQUE7d0JBQ0EsU0FBQSxVQUFBLEtBQUE7NEJBQ0EsSUFBQSxNQUFBOzRCQUNBLG1CQUFBOzRCQUNBLGFBQUEsb0JBQUE7O3VCQUVBO3dCQUNBLFdBQUE7d0JBQ0EsTUFBQTt3QkFDQSxPQUFBO3dCQUNBLFNBQUEsVUFBQSxLQUFBOzRCQUNBLElBQUEsTUFBQTs0QkFDQSxtQkFBQTs0QkFDQSxhQUFBLG9CQUFBOzt1QkFFQTt3QkFDQSxXQUFBO3dCQUNBLE1BQUE7d0JBQ0EsT0FBQTt3QkFDQSxTQUFBLFVBQUEsS0FBQTs0QkFDQSxJQUFBLE1BQUE7NEJBQ0EsbUJBQUE7NEJBQ0EsYUFBQSxvQkFBQTs7OztnQkFJQSxjQUFBLE1BQUE7OztnQkFHQSxJQUFBLG9CQUFBLEVBQUEsV0FBQTtvQkFDQSxRQUFBLENBQUE7d0JBQ0EsV0FBQTt3QkFDQSxNQUFBO3dCQUNBLE9BQUE7d0JBQ0EsU0FBQSxVQUFBLEtBQUE7OzRCQUVBLElBQUEsaUJBQUEsYUFBQTtnQ0FDQSxlQUFBLE9BQUEsSUFBQSxlQUFBLE1BQUEsS0FBQSxPQUFBLElBQUEsZUFBQSxRQUFBOzs0QkFFQSxJQUFBLGdCQUFBLElBQUE7Z0NBQ0EsSUFBQSxNQUFBO2dDQUNBLGlCQUFBO2dDQUNBLGFBQUEsa0JBQUE7bUNBQ0E7Z0NBQ0EsU0FBQSxLQUFBLFNBQUEsU0FBQSxZQUFBLDhFQUFBLE1BQUEsY0FBQSxTQUFBOzs7dUJBR0E7d0JBQ0EsV0FBQTt3QkFDQSxNQUFBO3dCQUNBLE9BQUE7d0JBQ0EsU0FBQSxVQUFBLEtBQUE7NEJBQ0EsSUFBQSxNQUFBOzRCQUNBLGlCQUFBOzRCQUNBLGFBQUEsa0JBQUE7Ozs7Z0JBSUEsa0JBQUEsTUFBQTs7O2dCQUdBLElBQUEsWUFBQSxFQUFBLFdBQUE7b0JBQ0EsUUFBQSxDQUFBO3dCQUNBLFdBQUE7d0JBQ0EsTUFBQTt3QkFDQSxPQUFBO3dCQUNBLFNBQUEsVUFBQSxLQUFBOzRCQUNBLElBQUEsTUFBQTs0QkFDQSxtQkFBQTs0QkFDQSxhQUFBLG9CQUFBOzt1QkFFQTt3QkFDQSxXQUFBO3dCQUNBLE1BQUE7d0JBQ0EsT0FBQTt3QkFDQSxTQUFBLFVBQUEsS0FBQTs0QkFDQSxJQUFBLE1BQUE7NEJBQ0EsbUJBQUE7NEJBQ0EsYUFBQSxvQkFBQTs7OztnQkFJQSxVQUFBLE1BQUE7O2dCQUVBLEVBQUEsUUFBQSxDQUFBLGVBQUEsb0JBQUEsTUFBQTs7Z0JBRUEsSUFBQSxtQkFBQSxFQUFBLFFBQUEsY0FBQTs7Ozs7b0JBS0EsT0FBQSxFQUFBOztvQkFFQSxjQUFBLENBQUEsT0FBQSxDQUFBLE1BQUE7O29CQUVBLFVBQUE7O29CQUVBLGVBQUE7O29CQUVBLFNBQUE7d0JBQ0E7O21CQUVBLE1BQUE7O2dCQUVBLGlCQUFBLE9BQUEsR0FBQSxlQUFBLFVBQUEsT0FBQTtvQkFDQSxRQUFBLElBQUE7OztnQkFHQSxpQkFBQSxPQUFBLEdBQUEsY0FBQSxVQUFBLE9BQUE7b0JBQ0EsUUFBQSxJQUFBOzs7O2dCQUlBLElBQUEsZUFBQSxFQUFBLFdBQUE7b0JBQ0EsUUFBQSxDQUFBO3dCQUNBLFdBQUE7d0JBQ0EsTUFBQTt3QkFDQSxPQUFBO3dCQUNBLFNBQUEsWUFBQTs0QkFDQSxRQUFBLFFBQUEsK0JBQUEsR0FBQTs7Ozs7O2dCQU1BLElBQUEsaUJBQUEsRUFBQSxXQUFBO29CQUNBLFFBQUEsQ0FBQTt3QkFDQSxXQUFBO3dCQUNBLE1BQUE7d0JBQ0EsT0FBQTt3QkFDQSxTQUFBLFVBQUEsS0FBQTs0QkFDQSxJQUFBLFNBQUEsYUFBQTs0QkFDQSxJQUFBLE9BQUEsU0FBQSxHQUFBO2dDQUNBLGNBQUEsVUFBQSxNQUFBLFVBQUEsYUFBQSxFQUFBLFdBQUEsaUJBQUEsS0FBQSxVQUFBLE1BQUE7b0NBQ0EsUUFBQSxTQUFBLE9BQUEsS0FBQSxLQUFBO21DQUNBLFVBQUEsS0FBQTtvQ0FDQSxJQUFBLE1BQUE7b0NBQ0EsU0FBQSxLQUFBLFNBQUEsU0FBQSxZQUFBLHlCQUFBLE1BQUEsY0FBQSxTQUFBO29DQUNBLFFBQUEsSUFBQTs7bUNBRUE7Z0NBQ0EsU0FBQSxLQUFBLFNBQUEsU0FBQSxZQUFBLHlEQUFBLE1BQUEsY0FBQSxTQUFBOzs7Ozs7Z0JBTUEsRUFBQSxRQUFBLENBQUEsY0FBQSxpQkFBQSxNQUFBOzs7Z0JBR0EsSUFBQSxpQkFBQSxFQUFBLFdBQUE7b0JBQ0EsUUFBQSxDQUFBO3dCQUNBLFdBQUE7d0JBQ0EsTUFBQTt3QkFDQSxPQUFBO3dCQUNBLFNBQUEsVUFBQSxLQUFBOzRCQUNBLElBQUEsU0FBQSxhQUFBOzRCQUNBLElBQUEsT0FBQSxTQUFBLEdBQUE7Z0NBQ0EsSUFBQSxPQUFBLFNBQUEsV0FBQSxrQkFBQTtvQ0FDQSxTQUFBLEtBQUEsU0FBQSxTQUFBLFlBQUEsOEZBQUEsV0FBQSxtQkFBQSxLQUFBLE1BQUEsY0FBQSxTQUFBO3VDQUNBO29DQUNBLElBQUEsTUFBQTtvQ0FDQSxjQUFBLGlCQUFBLEVBQUEsSUFBQSxRQUFBLHlCQUFBLEtBQUEsVUFBQSxNQUFBO3dDQUNBLElBQUEsTUFBQTt3Q0FDQSxRQUFBLFNBQUEsT0FBQSxLQUFBLEtBQUE7dUNBQ0EsTUFBQSxVQUFBLEtBQUE7d0NBQ0EsSUFBQSxNQUFBO3dDQUNBLFNBQUEsS0FBQSxTQUFBLFNBQUEsWUFBQSw0QkFBQSxNQUFBLGNBQUEsU0FBQTt3Q0FDQSxRQUFBLElBQUE7OzttQ0FHQTtnQ0FDQSxTQUFBLEtBQUEsU0FBQSxTQUFBLFlBQUEseURBQUEsTUFBQSxjQUFBLFNBQUE7Ozt1QkFHQTt3QkFDQSxXQUFBO3dCQUNBLE1BQUE7d0JBQ0EsT0FBQTs7OztnQkFJQSxFQUFBLFFBQUEsQ0FBQSxpQkFBQSxNQUFBOztnQkFFQSxJQUFBLGNBQUEsR0FBQTtvQkFDQSxZQUFBO2dCQUNBLElBQUEsYUFBQTs7b0JBRUEsWUFBQSxFQUFBLEtBQUEsV0FBQSxPQUFBLFlBQUEsRUFBQSxJQUFBO29CQUNBLGdCQUFBO3VCQUNBOztvQkFFQSxZQUFBLFdBQUEsT0FBQSxXQUFBLFdBQUE7b0JBQ0EsR0FBQSxTQUFBLEVBQUEsVUFBQSxXQUFBO29CQUNBLGFBQUEsYUFBQTtvQkFDQTs7O2dCQUdBLElBQUEsR0FBQSxtQkFBQSxVQUFBLEdBQUE7b0JBQ0EsSUFBQSxZQUFBLEVBQUEsS0FBQSxXQUFBLE9BQUEsWUFBQSxFQUFBLE1BQUEsRUFBQTtvQkFDQSxhQUFBLGFBQUE7OztnQkFHQSxJQUFBLEdBQUEsY0FBQSxVQUFBLEdBQUE7b0JBQ0EsUUFBQSxJQUFBO29CQUNBLElBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQSxPQUFBLFVBQUEsRUFBQSxNQUFBLEVBQUE7b0JBQ0EsSUFBQSxFQUFBLFFBQUEsVUFBQSxRQUFBLE1BQUEsR0FBQTt3QkFDQSxTQUFBLEtBQUEsUUFBQTt3QkFDQSxhQUFBLFlBQUE7Ozs7Z0JBSUEsSUFBQSxHQUFBLGlCQUFBLFVBQUEsR0FBQTtvQkFDQSxRQUFBLElBQUE7b0JBQ0EsSUFBQSxVQUFBLEVBQUEsS0FBQSxXQUFBLE9BQUEsVUFBQSxFQUFBLE1BQUEsRUFBQTtvQkFDQSxXQUFBLEVBQUEsT0FBQSxVQUFBLFFBQUE7b0JBQ0EsYUFBQSxZQUFBOzs7Z0JBR0EsSUFBQSxHQUFBLFdBQUEsRUFBQSxTQUFBLFVBQUEsR0FBQTtvQkFDQSxhQUFBLFdBQUEsRUFBQSxPQUFBO29CQUNBLGFBQUEsYUFBQSxFQUFBLE9BQUE7b0JBQ0EsSUFBQSxzQkFBQSxhQUFBO29CQUNBLElBQUEsQ0FBQSxxQkFBQTs7d0JBRUEsSUFBQSxtQkFBQSxVQUFBOzRCQUNBOytCQUNBOzRCQUNBOzRCQUNBOzsyQkFFQTs7d0JBRUEsYUFBQSx1QkFBQTs7b0JBRUEsSUFBQSxHQUFBLGFBQUE7O3dCQUVBLElBQUEsRUFBQSxLQUFBLEdBQUEsWUFBQSxhQUFBLFNBQUEsR0FBQTs0QkFDQSxJQUFBLEVBQUEsT0FBQSxZQUFBLElBQUE7Z0NBQ0EsVUFBQSxTQUFBLEdBQUE7bUNBQ0E7Z0NBQ0EsVUFBQSxZQUFBLEdBQUE7Ozs7bUJBSUE7Ozs7UUFJQTs7UUFFQSxPQUFBLGlCQUFBLGtDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLGdCQUFBOzs7UUFHQSxPQUFBLGlCQUFBLHVDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxFQUFBLEtBQUEsVUFBQSxTQUFBLEdBQUE7O2dCQUVBLElBQUEsUUFBQSxPQUFBLFVBQUEsYUFBQSxTQUFBLFVBQUE7b0JBQ0E7O2dCQUVBOzs7O1FBSUEsT0FBQSxpQkFBQSxzQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxVQUFBO1lBQ0E7OztRQUdBLE9BQUEsaUJBQUEsb0NBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsUUFBQTtZQUNBOzs7UUFHQSxPQUFBLE9BQUEsbUNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsYUFBQTtZQUNBOzs7UUFHQSxPQUFBLE9BQUEsdUNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsaUJBQUE7WUFDQTs7O1FBR0EsT0FBQSxPQUFBLHlDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLG1CQUFBO1lBQ0E7OztRQUdBLE9BQUEsT0FBQSxrQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxZQUFBO1lBQ0EsSUFBQSxjQUFBLFlBQUE7Z0JBQ0EsYUFBQSxhQUFBLElBQUEsRUFBQTs7WUFFQTs7O1FBR0EsT0FBQSxpQkFBQSxrQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxJQUFBLFVBQUEsWUFBQSxTQUFBLEdBQUE7Z0JBQ0EsVUFBQTs7WUFFQSxJQUFBLFlBQUEsU0FBQSxZQUFBLFNBQUEsS0FBQSxjQUFBLFdBQUE7Z0JBQ0EsU0FBQSxVQUFBLFVBQUEsT0FBQTtvQkFDQSxVQUFBLFNBQUE7O2dCQUVBOzs7O1FBSUEsT0FBQSxPQUFBLG1DQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLGFBQUE7WUFDQSxJQUFBLG1CQUFBLFVBQUE7Z0JBQ0E7bUJBQ0E7Z0JBQ0E7Ozs7UUFJQSxPQUFBLE9BQUEsNENBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsc0JBQUE7WUFDQSxJQUFBLG1CQUFBLFVBQUE7Z0JBQ0E7bUJBQ0E7Z0JBQ0E7Ozs7UUFJQSxPQUFBLGlCQUFBLGtDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLFlBQUE7WUFDQSxJQUFBLG1CQUFBLFVBQUE7Z0JBQ0E7bUJBQ0E7Z0JBQ0E7Ozs7UUFJQSxPQUFBLGlCQUFBLDRCQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLE1BQUE7WUFDQSxJQUFBLG1CQUFBLFVBQUE7Z0JBQ0E7bUJBQ0E7Z0JBQ0E7Ozs7UUFJQSxPQUFBLGlCQUFBLGlDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLFdBQUE7WUFDQSxJQUFBLG1CQUFBLFVBQUE7Z0JBQ0E7bUJBQ0E7Z0JBQ0E7Ozs7UUFJQSxPQUFBLGlCQUFBLG9DQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxjQUFBLFlBQUEsWUFBQSxTQUFBLFdBQUEsV0FBQSxPQUFBLGtCQUFBLFNBQUEsV0FBQSxXQUFBLE9BQUEsaUJBQUEsU0FBQSxXQUFBLFdBQUEsT0FBQSxrQkFBQSxTQUFBLFdBQUEsV0FBQSxPQUFBLGdCQUFBO2dCQUNBOzs7WUFHQSxJQUFBLG9CQUFBLFlBQUE7Z0JBQ0EsSUFBQSxHQUFBLGFBQUE7b0JBQ0EsT0FBQSxFQUFBLEtBQUEsVUFBQSxhQUFBLFVBQUEsT0FBQTt3QkFDQSxJQUFBLE1BQUEsU0FBQTs0QkFDQSxPQUFBLE1BQUEsUUFBQSxXQUFBLFdBQUEsT0FBQSxrQkFBQSxHQUFBLFlBQUEsV0FBQSxXQUFBLE9BQUEsaUJBQUEsTUFBQSxRQUFBLFdBQUEsV0FBQSxPQUFBLGtCQUFBLEdBQUEsWUFBQSxXQUFBLFdBQUEsT0FBQTs7d0JBRUEsT0FBQTs7O2dCQUdBLE9BQUE7OztZQUdBLElBQUEsaUJBQUE7O1lBRUEsSUFBQSxHQUFBLGFBQUE7Z0JBQ0EsR0FBQSxZQUFBLFNBQUE7Z0JBQ0EsSUFBQSxnQkFBQTtvQkFDQSxlQUFBLFNBQUEsRUFBQSxPQUFBLGVBQUEsUUFBQSxZQUFBLE9BQUEsYUFBQTtvQkFDQSxlQUFBLFFBQUEsU0FBQTs7O1lBR0EsSUFBQSxHQUFBLGFBQUE7Z0JBQ0EsR0FBQSxZQUFBOztZQUVBLElBQUEsYUFBQSxZQUFBLFNBQUEsR0FBQTtnQkFDQSxhQUFBOztZQUVBLEdBQUEsY0FBQTtZQUNBLElBQUEsR0FBQSxhQUFBO2dCQUNBLElBQUEsc0JBQUEsYUFBQTtnQkFDQSxJQUFBLHFCQUFBO29CQUNBLEdBQUEsU0FBQTt3QkFDQSxLQUFBLEdBQUEsWUFBQSxXQUFBO3dCQUNBLEtBQUEsR0FBQSxZQUFBLFdBQUE7d0JBQ0EsTUFBQSxhQUFBLGdCQUFBOzs7Z0JBR0EsSUFBQSxHQUFBLFlBQUEsV0FBQSxXQUFBLE9BQUEsOEJBQUEsTUFBQTtvQkFDQSxFQUFBO3dCQUNBLENBQUEsR0FBQSxZQUFBLFdBQUEsV0FBQSxHQUFBLFlBQUEsV0FBQTt3QkFDQSxDQUFBLEdBQUEsWUFBQSxXQUFBLFdBQUEsT0FBQSwyQkFBQSxHQUFBLFlBQUEsV0FBQTs7d0JBRUEsR0FBQSxZQUFBLFdBQUEsc0JBQUE7d0JBQ0E7NEJBQ0EsT0FBQTs0QkFDQSxRQUFBOzRCQUNBLFdBQUE7O3NCQUVBLE1BQUEsY0FBQTs7Z0JBRUEsR0FBQSxZQUFBLFNBQUE7Z0JBQ0EsaUJBQUE7Z0JBQ0EsSUFBQSxnQkFBQTtvQkFDQSxlQUFBLFNBQUEsRUFBQSxPQUFBLFdBQUEsYUFBQTtvQkFDQSxlQUFBOztnQkFFQSxJQUFBLENBQUEsYUFBQSxrQkFBQTtvQkFDQSxhQUFBLGVBQUEsVUFBQTs7Z0JBRUE7Ozs7UUFJQSxPQUFBLGlCQUFBLHlDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLElBQUEsQ0FBQSxvQkFBQTs7Z0JBRUEscUJBQUEsRUFBQSxLQUFBLFVBQUEsRUFBQSxPQUFBLEVBQUEsY0FBQTtnQkFDQSxJQUFBLG9CQUFBOztvQkFFQSxHQUFBLFlBQUEsbUJBQUEsVUFBQTtvQkFDQSxHQUFBLGVBQUEsbUJBQUEsVUFBQTs7O29CQUdBLG1CQUFBLFVBQUEsR0FBQSxVQUFBLFlBQUE7O3dCQUVBLFNBQUEsWUFBQTs0QkFDQSxHQUFBLFlBQUEsbUJBQUEsVUFBQTs0QkFDQSxHQUFBLGVBQUEsbUJBQUEsVUFBQTs7Ozs7OztRQU9BLE9BQUEsT0FBQSx5Q0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxtQkFBQTtZQUNBOzs7UUFHQSxPQUFBLGlCQUFBLGtDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLFlBQUE7WUFDQSxjQUFBLGFBQUE7WUFDQTs7O1FBR0EsT0FBQSxpQkFBQSxnQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxVQUFBLFNBQUEsZ0JBQUEsUUFBQSxDQUFBLFlBQUE7WUFDQTs7O1FBR0EsT0FBQSxpQkFBQSxtQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxhQUFBOzs7UUFHQSxPQUFBLGlCQUFBLG9DQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLGNBQUE7WUFDQTs7O1FBR0EsT0FBQSxpQkFBQSxtQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxhQUFBO1lBQ0E7Ozs7Ozs7Ozs7O0FDMS9CQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsUUFBQSxXQUFBLCtGQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7O1FBRUEsR0FBQSxPQUFBLFdBQUE7UUFDQSxHQUFBLGVBQUE7UUFDQSxHQUFBLGFBQUE7UUFDQSxHQUFBLHVCQUFBLGFBQUE7UUFDQSxHQUFBLHFCQUFBLGFBQUE7UUFDQSxHQUFBLHlCQUFBLGFBQUE7UUFDQSxHQUFBLGVBQUEsYUFBQTtRQUNBLEdBQUEsZUFBQSxXQUFBO1FBQ0EsR0FBQSxVQUFBLFdBQUE7UUFDQSxHQUFBLFlBQUEsV0FBQTtRQUNBLEdBQUEsVUFBQSxhQUFBOztRQUVBLEdBQUEsV0FBQSxTQUFBLFNBQUEsSUFBQTtZQUNBLFFBQUEsS0FBQTs7O1FBR0EsT0FBQSxPQUFBLDZDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEdBQUEsdUJBQUE7OztRQUdBLE9BQUEsT0FBQSwyQ0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxHQUFBLHFCQUFBOzs7UUFHQSxPQUFBLE9BQUEsK0NBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsR0FBQSx5QkFBQTs7O1FBR0EsT0FBQSxPQUFBLHFDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEdBQUEsZUFBQTs7O1FBR0EsT0FBQSxPQUFBLGdDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEdBQUEsVUFBQTs7Ozs7Ozs7Ozs7QUM3REEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsV0FBQSxxRkFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsS0FBQTtZQUNBLEtBQUEsVUFBQTs7UUFFQSxHQUFBLGFBQUE7UUFDQSxHQUFBLFdBQUEsT0FBQTtRQUNBLEdBQUEsVUFBQSxFQUFBLFVBQUEsV0FBQTtRQUNBLEdBQUEsZ0JBQUE7UUFDQSxHQUFBLGNBQUEsRUFBQSxVQUFBLFdBQUE7UUFDQSxHQUFBLGFBQUEsR0FBQSxhQUFBLEVBQUEsS0FBQSxHQUFBLGFBQUEsRUFBQSxNQUFBLEdBQUEsZ0JBQUEsRUFBQSxLQUFBLFdBQUEsYUFBQSxFQUFBLFFBQUE7O1FBRUEsR0FBQSxpQkFBQSxZQUFBO1lBQ0EsR0FBQSxXQUFBLENBQUEsR0FBQTtZQUNBLGFBQUEsd0JBQUEsR0FBQTs7O1FBR0EsR0FBQSxlQUFBLFVBQUEsUUFBQSxjQUFBO1lBQ0EsSUFBQSxDQUFBLGNBQUE7Z0JBQ0EsT0FBQSxTQUFBLENBQUEsT0FBQTs7WUFFQSxJQUFBLE9BQUEsUUFBQTtnQkFDQSxJQUFBLENBQUEsRUFBQSxLQUFBLEdBQUEsZUFBQSxTQUFBO29CQUNBLEdBQUEsY0FBQSxLQUFBO29CQUNBLGFBQUEsaUJBQUEsR0FBQTs7bUJBRUE7Z0JBQ0EsSUFBQSxFQUFBLEtBQUEsR0FBQSxlQUFBLFNBQUE7b0JBQ0EsRUFBQSxPQUFBLEdBQUEsZUFBQTtvQkFDQSxhQUFBLGlCQUFBLEdBQUE7Ozs7O1FBS0EsR0FBQSxnQkFBQSxZQUFBO1lBQ0EsYUFBQSxjQUFBLEdBQUEsV0FBQTs7O1FBR0EsSUFBQSxhQUFBLFlBQUE7WUFDQSxJQUFBLFlBQUEsR0FBQTs7WUFFQSxJQUFBLFdBQUE7O2dCQUVBLFlBQUEsVUFBQSxNQUFBO2dCQUNBLEVBQUEsUUFBQSxHQUFBLFNBQUEsVUFBQSxRQUFBO29CQUNBLE9BQUEsU0FBQSxFQUFBLFFBQUEsV0FBQSxPQUFBLFFBQUEsQ0FBQTtvQkFDQSxHQUFBLGFBQUEsUUFBQTs7bUJBRUE7O2dCQUVBLEdBQUEsZ0JBQUEsRUFBQSxPQUFBLEdBQUEsU0FBQSxVQUFBLFFBQUE7b0JBQ0EsT0FBQSxPQUFBLFdBQUE7OztnQkFHQSxJQUFBLEdBQUEsY0FBQSxTQUFBLEdBQUE7b0JBQ0EsYUFBQSxpQkFBQSxHQUFBOzs7O1lBSUEsR0FBQTs7O1FBR0E7Ozs7Ozs7Ozs7QUN0RUEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsVUFBQSxvQkFBQSxZQUFBO1FBQ0EsT0FBQTtZQUNBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBO2dCQUNBLFVBQUE7Ozs7Ozs7Ozs7OztBQ1ZBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxRQUFBLFdBQUEseUhBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7RUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7WUFDQSxLQUFBLFVBQUE7O1FBRUEsR0FBQSxTQUFBO1FBQ0EsR0FBQSxhQUFBO1FBQ0EsR0FBQSxXQUFBLE9BQUE7UUFDQSxHQUFBLE9BQUEsT0FBQTtRQUNBLEdBQUEsZUFBQTtRQUNBLEdBQUEsU0FBQTtRQUNBLEdBQUEsUUFBQTtRQUNBLEdBQUEsT0FBQTtRQUNBLEdBQUEsWUFBQTtZQUNBLE1BQUE7WUFDQSxRQUFBO1lBQ0EsUUFBQTs7UUFFQSxHQUFBLFdBQUE7WUFDQSxNQUFBO1lBQ0EsUUFBQTtZQUNBLFFBQUE7O1FBRUEsR0FBQSxTQUFBLEVBQUEsTUFBQSxXQUFBO1FBQ0EsR0FBQSxVQUFBO1FBQ0EsR0FBQSxtQkFBQTtRQUNBLEdBQUEsT0FBQTs7UUFFQSxJQUFBLFVBQUEsVUFBQSxPQUFBOztZQUVBLElBQUEsZUFBQSxPQUFBLE1BQUEsS0FBQSxPQUFBLElBQUEsUUFBQTtZQUNBLEdBQUEsT0FBQSxnQkFBQTtZQUNBLGFBQUEsUUFBQSxHQUFBOzs7UUFHQSxPQUFBLFVBQUEsWUFBQTtZQUNBLE9BQUEsR0FBQTs7O1FBR0EsR0FBQSxpQkFBQSxZQUFBO1lBQ0EsR0FBQSxXQUFBLENBQUEsR0FBQTtZQUNBLGFBQUEsMEJBQUEsR0FBQTs7O1FBR0EsR0FBQSxXQUFBLFVBQUEsT0FBQSxZQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsTUFBQSxJQUFBLE9BQUEsWUFBQSxRQUFBO2dCQUNBLE9BQUEsT0FBQSxNQUFBLFFBQUE7O1lBRUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLGVBQUEsYUFBQSxVQUFBLENBQUEsTUFBQSxlQUFBLFlBQUE7Z0JBQ0EsUUFBQSxPQUFBLE1BQUEsSUFBQSxPQUFBO2dCQUNBLE9BQUEsT0FBQTs7O1lBR0EsUUFBQTs7WUFFQSxhQUFBLGtCQUFBO2dCQUNBLE9BQUEsTUFBQTtnQkFDQSxNQUFBLEtBQUE7Ozs7UUFJQSxHQUFBLFVBQUEsVUFBQSxNQUFBO1lBQ0EsSUFBQSxVQUFBLE9BQUEsSUFBQSxHQUFBLE9BQUEsY0FBQTtnQkFDQSxPQUFBLFVBQUEsQ0FBQSxNQUFBLE9BQUEsSUFBQSxHQUFBLE9BQUEsY0FBQSxRQUFBLE1BQUEsQ0FBQSxLQUFBO2dCQUNBLFNBQUEsVUFBQSxDQUFBLE1BQUEsT0FBQSxJQUFBLEdBQUEsT0FBQSxjQUFBLFVBQUEsTUFBQSxDQUFBLEtBQUE7Z0JBQ0EsU0FBQSxVQUFBLENBQUEsTUFBQSxPQUFBLElBQUEsR0FBQSxPQUFBLGNBQUEsVUFBQSxNQUFBLENBQUEsS0FBQTs7WUFFQSxJQUFBLFNBQUEsU0FBQTtnQkFDQSxHQUFBLFlBQUE7b0JBQ0EsTUFBQTtvQkFDQSxRQUFBO29CQUNBLFFBQUE7O21CQUVBO2dCQUNBLEdBQUEsV0FBQTtvQkFDQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsUUFBQTs7Ozs7UUFLQSxHQUFBLGFBQUEsVUFBQSxNQUFBLE1BQUE7WUFDQSxJQUFBLEdBQUEsTUFBQSxNQUFBLFNBQUEsR0FBQTtnQkFDQSxHQUFBLE1BQUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLE1BQUEsTUFBQSxDQUFBOztZQUVBLElBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxRQUFBO2dCQUNBLElBQUEsR0FBQSxNQUFBLE9BQUEsTUFBQSxHQUFBLE1BQUEsT0FBQSxHQUFBO29CQUNBLEdBQUEsTUFBQSxPQUFBLEdBQUEsTUFBQSxPQUFBLEtBQUEsS0FBQTs7Z0JBRUEsSUFBQSxHQUFBLE1BQUEsU0FBQSxNQUFBLEdBQUEsTUFBQSxTQUFBLEdBQUE7b0JBQ0EsR0FBQSxNQUFBLFNBQUEsR0FBQSxNQUFBLFNBQUEsS0FBQSxLQUFBOztnQkFFQSxJQUFBLEdBQUEsTUFBQSxTQUFBLE1BQUEsR0FBQSxNQUFBLFNBQUEsR0FBQTtvQkFDQSxHQUFBLE1BQUEsU0FBQSxHQUFBLE1BQUEsU0FBQSxLQUFBLEtBQUE7O2dCQUVBLElBQUEsVUFBQSxTQUFBLGNBQUEsT0FBQSxJQUFBLEdBQUEsTUFBQSxpQkFBQSxPQUFBLElBQUEsR0FBQSxLQUFBO2dCQUNBLFFBQUEsSUFBQTtvQkFDQSxRQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsTUFBQSxNQUFBLENBQUE7b0JBQ0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLFFBQUEsTUFBQSxDQUFBO29CQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxRQUFBLE1BQUEsQ0FBQTs7Z0JBRUEsSUFBQSxTQUFBLGFBQUE7b0JBQ0EsR0FBQSxRQUFBLFFBQUE7dUJBQ0EsSUFBQSxTQUFBLFlBQUE7b0JBQ0EsR0FBQSxPQUFBLFFBQUE7Ozs7O1FBS0EsR0FBQSxVQUFBLFVBQUEsUUFBQSxNQUFBLE1BQUE7WUFDQSxJQUFBLE1BQUE7WUFDQSxJQUFBLFNBQUEsUUFBQTtnQkFDQSxNQUFBO21CQUNBLElBQUEsU0FBQSxZQUFBLFNBQUEsVUFBQTtnQkFDQSxNQUFBOztZQUVBLElBQUEsT0FBQSxZQUFBLElBQUE7O2dCQUVBLElBQUEsTUFBQSxHQUFBLE1BQUEsUUFBQTtvQkFDQSxHQUFBLE1BQUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUE7O2dCQUVBLElBQUEsR0FBQSxNQUFBLFFBQUEsS0FBQTtvQkFDQSxHQUFBLE1BQUE7O2dCQUVBLEdBQUEsTUFBQSxRQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsT0FBQSxNQUFBLENBQUE7Z0JBQ0EsR0FBQSxXQUFBLE1BQUE7bUJBQ0EsSUFBQSxPQUFBLFlBQUEsSUFBQTs7Z0JBRUEsSUFBQSxNQUFBLEdBQUEsTUFBQSxRQUFBO29CQUNBLEdBQUEsTUFBQSxRQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTs7Z0JBRUEsSUFBQSxHQUFBLE1BQUEsUUFBQSxHQUFBO29CQUNBLEdBQUEsTUFBQTs7Z0JBRUEsR0FBQSxNQUFBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxPQUFBLE1BQUEsQ0FBQTtnQkFDQSxHQUFBLFdBQUEsTUFBQTs7OztRQUlBLEdBQUEsWUFBQSxVQUFBLFdBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxJQUFBLEdBQUE7WUFDQSxJQUFBLE9BQUEsT0FBQSxJQUFBLEdBQUE7WUFDQSxJQUFBLE9BQUEsS0FBQSxLQUFBOztZQUVBLFFBQUEsTUFBQTs7WUFFQSxhQUFBLGtCQUFBO2dCQUNBLE9BQUEsY0FBQSxZQUFBLE1BQUEsSUFBQSxRQUFBLE1BQUEsU0FBQTtnQkFDQSxNQUFBLGNBQUEsWUFBQSxLQUFBLElBQUEsUUFBQSxLQUFBLFNBQUE7Ozs7UUFJQSxHQUFBLG9CQUFBLFlBQUE7WUFDQSxJQUFBLEdBQUEsU0FBQSxHQUFBLFFBQUEsT0FBQSxJQUFBLEdBQUEsT0FBQSxhQUFBLE9BQUEsSUFBQSxHQUFBLE1BQUEsV0FBQTtnQkFDQSxHQUFBLG1CQUFBO2dCQUNBLElBQUEsY0FBQSxPQUFBLElBQUEsR0FBQSxNQUFBO29CQUNBLGFBQUEsT0FBQSxJQUFBLEdBQUEsS0FBQTs7Z0JBRUEsSUFBQSxZQUFBLFNBQUEsYUFBQTtvQkFDQSxHQUFBLFVBQUE7b0JBQ0EsUUFBQSxHQUFBO29CQUNBLGFBQUEsa0JBQUE7d0JBQ0EsT0FBQSxHQUFBO3dCQUNBLE1BQUEsR0FBQTs7dUJBRUE7b0JBQ0EsR0FBQSxVQUFBO29CQUNBLFNBQUEsS0FBQSxTQUFBLFNBQUEsWUFBQSxtQ0FBQSxNQUFBLGNBQUEsU0FBQTs7bUJBRUE7Z0JBQ0EsR0FBQSxVQUFBO2dCQUNBLFNBQUEsS0FBQSxTQUFBLFNBQUEsWUFBQSxzREFBQSxNQUFBLGNBQUEsU0FBQTs7OztRQUlBLElBQUEsYUFBQSxXQUFBO1lBQ0EsS0FBQSxVQUFBOztZQUVBLEdBQUEsUUFBQSxHQUFBLFFBQUEsT0FBQSxJQUFBLEdBQUEsT0FBQSxXQUFBLE9BQUEsTUFBQSxTQUFBLFdBQUEsdUJBQUEsV0FBQSxzQkFBQSxRQUFBLFdBQUEsc0JBQUE7WUFDQSxHQUFBLE9BQUEsR0FBQSxPQUFBLE9BQUEsSUFBQSxHQUFBLE1BQUEsV0FBQSxPQUFBLE1BQUEsUUFBQSxXQUFBLHNCQUFBOztZQUVBLEdBQUEsUUFBQTtZQUNBLEdBQUEsUUFBQTtZQUNBLEdBQUE7O1FBRUE7O1FBRUEsT0FBQSxPQUFBLFlBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsR0FBQSxtQkFBQTs7O1FBR0EsT0FBQSxPQUFBLFdBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsR0FBQSxtQkFBQTs7O1FBR0EsT0FBQSxpQkFBQSx1Q0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7O1lBR0EsR0FBQSxRQUFBLE9BQUEsSUFBQSxTQUFBLE1BQUEsZUFBQTtZQUNBLEdBQUEsT0FBQSxPQUFBLElBQUEsU0FBQSxLQUFBLGVBQUE7O1lBRUEsR0FBQSxRQUFBO1lBQ0EsR0FBQSxRQUFBOztZQUVBLFNBQUEsWUFBQTtnQkFDQSxHQUFBLG1CQUFBOzs7Ozs7Ozs7Ozs7QUNqT0EsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsVUFBQSxzQkFBQSxZQUFBO1FBQ0EsT0FBQTtZQUNBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsTUFBQTs7Ozs7Ozs7Ozs7O0FDWEEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsV0FBQSxtRkFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsS0FBQTs7UUFFQSxHQUFBLGVBQUE7UUFDQSxHQUFBLGFBQUE7UUFDQSxHQUFBLFdBQUEsT0FBQTtRQUNBLEdBQUEsZ0JBQUEsYUFBQTtRQUNBLEdBQUEsUUFBQSxFQUFBLFVBQUEsV0FBQTtRQUNBLEdBQUEsY0FBQTs7UUFFQSxHQUFBLGlCQUFBLFlBQUE7WUFDQSxHQUFBLFdBQUEsQ0FBQSxHQUFBO1lBQ0EsYUFBQSxzQkFBQSxHQUFBOzs7UUFHQSxHQUFBLGFBQUEsVUFBQSxNQUFBO1lBQ0EsS0FBQSxTQUFBLENBQUEsS0FBQTtZQUNBLElBQUEsS0FBQSxRQUFBO2dCQUNBLElBQUEsQ0FBQSxFQUFBLEtBQUEsR0FBQSxhQUFBLE9BQUE7b0JBQ0EsR0FBQSxZQUFBLEtBQUE7b0JBQ0EsYUFBQSxlQUFBLEdBQUE7O21CQUVBO2dCQUNBLElBQUEsRUFBQSxLQUFBLEdBQUEsYUFBQSxPQUFBO29CQUNBLEVB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O0FDVEEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFFBQUEsb0JBQUEsVUFBQSxVQUFBO1FBQ0EsU0FBQSxVQUFBLGdCQUFBLFFBQUEsS0FBQSxJQUFBO1FBQ0Esb0ZBQUEsVUFBQSxjQUFBLFlBQUEsY0FBQSxnQkFBQSxRQUFBLEVBQUE7UUFDQSxJQUFBLFVBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQSxVQUFBLElBQUE7WUFDQSxRQUFBLEtBQUEsT0FBQSxLQUFBO1lBQ0EsUUFBQSxLQUFBO1lBQ0EsT0FBQSxDQUFBLFFBQUEsUUFBQSxRQUFBLFVBQUE7OztRQUdBLElBQUEsaUJBQUEsSUFBQSxPQUFBLE1BQUEsV0FBQSxRQUFBLE1BQUEsV0FBQTtZQUNBLGFBQUEsSUFBQSxPQUFBLE1BQUEsV0FBQSxRQUFBLE1BQUEsZ0JBQUE7WUFDQSxhQUFBLElBQUEsT0FBQSxNQUFBLFdBQUEsUUFBQSxNQUFBLFVBQUE7WUFDQSxxQkFBQTtZQUNBLGVBQUEsSUFBQSxPQUFBLE1BQUEsV0FBQSxRQUFBLE1BQUEsWUFBQTtZQUNBLGNBQUEsSUFBQSxPQUFBLE1BQUEsV0FBQSxPQUFBLEtBQUE7WUFDQSxnQkFBQSxJQUFBLE9BQUEsTUFBQSxXQUFBLFlBQUEsVUFBQSxjQUFBO1lBQ0EsY0FBQSxJQUFBLE9BQUEsTUFBQSxXQUFBLFlBQUEsVUFBQSxXQUFBO1lBQ0EsV0FBQSxJQUFBLE9BQUEsTUFBQSxXQUFBLFFBQUEsTUFBQSxRQUFBO1lBQ0EsV0FBQSxJQUFBLE9BQUEsTUFBQSxXQUFBLElBQUEsS0FBQTtZQUNBLHlCQUFBO1lBQ0EsdUJBQUE7WUFDQSxjQUFBLElBQUEsT0FBQSxNQUFBLFdBQUEsWUFBQSxLQUFBO1lBQ0EsYUFBQSxJQUFBLE9BQUEsTUFBQSxXQUFBLE1BQUEsU0FBQTtZQUNBLFdBQUEsSUFBQSxPQUFBLE1BQUEsV0FBQSxRQUFBLE1BQUEsUUFBQTtZQUNBLGFBQUEsSUFBQSxPQUFBLE1BQUEsV0FBQSxRQUFBLE1BQUEsV0FBQTtZQUNBLGFBQUE7Z0JBQ0EsTUFBQTtnQkFDQSxlQUFBO2dCQUNBLFVBQUE7O1lBRUEsYUFBQTtnQkFDQSxNQUFBO2dCQUNBLGVBQUE7Z0JBQ0EsVUFBQTs7WUFFQSxxQkFBQTtZQUNBLHFCQUFBO1lBQ0EsV0FBQTs7UUFFQSxJQUFBLGVBQUEsQ0FBQSxNQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUE7O1FBRUEsSUFBQSxRQUFBO1lBQ0EsTUFBQTtZQUNBLGVBQUE7WUFDQSxVQUFBLENBQUE7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBO2dCQUNBLFVBQUE7b0JBQ0EsTUFBQTtvQkFDQSxhQUFBLENBQUEsQ0FBQSxLQUFBOztnQkFFQSxlQUFBO2dCQUNBLFlBQUE7b0JBQ0EsWUFBQTtvQkFDQSxVQUFBO29CQUNBLFlBQUE7b0JBQ0EsWUFBQTtvQkFDQSxXQUFBO29CQUNBLFdBQUEsQ0FBQTtvQkFDQSxXQUFBO29CQUNBLFlBQUE7b0JBQ0EsYUFBQTtvQkFDQSxrQkFBQTtvQkFDQSxnQkFBQTtvQkFDQSxVQUFBO29CQUNBLGVBQUE7b0JBQ0EsY0FBQSxhQUFBO29CQUNBLFlBQUE7b0JBQ0EsZ0JBQUE7b0JBQ0EsZ0JBQUE7b0JBQ0EscUJBQUEsQ0FBQTs7Ozs7UUFLQSxJQUFBLGlCQUFBLFlBQUE7WUFDQSxXQUFBLFdBQUE7O1lBRUEsSUFBQSxpQkFBQSxhQUFBO2dCQUNBLFFBQUEsT0FBQSxJQUFBLGVBQUE7Z0JBQ0EsT0FBQSxPQUFBLElBQUEsZUFBQTtnQkFDQSxRQUFBLEtBQUEsS0FBQSxPQUFBO2dCQUNBLFlBQUEsYUFBQTtnQkFDQSxTQUFBLFVBQUEsV0FBQTtnQkFDQSxTQUFBLFVBQUEsV0FBQTtnQkFDQSxTQUFBLFVBQUEsV0FBQTtnQkFDQSxTQUFBLFVBQUEsV0FBQTtnQkFDQSxjQUFBOztZQUVBLElBQUEsU0FBQSxHQUFBO2dCQUNBLGNBQUE7bUJBQ0EsSUFBQSxRQUFBLEtBQUEsU0FBQSxHQUFBO2dCQUNBLGNBQUE7bUJBQ0EsSUFBQSxRQUFBLEtBQUEsU0FBQSxHQUFBO2dCQUNBLGNBQUE7bUJBQ0E7Z0JBQ0EsY0FBQTs7O1lBR0EsSUFBQSxXQUFBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBOzs7WUFHQSxXQUFBLGdCQUFBLENBQUEsS0FBQSxNQUFBLEtBQUEsWUFBQSxjQUFBLElBQUEsTUFBQSxLQUFBOztZQUVBLEtBQUEsSUFBQSxJQUFBLEdBQUEsSUFBQSxXQUFBLGVBQUEsS0FBQTtnQkFDQSxJQUFBLE1BQUEsV0FBQSxDQUFBLEtBQUEsWUFBQSxTQUFBLFVBQUEsUUFBQSxRQUFBO29CQUNBLE1BQUEsV0FBQSxDQUFBLEtBQUEsWUFBQSxTQUFBLFVBQUEsUUFBQSxRQUFBO29CQUNBLE9BQUEsT0FBQSxJQUFBLE1BQUEsWUFBQSxLQUFBLFlBQUEsS0FBQSxZQUFBLE1BQUEsWUFBQTtvQkFDQSxXQUFBLEtBQUEsTUFBQSxLQUFBLFlBQUEsTUFBQSxJQUFBLE1BQUE7b0JBQ0EsT0FBQSxLQUFBLE1BQUEsS0FBQSxZQUFBLElBQUEsSUFBQSxNQUFBO29CQUNBLFFBQUEsS0FBQSxNQUFBLEtBQUEsWUFBQSxJQUFBLElBQUEsTUFBQTtvQkFDQSxXQUFBLFNBQUE7b0JBQ0EsU0FBQSxLQUFBLE1BQUEsS0FBQSxZQUFBLElBQUEsSUFBQSxNQUFBOztnQkFFQSxJQUFBLFVBQUE7b0JBQ0EsTUFBQTtvQkFDQSxJQUFBO29CQUNBLFVBQUE7d0JBQ0EsTUFBQTt3QkFDQSxhQUFBLENBQUEsS0FBQTs7b0JBRUEsZUFBQTtvQkFDQSxZQUFBO3dCQUNBLFlBQUEsS0FBQSxNQUFBLEtBQUEsV0FBQSxhQUFBO3dCQUNBLFVBQUE7d0JBQ0EsWUFBQSxLQUFBLE1BQUEsS0FBQSxZQUFBLE9BQUEsSUFBQSxNQUFBO3dCQUNBLFlBQUE7d0JBQ0EsV0FBQSxTQUFBLEtBQUEsTUFBQSxLQUFBLFlBQUEsSUFBQSxLQUFBO3dCQUNBLFdBQUE7d0JBQ0EsV0FBQTt3QkFDQSxZQUFBO3dCQUNBLGFBQUE7d0JBQ0Esa0JBQUEsS0FBQSxNQUFBLEtBQUEsWUFBQSxNQUFBLElBQUEsTUFBQTt3QkFDQSxnQkFBQSxLQUFBLE1BQUEsS0FBQSxZQUFBLE9BQUEsSUFBQSxNQUFBO3dCQUNBLFVBQUEsS0FBQSxNQUFBLEtBQUEsWUFBQSxNQUFBLElBQUEsTUFBQTt3QkFDQSxhQUFBLE9BQUEsSUFBQSxNQUFBLFNBQUEsS0FBQSxNQUFBLFdBQUEsSUFBQTt3QkFDQSxXQUFBLE9BQUEsSUFBQSxNQUFBLElBQUEsS0FBQSxLQUFBLFdBQUEsSUFBQTt3QkFDQSxnQkFBQSxPQUFBLFNBQUEsVUFBQSxLQUFBLE9BQUE7d0JBQ0EsZUFBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLFlBQUEsS0FBQSxLQUFBLE1BQUEsTUFBQTt3QkFDQSxjQUFBLGNBQUEsS0FBQSxNQUFBLEtBQUEsWUFBQTt3QkFDQSxZQUFBLFlBQUE7d0JBQ0EsZ0JBQUEsVUFBQSxJQUFBLEtBQUEsTUFBQSxLQUFBLFlBQUEsT0FBQSxPQUFBLE9BQUEsSUFBQTt3QkFDQSxnQkFBQSxVQUFBLElBQUEsS0FBQSxNQUFBLEtBQUEsWUFBQSxRQUFBLFFBQUEsUUFBQTs7O3dCQUdBLHFCQUFBLFdBQUEsS0FBQSxNQUFBLEtBQUEsWUFBQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUE7Ozs7Z0JBSUEsV0FBQSxTQUFBLEtBQUE7O1lBRUEsV0FBQSxTQUFBLEtBQUEsTUFBQSxTQUFBO1lBQ0EscUJBQUEsRUFBQSxNQUFBOzs7UUFHQSxJQUFBLHNCQUFBLFlBQUE7WUFDQSxJQUFBLGNBQUEsYUFBQTs7WUFFQSxJQUFBLFVBQUEsSUFBQTtZQUNBLFFBQUEsS0FBQSxPQUFBLGtDQUFBO1lBQ0EsUUFBQSxLQUFBOztZQUVBLElBQUEsY0FBQSxLQUFBLE1BQUEsUUFBQTtZQUNBLFlBQUEsU0FBQSxHQUFBLFNBQUEsY0FBQSxZQUFBLFNBQUE7WUFDQSxZQUFBLFNBQUEsR0FBQSxhQUFBLFlBQUE7O1lBRUEsT0FBQSxDQUFBLEtBQUEsS0FBQSxVQUFBLGNBQUE7OztRQUdBLElBQUEsbUJBQUEsWUFBQTtZQUNBLElBQUEsVUFBQSxJQUFBO1lBQ0EsUUFBQSxLQUFBLE9BQUEsK0JBQUE7WUFDQSxRQUFBLEtBQUE7O1lBRUEsSUFBQSxPQUFBLEtBQUEsTUFBQSxRQUFBO2dCQUNBLFlBQUE7Z0JBQ0EsU0FBQTs7WUFFQSxLQUFBLElBQUEsSUFBQSxHQUFBLElBQUEsSUFBQSxLQUFBO2dCQUNBLElBQUEsWUFBQSxLQUFBLFlBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQTtvQkFDQSxZQUFBLEtBQUEsTUFBQSxLQUFBLFlBQUE7O2dCQUVBLE9BQUEsS0FBQSxFQUFBLFlBQUEsSUFBQSxXQUFBLEdBQUE7OztZQUdBLEtBQUEsU0FBQTs7WUFFQSxXQUFBO1lBQ0EsT0FBQSxDQUFBLEtBQUEsS0FBQSxVQUFBLFdBQUE7OztRQUdBLElBQUEsb0JBQUEsWUFBQTtZQUNBLElBQUEsWUFBQTtvQkFDQSxPQUFBLFNBQUEsT0FBQTtvQkFDQSxTQUFBOztnQkFFQSxVQUFBOztZQUVBLEtBQUEsSUFBQSxXQUFBLEdBQUEsV0FBQSxVQUFBLE9BQUEsWUFBQTtnQkFDQSxJQUFBLFFBQUE7b0JBQ0EsT0FBQTtvQkFDQSxRQUFBO29CQUNBLFdBQUEsU0FBQSxPQUFBLFVBQUE7b0JBQ0EsS0FBQSxDQUFBO29CQUNBLEtBQUE7b0JBQ0EsUUFBQTtvQkFDQSxRQUFBLFNBQUEsUUFBQSxTQUFBLE9BQUEsVUFBQTtvQkFDQSxRQUFBOzs7Z0JBR0EsS0FBQSxJQUFBLElBQUEsR0FBQSxJQUFBLE1BQUEsS0FBQTtvQkFDQSxNQUFBLE9BQUEsS0FBQSxLQUFBLE1BQUEsS0FBQSxZQUFBLE1BQUEsTUFBQSxNQUFBLE9BQUEsTUFBQTs7O2dCQUdBLFFBQUEsS0FBQTs7WUFFQSxVQUFBLFVBQUE7O1lBRUEsT0FBQSxDQUFBLEtBQUEsS0FBQSxVQUFBLFlBQUE7OztRQUdBLElBQUEsa0JBQUEsVUFBQSxRQUFBO1lBQ0EsSUFBQSxZQUFBLGFBQUE7Z0JBQ0EsU0FBQSxVQUFBLFdBQUE7Z0JBQ0EsU0FBQSxVQUFBLFdBQUE7Z0JBQ0EsU0FBQSxVQUFBLFdBQUE7Z0JBQ0EsU0FBQSxVQUFBLFdBQUE7O1lBRUEsSUFBQSxVQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsU0FBQTtnQkFDQSxNQUFBO29CQUNBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsS0FBQSxZQUFBLE9BQUEsS0FBQSxNQUFBLElBQUE7b0JBQ0EsZUFBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLFlBQUEsS0FBQSxJQUFBLE1BQUEsR0FBQTtvQkFDQSxNQUFBOztnQkFFQSx3QkFBQTs7O1lBR0EsS0FBQSxJQUFBLElBQUEsR0FBQSxJQUFBLFFBQUEsS0FBQSxlQUFBLEtBQUE7Z0JBQ0EsSUFBQSxRQUFBLENBQUEsS0FBQSxNQUFBLEtBQUEsWUFBQSxTQUFBLE9BQUEsV0FBQSxTQUFBLE9BQUEsYUFBQSxNQUFBLFNBQUEsT0FBQSxjQUFBO29CQUNBLFlBQUEsT0FBQSxJQUFBLENBQUEsT0FBQSxZQUFBLFFBQUE7b0JBQ0EsV0FBQSxLQUFBLE1BQUEsS0FBQSxZQUFBLE1BQUEsS0FBQSxNQUFBO29CQUNBLFVBQUEsT0FBQSxJQUFBLFdBQUEsSUFBQSxVQUFBO29CQUNBLFFBQUEsV0FBQSxDQUFBLEtBQUEsWUFBQSxTQUFBLFVBQUEsUUFBQSxRQUFBO29CQUNBLFFBQUEsUUFBQTtvQkFDQSxPQUFBLFdBQUEsQ0FBQSxLQUFBLFlBQUEsU0FBQSxVQUFBLFFBQUEsUUFBQTtvQkFDQSxPQUFBLE9BQUE7O2dCQUVBLFFBQUEsS0FBQSxLQUFBLEtBQUE7b0JBQ0EsSUFBQTtvQkFDQSxLQUFBO29CQUNBLFVBQUE7b0JBQ0EsV0FBQSxVQUFBO29CQUNBLFNBQUEsUUFBQTtvQkFDQSxLQUFBO29CQUNBLFVBQUE7b0JBQ0EsU0FBQTt3QkFDQSxRQUFBO3dCQUNBLFVBQUEsQ0FBQTt3QkFDQSxTQUFBO3dCQUNBLFNBQUEsQ0FBQTs7b0JBRUEsYUFBQTt3QkFDQSxNQUFBO3dCQUNBLGFBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxPQUFBLENBQUEsS0FBQSxPQUFBLENBQUEsS0FBQSxPQUFBLENBQUEsS0FBQSxPQUFBLENBQUEsS0FBQTs7b0JBRUEsYUFBQTs7OztZQUlBLE9BQUEsQ0FBQSxLQUFBLEtBQUEsVUFBQSxVQUFBOzs7UUFHQSxJQUFBLGtCQUFBLFlBQUE7WUFDQSxXQUFBLFdBQUE7O1lBRUEsSUFBQSxpQkFBQSxhQUFBO2dCQUNBLFFBQUEsT0FBQSxJQUFBLGVBQUE7Z0JBQ0EsT0FBQSxPQUFBLElBQUEsZUFBQTtnQkFDQSxRQUFBLEtBQUEsS0FBQSxPQUFBO2dCQUNBLFlBQUEsYUFBQTtnQkFDQSxTQUFBLFVBQUEsV0FBQTtnQkFDQSxTQUFBLFVBQUEsV0FBQTtnQkFDQSxTQUFBLFVBQUEsV0FBQTtnQkFDQSxTQUFBLFVBQUEsV0FBQTtnQkFDQSxjQUFBOztZQUVBLElBQUEsU0FBQSxHQUFBO2dCQUNBLGNBQUE7bUJBQ0EsSUFBQSxRQUFBLEtBQUEsU0FBQSxHQUFBO2dCQUNBLGNBQUE7bUJBQ0EsSUFBQSxRQUFBLEtBQUEsU0FBQSxHQUFBO2dCQUNBLGNBQUE7bUJBQ0E7Z0JBQ0EsY0FBQTs7O1lBR0EsV0FBQSxnQkFBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLFlBQUEsY0FBQSxJQUFBLE1BQUEsS0FBQTs7WUFFQSxLQUFBLElBQUEsSUFBQSxHQUFBLElBQUEsV0FBQSxlQUFBLEtBQUE7Z0JBQ0EsSUFBQSxNQUFBLFdBQUEsQ0FBQSxLQUFBLFlBQUEsU0FBQSxVQUFBLFFBQUEsUUFBQTtvQkFDQSxNQUFBLFdBQUEsQ0FBQSxLQUFBLFlBQUEsU0FBQSxVQUFBLFFBQUEsUUFBQTtvQkFDQSxPQUFBLE9BQUEsSUFBQSxNQUFBLFlBQUEsS0FBQSxZQUFBLEtBQUEsWUFBQSxNQUFBLFlBQUE7O2dCQUVBLElBQUEsVUFBQTtvQkFDQSxNQUFBO29CQUNBLElBQUE7b0JBQ0EsVUFBQTt3QkFDQSxNQUFBO3dCQUNBLGFBQUEsQ0FBQSxLQUFBOztvQkFFQSxlQUFBO29CQUNBLFlBQUE7d0JBQ0EsZUFBQTt3QkFDQSxNQUFBO3dCQUNBLFlBQUE7d0JBQ0EsTUFBQTt3QkFDQSxZQUFBO3dCQUNBLE1BQUE7d0JBQ0EsWUFBQTt3QkFDQSxNQUFBO3dCQUNBLFlBQUE7d0JBQ0EsTUFBQTt3QkFDQSxZQUFBO3dCQUNBLE1BQUE7d0JBQ0EsWUFBQTt3QkFDQSxNQUFBO3dCQUNBLFlBQUE7d0JBQ0Esa0JBQUE7d0JBQ0EsTUFBQTt3QkFDQSxLQUFBO3dCQUNBLFdBQUE7Ozs7Z0JBSUEsV0FBQSxTQUFBLEtBQUE7O1lBRUEscUJBQUEsRUFBQSxNQUFBOzs7O1FBSUEsYUFBQSxRQUFBLFNBQUE7OztRQUdBLGFBQUEsUUFBQSxZQUFBOzs7UUFHQSxhQUFBLFFBQUEsWUFBQTtRQUNBLGFBQUEsUUFBQSxZQUFBO1FBQ0EsYUFBQSxTQUFBLFlBQUE7UUFDQSxhQUFBLFFBQUEsWUFBQTs7O1FBR0EsYUFBQSxRQUFBLGdCQUFBO1FBQ0EsYUFBQSxTQUFBLGdCQUFBOzs7UUFHQSxhQUFBLFNBQUEsVUFBQTs7UUFFQSxhQUFBLFNBQUEsVUFBQTs7O1FBR0EsYUFBQSxRQUFBLGNBQUEsUUFBQSxZQUFBO1lBQ0EsT0FBQSxRQUFBOzs7O1FBSUEsYUFBQSxTQUFBLGFBQUEsUUFBQSxVQUFBLFFBQUEsS0FBQTtZQUNBLElBQUEsWUFBQSxhQUFBO1lBQ0EsSUFBQSxXQUFBO2dCQUNBLElBQUEsV0FBQSxhQUFBLE1BQUE7b0JBQ0E7O2dCQUVBLElBQUEsWUFBQSxhQUFBO2dCQUNBLElBQUEsTUFBQSxhQUFBO2dCQUNBLElBQUEsV0FBQSxhQUFBO2dCQUNBLG1CQUFBLFdBQUEsRUFBQSxPQUFBLFdBQUEsVUFBQSxVQUFBLE9BQUE7b0JBQ0EsT0FBQSxNQUFBLFdBQUEsV0FBQSxPQUFBLG1CQUFBLGFBQUEsb0JBQUEsTUFBQSxXQUFBLGlCQUFBLGFBQUEsNEJBQUEsTUFBQSxXQUFBLG1CQUFBLFNBQUEsTUFBQSxXQUFBLFdBQUEsT0FBQSxtQkFBQSxVQUFBLE9BQUEsTUFBQSxXQUFBLFdBQUEsT0FBQSxtQkFBQSxVQUFBLE9BQUEsTUFBQSxXQUFBLFdBQUEsT0FBQSxhQUFBLElBQUEsT0FBQSxNQUFBLFdBQUEsV0FBQSxPQUFBLGFB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QUFBLEVBQUEsT0FBQSxXQUFBLFVBQUEsVUFBQSxRQUFBO29CQUNBLE9BQUEsVUFBQSxTQUFBLEVBQUEsT0FBQSxPQUFBLFdBQUEsS0FBQSxPQUFBLFdBQUE7OztnQkFHQSxPQUFBLENBQUEsS0FBQSxLQUFBLFVBQUEscUJBQUE7Ozs7O1FBS0EsYUFBQSxRQUFBLFlBQUEsUUFBQSxVQUFBLFFBQUEsS0FBQTtZQUNBLFFBQUEsSUFBQTtZQUNBLElBQUEsWUFBQSxDQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxTQUFBO2dCQUNBLFNBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxXQUFBOztZQUVBLE9BQUEsQ0FBQSxLQUFBLEtBQUEsVUFBQSxZQUFBOzs7O0FBSUEiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBMQVlPVVRfS0VZID0gJ2VyaXNMYXlvdXRDb25maWcnO1xyXG4gICAgLy8gREVGQVVMVF9MQVlPVVQgaXMgdGhlIGNvbmZpZ3VyYXRpb24gZm9yIEdvbGRlbkxheW91dCB3ZSdsbCB1c2UgaWYgdGhlXHJcbiAgICAvLyB1c2VyIGhhc24ndCBzYXZlZCBvbmUgeWV0IG9yIGlmIHRoZSBvbmUgdGhleSBoYXZlIHNhdmVkIGNhdXNlcyBhbiBlcnJvclxyXG4gICAgLy8gb2Ygc29tZSBzb3J0LlxyXG4gICAgdmFyIERFRkFVTFRfTEFZT1VUID0ge1xyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICAgIGhhc0hlYWRlcnM6IHRydWUsXHJcbiAgICAgICAgICAgIHNob3dQb3BvdXRJY29uOiBmYWxzZSxcclxuICAgICAgICAgICAgc2hvd01heGltaXNlSWNvbjogdHJ1ZSxcclxuICAgICAgICAgICAgc2hvd0Nsb3NlSWNvbjogZmFsc2VcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxhYmVsczoge1xyXG4gICAgICAgICAgICBtYXhpbWlzZTogJ21heGltaXplJyxcclxuICAgICAgICAgICAgbWluaW1pc2U6ICdtaW5pbWl6ZSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgIHR5cGU6ICdyb3cnLFxyXG4gICAgICAgICAgICBjb250ZW50OiBbe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2NvbHVtbicsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogMjIsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiBbe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjb21wb25lbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6ICd0ZW1wbGF0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50U3RhdGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVJZDogJ21vZHVsZXMvY29tcG9uZW50cy9zaWRlYmFyL3NpZGViYXJUZW1wbGF0ZS5odG1sJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVOYW1lOiAnbmF2aWdhdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVGl0bGU6ICdOYXZpZ2F0aW9uJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2NvbHVtbicsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogMzksXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiBbe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyb3cnLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogNzAsXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NvbXBvbmVudCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6ICd0ZW1wbGF0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFN0YXRlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZUlkOiAnbW9kdWxlcy9jb21wb25lbnRzL21hcC9tYXBUZW1wbGF0ZS5odG1sJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlTmFtZTogJ21hcCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVRpdGxlOiAnTWFwJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyb3cnLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogMzAsXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NvbXBvbmVudCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6ICd0ZW1wbGF0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFN0YXRlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZUlkOiAnbW9kdWxlcy9jb21wb25lbnRzL2V2ZW50cy9ldmVudHNUZW1wbGF0ZS5odG1sJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlTmFtZTogJ2V2ZW50cycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVRpdGxlOiAnRXZlbnRzJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2NvbHVtbicsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogMzksXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiBbe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjb21wb25lbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6ICd0ZW1wbGF0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50U3RhdGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVJZDogJ21vZHVsZXMvY29tcG9uZW50cy9ldmVudFZpZXdlci9ldmVudFZpZXdlclRlbXBsYXRlLmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZU5hbWU6ICdldmVudFZpZXdlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVGl0bGU6ICdFdmVudCBEZXRhaWxzJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgIH1dXHJcbiAgICAgICAgfV1cclxuICAgIH07XHJcblxyXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdlcmlzJywgW1xyXG4gICAgICAgICdlcmlzLmNvbmZpZycsXHJcbiAgICAgICAgJ25nTWF0ZXJpYWwnLFxyXG4gICAgICAgICduZ0Nvb2tpZXMnLFxyXG4gICAgICAgICduZ1Jlc291cmNlJyxcclxuICAgICAgICAnbmdTYW5pdGl6ZScsXHJcbiAgICAgICAgJ25nQW5pbWF0ZScsXHJcbiAgICAgICAgJ25nV2Vid29ya2VyJyxcclxuICAgICAgICAnbmVtTG9nZ2luZycsXHJcbiAgICAgICAgJ3VpLWxlYWZsZXQnLFxyXG4gICAgICAgICdMb2NhbFN0b3JhZ2VNb2R1bGUnLFxyXG4gICAgICAgICdjZnAuaG90a2V5cycsXHJcbiAgICAgICAgJ2VzLm5nVXRjRGF0ZXBpY2tlcicsXHJcbiAgICAgICAgJ2VtZ3VvLnBvbGxlcidcclxuICAgIF0pO1xyXG5cclxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRwcm92aWRlLCAkbWRUaGVtaW5nUHJvdmlkZXIsIFdlYndvcmtlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgcG9sbGVyQ29uZmlnKSB7XHJcbiAgICAgICAgLy8gRml4IHNvdXJjZW1hcHNcclxuICAgICAgICAvLyBAdXJsIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIuanMvaXNzdWVzLzUyMTcjaXNzdWVjb21tZW50LTUwOTkzNTEzXHJcbiAgICAgICAgJHByb3ZpZGUuZGVjb3JhdG9yKCckZXhjZXB0aW9uSGFuZGxlcicsIGZ1bmN0aW9uICgkZGVsZWdhdGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChleGNlcHRpb24sIGNhdXNlKSB7XHJcbiAgICAgICAgICAgICAgICAkZGVsZWdhdGUoZXhjZXB0aW9uLCBjYXVzZSk7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGV4Y2VwdGlvbjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBwb2xsZXJDb25maWcuc21hcnQgPSB0cnVlO1xyXG5cclxuICAgICAgICAkbWRUaGVtaW5nUHJvdmlkZXIudGhlbWUoJ2RlZmF1bHQnKS5wcmltYXJ5UGFsZXR0ZSgnZ3JleScpLmFjY2VudFBhbGV0dGUoJ2JsdWUnKS5kYXJrKCk7XHJcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdzdWNjZXNzLXRvYXN0Jyk7XHJcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdmYWlsLXRvYXN0Jyk7XHJcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCd3YXJuLXRvYXN0Jyk7XHJcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdpbmZvLXRvYXN0Jyk7XHJcblxyXG4gICAgICAgIFdlYndvcmtlclByb3ZpZGVyLnNldEhlbHBlclBhdGgoJy4vc2NyaXB0cy93ZWJ3b3JrZXJEZXBzL3dvcmtlcl93cmFwcGVyLmpzJyk7XHJcblxyXG4gICAgICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcclxuICAgIH0pXHJcbiAgICAudmFsdWUoJ21vbWVudCcsIHdpbmRvdy5tb21lbnQpXHJcbiAgICAudmFsdWUoJ18nLCB3aW5kb3cuXylcclxuICAgIC52YWx1ZSgnTCcsIHdpbmRvdy5MKVxyXG4gICAgLnZhbHVlKCd0b2ttbCcsIHdpbmRvdy50b2ttbClcclxuICAgIC52YWx1ZSgnbG9jYWxTdG9yYWdlJywgd2luZG93LmxvY2FsU3RvcmFnZSlcclxuICAgIC52YWx1ZSgnZDMnLCB3aW5kb3cuZDMpXHJcbiAgICAudmFsdWUoJyQnLCB3aW5kb3cuJClcclxuICAgIC52YWx1ZSgnYzMnLCB3aW5kb3cuYzMpXHJcbiAgICAudmFsdWUoJ1hNTEh0dHBSZXF1ZXN0Jywgd2luZG93LlhNTEh0dHBSZXF1ZXN0KVxyXG4gICAgLnZhbHVlKCdMTHRvTUdSUycsIHdpbmRvdy5MTHRvTUdSUylcclxuICAgIC52YWx1ZSgnR29sZGVuTGF5b3V0Jywgd2luZG93LkdvbGRlbkxheW91dClcclxuICAgIC52YWx1ZSgnQmxvYicsIHdpbmRvdy5CbG9iKVxyXG4gICAgLnZhbHVlKCdVUkwnLCB3aW5kb3cuVVJMKTtcclxuXHJcbiAgICBhcHAucnVuKGZ1bmN0aW9uKCRyb290U2NvcGUsICRodHRwLCAkY29tcGlsZSwgJG1kVG9hc3QsICR3aW5kb3csICRsb2NhdGlvbiwgZXJpc0NvbmZpZywgZXJpc1NlcnZpY2UsIGxvY2FsU3RvcmFnZVNlcnZpY2UsIHN0YXRlU2VydmljZSwgc2VhcmNoU2VydmljZSwgdm90ZVNlcnZpY2UsIEdvbGRlbkxheW91dCwgXywgbW9tZW50KSB7XHJcbiAgICAgICAgLy8gc2V0IGEgZ2xvYmFsIHNjb3BlIHBhcmFtIGZvciB0aGUgPHRpdGxlPiBlbGVtZW50XHJcbiAgICAgICAgJHJvb3RTY29wZS5wYWdlVGl0bGUgPSBlcmlzQ29uZmlnLnRpdGxlO1xyXG5cclxuICAgICAgICAvLyByZXRyaWV2ZS9zZXQgdm90aW5nIGluZm9cclxuICAgICAgICB2b3RlU2VydmljZS5nZXRWb3RlcigpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0LmRhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHZvdGVyID0gcmVzdWx0LmRhdGFbMF07XHJcbiAgICAgICAgICAgICAgICAvLyB1c2VyIGhhcyB2b3RlZCBiZWZvcmVcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3Rlcih2b3Rlcik7XHJcbiAgICAgICAgICAgICAgICAvLyBjaGVjayB0byBzZWUgaWYgdm90ZXIgaXMgYWRtaW5cclxuICAgICAgICAgICAgICAgIHZhciBpc0FkbWluID0gXy5pbmRleE9mKGVyaXNDb25maWcuYWRtaW5zLCBfLnRvTG93ZXIodm90ZXIudm90ZXJfbmFtZSkpID4gLTE7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh2b3Rlci52b3Rlcl9uYW1lLCBpc0FkbWluKTtcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRJc0FkbWluKGlzQWRtaW4pO1xyXG4gICAgICAgICAgICAgICAgdm90ZVNlcnZpY2UuZ2V0Vm90ZXNCeVZvdGVyKHZvdGVyLnZvdGVyX25hbWUpLnRoZW4oZnVuY3Rpb24gKHZvdGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVzKHZvdGVzLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3RlcyhudWxsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogcmlnaHQgbm93IHRoZSBzZXJ2aWNlIHNpbXBseSByZWFkcyB0aGUgdXNlcidzIElQLFxyXG4gICAgICAgICAgICAgICAgLy8gdGhlcmVmb3JlIG5vIHBheWxvYWQgZGF0YSBpcyByZXF1aXJlZC4gV2hlbiBQS0kgYXV0aCBpc1xyXG4gICAgICAgICAgICAgICAgLy8gYXZhaWxhYmxlLCBhbiBvYmplY3Qgd2lsbCBuZWVkIHRvIGJlIHBhc3NlZCB0byB0aGUgYWRkVm90ZXJcclxuICAgICAgICAgICAgICAgIC8vIGZ1bmN0aW9uXHJcbiAgICAgICAgICAgICAgICB2b3RlU2VydmljZS5hZGRWb3RlcigpLnRoZW4oZnVuY3Rpb24gKHZvdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVyKHZvdGVyLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3RlcihudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvcjogVW5hYmxlIHRvIGFkZCB2b3RlciB0byBkYXRhYmFzZS4gVm90aW5nIHdpbGwgYmUgdW5hdmFpbGFibGUuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZXIobnVsbCk7XHJcbiAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yOiBVbmFibGUgdG8gcXVlcnkgdm90ZSBkYXRhYmFzZS4gVm90aW5nIHdpbGwgYmUgdW5hdmFpbGFibGUuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBsb2FkIHJlYXNvbnMgdG8gbGlzdCBmb3IgZG93bnZvdGUgYnV0dG9uXHJcbiAgICAgICAgdm90ZVNlcnZpY2UuZ2V0UmVhc29ucygpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICB2YXIgdm90ZVJlYXNvbnMgPSBfLmZpbHRlcihyZXN1bHQuZGF0YSwgZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLnJlYXNvbi5sZW5ndGggPiAwO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVSZWFzb25zKHZvdGVSZWFzb25zKTtcclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIHJldHJpZXZpbmcgdm90ZSBpbmZvcm1hdGlvbicpO1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB2YXIgaW5pdGlhbGl6ZUxheW91dCA9IGZ1bmN0aW9uIChsYXlvdXRDb25maWcpIHtcclxuICAgICAgICAgICAgdmFyIGxheW91dCA9IG5ldyBHb2xkZW5MYXlvdXQobGF5b3V0Q29uZmlnKTtcclxuICAgICAgICAgICAgdmFyIGNvbXBvbmVudHMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGxheW91dC5yZWdpc3RlckNvbXBvbmVudCgndGVtcGxhdGUnLCBmdW5jdGlvbiAoY29udGFpbmVyLCBzdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnNldFRpdGxlKHN0YXRlLnRlbXBsYXRlVGl0bGUpO1xyXG4gICAgICAgICAgICAgICAgJGh0dHAuZ2V0KHN0YXRlLnRlbXBsYXRlSWQsIHsgY2FjaGU6IHRydWUgfSkuc3VjY2VzcyhmdW5jdGlvbiAoaHRtbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgPSAkY29tcGlsZSgnPGRpdj4nICsgaHRtbCArICc8L2Rpdj4nKSgkcm9vdFNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuZ2V0RWxlbWVudCgpLmh0bWwoaHRtbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5wdXNoKHsgY29udGFpbmVyOiBjb250YWluZXIsIHN0YXRlOiBzdGF0ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TGF5b3V0Q29tcG9uZW50cyhjb21wb25lbnRzKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxheW91dC5vbignc3RhdGVDaGFuZ2VkJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHN0YXRlID0gbGF5b3V0LnRvQ29uZmlnKCk7XHJcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldChMQVlPVVRfS0VZLCBzdGF0ZSk7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TGF5b3V0Q29uZmlnKHN0YXRlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBsYXlvdXQuaW5pdCgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIGdvbGRlbiBsYXlvdXQgY29uZmlnIC0gZXZlbnR1YWxseSB1c2Ugc3RhdGVTZXJ2aWNlIGZvciB0aGlzLi4uXHJcbiAgICAgICAgdmFyIGxheW91dENvbmZpZyA9IERFRkFVTFRfTEFZT1VUO1xyXG4gICAgICAgIGlmIChsb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldChMQVlPVVRfS0VZKSkge1xyXG4gICAgICAgICAgICBsYXlvdXRDb25maWcgPSBsb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldChMQVlPVVRfS0VZKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBkb0xheW91dCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCRsb2NhdGlvbi5zZWFyY2goKS5yZXNldCkge1xyXG4gICAgICAgICAgICAgICAgaW5pdGlhbGl6ZUxheW91dChERUZBVUxUX0xBWU9VVCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUcnkgdG8gdXNlIHRoZSBsYXlvdXQgY29uZmlndXJhdGlvbiBmcm9tIGxvY2FsIHN0b3JhZ2UsIGJ1dCBpZlxyXG4gICAgICAgICAgICAgICAgLy8gZm9yIHdoYXRldmVyIHJlYXNvbiB0aGF0IGZhaWxzLCBmYWxsYmFjayB0byB0aGUgZGVmYXVsdFxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBpbml0aWFsaXplTGF5b3V0KGxheW91dENvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExheW91dENvbmZpZyhsYXlvdXRDb25maWcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbml0aWFsaXplTGF5b3V0KERFRkFVTFRfTEFZT1VUKTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TGF5b3V0Q29uZmlnKGxheW91dENvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xyXG4gICAgICAgICAgICAvLyBjaGVjayBmb3IgdmFsdWVzIGluIHF1ZXJ5c3RyaW5nIGFuZCBnbyB0byBhbiBldmVudCBpZiBhcHBsaWNhYmxlXHJcbiAgICAgICAgICAgIGlmIChxc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICYmIHFzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0pIHtcclxuICAgICAgICAgICAgICAgIHZhciBldmVudFBhcmFtcyA9IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgIGV2ZW50UGFyYW1zW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gPSBxc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdO1xyXG4gICAgICAgICAgICAgICAgZXZlbnRQYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9IHBhcnNlSW50KHFzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0RXZlbnQoZXZlbnRQYXJhbXMpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5mZWF0dXJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBldmVudCA9IGRhdGEuZmVhdHVyZXNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wb3JhbEZpbHRlciA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBtb21lbnQudXRjKGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXSkuc3VidHJhY3QoMSwgJ2gnKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogbW9tZW50LnV0YyhldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGVGaWVsZF0pLmFkZCgxLCAnaCcpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uTGVuZ3RoOiBudWxsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXBDZW50ZXIgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubGF0RmllbGRdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvbkZpZWxkXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHpvb206IHN0YXRlU2VydmljZS5nZXRNYXBab29tKCkgfHwgNlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TWFwWm9vbShtYXBDZW50ZXIuem9vbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBDZW50ZXIobWFwQ2VudGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsRmlsdGVyKHRlbXBvcmFsRmlsdGVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvcjogVGhlIHNwZWNpZmllZCBwcm9kdWN0IGFuZCBkYXRhc2V0IElEcyByZXR1cm5lZCAwIGZlYXR1cmVzLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZG9MYXlvdXQoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZG9MYXlvdXQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGluaXRpYWxpemUoKTtcclxuICAgIH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLnNlcnZpY2UoJ2VyaXNDb25maWcnLCBmdW5jdGlvbiAoZXJpc0NvbmZpZ0xvY2FsLCBtb21lbnQsIF8sIEwpIHtcbiAgICAgICAgdmFyIGNmZyA9IHtcbiAgICAgICAgICAgIHRpdGxlOiAnRXJpcycsXG4gICAgICAgICAgICBsb2dvOiAnzpQgRXJpcycsXG4gICAgICAgICAgICBtYXBDZW50ZXI6IHtcbiAgICAgICAgICAgICAgICBsYXQ6IDQ0LjM2NjQyOCxcbiAgICAgICAgICAgICAgICBsbmc6IC04MS40NTM5NDUsXG4gICAgICAgICAgICAgICAgem9vbTogOFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxheWVyczoge1xuICAgICAgICAgICAgICAgIGJhc2VsYXllcnM6IHt9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVmYXVsdExvY2F0aW9uRm9ybWF0OiAnZGQnLFxuICAgICAgICAgICAgZGVmYXVsdEJhc2VsYXllcjogJycsXG4gICAgICAgICAgICBtYXhEYXlzQmFjazogMTAwMDAsXG4gICAgICAgICAgICBkZWZhdWx0VGltZVJhbmdlVmFsdWU6IDYsXG4gICAgICAgICAgICBkZWZhdWx0VGltZVJhbmdlVHlwZTogJ2gnLFxuICAgICAgICAgICAgcmFuZ2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB1bml0czogLTMwLFxuICAgICAgICAgICAgICAgICAgICB1bml0T2ZUaW1lOiAnbWludXRlcycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnMzAgTWluJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB1bml0czogLTEsXG4gICAgICAgICAgICAgICAgICAgIHVuaXRPZlRpbWU6ICdob3VycycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnSG91cidcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdW5pdHM6IC02LFxuICAgICAgICAgICAgICAgICAgICB1bml0T2ZUaW1lOiAnaG91cnMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJzYgSHJzJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB1bml0czogLTEyLFxuICAgICAgICAgICAgICAgICAgICB1bml0T2ZUaW1lOiAnaG91cnMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJzEyIEhycydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdW5pdHM6IC0yNCxcbiAgICAgICAgICAgICAgICAgICAgdW5pdE9mVGltZTogJ2hvdXJzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICcyNCBIcnMnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRlZmF1bHREdXJhdGlvbkxlbmd0aDogMSxcbiAgICAgICAgICAgIGR1cmF0aW9uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdkYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdEYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICd3ZWVrcycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnV2Vla3MnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ21vbnRocycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnTW9udGhzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ3llYXJzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdZZWFycycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRlZmF1bHRQcm9qZWN0aW9uOiBMLkNSUy5FUFNHNDMyNixcbiAgICAgICAgICAgIGRlYm91bmNlVGltZTogMzAwLFxuICAgICAgICAgICAgbWF4aW11bVJlY2VudEFPSXM6IDUsXG4gICAgICAgICAgICBjb21wb25lbnRzOiB7XG4gICAgICAgICAgICAgICAgZ290bzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzb3VyY2VGaWx0ZXI6IHRydWUsXG4gICAgICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXI6IHRydWUsXG4gICAgICAgICAgICAgICAgdHlwZUZpbHRlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBldmVudEZpbHRlcnM6IHRydWUsXG4gICAgICAgICAgICAgICAgY291bnRyeUZpbHRlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmbXZGaWx0ZXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNlbnNvckZpbHRlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2b3RlRmlsdGVyOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25seUNvcnJlbGF0aW9uczogJ2FsbCcsXG4gICAgICAgICAgICBmaWx0ZXJTdHJhdGVneTogJ3NlcnZlcicsXG4gICAgICAgICAgICBzdHJpa2VWaXNpYmlsaXR5OiAnaGlkZGVuJyxcbiAgICAgICAgICAgIGZtdkZpbHRlcjogJ2Rpc2FibGVkJyxcbiAgICAgICAgICAgIHZvdGVGaWx0ZXI6ICdkaXNhYmxlZCcsXG4gICAgICAgICAgICB2b3RlRmlsdGVyVHlwZTogJ1VwJyxcbiAgICAgICAgICAgIHRvdGFsVm90ZXM6IDEsXG4gICAgICAgICAgICBhY3RpdmVDb2xvcjogJ2JsdWUtODAwJyxcbiAgICAgICAgICAgIGluYWN0aXZlQ29sb3I6ICdncmV5LTkwMCcsXG4gICAgICAgICAgICBkZWZhdWx0U29ydENvbmZpZzoge31cbiAgICAgICAgfTtcblxuICAgICAgICAvLyByZWN1cnNpdmVseSBtZXJnZSB0aGUgbG9jYWwgY29uZmlnIG9udG8gdGhlIGRlZmF1bHQgY29uZmlnXG4gICAgICAgIGFuZ3VsYXIubWVyZ2UoY2ZnLCBlcmlzQ29uZmlnTG9jYWwpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY2ZnLmRlZmF1bHRQcm9qZWN0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gZGVmYXVsdFByb2plY3Rpb24gaGFzIGJlZW4gb3ZlcndyaXR0ZW4gaW4gbG9jYWwgY29uZmlnXG4gICAgICAgICAgICAvLyBvbmx5IGEgc3RyaW5nIHZhbHVlIGNhbiBiZSBzcGVjaWZpZWQgaW4gbG9jYWwgY29uZmlnLCBzbyB1c2UgZXZhbCB0byBwcm9kdWNlIHRoZSBwcm9wZXIgSlMgb2JqZWN0XG4gICAgICAgICAgICBjZmcuZGVmYXVsdFByb2plY3Rpb24gPSBldmFsKGNmZy5kZWZhdWx0UHJvamVjdGlvbik7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjZmcubGF5ZXJzLmJhc2VsYXllcnMuY3ljbGUubGF5ZXJQYXJhbXMuY3JzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY2ZnLmxheWVycy5iYXNlbGF5ZXJzLmN5Y2xlLmxheWVyUGFyYW1zLmNycyA9IGV2YWwoY2ZnLmxheWVycy5iYXNlbGF5ZXJzLmN5Y2xlLmxheWVyUGFyYW1zLmNycyk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjZmc7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5mYWN0b3J5KCdWb3RlJywgZnVuY3Rpb24gKFxyXG4gICAgICAgIGVyaXNDb25maWdcclxuICAgICkge1xyXG4gICAgICAgIC8vIENvbnN0cnVjdG9yXHJcbiAgICAgICAgdmFyIFZvdGUgPSBmdW5jdGlvbiAodm90ZV9pZCwgcHJvZHVjdF9pZCwgZGF0YXNldF9pZCwgaWRlbnRpdHksIHZvdGVyX25hbWUsIHZvdGUsIHJlYXNvbiwgdHlwZSwgZXZlbnRfdGltZSkge1xyXG4gICAgICAgICAgICB0aGlzLnZvdGVfaWQgPSB2b3RlX2lkIHx8IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9IHByb2R1Y3RfaWQgfHwgJyc7XHJcbiAgICAgICAgICAgIHRoaXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9IGRhdGFzZXRfaWQgfHwgJyc7XHJcbiAgICAgICAgICAgIHRoaXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0gPSBpZGVudGl0eSB8fCBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLnZvdGVyX25hbWUgPSB2b3Rlcl9uYW1lIHx8ICcnO1xyXG4gICAgICAgICAgICB0aGlzLnZvdGUgPSB0eXBlb2Yodm90ZSkgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHZvdGU7XHJcbiAgICAgICAgICAgIHRoaXMucmVhc29uID0gcmVhc29uIHx8ICcnO1xyXG4gICAgICAgICAgICB0aGlzLnR5cGUgPSB0eXBlIHx8IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXSA9IGV2ZW50X3RpbWU7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gcHVibGljIG1ldGhvZHNcclxuICAgICAgICBWb3RlLnByb3RvdHlwZSA9IHtcclxuXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gc3RhdGljIG1ldGhvZHNcclxuICAgICAgICBWb3RlLmJ1aWxkID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YoZGF0YS52b3RlKSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnZvdGUgPSBkYXRhLnZvdGUgPT09ICd0cnVlJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVm90ZShcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnZvdGVfaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wcm9kdWN0X2lkLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZGF0YXNldF9pZCxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudm90ZXJfbmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnZvdGUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZWFzb24sXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZXZlbnRfdGltZVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZvdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBWb3RlLnRyYW5zZm9ybWVyID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubWFwKFZvdGUuYnVpbGQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBWb3RlLmJ1aWxkKGRhdGEpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBWb3RlO1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuc2VydmljZSgnYWxlcnRTZXJ2aWNlJywgZnVuY3Rpb24gKFxuICAgICAgICAkaHR0cCxcbiAgICAgICAgJHEsXG4gICAgICAgIGVyaXNDb25maWdcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGdldEFsZXJ0czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy9hbGVydHMnXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRBbGVydDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL2FsZXJ0cy8nICsgaWRcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZEFsZXJ0OiBmdW5jdGlvbiAoYWxlcnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL2FsZXJ0cycsIGFsZXJ0KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXBkYXRlQWxlcnQ6IGZ1bmN0aW9uIChhbGVydCkge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwLnB1dChlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy9hbGVydHMvJyArIGFsZXJ0LmFsZXJ0X2lkLCBhbGVydCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuZmFjdG9yeSgnY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlJywgZnVuY3Rpb24gKExMdG9NR1JTKSB7XG4gICAgICAgIC8vdHJ1bmNhdGUgaXMgYSBzaWduIGFwcHJvcHJpYXRlIHRydW5jYXRpb24gZnVuY3Rpb25cbiAgICAgICAgdmFyIHRydW5jYXRlID0gZnVuY3Rpb24gKF92YWx1ZSkge1xuICAgICAgICAgICAgaWYgKF92YWx1ZSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5jZWlsKF92YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihfdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyBsYXRpdHVkZSBkZWNpbWFsIGRlZ3JlZXMgKGZsb2F0KSBpbnRvIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgYXMgYSBzdHJpbmcgaW4gdGhlIGZvcm1hdDpcbiAgICAgICAgICdYWMKwWFgnWFguWFhYJ1xuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGRkTGF0VG9ETVNMYXQgPSBmdW5jdGlvbiAobGF0KSB7XG4gICAgICAgICAgICB2YXIgZGVncmVlcztcbiAgICAgICAgICAgIHZhciBtaW51dGVzO1xuICAgICAgICAgICAgdmFyIHNlY29uZHM7XG4gICAgICAgICAgICBpZiAobGF0IDw9IDkwICYmIGxhdCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHRydW5jYXRlKGxhdCk7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IHRydW5jYXRlKChsYXQgLSBkZWdyZWVzKSAqIDYwKTtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gKCgoKGxhdCAtIGRlZ3JlZXMpICogNjApIC0gbWludXRlcykgKiA2MCkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVncmVlcyArICfCsCcgKyBtaW51dGVzICsgJ1xcJycgKyBzZWNvbmRzICsgJ1wiJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGF0IDwgMCAmJiBsYXQgPj0gLTkwKSB7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHRydW5jYXRlKGxhdCk7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IHRydW5jYXRlKChNYXRoLmFicyhsYXQpIC0gTWF0aC5hYnMoZGVncmVlcykpICogNjApO1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSAoKCgoTWF0aC5hYnMobGF0KSAtIE1hdGguYWJzKGRlZ3JlZXMpKSAqIDYwKSAtIG1pbnV0ZXMpICogNjApLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZ3JlZXMgKyAnwrAnICsgbWludXRlcyArICdcXCcnICsgc2Vjb25kcyArICdcIic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnSW52YWxpZCBMYXRpdHVkZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLypcbiAgICAgICAgIENvbnZlcnRzIGxvbmdpdHVkZSBkZWNpbWFsIGRlZ3JlZXMgKGZsb2F0KSBpbnRvIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgYXMgYSBzdHJpbmcgaW4gdGhlIGZvcm1hdDpcbiAgICAgICAgICdYWMKwWFgnWFguWFhYJ1xuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGRkTG9uVG9ETVNMb24gPSBmdW5jdGlvbiAobG9uKSB7XG4gICAgICAgICAgICB2YXIgZGVncmVlcztcbiAgICAgICAgICAgIHZhciBtaW51dGVzO1xuICAgICAgICAgICAgdmFyIHNlY29uZHM7XG4gICAgICAgICAgICBpZiAobG9uIDw9IDE4MCAmJiBsb24gPj0gMCkge1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSB0cnVuY2F0ZShsb24pO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB0cnVuY2F0ZSgobG9uIC0gZGVncmVlcykgKiA2MCk7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9ICgoKChsb24gLSBkZWdyZWVzKSAqIDYwKSAtIG1pbnV0ZXMpICogNjApLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZ3JlZXMgKyAnwrAnICsgbWludXRlcyArICdcXCcnICsgc2Vjb25kcyArICdcIic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxvbiA8IDAgJiYgbG9uID49IC0xODApIHtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gdHJ1bmNhdGUoKGxvbikpO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB0cnVuY2F0ZSgoTWF0aC5hYnMobG9uKSAtIE1hdGguYWJzKGRlZ3JlZXMpKSAqIDYwKTtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gKCgoKE1hdGguYWJzKGxvbikgLSBNYXRoLmFicyhkZWdyZWVzKSkgKiA2MCkgLSBtaW51dGVzKSAqIDYwKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWdyZWVzICsgJ8KwJyArIG1pbnV0ZXMgKyAnXFwnJyArIHNlY29uZHMgKyAnXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ludmFsaWQgbG9uZ2l0dWRlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgbGF0aXR1ZGUgZGVncmVlcywgbWludXRlcywgc2Vjb25kcyBpbnRvIGRlY2ltYWwgZGVncmVlcyAoZmxvYXQpXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgZG1zTGF0VG9ERExhdCA9IGZ1bmN0aW9uIChsYXREZWdyZWUsIGxhdE1pbnV0ZSwgbGF0U2Vjb25kKSB7XG4gICAgICAgICAgICB2YXIgZGVncmVlcztcbiAgICAgICAgICAgIHZhciBtaW51dGVzO1xuICAgICAgICAgICAgdmFyIHNlY29uZHM7XG4gICAgICAgICAgICBpZiAocGFyc2VGbG9hdChsYXREZWdyZWUpIDwgMCkge1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBwYXJzZUZsb2F0KGxhdFNlY29uZCkgLyA2MDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gKHBhcnNlRmxvYXQobGF0TWludXRlKSArIHNlY29uZHMpIC8gNjA7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHBhcnNlRmxvYXQoTWF0aC5hYnMobGF0RGVncmVlKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgoZGVncmVlcyArIG1pbnV0ZXMpICogLTEpLnRvRml4ZWQoNik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnNlRmxvYXQobGF0RGVncmVlKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9IHBhcnNlRmxvYXQobGF0U2Vjb25kKSAvIDYwO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSAocGFyc2VGbG9hdChsYXRNaW51dGUpICsgc2Vjb25kcykgLyA2MDtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gcGFyc2VGbG9hdChsYXREZWdyZWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoZGVncmVlcyArIG1pbnV0ZXMpLnRvRml4ZWQoNik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnSW52YWxpZCBMYXRpdHVkZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLypcbiAgICAgICAgIENvbnZlcnRzIGxvbmdpdHVkZSBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIGludG8gZGVjaW1hbCBkZWdyZWVzIChmbG9hdClcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkbXNMb25Ub0RETG9uID0gZnVuY3Rpb24gKGxvbkRlZ3JlZSwgbG9uTWludXRlLCBsb25TZWNvbmQpIHtcbiAgICAgICAgICAgIHZhciBkZWdyZWVzO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXM7XG4gICAgICAgICAgICB2YXIgc2Vjb25kcztcbiAgICAgICAgICAgIGlmIChwYXJzZUZsb2F0KGxvbkRlZ3JlZSkgPCAwKSB7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9IHBhcnNlRmxvYXQobG9uU2Vjb25kKSAvIDYwO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSAocGFyc2VGbG9hdChsb25NaW51dGUpICsgc2Vjb25kcykgLyA2MDtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gcGFyc2VGbG9hdChNYXRoLmFicyhsb25EZWdyZWUpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKChkZWdyZWVzICsgbWludXRlcykgKiAtMSkudG9GaXhlZCg2KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGFyc2VGbG9hdChsb25EZWdyZWUpID49IDApIHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gcGFyc2VGbG9hdChsb25TZWNvbmQpIC8gNjA7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IChwYXJzZUZsb2F0KGxvbk1pbnV0ZSkgKyBzZWNvbmRzKSAvIDYwO1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSBwYXJzZUZsb2F0KGxvbkRlZ3JlZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChkZWdyZWVzICsgbWludXRlcykudG9GaXhlZCg2KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdJbnZhbGlkIExvbmdpdHVkZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy9NeVNlcnZpY2UgaXMgYW4gb2JqZWN0IHRvIGNvbnRhaW4gYWxsIGZpZWxkcyBhbmRcbiAgICAgICAgLy9mdW5jdGlvbnMgbmVjZXNzYXJ5IHRvIGNvbW11bmljYXRlIHdpdGggdGhlIHZhcmlvdXNcbiAgICAgICAgLy9jb250cm9sbGVyc1xuICAgICAgICB2YXIgY29vcmRTZXJ2aWNlID0ge307XG5cbiAgICAgICAgLypcbiAgICAgICAgIENvbnZlcnRzIHRoZSBkZWNpbWFsIGRlZ3JlZXMgb2YgbGF0aXR1ZGUgYW5kIGxvbmdpdHVkZSBpbnB1dCBib3ggdGhlIG90aGVyIGZvcm1hdHMgKERNUyBhbmQgTUdSUykgc29cbiAgICAgICAgIHRoYXQgdGhvc2UgaW5wdXQgYm94ZXMgbWF0Y2ggYXMgY29udmVydGVkIHZhbHVlcy4gIFdpbGwgZG8gZGF0YSB2YWxpZGF0aW9uIGJ5IGNoZWNraW5nIGlucHV0IGNvb3JkaW5hdGVzXG4gICAgICAgICBmYWxsIGJldHdlZW4gLTgwIGFuZCA4NCBsYXRpdHVkZSBhbmQgLTE4MCBhbmQgMTgwIGZvciBsb25naXR1ZGVcbiAgICAgICAgICovXG4gICAgICAgIGNvb3JkU2VydmljZS5wcmVwRm9yRERCcm9hZGNhc3QgPSBmdW5jdGlvbiAobGF0LCBsb24pIHtcbiAgICAgICAgICAgIGlmICgobGF0IHx8IGxhdCA9PT0gMCkgJiYgbGF0ID49IC05MCAmJiBsYXQgPD0gOTAgJiYgKGxvbiB8fCBsb24gPT09IDApICYmIGxvbiA+PSAtMTgwICYmIGxvbiA8PSAxODApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgZG1zOiBbZGRMYXRUb0RNU0xhdChsYXQpLCBkZExvblRvRE1TTG9uKGxvbildLFxuICAgICAgICAgICAgICAgICAgICBkZDogW2xhdCwgbG9uXSxcbiAgICAgICAgICAgICAgICAgICAgbWdyczogJydcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmIChsYXQgPj0gLTgwICYmIGxhdCA8PSA4NCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLm1ncnMgPSBMTHRvTUdSUyhsYXQsIGxvbiwgNSk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIShsYXQgPj0gLTgwICYmIGxhdCA8PSA4NCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIShsb24gPj0gLTE4MCAmJiBsb24gPD0gMTgwKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyB0aGUgZGVncmVlcywgbWludXRlcywgc2Vjb25kcyBzdHJpbmdzIG9mIGxhdGl0dWRlIGFuZCBsb25naXR1ZGUgaW5wdXQgYm94IHRoZSBvdGhlciBmb3JtYXRzIChERCBhbmQgTUdSUykgc29cbiAgICAgICAgIHRoYXQgdGhvc2UgaW5wdXQgYm94ZXMgbWF0Y2ggYXMgY29udmVydGVkIHZhbHVlcy4gIFdpbGwgZG8gZGF0YSB2YWxpZGF0aW9uIGJ5IGNoZWNraW5nIGlucHV0IGNvb3JkaW5hdGVzXG4gICAgICAgICBmYWxsIGJldHdlZW4gLTgwIGFuZCA4NCBsYXRpdHVkZSBhbmQgLTE4MCBhbmQgMTgwIGZvciBsb25naXR1ZGVcbiAgICAgICAgICovXG4gICAgICAgIGNvb3JkU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0ID0gZnVuY3Rpb24gKGxhdERNUywgbG9uRE1TKSB7XG4gICAgICAgICAgICB2YXIgbGF0RGVncmVlLCBsYXRNaW51dGUsIGxhdFNlY29uZCwgbG9uRGVncmVlLCBsb25NaW51dGUsIGxvblNlY29uZDtcbiAgICAgICAgICAgIGxhdERNUyA9IGxhdERNUy5yZXBsYWNlKC9bTlMgXS9pZywgJycpLnNwbGl0KC9bwrAnXCJdLyk7XG4gICAgICAgICAgICBsb25ETVMgPSBsb25ETVMucmVwbGFjZSgvW0VXIF0vaWcsICcnKS5zcGxpdCgvW8KwJ1wiXS8pO1xuXG4gICAgICAgICAgICBpZiAobGF0RE1TLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgICAgICAgICAgbGF0RGVncmVlID0gcGFyc2VJbnQobGF0RE1TWzBdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0TWludXRlID0gcGFyc2VJbnQobGF0RE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0U2Vjb25kID0gcGFyc2VGbG9hdChsYXRETVNbMl0sIDEwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGF0RE1TLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGxhdERNUyA9IGxhdERNU1swXS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA9IHBhcnNlRmxvYXQobGF0RE1TWzBdLnN1YnN0cigtMikgKyAnLicgKyBsYXRETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsYXRNaW51dGUgPSBwYXJzZUludChsYXRETVNbMF0uc3Vic3RyKC00LCAyKSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA9IHBhcnNlSW50KGxhdERNU1swXS5zbGljZSgwLCAtNCksIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsb25ETVMubGVuZ3RoID49IDMpIHtcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPSBwYXJzZUludChsb25ETVNbMF0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPSBwYXJzZUludChsb25ETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25TZWNvbmQgPSBwYXJzZUZsb2F0KGxvbkRNU1syXSwgMTApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb25ETVMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgbG9uRE1TID0gbG9uRE1TWzBdLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID0gcGFyc2VGbG9hdChsb25ETVNbMF0uc3Vic3RyKC0yKSArICcuJyArIGxvbkRNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA9IHBhcnNlSW50KGxvbkRNU1swXS5zdWJzdHIoLTQsIDIpLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID0gcGFyc2VJbnQobG9uRE1TWzBdLnNsaWNlKDAsIC00KSwgMTApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbGF0RGVncmVlID49IC05MCAmJiBsYXREZWdyZWUgPD0gOTAgJiZcbiAgICAgICAgICAgICAgICBsYXRNaW51dGUgPj0gMCAmJiBsYXRNaW51dGUgPD0gNjAgJiZcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPj0gMCAmJiBsYXRTZWNvbmQgPD0gNjAgJiZcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPj0gMCAmJiBsb25NaW51dGUgPD0gNjAgJiZcbiAgICAgICAgICAgICAgICBsb25TZWNvbmQgPj0gMCAmJiBsb25TZWNvbmQgPD0gNjAgJiZcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPj0gLTE4MCAmJiBsb25EZWdyZWUgPD0gMTgwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsYXREZWdyZWUpIC0gcGFyc2VGbG9hdChsYXRNaW51dGUgKiAwLjAxKSAtIHBhcnNlRmxvYXQobGF0U2Vjb25kICogMC4wMDAxKSA+PSAtOTAgJiZcbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGxhdERlZ3JlZSkgKyBwYXJzZUZsb2F0KGxhdE1pbnV0ZSAqIDAuMDEpICsgcGFyc2VGbG9hdChsYXRTZWNvbmQgKiAwLjAwMDEpIDw9IDkwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsb25EZWdyZWUpIC0gcGFyc2VGbG9hdChsb25NaW51dGUgKiAwLjAxKSAtIHBhcnNlRmxvYXQobG9uU2Vjb25kICogMC4wMDAxKSA+PSAtMTgwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsb25EZWdyZWUpICsgcGFyc2VGbG9hdChsb25NaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobG9uU2Vjb25kICogMC4wMDAxKSA8PSAxODBcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0ge1xuICAgICAgICAgICAgICAgICAgICBkbXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdERlZ3JlZSArICfCsCcgKyBsYXRNaW51dGUgKyAnXFwnJyArIGxhdFNlY29uZCArICdcIicsXG4gICAgICAgICAgICAgICAgICAgICAgICBsb25EZWdyZWUgKyAnwrAnICsgbG9uTWludXRlICsgJ1xcJycgKyBsb25TZWNvbmQgKyAnXCInXSxcbiAgICAgICAgICAgICAgICAgICAgZGQ6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRtc0xhdFRvRERMYXQobGF0RGVncmVlLCBsYXRNaW51dGUsIGxhdFNlY29uZCksXG4gICAgICAgICAgICAgICAgICAgICAgICBkbXNMb25Ub0RETG9uKGxvbkRlZ3JlZSwgbG9uTWludXRlLCBsb25TZWNvbmQpXSxcbiAgICAgICAgICAgICAgICAgICAgbWdyczogJydcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHRzLmRkWzBdID49IC04MCAmJiByZXN1bHRzLmRkWzBdIDw9IDg0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMubWdycyA9IExMdG9NR1JTKHJlc3VsdHMuZGRbMF0sIHJlc3VsdHMuZGRbMV0sIDUpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyB0aGUgTUdSUy1lbmNvZGVkIHN0cmluZyBvZiBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlIGlucHV0IGJveCB0aGUgb3RoZXIgZm9ybWF0cyAoRE1TIGFuZCBERCkgc29cbiAgICAgICAgIHRoYXQgdGhvc2UgaW5wdXQgYm94ZXMgbWF0Y2ggYXMgY29udmVydGVkIHZhbHVlcy4gIFdpbGwgZG8gZGF0YSB2YWxpZGF0aW9uIGJ5IGNoZWNraW5nIGlucHV0IGNvb3JkaW5hdGVzXG4gICAgICAgICBmYWxsIGJldHdlZW4gLTgwIGFuZCA4NCBsYXRpdHVkZSBhbmQgLTE4MCBhbmQgMTgwIGZvciBsb25naXR1ZGVcbiAgICAgICAgICovXG4gICAgICAgIC8vcHJlcEZvck1HUlNCcm9hZGNhc3QgaXMgdGhlIGZ1bmN0aW9uIHRoYXQgY29udmVydHMgdGhlXG4gICAgICAgIC8vY29vcmRpbmF0ZXMgZW50ZXJlZCBpbiB0aGUgTUdSUyBpbnB1dCBib3hlcyBhbmQgc2V0c1xuICAgICAgICAvL3RoZSByZXN0IG9mIHRoZSBmaWVsZHMgaW4gdGhlIG15U2VydmljZSBvYmplY3QuIGRhdGFcbiAgICAgICAgLy92YWxpZGF0aW9uIGlzIGNvbXBsZXRlZCBieSBjaGVja2luZyBpZiB0aGUgaW5wdXRcbiAgICAgICAgLy9jb29yZGluYXRlcyByZXR1cm4gdmFsdWVzIHRvIHRoZSBsYXRMb25bXSBmcm9tIHRoZVxuICAgICAgICAvL1VTTkd0b0xMKCkgZnVuY3Rpb24gb2YgdGhlIHVzbmcuanMgbGlicmFyeS5cbiAgICAgICAgY29vcmRTZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0ID0gZnVuY3Rpb24gKE1HUlMpIHtcbiAgICAgICAgICAgIHZhciBsYXRMb24gPSBbXTtcbiAgICAgICAgICAgIFVTTkd0b0xMKE1HUlMgKyAnJywgbGF0TG9uKTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG5cbiAgICAgICAgICAgIGlmIChpc05hTihsYXRMb25bMF0pIHx8IGlzTmFOKGxhdExvblsxXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gYWZ0ZXIgNSBkZWNpbWFsIHBsYWNlcywgdGhlIHJlc3VsdHMgc3RhcnQgZ29pbmcgb2ZmXG4gICAgICAgICAgICAgICAgbGF0TG9uWzBdID0gTWF0aC5yb3VuZChsYXRMb25bMF0gKiAxZTUpIC8gMS5lNTtcbiAgICAgICAgICAgICAgICBsYXRMb25bMV0gPSBNYXRoLnJvdW5kKGxhdExvblsxXSAqIDFlNSkgLyAxLmU1O1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG1ncnM6IE1HUlMsXG4gICAgICAgICAgICAgICAgICAgIGRkOiBsYXRMb24sXG4gICAgICAgICAgICAgICAgICAgIGRtczogW2RkTGF0VG9ETVNMYXQobGF0TG9uWzBdKSwgZGRMb25Ub0RNU0xvbihsYXRMb25bMV0pXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRMYXRERCA9IGZ1bmN0aW9uIChsYXQpIHtcbiAgICAgICAgICAgIHJldHVybiAoKGxhdCB8fCBsYXQgPT09IDAgfHwgbGF0ID09PSAnJykgJiYgbGF0ID49IC05MCAmJiBsYXQgPD0gOTApO1xuICAgICAgICB9O1xuICAgICAgICBjb29yZFNlcnZpY2UuaXNWYWxpZExvbkREID0gZnVuY3Rpb24gKGxvbikge1xuICAgICAgICAgICAgcmV0dXJuICggKGxvbiB8fCBsb24gPT09IDAgfHwgbG9uID09PSAnJykgJiYgbG9uID49IC0xODAgJiYgbG9uIDw9IDE4MCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRMYXRETVMgPSBmdW5jdGlvbiAobGF0RE1TKSB7XG4gICAgICAgICAgICBpZiAobGF0RE1TID09PSAnJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxhdERlZ3JlZSwgbGF0TWludXRlLCBsYXRTZWNvbmQ7XG4gICAgICAgICAgICBsYXRETVMgPSBsYXRETVMucmVwbGFjZSgvW05TIF0vaWcsICcnKS5zcGxpdCgvW8KwJ1wiXS8pO1xuXG4gICAgICAgICAgICBpZiAobGF0RE1TLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgICAgICAgICAgbGF0RGVncmVlID0gcGFyc2VJbnQobGF0RE1TWzBdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0TWludXRlID0gcGFyc2VJbnQobGF0RE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0U2Vjb25kID0gcGFyc2VGbG9hdChsYXRETVNbMl0sIDEwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGF0RE1TLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGxhdERNUyA9IGxhdERNU1swXS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA9IHBhcnNlRmxvYXQobGF0RE1TWzBdLnN1YnN0cigtMikgKyAnLicgKyBsYXRETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsYXRNaW51dGUgPSBwYXJzZUludChsYXRETVNbMF0uc3Vic3RyKC00LCAyKSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA9IHBhcnNlSW50KGxhdERNU1swXS5zbGljZSgwLCAtNCksIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgbGF0RGVncmVlID49IC05MCAmJiBsYXREZWdyZWUgPD0gOTAgJiZcbiAgICAgICAgICAgICAgICBsYXRNaW51dGUgPj0gMCAmJiBsYXRNaW51dGUgPCA2MCAmJlxuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA+PSAwICYmIGxhdFNlY29uZCA8IDYwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsYXREZWdyZWUpIC0gcGFyc2VGbG9hdChsYXRNaW51dGUgKiAwLjAxKSAtIHBhcnNlRmxvYXQobGF0U2Vjb25kICogMC4wMDAxKSA+PSAtOTAgJiZcbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGxhdERlZ3JlZSkgKyBwYXJzZUZsb2F0KGxhdE1pbnV0ZSAqIDAuMDEpICsgcGFyc2VGbG9hdChsYXRTZWNvbmQgKiAwLjAwMDEpIDw9IDkwXG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTG9uRE1TID0gZnVuY3Rpb24gKGxvbkRNUykge1xuICAgICAgICAgICAgaWYgKGxvbkRNUyA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsb25EZWdyZWUsIGxvbk1pbnV0ZSwgbG9uU2Vjb25kO1xuICAgICAgICAgICAgbG9uRE1TID0gbG9uRE1TLnJlcGxhY2UoL1tFVyBdL2lnLCAnJykuc3BsaXQoL1vCsCdcIl0vKTtcblxuICAgICAgICAgICAgaWYgKGxvbkRNUy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgIGxvbkRlZ3JlZSA9IHBhcnNlSW50KGxvbkRNU1swXSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA9IHBhcnNlSW50KGxvbkRNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxvblNlY29uZCA9IHBhcnNlRmxvYXQobG9uRE1TWzJdLCAxMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxvbkRNUy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsb25ETVMgPSBsb25ETVNbMF0uc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICBsb25TZWNvbmQgPSBwYXJzZUZsb2F0KGxvbkRNU1swXS5zdWJzdHIoLTIpICsgJy4nICsgbG9uRE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uTWludXRlID0gcGFyc2VJbnQobG9uRE1TWzBdLnN1YnN0cigtNCwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPSBwYXJzZUludChsb25ETVNbMF0uc2xpY2UoMCwgLTQpLCAxMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgbG9uTWludXRlID49IDAgJiYgbG9uTWludXRlIDwgNjAgJiZcbiAgICAgICAgICAgICAgICBsb25TZWNvbmQgPj0gMCAmJiBsb25TZWNvbmQgPCA2MCAmJlxuICAgICAgICAgICAgICAgIGxvbkRlZ3JlZSA+PSAtMTgwICYmIGxvbkRlZ3JlZSA8PSAxODAgJiZcbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGxvbkRlZ3JlZSkgLSBwYXJzZUZsb2F0KGxvbk1pbnV0ZSAqIDAuMDEpIC0gcGFyc2VGbG9hdChsb25TZWNvbmQgKiAwLjAwMDEpID49IC0xODAgJiZcbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGxvbkRlZ3JlZSkgKyBwYXJzZUZsb2F0KGxvbk1pbnV0ZSAqIDAuMDEpICsgcGFyc2VGbG9hdChsb25TZWNvbmQgKiAwLjAwMDEpIDw9IDE4MFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb29yZFNlcnZpY2UuaXNWYWxpZE1HUlMgPSBmdW5jdGlvbiAobWdycykge1xuICAgICAgICAgICAgaWYgKG1ncnMgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtZ3JzID0gbWdycyArICcnO1xuICAgICAgICAgICAgcmV0dXJuICEhbWdycy5tYXRjaCgvXihbMC01XVswLTldW0MtWF18NjBbQy1YXXxbQUJZWl0pW0EtWl17Mn1cXGR7NCwxNH0kL2kpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBjb29yZFNlcnZpY2U7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5zZXJ2aWNlKCdlcmlzU2VydmljZScsIGZ1bmN0aW9uIChlcmlzQ29uZmlnLCBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UsIG1vbWVudCwgXykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0Vmlld3BvcnRTaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHcgPSB3aW5kb3csXG4gICAgICAgICAgICAgICAgICAgIGQgPSBkb2N1bWVudCxcbiAgICAgICAgICAgICAgICAgICAgZSA9IGQuZG9jdW1lbnRFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICBnID0gZG9jdW1lbnQuYm9keSxcbiAgICAgICAgICAgICAgICAgICAgeCA9IHcuaW5uZXJXaWR0aCB8fCBlLmNsaWVudFdpZHRoIHx8IGcuY2xpZW50V2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIHkgPSB3LmlubmVySGVpZ2h0IHx8IGUuY2xpZW50SGVpZ2h0IHx8IGcuY2xpZW50SGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogeVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZm9ybWF0TGF0TG5nOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBlbnN1cmUgYm91bmRzIHZhbHVlcyBoYXZlIGF0IGxlYXN0IDEgZGVjaW1hbCBwbGFjZVxuICAgICAgICAgICAgICAgIHJldHVybiAodmFsdWUgJSAxID09PSAwKSA/IHZhbHVlLnRvRml4ZWQoMSkgOiB2YWx1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXREREJvdW5kczogZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN3LCBuZSwgYm91bmRzO1xuICAgICAgICAgICAgICAgIGlmIChsb2NhdGlvbi5mb3JtYXQgPT09ICdkbXMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3ID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3QobG9jYXRpb24uc291dGgsIGxvY2F0aW9uLndlc3QpO1xuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KGxvY2F0aW9uLm5vcnRoLCBsb2NhdGlvbi5lYXN0KTtcbiAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gW1tzdy5kZFswXSwgbmUuZGRbMV1dLCBbbmUuZGRbMF0sIHN3LmRkWzFdXV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsb2NhdGlvbi5mb3JtYXQgPT09ICdtZ3JzJykge1xuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdChsb2NhdGlvbi5tZ3JzU1cpO1xuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdChsb2NhdGlvbi5tZ3JzTkUpO1xuICAgICAgICAgICAgICAgICAgICBib3VuZHMgPSBbc3cuZGQsIG5lLmRkXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBkZWZpbmUgcmVjdGFuZ2xlIGdlb2dyYXBoaWNhbCBib3VuZHNcbiAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gW1tsb2NhdGlvbi5zb3V0aCwgbG9jYXRpb24ud2VzdF0sIFtsb2NhdGlvbi5ub3J0aCwgbG9jYXRpb24uZWFzdF1dO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBib3VuZHM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29udmVydExhdExuZzogZnVuY3Rpb24gKGxvY2F0aW9uLCBuZXdGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29vcmRpbmF0ZXMsIGxhdExuZztcbiAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24uZm9ybWF0ID09PSAnZG1zJykge1xuICAgICAgICAgICAgICAgICAgICBjb29yZGluYXRlcyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG5nKTtcbiAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzBdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxuZzogcGFyc2VGbG9hdChjb29yZGluYXRlcy5kZFsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICBtZ3JzOiBjb29yZGluYXRlcy5tZ3JzXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsb2NhdGlvbi5mb3JtYXQgPT09ICdtZ3JzJykge1xuICAgICAgICAgICAgICAgICAgICBjb29yZGluYXRlcyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdChsb2NhdGlvbi5tZ3JzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhdDogcGFyc2VGbG9hdChjb29yZGluYXRlcy5kZFswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzOiBjb29yZGluYXRlcy5tZ3JzXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RtcycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdExuZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IGNvb3JkaW5hdGVzLmRtc1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGNvb3JkaW5hdGVzLmRtc1sxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzOiBjb29yZGluYXRlcy5tZ3JzXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsb2NhdGlvbi5mb3JtYXQgPT09ICdkZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZXMgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckREQnJvYWRjYXN0KGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG5nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RtcycgfHwgbmV3Rm9ybWF0ID09PSAnbWdycycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdExuZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IGNvb3JkaW5hdGVzLmRtc1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGNvb3JkaW5hdGVzLmRtc1sxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzOiBjb29yZGluYXRlcy5tZ3JzXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhdDogcGFyc2VGbG9hdChjb29yZGluYXRlcy5kZFswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzOiBjb29yZGluYXRlcy5tZ3JzXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBsYXRMbmc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0TGVhZmxldFBvcHVwQ29udGVudDogZnVuY3Rpb24gKGZlYXR1cmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5wcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0cGwgPSAnPHVsIGNsYXNzPVwibGlzdC11bnN0eWxlZCBldmVudC1kZXRhaWxzLXBvcHVwXCI+JztcblxuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaSBzdHlsZT1cImNvbG9yOiAnICsgZmVhdHVyZS5ldmVudFNvdXJjZS5jb2xvciArICdcIj48aSBjbGFzcz1cImZhICcgKyBmZWF0dXJlLmV2ZW50VHlwZS5pY29uICsgJ1wiPjwvaT4gPGI+JyArIGZlYXR1cmUuZXZlbnRUeXBlLnRpdGxlICsgJzwvYj48L2xpPic7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubGF0RmllbGRdICYmIGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb25GaWVsZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPGxpPicgKyBmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubGF0RmllbGRdLnRvRml4ZWQoMykgKyAnLCAnICsgZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvbkZpZWxkXS50b0ZpeGVkKDMpICsgJzwvbGk+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGVGaWVsZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPGxpPicgKyBtb21lbnQudXRjKGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRlRmllbGRdKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3NbWl0nKSArICc8L2xpPic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+JyArIGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zZW5zb3JGaWVsZF0gKyAnPC9saT4nO1xuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gZmVhdHVyZS5wcm9wZXJ0aWVzLmlzX2NvcnJlbGF0ZWQgPyAnPGxpPkNvcnJlbGF0ZWQ8L2xpPicgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+Q29uZmlkZW5jZTogJyArIGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGRdICsgJzwvbGk+JztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb2NhdGlvblVuY2VydGFpbnR5RmllbGRdICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT5Mb2NhdGlvbiBVbmNlcnRhaW50eTogJyArIGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb2NhdGlvblVuY2VydGFpbnR5RmllbGRdICsgJ208L2xpPic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+TWF4IEludGVuc2l0eTogJyArIGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0vMTAwMCArICcgKGtXL3NyL8K1bSk8L2xpPic7XG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPGxpPk1heCBTTlI6ICcgKyBmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGRdICsgJzwvbGk+JztcbiAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+RHVyYXRpb246ICcgKyBmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZHVyYXRpb25GaWVsZF0gKyAnPC9saT4nO1xuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzwvdWw+JztcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHBsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0U3RyaWtlUG9wdXBDb250ZW50OiBmdW5jdGlvbiAoZmVhdHVyZSkge1xuICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9yZHMgPSAnPHVsIGNsYXNzPVwibGlzdC11bnN0eWxlZFwiPic7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgMTE7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllc1snT1JETkFOQ0VfJyArIGldICYmIGZlYXR1cmUucHJvcGVydGllc1snT1JETkFOQ0VfJyArIGldICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yZHMgKz0gJzxsaT4nICsgaSArICc6ICcgKyBmZWF0dXJlLnByb3BlcnRpZXNbJ09SRE5BTkNFXycgKyBpXSArICc8L2xpPic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3JkcyArPSAnPC91bD4nO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHBsID0gJzx1bCBjbGFzcz1cImxpc3QtdW5zdHlsZWQgZXZlbnQtZGV0YWlscy1wb3B1cFwiPic7XG5cbiAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+PGI+JyArIGZlYXR1cmUucHJvcGVydGllc1snRU5USVRZIE5BTUUnXSArICc8L2I+PC9saT4nO1xuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT4nICsgXy5jYXBpdGFsaXplKGZlYXR1cmUucHJvcGVydGllc1snVEFSR0VUUyBSRU1BUksnXSkgKyAnPC9saT4nO1xuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT4nICsgb3JkcyArICc8aHIvPjwvbGk+JztcbiAgICAgICAgICAgICAgICAgICAgdHBsICs9ICc8bGk+JyArIGZlYXR1cmUucHJvcGVydGllcy5MQVQgKyAnLCAnICsgZmVhdHVyZS5wcm9wZXJ0aWVzLkxPTkcgKyAnPC9saT4nO1xuICAgICAgICAgICAgICAgICAgICB0cGwgKz0gJzxsaT4nICsgbW9tZW50LnV0YyhmZWF0dXJlLnByb3BlcnRpZXMuZGF0ZV90aW1lKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3NbWl0nKSArICc8L2xpPic7XG4gICAgICAgICAgICAgICAgICAgIHRwbCArPSAnPC91bD4nO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLnNlcnZpY2UoJ2ZtdlNlcnZpY2UnLCBmdW5jdGlvbiAoXG4gICAgICAgICRodHRwLFxuICAgICAgICAkcSxcbiAgICAgICAgJG1kVG9hc3QsXG4gICAgICAgIGVyaXNDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgbW9tZW50XG4gICAgKSB7XG4gICAgICAgIHZhciBnZXRSZWNvcmRpbmdzUGFyYW1zID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgdmFyIHN0YXJ0dGltZSA9IG1vbWVudC51dGMocGFyYW1zW2VyaXNDb25maWcuc2VydmVyLmRhdGVGaWVsZF0pLnN1YnRyYWN0KDEsICdzJykudW5peCgpLFxuICAgICAgICAgICAgICAgIGVuZHRpbWUgPSBtb21lbnQudXRjKHBhcmFtc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRlRmllbGRdKS5hZGQoMSwgJ3MnKS51bml4KCksXG4gICAgICAgICAgICAgICAgY29vcmRzID0gcGFyYW1zW2VyaXNDb25maWcuc2VydmVyLmxvbkZpZWxkXS50b1N0cmluZygpICsgJyAnICsgcGFyYW1zW2VyaXNDb25maWcuc2VydmVyLmxhdEZpZWxkXS50b1N0cmluZygpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGdlb21ldHJ5OiAnQ0lSQ0xFJyxcbiAgICAgICAgICAgICAgICBjb29yZHM6IGNvb3JkcyxcbiAgICAgICAgICAgICAgICByYWRpdXM6IDI1MDAsXG4gICAgICAgICAgICAgICAgc3RhcnR0aW1lOiBzdGFydHRpbWUsXG4gICAgICAgICAgICAgICAgZW5kdGltZTogZW5kdGltZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0QWxsUmVjb3JkaW5nc1BhcmFtcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0ZW1wb3JhbEZpbHRlciA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpLFxuICAgICAgICAgICAgICAgIHN0YXJ0dGltZSA9IG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RhcnQpLnVuaXgoKSxcbiAgICAgICAgICAgICAgICBlbmR0aW1lID0gbW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdG9wKS51bml4KCksXG4gICAgICAgICAgICAgICAgbWFwQm91bmRzID0gc3RhdGVTZXJ2aWNlLmdldE1hcEJCb3goKSxcbiAgICAgICAgICAgICAgICBjb29yZHMgPSBtYXBCb3VuZHMuZWFzdCArICcgJyArIG1hcEJvdW5kcy5ub3J0aCArICcsJyArIG1hcEJvdW5kcy5lYXN0ICsgJyAnICsgbWFwQm91bmRzLnNvdXRoICsgJywnICsgbWFwQm91bmRzLndlc3QgKyAnICcgKyBtYXBCb3VuZHMuc291dGggKyAnLCcgKyBtYXBCb3VuZHMud2VzdCArICcgJyArIG1hcEJvdW5kcy5ub3J0aCArICcsJyArIG1hcEJvdW5kcy5lYXN0ICsgJyAnICsgbWFwQm91bmRzLm5vcnRoO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGdlb21ldHJ5OiAnUE9MWUdPTicsXG4gICAgICAgICAgICAgICAgY29vcmRzOiBjb29yZHMsXG4gICAgICAgICAgICAgICAgc3RhcnR0aW1lOiBzdGFydHRpbWUsXG4gICAgICAgICAgICAgICAgZW5kdGltZTogZW5kdGltZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0UmVjb3JkaW5nczogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKSxcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkaW5nc1BhcmFtcyA9IGdldFJlY29yZGluZ3NQYXJhbXMocGFyYW1zKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLmZtdi51cmwgKyAnL3JlY29yZGluZy9zZWFyY2g/c3RhcnR0aW1lPScgKyByZWNvcmRpbmdzUGFyYW1zLnN0YXJ0dGltZSArICcmZW5kdGltZT0nICsgcmVjb3JkaW5nc1BhcmFtcy5lbmR0aW1lICsgJyZnZW9tZXRyeT0nICsgcmVjb3JkaW5nc1BhcmFtcy5nZW9tZXRyeSArICcmcmFkaXVzPScgKyByZWNvcmRpbmdzUGFyYW1zLnJhZGl1cyArICcmY29vcmRzPScgKyByZWNvcmRpbmdzUGFyYW1zLmNvb3Jkc1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0QWxsUmVjb3JkaW5nczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKSxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gZ2V0QWxsUmVjb3JkaW5nc1BhcmFtcygpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZm12LnVybCArICcvcmVjb3JkaW5nL3NlYXJjaD9zdGFydHRpbWU9JyArIHBhcmFtcy5zdGFydHRpbWUgKyAnJmVuZHRpbWU9JyArIHBhcmFtcy5lbmR0aW1lICsgJyZnZW9tZXRyeT0nICsgcGFyYW1zLmdlb21ldHJ5ICsgJyZjb29yZHM9JyArIHBhcmFtcy5jb29yZHNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgcmV0cmlldmluZyByZWNvcmRpbmdzLiAoQ09SUyknKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciByZXRyaWV2aW5nIHJlY29yZGluZ3MuIFN0YXR1czogJyArIGVyci5zdGF0dXMpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLnNlcnZpY2UoJ3NlYXJjaFNlcnZpY2UnLCBmdW5jdGlvbiAoXG4gICAgICAgICRodHRwLFxuICAgICAgICAkcmVzb3VyY2UsXG4gICAgICAgICRxLFxuICAgICAgICAkbWRUb2FzdCxcbiAgICAgICAgZXJpc0NvbmZpZyxcbiAgICAgICAgZXJpc1NlcnZpY2UsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgbW9tZW50LFxuICAgICAgICBwb2xsZXIsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIGV2ZW50c1Jlc291cmNlID0gbnVsbCxcbiAgICAgICAgICAgIGV2ZW50c1BvbGxlciA9IG51bGw7XG5cbiAgICAgICAgdmFyIGdldEV2ZW50UGFyYW1zID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlOiAnV0ZTJyxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgICAgICAgICAgICAgIHJlcXVlc3Q6ICdHZXRGZWF0dXJlJyxcbiAgICAgICAgICAgICAgICB0eXBlTmFtZTogZXJpc0NvbmZpZy5zZXJ2ZXIubGF5ZXJzLmV2ZW50cy53b3Jrc3BhY2UgKyAnOicgKyBlcmlzQ29uZmlnLnNlcnZlci5sYXllcnMuZXZlbnRzLmxheWVyLFxuICAgICAgICAgICAgICAgIGNxbF9maWx0ZXI6IGVyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZCArICc9XFwnJyArIHBhcmFtc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICsgJ1xcJyBBTkQgJyArIGVyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZCArICc9JyArIHBhcmFtc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdLFxuICAgICAgICAgICAgICAgIG91dHB1dEZvcm1hdDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRFdmVudHNQYXJhbXMgPSBmdW5jdGlvbiAoc291cmNlcywgdm90ZWRFdmVudHMpIHtcbiAgICAgICAgICAgIHZhciB0ZW1wb3JhbEZpbHRlciA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpLFxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gdHlwZW9mIHRlbXBvcmFsRmlsdGVyLnN0YXJ0ID09PSAnc3RyaW5nJyA/IHRlbXBvcmFsRmlsdGVyLnN0YXJ0IDogdGVtcG9yYWxGaWx0ZXIuc3RhcnQudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBzdG9wID0gdHlwZW9mIHRlbXBvcmFsRmlsdGVyLnN0b3AgPT09ICdzdHJpbmcnID8gdGVtcG9yYWxGaWx0ZXIuc3RvcCA6IHRlbXBvcmFsRmlsdGVyLnN0b3AudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBzb3VyY2VUeXBlID0gc3RhdGVTZXJ2aWNlLmdldFNvdXJjZVR5cGUoKSxcbiAgICAgICAgICAgICAgICBpZGVudGl0aWVzID0gXy5tYXAoc291cmNlcywgJ2lkZW50aXR5JyksXG4gICAgICAgICAgICAgICAgaWRlbnRpdHlGaWx0ZXIgPSAnJyxcbiAgICAgICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gc3RhdGVTZXJ2aWNlLmdldE9ubHlDb3JyZWxhdGlvbnMoKSxcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGlvbkZpbHRlciA9IG9ubHlDb3JyZWxhdGlvbnMgPT09IDEgPyAnaXNfY29ycmVsYXRlZD10cnVlIEFORCAnIDogJ2lzX2NvcnJlbGF0ZWQgSVMgTk9UIE5VTEwgQU5EICcsXG4gICAgICAgICAgICAgICAgZmlsdGVyU3RyYXRlZ3kgPSBzdGF0ZVNlcnZpY2UuZ2V0RmlsdGVyU3RyYXRlZ3koKSxcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlRmlsdGVyID0gZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInID8gZXJpc0NvbmZpZy5zZXJ2ZXIuY29uZmlkZW5jZUZpZWxkICsgJz49JyArIHN0YXRlU2VydmljZS5nZXRDb25maWRlbmNlKCkgKyAnIEFORCAnIDogJycsXG4gICAgICAgICAgICAgICAgbG9jYXRpb25VbmNlcnRhaW50eUZpbHRlciA9IGZpbHRlclN0cmF0ZWd5ID09PSAnc2VydmVyJyA/ICcoJyArIGVyaXNDb25maWcuc2VydmVyLmxvY2F0aW9uVW5jZXJ0YWludHlGaWVsZCArICc8PScgKyBzdGF0ZVNlcnZpY2UuZ2V0TG9jYXRpb25VbmNlcnRhaW50eSgpICsgJyBPUiAnICsgZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkICsgJyBJUyBOVUxMKScgKyAnIEFORCAnIDogJycsXG4gICAgICAgICAgICAgICAgaW50ZW5zaXR5ID0gc3RhdGVTZXJ2aWNlLmdldEludGVuc2l0eSgpLFxuICAgICAgICAgICAgICAgIGludGVuc2l0eUZpbHRlciA9IGZpbHRlclN0cmF0ZWd5ID09PSAnc2VydmVyJyA/IGVyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkICsgJz49JyArIGludGVuc2l0eS5taW4gKyAnIEFORCAnICsgZXJpc0NvbmZpZy5zZXJ2ZXIuaW50ZW5zaXR5RmllbGQgKyAnPD0nICsgaW50ZW5zaXR5Lm1heCArICcgQU5EICcgOiAnJyxcbiAgICAgICAgICAgICAgICBzbnIgPSBzdGF0ZVNlcnZpY2UuZ2V0U25yKCksXG4gICAgICAgICAgICAgICAgc25yRmlsdGVyID0gZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInID8gZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGQgKyAnPj0nICsgc25yLm1pbiArICcgQU5EICcgKyBlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZCArICc8PScgKyBzbnIubWF4ICsgJyBBTkQgJyA6ICcnLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gc3RhdGVTZXJ2aWNlLmdldER1cmF0aW9uKCksXG4gICAgICAgICAgICAgICAgZHVyYXRpb25GaWx0ZXIgPSBmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicgPyBlcmlzQ29uZmlnLnNlcnZlci5kdXJhdGlvbkZpZWxkICsgJz49XFwnJyArIG1vbWVudC5kdXJhdGlvbihkdXJhdGlvbi5taW4sICdzJykuZm9ybWF0KCdtbTpzcy5TU1MnLCB7IHRyaW06IGZhbHNlIH0pICsgJ1xcJyBBTkQgJyArIGVyaXNDb25maWcuc2VydmVyLmR1cmF0aW9uRmllbGQgKyAnPD1cXCcnICsgbW9tZW50LmR1cmF0aW9uKGR1cmF0aW9uLm1heCwgJ3MnKS5mb3JtYXQoJ21tOnNzLlNTUycsIHsgdHJpbTogZmFsc2UgfSkgKyAnXFwnIEFORCAnIDogJycsXG4gICAgICAgICAgICAgICAgYmJveCA9IHN0YXRlU2VydmljZS5nZXRNYXBCQm94KCksXG4gICAgICAgICAgICAgICAgbG9jYXRpb25GaWx0ZXIgPSBmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicgPyAnQkJPWCgnICsgZXJpc0NvbmZpZy5zZXJ2ZXIubGF5ZXJzLmV2ZW50cy5nZW9tRmllbGQgKyAnLCcgKyBiYm94Lndlc3QgKyAnLCcgKyBiYm94LnNvdXRoICsgJywnICsgYmJveC5lYXN0ICsgJywnICsgYmJveC5ub3J0aCArICcpIEFORCAnIDogJycsXG4gICAgICAgICAgICAgICAgZXZlbnRGaWx0ZXIgPSAnJztcblxuICAgICAgICAgICAgdmFyIHNvdXJjZVR5cGVGaWx0ZXIgPSBzb3VyY2VUeXBlID09PSAnQWxsJyA/XG4gICAgICAgICAgICAgICAgZXJpc0NvbmZpZy5zZXJ2ZXIuc291cmNlVHlwZUZpZWxkICsgJyBJUyBOT1QgTlVMTCBBTkQgJyA6XG4gICAgICAgICAgICAgICAgZXJpc0NvbmZpZy5zZXJ2ZXIuc291cmNlVHlwZUZpZWxkICsgJz1cXCcnICsgc291cmNlVHlwZSArICdcXCcgQU5EICc7XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZSBhbW91bnQgb2YgaWRlbnRpdGllcyBzZWxlY3RlZCBpcyBmZXdlciB0aGFuIHRoZSB0b3RhbCBhdmFpbGFibGUsIHF1ZXJ5IG9uIHRob3NlIGlkZW50aXRpZXMgdG8gc3BlZWQgdGhpbmdzIHVwXG4gICAgICAgICAgICBpZiAoaWRlbnRpdGllcy5sZW5ndGggPCBlcmlzQ29uZmlnLnNvdXJjZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGlkZW50aXRpZXMsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZGVudGl0eUZpbHRlciArPSBlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkICsgJz0nICsgdmFsdWUgKyAnIEFORCAnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZGVudGl0eUZpbHRlciA9IGVyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGQgKyAnIElTIE5PVCBOVUxMIEFORCAnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3RhdGVTZXJ2aWNlLmdldFZvdGVGaWx0ZXIoKSA9PT0gJ2VuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHZvdGVkRXZlbnRzLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBldmVudEZpbHRlciA9IGV2ZW50RmlsdGVyICsgJyhwcm9kdWN0X2lkPVxcJycgKyBlLnByb2R1Y3RfaWQgKyAnXFwnIEFORCBkYXRhc2V0X2lkPVxcJycgKyBlLmRhdGFzZXRfaWQgKyAnXFwnKSBPUiAnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChldmVudEZpbHRlciA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRGaWx0ZXIgPSAncHJvZHVjdF9pZD1cXCcwXFwnIEFORCBkYXRhc2V0X2lkPVxcJzBcXCcgQU5EICc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3RyaXAgb2ZmIHRoZSBsYXN0ICcgT1IgJyBhbmQgdXNlICcgQU5EICcgaW5zdGVhZFxuICAgICAgICAgICAgICAgICAgICBldmVudEZpbHRlciA9ICcoJyArIGV2ZW50RmlsdGVyLnN1YnN0cmluZygwLCAoZXZlbnRGaWx0ZXIubGVuZ3RoIC0gNCkpICsgJykgQU5EICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlcnZpY2U6ICdXRlMnLFxuICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgICAgICAgICAgcmVxdWVzdDogJ0dldEZlYXR1cmUnLFxuICAgICAgICAgICAgICAgIHR5cGVOYW1lOiBlcmlzQ29uZmlnLnNlcnZlci5sYXllcnMuZXZlbnRzLndvcmtzcGFjZSArICc6JyArIGVyaXNDb25maWcuc2VydmVyLmxheWVycy5ldmVudHMubGF5ZXIsXG4gICAgICAgICAgICAgICAgY3FsX2ZpbHRlcjogc291cmNlVHlwZUZpbHRlciArIGlkZW50aXR5RmlsdGVyICsgY29ycmVsYXRpb25GaWx0ZXIgKyBjb25maWRlbmNlRmlsdGVyICsgbG9jYXRpb25VbmNlcnRhaW50eUZpbHRlciArIGludGVuc2l0eUZpbHRlciArIHNuckZpbHRlciArIGR1cmF0aW9uRmlsdGVyICsgbG9jYXRpb25GaWx0ZXIgKyBldmVudEZpbHRlciArIGVyaXNDb25maWcuc2VydmVyLmRhdGVGaWVsZCArICc+PScgKyBzdGFydCArICcgQU5EICcgKyBlcmlzQ29uZmlnLnNlcnZlci5kYXRlRmllbGQgKyAnPD0nICsgc3RvcCxcbiAgICAgICAgICAgICAgICBvdXRwdXRGb3JtYXQ6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0RXZlbnRUcmFja3NQYXJhbXMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlcnZpY2U6ICdXRlMnLFxuICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgICAgICAgICAgcmVxdWVzdDogJ0dldEZlYXR1cmUnLFxuICAgICAgICAgICAgICAgIHR5cGVOYW1lOiBlcmlzQ29uZmlnLnNlcnZlci5sYXllcnMudHJhY2tzLndvcmtzcGFjZSArICc6JyArIGVyaXNDb25maWcuc2VydmVyLmxheWVycy50cmFja3MubGF5ZXIsXG4gICAgICAgICAgICAgICAgY3FsX2ZpbHRlcjogZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkICsgJz1cXCcnICsgcGFyYW1zW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gKyAnXFwnIEFORCAnICsgZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkICsgJz0nICsgcGFyYW1zW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0sXG4gICAgICAgICAgICAgICAgb3V0cHV0Rm9ybWF0OiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldENvcnJlbGF0aW5nRXZlbnRzUGFyYW1zID0gZnVuY3Rpb24gKGV2ZW50RmVhdHVyZSkge1xuICAgICAgICAgICAgaWYgKGV2ZW50RmVhdHVyZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHNlcnZpY2U6ICdXRlMnLFxuICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0OiAnR2V0RmVhdHVyZScsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVOYW1lOiBlcmlzQ29uZmlnLnNlcnZlci5sYXllcnMudHJhY2tzLndvcmtzcGFjZSArICc6JyArIGVyaXNDb25maWcuc2VydmVyLmxheWVycy5jb3JyZWxhdGluZ19ldmVudHMubGF5ZXIsXG4gICAgICAgICAgICAgICAgICAgIGNxbF9maWx0ZXI6IGVyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZCArICdfMT1cXCcnICsgZXZlbnRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSArICdcXCcgQU5EICcgKyBlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGQgKyAnXzE9JyArIGV2ZW50RmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0sXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dEZvcm1hdDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0UGxvdERhdGFQYXJhbXMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHVybDogcGFyYW1zLnVybCxcbiAgICAgICAgICAgICAgICB4X2NvbHVtbjogcGFyYW1zLnhfY29sdW1uIHx8ICd0aW1lJyxcbiAgICAgICAgICAgICAgICB4X3NjYWxlOiBwYXJhbXMueF9zY2FsZSB8fCAnbGluZWFyJyxcbiAgICAgICAgICAgICAgICB4X3VuaXRzOiBwYXJhbXMueF91bml0cyB8fCAnZXZlbnRfc2VjcycsXG4gICAgICAgICAgICAgICAgeV9jb2x1bW46IHBhcmFtcy55X2NvbHVtbiB8fCAnaW50ZW5zaXR5JyxcbiAgICAgICAgICAgICAgICB5X3NjYWxlOiBwYXJhbXMueV9zY2FsZSB8fCAnbGluZWFyJyxcbiAgICAgICAgICAgICAgICB5X3VuaXRzOiBwYXJhbXMueV91bml0cyB8fCBlcmlzQ29uZmlnLmludGVuc2l0eVVuaXRzLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogcGFyYW1zLmZvcm1hdCB8fCAnanNvbidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldEZyYW1lRGF0YVBhcmFtcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdXJsOiBwYXJhbXMudXJsLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogcGFyYW1zLmZvcm1hdCB8fCAnanNvbidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldENvdW50cmllc1BhcmFtcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2VydmljZTogJ1dGUycsXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0OiAnR2V0RmVhdHVyZScsXG4gICAgICAgICAgICAgICAgdHlwZU5hbWU6IGVyaXNDb25maWcubG9jYWxTZXJ2ZXIubGF5ZXJzLmNvdW50cmllcy53b3Jrc3BhY2UgKyAnOicgKyBlcmlzQ29uZmlnLmxvY2FsU2VydmVyLmxheWVycy5jb3VudHJpZXMubGF5ZXIsXG4gICAgICAgICAgICAgICAgb3V0cHV0Rm9ybWF0OiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldFN0cmlrZXNQYXJhbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGVtcG9yYWxGaWx0ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBzdGFydCA9IHR5cGVvZiB0ZW1wb3JhbEZpbHRlci5zdGFydCA9PT0gJ3N0cmluZycgPyB0ZW1wb3JhbEZpbHRlci5zdGFydCA6IHRlbXBvcmFsRmlsdGVyLnN0YXJ0ID8gdGVtcG9yYWxGaWx0ZXIuc3RhcnQudG9JU09TdHJpbmcoKSA6IG1vbWVudC51dGMoKS5zdWJ0cmFjdCg2LCAnaCcpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgc3RvcCA9IHR5cGVvZiB0ZW1wb3JhbEZpbHRlci5zdG9wID09PSAnc3RyaW5nJyA/IHRlbXBvcmFsRmlsdGVyLnN0b3AgOiB0ZW1wb3JhbEZpbHRlci5zdG9wID8gdGVtcG9yYWxGaWx0ZXIuc3RvcC50b0lTT1N0cmluZygpIDogbW9tZW50LnV0YygpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgYmJveCA9IHN0YXRlU2VydmljZS5nZXRNYXBCQm94KCksXG4gICAgICAgICAgICAgICAgbG9jYXRpb25GaWx0ZXIgPSAnQkJPWChnZW9tLCcgKyBiYm94Lndlc3QgKyAnLCcgKyBiYm94LnNvdXRoICsgJywnICsgYmJveC5lYXN0ICsgJywnICsgYmJveC5ub3J0aCArICcpIEFORCAnO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlcnZpY2U6ICdXRlMnLFxuICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgICAgICAgICAgcmVxdWVzdDogJ0dldEZlYXR1cmUnLFxuICAgICAgICAgICAgICAgIHR5cGVOYW1lOiBlcmlzQ29uZmlnLmxvY2FsU2VydmVyLmxheWVycy5zdHJpa2VzLndvcmtzcGFjZSArICc6JyArIGVyaXNDb25maWcubG9jYWxTZXJ2ZXIubGF5ZXJzLnN0cmlrZXMubGF5ZXIsXG4gICAgICAgICAgICAgICAgY3FsX2ZpbHRlcjogbG9jYXRpb25GaWx0ZXIgKyBlcmlzQ29uZmlnLmxvY2FsU2VydmVyLmxheWVycy5zdHJpa2VzLmRhdGVGaWVsZCArICc+PScgKyBzdGFydCArICcgQU5EICcgKyBlcmlzQ29uZmlnLmxvY2FsU2VydmVyLmxheWVycy5zdHJpa2VzLmRhdGVGaWVsZCArICc8PScgKyBzdG9wLFxuICAgICAgICAgICAgICAgIG91dHB1dEZvcm1hdDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXRFdmVudDogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLnNlcnZlci51cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0RXZlbnRQYXJhbXMocGFyYW1zKVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0RXZlbnRzOiBmdW5jdGlvbiAoc291cmNlcywgdm90ZWRFdmVudHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRzUG9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c1BvbGxlci5zdG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gcG9sbCBmb3IgY2hhbmdlc1xuICAgICAgICAgICAgICAgIGV2ZW50c1Jlc291cmNlID0gJHJlc291cmNlKGVyaXNDb25maWcuc2VydmVyLnVybCArICc/cmVxdWVzdFRpbWU9JyArIG1vbWVudC51dGMoKS51bml4KCksIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzUXVlcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogeydDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ30sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBhcmUgb3ZlcnJpZGluZyB0aGUgdHJhbnNmb3JtUmVxdWVzdCBmdW5jdGlvbiB0byBjb252ZXJ0IG91ciBQT1NUXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkYXRhIHRvIHVybGVuY29kZWQgZGF0YSBhcyBHZW9TZXJ2ZXIgcmVxdWlyZXMgdGhpcyBmb3JtYXQgZm9yXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQT1NUcyB0byB3b3JrIHByb3Blcmx5LlxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtUmVxdWVzdDogZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdHIgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBwIGluIG9iaikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIucHVzaChlbmNvZGVVUklDb21wb25lbnQocCkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQob2JqW3BdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0ci5qb2luKCcmJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEdldCBwb2xsZXIuXG4gICAgICAgICAgICAgICAgZXZlbnRzUG9sbGVyID0gcG9sbGVyLmdldChldmVudHNSZXNvdXJjZSwge1xuICAgICAgICAgICAgICAgICAgICBkZWxheTogMzAwMDAwLCAvLyA1IG1pbnV0ZXNcbiAgICAgICAgICAgICAgICAgICAgY2F0Y2hFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzQXJyYXk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNldCBzdGFydCBhbmQgc3RvcCB0byBhbHdheXMgYmUgdGhlIG1vc3QgY3VycmVudCB0aW1lcyBhY2NvcmRpbmcgdG8gdGhlIHJlcXVlc3RlZCByYW5nZVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBvcmFsRmlsdGVyID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSB0eXBlb2YgdGVtcG9yYWxGaWx0ZXIuc3RhcnQgPT09ICdzdHJpbmcnID8gdGVtcG9yYWxGaWx0ZXIuc3RhcnQgOiB0ZW1wb3JhbEZpbHRlci5zdGFydC50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3AgPSB0eXBlb2YgdGVtcG9yYWxGaWx0ZXIuc3RvcCA9PT0gJ3N0cmluZycgPyB0ZW1wb3JhbEZpbHRlci5zdG9wIDogdGVtcG9yYWxGaWx0ZXIuc3RvcC50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBvcmFsRGlmZiA9IG1vbWVudC51dGMoc3RvcCkuZGlmZihtb21lbnQudXRjKHN0YXJ0KSwgJ20nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsRmlsdGVyKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogbW9tZW50LnV0YygpLnN1YnRyYWN0KHRlbXBvcmFsRGlmZiwgJ20nKS50b0RhdGUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9wOiBtb21lbnQudXRjKCkudG9EYXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNvbGF0ZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtnZXRFdmVudHNQYXJhbXMoc291cmNlcywgdm90ZWRFdmVudHMpXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50c1BvbGxlci5wcm9taXNlLnRoZW4obnVsbCwgbnVsbCwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLiRyZXNvbHZlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzUG9sbGVyLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEV2ZW50c09uY2U6IGZ1bmN0aW9uIChzb3VyY2VzLCB2b3RlZEV2ZW50cykge1xuICAgICAgICAgICAgICAgIGlmIChldmVudHNQb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzUG9sbGVyLnN0b3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLnNlcnZlci51cmwgKyAnP3JlcXVlc3RUaW1lPScgKyBtb21lbnQudXRjKCkudW5peCgpLFxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnfSxcbiAgICAgICAgICAgICAgICAgICAgLy8gd2UgYXJlIG92ZXJyaWRpbmcgdGhlIHRyYW5zZm9ybVJlcXVlc3QgZnVuY3Rpb24gdG8gY29udmVydCBvdXIgUE9TVFxuICAgICAgICAgICAgICAgICAgICAvLyBkYXRhIHRvIHVybGVuY29kZWQgZGF0YSBhcyBHZW9TZXJ2ZXIgcmVxdWlyZXMgdGhpcyBmb3JtYXQgZm9yXG4gICAgICAgICAgICAgICAgICAgIC8vIFBPU1RzIHRvIHdvcmsgcHJvcGVybHkuXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybVJlcXVlc3Q6IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdHIgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHAgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIucHVzaChlbmNvZGVVUklDb21wb25lbnQocCkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQob2JqW3BdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0ci5qb2luKCcmJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGdldEV2ZW50c1BhcmFtcyhzb3VyY2VzLCB2b3RlZEV2ZW50cylcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIuc3RhdHVzID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgcmV0cmlldmluZyBldmVudHMuIChDT1JTKScpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIHJldHJpZXZpbmcgZXZlbnRzLiBTdGF0dXM6ICcgKyBlcnIuc3RhdHVzKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0RXZlbnRUcmFja3M6IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5zZXJ2ZXIudXJsLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IGdldEV2ZW50VHJhY2tzUGFyYW1zKHBhcmFtcylcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENvcnJlbGF0aW5nRXZlbnRzOiBmdW5jdGlvbiAoZXZlbnREYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuc2VydmVyLnVybCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBnZXRDb3JyZWxhdGluZ0V2ZW50c1BhcmFtcyhldmVudERhdGEpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRQbG90RGF0YTogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgY2FjaGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5ldmVudFNlcnZlci5hamF4VXJsICsgJy9wbG90LWRhdGEvJyxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBnZXRQbG90RGF0YVBhcmFtcyhwYXJhbXMpXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRGcmFtZURhdGE6IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXZlbnRTZXJ2ZXIuYWpheFVybCArICcvZnJhbWVzLycsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogZ2V0RnJhbWVEYXRhUGFyYW1zKHBhcmFtcylcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENvdW50cmllczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLmxvY2FsU2VydmVyLnVybCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBnZXRDb3VudHJpZXNQYXJhbXMoKVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0U2NhbGVEYXRhOiBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLnNjYWxlLmFqYXhVcmwgKyAnLz9maWxlX25hbWU9JyArIGZpbGVcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRvd25sb2FkR2lmOiBmdW5jdGlvbiAoZnJhbWVzLCBkaW1lbnNpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy9naWYnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZXM6IGZyYW1lcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnM6IGRpbWVuc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRTdHJpa2VzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcubG9jYWxTZXJ2ZXIudXJsLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IGdldFN0cmlrZXNQYXJhbXMoKVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoZXJyLnN0YXR1cyA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIHJldHJpZXZpbmcgc3RyaWtlcy4gKENPUlMpJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgcmV0cmlldmluZyBzdHJpa2VzLiBTdGF0dXM6ICcgKyBlcnIuc3RhdHVzKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRvd25sb2FkRXh0RmlsZXM6IGZ1bmN0aW9uICh1cmxBcnIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXh0RG93bmxvYWRVcmwgKyAnL2V4dCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybHM6IHVybEFyclxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXhwb3J0S21sOiBmdW5jdGlvbiAoa21sKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLmV4dERvd25sb2FkVXJsICsgJy9rbWwnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrbWw6IGttbFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5zZXJ2aWNlKCdzdGF0ZVNlcnZpY2UnLCBmdW5jdGlvbiAoXHJcbiAgICAgICAgJGxvY2F0aW9uLFxyXG4gICAgICAgICR0aW1lb3V0LFxyXG4gICAgICAgICRtZFRvYXN0LFxyXG4gICAgICAgIGVyaXNDb25maWcsXHJcbiAgICAgICAgbW9tZW50LFxyXG4gICAgICAgIF9cclxuICAgICkge1xyXG4gICAgICAgIHZhciBxdWVyeVN0cmluZyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcclxuXHJcbiAgICAgICAgdmFyIGdvdG9FeHBhbmRlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICBsb2NhdGlvbkZpbHRlckV4cGFuZGVkID0gZmFsc2UsXHJcbiAgICAgICAgICAgIHJlY2VudEV2ZW50TGlzdEV4cGFuZGVkID0gZmFsc2UsXHJcbiAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgc291cmNlRmlsdGVyRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgdHlwZUZpbHRlckV4cGFuZGVkID0gZmFsc2UsXHJcbiAgICAgICAgICAgIGV2ZW50RmlsdGVyc0V4cGFuZGVkID0gZmFsc2UsXHJcbiAgICAgICAgICAgIGFkbWluRXhwYW5kZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgbG9jYXRpb25Gb3JtYXQgPSBxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCxcclxuICAgICAgICAgICAgbWFwQm91bmRzID0gbnVsbCxcclxuICAgICAgICAgICAgbWFwQkJveCA9IHt9LFxyXG4gICAgICAgICAgICBtYXBab29tID0gcXVlcnlTdHJpbmcuem9vbSxcclxuICAgICAgICAgICAgbWFwQ2VudGVyID0gZXJpc0NvbmZpZy5tYXBDZW50ZXIsXHJcbiAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyID0ge1xyXG4gICAgICAgICAgICAgICAgc3RhcnQ6IHF1ZXJ5U3RyaW5nLnN0YXJ0LFxyXG4gICAgICAgICAgICAgICAgc3RvcDogcXVlcnlTdHJpbmcuc3RvcCxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBxdWVyeVN0cmluZy5kdXJhdGlvbixcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uTGVuZ3RoOiBxdWVyeVN0cmluZy5kdXJhdGlvbkxlbmd0aCxcclxuICAgICAgICAgICAgICAgIGlzb2xhdGVkOiBmYWxzZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBiYXNlbGF5ZXIgPSBudWxsLFxyXG4gICAgICAgICAgICBvdmVybGF5cyA9IFtdLFxyXG4gICAgICAgICAgICB2aWV3cG9ydFNpemUgPSB7fSxcclxuICAgICAgICAgICAgYWN0aXZlU291cmNlcyA9IFtdLFxyXG4gICAgICAgICAgICBhY3RpdmVUeXBlcyA9IFtdLFxyXG4gICAgICAgICAgICBldmVudHMgPSBbXSxcclxuICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBudWxsLFxyXG4gICAgICAgICAgICBldmVudExheWVycyA9IG51bGwsXHJcbiAgICAgICAgICAgIHNvdXJjZVR5cGUgPSBxdWVyeVN0cmluZy5zb3VyY2VUeXBlLFxyXG4gICAgICAgICAgICBldmVudERhdGEgPSBudWxsLFxyXG4gICAgICAgICAgICBsYXlvdXRDb25maWcgPSBudWxsLFxyXG4gICAgICAgICAgICBsYXlvdXRDb21wb25lbnRzID0gW10sXHJcbiAgICAgICAgICAgIGxvYWRpbmdFdmVudHMgPSBmYWxzZSxcclxuICAgICAgICAgICAgdm90ZXIgPSBudWxsLFxyXG4gICAgICAgICAgICB2b3RlcyA9IFtdLFxyXG4gICAgICAgICAgICB2b3RlUmVhc29ucyA9IFtdLFxyXG4gICAgICAgICAgICBjb25maWRlbmNlID0gbnVsbCxcclxuICAgICAgICAgICAgbG9jYXRpb25VbmNlcnRhaW50eSA9IG51bGwsXHJcbiAgICAgICAgICAgIGludGVuc2l0eSA9IHt9LFxyXG4gICAgICAgICAgICBzbnIgPSB7fSxcclxuICAgICAgICAgICAgZHVyYXRpb24gPSB7fSxcclxuICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9IHF1ZXJ5U3RyaW5nLm9ubHlDb3JyZWxhdGlvbnMsXHJcbiAgICAgICAgICAgIGNvdW50cnlMaXN0ID0gW10sXHJcbiAgICAgICAgICAgIGNvdW50cmllcyA9IFtdLFxyXG4gICAgICAgICAgICBzZW5zb3JMaXN0ID0gW10sXHJcbiAgICAgICAgICAgIHNlbnNvcnMgPSBbXSxcclxuICAgICAgICAgICAgZmlsdGVyU3RyYXRlZ3kgPSBxdWVyeVN0cmluZy5maWx0ZXJTdHJhdGVneSxcclxuICAgICAgICAgICAgc3RyaWtlVmlzaWJpbGl0eSA9IHF1ZXJ5U3RyaW5nLnN0cmlrZVZpc2liaWxpdHksXHJcbiAgICAgICAgICAgIGZtdkZpbHRlciA9IHF1ZXJ5U3RyaW5nLmZtdkZpbHRlcixcclxuICAgICAgICAgICAgZm12TGF5ZXJzID0gbnVsbCxcclxuICAgICAgICAgICAgdm90ZUZpbHRlciA9IHF1ZXJ5U3RyaW5nLnZvdGVGaWx0ZXIsXHJcbiAgICAgICAgICAgIHZvdGVGaWx0ZXJUeXBlID0gcXVlcnlTdHJpbmcudm90ZUZpbHRlclR5cGUsXHJcbiAgICAgICAgICAgIHZvdGVkRXZlbnRzID0gbnVsbCxcclxuICAgICAgICAgICAgdG90YWxWb3RlcyA9IG51bGwsXHJcbiAgICAgICAgICAgIGNlbnRlck9uQWN0aXZlRXZlbnQgPSB0cnVlLFxyXG4gICAgICAgICAgICBzb3J0Q29uZmlnID0gXy5jbG9uZShlcmlzQ29uZmlnLmRlZmF1bHRTb3J0Q29uZmlnKSxcclxuICAgICAgICAgICAgY3VyclNvcnQgPSBfLmZpbmQoc29ydENvbmZpZywgeyBlbmFibGVkOiB0cnVlIH0pLFxyXG4gICAgICAgICAgICBhbGVydCA9IG51bGwsXHJcbiAgICAgICAgICAgIGlzQWRtaW4gPSBmYWxzZSxcclxuICAgICAgICAgICAgcG9sbCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAocXVlcnlTdHJpbmcuc29ydENvbHVtbikge1xyXG4gICAgICAgICAgICBjdXJyU29ydC5lbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGN1cnJTb3J0ID0gc29ydENvbmZpZ1txdWVyeVN0cmluZy5zb3J0Q29sdW1uXTtcclxuICAgICAgICAgICAgY3VyclNvcnQuZW5hYmxlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocXVlcnlTdHJpbmcuc29ydERpcmVjdGlvbikge1xyXG4gICAgICAgICAgICBjdXJyU29ydC5kaXJlY3Rpb24gPSBxdWVyeVN0cmluZy5zb3J0RGlyZWN0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGZpbHRlclN0cmF0ZWd5ICE9PSAnc2VydmVyJykge1xyXG4gICAgICAgICAgICAvLyBkb24ndCBsZXQgdGhpcyBoYXBwZW4gaWYgdGVtcG9yYWwgZmlsdGVyIGlzIHRvbyBsYXJnZVxyXG4gICAgICAgICAgICB2YXIgdGVtcG9yYWxEaWZmID0gbW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdG9wKS5kaWZmKG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RhcnQpLCAnaCcpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRlbXBvcmFsRGlmZiA+IDI0KSB7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJTdHJhdGVneSA9ICdzZXJ2ZXInO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZmlsdGVyU3RyYXRlZ3kgPSBmaWx0ZXJTdHJhdGVneTtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1RlbXBvcmFsIGZpbHRlciByYW5nZSBtdXN0IGJlIHNob3J0ZXIgdGhhbiAyNCBob3VycyB0byBmaWx0ZXIgY2xpZW50LXNpZGUuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocXVlcnlTdHJpbmcubiB8fCBxdWVyeVN0cmluZy5uZSkge1xyXG4gICAgICAgICAgICBtYXBCQm94ID0ge1xyXG4gICAgICAgICAgICAgICAgZm9ybWF0OiBsb2NhdGlvbkZvcm1hdCxcclxuICAgICAgICAgICAgICAgIG5vcnRoOiBsb2NhdGlvbkZvcm1hdCA9PT0gJ2RkJyA/IHBhcnNlRmxvYXQocXVlcnlTdHJpbmcubikgOiBxdWVyeVN0cmluZy5uLFxyXG4gICAgICAgICAgICAgICAgc291dGg6IGxvY2F0aW9uRm9ybWF0ID09PSAnZGQnID8gcGFyc2VGbG9hdChxdWVyeVN0cmluZy5zKSA6IHF1ZXJ5U3RyaW5nLnMsXHJcbiAgICAgICAgICAgICAgICBlYXN0OiBsb2NhdGlvbkZvcm1hdCA9PT0gJ2RkJyA/IHBhcnNlRmxvYXQocXVlcnlTdHJpbmcuZSkgOiBxdWVyeVN0cmluZy5lLFxyXG4gICAgICAgICAgICAgICAgd2VzdDogbG9jYXRpb25Gb3JtYXQgPT09ICdkZCcgPyBwYXJzZUZsb2F0KHF1ZXJ5U3RyaW5nLncpIDogcXVlcnlTdHJpbmcudyxcclxuICAgICAgICAgICAgICAgIG1ncnNORTogcXVlcnlTdHJpbmcubmUgfHwgJycsXHJcbiAgICAgICAgICAgICAgICBtZ3JzU1c6IHF1ZXJ5U3RyaW5nLnN3IHx8ICcnXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzZXRNYXBCQm94UGFyYW1zOiBmdW5jdGlvbiAobG9jYXRpb24pIHtcclxuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWxvY2F0aW9uLmZvcm1hdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5mb3JtYXQgPSBlcmlzQ29uZmlnLmRlZmF1bHRMb2NhdGlvbkZvcm1hdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXRMb2NhdGlvbkZvcm1hdChsb2NhdGlvbi5mb3JtYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBhbnl0aGluZyBjaGFuZ2UsIHVwZGF0ZSAkbG9jYXRpb24uc2VhcmNoKCkgYW5kIGJyb2FkY2FzdCBub3RpZmljYXRpb24gb2YgY2hhbmdlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHF1ZXJ5U3RyaW5nLm4gIT09IGxvY2F0aW9uLm5vcnRoLnRvU3RyaW5nKCkgfHwgcXVlcnlTdHJpbmcucyAhPT0gbG9jYXRpb24uc291dGgudG9TdHJpbmcoKSB8fCBxdWVyeVN0cmluZy5lICE9PSBsb2NhdGlvbi5lYXN0LnRvU3RyaW5nKCkgfHwgcXVlcnlTdHJpbmcudyAhPT0gbG9jYXRpb24ud2VzdC50b1N0cmluZygpIHx8IHF1ZXJ5U3RyaW5nLmxvY2F0aW9uRm9ybWF0ICE9PSBsb2NhdGlvbi5mb3JtYXQgfHwgcXVlcnlTdHJpbmcubmUgIT09IGxvY2F0aW9uLm1ncnNORS50b1N0cmluZygpIHx8IHF1ZXJ5U3RyaW5nLnN3ICE9PSBsb2NhdGlvbi5tZ3JzU1cudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24ubm9ydGggIT09ICcnICYmIGxvY2F0aW9uLnNvdXRoICE9PSAnJyAmJiBsb2NhdGlvbi5lYXN0ICE9PSAnJyAmJiBsb2NhdGlvbi53ZXN0ICE9PSAnJyAmJiBsb2NhdGlvbi5mb3JtYXQgPT09ICdkZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLm5vcnRoID0gcGFyc2VGbG9hdChsb2NhdGlvbi5ub3J0aCkudG9GaXhlZCg2KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLnNvdXRoID0gcGFyc2VGbG9hdChsb2NhdGlvbi5zb3V0aCkudG9GaXhlZCg2KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmVhc3QgPSBwYXJzZUZsb2F0KGxvY2F0aW9uLmVhc3QpLnRvRml4ZWQoNik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi53ZXN0ID0gcGFyc2VGbG9hdChsb2NhdGlvbi53ZXN0KS50b0ZpeGVkKDYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0TWFwQkJveChsb2NhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLm4gPSBsb2NhdGlvbi5ub3J0aCA9PT0gJycgPyBudWxsIDogbG9jYXRpb24ubm9ydGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnMgPSBsb2NhdGlvbi5zb3V0aCA9PT0gJycgPyBudWxsIDogbG9jYXRpb24uc291dGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmUgPSBsb2NhdGlvbi5lYXN0ID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5lYXN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy53ID0gbG9jYXRpb24ud2VzdCA9PT0gJycgPyBudWxsIDogbG9jYXRpb24ud2VzdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcubG9jYXRpb25Gb3JtYXQgPSBsb2NhdGlvbi5mb3JtYXQgPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLmZvcm1hdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcubmUgPSBsb2NhdGlvbi5tZ3JzTkUgPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLm1ncnNORTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc3cgPSBsb2NhdGlvbi5tZ3JzU1cgPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLm1ncnNTVztcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXRMb2NhdGlvbkZvcm1hdChxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0R290b0V4cGFuZGVkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ290b0V4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRHb3RvRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBnb3RvRXhwYW5kZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMb2NhdGlvbkZpbHRlckV4cGFuZGVkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb25GaWx0ZXJFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TG9jYXRpb25GaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uRmlsdGVyRXhwYW5kZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRSZWNlbnRFdmVudExpc3RFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY2VudEV2ZW50TGlzdEV4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRSZWNlbnRFdmVudExpc3RFeHBhbmRlZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHJlY2VudEV2ZW50TGlzdEV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0VGVtcG9yYWxGaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRlbXBvcmFsRmlsdGVyRXhwYW5kZWQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB0ZW1wb3JhbEZpbHRlckV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0U291cmNlRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2VGaWx0ZXJFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0U291cmNlRmlsdGVyRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBzb3VyY2VGaWx0ZXJFeHBhbmRlZCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFR5cGVGaWx0ZXJFeHBhbmRlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVGaWx0ZXJFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0VHlwZUZpbHRlckV4cGFuZGVkOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdHlwZUZpbHRlckV4cGFuZGVkID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0RXZlbnRGaWx0ZXJzRXhwYW5kZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudEZpbHRlcnNFeHBhbmRlZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0RXZlbnRGaWx0ZXJzRXhwYW5kZWQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudEZpbHRlcnNFeHBhbmRlZCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEFkbWluRXhwYW5kZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhZG1pbkV4cGFuZGVkO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRBZG1pbkV4cGFuZGVkOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgYWRtaW5FeHBhbmRlZCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldE1hcEJCb3g6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtYXBCQm94O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRNYXBCQm94OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICAgICAgICBtYXBCQm94ID0gdmFsO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRNYXBab29tOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFwWm9vbTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TWFwWm9vbTogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIG1hcFpvb20gPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuem9vbSA9IG1hcFpvb207XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldE1hcENlbnRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hcENlbnRlcjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TWFwQ2VudGVyOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgbWFwQ2VudGVyID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0TG9jYXRpb25Gb3JtYXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbkZvcm1hdDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TG9jYXRpb25Gb3JtYXQ6IGZ1bmN0aW9uIChmb3JtYXQpIHtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uRm9ybWF0ID0gZm9ybWF0O1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcubG9jYXRpb25Gb3JtYXQgPSBsb2NhdGlvbkZvcm1hdDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0TWFwQm91bmRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFwQm91bmRzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRNYXBCb3VuZHM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBtYXBCb3VuZHMgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRNYXBCQm94UGFyYW1zKHtcclxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IHRoaXMubG9jYXRpb25Gb3JtYXQsXHJcbiAgICAgICAgICAgICAgICAgICAgbm9ydGg6IG1hcEJvdW5kcy5nZXROb3J0aCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHNvdXRoOiBtYXBCb3VuZHMuZ2V0U291dGgoKSxcclxuICAgICAgICAgICAgICAgICAgICBlYXN0OiBtYXBCb3VuZHMuZ2V0RWFzdCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHdlc3Q6IG1hcEJvdW5kcy5nZXRXZXN0KClcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRUZW1wb3JhbEZpbHRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRlbXBvcmFsRmlsdGVyO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRUZW1wb3JhbEZpbHRlcjogZnVuY3Rpb24gKGZpbHRlcikge1xyXG4gICAgICAgICAgICAgICAgdmFyIHFzRmlsdGVyID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBxdWVyeVN0cmluZy5zdGFydCxcclxuICAgICAgICAgICAgICAgICAgICBzdG9wOiBxdWVyeVN0cmluZy5zdG9wLFxyXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBxdWVyeVN0cmluZy5kdXJhdGlvbiA/IHF1ZXJ5U3RyaW5nLmR1cmF0aW9uIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbkxlbmd0aDogcXVlcnlTdHJpbmcuZHVyYXRpb25MZW5ndGggPyBwYXJzZUludChxdWVyeVN0cmluZy5kdXJhdGlvbkxlbmd0aCkgOiBudWxsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgdmFyIGZpbHRlclN0YXJ0ID0gJycsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RvcCA9ICcnO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFhbmd1bGFyLmVxdWFscyhxc0ZpbHRlciwgZmlsdGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIuZHVyYXRpb24gJiYgZmlsdGVyLmR1cmF0aW9uTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlclN0YXJ0ID0gbW9tZW50LnV0YygpLnN1YnRyYWN0KGZpbHRlci5kdXJhdGlvbkxlbmd0aCwgZmlsdGVyLmR1cmF0aW9uKS5zdGFydE9mKCdkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlclN0b3AgPSBtb21lbnQudXRjKCkuZW5kT2YoJ2QnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc3RhcnQgPSBmaWx0ZXJTdGFydC50b0lTT1N0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zdG9wID0gZmlsdGVyU3RvcC50b0lTT1N0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5kdXJhdGlvbiA9IGZpbHRlci5kdXJhdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZHVyYXRpb25MZW5ndGggPSBmaWx0ZXIuZHVyYXRpb25MZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RhcnQgPSBtb21lbnQudXRjKGZpbHRlci5zdGFydCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlclN0b3AgPSBtb21lbnQudXRjKGZpbHRlci5zdG9wKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc3RhcnQgPSBmaWx0ZXJTdGFydC50b0lTT1N0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zdG9wID0gZmlsdGVyU3RvcC50b0lTT1N0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5kdXJhdGlvbiA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmR1cmF0aW9uTGVuZ3RoID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyLnN0YXJ0ID0gZmlsdGVyU3RhcnQudG9EYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyLnN0b3AgPSBmaWx0ZXJTdG9wLnRvRGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyID0gZmlsdGVyO1xyXG4gICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0ZW1wb3JhbEZpbHRlci5zdGFydCB8fCAhdGVtcG9yYWxGaWx0ZXIuc3RvcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wb3JhbEZpbHRlciA9IGZpbHRlcjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEJhc2VsYXllcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VsYXllcjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0QmFzZWxheWVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGJhc2VsYXllciA9IGxheWVyO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuYmFzZWxheWVyID0gYmFzZWxheWVyLmlkO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRPdmVybGF5czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG92ZXJsYXlzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRPdmVybGF5czogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIG92ZXJsYXlzID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLm92ZXJsYXlzID0gb3ZlcmxheXM7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZpZXdwb3J0U2l6ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZpZXdwb3J0U2l6ZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Vmlld3BvcnRTaXplOiBmdW5jdGlvbiAoc2l6ZSkge1xyXG4gICAgICAgICAgICAgICAgdmlld3BvcnRTaXplID0gc2l6ZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0QWN0aXZlU291cmNlczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjdGl2ZVNvdXJjZXM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldEFjdGl2ZVNvdXJjZXM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmVTb3VyY2VzID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHZhciBzb3VyY2VTdHJpbmcgPSBfLm1hcChhY3RpdmVTb3VyY2VzLCAnbmFtZScpLmpvaW4oJywnKTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnNvdXJjZXMgPSBzb3VyY2VTdHJpbmcgIT09ICcnID8gc291cmNlU3RyaW5nIDogbnVsbDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0QWN0aXZlVHlwZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhY3RpdmVUeXBlcztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0QWN0aXZlVHlwZXM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmVUeXBlcyA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZVN0cmluZyA9IF8ubWFwKGFjdGl2ZVR5cGVzLCAnbmFtZScpLmpvaW4oJywnKTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnR5cGVzID0gdHlwZVN0cmluZyAhPT0gJycgPyB0eXBlU3RyaW5nIDogbnVsbDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0RXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnRzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRFdmVudHM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudHMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRBY3RpdmVFdmVudDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjdGl2ZUV2ZW50O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRBY3RpdmVFdmVudDogZnVuY3Rpb24gKGRhdGEsIGlzTWFwQ2xpY2spIHtcclxuICAgICAgICAgICAgICAgIGlzTWFwQ2xpY2sgPSBpc01hcENsaWNrIHx8IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgY2VudGVyT25BY3RpdmVFdmVudCA9ICFpc01hcENsaWNrO1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmdbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9IGRhdGEgPyBkYXRhLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA6IG51bGw7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZ1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID0gZGF0YSA/IGRhdGEucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdIDogbnVsbDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Q2VudGVyT25BY3RpdmVFdmVudDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNlbnRlck9uQWN0aXZlRXZlbnQ7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldENlbnRlck9uQWN0aXZlRXZlbnQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBjZW50ZXJPbkFjdGl2ZUV2ZW50ID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0RXZlbnRMYXllcnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudExheWVycztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0RXZlbnRMYXllcnM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudExheWVycyA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFNvdXJjZVR5cGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2VUeXBlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRTb3VyY2VUeXBlOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgc291cmNlVHlwZSA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zb3VyY2VUeXBlID0gc291cmNlVHlwZTtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0RXZlbnREYXRhOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnREYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRFdmVudERhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudERhdGEgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMYXlvdXRDb25maWc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxheW91dENvbmZpZztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TGF5b3V0Q29uZmlnOiBmdW5jdGlvbihjb25maWcpIHtcclxuICAgICAgICAgICAgICAgIGxheW91dENvbmZpZyA9IGNvbmZpZztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0TGF5b3V0Q29tcG9uZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxheW91dENvbXBvbmVudHM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldExheW91dENvbXBvbmVudHM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBsYXlvdXRDb21wb25lbnRzID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0TG9hZGluZ0V2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvYWRpbmdFdmVudHM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldExvYWRpbmdFdmVudHM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBsb2FkaW5nRXZlbnRzID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2b3RlcjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Vm90ZXI6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB2b3RlciA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdm90ZXM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFZvdGVzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdm90ZXMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3RlUmVhc29uczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZvdGVSZWFzb25zO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRWb3RlUmVhc29uczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHZvdGVSZWFzb25zID0gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Q29uZmlkZW5jZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbmZpZGVuY2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldENvbmZpZGVuY2U6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmNvbmZpZGVuY2UgPSBjb25maWRlbmNlO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRMb2NhdGlvblVuY2VydGFpbnR5OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb25VbmNlcnRhaW50eTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0TG9jYXRpb25VbmNlcnRhaW50eTogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uVW5jZXJ0YWludHkgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcubG9jYXRpb25VbmNlcnRhaW50eSA9IGxvY2F0aW9uVW5jZXJ0YWludHk7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEludGVuc2l0eTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGludGVuc2l0eTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0SW50ZW5zaXR5OiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgaW50ZW5zaXR5ID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmludGVuc2l0eU1pbiA9IGludGVuc2l0eS5taW47XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5pbnRlbnNpdHlNYXggPSBpbnRlbnNpdHkubWF4O1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRTbnI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzbnI7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFNucjogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHNuciA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zbnJNaW4gPSBzbnIubWluO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc25yTWF4ID0gc25yLm1heDtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0RHVyYXRpb246IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkdXJhdGlvbjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0RHVyYXRpb246IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5kdXJhdGlvbk1pbiA9IGR1cmF0aW9uLm1pbjtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmR1cmF0aW9uTWF4ID0gZHVyYXRpb24ubWF4O1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRPbmx5Q29ycmVsYXRpb25zOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb25seUNvcnJlbGF0aW9ucztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0T25seUNvcnJlbGF0aW9uczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIG9ubHlDb3JyZWxhdGlvbnMgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcub25seUNvcnJlbGF0aW9ucyA9IG9ubHlDb3JyZWxhdGlvbnM7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldENvdW50cnlMaXN0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY291bnRyeUxpc3Q7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldENvdW50cnlMaXN0OiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgY291bnRyeUxpc3QgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRDb3VudHJpZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb3VudHJpZXM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldENvdW50cmllczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGNvdW50cmllcyA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5jb3VudHJpZXMgPSBjb3VudHJpZXM7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFNlbnNvckxpc3Q6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzZW5zb3JMaXN0O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRTZW5zb3JMaXN0OiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgc2Vuc29yTGlzdCA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFNlbnNvcnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzZW5zb3JzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRTZW5zb3JzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgc2Vuc29ycyA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zZW5zb3JzID0gc2Vuc29ycztcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0RmlsdGVyU3RyYXRlZ3k6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXJTdHJhdGVneTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0RmlsdGVyU3RyYXRlZ3k6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJTdHJhdGVneSA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5maWx0ZXJTdHJhdGVneSA9IGZpbHRlclN0cmF0ZWd5O1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRTdHJpa2VWaXNpYmlsaXR5OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RyaWtlVmlzaWJpbGl0eTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0U3RyaWtlVmlzaWJpbGl0eTogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHN0cmlrZVZpc2liaWxpdHkgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc3RyaWtlVmlzaWJpbGl0eSA9IHN0cmlrZVZpc2liaWxpdHk7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldEZNVkZpbHRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZtdkZpbHRlcjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Rk1WRmlsdGVyOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgZm12RmlsdGVyID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmZtdkZpbHRlciA9IGZtdkZpbHRlcjtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Rk1WTGF5ZXJzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZm12TGF5ZXJzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRGTVZMYXllcnM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBmbXZMYXllcnMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3RlRmlsdGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdm90ZUZpbHRlcjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Vm90ZUZpbHRlcjogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHZvdGVGaWx0ZXIgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcudm90ZUZpbHRlciA9IHZvdGVGaWx0ZXI7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVGaWx0ZXJUeXBlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdm90ZUZpbHRlclR5cGU7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFZvdGVGaWx0ZXJUeXBlOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdm90ZUZpbHRlclR5cGUgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcudm90ZUZpbHRlclR5cGUgPSB2b3RlRmlsdGVyVHlwZTtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZWRFdmVudHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2b3RlZEV2ZW50cztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0Vm90ZWRFdmVudHM6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB2b3RlZEV2ZW50cyA9IGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFRvdGFsVm90ZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbFZvdGVzO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRUb3RhbFZvdGVzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdG90YWxWb3RlcyA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy50b3RhbFZvdGVzID0gdG90YWxWb3RlcztcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpLnJlcGxhY2UoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0U29ydENvbmZpZzogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNvcnRDb25maWc7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNldFNvcnRDb25maWc6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBzb3J0Q29uZmlnID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIGN1cnJTb3J0ID0gXy5maW5kKHNvcnRDb25maWcsIHsgZW5hYmxlZDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnNvcnRDb2x1bW4gPSBjdXJyU29ydC5jb2x1bW47XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zb3J0RGlyZWN0aW9uID0gY3VyclNvcnQuZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZykucmVwbGFjZSgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRBbGVydDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFsZXJ0O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXRBbGVydDogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgYWxlcnQgPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRJc0FkbWluOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNBZG1pbjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0SXNBZG1pbjogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGlzQWRtaW4gPSBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRQb2xsOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcG9sbDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0UG9sbDogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHBvbGwgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcucG9sbCA9IHBvbGw7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKS5yZXBsYWNlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuIFVOQ0xBU1NJRklFRFxyXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXHJcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXHJcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuc2VydmljZSgndm90ZVNlcnZpY2UnLCBmdW5jdGlvbiAoXHJcbiAgICAgICAgJGh0dHAsXHJcbiAgICAgICAgJHEsXHJcbiAgICAgICAgZXJpc0NvbmZpZ1xyXG4gICAgKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZ2V0UmVhc29uczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvcmVhc29ucydcclxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2V0Vm90ZXJzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy92b3RlcnMnXHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy92b3RlcnMvdm90ZXInXHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGFkZFZvdGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy92b3RlcnMnKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdldFZvdGVzOiBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSBwYXJhbXMgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL3ZvdGVzJyxcclxuICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xyXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3Rlc0J5Vm90ZXI6IGZ1bmN0aW9uICh2b3Rlcl9uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy92b3Rlcy92b3Rlci8nICsgdm90ZXJfbmFtZVxyXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRWb3RlQnlJZDogZnVuY3Rpb24gKHZvdGVfaWQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL3ZvdGVzLycgKyB2b3RlX2lkXHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNhc3RWb3RlOiBmdW5jdGlvbiAodm90ZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICRodHRwLnBvc3QoZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvdm90ZXMnLCB2b3RlKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHVwZGF0ZVZvdGU6IGZ1bmN0aW9uICh2b3RlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGh0dHAucHV0KGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL3ZvdGVzLycgKyB2b3RlLnZvdGVfaWQsIHZvdGUpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZGVsZXRlVm90ZTogZnVuY3Rpb24gKHZvdGVfaWQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkaHR0cC5kZWxldGUoZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvdm90ZXMvJyArIHZvdGVfaWQpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxufSkoKTtcclxuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCdhZG1pbkNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgbW9tZW50LFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGFsZXJ0U2VydmljZVxuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzO1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLmFsZXJ0SWQgPSBudWxsO1xuICAgICAgICB2bS5hbGVydENsYXNzID0gbnVsbDtcbiAgICAgICAgdm0uYWxlcnRNZXNzYWdlID0gbnVsbDtcbiAgICAgICAgdm0uYWxlcnRJc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB2bS50eXBlcyA9IFt7XG4gICAgICAgICAgICBsYWJlbDogJ1dhcm5pbmcnLFxuICAgICAgICAgICAgdmFsdWU6ICdtZC13YXJuJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBsYWJlbDogJ0luZm8nLFxuICAgICAgICAgICAgdmFsdWU6ICdtZC1hY2NlbnQnXG4gICAgICAgIH1dO1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWRtaW5FeHBhbmRlZCh2bS5leHBhbmRlZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udXBkYXRlQWxlcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYWxlcnQgPSB7XG4gICAgICAgICAgICAgICAgYWxlcnRfaWQ6IHZtLmFsZXJ0SWQsXG4gICAgICAgICAgICAgICAgY2xhc3M6IHZtLmFsZXJ0Q2xhc3MsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogdm0uYWxlcnRNZXNzYWdlLFxuICAgICAgICAgICAgICAgIHN0YXJ0ZWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZW5kZWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgaXNfYWN0aXZlOiB2bS5hbGVydElzQWN0aXZlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodm0uYWxlcnRJZCkge1xuICAgICAgICAgICAgICAgIGFsZXJ0U2VydmljZS51cGRhdGVBbGVydChhbGVydCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBbGVydChhbGVydCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbGVydFNlcnZpY2UuYWRkQWxlcnQoYWxlcnQpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWxlcnQoYWxlcnQpO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEFsZXJ0KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmFsZXJ0SWQgPSBuZXdWYWx1ZS5hbGVydF9pZCB8fCBudWxsO1xuICAgICAgICAgICAgdm0uYWxlcnRDbGFzcyA9IG5ld1ZhbHVlLmNsYXNzIHx8IG51bGw7XG4gICAgICAgICAgICB2bS5hbGVydE1lc3NhZ2UgPSBuZXdWYWx1ZS5tZXNzYWdlIHx8IG51bGw7XG4gICAgICAgICAgICB2bS5hbGVydElzQWN0aXZlID0gbmV3VmFsdWUuaXNfYWN0aXZlIHx8IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmRpcmVjdGl2ZSgnZXJpc0FkbWluJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2FkbWluL2FkbWluVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnYWRtaW5Db250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcignYWxlcnRDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgYWxlcnRTZXJ2aWNlLFxuICAgICAgICBfXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBpbml0aWFsaXplZCA9IGZhbHNlO1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uYWxlcnQgPSBudWxsO1xuICAgICAgICB2bS5jbG9zZUljb24gPSAnPGkgY2xhc3M9XCJmYSBmYS1yZW1vdmVcIj48L2k+JztcbiAgICAgICAgdm0uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5hbGVydC5jbGFzcyA9ICdoaWRlJztcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFsZXJ0U2VydmljZS5nZXRBbGVydHMoKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2bS5hbGVydCA9IF8ub3JkZXJCeShyZXN1bHQuZGF0YSwgWydhbGVydF9pZCddLCBbJ2Rlc2MnXSlbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBbGVydCh2bS5hbGVydCk7XG4gICAgICAgICAgICAgICAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QWxlcnQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdm0uYWxlcnQgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5kaXJlY3RpdmUoJ2VyaXNBbGVydCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9hbGVydC9hbGVydFRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2FsZXJ0Q29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge31cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ2V2ZW50RmlsdGVyc0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICAkdGltZW91dCxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBlcmlzQ29uZmlnLFxuICAgICAgICBfXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKSxcbiAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5ID0gcXMuZmlsdGVyU3RyYXRlZ3kgPyBxcy5maWx0ZXJTdHJhdGVneSA6IGVyaXNDb25maWcuZmlsdGVyU3RyYXRlZ3k7XG5cbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5lcmlzQ29uZmlnID0gZXJpc0NvbmZpZztcbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLmNvbmZpZGVuY2UgPSBfLmNsb25lKGVyaXNDb25maWcuZGVmYXVsdENvbmZpZGVuY2UpO1xuICAgICAgICB2bS5sb2NhdGlvblVuY2VydGFpbnR5ID0gXy5jbG9uZShlcmlzQ29uZmlnLmRlZmF1bHRMb2NhdGlvblVuY2VydGFpbnR5KTtcbiAgICAgICAgdm0uaW50ZW5zaXR5ID0ge1xuICAgICAgICAgICAgbWluOiBfLmNsb25lKGVyaXNDb25maWcuaW50ZW5zaXR5Rmxvb3IpIC8gMTAwMCxcbiAgICAgICAgICAgIG1heDogXy5jbG9uZShlcmlzQ29uZmlnLmludGVuc2l0eUNlaWxpbmcpIC8gMTAwMFxuICAgICAgICB9O1xuICAgICAgICB2bS5zbnIgPSB7XG4gICAgICAgICAgICBtaW46IF8uY2xvbmUoZXJpc0NvbmZpZy5zbnJGbG9vciksXG4gICAgICAgICAgICBtYXg6IF8uY2xvbmUoZXJpc0NvbmZpZy5zbnJDZWlsaW5nKVxuICAgICAgICB9O1xuICAgICAgICB2bS5kdXJhdGlvbiA9IHtcbiAgICAgICAgICAgIG1pbjogXy5jbG9uZShlcmlzQ29uZmlnLmR1cmF0aW9uRmxvb3IpLFxuICAgICAgICAgICAgbWF4OiBfLmNsb25lKGVyaXNDb25maWcuZHVyYXRpb25DZWlsaW5nKVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnRGaWx0ZXJzRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHFzLmNvbmZpZGVuY2UpIHtcbiAgICAgICAgICAgICAgICB2bS5jb25maWRlbmNlID0gcGFyc2VGbG9hdChxcy5jb25maWRlbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRDb25maWRlbmNlKHZtLmNvbmZpZGVuY2UpO1xuICAgICAgICAgICAgaWYgKHFzLmxvY2F0aW9uVW5jZXJ0YWludHkpIHtcbiAgICAgICAgICAgICAgICB2bS5sb2NhdGlvblVuY2VydGFpbnR5ID0gcGFyc2VJbnQocXMubG9jYXRpb25VbmNlcnRhaW50eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TG9jYXRpb25VbmNlcnRhaW50eSh2bS5sb2NhdGlvblVuY2VydGFpbnR5KTtcbiAgICAgICAgICAgIHZhciBpbml0SW50ZW5zaXR5ID0gXy5jbG9uZSh2bS5pbnRlbnNpdHkpO1xuICAgICAgICAgICAgaWYgKHFzLmludGVuc2l0eU1pbikge1xuICAgICAgICAgICAgICAgIHZtLmludGVuc2l0eS5taW4gPSBwYXJzZUZsb2F0KHFzLmludGVuc2l0eU1pbikgLyAxMDAwO1xuICAgICAgICAgICAgICAgIGluaXRJbnRlbnNpdHkubWluID0gcGFyc2VGbG9hdChxcy5pbnRlbnNpdHlNaW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbml0SW50ZW5zaXR5Lm1pbiA9IGluaXRJbnRlbnNpdHkubWluICogMTAwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChxcy5pbnRlbnNpdHlNYXgpIHtcbiAgICAgICAgICAgICAgICB2bS5pbnRlbnNpdHkubWF4ID0gcGFyc2VGbG9hdChxcy5pbnRlbnNpdHlNYXgpIC8gMTAwMDtcbiAgICAgICAgICAgICAgICBpbml0SW50ZW5zaXR5Lm1heCA9IHBhcnNlRmxvYXQocXMuaW50ZW5zaXR5TWF4KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5pdEludGVuc2l0eS5tYXggPSBpbml0SW50ZW5zaXR5Lm1heCAqIDEwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0SW50ZW5zaXR5KGluaXRJbnRlbnNpdHkpO1xuICAgICAgICAgICAgaWYgKHFzLnNuck1pbikge1xuICAgICAgICAgICAgICAgIHZtLnNuci5taW4gPSBwYXJzZUZsb2F0KHFzLnNuck1pbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocXMuc25yTWF4KSB7XG4gICAgICAgICAgICAgICAgdm0uc25yLm1heCA9IHBhcnNlRmxvYXQocXMuc25yTWF4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRTbnIodm0uc25yKTtcbiAgICAgICAgICAgIGlmIChxcy5kdXJhdGlvbk1pbikge1xuICAgICAgICAgICAgICAgIHZtLmR1cmF0aW9uLm1pbiA9IHBhcnNlSW50KHFzLmR1cmF0aW9uTWluKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChxcy5kdXJhdGlvbk1heCkge1xuICAgICAgICAgICAgICAgIHZtLmR1cmF0aW9uLm1heCA9IHBhcnNlSW50KHFzLmR1cmF0aW9uTWF4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXREdXJhdGlvbih2bS5kdXJhdGlvbik7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRGaWx0ZXJTdHJhdGVneSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaWx0ZXJTdHJhdGVneSA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5jb25maWRlbmNlJywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q29uZmlkZW5jZShwYXJzZUZsb2F0KG5ld1ZhbHVlKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInID8gNTAwIDogNTApKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5sb2NhdGlvblVuY2VydGFpbnR5JywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TG9jYXRpb25VbmNlcnRhaW50eShwYXJzZUludChuZXdWYWx1ZSkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZpbHRlclN0cmF0ZWd5ID09PSAnc2VydmVyJyA/IDUwMCA6IDUwKSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLmludGVuc2l0eScsIF8uZGVib3VuY2UoZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUubWluID49IG5ld1ZhbHVlLm1heCkge1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLm1pbiA9IG5ld1ZhbHVlLm1heCAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUubWF4IDw9IG5ld1ZhbHVlLm1pbikge1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLm1heCA9IG5ld1ZhbHVlLm1pbiArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbmV3SW50ZW5zaXR5ID0ge1xuICAgICAgICAgICAgICAgIG1pbjogbmV3VmFsdWUubWluICogMTAwMCxcbiAgICAgICAgICAgICAgICBtYXg6IG5ld1ZhbHVlLm1heCAqIDEwMDBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEludGVuc2l0eShuZXdJbnRlbnNpdHkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZpbHRlclN0cmF0ZWd5ID09PSAnc2VydmVyJyA/IDUwMCA6IDUwKSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnNucicsIF8uZGVib3VuY2UoZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUubWluID49IG5ld1ZhbHVlLm1heCkge1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLm1pbiA9IG5ld1ZhbHVlLm1heCAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUubWF4IDw9IG5ld1ZhbHVlLm1pbikge1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlLm1heCA9IG5ld1ZhbHVlLm1pbiArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFNucihuZXdWYWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInID8gNTAwIDogNTApKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uZHVyYXRpb24nLCBfLmRlYm91bmNlKGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlLm1pbiA+PSBuZXdWYWx1ZS5tYXgpIHtcbiAgICAgICAgICAgICAgICBuZXdWYWx1ZS5taW4gPSBuZXdWYWx1ZS5tYXggLSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlLm1heCA8PSBuZXdWYWx1ZS5taW4pIHtcbiAgICAgICAgICAgICAgICBuZXdWYWx1ZS5tYXggPSBuZXdWYWx1ZS5taW4gKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXREdXJhdGlvbihuZXdWYWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInID8gNTAwIDogNTApKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmRpcmVjdGl2ZSgnZXJpc0V2ZW50RmlsdGVycycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9ldmVudEZpbHRlcnMvZXZlbnRGaWx0ZXJzVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZXZlbnRGaWx0ZXJzQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ2V2ZW50Vmlld2VyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkcSxcbiAgICAgICAgJHRpbWVvdXQsXG4gICAgICAgICR3aW5kb3csXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgJG1kRGlhbG9nLFxuICAgICAgICAkbWRUb2FzdCxcbiAgICAgICAgZXJpc0NvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBzZWFyY2hTZXJ2aWNlLFxuICAgICAgICBmbXZTZXJ2aWNlLFxuICAgICAgICB2b3RlU2VydmljZSxcbiAgICAgICAgVm90ZSxcbiAgICAgICAgV2Vid29ya2VyLFxuICAgICAgICBtb21lbnQsXG4gICAgICAgIGhvdGtleXMsXG4gICAgICAgIGxlYWZsZXREYXRhLFxuICAgICAgICBjMyxcbiAgICAgICAgZDMsXG4gICAgICAgIEwsXG4gICAgICAgIF8sXG4gICAgICAgIEJsb2IsXG4gICAgICAgIFVSTFxuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQgPSBudWxsLFxuICAgICAgICAgICAgY2hhcnRXb3JrZXIsXG4gICAgICAgICAgICBwbG90RGF0YSxcbiAgICAgICAgICAgIGNoYXJ0RGF0YSxcbiAgICAgICAgICAgIGZyYW1lRGF0YSxcbiAgICAgICAgICAgIGFuaW1hdGUsXG4gICAgICAgICAgICBwbGF5YmFja0ZyYW1lcyxcbiAgICAgICAgICAgIGNoYXJ0LFxuICAgICAgICAgICAgaGFzQ29ycmVsYXRpb24sXG4gICAgICAgICAgICBmcmFtZUlkeCxcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nRGF0ZURpZmYsXG4gICAgICAgICAgICBjaGFydEZvY3VzLFxuICAgICAgICAgICAgY2hhcnRDb2xvcnMsXG4gICAgICAgICAgICBkZWZhdWx0UGxvdERhdGEsXG4gICAgICAgICAgICBjb3JyZWxhdGluZ1Bsb3REYXRhLFxuICAgICAgICAgICAgY29ycmVsYXRpbmdFdmVudERhdGEsXG4gICAgICAgICAgICBmcmFtZU1pblZhbCxcbiAgICAgICAgICAgIGZyYW1lTWF4VmFsLFxuICAgICAgICAgICAgZnJhbWVSYW5nZSxcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVNaW5WYWwsXG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWF4VmFsLFxuICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZVJhbmdlLFxuICAgICAgICAgICAgc2NhbGVEYXRhLFxuICAgICAgICAgICAgZm12TGF5ZXJzO1xuXG4gICAgICAgIHZtLmV2ZW50Vmlld2VySGVpZ2h0ID0gJyc7XG4gICAgICAgIHZtLmV2ZW50Vmlld2VyV2lkdGggPSAnJztcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYXJ0V29ya2VyID0gbnVsbDtcbiAgICAgICAgICAgIHBsb3REYXRhID0gW107XG4gICAgICAgICAgICBjaGFydERhdGEgPSBudWxsO1xuICAgICAgICAgICAgZnJhbWVEYXRhID0gW107XG4gICAgICAgICAgICBhbmltYXRlID0gbnVsbDtcbiAgICAgICAgICAgIHBsYXliYWNrRnJhbWVzID0gW107XG4gICAgICAgICAgICBjaGFydCA9IG51bGw7XG4gICAgICAgICAgICBoYXNDb3JyZWxhdGlvbiA9IGZhbHNlO1xuICAgICAgICAgICAgZnJhbWVJZHggPSAwO1xuICAgICAgICAgICAgY29ycmVsYXRpbmdEYXRlRGlmZiA9IG51bGw7XG4gICAgICAgICAgICBjaGFydEZvY3VzID0gbnVsbDtcbiAgICAgICAgICAgIGNoYXJ0Q29sb3JzID0ge307XG4gICAgICAgICAgICBkZWZhdWx0UGxvdERhdGEgPSBudWxsO1xuICAgICAgICAgICAgY29ycmVsYXRpbmdQbG90RGF0YSA9IG51bGw7XG4gICAgICAgICAgICBjb3JyZWxhdGluZ0V2ZW50RGF0YSA9IG51bGw7XG4gICAgICAgICAgICBmcmFtZU1pblZhbCA9IG51bGw7XG4gICAgICAgICAgICBmcmFtZU1heFZhbCA9IG51bGw7XG4gICAgICAgICAgICBmcmFtZVJhbmdlID0gbnVsbDtcbiAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVNaW5WYWwgPSBudWxsO1xuICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZU1heFZhbCA9IG51bGw7XG4gICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lUmFuZ2UgPSBudWxsO1xuICAgICAgICAgICAgc2NhbGVEYXRhID0gbnVsbDtcbiAgICAgICAgICAgIGZtdkxheWVycyA9IG5ldyBMLmZlYXR1cmVHcm91cCgpO1xuXG4gICAgICAgICAgICB2bS5fID0gXztcbiAgICAgICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICAgICAgdm0uZXZlbnREYXRhID0gbnVsbDtcbiAgICAgICAgICAgIHZtLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdm0ubG9hZGluZ1NjYWxlRGF0YSA9IG51bGw7XG4gICAgICAgICAgICB2bS5sb2FkaW5nU3RhdHVzID0gbnVsbDtcbiAgICAgICAgICAgIHZtLmxvYWRpbmdHaWYgPSBudWxsO1xuICAgICAgICAgICAgdm0ubG9hZGluZ0NvcnJlbGF0ZWRHaWYgPSBudWxsO1xuICAgICAgICAgICAgdm0uc2VsZWN0ZWRGZWF0dXJlID0gbnVsbDtcbiAgICAgICAgICAgIHZtLmV2ZW50RXJyb3IgPSBudWxsO1xuICAgICAgICAgICAgdm0uc2Vuc29ycyA9IG51bGw7XG4gICAgICAgICAgICB2bS5jaGlwQ2FyZHMgPSBbXTtcbiAgICAgICAgICAgIHZtLmNvcnJlbGF0aW5nQ2hpcENhcmRzID0gW107XG4gICAgICAgICAgICB2bS5hdmFpbGFibGVDaGlwQ2FyZHMgPSBbXTtcbiAgICAgICAgICAgIHZtLmFjdGl2ZUNoaXBDYXJkID0gbnVsbDtcbiAgICAgICAgICAgIHZtLmFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQgPSBudWxsO1xuICAgICAgICAgICAgdm0ucGxheWJhY2tEZWxheSA9IDA7XG4gICAgICAgICAgICB2bS52b3RlciA9IHN0YXRlU2VydmljZS5nZXRWb3RlcigpO1xuICAgICAgICAgICAgdm0udm90ZXMgPSBzdGF0ZVNlcnZpY2UuZ2V0Vm90ZXMoKTtcbiAgICAgICAgICAgIHZtLnZvdGVSZWFzb25zID0gc3RhdGVTZXJ2aWNlLmdldFZvdGVSZWFzb25zKCk7XG4gICAgICAgICAgICB2bS5ldmVudFR5cGVzID0gXy5jbG9uZShlcmlzQ29uZmlnLnR5cGVzKTtcbiAgICAgICAgICAgIHZtLnZvdGVPYmogPSBuZXcgVm90ZSgpO1xuICAgICAgICAgICAgdm0uc2NhbGVKb2JVcmwgPSBudWxsO1xuICAgICAgICAgICAgdm0uaDVVcmwgPSBudWxsO1xuICAgICAgICAgICAgdm0uY29ycmVsYXRlZEg1VXJsID0gbnVsbDtcbiAgICAgICAgICAgIHZtLnNjYWxlRmlsZSA9IG51bGw7XG4gICAgICAgICAgICB2bS5wbGF5YmFja1N0YXRlID0gdHJ1ZTtcbiAgICAgICAgICAgIHZtLnBsYXliYWNrRGlyZWN0aW9uID0gJ2ZvcndhcmQnO1xuICAgICAgICAgICAgdm0uZXZlbnRQcm9wcyA9IFtdO1xuICAgICAgICAgICAgdm0uY29ycmVsYXRlZEV2ZW50UHJvcHMgPSBbXTtcbiAgICAgICAgICAgIHZtLmludGVybmFsU291cmNlID0gXy5maW5kKGVyaXNDb25maWcuc291cmNlcywgeyBpZGVudGl0eTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIHZtLmV4dGVybmFsU291cmNlID0gXy5maW5kKGVyaXNDb25maWcuc291cmNlcywgeyBpZGVudGl0eTogZmFsc2UgfSk7XG4gICAgICAgICAgICB2bS5sb2FkaW5nRk1WID0gbnVsbDtcbiAgICAgICAgICAgIHZtLmZtdlJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgIHZtLmNoYXJ0TG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGhvdEtleXNDb25maWcgPSBob3RrZXlzLmJpbmRUbygkc2NvcGUpXG4gICAgICAgICAgICAgICAgLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAnbGVmdCcsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmV3aW5kJyxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5zZXRQbGF5YmFja0RpcmVjdGlvbignYmFja3dhcmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAncmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZvcndhcmQnLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNldFBsYXliYWNrRGlyZWN0aW9uKCdmb3J3YXJkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5hZGQoe1xuICAgICAgICAgICAgICAgICAgICBjb21ibzogJ3VwJyxcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQbGF5L1BhdXNlJyxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5zZXRQbGF5YmFja1N0YXRlKCF2bS5wbGF5YmFja1N0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAndycsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVXB2b3RlJyxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS52b3RlVXAobnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5hZGQoe1xuICAgICAgICAgICAgICAgICAgICBjb21ibzogJ2EnLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZXZpb3VzIEV2ZW50JyxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0V2ZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5hZGQoe1xuICAgICAgICAgICAgICAgICAgICBjb21ibzogJ3MnLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Rvd252b3RlJyxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS52b3RlRG93bihudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgIGNvbWJvOiAnZCcsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTmV4dCBFdmVudCcsXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodm0uc2VsZWN0ZWRGZWF0dXJlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEV2ZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5hZGQoe1xuICAgICAgICAgICAgICAgICAgICBjb21ibzogJ2VzYycsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvc2UgRXZlbnQnLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNlbGVjdGVkRmVhdHVyZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gYWRkIGhvdGtleXMgZm9yIGV2ZW50IHR5cGVzXG4gICAgICAgICAgICBfLmZvckVhY2godm0uZXZlbnRUeXBlcywgZnVuY3Rpb24gKHR5cGUsIGlkeCkge1xuICAgICAgICAgICAgICAgIGhvdEtleXNDb25maWcuYWRkKHtcbiAgICAgICAgICAgICAgICAgICAgY29tYm86IChpZHggKyAxKS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdHlwZS50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS52b3RlVXAodHlwZS52YWx1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgKGNoYXJ0KSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIGluaXRpYWxpemUgaGFzIG5ldmVyIGJlZW4gY2FsbGVkXG4gICAgICAgICAgICBpbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZHJhd0ZyYW1lID0gZnVuY3Rpb24gKGZyYW1lQXJyKSB7XG4gICAgICAgICAgICBpZiAocGxheWJhY2tGcmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChmcmFtZUFyciwgZnVuY3Rpb24gKGZyYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBhbmd1bGFyLmVsZW1lbnQoJy4nICsgXy5yZXBsYWNlKGZyYW1lLnNlbnNvclRpdGxlLCAnICcsICcnKSlbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjbGVhciBwcmV2aW91cyBkcmF3aW5nXG4gICAgICAgICAgICAgICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgd2lkdGggYW5kIGhlaWdodCB0byBtYXRjaCBpbWFnZVxuICAgICAgICAgICAgICAgICAgICBjdHguY2FudmFzLmhlaWdodCA9IGZyYW1lLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgY3R4LmNhbnZhcy53aWR0aCA9IGZyYW1lLndpZHRoO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCBhIHBvaW50ZXIgdG8gdGhlIGN1cnJlbnQgbG9jYXRpb24gaW4gdGhlIGZyYW1lLlxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFsZXR0ZSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTsgLy94LHksdyxoXG4gICAgICAgICAgICAgICAgICAgIC8vIFdyYXAgeW91ciBhcnJheSBhcyBhIFVpbnQ4QXJyYXlcbiAgICAgICAgICAgICAgICAgICAgcGFsZXR0ZS5kYXRhLnNldChmcmFtZS5yZ2JhKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVwb3N0IHRoZSBkYXRhLlxuICAgICAgICAgICAgICAgICAgICBjdHgucHV0SW1hZ2VEYXRhKHBhbGV0dGUsIDAsIDApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRGcmFtZSA9IGZ1bmN0aW9uIChmcmFtZUFycikge1xuICAgICAgICAgICAgaWYgKHBsYXliYWNrRnJhbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0dXJuRnJhbWVzID0gW107XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGZyYW1lQXJyLCBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmcmFtZS5yZ2JhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBmcmFtZSBoYXMgbm90IHlldCBoYWQgYSBVaW50OEFycmF5IGNhbGN1bGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmdiYSA9IF8uZmxhdE1hcChmcmFtZS52YWx1ZXMsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gZnJhbWUuaXNDb3JyZWxhdGlvbiA/IHZhbHVlIC0gY29ycmVsYXRpbmdGcmFtZU1pblZhbCA6IHZhbHVlIC0gZnJhbWVNaW5WYWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PSAwID8gdmFsdWUgOiAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gZnJhbWUuaXNDb3JyZWxhdGlvbiA/IE1hdGgucm91bmQoKHZhbHVlIC8gY29ycmVsYXRpbmdGcmFtZVJhbmdlKSAqIDI1NC4wKSA6IE1hdGgucm91bmQoKHZhbHVlIC8gZnJhbWVSYW5nZSkgKiAyNTQuMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt2YWx1ZSwgdmFsdWUsIHZhbHVlLCAyNTVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZS5yZ2JhID0gbmV3IFVpbnQ4QXJyYXkocmdiYSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuRnJhbWVzLnB1c2goZnJhbWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXR1cm5GcmFtZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHVwZGF0ZUZyYW1lc1RvUmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGZyYW1lT2JqID0gXy5ncm91cEJ5KGZyYW1lRGF0YVswXS5yZXN1bHRzLCAnc2Vuc29yJyksXG4gICAgICAgICAgICAgICAgZnJhbWVzVG9SZW5kZXIgPSBmcmFtZU9ialt2bS5hY3RpdmVDaGlwQ2FyZC5zZW5zb3JdLFxuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVPYmogPSB7fSxcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lc1RvUmVuZGVyID0gW107XG5cbiAgICAgICAgICAgIGlmIChoYXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nRnJhbWVPYmogPSBfLmdyb3VwQnkoZnJhbWVEYXRhWzFdLnJlc3VsdHMsICdzZW5zb3InKTtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lc1RvUmVuZGVyID0gY29ycmVsYXRpbmdGcmFtZU9ialt2bS5hY3RpdmVDaGlwQ2FyZC5zZW5zb3JdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjYWxjdWxhdGUgbWluLCBtYXgsIGFuZCByYW5nZSBmb3IgYm90aCBzZXRzIG9mIGZyYW1lc1xuICAgICAgICAgICAgZnJhbWVNaW5WYWwgPSBfLm1pbihfLm1hcChmcmFtZXNUb1JlbmRlciwgJ21pbicpKTtcbiAgICAgICAgICAgIGZyYW1lTWF4VmFsID0gXy5tYXgoXy5tYXAoZnJhbWVzVG9SZW5kZXIsICdtYXgnKSk7XG4gICAgICAgICAgICBmcmFtZU1heFZhbCA9IGZyYW1lTWluVmFsID49IDAgPyBmcmFtZU1heFZhbCA6IGZyYW1lTWF4VmFsICsgTWF0aC5hYnMoZnJhbWVNaW5WYWwpO1xuICAgICAgICAgICAgZnJhbWVNaW5WYWwgPSBmcmFtZU1pblZhbCA+PSAwID8gZnJhbWVNaW5WYWwgOiAwO1xuICAgICAgICAgICAgZnJhbWVSYW5nZSA9IGZyYW1lTWF4VmFsIC0gZnJhbWVNaW5WYWw7XG4gICAgICAgICAgICBpZiAoaGFzQ29ycmVsYXRpb24pIHtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWluVmFsID0gXy5taW4oXy5tYXAoY29ycmVsYXRpbmdGcmFtZXNUb1JlbmRlciwgJ21pbicpKTtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWF4VmFsID0gXy5tYXgoXy5tYXAoY29ycmVsYXRpbmdGcmFtZXNUb1JlbmRlciwgJ21heCcpKTtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWF4VmFsID0gY29ycmVsYXRpbmdGcmFtZU1pblZhbCA+PSAwID8gY29ycmVsYXRpbmdGcmFtZU1heFZhbCA6IGNvcnJlbGF0aW5nRnJhbWVNYXhWYWwgKyBNYXRoLmFicyhjb3JyZWxhdGluZ0ZyYW1lTWluVmFsKTtcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ0ZyYW1lTWluVmFsID0gY29ycmVsYXRpbmdGcmFtZU1pblZhbCA+PSAwID8gY29ycmVsYXRpbmdGcmFtZU1pblZhbCA6IDA7XG4gICAgICAgICAgICAgICAgY29ycmVsYXRpbmdGcmFtZVJhbmdlID0gY29ycmVsYXRpbmdGcmFtZU1heFZhbCAtIGNvcnJlbGF0aW5nRnJhbWVNaW5WYWw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNvbWJpbmUgZnJhbWVzIHNvIHRoZXJlJ3Mgb25seSBvbmUgcGxheWJhY2sgc291cmNlXG4gICAgICAgICAgICBwbGF5YmFja0ZyYW1lcyA9IF8uc29ydEJ5KF8udW5pb24oZnJhbWVzVG9SZW5kZXIsIGNvcnJlbGF0aW5nRnJhbWVzVG9SZW5kZXIpLCAndGltZXN0YW1wJyk7XG5cbiAgICAgICAgICAgIC8vIGFkanVzdCBpbml0aWFsIHBsYXliYWNrIHNwZWVkIGJhc2VkIG9uIHBsYXliYWNrRnJhbWVzIGxlbmd0aFxuICAgICAgICAgICAgaWYgKHBsYXliYWNrRnJhbWVzLmxlbmd0aCA8IDI1KSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEZWxheSA9IDEwMDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGxheWJhY2tGcmFtZXMubGVuZ3RoID49IDI1ICYmIHBsYXliYWNrRnJhbWVzLmxlbmd0aCA8IDUwKSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEZWxheSA9IDUwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGF5YmFja0ZyYW1lcy5sZW5ndGggPj0gNTAgJiYgcGxheWJhY2tGcmFtZXMubGVuZ3RoIDwgMTAwKSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEZWxheSA9IDIwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGF5YmFja0ZyYW1lcy5sZW5ndGggPj0gMTAwICYmIHBsYXliYWNrRnJhbWVzLmxlbmd0aCA8IDIwMCkge1xuICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrRGVsYXkgPSAxMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEZWxheSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHVwZGF0ZUNoYXJ0Rm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjaGFydEZvY3VzID0gW3ZtLmFjdGl2ZUNoaXBDYXJkLmNoYXJ0SWRdO1xuICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQpIHtcbiAgICAgICAgICAgICAgICBjaGFydEZvY3VzLnB1c2godm0uYWN0aXZlQ29ycmVsYXRpbmdDaGlwQ2FyZC5jaGFydElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGFydCkge1xuICAgICAgICAgICAgICAgIGNoYXJ0LmZvY3VzKGNoYXJ0Rm9jdXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByZW5kZXJGcmFtZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZ3JpZExpbmUgPSBudWxsO1xuXG4gICAgICAgICAgICB1cGRhdGVGcmFtZXNUb1JlbmRlcigpO1xuXG4gICAgICAgICAgICBhbmltYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChwbGF5YmFja0ZyYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChncmlkTGluZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3JpZExpbmUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBncmlkTGluZSA9IGZyYW1lSWR4IDwgcGxheWJhY2tGcmFtZXMgLSAxID8gYW5ndWxhci5lbGVtZW50KCcudGltZS0nICsgXy5yZXBsYWNlKHBsYXliYWNrRnJhbWVzW2ZyYW1lSWR4XS50aW1lc3RhbXAsICcuJywgJycpKVswXSA6IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChncmlkTGluZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3JpZExpbmUuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBsYXliYWNrRnJhbWVzW2ZyYW1lSWR4XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIG11bHRpcGxlIGZyYW1lcyBoYXZlIHRoZSBzYW1lIHRpbWVzdGFtcCB0aGVuIHBsYXkgdGhlbSBhbGwgYXQgdGhlIHNhbWUgdGltZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUFyciA9IF8uZmlsdGVyKHBsYXliYWNrRnJhbWVzLCB7dGltZXN0YW1wOiBwbGF5YmFja0ZyYW1lc1tmcmFtZUlkeF0udGltZXN0YW1wfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhd0ZyYW1lKGdldEZyYW1lKGZyYW1lQXJyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnBsYXliYWNrRGlyZWN0aW9uID09PSAnZm9yd2FyZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHggPSBmcmFtZUlkeCArIGZyYW1lQXJyLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSWR4ID49IHBsYXliYWNrRnJhbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHggPSBmcmFtZUlkeCAtIGZyYW1lQXJyLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lSWR4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHggPSBwbGF5YmFja0ZyYW1lcy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5wbGF5YmFja1N0YXRlICYmIGFuaW1hdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgdm0ucGxheWJhY2tEZWxheSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgYW5pbWF0ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRFdmVudFZvdGUgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50ID0gZXZlbnQgfHwgdm0uc2VsZWN0ZWRGZWF0dXJlO1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVyKSB7XG4gICAgICAgICAgICAgICAgLy8gbG9vayBmb3IgZXhpc3Rpbmcgdm90ZSBmb3IgdGhpcyBldmVudFxuICAgICAgICAgICAgICAgIHZhciBldmVudFZvdGUgPSBfLmZpbmQodm0udm90ZXMsIHsgZGF0YXNldF9pZDogZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdLCBwcm9kdWN0X2lkOiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gfSk7XG4gICAgICAgICAgICAgICAgdm0udm90ZU9iaiA9IGV2ZW50Vm90ZSA/IFZvdGUudHJhbnNmb3JtZXIoZXZlbnRWb3RlKSA6IG5ldyBWb3RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gbmV4dEV2ZW50ICgpIHsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICB2YXIgZXZlbnRzID0gXy5vcmRlckJ5KHN0YXRlU2VydmljZS5nZXRFdmVudHMoKSwgWydwcm9wZXJ0aWVzLmV2ZW50X3RpbWUnXSwgWydkZXNjJ10pLFxuICAgICAgICAgICAgICAgIGN1cnJJZHggPSBfLmZpbmRJbmRleChldmVudHMsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9PT0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSAmJiBlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9PT0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXTtcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBuZXh0RXZlbnQgPSBjdXJySWR4IDwgKGV2ZW50cy5sZW5ndGggLSAxKSA/IGV2ZW50c1tjdXJySWR4ICsgMV0gOiBldmVudHNbMF07XG5cbiAgICAgICAgICAgIGdldEV2ZW50Vm90ZShuZXh0RXZlbnQpO1xuXG4gICAgICAgICAgICB3aGlsZSh2bS52b3RlT2JqLnZvdGVfaWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjdXJySWR4Kys7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJJZHggPCBldmVudHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0RXZlbnQgPSBldmVudHNbY3VycklkeCArIDFdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJJZHggPSAwO1xuICAgICAgICAgICAgICAgICAgICBuZXh0RXZlbnQgPSBldmVudHNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGdldEV2ZW50Vm90ZShuZXh0RXZlbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXh0RXZlbnQuc2Nyb2xsVG8gPSB0cnVlO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZUV2ZW50KG5leHRFdmVudCwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcmV2aW91c0V2ZW50ICgpIHsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICB2YXIgZXZlbnRzID0gXy5vcmRlckJ5KHN0YXRlU2VydmljZS5nZXRFdmVudHMoKSwgWydwcm9wZXJ0aWVzLmV2ZW50X3RpbWUnXSwgWydkZXNjJ10pLFxuICAgICAgICAgICAgICAgIGN1cnJJZHggPSBfLmZpbmRJbmRleChldmVudHMsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9PT0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSAmJiBlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9PT0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXTtcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBwcmV2aW91c0V2ZW50ID0gY3VycklkeCA+IDAgPyBldmVudHNbY3VycklkeCAtIDFdIDogXy5sYXN0KGV2ZW50cyk7XG5cbiAgICAgICAgICAgIGdldEV2ZW50Vm90ZShwcmV2aW91c0V2ZW50KTtcblxuICAgICAgICAgICAgd2hpbGUodm0udm90ZU9iai52b3RlX2lkICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY3VycklkeC0tO1xuICAgICAgICAgICAgICAgIGlmIChjdXJySWR4ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0V2ZW50ID0gZXZlbnRzW2N1cnJJZHggLSAxXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjdXJySWR4ID0gZXZlbnRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNFdmVudCA9IF8ubGFzdChldmVudHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBnZXRFdmVudFZvdGUocHJldmlvdXNFdmVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZXZpb3VzRXZlbnQuc2Nyb2xsVG8gPSB0cnVlO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZUV2ZW50KHByZXZpb3VzRXZlbnQsIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZm9ybWF0Q2hhcnREYXRhIChwbG90RGF0YSwgY29ycmVsYXRpbmdEYXRlRGlmZiwgYmFzZVVybCkge1xuICAgICAgICAgICAgaWYgKCFsb2NhdGlvbi5vcmlnaW4pIHsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgbG9jYXRpb24ub3JpZ2luID0gbG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgbG9jYXRpb24uaG9zdG5hbWUgKyAobG9jYXRpb24ucG9ydCA/ICc6JyArIGxvY2F0aW9uLnBvcnQ6ICcnKTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbXBvcnRTY3JpcHRzKGxvY2F0aW9uLm9yaWdpbiArIGJhc2VVcmwgKyAnL3NjcmlwdHMvd2Vid29ya2VyRGVwcy9sb2Rhc2guanMnKTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG5cbiAgICAgICAgICAgIHZhciBwbG90QXJyID0gW107XG4gICAgICAgICAgICBfLmZvckVhY2gocGxvdERhdGEsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhlIGNvbnZlbnRpb24gZm9yIGEgcG9pbnQgaXMgYSA0IGl0ZW0gYXJyYXkgW3RpbWUsIHNlbnNvciBpbmRleCwgb2JqZWN0IGluZGV4LCBpbnRlbnNpdHldXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGRhdGEucG9pbnRzLCBmdW5jdGlvbiAocG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBvaW50RGF0YSA9IHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRWYWx1ZSA9IHBvaW50WzNdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGZvcm1hdCB2YWx1ZXMgZm9yIGxvZyBzY2FsZS4gc2V0IG5lZ2F0aXZlIHZhbHVlcyB0byBudWxsXG4gICAgICAgICAgICAgICAgICAgIHBvaW50VmFsdWUgPSBwb2ludFZhbHVlIDwgMCA/IG51bGwgOiBNYXRoLmxvZyhwb2ludFZhbHVlICsgMSkgLyBNYXRoLkxOMTA7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuaXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm9ybWFsaXplIHRpbWUgdmFsdWVzIGlmIGEgZGlmZmVyZW5jZSBpbiBzdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGF0ZXMgaXMgcHJlc2VudC4gY29ycmVsYXRpbmdEYXRlRGlmZiB3aWxsIGJlIHBvc2l0aXZlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3aGVuIHRoZSBjb3JyZWxhdGluZyBldmVudCBzdGFydGVkIHZhbHVlIGlzIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGFuIHRoZSBldmVudCBzdGFydGVkIHZhbHVlLCBhbmQgdmljZSB2ZXJzYVxuICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnREYXRhLnRpbWUgPSBjb3JyZWxhdGluZ0RhdGVEaWZmID8gcG9pbnRbMF0gLSBjb3JyZWxhdGluZ0RhdGVEaWZmIDogcG9pbnRbMF07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhbHdheXMgdXNlIHRoZSBnaXZlbiB0aW1lIHZhbHVlIGZvciB0aGUgc2VsZWN0ZWQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50RGF0YS50aW1lID0gcG9pbnRbMF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcG9pbnREYXRhW2RhdGEuc2Vuc29yc1twb2ludFsxXV1dID0gcG9pbnRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgcG9pbnREYXRhLnNlbnNvciA9IGRhdGEuc2Vuc29yc1twb2ludFsxXV07XG4gICAgICAgICAgICAgICAgICAgIHBsb3RBcnIucHVzaChwb2ludERhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBwbG90QXJyO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGluaXRDaGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBleHBGb3JtYXQgPSBkMy5mb3JtYXQoJy4xZScpLFxuICAgICAgICAgICAgICAgIG51bUZvcm1hdCA9IGQzLmZvcm1hdCgnbicpO1xuXG4gICAgICAgICAgICAvLyBnZW5lcmF0ZSB0aW1lL2ludGVuc2l0eSBjaGFydCB1c2luZyBDM1xuICAgICAgICAgICAgY2hhcnQgPSBjMy5nZW5lcmF0ZSh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBqc29uOiBbXVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdHJhbnNpdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2l6ZToge1xuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdm0uZXZlbnRWaWV3ZXJXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2bS5ldmVudFZpZXdlckhlaWdodCAvIDJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhZGRpbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAxMCxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0b29sdGlwOiB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHgudG9GaXhlZCgyKSArICcgc2Vjb25kcyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoTWF0aC5wb3coMTAsIHZhbHVlKS50b0ZpeGVkKDYpKSAtIDEgKyAnICcgKyBkZWZhdWx0UGxvdERhdGEueV9jb2x1bW4udW5pdHMubGFiZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGxpbmU6IHtcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdE51bGw6IHRydWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGljazoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6ICdTZWNvbmRzIHNpbmNlICcgKyBtb21lbnQudXRjKGRlZmF1bHRQbG90RGF0YS5zdGFydGVkKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3NbWl0nKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ291dGVyLWxlZnQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogZGVmYXVsdFBsb3REYXRhLnlfY29sdW1uLnVuaXRzLmxhYmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnb3V0ZXItbWlkZGxlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpY2s6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvcm1hdCBjdXN0b20gdGlja3MgZm9yIGxvZyBzY2FsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdCA9IE1hdGguYWJzKGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodCAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdCA9IHQgPCAxID8gTWF0aC5wb3coMTAsIHQpIDogTWF0aC5yb3VuZChNYXRoLnBvdygxMCwgdCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdCA9IGQgPCAwID8gMSAvIHQgOiB0O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodCA8IDAuMDAwMDEgfHwgdCA+IDEwMDAwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBleHBGb3JtYXQodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyaW0gcmVtYWluaW5nIGZsb2F0aW5nIHZhbHVlcyB3aGVuIHRoZXkgZ2V0IHRvbyBsb25nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGF2b2lkcyB1bmRlc2lyZWQgemVybyBwYWRkaW5nIHByb3ZpZGVkIGJ5IEQzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gbnVtRm9ybWF0KHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnRzID0gcmVzdWx0LnRvU3RyaW5nKCkuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPiAxICYmIHBhcnRzWzFdLmxlbmd0aCA+IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFydHNbMF0gKyAnLicgKyBwYXJ0c1sxXS5zdWJzdHJpbmcoMCwgMik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB6b29tOiB7XG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN1YmNoYXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgIHNob3c6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbm1vdXNlb3V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoYXJ0LmZvY3VzKGNoYXJ0Rm9jdXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzb3J0U2Vuc29ycyA9IGZ1bmN0aW9uIChzZW5zb3JzKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5zb3J0Qnkoc2Vuc29ycywgZnVuY3Rpb24gKHNlbnNvcikge1xuICAgICAgICAgICAgICAgIGlmIChfLnN0YXJ0c1dpdGgoc2Vuc29yLCBlcmlzQ29uZmlnLmRlZmF1bHRTZW5zb3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzZW5zb3Iuc3BsaXQoJyAnKVsxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbnNvcjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByZW5kZXJDaGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmNoYXJ0TG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICAvLyBpbnN0YW50aWF0ZSB0aGUgd2ViIHdvcmtlclxuICAgICAgICAgICAgY2hhcnRXb3JrZXIgPSBXZWJ3b3JrZXIuY3JlYXRlKGZvcm1hdENoYXJ0RGF0YSk7XG5cbiAgICAgICAgICAgIC8vIHN0YXJ0IHRoZSB3ZWIgd29ya2VyIGFuZCB3YWl0IGZvciB0aGUgcmVzdWx0XG4gICAgICAgICAgICBjaGFydFdvcmtlci5ydW4ocGxvdERhdGEsIGNvcnJlbGF0aW5nRGF0ZURpZmYsIGVyaXNDb25maWcuYmFzZVVybCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlZmF1bHRQbG90RGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBjaGFydERhdGEgPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIHZtLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaW5pdENoYXJ0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleXMgPSBjb3JyZWxhdGluZ1Bsb3REYXRhID8gXy5jb25jYXQoZGVmYXVsdFBsb3REYXRhLnNlbnNvcnMsIGNvcnJlbGF0aW5nUGxvdERhdGEuc2Vuc29ycykgOiBkZWZhdWx0UGxvdERhdGEuc2Vuc29ycztcbiAgICAgICAgICAgICAgICAgICAga2V5cyA9IHNvcnRTZW5zb3JzKGtleXMpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBzb3VyY2UwSWR4ID0gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTFJZHggPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCB1cCBjaGFydCBjb2xvcnMgYmFzZWQgb24gc291cmNlIHR5cGVcbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGtleXMsIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLmVuZHNXaXRoKGtleSwgZXJpc0NvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJ0Q29sb3JzW2tleV0gPSBfLmZpbmQoZXJpc0NvbmZpZy5zb3VyY2VzLCB7IGlkZW50aXR5OiBmYWxzZSB9KS5jaGFydENvbG9yc1tzb3VyY2UwSWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UwSWR4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJ0Q29sb3JzW2tleV0gPSBfLmZpbmQoZXJpc0NvbmZpZy5zb3VyY2VzLCB7IGlkZW50aXR5OiB0cnVlIH0pLmNoYXJ0Q29sb3JzW3NvdXJjZTFJZHhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTFJZHgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uOiBjaGFydERhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogJ3RpbWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBrZXlzXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JzOiBjaGFydENvbG9ycyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ3JpZExpbmVzID0gXy5tYXAoY2hhcnREYXRhLCBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBmcmFtZS50aW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6ICdmcmFtZS1saW5lIHRpbWUtJyArIF8ucmVwbGFjZShmcmFtZS50aW1lLCAnLicsICcnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbnNvcjogZnJhbWUuc2Vuc29yXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhcnQueGdyaWRzKGdyaWRMaW5lcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uY2hhcnRMb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY2hhcnQubG9hZChkYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBkZXRlcm1pbmUgY29sb3IgZm9yIGNhcmQgdGl0bGUgYmFzZWQgb24gY29sb3IgaW4gY2hhcnRcbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKHZtLmNoaXBDYXJkcywgZnVuY3Rpb24gKGNhcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmQuY29sb3IgPSBjaGFydC5kYXRhLmNvbG9ycygpW2NhcmQuY2hhcnRJZF07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUNoYXJ0Rm9jdXMoKTtcblxuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2godm0uY29ycmVsYXRpbmdDaGlwQ2FyZHMsIGZ1bmN0aW9uIChjYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkLmNvbG9yID0gY2hhcnQuZGF0YS5jb2xvcnMoKVtjYXJkLmNoYXJ0SWRdO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdEV2ZW50RGF0YSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmxvYWRpbmdTdGF0dXMgPSAnSW5pdGlhbGl6aW5nLi4uJztcblxuICAgICAgICAgICAgLy8gZmxhdHRlbiBmcmFtZURhdGEgYW5kIGdyb3VwIGJ5IHNlbnNvciwgdGhlbiBjb252ZXJ0XG4gICAgICAgICAgICAvLyB0byBwYWlycyBzbyB0aGUgdGVtcGxhdGUga25vd3MgaG93IG1hbnkgaW1hZ2UgY2FyZHNcbiAgICAgICAgICAgIC8vIHRvIGRpc3BsYXkgYW5kIHdoYXQgdGhlaXIgbGFiZWxzIHNob3VsZCBiZVxuICAgICAgICAgICAgdmFyIGNoaXBDYXJkcyA9IF8udG9QYWlycyhfLmdyb3VwQnkoXy5mbGF0dGVuKF8ubWFwKGZyYW1lRGF0YSwgJ3Jlc3VsdHMnKSksICdzZW5zb3InKSk7XG4gICAgICAgICAgICB2YXIgY2hpcENhcmRPYmpzID0gXy5tYXAoY2hpcENhcmRzLCBmdW5jdGlvbiAoY2FyZCkge1xuICAgICAgICAgICAgICAgIHZhciBjYW52YXNDbGFzcyA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdID8gXy5yZXBsYWNlKGNhcmRbMF0sICcgJywgJycpIDogXy5yZXBsYWNlKGNhcmRbMF0sICcgJywgJycpICsgZXJpc0NvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsLFxuICAgICAgICAgICAgICAgICAgICBjaGFydElkID0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0gPyBjYXJkWzBdIDogY2FyZFswXSArIGVyaXNDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbDtcblxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHNlbnNvcjogY2FyZFswXSxcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VzOiBjYXJkWzFdLFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGFzczogY2FudmFzQ2xhc3MsXG4gICAgICAgICAgICAgICAgICAgIGNoYXJ0SWQ6IGNoYXJ0SWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBjaGlwQ2FyZE9yZGVyID0gc29ydFNlbnNvcnMoXy5tYXAoY2hpcENhcmRPYmpzLCAnc2Vuc29yJykpO1xuXG4gICAgICAgICAgICBfLmZvckVhY2goY2hpcENhcmRPcmRlciwgZnVuY3Rpb24gKHNlbnNvcikge1xuICAgICAgICAgICAgICAgIHZtLmNoaXBDYXJkcy5wdXNoKF8uZmluZChjaGlwQ2FyZE9ianMsIHsgc2Vuc29yOiBzZW5zb3IgfSkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZtLmFjdGl2ZUNoaXBDYXJkID0gdm0uY2hpcENhcmRzWzBdO1xuICAgICAgICAgICAgdm0uYWN0aXZlQ2hpcENhcmQuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIHZtLmF2YWlsYWJsZUNoaXBDYXJkcyA9IF8uY2xvbmVEZWVwKHZtLmNoaXBDYXJkcyk7XG5cbiAgICAgICAgICAgIGlmIChoYXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgICAgIC8vIHNldCB1cCBjb3JyZWxhdGluZyBjaGlwIGNhcmRzXG4gICAgICAgICAgICAgICAgdm0uY29ycmVsYXRpbmdDaGlwQ2FyZHMgPSBfLm1hcChjaGlwQ2FyZHMsIGZ1bmN0aW9uIChjYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5zb3I6IGNhcmRbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWFnZXM6IGNhcmRbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IGNhcmRbMF0gPT09IHZtLmFjdGl2ZUNoaXBDYXJkLnNlbnNvcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOiB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSA/IF8ucmVwbGFjZShjYXJkWzBdLCAnICcsICcnKSArIGVyaXNDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbCA6IF8ucmVwbGFjZShjYXJkWzBdLCAnICcsICcnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJ0SWQ6IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdID8gY2FyZFswXSArIGVyaXNDb25maWcuZXh0ZXJuYWxTb3VyY2VMYWJlbCA6IGNhcmRbMF1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVDb3JyZWxhdGluZ0NoaXBDYXJkID0gXy5maW5kKHZtLmNvcnJlbGF0aW5nQ2hpcENhcmRzLCB7IHNlbnNvcjogdm0uYWN0aXZlQ2hpcENhcmQuc2Vuc29yIH0pO1xuICAgICAgICAgICAgICAgIHZtLmF2YWlsYWJsZUNoaXBDYXJkcyA9IF8udW5pcUJ5KHZtLmF2YWlsYWJsZUNoaXBDYXJkcy5jb25jYXQodm0uY29ycmVsYXRpbmdDaGlwQ2FyZHMpLCAnc2Vuc29yJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgY29ycmVsYXRpbmcgZXZlbnQgdGltZSBkaWZmZXJlbmNlXG4gICAgICAgICAgICAgICAgY29ycmVsYXRpbmdEYXRlRGlmZiA9IG1vbWVudChkZWZhdWx0UGxvdERhdGEuc3RhcnRlZCkuZGlmZihtb21lbnQoY29ycmVsYXRpbmdQbG90RGF0YS5zdGFydGVkKSwgJ3MnKTtcblxuICAgICAgICAgICAgICAgIC8vIGFkanVzdCBmb3IgcG9zc2libGUgdGltZXN0YW1wIGRpZmZlcmVuY2VcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goZnJhbWVEYXRhLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goZGF0YS5yZXN1bHRzLCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LmlzQ29ycmVsYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQudGltZXN0YW1wID0gY29ycmVsYXRpbmdEYXRlRGlmZiA/IHJlc3VsdC50aW1lc3RhbXAgLSBjb3JyZWxhdGluZ0RhdGVEaWZmIDogcmVzdWx0LnRpbWVzdGFtcDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICByZW5kZXJDaGFydCgpO1xuICAgICAgICAgICAgcmVuZGVyRnJhbWVzKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldENvcnJlbGF0aW5nRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRDb3JyZWxhdGluZ0V2ZW50cyh2bS5zZWxlY3RlZEZlYXR1cmUpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZtLmV2ZW50RXJyb3IgPSBlcnJvci5zdGF0dXMgPiAtMSA/IGVycm9yLnN0YXR1cyArICc6ICcgKyBlcnJvci5zdGF0dXNUZXh0IDogJ0Nvbm5lY3Rpb24gZXJyb3I7IHVuYWJsZSB0byByZXRyaWV2ZSBjb3JyZWxhdGluZyBldmVudHMuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0UGxvdERhdGEgPSBmdW5jdGlvbiAoZmlsZVBhdGgsIGlzQ29ycmVsYXRpb24pIHtcbiAgICAgICAgICAgIGlzQ29ycmVsYXRpb24gPSBpc0NvcnJlbGF0aW9uIHx8IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRQbG90RGF0YSh7IHVybDogZmlsZVBhdGggfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmlzQ29ycmVsYXRpb24gPSBpc0NvcnJlbGF0aW9uO1xuICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzZWxlY3RlZCBmZWF0dXJlIGlzIHVzLCBzbyBjb3JyZWxhdGVkIGRhdGEgbmVlZHMgdG8gYmUgbGFiZWxlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNlbnNvcnMgPSBfLm1hcChyZXN1bHQuc2Vuc29ycywgZnVuY3Rpb24gKHNlbnNvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzZW5zb3IgKyBlcmlzQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNlbGVjdGVkIGZlYXR1cmUgaXMgdGhlbSwgc28gbm9uLWNvcnJlbGF0ZWQgZGF0YSBuZWVkcyB0byBiZSBsYWJlbGVkXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNlbnNvcnMgPSBfLm1hcChyZXN1bHQuc2Vuc29ycywgZnVuY3Rpb24gKHNlbnNvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzZW5zb3IgKyBlcmlzQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkLnJlc29sdmUocGxvdERhdGEucHVzaChyZXN1bHQpKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2bS5ldmVudEVycm9yID0gZXJyb3Iuc3RhdHVzID4gLTEgPyBlcnJvci5zdGF0dXMgKyAnOiAnICsgZXJyb3Iuc3RhdHVzVGV4dCA6ICdDb25uZWN0aW9uIGVycm9yOyB1bmFibGUgdG8gcmV0cmlldmUgcGxvdCBkYXRhLic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldEZyYW1lRGF0YSA9IGZ1bmN0aW9uIChmaWxlUGF0aCwgaXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgaXNDb3JyZWxhdGlvbiA9IGlzQ29ycmVsYXRpb24gfHwgZmFsc2U7XG4gICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldEZyYW1lRGF0YSh7IHVybDogZmlsZVBhdGggfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHJlc3VsdC5yZXN1bHRzLCBmdW5jdGlvbiAocikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHIuc2Vuc29yVGl0bGUgPSBpc0NvcnJlbGF0aW9uID8gci5zZW5zb3IgKyBlcmlzQ29uZmlnLmV4dGVybmFsU291cmNlTGFiZWwgOiByLnNlbnNvcjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHIuc2Vuc29yVGl0bGUgPSAhaXNDb3JyZWxhdGlvbiA/IHIuc2Vuc29yICsgZXJpc0NvbmZpZy5leHRlcm5hbFNvdXJjZUxhYmVsIDogci5zZW5zb3I7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgci5pc0NvcnJlbGF0aW9uID0gaXNDb3JyZWxhdGlvbjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkLnJlc29sdmUoZnJhbWVEYXRhLnB1c2gocmVzdWx0KSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdm0uZXZlbnRFcnJvciA9IGVycm9yLnN0YXR1cyA+IC0xID8gZXJyb3Iuc3RhdHVzICsgJzogJyArIGVycm9yLnN0YXR1c1RleHQgOiAnQ29ubmVjdGlvbiBlcnJvcjsgdW5hYmxlIHRvIHJldHJpZXZlIGZyYW1lIGRhdGEuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0Q29ycmVsYXRpbmdFdmVudERhdGEgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldEV2ZW50VHJhY2tzKHBhcmFtcykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIGQucmVzb2x2ZShjb3JyZWxhdGluZ0V2ZW50RGF0YSA9IGRhdGEpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZtLmV2ZW50RXJyb3IgPSBlcnJvci5zdGF0dXMgPiAtMSA/IGVycm9yLnN0YXR1cyArICc6ICcgKyBlcnJvci5zdGF0dXNUZXh0IDogJ0Nvbm5lY3Rpb24gZXJyb3I7IHVuYWJsZSB0byByZXRyaWV2ZSBjb3JyZWxhdGluZyBldmVudCBkYXRhLic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGRlbGV0ZVZvdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2b3RlU2VydmljZS5kZWxldGVWb3RlKHZtLnZvdGVPYmoudm90ZV9pZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgXy5yZW1vdmUodm0udm90ZXMsIGZ1bmN0aW9uICh2b3RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2b3RlLnZvdGVfaWQgPT09IHZtLnZvdGVPYmoudm90ZV9pZDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2bS52b3RlT2JqID0gbmV3IFZvdGUoKTtcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdWb3RlIFJlbW92ZWQnKS50aGVtZSgnc3VjY2Vzcy10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY2FzdFZvdGUgPSBmdW5jdGlvbiAoaXNLZXlib2FyZCkge1xuICAgICAgICAgICAgdm90ZVNlcnZpY2UuY2FzdFZvdGUodm0udm90ZU9iaikudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdm0udm90ZU9iaiA9IFZvdGUudHJhbnNmb3JtZXIocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIHZtLnZvdGVzLnB1c2godm0udm90ZU9iaik7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVzKHZtLnZvdGVzKTtcbiAgICAgICAgICAgICAgICBpZiAodm0udm90ZU9iai52b3RlKSB7XG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1Vwdm90ZSByZWNvcmRlZCcpLnRoZW1lKCdzdWNjZXNzLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdEb3dudm90ZSByZWNvcmRlZCcpLnRoZW1lKCdmYWlsLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGlzS2V5Ym9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dEV2ZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgIHZtLnZvdGVPYmoudm90ZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgU3VibWl0dGluZyBWb3RlJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHVwZGF0ZVZvdGUgPSBmdW5jdGlvbiAoaXNLZXlib2FyZCkge1xuICAgICAgICAgICAgdm90ZVNlcnZpY2UudXBkYXRlVm90ZSh2bS52b3RlT2JqKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBsb29rIGZvciBleGlzdGluZyB2b3RlIGZvciB0aGlzIGV2ZW50XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50Vm90ZUlkeCA9IF8uZmluZEluZGV4KHZtLnZvdGVzLCB7IGRhdGFzZXRfaWQ6IHZtLnZvdGVPYmpbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSwgcHJvZHVjdF9pZDogdm0udm90ZU9ialtlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdIH0pO1xuICAgICAgICAgICAgICAgIHZhciB0ZW1wVm90ZXMgPSBfLmNsb25lRGVlcCh2bS52b3Rlcyk7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50Vm90ZUlkeCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRlbXBWb3Rlc1tldmVudFZvdGVJZHhdLnZvdGUgPSB2bS52b3RlT2JqLnZvdGU7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3Rlcyh0ZW1wVm90ZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodm0udm90ZU9iai52b3RlKSB7XG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1Vwdm90ZSByZWNvcmRlZCcpLnRoZW1lKCdzdWNjZXNzLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdEb3dudm90ZSByZWNvcmRlZCAoJyArIHZtLnZvdGVPYmoucmVhc29uICsgJyknKS50aGVtZSgnZmFpbC10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc0tleWJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRFdmVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICB2bS52b3RlT2JqLnZvdGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ0Vycm9yIFN1Ym1pdHRpbmcgVm90ZScpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmdldFNjYWxlRGF0YSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmxvYWRpbmdTY2FsZURhdGEgPSB0cnVlO1xuICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRTY2FsZURhdGEodm0uc2NhbGVGaWxlKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVzdWx0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLnNjYWxlSm9iVXJsID0gZXJpc0NvbmZpZy5zY2FsZS51cmwgKyAnLyMvam9icy9qb2IvJyArIGRhdGEucmVzdWx0c1swXS5qb2IuaWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdTY2FsZURhdGEgPSBmYWxzZTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nU2NhbGVEYXRhID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdm0uc2NhbGVKb2JVcmwgPSBudWxsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0QWN0aXZlQ2hpcENhcmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBwbGF5YmFja0ZyYW1lcyA9IFtdO1xuICAgICAgICAgICAgZnJhbWVJZHggPSAwO1xuICAgICAgICAgICAgdmFyIGN1cnJBY3RpdmVDaGlwQ2FyZCA9IF8uZmluZCh2bS5jaGlwQ2FyZHMsIHsgYWN0aXZlOiB0cnVlIH0pLFxuICAgICAgICAgICAgICAgIGN1cnJBY3RpdmVDb3JyZWxhdGluZ0NoaXBDYXJkID0gXy5maW5kKHZtLmNvcnJlbGF0aW5nQ2hpcENhcmRzLCB7IGFjdGl2ZTogdHJ1ZSB9KTtcblxuICAgICAgICAgICAgaWYgKGN1cnJBY3RpdmVDaGlwQ2FyZCkge1xuICAgICAgICAgICAgICAgIGN1cnJBY3RpdmVDaGlwQ2FyZC5hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjdXJyQWN0aXZlQ29ycmVsYXRpbmdDaGlwQ2FyZCkge1xuICAgICAgICAgICAgICAgIGN1cnJBY3RpdmVDb3JyZWxhdGluZ0NoaXBDYXJkLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2bS5hY3RpdmVDaGlwQ2FyZCA9IF8uZmluZCh2bS5jaGlwQ2FyZHMsIHsgc2Vuc29yOiB2bS5hY3RpdmVDaGlwQ2FyZC5zZW5zb3IgfSk7XG4gICAgICAgICAgICB2bS5hY3RpdmVDb3JyZWxhdGluZ0NoaXBDYXJkID0gXy5maW5kKHZtLmNvcnJlbGF0aW5nQ2hpcENhcmRzLCB7IHNlbnNvcjogdm0uYWN0aXZlQ2hpcENhcmQuc2Vuc29yIH0pO1xuXG4gICAgICAgICAgICBpZiAodm0uYWN0aXZlQ2hpcENhcmQpIHtcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVDaGlwQ2FyZC5hY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUNvcnJlbGF0aW5nQ2hpcENhcmQpIHtcbiAgICAgICAgICAgICAgICB2bS5hY3RpdmVDb3JyZWxhdGluZ0NoaXBDYXJkLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHVwZGF0ZUNoYXJ0Rm9jdXMoKTtcbiAgICAgICAgICAgIHVwZGF0ZUZyYW1lc1RvUmVuZGVyKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnREYXRhKG51bGwpO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZUV2ZW50KG51bGwpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnZvdGVVcEJ0bkNvbG9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gbnVsbCB8fCB2bS52b3RlT2JqLnZvdGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZWVuLTcwMCc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXktNzAwJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS52b3RlRG93bkJ0bkNvbG9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHZtLnZvdGVPYmoudm90ZSA9PT0gbnVsbCB8fCB2bS52b3RlT2JqLnZvdGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyZWQtNzAwJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodm0udm90ZU9iai52b3RlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5LTcwMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udm90ZVVwID0gZnVuY3Rpb24gKHR5cGUsIGlzS2V5Ym9hcmQpIHtcbiAgICAgICAgICAgIHR5cGUgPSB0eXBlIHx8ICdVVFlQJztcbiAgICAgICAgICAgIGlzS2V5Ym9hcmQgPSBpc0tleWJvYXJkIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICB2bS52b3RlT2JqW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdO1xuICAgICAgICAgICAgdm0udm90ZU9ialtlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID0gdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXTtcbiAgICAgICAgICAgIHZtLnZvdGVPYmpbZXJpc0NvbmZpZy5zZXJ2ZXIuaWRlbnRpdHlGaWVsZF0gPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXTtcbiAgICAgICAgICAgIHZtLnZvdGVPYmpbZXJpc0NvbmZpZy5zZXJ2ZXIudHlwZUZpZWxkXSA9IHR5cGU7XG4gICAgICAgICAgICB2bS52b3RlT2JqLnZvdGUgPSB0cnVlO1xuICAgICAgICAgICAgdm0udm90ZU9iai5yZWFzb24gPSAnJztcbiAgICAgICAgICAgIHZtLnZvdGVPYmpbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGVGaWVsZF07XG5cbiAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGVfaWQpIHtcbiAgICAgICAgICAgICAgICAvLyB2b3RlIGhhcyBhbHJlYWR5IGJlZW4gY2FzdCwgc28gdXBkYXRlIGluc3RlYWRcbiAgICAgICAgICAgICAgICB1cGRhdGVWb3RlKGlzS2V5Ym9hcmQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBuZXcgdm90ZVxuICAgICAgICAgICAgICAgIGNhc3RWb3RlKGlzS2V5Ym9hcmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnZvdGVEb3duID0gZnVuY3Rpb24gKHJlYXNvbiwgaXNLZXlib2FyZCkge1xuICAgICAgICAgICAgcmVhc29uID0gcmVhc29uIHx8ICcnO1xuICAgICAgICAgICAgaXNLZXlib2FyZCA9IGlzS2V5Ym9hcmQgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIHZtLnZvdGVPYmpbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF07XG4gICAgICAgICAgICB2bS52b3RlT2JqW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdO1xuICAgICAgICAgICAgdm0udm90ZU9ialtlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdO1xuICAgICAgICAgICAgdm0udm90ZU9iai52b3RlID0gZmFsc2U7XG4gICAgICAgICAgICB2bS52b3RlT2JqLnJlYXNvbiA9IHJlYXNvbjtcbiAgICAgICAgICAgIHZtLnZvdGVPYmpbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGVGaWVsZF07XG5cbiAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGVfaWQpIHtcbiAgICAgICAgICAgICAgICAvLyB2b3RlIGhhcyBhbHJlYWR5IGJlZW4gY2FzdCwgc28gdXBkYXRlIGluc3RlYWRcbiAgICAgICAgICAgICAgICB1cGRhdGVWb3RlKGlzS2V5Ym9hcmQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBuZXcgdm90ZVxuICAgICAgICAgICAgICAgIGNhc3RWb3RlKGlzS2V5Ym9hcmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNob3dNZXRhZGF0YSA9IGZ1bmN0aW9uKGV2LCBldk1ldGFkYXRhcykge1xuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coe1xuICAgICAgICAgICAgICAgIGNsaWNrT3V0c2lkZVRvQ2xvc2U6IHRydWUsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ21ldGFkYXRhRGlhbG9nQ29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvZXZlbnRWaWV3ZXIvbWV0YWRhdGFEaWFsb2dUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgICAgICB0YXJnZXRFdmVudDogZXYsXG4gICAgICAgICAgICAgICAgbG9jYWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50TWV0YWRhdGFzOiBldk1ldGFkYXRhc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLm1hdGNoU2lnbmF0dXJlID0gZnVuY3Rpb24gKHNlbnNvcikge1xuICAgICAgICAgICAgdmFyIGNoYXJ0RGF0YSA9IF8uZmluZChjaGFydC5kYXRhKCksIHsgaWQ6IHNlbnNvciB9KSxcbiAgICAgICAgICAgICAgICB2YWx1ZXMgPSBjaGFydERhdGEgPyBjaGFydERhdGEudmFsdWVzIDogbnVsbDtcblxuICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBudWxsIHZhbHVlc1xuICAgICAgICAgICAgdmFsdWVzID0gXy5maWx0ZXIodmFsdWVzLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIHJldHVybiB2LnZhbHVlICE9PSBudWxsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh2YWx1ZXMpO1xuXG4gICAgICAgICAgICAvL3ZhciBzaWcgPSB7XG4gICAgICAgICAgICAvLyAgICBzaWdfdGVtcGxhdGU6IFtbdGltZXNdLFtpbnRlbnNpdGllc11dLFxuICAgICAgICAgICAgLy8gICAgZXZlbnRfZGF0YTogW1tldmVudFRpbWVzXSxbZXZlbnRJbnRlbnNpdGllc11dXG4gICAgICAgICAgICAvL307XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0UGxheWJhY2tTdGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICAgICAgdm0ucGxheWJhY2tTdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgICAgaWYgKHZtLnBsYXliYWNrU3RhdGUpIHtcbiAgICAgICAgICAgICAgICBhbmltYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0UGxheWJhY2tEaXJlY3Rpb24gPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICB2YXIgb2xkRGlyZWN0aW9uID0gdm0ucGxheWJhY2tEaXJlY3Rpb247XG4gICAgICAgICAgICB2bS5wbGF5YmFja0RpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICAgICAgICAgIGlmICghdm0ucGxheWJhY2tTdGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmICghYW5ndWxhci5lcXVhbHMob2xkRGlyZWN0aW9uLCBkaXJlY3Rpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZXIgY2hhbmdlZCBkaXJlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IGZyYW1lSWR4IDwgcGxheWJhY2tGcmFtZXMubGVuZ3RoIC0gMiA/IGZyYW1lSWR4ICsgMiA6IDA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCA9IGZyYW1lSWR4ID4gMSA/IGZyYW1lSWR4IC0gMiA6IHBsYXliYWNrRnJhbWVzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYW5pbWF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnN1cHBvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkd2luZG93LmxvY2F0aW9uID0gJ21haWx0bzonICsgZXJpc0NvbmZpZy5zdXBwb3J0UE9DLmpvaW4oJzsnKSArICc/c3ViamVjdD1FcmlzJTIwRXZlbnQlMjBRdWVzdGlvbiZib2R5PVBsZWFzZSByZXZpZXcgdGhpcyBldmVudCBhbmQgcHJvdmlkZSBmZWVkYmFjazolMEQlMEElMEQlMEEnICsgZW5jb2RlVVJJQ29tcG9uZW50KCRsb2NhdGlvbi5hYnNVcmwoKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uZG93bmxvYWRHaWYgPSBmdW5jdGlvbiAoZXYsIGlzQ29ycmVsYXRpb24pIHtcbiAgICAgICAgICAgIHZhciBmaWxlTmFtZSA9ICcnO1xuXG4gICAgICAgICAgICBpZiAoaXNDb3JyZWxhdGlvbikge1xuICAgICAgICAgICAgICAgIGZpbGVOYW1lID0gJ19jb3JyZWxhdGVkLmdpZic7XG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZ0NvcnJlbGF0ZWRHaWYgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaWxlTmFtZSA9ICcuZ2lmJztcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nR2lmID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGZyYW1lcyA9IF8uZmlsdGVyKHBsYXliYWNrRnJhbWVzLCB7IGlzQ29ycmVsYXRpb246IGlzQ29ycmVsYXRpb24gfSksXG4gICAgICAgICAgICAgICAgY2FudmFzID0gYW5ndWxhci5lbGVtZW50KCcuJyArIF8ucmVwbGFjZShmcmFtZXNbMF0uc2Vuc29yVGl0bGUsICcgJywgJycpKVswXSxcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zID0geyB3aWR0aDogY2FudmFzLndpZHRoLCBoZWlnaHQ6IGNhbnZhcy5oZWlnaHQgfTtcblxuICAgICAgICAgICAgZmlsZU5hbWUgPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICsgJ18nICsgdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSArIGZpbGVOYW1lO1xuXG4gICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmRvd25sb2FkR2lmKGZyYW1lcywgZGltZW5zaW9ucykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmIChpc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdDb3JyZWxhdGVkR2lmID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZ0dpZiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgICAgIHZhciBmaWxlID0gbmV3IEJsb2IoW25ldyBVaW50OEFycmF5KGRhdGEpXSwge3R5cGU6ICdpbWFnZS9naWYnfSk7XG4gICAgICAgICAgICAgICAgYS5ocmVmID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgICAgICBhLmRvd25sb2FkID0gZmlsZU5hbWU7XG4gICAgICAgICAgICAgICAgYS5jbGljaygpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgRG93bmxvYWRpbmcgR0lGJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgIGlmIChpc0NvcnJlbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdDb3JyZWxhdGVkR2lmID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZ0dpZiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmdvdG9WaWRlbyA9IGZ1bmN0aW9uIChmbXZSZXN1bHQpIHtcbiAgICAgICAgICAgICR3aW5kb3cub3BlbihlcmlzQ29uZmlnLmZtdi53YXRjaFVybCArIGZtdlJlc3VsdC5pZCwgJ19ibGFuaycpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLm9uVXBWb3RlQ2xpY2sgPSBmdW5jdGlvbiAoJG1kTWVudSwgZXYpIHtcbiAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAvLyB2b3RlIGV4aXN0cywgc28gdW5kbyBpdFxuICAgICAgICAgICAgICAgIGRlbGV0ZVZvdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJG1kTWVudS5vcGVuKGV2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5vbkRvd25Wb3RlQ2xpY2sgPSBmdW5jdGlvbiAoJG1kTWVudSwgZXYpIHtcbiAgICAgICAgICAgIGlmICh2bS52b3RlT2JqLnZvdGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gdm90ZSBleGlzdHMsIHNvIHVuZG8gaXRcbiAgICAgICAgICAgICAgICBkZWxldGVWb3RlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRtZE1lbnUub3Blbihldik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0ub3Blbk1lbnUgPSBmdW5jdGlvbiAoJG1kTWVudSwgZXYpIHtcbiAgICAgICAgICAgICRtZE1lbnUub3Blbihldik7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRFdmVudERhdGEoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY2xlYW4gdXAgYW55IGxlZnRvdmVyIGRhdGEgZnJvbSBhIHByZXZpb3VzbHkgdmlld2VkIGV2ZW50XG4gICAgICAgICAgICBpZiAoY2hhcnRXb3JrZXIpIHtcbiAgICAgICAgICAgICAgICBjaGFydFdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNoYXJ0KSB7XG4gICAgICAgICAgICAgICAgY2hhcnQuZGVzdHJveSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmbXZMYXllcnMuY2xlYXJMYXllcnMoKTtcblxuICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nU3RhdHVzID0gJ1JlcXVlc3RpbmcgRGF0YS4uLic7XG4gICAgICAgICAgICAgICAgdm0uZXZlbnREYXRhID0gbmV3VmFsdWU7XG5cbiAgICAgICAgICAgICAgICAvLyByZXRyaWV2ZSBwbG90IGFuZCBpbWFnZSBkYXRhIGZvciBhY3RpdmUgZXZlbnRcbiAgICAgICAgICAgICAgICB2YXIgdHJhY2tzID0gdm0uZXZlbnREYXRhLmdldExheWVycygpLFxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlcyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgdm0uZXZlbnRQcm9wcyA9IF8ubWFwKHRyYWNrcywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQuZ2V0TGF5ZXJzKClbMF0uZmVhdHVyZS5wcm9wZXJ0aWVzO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdm0uc2VsZWN0ZWRGZWF0dXJlID0gdHJhY2tzWzBdLmdldExheWVycygpWzBdLmZlYXR1cmU7XG5cbiAgICAgICAgICAgICAgICBnZXRFdmVudFZvdGUoKTtcblxuICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUgJiYgdm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmg1VXJsID0gXy5zdGFydHNXaXRoKHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aCwgJ2h0dHAnKSA/IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aCA6IGVyaXNDb25maWcuZXZlbnRTZXJ2ZXIuZmlsZVBhdGhVcmwgKyB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGg7XG4gICAgICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2goZ2V0UGxvdERhdGEodm0uaDVVcmwpKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaChnZXRGcmFtZURhdGEodm0uaDVVcmwpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkcS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBnZXRDb3JyZWxhdGluZ0V2ZW50cygpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuZmVhdHVyZXMgJiYgcmVzdWx0LmZlYXR1cmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29ycmVsYXRpbmdQcm9taXNlcyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlID0gcmVzdWx0LmZlYXR1cmVzWzBdO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGhfMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmlsZVBhdGggPSBfLnN0YXJ0c1dpdGgoZmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aF8yLCAnaHR0cCcpID8gZmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aF8yIDogZXJpc0NvbmZpZy5ldmVudFNlcnZlci5maWxlUGF0aFVybCArIGZlYXR1cmUucHJvcGVydGllcy5maWxlX3BhdGhfMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50UGFyYW1zID0ge307XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uY29ycmVsYXRlZEg1VXJsID0gZmlsZVBhdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50UGFyYW1zW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gPSBmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkICsgJ18yJ107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50UGFyYW1zW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPSBmZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkICsgJ18yJ107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW5nUHJvbWlzZXMucHVzaChnZXRDb3JyZWxhdGluZ0V2ZW50RGF0YShldmVudFBhcmFtcykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ1Byb21pc2VzLnB1c2goZ2V0UGxvdERhdGEoZmlsZVBhdGgsIHRydWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpbmdQcm9taXNlcy5wdXNoKGdldEZyYW1lRGF0YShmaWxlUGF0aCwgdHJ1ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRxLmFsbChjb3JyZWxhdGluZ1Byb21pc2VzKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NvcnJlbGF0aW9uIHByZXNlbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvcnJlbGF0aW5nRXZlbnREYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNDb3JyZWxhdGlvbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0UGxvdERhdGEgPSBfLmZpbmQocGxvdERhdGEsIHsgaXNDb3JyZWxhdGlvbjogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3JyZWxhdGluZ1Bsb3REYXRhID0gXy5maW5kKHBsb3REYXRhLCB7IGlzQ29ycmVsYXRpb246IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5jb3JyZWxhdGVkRXZlbnRQcm9wcyA9IF8ubWFwKGNvcnJlbGF0aW5nRXZlbnREYXRhLmZlYXR1cmVzLCAncHJvcGVydGllcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkICsgJ18xJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5zY2FsZUZpbGUgPSBfLmxhc3QoZmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aF8xLnNwbGl0KCcvJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLmdldFNjYWxlRGF0YSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkICsgJ18yJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5zY2FsZUZpbGUgPSBfLmxhc3QoZmVhdHVyZS5wcm9wZXJ0aWVzLmZpbGVfcGF0aF8yLnNwbGl0KCcvJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLmdldFNjYWxlRGF0YSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdEV2ZW50RGF0YSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NvcnJlbGF0aW9uID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFBsb3REYXRhID0gXy5maW5kKHBsb3REYXRhLCB7IGlzQ29ycmVsYXRpb246IGZhbHNlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5zY2FsZUZpbGUgPSBfLmxhc3Qodm0uc2VsZWN0ZWRGZWF0dXJlLnByb3BlcnRpZXMuZmlsZV9wYXRoLnNwbGl0KCcvJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5nZXRTY2FsZURhdGEoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdEV2ZW50RGF0YSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIC8vIHF1ZXJ5IGZtdiBzZXJ2aWNlIGZvciBhIGNpcmNsZSB3aXRoIGEgcmFkaXVzIG9mIDEwMDAgbWV0ZXJzIGZvciA1IG1pbnV0ZXMgYmVmb3JlIGFuZCBhZnRlciB0aGUgZXZlbnQgdXNpbmcgdm0uc2VsZWN0ZWRGZWF0dXJlIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAvLyB2bS5sb2FkaW5nRk1WID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyB2YXIgcmVjb3JkaW5nc1BhcmFtcyA9IHt9O1xuICAgICAgICAgICAgICAgIC8vIHJlY29yZGluZ3NQYXJhbXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXSA9IHZtLnNlbGVjdGVkRmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGVGaWVsZF07XG4gICAgICAgICAgICAgICAgLy8gcmVjb3JkaW5nc1BhcmFtc1tlcmlzQ29uZmlnLnNlcnZlci5sYXRGaWVsZF0gPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sYXRGaWVsZF07XG4gICAgICAgICAgICAgICAgLy8gcmVjb3JkaW5nc1BhcmFtc1tlcmlzQ29uZmlnLnNlcnZlci5sb25GaWVsZF0gPSB2bS5zZWxlY3RlZEZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb25GaWVsZF07XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyBmbXZTZXJ2aWNlLmdldFJlY29yZGluZ3MocmVjb3JkaW5nc1BhcmFtcykudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIF8uZm9yRWFjaChyZXN1bHQuZGF0YS5kYXRhLCBmdW5jdGlvbiAoZm12UmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB2bS5mbXZSZXN1bHRzLnB1c2goZm12UmVzdWx0KTtcbiAgICAgICAgICAgICAgICAvLyAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gICAgIHZtLmxvYWRpbmdGTVYgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAvLyB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgLy8gICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1VuYWJsZSB0byByZXRyaWV2ZSB2aWRlby4nKS50aGVtZSgnZmFpbC10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XG4gICAgICAgICAgICAgICAgLy8gICAgIHZtLmxvYWRpbmdGTVYgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAvLyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRMYXlvdXRDb21wb25lbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50ID0gXy5maW5kKG5ld1ZhbHVlLCB7IHN0YXRlOiB7IHRlbXBsYXRlTmFtZTogJ2V2ZW50Vmlld2VyJyB9IH0pO1xuICAgICAgICAgICAgICAgIGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5zZXRUaXRsZShldmVudFZpZXdlckxheW91dENvbXBvbmVudC5zdGF0ZS50ZW1wbGF0ZVRpdGxlKTtcblxuICAgICAgICAgICAgICAgIHZtLmV2ZW50Vmlld2VySGVpZ2h0ID0gZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLmhlaWdodDtcbiAgICAgICAgICAgICAgICB2bS5ldmVudFZpZXdlcldpZHRoID0gZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLndpZHRoO1xuXG4gICAgICAgICAgICAgICAgLy8gc2V0IGV2ZW50IGxpc3RlbmVyIGZvciBjb250YWluZXIgcmVzaXplXG4gICAgICAgICAgICAgICAgZXZlbnRWaWV3ZXJMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLm9uKCdyZXNpemUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhICR0aW1lb3V0IHRvIG5vdGlmeSBhbmd1bGFyIG9mIHRoZSBjaGFuZ2VcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0uZXZlbnRWaWV3ZXJIZWlnaHQgPSBldmVudFZpZXdlckxheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0uZXZlbnRWaWV3ZXJXaWR0aCA9IGV2ZW50Vmlld2VyTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJ0LnJlc2l6ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdm0uZXZlbnRWaWV3ZXJIZWlnaHQgLyAyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogdm0uZXZlbnRWaWV3ZXJXaWR0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCdtZXRhZGF0YURpYWxvZ0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHNjb3BlLFxyXG5cdFx0JG1kRGlhbG9nLFxyXG5cdFx0ZXZlbnRNZXRhZGF0YXNcclxuXHQpe1xyXG5cdFx0JHNjb3BlLmV2ZW50TWV0YWRhdGFzID0gZXZlbnRNZXRhZGF0YXM7XHJcblx0XHQkc2NvcGUuaGlkZSA9IGZ1bmN0aW9uKCl7XHJcblx0XHRcdCRtZERpYWxvZy5oaWRlKCk7XHJcblx0XHR9O1xyXG5cdH0pO1xyXG59KSgpO1xyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiBVTkNMQVNTSUZJRURcclxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xyXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ2V2ZW50c0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHNjb3BlLFxyXG4gICAgICAgICR0aW1lb3V0LFxyXG4gICAgICAgICRsb2NhdGlvbixcclxuICAgICAgICBlcmlzQ29uZmlnLFxyXG4gICAgICAgIGVyaXNTZXJ2aWNlLFxyXG4gICAgICAgIHNlYXJjaFNlcnZpY2UsXHJcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxyXG4gICAgICAgIGxlYWZsZXREYXRhLFxyXG4gICAgICAgIG1vbWVudCxcclxuICAgICAgICBMLFxyXG4gICAgICAgICQsXHJcbiAgICAgICAgX1xyXG4gICAgKSB7XHJcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcclxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXHJcbiAgICAgICAgICAgIG1hcCA9IHt9LFxyXG4gICAgICAgICAgICBldmVudHNMYXlvdXRDb21wb25lbnQgPSBudWxsLFxyXG4gICAgICAgICAgICBjdXJySWR4ID0gMCxcclxuICAgICAgICAgICAgZXZlbnRMYXllcnMgPSBbXSxcclxuICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBudWxsLFxyXG4gICAgICAgICAgICBjb25maWRlbmNlID0gMCxcclxuICAgICAgICAgICAgbG9jYXRpb25VbmNlcnRhaW50eSA9IDAsXHJcbiAgICAgICAgICAgIGludGVuc2l0eSA9IHtcclxuICAgICAgICAgICAgICAgIG1pbjogMCxcclxuICAgICAgICAgICAgICAgIG1heDogMFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzbnIgPSB7XHJcbiAgICAgICAgICAgICAgICBtaW46IDAsXHJcbiAgICAgICAgICAgICAgICBtYXg6IDBcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZHVyYXRpb24gPSB7XHJcbiAgICAgICAgICAgICAgICBtaW46IDAsXHJcbiAgICAgICAgICAgICAgICBtYXg6IDBcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgb25seUNvcnJlbGF0aW9ucyA9ICdhbGwnLFxyXG4gICAgICAgICAgICBhbGxFdmVudHMgPSBbXSxcclxuICAgICAgICAgICAgdm90ZXMgPSBzdGF0ZVNlcnZpY2UuZ2V0Vm90ZXMoKSxcclxuICAgICAgICAgICAgZmlsdGVyU3RyYXRlZ3kgPSBxcy5maWx0ZXJTdHJhdGVneSA/IHFzLmZpbHRlclN0cmF0ZWd5IDogZXJpc0NvbmZpZy5maWx0ZXJTdHJhdGVneTtcclxuXHJcbiAgICAgICAgdm0ubW9tZW50ID0gbW9tZW50O1xyXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcclxuICAgICAgICB2bS5lcmlzQ29uZmlnID0gZXJpc0NvbmZpZztcclxuICAgICAgICB2bS5ldmVudHNIZWlnaHQgPSAnJztcclxuICAgICAgICB2bS5ldmVudHNXaWR0aCA9ICcnO1xyXG4gICAgICAgIHZtLm1hcEV2ZW50cyA9IFtdO1xyXG4gICAgICAgIHZtLmxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgIHZtLnNvcnRDb25maWcgPSBzdGF0ZVNlcnZpY2UuZ2V0U29ydENvbmZpZygpO1xyXG5cclxuICAgICAgICB2YXIgYWN0aXZhdGVNYXBFdmVudCA9IGZ1bmN0aW9uIChtYXBFdmVudCkge1xyXG4gICAgICAgICAgICB2YXIgYWN0aXZlTWFwTGF5ZXIgPSBfLmZpbmQoZXZlbnRMYXllcnMsIHsgZmVhdHVyZTogbWFwRXZlbnQgfSk7XHJcbiAgICAgICAgICAgIGlmIChhY3RpdmVNYXBMYXllcikge1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlTWFwTGF5ZXIuc2V0U3R5bGUoeyBjb2xvcjogJyNiMmZmNTknLCBmaWxsT3BhY2l0eTogMC44IH0pO1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlTWFwTGF5ZXIuYnJpbmdUb0Zyb250KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5zaG93UG9wdXAgPSBmdW5jdGlvbiAoJGV2ZW50LCBtYXBFdmVudCkge1xyXG4gICAgICAgICAgICBMLnBvcHVwKHsgYXV0b1BhbjogZmFsc2UgfSlcclxuICAgICAgICAgICAgICAgIC5zZXRMYXRMbmcoTC5sYXRMbmcobWFwRXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sYXRGaWVsZF0sIG1hcEV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9uRmllbGRdKSlcclxuICAgICAgICAgICAgICAgIC5zZXRDb250ZW50KGVyaXNTZXJ2aWNlLmdldExlYWZsZXRQb3B1cENvbnRlbnQobWFwRXZlbnQpKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5PbihtYXApO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZtLmhpZGVQb3B1cCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgbWFwLmNsb3NlUG9wdXAoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5zaG93RXZlbnQgPSBmdW5jdGlvbiAoJGV2ZW50LCBtYXBFdmVudCkge1xyXG4gICAgICAgICAgICAvLyBjbGVhciBvbGQgZXZlbnQgZGF0YVxyXG4gICAgICAgICAgICBpZiAoYWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhY3RpdmVNYXBMYXllciA9IF8uZmluZChldmVudExheWVycywgeyBmZWF0dXJlOiBhY3RpdmVFdmVudCB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChhY3RpdmVNYXBMYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZU1hcExheWVyLnNldFN0eWxlKHtjb2xvcjogYWN0aXZlTWFwTGF5ZXIuZmVhdHVyZS5ldmVudFNvdXJjZS5jb2xvciwgZmlsbE9wYWNpdHk6IDAuMn0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFjdGl2ZU1hcExheWVyLmJyaW5nVG9CYWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEV2ZW50RGF0YShudWxsKTtcclxuICAgICAgICAgICAgbWFwLmNsb3NlUG9wdXAoKTtcclxuICAgICAgICAgICAgbWFwRXZlbnQuc2Nyb2xsVG8gPSBmYWxzZTtcclxuICAgICAgICAgICAgYWN0aXZlRXZlbnQgPSBtYXBFdmVudDtcclxuICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBldmVudCBjdXJyZW50bHkgYmVpbmcgdmlld2VkXHJcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBY3RpdmVFdmVudChhY3RpdmVFdmVudCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5jaGFuZ2VTb3J0ID0gZnVuY3Rpb24gKGNvbCkge1xyXG4gICAgICAgICAgICB2YXIgY3VyclNvcnQgPSBfLmZpbmQodm0uc29ydENvbmZpZywgeyBlbmFibGVkOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHModm0uc29ydENvbmZpZ1tjb2xdLCBjdXJyU29ydCkpIHtcclxuICAgICAgICAgICAgICAgIC8vIGNoYW5nZSBzb3J0IGRpcmVjdGlvblxyXG4gICAgICAgICAgICAgICAgdm0uc29ydENvbmZpZ1tjb2xdLmRpcmVjdGlvbiA9IHZtLnNvcnRDb25maWdbY29sXS5kaXJlY3Rpb24gPT09ICdkZXNjJyA/ICdhc2MnIDogJ2Rlc2MnO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gY2hhbmdlIGNvbHVtblxyXG4gICAgICAgICAgICAgICAgY3VyclNvcnQuZW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdm0uc29ydENvbmZpZ1tjb2xdLmVuYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZtLm1hcEV2ZW50cyA9IF8ub3JkZXJCeSh2bS5tYXBFdmVudHMsIFt2bS5zb3J0Q29uZmlnW2NvbF0uZmllbGRdLCBbdm0uc29ydENvbmZpZ1tjb2xdLmRpcmVjdGlvbl0pO1xyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U29ydENvbmZpZyh2bS5zb3J0Q29uZmlnKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2bS5nZXRTb3J0Q2xhc3MgPSBmdW5jdGlvbiAoY29sKSB7XHJcbiAgICAgICAgICAgIHZhciBjdXJyU29ydCA9IF8uZmluZCh2bS5zb3J0Q29uZmlnLCB7IGVuYWJsZWQ6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyh2bS5zb3J0Q29uZmlnW2NvbF0sIGN1cnJTb3J0KSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJTb3J0LmRpcmVjdGlvbiA9PT0gJ2Rlc2MnID8gJ2ZhIGZhLWFycm93LWRvd24nIDogJ2ZhIGZhLWFycm93LXVwJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gJ2VtcHR5JztcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgbWFwID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRTb3J0Q29uZmlnKHZtLnNvcnRDb25maWcpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgIHZhciBnZXRFdmVudFZvdGVzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBfLmZvckVhY2godm0ubWFwRXZlbnRzLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGxvb2sgZm9yIGV4aXN0aW5nIHZvdGUgZm9yIHRoaXMgZXZlbnRcclxuICAgICAgICAgICAgICAgIGV2ZW50LnZvdGUgPSBfLmZpbmQodm90ZXMsIHsgZGF0YXNldF9pZDogZXZlbnQucHJvcGVydGllcy5kYXRhc2V0X2lkLCBwcm9kdWN0X2lkOiBldmVudC5wcm9wZXJ0aWVzLnByb2R1Y3RfaWQgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQudm90ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXZlbnQudm90ZS52b3RlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC52b3RlLnZvdGUgPSBldmVudC52b3RlLnZvdGUgPT09ICd0cnVlJzsgLy8gdm90ZSB2YWx1ZSBjb21lcyBiYWNrIGFzIGEgc3RyaW5nLCBzbyBjYXN0IHRvIGJvb2xcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQudm90ZS52b3RlQ2xhc3MgPSBldmVudC52b3RlLnZvdGUgPT09IHRydWUgPyAnZmEtdGh1bWJzLXVwJyA6IGV2ZW50LnZvdGUudm90ZSA9PT0gZmFsc2UgPyAnZmEtdGh1bWJzLWRvd24nIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQudm90ZS52b3RlQ29sb3IgPSBldmVudC52b3RlLnZvdGUgPT09IHRydWUgPyAnZ3JlZW4tNzAwJyA6IGV2ZW50LnZvdGUudm90ZSA9PT0gZmFsc2UgPyAncmVkLTcwMCcgOiAnZ3JleS03MDAnO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZmlsdGVyRXZlbnRzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2bS5tYXBFdmVudHMgPSBfLmZpbHRlcihhbGxFdmVudHMsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50RHVyYXRpb24gPSBtb21lbnQuZHVyYXRpb24oJzAwOicgKyBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmR1cmF0aW9uRmllbGRdKS5hc1NlY29uZHMoKTtcclxuICAgICAgICAgICAgICAgIGlmIChvbmx5Q29ycmVsYXRpb25zID09PSAnY29ycmVsYXRlZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQucHJvcGVydGllcy5pc19jb3JyZWxhdGVkICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuY29uZmlkZW5jZUZpZWxkXSA+PSBjb25maWRlbmNlICYmIChldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvY2F0aW9uVW5jZXJ0YWludHlGaWVsZF0gPD0gbG9jYXRpb25VbmNlcnRhaW50eSB8fCBjb25maWRlbmNlICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkXSA9PT0gbnVsbCkgJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0gPj0gaW50ZW5zaXR5Lm1pbiAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA8PSBpbnRlbnNpdHkubWF4ICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGRdID49IHNuci5taW4gJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gPD0gc25yLm1heCAmJiBldmVudER1cmF0aW9uID49IGR1cmF0aW9uLm1pbiAmJiBldmVudER1cmF0aW9uIDw9IGR1cmF0aW9uLm1heDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob25seUNvcnJlbGF0aW9ucyA9PT0gJ25vbmNvcnJlbGF0ZWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFldmVudC5wcm9wZXJ0aWVzLmlzX2NvcnJlbGF0ZWQgJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGRdID49IGNvbmZpZGVuY2UgJiYgKGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkXSA8PSBsb2NhdGlvblVuY2VydGFpbnR5IHx8IGNvbmZpZGVuY2UgJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb2NhdGlvblVuY2VydGFpbnR5RmllbGRdID09PSBudWxsKSAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA+PSBpbnRlbnNpdHkubWluICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaW50ZW5zaXR5RmllbGRdIDw9IGludGVuc2l0eS5tYXggJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gPj0gc25yLm1pbiAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnNuckZpZWxkXSA8PSBzbnIubWF4ICYmIGV2ZW50RHVyYXRpb24gPj0gZHVyYXRpb24ubWluICYmIGV2ZW50RHVyYXRpb24gPD0gZHVyYXRpb24ubWF4O1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChmaWx0ZXJTdHJhdGVneSAhPT0gJ3NlcnZlcicpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGRdID49IGNvbmZpZGVuY2UgJiYgKGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkXSA8PSBsb2NhdGlvblVuY2VydGFpbnR5IHx8IGNvbmZpZGVuY2UgJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb2NhdGlvblVuY2VydGFpbnR5RmllbGRdID09PSBudWxsKSAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA+PSBpbnRlbnNpdHkubWluICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaW50ZW5zaXR5RmllbGRdIDw9IGludGVuc2l0eS5tYXggJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gPj0gc25yLm1pbiAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnNuckZpZWxkXSA8PSBzbnIubWF4ICYmIGV2ZW50RHVyYXRpb24gPj0gZHVyYXRpb24ubWluICYmIGV2ZW50RHVyYXRpb24gPD0gZHVyYXRpb24ubWF4O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIGN1cnJTb3J0ID0gXy5maW5kKHZtLnNvcnRDb25maWcsIHsgZW5hYmxlZDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgdm0ubWFwRXZlbnRzID0gXy5vcmRlckJ5KHZtLm1hcEV2ZW50cywgW2N1cnJTb3J0LmZpZWxkXSwgW2N1cnJTb3J0LmRpcmVjdGlvbl0pO1xyXG5cclxuICAgICAgICAgICAgZ2V0RXZlbnRWb3RlcygpO1xyXG5cclxuICAgICAgICAgICAgLy8gdXBkYXRlIHBhbmVsIHRpdGxlXHJcbiAgICAgICAgICAgIGlmIChldmVudHNMYXlvdXRDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIuc2V0VGl0bGUoZXZlbnRzTGF5b3V0Q29tcG9uZW50LnN0YXRlLnRlbXBsYXRlVGl0bGUgKyAnICgnICsgdm0ubWFwRXZlbnRzLmxlbmd0aCArICcpJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEV2ZW50TGF5ZXJzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgZXZlbnRMYXllcnMgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgaWYgKGFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRMYXllcnNPcmRlcmVkID0gXy5vcmRlckJ5KGV2ZW50TGF5ZXJzLCBbJ2ZlYXR1cmUucHJvcGVydGllcy5ldmVudF90aW1lJ10sIFsnZGVzYyddKTtcclxuICAgICAgICAgICAgICAgIHZhciBhY3RpdmVNYXBFdmVudCA9IF8uZmluZChldmVudExheWVyc09yZGVyZWQsIGZ1bmN0aW9uIChsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGwuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gPT09IGFjdGl2ZUV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSAmJiBsLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID09PSBhY3RpdmVFdmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF07XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGN1cnJJZHggPSBfLmluZGV4T2YoZXZlbnRMYXllcnNPcmRlcmVkLCBhY3RpdmVNYXBFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAvLyB1c2UgYSAkdGltZW91dCB0byBub3RpZnkgYW5ndWxhciBvZiB0aGUgY2hhbmdlXHJcbiAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdm0udG9wSW5kZXggPSBjdXJySWR4IC0gMTtcclxuICAgICAgICAgICAgICAgIH0sIDI1MCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRFdmVudHMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgY3VyclNvcnQgPSBfLmZpbmQodm0uc29ydENvbmZpZywgeyBlbmFibGVkOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICBhbGxFdmVudHMgPSBfLm9yZGVyQnkobmV3VmFsdWUsIFtjdXJyU29ydC5maWVsZF0sIFtjdXJyU29ydC5kaXJlY3Rpb25dKTtcclxuICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBjaGVjayBmb3IgdmFsdWVzIGluIHF1ZXJ5c3RyaW5nIGFuZCBnbyB0byBhbiBldmVudCBpZiBhcHBsaWNhYmxlXHJcbiAgICAgICAgICAgIGlmIChxc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICYmIHFzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0pIHtcclxuICAgICAgICAgICAgICAgIHZhciBwcm9kdWN0SWQgPSBxc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGFzZXRJZCA9IHBhcnNlSW50KHFzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIHByZUV4aXN0aW5nQWN0aXZlRXZlbnQgPSBfLmNsb25lKGFjdGl2ZUV2ZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICBhY3RpdmVFdmVudCA9IF8uZmluZChhbGxFdmVudHMsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID09PSBwcm9kdWN0SWQgJiYgZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPT09IGRhdGFzZXRJZDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUV2ZW50LnNjcm9sbFRvID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXByZUV4aXN0aW5nQWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBldmVudCBjdXJyZW50bHkgYmVpbmcgdmlld2VkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBY3RpdmVFdmVudChhY3RpdmVFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZhdGVNYXBFdmVudChhY3RpdmVFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRGaWx0ZXJTdHJhdGVneSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5ID0gbmV3VmFsdWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRDb25maWRlbmNlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uZmlkZW5jZSA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldExvY2F0aW9uVW5jZXJ0YWludHkoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2NhdGlvblVuY2VydGFpbnR5ID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEludGVuc2l0eSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGludGVuc2l0eSA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRTbnIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzbnIgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RHVyYXRpb24oKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkdXJhdGlvbiA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldE9ubHlDb3JyZWxhdGlvbnMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xyXG4gICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldExheW91dENvbXBvbmVudHMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoIWV2ZW50c0xheW91dENvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgLy8gaGFzbid0IGJlZW4gc2V0IHlldCwgc28gdHJ5IHRvIGZpbmQgaXRcclxuICAgICAgICAgICAgICAgIGV2ZW50c0xheW91dENvbXBvbmVudCA9IF8uZmluZChuZXdWYWx1ZSwge3N0YXRlOiB7dGVtcGxhdGVOYW1lOiAnZXZlbnRzJ319KTtcclxuICAgICAgICAgICAgICAgIGlmIChldmVudHNMYXlvdXRDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBmb3VuZCBpdCwgc28gc2V0IHVwIHZhcnMgYW5kIGV2ZW50c1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIuc2V0VGl0bGUoZXZlbnRzTGF5b3V0Q29tcG9uZW50LnN0YXRlLnRlbXBsYXRlVGl0bGUgKyAnICgnICsgdm0ubWFwRXZlbnRzLmxlbmd0aCArICcpJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZtLmV2ZW50c0hlaWdodCA9IGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLmV2ZW50c1dpZHRoID0gZXZlbnRzTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IGV2ZW50IGxpc3RlbmVyIGZvciBjb250YWluZXIgcmVzaXplXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24gKG1hcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwLmludmFsaWRhdGVTaXplKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXNlIGEgJHRpbWVvdXQgdG8gbm90aWZ5IGFuZ3VsYXIgb2YgdGhlIGNoYW5nZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5ldmVudHNIZWlnaHQgPSBldmVudHNMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLmhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZtLmV2ZW50c1dpZHRoID0gZXZlbnRzTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci53aWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRyaWdnZXIgYSBmYWtlIHdpbmRvdyByZXNpemUgdG8gZm9yY2UgbWQtdmlydXRhbC1yZXBlYXQtY29udGFpbmVyIHRvIHJlZHJhd1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHdpbmRvdykudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0xheW91dENvbXBvbmVudC5jb250YWluZXIub24oJ3Jlc2l6ZScsIHJlc2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5vbignc2hvdycsIHJlc2l6ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldExvYWRpbmdFdmVudHMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2bS5sb2FkaW5nID0gbmV3VmFsdWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QWN0aXZlRXZlbnQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhY3RpdmVFdmVudCA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcclxuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJySWR4ID0gXy5pbmRleE9mKHZtLm1hcEV2ZW50cywgbmV3VmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlLnNjcm9sbFRvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdXNlIGEgJHRpbWVvdXQgdG8gbm90aWZ5IGFuZ3VsYXIgb2YgdGhlIGNoYW5nZVxyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0udG9wSW5kZXggPSBjdXJySWR4IC0gMTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAyNTApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vm90ZXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2b3RlcyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBnZXRFdmVudFZvdGVzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufSkoKTtcclxuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCdnb3RvQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIGVyaXNDb25maWcsXG4gICAgICAgIGVyaXNTZXJ2aWNlLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIEwsXG4gICAgICAgIGxlYWZsZXREYXRhXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKSxcbiAgICAgICAgICAgIG1hcCA9IHt9O1xuXG4gICAgICAgICRzY29wZS5tb2RlID0gJHNjb3BlLiRwYXJlbnQubW9kZTtcbiAgICAgICAgdm0uZXJpc0NvbmZpZyA9IGVyaXNDb25maWc7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLmxhdCA9ICcnO1xuICAgICAgICB2bS5sbmcgPSAnJztcbiAgICAgICAgdm0ubWdycyA9ICcnO1xuICAgICAgICB2bS5sb2NhdGlvbkZvcm1hdCA9IHFzLmxvY2F0aW9uRm9ybWF0ID8gcXMubG9jYXRpb25Gb3JtYXQgOiBlcmlzQ29uZmlnLmRlZmF1bHRMb2NhdGlvbkZvcm1hdDtcblxuICAgICAgICB2YXIgY29udmVydExhdExuZyA9IGZ1bmN0aW9uIChuZXdGb3JtYXQpIHtcbiAgICAgICAgICAgIHJldHVybiBlcmlzU2VydmljZS5jb252ZXJ0TGF0TG5nKHtcbiAgICAgICAgICAgICAgICBsYXQ6IHZtLmxhdCxcbiAgICAgICAgICAgICAgICBsbmc6IHZtLmxuZyxcbiAgICAgICAgICAgICAgICBtZ3JzOiB2bS5tZ3JzLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogdm0ubG9jYXRpb25Gb3JtYXRcbiAgICAgICAgICAgIH0sIG5ld0Zvcm1hdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRHb3RvRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmdvdG8gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZGRMYXRMbmcgPSBjb252ZXJ0TGF0TG5nKCdkZCcpO1xuICAgICAgICAgICAgbWFwLnNldFZpZXcoTC5sYXRMbmcoZGRMYXRMbmcubGF0LCBkZExhdExuZy5sbmcpKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRMb2NhdGlvbkZvcm1hdCA9IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2NhdGlvbkZvcm1hdChmb3JtYXQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIG1hcCA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdm0uc2V0TG9jYXRpb25Gb3JtYXQodm0ubG9jYXRpb25Gb3JtYXQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRMb2NhdGlvbkZvcm1hdCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKHZtLmxhdCAhPT0gJycgJiYgdm0ubG5nICE9PSAnJykgfHwgdm0ubWdycyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29udmVydGVkTGF0TG5nID0gY29udmVydExhdExuZyhuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgICAgdm0ubGF0ID0gY29udmVydGVkTGF0TG5nLmxhdDtcbiAgICAgICAgICAgICAgICB2bS5sbmcgPSBjb252ZXJ0ZWRMYXRMbmcubG5nO1xuICAgICAgICAgICAgICAgIHZtLm1ncnMgPSBjb252ZXJ0ZWRMYXRMbmcubWdycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmxvY2F0aW9uRm9ybWF0ID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuZGlyZWN0aXZlKCdlcmlzR290bycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9nb3RvL2dvdG9UZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdnb3RvQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ2xvY2F0aW9uRm9ybWF0Q29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIGVyaXNDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLFxuICAgICAgICBfXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcblxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICB2bS5sb2NhdGlvbiA9IHtcbiAgICAgICAgICAgIGZvcm1hdDogcXMubG9jYXRpb25Gb3JtYXQgfHwgZXJpc0NvbmZpZy5kZWZhdWx0TG9jYXRpb25Gb3JtYXQsXG4gICAgICAgICAgICBub3J0aDogcXMubiB8fCAnJyxcbiAgICAgICAgICAgIHNvdXRoOiBxcy5zIHx8ICcnLFxuICAgICAgICAgICAgZWFzdDogcXMuZSB8fCAnJyxcbiAgICAgICAgICAgIHdlc3Q6IHFzLncgfHwgJycsXG4gICAgICAgICAgICBtZ3JzTkU6IHFzLm5lIHx8ICcnLFxuICAgICAgICAgICAgbWdyc1NXOiBxcy5zdyB8fCAnJ1xuICAgICAgICB9O1xuICAgICAgICB2bS5tb2RlID0gJHNjb3BlLiRwYXJlbnQubW9kZTtcblxuICAgICAgICB2bS5zZXRGb3JtYXQgPSBmdW5jdGlvbiAobmV3Rm9ybWF0KSB7XG4gICAgICAgICAgICB2YXIgbmUsIHN3O1xuICAgICAgICAgICAgc3dpdGNoICh2bS5sb2NhdGlvbi5mb3JtYXQpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdkZCc6XG4gICAgICAgICAgICAgICAgICAgIHN3ID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JEREJyb2FkY2FzdCh2bS5sb2NhdGlvbi5zb3V0aCwgdm0ubG9jYXRpb24ud2VzdCk7XG4gICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JEREJyb2FkY2FzdCh2bS5sb2NhdGlvbi5ub3J0aCwgdm0ubG9jYXRpb24uZWFzdCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Rtcyc6XG4gICAgICAgICAgICAgICAgICAgIHN3ID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3Qodm0ubG9jYXRpb24uc291dGgsIHZtLmxvY2F0aW9uLndlc3QpO1xuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KHZtLmxvY2F0aW9uLm5vcnRoLCB2bS5sb2NhdGlvbi5lYXN0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbWdycyc6XG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5sb2NhdGlvbi5tZ3JzU1cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3ID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KHZtLmxvY2F0aW9uLm1ncnNTVyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHZtLmxvY2F0aW9uLm1ncnNORSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmUgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvck1HUlNCcm9hZGNhc3Qodm0ubG9jYXRpb24ubWdyc05FKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLnNvdXRoID0gJyc7XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi53ZXN0ID0gJyc7XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5ub3J0aCA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24uZWFzdCA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ubWdyc05FID0gJyc7XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5tZ3JzU1cgPSAnJztcblxuICAgICAgICAgICAgc3dpdGNoIChuZXdGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdkZCc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdyAmJiBuZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24uc291dGggPSBzdy5kZFswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLndlc3QgPSBzdy5kZFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLm5vcnRoID0gbmUuZGRbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5lYXN0ID0gbmUuZGRbMV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZG1zJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN3ICYmIG5lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5zb3V0aCA9IHN3LmRtc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLndlc3QgPSBzdy5kbXNbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5ub3J0aCA9IG5lLmRtc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLmVhc3QgPSBuZS5kbXNbMV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbWdycyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdyAmJiBuZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24ubWdyc1NXID0gc3cubWdycyB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLm1ncnNORSA9IG5lLm1ncnMgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLmZvcm1hdCA9IG5ld0Zvcm1hdDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBCQm94UGFyYW1zKHZtLmxvY2F0aW9uKTtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2NhdGlvbkZvcm1hdChuZXdGb3JtYXQpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TWFwQkJveCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbiA9IHt9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuZGlyZWN0aXZlKCdlcmlzTG9jYXRpb25Gb3JtYXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvbG9jYXRpb25Gb3JtYXQvbG9jYXRpb25Gb3JtYXRUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdsb2NhdGlvbkZvcm1hdENvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHt9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4gVU5DTEFTU0lGSUVEXHJcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcclxuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cclxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCdtYXBDb250cm9sbGVyJywgZnVuY3Rpb24gKFxyXG4gICAgICAgICRzY29wZSxcclxuICAgICAgICAkd2luZG93LFxyXG4gICAgICAgICRsb2NhdGlvbixcclxuICAgICAgICAkdGltZW91dCxcclxuICAgICAgICAkbWRUb2FzdCxcclxuICAgICAgICAkcSxcclxuICAgICAgICBlcmlzQ29uZmlnLFxyXG4gICAgICAgIGVyaXNTZXJ2aWNlLFxyXG4gICAgICAgIHN0YXRlU2VydmljZSxcclxuICAgICAgICBzZWFyY2hTZXJ2aWNlLFxyXG4gICAgICAgIGZtdlNlcnZpY2UsXHJcbiAgICAgICAgbGVhZmxldERhdGEsXHJcbiAgICAgICAgbW9tZW50LFxyXG4gICAgICAgIHRva21sLFxyXG4gICAgICAgIEwsXHJcbiAgICAgICAgX1xyXG4gICAgKSB7XHJcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcclxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXHJcbiAgICAgICAgICAgIG1hcCA9IHt9LFxyXG4gICAgICAgICAgICBtYXBab29tID0gcXMuem9vbSA/IHBhcnNlSW50KHFzLnpvb20pIDogZXJpc0NvbmZpZy5tYXBDZW50ZXIuem9vbSxcclxuICAgICAgICAgICAgbWFwTGF5ZXJzID0gbmV3IEwuRmVhdHVyZUdyb3VwKCksXHJcbiAgICAgICAgICAgIHN0cmlrZUxheWVycyA9IG5ldyBMLkZlYXR1cmVHcm91cCgpLFxyXG4gICAgICAgICAgICBmbXZMYXllcnMgPSBuZXcgTC5GZWF0dXJlR3JvdXAoKSxcclxuICAgICAgICAgICAgb3ZlcmxheXMgPSBxcy5vdmVybGF5cyB8fCBbXSxcclxuICAgICAgICAgICAgZXZlbnRzID0gW10sXHJcbiAgICAgICAgICAgIGZpbHRlcmVkRXZlbnRzID0gW10sXHJcbiAgICAgICAgICAgIHZvdGVGaWx0ZXIgPSBxcy52b3RlRmlsdGVyID8gcXMudm90ZUZpbHRlciA6IG51bGwsXHJcbiAgICAgICAgICAgIHZvdGVkRXZlbnRzID0gW10sXHJcbiAgICAgICAgICAgIHRvdGFsVm90ZXMgPSBxcy50b3RhbFZvdGVzID8gcXMudG90YWxWb3RlcyA6IDAsXHJcbiAgICAgICAgICAgIHNvdXJjZXMgPSBbXSxcclxuICAgICAgICAgICAgdHlwZXMgPSBbXSxcclxuICAgICAgICAgICAgY29uZmlkZW5jZSA9IDAsXHJcbiAgICAgICAgICAgIGxvY2F0aW9uVW5jZXJ0YWludHkgPSAwLFxyXG4gICAgICAgICAgICBpbnRlbnNpdHkgPSB7XHJcbiAgICAgICAgICAgICAgICBtaW46IDAsXHJcbiAgICAgICAgICAgICAgICBtYXg6IDBcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc25yID0ge1xyXG4gICAgICAgICAgICAgICAgbWluOiAwLFxyXG4gICAgICAgICAgICAgICAgbWF4OiAwXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgbWluOiAwLFxyXG4gICAgICAgICAgICAgICAgbWF4OiAwXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNvdXJjZVR5cGUgPSBxcy5zb3VyY2VUeXBlLFxyXG4gICAgICAgICAgICBtYXBMYXlvdXRDb21wb25lbnQgPSBudWxsLFxyXG4gICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gcXMub25seUNvcnJlbGF0aW9ucyA/IHFzLm9ubHlDb3JyZWxhdGlvbnMgOiBlcmlzQ29uZmlnLm9ubHlDb3JyZWxhdGlvbnMsXHJcbiAgICAgICAgICAgIGNvdW50cnlMaXN0ID0gW10sXHJcbiAgICAgICAgICAgIGNvdW50cmllcyA9IHFzLmNvdW50cmllcyA/IHFzLmNvdW50cmllcyA6IFtdLFxyXG4gICAgICAgICAgICBzZW5zb3JzID0gcXMuc2Vuc29ycyA/IHFzLnNlbnNvcnMgOiBbXSxcclxuICAgICAgICAgICAgZmlsdGVyU3RyYXRlZ3kgPSBxcy5maWx0ZXJTdHJhdGVneSA/IHFzLmZpbHRlclN0cmF0ZWd5IDogZXJpc0NvbmZpZy5maWx0ZXJTdHJhdGVneSxcclxuICAgICAgICAgICAgc3RyaWtlVmlzaWJpbGl0eSA9IHFzLnN0cmlrZVZpc2liaWxpdHkgPyBxcy5zdHJpa2VWaXNpYmlsaXR5IDogZXJpc0NvbmZpZy5zdHJpa2VWaXNpYmlsaXR5LFxyXG4gICAgICAgICAgICBmbXZGaWx0ZXIgPSBxcy5mbXZGaWx0ZXIgPyBxcy5mbXZGaWx0ZXIgOiBudWxsLFxyXG4gICAgICAgICAgICBlbGxpcHNlTGF5ZXIgPSBuZXcgTC5GZWF0dXJlR3JvdXAoKTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBvdmVybGF5cyA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgb3ZlcmxheXMgPSBbb3ZlcmxheXNdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdm0ubWFwSGVpZ2h0ID0gMDtcclxuICAgICAgICB2bS5sb2FkZXJIZWlnaHQgPSAnJztcclxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XHJcbiAgICAgICAgdm0udHJhY2tMYXllcnMgPSBudWxsO1xyXG4gICAgICAgIHZtLmFjdGl2ZUV2ZW50ID0gbnVsbDtcclxuICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmIChxcy5uIHx8IHFzLm5lKSB7XHJcbiAgICAgICAgICAgIHZhciBkZEJvdW5kcyA9IGVyaXNTZXJ2aWNlLmdldEREQm91bmRzKHtcclxuICAgICAgICAgICAgICAgIGZvcm1hdDogcXMubG9jYXRpb25Gb3JtYXQsXHJcbiAgICAgICAgICAgICAgICBub3J0aDogcXMubiA/IHBhcnNlRmxvYXQocXMubikgOiAnJyxcclxuICAgICAgICAgICAgICAgIHNvdXRoOiBxcy5zID8gcGFyc2VGbG9hdChxcy5zKSA6ICcnLFxyXG4gICAgICAgICAgICAgICAgZWFzdDogcXMuZSA/IHBhcnNlRmxvYXQocXMuZSkgOiAnJyxcclxuICAgICAgICAgICAgICAgIHdlc3Q6IHFzLncgPyBwYXJzZUZsb2F0KHFzLncpIDogJycsXHJcbiAgICAgICAgICAgICAgICBtZ3JzTkU6IHFzLm5lIHx8ICcnLFxyXG4gICAgICAgICAgICAgICAgbWdyc1NXOiBxcy5zdyB8fCAnJ1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBzb3V0aFdlc3QgPSBMLmxhdExuZyhkZEJvdW5kc1swXVswXSwgZGRCb3VuZHNbMF1bMV0pLFxyXG4gICAgICAgICAgICAgICAgbm9ydGhFYXN0ID0gTC5sYXRMbmcoZGRCb3VuZHNbMV1bMF0sIGRkQm91bmRzWzFdWzFdKSxcclxuICAgICAgICAgICAgICAgIGJvdW5kcyA9IEwubGF0TG5nQm91bmRzKHNvdXRoV2VzdCwgbm9ydGhFYXN0KSxcclxuICAgICAgICAgICAgICAgIGNlbnRlciA9IGJvdW5kcy5nZXRDZW50ZXIoKTtcclxuXHJcbiAgICAgICAgICAgIHZtLmNlbnRlciA9IHtcclxuICAgICAgICAgICAgICAgIGxhdDogY2VudGVyLmxhdCxcclxuICAgICAgICAgICAgICAgIGxuZzogY2VudGVyLmxuZyxcclxuICAgICAgICAgICAgICAgIHpvb206IG1hcFpvb21cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2bS5jZW50ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0TWFwQ2VudGVyKCkgfHwgZXJpc0NvbmZpZy5tYXBDZW50ZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB1aS1sZWFmbGV0IGRlZmF1bHRzXHJcbiAgICAgICAgdm0uZGVmYXVsdHMgPSB7XHJcbiAgICAgICAgICAgIGNyczogZXJpc0NvbmZpZy5kZWZhdWx0UHJvamVjdGlvbixcclxuICAgICAgICAgICAgem9vbUNvbnRyb2w6IHRydWUsXHJcbiAgICAgICAgICAgIGF0dHJpYnV0aW9uQ29udHJvbDogZmFsc2UsXHJcbiAgICAgICAgICAgIGNvbnRyb2xzOiB7XHJcbiAgICAgICAgICAgICAgICBsYXllcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wcmlnaHQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbGxhcHNlZDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gdWktbGVhZmxldCBiYXNlbGF5ZXJzIG9iamVjdFxyXG4gICAgICAgIHZtLmxheWVycyA9IF8uY2xvbmVEZWVwKGVyaXNDb25maWcubGF5ZXJzKTtcclxuXHJcbiAgICAgICAgdmFyIHVwZGF0ZU92ZXJsYXlzID0gZnVuY3Rpb24gKGxheWVycykge1xyXG4gICAgICAgICAgICBsYXllcnMgPSBsYXllcnMgfHwgbnVsbDtcclxuICAgICAgICAgICAgdmFyIGRvVXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKG92ZXJsYXlzLCBmdW5jdGlvbiAob3ZlcmxheUlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hcE92ZXJsYXkgPSBsYXllcnMub3ZlcmxheXNbb3ZlcmxheUlkXTtcclxuICAgICAgICAgICAgICAgICAgICBtYXAuYWRkTGF5ZXIobWFwT3ZlcmxheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwT3ZlcmxheS5icmluZ1RvRnJvbnQoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAobGF5ZXJzKSB7XHJcbiAgICAgICAgICAgICAgICBkb1VwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TGF5ZXJzKCkudGhlbihmdW5jdGlvbiAobWFwTGF5ZXJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXJzID0gXy5jbG9uZURlZXAobWFwTGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICBkb1VwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgdXBkYXRlQmFzZWxheWVyID0gZnVuY3Rpb24gKGxheWVyKSB7XHJcbiAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldExheWVycygpLnRoZW4oZnVuY3Rpb24gKGxheWVycykge1xyXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGxheWVycy5iYXNlbGF5ZXJzLCBmdW5jdGlvbiAobGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBtYXAucmVtb3ZlTGF5ZXIobGF5ZXIpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBtYXAuYWRkTGF5ZXIobGF5ZXJzLmJhc2VsYXllcnNbbGF5ZXIuaWRdKTtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZU92ZXJsYXlzKGxheWVycyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBtZXJnZVByb3BzID0gZnVuY3Rpb24gKGZlYXR1cmUsIGxheWVyKSB7XHJcbiAgICAgICAgICAgIHZhciBhY3RpdmVFdmVudCA9IHN0YXRlU2VydmljZS5nZXRBY3RpdmVFdmVudCgpO1xyXG4gICAgICAgICAgICBsYXllci5mZWF0dXJlLnByb3BlcnRpZXMgPSBmZWF0dXJlLnByb3BlcnRpZXM7XHJcbiAgICAgICAgICAgIGlmIChhY3RpdmVFdmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gPT09IGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdICYmIGFjdGl2ZUV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSA9PT0gbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0pIHtcclxuICAgICAgICAgICAgICAgIF8ubWVyZ2UobGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzLCBhY3RpdmVFdmVudC5wcm9wZXJ0aWVzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbGF5ZXI7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHNob3dFdmVudFRyYWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAvLyBpZiAobWFwLmdldFpvb20oKSA+IDEwKSB7XHJcbiAgICAgICAgICAgIC8vICAgICB2bS5sb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgICAgLy8gZ2V0IHRyYWNrcyBmcm9tIGV2ZW50XHJcbiAgICAgICAgICAgIHZhciBldmVudFBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgICBldmVudFBhcmFtc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID0gdm0uYWN0aXZlRXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdO1xyXG4gICAgICAgICAgICBldmVudFBhcmFtc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID0gdm0uYWN0aXZlRXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdO1xyXG4gICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldEV2ZW50VHJhY2tzKGV2ZW50UGFyYW1zKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBkcmF3IHRoZSB0cmFja3NcclxuICAgICAgICAgICAgICAgIHZhciB0cmFja0xheWVycyA9IG5ldyBMLkZlYXR1cmVHcm91cCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGdlb0pTT04gPSBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZTBJZHggPSAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZTFJZHggPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChkYXRhLmZlYXR1cmVzLCBmdW5jdGlvbiAoZmVhdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0cmFja0NvbG9yID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFja0NvbG9yID0gXy5maW5kKGVyaXNDb25maWcuc291cmNlcywgeyBpZGVudGl0eTogdHJ1ZSB9KS5jaGFydENvbG9yc1tzb3VyY2UwSWR4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlMElkeCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrQ29sb3IgPSBfLmZpbmQoZXJpc0NvbmZpZy5zb3VyY2VzLCB7aWRlbnRpdHk6IGZhbHNlIH0pLmNoYXJ0Q29sb3JzW3NvdXJjZTFJZHhdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UxSWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSBmZWF0dXJlIGdlb21ldHJ5IHdoZW4gYXZhaWxhYmxlLCBvdGhlcndpc2UgdXNlIHRoZSBmZWF0dXJlIGxhdC9sb24gcG9pbnQgdG8gY3JlYXRlIGEgZ2VvbWV0cnlcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5nZW9tZXRyeSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9KU09OID0gTC5nZW9Kc29uKGZlYXR1cmUuZ2VvbWV0cnksIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7IGNvbG9yOiB0cmFja0NvbG9yIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkVhY2hGZWF0dXJlOiBmdW5jdGlvbiAoZmVhdHVyZURhdGEsIGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIgPSBtZXJnZVByb3BzKGZlYXR1cmUsIGxheWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludFRvTGF5ZXI6IGZ1bmN0aW9uIChmZWF0dXJlLCBsYXRsbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS50eXBlID09PSAnUG9pbnQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMLmNpcmNsZU1hcmtlcihsYXRsbmcsIHsgY29sb3I6IHRyYWNrQ29sb3IsIHN0cm9rZTogZmFsc2UsIGZpbGxPcGFjaXR5OiAxLCByYWRpdXM6IDUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2tMYXllcnMuYWRkTGF5ZXIoZ2VvSlNPTik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxhdGxuZyA9IEwubGF0TG5nKGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sYXRGaWVsZF0sIGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb25GaWVsZF0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhdGxuZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNpcmNsZU1hcmtlciA9IEwuY2lyY2xlTWFya2VyKGxhdGxuZywgeyBjb2xvcjogdm0uYWN0aXZlRXZlbnQuZXZlbnRTb3VyY2UuY29sb3IgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTiA9IEwuZ2VvSnNvbihjaXJjbGVNYXJrZXIudG9HZW9KU09OKCksIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGREYXRhOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaXJjbGVNYXJrZXIudG9HZW9KU09OKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludFRvTGF5ZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNpcmNsZU1hcmtlcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRWFjaEZlYXR1cmU6IGZ1bmN0aW9uIChmZWF0dXJlRGF0YSwgbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIgPSBtZXJnZVByb3BzKGZlYXR1cmUsIGxheWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrTGF5ZXJzLmFkZExheWVyKGdlb0pTT04pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChnZW9KU09OKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04uZWFjaExheWVyKGZ1bmN0aW9uIChsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZmVhdHVyZS5ldmVudFNvdXJjZSA9IF8uZmluZChlcmlzQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXX0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZmVhdHVyZS5ldmVudFR5cGUgPSBfLmZpbmQoZXJpc0NvbmZpZy50eXBlcywgeyB2YWx1ZTogbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnR5cGVGaWVsZF0gfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9KU09OLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5sYXllci5iaW5kUG9wdXAoZXJpc1NlcnZpY2UuZ2V0TGVhZmxldFBvcHVwQ29udGVudChlLmxheWVyLmZlYXR1cmUpLCB7ICdvZmZzZXQnOiBMLnBvaW50KDAsIC0xMCksICdhdXRvUGFuJzogZmFsc2UgfSkub3BlblBvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9KU09OLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLmxheWVyLmNsb3NlUG9wdXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKF8ua2V5cyh0cmFja0xheWVycy5nZXRCb3VuZHMoKSkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudERhdGEodHJhY2tMYXllcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS50cmFja0xheWVycykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgb3RoZXIgdHJhY2tzIGJlZm9yZSBhZGRpbmcgbmV3IG9uZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgdm0udHJhY2tMYXllcnMuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY2xvbmUgdHJhY2tMYXllcnMgZm9yIHVzZSBlbHNld2hlcmUgdG8gYXZvaWQgdHJpZ2dlcmluZ1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFuIGFuZ3VsYXIgd2F0Y2ggdXBkYXRlXHJcbiAgICAgICAgICAgICAgICAgICAgdm0udHJhY2tMYXllcnMgPSBfLmNsb25lRGVlcCh0cmFja0xheWVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hcC5nZXRab29tKCkgPiAxMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMuYWRkTGF5ZXIodm0udHJhY2tMYXllcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgRHJhd2luZyBUcmFja3M6IEdlb21ldHJ5IGFuZCBMYXQvTG9uIHZhbHVlcyBhcmUgbnVsbC4nKS50aGVtZSgnd2Fybi10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyB2bS5sb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBmaWx0ZXJFdmVudEJ5VHlwZSA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICBpZiAodHlwZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKF8uZmluZCh0eXBlcywgeyB2YWx1ZTogZXZlbnQuZmVhdHVyZS5ldmVudFR5cGUudmFsdWUgfSkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZmlsdGVyRXZlbnRCeVNlbnNvciA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICBpZiAoc2Vuc29ycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoXy5pbmRleE9mKHNlbnNvcnMsIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zZW5zb3JGaWVsZF0pID4gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgZmlsdGVyRXZlbnRzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgbWFwQm91bmRzID0gc3RhdGVTZXJ2aWNlLmdldE1hcEJvdW5kcygpO1xyXG4gICAgICAgICAgICBmaWx0ZXJlZEV2ZW50cyA9IF8uZmlsdGVyKGV2ZW50cywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmV0dXJuVmFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGlmIChmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgYnkgY29ycmVsYXRpb24sIHR5cGUsIGFuZCBzZW5zb3JcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWwgPSBvbmx5Q29ycmVsYXRpb25zID09PSAnY29ycmVsYXRlZCcgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC5mZWF0dXJlLnByb3BlcnRpZXMuaXNfY29ycmVsYXRlZCAmJiBmaWx0ZXJFdmVudEJ5VHlwZShldmVudCkgJiYgZmlsdGVyRXZlbnRCeVNlbnNvcihldmVudCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID09PSAnbm9uY29ycmVsYXRlZCcgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIWV2ZW50LmZlYXR1cmUucHJvcGVydGllcy5pc19jb3JyZWxhdGVkICYmIGZpbHRlckV2ZW50QnlUeXBlKGV2ZW50KSAmJiBmaWx0ZXJFdmVudEJ5U2Vuc29yKGV2ZW50KSA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJFdmVudEJ5VHlwZShldmVudCkgJiYgZmlsdGVyRXZlbnRCeVNlbnNvcihldmVudCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbHRlciBieSBjb3JyZWxhdGlvbiwgY29uZmlkZW5jZSwgbG9jYXRpb25VbmNlcnRhaW50eSwgaW50ZW5zaXR5LCBzbnIsIGR1cmF0aW9uLCBtYXAgYm91bmRzLCB0eXBlLCBhbmQgc2Vuc29yXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGV2ZW50RHVyYXRpb24gPSBtb21lbnQuZHVyYXRpb24oJzAwOicgKyBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZHVyYXRpb25GaWVsZF0pLmFzU2Vjb25kcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblZhbCA9IG9ubHlDb3JyZWxhdGlvbnMgPT09ICdjb3JyZWxhdGVkJyA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmZlYXR1cmUucHJvcGVydGllcy5pc19jb3JyZWxhdGVkICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGRdID49IGNvbmZpZGVuY2UgJiYgKGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb2NhdGlvblVuY2VydGFpbnR5RmllbGRdIDw9IGxvY2F0aW9uVW5jZXJ0YWludHkgfHwgY29uZmlkZW5jZSAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkXSA9PT0gbnVsbCkgJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA+PSBpbnRlbnNpdHkubWluICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0gPD0gaW50ZW5zaXR5Lm1heCAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGRdID49IHNuci5taW4gJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnNuckZpZWxkXSA8PSBzbnIubWF4ICYmIGV2ZW50RHVyYXRpb24gPj0gZHVyYXRpb24ubWluICYmIGV2ZW50RHVyYXRpb24gPD0gZHVyYXRpb24ubWF4ICYmIG1hcEJvdW5kcy5jb250YWlucyhldmVudC5fbGF0bG5nKSAmJiBmaWx0ZXJFdmVudEJ5VHlwZShldmVudCkgJiYgZmlsdGVyRXZlbnRCeVNlbnNvcihldmVudCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID09PSAnbm9uY29ycmVsYXRlZCcgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIWV2ZW50LmZlYXR1cmUucHJvcGVydGllcy5pc19jb3JyZWxhdGVkICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGRdID49IGNvbmZpZGVuY2UgJiYgKGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb2NhdGlvblVuY2VydGFpbnR5RmllbGRdIDw9IGxvY2F0aW9uVW5jZXJ0YWludHkgfHwgY29uZmlkZW5jZSAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9jYXRpb25VbmNlcnRhaW50eUZpZWxkXSA9PT0gbnVsbCkgJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA+PSBpbnRlbnNpdHkubWluICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0gPD0gaW50ZW5zaXR5Lm1heCAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGRdID49IHNuci5taW4gJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnNuckZpZWxkXSA8PSBzbnIubWF4ICYmIGV2ZW50RHVyYXRpb24gPj0gZHVyYXRpb24ubWluICYmIGV2ZW50RHVyYXRpb24gPD0gZHVyYXRpb24ubWF4ICYmIG1hcEJvdW5kcy5jb250YWlucyhldmVudC5fbGF0bG5nKSAmJiBmaWx0ZXJFdmVudEJ5VHlwZShldmVudCkgJiYgZmlsdGVyRXZlbnRCeVNlbnNvcihldmVudCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmNvbmZpZGVuY2VGaWVsZF0gPj0gY29uZmlkZW5jZSAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaW50ZW5zaXR5RmllbGRdID49IGludGVuc2l0eS5taW4gJiYgZXZlbnQuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA8PSBpbnRlbnNpdHkubWF4ICYmIGV2ZW50LmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gPj0gc25yLm1pbiAmJiBldmVudC5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGRdIDw9IHNuci5tYXggJiYgZXZlbnREdXJhdGlvbiA+PSBkdXJhdGlvbi5taW4gJiYgZXZlbnREdXJhdGlvbiA8PSBkdXJhdGlvbi5tYXggJiYgbWFwQm91bmRzLmNvbnRhaW5zKGV2ZW50Ll9sYXRsbmcpICYmIGZpbHRlckV2ZW50QnlUeXBlKGV2ZW50KSAmJiBmaWx0ZXJFdmVudEJ5U2Vuc29yKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocmV0dXJuVmFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZtdkZpbHRlciA9PT0gJ2VuYWJsZWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYXNGTVYgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGZtdkxheWVycy5nZXRMYXllcnMoKSwgZnVuY3Rpb24gKGZtdikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEwubGF0TG5nQm91bmRzKGZtdi5fbGF0bG5ncykuY29udGFpbnMoZXZlbnQuX2xhdGxuZykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMuYWRkTGF5ZXIoZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0ZNViA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBleGl0IGZvckVhY2ggbG9vcFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNGTVYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcExheWVycy5yZW1vdmVMYXllcihldmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWwgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcExheWVycy5hZGRMYXllcihldmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMucmVtb3ZlTGF5ZXIoZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiByZXR1cm5WYWw7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RXZlbnRzKF8ubWFwKGZpbHRlcmVkRXZlbnRzLCAnZmVhdHVyZScpKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgdXBkYXRlU3RyaWtlcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc3RyaWtlTGF5ZXJzLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIGlmIChzdHJpa2VWaXNpYmlsaXR5ID09PSAndmlzaWJsZScpIHtcclxuICAgICAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0U3RyaWtlcygpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZ2VvSlNPTiA9IEwuZ2VvSnNvbihkYXRhLmZlYXR1cmVzLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50VG9MYXllcjogZnVuY3Rpb24gKGZlYXR1cmUsIGxhdGxuZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEwuY2lyY2xlTWFya2VyKGxhdGxuZywgeyBjb2xvcjogJyNmZmQ2MDAnLCBzdHJva2U6IGZhbHNlLCBmaWxsT3BhY2l0eTogMSwgcmFkaXVzOiA1LCBjbGFzc05hbWU6ICdzdHJpa2UtbWFya2VyJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGdlb0pTT04ub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUubGF5ZXIuYmluZFBvcHVwKGVyaXNTZXJ2aWNlLmdldFN0cmlrZVBvcHVwQ29udGVudChlLmxheWVyLmZlYXR1cmUpLCB7ICdvZmZzZXQnOiBMLnBvaW50KDAsIC0xMCksICdhdXRvUGFuJzogZmFsc2UgfSkub3BlblBvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ2VvSlNPTi5vbignbW91c2VvdXQnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLmxheWVyLmNsb3NlUG9wdXAoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBnZW9KU09OLmVhY2hMYXllcihmdW5jdGlvbiAobGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWtlTGF5ZXJzLmFkZExheWVyKGxheWVyKS5icmluZ1RvQmFjaygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgdXBkYXRlRXZlbnRzID0gXy5kZWJvdW5jZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGV2ZW50cyA9IFtdO1xyXG4gICAgICAgICAgICBtYXBMYXllcnMuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgaWYgKHNvdXJjZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0ZSBldmVudHMnKTtcclxuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExvYWRpbmdFdmVudHModm0ubG9hZGluZyk7XHJcbiAgICAgICAgICAgICAgICB2YXIgaGFuZGxlRGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuZmVhdHVyZXMgJiYgZGF0YS5mZWF0dXJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRTZW5zb3JMaXN0KF8ub3JkZXJCeShfLnVuaXEoXy5tYXAoZGF0YS5mZWF0dXJlcywgJ3Byb3BlcnRpZXMuJyArIGVyaXNDb25maWcuc2VydmVyLnNlbnNvckZpZWxkKSkpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdlb0pTT04gPSBMLmdlb0pzb24oZGF0YS5mZWF0dXJlcywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRUb0xheWVyOiBmdW5jdGlvbiAoZmVhdHVyZSwgbGF0bG5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNvdXJjZSA9IF8uZmluZChlcmlzQ29uZmlnLnNvdXJjZXMsIHsgaWRlbnRpdHk6IGZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pZGVudGl0eUZpZWxkXX0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvciA9IHNvdXJjZSA/IHNvdXJjZS5jb2xvciA6ICcjNTU1JztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEwuY2lyY2xlTWFya2VyKGxhdGxuZywgeyBjb2xvcjogY29sb3IgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9KU09OLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodm0uYWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYWN0aXZlTWFwRXZlbnQgPSBfLmZpbmQoZXZlbnRzLCB7IGZlYXR1cmU6IHZtLmFjdGl2ZUV2ZW50IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3RpdmVNYXBFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVNYXBFdmVudC5zZXRTdHlsZSh7IGNvbG9yOiBhY3RpdmVNYXBFdmVudC5mZWF0dXJlLmV2ZW50U291cmNlLmNvbG9yLCBmaWxsT3BhY2l0eTogMC4yIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhY3RpdmVNYXBFdmVudC5icmluZ1RvQmFjaygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXBFdmVudCA9IGUubGF5ZXIuZmVhdHVyZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcEV2ZW50LnNjcm9sbFRvID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRBY3RpdmVFdmVudChtYXBFdmVudCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9KU09OLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5sYXllci5iaW5kUG9wdXAoZXJpc1NlcnZpY2UuZ2V0TGVhZmxldFBvcHVwQ29udGVudChlLmxheWVyLmZlYXR1cmUpLCB7ICdvZmZzZXQnOiBMLnBvaW50KDAsIC0xMCksICdhdXRvUGFuJzogZmFsc2UgfSkub3BlblBvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9KU09OLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLmxheWVyLmNsb3NlUG9wdXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlb0pTT04uZWFjaExheWVyKGZ1bmN0aW9uIChsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID09PSB2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gJiYgbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPT09IHZtLmFjdGl2ZUV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXllci5mZWF0dXJlLmFjdGl2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvdW50cnlDb2RlcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGNvdW50cmllcywgZnVuY3Rpb24gKGNvdW50cnlJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb3VudHJ5T2JqID0gXy5maW5kKGNvdW50cnlMaXN0LCB7IGdpZDogY291bnRyeUlkIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb3VudHJ5T2JqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50cnlDb2Rlcy5wdXNoKGNvdW50cnlPYmouY2MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyIGJ5IGNvdW50cmllcyBhbmQgdm90ZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoY291bnRyaWVzLmxlbmd0aCA+IDAgJiYgXy5pbmRleE9mKGNvdW50cnlDb2RlcywgbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzLmNvdW50cnlfY29kZSkgPiAtMSkgfHwgY291bnRyaWVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVpdGhlciBldmVudCBmYWxscyB3aXRoaW4gY291bnRyeSBvciBubyBjb3VudHJ5IGZpbHRlciB3YXMgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZmVhdHVyZS5ldmVudFNvdXJjZSA9IF8uZmluZChlcmlzQ29uZmlnLnNvdXJjZXMsIHtpZGVudGl0eTogbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmlkZW50aXR5RmllbGRdfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZmVhdHVyZS5ldmVudFR5cGUgPSBfLmZpbmQoZXJpc0NvbmZpZy50eXBlcywge3ZhbHVlOiBsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIudHlwZUZpZWxkXX0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2b3RlRmlsdGVyID09PSAnZW5hYmxlZCcgJiYgdm90ZWRFdmVudHMgJiYgdm90ZWRFdmVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IGFkZCBldmVudHMgdGhhdCBoYXZlIHZvdGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2b3RlcyA9IF8uZmlsdGVyKHZvdGVkRXZlbnRzLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudFtlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID09PSBsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSAmJiBldmVudFtlcmlzQ29uZmlnLnNlcnZlci5kYXRhc2V0RmllbGRdID09PSBsYXllci5mZWF0dXJlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2b3Rlcy5sZW5ndGggPj0gdG90YWxWb3Rlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZExheWVyKGxheWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGZpbHRlcmluZyBuZWNlc3NhcnksIGp1c3QgYWRkIHRoZSBsYXllclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMuYWRkTGF5ZXIobGF5ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50cyA9IG1hcExheWVycy5nZXRMYXllcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93RXZlbnRUcmFjaygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudHMoW10pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVTdHJpa2VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEV2ZW50TGF5ZXJzKG1hcExheWVycy5nZXRMYXllcnMoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2FkaW5nRXZlbnRzKHZtLmxvYWRpbmcpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGVTZXJ2aWNlLmdldFBvbGwoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHBvbGwgZm9yIGNoYW5nZXNcclxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldEV2ZW50cyhzb3VyY2VzLCB2b3RlZEV2ZW50cykudGhlbihudWxsLCBudWxsLCBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudHMgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFdmVudHMoW10pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS4kcmVzb2x2ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVEYXRhKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8ganVzdCBkbyBhIHNpbmdsZSByZXF1ZXN0XHJcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoU2VydmljZS5nZXRFdmVudHNPbmNlKHNvdXJjZXMsIHZvdGVkRXZlbnRzKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZURhdGEoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCAxMDAwKTtcclxuXHJcbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIG1hcCA9IGRhdGE7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIHNvdXRoV2VzdCA9IEwubGF0TG5nKC05MCwgLTE4MCksXHJcbiAgICAgICAgICAgICAgICAgICAgbm9ydGhFYXN0ID0gTC5sYXRMbmcoOTAsIDE4MCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgYm91bmRzID0gTC5sYXRMbmdCb3VuZHMoc291dGhXZXN0LCBub3J0aEVhc3QpO1xyXG5cclxuICAgICAgICAgICAgICAgIG1hcC5zZXRNYXhCb3VuZHMoYm91bmRzKTtcclxuICAgICAgICAgICAgICAgIG1hcC5vbignZHJhZycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIFx0bWFwLnBhbkluc2lkZUJvdW5kcyhib3VuZHMsIHsgYW5pbWF0ZTogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhZGQgc2NhbGUgY29udHJvbFxyXG4gICAgICAgICAgICAgICAgTC5jb250cm9sLnNjYWxlKHtcclxuICAgICAgICAgICAgICAgICAgICBpbXBlcmlhbDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0pLmFkZFRvKG1hcCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gZGlzYWJsZSBsZWFmbGV0IGtleWJvYXJkIHNob3J0Y3V0cyB0byBwcmV2ZW50IGNvbGxpc2lvbiB3aXRoIGFuZ3VsYXIgaG90a2V5c1xyXG4gICAgICAgICAgICAgICAgbWFwLmtleWJvYXJkLmRpc2FibGUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIGRlZmF1bHQgaWNvbiBwYXRoXHJcbiAgICAgICAgICAgICAgICBMLkljb24uRGVmYXVsdC5pbWFnZVBhdGggPSAnL3N0eWxlc2hlZXRzL2ltYWdlcyc7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkIGZlYXR1cmUgZ3JvdXAgdG8gdGhlIG1hcFxyXG4gICAgICAgICAgICAgICAgbWFwTGF5ZXJzLmFkZFRvKG1hcCk7XHJcbiAgICAgICAgICAgICAgICBzdHJpa2VMYXllcnMuYWRkVG8obWFwKTtcclxuICAgICAgICAgICAgICAgIGZtdkxheWVycy5hZGRUbyhtYXApO1xyXG4gICAgICAgICAgICAgICAgZWxsaXBzZUxheWVyLmFkZFRvKG1hcCk7XHJcblxyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE1hcEJvdW5kcyhtYXAuZ2V0Qm91bmRzKCkpO1xyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE1hcFpvb20obWFwLmdldFpvb20oKSk7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0T25seUNvcnJlbGF0aW9ucyhvbmx5Q29ycmVsYXRpb25zKTtcclxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGaWx0ZXJTdHJhdGVneShmaWx0ZXJTdHJhdGVneSk7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U3RyaWtlVmlzaWJpbGl0eShzdHJpa2VWaXNpYmlsaXR5KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhZGQgY29vcmRpbmF0ZXMgY29udHJvbFxyXG4gICAgICAgICAgICAgICAgTC5jb250cm9sLmNvb3JkaW5hdGVzKHtcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVVc2VySW5wdXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZUxhdExuZ09yZGVyOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9KS5hZGRUbyhtYXApO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFkZCBjb250cm9sIHRvIG9ubHkgc2hvdyBldmVudHMgd2l0aCBjb3JyZWxhdGlvbnNcclxuICAgICAgICAgICAgICAgIHZhciBjb3JyZWxhdGVkQnRuID0gTC5lYXN5QnV0dG9uKHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZXM6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlTmFtZTogJ2NvcnJlbGF0ZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uOiAnZXJpcy1tYXBidG4gZXJpcy1tYXBidG4tY29ycmVsYXRlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnU2hvd2luZyBldmVudHMgd2l0aCBjb3JyZWxhdGlvbnMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoYnRuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG4uc3RhdGUoJ25vbmNvcnJlbGF0ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubHlDb3JyZWxhdGlvbnMgPSAnbm9uY29ycmVsYXRlZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0T25seUNvcnJlbGF0aW9ucyhvbmx5Q29ycmVsYXRpb25zKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVOYW1lOiAnbm9uY29ycmVsYXRlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdlcmlzLW1hcGJ0biBlcmlzLW1hcGJ0bi1ub25jb3JyZWxhdGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdTaG93aW5nIGV2ZW50cyB3aXRoIG5vIGNvcnJlbGF0aW9ucycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uIChidG4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bi5zdGF0ZSgnYWxsJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gJ2FsbCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0T25seUNvcnJlbGF0aW9ucyhvbmx5Q29ycmVsYXRpb25zKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVOYW1lOiAnYWxsJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2VyaXMtbWFwYnRuIGVyaXMtbWFwYnRuLWFsbCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnU2hvd2luZyBhbGwgZXZlbnRzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKGJ0bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuLnN0YXRlKCdjb3JyZWxhdGVkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gJ2NvcnJlbGF0ZWQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE9ubHlDb3JyZWxhdGlvbnMob25seUNvcnJlbGF0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBjb3JyZWxhdGVkQnRuLnN0YXRlKG9ubHlDb3JyZWxhdGlvbnMpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFkZCBjb250cm9sIHRvIGRldGVybWluZSBob3cgZGF0YSBpcyBmaWx0ZXJlZFxyXG4gICAgICAgICAgICAgICAgdmFyIGZpbHRlclN0cmF0ZWd5QnRuID0gTC5lYXN5QnV0dG9uKHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZXM6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlTmFtZTogJ3NlcnZlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdmYS1zZXJ2ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0ZpbHRlcmluZyBEYXRhIG9uIFNlcnZlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uIChidG4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvbid0IGxldCB0aGlzIGhhcHBlbiBpZiB0ZW1wb3JhbCBmaWx0ZXIgaXMgdG9vIGxhcmdlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcG9yYWxGaWx0ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wb3JhbERpZmYgPSBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0b3ApLmRpZmYobW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdGFydCksICdoJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRlbXBvcmFsRGlmZiA8PSAyNCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bi5zdGF0ZSgnY2xpZW50Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RyYXRlZ3kgPSAnY2xpZW50JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RmlsdGVyU3RyYXRlZ3koZmlsdGVyU3RyYXRlZ3kpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdUZW1wb3JhbCBmaWx0ZXIgcmFuZ2UgbXVzdCBiZSBzaG9ydGVyIHRoYW4gMjQgaG91cnMgdG8gZmlsdGVyIGNsaWVudC1zaWRlLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVOYW1lOiAnY2xpZW50JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhLXVzZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0ZpbHRlcmluZyBEYXRhIG9uIENsaWVudCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uIChidG4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bi5zdGF0ZSgnc2VydmVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdHJhdGVneSA9ICdzZXJ2ZXInO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZpbHRlclN0cmF0ZWd5KGZpbHRlclN0cmF0ZWd5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGZpbHRlclN0cmF0ZWd5QnRuLnN0YXRlKGZpbHRlclN0cmF0ZWd5KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhZGQgY29udHJvbCB0byBzaG93L2hpZGUgc3RyaWtlIGV2ZW50c1xyXG4gICAgICAgICAgICAgICAgdmFyIHN0cmlrZUJ0biA9IEwuZWFzeUJ1dHRvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZU5hbWU6ICd2aXNpYmxlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhLWJvbHQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1Nob3dpbmcgU3RyaWtlIEV2ZW50cycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uIChidG4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bi5zdGF0ZSgnaGlkZGVuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpa2VWaXNpYmlsaXR5ID0gJ2hpZGRlbic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U3RyaWtlVmlzaWJpbGl0eShzdHJpa2VWaXNpYmlsaXR5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVOYW1lOiAnaGlkZGVuJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhLWJvbHQgZXJpcy1tYXBidG4tZGlzYWJsZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0hpZGluZyBTdHJpa2UgRXZlbnRzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKGJ0bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuLnN0YXRlKCd2aXNpYmxlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpa2VWaXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFN0cmlrZVZpc2liaWxpdHkoc3RyaWtlVmlzaWJpbGl0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBzdHJpa2VCdG4uc3RhdGUoc3RyaWtlVmlzaWJpbGl0eSk7XHJcblxyXG4gICAgICAgICAgICAgICAgTC5lYXN5QmFyKFtjb3JyZWxhdGVkQnRuLCBmaWx0ZXJTdHJhdGVneUJ0bl0pLmFkZFRvKG1hcCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGZpbGVMYXllckNvbnRyb2wgPSBMLkNvbnRyb2wuZmlsZUxheWVyTG9hZCh7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQWxsb3dzIHlvdSB0byB1c2UgYSBjdXN0b21pemVkIHZlcnNpb24gb2YgTC5nZW9Kc29uLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGFtcGxlIGlmIHlvdSBhcmUgdXNpbmcgdGhlIFByb2o0TGVhZmxldCBsZWFmbGV0IHBsdWdpbixcclxuICAgICAgICAgICAgICAgICAgICAvLyB5b3UgY2FuIHBhc3MgTC5Qcm9qLmdlb0pzb24gYW5kIGxvYWQgdGhlIGZpbGVzIGludG8gdGhlXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gTC5Qcm9qLkdlb0pzb24gaW5zdGVhZCBvZiB0aGUgTC5nZW9Kc29uLlxyXG4gICAgICAgICAgICAgICAgICAgIGxheWVyOiBMLmdlb0pzb24sXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VlIGh0dHA6Ly9sZWFmbGV0anMuY29tL3JlZmVyZW5jZS5odG1sI2dlb2pzb24tb3B0aW9uc1xyXG4gICAgICAgICAgICAgICAgICAgIGxheWVyT3B0aW9uczoge3N0eWxlOiB7Y29sb3I6J3llbGxvdyd9fSxcclxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgdG8gbWFwIGFmdGVyIGxvYWRpbmcgKGRlZmF1bHQ6IHRydWUpID9cclxuICAgICAgICAgICAgICAgICAgICBhZGRUb01hcDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAvLyBGaWxlIHNpemUgbGltaXQgaW4ga2IgKGRlZmF1bHQ6IDEwMjQpID9cclxuICAgICAgICAgICAgICAgICAgICBmaWxlU2l6ZUxpbWl0OiAxMDI0MCxcclxuICAgICAgICAgICAgICAgICAgICAvLyBSZXN0cmljdCBhY2NlcHRlZCBmaWxlIGZvcm1hdHMgKGRlZmF1bHQ6IC5nZW9qc29uLCAuanNvbiwgLmttbCwgYW5kIC5ncHgpID9cclxuICAgICAgICAgICAgICAgICAgICBmb3JtYXRzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICcua21sJ1xyXG4gICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgIH0pLmFkZFRvKG1hcCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZmlsZUxheWVyQ29udHJvbC5sb2FkZXIub24oJ2RhdGE6bG9hZGVkJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZmlsZUxheWVyQ29udHJvbC5sb2FkZXIub24oJ2RhdGE6ZXJyb3InLCBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhZGQgY29udHJvbCB0byB1cGxvYWQgS01MXHJcbiAgICAgICAgICAgICAgICB2YXIgdXBsb2FkS21sQnRuID0gTC5lYXN5QnV0dG9uKHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZXM6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlTmFtZTogJ3VwbG9hZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdlcmlzLW1hcGJ0biBlcmlzLW1hcGJ0bi1rbWwtdXBsb2FkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdVcGxvYWQgS01MIEZpbGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoJ2EubGVhZmxldC1jb250cm9sLWZpbGVsYXllcicpWzBdLmNsaWNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkIGNvbnRyb2wgdG8gZG93bmxvYWQgS01MXHJcbiAgICAgICAgICAgICAgICB2YXIgZG93bmxvYWRLbWxCdG4gPSBMLmVhc3lCdXR0b24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlczogW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVOYW1lOiAnZG93bmxvYWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uOiAnZXJpcy1tYXBidG4gZXJpcy1tYXBidG4ta21sLWRvd25sb2FkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdEb3dubG9hZCBFdmVudHMgYXMgS01MJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKGJ0bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGV2ZW50cyA9IHN0YXRlU2VydmljZS5nZXRFdmVudHMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZXhwb3J0S21sKHRva21sKG1hcExheWVycy50b0dlb0pTT04oKSwgeyB0aW1lc3RhbXA6ICdldmVudF90aW1lJyB9KSkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LmxvY2F0aW9uLmhyZWYgPSBkYXRhLmRhdGEuZmlsZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bi5zdGF0ZSgnZG93bmxvYWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnRXJyb3IgZG93bmxvYWRpbmcgS01MJykudGhlbWUoJ2ZhaWwtdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdObyBldmVudHMgZm91bmQuIFRyeSBjaGFuZ2luZyB5b3VyIHNlYXJjaCBwYXJhbWV0ZXJzLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBMLmVhc3lCYXIoW3VwbG9hZEttbEJ0biwgZG93bmxvYWRLbWxCdG5dKS5hZGRUbyhtYXApO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFkZCBjb250cm9sIHRvIGRvd25sb2FkIGFsbCBFWFQnc1xyXG4gICAgICAgICAgICAgICAgdmFyIGV4dERvd25sb2FkQnRuID0gTC5lYXN5QnV0dG9uKHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZXM6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlTmFtZTogJ2Rvd25sb2FkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhLWRvd25sb2FkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdEb3dubG9hZCBFdmVudCBINSBGaWxlcycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uIChidG4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBldmVudHMgPSBzdGF0ZVNlcnZpY2UuZ2V0RXZlbnRzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA+IGVyaXNDb25maWcuZXh0RG93bmxvYWRMaW1pdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFdmVudCBsaW1pdCBleGNlZWRlZC4gQWRqdXN0IHlvdXIgc2VhcmNoIHBhcmFtZXRlcnMgdG8gcmVkdWNlIGV2ZW50cyBzaG93biB0byBmZXdlciB0aGFuICcgKyBlcmlzQ29uZmlnLmV4dERvd25sb2FkTGltaXQgKyAnLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG4uc3RhdGUoJ2xvYWRpbmcnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoU2VydmljZS5kb3dubG9hZEV4dEZpbGVzKF8ubWFwKGV2ZW50cywgJ3Byb3BlcnRpZXMuZmlsZV9wYXRoJykpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bi5zdGF0ZSgnZG93bmxvYWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cubG9jYXRpb24uaHJlZiA9IGRhdGEuZGF0YS5maWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG4uc3RhdGUoJ2Rvd25sb2FkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciBkb3dubG9hZGluZyBldmVudHMnKS50aGVtZSgnZmFpbC10b2FzdCcpLnBvc2l0aW9uKCd0b3AgcmlnaHQnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ05vIGV2ZW50cyBmb3VuZC4gVHJ5IGNoYW5naW5nIHlvdXIgc2VhcmNoIHBhcmFtZXRlcnMuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZU5hbWU6ICdsb2FkaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhLWNvZyBmYS1zcGluJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdEb3dubG9hZGluZyBGaWxlcydcclxuICAgICAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgTC5lYXN5QmFyKFtleHREb3dubG9hZEJ0bl0pLmFkZFRvKG1hcCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VsYXllcklkID0gcXMuYmFzZWxheWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIGJhc2VsYXllciA9IHt9O1xyXG4gICAgICAgICAgICAgICAgaWYgKGJhc2VsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIHJlcXVlc3RlZCBiYXNlbGF5ZXIgdG8gdm0ubGF5ZXJzLmJhc2VsYXllcnMgZmlyc3RcclxuICAgICAgICAgICAgICAgICAgICBiYXNlbGF5ZXIgPSBfLmZpbmQoZXJpc0NvbmZpZy5sYXllcnMuYmFzZWxheWVycywgeyBpZDogYmFzZWxheWVySWQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlQmFzZWxheWVyKGJhc2VsYXllcik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGJhc2VsYXllciBub3QgcHJlc2VudCBpbiBxdWVyeXN0cmluZywgc28ganVzdCBnbyB3aXRoIGRlZmF1bHRzXHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZWxheWVyID0gZXJpc0NvbmZpZy5sYXllcnMuYmFzZWxheWVyc1tlcmlzQ29uZmlnLmRlZmF1bHRCYXNlbGF5ZXJdO1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLmxheWVycyA9IF8uY2xvbmVEZWVwKGVyaXNDb25maWcubGF5ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmFzZWxheWVyKGJhc2VsYXllcik7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlT3ZlcmxheXMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBtYXAub24oJ2Jhc2VsYXllcmNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJhc2VsYXllciA9IF8uZmluZChlcmlzQ29uZmlnLmxheWVycy5iYXNlbGF5ZXJzLCB7IG5hbWU6IGUubmFtZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmFzZWxheWVyKGJhc2VsYXllcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBtYXAub24oJ292ZXJsYXlhZGQnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdmVybGF5YWRkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG92ZXJsYXkgPSBfLmZpbmQoZXJpc0NvbmZpZy5sYXllcnMub3ZlcmxheXMsIHsgbmFtZTogZS5uYW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmluZGV4T2Yob3ZlcmxheXMsIG92ZXJsYXkuaWQpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdmVybGF5cy5wdXNoKG92ZXJsYXkuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0T3ZlcmxheXMob3ZlcmxheXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIG1hcC5vbignb3ZlcmxheXJlbW92ZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ292ZXJsYXlyZW1vdmUnKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb3ZlcmxheSA9IF8uZmluZChlcmlzQ29uZmlnLmxheWVycy5vdmVybGF5cywgeyBuYW1lOiBlLm5hbWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgb3ZlcmxheXMgPSBfLnJlbW92ZShvdmVybGF5cywgb3ZlcmxheS5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE92ZXJsYXlzKG92ZXJsYXlzKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIG1hcC5vbignbW92ZWVuZCcsIF8uZGVib3VuY2UoZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TWFwWm9vbShlLnRhcmdldC5nZXRab29tKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXBCb3VuZHMoZS50YXJnZXQuZ2V0Qm91bmRzKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBjZW50ZXJPbkFjdGl2ZUV2ZW50ID0gc3RhdGVTZXJ2aWNlLmdldENlbnRlck9uQWN0aXZlRXZlbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWNlbnRlck9uQWN0aXZlRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFwIHdhcyBtb3ZlZCBieSB1c2VyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVTdHJpa2VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXAgd2FzIG1vdmVkIGJ5IGFwcCB3aGlsZSBsb2FkaW5nIGFjdGl2ZSBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q2VudGVyT25BY3RpdmVFdmVudChmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5hY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaG93L2hpZGUgZXZlbnQgdHJhY2sgYmFzZWQgb24gem9vbSBsZXZlbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5rZXlzKHZtLnRyYWNrTGF5ZXJzLmdldEJvdW5kcygpKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQuZ2V0Wm9vbSgpID4gMTApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMuYWRkTGF5ZXIodm0udHJhY2tMYXllcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBMYXllcnMucmVtb3ZlTGF5ZXIodm0udHJhY2tMYXllcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgNzUwKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRCYXNlbGF5ZXIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB1cGRhdGVCYXNlbGF5ZXIobmV3VmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIGlzb2xhdGVkIHdpbGwgYmUgdHJ1ZSB3aGVuIGV2ZW50cyBwb2xsaW5nIGlzIGFjdGl2ZVxyXG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgfHwgbmV3VmFsdWUuaXNvbGF0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEFjdGl2ZVNvdXJjZXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzb3VyY2VzID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEFjdGl2ZVR5cGVzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdHlwZXMgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRTb3VyY2VUeXBlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc291cmNlVHlwZSA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldEZpbHRlclN0cmF0ZWd5KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZmlsdGVyU3RyYXRlZ3kgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRTdHJpa2VWaXNpYmlsaXR5KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc3RyaWtlVmlzaWJpbGl0eSA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICB1cGRhdGVTdHJpa2VzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRGTVZGaWx0ZXIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmbXZGaWx0ZXIgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgaWYgKGZtdkZpbHRlciA9PT0gJ2Rpc2FibGVkJykge1xyXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZNVkxheWVycyhuZXcgTC5GZWF0dXJlR3JvdXAoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Rk1WTGF5ZXJzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGZtdkxheWVycy5nZXRMYXllcnMoKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBmbXZMYXllcnMuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgJiYgbmV3VmFsdWUuZ2V0TGF5ZXJzKCkubGVuZ3RoID4gMCAmJiBmbXZGaWx0ZXIgPT09ICdlbmFibGVkJykge1xyXG4gICAgICAgICAgICAgICAgbmV3VmFsdWUuZWFjaExheWVyKGZ1bmN0aW9uIChsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGZtdkxheWVycy5hZGRMYXllcihsYXllcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRDb25maWRlbmNlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uZmlkZW5jZSA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBpZiAoZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInKSB7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRMb2NhdGlvblVuY2VydGFpbnR5KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9jYXRpb25VbmNlcnRhaW50eSA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBpZiAoZmlsdGVyU3RyYXRlZ3kgPT09ICdzZXJ2ZXInKSB7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0SW50ZW5zaXR5KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaW50ZW5zaXR5ID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGlmIChmaWx0ZXJTdHJhdGVneSA9PT0gJ3NlcnZlcicpIHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRTbnIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzbnIgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgaWYgKGZpbHRlclN0cmF0ZWd5ID09PSAnc2VydmVyJykge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldER1cmF0aW9uKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZHVyYXRpb24gPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgaWYgKGZpbHRlclN0cmF0ZWd5ID09PSAnc2VydmVyJykge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJFdmVudHMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEFjdGl2ZUV2ZW50KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpIHx8IChuZXdWYWx1ZSAmJiBvbGRWYWx1ZSAmJiBuZXdWYWx1ZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gPT09IG9sZFZhbHVlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIucHJvZHVjdEZpZWxkXSAmJiBuZXdWYWx1ZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPT09IG9sZFZhbHVlLnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIGdldEFjdGl2ZU1hcExheWVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF8uZmluZChtYXBMYXllcnMuZ2V0TGF5ZXJzKCksIGZ1bmN0aW9uIChsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGF5ZXIuZmVhdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxheWVyLmZlYXR1cmUucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5wcm9kdWN0RmllbGRdID09PSB2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnByb2R1Y3RGaWVsZF0gJiYgbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmRhdGFzZXRGaWVsZF0gPT09IHZtLmFjdGl2ZUV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0YXNldEZpZWxkXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIGFjdGl2ZU1hcExheWVyID0gZ2V0QWN0aXZlTWFwTGF5ZXIoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh2bS5hY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgdm0uYWN0aXZlRXZlbnQuYWN0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aXZlTWFwTGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVNYXBMYXllci5zZXRTdHlsZSh7IGNvbG9yOiBhY3RpdmVNYXBMYXllci5mZWF0dXJlLmV2ZW50U291cmNlLmNvbG9yLCBmaWxsT3BhY2l0eTogMC4yIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZU1hcExheWVyLmZlYXR1cmUuYWN0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHZtLnRyYWNrTGF5ZXJzKSB7XHJcbiAgICAgICAgICAgICAgICB2bS50cmFja0xheWVycy5jbGVhckxheWVycygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChlbGxpcHNlTGF5ZXIuZ2V0TGF5ZXJzKCkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgZWxsaXBzZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdm0uYWN0aXZlRXZlbnQgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZUV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY2VudGVyT25BY3RpdmVFdmVudCA9IHN0YXRlU2VydmljZS5nZXRDZW50ZXJPbkFjdGl2ZUV2ZW50KCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2VudGVyT25BY3RpdmVFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLmNlbnRlciA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiB2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzLmV2ZW50X2xhdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiB2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzLmV2ZW50X2xvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgem9vbTogc3RhdGVTZXJ2aWNlLmdldE1hcFpvb20oKSB8fCBtYXBab29tXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxvY2F0aW9uVW5jZXJ0YWludHlGaWVsZF0gIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBMLmVsbGlwc2UoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFt2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzLmV2ZW50X2xhdCwgdm0uYWN0aXZlRXZlbnQucHJvcGVydGllcy5ldmVudF9sb25dLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBbdm0uYWN0aXZlRXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb2NhdGlvblVuY2VydGFpbnR5RmllbGRdLCB2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzLmxvY19taW5vcl9heGlzXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGF0YSBpcyBvcmllbnRlZCBub3J0aCwgcGx1Z2luIGlzIG9yaWVudGVkIHdlc3QgLSBzbyBhZGQgOTAgZGVncmVlcyB0byBhY2NvdW50IGZvciB0aGUgZGlmZmVyZW5jZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5hY3RpdmVFdmVudC5wcm9wZXJ0aWVzLmVsbGlwc2Vfb3JpZW50YXRpb24gKyA5MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6ICcjMDBmZjAwJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodDogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxDb2xvcjogJyMwMGZmMDAnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICApLmFkZFRvKGVsbGlwc2VMYXllcikuYnJpbmdUb0JhY2soKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZtLmFjdGl2ZUV2ZW50LmFjdGl2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmVNYXBMYXllciA9IGdldEFjdGl2ZU1hcExheWVyKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aXZlTWFwTGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVNYXBMYXllci5zZXRTdHlsZSh7IGNvbG9yOiAnI2IyZmY1OScsIGZpbGxPcGFjaXR5OiAwLjggfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTWFwTGF5ZXIuYnJpbmdUb0Zyb250KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXRlU2VydmljZS5nZXRFdmVudExheWVycygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEV2ZW50TGF5ZXJzKG1hcExheWVycy5nZXRMYXllcnMoKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzaG93RXZlbnRUcmFjaygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TGF5b3V0Q29tcG9uZW50cygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghbWFwTGF5b3V0Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBoYXNuJ3QgYmVlbiBzZXQgeWV0LCBzbyB0cnkgdG8gZmluZCBpdFxyXG4gICAgICAgICAgICAgICAgbWFwTGF5b3V0Q29tcG9uZW50ID0gXy5maW5kKG5ld1ZhbHVlLCB7IHN0YXRlOiB7IHRlbXBsYXRlTmFtZTogJ21hcCcgfSB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChtYXBMYXlvdXRDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBmb3VuZCBpdCwgc28gc2V0IHVwIHZhcnMgYW5kIGV2ZW50c1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLm1hcEhlaWdodCA9IG1hcExheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLmxvYWRlckhlaWdodCA9IG1hcExheW91dENvbXBvbmVudC5jb250YWluZXIuaGVpZ2h0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgZXZlbnQgbGlzdGVuZXIgZm9yIGNvbnRhaW5lciByZXNpemVcclxuICAgICAgICAgICAgICAgICAgICBtYXBMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLm9uKCdyZXNpemUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhICR0aW1lb3V0IHRvIG5vdGlmeSBhbmd1bGFyIG9mIHRoZSBjaGFuZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0ubWFwSGVpZ2h0ID0gbWFwTGF5b3V0Q29tcG9uZW50LmNvbnRhaW5lci5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2FkZXJIZWlnaHQgPSBtYXBMYXlvdXRDb21wb25lbnQuY29udGFpbmVyLmhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldE9ubHlDb3JyZWxhdGlvbnMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvbmx5Q29ycmVsYXRpb25zID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIGZpbHRlckV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldENvdW50cmllcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvdW50cmllcyA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICBjb3VudHJ5TGlzdCA9IHN0YXRlU2VydmljZS5nZXRDb3VudHJ5TGlzdCgpO1xyXG4gICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRTZW5zb3JzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2Vuc29ycyA9IG5ld1ZhbHVlLmNvbnN0cnVjdG9yICE9PSBBcnJheSA/IFtuZXdWYWx1ZV0gOiBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgZmlsdGVyRXZlbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vm90ZUZpbHRlcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZvdGVGaWx0ZXIgPSBuZXdWYWx1ZTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRWb3RlZEV2ZW50cygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZvdGVkRXZlbnRzID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFRvdGFsVm90ZXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0b3RhbFZvdGVzID0gbmV3VmFsdWU7XHJcbiAgICAgICAgICAgIHVwZGF0ZUV2ZW50cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcignc2lkZWJhckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBlcmlzU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBfLFxuICAgICAgICBlcmlzQ29uZmlnXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXM7XG5cbiAgICAgICAgdm0ubG9nbyA9IGVyaXNDb25maWcubG9nbztcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5lcmlzQ29uZmlnID0gZXJpc0NvbmZpZztcbiAgICAgICAgdm0uc291cmNlRmlsdGVyRXhwYW5kZWQgPSBzdGF0ZVNlcnZpY2UuZ2V0U291cmNlRmlsdGVyRXhwYW5kZWQoKTtcbiAgICAgICAgdm0udHlwZUZpbHRlckV4cGFuZGVkID0gc3RhdGVTZXJ2aWNlLmdldFR5cGVGaWx0ZXJFeHBhbmRlZCgpO1xuICAgICAgICB2bS50ZW1wb3JhbEZpbHRlckV4cGFuZGVkID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyRXhwYW5kZWQoKTtcbiAgICAgICAgdm0uZ290b0V4cGFuZGVkID0gc3RhdGVTZXJ2aWNlLmdldEdvdG9FeHBhbmRlZCgpO1xuICAgICAgICB2bS51c2VyR3VpZGVVcmwgPSBlcmlzQ29uZmlnLnVzZXJHdWlkZVVybDtcbiAgICAgICAgdm0uaW5mb1VybCA9IGVyaXNDb25maWcuaW5mb1VybDtcbiAgICAgICAgdm0uaW5mb0xhYmVsID0gZXJpc0NvbmZpZy5pbmZvTGFiZWw7XG4gICAgICAgIHZtLmlzQWRtaW4gPSBzdGF0ZVNlcnZpY2UuZ2V0SXNBZG1pbigpO1xuXG4gICAgICAgIHZtLm9wZW5NZW51ID0gZnVuY3Rpb24oJG1kTWVudSwgZXYpIHtcbiAgICAgICAgICAgICRtZE1lbnUub3Blbihldik7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFNvdXJjZUZpbHRlckV4cGFuZGVkKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLnNvdXJjZUZpbHRlckV4cGFuZGVkID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRUeXBlRmlsdGVyRXhwYW5kZWQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0udHlwZUZpbHRlckV4cGFuZGVkID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlckV4cGFuZGVkKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLnRlbXBvcmFsRmlsdGVyRXhwYW5kZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldEdvdG9FeHBhbmRlZCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5nb3RvRXhwYW5kZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldElzQWRtaW4oKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0uaXNBZG1pbiA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ3NvdXJjZUZpbHRlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGVyaXNDb25maWcsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0uc291cmNlcyA9IF8uY2xvbmVEZWVwKGVyaXNDb25maWcuc291cmNlcyk7XG4gICAgICAgIHZtLmFjdGl2ZVNvdXJjZXMgPSBbXTtcbiAgICAgICAgdm0uc291cmNlVHlwZXMgPSBfLmNsb25lRGVlcChlcmlzQ29uZmlnLnNvdXJjZVR5cGVzKTtcbiAgICAgICAgdm0uc291cmNlVHlwZSA9IHFzLnNvdXJjZVR5cGUgPyBfLmZpbmQodm0uc291cmNlVHlwZXMsIHsgbmFtZTogcXMuc291cmNlVHlwZSB9KSA6IF8uZmluZChlcmlzQ29uZmlnLnNvdXJjZVR5cGVzLCB7IGFjdGl2ZTogdHJ1ZSB9KTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFNvdXJjZUZpbHRlckV4cGFuZGVkKHZtLmV4cGFuZGVkKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS50b2dnbGVTb3VyY2UgPSBmdW5jdGlvbiAoc291cmNlLCBpZ25vcmVBY3RpdmUpIHtcbiAgICAgICAgICAgIGlmICghaWdub3JlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc291cmNlLmFjdGl2ZSA9ICFzb3VyY2UuYWN0aXZlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNvdXJjZS5hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIV8uZmluZCh2bS5hY3RpdmVTb3VyY2VzLCBzb3VyY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmFjdGl2ZVNvdXJjZXMucHVzaChzb3VyY2UpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlU291cmNlcyh2bS5hY3RpdmVTb3VyY2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChfLmZpbmQodm0uYWN0aXZlU291cmNlcywgc291cmNlKSkge1xuICAgICAgICAgICAgICAgICAgICBfLnJlbW92ZSh2bS5hY3RpdmVTb3VyY2VzLCBzb3VyY2UpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlU291cmNlcyh2bS5hY3RpdmVTb3VyY2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0U291cmNlVHlwZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRTb3VyY2VUeXBlKHZtLnNvdXJjZVR5cGUubmFtZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXNTb3VyY2VzID0gcXMuc291cmNlcztcblxuICAgICAgICAgICAgaWYgKHFzU291cmNlcykge1xuICAgICAgICAgICAgICAgIC8vIGFjdGl2YXRlIHNvdXJjZXMgYmFzZWQgb24gcXVlcnlzdHJpbmdcbiAgICAgICAgICAgICAgICBxc1NvdXJjZXMgPSBxc1NvdXJjZXMuc3BsaXQoJywnKTtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2godm0uc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgICAgICAgICAgICAgICAgICBzb3VyY2UuYWN0aXZlID0gXy5pbmRleE9mKHFzU291cmNlcywgc291cmNlLm5hbWUpID4gLTE7XG4gICAgICAgICAgICAgICAgICAgIHZtLnRvZ2dsZVNvdXJjZShzb3VyY2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBhY3RpdmF0ZSBzb3VyY2VzIGJhc2VkIG9uIGNvbmZpZ1xuICAgICAgICAgICAgICAgIHZtLmFjdGl2ZVNvdXJjZXMgPSBfLmZpbHRlcih2bS5zb3VyY2VzLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2UuYWN0aXZlID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZtLmFjdGl2ZVNvdXJjZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QWN0aXZlU291cmNlcyh2bS5hY3RpdmVTb3VyY2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZtLnNldFNvdXJjZVR5cGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5kaXJlY3RpdmUoJ2VyaXNTb3VyY2VGaWx0ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvc291cmNlRmlsdGVyL3NvdXJjZUZpbHRlclRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ3NvdXJjZUZpbHRlckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCd0ZW1wb3JhbEZpbHRlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgICR0aW1lb3V0LFxuICAgICAgICBtb21lbnQsXG4gICAgICAgIGVyaXNDb25maWcsXG5cdFx0JG1kVG9hc3QsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLm1vbWVudCA9IG1vbWVudDtcbiAgICAgICAgdm0uZXJpc0NvbmZpZyA9IGVyaXNDb25maWc7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5tb2RlID0gJHNjb3BlLm1vZGU7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0ubW9tZW50ID0gbW9tZW50O1xuICAgICAgICB2bS5zdGFydCA9ICcnO1xuICAgICAgICB2bS5zdG9wID0gJyc7XG4gICAgICAgIHZtLnN0YXJ0VGltZSA9IHtcbiAgICAgICAgICAgIGhvdXI6IG51bGwsXG4gICAgICAgICAgICBtaW51dGU6IG51bGwsXG4gICAgICAgICAgICBzZWNvbmQ6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdm0uc3RvcFRpbWUgPSB7XG4gICAgICAgICAgICBob3VyOiBudWxsLFxuICAgICAgICAgICAgbWludXRlOiBudWxsLFxuICAgICAgICAgICAgc2Vjb25kOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIHZtLnJhbmdlcyA9IF8uY2xvbmUoZXJpc0NvbmZpZy5yYW5nZXMpO1xuICAgICAgICB2bS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgIHZtLmFwcGx5QnRuRGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICB2bS5wb2xsID0gZmFsc2U7XG5cbiAgICAgICAgdmFyIHNldFBvbGwgPSBmdW5jdGlvbiAoc3RhcnQpIHtcbiAgICAgICAgICAgIC8vIHBvbGwgZm9yIGNoYW5nZXMgaWYgdGVtcG9yYWwgZGlmZiBpcyA2MCBtaW5zIG9yIGxlc3NcbiAgICAgICAgICAgIHZhciB0ZW1wb3JhbERpZmYgPSBtb21lbnQudXRjKCkuZGlmZihtb21lbnQudXRjKHN0YXJ0KSwgJ20nKTtcbiAgICAgICAgICAgIHZtLnBvbGwgPSB0ZW1wb3JhbERpZmYgPD0gNjA7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UG9sbCh2bS5wb2xsKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuaXNFcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB2bS5pbnZhbGlkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGVtcG9yYWxGaWx0ZXJFeHBhbmRlZCh2bS5leHBhbmRlZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0UmFuZ2UgPSBmdW5jdGlvbiAodW5pdHMsIHVuaXRPZlRpbWUpIHtcbiAgICAgICAgICAgIHZhciBzdGFydCA9IG1vbWVudC51dGMoKS5hZGQodW5pdHMsIHVuaXRPZlRpbWUpLnN0YXJ0T2YodW5pdE9mVGltZSksXG4gICAgICAgICAgICAgICAgc3RvcCA9IG1vbWVudC51dGMoKS5zdGFydE9mKHVuaXRPZlRpbWUpO1xuXG4gICAgICAgICAgICBpZiAoKHVuaXRzID09PSAtMSAmJiB1bml0T2ZUaW1lID09PSAnaG91cnMnKSB8fCAodW5pdHMgPT09IC0zMCAmJiB1bml0T2ZUaW1lID09PSAnbWludXRlcycpKSB7XG4gICAgICAgICAgICAgICAgc3RhcnQgPSBtb21lbnQudXRjKCkuYWRkKHVuaXRzLCB1bml0T2ZUaW1lKTtcbiAgICAgICAgICAgICAgICBzdG9wID0gbW9tZW50LnV0YygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZXRQb2xsKHN0YXJ0KTtcblxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsRmlsdGVyKHtcbiAgICAgICAgICAgICAgICBzdGFydDogc3RhcnQudG9EYXRlKCksXG4gICAgICAgICAgICAgICAgc3RvcDogc3RvcC50b0RhdGUoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0VGltZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgICAgICB2YXIgaXNWYWxpZCA9IG1vbWVudC51dGModm1bdHlwZV0sICdZWVlZLU1NLUREJykuaXNWYWxpZCgpLFxuICAgICAgICAgICAgICAgIGhvdXIgPSBpc1ZhbGlkID8gKCcwJyArIG1vbWVudC51dGModm1bdHlwZV0sICdZWVlZLU1NLUREJykuaG91cigpKS5zbGljZSgtMikgOiAnMDAnLFxuICAgICAgICAgICAgICAgIG1pbnV0ZSA9IGlzVmFsaWQgPyAoJzAnICsgbW9tZW50LnV0Yyh2bVt0eXBlXSwgJ1lZWVktTU0tREQnKS5taW51dGUoKSkuc2xpY2UoLTIpIDogJzAwJyxcbiAgICAgICAgICAgICAgICBzZWNvbmQgPSBpc1ZhbGlkID8gKCcwJyArIG1vbWVudC51dGModm1bdHlwZV0sICdZWVlZLU1NLUREJykuc2Vjb25kKCkpLnNsaWNlKC0yKSA6ICcwMCc7XG5cbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnc3RhcnQnKSB7XG4gICAgICAgICAgICAgICAgdm0uc3RhcnRUaW1lID0ge1xuICAgICAgICAgICAgICAgICAgICBob3VyOiBob3VyLFxuICAgICAgICAgICAgICAgICAgICBtaW51dGU6IG1pbnV0ZSxcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kOiBzZWNvbmRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5zdG9wVGltZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaG91cjogaG91cixcbiAgICAgICAgICAgICAgICAgICAgbWludXRlOiBtaW51dGUsXG4gICAgICAgICAgICAgICAgICAgIHNlY29uZDogc2Vjb25kXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5jaGFuZ2VUaW1lID0gZnVuY3Rpb24gKHR5cGUsIHVuaXQpIHtcbiAgICAgICAgICAgIGlmICh2bVt0eXBlXVt1bml0XS5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICAgICAgdm1bdHlwZV1bdW5pdF0gPSAoJzAnICsgdm1bdHlwZV0uaG91cikuc2xpY2UoLTIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFpc05hTih2bVt0eXBlXVt1bml0XSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodm1bdHlwZV0uaG91ciA+IDIzIHx8IHZtW3R5cGVdLmhvdXIgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtW3R5cGVdLmhvdXIgPSB2bVt0eXBlXS5ob3VyID4gMjMgPyAyMyA6IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2bVt0eXBlXS5taW51dGUgPiA1OSB8fCB2bVt0eXBlXS5taW51dGUgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtW3R5cGVdLm1pbnV0ZSA9IHZtW3R5cGVdLm1pbnV0ZSA+IDU5ID8gNTkgOiAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodm1bdHlwZV0uc2Vjb25kID4gNTkgfHwgdm1bdHlwZV0uc2Vjb25kIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICB2bVt0eXBlXS5zZWNvbmQgPSB2bVt0eXBlXS5zZWNvbmQgPiA1OSA/IDU5IDogMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHRpbWVTZXQgPSB0eXBlID09PSAnc3RhcnRUaW1lJyA/IG1vbWVudC51dGModm0uc3RhcnQudG9JU09TdHJpbmcoKSkgOiBtb21lbnQudXRjKHZtLnN0b3AudG9JU09TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgdGltZVNldC5zZXQoe1xuICAgICAgICAgICAgICAgICAgICAnaG91cic6ICgnMCcgKyB2bVt0eXBlXS5ob3VyKS5zbGljZSgtMiksXG4gICAgICAgICAgICAgICAgICAgICdtaW51dGUnOiAoJzAnICsgdm1bdHlwZV0ubWludXRlKS5zbGljZSgtMiksXG4gICAgICAgICAgICAgICAgICAgICdzZWNvbmQnOiAoJzAnICsgdm1bdHlwZV0uc2Vjb25kKS5zbGljZSgtMilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ3N0YXJ0VGltZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uc3RhcnQgPSB0aW1lU2V0LnRvRGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3N0b3BUaW1lJykge1xuICAgICAgICAgICAgICAgICAgICB2bS5zdG9wID0gdGltZVNldC50b0RhdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0ua2V5ZG93biA9IGZ1bmN0aW9uICgkZXZlbnQsIHVuaXQsIHR5cGUpIHtcbiAgICAgICAgICAgIHZhciBtYXggPSAwO1xuICAgICAgICAgICAgaWYgKHVuaXQgPT09ICdob3VyJykge1xuICAgICAgICAgICAgICAgIG1heCA9IDIzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1bml0ID09PSAnbWludXRlJyB8fCB1bml0ID09PSAnc2Vjb25kJykge1xuICAgICAgICAgICAgICAgIG1heCA9IDYwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCRldmVudC5rZXlDb2RlID09PSAzOCkge1xuICAgICAgICAgICAgICAgIC8vIHVwIGFycm93XG4gICAgICAgICAgICAgICAgaWYgKGlzTmFOKHZtW3R5cGVdW3VuaXRdKSkge1xuICAgICAgICAgICAgICAgICAgICB2bVt0eXBlXVt1bml0XSA9ICgnMCcgKyAwKS5zbGljZSgtMik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2bVt0eXBlXVt1bml0XSA8IG1heCkge1xuICAgICAgICAgICAgICAgICAgICB2bVt0eXBlXVt1bml0XSsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2bVt0eXBlXVt1bml0XSA9ICgnMCcgKyB2bVt0eXBlXVt1bml0XSkuc2xpY2UoLTIpO1xuICAgICAgICAgICAgICAgIHZtLmNoYW5nZVRpbWUodHlwZSwgdW5pdCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCRldmVudC5rZXlDb2RlID09PSA0MCkge1xuICAgICAgICAgICAgICAgIC8vIGRvd24gYXJyb3dcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4odm1bdHlwZV1bdW5pdF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtW3R5cGVdW3VuaXRdID0gKCcwJyArIDApLnNsaWNlKC0yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZtW3R5cGVdW3VuaXRdID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2bVt0eXBlXVt1bml0XS0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2bVt0eXBlXVt1bml0XSA9ICgnMCcgKyB2bVt0eXBlXVt1bml0XSkuc2xpY2UoLTIpO1xuICAgICAgICAgICAgICAgIHZtLmNoYW5nZVRpbWUodHlwZSwgdW5pdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc3RlcFJhbmdlID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gbW9tZW50LnV0Yyh2bS5zdGFydCk7XG4gICAgICAgICAgICB2YXIgc3RvcCA9IG1vbWVudC51dGModm0uc3RvcCk7XG4gICAgICAgICAgICB2YXIgZGlmZiA9IHN0b3AuZGlmZihzdGFydCk7XG5cbiAgICAgICAgICAgIHNldFBvbGwoc3RhcnQudG9JU09TdHJpbmcoKSk7XG5cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUZW1wb3JhbEZpbHRlcih7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IGRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnID8gc3RhcnQuYWRkKGRpZmYpIDogc3RhcnQuc3VidHJhY3QoZGlmZiksXG4gICAgICAgICAgICAgICAgc3RvcDogZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgPyBzdG9wLmFkZChkaWZmKSA6IHN0b3Auc3VidHJhY3QoZGlmZilcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldFRlbXBvcmFsRmlsdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHZtLnN0YXJ0ICYmIHZtLnN0b3AgJiYgbW9tZW50LnV0Yyh2bS5zdGFydCkuaXNWYWxpZCgpICYmIG1vbWVudC51dGModm0uc3RvcCkuaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICAgICAgdm0uYXBwbHlCdG5EaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIG1vbWVudFN0YXJ0ID0gbW9tZW50LnV0Yyh2bS5zdGFydC50b0lTT1N0cmluZygpKSxcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50U3RvcCA9IG1vbWVudC51dGModm0uc3RvcC50b0lTT1N0cmluZygpKTtcblxuICAgICAgICAgICAgICAgIGlmIChtb21lbnRTdGFydC5pc0JlZm9yZShtb21lbnRTdG9wKSkge1xuICAgICAgICAgICAgICAgICAgICB2bS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHNldFBvbGwodm0uc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGVtcG9yYWxGaWx0ZXIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHZtLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogdm0uc3RvcFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2bS5pbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgJG1kVG9hc3Quc2hvdygkbWRUb2FzdC5zaW1wbGUoKS50ZXh0Q29udGVudCgnU3RvcCBEYXRlIGlzIGJlZm9yZSBTdGFydCBEYXRlLicpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZtLmludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1RlbXBvcmFsIGZpbHRlciBjb250YWlucyBpbnZhbGlkIGRhdGUvdGltZSB2YWx1ZXMuJykudGhlbWUoJ3dhcm4tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcblxuICAgICAgICAgICAgdm0uc3RhcnQgPSBxcy5zdGFydCA/IG1vbWVudC51dGMocXMuc3RhcnQpLnRvRGF0ZSgpIDogbW9tZW50LnV0YygpLnN1YnRyYWN0KGVyaXNDb25maWcuZGVmYXVsdFRpbWVSYW5nZVZhbHVlLCBlcmlzQ29uZmlnLmRlZmF1bHRUaW1lUmFuZ2VUeXBlKS5zdGFydE9mKGVyaXNDb25maWcuZGVmYXVsdFRpbWVSYW5nZVR5cGUpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgdm0uc3RvcCA9IHFzLnN0b3AgPyBtb21lbnQudXRjKHFzLnN0b3ApLnRvRGF0ZSgpIDogbW9tZW50LnV0YygpLnN0YXJ0T2YoZXJpc0NvbmZpZy5kZWZhdWx0VGltZVJhbmdlVHlwZSkudG9EYXRlKCk7XG5cbiAgICAgICAgICAgIHZtLnNldFRpbWUoJ3N0YXJ0Jyk7XG4gICAgICAgICAgICB2bS5zZXRUaW1lKCdzdG9wJyk7XG4gICAgICAgICAgICB2bS5zZXRUZW1wb3JhbEZpbHRlcigpO1xuICAgICAgICB9O1xuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhcnQnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmFwcGx5QnRuRGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RvcCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0uYXBwbHlCdG5EaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdm0uc3RhcnQgPSBtb21lbnQudXRjKG5ld1ZhbHVlLnN0YXJ0LnRvSVNPU3RyaW5nKCkpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgdm0uc3RvcCA9IG1vbWVudC51dGMobmV3VmFsdWUuc3RvcC50b0lTT1N0cmluZygpKS50b0RhdGUoKTtcblxuICAgICAgICAgICAgdm0uc2V0VGltZSgnc3RhcnQnKTtcbiAgICAgICAgICAgIHZtLnNldFRpbWUoJ3N0b3AnKTtcblxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZtLmFwcGx5QnRuRGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuZGlyZWN0aXZlKCdlcmlzVGVtcG9yYWxGaWx0ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvdGVtcG9yYWxGaWx0ZXIvdGVtcG9yYWxGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICd0ZW1wb3JhbEZpbHRlckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nLFxuICAgICAgICAgICAgICAgIG1vZGU6ICdAJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuY29udHJvbGxlcigndHlwZUZpbHRlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGVyaXNDb25maWcsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcblxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0uYWN0aXZlU291cmNlcyA9IHN0YXRlU2VydmljZS5nZXRBY3RpdmVTb3VyY2VzKCk7XG4gICAgICAgIHZtLnR5cGVzID0gXy5jbG9uZURlZXAoZXJpc0NvbmZpZy50eXBlcyk7XG4gICAgICAgIHZtLmFjdGl2ZVR5cGVzID0gW107XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUeXBlRmlsdGVyRXhwYW5kZWQodm0uZXhwYW5kZWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZVR5cGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICAgICAgdHlwZS5hY3RpdmUgPSAhdHlwZS5hY3RpdmU7XG4gICAgICAgICAgICBpZiAodHlwZS5hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIV8uZmluZCh2bS5hY3RpdmVUeXBlcywgdHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uYWN0aXZlVHlwZXMucHVzaCh0eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZVR5cGVzKHZtLmFjdGl2ZVR5cGVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChfLmZpbmQodm0uYWN0aXZlVHlwZXMsIHR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIF8ucmVtb3ZlKHZtLmFjdGl2ZVR5cGVzLCB0eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEFjdGl2ZVR5cGVzKHZtLmFjdGl2ZVR5cGVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXNUeXBlcyA9ICRsb2NhdGlvbi5zZWFyY2goKS50eXBlcztcblxuICAgICAgICAgICAgaWYgKHFzVHlwZXMpIHtcbiAgICAgICAgICAgICAgICBxc1R5cGVzID0gcXNUeXBlcy5zcGxpdCgnLCcpO1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChxc1R5cGVzLCBmdW5jdGlvbiAodHlwZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBfLmZpbmQodm0udHlwZXMsIHsgbmFtZTogdHlwZU5hbWUgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZtLnRvZ2dsZVR5cGUodHlwZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QWN0aXZlU291cmNlcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5hY3RpdmVTb3VyY2VzID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuZGlyZWN0aXZlKCdlcmlzVHlwZUZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy90eXBlRmlsdGVyL3R5cGVGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICd0eXBlRmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ2NvdW50cnlGaWx0ZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgJHRpbWVvdXQsXG4gICAgICAgICRtZFRvYXN0LFxuICAgICAgICBzZWFyY2hTZXJ2aWNlLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGVyaXNDb25maWcsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0uY291bnRyaWVzID0gW107XG4gICAgICAgIHZtLnNlbGVjdGVkQ291bnRyaWVzID0gW107XG4gICAgICAgIHZtLmxvYWRpbmdDb3VudHJpZXMgPSB0cnVlO1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q291bnRyeUZpbHRlckV4cGFuZGVkKHZtLmV4cGFuZGVkKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5maWx0ZXJCeUNvdW50cmllcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRDb3VudHJpZXMoXy5tYXAodm0uc2VsZWN0ZWRDb3VudHJpZXMsICdnaWQnKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldENvdW50cmllcygpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2bS5jb3VudHJpZXMgPSBfLnNvcnRCeShfLm1hcChkYXRhLmZlYXR1cmVzLCAncHJvcGVydGllcycpLCBmdW5jdGlvbiAocHJvcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoXy5pbmRleE9mKGVyaXNDb25maWcuZGVmYXVsdENvdW50cmllcywgcHJvcC5jb3VudHJ5KSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5zZWxlY3RlZENvdW50cmllcy5wdXNoKHByb3ApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9wLmNvdW50cnk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldENvdW50cnlMaXN0KHZtLmNvdW50cmllcyk7XG4gICAgICAgICAgICAgICAgaWYgKHFzLmNvdW50cmllcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAocXMuY291bnRyaWVzLmNvbnN0cnVjdG9yID09PSBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKHFzLmNvdW50cmllcywgZnVuY3Rpb24gKGNvdW50cnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5zZWxlY3RlZENvdW50cmllcy5wdXNoKF8uZmluZCh2bS5jb3VudHJpZXMsIHsgZ2lkOiBwYXJzZUludChjb3VudHJ5KSB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkQ291bnRyaWVzLnB1c2goXy5maW5kKHZtLmNvdW50cmllcywgeyBnaWQ6IHBhcnNlSW50KHFzLmNvdW50cmllcykgfSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2bS5zZWxlY3RlZENvdW50cmllcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmZpbHRlckJ5Q291bnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZtLmxvYWRpbmdDb3VudHJpZXMgPSBmYWxzZTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdFcnJvciBSZXRyaWV2aW5nIENvdW50cmllcycpLnRoZW1lKCd3YXJuLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nQ291bnRyaWVzID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5kaXJlY3RpdmUoJ2VyaXNDb3VudHJ5RmlsdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2V2ZW50RmlsdGVycy9jb3VudHJ5RmlsdGVyL2NvdW50cnlGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdjb3VudHJ5RmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge31cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ3NlbnNvckZpbHRlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGVyaXNDb25maWdcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLmVyaXNDb25maWcgPSBlcmlzQ29uZmlnO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLnNlbnNvckxpc3QgPSBbXTtcbiAgICAgICAgdm0uc2Vuc29ycyA9IFtdO1xuXG4gICAgICAgIHZtLmZpbHRlckJ5U2Vuc29ycyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRTZW5zb3JzKHZtLnNlbnNvcnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHFzLnNlbnNvcnMpIHtcbiAgICAgICAgICAgICAgICB2bS5zZW5zb3JzID0gcXMuc2Vuc29ycy5jb25zdHJ1Y3RvciAhPT0gQXJyYXkgPyBbcXMuc2Vuc29yc10gOiBxcy5zZW5zb3JzO1xuICAgICAgICAgICAgICAgIHZtLmZpbHRlckJ5U2Vuc29ycygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFNlbnNvckxpc3QoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0uc2Vuc29yTGlzdCA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmRpcmVjdGl2ZSgnZXJpc1NlbnNvckZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9ldmVudEZpbHRlcnMvc2Vuc29yRmlsdGVyL3NlbnNvckZpbHRlclRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ3NlbnNvckZpbHRlckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHt9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb250cm9sbGVyKCdmbXZGaWx0ZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgJG1kVG9hc3QsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgZm12U2VydmljZSxcbiAgICAgICAgZXJpc0NvbmZpZyxcbiAgICAgICAgTCxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXG4gICAgICAgICAgICBmaWx0ZXJTdHJhdGVneSA9IHFzLmZpbHRlclN0cmF0ZWd5ID8gcXMuZmlsdGVyU3RyYXRlZ3kgOiBlcmlzQ29uZmlnLmZpbHRlclN0cmF0ZWd5LFxuICAgICAgICAgICAgZm12TGF5ZXJzID0gbmV3IEwuZmVhdHVyZUdyb3VwKCk7XG5cbiAgICAgICAgdm0uZXJpc0NvbmZpZyA9IGVyaXNDb25maWc7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uem9vbUxldmVsID0gc3RhdGVTZXJ2aWNlLmdldE1hcFpvb20oKTtcbiAgICAgICAgdm0uZm12RmlsdGVyID0gcXMuZm12RmlsdGVyID8gcXMuZm12RmlsdGVyIDogZXJpc0NvbmZpZy5mbXZGaWx0ZXI7XG4gICAgICAgIHZtLmZtdkZpbHRlckNoZWNrZWQgPSB2bS5mbXZGaWx0ZXIgPT09ICdlbmFibGVkJztcbiAgICAgICAgdm0uZm12UmVzdWx0cyA9IG51bGw7XG4gICAgICAgIHZtLnJlZnJlc2hGTVZDbGFzcyA9ICcnO1xuXG4gICAgICAgIHZtLnVwZGF0ZUZNViA9IGZ1bmN0aW9uIChmZXRjaE5ld1Jlc3VsdHMpIHtcbiAgICAgICAgICAgIHZhciBkb1VwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2godm0uZm12UmVzdWx0cywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxuZ2xhdHMgPSBfLmluaXRpYWwoZC5ib3VuZGluZ2JveC5jb29yZGluYXRlc1swXSksXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRsbmdzID0gW107XG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChsbmdsYXRzLCBmdW5jdGlvbiAobG5nbGF0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRsbmdzLnB1c2goW2xuZ2xhdFsxXSwgbG5nbGF0WzBdXSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBmbXZMYXllcnMuYWRkTGF5ZXIoTC5wb2x5Z29uKGxhdGxuZ3MsIHsgY29sb3I6ICcjZmY5ODAwJywgc3Ryb2tlOiBmYWxzZSwgY2xhc3NOYW1lOiAnZm12LWxheWVyJyB9KSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZNVkxheWVycyhmbXZMYXllcnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZm12TGF5ZXJzLmNsZWFyTGF5ZXJzKCk7XG4gICAgICAgICAgICBmbXZMYXllcnMgPSBuZXcgTC5mZWF0dXJlR3JvdXAoKTtcbiAgICAgICAgICAgIGlmIChmZXRjaE5ld1Jlc3VsdHMgfHwgIXZtLmZtdlJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICB2bS5yZWZyZXNoRk1WQ2xhc3MgPSAnZmEtc3Bpbic7XG4gICAgICAgICAgICAgICAgZm12U2VydmljZS5nZXRBbGxSZWNvcmRpbmdzKCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLnJlZnJlc2hGTVZDbGFzcyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB2bS5mbXZSZXN1bHRzID0gcmVzdWx0LmRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgZG9VcGRhdGUoKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGTVZGaWx0ZXIoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRvVXBkYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Rk1WRmlsdGVyKHZtLmZtdkZpbHRlcik7XG4gICAgICAgICAgICBpZiAodm0uZm12RmlsdGVyID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICB2bS51cGRhdGVGTVYodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRGaWx0ZXJTdHJhdGVneSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaWx0ZXJTdHJhdGVneSA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5mbXZGaWx0ZXJDaGVja2VkJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5mbXZGaWx0ZXIgPSBuZXdWYWx1ZSA/ICdlbmFibGVkJyA6ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Rk1WRmlsdGVyKHZtLmZtdkZpbHRlcik7XG4gICAgICAgICAgICBpZiAodm0uZm12RmlsdGVyID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICB2bS51cGRhdGVGTVYodm0uZm12UmVzdWx0cyA9PT0gbnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TWFwWm9vbSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS56b29tTGV2ZWwgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSA8IDYpIHtcbiAgICAgICAgICAgICAgICBpZiAodm0uZm12RmlsdGVyID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZm12TGF5ZXJzLmNsZWFyTGF5ZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGTVZMYXllcnMoZm12TGF5ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgdm0uZm12RmlsdGVyID0gJ2Rpc2FibGVkJztcbiAgICAgICAgICAgICAgICAgICAgdm0uZm12RmlsdGVyQ2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaG93KCRtZFRvYXN0LnNpbXBsZSgpLnRleHRDb250ZW50KCdGTVYgZmlsdGVyIGRpc2FibGVkIGR1ZSB0byBjdXJyZW50IHpvb20gbGV2ZWwuIFpvb20gaW4gdG8gcmUtZW5hYmxlLicpLnRoZW1lKCdpbmZvLXRvYXN0JykucG9zaXRpb24oJ3RvcCByaWdodCcpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuZGlyZWN0aXZlKCdlcmlzRm12RmlsdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2V2ZW50RmlsdGVycy9mbXZGaWx0ZXIvZm12RmlsdGVyVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZm12RmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge31cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gVU5DTEFTU0lGSUVEXG4gwqkgMjAxNiBBcHBsaWVkIEluZm9ybWF0aW9uIFNjaWVuY2VzXG4gU2VlIENPUFlSSUdIVC50eHQgZm9yIGxpY2Vuc2luZyBpbmZvcm1hdGlvblxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZXJpcycpLmNvbnRyb2xsZXIoJ3ZvdGVGaWx0ZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgJG1kVG9hc3QsXG4gICAgICAgIG1vbWVudCxcbiAgICAgICAgXyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICB2b3RlU2VydmljZSxcbiAgICAgICAgZXJpc0NvbmZpZ1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0uZXJpc0NvbmZpZyA9IGVyaXNDb25maWc7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0udm90ZUZpbHRlciA9IHFzLnZvdGVGaWx0ZXIgPyBxcy52b3RlRmlsdGVyIDogZXJpc0NvbmZpZy52b3RlRmlsdGVyO1xuICAgICAgICB2bS52b3RlRmlsdGVyVHlwZSA9IHFzLnZvdGVGaWx0ZXJUeXBlID8gcXMudm90ZUZpbHRlclR5cGUgOiBlcmlzQ29uZmlnLnZvdGVGaWx0ZXJUeXBlO1xuICAgICAgICB2bS52b3RlRmlsdGVyQ2hlY2tlZCA9IHZtLnZvdGVGaWx0ZXIgPT09ICdlbmFibGVkJztcbiAgICAgICAgdm0udG90YWxWb3RlcyA9IHFzLnRvdGFsVm90ZXMgPyBwYXJzZUludChxcy50b3RhbFZvdGVzLCAxMCkgOiBlcmlzQ29uZmlnLnRvdGFsVm90ZXM7XG4gICAgICAgIHZtLnZvdGVSZXN1bHRzID0gbnVsbDtcblxuICAgICAgICB2YXIgdXBkYXRlRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRlbXBvcmFsRmlsdGVyID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgICAgICB2b3RlU2VydmljZS5nZXRWb3Rlcyh7IHR5cGU6IHZtLnZvdGVGaWx0ZXJUeXBlLCBzdGFydDogdGVtcG9yYWxGaWx0ZXIuc3RhcnQsIHN0b3A6IHRlbXBvcmFsRmlsdGVyLnN0b3AsIHRvdGFsOiB2bS50b3RhbFZvdGVzIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICB2YXIgdm90ZWRFdmVudHMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJlc3VsdHMuZGF0YSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgdm90ZWRFdmVudHMgPSBBcnJheS5pc0FycmF5KHJlc3VsdHMuZGF0YSkgPyByZXN1bHRzLmRhdGEgOiBbcmVzdWx0cy5kYXRhXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVkRXZlbnRzKHZvdGVkRXZlbnRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZvdGVGaWx0ZXIodm0udm90ZUZpbHRlcik7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VG90YWxWb3Rlcyh2bS50b3RhbFZvdGVzKTtcbiAgICAgICAgICAgIGlmICh2bS52b3RlRmlsdGVyID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgdm0udm90ZVVwQnRuQ29sb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodm0udm90ZUZpbHRlciA9PT0gJ2VuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZtLnZvdGVGaWx0ZXJUeXBlID09PSAnVXAnID8gJ2dyZWVuLTcwMCcgOiAnZ3JleS03MDAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICdncmV5LTcwMCc7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udm90ZURvd25CdG5Db2xvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh2bS52b3RlRmlsdGVyID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdm0udm90ZUZpbHRlclR5cGUgPT09ICdEb3duJyA/ICdyZWQtNzAwJyA6ICdncmV5LTcwMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJ2dyZXktNzAwJztcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zZXRWb3RlVHlwZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgdm0udm90ZUZpbHRlclR5cGUgPSB2bS52b3RlRmlsdGVyVHlwZSA9PT0gdmFsdWUgPyAnbm9uZScgOiB2YWx1ZTtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWb3RlRmlsdGVyVHlwZSh2bS52b3RlRmlsdGVyVHlwZSk7XG4gICAgICAgICAgICBpZiAodm0udm90ZUZpbHRlciA9PT0gJ2VuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0udm90ZUZpbHRlckNoZWNrZWQnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLnZvdGVGaWx0ZXIgPSBuZXdWYWx1ZSA/ICdlbmFibGVkJyA6ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZUZpbHRlcih2bS52b3RlRmlsdGVyKTtcbiAgICAgICAgICAgIGlmICh2bS52b3RlRmlsdGVyID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVFdmVudHMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHRlbXBvcmFsRmlsdGVyID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RvcCkuZGlmZihtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0YXJ0KSwgJ2QnKSA+IDcpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsRmlsdGVyKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0b3ApLnN1YnRyYWN0KDYsICdoJykudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3A6IHRlbXBvcmFsRmlsdGVyLnN0b3BcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICRtZFRvYXN0LnNob3coJG1kVG9hc3Quc2ltcGxlKCkudGV4dENvbnRlbnQoJ1RlbXBvcmFsIGZpbHRlciBhZGp1c3RlZCB0byA2IGhvdXJzJykudGhlbWUoJ2luZm8tdG9hc3QnKS5wb3NpdGlvbigndG9wIHJpZ2h0JykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vm90ZWRFdmVudHMobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnRvdGFsVm90ZXMnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUb3RhbFZvdGVzKG5ld1ZhbHVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIGlzb2xhdGVkIHdpbGwgYmUgdHJ1ZSB3aGVuIGV2ZW50cyBwb2xsaW5nIGlzIGFjdGl2ZVxuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpIHx8IG5ld1ZhbHVlLmlzb2xhdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdXBkYXRlRXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBVTkNMQVNTSUZJRURcbiDCqSAyMDE2IEFwcGxpZWQgSW5mb3JtYXRpb24gU2NpZW5jZXNcbiBTZWUgQ09QWVJJR0hULnR4dCBmb3IgbGljZW5zaW5nIGluZm9ybWF0aW9uXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlcmlzJykuZGlyZWN0aXZlKCdlcmlzVm90ZUZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9ldmVudEZpbHRlcnMvdm90ZUZpbHRlci92b3RlRmlsdGVyVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAndm90ZUZpbHRlckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHt9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFVOQ0xBU1NJRklFRFxuIMKpIDIwMTYgQXBwbGllZCBJbmZvcm1hdGlvbiBTY2llbmNlc1xuIFNlZSBDT1BZUklHSFQudHh0IGZvciBsaWNlbnNpbmcgaW5mb3JtYXRpb25cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VyaXMnKS5jb25maWcoZnVuY3Rpb24gKCRwcm92aWRlKSB7XG4gICAgICAgICRwcm92aWRlLmRlY29yYXRvcignJGh0dHBCYWNrZW5kJywgYW5ndWxhci5tb2NrLmUyZS4kaHR0cEJhY2tlbmREZWNvcmF0b3IpO1xuICAgIH0pLnJ1bihmdW5jdGlvbiAoJGh0dHBCYWNrZW5kLCBlcmlzQ29uZmlnLCBzdGF0ZVNlcnZpY2UsIFhNTEh0dHBSZXF1ZXN0LCBtb21lbnQsIF8pe1xuICAgICAgICB2YXIgZ2V0U3luYyA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHVybCwgZmFsc2UpO1xuICAgICAgICAgICAgcmVxdWVzdC5zZW5kKG51bGwpO1xuICAgICAgICAgICAgcmV0dXJuIFtyZXF1ZXN0LnN0YXR1cywgcmVxdWVzdC5yZXNwb25zZSwge31dO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB2b3Rlck5hbWVSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvdm90ZXJzJywgJ2knKSxcbiAgICAgICAgICAgIHZvdGVyUmVnZXggPSBuZXcgUmVnRXhwKCdeJyArIGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL3ZvdGVzL3ZvdGVyJywgJ2knKSxcbiAgICAgICAgICAgIHZvdGVzUmVnZXggPSBuZXcgUmVnRXhwKCdeJyArIGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL3ZvdGVzJywgJ2knKSxcbiAgICAgICAgICAgIHJlYXNvbnNPdmVycmlkZVVybCA9ICcuL3N0YXRpYy9kYXRhL3JlYXNvbnMuanNvbicsXG4gICAgICAgICAgICByZWFzb25zUmVnZXggPSBuZXcgUmVnRXhwKCdeJyArIGVyaXNDb25maWcuZXJpc0FwaS51cmwgKyAnL3JlYXNvbnMnLCAnaScpLFxuICAgICAgICAgICAgZXZlbnRzUmVnZXggPSBuZXcgUmVnRXhwKCdeJyArIGVyaXNDb25maWcuc2VydmVyLnVybCwgJ2knKSxcbiAgICAgICAgICAgIHBsb3REYXRhUmVnZXggPSBuZXcgUmVnRXhwKCdeJyArIGVyaXNDb25maWcuZXZlbnRTZXJ2ZXIuYWpheFVybCArICcvcGxvdC1kYXRhJywgJ2knKSxcbiAgICAgICAgICAgIGZyYW1lc1JlZ2V4ID0gbmV3IFJlZ0V4cCgnXicgKyBlcmlzQ29uZmlnLmV2ZW50U2VydmVyLmFqYXhVcmwgKyAnL2ZyYW1lcycsICdpJyksXG4gICAgICAgICAgICBnaWZSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvZ2lmJywgJ2knKSxcbiAgICAgICAgICAgIGZtdlJlZ2V4ID0gbmV3IFJlZ0V4cCgnXicgKyBlcmlzQ29uZmlnLmZtdi51cmwsICdpJyksXG4gICAgICAgICAgICBjb3JyZWxhdGlvbk92ZXJyaWRlVXJsID0gJy4vc3RhdGljL2RhdGEvY29ycmVsYXRpb24uanNvbicsXG4gICAgICAgICAgICBjb3VudHJpZXNPdmVycmlkZVVybCA9ICcuL3N0YXRpYy9kYXRhL2NvdW50cmllcy5qc29uJyxcbiAgICAgICAgICAgIHN0cmlrZVJlZ2V4ID0gbmV3IFJlZ0V4cCgnXicgKyBlcmlzQ29uZmlnLmxvY2FsU2VydmVyLnVybCwgJ2knKSxcbiAgICAgICAgICAgIHNjYWxlUmVnZXggPSBuZXcgUmVnRXhwKCdeJyArIGVyaXNDb25maWcuc2NhbGUuYWpheFVybCwgJ2knKSxcbiAgICAgICAgICAgIGttbFJlZ2V4ID0gbmV3IFJlZ0V4cCgnXicgKyBlcmlzQ29uZmlnLmVyaXNBcGkudXJsICsgJy9rbWwnLCAnaScpLFxuICAgICAgICAgICAgYWxlcnRSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgZXJpc0NvbmZpZy5lcmlzQXBpLnVybCArICcvYWxlcnRzJywgJ2knKSxcbiAgICAgICAgICAgIGV2ZW50c0RhdGEgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ0ZlYXR1cmVDb2xsZWN0aW9uJyxcbiAgICAgICAgICAgICAgICB0b3RhbEZlYXR1cmVzOiAwLFxuICAgICAgICAgICAgICAgIGZlYXR1cmVzOiBudWxsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RyaWtlRGF0YSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnRmVhdHVyZUNvbGxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIHRvdGFsRmVhdHVyZXM6IDAsXG4gICAgICAgICAgICAgICAgZmVhdHVyZXM6IG51bGxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmaWx0ZXJlZEV2ZW50c0RhdGEgPSBudWxsLFxuICAgICAgICAgICAgZmlsdGVyZWRTdHJpa2VEYXRhID0gbnVsbCxcbiAgICAgICAgICAgIHBsb3REYXRhID0gW107XG5cbiAgICAgICAgdmFyIGNvdW50cnlDb2RlcyA9IFsnVUEnLCAnQ04nLCAnVVMnLCAnTVknLCAnUEwnLCAnUFMnLCAnSlAnLCAnUFQnLCAnRUcnLCAnVE0nLCAnU0UnLCAnSUQnLCAnWUUnLCAnQ1onLCAnQlInLCAnQ1knLCAnTUEnLCAnS0gnLCAnTkcnLCAnUlUnLCAnRk0nLCAnS1onLCAnUEgnLCAnR1InLCAnQ0EnLCAnRlInLCAnSUUnXTtcblxuICAgICAgICB2YXIgZXZlbnQgPSB7XG4gICAgICAgICAgICB0eXBlOiAnRmVhdHVyZUNvbGxlY3Rpb24nLFxuICAgICAgICAgICAgdG90YWxGZWF0dXJlczogMSxcbiAgICAgICAgICAgIGZlYXR1cmVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbiAgICAgICAgICAgICAgICBpZDogJ2V2ZW50cy5maWQnLFxuICAgICAgICAgICAgICAgIGdlb21ldHJ5OiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQb2ludCcsXG4gICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzOiBbLTEwMCwgMzVdXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBnZW9tZXRyeV9uYW1lOiAnZXZlbnRfbG9jYXRpb24nLFxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdF9pZDogJzExMTExMTExMTEnLFxuICAgICAgICAgICAgICAgICAgICBpZGVudGl0eTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YXNldF9pZDogMTAsXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50X3R5cGU6ICdTdGF0aWMnLFxuICAgICAgICAgICAgICAgICAgICBmaWxlX3BhdGg6ICdmaWxlMS5oNScsXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50X2xvbjogLTEwMCxcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRfbGF0OiAzNSxcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRfdGltZTogJzIwMTctMDMtMDVUMTI6NTY6MzhaJyxcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRfY2xhc3M6ICdVVFlQJyxcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRfY29uZmlkZW5jZTogOTEsXG4gICAgICAgICAgICAgICAgICAgIHBlYWtfaW50ZW5zaXR5OiA3NjcsXG4gICAgICAgICAgICAgICAgICAgIHBlYWtfc25yOiA0MDEsXG4gICAgICAgICAgICAgICAgICAgIGlzX2NvcnJlbGF0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjb3VudHJ5X2NvZGU6IGNvdW50cnlDb2Rlc1s1XSxcbiAgICAgICAgICAgICAgICAgICAgcGF5bG9hZF9pZDogJ1NlbnNvciAxJyxcbiAgICAgICAgICAgICAgICAgICAgbG9jX21pbm9yX2F4aXM6IDcwMCxcbiAgICAgICAgICAgICAgICAgICAgbG9jX21ham9yX2F4aXM6IDI1MDAsXG4gICAgICAgICAgICAgICAgICAgIGVsbGlwc2Vfb3JpZW50YXRpb246IC00NVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdlbmVyYXRlRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXZlbnRzRGF0YS5mZWF0dXJlcyA9IFtdO1xuXG4gICAgICAgICAgICB2YXIgdGVtcG9yYWxGaWx0ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBzdGFydCA9IG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RhcnQpLFxuICAgICAgICAgICAgICAgIHN0b3AgPSBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0b3ApLFxuICAgICAgICAgICAgICAgIHJhbmdlID0gc3RvcC5kaWZmKHN0YXJ0LCAnZCcpLFxuICAgICAgICAgICAgICAgIG1hcEJvdW5kcyA9IHN0YXRlU2VydmljZS5nZXRNYXBCb3VuZHMoKSxcbiAgICAgICAgICAgICAgICBtaW5MYXQgPSBtYXBCb3VuZHMuX3NvdXRoV2VzdC5sYXQsXG4gICAgICAgICAgICAgICAgbWF4TGF0ID0gbWFwQm91bmRzLl9ub3J0aEVhc3QubGF0LFxuICAgICAgICAgICAgICAgIG1pbkxuZyA9IG1hcEJvdW5kcy5fc291dGhXZXN0LmxuZyxcbiAgICAgICAgICAgICAgICBtYXhMbmcgPSBtYXBCb3VuZHMuX25vcnRoRWFzdC5sbmcsXG4gICAgICAgICAgICAgICAgbWF4RmVhdHVyZXMgPSAwO1xuXG4gICAgICAgICAgICBpZiAocmFuZ2UgPD0gMSkge1xuICAgICAgICAgICAgICAgIG1heEZlYXR1cmVzID0gMTAwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyYW5nZSA+IDEgJiYgcmFuZ2UgPD0gMykge1xuICAgICAgICAgICAgICAgIG1heEZlYXR1cmVzID0gMjAwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyYW5nZSA+IDMgJiYgcmFuZ2UgPD0gNykge1xuICAgICAgICAgICAgICAgIG1heEZlYXR1cmVzID0gNTAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXhGZWF0dXJlcyA9IDEwMDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmaWxlTGlzdCA9IFtcbiAgICAgICAgICAgICAgICAnaHR0cHM6Ly9zdXBwb3J0LmhkZmdyb3VwLm9yZy9mdHAvSERGNS9leGFtcGxlcy9leGFtcGxlcy1ieS1hcGkvbWF0bGFiL0hERjVfTV9FeGFtcGxlcy9oNWV4X2RfYWxsb2MuaDUnLFxuICAgICAgICAgICAgICAgICdodHRwczovL3N1cHBvcnQuaGRmZ3JvdXAub3JnL2Z0cC9IREY1L2V4YW1wbGVzL2V4YW1wbGVzLWJ5LWFwaS9tYXRsYWIvSERGNV9NX0V4YW1wbGVzL2g1ZXhfZF9jaGVja3N1bS5oNScsXG4gICAgICAgICAgICAgICAgJ2h0dHBzOi8vc3VwcG9ydC5oZGZncm91cC5vcmcvZnRwL0hERjUvZXhhbXBsZXMvZXhhbXBsZXMtYnktYXBpL21hdGxhYi9IREY1X01fRXhhbXBsZXMvaDVleF9kX2NodW5rLmg1JyxcbiAgICAgICAgICAgICAgICAnaHR0cHM6Ly9zdXBwb3J0LmhkZmdyb3VwLm9yZy9mdHAvSERGNS9leGFtcGxlcy9leGFtcGxlcy1ieS1hcGkvbWF0bGFiL0hERjVfTV9FeGFtcGxlcy9oNWV4X2RfY29tcGFjdC5oNScsXG4gICAgICAgICAgICAgICAgJ2h0dHBzOi8vc3VwcG9ydC5oZGZncm91cC5vcmcvZnRwL0hERjUvZXhhbXBsZXMvZXhhbXBsZXMtYnktYXBpL21hdGxhYi9IREY1X01fRXhhbXBsZXMvaDVleF9kX2V4dGVybi5oNSdcbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIGV2ZW50c0RhdGEudG90YWxGZWF0dXJlcyA9IChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4RmVhdHVyZXMgLSAxICsgMSkpICsgMSkgKyAxO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50c0RhdGEudG90YWxGZWF0dXJlczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxhdCA9IHBhcnNlRmxvYXQoKE1hdGgucmFuZG9tKCkgKiAobWF4TGF0IC0gbWluTGF0KSArIG1pbkxhdCkudG9GaXhlZCg2KSksXG4gICAgICAgICAgICAgICAgICAgIGxuZyA9IHBhcnNlRmxvYXQoKE1hdGgucmFuZG9tKCkgKiAobWF4TG5nIC0gbWluTG5nKSArIG1pbkxuZykudG9GaXhlZCg2KSksXG4gICAgICAgICAgICAgICAgICAgIGRhdGUgPSBtb21lbnQudXRjKHN0YXJ0LnZhbHVlT2YoKSArIE1hdGgucmFuZG9tKCkgKiAoc3RvcC52YWx1ZU9mKCkgLSBzdGFydC52YWx1ZU9mKCkpKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgzMDAgLSAxICsgMSkpICsgMSxcbiAgICAgICAgICAgICAgICAgICAgcmFuZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgyIC0gMSArIDEpKSArIDEsXG4gICAgICAgICAgICAgICAgICAgIHJhbmQyID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKDIgLSAxICsgMSkpICsgMSxcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpdHkgPSByYW5kID09PSAxLFxuICAgICAgICAgICAgICAgICAgICBzZW5zb3IgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoNSAtIDEgKyAxKSkgKyAxO1xuXG4gICAgICAgICAgICAgICAgdmFyIGZlYXR1cmUgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICdldmVudHMuZmlkJyxcbiAgICAgICAgICAgICAgICAgICAgZ2VvbWV0cnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQb2ludCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb29yZGluYXRlczogW2xuZywgbGF0XVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZW9tZXRyeV9uYW1lOiAnZXZlbnRfbG9jYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9kdWN0X2lkOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDAwMCkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aXR5OiBpZGVudGl0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFzZXRfaWQ6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgxMDAwIC0gMSArIDEpKSArIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudF90eXBlOiAnU3RhdGljJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVfcGF0aDogZmlsZUxpc3RbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKDUgLSAxKSArIDEpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50X2xvbjogbG5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRfbGF0OiBsYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudF90aW1lOiBkYXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRfY2xhc3M6ICdVVFlQJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50X2NvbmZpZGVuY2U6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgxMDAgLSAxICsgMSkpICsgMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlYWtfaW50ZW5zaXR5OiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMTAwMCAtIDEgKyAxKSkgKyAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGVha19zbnI6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICg1MDAgLSAxICsgMSkpICsgMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50X3N0YXJ0OiBtb21lbnQudXRjKGRhdGUpLnN1YnRyYWN0KE1hdGguZmxvb3IoZHVyYXRpb24gLyAyKSwgJ3MnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50X2VuZDogbW9tZW50LnV0YyhkYXRlKS5hZGQoTWF0aC5jZWlsKGR1cmF0aW9uIC8gMiksICdzJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudF9kdXJhdGlvbjogbW9tZW50LmR1cmF0aW9uKGR1cmF0aW9uLCAncycpLmZvcm1hdCgnbW06c3MuU1NTJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBpc19jb3JyZWxhdGVkOiAoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKDEwIC0gMSkgKyAxKSkgJSAyICE9PSAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnRyeV9jb2RlOiBjb3VudHJ5Q29kZXNbKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgyNykpKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXlsb2FkX2lkOiAnU2Vuc29yICcgKyBzZW5zb3IsXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NfbWlub3JfYXhpczogcmFuZDIgPT09IDEgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMTAwMCAtIDEwMCkgKyAxMDApICsgMSA6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NfbWFqb3JfYXhpczogcmFuZDIgPT09IDEgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMTAwMDAgLSAxMDAxKSArIDEwMDEpIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxvY19taW5vcl9heGlzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbG9jX21ham9yX2F4aXM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGxpcHNlX29yaWVudGF0aW9uOiBpZGVudGl0eSA/IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgzNjAgKyAoLTE4MCkpICsgKC0xODApKSA6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBldmVudHNEYXRhLmZlYXR1cmVzLnB1c2goZmVhdHVyZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBldmVudHNEYXRhLmZlYXR1cmVzLnB1c2goZXZlbnQuZmVhdHVyZXNbMF0pO1xuICAgICAgICAgICAgZmlsdGVyZWRFdmVudHNEYXRhID0gXy5jbG9uZShldmVudHNEYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2VuZXJhdGVFdmVudFRyYWNrcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhY3RpdmVFdmVudCA9IHN0YXRlU2VydmljZS5nZXRBY3RpdmVFdmVudCgpO1xuXG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgcmVxdWVzdC5vcGVuKCdHRVQnLCAnLi9zdGF0aWMvZGF0YS9ldmVudFRyYWNrcy5qc29uJywgZmFsc2UpO1xuICAgICAgICAgICAgcmVxdWVzdC5zZW5kKG51bGwpO1xuXG4gICAgICAgICAgICB2YXIgZXZlbnRUcmFja3MgPSBKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgICAgICAgZXZlbnRUcmFja3MuZmVhdHVyZXNbMF0uZ2VvbWV0cnkuY29vcmRpbmF0ZXMgPSBhY3RpdmVFdmVudC5nZW9tZXRyeS5jb29yZGluYXRlcztcbiAgICAgICAgICAgIGV2ZW50VHJhY2tzLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMgPSBhY3RpdmVFdmVudC5wcm9wZXJ0aWVzO1xuXG4gICAgICAgICAgICByZXR1cm4gWzIwMCwgSlNPTi5zdHJpbmdpZnkoZXZlbnRUcmFja3MpLCB7fV07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdlbmVyYXRlUGxvdERhdGEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgcmVxdWVzdC5vcGVuKCdHRVQnLCAnLi9zdGF0aWMvZGF0YS9wbG90RGF0YS5qc29uJywgZmFsc2UpO1xuICAgICAgICAgICAgcmVxdWVzdC5zZW5kKG51bGwpO1xuXG4gICAgICAgICAgICB2YXIgZGF0YSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZSksXG4gICAgICAgICAgICAgICAgc3RhcnRUaW1lID0gMCxcbiAgICAgICAgICAgICAgICBwb2ludHMgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAyNTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGludGVuc2l0eSA9IE1hdGgucmFuZG9tKCkgKiAoMTAgLSAoLTEwKSkgKyAoLTEwKSxcbiAgICAgICAgICAgICAgICAgICAgc2Vuc29ySWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKDYpKTtcblxuICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKFsoc3RhcnRUaW1lICsgaSksIHNlbnNvcklkeCwgMCwgaW50ZW5zaXR5XSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRhdGEucG9pbnRzID0gcG9pbnRzO1xuXG4gICAgICAgICAgICBwbG90RGF0YSA9IGRhdGE7XG4gICAgICAgICAgICByZXR1cm4gWzIwMCwgSlNPTi5zdHJpbmdpZnkocGxvdERhdGEpLCB7fV07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdlbmVyYXRlRnJhbWVEYXRhID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGZyYW1lRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IHBsb3REYXRhLnBvaW50cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IFtdXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGZyYW1lSWR4ID0gMDsgZnJhbWVJZHggPCBmcmFtZURhdGEuY291bnQ7IGZyYW1lSWR4KyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZnJhbWUgPSB7XG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiA0NSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBwbG90RGF0YS5wb2ludHNbZnJhbWVJZHhdWzBdLFxuICAgICAgICAgICAgICAgICAgICBtaW46IC0xMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxMCxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiAnVVRZUCcsXG4gICAgICAgICAgICAgICAgICAgIHNlbnNvcjogcGxvdERhdGEuc2Vuc29yc1twbG90RGF0YS5wb2ludHNbZnJhbWVJZHhdWzFdXSxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiA0NVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDIwMjU7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBmcmFtZS52YWx1ZXMucHVzaChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoZnJhbWUubWF4IC0gZnJhbWUubWluKSArIGZyYW1lLm1pbikpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChmcmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcmFtZURhdGEucmVzdWx0cyA9IHJlc3VsdHM7XG5cbiAgICAgICAgICAgIHJldHVybiBbMjAwLCBKU09OLnN0cmluZ2lmeShmcmFtZURhdGEpLCB7fV07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdlbmVyYXRlRk1WRGF0YSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBtYXBCb3VuZHMgPSBzdGF0ZVNlcnZpY2UuZ2V0TWFwQm91bmRzKCksXG4gICAgICAgICAgICAgICAgbWluTGF0ID0gbWFwQm91bmRzLl9zb3V0aFdlc3QubGF0LFxuICAgICAgICAgICAgICAgIG1heExhdCA9IG1hcEJvdW5kcy5fbm9ydGhFYXN0LmxhdCxcbiAgICAgICAgICAgICAgICBtaW5MbmcgPSBtYXBCb3VuZHMuX3NvdXRoV2VzdC5sbmcsXG4gICAgICAgICAgICAgICAgbWF4TG5nID0gbWFwQm91bmRzLl9ub3J0aEVhc3QubG5nO1xuXG4gICAgICAgICAgICB2YXIgZm12RGF0YSA9IHtcbiAgICAgICAgICAgICAgICBjb2RlOiAnT0snLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdTdWNjZXNzZnVsbHkgc2VhcmNoZWQgcmVjb3JkaW5ncy4nLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdG90YWw6IChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMTAwMCAtIDEwICsgMSkpICsgMTApLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkVG90YWw6IChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoNTAgLSA1ICsgMSkpICsgNSkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogW11cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNlY3VyaXR5Y2xhc3NpZmljYXRpb246ICdVTkNMQVNTSUZJRUQnXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZtdkRhdGEuZGF0YS5maWx0ZXJlZFRvdGFsOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdFJhbmQgPSAoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKHBhcnNlSW50KHBhcmFtcy5lbmR0aW1lKSAtIHBhcnNlSW50KHBhcmFtcy5zdGFydHRpbWUpICsgMSkpICsgcGFyc2VJbnQocGFyYW1zLnN0YXJ0dGltZSkpICogMTAwMCxcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRUaW1lID0gbW9tZW50LnV0YygocGFyYW1zLnN0YXJ0dGltZSAqIDEwMDApICsgdFJhbmQpLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICg2MDAgLSAxMCArIDEpKSArIDEwLFxuICAgICAgICAgICAgICAgICAgICBlbmRUaW1lID0gbW9tZW50LnV0YyhzdGFydFRpbWUpLmFkZChkdXJhdGlvbiwgJ3MnKSxcbiAgICAgICAgICAgICAgICAgICAgbm9ydGggPSBwYXJzZUZsb2F0KChNYXRoLnJhbmRvbSgpICogKG1heExhdCAtIG1pbkxhdCkgKyBtaW5MYXQpLnRvRml4ZWQoNCkpLFxuICAgICAgICAgICAgICAgICAgICBzb3V0aCA9IG5vcnRoIC0gMC4xLFxuICAgICAgICAgICAgICAgICAgICBlYXN0ID0gcGFyc2VGbG9hdCgoTWF0aC5yYW5kb20oKSAqIChtYXhMbmcgLSBtaW5MbmcpICsgbWluTG5nKS50b0ZpeGVkKDQpKSxcbiAgICAgICAgICAgICAgICAgICAgd2VzdCA9IGVhc3QgLSAwLjE7XG5cbiAgICAgICAgICAgICAgICBmbXZEYXRhLmRhdGEuZGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEyMzQ1Njc4LFxuICAgICAgICAgICAgICAgICAgICBuaWQ6IDEyMyxcbiAgICAgICAgICAgICAgICAgICAgZmVlZG5hbWU6ICdNeSBGZWVkJyxcbiAgICAgICAgICAgICAgICAgICAgc3RhcnR0aW1lOiBzdGFydFRpbWUudW5peCgpLFxuICAgICAgICAgICAgICAgICAgICBlbmR0aW1lOiBlbmRUaW1lLnVuaXgoKSxcbiAgICAgICAgICAgICAgICAgICAgbWNhOiAnMTIzLjQ1LjY3OC45MDE6MjM0NScsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgbG9va3Vwczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vuc29yOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYXRmb3JtOiBbJ015IFBsYXRmb3JtJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW9uOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50cnk6IFsnVVMnXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBib3VuZGluZ2JveDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1BvbHlnb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZXM6IFtbW2Vhc3Qsbm9ydGhdLFt3ZXN0LG5vcnRoXSxbd2VzdCxzb3V0aF0sW2Vhc3Qsc291dGhdLFtlYXN0LG5vcnRoXV1dXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGRvd25sb2FkdXJsOiAnL2FwaS9kb3dubG9hZC8xMjM0NTY3OCdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIFsyMDAsIEpTT04uc3RyaW5naWZ5KGZtdkRhdGEpLCB7fV07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdlbmVyYXRlU3RyaWtlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0cmlrZURhdGEuZmVhdHVyZXMgPSBbXTtcblxuICAgICAgICAgICAgdmFyIHRlbXBvcmFsRmlsdGVyID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgc3RhcnQgPSBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0YXJ0KSxcbiAgICAgICAgICAgICAgICBzdG9wID0gbW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdG9wKSxcbiAgICAgICAgICAgICAgICByYW5nZSA9IHN0b3AuZGlmZihzdGFydCwgJ2QnKSxcbiAgICAgICAgICAgICAgICBtYXBCb3VuZHMgPSBzdGF0ZVNlcnZpY2UuZ2V0TWFwQm91bmRzKCksXG4gICAgICAgICAgICAgICAgbWluTGF0ID0gbWFwQm91bmRzLl9zb3V0aFdlc3QubGF0LFxuICAgICAgICAgICAgICAgIG1heExhdCA9IG1hcEJvdW5kcy5fbm9ydGhFYXN0LmxhdCxcbiAgICAgICAgICAgICAgICBtaW5MbmcgPSBtYXBCb3VuZHMuX3NvdXRoV2VzdC5sbmcsXG4gICAgICAgICAgICAgICAgbWF4TG5nID0gbWFwQm91bmRzLl9ub3J0aEVhc3QubG5nLFxuICAgICAgICAgICAgICAgIG1heEZlYXR1cmVzID0gMDtcblxuICAgICAgICAgICAgaWYgKHJhbmdlIDw9IDEpIHtcbiAgICAgICAgICAgICAgICBtYXhGZWF0dXJlcyA9IDUwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyYW5nZSA+IDEgJiYgcmFuZ2UgPD0gMykge1xuICAgICAgICAgICAgICAgIG1heEZlYXR1cmVzID0gMTAwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyYW5nZSA+IDMgJiYgcmFuZ2UgPD0gNykge1xuICAgICAgICAgICAgICAgIG1heEZlYXR1cmVzID0gMjUwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXhGZWF0dXJlcyA9IDUwMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RyaWtlRGF0YS50b3RhbEZlYXR1cmVzID0gKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXhGZWF0dXJlcyAtIDEgKyAxKSkgKyAxKSArIDE7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaWtlRGF0YS50b3RhbEZlYXR1cmVzOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbGF0ID0gcGFyc2VGbG9hdCgoTWF0aC5yYW5kb20oKSAqIChtYXhMYXQgLSBtaW5MYXQpICsgbWluTGF0KS50b0ZpeGVkKDYpKSxcbiAgICAgICAgICAgICAgICAgICAgbG5nID0gcGFyc2VGbG9hdCgoTWF0aC5yYW5kb20oKSAqIChtYXhMbmcgLSBtaW5MbmcpICsgbWluTG5nKS50b0ZpeGVkKDYpKSxcbiAgICAgICAgICAgICAgICAgICAgZGF0ZSA9IG1vbWVudC51dGMoc3RhcnQudmFsdWVPZigpICsgTWF0aC5yYW5kb20oKSAqIChzdG9wLnZhbHVlT2YoKSAtIHN0YXJ0LnZhbHVlT2YoKSkpLnRvSVNPU3RyaW5nKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmVhdHVyZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ0ZlYXR1cmUnLFxuICAgICAgICAgICAgICAgICAgICBpZDogJ2V2ZW50cy5maWQnLFxuICAgICAgICAgICAgICAgICAgICBnZW9tZXRyeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1BvaW50JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzOiBbbG5nLCBsYXRdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdlb21ldHJ5X25hbWU6ICdnZW9tJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ0VOVElUWSBOQU1FJzogJ015IFN0cmlrZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBPUkQxOiAnMScsXG4gICAgICAgICAgICAgICAgICAgICAgICBPUkROQU5DRV8xOiAnV2F0ZXItQmFsbG9vbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBPUkQyOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIE9SRE5BTkNFXzI6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgT1JEMzogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBPUkROQU5DRV8zOiAnU3VwZXItU29ha2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIE9SRDQ6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgT1JETkFOQ0VfNDogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBPUkQ1OiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIE9SRE5BTkNFXzU6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgT1JENjogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBPUkROQU5DRV82OiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIE9SRDc6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgT1JETkFOQ0VfNzogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnVEFSR0VUcyBSRU1BUksnOiAnRFVERSBJUyBBTEwgU09BS0VEJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIExPTkc6IGxuZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIExBVDogbGF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZV90aW1lOiBkYXRlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgc3RyaWtlRGF0YS5mZWF0dXJlcy5wdXNoKGZlYXR1cmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmlsdGVyZWRTdHJpa2VEYXRhID0gXy5jbG9uZShzdHJpa2VEYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUZW1wbGF0ZXMgcmVxdWVzdHMgbXVzdCBwYXNzIHRocm91Z2hcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQoL2h0bWwkLykucGFzc1Rocm91Z2goKTtcblxuICAgICAgICAvLyBTY2FsZSByZXF1ZXN0cyBwYXNzIHRocm91Z2hcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQoc2NhbGVSZWdleCkucGFzc1Rocm91Z2goKTtcblxuICAgICAgICAvLyBWb3RlIHJlcXVlc3RzIHBhc3MgdGhyb3VnaFxuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVCh2b3RlclJlZ2V4KS5wYXNzVGhyb3VnaCgpO1xuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVCh2b3Rlc1JlZ2V4KS5wYXNzVGhyb3VnaCgpO1xuICAgICAgICAkaHR0cEJhY2tlbmQud2hlblBPU1Qodm90ZXNSZWdleCkucGFzc1Rocm91Z2goKTtcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5QVVQodm90ZXNSZWdleCkucGFzc1Rocm91Z2goKTtcblxuICAgICAgICAvLyBWb3RlciBOYW1lIHJlcXVlc3RzIHBhc3MgdGhyb3VnaFxuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVCh2b3Rlck5hbWVSZWdleCkucGFzc1Rocm91Z2goKTtcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5QT1NUKHZvdGVyTmFtZVJlZ2V4KS5wYXNzVGhyb3VnaCgpO1xuXG4gICAgICAgIC8vIEdpZiByZXF1ZXN0cyBwYXNzIHRocm91Z2hcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5QT1NUKGdpZlJlZ2V4KS5wYXNzVGhyb3VnaCgpO1xuXG4gICAgICAgICRodHRwQmFja2VuZC53aGVuUE9TVChrbWxSZWdleCkucGFzc1Rocm91Z2goKTtcblxuICAgICAgICAvLyBSZWFzb25zIHNlcnZpY2VcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQocmVhc29uc1JlZ2V4KS5yZXNwb25kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTeW5jKHJlYXNvbnNPdmVycmlkZVVybCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50cyBzZXJ2aWNlXG4gICAgICAgICRodHRwQmFja2VuZC53aGVuUE9TVChldmVudHNSZWdleCkucmVzcG9uZChmdW5jdGlvbiAobWV0aG9kLCB1cmwpIHtcbiAgICAgICAgICAgIHZhciBtYXBCb3VuZHMgPSBzdGF0ZVNlcnZpY2UuZ2V0TWFwQm91bmRzKCk7XG4gICAgICAgICAgICBpZiAobWFwQm91bmRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50c0RhdGEuZmVhdHVyZXMgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVFdmVudHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGludGVuc2l0eSA9IHN0YXRlU2VydmljZS5nZXRJbnRlbnNpdHkoKTtcbiAgICAgICAgICAgICAgICB2YXIgc25yID0gc3RhdGVTZXJ2aWNlLmdldFNucigpO1xuICAgICAgICAgICAgICAgIHZhciBkdXJhdGlvbiA9IHN0YXRlU2VydmljZS5nZXREdXJhdGlvbigpO1xuICAgICAgICAgICAgICAgIGZpbHRlcmVkRXZlbnRzRGF0YS5mZWF0dXJlcyA9IF8uZmlsdGVyKGV2ZW50c0RhdGEuZmVhdHVyZXMsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5jb25maWRlbmNlRmllbGRdID4gc3RhdGVTZXJ2aWNlLmdldENvbmZpZGVuY2UoKSAmJiAoZXZlbnQucHJvcGVydGllcy5sb2NfbWFqb3JfYXhpcyA+IHN0YXRlU2VydmljZS5nZXRMb2NhdGlvblVuY2VydGFpbnR5KCkgfHwgZXZlbnQucHJvcGVydGllcy5sb2NfbWFqb3JfYXhpcyA9PT0gbnVsbCkgJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5pbnRlbnNpdHlGaWVsZF0gPj0gaW50ZW5zaXR5Lm1pbiAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA8PSBpbnRlbnNpdHkubWF4ICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuc25yRmllbGRdID49IHNuci5taW4gJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gPD0gc25yLm1heCAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmR1cmF0aW9uRmllbGRdID49IG1vbWVudC5kdXJhdGlvbihkdXJhdGlvbi5taW4sICdzJykuZm9ybWF0KCdtbTpzcy5TU1MnKSAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmR1cmF0aW9uRmllbGRdIDw9IG1vbWVudC5kdXJhdGlvbihkdXJhdGlvbi5tYXgsICdzJykuZm9ybWF0KCdtbTpzcy5TU1MnKSAmJiBtYXBCb3VuZHMuY29udGFpbnMoTC5sYXRMbmcoZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sYXRGaWVsZF0sIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIubG9uRmllbGRdKSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gWzIwMCwgSlNPTi5zdHJpbmdpZnkoZmlsdGVyZWRFdmVudHNEYXRhKSwge31dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFsyMDAsIEpTT04uc3RyaW5naWZ5KGV2ZW50KSwge31dO1xuICAgICAgICB9KTtcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQoZXZlbnRzUmVnZXgpLnJlc3BvbmQoZnVuY3Rpb24gKG1ldGhvZCwgdXJsKSB7XG4gICAgICAgICAgICB2YXIgdXJsUGFyYW1zID0gXy5mcm9tUGFpcnMoXy5tYXAodXJsLnNwbGl0KCc/JylbMV0uc3BsaXQoJyYnKSwgZnVuY3Rpb24gKHMpIHsgcmV0dXJuIHMuc3BsaXQoJz0nKTsgfSkpLFxuICAgICAgICAgICAgICAgIG1hcEJvdW5kcyA9IHN0YXRlU2VydmljZS5nZXRNYXBCb3VuZHMoKTtcblxuICAgICAgICAgICAgaWYgKHVybFBhcmFtcy50eXBlTmFtZSA9PT0gJ2VyaXM6ZXZlbnRzJykge1xuICAgICAgICAgICAgICAgIGlmIChtYXBCb3VuZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50c0RhdGEuZmVhdHVyZXMgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlRXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIGludGVuc2l0eSA9IHN0YXRlU2VydmljZS5nZXRJbnRlbnNpdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNuciA9IHN0YXRlU2VydmljZS5nZXRTbnIoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGR1cmF0aW9uID0gc3RhdGVTZXJ2aWNlLmdldER1cmF0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wb3JhbEZpbHRlciA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpO1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZEV2ZW50c0RhdGEuZmVhdHVyZXMgPSBfLmZpbHRlcihldmVudHNEYXRhLmZlYXR1cmVzLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnQudXRjKGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZGF0ZUZpZWxkXSkuaXNCZXR3ZWVuKG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RhcnQpLCBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0b3ApKSAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmNvbmZpZGVuY2VGaWVsZF0gPiBzdGF0ZVNlcnZpY2UuZ2V0Q29uZmlkZW5jZSgpICYmIChldmVudC5wcm9wZXJ0aWVzLmxvY19tYWpvcl9heGlzID4gc3RhdGVTZXJ2aWNlLmdldExvY2F0aW9uVW5jZXJ0YWludHkoKSB8fCBldmVudC5wcm9wZXJ0aWVzLmxvY19tYWpvcl9heGlzID09PSBudWxsKSAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmludGVuc2l0eUZpZWxkXSA+PSBpbnRlbnNpdHkubWluICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuaW50ZW5zaXR5RmllbGRdIDw9IGludGVuc2l0eS5tYXggJiYgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5zbnJGaWVsZF0gPj0gc25yLm1pbiAmJiBldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLnNuckZpZWxkXSA8PSBzbnIubWF4ICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZHVyYXRpb25GaWVsZF0gPj0gbW9tZW50LmR1cmF0aW9uKGR1cmF0aW9uLm1pbiwgJ3MnKS5mb3JtYXQoJ21tOnNzLlNTUycpICYmIGV2ZW50LnByb3BlcnRpZXNbZXJpc0NvbmZpZy5zZXJ2ZXIuZHVyYXRpb25GaWVsZF0gPD0gbW9tZW50LmR1cmF0aW9uKGR1cmF0aW9uLm1heCwgJ3MnKS5mb3JtYXQoJ21tOnNzLlNTUycpICYmIG1hcEJvdW5kcy5jb250YWlucyhMLmxhdExuZyhldmVudC5wcm9wZXJ0aWVzW2VyaXNDb25maWcuc2VydmVyLmxhdEZpZWxkXSwgZXZlbnQucHJvcGVydGllc1tlcmlzQ29uZmlnLnNlcnZlci5sb25GaWVsZF0pKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsyMDAsIEpTT04uc3RyaW5naWZ5KGZpbHRlcmVkRXZlbnRzRGF0YSksIHt9XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsyMDAsIEpTT04uc3RyaW5naWZ5KGV2ZW50KSwge31dO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1cmxQYXJhbXMudHlwZU5hbWUgPT09ICdlcmlzOnRyYWNrcycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVFdmVudFRyYWNrcygpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1cmxQYXJhbXMudHlwZU5hbWUgPT09ICdlcmlzOmNvcnJlbGF0aW5nX2V2ZW50cycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0U3luYyhjb3JyZWxhdGlvbk92ZXJyaWRlVXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUGxvdCBkYXRhIHNlcnZpY2VcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQocGxvdERhdGFSZWdleCkucmVzcG9uZChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVQbG90RGF0YSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBGcmFtZXMgc2VydmljZVxuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVChmcmFtZXNSZWdleCkucmVzcG9uZChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVGcmFtZURhdGEoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRk1WIHNlcnZpY2VcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQoZm12UmVnZXgpLnJlc3BvbmQoZnVuY3Rpb24gKG1ldGhvZCwgdXJsKSB7XG4gICAgICAgICAgICB2YXIgdXJsUGFyYW1zID0gXy5mcm9tUGFpcnMoXy5tYXAodXJsLnNwbGl0KCc/JylbMV0uc3BsaXQoJyYnKSwgZnVuY3Rpb24gKHMpIHsgcmV0dXJuIHMuc3BsaXQoJz0nKTsgfSkpO1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlRk1WRGF0YSh1cmxQYXJhbXMpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdHJpa2Ugc2VydmljZVxuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVChzdHJpa2VSZWdleCkucmVzcG9uZChmdW5jdGlvbiAobWV0aG9kLCB1cmwpIHtcbiAgICAgICAgICAgIHZhciB1cmxQYXJhbXMgPSBfLmZyb21QYWlycyhfLm1hcCh1cmwuc3BsaXQoJz8nKVsxXS5zcGxpdCgnJicpLCBmdW5jdGlvbiAocykgeyByZXR1cm4gcy5zcGxpdCgnPScpOyB9KSksXG4gICAgICAgICAgICAgICAgbWFwQm91bmRzID0gc3RhdGVTZXJ2aWNlLmdldE1hcEJvdW5kcygpO1xuXG4gICAgICAgICAgICBpZiAodXJsUGFyYW1zLnR5cGVOYW1lID09PSAnZXJpczpjb3VudHJpZXMnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldFN5bmMoY291bnRyaWVzT3ZlcnJpZGVVcmwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobWFwQm91bmRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmlrZURhdGEuZmVhdHVyZXMgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVTdHJpa2VzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZpbHRlcmVkU3RyaWtlRGF0YS5mZWF0dXJlcyA9IF8uZmlsdGVyKHN0cmlrZURhdGEuZmVhdHVyZXMsIGZ1bmN0aW9uIChzdHJpa2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1hcEJvdW5kcy5jb250YWlucyhMLmxhdExuZyhzdHJpa2UucHJvcGVydGllcy5MQVQsIHN0cmlrZS5wcm9wZXJ0aWVzLkxPTkcpKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBbMjAwLCBKU09OLnN0cmluZ2lmeShmaWx0ZXJlZFN0cmlrZURhdGEpLCB7fV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFsZXJ0IHNlcnZpY2VcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQoYWxlcnRSZWdleCkucmVzcG9uZChmdW5jdGlvbiAobWV0aG9kLCB1cmwpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICB2YXIgYWxlcnREYXRhID0gW3tcbiAgICAgICAgICAgICAgICBhbGVydF9pZDogMSxcbiAgICAgICAgICAgICAgICBjbGFzczogJ21kLXdhcm4nLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdEb25cXCd0IFBhbmljJyxcbiAgICAgICAgICAgICAgICBzdGFydGVkOiAnMjAxOC0wMi0xNFQxMDowODo0NS4wMDBaJyxcbiAgICAgICAgICAgICAgICBlbmRlZDogJzIwMTgtMDItMTRUMTA6MDg6NDUuMDAwWicsXG4gICAgICAgICAgICAgICAgaXNfYWN0aXZlOiB0cnVlXG4gICAgICAgICAgICB9XTtcbiAgICAgICAgICAgIHJldHVybiBbMjAwLCBKU09OLnN0cmluZ2lmeShhbGVydERhdGEpLCB7fV07XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiJdfQ==
