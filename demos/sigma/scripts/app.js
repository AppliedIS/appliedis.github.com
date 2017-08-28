(function () {
    'use strict';

    var app = angular.module('sigma', [
        'sigma.config',
        'ngCookies',
        'ngResource',
        'ngSanitize',
        'ngRoute',
        'ngAnimate',
        'nemLogging',
        'ui-leaflet',
        'blockUI',
        'mgcrea.ngStrap',
        'cfp.hotkeys',
        'angular-spinkit',
        'toggle-switch',
        'ngFileSaver',
        'monospaced.mousewheel'
    ]);

    app.config(['$alertProvider', '$routeProvider', '$provide', 'blockUIConfig', function ($alertProvider, $routeProvider, $provide, blockUIConfig) {
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

        $routeProvider
            .when('/', {
                controller: 'searchController',
                controllerAs: 'vm',
                templateUrl: 'modules/pages/searchTemplate.html',
                reloadOnSearch: false
            })
            .when('/analyze', {
                controller: 'analyzeController',
                templateUrl: 'modules/pages/analyzeTemplate.html',
                reloadOnSearch: false
            })
            .otherwise({
                redirectTo: '/'
            });

        angular.extend($alertProvider.defaults, {
            placement: 'top-right',
            container: 'body',
            animation: 'am-fade-and-slide-top',
            duration: 5
        });

        blockUIConfig.message = 'Loading';
        blockUIConfig.template = '<div class="block-ui-overlay"></div><div class="block-ui-message-container"><div class="block-ui-message"><div class="block-ui-message-text">{{ state.message }}</div><div class="block-ui-message-animation"><three-bounce-spinner></three-bounce-spinner></div></div></div>';
        blockUIConfig.autoBlock = false;
    }])
    .value('moment', window.moment)
    .value('_', window._)
    .value('L', window.L)
    .value('d3', window.d3)
    .value('$', window.$)
    .value('localStorage', window.localStorage)
    .value('Image', window.Image)
    .value('MouseEvent', window.MouseEvent)
    .value('c3', window.c3)
    .value('XMLHttpRequest', window.XMLHttpRequest)
    .value('Blob', window.Blob)
    .value('LLtoMGRS', window.LLtoMGRS)
    .value('PIXI', window.PIXI)
    .value('Whammy', window.Whammy)
    .value('leafletImage', window.leafletImage)
    .value('GIF', window.GIF)
    .value('CircularJSON', window.CircularJSON);



    app.run(['$rootScope', '$timeout', '$window', 'sigmaConfig', 'sigmaService', 'stateService', function($rootScope, $timeout, $window, sigmaConfig, sigmaService, stateService) {
        // set a gobal scope param for the <title> element
        $rootScope.pageTitle = sigmaConfig.title;

        // handle an event when the viewport is resized
        var resizeTimer;
        angular.element($window).on('resize', function() {
            if (angular.isDefined(resizeTimer)) {
                // timer is currently active
                return;
            }

            resizeTimer = $timeout(function() {
                // ok to send an event
                stateService.setViewportSize(sigmaService.getViewportSize());

                // finished resizing, allow timer to be set again
                resizeTimer = undefined;
            }, 300);
        });
    }]);

})();

(function () {
    'use strict';

    angular.module('sigma').service('sigmaConfig', ['sigmaConfigLocal', 'moment', '_', 'L', function (sigmaConfigLocal, moment, _, L) {
        var cfg = {
            title: 'Sigma',
            logo: 'Σ Sigma',
            urls: {},
            overlayPrefix: '',
            mapCenter: {
                lat: 44.366428,
                lng: -81.453945,
                zoom: 8
            },
            layers: {
                baselayers: {}
            },
            maxBounds: {
                northEast: {
                    lat: 90,
                    lng: 180
                },
                southWest: {
                    lat: -90,
                    lng: -180
                }
            },
            defaultViewMode: 'search',
            defaultLocationFormat: 'dd',
            defaultBaselayer: '',
            maxDaysBack: 10000,
            defaultDaysBack: 90,
            ranges: [
                {
                    units: -90,
                    unitOfTime: 'days',
                    label: '90 Days'
                },
                {
                    units: -6,
                    unitOfTime: 'months',
                    label: '6 Months'
                },
                {
                    units: -1,
                    unitOfTime: 'year',
                    label: '1 Year'
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
            defaultLayerContrast: 1,
            defaultLayerOpacity: 50,
            defaultSliderStart: moment.utc().subtract(1, 'y'),
            defaultSliderStop: moment.utc().endOf('d'),
            defaultEnableCoverage: false,
            defaultProjection: L.CRS.EPSG4326,
            playbackIntervals: [
                {
                    title: 'None',
                    value: null,
                    default: false
                },
                {
                    title: 'Hours',
                    value: 'h',
                    default: false
                },
                {
                    title: 'Days',
                    value: 'd',
                    default: true
                },
                {
                    title: 'Weeks',
                    value: 'w',
                    default: false
                }
            ],
            contrastLevels: [
                {
                    title: 'Low',
                    name: 'urllow',
                    default: false
                },
                {
                    title: 'Medium',
                    name: 'url',
                    default: true
                },
                {
                    title: 'High',
                    name: 'urlhigh',
                    default: false
                }
            ],
            defaultPlaybackIntervalQty: 1,
            maxPlaybackDelay: 800,
            defaultImageQuality: 0,
            minimumFrameDuration: {
                interval: 'h', // must be a valid momentjs shorthand key: http://momentjs.com/docs/#/manipulating/add/
                value: 1
            },
            minimumAOIDuration: {
                interval: 'h', // must be a valid momentjs shorthand key: http://momentjs.com/docs/#/manipulating/add/
                value: 1
            },
            debounceTime: 300,
            maximumRecentAOIs: 5,
            maximumRecentPoints: 5,
            aoiAnalysisValues: [
                {
                    name: 'min',
                    title: 'Min',
                    threshold: false
                },
                {
                    name: 'max',
                    title: 'Max',
                    threshold: false
                },
                {
                    name: 'mean',
                    title: 'Mean',
                    threshold: false
                },
                {
                    name: 'activity',
                    title: 'Activity',
                    threshold: true
                },
                {
                    name: 'pixels_above',
                    title: 'Pixels Above Threshold',
                    threshold: true
                },
                {
                    name: 'stdev',
                    title: 'Standard Deviation',
                    threshold: false
                }
            ],
            thresholdCeiling: 100,
            colormapValues: [
                {
                    name: 'none',
                    title: 'None'
                },
                {
                    name: 'spectral',
                    title: 'Spectral'
                },
                {
                    name: 'bgr',
                    title: 'BGR'
                },
                {
                    name: 'gist_rainbow',
                    title: 'GIST Rainbow'
                },
                {
                    name: 'jet',
                    title: 'Jet'
                },
                {
                    name: 'Y1GnBu_r',
                    title: 'Y1GnBu_r'
                }
            ],
            bands: [
                {
                    title: 'Visible',
                    name: 'vis',
                    default: true
                },
                {
                    title: 'SWIR',
                    name: 'swir',
                    default: false
                },
                {
                    title: 'VIIRS_DNB',
                    name: 'viirs_dnb',
                    default: false
                },
                {
                    title: 'MWIR',
                    name: 'mwir',
                    default: false
                }
            ],
            components: {
                coverageFilter: true,
                aoiAnalysis: true,
                map: {
                    controls: {
                        correlation: true,
                        pointconverter: true,
                        rectangle: true
                    }
                },
                goto: true,
                state: true,
                band: true,
                sensor: true
            },
            playbackWithGaps: false,
            pointconverterMarkerOptions: {
                repeatMode: false
            },
            correlationMarkerOptions: {
                repeatMode: false
            },
            imageFilters: {
                opacity: {
                    enabled: true,
                    default: 50
                },
                brightness: {
                    enabled: true,
                    max: 200,
                    default: 100
                },
                contrast: {
                    enabled: true,
                    max: 200,
                    default: 100
                },
                blur: {
                    enabled: true,
                    name: 'Gaussian blur',
                    max: 200,
                    units: ''
                },
                hue: {
                    enabled: true,
                    units: '°',
                    min: -180,
                    max: 180
                },
                saturation: {
                    enabled: true,
                    min: -100
                },
                invert: {
                    enabled: true,
                    switch: true,
                },
                sepia: {
                    enabled: true,
                    switch: true,
                },
            },
            encoders: {
                gif: {
                    enabled: true,
                    workers: 4,
                    quality: 10
                },
                webm: {
                    enabled: true,
                    quality: 0.92
                }
            },
            defaultEncoder: 'webm',
            sensors: [
                {
                    id: -1,
                    name: 'all',
                    title: 'All',
                    bands: ['viirs_dnb', 'vis', 'mwir', 'swir'],
                    default: true
                },
                {
                    id: 0,
                    name: 'sensor0',
                    title: 'Sensor 0',
                    bands: ['viirs_dnb'],
                    default: false
                },
                {
                    id: 1,
                    name: 'sensor1',
                    title: 'Sensor One',
                    bands: ['vis', 'mwir', 'swir'],
                    default: false
                },
                {
                    id: 2,
                    name: 'sensor2',
                    title: 'Sensor Two',
                    bands: ['vis', 'mwir', 'swir'],
                    default: false
                }
            ]
        };

        // recursively merge the local config onto the default config
        angular.merge(cfg, sigmaConfigLocal);

        if (typeof cfg.defaultProjection === 'string') {
            // defaultProjection has been overwritten in local config
            // only a string value can be specified in local config, so use eval to produce the proper JS object
            cfg.defaultProjection = eval(cfg.defaultProjection); // jshint ignore:line
        }
        return cfg;
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').factory('CanvasImageOverlay', ['PIXI', 'L', 'leafletData', '_', function (
        PIXI,
        L,
        leafletData,
        _
    ) {
        // Constructor
        var CanvasImageOverlay = function (frames, currentIdx, layer, textLayer, opacity, clipping, invert, grayscale, sepia, noise, contrast, brightness, hue, saturation, sharpen, blur) {
            this.frames = frames || [];
            this.currentIdx = currentIdx || 0;
            this.layer = layer;
            this.textLayer = textLayer || new PIXI.Text('', {
                font: '300 18px Arial',
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 2
            });
            this.opacity = opacity || 50;
            this.clipping = clipping || 0;
            this.invert = invert || 0;
            this.grayscale = grayscale || 0;
            this.sepia = sepia || 0;
            this.noise = noise || 0;
            this.contrast = contrast || 100;
            this.brightness = brightness || 100;
            this.hue = hue || 0;
            this.saturation = saturation || 0;
            this.sharpen = sharpen || 0;
            this.blur = blur || 0;
        };

        var _cioInstance = null;

        // private methods
        /**
         * Internal function that should be passed into the overlay
         * as the drawing function. The should be called from the layer
         * itself, eg this.layer.redraw().
         * @param  {PIXI.WebGLRenderer,PIXI.CanvasRenderer} pixiRenderer
         *         An autodetected renderer based on available techs.
         * @param  {object} params Callback params containing the stage
         *                         container, and the bounds, size, zoom,
         *                         and zoomScale of the map.
         */
        var _render = function (pixiRenderer, params) {
            var bounds,
                topLeft,
                size,
                invertFilter = new PIXI.filters.ColorMatrixFilter(),
                sepiaFilter = new PIXI.filters.ColorMatrixFilter(),
                contrastFilter = new PIXI.filters.ColorMatrixFilter(),
                brightnessFilter = new PIXI.filters.ColorMatrixFilter(),
                hueFilter = new PIXI.filters.ColorMatrixFilter(),
                saturationFilter = new PIXI.filters.ColorMatrixFilter(),
                blurFilter = new PIXI.filters.BlurFilter(),
                filtersToApply;

            if (_cioInstance) {
                _.forEach(_cioInstance.frames, function (frame, frameIdx) {
                    _.forEach(frame.images, function (overlay) {
                        // mark all sprites as hidden
                        overlay.sprite.visible = false;

                        // show only if the current idx is at the frame idx
                        // and if the overlay itself has been enabled
                        if (_cioInstance.currentIdx === frameIdx && overlay.enabled) {
                            // calculate the bounds and size of the sprite
                            bounds = L.latLngBounds(overlay.bounds);
                            topLeft = _cioInstance.layer._map.latLngToContainerPoint(
                                bounds.getNorthWest()
                            );
                            size = _cioInstance.layer._map.latLngToContainerPoint(
                                bounds.getSouthEast()
                            )._subtract(topLeft);

                            // set the position and size
                            overlay.sprite.x = topLeft.x;
                            overlay.sprite.y = topLeft.y;
                            overlay.sprite.width = size.x;
                            overlay.sprite.height = size.y;

                            // check the flag on the overlay directly (not the sprite)
                            if (overlay.visible) {
                                overlay.sprite.alpha = _cioInstance.opacity / 100;
                                overlay.sprite.visible = true;
                            } else {
                                overlay.sprite.visible = false;
                            }
                        }
                    });
                });

                // only add filters if necessary
                filtersToApply = [];

                if (_cioInstance.invert) {
                    invertFilter.negative();
                    filtersToApply.push(invertFilter);
                }

                if (_cioInstance.sepia) {
                    sepiaFilter.sepia();
                    filtersToApply.push(sepiaFilter);
                }

                if (_cioInstance.contrast) {
                    contrastFilter.contrast(parseFloat(_cioInstance.contrast - 100) / 100, true);
                    filtersToApply.push(contrastFilter);
                }

                if (_cioInstance.brightness !== 100) {
                    brightnessFilter.brightness(parseFloat(_cioInstance.brightness) / 100);
                    filtersToApply.push(brightnessFilter);
                }

                if (_cioInstance.hue) {
                    hueFilter.hue(parseFloat(_cioInstance.hue));
                    filtersToApply.push(hueFilter);
                }

                if (_cioInstance.saturation) {
                    saturationFilter.saturate(parseFloat(_cioInstance.saturation) / 100);
                    filtersToApply.push(saturationFilter);
                }

                if (_cioInstance.blur) {
                    blurFilter.blur = parseFloat(_cioInstance.blur) / 100;
                    filtersToApply.push(blurFilter);
                }

                // add all filters to the stage and render
                params.stage.filters = filtersToApply.length ? filtersToApply : null;
                params.renderer.render(params.stage);
            }
        };

        // public methods
        CanvasImageOverlay.prototype = {
            /**
             * Attach a new array of frames to the canvas layer. Each
             * overlay in each frame will be added to the stage.
             * @param  {array} val An array of frame objects, each containing
             *                     an array of overlay objects.
             * @return {object}    this
             */
            set: function (val) {
                var self = this;
                if (angular.isArray(val)) {
                    self.frames = val;

                    self.layer.stage().removeChildren();
                    _.forEach(self.frames, function (frame) {
                        _.forEach(frame.images, function (overlay) {
                            self.layer.stage().addChild(overlay.sprite);
                        });
                    });
                }
                return self;
            },

            /**
             * Saves a single frame and adds it to the canvas layer's stage.
             * @param  {object} frame A frame object containing an array of
             *                        overlay objects.
             * @return {[type]}       [description]
             */
            add: function (frame) {
                var self = this;
                if (angular.isObject(frame)) {
                    self.frames.push(frame);

                    _.forEach(frame.images, function (overlay) {
                        self.layer.stage().addChild(overlay.sprite);
                    });
                }
                return self;
            },

            /**
             * Retrieve either a single frame or the entire frames collection.
             * @param  {int,undefined} idx The index within frames to retrieve,
             *                             leave black for the entire collection.
             * @return {object,array}  A single frame or all frames
             */
            get: function (idx) {
                var self = this;
                if (angular.isDefined(idx)) {
                    return self.frames[idx];
                }
                return self.frames;
            },

            /**
             * Clears the frames, resets the index, and removes children from
             * the canvas layer's stage, and redraws the layer.
             * @return {object} this
             */
            clear: function () {
                var self = this;
                if (self.layer) {
                    self.layer.stage().removeChildren();
                }
                self.frames = [];
                self.currentIdx = 0;
                self.redraw();
                return self;
            },

            destroy: function (map) {
                var self = this;
                if (self.layer) {
                    map.removeLayer(self.layer);
                }
                self.frames = [];
                self.currentIdx = 0;
                return self;
            },

            /**
             * Sets the internal index of the frame to the given value and
             * redraws the canvas layer.
             * @param  {int} idx The index within this.frames to draw
             * @return {object}  this
             */
            setIdx: function (idx) {
                var self = this;
                self.currentIdx = idx;
                self.redraw();
                return self;
            },

            /**
             * Helper to redraw the canvas layer's redraw function. Draws
             * a text layer, if any, to ensure it's at the top of the stack.
             * @return {object} this
             */
            redraw: function () {
                var self = this;
                if (self.layer) {
                    self.textLayer.alpha = 0.9;
                    self.layer._stage.addChild(self.textLayer);

                    return self.layer._redraw();
                }
                return self;
            },

            initialize: function (map) {
                var self = this;
                self.initialized = true;
                self.layer = L.pixiOverlay()
                    .drawing(_render)
                    .addTo(map);
                _cioInstance = self;
            }
        };

        // static methods
        CanvasImageOverlay.build = function (data) {
            if (data) {
                return new CanvasImageOverlay(
                    data.frames,
                    data.currentIdx,
                    data.layer,
                    data.textLayer,
                    data.opacity,
                    data.clipping,
                    data.invert,
                    data.grayscale,
                    data.sepia,
                    data.noise,
                    data.contrast,
                    data.brightness,
                    data.hue,
                    data.saturation,
                    data.sharpen,
                    data.blur
                );
            }
            return new CanvasImageOverlay();
        };

        CanvasImageOverlay.transformer = function (data) {
            if (angular.isArray(data)) {
                return data.map(CanvasImageOverlay.build);
            }
            return CanvasImageOverlay.build(data);
        };

        return CanvasImageOverlay;
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').factory('Overlay', ['sigmaConfig', 'stateService', 'PIXI', function (
        sigmaConfig,
        stateService,
        PIXI
    ) {
        // Constructor
        var Overlay = function (url, imageSrc, imageQuality, bounds, time, enabled, onload) {
            this.url = sigmaConfig.overlayPrefix + url;
            // TODO need imageSrc?
            this.src = imageSrc;
            this.imageQuality = imageQuality;
            this.bounds = bounds;
            this.time = time;
            this.enabled = enabled;
            this.visible = true;
            this.onload = onload; // use for callback of image load
            this.sprite = null;

            this.initImage();
        };

        // public methods
        Overlay.prototype = {
            imageLoaded: function (sprite, err) {
                // call the onload function, if any
                if (angular.isFunction(this.onload)) {
                    this.onload(err);
                }

                // add it to the pixi stage layer
                var canvasImageOverlay = stateService.getCanvasImageOverlay();
                canvasImageOverlay.layer.stage().addChild(sprite);
            },
            initImage: function () {
                var self = this;
                var sprite = PIXI.Sprite.fromImage(this.src);

                sprite.visible = false;

                if (sprite.texture.baseTexture.hasLoaded) {
                    self.imageLoaded(sprite);
                }

                sprite.texture.baseTexture.on('loaded', function(e) {
                    self.imageLoaded(sprite, e);
                });

                this.sprite = sprite;
            }
        };

        // static methods
        Overlay.build = function (data) {
            if (data) {
                return new Overlay(
                    data.url,
                    data.image,
                    data.imagequality, // param from api is all lowercase
                    data.bounds,
                    data.time,
                    data.enabled
                );
            }
            return new Overlay();
        };

        Overlay.transformer = function (data) {
            if (angular.isArray(data)) {
                return data.map(Overlay.build);
            }
            return Overlay.build(data);
        };

        return Overlay;
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').service('analyzeService', ['$q', '$http', 'sigmaConfig', 'stateService', 'sigmaService', '_', function (
        $q,
        $http,
        sigmaConfig,
        stateService,
        sigmaService,
        _
    ) {
        var getDDBounds = function (location) {
            var bounds = sigmaService.getDDBounds(location);
            return {
                n: bounds[1][0],
                e: bounds[0][1],
                s: bounds[0][0],
                w: bounds[1][1]
            };
        };

        // Only use sensor id param if a particular sensor is selected, set to null if "All" is selected
        var getSensorParam = function (sensor) {
          return sensor >= 0 ? sensor : null;
        };

        var getOverlayParams = function (start, stop, band, location, sensor) {
            var params = {
                start: start,
                stop: stop,
                band: band,
                sensor: getSensorParam(sensor)
            };

            if (location) {
                angular.extend(params, getDDBounds(location));
            }

            return params;
        };

        var getPointConverterParams = function (start, stop, lat, lng, band, imageQuality, sensor) {
            var params = {
                start: start,
                stop: stop,
                lat: lat,
                lng: lng,
                band: band,
                imagequality: imageQuality,
                sensor: getSensorParam(sensor)
            };

            return params;
        };

        var getAoiParams = function (start, stop, location, operation, band, returntype, imageQuality, sensor, minThreshold, maxThreshold, colormap) {
            var params = {
                start: start,
                stop: stop,
                operation: operation,
                band: band,
                returntype: returntype,
                imagequality: imageQuality,
                sensor: getSensorParam(sensor),
                minthreshold: minThreshold,
                maxthreshold: maxThreshold,
                colormap: colormap
            };

            if (location) {
                angular.extend(params, getDDBounds(location));
            }

            return params;
        };

        var getCorrelatePointParams = function (lat, lng, start, stop, band, returntype, location, imageQuality, sensor) {
            var params = {
                lat: lat,
                lng: lng,
                start: start,
                stop: stop,
                band: band,
                returntype: returntype,
                imagequality: imageQuality,
                sensor: getSensorParam(sensor)
            };

            if (location) {
                angular.extend(params, getDDBounds(location));
            }

            return params;
        };

        return {
            getOverlays: function () {
                var location = stateService.getBbox(),
                    time = stateService.getTemporalFilter(),
                    url = sigmaConfig.urls.overlays,
                    band = stateService.getBand(),
                    sensor = stateService.getSensor(),
                    params = getOverlayParams(time.start, time.stop, band, location, sensor),
                    d = $q.defer();

                console.log(params);

                $http({
                    method: 'GET',
                    url: url,
                    params: params
                }).then(function successCallback (data) {
                    d.resolve(data);
                }, function errorCallback (error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            },

            convertPoint: function (lat, lng, start, stop, band, sensor) {
                var d = $q.defer(),
                    imageQuality = stateService.getImageQuality(),
                    params = getPointConverterParams(start, stop, lat, lng, band, imageQuality, sensor),
                    url = sigmaConfig.urls.pointconverter;
                $http({
                    method: 'GET',
                    url: url,
                    params: params
                }).then(function (result) {
                    d.resolve(result.data);
                }, function errorCallback (error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            },

            analyzeAoi: function (params) {
                var location = stateService.getBbox(),
                    time = stateService.getTemporalFilter(),
                    url = sigmaConfig.urls.aoianalysis,
                    band = stateService.getBand(),
                    imageQuality = stateService.getImageQuality(),
                    sensor = stateService.getSensor(),
                    aoiParams = getAoiParams(time.start, time.stop, location, params.operation, band, params.returnType, imageQuality, sensor, params.minThreshold, params.maxThreshold, params.colormap),
                    d = $q.defer();

                // strip null values from aoiParams
                aoiParams = _.pickBy(aoiParams, function (param) {
                    return param !== null && typeof param !== 'undefined';
                });

                $http({
                    method: 'GET',
                    url: url,
                    params: aoiParams
                }).then(function successCallback (data) {
                    d.resolve(data);
                }, function errorCallback (error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            },

            correlatePoint: function (lat, lng, start, stop, returntype) {
                var location = stateService.getBbox(),
                    imageQuality = stateService.getImageQuality(),
                    url = sigmaConfig.urls.correlate,
                    band = stateService.getBand(),
                    sensor = stateService.getSensor(),
                    params = getCorrelatePointParams(lat, lng, start, stop, band, returntype, location, imageQuality, sensor),
                    d = $q.defer();

                $http({
                    method: 'GET',
                    url: url,
                    params: params
                }).then(function successCallback (data) {
                    d.resolve(data);
                }, function errorCallback (error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            }
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').factory('coordinateConversionService', ['LLtoMGRS', function (LLtoMGRS) {
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
(function () {
    'use strict';

    angular.module('sigma').service('searchService', ['$http', '$q', '$timeout', 'sigmaConfig', 'stateService', 'sigmaService', function (
        $http,
        $q,
        $timeout,
        sigmaConfig,
        stateService,
        sigmaService
    ) {
        var getDDBounds = function (location) {
            var bounds = sigmaService.getDDBounds(location);
            return {
                n: bounds[1][0],
                e: bounds[0][1],
                s: bounds[0][0],
                w: bounds[1][1]
            };
        };

        var getParams = function (start, stop, location, groupBy, band) {
            var params = {
                start: start,
                stop: stop,
                band: band
            };

            if (location) {
                angular.extend(params, getDDBounds(location));
            }

            if (groupBy) {
                params.group_by = groupBy;
            }

            return params;
        };

        var timeoutCoverage = null;

        return {
            getCoverage: function () {
                var d = $q.defer();

                if (timeoutCoverage) {
                    $timeout.cancel(timeoutCoverage);
                }

                timeoutCoverage = $timeout(function(){
                    var time = stateService.getTemporalFilter(),
                        url = sigmaConfig.urls.coverage,
                        band = stateService.getBand();

                    var location = {
                        north: 90,
                        east: 180,
                        south: -90,
                        west: -180
                    };

                    var params = getParams(time.start, time.stop, location, null, band);
                    params.step = 1;

                    $http({
                        method: 'GET',
                        url: url,
                        params: params
                    }).then(function successCallback (data) {
                        d.resolve(data);
                    }, function errorCallback (error) {
                        console.log(error);
                        d.reject(error);
                    });

                }, 500);


                return d.promise;
            },
            getCollectCountsByHour: function () {
                var d = $q.defer(),
                    location = stateService.getMapBounds(),
                    time = stateService.getTemporalFilter(),
                    url = sigmaConfig.urls.aggregate,
                    band = stateService.getBand(),
                    params = getParams(time.start, time.stop, location, 'hour', band);

                $http({
                    method: 'GET',
                    url: url,
                    params: params
                }).then(function successCallback (data) {
                    d.resolve(data);
                }, function errorCallback (error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            },
            getCollectCountsByDay: function () {
                var d = $q.defer(),
                    location = stateService.getMapBounds(),
                    time = stateService.getTimeSliderExtents(),
                    url = sigmaConfig.urls.aggregate,
                    band = stateService.getBand(),
                    params = getParams(time.start, time.stop, location, 'day', band);

                $http({
                    method: 'GET',
                    url: url,
                    params: params
                }).then(function successCallback (data) {
                    d.resolve(data);
                }, function errorCallback (error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            }
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').service('sigmaService', ['$alert', 'coordinateConversionService', '_', function ($alert, coordinateConversionService, _) {
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
                    bounds = [[sw.dd[0], ne.dd[1]], [ne.dd[0], sw.dd[1]]];
                } else {
                    // define rectangle geographical bounds
                    bounds = [[location.south, location.east], [location.north, location.west]];
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
            showError: function (error, type) {
                var errorContent = '';
                if (error.data) {
                    if (Array.isArray(error.data)) {
                        errorContent = error.data.join('<br />');
                    } else {
                        _.forEach(_.keys(error.data), function (key) {
                            errorContent += key + ': ' + error.data[key] + '<br />';
                        });
                    }
                }
                $alert({
                    title: error.status > -1 ? error.status + ': ' + error.statusText : 'Connection Error',
                    content: '<br />' + errorContent,
                    type: type
                });
            }
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').service('stateService', ['$q', '$http', '$location', '$rootScope', '$timeout', 'sigmaConfig', 'CanvasImageOverlay', 'moment', 'localStorage', 'CircularJSON', 'L', '_', function (
        $q,
        $http,
        $location,
        $rootScope,
        $timeout,
        sigmaConfig,
        CanvasImageOverlay,
        moment,
        localStorage,
        CircularJSON,
        L,
        _
    ) {
        var qs = $location.search(),
            canvasImageOverlay = new CanvasImageOverlay(),
            activeState = null,
            map = {},
            mapFeatureGroup = {};

        var sigmaState = {
            qs: qs,
            viewMode: qs.mode || sigmaConfig.defaultViewMode,
            bbox: {},
            mapCenter: {
                lat: parseFloat(qs.lat) || sigmaConfig.mapCenter.lat,
                lng: parseFloat(qs.lng) || sigmaConfig.mapCenter.lng,
                zoom: parseInt(qs.zoom) || sigmaConfig.mapCenter.zoom
            },
            locationFormat: qs.locationFormat,
            playbackState: '',
            playbackDirection: '',
            playbackInterval: _.find(sigmaConfig.playbackIntervals, { default: true }),
            playbackIntervalQty: sigmaConfig.defaultPlaybackIntervalQty,
            playbackSpeed: sigmaConfig.maxPlaybackDelay,
            playbackOpacity: sigmaConfig.defaultLayerOpacity,
            frameIndexes: [],
            frameCurrent: 0,
            frameExtents: {},
            frameOverlays: [],
            timeSliderExtents: {},
            brushExtents: {},
            brushReset: false,
            enableCoverage: qs.enableCoverage,
            coverageOpacity: qs.coverageOpacity,
            coverageData: null,
            mapMode: 'default',
            temporalFilter: {
                start: qs.start,
                stop: qs.stop,
                duration: qs.duration,
                durationLength: qs.durationLength
            },
            timeSliderData: {},
            timeSliderFrequency: null, // init to null so $watch event will detect a change
            pointConverterData: null,
            correlationData: null,
            preloadedImages: [],
            baselayer: null,
            contrastLevel: _.find(sigmaConfig.contrastLevels, { default: true }),
            spatialZoom: '',
            temporalZoom: '',
            band: qs.band,
            viewportSize: {},
            imageQuality: sigmaConfig.defaultImageQuality,
            sensor: qs.sensor
        };

        if (qs.n || qs.ne) {
            sigmaState.bbox = {
                format: sigmaState.locationFormat,
                north: sigmaState.locationFormat === 'dd' ? parseFloat(qs.n) : qs.n,
                south: sigmaState.locationFormat === 'dd' ? parseFloat(qs.s) : qs.s,
                east: sigmaState.locationFormat === 'dd' ? parseFloat(qs.e) : qs.e,
                west: sigmaState.locationFormat === 'dd' ? parseFloat(qs.w) : qs.w,
                mgrsNE: qs.ne || '',
                mgrsSW: qs.sw || ''
            };
        }

        if (qs.start && qs.stop) {
            sigmaState.timeSliderExtents = {
                start: moment.utc(qs.start).toDate(),
                stop: moment.utc(qs.stop).toDate()
            };
        }

        return {
            getQs: function () {
                return sigmaState.qs;
            },
            setQs: function (data) {
                sigmaState.qs = data;
            },
            getActiveState: function () {
                return activeState;
            },
            setActiveState: function (data) {
                activeState = data;
            },
            getViewMode: function () {
                return sigmaState.viewMode;
            },
            setViewMode: function (mode) {
                sigmaState.viewMode = mode;
                qs.mode = mode;

                $location.search(qs);
            },
            getCanvasImageOverlay: function () {
                return canvasImageOverlay;
            },
            setCanvasImageOverlay: function (data) {
                canvasImageOverlay = data;
            },
            setBboxParams: function (location) {
                if (!location.format) {
                    location.format = sigmaConfig.defaultLocationFormat;
                    this.setLocationFormat(location.format);
                }
                // if anything change, update $location.search() and broadcast notification of change
                if (sigmaState.bbox.north !== location.north || sigmaState.bbox.south !== location.south || sigmaState.bbox.east !== location.east || sigmaState.bbox.west !== location.west || sigmaState.locationFormat !== location.format || sigmaState.bbox.mgrsNE !== location.mgrsNE || sigmaState.bbox.mgrsSW !== location.mgrsSW) {
                    if (location.north !== '' && location.south !== '' && location.east !== '' && location.west !== '' && location.format === 'dd') {
                        location.north = parseFloat(location.north).toFixed(2);
                        location.south = parseFloat(location.south).toFixed(2);
                        location.east = parseFloat(location.east).toFixed(2);
                        location.west = parseFloat(location.west).toFixed(2);
                    }
                    this.setBbox(location);
                    qs.n = location.north === '' ? null : location.north;
                    qs.s = location.south === '' ? null : location.south;
                    qs.e = location.east === '' ? null : location.east;
                    qs.w = location.west === '' ? null : location.west;
                    qs.locationFormat = location.format === '' ? null : location.format;
                    qs.ne = location.mgrsNE === '' ? null : location.mgrsNE;
                    qs.sw = location.mgrsSW === '' ? null : location.mgrsSW;
                    this.setLocationFormat(qs.locationFormat);
                    $location.search(qs);
                }
            },
            getBbox: function () {
                return sigmaState.bbox;
            },
            setBbox: function (val) {
                sigmaState.bbox = val;
            },
            getMapFeatureGroup: function () {
                return mapFeatureGroup;
            },
            setMapFeatureGroup: function (featureGroup) {
                mapFeatureGroup = featureGroup;
            },
            getMapCenter: function () {
                return sigmaState.mapCenter;
            },
            setMapCenter: function (data) {
                sigmaState.mapCenter = data;
                qs.lat = data.lat;
                qs.lng = data.lng;
                qs.zoom = data.zoom;
                $location.search(qs);
            },
            getLocationFormat: function () {
                return sigmaState.locationFormat;
            },
            setLocationFormat: function (format) {
                sigmaState.locationFormat = format;
                qs.locationFormat = format;
                $location.search(qs);
            },
            getPlaybackState: function () {
                return sigmaState.playbackState;
            },
            setPlaybackState: function (state) {
                sigmaState.playbackState = state;
            },
            getPlaybackDirection: function () {
                return sigmaState.playbackDirection;
            },
            setPlaybackDirection: function (direction) {
                sigmaState.playbackDirection = direction;
            },
            getPlaybackInterval: function () {
                return sigmaState.playbackInterval;
            },
            setPlaybackInterval: function (interval) {
                sigmaState.playbackInterval = interval;
                qs.playbackInterval = interval.value;
                $location.search(qs);
            },
            getPlaybackIntervalQty: function () {
                return sigmaState.playbackIntervalQty;
            },
            setPlaybackIntervalQty: function (qty) {
                sigmaState.playbackIntervalQty = qty;
                qs.playbackIntervalQty = qty;
                $location.search(qs);
            },
            getPlaybackSpeed: function () {
                return sigmaState.playbackSpeed;
            },
            setPlaybackSpeed: function (speed) {
                sigmaState.playbackSpeed = speed;
            },
            getPlaybackOpacity: function () {
                return sigmaState.playbackOpacity;
            },
            setPlaybackOpacity: function (opacity) {
                sigmaState.playbackOpacity = opacity;
            },
            getFrameIndexes: function () {
                return sigmaState.frameIndexes;
            },
            setFrameIndexes: function (indexes) {
                sigmaState.frameIndexes = indexes;
            },
            getFrameCurrent: function () {
                return sigmaState.frameCurrent;
            },
            setFrameCurrent: function (frame) {
                sigmaState.frameCurrent = frame;
            },
            getFrameExtents: function () {
                return sigmaState.frameExtents;
            },
            setFrameExtents: function (start, stop) {
                sigmaState.frameExtents = {
                    start: start,
                    stop: stop
                };
            },
            getFrameOverlays: function () {
                return sigmaState.frameOverlays;
            },
            setFrameOverlays: function (overlays) {
                sigmaState.frameOverlays = overlays;
            },
            getTimeSliderExtents: function () {
                return sigmaState.timeSliderExtents;
            },
            setTimeSliderExtents: function (start, stop) {
                sigmaState.timeSliderExtents = {
                    start: start,
                    stop: stop
                };
            },
            getBrushExtents: function () {
                return sigmaState.brushExtents;
            },
            setBrushExtents: function (start, stop) {
                sigmaState.brushExtents = {
                    start: start,
                    stop: stop
                };
            },
            getBrushReset: function () {
                return sigmaState.brushReset;
            },
            setBrushReset: function () {
                sigmaState.brushReset = !sigmaState.brushReset;
            },
            setEnableCoverage: function (value) {
                sigmaState.enableCoverage = value;
                if (value !== null) {
                    qs.enableCoverage = value ? value.toString() : sigmaConfig.defaultEnableCoverage.toString();
                    $location.search(qs);
                }
            },
            getEnableCoverage: function () {
                return sigmaState.enableCoverage;
            },
            setCoverageOpacity: function (value) {
                sigmaState.coverageOpacity = value;
                qs.coverageOpacity = value;
                $location.search(qs);
            },
            getCoverageOpacity: function () {
                return sigmaState.coverageOpacity;
            },
            setCoverage: function (value) {
                sigmaState.coverageData = value;
            },
            getCoverage: function () {
                return sigmaState.coverageData;
            },
            getMap: function () {
                return map;
            },
            setMap: function (mapInstance) {
                map = mapInstance;
            },
            setMapMode: function (mode) {
                sigmaState.mapMode = mode;
                console.log('map mode set to ' + mode);
            },
            getMapMode: function () {
                return sigmaState.mapMode;
            },
            getMapBounds: function () {
                if (map.getBounds) {
                    var bounds = map.getBounds();
                    if (bounds) {
                        var maxLatLngBounds = L.latLngBounds(sigmaConfig.maxBounds.northEast, sigmaConfig.maxBounds.southWest),
                            isInBounds = maxLatLngBounds.contains(bounds);

                        if (!isInBounds) {
                            return {
                                north: bounds._northEast.lat > maxLatLngBounds._northEast.lat ? maxLatLngBounds._northEast.lat : bounds._northEast.lat,
                                south: bounds._southWest.lat < maxLatLngBounds._southWest.lat ? maxLatLngBounds._southWest.lat : bounds._southWest.lat,
                                east: bounds._northEast.lng > maxLatLngBounds._northEast.lng ? maxLatLngBounds._northEast.lng : bounds._northEast.lng,
                                west: bounds._southWest.lng < maxLatLngBounds._southWest.lng ? maxLatLngBounds._southWest.lng : bounds._southWest.lng
                            };
                        }
                        return {
                            north: bounds._northEast.lat,
                            south: bounds._southWest.lat,
                            east: bounds._northEast.lng,
                            west: bounds._southWest.lng
                        };
                    }
                }
                return null;
            },
            clearAOI: function () {
                this.setBboxParams(
                    {
                        north: '',
                        south: '',
                        east: '',
                        west: ''
                    }
                );
                this.setMapMode('default');
            },
            getTemporalFilter: function () {
                return sigmaState.temporalFilter;
            },
            setTemporalFilter: function (filter) {
                var qsFilter = {
                    start: qs.start,
                    stop: qs.stop,
                    duration: qs.duration ? qs.duration : null,
                    durationLength: qs.durationLength ? parseInt(qs.durationLength) : null
                };
                var filterStart = '',
                    filterStop = '';
                if (!angular.equals(qsFilter, filter)) {
                    if (filter.duration && filter.durationLength) {
                        filterStart = moment.utc().subtract(filter.durationLength, filter.duration).startOf('d');
                        filterStop = moment.utc().endOf('d');
                        qs.start = filterStart.toISOString();
                        qs.stop = filterStop.toISOString();
                        qs.duration = filter.duration;
                        qs.durationLength = filter.durationLength;
                    } else {
                        filterStart = moment.utc(filter.start);
                        filterStop = moment.utc(filter.stop);
                        qs.start = filterStart.toISOString();
                        qs.stop = filterStop.toISOString();
                        qs.duration = null;
                        qs.durationLength = null;
                    }
                    filter.start = filterStart.toDate();
                    filter.stop = filterStop.toDate();
                    sigmaState.temporalFilter = filter;
                    $location.search(qs);
                } else {
                    if (!sigmaState.temporalFilter.start || !sigmaState.temporalFilter.stop) {
                        sigmaState.temporalFilter = filter;
                    }
                }
            },
            getTimeSliderData: function () {
                return sigmaState.timeSliderData;
            },
            setTimeSliderData: function (data) {
                sigmaState.timeSliderData = data;
            },
            getTimeSliderFrequency: function () {
                return sigmaState.timeSliderFrequency;
            },
            setTimeSliderFrequency: function (frequency) {
                sigmaState.timeSliderFrequency = frequency;
            },
            getPreloadedImages: function () {
                return sigmaState.preloadedImages;
            },
            setPreloadedImages: function (images) {
                sigmaState.preloadedImages = images;
            },
            getPointConverterData: function () {
                return sigmaState.pointConverterData;
            },
            setPointConverterData: function (data) {
                sigmaState.pointConverterData = data;
            },
            getCorrelationData: function () {
                return sigmaState.correlationData;
            },
            setCorrelationData: function (data) {
                if (!data) {
                    localStorage.removeItem('recentCorrelations');
                }
                sigmaState.correlationData = data;
            },
            getBaselayer: function () {
                return sigmaState.baselayer;
            },
            setBaselayer: function (layer) {
                sigmaState.baselayer = layer;
                qs.baselayer = layer.id;
                $location.search(qs);
            },
            getContrastLevel: function () {
                return sigmaState.contrastLevel;
            },
            setContrastLevel: function (level) {
                sigmaState.contrastLevel = level;
            },
            getSpatialZoom: function () {
                return sigmaState.spatialZoom;
            },
            setSpatialZoom: function (zoom) {
                sigmaState.spatialZoom = zoom;
            },
            getTemporalZoom: function () {
                return sigmaState.temporalZoom;
            },
            setTemporalZoom: function (zoom) {
                sigmaState.temporalZoom = zoom;
            },
            getBand: function () {
                return sigmaState.band;
            },
            setBand: function (value) {
                sigmaState.band = value;
                qs.band = value;
                $location.search(qs);
            },
            getViewportSize: function () {
                return sigmaState.viewportSize;
            },
            setViewportSize: function (size) {
                sigmaState.viewportSize = size;
            },
            getImageQuality: function () {
                return sigmaState.imageQuality;
            },
            setImageQuality: function (data) {
                sigmaState.imageQuality = data;
            },
            getSensor: function () {
                return sigmaState.sensor;
            },
            setSensor: function (value) {
                sigmaState.sensor = value;
                qs.sensor = value;
                $location.search(qs);
            },
            setState: function (data) {
                sigmaState = data;
            },
            getState: function (stateId) {
                var d = $q.defer(),
                    self = this;

                $http({
                    method: 'GET',
                    url: sigmaConfig.urls.appState + '/state/' + stateId
                }).then(function successCallback (result) {
                    var newState = CircularJSON.parse(result.data.user_state);
                    qs = newState.qs;
                    qs.id = null;
                    self.setActiveState(result.data);
                    d.resolve(newState);
                }, function errorCallback (error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            },
            updateStateTitle: function (id, title) {
                this.setQs($location.search());
                var d = $q.defer(),
                    params = {
                        title: title
                    };

                $http({
                    method: 'PUT',
                    url: sigmaConfig.urls.appState + '/state/' + id,
                    data: params
                }).then(function successCallback(result) {
                    console.log(result);
                    d.resolve(result);
                }, function errorCallback(error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            },
            saveState: function (id) {
                this.setQs($location.search());
                var d = $q.defer(),
                    params = {
                        user_state: CircularJSON.stringify(sigmaState)
                    };

                $http({
                    method: 'PUT',
                    url: sigmaConfig.urls.appState + '/state/' + id,
                    data: params
                }).then(function successCallback(result) {
                    console.log(result);
                    d.resolve(result);
                }, function errorCallback(error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            },
            createState: function (userName) {
                this.setQs($location.search());
                var d = $q.defer(),
                    params = {
                        user_name: userName || null,
                        app_name: 'sigma',
                        user_state: CircularJSON.stringify(sigmaState)
                    };

                $http({
                    method: 'POST',
                    url: sigmaConfig.urls.appState,
                    data: params
                }).then(function successCallback(result) {
                    console.log(result);
                    d.resolve(result);
                }, function errorCallback(error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            },
            getStates: function () {
                var d = $q.defer();

                $http({
                    method: 'GET',
                    url: sigmaConfig.urls.appState + '/app/sigma'
                }).then(function successCallback (result) {
                    d.resolve(result.data);
                }, function errorCallback (error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            },
            deleteState: function (id) {
                var d = $q.defer();

                $http({
                    method: 'DELETE',
                    url: sigmaConfig.urls.appState + '/state/' + id
                }).then(function successCallback(result) {
                    console.log(result);
                    d.resolve(result);
                }, function errorCallback(error) {
                    console.log(error);
                    d.reject(error);
                });

                return d.promise;
            }
        };

    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('searchController', ['$scope', '$location', '$alert', '$timeout', 'sigmaConfig', 'sigmaService', 'searchService', 'analyzeService', 'stateService', 'leafletData', 'blockUI', '_', 'moment', function (
        $scope,
        $location,
        $alert,
        $timeout,
        sigmaConfig,
        sigmaService,
        searchService,
        analyzeService,
        stateService,
        leafletData,
        blockUI,
        _,
        moment
    ) {
        var vm = this,
            qs = $location.search(),
            enableCoverage = qs.enableCoverage === 'true';

        vm.stateService = stateService;
        vm.initialized = false;
        vm.bbox = null;
        vm.mode = qs.mode || stateService.getViewMode();

        var getMapBounds, getTemporalFilter, getEnableCoverage, getBand, getSensor, getBbox;

        var generateSearchFrequency = function (timeline) {
            var frequency = [],
                timeSliderExtents = stateService.getTimeSliderExtents();

            // determine the number of days between time extents
            var numDays = moment.utc(timeSliderExtents.stop).diff(moment.utc(timeSliderExtents.start), 'd') + 1;

            // add 0 values for every day that has no value in timeline
            for (var i = 0; i < numDays; i++) {
                var time = moment.utc(timeSliderExtents.start).startOf('d').add(i, 'd').toISOString(),
                    count = _.find(timeline, { time: time });

                frequency.push({
                    time: time,
                    count: count ? count.count : 0
                });
            }

            return frequency;
        };

        var initSearch = function () {
            var updateCoverage = function () {
                return searchService.getCoverage().then(function (data) {
                        stateService.setCoverage(data.data.results);
                    }, function (error) {
                        sigmaService.showError(error, 'danger');
                    }
                );
            };

            var getCollectCountsByDay = _.debounce(function () {
                searchService.getCollectCountsByDay().then(function (result) {
                    var data = result.data;

                    var timeline = [];

                    // format counts into an array of objects for use with timeSlider
                    _.forEach(data.results, function (result) {
                        timeline.push({
                            time: moment.utc(result.day, 'YYYY-M-D').toISOString(),
                            count: result.count
                        });
                    });

                    // sort by date asc
                    timeline = _.sortBy(timeline, ['time'], ['asc']);

                    var frequency = generateSearchFrequency(timeline);

                    if (_.max(frequency) === 0 || _.max(frequency) === '-Infinity') {
                        $alert({
                            title: 'Coverage Information',
                            content: 'No features available at this location',
                            type: 'info'
                        });
                    }

                    // publish changes to stateService
                    stateService.setTimeSliderFrequency(frequency);
                }, function (error) {
                    var frequency = generateSearchFrequency([]);
                    stateService.setTimeSliderFrequency(frequency);
                    sigmaService.showError(error, 'danger');
                });
            }, 750);

            getMapBounds = $scope.$watchCollection('vm.stateService.getMapBounds()', _.debounce(function (newValue, oldValue) {
                if (_.keys(newValue).length > 0 && vm.mode === 'search') {
                    if (angular.equals(newValue, oldValue)) {
                        return;
                    }
                    if (enableCoverage) {
                        getCollectCountsByDay();
                    }
                }
            }, sigmaConfig.debounceTime));

            getTemporalFilter = $scope.$watchCollection('vm.stateService.getTemporalFilter()', _.debounce(function (newValue) {
                if (_.keys(newValue).length > 0 && vm.mode === 'search') {
                    if (enableCoverage) {
                        updateCoverage()
                            .then(getCollectCountsByDay);
                    } else {
                        $timeout(function () {
                            var frequency = generateSearchFrequency([]);
                            stateService.setTimeSliderFrequency(frequency);
                        });
                    }
                }
            }, sigmaConfig.debounceTime));

            getEnableCoverage = $scope.$watch('vm.stateService.getEnableCoverage()', function (newValue, oldValue) {
                newValue = typeof newValue === 'string' ? newValue === 'true' : newValue;
                oldValue = typeof oldValue === 'string' ? oldValue === 'true' : oldValue;
                if (angular.equals(newValue, oldValue)) {
                    return;
                }
                enableCoverage = newValue;
                if (enableCoverage && vm.mode === 'search') {
                    updateCoverage()
                        .then(getCollectCountsByDay);
                } else {
                    $timeout(function () {
                        var frequency = generateSearchFrequency([]);
                        stateService.setTimeSliderFrequency(frequency);
                    });
                }
            });

            getBand = $scope.$watch('vm.stateService.getBand()', _.debounce(function (newValue, oldValue) {
                if (angular.equals(newValue, oldValue)) {
                    return;
                }
                if (enableCoverage && vm.mode === 'search') {
                    updateCoverage()
                        .then(getCollectCountsByDay);
                }
            }, sigmaConfig.debounceTime));

            getSensor = $scope.$watch('vm.stateService.getSensor()', _.debounce(function (newValue, oldValue) {
                newValue = typeof newValue === 'string' ? parseInt(newValue) : newValue;
                oldValue = typeof oldValue === 'string' ? parseInt(oldValue) : oldValue;
                if (angular.equals(newValue, oldValue)) {
                    return;
                }
                if (enableCoverage && vm.mode === 'search') {
                    updateCoverage()
                        .then(getCollectCountsByDay);
                }
            }, sigmaConfig.debounceTime));

            getBbox = $scope.$watchCollection('vm.stateService.getBbox()', function (newValue, oldValue) {
                if (angular.equals(newValue, oldValue)) {
                    return;
                }
                if (vm.mode === 'search') {
                    vm.bbox = newValue;
                }
            });
        };

        var initAnalyze = function () {
            var temporalFilter = stateService.getTemporalFilter();

            var generateAnalyzeFrequency = function (timeline) {
                // determine the number of hours between time extents
                var frequency = [],
                    numHours = moment.utc(temporalFilter.stop).diff(moment.utc(temporalFilter.start), 'h') + 1;

                // add 0 values for every hour that has no value in timeline
                for (var i = 0; i < numHours; i++) {
                    var time = moment.utc(temporalFilter.start).startOf('h').add(i, 'h').toISOString(),
                        count = _.find(timeline, { time: time });

                    frequency.push({
                        time: time,
                        count: count ? count.count : 0
                    });
                }

                return frequency;
            };

            var analyze = function () {
                var frequency = [];
                blockUI.start('Loading AOI Data');
                analyzeService.getOverlays().then(function (result) {
                    var data = result.data;

                    stateService.setSpatialZoom(data.spatialZoom);
                    stateService.setTemporalZoom(data.temporalZoom);

                    if (data.frame && data.frame.length > 0) {
                        var timeline = [];

                        // extract number of collects per hour
                        var counts = _.countBy(data.frame, function (frame) {
                            return moment.utc(frame.time).startOf('h').toISOString() || 0;
                        });

                        // format counts into an array of objects for use with timeSlider
                        _.forEach(_.toPairs(counts), function (count) {
                            timeline.push({
                                time: moment.utc(count[0]).toISOString(),
                                count: count[1]
                            });
                        });

                        // sort by date asc
                        timeline = _.sortBy(timeline, ['time'], ['asc']);

                        frequency = generateAnalyzeFrequency(timeline);

                        if (_.max(frequency) === 0 || _.max(frequency) === '-Infinity') {
                            $alert({
                                title: 'Coverage Information',
                                content: 'No features available at this location during specified time interval',
                                type: 'info'
                            });
                        }

                        // update stateService
                        $timeout(function () {
                            stateService.setTimeSliderFrequency(frequency);
                            stateService.setTimeSliderData(data);
                        });

                        blockUI.stop();
                    } else {
                        frequency = generateAnalyzeFrequency([]);
                        stateService.setTimeSliderFrequency(frequency);
                        stateService.setTimeSliderData(null);
                        $alert({
                            title: 'Coverage Information',
                            content: 'No features available at this location during specified time interval',
                            type: 'info'
                        });
                        blockUI.stop();
                    }
                }, function (error) {
                    frequency = generateAnalyzeFrequency([]);
                    stateService.setTimeSliderFrequency(frequency);
                    blockUI.stop();
                    console.log(error);
                    $alert({
                        title: 'Communication Error',
                        content: 'Unable to retrieve AOI metadata.',
                        type: 'danger'
                    });
                });
            };

            analyze();

            // clear coverage and enableCoverage so the $watch statements in searchController will observe the value change
            stateService.setCoverage([]);
            stateService.setEnableCoverage(null);
        };

        var initialize = function () {
            var doInit = function () {
                if (vm.mode === 'analyze') {
                    initAnalyze();
                } else {
                    vm.mode = 'search';
                    var canvasImageOverlay = stateService.getCanvasImageOverlay();
                    if (canvasImageOverlay.initialized) {
                        leafletData.getMap().then(function (map) {
                            canvasImageOverlay.destroy(map);
                            initSearch();
                        });
                    } else {
                        initSearch();
                    }
                }
            };

            if ($location.search().id) {
                stateService.getState($location.search().id).then(function (data) {
                    doInit();
                    $timeout(function () {
                        // restore the state and querystring after init, so all the controllers will update
                        qs = data.qs;
                        stateService.setState(data);
                        stateService.setQs(data.qs);
                    });
                }, function (err) {
                    alert('Error retrieving state: ' + err.status + ' ' + err.statusText);
                    $location.search({ id: null });
                });
            } else {
                doInit();
            }
        };

        initialize();

        $scope.$watch('vm.stateService.getViewMode()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.mode = newValue;
            if (newValue === 'analyze') {
                // deregister the search watches
                getMapBounds();
                getTemporalFilter();
                getEnableCoverage();
                getBand();
                getSensor();
                getBbox();
            } else if (newValue === 'search') {
                // clear time slider data
                stateService.setTimeSliderData([]);
            }
            initialize();
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('aoiAnalysisController', ['$scope', '$alert', '$modal', '$aside', 'sigmaConfig', 'sigmaService', 'stateService', 'analyzeService', 'blockUI', 'L', '_', 'moment', function (
        $scope,
        $alert,
        $modal,
        $aside,
        sigmaConfig,
        sigmaService,
        stateService,
        analyzeService,
        blockUI,
        L,
        _,
        moment
    ) {
        var vm = this,
            bbox = stateService.getBbox(),
            band = stateService.getBand(),
            aoiAnalysisAside = $aside({
                scope: $scope,
                title: 'AOI Analysis',
                backdrop: false,
                templateUrl: 'modules/components/aoiAnalysis/aoiAnalysisConfig.tpl.html',
                show: false
            });

        vm.sigmaConfig = sigmaConfig;
        vm.stateService = stateService;
        vm.aoiAnalysisValues = _.cloneDeep(sigmaConfig.aoiAnalysisValues);
        vm.selectedAnalysis = vm.aoiAnalysisValues[0];
        vm.analysisSrc = null;
        vm.geotiffLink = '';
        vm.showThreshold = false;
        vm.threshold = null;
        vm.colormapValues = _.cloneDeep(sigmaConfig.colormapValues);
        vm.selectedColormap = vm.colormapValues[0];

        var analysisModal = $modal({scope: $scope, templateUrl: 'analysisModal.html', show: false, animation: 'am-fade-and-scale'});

        vm.toggleAside = function () {
            aoiAnalysisAside.$promise.then(function () {
                aoiAnalysisAside.toggle();
            });
        };

        vm.analyzeAoi = function () {
            blockUI.start('Analyzing AOI');
            var params = {
                operation: vm.selectedAnalysis.name,
                returnType: 'png',
                minThreshold: vm.threshold ? vm.threshold.min : null,
                maxThreshold: vm.threshold ? vm.threshold.max : null,
                colormap: vm.selectedColormap.name
            };
            analyzeService.analyzeAoi(params).then(function (result) {
                vm.analysisSrc = result.data;
                blockUI.stop();

                // set up geotiff link
                var time = stateService.getTemporalFilter(),
                    sensor = stateService.getSensor(),
                    params = {
                        start: moment.utc(time.start).toISOString(),
                        stop: moment.utc(time.stop).toISOString(),
                        operation: vm.selectedAnalysis.name,
                        n: bbox.north,
                        e: bbox.east,
                        s: bbox.south,
                        w: bbox.west,
                        imageQuality: stateService.getImageQuality(),
                        minThreshold: vm.threshold ? vm.threshold.min : null,
                        maxThreshold: vm.threshold ? vm.threshold.max : null,
                        colormap: vm.selectedColormap.name,
                        sensor: sensor >= 0 ? sensor : null
                    };

                vm.geotiffLink = sigmaConfig.urls.aoianalysis + '?start=' + params.start + '&stop=' + params.stop + '&operation=' + params.operation + '&n=' + params.n + '&e=' + params.e + '&s=' + params.s + '&w=' + params.w + '&band=' + band + '&returntype=geotiff&imagequality=' + params.imageQuality + '&colormap=' + params.colormap;

                if (params.minThreshold && params.maxThreshold) {
                    vm.geotiffLink = vm.geotiffLink + '&minthreshold=' + params.minThreshold + '&maxthreshold=' + params.maxThreshold;
                }

                if (params.sensor) {
                    vm.geotiffLink = vm.geotiffLink = vm.geotiffLink + '&sensor=' + params.sensor;
                }

                analysisModal.$promise.then(function () {
                    analysisModal.show();
                });
            }, function (error) {
                blockUI.reset();
                sigmaService.showError(error, 'danger');
            });
        };

        vm.updateThresholdMin = function (event, delta, deltaX, deltaY) {
            if (deltaY > 0) {
                vm.threshold.min++;
                if (vm.threshold.min > vm.threshold.max) {
                    vm.threshold.max++;
                }
            } else if (deltaY < 0) {
                vm.threshold.min--;
            }
        };

        vm.updateThresholdMax = function (event, delta, deltaX, deltaY) {
            if (deltaY > 0) {
                vm.threshold.max++;
            } else if (deltaY < 0) {
                vm.threshold.max--;
                if (vm.threshold.max < vm.threshold.min) {
                    vm.threshold.min--;
                }
            }
        };

        $scope.$watch('vm.selectedAnalysis', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if (newValue.threshold) {
                vm.threshold = {
                    min: 0,
                    max: sigmaConfig.thresholdCeiling
                };
                vm.showThreshold = true;
            } else {
                vm.threshold = null;
                vm.showThreshold = false;
            }
        });

        $scope.$watch('vm.stateService.getViewMode()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            aoiAnalysisAside.hide();
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaAoiAnalysis', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/aoiAnalysis/aoiAnalysisTemplate.html',
            controller: 'aoiAnalysisController',
            controllerAs: 'vm',
            scope: {}
        };
    });
})();
(function () {
    'use strict';

    angular.module('sigma').controller('bandController', ['$scope', '$location', 'sigmaConfig', 'stateService', '_', function (
        $scope,
        $location,
        sigmaConfig,
        stateService,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.sigmaConfig = sigmaConfig;
        vm.expanded = $scope.expanded;
        vm.mode = $scope.$parent.mode;
        vm.bands = _.cloneDeep(sigmaConfig.bands);
        vm.selectedBand = qs.band ? _.find(vm.bands, { name: qs.band }) : _.find(vm.bands, { default: true });

        vm.setBand = function (value) {
            stateService.setBand(value.name);
        };

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };

        var initialize = function () {
            vm.setBand(vm.selectedBand);
        };

        initialize();

        $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            qs = newValue;
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaBand', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/band/bandTemplate.html',
            controller: 'bandController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();

(function () {
    'use strict';

    angular.module('sigma').controller('correlationAnalysisController', ['$scope', '$modal', 'sigmaConfig', 'stateService', '_', 'moment', function (
        $scope,
        $modal,
        sigmaConfig,
        stateService,
        _,
        moment
    ) {
        var vm = this;
        
        vm.stateService = stateService;
        vm.correlation = {};
        vm.correlationSrc = null;
        vm.geotiffLink = '';
        vm.geotiffFilename = '';

        var analysisModal = $modal({scope: $scope, templateUrl: 'correlationAnalysisModal.html', show: false, animation: 'am-fade-and-scale'});

        $scope.$watchCollection('vm.stateService.getCorrelationData()', function (newValue) {
            if (newValue && _.keys(newValue).length > 0) {
                vm.correlation = newValue;
                vm.geotiffLink = sigmaConfig.urls.correlate + '?start=' + vm.correlation.start.toISOString() + '&stop=' + vm.correlation.stop.toISOString() + '&n=' + vm.correlation.bbox.north + '&e=' + vm.correlation.bbox.east + '&s=' + vm.correlation.bbox.south + '&w=' + vm.correlation.bbox.west + '&lat=' + vm.correlation.latlng.lat + '&lng=' + vm.correlation.latlng.lng + '&band=' + vm.correlation.band + '&returntype=geotiff&imagequality=' + vm.correlation.imageQuality;
                vm.geotiffFilename = 'sigma-correlation-analysis-' + moment.utc().unix() + '.tif';
                vm.correlationSrc = vm.correlation.data;
                analysisModal.$promise.then(function () {
                    analysisModal.show();
                });
            }
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaCorrelationAnalysis', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/correlationAnalysis/correlationAnalysisTemplate.html',
            controller: 'correlationAnalysisController',
            controllerAs: 'vm',
            scope: {}
        };
    });
})();
(function () {
    'use strict';

    angular.module('sigma').controller('coverageFilterController', ['$scope', '$location', 'sigmaConfig', 'stateService', function (
        $scope,
        $location,
        sigmaConfig,
        stateService
    ) {
        var qs = $location.search(),
            vm = this;

        vm.enableCoverageComponent = sigmaConfig.components.coverageFilter;
        vm.expanded = $scope.expanded;
        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };
        vm.coverageEnabled = qs.enableCoverage ? qs.enableCoverage === 'true' : sigmaConfig.defaultEnableCoverage;
        vm.stateService = stateService;
        vm.coverageOpacitySlider = {
            min: 0.01,
            max: 1.0,
            value: qs.coverageOpacity ? parseFloat(qs.coverageOpacity) : 0.5
        };

        $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            qs = newValue;
        });

        $scope.$watch('vm.coverageEnabled', function () {
            stateService.setEnableCoverage(vm.coverageEnabled);
        });

        $scope.$watch('vm.coverageOpacitySlider.value', function () {
            stateService.setCoverageOpacity(vm.coverageOpacitySlider.value);
        });

        $scope.$watch('vm.stateService.getEnableCoverage()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.coverageEnabled = newValue;
        });

        $scope.$watch('vm.stateService.getCoverageOpacity()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.coverageOpacitySlider.value = newValue;
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaCoverageFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/coverageFilter/coverageFilterTemplate.html',
            controller: 'coverageFilterController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();
(function () {
    'use strict';
    
    angular.module('sigma').controller('gotoController', ['$scope', '$location', 'sigmaConfig', 'sigmaService', 'stateService', 'L', function (
        $scope,
        $location,
        sigmaConfig,
        sigmaService,
        stateService,
        L
    ) {
        var vm = this,
            qs = $location.search(),
            map = stateService.getMap();

        $scope.mode = $scope.$parent.mode;
        vm.sigmaConfig = sigmaConfig;
        vm.stateService = stateService;
        vm.expanded = $scope.expanded;
        vm.lat = '';
        vm.lng = '';
        vm.mgrs = '';
        vm.locationFormat = qs.locationFormat ? qs.locationFormat : sigmaConfig.defaultLocationFormat;

        var convertLatLng = function (newFormat) {
            return sigmaService.convertLatLng({
                lat: vm.lat,
                lng: vm.lng,
                mgrs: vm.mgrs,
                format: vm.locationFormat
            }, newFormat);
        };

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };
        
        vm.goto = function () {
            var ddLatLng = convertLatLng('dd');
            map.setView(L.latLng(ddLatLng.lat, ddLatLng.lng));
        };

        vm.setLocationFormat = function (format) {
            stateService.setLocationFormat(format);
        };

        var initialize = function () {
            vm.setLocationFormat(vm.locationFormat);
        };

        initialize();

        $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            qs = newValue;
        });

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

(function () {
    'use strict';
    
    angular.module('sigma').directive('sigmaGoto', function () {
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
(function () {
    'use strict';

    angular.module('sigma').controller('frameOverlaysController', ['$scope', '$alert', 'sigmaConfig', 'stateService', '_', function (
        $scope,
        $alert,
        sigmaConfig,
        stateService,
        _
    ) {
        var vm = this,
            frameIndexes = [],
            canvasImageOverlay = stateService.getCanvasImageOverlay();

        vm.expanded = $scope.expanded;
        vm.stateService = stateService;
        vm.frameOverlays = [];
        vm.playbackState = '';
        vm.contrastLevels = sigmaConfig.contrastLevels;
        vm.selectedContrastLevel = _.find(sigmaConfig.contrastLevels, { default: true });

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };

        vm.highlightImage = function (overlay, doHighlight) {
            if (doHighlight) {
                if (overlay.enabled) {
                    _.forEach(canvasImageOverlay.frames[canvasImageOverlay.currentIdx].images, function(o) {
                        // mark all overlays as hidden, except for the matching target
                        o.visible = false;
                        if (o.url === overlay.url) {
                            o.visible = true;
                        }
                    });
                }
            } else {
                // return to "normal" state
                _.forEach(canvasImageOverlay.frames[canvasImageOverlay.currentIdx].images, function(o) {
                    o.visible = true;
                });
            }

            canvasImageOverlay.redraw();
        };

        vm.toggleImage = function (overlay) {
            // all this does right now is superficially remove the image from the array and the map
            // need this to persist
            var frameCurrent = stateService.getFrameCurrent(),
                overlayIdx = _.indexOf(frameIndexes[frameCurrent].images, overlay);

            if (typeof overlayIdx === 'undefined' || overlayIdx === null || overlayIdx > frameIndexes[frameCurrent].images.length - 1) {
                $alert({
                    title: 'Overlay Error',
                    content: 'Unable to retrieve overlay object',
                    type: 'danger'
                });
                return;
            }

            if (overlay.enabled) {
                frameIndexes[frameCurrent].images[overlayIdx].enabled = false;
                stateService.setFrameIndexes(frameIndexes);
            } else {
                _.find(vm.frameOverlays, 'src', overlay.src).enabled = true;
            }

            // render the overlay service
            canvasImageOverlay.redraw();
        };

        vm.setContrastLevel = function () {
            stateService.setContrastLevel(vm.selectedContrastLevel);
        };

        $scope.$watchCollection('vm.stateService.getFrameOverlays()', function (newValue) {
            if (newValue) {
                vm.frameOverlays = newValue;
            }
        });

        $scope.$watchCollection('vm.stateService.getFrameIndexes()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            frameIndexes = newValue;
        });

        $scope.$watch('vm.stateService.getPlaybackState()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.playbackState = newValue;
        });

        vm.getOverlayTooltip = function (overlay) {
            var url = overlay.url;
            return url.split('/')[url.split('/').length - 3] + '<span class="file-path-delimiter">/</span>' + url.split('/')[url.split('/').length - 2] + '<span class="file-path-delimiter">/</span>' + url.split('/')[url.split('/').length - 1];
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaFrameOverlays', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/frameOverlays/frameOverlaysTemplate.html',
            controller: 'frameOverlaysController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();
(function () {
    'use strict';

    angular.module('sigma').controller('imageFiltersController', ['$scope', 'stateService', 'sigmaConfig', '_', function (
        $scope,
        stateService,
        sigmaConfig,
        _
    ) {
        var vm = this,
            // enum value for a divider
            DIVIDER = '-',
            // order of sliders
            controls = [
                'opacity',
                'brightness',
                'contrast',
                DIVIDER,
                //'sharpen', // TODO
                'blur',
                DIVIDER,
                'hue',
                'saturation',
                DIVIDER,
                'invert',
                'sepia',
            ],
            /**
             * Sets the key of the control to the sigmaConfig value. If the config
             * value is undefined, the passed in default value is set.
             * @param  {object} control    A control object
             * @param  {string} key       The property on control to set
             * @param  {any}    value     A default value to set, if not on sigmaConfig
             * @param  {string} filterKey The lookup for the imageFilter in sigmaConfig
             */
            setDefault = function (control, key, value, filterKey) {
                // set the value from the config
                control[key] = sigmaConfig.imageFilters[filterKey][key];

                // if the value is undefined, set the given default value
                if (! angular.isDefined(control[key])) {
                    control[key] = value;
                }
            };


        vm.canvasImageOverlay = stateService.getCanvasImageOverlay();
        vm.controls = [];


        // loop through order of controls and create objects to use in the scope
        _.forEach(controls, function (key) {
            if (key === DIVIDER) {
                // no need to set params for dividers
                vm.controls.push({
                    isDivider: true
                });
            } else if (sigmaConfig.imageFilters[key].enabled) {
                var control = {
                        id: key,
                        switch: sigmaConfig.imageFilters[key].switch,
                    },
                    // create default name based on the key
                    name = key.charAt(0).toUpperCase() + key.slice(1);

                // make sure the values have a default
                setDefault(control, 'name', name, key);
                setDefault(control, 'default', 0, key);
                setDefault(control, 'min', 0, key);
                setDefault(control, 'max', 100, key);
                setDefault(control, 'step', 1, key);
                setDefault(control, 'units', '%', key);

                vm.controls.push(control);
            }
        });


        vm.render = function () {
            vm.canvasImageOverlay.redraw();
        };

        vm.reset = function (attr, val) {
            vm.canvasImageOverlay[attr] = val;
            vm.render();
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('locationFilterController', ['$scope', 'sigmaConfig', 'stateService', '_', function (
        $scope,
        sigmaConfig,
        stateService,
        _
    ) {
        var vm = this;

        vm.expanded = $scope.expanded;
        vm.mode = $scope.$parent.mode;
        vm.stateService = stateService;
        vm.location = {};
        vm.spatialZoom = '';

        vm.setLocationBounds = function () {
            if (vm.location.format !== 'mgrs') {
                if (vm.location.north && vm.location.south && vm.location.east && vm.location.west) {
                    stateService.setBboxParams(vm.location);
                }
            } else {
                if (vm.location.mgrsNE && vm.location.mgrsSW) {
                    stateService.setBboxParams(vm.location);
                }
            }
            stateService.setLocationFormat(vm.location.format);
        };

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };

        $scope.$watchCollection('vm.stateService.getBbox()', function (newValue) {
            if (newValue) {
                if (_.keys(newValue).length > 0) {
                    vm.location = newValue;
                }
            } else {
                vm.location = {};
            }

        });

        $scope.$watchCollection('vm.location', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.setLocationBounds();
        });

        if (vm.mode === 'analyze') {
            $scope.$watch('vm.stateService.getSpatialZoom()', function (newValue) {
                vm.spatialZoom = newValue;
            });
        }
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaLocationFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/locationFilter/locationFilterTemplate.html',
            controller: 'locationFilterController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }

        };
    });
})();

(function () {
    'use strict';

    angular.module('sigma').controller('locationFormatController', ['$scope', '$location', 'sigmaConfig', 'stateService', 'coordinateConversionService', '_', function (
        $scope,
        $location,
        sigmaConfig,
        stateService,
        coordinateConversionService,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.stateService = stateService;
        vm.location = {
            format: qs.locationFormat || sigmaConfig.defaultLocationFormat,
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
            stateService.setBboxParams(vm.location);
            stateService.setLocationFormat(newFormat);
        };

        $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            qs = newValue;
        });

        $scope.$watchCollection('vm.stateService.getBbox()', function (newValue) {
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

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaLocationFormat', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/locationFormat/locationFormatTemplate.html',
            controller: 'locationFormatController',
            controllerAs: 'vm',
            scope: {}
        };
    });
})();
(function () {
    'use strict';

    angular.module('sigma').controller('mapController', ['$scope', '$timeout', '$location', 'sigmaConfig', 'analyzeService', 'sigmaService', 'stateService', 'leafletData', 'blockUI', 'L', '_', 'd3', function (
        $scope,
        $timeout,
        $location,
        sigmaConfig,
        analyzeService,
        sigmaService,
        stateService,
        leafletData,
        blockUI,
        L,
        _,
        d3
    ) {
        var vm = this,
            qs = $location.search(),
            map = {},
            drawControl = null,
            enableCoverage = qs.enableCoverage ? qs.enableCoverage : sigmaConfig.defaultEnableCoverage,
            coverageOpacity = stateService.getCoverageOpacity(),
            coverageLayer = new L.LayerGroup(),
            coverageData,
            frameExtents = {},
            mapFeatureGroup = new L.FeatureGroup();

        vm.mode = $scope.mode;
        vm.mapHeight = '0px';
        vm.center = stateService.getMapCenter();
        vm.stateService = stateService;
        vm.maxBounds = sigmaConfig.maxBounds;

        // ui-leaflet defaults
        vm.defaults = {
            crs: sigmaConfig.defaultProjection,
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
        vm.layers = _.cloneDeep(sigmaConfig.layers);

        vm.colorScale = d3.scale.linear()
            .range(['green', 'yellow', 'red']) // or use hex values
            .domain([50, 120, 200]);

        angular.element(document).ready(function () {
            // set map height equal to available page height
            var viewport = sigmaService.getViewportSize();
            vm.mapHeight = viewport.height + 'px';
        });

        vm.drawCoverage = function () {
            if (vm.mode === 'search') {
                if (coverageLayer) {
                    coverageLayer.clearLayers();
                    if (enableCoverage && coverageData) {
                        _.forEach(coverageData, function (coverage) {
                            if (coverage !== null && coverage.n !== null) {
                                // define rectangle geographical bounds
                                var bounds = [[coverage.s, coverage.e], [coverage.n, coverage.w]];
                                // create a rectangle overlay
                                L.rectangle(bounds, {
                                    color: vm.colorScale(coverage.count),
                                    weight: 1,
                                    opacity: coverageOpacity,
                                    fillOpacity: coverageOpacity
                                }).addTo(coverageLayer).bringToBack();
                            }
                        });
                    }
                }
            } else {
                if (coverageLayer) {
                    coverageLayer.clearLayers();
                }
            }
        };

        vm.updateBaselayer = function (layer) {
            leafletData.getLayers().then(function (layers) {
                _.forEach(layers.baselayers, function (layer) {
                    vm.map.removeLayer(layer);
                });
                vm.map.addLayer(layers.baselayers[layer.id]);
            });
        };

        var initDrawControls = function () {
            if (drawControl) {
                map.removeControl(drawControl);
            }
            drawControl = new L.Control.Draw({
                draw: {
                    rectangle: false,
                    polyline: false,
                    polygon: false,
                    circle: false,
                    marker: false
                },
                edit: {
                    featureGroup: mapFeatureGroup
                }
            });
            if (vm.mode === 'search') {
                L.drawLocal.edit.toolbar.buttons = {
                    edit: 'Edit AOI',
                    editDisabled: 'No AOI to edit',
                    remove: 'Delete AOI',
                    removeDisabled: 'No AOI to delete'
                };
            } else if (vm.mode === 'analyze') {
                L.drawLocal.edit.toolbar.buttons = {
                    edit: 'Edit markers',
                    editDisabled: 'No markers to edit',
                    remove: 'Delete markers',
                    removeDisabled: 'No markers to delete'
                };
            }
            map.addControl(drawControl);
        };

        $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            qs = newValue;
        });

        $scope.$watchCollection('vm.stateService.getViewportSize()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.mapHeight = newValue.height + 'px';
        });

        $scope.$watchCollection('vm.stateService.getCoverage()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            coverageData = newValue;
            if (enableCoverage) {
                vm.drawCoverage();
            }
        });

        $scope.$watchCollection('vm.stateService.getEnableCoverage()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            enableCoverage = newValue;
            if (enableCoverage && coverageData) {
                vm.drawCoverage();
            } else {
                coverageLayer.clearLayers();
            }
        });

        $scope.$watchCollection('vm.stateService.getCoverageOpacity()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            coverageOpacity = newValue;

            coverageLayer.eachLayer(function (layer) {
                layer.setStyle({
                    fillOpacity: newValue,
                    opacity: newValue
                });
                layer.redraw();
            });
        });

        $scope.$watchCollection('vm.stateService.getBaselayer()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.updateBaselayer(newValue);
        });

        $scope.$watchCollection('vm.stateService.getFrameExtents()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            frameExtents = newValue;
        });

        $scope.$watchCollection('vm.stateService.getMapCenter()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if (newValue && !isNaN(newValue.lat) && !isNaN(newValue.lng)) {
                vm.center = newValue;
            }
        });

        vm.initialize = function () {
            stateService.setMapFeatureGroup(mapFeatureGroup);

            leafletData.getMap().then(function (data) {
                map = data;

                mapFeatureGroup.addTo(map);

                // init draw controls
                initDrawControls();

                // init map center
                stateService.setMapCenter(vm.center);

                // disable leaflet keyboard shortcuts to prevent collision with angular hotkeys
                map.keyboard.disable();

                stateService.setMap(map);
                vm.map = map;

                // add coordinates control
                L.control.coordinates({
                    enableUserInput: false
                }).addTo(map);

                var baselayerId = qs.baselayer,
                    baselayer = {};
                if (baselayerId) {
                    // add requested baselayer to vm.layers.baselayers first
                    baselayer = _.find(sigmaConfig.layers.baselayers, { id: baselayerId });
                    vm.updateBaselayer(baselayer);
                } else {
                    // baselayer not present in querystring, so just go with defaults
                    baselayer = sigmaConfig.layers.baselayers[sigmaConfig.defaultBaselayer];
                    vm.layers = _.cloneDeep(sigmaConfig.layers);
                    stateService.setBaselayer(baselayer);
                }

                coverageLayer.addTo(map);

                map.on('baselayerchange', function (e) {
                    var baselayer = _.find(sigmaConfig.layers.baselayers, { name: e.name });
                    stateService.setBaselayer(baselayer);
                });

                map.on('moveend', function (e) {
                    console.log('moveend');
                    if (stateService.getViewMode() === 'search') {
                        var mapCenter = e.target.getCenter();
                        stateService.setMapCenter({
                            lat: mapCenter.lat,
                            lng: mapCenter.lng,
                            zoom: e.target.getZoom()
                        });
                    }
                });
            });
        };

        vm.initialize();

        $scope.$watch('vm.stateService.getViewMode()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.mode = newValue;
            vm.drawCoverage();
            initDrawControls();
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaMap', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/map/mapTemplate.html',
            controller: 'mapController',
            controllerAs: 'vm',
            scope: {
                mode: '='
            }
        };
    });
})();

(function () {
    'use strict';

    angular.module('sigma').controller('playbackController', ['$scope', '$alert', '$location', '$timeout', 'sigmaConfig', 'stateService', 'Overlay', 'videoService', 'd3', '_', 'L', 'leafletData', 'moment', 'blockUI', 'hotkeys', 'Image', '$', '$aside', function (
        $scope,
        $alert,
        $location,
        $timeout,
        sigmaConfig,
        stateService,
        Overlay,
        videoService,
        d3,
        _,
        L,
        leafletData,
        moment,
        blockUI,
        hotkeys,
        Image,
        $,
        $aside
    ) {
        var vm = this,
            qs = $location.search(),
            canvasImageOverlay = stateService.getCanvasImageOverlay(),
            overlays = [],
            brushExtents = {},
            frameIndexes = [],
            frameCurrent = 0,
            frameDuration = 0,
            totalSeconds = 0,
            isCustomInterval = false,
            timeSliderExtentStart = '',
            timeSliderExtentStop = '',
            timeSliderData = {},
            // the first frame idx when the video exporter is started
            exportFrameStart = 0,
            // how many loops the video exporter hits, used for when to stop recording
            exportLoopCounter = 0,
            // total number of rames video exporter records, used for progress
            exportFrameCounter = 0,
            contrastLevel = _.find(sigmaConfig.contrastLevels, { default: true }),
            imgFiltersAside = $aside({
                title: 'Image filters',
                controller: 'imageFiltersController',
                controllerAs: 'vm',
                backdrop: false,
                contentTemplate: 'modules/components/imageFilters/imageFiltersTemplate.html',
                show: false
            });

        var exportReset = function () {
            // helper to set the video export back to an uninitialized state
            videoService.isRecording = false;
            videoService.clear();
            exportLoopCounter = 0;
            exportFrameStart = 0;
            exportFrameCounter = 0;
            if (vm.exportLabels) {
                canvasImageOverlay.textLayer.text = '';
                canvasImageOverlay.redraw();
            }
        };

        var exportCheckLoop = function () {
            // function to call on each iteration of the playback loop to check
            // when to stop and start the encoder
            if (videoService.isRecording) {
                // if the current frame comes back to wherever the video
                // was started at, count a new loop
                if (frameCurrent === exportFrameStart) {
                    exportLoopCounter++;
                }

                // keep track of number of frames recorded
                exportFrameCounter++;

                // update progress message
                var totalFrames = frameIndexes.length * parseInt(vm.exportLoops.value),
                    progress = Math.round((exportFrameCounter / totalFrames) * 100);
                blockUI.message('Recording ' + progress + '%');

                // set the text at the top left of the PIXI renderer
                if (vm.exportLabels) {
                    var textLayer = '';
                    textLayer += moment.utc(frameIndexes[frameCurrent].start).format('MM/DD/YYYY HH:mm:ss');
                    textLayer += ' - ';
                    textLayer += moment.utc(frameIndexes[frameCurrent].stop).format('MM/DD/YYYY HH:mm:ss');

                    canvasImageOverlay.textLayer.text = textLayer;
                } else {
                    canvasImageOverlay.textLayer.text = '';
                }

                // once the loops have hit the controller value start export
                if (exportLoopCounter >= parseInt(vm.exportLoops.value)) {
                    // stop the playback animation
                    vm.sliderCtrl('stop');
                    blockUI.stop();

                    // make sure there is a file name
                    var fname = vm.exportFilename ? vm.exportFilename : sigmaConfig.title;
                    fname += '.' + vm.exportFormat;

                    // start the encoding
                    videoService.encode(fname).then(function () {
                        exportReset();
                    }, function () {
                        exportReset();
                        $alert({
                            title: 'Error',
                            content: 'Error saving video',
                            type: 'danger'
                        });
                    });
                }
            }
        };

        vm.stateService = stateService;
        vm.playbackWithGaps = sigmaConfig.playbackWithGaps;
        vm.playbackSpeed = {
            min: 0,
            max: sigmaConfig.maxPlaybackDelay / 100,
            value: sigmaConfig.maxPlaybackDelay / 100,
            step: 0.01
        };

        vm.playbackStart = moment.utc().startOf('d').toISOString();
        vm.playbackStop = moment.utc().endOf('d').toISOString();
        vm.setPlaybackFilter = function () {
            // filter out images that don't fall between playback filter values
            frameIndexes = _.cloneDeep(stateService.getFrameIndexes());
            frameIndexes = _.forEach(frameIndexes, function (frame) {
                frame.images = _.filter(frame.images, function (image) {
                    var year = moment.utc(image.time).format('YYYY');
                    var month = moment.utc(image.time).format('MM');
                    var startDay = moment.utc(image.time).format('DD');
                    var startHour = moment.utc(vm.playbackStart).format('HH');
                    var startMinute = moment.utc(vm.playbackStart).format('mm');
                    var startSecond = moment.utc(vm.playbackStart).format('ss');
                    var compareStart = moment.utc(year + '-' + month + '-' + startDay + 'T' + startHour + ':' + startMinute + ':' + startSecond);
                    var stopDay = null;
                    if (moment.utc(vm.playbackStop).isBefore(moment.utc(vm.playbackStart))) {
                        stopDay = moment.utc(image.time).add(1, 'd').format('DD');
                    } else {
                        stopDay = moment.utc(image.time).format('DD');
                    }
                    var stopHour = moment.utc(vm.playbackStop).format('HH');
                    var stopMinute = moment.utc(vm.playbackStop).format('mm');
                    var stopSecond = moment.utc(vm.playbackStop).format('ss');
                    var compareStop = moment.utc(year + '-' + month + '-' + stopDay + 'T' + stopHour + ':' + stopMinute + ':' + stopSecond);
                    return moment.utc(image.time).isBetween(compareStart, compareStop, null, '[]');
                });
            });
            if (!vm.playbackWithGaps) {
                // remove frames from the index that don't contain images
                frameIndexes = _.filter(frameIndexes, function (i) {
                    return i.images.length !== 0;
                });
            }
        };

        vm.playbackToggleAside = function () {
            // onclick event for the "filters" button to open the aside
            imgFiltersAside.toggle();
        };

        // video export controls
        vm.exportBaseLayer = true;
        vm.exportLabels = true;
        vm.exportFormats = _.transform(sigmaConfig.encoders, function (result, v, k) {
            if (v.enabled) {
                result.push(k);
            }
        }, []);
        vm.exportFormat = videoService.encoder;
        vm.exportLoops = {
            min: 1,
            max: 10,
            value: 1,
            step: 1
        };
        vm.exportFilename = '';
        vm.export = function () {
            // helper to start exporting a video
            videoService.isRecording = true;
            videoService.includeBaseLayer = vm.exportBaseLayer;

            // make sure the animation is stopped
            vm.sliderCtrl('stop');

            // wait for the initialization to finish
            videoService.initialize().then(function () {
                // set the UI message, will be updated or stopped in exportCheckLoop()
                blockUI.start('Recording');

                // save the frame we start at and start the playback
                exportFrameStart = frameCurrent;
                vm.sliderCtrl('playPause');
            }, function () {
                videoService.isRecording = false;
                videoService.clear();
                $alert({
                    title: 'Error',
                    content: 'Error initializing video recording',
                    type: 'danger'
                });
            });
        };

        vm.playbackIntervals = _.cloneDeep(sigmaConfig.playbackIntervals);
        vm.playbackInterval = qs.playbackInterval ? _.find(vm.playbackIntervals, { value: qs.playbackInterval }) : _.find(vm.playbackIntervals, { default: true });
        vm.playbackIntervalQty = qs.playbackIntervalQty ? parseInt(qs.playbackIntervalQty) : _.clone(sigmaConfig.defaultPlaybackIntervalQty);

        if (vm.playbackIntervalQty === 0) {
            vm.playbackInterval = _.find(vm.playbackIntervals, { value: null });
        }

        vm.playbackState = 'stop';
        vm.playbackDirection = 'forward';
        vm.numImagesLoaded = 0;
        vm.totalImages = 0;
        vm.imageQualityPercentage = {
            min: 0,
            // I don't know why, but Angular doesn't handle range slider values
            // properly when min/max are between 0-1, so set max to 10 and
            // divide by 10 laterto obtain range slider value
            max: 10,
            value: sigmaConfig.defaultImageQuality,
            step: 0.01
        };

        hotkeys.bindTo($scope)
            .add({
                combo: 'p',
                description: 'Play/Pause',
                callback: function () {
                    vm.sliderCtrl('playPause');
                }
            }).add({
            combo: 'left',
            description: 'Step Back',
            callback: function () {
                vm.sliderCtrl('stepBackward');
            }
        }).add({
            combo: 'right',
            description: 'Step Forward',
            callback: function () {
                vm.sliderCtrl('stepForward');
            }
        }).add({
            combo: 'up',
            description: 'Play/Pause Forward',
            callback: function () {
                vm.sliderCtrl('forward');
                vm.sliderCtrl('playPause');
            }
        }).add({
            combo: 'down',
            description: 'Play/Pause Backward',
            callback: function () {
                vm.sliderCtrl('backward');
                vm.sliderCtrl('playPause');
            }
        }).add({
            combo: 'alt+left',
            description: 'Reverse',
            callback: function () {
                vm.sliderCtrl('backward');
            }
        }).add({
            combo: 'alt+right',
            description: 'Forward',
            callback: function () {
                vm.sliderCtrl('forward');
            }
        });

        // determine the number of frames based on the selected portion of the slider extents
        var calculateNumberOfFrames = function (useIntervalControl) {
            totalSeconds = moment.utc(timeSliderExtentStop).diff(moment.utc(timeSliderExtentStart), 's');

            // build playback array based on interval
            if (useIntervalControl) {
                var tempDate = moment.utc(timeSliderExtentStart).add(vm.playbackIntervalQty, vm.playbackInterval.value);
                frameDuration = tempDate.diff(moment.utc(timeSliderExtentStart), 's');
            } else {
                var currPlaybackIntervalQty = vm.playbackIntervalQty,
                    currPlaybackInterval = vm.playbackInterval;

                frameDuration = moment.utc(brushExtents.stop).diff(moment.utc(brushExtents.start), 's');
                if (moment.duration(frameDuration, 's').days() < 1) {
                    // requested interval is less than a day, so make sure it's not less than the default minimum
                    if (moment.duration(frameDuration, 's').get(sigmaConfig.minimumFrameDuration.interval) < sigmaConfig.minimumFrameDuration.value) {
                        frameDuration = moment.utc(brushExtents.start).add(sigmaConfig.minimumFrameDuration.value, sigmaConfig.minimumFrameDuration.interval).diff(moment.utc(brushExtents.start), 's');
                    }
                    vm.playbackIntervalQty = moment.duration(frameDuration, 's').get(sigmaConfig.minimumFrameDuration.interval);
                    vm.playbackInterval = _.find(vm.playbackIntervals, {value: sigmaConfig.minimumFrameDuration.interval});
                } else {
                    vm.playbackIntervalQty = Math.floor(moment.duration(frameDuration, 's').asDays());
                    vm.playbackInterval = _.find(vm.playbackIntervals, {value: 'd'});
                }
                if (currPlaybackIntervalQty === vm.playbackIntervalQty && currPlaybackInterval.title === vm.playbackInterval.title) {
                    // playback interval hasn't changed so there is no need for updating the brush or the playback array
                    stateService.setBrushReset();
                    return false;
                }
            }
            stateService.setPlaybackIntervalQty(vm.playbackIntervalQty);
            stateService.setPlaybackInterval(vm.playbackInterval);
            return Math.ceil(totalSeconds/frameDuration);
        };

        // set up array of time-based images to project onto the map
        var updatePlaybackArray = function (useIntervalControl) {
            blockUI.start('Configuring Playback');

            if (typeof useIntervalControl === 'undefined' || useIntervalControl === null) {
                useIntervalControl = true;
            }

            frameIndexes = [];
            frameCurrent = 0;
            vm.numImagesLoaded = 0;
            vm.totalImages = 0;

            // sort images by imagequality descending in preparation for imagequality filtering
            var sortedOverlaysImageQuality = _.sortBy(timeSliderData.frame, ['imagequality'], ['desc']);

            // if imagequality has been adjusted above 0, remove all overlays where imagequality is null
            if (Math.ceil(vm.imageQualityPercentage.value/10) > 0) {
                _.remove(sortedOverlaysImageQuality, { imagequality: null });
            } else {
                // otherwise, move images with null imagequality to the bottom of the list
                var overlaysWithNullImageQuality = _.remove(sortedOverlaysImageQuality, { imagequality: null });
                if (overlaysWithNullImageQuality.length > 0) {
                    sortedOverlaysImageQuality = sortedOverlaysImageQuality.concat(overlaysWithNullImageQuality);
                }
            }

            var totalOverlays = timeSliderData.frame.length;
            // use imagequality value to take only the top n% of images
            // this allows for more consistent results, since an imagequality of 0.2 could mean different things across tiles
            // divide imageQualityPercentage.value by 10 because of Angular behavior mentioned earlier
            var numToTake = totalOverlays - (Math.ceil((vm.imageQualityPercentage.value/10) * totalOverlays));
            var filteredOverlays = _.take(sortedOverlaysImageQuality, numToTake);
            // the lowest imagequality value left is what will be used for aoianalysis, pointconverter, and correlation
            var actualImageQuality = filteredOverlays[filteredOverlays.length - 1].imagequality || 0;
            // finally, sort overlays by time ascending for playback
            var sortedOverlaysTime = _.sortBy(filteredOverlays, 'time');

            // report actualImageQuality to stateService
            stateService.setImageQuality(actualImageQuality);
            vm.totalImages = sortedOverlaysTime.length;

            // onload callback for each image load event
            var onload = function () {
                vm.numImagesLoaded++;
                $scope.$evalAsync();
            };

            var currOverlays = _.filter(sortedOverlaysTime, function (o) {
                return moment.utc(o.time).isSameOrAfter(moment.utc(timeSliderExtentStart));
            });

            var numFrames = vm.playbackInterval.value === null ? currOverlays.length : calculateNumberOfFrames(useIntervalControl),
                currStartTime = moment.utc(timeSliderExtentStart).toISOString(),
                currStopTime = vm.playbackInterval.value === null ? currOverlays[0].time : moment.utc(currStartTime).add(frameDuration, 's').toISOString(),
                currDetailIdx = 0;

            if (numFrames) {
                var buildFrames = function (frameIdx) {
                    var frame = {
                        start: currStartTime,
                        stop: currStopTime,
                        enabled: true, //eventually the enabled value will come from the service
                        images: []
                    };

                    for (var i = 0; i < currOverlays.length; i++) {
                        if (currOverlays[currDetailIdx]) {
                            if (moment.utc(currStopTime).isSameOrAfter(moment.utc(currOverlays[currDetailIdx].time))) {
                                var overlayData = currOverlays[currDetailIdx],
                                    imgSrc = sigmaConfig.overlayPrefix + overlayData[contrastLevel.name],
                                    overlay = new Overlay(
                                        overlayData[contrastLevel.name],
                                        imgSrc,
                                        overlayData.imagequality,
                                        overlayData.bounds,
                                        overlayData.time,
                                        frame.enabled,
                                        onload
                                    );

                                frame.images.push(overlay);
                                currDetailIdx++;
                            }
                        }
                    }

                    frameIndexes.push(frame);

                    frameIdx++;

                    if (frameIdx <= numFrames) {
                        currStartTime = vm.playbackInterval.value === null ? moment.utc(currOverlays[frameIdx - 1].time).subtract(1, 's') : moment.utc(currStopTime).toISOString();
                        currStopTime = vm.playbackInterval.value === null ? currOverlays[frameIdx - 1].time : moment.utc(currStartTime).add(frameDuration, 's').toISOString();
                        buildFrames(frameIdx);
                    }
                };

                buildFrames(0);

                if (!vm.playbackWithGaps) {
                    // remove frames from the index that don't contain images
                    frameIndexes = _.filter(frameIndexes, function (i) {
                        return i.images.length !== 0;
                    });
                }

                // send all the frames to the canvas renderer
                canvasImageOverlay.set(frameIndexes);
            }

            blockUI.stop();
        };

        var doPlayback = function () {
            if (vm.playbackState === 'play' || vm.playbackState === 'pause' || vm.playbackState === 'step') {
                overlays = [];

                // iterate frame
                if (vm.playbackDirection === 'forward') {
                    if (frameCurrent === frameIndexes.length - 1) {
                        frameCurrent = 0;
                    } else {
                        frameCurrent++;
                    }
                } else if (vm.playbackDirection === 'backward') {
                    if (frameCurrent === 0) {
                        frameCurrent = frameIndexes.length - 1;
                    } else {
                        frameCurrent--;
                    }
                }

                // check if a video is being recorded
                exportCheckLoop();

                // add overlay images for this frame to the map
                if (frameIndexes[frameCurrent]) {
                    // setting the frame will rerender the canvas
                    canvasImageOverlay.setIdx(frameCurrent);

                    if (vm.playbackState === 'pause' || vm.playbackState === 'step') {
                        stateService.setFrameOverlays(overlays);
                        stateService.setFrameCurrent(frameCurrent);
                        stateService.setFrameIndexes(frameIndexes);
                    }

                    // save the frame to a video (only happens in record mode)
                    videoService.capture();

                    // tell time slider the start/stop of the next frame;
                    stateService.setFrameExtents(frameIndexes[frameCurrent].start, frameIndexes[frameCurrent].stop);
                } else {
                    vm.playbackState = 'stop';
                }
            } else {
                updatePlaybackArray(false);
            }
        };


        var getTimeSliderExtents = function () {
            // place this watch inside a function that only gets called after timeSliderData has been set
            $scope.$watchCollection('vm.stateService.getTimeSliderExtents()', _.debounce(function (newValue) {
                if (_.keys(newValue).length > 0) {
                    timeSliderExtentStart = moment.utc(newValue.start).toISOString();
                    timeSliderExtentStop = moment.utc(newValue.stop).toISOString();
                    // now that we know the slider extent, build the playback array
                    updatePlaybackArray();
                }
            }, sigmaConfig.debounceTime));
        };

        vm.minimize = function () {
            $('.map-analyze .leaflet-top .leaflet-control-layers').animate({ 'top': '-=5px'}, 200);
            $('.map-analyze .leaflet-top.leaflet-left').animate({ 'top': '-=50px'}, 200);
            $('.playback-controls-container').slideToggle(200, function () {
                $('.playback-controls-maximize').slideToggle(200);
            });
        };

        vm.maximize = function () {
            $('.playback-controls-maximize').slideToggle(200, function () {
                $('.map-analyze .leaflet-top .leaflet-control-layers').animate({ 'top': '+=5px'}, 200);
                $('.map-analyze .leaflet-top.leaflet-left').animate({ 'top': '+=50px'}, 200);
                $('.playback-controls-container').slideToggle(200);
            });
        };

        vm.disablePlayPauseButton = function () {
            return frameIndexes.length === 0;
        };

        vm.disableStepButton = function () {
            return !!(vm.playbackState === 'stop' || vm.playbackState === 'play');
        };

        vm.showPlayButton = function () {
            return vm.playbackState !== 'play';
        };

        vm.showPauseButton = function () {
            return vm.playbackState === 'play';
        };

        vm.setInterval = function (interval) {
            isCustomInterval = false;
            if (interval) {
                vm.playbackInterval = interval;
                stateService.setPlaybackInterval(interval);
            }
            if (vm.playbackInterval.value === null) {
                vm.playbackIntervalQty = 0;
            } else if (parseInt(vm.playbackIntervalQty) < 1) {
                vm.playbackIntervalQty = 1;
            }
            stateService.setPlaybackIntervalQty(vm.playbackIntervalQty);
            updatePlaybackArray();
        };

        vm.setIntervalQty = _.debounce(function () {
            vm.playbackIntervalQty = parseInt(vm.playbackIntervalQty);
            if (vm.playbackIntervalQty < 1 || isNaN(vm.playbackIntervalQty)) {
                vm.playbackIntervalQty = 1;
            }
            stateService.setPlaybackIntervalQty(parseFloat(vm.playbackIntervalQty));
            updatePlaybackArray();
        }, 750);

        vm.sliderCtrl = function (action) {
            if (action === 'playPause') {
                if (vm.playbackState !== 'play') {
                    vm.playbackState = 'play';
                } else {
                    // pause playback
                    vm.playbackState = 'pause';
                    stateService.setFrameOverlays(overlays);
                }
                stateService.setFrameExtents(moment.utc(frameIndexes[frameCurrent].start).toISOString(), moment.utc(frameIndexes[frameCurrent].stop).toISOString());
                doPlayback();
            } else if (action === 'stop') {
                // stop playback
                vm.playbackState = 'stop';
                vm.detailFeatures = [];
                vm.playbackState = 'stop';
                d3.select('.x.brush').style('pointer-events', 'all');
                // TODO hide image overlays?

                overlays = [];
                stateService.setFrameOverlays(overlays);
            } else if (action === 'stepBackward') {
                vm.playbackState = 'step';
                vm.playbackDirection = 'backward';
                stateService.setFrameExtents(moment.utc(frameIndexes[frameCurrent].start).toISOString(), moment.utc(frameIndexes[frameCurrent].stop).toISOString());
                stateService.setPlaybackState('pause');
                doPlayback();
            } else if (action === 'stepForward') {
                vm.playbackState = 'step';
                vm.playbackDirection = 'forward';
                stateService.setFrameExtents(moment.utc(frameIndexes[frameCurrent].start).toISOString(), moment.utc(frameIndexes[frameCurrent].stop).toISOString());
                stateService.setPlaybackState('pause');
                doPlayback();
            } else {
                // backward or forward button was pressed
                vm.playbackDirection = action;
            }
            // set values for use in other controllers
            stateService.setPlaybackState(vm.playbackState);
            stateService.setPlaybackDirection(vm.playbackDirection);
        };

        var initialize = function () {
            leafletData.getMap().then(function (map) {
                // init canvasImageOverlay after a delay so aoi rectangle is visible
                // TODO figure out a better way to time this
                $timeout(function () {
                    canvasImageOverlay.initialize(map);
                    stateService.setCanvasImageOverlay(canvasImageOverlay);
                }, 100);

                $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
                    if (angular.equals(newValue, oldValue)) {
                        return;
                    }
                    qs = newValue;
                });

                $scope.$watchCollection('vm.stateService.getBrushExtents()', function (newValue, oldValue) {
                    if (moment.utc(newValue.start).isSame(moment.utc(oldValue.start)) && moment.utc(newValue.stop).isSame(moment.utc(oldValue.stop))) {
                        return;
                    }

                    brushExtents = {
                        start: newValue.start,
                        stop: newValue.stop
                    };

                    if (vm.playbackState !== 'stop') {
                        doPlayback();
                    }
                });

                $scope.$watch('vm.exportFormat', function (newValue, oldValue) {
                    if (! angular.equals(newValue, oldValue)) {
                        videoService.encoder = newValue;
                    }
                });

                $scope.$watch('vm.playbackSpeed.value', function (newValue, oldValue) {
                    if (angular.equals(newValue, oldValue)) {
                        return;
                    }
                    stateService.setPlaybackSpeed(newValue * 100);
                });

                $scope.$watch('vm.imageQualityPercentage.value', _.debounce(function (newValue, oldValue) {
                    if (angular.equals(newValue, oldValue)) {
                        return;
                    }
                    updatePlaybackArray();
                }, 750));

                $scope.$watch('vm.playbackWithGaps', function (newValue, oldValue) {
                    if (angular.equals(newValue, oldValue)) {
                        return;
                    }
                    updatePlaybackArray();
                });

                $scope.$watchCollection('vm.stateService.getTimeSliderData()', function (newValue, oldValue) {
                    if (angular.equals(newValue, oldValue)) {
                        return;
                    }
                    if (_.keys(newValue).length > 0) {
                        if (newValue.frame) {
                            $timeout(function () {
                                timeSliderData = newValue;
                                getTimeSliderExtents();
                            });
                        } else {
                            console.error('Images not preloaded');
                        }
                    } else {
                        timeSliderData = newValue;
                        frameIndexes = [];
                        // send all the frames to the canvas renderer
                        canvasImageOverlay.set(frameIndexes);
                    }
                });

                $scope.$watch('vm.stateService.getViewMode()', function (newValue) {
                    if (newValue === 'analyze') {
                        overlays = [];
                        stateService.setFrameOverlays(overlays);
                    }
                });

                $scope.$watchCollection('vm.stateService.getFrameIndexes()', function (newValue, oldValue) {
                    if (angular.equals(newValue, oldValue)) {
                        return;
                    }
                    frameIndexes = newValue;
                });

                $scope.$watchCollection('vm.stateService.getContrastLevel()', function (newValue, oldValue) {
                    if (angular.equals(newValue, oldValue)) {
                        return;
                    }
                    contrastLevel = newValue;
                });
            });
        };

        initialize();
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaPlayback', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/playback/playbackTemplate.html',
            controller: 'playbackController',
            controllerAs: 'vm',
            scope: {}
        };
    });
})();
(function () {
    'use strict';

    angular.module('sigma').controller('pointConverterController', ['$scope', '$element', '$modal', 'sigmaConfig', 'sigmaService', 'stateService', '_', 'c3', 'moment', 'FileSaver', 'Blob', function (
        $scope,
        $element,
        $modal,
        sigmaConfig,
        sigmaService,
        stateService,
        _,
        c3,
        moment,
        FileSaver,
        Blob
    ) {
        var vm = this,
            chartHeight = 0,
            scatterModal = $modal({scope: $scope, templateUrl: 'scatterModal.html', show: false, animation: 'am-fade-and-scale'});
        
        vm.sigmaConfig = sigmaConfig;
        vm.stateService = stateService;
        vm.pointConverterData = {};

        vm.exportData = function(){
            if (_.isArray(vm.pointConverterData.collects)) {
                var keys = _.keys(vm.pointConverterData.collects[0]);

                // first item in data will be array of keys
                var data = [keys];

                // add values to output data
                _.forEach(vm.pointConverterData.collects, function (collect) {
                    var values = [];
                    _.forEach(keys, function (key) {
                        values.push(collect[key]);
                    });
                    data.push(values);
                });

                // output these to strings
                var csvContent = 'data:text/csv;charset=utf-8,';
                data.forEach(function (infoArray, index) {
                    var dataString = infoArray.join(',');
                    csvContent += index < data.length ? dataString+ '\n' : dataString;
                });

                // save data
                var blobData = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
                FileSaver.saveAs(blobData, 'sigma_point_converter_data.csv');
            }
        };

        var updatePlot = function () {
            if (_.isArray(vm.pointConverterData.collects)) {
                // use $promise property to ensure the template has been loaded
                scatterModal.$promise.then(function () {
                    // show modal first so c3 has something to bind to
                    scatterModal.show();

                    var temporalFilter = stateService.getTemporalFilter(),
                        plotJson = [],
                        pointConverterData = _.sortBy(vm.pointConverterData.collects, 'time'),
                        plotBands = _.uniq(_.map(pointConverterData, 'band')),
                        plotNames = {};

                    plotBands = _.map(plotBands, function (band) {
                        return band.toLowerCase();
                    });

                    // define friendly names for chart legend
                    _.forEach(sigmaConfig.bands, function (band) {
                        plotNames[band.name] = band.title;
                    });

                    // create json array for C3 chart
                    _.forEach(pointConverterData, function (data) {
                        var dataObj = {
                            time: data.time
                        };
                        var band = data.band.toLowerCase();
                        dataObj[band] = data.intensity;
                        plotJson.push(dataObj);
                    });

                    // add empty days onto end of chart if necessary
                    var diff = moment.utc(temporalFilter.stop).diff(moment.utc(pointConverterData[pointConverterData.length - 1].time), 'd'),
                        plotStop = moment.utc(pointConverterData[pointConverterData.length - 1].time).toISOString();

                    for (var i = 1; i <= diff; i++) {
                        plotJson.push({
                            time: moment.utc(plotStop).add(i, 'd')
                        });
                    }

                    c3.generate({
                        bindto: document.getElementById('scatterChart'),
                        data: {
                            json: plotJson,
                            keys: {
                                x: 'time',
                                value: plotBands
                            },
                            xFormat: '%Y-%m-%dT%H:%M:%SZ', // 2014-08-01T16:16:07Z
                            type: 'scatter',
                            names: plotNames
                        },
                        size: {
                            height: chartHeight
                        },
                        axis: {
                            x: {
                                type: 'timeseries',
                                label: 'Time',
                                tick: {
                                    format: '%Y-%m-%d',
                                    culling: false,
                                    count: Math.floor(moment.utc(pointConverterData[pointConverterData.length - 1].time).diff(moment.utc(pointConverterData[1].time), 'w') / 2) // one tick every 2 weeks
                                }
                            },
                            y: {
                                label: 'Intensity'
                            }
                        },
                        grid: {
                            x: {
                                show: true
                            },
                            y: {
                                show: true
                            }
                        },
                        point: {
                            r: 6
                        },
                        zoom: {
                            enabled: true,
                            rescale: true
                        },
                        tooltip: {
                            format: {
                                title: function (x) { return moment.utc(x).format('YYYY-MM-DD HH:mm:ss[Z]'); }
                            }
                        }
                    });
                });
            }
        };

        var initialize = function () {
            var viewportSize = sigmaService.getViewportSize();
            chartHeight = viewportSize.height - 250; // subtract 250 to account for margin and modal header
        };

        initialize();

        $scope.$watchCollection('vm.stateService.getPointConverterData()', function (newValue, oldValue) {
            if (newValue && _.keys(newValue).length > 0) {
                if (_.isEqual(newValue, oldValue)) {
                    return;
                }
                vm.pointConverterData = newValue;
                updatePlot();
            }
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaPointConverter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/pointConverter/pointConverterTemplate.html',
            controller: 'pointConverterController',
            controllerAs: 'vm',
            scope: {
                xProperty: '@',
                yProperty: '@'
            }
        };
    });
})();
(function () {
    'use strict';

    angular.module('sigma').factory('radialBarChart', ['d3', function (d3) {
        return function radialBarChart() {
            // Configurable variables
            var margin = {top: 20, right: 20, bottom: 20, left: 20};
            var barHeight = 100;
            var reverseLayerOrder = false;
            var barColors;
            var capitalizeLabels = false;
            var domain = [0, 100];
            var tickValues;
            var colorLabels = false;
            var tickCircleValues = [];
            var transitionDuration = 1000;

            // Scales & other useful things
            var numBars = null;
            var barScale = null;
            var keys = [];
            var labelRadius = 0;
            var axis = d3.svg.axis();


            function init(d) {
                barScale = d3.scale.linear().domain(domain).range([0, barHeight]);

                if (Array.isArray(d[0].data)) {
                    for (var i = 0; i < d[0].data.length; ++i) {
                        keys.push(d[0].data[i][0]);
                    }
                } else {
                    keys = d3.map(d[0].data).keys();
                }
                numBars = keys.length;

                // Radius of the key labels
                labelRadius = barHeight * 1.025;
            }

            function svgRotate(a) {
                return 'rotate('+ (+a) +')';
            }

            function svgTranslate(x, y) {
                return 'translate('+ (+x) +','+ (+y) +')';
            }

            function initChart(container) {
                var g = d3.select(container)
                    .append('svg')
                    .style('width', 2 * barHeight + margin.left + margin.right + 'px')
                    .style('height', 2 * barHeight + margin.top + margin.bottom + 'px')
                    .append('g')
                    .classed('radial-barchart', true)
                    .attr('transform', svgTranslate(margin.left + barHeight, margin.top + barHeight));

                // Concentric circles at specified tick values
                g.append('g')
                    .classed('tick-circles', true)
                    .selectAll('circle')
                    .data(tickCircleValues)
                    .enter()
                    .append('circle')
                    .attr('r', function(d) {return barScale(d);})
                    .style('fill', 'none');
            }

            function renderOverlays(container) {
                var g = d3.select(container).select('svg g.radial-barchart');

                // Spokes
                g.append('g')
                    .classed('spokes', true)
                    .selectAll('line')
                    .data(keys)
                    .enter()
                    .append('line')
                    .attr('y2', -barHeight)
                    .attr('transform', function(d, i) {return svgRotate(i * 360 / numBars);});

                // Axis
                var axisScale = d3.scale.linear().domain(domain).range([0, -barHeight]);
                axis.scale(axisScale).orient('right');
                if(tickValues){
                    axis.tickValues(tickValues);
                }
                g.append('g')
                    .classed('axis', true)
                    .call(axis);

                // Outer circle
                g.append('circle')
                    .attr('r', barHeight)
                    .classed('outer', true)
                    .style('fill', 'none');

                // Labels
                var labels = g.append('g')
                    .classed('labels', true);

                labels.append('def')
                    .append('path')
                    .attr('id', 'label-path')
                    .attr('d', 'm0 ' + -labelRadius + ' a' + labelRadius + ' ' + labelRadius + ' 0 1,1 -0.01 0');

                labels.selectAll('text')
                    .data(keys)
                    .enter()
                    .append('text')
                    .style('text-anchor', 'middle')
                    .style('fill', function(d, i) {return colorLabels ? barColors[i % barColors.length] : null;})
                    .append('textPath')
                    .attr('xlink:href', '#label-path')
                    .attr('startOffset', function(d, i) {return i * 100 / numBars + 50 / numBars + '%';})
                    .text(function(d) {return capitalizeLabels ? d.toUpperCase() : d;});
            }

            /* Arc functions */
            var or = function(d) {
                return barScale(d);
            };
            var sa = function(d, i) {
                return (i * 2 * Math.PI) / numBars;
            };
            var ea = function(d, i) {
                return ((i + 1) * 2 * Math.PI) / numBars;
            };

            function chart(selection) {
                selection.each(function(d) {
                    init(d);

                    if(reverseLayerOrder){
                        d.reverse();
                    }

                    var g = d3.select(this).select('svg g.radial-barchart');

                    // check whether chart has already been created
                    var update = g[0][0] !== null; // true if data is being updated

                    if(!update){
                        initChart(this);
                    }

                    g = d3.select(this).select('svg g.radial-barchart');

                    // Layer enter/exit/update
                    var layers = g.selectAll('g.layer')
                        .data(d);

                    layers
                        .enter()
                        .append('g')
                        .attr('class', function(d, i) {
                            return 'layer-' + i;
                        })
                        .classed('layer', true);

                    layers.exit().remove();

                    // Segment enter/exit/update
                    var segments = layers
                        .selectAll('path')
                        .data(function(d) {
                            var m = d3.map(d.data),
                                mValues = m.values(),
                                mArr = [];
                            if (Array.isArray(mValues)) {
                                for (var i = 0; i < mValues.length; ++i) {
                                    mArr.push(mValues[i][1]);
                                }
                            } else {
                                mArr = mValues;
                            }
                            return mArr;
                        });

                    segments
                        .enter()
                        .append('path')
                        .style('fill', function(d, i) {
                            if(!barColors){ return; }
                            return barColors[i % barColors.length];
                        });

                    segments.exit().remove();

                    segments
                        .transition()
                        .duration(transitionDuration)
                        .attr('d', d3.svg.arc().innerRadius(0).outerRadius(or).startAngle(sa).endAngle(ea));

                    if(!update) {
                        renderOverlays(this);
                    } else {
                        var axisScale = d3.scale.linear().domain(domain).range([0, -barHeight]);
                        axis.scale(axisScale)
                            .orient('right');
                        if (tickValues){
                            axis.tickValues(tickValues);
                        }

                        d3.select('.radial .axis')
                            .transition()
                            .duration(2000)
                            .call(axis);
                    }
                });

            }

            /* Configuration getters/setters */
            chart.margin = function(_) {
                if (!arguments.length){ return margin; }
                margin = _;
                return chart;
            };

            chart.barHeight = function(_) {
                if (!arguments.length){ return barHeight; }
                barHeight = _;
                return chart;
            };

            chart.reverseLayerOrder = function(_) {
                if (!arguments.length){ return reverseLayerOrder; }
                reverseLayerOrder = _;
                return chart;
            };

            chart.barColors = function(_) {
                if (!arguments.length){ return barColors; }
                barColors = _;
                return chart;
            };

            chart.capitalizeLabels = function(_) {
                if (!arguments.length){ return capitalizeLabels; }
                capitalizeLabels = _;
                return chart;
            };

            chart.domain = function(_) {
                if (!arguments.length){ return domain; }
                domain = _;
                return chart;
            };

            chart.tickValues = function(_) {
                if (!arguments.length){ return tickValues; }
                tickValues = _;
                return chart;
            };

            chart.colorLabels = function(_) {
                if (!arguments.length){ return colorLabels; }
                colorLabels = _;
                return chart;
            };

            chart.tickCircleValues = function(_) {
                if (!arguments.length){ return tickCircleValues; }
                tickCircleValues = _;
                return chart;
            };

            chart.transitionDuration = function(_) {
                if (!arguments.length){ return transitionDuration; }
                transitionDuration = _;
                return chart;
            };

            return chart;
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('radialController', ['$scope', 'sigmaConfig', 'stateService', 'sigmaService', 'searchService', 'blockUI', 'radialBarChart', 'd3', '_', 'moment', function (
        $scope,
        sigmaConfig,
        stateService,
        sigmaService,
        searchService,
        blockUI,
        radialBarChart,
        d3,
        _,
        moment
    ) {
        var vm = this,
            collectData = [],
            chart = {};

        vm.blocker = blockUI.instances.get('blocker');
        vm.stateService = stateService;
        vm.radialReady = false;
        vm.zoomClass = '';
        vm.enableCoverage = stateService.getEnableCoverage();

        vm.toggleZoomClass = function(){
            vm.zoomClass = vm.zoomClass === 'scale' ? '' : 'scale';
        };

        var drawChart = function () {
            // format data to work with radialBarChart
            var chartDataValues = [],
                chartData = [{
                    data: []
                }];

            var findCollect = function (hour) {
                return _.find(collectData, function (c) {
                    return moment.utc(c.hour).hour() === hour;
                });
            };

            for (var hour = 0; hour < 24; hour++) {
                var collect = findCollect(hour);
                chartDataValues.push(collect ? collect.count : 0);
                chartData[0].data.push([moment.utc(hour, 'h').format('HH:mm'), collect ? collect.count : 0]);
            }

            // array of values for determining domain and average number of collects
            //var chartTicks = Math.floor(d3.mean(chartDataValues) / 3);
            var chartTicks = Math.floor(d3.max(chartDataValues) / 3);

            // instantiate radialBarChart
            chart = radialBarChart();
            chart.barHeight(175)
                .reverseLayerOrder(true)
                .capitalizeLabels(true)
                .barColors(['#C6A800', '#FFD800', '#FFE864']) // these repeat if array length is shorter than the number of bars
                .domain([0,d3.max(chartDataValues)])
                .tickValues([chartTicks, chartTicks * 2, chartTicks * 3])
                .tickCircleValues(chartDataValues);
            d3.select('.radial')
                .datum(chartData)
                .call(chart);
        };

        var getCollectCountsByHour = _.debounce(function () {
            searchService.getCollectCountsByHour().then(function (result) {
                collectData = result.data.results;
                drawChart();
                vm.radialReady = true;
            }, function(error){
                sigmaService.showError(error, 'danger');
            });
        }, sigmaConfig.debounceTime);

        vm.initRadial = function () {
            $scope.$watchCollection('vm.stateService.getMapBounds()', _.debounce(function (newValue) {
                if (_.keys(newValue).length > 0) {
                    if (vm.enableCoverage) {
                        getCollectCountsByHour();

                    }
                }
            }, 750));
        };

        $scope.$watch('vm.stateService.getEnableCoverage()', function (newValue, oldValue) {
            newValue = typeof newValue === 'string' ? newValue === 'true' : newValue;
            oldValue = typeof oldValue === 'string' ? oldValue === 'true' : oldValue;
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.enableCoverage = newValue;
            vm.initRadial();
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaRadial', ['$', function ($) {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/radial/radialTemplate.html',
            controller: 'radialController',
            controllerAs: 'vm',
            scope: {},
            link: function (scope) {
                angular.element(document).ready(function () {
                    if (scope.vm.enableCoverage) {
                        scope.vm.initRadial();
                    }
                    var $radialContainer = $('.chart-radial');
                    $radialContainer.click(function () {
                        $radialContainer.toggleClass('scale');
                    });
                });
            }
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('recentAoiListController', ['$scope', '$location', 'sigmaConfig', 'stateService', 'localStorage', '_', 'moment', function (
        $scope,
        $location,
        sigmaConfig,
        stateService,
        localStorage,
        _,
        moment
    ) {
        var vm = this;

        vm.expanded = $scope.expanded;
        vm.stateService = stateService;
        vm.recentAOIs = JSON.parse(localStorage.getItem('recentAOIs')) || [];

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };

        vm.clearRecentAOIs = function (event) {
            localStorage.removeItem('recentAOIs');
            vm.recentAOIs = [];
            event.stopPropagation();
        };

        vm.activateAOI = function (aoi) {
            $location.search(aoi.search);
            var aoiBaselayer = _.find(sigmaConfig.layers.baselayers, { id: aoi.search.baselayer });

            // update parameters
            stateService.setBbox(aoi.bbox);
            stateService.setTemporalFilter(aoi.temporalFilter);
            stateService.setBaselayer(aoiBaselayer);
            stateService.setCoverageOpacity(parseFloat(aoi.search.coverageOpacity));
            stateService.setEnableCoverage(aoi.search.enableCoverage === 'true');
            stateService.setBand(aoi.search.band);
            stateService.setSensor(aoi.search.sensor);


            // determine which aoi is active
            _.forEach(vm.recentAOIs, function (recentAOI) {
                recentAOI.active = aoi.url === recentAOI.url;
            });
        };

        $scope.$watch('vm.stateService.getViewMode()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if (newValue === 'analyze') {
                _.forEach(vm.recentAOIs, function (aoi) {
                    aoi.active = false;
                });

                var bbox = stateService.getBbox(),
                    temporalFilter = stateService.getTemporalFilter(),
                    checkForAOI = _.find(vm.recentAOIs, { search: $location.search() });

                var aoiTemporalFilter = {
                    start: moment.utc(temporalFilter.start).toDate(),
                    stop: moment.utc(temporalFilter.stop).toDate(),
                    duration: temporalFilter.duration ? temporalFilter.duration : null,
                    durationLength: temporalFilter.durationLength ? temporalFilter.durationLength : null
                };

                if (!checkForAOI) {
                    // only add unique AOIs
                    var search = $location.search(),
                        qs = _.toPairs(search),
                        qsArr = [];

                    _.forEach(qs, function (value) {
                        qsArr.push(value.join('='));
                    });

                    vm.recentAOIs.unshift({
                        bbox: bbox,
                        temporalFilter: aoiTemporalFilter,
                        url: qsArr.join('&'),
                        search: search,
                        active: true
                    });

                    if (vm.recentAOIs.length > sigmaConfig.maximumRecentAOIs) {
                        vm.recentAOIs.splice((vm.recentAOIs.length - 1), 1);
                    }

                    localStorage.setItem('recentAOIs', JSON.stringify(vm.recentAOIs));
                    stateService.saveState('svendsenem').then(function (result) {
                        console.log(result);
                    });
                }
            }
        });

        var initialize = function () {
            _.forEach(vm.recentAOIs, function (aoi) {
                aoi.active = false;
            });

            var search = $location.search();
            search.coverageOpacity = parseFloat(search.coverageOpacity); // parse float to enable object equality

            var currentAOI = _.filter(vm.recentAOIs, function (aoi) {
                return angular.equals(aoi.search, search);
            });

            if (currentAOI && currentAOI.length > 0) {
                currentAOI[0].active = true;
            }
        };

        initialize();

        var doWatch = function (newValue, oldValue, isCollection) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if (isCollection) {
                if (_.keys(newValue).length > 0) {
                    initialize();
                }
            } else {
                initialize();
            }
        };

        $scope.$watchCollection('vm.stateService.getBbox()', function (newValue, oldValue) {
            doWatch(newValue, oldValue, true);
        });

        $scope.$watchCollection('vm.stateService.getTemporalFilter()', function (newValue, oldValue) {
            doWatch(newValue, oldValue, true);
        });

        $scope.$watchCollection('vm.stateService.getBaselayer()', function (newValue, oldValue) {
            doWatch(newValue, oldValue, true);
        });

        $scope.$watch('vm.stateService.getCoverageOpacity()', function (newValue, oldValue) {
            doWatch(newValue, oldValue, false);
        });

        $scope.$watch('vm.stateService.getEnableCoverage()', function (newValue, oldValue) {
            doWatch(newValue, oldValue, false);
        });

        $scope.$watch('vm.stateService.getBand()', function (newValue, oldValue) {
            doWatch(newValue, oldValue, false);
        });
        $scope.$watch('vm.stateService.getSensor()', function (newValue, oldValue) {
            doWatch(newValue, oldValue, false);
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaRecentAoiList', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/recentAoiList/recentAoiListTemplate.html',
            controller: 'recentAoiListController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();
(function () {
    'use strict';

    angular.module('sigma').controller('recentPointsListController', ['$scope', 'sigmaConfig', 'stateService', 'localStorage', '_', 'MouseEvent', function (
        $scope,
        sigmaConfig,
        stateService,
        localStorage,
        _,
        MouseEvent
    ) {
        var vm = this;
        
        vm.expanded = $scope.expanded;
        vm.stateService = stateService;
        vm.recentPoints = JSON.parse(localStorage.getItem('recentPoints')) || [];

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };

        vm.clearRecentPoints = function (event) {
            localStorage.removeItem('recentPoints');
            vm.recentPoints = [];
            event.stopPropagation();
        };

        vm.showPoint = function (point) {
            // add source event to ensure the result is unique in order to be picked up by the $watch statement
            point.data.sourceEvent = new MouseEvent('click', {
                'view': window,
                'bubbles': true,
                'cancelable': false
            });
            stateService.setPointConverterData(point.data);
        };

        $scope.$watchCollection('vm.stateService.getPointConverterData()', function (newValue) {
            if (_.keys(newValue).length > 0) {
                var recentPointConverterData = _.omit(newValue, 'sourceEvent'),
                    brushExtents = stateService.getBrushExtents(),
                    checkForPoint = _.find(vm.recentPoints, 'data.point', newValue.point);

                if (!checkForPoint) {
                    // only add unique points
                    vm.recentPoints.unshift({
                        data: recentPointConverterData,
                        brushExtents: brushExtents
                    });

                    if (vm.recentPoints.length > sigmaConfig.maximumRecentPoints) {
                        vm.recentPoints.splice((vm.recentPoints.length - 1), 1);
                    }

                    localStorage.setItem('recentPoints', JSON.stringify(vm.recentPoints));
                }
            }
        });
    }]);
})();
(function () {
    'use strict';

    angular.module('sigma').directive('sigmaRecentPointsList', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/recentPointsList/recentPointsListTemplate.html',
            controller: 'recentPointsListController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();
(function () {
    'use strict';

    angular.module('sigma').controller('sensorController', ['$scope', '$location', 'sigmaConfig', 'stateService', '_', function (
        $scope,
        $location,
        sigmaConfig,
        stateService,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.stateService = stateService;
        vm.sigmaConfig = sigmaConfig;
        vm.expanded = $scope.expanded;
        vm.mode = $scope.$parent.mode;
        vm.sensors = [];
        vm.selectedSensor = {};

        vm.setSensor = function () {
            stateService.setSensor(vm.selectedSensor.id);
        };

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };

        var initialize = function (band) {
            vm.sensors = _.filter(sigmaConfig.sensors, function (sensor) {
                return _.indexOf(sensor.bands, band) >= 0;
            });
            vm.selectedSensor = qs.sensor ? _.find(vm.sensors, { id: parseInt(qs.sensor) }) : _.find(vm.sensors, { default: true });
            stateService.setSensor(vm.selectedSensor.id);
        };

        $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            qs = newValue;
        });

        $scope.$watchCollection('vm.stateService.getBand()', function (newValue) {
            initialize(newValue);
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaSensor', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/sensor/sensorTemplate.html',
            controller: 'sensorController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();

(function () {
    'use strict';

    angular.module('sigma').controller('sidebarController', ['$scope', '$location', 'sigmaConfig', 'sigmaService', 'stateService', 'localStorage', '_', function (
        $scope,
        $location,
        sigmaConfig,
        sigmaService,
        stateService,
        localStorage,
        _
    ) {
        var vm = this;
        
        vm.mode = $scope.mode;
        vm.logo = sigmaConfig.logo;
        vm.sidebarStyle = '';
        vm.stateService = stateService;
        vm.disableAnalyzeBtn = true;

        var adjustSize = function (height) {
            vm.sidebarStyle = 'height: ' + height + 'px; overflow-y: auto';
        };

        angular.element(document).ready(function () {
            // set sidebar height equal to available page height
            var viewport = sigmaService.getViewportSize();
            adjustSize(viewport.height);
        });

        vm.analyze = function () {
            // navigate to analyze screen
            stateService.setViewMode('analyze');
        };

        vm.viewMap = function () {
            stateService.setViewMode('search');
            stateService.setCorrelationData(null);
        };

        $scope.$watchCollection('vm.stateService.getViewportSize()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            adjustSize(newValue.height);
        });

        $scope.$watchCollection('vm.stateService.getBbox()', function (newValue) {
            if (_.keys(newValue).length === 0) {
                return;
            }
            if (newValue.format !== 'mgrs') {
                vm.disableAnalyzeBtn = !(newValue.north !== '' && newValue.south !== '' && newValue.east !== '' && newValue.west !== '');
            } else {
                vm.disableAnalyzeBtn = !(newValue.mgrsNE !== '' && newValue.mgrsSW !== '');
            }
        });

        $scope.$watch('vm.stateService.getViewMode()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            // set vm for this controller and $scope for child controllers
            vm.mode = newValue;
            $scope.mode = newValue;
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaSidebar', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/sidebar/sidebarTemplate.html',
            controller: 'sidebarController',
            controllerAs: 'vm',
            scope: {
                mode: '='
            }
        };
    });
})();

(function () {
    'use strict';

    angular.module('sigma').controller('stateController', ['$scope', '$window', '$location', '$alert', 'sigmaConfig', 'stateService', '_', function (
        $scope,
        $window,
        $location,
        $alert,
        sigmaConfig,
        stateService,
        _
    ) {
        var vm = this;

        vm.sigmaConfig = sigmaConfig;
        vm.expanded = $scope.expanded;
        vm.selectedState = null;
        vm.states = [];
        vm.disableSaveState = false;

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };

        vm.createState = function () {
            stateService.createState().then(function (result) {
                vm.states.push(result.data);
                vm.selectedState = result.data;
                vm.popover = {
                    title: 'Share',
                    content: window.location.protocol + '//' + window.location.host + '/#/?id=' + vm.selectedState.id
                };
                $alert({
                    title: 'State Saved',
                    type: 'success',
                    placement: 'top-right',
                    container: 'body',
                    animation: 'am-fade-and-slide-top',
                    duration: 5,
                    show: true
                });
            }, function (err) {
                console.log(err);
                $alert({
                    title: err.status > -1 ? 'Error: ' + err.status : 'Connection Error',
                    content: err.statusText.length > 0 ? err.statusText : 'Unable to retrieve application states.',
                    type: 'danger',
                    placement: 'top-right',
                    container: 'body',
                    animation: 'am-fade-and-slide-top',
                    duration: 5,
                    show: true
                });
            });
        };

        vm.getState = function (value, forceRefresh) {
            if (value) {
                if (!angular.equals(value, vm.selectedState) || forceRefresh) {
                    vm.selectedState = value;
                    $location.url('/?id=' + vm.selectedState.id);
                    // TODO find a way to do this without reloading the whole app
                    $window.location.reload();
                }
            }
        };

        vm.resetState = function () {
            vm.getState(vm.selectedState, true);
        };

        vm.saveState = function () {
            stateService.saveState(vm.selectedState.id).then(function () {
                $alert({
                    title: 'Changes Saved',
                    type: 'success',
                    placement: 'top-right',
                    container: 'body',
                    animation: 'am-fade-and-slide-top',
                    duration: 5,
                    show: true
                });
            }, function (err) {
                console.log(err);
                $alert({
                    title: err.status > -1 ? 'Error: ' + err.status : 'Connection Error',
                    content: err.statusText.length > 0 ? err.statusText : 'Unable to update application state.',
                    type: 'danger',
                    placement: 'top-right',
                    container: 'body',
                    animation: 'am-fade-and-slide-top',
                    duration: 5,
                    show: true
                });
            });
        };

        vm.updateStateTitle = function () {
            stateService.updateStateTitle(vm.selectedState.id, vm.selectedState.title).then(function () {
                $alert({
                    title: 'Title Updated',
                    type: 'success',
                    placement: 'top-right',
                    container: 'body',
                    animation: 'am-fade-and-slide-top',
                    duration: 5,
                    show: true
                });
            }, function (err) {
                console.log(err);
                $alert({
                    title: err.status > -1 ? 'Error: ' + err.status : 'Connection Error',
                    content: err.statusText.length > 0 ? err.statusText : 'Unable to update application state.',
                    type: 'danger',
                    placement: 'top-right',
                    container: 'body',
                    animation: 'am-fade-and-slide-top',
                    duration: 5,
                    show: true
                });
            });
        };

        vm.deleteState = function () {
            stateService.deleteState(vm.selectedState.id).then(function () {
                _.remove(vm.states, vm.selectedState);
                vm.selectedState = null;
                $alert({
                    title: 'Favorite Deleted',
                    type: 'success',
                    placement: 'top-right',
                    container: 'body',
                    animation: 'am-fade-and-slide-top',
                    duration: 5,
                    show: true
                });
            }, function (err) {
                console.log(err);
                $alert({
                    title: err.status > -1 ? 'Error: ' + err.status : 'Connection Error',
                    content: err.statusText.length > 0 ? err.statusText : 'Unable to update application state.',
                    type: 'danger',
                    placement: 'top-right',
                    container: 'body',
                    animation: 'am-fade-and-slide-top',
                    duration: 5,
                    show: true
                });
            });
        };

        var initialize = function () {
            stateService.getStates().then(function (data) {
                vm.states = _.sortBy(data, 'title');
                if (stateService.getActiveState()) {
                    vm.selectedState = _.find(vm.states, { id: stateService.getActiveState().id });
                    vm.popover = {
                        title: 'Share',
                        content: window.location.protocol + '//' + window.location.host + '/#/?id=' + vm.selectedState.id
                    };
                }
            }, function (err) {
                console.log(err);
                vm.disableSaveState = true;
            });
        };

        initialize();
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaState', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/state/stateTemplate.html',
            controller: 'stateController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();

(function () {
    'use strict';

    angular.module('sigma').controller('temporalFilterController', ['$scope', '$location', 'stateService', 'moment', 'sigmaConfig', '_', function (
        $scope,
        $location,
        stateService,
        moment,
        sigmaConfig,
        _
    ) {
        var vm = this,
            qs = $location.search();

        vm.expanded = $scope.expanded;
        vm.mode = $scope.$parent.mode;
        vm.expandedRange = qs.duration ? false : true;
        vm.expandedDuration = qs.duration ? true : false;
        vm.stateService = stateService;
        vm.moment = moment;
        vm.start = '';
        vm.stop = '';
        vm.durationLength = qs.durationLength ? parseInt(qs.durationLength) : sigmaConfig.defaultDurationLength;
        vm.durations = sigmaConfig.durations;
        vm.selectedDuration = qs.duration ? _.find(sigmaConfig.durations, { value: qs.duration }) : _.find(sigmaConfig.durations, { default: true });
        vm.ranges = sigmaConfig.ranges;
        vm.temporalZoom = '';

        vm.setTemporalFilter = function () {
            if (vm.expandedDuration) {
                vm.start = moment.utc(moment.utc().endOf('d')).subtract(vm.durationLength, vm.selectedDuration.value).startOf('d').toDate();
                vm.stop = moment.utc().endOf('d').toDate();
            }
            
            stateService.setTemporalFilter({
                start: vm.start,
                stop: vm.stop,
                duration: vm.expandedDuration ? vm.selectedDuration.value : null,
                durationLength: vm.expandedDuration ? parseInt(vm.durationLength) : null
            });
        };

        var initialize = function () {
            qs = $location.search();

            if (vm.expandedRange) {
                vm.start = qs.start ? moment.utc(qs.start).toDate() : moment.utc().subtract(sigmaConfig.defaultDaysBack, 'days').startOf('d').toDate();
                vm.stop = qs.stop ? moment.utc(qs.stop).toDate() : moment.utc().endOf('d').toDate();
            } else if (vm.expandedDuration) {
                vm.selectedDuration = qs.duration ? _.find(vm.durations, { value: qs.duration }) : _.find(vm.durations, { default: true });
                vm.durationLength = qs.durationLength ? parseInt(qs.durationLength) : sigmaConfig.defaultDurationLength;
                vm.start = moment.utc(moment.utc().endOf('d')).subtract(vm.durationLength, vm.selectedDuration.value).startOf('d').toDate();
                vm.stop = moment.utc().endOf('d').toDate();
            }

            vm.setTemporalFilter();
        };

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };

        vm.toggleExpandedFilter = function () {
            vm.expandedRange = !vm.expandedRange;
            vm.expandedDuration = !vm.expandedDuration;

            vm.setTemporalFilter();
        };

        vm.setRange = function (units, unitOfTime) {
            vm.start = moment.utc().add(units, unitOfTime).startOf('day').toDate();
            vm.stop = moment.utc().endOf('d').toDate();
            vm.setTemporalFilter();
        };

        initialize();

        $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            qs = newValue;
        });

        $scope.$watchCollection('vm.stateService.getTemporalFilter()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.start = moment.utc(newValue.start).toDate();
            vm.stop = moment.utc(newValue.stop).toDate();

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

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaTemporalFilter', function () {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/temporalFilter/temporalFilterTemplate.html',
            controller: 'temporalFilterController',
            controllerAs: 'vm',
            scope: {
                expanded: '='
            }
        };
    });
})();

(function () {
    'use strict';

    angular.module('sigma').controller('timeSliderController', ['$scope', '$q', '$timeout', '$location', 'sigmaConfig', 'stateService', 'blockUI', 'd3', '_', '$', 'moment', function (
        $scope,
        $q,
        $timeout,
        $location,
        sigmaConfig,
        stateService,
        blockUI,
        d3,
        _,
        $,
        moment
    ) {
        var vm = this,
            qs = $location.search();

        vm.mode = qs.mode || $scope.mode;

        var margin = {top: 25, right: 55, bottom: 25, left: 25},
            aspect = 0,
            absWidth = 0,
            absHeight = 85,
            width = 0,
            height = absHeight - margin.top - margin.bottom,
            x = 0,
            y = 0,
            xAxis = {},
            area = function () {},
            svg = {},
            focus = {},
            brush = d3.svg.brush(),
            context = {},
            areaPath = {},
            zoom = d3.behavior.zoom(),
            xData = [],
            yData = [],
            timeSliderFrequency = [],
            timeSliderExtentStart = qs.start || sigmaConfig.defaultSliderStart.toISOString(),
            timeSliderExtentStop = qs.stop || sigmaConfig.defaultSliderStop.toISOString(),
            playbackState = 'stop',
            playbackSpeed = sigmaConfig.maxPlaybackDelay,
            playbackIntervalQty = sigmaConfig.defaultPlaybackIntervalQty,
            playbackInterval = _.find(sigmaConfig.playbackIntervals, { default: true }),
            temporalFilter = {};

        vm.stateService = stateService;
        vm.sliderReady = false;
        vm.brushState = 'select';
        vm.toggleBrushText = 'Select';
        vm.toggleBrushClass = 'fa fa-crosshairs';

        var drawSlider = function (filter, duration) {
            duration = duration || sigmaConfig.maxPlaybackDelay - playbackSpeed;
            //duration = 10;
            brush.extent([moment.utc(filter.start).toDate(), moment.utc(filter.stop).toDate()]);

            // draw the brush to match our extent
            // don't transition during playback
            if (playbackState !== 'play' && playbackState !== 'pause' && playbackState !== 'step') {
                brush(d3.select('.brush').transition().duration(duration));
            } else {
                brush(d3.select('.brush'));
            }

            // update the brush date labels
            if (brush.extent()) {
                d3.select('.resize.w text').html(moment.utc(brush.extent()[0]).format('MM/DD/YYYY HH:mm:ss') + ' &#9660;');
                d3.select('.resize.e text').html('&#9660; ' + moment.utc(brush.extent()[1]).format('MM/DD/YYYY HH:mm:ss'));
            }

            // fire the brushstart, brushmove, and brushend events
            brush.event(d3.select('.brush').transition().duration(duration));
        };

        var updateInterval = function () {
            // redraw slider brush
            var filter = {
                start: moment.utc(timeSliderExtentStart).toISOString(),
                stop: moment.utc(timeSliderExtentStart).add(playbackIntervalQty, playbackInterval.value).toISOString()
            };
            drawSlider(filter);
        };

        var brushing = function () {
            // slider brush is being moved, so update the date label values
            $('.resize.w text').html(moment.utc(brush.extent()[0]).format('MM/DD/YYYY HH:mm:ss') + ' &#9660;');
            $('.resize.e text').html('&#9660; ' + moment.utc(brush.extent()[1]).format('MM/DD/YYYY HH:mm:ss'));
        };

        var brushed = function () {
            if (playbackState === 'play' || playbackState === 'pause' || playbackState === 'step') {
                // remove time slider pointer events to prevent custom resizing of the playback window
                d3.select('.x.brush').style('pointer-events', 'none');

                // advance slider brush when playing
                if (playbackState === 'play') {
                    $timeout(function () {
                        // send brush extents to stateService so playbackController can iterate the current frame
                        stateService.setBrushExtents(brush.extent()[0], brush.extent()[1]);
                    });
                }
            } else {
                d3.select('.x.brush').style('pointer-events', 'all');

                if (vm.mode === 'playback') {
                    // d3.event.sourceEvent returns a mouse event if the brush is altered by the user directly
                    if (d3.event.sourceEvent) {
                        $timeout(function () {
                            stateService.setBrushExtents(brush.extent()[0], brush.extent()[1]);
                        });
                    }
                } else {
                    if (d3.event.sourceEvent) {
                        $timeout(function () {
                            // values were modified directly by slider, so just set time range
                            stateService.setTemporalFilter({
                                start: moment.utc(brush.extent()[0]).toDate(),
                                stop: moment.utc(brush.extent()[1]).toDate()
                            });
                        });
                    }
                }
            }
        };

        var redrawSliderChart = function () {
            // Update area with new data
            areaPath.transition()
                .duration(0)
                .attr('d', area(timeSliderFrequency));

            // Update the x axis
            context.select('.x.axis')
                .transition()
                .duration(0)
                .call(xAxis)
                .each('end', function () { $scope.$apply(); });
        };

        var mousemove = function () {
            if (vm.mode === 'search') {
                var bisectDate = d3.bisector(function (d) {
                        return moment.utc(d.time).toDate();
                    }).left,
                    x0 = x.invert(d3.mouse(this)[0]).toISOString(),
                    i = bisectDate(timeSliderFrequency, x0, 1),
                    d0 = timeSliderFrequency[i - 1],
                    d1 = timeSliderFrequency[i];

                if (d0 && d1) {
                    var d = d1 ? moment.utc(x0).subtract(d0.time).isAfter(moment.utc(d1.time).subtract(moment.utc(x0).toISOString())) ? d1 : d0 : d0;

                    focus.attr('transform', 'translate(' + (x(moment.utc(d.time).toDate()) + margin.left) + ',' + (y(d.count) + margin.top) + ')');
                    focus.select('text').text(moment.utc(moment.utc(d.time).toDate()).format('MM/DD/YYYY') + ': ' + d.count);
                }
            }
        };

        var drawSliderChart = function (isUpdate) {
            isUpdate = isUpdate || false;

            // create arrays of just dates and values in order to set the x and y domains
            xData = _.map(timeSliderFrequency, 'time');
            yData = _.map(timeSliderFrequency, 'count');

            // create slider chart
            x.domain([moment.utc(xData[0]).toDate(), moment.utc(xData[xData.length - 1]).endOf('d').toDate()]);
            y.domain([0, d3.max(yData)]);
            zoom.x(x);

            if (isUpdate) {
                redrawSliderChart();
            } else {
                // Initialize the area
                areaPath = context.append('path')
                    .datum(timeSliderFrequency)
                    .attr('class', 'area')
                    .attr('d', area)
                    .attr('clip-path', 'url(#clip)');

                focus = svg.append('g')
                    .attr('class', 'focus')
                    .style('display', 'none');

                focus.append('circle')
                    .attr('r', 4.5);

                focus.append('text')
                    .attr('x', 9)
                    .attr('dy', '.35em');

                svg.append('rect')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .attr('class', 'zoom')
                    .call(zoom);

                context.append('g')
                    .attr('class', 'x axis')
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(xAxis);

                context.append('g')
                    .attr('class', 'x brush')
                    .call(brush)
                    .selectAll('rect')
                    .attr('y', -6)
                    .attr('height', height + 7)
                    .attr('clip-path', 'url(#clip)');

                d3.select('.time-slider')
                    .on('mouseover', function () {
                        focus.style('display', null);
                    })
                    .on('mouseout', function () {
                        focus.style('display', 'none');
                    })
                    .on('mousemove', mousemove);

                context.select('.resize.w')
                    .append('text')
                    .attr('x', -122)
                    .attr('y', -8)
                    .attr('fill', '#ffd800')
                    .text('');

                context.select('.resize.e')
                    .append('text')
                    .attr('x', -6)
                    .attr('y', -8)
                    .attr('fill', '#ffd800')
                    .text('');
            }

            vm.sliderReady = true;

            // draw slider brush
            if (vm.mode === 'playback') {
                updateInterval();
            } else if (vm.mode === 'search') {
                drawSlider(temporalFilter);
            } else if (vm.mode === 'analyze') {
                updateInterval();
            }
        };

        vm.minimize = function () {
            $('.chart').animate({ 'bottom': '-=85px'}, 200);
            $('.leaflet-control-coordinates').animate({ 'bottom': '-=45px'}, 200);
            $('.time-slider-container').slideToggle(200, function () {
                $('.time-slider-maximize').slideToggle(200);
            });
        };

        vm.maximize = function () {
            $('.time-slider-maximize').slideToggle(200, function () {
                $('.chart').animate({ 'bottom': '+=85px'}, 200);
                $('.leaflet-control-coordinates').animate({ 'bottom': '+=45px'}, 200);
                $('.time-slider-container').slideToggle(200);
            });
        };

        vm.toggleBrush = function () {
            vm.brushState = vm.brushState === 'select' ? 'zoom' : 'select';
            d3.select('.x.brush').style('pointer-events', vm.brushState === 'select' ? 'all' : 'none');
            vm.toggleBrushText = vm.brushState === 'select' ? 'Select' : 'Zoom/Pan';
            vm.toggleBrushClass = vm.brushState === 'select' ? 'fa fa-crosshairs' : 'fa fa-search';
            $('.zoom').toggle();
        };

        vm.initTimeSlider = function () {
            absWidth = $('.time-slider-container').width();
            width =  absWidth - margin.left - margin.right;
            aspect = (absWidth / absHeight);

            // resize slider when viewport is changed
            $(window).on('resize', function () {
                var targetWidth = $('.time-slider-container').width();
                svg.attr('width', targetWidth);
                svg.attr('height', targetWidth / aspect);
            });

            x = d3.time.scale.utc().range([0, width]);
            y = d3.scale.linear().range([height, 0]);

            xAxis = d3.svg.axis().scale(x).orient('bottom');

            brush.x(x)
                .on('brush', brushing)
                .on('brushend', brushed);

            area = d3.svg.area()
                .x(function (d) {
                    return x(moment.utc(d.time).toDate());
                })
                .y0(height)
                .y1(function (d) {
                    return y(d.count);
                });

            svg = d3.select('.time-slider').append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
                .attr('preserveAspectRatio', 'xMinYMin');

            svg.append('clipPath')
                .attr('id', 'clip')
                .append('rect')
                .attr('x', x(0))
                .attr('y', y(1))
                .attr('width', x(1) - x(0))
                .attr('height', y(0) - y(1));

            context = svg.append('g')
                .attr('class', 'context')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            zoom.on('zoom', function () {
                redrawSliderChart();
            });
        };

        $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            qs = newValue;
        });

        $scope.$watchCollection('vm.stateService.getFrameExtents()', function (newValue) {
            // frame extents are updated when playbackController advances to the next frame
            if (_.keys(newValue).length > 0) {
                if (playbackState === 'play' || playbackState === 'pause' || playbackState === 'step') {
                    drawSlider({start: moment.utc(newValue.start).toISOString(), stop: moment.utc(newValue.stop).toISOString()});
                }
            }
        });

        $scope.$watchCollection('vm.stateService.getTimeSliderFrequency()', _.debounce(function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            $timeout(function () {
                timeSliderFrequency = newValue;
                drawSliderChart(vm.sliderReady);
            });
        }, sigmaConfig.debounceTime));

        $scope.$watch('vm.stateService.getViewMode()', function (newValue) {
            vm.mode = newValue;
            if (vm.mode === 'analyze' && vm.sliderReady) {
                timeSliderExtentStart = qs.start;
                timeSliderExtentStop = qs.stop;
            }
        });

        $scope.$watchCollection('vm.stateService.getTemporalFilter()', function (newValue) {
            if (_.keys(newValue).length > 0) {
                temporalFilter = newValue;

                if (vm.mode === 'search') {
                    if (!d3.event) { // temporalFilter was not modified by the brush
                        // buffer time slider extents around temporal filter
                        if (moment.utc().diff(moment.utc(temporalFilter.start), 'd') > 365) {
                            timeSliderExtentStart = moment.utc(temporalFilter.start).toISOString();
                        } else {
                            timeSliderExtentStart = moment.utc().subtract(1, 'y').toISOString();
                        }

                        if (moment.utc().diff(moment.utc(temporalFilter.stop), 'd') > 90) {
                            timeSliderExtentStop = moment.utc(temporalFilter.stop).add(3, 'M').toISOString();
                        } else {
                            timeSliderExtentStop = moment.utc().toISOString();
                        }

                        // set slider extents for use in other controllers
                        stateService.setTimeSliderExtents(timeSliderExtentStart, timeSliderExtentStop);

                        if (vm.sliderReady) {
                            drawSliderChart(true);
                        }
                        //drawSlider(temporalFilter);
                    }
                } else {
                    stateService.setTimeSliderExtents(temporalFilter.start, temporalFilter.stop);
                }
            }
        });

        $scope.$watch('vm.stateService.getPlaybackState()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            playbackState = newValue;
            if (playbackState === 'play' || playbackState === 'pause' || playbackState === 'step') {
                var frameExtents = stateService.getFrameExtents();
                drawSlider(frameExtents);
            }

        });

        $scope.$watch('vm.stateService.getPlaybackSpeed()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            playbackSpeed = newValue;
        });

        $scope.$watch('vm.stateService.getPlaybackIntervalQty()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            playbackIntervalQty = newValue;
            updateInterval();
        });

        $scope.$watchCollection('vm.stateService.getPlaybackInterval()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            playbackInterval = newValue;
            updateInterval();
        });

        $scope.$watch('vm.stateService.getBrushReset()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            updateInterval();
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaTimeSlider', ['$timeout', function ($timeout) {
        return {
            restrict: 'E',
            templateUrl: 'modules/components/timeSlider/timeSliderTemplate.html',
            controller: 'timeSliderController',
            controllerAs: 'vm',
            scope: {
                start: '=',
                stop: '=',
                mode: '='
            },
            link: function (scope) {
                // wait for digest cycles to complete to ensure DOM is fully ready
                // angular.element(document).ready() does not ensure everything is loaded
                $timeout(function() {
                    scope.vm.initTimeSlider();
                });
            }
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').factory('videoService', ['$timeout', '$q', 'stateService', 'sigmaConfig', 'blockUI', 'Whammy', 'GIF', 'leafletImage', 'FileSaver', function (
        $timeout,
        $q,
        stateService,
        sigmaConfig,
        blockUI,
        Whammy,
        GIF,
        leafletImage,
        FileSaver
    ) {
        var self,
            canvasImageOverlay = stateService.getCanvasImageOverlay();

        self = {
            // temp control flag used outside of this service
            isRecording: false,
            // if the base layer is being created
            isInitializing: false,
            // if the initializer should save the base layer
            includeBaseLayer: true,
            // the encoder to use
            encoder: sigmaConfig.defaultEncoder,   // 'webm' or 'gif'
            // list of encoders
            _encoders: {
                webm: new Whammy.Video(),
                gif: new GIF({
                    workerScript: 'scripts/gif.worker.js',
                    workers: sigmaConfig.encoders.gif.workers,
                    quality: sigmaConfig.encoders.gif.quality
                })
            },
            // a temp canvas to draw merged layers onto
            _tmpCanvas: angular.element('<canvas>')[0],
            // the canvas base layer, created through _buildBaseLayer()
            _baseLayer: null,

            /**
             * Constructs the _baseLayer canvas object by using leafletImage to
             * flatten all base tiles and add them onto a canvas. Displays a blockUI
             * message while rendering.
             * @return {Promise} Promise with callback when canvas resolves, err for rejected
             */
            _buildBaseLayer: function () {
                return $q(function (resolve, reject) {

                    if (self.includeBaseLayer) {
                        blockUI.start('Rendering base layer');
                        self.isInitializing = true;

                        leafletImage(canvasImageOverlay.layer._map, function (err, canvas) {
                            self.isInitializing = false;

                            if (err) {
                                blockUI.stop();
                                reject(err);
                            } else {
                                self._baseLayer = canvas;
                                blockUI.stop();
                                resolve(canvas);
                            }
                        });
                    } else {
                        // no need to include the layer, just resolve
                        resolve();
                    }
                });
            },


            /**
             * Clears the encoder and saves a copy of the base layer.
             * @return {Promise} Promise with callback when canvas resolves, err for rejected
             */
            initialize: function () {
                self.clear();
                return self._buildBaseLayer();
            },

            /**
             * Clears the base layer and destroys any frames in the encoder.
             * @return {object} this
             */
            clear: function () {
                self._encoders.webm.frames = [];
                self._encoders.gif.frames = [];
                self._baseLayer = null;
                return self;
            },

            /**
             * Retrieves the canvas for the image overlay layers.
             * @return {Canvas} the canvas used by CanvasImageOverlay
             */
            _getOverlayCanvas: function () {
                return canvasImageOverlay.layer.canvas();
            },

            /**
             * Saves the state of the leaflet map as a frame on the encoder. The
             * baselayer should have been saved prior to this call. The _tmpCanvas
             * is cleared, the _baseLayer drawn, then the overlay layer drawn.
             * The _tmpCanvas is converted to a Blob then saved as a frame in
             * the encoder.
             * @return {object} this
             */
            capture: function () {
                if (self.isRecording) {
                    var size = canvasImageOverlay.layer._map.getSize(),
                        ctx = self._tmpCanvas.getContext('2d'),
                        duration = sigmaConfig.maxPlaybackDelay - stateService.getPlaybackSpeed() + 10;

                    // set tmp canvas size to current map size
                    self._tmpCanvas.width = size.x;
                    self._tmpCanvas.height = size.y;

                    // clear the tmp canvas
                    ctx.clearRect(0, 0, self._tmpCanvas.width, self._tmpCanvas.height);

                    // draw the base layer, then draw the overlay layer
                    if (self.includeBaseLayer) {
                        ctx.drawImage(self._baseLayer, 0, 0);
                    }
                    ctx.drawImage(self._getOverlayCanvas(), 0, 0);

                    // conver the tmp canvas to webp and add to the encoder
                    if (self.encoder === 'gif') {
                        self._encoders.gif.addFrame(
                            self._tmpCanvas,
                            {copy: true, delay: duration}
                        );
                    } else if (self.encoder === 'webm') {
                        self._encoders.webm.add(
                            self._tmpCanvas.toDataURL('image/webp', sigmaConfig.encoders.webm.quality),
                            duration
                        );
                    } else {
                        // invalid encoder format
                    }
                }
                return self;
            },

            /**
             * Helper function to encode and save a gif. Displays a blockUI
             * message while encoding.
             * @param  {function} resolve A callback for when finished
             * @param  {string}   fname   The name to save the file as
             * @return {function}         The resolved callback function
             */
            _encodeGif: function (resolve, fname) {
                blockUI.start('Encoding');
                var lastBlob,
                    timer;

                // attach event listener for when finished
                self._encoders.gif.on('finished', function (blob) {
                    // the encoder emits a finished event once or twice
                    // save whenver blob we currently get this round
                    lastBlob = blob;

                    // if the timer is already running cancel it
                    // this means another finish event has already been fired
                    if (angular.isDefined(timer)) {
                        $timeout.cancel(timer);
                        timer = undefined;
                    }

                    // use a generous timeout to wait for all finished events
                    timer = $timeout(function () {
                        // this should be the last finished event call, safe to save
                        FileSaver.saveAs(lastBlob, fname);
                        blockUI.stop();
                        resolve(lastBlob);

                        // sometimes the encoder thinks its still running
                        // hold it's hand and tell it everything will be ok
                        self._encoders.gif.abort();
                    }, 2 * 1000);
                });

                // attach progress event listener
                self._encoders.gif.on('progress', function (p) {
                    // use timeout for a safe $scope.$apply()
                    $timeout(function () {
                        blockUI.message('Encoding ' + Math.round(p * 100) + '%');
                    });
                });

                // start the rendering
                self._encoders.gif.render();
            },

            /**
             * Helper function to encode and save a webm. Displays a blockUI
             * message while encoding. No progress updates.
             * @param  {function} resolve A callback for when finished
             * @param  {string}   fname   The name to save the file as
             * @return {function}         The resolved callback function
             */
            _encodeWebm: function (resolve, fname) {
                blockUI.start('Encoding');

                self._encoders.webm.compile(false, function (blob) {
                    FileSaver.saveAs(blob, fname);
                    blockUI.stop();
                    resolve(blob);
                });
            },

            /**
             * Compiles the frames into a video or gif and saves it as the given filename.
             * @param  {string}  fname The filename to save as
             * @return {Promise} A promise for when the video finishes encoding
             */
            encode: function (fname) {
                return $q(function (resolve) {
                    if (self.encoder === 'gif') {
                        return self._encodeGif(resolve, fname);
                    } else if (self.encoder === 'webm') {
                        return self._encodeWebm(resolve, fname);
                    } else {
                        // invalid encoder format
                        resolve();
                    }
                });
            }
        };

        return self;
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('correlationControlController', ['$scope', '$location', '$alert', 'sigmaConfig', 'sigmaService', 'stateService', 'analyzeService', 'blockUI', 'leafletData', 'L', '_', function (
        $scope,
        $location,
        $alert,
        sigmaConfig,
        sigmaService,
        stateService,
        analyzeService,
        blockUI,
        leafletData,
        L,
        _
    ) {
        var vm = this,
            qs = $location.search(),
            map = {},
            bands = _.cloneDeep(sigmaConfig.bands),
            selectedBand = qs.band ? _.find(bands, {name: qs.band}) : _.find(bands, {default: true}),
            mapFeatureGroup = stateService.getMapFeatureGroup(),
            easyButton = null,
            editMode = '';

        vm.mode = $scope.$parent.mode;
        vm.stateService = stateService;
        vm.markerTitle = bands.length > 1 ? 'Correlation - ' + selectedBand.title : 'Correlation';

        L.Draw.Correlation = L.Draw.Marker.extend({
            initialize: function (map, options) {
                this.type = 'correlation';
                options.repeatMode = sigmaConfig.correlationMarkerOptions.repeatMode;
                L.Draw.Feature.prototype.initialize.call(this, map, options);
            },

            addHooks: function () {
                L.Draw.Marker.prototype.addHooks.call(this);

                if (this._map) {
                    this._tooltip.updateContent({ text: 'Click map to correlate point' });
                }
            }
        });

        var greenMarker = L.icon({
            iconUrl: './stylesheets/images/marker-icon-green.png',
            shadowUrl: './stylesheets/images/marker-shadow.png',
            iconAnchor: [12, 41]
        });

        vm.correlatePoint = function (e) {
            blockUI.start('Correlating Point');

            var time = stateService.getTemporalFilter();
            var start = time.start,
                stop = time.stop,
                latlng = e.layer.getLatLng(),
                bbox = stateService.getBbox(),
                frameExtents = stateService.getFrameExtents(),
                band = stateService.getBand(),
                imageQuality = stateService.getImageQuality();

            analyzeService.correlatePoint(latlng.lat, latlng.lng, start, stop, 'png').then(function (result) {
                var correlation = {
                    start: start,
                    stop: stop,
                    latlng: latlng,
                    bbox: bbox,
                    data: result.data,
                    frameExtents: frameExtents,
                    band: band,
                    imageQuality: imageQuality
                };
                stateService.setCorrelationData(correlation);
                blockUI.stop();
            }, function (error) {
                blockUI.reset();
                sigmaService.showError(error, 'danger');
            });
        };

        vm.initialize = function () {
            leafletData.getMap().then(function (data) {
                map = data;
                var marker = new L.Draw.Correlation(map, { icon: greenMarker });

                easyButton = L.easyButton('<i class="fa fa-map-marker correlation-control"></i>', function () {
                    marker.enable();
                });
                easyButton.addTo(map);

                map.on('draw:created', function (e) {
                    if (e.layerType === 'correlation') {
                        var layer = e.layer,
                            bbox = stateService.getBbox(),
                            sw = L.latLng(bbox.south, bbox.west),
                            ne = L.latLng(bbox.north, bbox.east),
                            bounds = L.latLngBounds(sw, ne);

                        // make sure marker was placed inside AOI
                        if (bounds.contains(e.layer.getLatLng())) {
                            mapFeatureGroup.addLayer(layer);
                            layer.on('click', function () {
                                vm.correlatePoint(e);
                            });
                            vm.correlatePoint(e);
                        } else {
                            $alert({
                                title: 'Marker must be placed within AOI',
                                type: 'danger'
                            });
                        }
                    }
                });

                map.on('draw:deletestart', function () {
                    editMode = 'delete';
                });

                map.on('draw:deletestop', function () {
                    editMode = '';
                });
            });
        };

        if (sigmaConfig.components.map.controls.correlation && vm.mode === 'analyze') {
            vm.initialize();
        }

        $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            qs = newValue;
        });

        $scope.$watch('vm.stateService.getViewMode()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.mode = newValue;
            if (sigmaConfig.components.map.controls.correlation && vm.mode === 'analyze') {
                vm.initialize();
            } else {
                if (easyButton) {
                    easyButton.removeFrom(map);
                }
            }
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaCorrelationControl', ['$tooltip', 'leafletData', function ($tooltip, leafletData) {
        return {
            restrict: 'E',
            controller: 'correlationControlController',
            controllerAs: 'vm',
            scope: {},
            link: function (scope) {
                leafletData.getMap().then(function () {
                    var btn = angular.element('.correlation-control').parent().parent();

                    if (btn.length) {
                        $tooltip(btn, {
                            title: scope.vm.markerTitle,
                            placement: 'auto right',
                            container: 'body'
                        });
                    }
                });
            }
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('pointConverterControlController', ['$scope', '$alert', '$location', 'sigmaConfig', 'stateService', 'sigmaService', 'analyzeService', 'blockUI', 'leafletData', 'L', 'localStorage', '_', 'MouseEvent', function (
        $scope,
        $alert,
        $location,
        sigmaConfig,
        stateService,
        sigmaService,
        analyzeService,
        blockUI,
        leafletData,
        L,
        localStorage,
        _,
        MouseEvent
    ) {
        var vm = this,
            qs = $location.search(),
            map = {},
            bands = _.cloneDeep(sigmaConfig.bands),
            selectedBand = qs.band ? _.find(bands, {name: qs.band}) : _.find(bands, {default: true}),
            includeMultiband = bands.length > 1,
            mapFeatureGroup = stateService.getMapFeatureGroup(),
            editMode = '',
            recentPoints = [],
            barArray = [],
            easyBar = {};

        vm.mode = $scope.$parent.mode;
        vm.stateService = stateService;
        vm.markerTitle = bands.length > 1 ? 'Point Converter - ' + selectedBand.title : 'Point Converter';

        // remove any existing point converter data
        localStorage.removeItem('recentPoints');

        // set icon imagepath
        L.Icon.Default.imagePath = './stylesheets/images/';

        // single band control
        L.Draw.Pointconverter = L.Draw.Marker.extend({
            initialize: function (map, options) {
                this.type = 'pointconverter';
                options.repeatMode = sigmaConfig.pointconverterMarkerOptions.repeatMode;
                L.Draw.Feature.prototype.initialize.call(this, map, options);
            },

            addHooks: function () {
                L.Draw.Marker.prototype.addHooks.call(this);

                if (this._map) {
                    this._tooltip.updateContent({ text: 'Click map to analyze time/intensity' });
                }
            }
        });

        // multiband control
        var redMarker = L.icon({
            iconUrl: './stylesheets/images/marker-icon-red.png',
            shadowUrl: './stylesheets/images/marker-shadow.png',
            iconAnchor: [12, 41]
        });

        L.Draw.PointconverterMultiband = L.Draw.Marker.extend({
            initialize: function (map, options) {
                this.type = 'pointconverter-multiband';
                options.repeatMode = sigmaConfig.pointconverterMarkerOptions.repeatMode;
                L.Draw.Feature.prototype.initialize.call(this, map, options);
            },

            addHooks: function () {
                L.Draw.Marker.prototype.addHooks.call(this);

                if (this._map) {
                    this._tooltip.updateContent({text: 'Click map to analyze time/intensity across all bands'});
                }
            }
        });

        vm.analyzeCube = function (e, isMultiband) {
            blockUI.start('Analyzing Data');

            var time = stateService.getTemporalFilter(),
                start = time.start,
                stop = time.stop,
                latlng = e.layer.getLatLng(),
                band = isMultiband ? 'all' : selectedBand.name,
                sensor = stateService.getSensor();

            analyzeService.convertPoint(latlng.lat, latlng.lng, start, stop, band, sensor).then(function (result) {
                recentPoints.unshift({
                    data: result,
                    frameExtents: stateService.getFrameExtents()
                });
                localStorage.setItem('recentPoints', JSON.stringify(recentPoints));
                stateService.setPointConverterData(result);
                blockUI.stop();
            }, function (error) {
                blockUI.reset();
                sigmaService.showError(error, 'danger');
            });
        };

        vm.placeMarker = function (e, isMultiband) {
            var layer = e.layer,
                bbox = stateService.getBbox(),
                bounds = L.latLngBounds(sigmaService.getDDBounds(bbox));

            // make sure marker was placed inside AOI
            if (bounds.contains(e.layer.getLatLng())) {
                mapFeatureGroup.addLayer(layer);
                layer.on('click', function (e) {
                    if (editMode !== 'delete') {
                        // show time/intensity data for this point
                        var point = _.find(recentPoints, 'data.point', {
                            lat: e.latlng.lat,
                            lon: e.latlng.lng
                        });
                        if (point) {
                            point.data.sourceEvent = new MouseEvent('click', {
                                'view': window,
                                'bubbles': true,
                                'cancelable': false
                            });
                            stateService.setPointConverterData(point.data);
                        }
                    }
                });
                vm.analyzeCube(e, isMultiband);
            } else {
                $alert({
                    title: 'Marker Error',
                    content: 'Marker must be placed within AOI',
                    type: 'danger'
                });
            }
        };

        vm.initialize = function () {
            leafletData.getMap().then(function (data) {
                map = data;
                var marker = new L.Draw.Pointconverter(map, {}),
                    markerMultiband = new L.Draw.PointconverterMultiband(map, { icon: redMarker });

                var btnSingleBand = L.easyButton('<i class="fa fa-map-marker pointconverter-control"></i>', function () {
                    marker.enable();
                });

                var btnMultiband = L.easyButton('<i class="fa fa-map-marker pointconverter-control-multiband"></i>', function () {
                    markerMultiband.enable();
                });

                barArray = includeMultiband ? [btnSingleBand, btnMultiband] : [btnSingleBand];

                easyBar = L.easyBar(barArray);
                easyBar.addTo(map);

                map.on('draw:created', function (e) {
                    if (e.layerType === 'pointconverter') {
                        vm.placeMarker(e, false);
                    } else if (e.layerType === 'pointconverter-multiband') {
                        vm.placeMarker(e, true);
                    }
                });

                map.on('draw:deletestart', function () {
                    editMode = 'delete';
                });

                map.on('draw:deletestop', function () {
                    editMode = '';
                });
            });
        };

        if (sigmaConfig.components.map.controls.pointconverter && vm.mode === 'analyze') {
            vm.initialize();
        }

        $scope.$watchCollection('vm.stateService.getQs()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            qs = newValue;
        });

        $scope.$watch('vm.stateService.getViewMode()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            vm.mode = newValue;
            if (sigmaConfig.components.map.controls.pointconverter && vm.mode === 'analyze') {
                vm.initialize();
            } else {
                if (barArray.length > 0) {
                    easyBar.removeFrom(map);
                }
            }
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaPointConverterControl', ['$tooltip', 'leafletData', function ($tooltip, leafletData) {
        return {
            restrict: 'E',
            controller: 'pointConverterControlController',
            controllerAs: 'vm',
            scope: {
                includeMultiband: '='
            },
            link: function (scope) {
                leafletData.getMap().then(function () {
                    var pointBtn = angular.element('.pointconverter-control').parent().parent(),
                        bandBtn = angular.element('.pointconverter-control-multiband').parent().parent();

                    if (pointBtn.length) {
                        $tooltip(pointBtn, {
                            title: scope.vm.markerTile,
                            placement: 'auto right',
                            container: 'body'
                        });
                    }

                    if (bandBtn.length) {
                        $tooltip(bandBtn, {
                            title: 'Point Converter - All Bands',
                            placement: 'auto right',
                            container: 'body'
                        });
                    }
                });
            }
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('rectangleControlController', ['$scope', '$timeout', 'sigmaConfig', 'stateService', 'sigmaService', 'coordinateConversionService', 'analyzeService', 'blockUI', 'leafletData', 'L', '_', function (
        $scope,
        $timeout,
        sigmaConfig,
        stateService,
        sigmaService,
        coordinateConversionService,
        analyzeService,
        blockUI,
        leafletData,
        L,
        _
    ) {
        var vm = this,
            easyButton = null,
            mapFeatureGroup = stateService.getMapFeatureGroup(),
            editMode = '',
            currMap = {};

        var clearRect = function () {
            var rectLayer = _.find(mapFeatureGroup.getLayers(), { options: { name: 'rect' }});
            if (rectLayer) {
                mapFeatureGroup.removeLayer(rectLayer);
            }
        };

        vm.stateService = stateService;

        vm.redrawRect = function (location) {
            if (mapFeatureGroup) {
                // erase existing bbox if necessary
                clearRect();
                if (location) {
                    if (location.north || location.mgrsNE) {
                        var bounds = sigmaService.getDDBounds(location);

                        // create a rectangle
                        var rect = L.rectangle(bounds, {
                            color: '#0000ff',
                            fill: '#0000ff',
                            fillOpacity: $scope.$parent.mode === 'search' ? 0.25 : 0,
                            weight: 1,
                            name: 'rect'
                        });

                        mapFeatureGroup.addLayer(rect);

                        // zoom the map to the rectangle bounds
                        $timeout(function () {
                            if (currMap && bounds) {
                                currMap.fitBounds(bounds);
                            }
                        }, 100);
                    }
                }
            }
        };

        vm.initialize = function () {
            leafletData.getMap().then(function (map) {
                currMap = map;

                var rectangle = new L.Draw.Rectangle(map);

                easyButton = L.easyButton('<i class="fa fa-stop rectangle-control"></i>', function () {
                    rectangle.enable();
                });
                
                if ($scope.$parent.mode === 'search') {
                    easyButton.addTo(map);

                    map.on('draw:created', function (e) {
                        var layer = e.layer;
                        if (e.layerType === 'rectangle') {
                            // erase existing feature group layers
                            if (mapFeatureGroup) {
                                mapFeatureGroup.clearLayers();
                                stateService.clearAOI();
                            }
                            var bounds = layer.getBounds();
                            stateService.setBboxParams({
                                format: 'dd',
                                north: bounds._northEast.lat,
                                east: bounds._northEast.lng,
                                south: bounds._southWest.lat,
                                west: bounds._southWest.lng,
                                mgrsNE: '',
                                mgrsSW: ''
                            });
                        }
                    });

                    map.on('draw:edited', function (e) {
                        if ($scope.$parent.mode === 'search') {
                            var layer = e.layers.getLayers()[0];
                            var bounds = layer.getBounds();
                            stateService.setBboxParams({
                                format: 'dd',
                                north: bounds._northEast.lat,
                                east: bounds._northEast.lng,
                                south: bounds._southWest.lat,
                                west: bounds._southWest.lng,
                                mgrsNE: '',
                                mgrsSW: ''
                            });
                        }
                    });

                    map.on('draw:deletestart', function () {
                        editMode = 'delete';
                    });

                    map.on('draw:deletestop', function () {
                        editMode = '';
                    });

                    map.on('draw:deleted', function () {
                        // erase existing bbox if necessary
                        clearRect();
                        stateService.clearAOI();
                    });
                }

                var bb = stateService.getBbox();
                vm.redrawRect(bb);
            });
        };
        
        if (sigmaConfig.components.map.controls.rectangle) {
            vm.initialize();

            $scope.$watchCollection('vm.stateService.getBbox()', function (newValue, oldValue) {
                if (angular.equals(newValue, oldValue)) {
                    return;
                }
                vm.redrawRect(newValue);

            });
        }

        $scope.$watch('vm.stateService.getViewMode()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            var bb = stateService.getBbox();
            vm.redrawRect(bb);
            if (newValue === 'analyze') {
                if (easyButton) {
                    easyButton.removeFrom(currMap);
                }
            } else if (newValue === 'search') {
                if (easyButton) {
                    easyButton.addTo(currMap);
                }
            }
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').directive('sigmaRectangleControl', ['$tooltip', 'leafletData', function ($tooltip, leafletData) {
        return {
            restrict: 'E',
            controller: 'rectangleControlController',
            controllerAs: 'vm',
            scope: {},
            link: function () {
                leafletData.getMap().then(function () {
                    var btn = angular.element('.rectangle-control').parent().parent();

                    if (btn.length) {
                        $tooltip(btn, {
                            title: 'AOI',
                            placement: 'auto right',
                            container: 'body'
                        });
                    }
                });
            }
        };
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').config(['$provide', function($provide){
        $provide.decorator('$httpBackend', angular.mock.e2e.$httpBackendDecorator);
    }]).run(['$httpBackend', 'd3', 'sigmaConfig', '_', 'XMLHttpRequest', function($httpBackend, d3, sigmaConfig, _, XMLHttpRequest){

        var getSync = function(url){
            var request = new XMLHttpRequest();
            request.open('GET', url, false);
            request.send(null);
            return [request.status, request.response, {}];
        };

        var coverageOverrideUrl = 'mocks/data/coverage.json';
        var pointAnalysisUrl = 'mocks/data/pointConverter.json';
        var aggregateDayUrl = 'mocks/data/aggregate_day.json';
        var aggregateHourUrl = 'mocks/data/aggregate_hour.json';
        var overlayUrl = 'mocks/data/overlay.json';

        var aggregateRegex = new RegExp('^' + sigmaConfig.urls.aggregate, 'i');
        var coverageRegex = new RegExp('^' + sigmaConfig.urls.coverage, 'i');
        var overlaysRegex = new RegExp('^' + sigmaConfig.urls.overlays, 'i');
        var pointAnalysisRegex = new RegExp('^' + sigmaConfig.urls.pointconverter, 'i');
        var correlateRegex = new RegExp('^' + sigmaConfig.urls.correlate, 'i');
        var appStateRegex = new RegExp('^' + sigmaConfig.urls.appState, 'i');

        sigmaConfig.overlayPrefix = '';

        // Templates requests must pass through
        $httpBackend.whenGET(/html$/).passThrough();

        $httpBackend.whenGET(appStateRegex).passThrough();
        $httpBackend.whenPOST(appStateRegex).passThrough();
        $httpBackend.whenPUT(appStateRegex).passThrough();
        $httpBackend.whenDELETE(appStateRegex).passThrough();

        $httpBackend.whenGET(correlateRegex).respond(function () {
            return [400, JSON.stringify(['Something went wrong']), {}, 'Bad Request'];
        });

        // Aggregate service
        //$httpBackend.whenGET(aggregateRegex).passThrough();
        $httpBackend.whenGET(aggregateRegex).respond(function(method, url) {
            if(url.indexOf('group_by=day') > -1 ){
                return getSync(aggregateDayUrl);
            }
            return getSync(aggregateHourUrl);
        });

        // coverage service
        //$httpBackend.whenGET(coverageRegex).passThrough();
        $httpBackend.whenGET(coverageRegex).respond(function () {
            return getSync(coverageOverrideUrl);
        });

        // overlays service
        //$httpBackend.whenGET(overlaysRegex).passThrough();
        $httpBackend.whenGET(overlaysRegex).respond(function (method, url) {
            var urlParams = _.fromPairs(_.map(url.split('?')[1].split('&'), function (s) { return s.split('='); }));
            var request = new XMLHttpRequest();
            request.open('GET', overlayUrl, false);
            request.send(null);
            var overlays = JSON.parse(request.response);
            overlays.n = parseInt(urlParams.n);
            overlays.s = parseInt(urlParams.s);
            overlays.e = parseInt(urlParams.e);
            overlays.w = parseInt(urlParams.w);
            overlays.start = urlParams.start;
            overlays.stop = urlParams.stop;
            return [200, JSON.stringify(overlays), {}];
        });

        // point analysis service
        //$httpBackend.whenGET(pointAnalysisRegex).passThrough();
        $httpBackend.whenGET(pointAnalysisRegex).respond(function () {
            return getSync(pointAnalysisUrl);
        });


    }]);
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsInNpZ21hQ29uZmlnLmpzIiwibW9kZWxzL0NhbnZhc0ltYWdlT3ZlcmxheS5qcyIsIm1vZGVscy9PdmVybGF5LmpzIiwic2VydmljZXMvYW5hbHl6ZVNlcnZpY2UuanMiLCJzZXJ2aWNlcy9jb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UuanMiLCJzZXJ2aWNlcy9zZWFyY2hTZXJ2aWNlLmpzIiwic2VydmljZXMvc2lnbWFTZXJ2aWNlLmpzIiwic2VydmljZXMvc3RhdGVTZXJ2aWNlLmpzIiwicGFnZXMvc2VhcmNoQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvYW9pQW5hbHlzaXMvYW9pQW5hbHlzaXNDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9hb2lBbmFseXNpcy9hb2lBbmFseXNpc0RpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvYmFuZC9iYW5kQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvYmFuZC9iYW5kRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9jb3JyZWxhdGlvbkFuYWx5c2lzL2NvcnJlbGF0aW9uQW5hbHlzaXNDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9jb3JyZWxhdGlvbkFuYWx5c2lzL2NvcnJlbGF0aW9uQW5hbHlzaXNEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2NvdmVyYWdlRmlsdGVyL2NvdmVyYWdlRmlsdGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvY292ZXJhZ2VGaWx0ZXIvY292ZXJhZ2VGaWx0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2dvdG8vZ290b0NvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2dvdG8vZ290b0RpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvZnJhbWVPdmVybGF5cy9mcmFtZU92ZXJsYXlzQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZnJhbWVPdmVybGF5cy9mcmFtZU92ZXJsYXlzRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9pbWFnZUZpbHRlcnMvaW1hZ2VGaWx0ZXJzQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvbG9jYXRpb25GaWx0ZXIvbG9jYXRpb25GaWx0ZXJDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9sb2NhdGlvbkZpbHRlci9sb2NhdGlvbkZpbHRlckRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvbG9jYXRpb25Gb3JtYXQvbG9jYXRpb25Gb3JtYXRDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9sb2NhdGlvbkZvcm1hdC9sb2NhdGlvbkZvcm1hdERpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvbWFwL21hcENvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL21hcC9tYXBEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3BsYXliYWNrL3BsYXliYWNrQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvcGxheWJhY2svcGxheWJhY2tEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3BvaW50Q29udmVydGVyL3BvaW50Q29udmVydGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvcG9pbnRDb252ZXJ0ZXIvcG9pbnRDb252ZXJ0ZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3JhZGlhbC9yYWRpYWxCYXJDaGFydEZhY3RvcnkuanMiLCJjb21wb25lbnRzL3JhZGlhbC9yYWRpYWxDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9yYWRpYWwvcmFkaWFsRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9yZWNlbnRBb2lMaXN0L3JlY2VudEFvaUxpc3RDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9yZWNlbnRBb2lMaXN0L3JlY2VudEFvaUxpc3REaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3JlY2VudFBvaW50c0xpc3QvcmVjZW50UG9pbnRzTGlzdENvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3JlY2VudFBvaW50c0xpc3QvcmVjZW50UG9pbnRzTGlzdERpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvc2Vuc29yL3NlbnNvckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3NlbnNvci9zZW5zb3JEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3NpZGViYXIvc2lkZWJhckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3NpZGViYXIvc2lkZWJhckRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvc3RhdGUvc3RhdGVDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9zdGF0ZS9zdGF0ZURpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvdGVtcG9yYWxGaWx0ZXIvdGVtcG9yYWxGaWx0ZXJDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy90ZW1wb3JhbEZpbHRlci90ZW1wb3JhbEZpbHRlckRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvdGltZVNsaWRlci90aW1lU2xpZGVyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvdGltZVNsaWRlci90aW1lU2xpZGVyRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy92aWRlby92aWRlb1NlcnZpY2UuanMiLCJjb21wb25lbnRzL21hcC9jb250cm9scy9jb3JyZWxhdGlvbkNvbnRyb2xDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9tYXAvY29udHJvbHMvY29ycmVsYXRpb25Db250cm9sRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9tYXAvY29udHJvbHMvcG9pbnRDb252ZXJ0ZXJDb250cm9sQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvbWFwL2NvbnRyb2xzL3BvaW50Q29udmVydGVyQ29udHJvbERpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvbWFwL2NvbnRyb2xzL3JlY3RhbmdsZUNvbnRyb2xDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9tYXAvY29udHJvbHMvcmVjdGFuZ2xlQ29udHJvbERpcmVjdGl2ZS5qcyIsImJhY2tlbmRTdHVicy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxJQUFBLE1BQUEsUUFBQSxPQUFBLFNBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7OztJQUdBLElBQUEseUVBQUEsVUFBQSxnQkFBQSxnQkFBQSxVQUFBLGVBQUE7OztRQUdBLFNBQUEsVUFBQSxtQ0FBQSxVQUFBLFdBQUE7WUFDQSxPQUFBLFVBQUEsV0FBQSxPQUFBO2dCQUNBLFVBQUEsV0FBQTtnQkFDQSxXQUFBLFdBQUE7b0JBQ0EsTUFBQTs7Ozs7UUFLQTthQUNBLEtBQUEsS0FBQTtnQkFDQSxZQUFBO2dCQUNBLGNBQUE7Z0JBQ0EsYUFBQTtnQkFDQSxnQkFBQTs7YUFFQSxLQUFBLFlBQUE7Z0JBQ0EsWUFBQTtnQkFDQSxhQUFBO2dCQUNBLGdCQUFBOzthQUVBLFVBQUE7Z0JBQ0EsWUFBQTs7O1FBR0EsUUFBQSxPQUFBLGVBQUEsVUFBQTtZQUNBLFdBQUE7WUFDQSxXQUFBO1lBQ0EsV0FBQTtZQUNBLFVBQUE7OztRQUdBLGNBQUEsVUFBQTtRQUNBLGNBQUEsV0FBQTtRQUNBLGNBQUEsWUFBQTs7S0FFQSxNQUFBLFVBQUEsT0FBQTtLQUNBLE1BQUEsS0FBQSxPQUFBO0tBQ0EsTUFBQSxLQUFBLE9BQUE7S0FDQSxNQUFBLE1BQUEsT0FBQTtLQUNBLE1BQUEsS0FBQSxPQUFBO0tBQ0EsTUFBQSxnQkFBQSxPQUFBO0tBQ0EsTUFBQSxTQUFBLE9BQUE7S0FDQSxNQUFBLGNBQUEsT0FBQTtLQUNBLE1BQUEsTUFBQSxPQUFBO0tBQ0EsTUFBQSxrQkFBQSxPQUFBO0tBQ0EsTUFBQSxRQUFBLE9BQUE7S0FDQSxNQUFBLFlBQUEsT0FBQTtLQUNBLE1BQUEsUUFBQSxPQUFBO0tBQ0EsTUFBQSxVQUFBLE9BQUE7S0FDQSxNQUFBLGdCQUFBLE9BQUE7S0FDQSxNQUFBLE9BQUEsT0FBQTtLQUNBLE1BQUEsZ0JBQUEsT0FBQTs7OztJQUlBLElBQUEseUZBQUEsU0FBQSxZQUFBLFVBQUEsU0FBQSxhQUFBLGNBQUEsY0FBQTs7UUFFQSxXQUFBLFlBQUEsWUFBQTs7O1FBR0EsSUFBQTtRQUNBLFFBQUEsUUFBQSxTQUFBLEdBQUEsVUFBQSxXQUFBO1lBQ0EsSUFBQSxRQUFBLFVBQUEsY0FBQTs7Z0JBRUE7OztZQUdBLGNBQUEsU0FBQSxXQUFBOztnQkFFQSxhQUFBLGdCQUFBLGFBQUE7OztnQkFHQSxjQUFBO2VBQ0E7Ozs7OztBQ2xHQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxRQUFBLHdEQUFBLFVBQUEsa0JBQUEsUUFBQSxHQUFBLEdBQUE7UUFDQSxJQUFBLE1BQUE7WUFDQSxPQUFBO1lBQ0EsTUFBQTtZQUNBLE1BQUE7WUFDQSxlQUFBO1lBQ0EsV0FBQTtnQkFDQSxLQUFBO2dCQUNBLEtBQUEsQ0FBQTtnQkFDQSxNQUFBOztZQUVBLFFBQUE7Z0JBQ0EsWUFBQTs7WUFFQSxXQUFBO2dCQUNBLFdBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBOztnQkFFQSxXQUFBO29CQUNBLEtBQUEsQ0FBQTtvQkFDQSxLQUFBLENBQUE7OztZQUdBLGlCQUFBO1lBQ0EsdUJBQUE7WUFDQSxrQkFBQTtZQUNBLGFBQUE7WUFDQSxpQkFBQTtZQUNBLFFBQUE7Z0JBQ0E7b0JBQ0EsT0FBQSxDQUFBO29CQUNBLFlBQUE7b0JBQ0EsT0FBQTs7Z0JBRUE7b0JBQ0EsT0FBQSxDQUFBO29CQUNBLFlBQUE7b0JBQ0EsT0FBQTs7Z0JBRUE7b0JBQ0EsT0FBQSxDQUFBO29CQUNBLFlBQUE7b0JBQ0EsT0FBQTs7O1lBR0EsdUJBQUE7WUFDQSxXQUFBO2dCQUNBO29CQUNBLE9BQUE7b0JBQ0EsT0FBQTtvQkFDQSxTQUFBOztnQkFFQTtvQkFDQSxPQUFBO29CQUNBLE9BQUE7b0JBQ0EsU0FBQTs7Z0JBRUE7b0JBQ0EsT0FBQTtvQkFDQSxPQUFBO29CQUNBLFNBQUE7O2dCQUVBO29CQUNBLE9BQUE7b0JBQ0EsT0FBQTtvQkFDQSxTQUFBOzs7WUFHQSxzQkFBQTtZQUNBLHFCQUFBO1lBQ0Esb0JBQUEsT0FBQSxNQUFBLFNBQUEsR0FBQTtZQUNBLG1CQUFBLE9BQUEsTUFBQSxNQUFBO1lBQ0EsdUJBQUE7WUFDQSxtQkFBQSxFQUFBLElBQUE7WUFDQSxtQkFBQTtnQkFDQTtvQkFDQSxPQUFBO29CQUNBLE9BQUE7b0JBQ0EsU0FBQTs7Z0JBRUE7b0JBQ0EsT0FBQTtvQkFDQSxPQUFBO29CQUNBLFNBQUE7O2dCQUVBO29CQUNBLE9BQUE7b0JBQ0EsT0FBQTtvQkFDQSxTQUFBOztnQkFFQTtvQkFDQSxPQUFBO29CQUNBLE9BQUE7b0JBQ0EsU0FBQTs7O1lBR0EsZ0JBQUE7Z0JBQ0E7b0JBQ0EsT0FBQTtvQkFDQSxNQUFBO29CQUNBLFNBQUE7O2dCQUVBO29CQUNBLE9BQUE7b0JBQ0EsTUFBQTtvQkFDQSxTQUFBOztnQkFFQTtvQkFDQSxPQUFBO29CQUNBLE1BQUE7b0JBQ0EsU0FBQTs7O1lBR0EsNEJBQUE7WUFDQSxrQkFBQTtZQUNBLHFCQUFBO1lBQ0Esc0JBQUE7Z0JBQ0EsVUFBQTtnQkFDQSxPQUFBOztZQUVBLG9CQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxjQUFBO1lBQ0EsbUJBQUE7WUFDQSxxQkFBQTtZQUNBLG1CQUFBO2dCQUNBO29CQUNBLE1BQUE7b0JBQ0EsT0FBQTtvQkFDQSxXQUFBOztnQkFFQTtvQkFDQSxNQUFBO29CQUNBLE9BQUE7b0JBQ0EsV0FBQTs7Z0JBRUE7b0JBQ0EsTUFBQTtvQkFDQSxPQUFBO29CQUNBLFdBQUE7O2dCQUVBO29CQUNBLE1BQUE7b0JBQ0EsT0FBQTtvQkFDQSxXQUFBOztnQkFFQTtvQkFDQSxNQUFBO29CQUNBLE9BQUE7b0JBQ0EsV0FBQTs7Z0JBRUE7b0JBQ0EsTUFBQTtvQkFDQSxPQUFBO29CQUNBLFdBQUE7OztZQUdBLGtCQUFBO1lBQ0EsZ0JBQUE7Z0JBQ0E7b0JBQ0EsTUFBQTtvQkFDQSxPQUFBOztnQkFFQTtvQkFDQSxNQUFBO29CQUNBLE9BQUE7O2dCQUVBO29CQUNBLE1BQUE7b0JBQ0EsT0FBQTs7Z0JBRUE7b0JBQ0EsTUFBQTtvQkFDQSxPQUFBOztnQkFFQTtvQkFDQSxNQUFBO29CQUNBLE9BQUE7O2dCQUVBO29CQUNBLE1BQUE7b0JBQ0EsT0FBQTs7O1lBR0EsT0FBQTtnQkFDQTtvQkFDQSxPQUFBO29CQUNBLE1BQUE7b0JBQ0EsU0FBQTs7Z0JBRUE7b0JBQ0EsT0FBQTtvQkFDQSxNQUFBO29CQUNBLFNBQUE7O2dCQUVBO29CQUNBLE9BQUE7b0JBQ0EsTUFBQTtvQkFDQSxTQUFBOztnQkFFQTtvQkFDQSxPQUFBO29CQUNBLE1BQUE7b0JBQ0EsU0FBQTs7O1lBR0EsWUFBQTtnQkFDQSxnQkFBQTtnQkFDQSxhQUFBO2dCQUNBLEtBQUE7b0JBQ0EsVUFBQTt3QkFDQSxhQUFBO3dCQUNBLGdCQUFBO3dCQUNBLFdBQUE7OztnQkFHQSxNQUFBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxRQUFBOztZQUVBLGtCQUFBO1lBQ0EsNkJBQUE7Z0JBQ0EsWUFBQTs7WUFFQSwwQkFBQTtnQkFDQSxZQUFBOztZQUVBLGNBQUE7Z0JBQ0EsU0FBQTtvQkFDQSxTQUFBO29CQUNBLFNBQUE7O2dCQUVBLFlBQUE7b0JBQ0EsU0FBQTtvQkFDQSxLQUFBO29CQUNBLFNBQUE7O2dCQUVBLFVBQUE7b0JBQ0EsU0FBQTtvQkFDQSxLQUFBO29CQUNBLFNBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsU0FBQTtvQkFDQSxNQUFBO29CQUNBLEtBQUE7b0JBQ0EsT0FBQTs7Z0JBRUEsS0FBQTtvQkFDQSxTQUFBO29CQUNBLE9BQUE7b0JBQ0EsS0FBQSxDQUFBO29CQUNBLEtBQUE7O2dCQUVBLFlBQUE7b0JBQ0EsU0FBQTtvQkFDQSxLQUFBLENBQUE7O2dCQUVBLFFBQUE7b0JBQ0EsU0FBQTtvQkFDQSxRQUFBOztnQkFFQSxPQUFBO29CQUNBLFNBQUE7b0JBQ0EsUUFBQTs7O1lBR0EsVUFBQTtnQkFDQSxLQUFBO29CQUNBLFNBQUE7b0JBQ0EsU0FBQTtvQkFDQSxTQUFBOztnQkFFQSxNQUFBO29CQUNBLFNBQUE7b0JBQ0EsU0FBQTs7O1lBR0EsZ0JBQUE7WUFDQSxTQUFBO2dCQUNBO29CQUNBLElBQUEsQ0FBQTtvQkFDQSxNQUFBO29CQUNBLE9BQUE7b0JBQ0EsT0FBQSxDQUFBLGFBQUEsT0FBQSxR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QSxPQUFBLEtBQUE7Ozs7Ozs7O1lBUUEsT0FBQSxZQUFBO2dCQUNBLElBQUEsT0FBQTtnQkFDQSxJQUFBLEtBQUEsT0FBQTtvQkFDQSxLQUFBLE1BQUEsUUFBQTs7Z0JBRUEsS0FBQSxTQUFBO2dCQUNBLEtBQUEsYUFBQTtnQkFDQSxLQUFBO2dCQUNBLE9BQUE7OztZQUdBLFNBQUEsVUFBQSxLQUFBO2dCQUNBLElBQUEsT0FBQTtnQkFDQSxJQUFBLEtBQUEsT0FBQTtvQkFDQSxJQUFBLFlBQUEsS0FBQTs7Z0JBRUEsS0FBQSxTQUFBO2dCQUNBLEtBQUEsYUFBQTtnQkFDQSxPQUFBOzs7Ozs7Ozs7WUFTQSxRQUFBLFVBQUEsS0FBQTtnQkFDQSxJQUFBLE9BQUE7Z0JBQ0EsS0FBQSxhQUFBO2dCQUNBLEtBQUE7Z0JBQ0EsT0FBQTs7Ozs7Ozs7WUFRQSxRQUFBLFlBQUE7Z0JBQ0EsSUFBQSxPQUFBO2dCQUNBLElBQUEsS0FBQSxPQUFBO29CQUNBLEtBQUEsVUFBQSxRQUFBO29CQUNBLEtBQUEsTUFBQSxPQUFBLFNBQUEsS0FBQTs7b0JBRUEsT0FBQSxLQUFBLE1BQUE7O2dCQUVBLE9BQUE7OztZQUdBLFlBQUEsVUFBQSxLQUFBO2dCQUNBLElBQUEsT0FBQTtnQkFDQSxLQUFBLGNBQUE7Z0JBQ0EsS0FBQSxRQUFBLEVBQUE7cUJBQ0EsUUFBQTtxQkFDQSxNQUFBO2dCQUNBLGVBQUE7Ozs7O1FBS0EsbUJBQUEsUUFBQSxVQUFBLE1BQUE7WUFDQSxJQUFBLE1BQUE7Z0JBQ0EsT0FBQSxJQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7OztZQUdBLE9BQUEsSUFBQTs7O1FBR0EsbUJBQUEsY0FBQSxVQUFBLE1BQUE7WUFDQSxJQUFBLFFBQUEsUUFBQSxPQUFBO2dCQUNBLE9BQUEsS0FBQSxJQUFBLG1CQUFBOztZQUVBLE9BQUEsbUJBQUEsTUFBQTs7O1FBR0EsT0FBQTs7OztBQ3BTQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxRQUFBLG1EQUFBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7O1FBRUEsSUFBQSxVQUFBLFVBQUEsS0FBQSxVQUFBLGNBQUEsUUFBQSxNQUFBLFNBQUEsUUFBQTtZQUNBLEtBQUEsTUFBQSxZQUFBLGdCQUFBOztZQUVBLEtBQUEsTUFBQTtZQUNBLEtBQUEsZUFBQTtZQUNBLEtBQUEsU0FBQTtZQUNBLEtBQUEsT0FBQTtZQUNBLEtBQUEsVUFBQTtZQUNBLEtBQUEsVUFBQTtZQUNBLEtBQUEsU0FBQTtZQUNBLEtBQUEsU0FBQTs7WUFFQSxLQUFBOzs7O1FBSUEsUUFBQSxZQUFBO1lBQ0EsYUFBQSxVQUFBLFFBQUEsS0FBQTs7Z0JBRUEsSUFBQSxRQUFBLFdBQUEsS0FBQSxTQUFBO29CQUNBLEtBQUEsT0FBQTs7OztnQkFJQSxJQUFBLHFCQUFBLGFBQUE7Z0JBQ0EsbUJBQUEsTUFBQSxRQUFBLFNBQUE7O1lBRUEsV0FBQSxZQUFBO2dCQUNBLElBQUEsT0FBQTtnQkFDQSxJQUFBLFNBQUEsS0FBQSxPQUFBLFVBQUEsS0FBQTs7Z0JBRUEsT0FBQSxVQUFBOztnQkFFQSxJQUFBLE9BQUEsUUFBQSxZQUFBLFdBQUE7b0JBQ0EsS0FBQSxZQUFBOzs7Z0JBR0EsT0FBQSxRQUFBLFlBQUEsR0FBQSxVQUFBLFNBQUEsR0FBQTtvQkFDQSxLQUFBLFlBQUEsUUFBQTs7O2dCQUdBLEtBQUEsU0FBQTs7Ozs7UUFLQSxRQUFBLFFBQUEsVUFBQSxNQUFBO1lBQ0EsSUFBQSxNQUFBO2dCQUNBLE9BQUEsSUFBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTtvQkFDQSxLQUFBO29CQUNBLEtBQUE7b0JBQ0EsS0FBQTs7O1lBR0EsT0FBQSxJQUFBOzs7UUFHQSxRQUFBLGNBQUEsVUFBQSxNQUFBO1lBQ0EsSUFBQSxRQUFBLFFBQUEsT0FBQTtnQkFDQSxPQUFBLEtBQUEsSUFBQSxRQUFBOztZQUVBLE9BQUEsUUFBQSxNQUFBOzs7UUFHQSxPQUFBOzs7O0FDNUVBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFFBQUEsc0ZBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsY0FBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFNBQUEsYUFBQSxZQUFBO1lBQ0EsT0FBQTtnQkFDQSxHQUFBLE9BQUEsR0FBQTtnQkFDQSxHQUFBLE9BQUEsR0FBQTtnQkFDQSxHQUFBLE9BQUEsR0FBQTtnQkFDQSxHQUFBLE9BQUEsR0FBQTs7Ozs7UUFLQSxJQUFBLGlCQUFBLFVBQUEsUUFBQTtVQUNBLE9BQUEsVUFBQSxJQUFBLFNBQUE7OztRQUdBLElBQUEsbUJBQUEsVUFBQSxPQUFBLE1BQUEsTUFBQSxVQUFBLFFBQUE7WUFDQSxJQUFBLFNBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsUUFBQSxlQUFBOzs7WUFHQSxJQUFBLFVBQUE7Z0JBQ0EsUUFBQSxPQUFBLFFBQUEsWUFBQTs7O1lBR0EsT0FBQTs7O1FBR0EsSUFBQSwwQkFBQSxVQUFBLE9BQUEsTUFBQSxLQUFBLEtBQUEsTUFBQSxjQUFBLFFBQUE7WUFDQSxJQUFBLFNBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLEtBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxNQUFBO2dCQUNBLGNBQUE7Z0JBQ0EsUUFBQSxlQUFBOzs7WUFHQSxPQUFBOzs7UUFHQSxJQUFBLGVBQUEsVUFBQSxPQUFBLE1BQUEsVUFBQSxXQUFBLE1BQUEsWUFBQSxjQUFBLFFBQUEsY0FBQSxjQUFBLFVBQUE7WUFDQSxJQUFBLFNBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFdBQUE7Z0JBQ0EsTUFBQTtnQkFDQSxZQUFBO2dCQUNBLGNBQUE7Z0JBQ0EsUUFBQSxlQUFBO2dCQUNBLGNBQUE7Z0JBQ0EsY0FBQTtnQkFDQSxVQUFBOzs7WUFHQSxJQUFBLFVBQUE7Z0JBQ0EsUUFBQSxPQUFBLFFBQUEsWUFBQTs7O1lBR0EsT0FBQTs7O1FBR0EsSUFBQSwwQkFBQSxVQUFBLEtBQUEsS0FBQSxPQUFBLE1BQUEsTUFBQSxZQUFBLFVBQUEsY0FBQSxRQUFBO1lBQ0EsSUFBQSxTQUFBO2dCQUNBLEtBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxZQUFBO2dCQUNBLGNBQUE7Z0JBQ0EsUUFBQSxlQUFBOzs7WUFHQSxJQUFBLFVBQUE7Z0JBQ0EsUUFBQSxPQUFBLFFBQUEsWUFBQTs7O1lBR0EsT0FBQTs7O1FBR0EsT0FBQTtZQUNBLGFBQUEsWUFBQTtnQkFDQSxJQUFBLFdBQUEsYUFBQTtvQkFDQSxPQUFBLGFBQUE7b0JBQ0EsTUFBQSxZQUFBLEtBQUE7b0JBQ0EsT0FBQSxhQUFBO29CQUNBLFNBQUEsYUFBQTtvQkFDQSxTQUFBLGlCQUFBLEtBQUEsT0FBQSxLQUFBLE1BQUEsTUFBQSxVQUFBO29CQUNBLElBQUEsR0FBQTs7Z0JBRUEsUUFBQSxJQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQTtvQkFDQSxRQUFBO21CQUNBLEtBQUEsU0FBQSxpQkFBQSxNQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxTQUFBLGVBQUEsT0FBQTtvQkFDQSxRQUFBLElBQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOzs7WUFHQSxjQUFBLFVBQUEsS0FBQSxLQUFBLE9BQUEsTUFBQSxNQUFBLFFBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7b0JBQ0EsZUFBQSxhQUFBO29CQUNBLFNBQUEsd0JBQUEsT0FBQSxNQUFBLEtBQUEsS0FBQSxNQUFBLGNBQUE7b0JBQ0EsTUFBQSxZQUFBLEtBQUE7Z0JBQ0EsTUFBQTtvQkFDQSxRQUFBO29CQUNBLEtBQUE7b0JBQ0EsUUFBQTttQkFDQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUEsT0FBQTttQkFDQSxTQUFBLGVBQUEsT0FBQTtvQkFDQSxRQUFBLElBQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOzs7WUFHQSxZQUFBLFVBQUEsUUFBQTtnQkFDQSxJQUFBLFdBQUEsYUFBQTtvQkFDQSxPQUFBLGFBQUE7b0JBQ0EsTUFBQSxZQUFBLEtBQUE7b0JBQ0EsT0FBQSxhQUFBO29CQUNBLGVBQUEsYUFBQTtvQkFDQSxTQUFBLGFBQUE7b0JBQ0EsWUFBQSxhQUFBLEtBQUEsT0FBQSxLQUFBLE1BQUEsVUFBQSxPQUFBLFdBQUEsTUFBQSxPQUFBLFlBQUEsY0FBQSxRQUFBLE9BQUEsY0FBQSxPQUFBLGNBQUEsT0FBQTtvQkFDQSxJQUFBLEdBQUE7OztnQkFHQSxZQUFBLEVBQUEsT0FBQSxXQUFBLFVBQUEsT0FBQTtvQkFDQSxPQUFBLFVBQUEsUUFBQSxPQUFBLFVBQUE7OztnQkFHQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQTtvQkFDQSxRQUFBO21CQUNBLEtBQUEsU0FBQSxpQkFBQSxNQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxTQUFBLGVBQUEsT0FBQTtvQkFDQSxRQUFBLElBQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOzs7WUFHQSxnQkFBQSxVQUFBLEtBQUEsS0FBQSxPQUFBLE1BQUEsWUFBQTtnQkFDQSxJQUFBLFdBQUEsYUFBQTtvQkFDQSxlQUFBLGFBQUE7b0JBQ0EsTUFBQSxZQUFBLEtBQUE7b0JBQ0EsT0FBQSxhQUFBO29CQUNBLFNBQUEsYUFBQTtvQkFDQSxTQUFBLHdCQUFBLEtBQUEsS0FBQSxPQUFBLE1BQUEsTUFBQSxZQUFBLFVBQUEsY0FBQTtvQkFDQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBO29CQUNBLFFBQUE7bUJBQ0EsS0FBQSxTQUFBLGlCQUFBLE1BQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLFNBQUEsZUFBQSxPQUFBO29CQUNBLFFBQUEsSUFBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7Ozs7OztBQzdMQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxRQUFBLDRDQUFBLFVBQUEsVUFBQTs7UUFFQSxJQUFBLFdBQUEsVUFBQSxRQUFBO1lBQ0EsSUFBQSxTQUFBLEdBQUE7Z0JBQ0EsT0FBQSxLQUFBLEtBQUE7O2lCQUVBO2dCQUNBLE9BQUEsS0FBQSxNQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE1BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxJQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE9BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxLQUFBO2dCQUNBLFVBQUEsVUFBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxlQUFBOzs7Ozs7O1FBT0EsYUFBQSxxQkFBQSxVQUFBLEtBQUEsS0FBQTtZQUNBLElBQUEsQ0FBQSxPQUFBLFFBQUEsTUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLE9BQUEsT0FBQSxRQUFBLE1BQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxLQUFBO2dCQUNBLElBQUEsVUFBQTtvQkFDQSxLQUFBLENBQUEsY0FBQSxNQUFBLGNBQUE7b0JBQ0EsSUFBQSxDQUFBLEtBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLElBQUE7b0JBQ0EsUUFBQSxPQUFBLFNBQUEsS0FBQSxLQUFBOztnQkFFQSxPQUFBO21CQUNBLElBQUEsRUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQSxJQUFBLEVBQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxNQUFBO2dCQUNBLE9BQUE7Ozs7Ozs7OztRQVNBLGFBQUEsc0JBQUEsVUFBQSxRQUFBLFFBQUE7WUFDQSxJQUFBLFdBQUEsV0FBQSxXQUFBLFdBQUEsV0FBQTtZQUNBLFNBQUEsT0FBQSxRQUFBLFdBQUEsSUFBQSxNQUFBO1lBQ0EsU0FBQSxPQUFBLFFBQUEsV0FBQSxJQUFBLE1BQUE7O1lBRUEsSUFBQSxPQUFBLFVBQUEsR0FBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsSUFBQTttQkFDQSxJQUFBLE9BQUEsV0FBQSxHQUFBO2dCQUNBLFNBQUEsT0FBQSxHQUFBLE1BQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsS0FBQSxNQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxJQUFBOztZQUVBLElBQUEsT0FBQSxVQUFBLEdBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLElBQUE7bUJBQ0EsSUFBQSxPQUFBLFdBQUEsR0FBQTtnQkFDQSxTQUFBLE9BQUEsR0FBQSxNQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEtBQUEsTUFBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsTUFBQSxHQUFBLENBQUEsSUFBQTs7O1lBR0E7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLENBQUEsT0FBQSxhQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQSxDQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUE7Y0FDQTtnQkFDQSxJQUFBLFVBQUE7b0JBQ0EsS0FBQTt3QkFDQSxZQUFBLE1BQUEsWUFBQSxPQUFBLFlBQUE7d0JBQ0EsWUFBQSxNQUFBLFlBQUEsT0FBQSxZQUFBO29CQUNBLElBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsUUFBQSxHQUFBLE1BQUEsSUFBQTtvQkFDQSxRQUFBLE9BQUEsU0FBQSxRQUFBLEdBQUEsSUFBQSxRQUFBLEdBQUEsSUFBQTs7Z0JBRUEsT0FBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7Ozs7Ozs7Ozs7UUFlQSxhQUFBLHVCQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsU0FBQTtZQUNBLFNBQUEsT0FBQSxJQUFBOztZQUVBLElBQUEsTUFBQSxPQUFBLE9BQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQTs7Z0JBRUEsT0FBQSxLQUFBLEtBQUEsTUFBQSxPQUFBLEtBQUEsT0FBQTtnQkFDQSxPQUFBLEtBQUEsS0FBQSxNQUFBLE9BQUEsS0FBQSxPQUFBO2dCQUNBLE9BQUE7b0JBQ0EsTUFBQTtvQkFDQSxJQUFBO29CQUNBLEtBQUEsQ0FBQSxjQUFBLE9BQUEsS0FBQSxjQUFBLE9BQUE7Ozs7O1FBS0EsYUFBQSxlQUFBLFVBQUEsS0FBQTtZQUNBLFFBQUEsQ0FBQSxPQUFBLFFBQUEsS0FBQSxRQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsT0FBQTs7UUFFQSxhQUFBLGVBQUEsVUFBQSxLQUFBO1lBQ0EsU0FBQSxDQUFBLE9BQUEsUUFBQSxLQUFBLFFBQUEsT0FBQSxPQUFBLENBQUEsT0FBQSxPQUFBOzs7UUFHQSxhQUFBLGdCQUFBLFVBQUEsUUFBQTtZQUNBLElBQUEsV0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxXQUFBLFdBQUE7WUFDQSxTQUFBLE9BQUEsUUFBQSxXQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsVUFBQSxHQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxJQUFBO21CQUNBLElBQUEsT0FBQSxXQUFBLEdBQUE7Z0JBQ0EsU0FBQSxPQUFBLEdBQUEsTUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLElBQUE7O1lBRUE7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUE7Ozs7UUFJQSxhQUFBLGdCQUFBLFVBQUEsUUFBQTtZQUNBLElBQUEsV0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxXQUFBLFdBQUE7WUFDQSxTQUFBLE9BQUEsUUFBQSxXQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsVUFBQSxHQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxJQUFBO21CQUNBLElBQUEsT0FBQSxXQUFBLEdBQUE7Z0JBQ0EsU0FBQSxPQUFBLEdBQUEsTUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLElBQUE7OztZQUdBO2dCQUNBLGFBQUEsS0FBQSxZQUFBO2dCQUNBLGFBQUEsS0FBQSxZQUFBO2dCQUNBLGFBQUEsQ0FBQSxPQUFBLGFBQUE7Z0JBQ0EsV0FBQSxhQUFBLFdBQUEsWUFBQSxRQUFBLFdBQUEsWUFBQSxXQUFBLENBQUE7Z0JBQ0EsV0FBQSxhQUFBLFdBQUEsWUFBQSxRQUFBLFdBQUEsWUFBQSxXQUFBOzs7O1FBSUEsYUFBQSxjQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsU0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsT0FBQSxPQUFBO1lBQ0EsT0FBQSxDQUFBLENBQUEsS0FBQSxNQUFBOzs7UUFHQSxPQUFBOzs7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LEdBQUEsTUFBQTs7OztRQUlBLElBQUEsR0FBQSxTQUFBLEdBQUEsTUFBQTtZQUNBLFdBQUEsb0JBQUE7Z0JBQ0EsT0FBQSxPQUFBLElBQUEsR0FBQSxPQUFBO2dCQUNBLE1BQUEsT0FBQSxJQUFBLEdBQUEsTUFBQTs7OztRQUlBLE9BQUE7WUFDQSxPQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLE9BQUEsVUFBQSxNQUFBO2dCQUNBLFdBQUEsS0FBQTs7WUFFQSxnQkFBQSxZQUFBO2dCQUNBLE9BQUE7O1lBRUEsZ0JBQUEsVUFBQSxNQUFBO2dCQUNBLGNBQUE7O1lBRUEsYUFBQSxZQUFBO2dCQUNBLE9BQUEsV0FBQTs7WUFFQSxhQUFBLFVBQUEsTUFBQTtnQkFDQSxXQUFBLFdBQUE7Z0JBQ0EsR0FBQSxPQUFBOztnQkFFQSxVQUFBLE9BQUE7O1lBRUEsdUJBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLHVCQUFBLFVBQUEsTUFBQTtnQkFDQSxxQkFBQTs7WUFFQSxlQUFBLFVBQUEsVUFBQTtnQkFDQSxJQUFBLENBQUEsU0FBQSxRQUFBO29CQUNBLFNBQUEsU0FBQSxZQUFBO29CQUNBLEtBQUEsa0JBQUEsU0FBQTs7O2dCQUdBLElBQUEsV0FBQSxLQUFBLFVBQUEsU0FBQSxTQUFBLFdBQUEsS0FBQSxVQUFBLFNBQUEsU0FBQSxXQUFBLEtBQUEsU0FBQSxTQUFBLFFBQUEsV0FBQSxLQUFBLFNBQUEsU0FBQSxRQUFBLFdBQUEsbUJBQUEsU0FBQSxVQUFBLFdBQUEsS0FBQSxXQUFBLFNBQUEsVUFBQSxXQUFBLEtBQUEsV0FBQSxTQUFBLFFBQUE7b0JBQ0EsSUFBQSxTQUFBLFVBQUEsTUFBQSxTQUFBLFVBQUEsTUFBQSxTQUFBLFNBQUEsTUFBQSxTQUFBLFNBQUEsTUFBQSxTQUFBLFdBQUEsTUFBQTt3QkFDQSxTQUFBLFFBQUEsV0FBQSxTQUFBLE9BQUEsUUFBQTt3QkFDQSxTQUFBLFFBQUEsV0FBQSxTQUFBLE9BQUEsUUFBQTt3QkFDQSxTQUFBLE9BQUEsV0FBQSxTQUFBLE1BQUEsUUFBQTt3QkFDQSxTQUFBLE9BQUEsV0FBQSxTQUFBLE1BQUEsUUFBQTs7b0JBRUEsS0FBQSxRQUFBO29CQUNBLEdBQUEsSUFBQSxTQUFBLFVBQUEsS0FBQSxPQUFBLFNBQUE7b0JBQ0EsR0FBQSxJQUFBLFNBQUEsVUFBQSxLQUFBLE9BQUEsU0FBQTtvQkFDQSxHQUFBLElBQUEsU0FBQSxTQUFBLEtBQUEsT0FBQSxTQUFBO29CQUNBLEdBQUEsSUFBQSxTQUFBLFNBQUEsS0FBQSxPQUFBLFNBQUE7b0JBQ0EsR0FBQSxpQkFBQSxTQUFBLFdBQUEsS0FBQSxPQUFBLFNBQUE7b0JBQ0EsR0FBQSxLQUFBLFNBQUEsV0FBQSxLQUFBLE9BQUEsU0FBQTtvQkFDQSxHQUFBLEtBQUEsU0FBQSxXQUFBLEtBQUEsT0FBQSxTQUFBO29CQUNBLEtBQUEsa0JBQUEsR0FBQTtvQkFDQSxVQUFBLE9BQUE7OztZQUdBLFNBQUEsWUFBQTtnQkFDQSxPQUFBLFdBQUE7O1lBRUEsU0FBQSxVQUFBLEtBQUE7Z0JBQ0EsV0FBQSxPQUFBOztZQUVBLG9CQUFBLFlBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxvQkFBQSxVQUFBLGNBQUE7Z0JBQ0Esa0JBQUE7O1lBRUEsY0FBQSxZQUFBO2dCQUNBLE9BQUEsV0FBQTs7WUFFQSxjQUFBLFVBQUEsTUFBQTtnQkFDQSxXQUFBLFlBQUE7Z0JBQ0EsR0FBQSxNQUFBLEtBQUE7Z0JBQ0EsR0FBQSxNQUFBLEtBQUE7Z0JBQ0EsR0FBQSxPQUFBLEtBQUE7Z0JBQ0EsVUFBQSxPQUFBOztZQUVBLG1CQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLG1CQUFBLFVBQUEsUUFBQTtnQkFDQSxXQUFBLGlCQUFBO2dCQUNBLEdBQUEsaUJBQUE7Z0JBQ0EsVUFBQSxPQUFBOztZQUVBLGtCQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLGtCQUFBLFVBQUEsT0FBQTtnQkFDQSxXQUFBLGdCQUFBOztZQUVBLHNCQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLHNCQUFBLFVBQUEsV0FBQTtnQkFDQSxXQUFBLG9CQUFBOztZQUVBLHFCQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLHFCQUFBLFVBQUEsVUFBQTtnQkFDQSxXQUFBLG1CQUFBO2dCQUNBLEdBQUEsbUJBQUEsU0FBQTtnQkFDQSxVQUFBLE9BQUE7O1lBRUEsd0JBQUEsWUFBQTtnQkFDQSxPQUFBLFdBQUE7O1lBRUEsd0JBQUEsVUFBQSxLQUFBO2dCQUNBLFdBQUEsc0JBQUE7Z0JBQ0EsR0FBQSxzQkFBQTtnQkFDQSxVQUFBLE9BQUE7O1lBRUEsa0JBQUEsWUFBQTtnQkFDQSxPQUFBLFdBQUE7O1lBRUEsa0JBQUEsVUFBQSxPQUFBO2dCQUNBLFdBQUEsZ0JBQUE7O1lBRUEsb0JBQUEsWUFBQTtnQkFDQSxPQUFBLFdBQUE7O1lBRUEsb0JBQUEsVUFBQSxTQUFBO2dCQUNBLFdBQUEsa0JBQUE7O1lBRUEsaUJBQUEsWUFBQTtnQkFDQSxPQUFBLFdBQUE7O1lBRUEsaUJBQUEsVUFBQSxTQUFBO2dCQUNBLFdBQUEsZUFBQTs7WUFFQSxpQkFBQSxZQUFBO2dCQUNBLE9BQUEsV0FBQTs7WUFFQSxpQkFBQSxVQUFBLE9BQUE7Z0JBQ0EsV0FBQSxlQUFBOztZQUVBLGlCQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLGlCQUFBLFVBQUEsT0FBQSxNQUFBO2dCQUNBLFdBQUEsZUFBQTtvQkFDQSxPQUFBO29CQUNBLE1BQUE7OztZQUdBLGtCQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLGtCQUFBLFVBQUEsVUFBQTtnQkFDQSxXQUFBLGdCQUFBOztZQUVBLHNCQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLHNCQUFBLFVBQUEsT0FBQSxNQUFBO2dCQUNBLFdBQUEsb0JBQUE7b0JBQ0EsT0FBQTtvQkFDQSxNQUFBOzs7WUFHQSxpQkFBQSxZQUFBO2dCQUNBLE9BQUEsV0FBQTs7WUFFQSxpQkFBQSxVQUFBLE9BQUEsTUFBQTtnQkFDQSxXQUFBLGVBQUE7b0JBQ0EsT0FBQTtvQkFDQSxNQUFBOzs7WUFHQSxlQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLGVBQUEsWUFBQTtnQkFDQSxXQUFBLGFBQUEsQ0FBQSxXQUFBOztZQUVBLG1CQUFBLFVBQUEsT0FBQTtnQkFDQSxXQUFBLGlCQUFBO2dCQUNBLElBQUEsVUFBQSxNQUFBO29CQUNBLEdBQUEsaUJBQUEsUUFBQSxNQUFBLGFBQUEsWUFBQSxzQkFBQTtvQkFDQSxVQUFBLE9BQUE7OztZQUdBLG1CQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLG9CQUFBLFVBQUEsT0FBQTtnQkFDQSxXQUFBLGtCQUFBO2dCQUNBLEdBQUEsa0JBQUE7Z0JBQ0EsVUFBQSxPQUFBOztZQUVBLG9CQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLGFBQUEsVUFBQSxPQUFBO2dCQUNBLFdBQUEsZUFBQTs7WUFFQSxhQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLFFBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLFFBQUEsVUFBQSxhQUFBO2dCQUNBLE1BQUE7O1lBRUEsWUFBQSxVQUFBLE1BQUE7Z0JBQ0EsV0FBQSxVQUFBO2dCQUNBLFFBQUEsSUFBQSxxQkFBQTs7WUFFQSxZQUFBLFlBQUE7Z0JBQ0EsT0FBQSxXQUFBOztZQUVBLGNBQUEsWUFBQTtnQkFDQSxJQUFBLElBQUEsV0FBQTtvQkFDQSxJQUFBLFNBQUEsSUFBQTtvQkFDQSxJQUFBLFFBQUE7d0JBQ0EsSUFBQSxrQkFBQSxFQUFBLGFBQUEsWUFBQSxVQUFBLFdBQUEsWUFBQSxVQUFBOzRCQUNBLGFBQUEsZ0JBQUEsU0FBQTs7d0JBRUEsSUFBQSxDQUFBLFlBQUE7NEJBQ0EsT0FBQTtnQ0FDQSxPQUFBLE9BQUEsV0FBQSxNQUFBLGdCQUFBLFdBQUEsTUFBQSxnQkFBQSxXQUFBLE1BQUEsT0FBQSxXQUFBO2dDQUNBLE9BQUEsT0FBQSxXQUFBLE1BQUEsZ0JBQUEsV0FBQSxNQUFBLGdCQUFBLFdBQUEsTUFBQSxPQUFBLFdBQUE7Z0NBQ0EsTUFBQSxPQUFBLFdBQUEsTUFBQSxnQkFBQSxXQUFBLE1BQUEsZ0JBQUEsV0FBQSxNQUFB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QUFBLFVBQUEsSUFBQTtnQkFDQSxLQUFBLE1BQUEsVUFBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTtvQkFDQSxTQUFBO3dCQUNBLFlBQUEsYUFBQSxVQUFBOzs7Z0JBR0EsTUFBQTtvQkFDQSxRQUFBO29CQUNBLEtBQUEsWUFBQSxLQUFBLFdBQUEsWUFBQTtvQkFDQSxNQUFBO21CQUNBLEtBQUEsU0FBQSxnQkFBQSxRQUFBO29CQUNBLFFBQUEsSUFBQTtvQkFDQSxFQUFBLFFBQUE7bUJBQ0EsU0FBQSxjQUFBLE9BQUE7b0JBQ0EsUUFBQSxJQUFBO29CQUNBLEVBQUEsT0FBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxhQUFBLFVBQUEsVUFBQTtnQkFDQSxLQUFBLE1BQUEsVUFBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTtvQkFDQSxTQUFBO3dCQUNBLFdBQUEsWUFBQTt3QkFDQSxVQUFBO3dCQUNBLFlBQUEsYUFBQSxVQUFBOzs7Z0JBR0EsTUFBQTtvQkFDQSxRQUFBO29CQUNBLEtBQUEsWUFBQSxLQUFBO29CQUNBLE1BQUE7bUJBQ0EsS0FBQSxTQUFBLGdCQUFBLFFBQUE7b0JBQ0EsUUFBQSxJQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxTQUFBLGNBQUEsT0FBQTtvQkFDQSxRQUFBLElBQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOztZQUVBLFdBQUEsWUFBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTs7Z0JBRUEsTUFBQTtvQkFDQSxRQUFBO29CQUNBLEtBQUEsWUFBQSxLQUFBLFdBQUE7bUJBQ0EsS0FBQSxTQUFBLGlCQUFBLFFBQUE7b0JBQ0EsRUFBQSxRQUFBLE9BQUE7bUJBQ0EsU0FBQSxlQUFBLE9BQUE7b0JBQ0EsUUFBQSxJQUFBO29CQUNBLEVBQUEsT0FBQTs7O2dCQUdBLE9BQUEsRUFBQTs7WUFFQSxhQUFBLFVBQUEsSUFBQTtnQkFDQSxJQUFBLElBQUEsR0FBQTs7Z0JBRUEsTUFBQTtvQkFDQSxRQUFBO29CQUNBLEtBQUEsWUFBQSxLQUFBLFdBQUEsWUFBQTttQkFDQSxLQUFBLFNBQUEsZ0JBQUEsUUFBQTtvQkFDQSxRQUFBLElBQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLFNBQUEsY0FBQSxPQUFBO29CQUNBLFFBQUEsSUFBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7Ozs7Ozs7QUNua0JBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFdBQUEsNkxBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxLQUFBO1lBQ0EsS0FBQSxVQUFBO1lBQ0EsaUJBQUEsR0FBQSxtQkFBQTs7UUFFQSxHQUFBLGVBQUE7UUFDQSxHQUFBLGNBQUE7UUFDQSxHQUFBLE9BQUE7UUFDQSxHQUFBLE9BQUEsR0FBQSxRQUFBLGFBQUE7O1FBRUEsSUFBQSxjQUFBLG1CQUFBLG1CQUFBLFNBQUEsV0FBQTs7UUFFQSxJQUFBLDBCQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsWUFBQTtnQkFDQSxvQkFBQSxhQUFBOzs7WUFHQSxJQUFBLFVBQUEsT0FBQSxJQUFBLGtCQUFBLE1BQUEsS0FBQSxPQUFBLElBQUEsa0JBQUEsUUFBQSxPQUFBOzs7WUFHQSxLQUFBLElBQUEsSUFBQSxHQUFBLElBQUEsU0FBQSxLQUFBO2dCQUNBLElBQUEsT0FBQSxPQUFBLElBQUEsa0JBQUEsT0FBQSxRQUFBLEtBQUEsSUFBQSxHQUFBLEtBQUE7b0JBQ0EsUUFBQSxFQUFBLEtBQUEsVUFBQSxFQUFBLE1BQUE7O2dCQUVBLFVBQUEsS0FBQTtvQkFDQSxNQUFBO29CQUNBLE9BQUEsUUFBQSxNQUFBLFFBQUE7Ozs7WUFJQSxPQUFBOzs7UUFHQSxJQUFBLGFBQUEsWUFBQTtZQUNBLElBQUEsaUJBQUEsWUFBQTtnQkFDQSxPQUFBLGNBQUEsY0FBQSxLQUFBLFVBQUEsTUFBQTt3QkFDQSxhQUFBLFlBQUEsS0FBQSxLQUFBO3VCQUNBLFVBQUEsT0FBQTt3QkFDQSxhQUFBLFVBQUEsT0FBQTs7Ozs7WUFLQSxJQUFBLHdCQUFBLEVBQUEsU0FBQSxZQUFBO2dCQUNBLGNBQUEsd0JBQUEsS0FBQSxVQUFBLFFBQUE7b0JBQ0EsSUFBQSxPQUFBLE9BQUE7O29CQUVBLElBQUEsV0FBQTs7O29CQUdBLEVBQUEsUUFBQSxLQUFBLFNBQUEsVUFBQSxRQUFBO3dCQUNBLFNBQUEsS0FBQTs0QkFDQSxNQUFBLE9BQUEsSUFBQSxPQUFBLEtBQUEsWUFBQTs0QkFDQSxPQUFBLE9BQUE7Ozs7O29CQUtBLFdBQUEsRUFBQSxPQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUE7O29CQUVBLElBQUEsWUFBQSx3QkFBQTs7b0JBRUEsSUFBQSxFQUFBLElBQUEsZUFBQSxLQUFBLEVBQUEsSUFBQSxlQUFBLGFBQUE7d0JBQ0EsT0FBQTs0QkFDQSxPQUFBOzRCQUNBLFNBQUE7NEJBQ0EsTUFBQTs7Ozs7b0JBS0EsYUFBQSx1QkFBQTttQkFDQSxVQUFBLE9BQUE7b0JBQ0EsSUFBQSxZQUFBLHdCQUFBO29CQUNBLGFBQUEsdUJBQUE7b0JBQ0EsYUFBQSxVQUFBLE9BQUE7O2VBRUE7O1lBRUEsZUFBQSxPQUFBLGlCQUFBLGtDQUFBLEVBQUEsU0FBQSxVQUFBLFVBQUEsVUFBQTtnQkFDQSxJQUFBLEVBQUEsS0FBQSxVQUFBLFNBQUEsS0FBQSxHQUFBLFNBQUEsVUFBQTtvQkFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7d0JBQ0E7O29CQUVBLElBQUEsZ0JBQUE7d0JBQ0E7OztlQUdBLFlBQUE7O1lBRUEsb0JBQUEsT0FBQSxpQkFBQSx1Q0FBQSxFQUFBLFNBQUEsVUFBQSxVQUFBO2dCQUNBLElBQUEsRUFBQSxLQUFBLFVBQUEsU0FBQSxLQUFBLEdBQUEsU0FBQSxVQUFBO29CQUNBLElBQUEsZ0JBQUE7d0JBQ0E7NkJBQ0EsS0FBQTsyQkFDQTt3QkFDQSxTQUFBLFlBQUE7NEJBQ0EsSUFBQSxZQUFBLHdCQUFBOzRCQUNBLGFBQUEsdUJBQUE7Ozs7ZUFJQSxZQUFBOztZQUVBLG9CQUFBLE9BQUEsT0FBQSx1Q0FBQSxVQUFBLFVBQUEsVUFB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Ozs7QUNWQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxXQUFBLHVIQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7WUFDQSxLQUFBLFVBQUE7O1FBRUEsR0FBQSxlQUFBO1FBQ0EsR0FBQSxXQUFBO1lBQ0EsUUFBQSxHQUFBLGtCQUFBLFlBQUE7WUFDQSxPQUFBLEdBQUEsS0FBQTtZQUNBLE9BQUEsR0FBQSxLQUFBO1lBQ0EsTUFBQSxHQUFBLEtBQUE7WUFDQSxNQUFBLEdBQUEsS0FBQTtZQUNBLFFBQUEsR0FBQSxNQUFBO1lBQ0EsUUFBQSxHQUFBLE1BQUE7O1FBRUEsR0FBQSxPQUFBLE9BQUEsUUFBQTs7UUFFQSxHQUFBLFlBQUEsVUFBQSxXQUFBO1lBQ0EsSUFBQSxJQUFBO1lBQ0EsUUFBQSxHQUFBLFNBQUE7Z0JBQ0EsS0FBQTtvQkFDQSxLQUFBLDRCQUFBLG1CQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUEsU0FBQTtvQkFDQSxLQUFBLDRCQUFBLG1CQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUEsU0FBQTtvQkFDQTtnQkFDQSxLQUFBO29CQUNBLEtBQUEsNEJBQUEsb0JBQUEsR0FBQSxTQUFBLE9BQUEsR0FBQSxTQUFBO29CQUNBLEtBQUEsNEJBQUEsb0JBQUEsR0FBQSxTQUFBLE9BQUEsR0FBQSxTQUFBO29CQUNBO2dCQUNBLEtBQUE7b0JBQ0EsSUFBQSxHQUFBLFNBQUEsUUFBQTt3QkFDQSxLQUFBLDRCQUFBLHFCQUFBLEdBQUEsU0FBQTs7b0JBRUEsSUFBQSxHQUFBLFNBQUEsUUFBQTt3QkFDQSxLQUFBLDRCQUFBLHFCQUFBLEdBQUEsU0FBQTs7b0JBRUE7O1lBRUEsR0FBQSxTQUFBLFFBQUE7WUFDQSxHQUFBLFNBQUEsT0FBQTtZQUNBLEdBQUEsU0FBQSxRQUFBO1lBQ0EsR0FBQSxTQUFBLE9BQUE7WUFDQSxHQUFBLFNBQUEsU0FBQTtZQUNBLEdBQUEsU0FBQSxTQUFBOztZQUVBLFFBQUE7Z0JBQ0EsS0FBQTtvQkFDQSxJQUFB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QUNBLGNBQUE7WUFDQSxlQUFBLE9BQUEsQ0FBQSxPQUFBLFFBQUEsYUFBQSxxQkFBQSxNQUFBLE9BQUEsV0FBQTs7UUFFQSxHQUFBLGNBQUE7UUFDQSxHQUFBLGVBQUE7UUFDQSxHQUFBLHFCQUFBOztRQUVBLEdBQUEsYUFBQSxVQUFBO1lBQ0EsSUFBQSxFQUFBLFFBQUEsR0FBQSxtQkFBQSxXQUFBO2dCQUNBLElBQUEsT0FBQSxFQUFBLEtBQUEsR0FBQSxtQkFBQSxTQUFBOzs7Z0JBR0EsSUFBQSxPQUFBLENBQUE7OztnQkFHQSxFQUFBLFFBQUEsR0FBQSxtQkFBQSxVQUFBLFVBQUEsU0FBQTtvQkFDQSxJQUFBLFNBQUE7b0JBQ0EsRUFBQSxRQUFBLE1BQUEsVUFBQSxLQUFBO3dCQUNBLE9BQUEsS0FBQSxRQUFBOztvQkFFQSxLQUFBLEtBQUE7Ozs7Z0JBSUEsSUFBQSxhQUFBO2dCQUNBLEtBQUEsUUFBQSxVQUFBLFdBQUEsT0FBQTtvQkFDQSxJQUFBLGFBQUEsVUFBQSxLQUFBO29CQUNBLGNBQUEsUUFBQSxLQUFBLFNBQUEsWUFBQSxPQUFBOzs7O2dCQUlBLElBQUEsV0FBQSxJQUFBLEtBQUEsQ0FBQSxhQUFBLEVBQUEsTUFBQTtnQkFDQSxVQUFBLE9BQUEsVUFBQTs7OztRQUlBLElBQUEsYUFBQSxZQUFBO1lBQ0EsSUFBQSxFQUFBLFFBQUEsR0FBQSxtQkFBQSxXQUFBOztnQkFFQSxhQUFBLFNBQUEsS0FBQSxZQUFBOztvQkFFQSxhQUFBOztvQkFFQSxJQUFBLGlCQUFBLGFBQUE7d0JBQ0EsV0FBQTt3QkFDQSxxQkFBQSxFQUFBLE9BQUEsR0FBQSxtQkFBQSxVQUFBO3dCQUNBLFlBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxvQkFBQTt3QkFDQSxZQUFBOztvQkFFQSxZQUFBLEVBQUEsSUFBQSxXQUFBLFVBQUEsTUFBQTt3QkFDQSxPQUFBLEtBQUE7Ozs7b0JBSUEsRUFBQSxRQUFBLFlBQUEsT0FBQSxVQUFBLE1BQUE7d0JBQ0EsVUFBQSxLQUFBLFFBQUEsS0FBQTs7OztvQkFJQSxFQUFBLFFBQUEsb0JBQUEsVUFBQSxNQUFBO3dCQUNBLElBQUEsVUFBQTs0QkFDQSxNQUFBLEtBQUE7O3dCQUVBLElBQUEsT0FBQSxLQUFBLEtBQUE7d0JBQ0EsUUFBQSxRQUFBLEtBQUE7d0JBQ0EsU0FBQSxLQUFBOzs7O29CQUlBLElBQUEsT0FBQSxPQUFBLElBQUEsZUFBQSxNQUFBLEtBQUEsT0FBQSxJQUFBLG1CQUFBLG1CQUFBLFNBQUEsR0FBQSxPQUFBO3dCQUNBLFdBQUEsT0FBQSxJQUFBLG1CQUFBLG1CQUFBLFNBQUEsR0FBQSxNQUFBOztvQkFFQSxLQUFBLElBQUEsSUFBQSxHQUFBLEtBQUEsTUFBQSxLQUFBO3dCQUNBLFNBQUEsS0FBQTs0QkFDQSxNQUFBLE9BQUEsSUFBQSxVQUFBLElBQUEsR0FBQTs7OztvQkFJQSxHQUFBLFNBQUE7d0JBQ0EsUUFBQSxTQUFBLGVBQUE7d0JBQ0EsTUFBQTs0QkFDQSxNQUFBOzRCQUNBLE1BQUE7Z0NBQ0EsR0FBQTtnQ0FDQSxPQUFBOzs0QkFFQSxTQUFBOzRCQUNBLE1BQUE7NEJBQ0EsT0FBQTs7d0JBRUEsTUFBQTs0QkFDQSxRQUFBOzt3QkFFQSxNQUFBOzRCQUNBLEdBQUE7Z0NBQ0EsTUFBQTtnQ0FDQSxPQUFBO2dDQUNBLE1BQUE7b0NBQ0EsUUFBQTtvQ0FDQSxTQUFBO29DQUNBLE9BQUEsS0FBQSxNQUFBLE9BQUEsSUFBQSxtQkFBQSxtQkFBQSxTQUFBLEdBQUEsTUFBQSxLQUFBLE9BQUEsSUFBQSxtQkFBQSxHQUFBLE9BQUEsT0FBQTs7OzRCQUdBLEdBQUE7Z0NBQ0EsT0FBQTs7O3dCQUdBLE1BQUE7NEJBQ0EsR0FBQTtnQ0FDQSxNQUFBOzs0QkFFQSxHQUFBO2dDQUNBLE1BQUE7Ozt3QkFHQSxPQUFBOzRCQUNBLEdBQUE7O3dCQUVBLE1BQUE7NEJBQ0EsU0FBQTs0QkFDQSxTQUFBOzt3QkFFQSxTQUFBOzRCQUNBLFFBQUE7Z0NBQ0EsT0FBQSxVQUFBLEdBQUEsRUFBQSxPQUFBLE9BQUEsSUFBQSxHQUFBLE9BQUE7Ozs7Ozs7O1FBUUEsSUFBQSxhQUFBLFlBQUE7WUFDQSxJQUFBLGVBQUEsYUFBQTtZQUNBLGNBQUEsYUFBQSxTQUFBOzs7UUFHQTs7UUFFQSxPQUFBLGlCQUFBLDJDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxZQUFBLEVBQUEsS0FBQSxVQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLEVBQUEsUUFBQSxVQUFBLFdBQUE7b0JBQ0E7O2dCQUVBLEdBQUEscUJBQUE7Z0JBQ0E7Ozs7OztBQ2xLQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxVQUFBLHVCQUFBLFlBQUE7UUFDQSxPQUFBO1lBQ0EsVUFBQTtZQUNBLGFBQUE7WUFDQSxZQUFBO1lBQ0EsY0FBQTtZQUNBLE9BQUE7Z0JBQ0EsV0FBQTtnQkFDQSxXQUFBOzs7OztBQ1hBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFFBQUEseUJBQUEsVUFBQSxJQUFBO1FBQ0EsT0FBQSxTQUFBLGlCQUFBOztZQUVBLElBQUEsU0FBQSxDQUFBLEtBQUEsSUFBQSxPQUFBLElBQUEsUUFBQSxJQUFBLE1BQUE7WUFDQSxJQUFBLFlBQUE7WUFDQSxJQUFBLG9CQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUEsbUJBQUE7WUFDQSxJQUFBLFNBQUEsQ0FBQSxHQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUEsY0FBQTtZQUNBLElBQUEsbUJBQUE7WUFDQSxJQUFBLHFCQUFBOzs7WUFHQSxJQUFBLFVBQUE7WUFDQSxJQUFBLFdBQUE7WUFDQSxJQUFBLE9BQUE7WUFDQSxJQUFBLGNBQUE7WUFDQSxJQUFBLE9BQUEsR0FBQSxJQUFBOzs7WUFHQSxTQUFBLEtBQUEsR0FBQTtnQkFDQSxXQUFBLEdBQUEsTUFBQSxTQUFBLE9BQUEsUUFBQSxNQUFBLENBQUEsR0FBQTs7Z0JBRUEsSUFBQSxNQUFBLFFBQUEsRUFBQSxHQUFBLE9BQUE7b0JBQ0EsS0FBQSxJQUFBLElBQUEsR0FBQSxJQUFBLEVBQUEsR0FBQSxLQUFBLFFBQUEsRUFBQSxHQUFBO3dCQUNBLEtBQUEsS0FBQSxFQUFBLEdBQUEsS0FBQSxHQUFBOzt1QkFFQTtvQkFDQSxPQUFBLEdBQUEsSUFBQSxFQUFBLEdBQUEsTUFBQTs7Z0JBRUEsVUFBQSxLQUFBOzs7Z0JBR0EsY0FBQSxZQUFBOzs7WUFHQSxTQUFBLFVBQUEsR0FBQTtnQkFDQSxPQUFBLFlBQUEsQ0FBQSxJQUFBOzs7WUFHQSxTQUFBLGFBQUEsR0FBQSxHQUFBO2dCQUNBLE9BQUEsZUFBQSxDQUFBLElBQUEsTUFBQSxDQUFBLElBQUE7OztZQUdBLFNBQUEsVUFBQSxXQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBLE9BQUE7cUJBQ0EsT0FBQTtxQkFDQSxNQUFBLFNBQUEsSUFBQSxZQUFBLE9BQUEsT0FBQSxPQUFBLFFBQUE7cUJBQ0EsTUFBQSxVQUFBLElBQUEsWUFBQSxPQUFBLE1BQUEsT0FBQSxTQUFBO3FCQUNBLE9BQUE7cUJBQ0EsUUFBQSxtQkFBQTtxQkFDQSxLQUFBLGFBQUEsYUFBQSxPQUFBLE9BQUEsV0FBQSxPQUFBLE1BQUE7OztnQkFHQSxFQUFBLE9BQUE7cUJBQ0EsUUFBQSxnQkFBQTtxQkFDQSxVQUFBO3FCQUNBLEtBQUE7cUJBQ0E7cUJBQ0EsT0FBQTtxQkFDQSxLQUFBLEtBQUEsU0FBQSxHQUFBLENBQUEsT0FBQSxTQUFBO3FCQUNBLE1BQUEsUUFBQTs7O1lBR0EsU0FBQSxlQUFBLFdBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUEsT0FBQSxXQUFBLE9BQUE7OztnQkFHQSxFQUFBLE9BQUE7cUJBQ0EsUUFBQSxVQUFBO3FCQUNBLFVBQUE7cUJBQ0EsS0FBQTtxQkFDQTtxQkFDQSxPQUFBO3FCQUNBLEtBQUEsTUFBQSxDQUFBO3FCQUNBLEtBQUEsYUFBQSxTQUFBLEdBQUEsR0FBQSxDQUFBLE9BQUEsVUFBQSxJQUFBLE1BQUE7OztnQkFHQSxJQUFBLFlBQUEsR0FBQSxNQUFBLFNBQUEsT0FBQSxRQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUE7Z0JBQ0EsS0FBQSxNQUFBLFdBQUEsT0FBQTtnQkFDQSxHQUFBLFdBQUE7b0JBQ0EsS0FBQSxXQUFBOztnQkFFQSxFQUFBLE9BQUE7cUJBQ0EsUUFBQSxRQUFBO3FCQUNBLEtBQUE7OztnQkFHQSxFQUFBLE9BQUE7cUJBQ0EsS0FBQSxLQUFBO3FCQUNBLFFBQUEsU0FBQTtxQkFDQSxNQUFBLFFBQUE7OztnQkFHQSxJQUFBLFNBQUEsRUFBQSxPQUFBO3FCQUNBLFFBQUEsVUFBQTs7Z0JBRUEsT0FBQSxPQUFBO3FCQUNBLE9BQUE7cUJBQ0EsS0FBQSxNQUFBO3FCQUNBLEtBQUEsS0FBQSxRQUFBLENBQUEsY0FBQSxPQUFBLGNBQUEsTUFBQSxjQUFBOztnQkFFQSxPQUFBLFVBQUE7cUJBQ0EsS0FBQTtxQkFDQTtxQkFDQSxPQUFBO3FCQUNBLE1BQUEsZUFBQTtxQkFDQSxNQUFBLFFBQUEsU0FBQSxHQUFBLEdBQUEsQ0FBQSxPQUFBLGNBQUEsVUFBQSxJQUFBLFVBQUEsVUFBQTtxQkFDQSxPQUFBO3FCQUNBLEtBQUEsY0FBQTtxQkFDQSxLQUFBLGVBQUEsU0FBQSxHQUFBLEdBQUEsQ0FBQSxPQUFBLElBQUEsTUFBQSxVQUFBLEtBQUEsVUFBQTtxQkFDQSxLQUFBLFNBQUEsR0FBQSxDQUFBLE9BQUEsbUJBQUEsRUFBQSxnQkFBQTs7OztZQUlBLElBQUEsS0FBQSxTQUFBLEdBQUE7Z0JBQ0EsT0FBQSxTQUFBOztZQUVBLElBQUEsS0FBQSxTQUFBLEdBQUEsR0FBQTtnQkFDQSxPQUFBLENBQUEsSUFBQSxJQUFBLEtBQUEsTUFBQTs7WUFFQSxJQUFBLEtBQUEsU0FBQSxHQUFBLEdBQUE7Z0JBQ0EsT0FBQSxDQUFBLENBQUEsSUFBQSxLQUFBLElBQUEsS0FBQSxNQUFBOzs7WUFHQSxTQUFBLE1BQUEsV0FBQTtnQkFDQSxVQUFBLEtBQUEsU0FBQSxHQUFBO29CQUNBLEtBQUE7O29CQUVBLEdBQUEsa0JBQUE7d0JBQ0EsRUFBQTs7O29CQUdBLElBQUEsSUFBQSxHQUFBLE9BQUEsTUFBQSxPQUFBOzs7b0JBR0EsSUFBQSxTQUFBLEVBQUEsR0FBQSxPQUFBOztvQkFFQSxHQUFBLENBQUEsT0FBQTt3QkFDQSxVQUFBOzs7b0JBR0EsSUFBQSxHQUFBLE9BQUEsTUFBQSxPQUFBOzs7b0JBR0EsSUFBQSxTQUFBLEVBQUEsVUFBQTt5QkFDQSxLQUFBOztvQkFFQTt5QkFDQTt5QkFDQSxPQUFBO3lCQUNBLEtBQUEsU0FBQSxTQUFBLEdBQUEsR0FBQTs0QkFDQSxPQUFBLFdBQUE7O3lCQUVBLFFBQUEsU0FBQTs7b0JBRUEsT0FBQSxPQUFBOzs7b0JBR0EsSUFBQSxXQUFBO3lCQUNBLFVBQUE7eUJBQ0EsS0FBQSxTQUFBLEdBQUE7NEJBQ0EsSUFBQSxJQUFBLEdBQUEsSUFBQSxFQUFBO2dDQUNBLFVBQUEsRUFBQTtnQ0FDQSxPQUFBOzRCQUNBLElBQUEsTUFBQSxRQUFBLFVBQUE7Z0NBQ0EsS0FBQSxJQUFBLElBQUEsR0FBQSxJQUFBLFFBQUEsUUFBQSxFQUFBLEdBQUE7b0NBQ0EsS0FBQSxLQUFBLFFBQUEsR0FBQTs7bUNBRUE7Z0NBQ0EsT0FBQTs7NEJBRUEsT0FBQTs7O29CQUdBO3lCQUNBO3lCQUNBLE9BQUE7eUJBQ0EsTUFBQSxRQUFBLFNBQUEsR0FBQSxHQUFBOzRCQUNBLEdBQUEsQ0FBQSxVQUFBLEVBQUE7NEJBQ0EsT0FBQSxVQUFBLElBQUEsVUFBQTs7O29CQUdBLFNBQUEsT0FBQTs7b0JBRUE7eUJBQ0E7eUJBQ0EsU0FBQTt5QkFDQSxLQUFBLEtBQUEsR0FBQSxJQUFBLE1BQUEsWUFBQSxHQUFBLFlBQUEsSUFBQSxXQUFBLElBQUEsU0FBQTs7b0JBRUEsR0FBQSxDQUFBLFFBQUE7d0JBQ0EsZUFBQTsyQkFDQTt3QkFDQSxJQUFBLFlBQUEsR0FBQSxNQUFBLFNBQUEsT0FBQSxRQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUE7d0JBQ0EsS0FBQSxNQUFBOzZCQUNBLE9BQUE7d0JBQ0EsSUFBQSxXQUFBOzRCQUNBLEtBQUEsV0FBQTs7O3dCQUdBLEdBQUEsT0FBQTs2QkFDQTs2QkFDQSxTQUFBOzZCQUNBLEtBQUE7Ozs7Ozs7WUFPQSxNQUFBLFNBQUEsU0FBQSxHQUFBO2dCQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxPQUFBO2dCQUNBLFNBQUE7Z0JBQ0EsT0FBQTs7O1lBR0EsTUFBQSxZQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsT0FBQTtnQkFDQSxZQUFBO2dCQUNBLE9BQUE7OztZQUdBLE1BQUEsb0JBQUEsU0FBQSxHQUFBO2dCQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxPQUFBO2dCQUNBLG9CQUFBO2dCQUNBLE9BQUE7OztZQUdBLE1BQUEsWUFBQSxTQUFBLEdBQUE7Z0JBQ0EsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE9BQUE7Z0JBQ0EsWUFBQTtnQkFDQSxPQUFBOzs7WUFHQSxNQUFBLG1CQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsT0FBQTtnQkFDQSxtQkFBQTtnQkFDQSxPQUFBOzs7WUFHQSxNQUFBLFNBQUEsU0FBQSxHQUFBO2dCQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxPQUFBO2dCQUNBLFNBQUE7Z0JBQ0EsT0FBQTs7O1lBR0EsTUFBQSxhQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsT0FBQTtnQkFDQSxhQUFBO2dCQUNBLE9BQUE7OztZQUdBLE1BQUEsY0FBQSxTQUFBLEdBQUE7Z0JBQ0EsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE9BQUE7Z0JBQ0EsY0FBQTtnQkFDQSxPQUFBOzs7WUFHQSxNQUFBLG1CQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsT0FBQTtnQkFDQSxtQkFBQTtnQkFDQSxPQUFBOzs7WUFHQSxNQUFBLHFCQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsT0FBQTtnQkFDQSxxQkFBQTtnQkFDQSxPQUFBOzs7WUFHQSxPQUFBOzs7OztBQ25SQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxXQUFBLGlKQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FB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QUEsU0FBQSxXQUFBLE1BQUEsU0FBQSxXQUFBOzs7O1FBSUEsT0FBQSxPQUFBLGlDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOzs7WUFHQSxHQUFBLE9BQUE7WUFDQSxPQUFBLE9BQUE7Ozs7O0FDaEVBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFVBQUEsZ0JBQUEsWUFBQTtRQUNBLE9BQUE7WUFDQSxVQUFBO1lBQ0EsYUFBQTtZQUNBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsT0FBQTtnQkFDQSxNQUFBOzs7Ozs7QUNWQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxXQUFBLG9HQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsS0FBQTs7UUFFQSxHQUFBLGNBQUE7UUFDQSxHQUFBLFdBQUEsT0FBQTtRQUNBLEdBQUEsZ0JBQUE7UUFDQSxHQUFBLFNBQUE7UUFDQSxHQUFBLG1CQUFBOztRQUVBLEdBQUEsaUJBQUEsWUFBQTtZQUNBLEdBQUEsV0FBQSxDQUFBLEdBQUE7OztRQUdBLEdBQUEsY0FBQSxZQUFBO1lBQ0EsYUFBQSxjQUFBLEtBQUEsVUFBQSxRQUFBO2dCQUNBLEdBQUEsT0FBQSxLQUFBLE9BQUE7Z0JBQ0EsR0FBQSxnQkFBQSxPQUFBO2dCQUNBLEdBQUEsVUFBQTtvQkFDQSxPQUFBO29CQUNBLFNBQUEsT0FBQSxTQUFBLFdBQUEsT0FBQSxPQUFBLFNBQUEsT0FBQSxZQUFBLEdBQUEsY0FBQTs7Z0JBRUEsT0FBQTtvQkFDQSxPQUFBO29CQUNBLE1BQUE7b0JBQ0EsV0FBQTtvQkFDQSxXQUFBO29CQUNBLFdBQUE7b0JBQ0EsVUFBQTtvQkFDQSxNQUFBOztlQUVBLFVBQUEsS0FBQTtnQkFDQSxRQUFBLElBQUE7Z0JBQ0EsT0FBQTtvQkFDQSxPQUFBLElBQUEsU0FBQSxDQUFBLElBQUEsWUFBQSxJQUFBLFNBQUE7b0JBQ0EsU0FBQSxJQUFBLFdBQUEsU0FB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O1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBO2dCQUNBLFVBQUE7Ozs7OztBQ1ZBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFdBQUEsa0dBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsS0FBQTtZQUNBLEtBQUEsVUFBQTs7UUFFQSxHQUFBLFdBQUEsT0FBQTtRQUNBLEdBQUEsT0FBQSxPQUFBLFFBQUE7UUFDQSxHQUFBLGdCQUFBLEdBQUEsV0FBQSxRQUFBO1FBQ0EsR0FBQSxtQkFBQSxHQUFBLFdBQUEsT0FBQTtRQUNBLEdBQUEsZUFBQTtRQUNBLEdBQUEsU0FBQTtRQUNBLEdBQUEsUUFBQTtRQUNBLEdBQUEsT0FBQTtRQUNBLEdBQUEsaUJBQUEsR0FBQSxpQkFBQSxTQUFBLEdBQUEsa0JBQUEsWUFBQTtRQUNBLEdBQUEsWUFBQSxZQUFBO1FBQ0EsR0FBQSxtQkFBQSxHQUFBLFdBQUEsRUFBQSxLQUFBLFlBQUEsV0FBQSxFQUFBLE9BQUEsR0FBQSxjQUFBLEVBQUEsS0FBQSxZQUFBLFdBQUEsRUFBQSxTQUFBO1FBQ0EsR0FBQSxTQUFBLFlBQUE7UUFDQSxHQUFBLGVBQUE7O1FBRUEsR0FBQSxvQkFBQSxZQUFBO1lBQ0EsSUFBQSxHQUFBLGtCQUFBO2dCQUNBLEdBQUEsUUFBQSxPQUFBLElBQUEsT0FBQSxNQUFBLE1BQUEsTUFBQSxTQUFBLEdBQUEsZ0JBQUEsR0FBQSxpQkFBQSxPQUFBLFFBQUEsS0FBQTtnQkFDQSxHQUFBLE9BQUEsT0FBQSxNQUFBLE1BQUEsS0FBQTs7O1lBR0EsYUFBQSxrQkFBQTtnQkFDQSxPQUFBLEdBQUE7Z0JBQ0EsTUFBQSxHQUFBO2dCQUNBLFVBQUEsR0FBQSxtQkFBQSxHQUFBLGlCQUFBLFFBQUE7Z0JBQ0EsZ0JBQUEsR0FBQSxtQkFBQSxTQUFBLEdBQUEsa0JBQUE7Ozs7UUFJQSxJQUFBLGFBQUEsWUFBQTtZQUNBLEtBQUEsVUFBQTs7WUFFQSxJQUFBLEdBQUEsZUFBQTtnQkFDQSxHQUFBLFFBQUEsR0FBQSxRQUFBLE9BQUEsSUFBQSxHQUFBLE9BQUEsV0FBQSxPQUFBLE1BQUEsU0FBQSxZQUFBLGlCQUFBLFFBQUEsUUFBQSxLQUFBO2dCQUNBLEdBQUEsT0FBQSxHQUFBLE9BQUEsT0FBQSxJQUFBLEdBQUEsTUFBQSxXQUFBLE9BQUEsTUFBQSxNQUFBLEtBQUE7bUJBQ0EsSUFBQSxHQUFBLGtCQUFBO2dCQUNBLEdBQUEsbUJBQUEsR0FBQSxXQUFBLEVBQUEsS0FBQSxHQUFBLFdBQUEsRUFBQSxPQUFBLEdBQUEsY0FBQSxFQUFBLEtBQUEsR0FBQSxXQUFBLEVBQUEsU0FBQTtnQkFDQSxHQUFBLGlCQUFBLEdBQUEsaUJBQUEsU0FBQSxHQUFBLGtCQUFBLFlBQUE7Z0JBQ0EsR0FBQSxRQUFBLE9BQUEsSUFBQSxPQUFBLE1BQUEsTUFBQSxNQUFBLFNBQUEsR0FBQSxnQkFBQSxHQUFBLGlCQUFBLE9BQUEsUUFBQSxLQUFBO2dCQUNBLEdBQUEsT0FBQSxPQUFBLE1BQUEsTUFBQSxLQUFBOzs7WUFHQSxHQUFBOzs7UUFHQSxHQUFBLGlCQUFBLFlBQUE7WUFDQSxHQUFBLFdBQUEsQ0FBQSxHQUFBOzs7UUFHQSxHQUFBLHVCQUFBLFlBQUE7WUFDQSxHQUFBLGdCQUFBLENBQUEsR0FBQTtZQUNBLEdBQUEsbUJBQUEsQ0FBQSxHQUFBOztZQUVBLEdBQUE7OztRQUdBLEdBQUEsV0FBQSxVQUFBLE9BQUEsWUFBQTtZQUNBLEdBQUEsUUFBQSxPQUFBLE1BQUEsSUFBQSxPQUFBLFlBQUEsUUFBQSxPQUFBO1lBQ0EsR0FBQSxPQUFBLE9BQUEsTUFBQSxNQUFBLEtBQUE7WUFDQSxHQUFBOzs7UUFHQTs7UUFFQSxPQUFBLGlCQUFBLDJCQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsSUFBQSxRQUFBLE9BQUEsVUFBQSxXQUFBO2dCQUNBOztZQUVBLEtBQUE7OztRQUdBLE9BQUEsaUJBQUEsdUNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxJQUFBLFFBQUEsT0FBQSxVQUFBLFdBQUE7Z0JBQ0E7O1lBRUEsR0FBQSxRQUFBLE9BQUEsSUFBQSxTQUFBLE9BQUE7WUFDQSxHQUFBLE9BQUEsT0FBQSxJQUFBLFNBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsU0FBQSxhQUFBLGVBQUEsU0FBQSxhQUFBLE1BQUE7Z0JBQ0EsSUFBQSxTQUFBLFVBQUE7b0JBQ0EsR0FBQSxtQkFBQSxFQUFBLEtBQUEsR0FBQSxXQUFBLENBQUEsT0FBQSxTQUFBOzs7Z0JBR0EsSUFBQSxTQUFBLGdCQUFBO29CQUNBLEdBQUEsaUJBQUEsU0FBQTs7O2dCQUdBLEdBQUEsZ0JBQUE7Z0JBQ0EsR0FBQSxtQkFBQTttQkFDQTtnQkFDQSxHQUFBLGdCQUFBO2dCQUNBLEdBQUEsbUJBQUE7Ozs7UUFJQSxJQUFBLEdBQUEsU0FBQSxXQUFBO1lBQ0EsT0FBQSxPQUFBLHFDQUFBLFVBQUEsVUFBQTtnQkFDQSxHQUFBLGVBQUE7Ozs7OztBQzlHQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxVQUFBLHVCQUFBLFlBQUE7UUFDQSxPQUFBO1lBQ0EsVUFBQTtZQUNBLGFBQUE7WUFDQSxZQUFBO1lBQ0EsY0FBQTtZQUNBLE9BQUE7Z0JBQ0EsVUFBQTs7Ozs7O0FDVkEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsV0FBQSxzSUFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7TUFDQTtRQUNBLElBQUEsS0FBQTtZQUNBLEtBQUEsVUFBQTs7UUFFQSxHQUFBLE9BQUEsR0FBQSxRQUFBLE9BQUE7O1FBRUEsSUFBQSxTQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsSUFBQSxRQUFBLElBQUEsTUFBQTtZQUNBLFNBQUE7WUFDQSxXQUFBO1lBQ0EsWUFBQTtZQUNBLFFBQUE7WUFDQSxTQUFBLFlBQUEsT0FBQSxNQUFBLE9BQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQTtZQUNBLFFBQUE7WUFDQSxPQUFBLFlBQUE7WUFDQSxNQUFBO1lBQ0EsUUFBQTtZQUNBLFFBQUEsR0FBQSxJQUFBO1lBQ0EsVUFBQTtZQUNBLFdBQUE7WUFDQSxPQUFBLEdBQUEsU0FBQTtZQUNBLFFBQUE7WUFDQSxRQUFBO1lBQ0Esc0JBQUE7WUFDQSx3QkFBQSxHQUFBLFNBQUEsWUFBQSxtQkFBQTtZQUNBLHVCQUFBLEdBQUEsUUFBQSxZQUFBLGtCQUFBO1lBQ0EsZ0JBQUE7WUFDQSxnQkFBQSxZQUFBO1lBQ0Esc0JBQUEsWUFBQTtZQUNBLG1CQUFBLEVBQUEsS0FBQSxZQUFBLG1CQUFBLEVBQUEsU0FBQTtZQUNBLGlCQUFBOztRQUVBLEdBQUEsZUFBQTtRQUNBLEdBQUEsY0FBQTtRQUNBLEdBQUEsYUFBQTtRQUNBLEdBQUEsa0JBQUE7UUFDQSxHQUFBLG1CQUFBOztRQUVBLElBQUEsYUFBQSxVQUFBLFFBQUEsVUFBQTtZQUNBLFdBQUEsWUFBQSxZQUFBLG1CQUFBOztZQUVBLE1BQUEsT0FBQSxDQUFBLE9BQUEsSUFBQSxPQUFBLE9BQUEsVUFBQSxPQUFBLElBQUEsT0FBQSxNQUFBOzs7O1lBSUEsSUFBQSxrQkFBQSxVQUFBLGtCQUFBLFdBQUEsa0JBQUEsUUFBQTtnQkFDQSxNQUFBLEdBQUEsT0FBQSxVQUFBLGFBQUEsU0FBQTttQkFDQTtnQkFDQSxNQUFBLEdBQUEsT0FBQTs7OztZQUlBLElBQUEsTUFBQSxVQUFBO2dCQUNBLEdBQUEsT0FBQSxrQkFBQSxLQUFBLE9BQUEsSUFBQSxNQUFBLFNBQUEsSUFBQSxPQUFBLHlCQUFBO2dCQUNBLEdBQUEsT0FBQSxrQkFBQSxLQUFBLGFBQUEsT0FBQSxJQUFBLE1BQUEsU0FBQSxJQUFBLE9BQUE7Ozs7WUFJQSxNQUFBLE1BQUEsR0FBQSxPQUFBLFVBQUEsYUFBQSxTQUFBOzs7UUFHQSxJQUFBLGlCQUFBLFlBQUE7O1lBRUEsSUFBQSxTQUFBO2dCQUNBLE9BQUEsT0FBQSxJQUFBLHVCQUFBO2dCQUNBLE1BQUEsT0FBQSxJQUFBLHVCQUFBLElBQUEscUJBQUEsaUJBQUEsT0FBQTs7WUFFQSxXQUFBOzs7UUFHQSxJQUFBLFdBQUEsWUFBQTs7WUFFQSxFQUFBLGtCQUFBLEtBQUEsT0FBQSxJQUFBLE1BQUEsU0FBQSxJQUFBLE9BQUEseUJBQUE7WUFDQSxFQUFBLGtCQUFBLEtBQUEsYUFBQSxPQUFBLElBQUEsTUFBQSxTQUFBLElBQUEsT0FBQTs7O1FBR0EsSUFBQSxVQUFBLFlBQUE7WUFDQSxJQUFBLGtCQUFBLFVBQUEsa0JBQUEsV0FBQSxrQkFBQSxRQUFBOztnQkFFQSxHQUFBLE9BQUEsWUFBQSxNQUFBLGtCQUFBOzs7Z0JBR0EsSUFBQSxrQkFBQSxRQUFBO29CQUNBLFNBQUEsWUFBQTs7d0JBRUEsYUFBQSxnQkFBQSxNQUFBLFNBQUEsSUFBQSxNQUFBLFNBQUE7OzttQkFHQTtnQkFDQSxHQUFBLE9BQUEsWUFBQSxNQUFBLGtCQUFBOztnQkFFQSxJQUFBLEdBQUEsU0FBQSxZQUFBOztvQkFFQSxJQUFBLEdBQUEsTUFBQSxhQUFBO3dCQUNBLFNBQUEsWUFBQTs0QkFDQSxhQUFBLGdCQUFBLE1BQUEsU0FBQSxJQUFBLE1BQUEsU0FBQTs7O3VCQUdBO29CQUNBLElBQUEsR0FBQSxNQUFBLGFBQUE7d0JBQ0EsU0FBQSxZQUFBOzs0QkFFQSxhQUFBLGtCQUFBO2dDQUNBLE9BQUEsT0FBQSxJQUFBLE1BQUEsU0FBQSxJQUFBO2dDQUNBLE1BQUEsT0FBQSxJQUFBLE1BQUEsU0FBQSxJQUFBOzs7Ozs7OztRQVFBLElBQUEsb0JBQUEsWUFBQTs7WUFFQSxTQUFBO2lCQUNBLFNBQUE7aUJBQ0EsS0FBQSxLQUFBLEtBQUE7OztZQUdBLFFBQUEsT0FBQTtpQkFDQTtpQkFDQSxTQUFBO2lCQUNBLEtBQUE7aUJBQ0EsS0FBQSxPQUFBLFlBQUEsRUFBQSxPQUFBOzs7UUFHQSxJQUFBLFlBQUEsWUFBQTtZQUNBLElBQUEsR0FBQSxTQUFBLFVBQUE7Z0JBQ0EsSUFBQSxhQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7d0JBQ0EsT0FBQSxPQUFBLElBQUEsRUFBQSxNQUFBO3VCQUNBO29CQUNBLEtBQUEsRUFBQSxPQUFBLEdBQUEsTUFBQSxNQUFBLElBQUE7b0JBQ0EsSUFBQSxXQUFBLHFCQUFBLElBQUE7b0JBQ0EsS0FBQSxvQkFBQSxJQUFBO29CQUNBLEtBQUEsb0JBQUE7O2dCQUVBLElBQUEsTUFBQSxJQUFBO29CQUNBLElBQUEsSUFBQSxLQUFBLE9BQUEsSUFBQSxJQUFBLFNBQUEsR0FBQSxNQUFBLFFBQUEsT0FBQSxJQUFBLEdBQUEsTUFBQSxTQUFBLE9BQUEsSUFBQSxJQUFBLGtCQUFBLEtBQUEsS0FBQTs7b0JBRUEsTUFBQSxLQUFBLGFBQUEsZ0JBQUEsRUFBQSxPQUFBLElBQUEsRUFBQSxNQUFBLFlBQUEsT0FBQSxRQUFBLE9BQUEsRUFBQSxFQUFBLFNBQUEsT0FBQSxPQUFBO29CQUNBLE1BQUEsT0FBQSxRQUFBLEtBQUEsT0FBQSxJQUFBLE9BQUEsSUFBQSxFQUFBLE1BQUEsVUFBQSxPQUFBLGdCQUFBLE9BQUEsRUFBQTs7Ozs7UUFLQSxJQUFBLGtCQUFBLFVBQUEsVUFBQTtZQUNBLFdBQUEsWUFBQTs7O1lBR0EsUUFBQSxFQUFBLElBQUEscUJBQUE7WUFDQSxRQUFBLEVBQUEsSUFBQSxxQkFBQTs7O1lBR0EsRUFBQSxPQUFBLENBQUEsT0FBQSxJQUFBLE1BQUEsSUFBQSxVQUFBLE9BQUEsSUFBQSxNQUFBLE1BQUEsU0FBQSxJQUFBLE1BQUEsS0FBQTtZQUNBLEVBQUEsT0FBQSxDQUFBLEdBQUEsR0FBQSxJQUFBO1lBQ0EsS0FBQSxFQUFBOztZQUVBLElBQUEsVUFBQTtnQkFDQTttQkFDQTs7Z0JBRUEsV0FBQSxRQUFBLE9BQUE7cUJBQ0EsTUFBQTtxQkFDQSxLQUFBLFNBQUE7cUJBQ0EsS0FBQSxLQUFBO3FCQUNBLEtBQUEsYUFBQTs7Z0JBRUEsUUFBQSxJQUFBLE9BQUE7cUJBQ0EsS0FBQSxTQUFBO3FCQUNBLE1BQUEsV0FBQTs7Z0JBRUEsTUFBQSxPQUFBO3FCQUNBLEtBQUEsS0FBQTs7Z0JBRUEsTUFBQSxPQUFBO3FCQUNBLEtBQUEsS0FBQTtxQkFDQSxLQUFBLE1BQUE7O2dCQUVBLElBQUEsT0FBQTtxQkFDQSxLQUFBLFNBQUEsUUFBQSxPQUFBLE9BQUEsT0FBQTtxQkFDQSxLQUFBLFVBQUEsU0FBQSxP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S0FBQSxPQUFBLFVBQUEsU0FBQSxLQUFBOztnQkFFQSxJQUFBLEtBQUEsTUFBQTtvQkFDQSxLQUFBLFNBQUEsY0FBQSxFQUFBLE1BQUE7Ozs7OztRQU1BLElBQUEsWUFBQSxFQUFBLEtBQUE7WUFDQSxTQUFBO1lBQ0EsV0FBQTtZQUNBLFlBQUEsQ0FBQSxJQUFBOzs7UUFHQSxFQUFBLEtBQUEsMEJBQUEsRUFBQSxLQUFBLE9BQUEsT0FBQTtZQUNBLFlBQUEsVUFBQSxLQUFBLFNBQUE7Z0JBQ0EsS0FBQSxPQUFBO2dCQUNBLFFBQUEsYUFBQSxZQUFBLDRCQUFBO2dCQUNBLEVBQUEsS0FBQSxRQUFBLFVBQUEsV0FBQSxLQUFBLE1BQUEsS0FBQTs7O1lBR0EsVUFBQSxZQUFBO2dCQUNBLEVBQUEsS0FBQSxPQUFBLFVBQUEsU0FBQSxLQUFBOztnQkFFQSxJQUFBLEtBQUEsTUFBQTtvQkFDQSxLQUFBLFNBQUEsY0FBQSxDQUFBLE1BQUE7Ozs7O1FBS0EsR0FBQSxjQUFBLFVBQUEsR0FBQSxhQUFBO1lBQ0EsUUFBQSxNQUFBOztZQUVBLElBQUEsT0FBQSxhQUFBO2dCQUNBLFFBQUEsS0FBQTtnQkFDQSxPQUFBLEtBQUE7Z0JBQ0EsU0FBQSxFQUFBLE1BQUE7Z0JBQ0EsT0FBQSxjQUFBLFFBQUEsYUFBQTtnQkFDQSxTQUFBLGFBQUE7O1lBRUEsZUFBQSxhQUFBLE9BQUEsS0FBQSxPQUFBLEtBQUEsT0FBQSxNQUFBLE1BQUEsUUFBQSxLQUFBLFVBQUEsUUFBQTtnQkFDQSxhQUFBLFFBQUE7b0JBQ0EsTUFBQTtvQkFDQSxjQUFBLGFBQUE7O2dCQUVBLGFBQUEsUUFBQSxnQkFBQSxLQUFBLFVBQUE7Z0JBQ0EsYUFBQSxzQkFBQTtnQkFDQSxRQUFBO2VBQ0EsVUFBQSxPQUFBO2dCQUNBLFFBQUE7Z0JBQ0EsYUFBQSxVQUFBLE9BQUE7Ozs7UUFJQSxHQUFBLGNBQUEsVUFBQSxHQUFBLGFBQUE7WUFDQSxJQUFBLFFBQUEsRUFBQTtnQkFDQSxPQUFBLGFBQUE7Z0JBQ0EsU0FBQSxFQUFBLGFBQUEsYUFBQSxZQUFBOzs7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QSxhQUFBLFNBQUEsZUFBQTtRQUNBLGFBQUEsUUFBQSxlQUFBO1FBQ0EsYUFBQSxXQUFBLGVBQUE7O1FBRUEsYUFBQSxRQUFBLGdCQUFBLFFBQUEsWUFBQTtZQUNBLE9BQUEsQ0FBQSxLQUFBLEtBQUEsVUFBQSxDQUFBLDBCQUFBLElBQUE7Ozs7O1FBS0EsYUFBQSxRQUFBLGdCQUFBLFFBQUEsU0FBQSxRQUFBLEtBQUE7WUFDQSxHQUFBLElBQUEsUUFBQSxrQkFBQSxDQUFBLEdBQUE7Z0JBQ0EsT0FBQSxRQUFBOztZQUVBLE9BQUEsUUFBQTs7Ozs7UUFLQSxhQUFBLFFBQUEsZUFBQSxRQUFBLFlBQUE7WUFDQSxPQUFBLFFBQUE7Ozs7O1FBS0EsYUFBQSxRQUFBLGVBQUEsUUFBQSxVQUFBLFFBQUEsS0FBQTtZQUNBLElBQUEsWUFBQSxFQUFBLFVBQUEsRUFBQSxJQUFBLElBQUEsTUFBQSxLQUFBLEdBQUEsTUFBQSxNQUFBLFVBQUEsR0FBQSxFQUFBLE9BQUEsRUFBQSxNQUFBO1lBQ0EsSUFBQSxVQUFBLElBQUE7WUFDQSxRQUFBLEtBQUEsT0FBQSxZQUFBO1lBQ0EsUUFBQSxLQUFBO1lBQ0EsSUFBQSxXQUFBLEtBQUEsTUFBQSxRQUFBO1lBQ0EsU0FBQSxJQUFBLFNBQUEsVUFBQTtZQUNBLFNBQUEsSUFBQSxTQUFBLFVBQUE7WUFDQSxTQUFBLElBQUEsU0FBQSxVQUFBO1lBQ0EsU0FBQSxJQUFBLFNBQUEsVUFBQTtZQUNBLFNBQUEsUUFBQSxVQUFBO1lBQ0EsU0FBQSxPQUFBLFVBQUE7WUFDQSxPQUFBLENBQUEsS0FBQSxLQUFBLFVBQUEsV0FBQTs7Ozs7UUFLQSxhQUFBLFFBQUEsb0JBQUEsUUFBQSxZQUFBO1lBQ0EsT0FBQSxRQUFBOzs7Ozs7QUFNQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnLCBbXG4gICAgICAgICdzaWdtYS5jb25maWcnLFxuICAgICAgICAnbmdDb29raWVzJyxcbiAgICAgICAgJ25nUmVzb3VyY2UnLFxuICAgICAgICAnbmdTYW5pdGl6ZScsXG4gICAgICAgICduZ1JvdXRlJyxcbiAgICAgICAgJ25nQW5pbWF0ZScsXG4gICAgICAgICduZW1Mb2dnaW5nJyxcbiAgICAgICAgJ3VpLWxlYWZsZXQnLFxuICAgICAgICAnYmxvY2tVSScsXG4gICAgICAgICdtZ2NyZWEubmdTdHJhcCcsXG4gICAgICAgICdjZnAuaG90a2V5cycsXG4gICAgICAgICdhbmd1bGFyLXNwaW5raXQnLFxuICAgICAgICAndG9nZ2xlLXN3aXRjaCcsXG4gICAgICAgICduZ0ZpbGVTYXZlcicsXG4gICAgICAgICdtb25vc3BhY2VkLm1vdXNld2hlZWwnXG4gICAgXSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkYWxlcnRQcm92aWRlciwgJHJvdXRlUHJvdmlkZXIsICRwcm92aWRlLCBibG9ja1VJQ29uZmlnKSB7XG4gICAgICAgIC8vIEZpeCBzb3VyY2VtYXBzXG4gICAgICAgIC8vIEB1cmwgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci5qcy9pc3N1ZXMvNTIxNyNpc3N1ZWNvbW1lbnQtNTA5OTM1MTNcbiAgICAgICAgJHByb3ZpZGUuZGVjb3JhdG9yKCckZXhjZXB0aW9uSGFuZGxlcicsIGZ1bmN0aW9uICgkZGVsZWdhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXhjZXB0aW9uLCBjYXVzZSkge1xuICAgICAgICAgICAgICAgICRkZWxlZ2F0ZShleGNlcHRpb24sIGNhdXNlKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBleGNlcHRpb247XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm91dGVQcm92aWRlclxuICAgICAgICAgICAgLndoZW4oJy8nLCB7XG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ3NlYXJjaENvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvcGFnZXMvc2VhcmNoVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgcmVsb2FkT25TZWFyY2g6IGZhbHNlXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLndoZW4oJy9hbmFseXplJywge1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdhbmFseXplQ29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL3BhZ2VzL2FuYWx5emVUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgICAgICByZWxvYWRPblNlYXJjaDogZmFsc2VcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub3RoZXJ3aXNlKHtcbiAgICAgICAgICAgICAgICByZWRpcmVjdFRvOiAnLydcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGFuZ3VsYXIuZXh0ZW5kKCRhbGVydFByb3ZpZGVyLmRlZmF1bHRzLCB7XG4gICAgICAgICAgICBwbGFjZW1lbnQ6ICd0b3AtcmlnaHQnLFxuICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keScsXG4gICAgICAgICAgICBhbmltYXRpb246ICdhbS1mYWRlLWFuZC1zbGlkZS10b3AnLFxuICAgICAgICAgICAgZHVyYXRpb246IDVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYmxvY2tVSUNvbmZpZy5tZXNzYWdlID0gJ0xvYWRpbmcnO1xuICAgICAgICBibG9ja1VJQ29uZmlnLnRlbXBsYXRlID0gJzxkaXYgY2xhc3M9XCJibG9jay11aS1vdmVybGF5XCI+PC9kaXY+PGRpdiBjbGFzcz1cImJsb2NrLXVpLW1lc3NhZ2UtY29udGFpbmVyXCI+PGRpdiBjbGFzcz1cImJsb2NrLXVpLW1lc3NhZ2VcIj48ZGl2IGNsYXNzPVwiYmxvY2stdWktbWVzc2FnZS10ZXh0XCI+e3sgc3RhdGUubWVzc2FnZSB9fTwvZGl2PjxkaXYgY2xhc3M9XCJibG9jay11aS1tZXNzYWdlLWFuaW1hdGlvblwiPjx0aHJlZS1ib3VuY2Utc3Bpbm5lcj48L3RocmVlLWJvdW5jZS1zcGlubmVyPjwvZGl2PjwvZGl2PjwvZGl2Pic7XG4gICAgICAgIGJsb2NrVUlDb25maWcuYXV0b0Jsb2NrID0gZmFsc2U7XG4gICAgfSlcbiAgICAudmFsdWUoJ21vbWVudCcsIHdpbmRvdy5tb21lbnQpXG4gICAgLnZhbHVlKCdfJywgd2luZG93Ll8pXG4gICAgLnZhbHVlKCdMJywgd2luZG93LkwpXG4gICAgLnZhbHVlKCdkMycsIHdpbmRvdy5kMylcbiAgICAudmFsdWUoJyQnLCB3aW5kb3cuJClcbiAgICAudmFsdWUoJ2xvY2FsU3RvcmFnZScsIHdpbmRvdy5sb2NhbFN0b3JhZ2UpXG4gICAgLnZhbHVlKCdJbWFnZScsIHdpbmRvdy5JbWFnZSlcbiAgICAudmFsdWUoJ01vdXNlRXZlbnQnLCB3aW5kb3cuTW91c2VFdmVudClcbiAgICAudmFsdWUoJ2MzJywgd2luZG93LmMzKVxuICAgIC52YWx1ZSgnWE1MSHR0cFJlcXVlc3QnLCB3aW5kb3cuWE1MSHR0cFJlcXVlc3QpXG4gICAgLnZhbHVlKCdCbG9iJywgd2luZG93LkJsb2IpXG4gICAgLnZhbHVlKCdMTHRvTUdSUycsIHdpbmRvdy5MTHRvTUdSUylcbiAgICAudmFsdWUoJ1BJWEknLCB3aW5kb3cuUElYSSlcbiAgICAudmFsdWUoJ1doYW1teScsIHdpbmRvdy5XaGFtbXkpXG4gICAgLnZhbHVlKCdsZWFmbGV0SW1hZ2UnLCB3aW5kb3cubGVhZmxldEltYWdlKVxuICAgIC52YWx1ZSgnR0lGJywgd2luZG93LkdJRilcbiAgICAudmFsdWUoJ0NpcmN1bGFySlNPTicsIHdpbmRvdy5DaXJjdWxhckpTT04pO1xuXG5cblxuICAgIGFwcC5ydW4oZnVuY3Rpb24oJHJvb3RTY29wZSwgJHRpbWVvdXQsICR3aW5kb3csIHNpZ21hQ29uZmlnLCBzaWdtYVNlcnZpY2UsIHN0YXRlU2VydmljZSkge1xuICAgICAgICAvLyBzZXQgYSBnb2JhbCBzY29wZSBwYXJhbSBmb3IgdGhlIDx0aXRsZT4gZWxlbWVudFxuICAgICAgICAkcm9vdFNjb3BlLnBhZ2VUaXRsZSA9IHNpZ21hQ29uZmlnLnRpdGxlO1xuXG4gICAgICAgIC8vIGhhbmRsZSBhbiBldmVudCB3aGVuIHRoZSB2aWV3cG9ydCBpcyByZXNpemVkXG4gICAgICAgIHZhciByZXNpemVUaW1lcjtcbiAgICAgICAgYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpLm9uKCdyZXNpemUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChyZXNpemVUaW1lcikpIHtcbiAgICAgICAgICAgICAgICAvLyB0aW1lciBpcyBjdXJyZW50bHkgYWN0aXZlXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXNpemVUaW1lciA9ICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIG9rIHRvIHNlbmQgYW4gZXZlbnRcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vmlld3BvcnRTaXplKHNpZ21hU2VydmljZS5nZXRWaWV3cG9ydFNpemUoKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBmaW5pc2hlZCByZXNpemluZywgYWxsb3cgdGltZXIgdG8gYmUgc2V0IGFnYWluXG4gICAgICAgICAgICAgICAgcmVzaXplVGltZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9LCAzMDApO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuc2VydmljZSgnc2lnbWFDb25maWcnLCBmdW5jdGlvbiAoc2lnbWFDb25maWdMb2NhbCwgbW9tZW50LCBfLCBMKSB7XG4gICAgICAgIHZhciBjZmcgPSB7XG4gICAgICAgICAgICB0aXRsZTogJ1NpZ21hJyxcbiAgICAgICAgICAgIGxvZ286ICfOoyBTaWdtYScsXG4gICAgICAgICAgICB1cmxzOiB7fSxcbiAgICAgICAgICAgIG92ZXJsYXlQcmVmaXg6ICcnLFxuICAgICAgICAgICAgbWFwQ2VudGVyOiB7XG4gICAgICAgICAgICAgICAgbGF0OiA0NC4zNjY0MjgsXG4gICAgICAgICAgICAgICAgbG5nOiAtODEuNDUzOTQ1LFxuICAgICAgICAgICAgICAgIHpvb206IDhcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsYXllcnM6IHtcbiAgICAgICAgICAgICAgICBiYXNlbGF5ZXJzOiB7fVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1heEJvdW5kczoge1xuICAgICAgICAgICAgICAgIG5vcnRoRWFzdDoge1xuICAgICAgICAgICAgICAgICAgICBsYXQ6IDkwLFxuICAgICAgICAgICAgICAgICAgICBsbmc6IDE4MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc291dGhXZXN0OiB7XG4gICAgICAgICAgICAgICAgICAgIGxhdDogLTkwLFxuICAgICAgICAgICAgICAgICAgICBsbmc6IC0xODBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVmYXVsdFZpZXdNb2RlOiAnc2VhcmNoJyxcbiAgICAgICAgICAgIGRlZmF1bHRMb2NhdGlvbkZvcm1hdDogJ2RkJyxcbiAgICAgICAgICAgIGRlZmF1bHRCYXNlbGF5ZXI6ICcnLFxuICAgICAgICAgICAgbWF4RGF5c0JhY2s6IDEwMDAwLFxuICAgICAgICAgICAgZGVmYXVsdERheXNCYWNrOiA5MCxcbiAgICAgICAgICAgIHJhbmdlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdW5pdHM6IC05MCxcbiAgICAgICAgICAgICAgICAgICAgdW5pdE9mVGltZTogJ2RheXMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJzkwIERheXMnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzOiAtNixcbiAgICAgICAgICAgICAgICAgICAgdW5pdE9mVGltZTogJ21vbnRocycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnNiBNb250aHMnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzOiAtMSxcbiAgICAgICAgICAgICAgICAgICAgdW5pdE9mVGltZTogJ3llYXInLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJzEgWWVhcidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZGVmYXVsdER1cmF0aW9uTGVuZ3RoOiAxLFxuICAgICAgICAgICAgZHVyYXRpb25zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ2RheXMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJ0RheXMnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ3dlZWtzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdXZWVrcycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnbW9udGhzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdNb250aHMnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAneWVhcnMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJ1llYXJzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZGVmYXVsdExheWVyQ29udHJhc3Q6IDEsXG4gICAgICAgICAgICBkZWZhdWx0TGF5ZXJPcGFjaXR5OiA1MCxcbiAgICAgICAgICAgIGRlZmF1bHRTbGlkZXJTdGFydDogbW9tZW50LnV0YygpLnN1YnRyYWN0KDEsICd5JyksXG4gICAgICAgICAgICBkZWZhdWx0U2xpZGVyU3RvcDogbW9tZW50LnV0YygpLmVuZE9mKCdkJyksXG4gICAgICAgICAgICBkZWZhdWx0RW5hYmxlQ292ZXJhZ2U6IGZhbHNlLFxuICAgICAgICAgICAgZGVmYXVsdFByb2plY3Rpb246IEwuQ1JTLkVQU0c0MzI2LFxuICAgICAgICAgICAgcGxheWJhY2tJbnRlcnZhbHM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTm9uZScsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0hvdXJzJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdoJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdEYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdkJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1dlZWtzJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICd3JyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgY29udHJhc3RMZXZlbHM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTG93JyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3VybGxvdycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTWVkaXVtJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3VybCcsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdIaWdoJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3VybGhpZ2gnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBkZWZhdWx0UGxheWJhY2tJbnRlcnZhbFF0eTogMSxcbiAgICAgICAgICAgIG1heFBsYXliYWNrRGVsYXk6IDgwMCxcbiAgICAgICAgICAgIGRlZmF1bHRJbWFnZVF1YWxpdHk6IDAsXG4gICAgICAgICAgICBtaW5pbXVtRnJhbWVEdXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIGludGVydmFsOiAnaCcsIC8vIG11c3QgYmUgYSB2YWxpZCBtb21lbnRqcyBzaG9ydGhhbmQga2V5OiBodHRwOi8vbW9tZW50anMuY29tL2RvY3MvIy9tYW5pcHVsYXRpbmcvYWRkL1xuICAgICAgICAgICAgICAgIHZhbHVlOiAxXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWluaW11bUFPSUR1cmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgaW50ZXJ2YWw6ICdoJywgLy8gbXVzdCBiZSBhIHZhbGlkIG1vbWVudGpzIHNob3J0aGFuZCBrZXk6IGh0dHA6Ly9tb21lbnRqcy5jb20vZG9jcy8jL21hbmlwdWxhdGluZy9hZGQvXG4gICAgICAgICAgICAgICAgdmFsdWU6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWJvdW5jZVRpbWU6IDMwMCxcbiAgICAgICAgICAgIG1heGltdW1SZWNlbnRBT0lzOiA1LFxuICAgICAgICAgICAgbWF4aW11bVJlY2VudFBvaW50czogNSxcbiAgICAgICAgICAgIGFvaUFuYWx5c2lzVmFsdWVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbWluJyxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdNaW4nLFxuICAgICAgICAgICAgICAgICAgICB0aHJlc2hvbGQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdtYXgnLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ01heCcsXG4gICAgICAgICAgICAgICAgICAgIHRocmVzaG9sZDogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ21lYW4nLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ01lYW4nLFxuICAgICAgICAgICAgICAgICAgICB0aHJlc2hvbGQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdhY3Rpdml0eScsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQWN0aXZpdHknLFxuICAgICAgICAgICAgICAgICAgICB0aHJlc2hvbGQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3BpeGVsc19hYm92ZScsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnUGl4ZWxzIEFib3ZlIFRocmVzaG9sZCcsXG4gICAgICAgICAgICAgICAgICAgIHRocmVzaG9sZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnc3RkZXYnLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1N0YW5kYXJkIERldmlhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIHRocmVzaG9sZDogZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgdGhyZXNob2xkQ2VpbGluZzogMTAwLFxuICAgICAgICAgICAgY29sb3JtYXBWYWx1ZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdub25lJyxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdOb25lJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnc3BlY3RyYWwnLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1NwZWN0cmFsJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnYmdyJyxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdCR1InXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdnaXN0X3JhaW5ib3cnLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0dJU1QgUmFpbmJvdydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2pldCcsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnSmV0J1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnWTFHbkJ1X3InLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1kxR25CdV9yJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBiYW5kczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdWaXNpYmxlJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3ZpcycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdTV0lSJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3N3aXInLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1ZJSVJTX0ROQicsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICd2aWlyc19kbmInLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ01XSVInLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbXdpcicsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGNvbXBvbmVudHM6IHtcbiAgICAgICAgICAgICAgICBjb3ZlcmFnZUZpbHRlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhb2lBbmFseXNpczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtYXA6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRjb252ZXJ0ZXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWN0YW5nbGU6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZ290bzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzdGF0ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBiYW5kOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNlbnNvcjogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBsYXliYWNrV2l0aEdhcHM6IGZhbHNlLFxuICAgICAgICAgICAgcG9pbnRjb252ZXJ0ZXJNYXJrZXJPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgcmVwZWF0TW9kZTogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb3JyZWxhdGlvbk1hcmtlck9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICByZXBlYXRNb2RlOiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGltYWdlRmlsdGVyczoge1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogNTBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJyaWdodG5lc3M6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAyMDAsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDEwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY29udHJhc3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAyMDAsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDEwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYmx1cjoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnR2F1c3NpYW4gYmx1cicsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMjAwLFxuICAgICAgICAgICAgICAgICAgICB1bml0czogJydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGh1ZToge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB1bml0czogJ8KwJyxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAtMTgwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDE4MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2F0dXJhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtaW46IC0xMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGludmVydDoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2g6IHRydWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXBpYToge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2g6IHRydWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmNvZGVyczoge1xuICAgICAgICAgICAgICAgIGdpZjoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB3b3JrZXJzOiA0LFxuICAgICAgICAgICAgICAgICAgICBxdWFsaXR5OiAxMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgd2VibToge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBxdWFsaXR5OiAwLjkyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlZmF1bHRFbmNvZGVyOiAnd2VibScsXG4gICAgICAgICAgICBzZW5zb3JzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpZDogLTEsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdhbGwnLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FsbCcsXG4gICAgICAgICAgICAgICAgICAgIGJhbmRzOiBbJ3ZpaXJzX2RuYicsICd2aXMnLCAnbXdpcicsICdzd2lyJ10sXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdzZW5zb3IwJyxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdTZW5zb3IgMCcsXG4gICAgICAgICAgICAgICAgICAgIGJhbmRzOiBbJ3ZpaXJzX2RuYiddLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpZDogMSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3NlbnNvcjEnLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1NlbnNvciBPbmUnLFxuICAgICAgICAgICAgICAgICAgICBiYW5kczogWyd2aXMnLCAnbXdpcicsICdzd2lyJ10sXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnc2Vuc29yMicsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnU2Vuc29yIFR3bycsXG4gICAgICAgICAgICAgICAgICAgIGJhbmRzOiBbJ3ZpcycsICdtd2lyJywgJ3N3aXInXSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcmVjdXJzaXZlbHkgbWVyZ2UgdGhlIGxvY2FsIGNvbmZpZyBvbnRvIHRoZSBkZWZhdWx0IGNvbmZpZ1xuICAgICAgICBhbmd1bGFyLm1lcmdlKGNmZywgc2lnbWFDb25maWdMb2NhbCk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjZmcuZGVmYXVsdFByb2plY3Rpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBkZWZhdWx0UHJvamVjdGlvbiBoYXMgYmVlbiBvdmVyd3JpdHRlbiBpbiBsb2NhbCBjb25maWdcbiAgICAgICAgICAgIC8vIG9ubHkgYSBzdHJpbmcgdmFsdWUgY2FuIGJlIHNwZWNpZmllZCBpbiBsb2NhbCBjb25maWcsIHNvIHVzZSBldmFsIHRvIHByb2R1Y2UgdGhlIHByb3BlciBKUyBvYmplY3RcbiAgICAgICAgICAgIGNmZy5kZWZhdWx0UHJvamVjdGlvbiA9IGV2YWwoY2ZnLmRlZmF1bHRQcm9qZWN0aW9uKTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNmZztcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmZhY3RvcnkoJ0NhbnZhc0ltYWdlT3ZlcmxheScsIGZ1bmN0aW9uIChcbiAgICAgICAgUElYSSxcbiAgICAgICAgTCxcbiAgICAgICAgbGVhZmxldERhdGEsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgLy8gQ29uc3RydWN0b3JcbiAgICAgICAgdmFyIENhbnZhc0ltYWdlT3ZlcmxheSA9IGZ1bmN0aW9uIChmcmFtZXMsIGN1cnJlbnRJZHgsIGxheWVyLCB0ZXh0TGF5ZXIsIG9wYWNpdHksIGNsaXBwaW5nLCBpbnZlcnQsIGdyYXlzY2FsZSwgc2VwaWEsIG5vaXNlLCBjb250cmFzdCwgYnJpZ2h0bmVzcywgaHVlLCBzYXR1cmF0aW9uLCBzaGFycGVuLCBibHVyKSB7XG4gICAgICAgICAgICB0aGlzLmZyYW1lcyA9IGZyYW1lcyB8fCBbXTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudElkeCA9IGN1cnJlbnRJZHggfHwgMDtcbiAgICAgICAgICAgIHRoaXMubGF5ZXIgPSBsYXllcjtcbiAgICAgICAgICAgIHRoaXMudGV4dExheWVyID0gdGV4dExheWVyIHx8IG5ldyBQSVhJLlRleHQoJycsIHtcbiAgICAgICAgICAgICAgICBmb250OiAnMzAwIDE4cHggQXJpYWwnLFxuICAgICAgICAgICAgICAgIGZpbGw6ICcjZmZmJyxcbiAgICAgICAgICAgICAgICBzdHJva2U6ICcjMDAwJyxcbiAgICAgICAgICAgICAgICBzdHJva2VUaGlja25lc3M6IDJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5vcGFjaXR5ID0gb3BhY2l0eSB8fCA1MDtcbiAgICAgICAgICAgIHRoaXMuY2xpcHBpbmcgPSBjbGlwcGluZyB8fCAwO1xuICAgICAgICAgICAgdGhpcy5pbnZlcnQgPSBpbnZlcnQgfHwgMDtcbiAgICAgICAgICAgIHRoaXMuZ3JheXNjYWxlID0gZ3JheXNjYWxlIHx8IDA7XG4gICAgICAgICAgICB0aGlzLnNlcGlhID0gc2VwaWEgfHwgMDtcbiAgICAgICAgICAgIHRoaXMubm9pc2UgPSBub2lzZSB8fCAwO1xuICAgICAgICAgICAgdGhpcy5jb250cmFzdCA9IGNvbnRyYXN0IHx8IDEwMDtcbiAgICAgICAgICAgIHRoaXMuYnJpZ2h0bmVzcyA9IGJyaWdodG5lc3MgfHwgMTAwO1xuICAgICAgICAgICAgdGhpcy5odWUgPSBodWUgfHwgMDtcbiAgICAgICAgICAgIHRoaXMuc2F0dXJhdGlvbiA9IHNhdHVyYXRpb24gfHwgMDtcbiAgICAgICAgICAgIHRoaXMuc2hhcnBlbiA9IHNoYXJwZW4gfHwgMDtcbiAgICAgICAgICAgIHRoaXMuYmx1ciA9IGJsdXIgfHwgMDtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgX2Npb0luc3RhbmNlID0gbnVsbDtcblxuICAgICAgICAvLyBwcml2YXRlIG1ldGhvZHNcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEludGVybmFsIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIHBhc3NlZCBpbnRvIHRoZSBvdmVybGF5XG4gICAgICAgICAqIGFzIHRoZSBkcmF3aW5nIGZ1bmN0aW9uLiBUaGUgc2hvdWxkIGJlIGNhbGxlZCBmcm9tIHRoZSBsYXllclxuICAgICAgICAgKiBpdHNlbGYsIGVnIHRoaXMubGF5ZXIucmVkcmF3KCkuXG4gICAgICAgICAqIEBwYXJhbSAge1BJWEkuV2ViR0xSZW5kZXJlcixQSVhJLkNhbnZhc1JlbmRlcmVyfSBwaXhpUmVuZGVyZXJcbiAgICAgICAgICogICAgICAgICBBbiBhdXRvZGV0ZWN0ZWQgcmVuZGVyZXIgYmFzZWQgb24gYXZhaWxhYmxlIHRlY2hzLlxuICAgICAgICAgKiBAcGFyYW0gIHtvYmplY3R9IHBhcmFtcyBDYWxsYmFjayBwYXJhbXMgY29udGFpbmluZyB0aGUgc3RhZ2VcbiAgICAgICAgICogICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLCBhbmQgdGhlIGJvdW5kcywgc2l6ZSwgem9vbSxcbiAgICAgICAgICogICAgICAgICAgICAgICAgICAgICAgICAgYW5kIHpvb21TY2FsZSBvZiB0aGUgbWFwLlxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIF9yZW5kZXIgPSBmdW5jdGlvbiAocGl4aVJlbmRlcmVyLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBib3VuZHMsXG4gICAgICAgICAgICAgICAgdG9wTGVmdCxcbiAgICAgICAgICAgICAgICBzaXplLFxuICAgICAgICAgICAgICAgIGludmVydEZpbHRlciA9IG5ldyBQSVhJLmZpbHRlcnMuQ29sb3JNYXRyaXhGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBzZXBpYUZpbHRlciA9IG5ldyBQSVhJLmZpbHRlcnMuQ29sb3JNYXRyaXhGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBjb250cmFzdEZpbHRlciA9IG5ldyBQSVhJLmZpbHRlcnMuQ29sb3JNYXRyaXhGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBicmlnaHRuZXNzRmlsdGVyID0gbmV3IFBJWEkuZmlsdGVycy5Db2xvck1hdHJpeEZpbHRlcigpLFxuICAgICAgICAgICAgICAgIGh1ZUZpbHRlciA9IG5ldyBQSVhJLmZpbHRlcnMuQ29sb3JNYXRyaXhGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBzYXR1cmF0aW9uRmlsdGVyID0gbmV3IFBJWEkuZmlsdGVycy5Db2xvck1hdHJpeEZpbHRlcigpLFxuICAgICAgICAgICAgICAgIGJsdXJGaWx0ZXIgPSBuZXcgUElYSS5maWx0ZXJzLkJsdXJGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBmaWx0ZXJzVG9BcHBseTtcblxuICAgICAgICAgICAgaWYgKF9jaW9JbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChfY2lvSW5zdGFuY2UuZnJhbWVzLCBmdW5jdGlvbiAoZnJhbWUsIGZyYW1lSWR4KSB7XG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChmcmFtZS5pbWFnZXMsIGZ1bmN0aW9uIChvdmVybGF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXJrIGFsbCBzcHJpdGVzIGFzIGhpZGRlblxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheS5zcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaG93IG9ubHkgaWYgdGhlIGN1cnJlbnQgaWR4IGlzIGF0IHRoZSBmcmFtZSBpZHhcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCBpZiB0aGUgb3ZlcmxheSBpdHNlbGYgaGFzIGJlZW4gZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9jaW9JbnN0YW5jZS5jdXJyZW50SWR4ID09PSBmcmFtZUlkeCAmJiBvdmVybGF5LmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgdGhlIGJvdW5kcyBhbmQgc2l6ZSBvZiB0aGUgc3ByaXRlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gTC5sYXRMbmdCb3VuZHMob3ZlcmxheS5ib3VuZHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvcExlZnQgPSBfY2lvSW5zdGFuY2UubGF5ZXIuX21hcC5sYXRMbmdUb0NvbnRhaW5lclBvaW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3VuZHMuZ2V0Tm9ydGhXZXN0KClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpemUgPSBfY2lvSW5zdGFuY2UubGF5ZXIuX21hcC5sYXRMbmdUb0NvbnRhaW5lclBvaW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3VuZHMuZ2V0U291dGhFYXN0KClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApLl9zdWJ0cmFjdCh0b3BMZWZ0KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgcG9zaXRpb24gYW5kIHNpemVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVybGF5LnNwcml0ZS54ID0gdG9wTGVmdC54O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJsYXkuc3ByaXRlLnkgPSB0b3BMZWZ0Lnk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheS5zcHJpdGUud2lkdGggPSBzaXplLng7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheS5zcHJpdGUuaGVpZ2h0ID0gc2l6ZS55O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgdGhlIGZsYWcgb24gdGhlIG92ZXJsYXkgZGlyZWN0bHkgKG5vdCB0aGUgc3ByaXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvdmVybGF5LnZpc2libGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheS5zcHJpdGUuYWxwaGEgPSBfY2lvSW5zdGFuY2Uub3BhY2l0eSAvIDEwMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheS5zcHJpdGUudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheS5zcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBvbmx5IGFkZCBmaWx0ZXJzIGlmIG5lY2Vzc2FyeVxuICAgICAgICAgICAgICAgIGZpbHRlcnNUb0FwcGx5ID0gW107XG5cbiAgICAgICAgICAgICAgICBpZiAoX2Npb0luc3RhbmNlLmludmVydCkge1xuICAgICAgICAgICAgICAgICAgICBpbnZlcnRGaWx0ZXIubmVnYXRpdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyc1RvQXBwbHkucHVzaChpbnZlcnRGaWx0ZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChfY2lvSW5zdGFuY2Uuc2VwaWEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VwaWFGaWx0ZXIuc2VwaWEoKTtcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyc1RvQXBwbHkucHVzaChzZXBpYUZpbHRlcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKF9jaW9JbnN0YW5jZS5jb250cmFzdCkge1xuICAgICAgICAgICAgICAgICAgICBjb250cmFzdEZpbHRlci5jb250cmFzdChwYXJzZUZsb2F0KF9jaW9JbnN0YW5jZS5jb250cmFzdCAtIDEwMCkgLyAxMDAsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJzVG9BcHBseS5wdXNoKGNvbnRyYXN0RmlsdGVyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoX2Npb0luc3RhbmNlLmJyaWdodG5lc3MgIT09IDEwMCkge1xuICAgICAgICAgICAgICAgICAgICBicmlnaHRuZXNzRmlsdGVyLmJyaWdodG5lc3MocGFyc2VGbG9hdChfY2lvSW5zdGFuY2UuYnJpZ2h0bmVzcykgLyAxMDApO1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJzVG9BcHBseS5wdXNoKGJyaWdodG5lc3NGaWx0ZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChfY2lvSW5zdGFuY2UuaHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGh1ZUZpbHRlci5odWUocGFyc2VGbG9hdChfY2lvSW5zdGFuY2UuaHVlKSk7XG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcnNUb0FwcGx5LnB1c2goaHVlRmlsdGVyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoX2Npb0luc3RhbmNlLnNhdHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgc2F0dXJhdGlvbkZpbHRlci5zYXR1cmF0ZShwYXJzZUZsb2F0KF9jaW9JbnN0YW5jZS5zYXR1cmF0aW9uKSAvIDEwMCk7XG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcnNUb0FwcGx5LnB1c2goc2F0dXJhdGlvbkZpbHRlcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKF9jaW9JbnN0YW5jZS5ibHVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGJsdXJGaWx0ZXIuYmx1ciA9IHBhcnNlRmxvYXQoX2Npb0luc3RhbmNlLmJsdXIpIC8gMTAwO1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJzVG9BcHBseS5wdXNoKGJsdXJGaWx0ZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGFkZCBhbGwgZmlsdGVycyB0byB0aGUgc3RhZ2UgYW5kIHJlbmRlclxuICAgICAgICAgICAgICAgIHBhcmFtcy5zdGFnZS5maWx0ZXJzID0gZmlsdGVyc1RvQXBwbHkubGVuZ3RoID8gZmlsdGVyc1RvQXBwbHkgOiBudWxsO1xuICAgICAgICAgICAgICAgIHBhcmFtcy5yZW5kZXJlci5yZW5kZXIocGFyYW1zLnN0YWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwdWJsaWMgbWV0aG9kc1xuICAgICAgICBDYW52YXNJbWFnZU92ZXJsYXkucHJvdG90eXBlID0ge1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBdHRhY2ggYSBuZXcgYXJyYXkgb2YgZnJhbWVzIHRvIHRoZSBjYW52YXMgbGF5ZXIuIEVhY2hcbiAgICAgICAgICAgICAqIG92ZXJsYXkgaW4gZWFjaCBmcmFtZSB3aWxsIGJlIGFkZGVkIHRvIHRoZSBzdGFnZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge2FycmF5fSB2YWwgQW4gYXJyYXkgb2YgZnJhbWUgb2JqZWN0cywgZWFjaCBjb250YWluaW5nXG4gICAgICAgICAgICAgKiAgICAgICAgICAgICAgICAgICAgIGFuIGFycmF5IG9mIG92ZXJsYXkgb2JqZWN0cy5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gICAgdGhpc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZnJhbWVzID0gdmFsO1xuXG4gICAgICAgICAgICAgICAgICAgIHNlbGYubGF5ZXIuc3RhZ2UoKS5yZW1vdmVDaGlsZHJlbigpO1xuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goc2VsZi5mcmFtZXMsIGZ1bmN0aW9uIChmcmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGZyYW1lLmltYWdlcywgZnVuY3Rpb24gKG92ZXJsYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmxheWVyLnN0YWdlKCkuYWRkQ2hpbGQob3ZlcmxheS5zcHJpdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2F2ZXMgYSBzaW5nbGUgZnJhbWUgYW5kIGFkZHMgaXQgdG8gdGhlIGNhbnZhcyBsYXllcidzIHN0YWdlLlxuICAgICAgICAgICAgICogQHBhcmFtICB7b2JqZWN0fSBmcmFtZSBBIGZyYW1lIG9iamVjdCBjb250YWluaW5nIGFuIGFycmF5IG9mXG4gICAgICAgICAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJsYXkgb2JqZWN0cy5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgW2Rlc2NyaXB0aW9uXVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhZGQ6IGZ1bmN0aW9uIChmcmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChmcmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5mcmFtZXMucHVzaChmcmFtZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGZyYW1lLmltYWdlcywgZnVuY3Rpb24gKG92ZXJsYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYubGF5ZXIuc3RhZ2UoKS5hZGRDaGlsZChvdmVybGF5LnNwcml0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0cmlldmUgZWl0aGVyIGEgc2luZ2xlIGZyYW1lIG9yIHRoZSBlbnRpcmUgZnJhbWVzIGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtpbnQsdW5kZWZpbmVkfSBpZHggVGhlIGluZGV4IHdpdGhpbiBmcmFtZXMgdG8gcmV0cmlldmUsXG4gICAgICAgICAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVhdmUgYmxhY2sgZm9yIHRoZSBlbnRpcmUgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge29iamVjdCxhcnJheX0gIEEgc2luZ2xlIGZyYW1lIG9yIGFsbCBmcmFtZXNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoaWR4KSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChpZHgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLmZyYW1lc1tpZHhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5mcmFtZXM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENsZWFycyB0aGUgZnJhbWVzLCByZXNldHMgdGhlIGluZGV4LCBhbmQgcmVtb3ZlcyBjaGlsZHJlbiBmcm9tXG4gICAgICAgICAgICAgKiB0aGUgY2FudmFzIGxheWVyJ3Mgc3RhZ2UsIGFuZCByZWRyYXdzIHRoZSBsYXllci5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gdGhpc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5sYXllcikge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmxheWVyLnN0YWdlKCkucmVtb3ZlQ2hpbGRyZW4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5mcmFtZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBzZWxmLmN1cnJlbnRJZHggPSAwO1xuICAgICAgICAgICAgICAgIHNlbGYucmVkcmF3KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBkZXN0cm95OiBmdW5jdGlvbiAobWFwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcC5yZW1vdmVMYXllcihzZWxmLmxheWVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5mcmFtZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBzZWxmLmN1cnJlbnRJZHggPSAwO1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXRzIHRoZSBpbnRlcm5hbCBpbmRleCBvZiB0aGUgZnJhbWUgdG8gdGhlIGdpdmVuIHZhbHVlIGFuZFxuICAgICAgICAgICAgICogcmVkcmF3cyB0aGUgY2FudmFzIGxheWVyLlxuICAgICAgICAgICAgICogQHBhcmFtICB7aW50fSBpZHggVGhlIGluZGV4IHdpdGhpbiB0aGlzLmZyYW1lcyB0byBkcmF3XG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9ICB0aGlzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNldElkeDogZnVuY3Rpb24gKGlkeCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICBzZWxmLmN1cnJlbnRJZHggPSBpZHg7XG4gICAgICAgICAgICAgICAgc2VsZi5yZWRyYXcoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSGVscGVyIHRvIHJlZHJhdyB0aGUgY2FudmFzIGxheWVyJ3MgcmVkcmF3IGZ1bmN0aW9uLiBEcmF3c1xuICAgICAgICAgICAgICogYSB0ZXh0IGxheWVyLCBpZiBhbnksIHRvIGVuc3VyZSBpdCdzIGF0IHRoZSB0b3Agb2YgdGhlIHN0YWNrLlxuICAgICAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSB0aGlzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlZHJhdzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5sYXllcikge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnRleHRMYXllci5hbHBoYSA9IDAuOTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sYXllci5fc3RhZ2UuYWRkQ2hpbGQoc2VsZi50ZXh0TGF5ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLmxheWVyLl9yZWRyYXcoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAobWFwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHNlbGYuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHNlbGYubGF5ZXIgPSBMLnBpeGlPdmVybGF5KClcbiAgICAgICAgICAgICAgICAgICAgLmRyYXdpbmcoX3JlbmRlcilcbiAgICAgICAgICAgICAgICAgICAgLmFkZFRvKG1hcCk7XG4gICAgICAgICAgICAgICAgX2Npb0luc3RhbmNlID0gc2VsZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBzdGF0aWMgbWV0aG9kc1xuICAgICAgICBDYW52YXNJbWFnZU92ZXJsYXkuYnVpbGQgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENhbnZhc0ltYWdlT3ZlcmxheShcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5mcmFtZXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY3VycmVudElkeCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5sYXllcixcbiAgICAgICAgICAgICAgICAgICAgZGF0YS50ZXh0TGF5ZXIsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEub3BhY2l0eSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5jbGlwcGluZyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5pbnZlcnQsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZ3JheXNjYWxlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLnNlcGlhLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLm5vaXNlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbnRyYXN0LFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmJyaWdodG5lc3MsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaHVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLnNhdHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuc2hhcnBlbixcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5ibHVyXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgQ2FudmFzSW1hZ2VPdmVybGF5KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgQ2FudmFzSW1hZ2VPdmVybGF5LnRyYW5zZm9ybWVyID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tYXAoQ2FudmFzSW1hZ2VPdmVybGF5LmJ1aWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBDYW52YXNJbWFnZU92ZXJsYXkuYnVpbGQoZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIENhbnZhc0ltYWdlT3ZlcmxheTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmZhY3RvcnkoJ092ZXJsYXknLCBmdW5jdGlvbiAoXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIFBJWElcbiAgICApIHtcbiAgICAgICAgLy8gQ29uc3RydWN0b3JcbiAgICAgICAgdmFyIE92ZXJsYXkgPSBmdW5jdGlvbiAodXJsLCBpbWFnZVNyYywgaW1hZ2VRdWFsaXR5LCBib3VuZHMsIHRpbWUsIGVuYWJsZWQsIG9ubG9hZCkge1xuICAgICAgICAgICAgdGhpcy51cmwgPSBzaWdtYUNvbmZpZy5vdmVybGF5UHJlZml4ICsgdXJsO1xuICAgICAgICAgICAgLy8gVE9ETyBuZWVkIGltYWdlU3JjP1xuICAgICAgICAgICAgdGhpcy5zcmMgPSBpbWFnZVNyYztcbiAgICAgICAgICAgIHRoaXMuaW1hZ2VRdWFsaXR5ID0gaW1hZ2VRdWFsaXR5O1xuICAgICAgICAgICAgdGhpcy5ib3VuZHMgPSBib3VuZHM7XG4gICAgICAgICAgICB0aGlzLnRpbWUgPSB0aW1lO1xuICAgICAgICAgICAgdGhpcy5lbmFibGVkID0gZW5hYmxlZDtcbiAgICAgICAgICAgIHRoaXMudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLm9ubG9hZCA9IG9ubG9hZDsgLy8gdXNlIGZvciBjYWxsYmFjayBvZiBpbWFnZSBsb2FkXG4gICAgICAgICAgICB0aGlzLnNwcml0ZSA9IG51bGw7XG5cbiAgICAgICAgICAgIHRoaXMuaW5pdEltYWdlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcHVibGljIG1ldGhvZHNcbiAgICAgICAgT3ZlcmxheS5wcm90b3R5cGUgPSB7XG4gICAgICAgICAgICBpbWFnZUxvYWRlZDogZnVuY3Rpb24gKHNwcml0ZSwgZXJyKSB7XG4gICAgICAgICAgICAgICAgLy8gY2FsbCB0aGUgb25sb2FkIGZ1bmN0aW9uLCBpZiBhbnlcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKHRoaXMub25sb2FkKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9ubG9hZChlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGFkZCBpdCB0byB0aGUgcGl4aSBzdGFnZSBsYXllclxuICAgICAgICAgICAgICAgIHZhciBjYW52YXNJbWFnZU92ZXJsYXkgPSBzdGF0ZVNlcnZpY2UuZ2V0Q2FudmFzSW1hZ2VPdmVybGF5KCk7XG4gICAgICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5LmxheWVyLnN0YWdlKCkuYWRkQ2hpbGQoc3ByaXRlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbml0SW1hZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdmFyIHNwcml0ZSA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZSh0aGlzLnNyYyk7XG5cbiAgICAgICAgICAgICAgICBzcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNwcml0ZS50ZXh0dXJlLmJhc2VUZXh0dXJlLmhhc0xvYWRlZCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmltYWdlTG9hZGVkKHNwcml0ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc3ByaXRlLnRleHR1cmUuYmFzZVRleHR1cmUub24oJ2xvYWRlZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5pbWFnZUxvYWRlZChzcHJpdGUsIGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5zcHJpdGUgPSBzcHJpdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gc3RhdGljIG1ldGhvZHNcbiAgICAgICAgT3ZlcmxheS5idWlsZCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgT3ZlcmxheShcbiAgICAgICAgICAgICAgICAgICAgZGF0YS51cmwsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaW1hZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaW1hZ2VxdWFsaXR5LCAvLyBwYXJhbSBmcm9tIGFwaSBpcyBhbGwgbG93ZXJjYXNlXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuYm91bmRzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLnRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZW5hYmxlZFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IE92ZXJsYXkoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBPdmVybGF5LnRyYW5zZm9ybWVyID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tYXAoT3ZlcmxheS5idWlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gT3ZlcmxheS5idWlsZChkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gT3ZlcmxheTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLnNlcnZpY2UoJ2FuYWx5emVTZXJ2aWNlJywgZnVuY3Rpb24gKFxuICAgICAgICAkcSxcbiAgICAgICAgJGh0dHAsXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIHNpZ21hU2VydmljZSxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgZ2V0RERCb3VuZHMgPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgICAgICAgICAgIHZhciBib3VuZHMgPSBzaWdtYVNlcnZpY2UuZ2V0RERCb3VuZHMobG9jYXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuOiBib3VuZHNbMV1bMF0sXG4gICAgICAgICAgICAgICAgZTogYm91bmRzWzBdWzFdLFxuICAgICAgICAgICAgICAgIHM6IGJvdW5kc1swXVswXSxcbiAgICAgICAgICAgICAgICB3OiBib3VuZHNbMV1bMV1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gT25seSB1c2Ugc2Vuc29yIGlkIHBhcmFtIGlmIGEgcGFydGljdWxhciBzZW5zb3IgaXMgc2VsZWN0ZWQsIHNldCB0byBudWxsIGlmIFwiQWxsXCIgaXMgc2VsZWN0ZWRcbiAgICAgICAgdmFyIGdldFNlbnNvclBhcmFtID0gZnVuY3Rpb24gKHNlbnNvcikge1xuICAgICAgICAgIHJldHVybiBzZW5zb3IgPj0gMCA/IHNlbnNvciA6IG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldE92ZXJsYXlQYXJhbXMgPSBmdW5jdGlvbiAoc3RhcnQsIHN0b3AsIGJhbmQsIGxvY2F0aW9uLCBzZW5zb3IpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgIHN0b3A6IHN0b3AsXG4gICAgICAgICAgICAgICAgYmFuZDogYmFuZCxcbiAgICAgICAgICAgICAgICBzZW5zb3I6IGdldFNlbnNvclBhcmFtKHNlbnNvcilcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChsb2NhdGlvbikge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHBhcmFtcywgZ2V0RERCb3VuZHMobG9jYXRpb24pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0UG9pbnRDb252ZXJ0ZXJQYXJhbXMgPSBmdW5jdGlvbiAoc3RhcnQsIHN0b3AsIGxhdCwgbG5nLCBiYW5kLCBpbWFnZVF1YWxpdHksIHNlbnNvcikge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgICAgICAgc3RvcDogc3RvcCxcbiAgICAgICAgICAgICAgICBsYXQ6IGxhdCxcbiAgICAgICAgICAgICAgICBsbmc6IGxuZyxcbiAgICAgICAgICAgICAgICBiYW5kOiBiYW5kLFxuICAgICAgICAgICAgICAgIGltYWdlcXVhbGl0eTogaW1hZ2VRdWFsaXR5LFxuICAgICAgICAgICAgICAgIHNlbnNvcjogZ2V0U2Vuc29yUGFyYW0oc2Vuc29yKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0QW9pUGFyYW1zID0gZnVuY3Rpb24gKHN0YXJ0LCBzdG9wLCBsb2NhdGlvbiwgb3BlcmF0aW9uLCBiYW5kLCByZXR1cm50eXBlLCBpbWFnZVF1YWxpdHksIHNlbnNvciwgbWluVGhyZXNob2xkLCBtYXhUaHJlc2hvbGQsIGNvbG9ybWFwKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgICBzdG9wOiBzdG9wLFxuICAgICAgICAgICAgICAgIG9wZXJhdGlvbjogb3BlcmF0aW9uLFxuICAgICAgICAgICAgICAgIGJhbmQ6IGJhbmQsXG4gICAgICAgICAgICAgICAgcmV0dXJudHlwZTogcmV0dXJudHlwZSxcbiAgICAgICAgICAgICAgICBpbWFnZXF1YWxpdHk6IGltYWdlUXVhbGl0eSxcbiAgICAgICAgICAgICAgICBzZW5zb3I6IGdldFNlbnNvclBhcmFtKHNlbnNvciksXG4gICAgICAgICAgICAgICAgbWludGhyZXNob2xkOiBtaW5UaHJlc2hvbGQsXG4gICAgICAgICAgICAgICAgbWF4dGhyZXNob2xkOiBtYXhUaHJlc2hvbGQsXG4gICAgICAgICAgICAgICAgY29sb3JtYXA6IGNvbG9ybWFwXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAobG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmV4dGVuZChwYXJhbXMsIGdldEREQm91bmRzKGxvY2F0aW9uKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldENvcnJlbGF0ZVBvaW50UGFyYW1zID0gZnVuY3Rpb24gKGxhdCwgbG5nLCBzdGFydCwgc3RvcCwgYmFuZCwgcmV0dXJudHlwZSwgbG9jYXRpb24sIGltYWdlUXVhbGl0eSwgc2Vuc29yKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIGxhdDogbGF0LFxuICAgICAgICAgICAgICAgIGxuZzogbG5nLFxuICAgICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgICBzdG9wOiBzdG9wLFxuICAgICAgICAgICAgICAgIGJhbmQ6IGJhbmQsXG4gICAgICAgICAgICAgICAgcmV0dXJudHlwZTogcmV0dXJudHlwZSxcbiAgICAgICAgICAgICAgICBpbWFnZXF1YWxpdHk6IGltYWdlUXVhbGl0eSxcbiAgICAgICAgICAgICAgICBzZW5zb3I6IGdldFNlbnNvclBhcmFtKHNlbnNvcilcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChsb2NhdGlvbikge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHBhcmFtcywgZ2V0RERCb3VuZHMobG9jYXRpb24pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0T3ZlcmxheXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgbG9jYXRpb24gPSBzdGF0ZVNlcnZpY2UuZ2V0QmJveCgpLFxuICAgICAgICAgICAgICAgICAgICB0aW1lID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgICAgIHVybCA9IHNpZ21hQ29uZmlnLnVybHMub3ZlcmxheXMsXG4gICAgICAgICAgICAgICAgICAgIGJhbmQgPSBzdGF0ZVNlcnZpY2UuZ2V0QmFuZCgpLFxuICAgICAgICAgICAgICAgICAgICBzZW5zb3IgPSBzdGF0ZVNlcnZpY2UuZ2V0U2Vuc29yKCksXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IGdldE92ZXJsYXlQYXJhbXModGltZS5zdGFydCwgdGltZS5zdG9wLCBiYW5kLCBsb2NhdGlvbiwgc2Vuc29yKSxcbiAgICAgICAgICAgICAgICAgICAgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwYXJhbXMpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY29udmVydFBvaW50OiBmdW5jdGlvbiAobGF0LCBsbmcsIHN0YXJ0LCBzdG9wLCBiYW5kLCBzZW5zb3IpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCksXG4gICAgICAgICAgICAgICAgICAgIGltYWdlUXVhbGl0eSA9IHN0YXRlU2VydmljZS5nZXRJbWFnZVF1YWxpdHkoKSxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gZ2V0UG9pbnRDb252ZXJ0ZXJQYXJhbXMoc3RhcnQsIHN0b3AsIGxhdCwgbG5nLCBiYW5kLCBpbWFnZVF1YWxpdHksIHNlbnNvciksXG4gICAgICAgICAgICAgICAgICAgIHVybCA9IHNpZ21hQ29uZmlnLnVybHMucG9pbnRjb252ZXJ0ZXI7XG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiBlcnJvckNhbGxiYWNrIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhbmFseXplQW9pOiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gc3RhdGVTZXJ2aWNlLmdldEJib3goKSxcbiAgICAgICAgICAgICAgICAgICAgdGltZSA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpLFxuICAgICAgICAgICAgICAgICAgICB1cmwgPSBzaWdtYUNvbmZpZy51cmxzLmFvaWFuYWx5c2lzLFxuICAgICAgICAgICAgICAgICAgICBiYW5kID0gc3RhdGVTZXJ2aWNlLmdldEJhbmQoKSxcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VRdWFsaXR5ID0gc3RhdGVTZXJ2aWNlLmdldEltYWdlUXVhbGl0eSgpLFxuICAgICAgICAgICAgICAgICAgICBzZW5zb3IgPSBzdGF0ZVNlcnZpY2UuZ2V0U2Vuc29yKCksXG4gICAgICAgICAgICAgICAgICAgIGFvaVBhcmFtcyA9IGdldEFvaVBhcmFtcyh0aW1lLnN0YXJ0LCB0aW1lLnN0b3AsIGxvY2F0aW9uLCBwYXJhbXMub3BlcmF0aW9uLCBiYW5kLCBwYXJhbXMucmV0dXJuVHlwZSwgaW1hZ2VRdWFsaXR5LCBzZW5zb3IsIHBhcmFtcy5taW5UaHJlc2hvbGQsIHBhcmFtcy5tYXhUaHJlc2hvbGQsIHBhcmFtcy5jb2xvcm1hcCksXG4gICAgICAgICAgICAgICAgICAgIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgLy8gc3RyaXAgbnVsbCB2YWx1ZXMgZnJvbSBhb2lQYXJhbXNcbiAgICAgICAgICAgICAgICBhb2lQYXJhbXMgPSBfLnBpY2tCeShhb2lQYXJhbXMsIGZ1bmN0aW9uIChwYXJhbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW0gIT09IG51bGwgJiYgdHlwZW9mIHBhcmFtICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogYW9pUGFyYW1zXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2sgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIGVycm9yQ2FsbGJhY2sgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGNvcnJlbGF0ZVBvaW50OiBmdW5jdGlvbiAobGF0LCBsbmcsIHN0YXJ0LCBzdG9wLCByZXR1cm50eXBlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gc3RhdGVTZXJ2aWNlLmdldEJib3goKSxcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VRdWFsaXR5ID0gc3RhdGVTZXJ2aWNlLmdldEltYWdlUXVhbGl0eSgpLFxuICAgICAgICAgICAgICAgICAgICB1cmwgPSBzaWdtYUNvbmZpZy51cmxzLmNvcnJlbGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgYmFuZCA9IHN0YXRlU2VydmljZS5nZXRCYW5kKCksXG4gICAgICAgICAgICAgICAgICAgIHNlbnNvciA9IHN0YXRlU2VydmljZS5nZXRTZW5zb3IoKSxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gZ2V0Q29ycmVsYXRlUG9pbnRQYXJhbXMobGF0LCBsbmcsIHN0YXJ0LCBzdG9wLCBiYW5kLCByZXR1cm50eXBlLCBsb2NhdGlvbiwgaW1hZ2VRdWFsaXR5LCBzZW5zb3IpLFxuICAgICAgICAgICAgICAgICAgICBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogcGFyYW1zXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2sgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIGVycm9yQ2FsbGJhY2sgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmZhY3RvcnkoJ2Nvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZScsIGZ1bmN0aW9uIChMTHRvTUdSUykge1xuICAgICAgICAvL3RydW5jYXRlIGlzIGEgc2lnbiBhcHByb3ByaWF0ZSB0cnVuY2F0aW9uIGZ1bmN0aW9uXG4gICAgICAgIHZhciB0cnVuY2F0ZSA9IGZ1bmN0aW9uIChfdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChfdmFsdWUgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguY2VpbChfdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoX3ZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgbGF0aXR1ZGUgZGVjaW1hbCBkZWdyZWVzIChmbG9hdCkgaW50byBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIGFzIGEgc3RyaW5nIGluIHRoZSBmb3JtYXQ6XG4gICAgICAgICAnWFjCsFhYJ1hYLlhYWCdcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZExhdFRvRE1TTGF0ID0gZnVuY3Rpb24gKGxhdCkge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKGxhdCA8PSA5MCAmJiBsYXQgPj0gMCkge1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSB0cnVuY2F0ZShsYXQpO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB0cnVuY2F0ZSgobGF0IC0gZGVncmVlcykgKiA2MCk7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9ICgoKChsYXQgLSBkZWdyZWVzKSAqIDYwKSAtIG1pbnV0ZXMpICogNjApLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZ3JlZXMgKyAnwrAnICsgbWludXRlcyArICdcXCcnICsgc2Vjb25kcyArICdcIic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdCA8IDAgJiYgbGF0ID49IC05MCkge1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSB0cnVuY2F0ZShsYXQpO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB0cnVuY2F0ZSgoTWF0aC5hYnMobGF0KSAtIE1hdGguYWJzKGRlZ3JlZXMpKSAqIDYwKTtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gKCgoKE1hdGguYWJzKGxhdCkgLSBNYXRoLmFicyhkZWdyZWVzKSkgKiA2MCkgLSBtaW51dGVzKSAqIDYwKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWdyZWVzICsgJ8KwJyArIG1pbnV0ZXMgKyAnXFwnJyArIHNlY29uZHMgKyAnXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ludmFsaWQgTGF0aXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyBsb25naXR1ZGUgZGVjaW1hbCBkZWdyZWVzIChmbG9hdCkgaW50byBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIGFzIGEgc3RyaW5nIGluIHRoZSBmb3JtYXQ6XG4gICAgICAgICAnWFjCsFhYJ1hYLlhYWCdcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZExvblRvRE1TTG9uID0gZnVuY3Rpb24gKGxvbikge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKGxvbiA8PSAxODAgJiYgbG9uID49IDApIHtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gdHJ1bmNhdGUobG9uKTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdHJ1bmNhdGUoKGxvbiAtIGRlZ3JlZXMpICogNjApO1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSAoKCgobG9uIC0gZGVncmVlcykgKiA2MCkgLSBtaW51dGVzKSAqIDYwKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWdyZWVzICsgJ8KwJyArIG1pbnV0ZXMgKyAnXFwnJyArIHNlY29uZHMgKyAnXCInO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb24gPCAwICYmIGxvbiA+PSAtMTgwKSB7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHRydW5jYXRlKChsb24pKTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdHJ1bmNhdGUoKE1hdGguYWJzKGxvbikgLSBNYXRoLmFicyhkZWdyZWVzKSkgKiA2MCk7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9ICgoKChNYXRoLmFicyhsb24pIC0gTWF0aC5hYnMoZGVncmVlcykpICogNjApIC0gbWludXRlcykgKiA2MCkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVncmVlcyArICfCsCcgKyBtaW51dGVzICsgJ1xcJycgKyBzZWNvbmRzICsgJ1wiJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdJbnZhbGlkIGxvbmdpdHVkZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLypcbiAgICAgICAgIENvbnZlcnRzIGxhdGl0dWRlIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgaW50byBkZWNpbWFsIGRlZ3JlZXMgKGZsb2F0KVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGRtc0xhdFRvRERMYXQgPSBmdW5jdGlvbiAobGF0RGVncmVlLCBsYXRNaW51dGUsIGxhdFNlY29uZCkge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKHBhcnNlRmxvYXQobGF0RGVncmVlKSA8IDApIHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gcGFyc2VGbG9hdChsYXRTZWNvbmQpIC8gNjA7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IChwYXJzZUZsb2F0KGxhdE1pbnV0ZSkgKyBzZWNvbmRzKSAvIDYwO1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSBwYXJzZUZsb2F0KE1hdGguYWJzKGxhdERlZ3JlZSkpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoKGRlZ3JlZXMgKyBtaW51dGVzKSAqIC0xKS50b0ZpeGVkKDYpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXJzZUZsb2F0KGxhdERlZ3JlZSkgPj0gMCkge1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBwYXJzZUZsb2F0KGxhdFNlY29uZCkgLyA2MDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gKHBhcnNlRmxvYXQobGF0TWludXRlKSArIHNlY29uZHMpIC8gNjA7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHBhcnNlRmxvYXQobGF0RGVncmVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGRlZ3JlZXMgKyBtaW51dGVzKS50b0ZpeGVkKDYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ludmFsaWQgTGF0aXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyBsb25naXR1ZGUgZGVncmVlcywgbWludXRlcywgc2Vjb25kcyBpbnRvIGRlY2ltYWwgZGVncmVlcyAoZmxvYXQpXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgZG1zTG9uVG9ERExvbiA9IGZ1bmN0aW9uIChsb25EZWdyZWUsIGxvbk1pbnV0ZSwgbG9uU2Vjb25kKSB7XG4gICAgICAgICAgICB2YXIgZGVncmVlcztcbiAgICAgICAgICAgIHZhciBtaW51dGVzO1xuICAgICAgICAgICAgdmFyIHNlY29uZHM7XG4gICAgICAgICAgICBpZiAocGFyc2VGbG9hdChsb25EZWdyZWUpIDwgMCkge1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBwYXJzZUZsb2F0KGxvblNlY29uZCkgLyA2MDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gKHBhcnNlRmxvYXQobG9uTWludXRlKSArIHNlY29uZHMpIC8gNjA7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHBhcnNlRmxvYXQoTWF0aC5hYnMobG9uRGVncmVlKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgoZGVncmVlcyArIG1pbnV0ZXMpICogLTEpLnRvRml4ZWQoNik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnNlRmxvYXQobG9uRGVncmVlKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9IHBhcnNlRmxvYXQobG9uU2Vjb25kKSAvIDYwO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSAocGFyc2VGbG9hdChsb25NaW51dGUpICsgc2Vjb25kcykgLyA2MDtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gcGFyc2VGbG9hdChsb25EZWdyZWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoZGVncmVlcyArIG1pbnV0ZXMpLnRvRml4ZWQoNik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnSW52YWxpZCBMb25naXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vTXlTZXJ2aWNlIGlzIGFuIG9iamVjdCB0byBjb250YWluIGFsbCBmaWVsZHMgYW5kXG4gICAgICAgIC8vZnVuY3Rpb25zIG5lY2Vzc2FyeSB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSB2YXJpb3VzXG4gICAgICAgIC8vY29udHJvbGxlcnNcbiAgICAgICAgdmFyIGNvb3JkU2VydmljZSA9IHt9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyB0aGUgZGVjaW1hbCBkZWdyZWVzIG9mIGxhdGl0dWRlIGFuZCBsb25naXR1ZGUgaW5wdXQgYm94IHRoZSBvdGhlciBmb3JtYXRzIChETVMgYW5kIE1HUlMpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICBjb29yZFNlcnZpY2UucHJlcEZvckREQnJvYWRjYXN0ID0gZnVuY3Rpb24gKGxhdCwgbG9uKSB7XG4gICAgICAgICAgICBpZiAoKGxhdCB8fCBsYXQgPT09IDApICYmIGxhdCA+PSAtOTAgJiYgbGF0IDw9IDkwICYmIChsb24gfHwgbG9uID09PSAwKSAmJiBsb24gPj0gLTE4MCAmJiBsb24gPD0gMTgwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGRtczogW2RkTGF0VG9ETVNMYXQobGF0KSwgZGRMb25Ub0RNU0xvbihsb24pXSxcbiAgICAgICAgICAgICAgICAgICAgZGQ6IFtsYXQsIGxvbl0sXG4gICAgICAgICAgICAgICAgICAgIG1ncnM6ICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAobGF0ID49IC04MCAmJiBsYXQgPD0gODQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5tZ3JzID0gTEx0b01HUlMobGF0LCBsb24sIDUpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCEobGF0ID49IC04MCAmJiBsYXQgPD0gODQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCEobG9uID49IC0xODAgJiYgbG9uIDw9IDE4MCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgdGhlIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgc3RyaW5ncyBvZiBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlIGlucHV0IGJveCB0aGUgb3RoZXIgZm9ybWF0cyAoREQgYW5kIE1HUlMpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICBjb29yZFNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdCA9IGZ1bmN0aW9uIChsYXRETVMsIGxvbkRNUykge1xuICAgICAgICAgICAgdmFyIGxhdERlZ3JlZSwgbGF0TWludXRlLCBsYXRTZWNvbmQsIGxvbkRlZ3JlZSwgbG9uTWludXRlLCBsb25TZWNvbmQ7XG4gICAgICAgICAgICBsYXRETVMgPSBsYXRETVMucmVwbGFjZSgvW05TIF0vaWcsICcnKS5zcGxpdCgvW8KwJ1wiXS8pO1xuICAgICAgICAgICAgbG9uRE1TID0gbG9uRE1TLnJlcGxhY2UoL1tFVyBdL2lnLCAnJykuc3BsaXQoL1vCsCdcIl0vKTtcblxuICAgICAgICAgICAgaWYgKGxhdERNUy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA9IHBhcnNlSW50KGxhdERNU1swXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA9IHBhcnNlSW50KGxhdERNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA9IHBhcnNlRmxvYXQobGF0RE1TWzJdLCAxMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdERNUy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsYXRETVMgPSBsYXRETVNbMF0uc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPSBwYXJzZUZsb2F0KGxhdERNU1swXS5zdWJzdHIoLTIpICsgJy4nICsgbGF0RE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0TWludXRlID0gcGFyc2VJbnQobGF0RE1TWzBdLnN1YnN0cigtNCwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPSBwYXJzZUludChsYXRETVNbMF0uc2xpY2UoMCwgLTQpLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobG9uRE1TLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID0gcGFyc2VJbnQobG9uRE1TWzBdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uTWludXRlID0gcGFyc2VJbnQobG9uRE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID0gcGFyc2VGbG9hdChsb25ETVNbMl0sIDEwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9uRE1TLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGxvbkRNUyA9IGxvbkRNU1swXS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgICAgIGxvblNlY29uZCA9IHBhcnNlRmxvYXQobG9uRE1TWzBdLnN1YnN0cigtMikgKyAnLicgKyBsb25ETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPSBwYXJzZUludChsb25ETVNbMF0uc3Vic3RyKC00LCAyKSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbkRlZ3JlZSA9IHBhcnNlSW50KGxvbkRNU1swXS5zbGljZSgwLCAtNCksIDEwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA+PSAtOTAgJiYgbGF0RGVncmVlIDw9IDkwICYmXG4gICAgICAgICAgICAgICAgbGF0TWludXRlID49IDAgJiYgbGF0TWludXRlIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbGF0U2Vjb25kID49IDAgJiYgbGF0U2Vjb25kIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uTWludXRlID49IDAgJiYgbG9uTWludXRlIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID49IDAgJiYgbG9uU2Vjb25kIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID49IC0xODAgJiYgbG9uRGVncmVlIDw9IDE4MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobGF0RGVncmVlKSAtIHBhcnNlRmxvYXQobGF0TWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxhdFNlY29uZCAqIDAuMDAwMSkgPj0gLTkwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsYXREZWdyZWUpICsgcGFyc2VGbG9hdChsYXRNaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobGF0U2Vjb25kICogMC4wMDAxKSA8PSA5MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobG9uRGVncmVlKSAtIHBhcnNlRmxvYXQobG9uTWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxvblNlY29uZCAqIDAuMDAwMSkgPj0gLTE4MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobG9uRGVncmVlKSArIHBhcnNlRmxvYXQobG9uTWludXRlICogMC4wMSkgKyBwYXJzZUZsb2F0KGxvblNlY29uZCAqIDAuMDAwMSkgPD0gMTgwXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgZG1zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXREZWdyZWUgKyAnwrAnICsgbGF0TWludXRlICsgJ1xcJycgKyBsYXRTZWNvbmQgKyAnXCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9uRGVncmVlICsgJ8KwJyArIGxvbk1pbnV0ZSArICdcXCcnICsgbG9uU2Vjb25kICsgJ1wiJ10sXG4gICAgICAgICAgICAgICAgICAgIGRkOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBkbXNMYXRUb0RETGF0KGxhdERlZ3JlZSwgbGF0TWludXRlLCBsYXRTZWNvbmQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZG1zTG9uVG9ERExvbihsb25EZWdyZWUsIGxvbk1pbnV0ZSwgbG9uU2Vjb25kKV0sXG4gICAgICAgICAgICAgICAgICAgIG1ncnM6ICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0cy5kZFswXSA+PSAtODAgJiYgcmVzdWx0cy5kZFswXSA8PSA4NCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLm1ncnMgPSBMTHRvTUdSUyhyZXN1bHRzLmRkWzBdLCByZXN1bHRzLmRkWzFdLCA1KTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgdGhlIE1HUlMtZW5jb2RlZCBzdHJpbmcgb2YgbGF0aXR1ZGUgYW5kIGxvbmdpdHVkZSBpbnB1dCBib3ggdGhlIG90aGVyIGZvcm1hdHMgKERNUyBhbmQgREQpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICAvL3ByZXBGb3JNR1JTQnJvYWRjYXN0IGlzIHRoZSBmdW5jdGlvbiB0aGF0IGNvbnZlcnRzIHRoZVxuICAgICAgICAvL2Nvb3JkaW5hdGVzIGVudGVyZWQgaW4gdGhlIE1HUlMgaW5wdXQgYm94ZXMgYW5kIHNldHNcbiAgICAgICAgLy90aGUgcmVzdCBvZiB0aGUgZmllbGRzIGluIHRoZSBteVNlcnZpY2Ugb2JqZWN0LiBkYXRhXG4gICAgICAgIC8vdmFsaWRhdGlvbiBpcyBjb21wbGV0ZWQgYnkgY2hlY2tpbmcgaWYgdGhlIGlucHV0XG4gICAgICAgIC8vY29vcmRpbmF0ZXMgcmV0dXJuIHZhbHVlcyB0byB0aGUgbGF0TG9uW10gZnJvbSB0aGVcbiAgICAgICAgLy9VU05HdG9MTCgpIGZ1bmN0aW9uIG9mIHRoZSB1c25nLmpzIGxpYnJhcnkuXG4gICAgICAgIGNvb3JkU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdCA9IGZ1bmN0aW9uIChNR1JTKSB7XG4gICAgICAgICAgICB2YXIgbGF0TG9uID0gW107XG4gICAgICAgICAgICBVU05HdG9MTChNR1JTICsgJycsIGxhdExvbik7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuXG4gICAgICAgICAgICBpZiAoaXNOYU4obGF0TG9uWzBdKSB8fCBpc05hTihsYXRMb25bMV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGFmdGVyIDUgZGVjaW1hbCBwbGFjZXMsIHRoZSByZXN1bHRzIHN0YXJ0IGdvaW5nIG9mZlxuICAgICAgICAgICAgICAgIGxhdExvblswXSA9IE1hdGgucm91bmQobGF0TG9uWzBdICogMWU1KSAvIDEuZTU7XG4gICAgICAgICAgICAgICAgbGF0TG9uWzFdID0gTWF0aC5yb3VuZChsYXRMb25bMV0gKiAxZTUpIC8gMS5lNTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBtZ3JzOiBNR1JTLFxuICAgICAgICAgICAgICAgICAgICBkZDogbGF0TG9uLFxuICAgICAgICAgICAgICAgICAgICBkbXM6IFtkZExhdFRvRE1TTGF0KGxhdExvblswXSksIGRkTG9uVG9ETVNMb24obGF0TG9uWzFdKV1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTGF0REQgPSBmdW5jdGlvbiAobGF0KSB7XG4gICAgICAgICAgICByZXR1cm4gKChsYXQgfHwgbGF0ID09PSAwIHx8IGxhdCA9PT0gJycpICYmIGxhdCA+PSAtOTAgJiYgbGF0IDw9IDkwKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRMb25ERCA9IGZ1bmN0aW9uIChsb24pIHtcbiAgICAgICAgICAgIHJldHVybiAoIChsb24gfHwgbG9uID09PSAwIHx8IGxvbiA9PT0gJycpICYmIGxvbiA+PSAtMTgwICYmIGxvbiA8PSAxODApO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTGF0RE1TID0gZnVuY3Rpb24gKGxhdERNUykge1xuICAgICAgICAgICAgaWYgKGxhdERNUyA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsYXREZWdyZWUsIGxhdE1pbnV0ZSwgbGF0U2Vjb25kO1xuICAgICAgICAgICAgbGF0RE1TID0gbGF0RE1TLnJlcGxhY2UoL1tOUyBdL2lnLCAnJykuc3BsaXQoL1vCsCdcIl0vKTtcblxuICAgICAgICAgICAgaWYgKGxhdERNUy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA9IHBhcnNlSW50KGxhdERNU1swXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA9IHBhcnNlSW50KGxhdERNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA9IHBhcnNlRmxvYXQobGF0RE1TWzJdLCAxMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdERNUy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsYXRETVMgPSBsYXRETVNbMF0uc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPSBwYXJzZUZsb2F0KGxhdERNU1swXS5zdWJzdHIoLTIpICsgJy4nICsgbGF0RE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0TWludXRlID0gcGFyc2VJbnQobGF0RE1TWzBdLnN1YnN0cigtNCwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPSBwYXJzZUludChsYXRETVNbMF0uc2xpY2UoMCwgLTQpLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA+PSAtOTAgJiYgbGF0RGVncmVlIDw9IDkwICYmXG4gICAgICAgICAgICAgICAgbGF0TWludXRlID49IDAgJiYgbGF0TWludXRlIDwgNjAgJiZcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPj0gMCAmJiBsYXRTZWNvbmQgPCA2MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobGF0RGVncmVlKSAtIHBhcnNlRmxvYXQobGF0TWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxhdFNlY29uZCAqIDAuMDAwMSkgPj0gLTkwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsYXREZWdyZWUpICsgcGFyc2VGbG9hdChsYXRNaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobGF0U2Vjb25kICogMC4wMDAxKSA8PSA5MFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb29yZFNlcnZpY2UuaXNWYWxpZExvbkRNUyA9IGZ1bmN0aW9uIChsb25ETVMpIHtcbiAgICAgICAgICAgIGlmIChsb25ETVMgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbG9uRGVncmVlLCBsb25NaW51dGUsIGxvblNlY29uZDtcbiAgICAgICAgICAgIGxvbkRNUyA9IGxvbkRNUy5yZXBsYWNlKC9bRVcgXS9pZywgJycpLnNwbGl0KC9bwrAnXCJdLyk7XG5cbiAgICAgICAgICAgIGlmIChsb25ETVMubGVuZ3RoID49IDMpIHtcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPSBwYXJzZUludChsb25ETVNbMF0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPSBwYXJzZUludChsb25ETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25TZWNvbmQgPSBwYXJzZUZsb2F0KGxvbkRNU1syXSwgMTApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb25ETVMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgbG9uRE1TID0gbG9uRE1TWzBdLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID0gcGFyc2VGbG9hdChsb25ETVNbMF0uc3Vic3RyKC0yKSArICcuJyArIGxvbkRNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA9IHBhcnNlSW50KGxvbkRNU1swXS5zdWJzdHIoLTQsIDIpLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID0gcGFyc2VJbnQobG9uRE1TWzBdLnNsaWNlKDAsIC00KSwgMTApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA+PSAwICYmIGxvbk1pbnV0ZSA8IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID49IDAgJiYgbG9uU2Vjb25kIDwgNjAgJiZcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPj0gLTE4MCAmJiBsb25EZWdyZWUgPD0gMTgwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsb25EZWdyZWUpIC0gcGFyc2VGbG9hdChsb25NaW51dGUgKiAwLjAxKSAtIHBhcnNlRmxvYXQobG9uU2Vjb25kICogMC4wMDAxKSA+PSAtMTgwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsb25EZWdyZWUpICsgcGFyc2VGbG9hdChsb25NaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobG9uU2Vjb25kICogMC4wMDAxKSA8PSAxODBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRNR1JTID0gZnVuY3Rpb24gKG1ncnMpIHtcbiAgICAgICAgICAgIGlmIChtZ3JzID09PSAnJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWdycyA9IG1ncnMgKyAnJztcbiAgICAgICAgICAgIHJldHVybiAhIW1ncnMubWF0Y2goL14oWzAtNV1bMC05XVtDLVhdfDYwW0MtWF18W0FCWVpdKVtBLVpdezJ9XFxkezQsMTR9JC9pKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gY29vcmRTZXJ2aWNlO1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLnNlcnZpY2UoJ3NlYXJjaFNlcnZpY2UnLCBmdW5jdGlvbiAoXG4gICAgICAgICRodHRwLFxuICAgICAgICAkcSxcbiAgICAgICAgJHRpbWVvdXQsXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIHNpZ21hU2VydmljZVxuICAgICkge1xuICAgICAgICB2YXIgZ2V0RERCb3VuZHMgPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgICAgICAgICAgIHZhciBib3VuZHMgPSBzaWdtYVNlcnZpY2UuZ2V0RERCb3VuZHMobG9jYXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuOiBib3VuZHNbMV1bMF0sXG4gICAgICAgICAgICAgICAgZTogYm91bmRzWzBdWzFdLFxuICAgICAgICAgICAgICAgIHM6IGJvdW5kc1swXVswXSxcbiAgICAgICAgICAgICAgICB3OiBib3VuZHNbMV1bMV1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldFBhcmFtcyA9IGZ1bmN0aW9uIChzdGFydCwgc3RvcCwgbG9jYXRpb24sIGdyb3VwQnksIGJhbmQpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgIHN0b3A6IHN0b3AsXG4gICAgICAgICAgICAgICAgYmFuZDogYmFuZFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGxvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5leHRlbmQocGFyYW1zLCBnZXREREJvdW5kcyhsb2NhdGlvbikpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZ3JvdXBCeSkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5ncm91cF9ieSA9IGdyb3VwQnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHRpbWVvdXRDb3ZlcmFnZSA9IG51bGw7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGdldENvdmVyYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVvdXRDb3ZlcmFnZSkge1xuICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwodGltZW91dENvdmVyYWdlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aW1lb3V0Q292ZXJhZ2UgPSAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZSA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gc2lnbWFDb25maWcudXJscy5jb3ZlcmFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhbmQgPSBzdGF0ZVNlcnZpY2UuZ2V0QmFuZCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vcnRoOiA5MCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVhc3Q6IDE4MCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXRoOiAtOTAsXG4gICAgICAgICAgICAgICAgICAgICAgICB3ZXN0OiAtMTgwXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IGdldFBhcmFtcyh0aW1lLnN0YXJ0LCB0aW1lLnN0b3AsIGxvY2F0aW9uLCBudWxsLCBiYW5kKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnN0ZXAgPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogcGFyYW1zXG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIGVycm9yQ2FsbGJhY2sgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcblxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRDb2xsZWN0Q291bnRzQnlIb3VyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpLFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbiA9IHN0YXRlU2VydmljZS5nZXRNYXBCb3VuZHMoKSxcbiAgICAgICAgICAgICAgICAgICAgdGltZSA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpLFxuICAgICAgICAgICAgICAgICAgICB1cmwgPSBzaWdtYUNvbmZpZy51cmxzLmFnZ3JlZ2F0ZSxcbiAgICAgICAgICAgICAgICAgICAgYmFuZCA9IHN0YXRlU2VydmljZS5nZXRCYW5kKCksXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IGdldFBhcmFtcyh0aW1lLnN0YXJ0LCB0aW1lLnN0b3AsIGxvY2F0aW9uLCAnaG91cicsIGJhbmQpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENvbGxlY3RDb3VudHNCeURheTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKSxcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24gPSBzdGF0ZVNlcnZpY2UuZ2V0TWFwQm91bmRzKCksXG4gICAgICAgICAgICAgICAgICAgIHRpbWUgPSBzdGF0ZVNlcnZpY2UuZ2V0VGltZVNsaWRlckV4dGVudHMoKSxcbiAgICAgICAgICAgICAgICAgICAgdXJsID0gc2lnbWFDb25maWcudXJscy5hZ2dyZWdhdGUsXG4gICAgICAgICAgICAgICAgICAgIGJhbmQgPSBzdGF0ZVNlcnZpY2UuZ2V0QmFuZCgpLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSBnZXRQYXJhbXModGltZS5zdGFydCwgdGltZS5zdG9wLCBsb2NhdGlvbiwgJ2RheScsIGJhbmQpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuc2VydmljZSgnc2lnbWFTZXJ2aWNlJywgZnVuY3Rpb24gKCRhbGVydCwgY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLCBfKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXRWaWV3cG9ydFNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdyA9IHdpbmRvdyxcbiAgICAgICAgICAgICAgICAgICAgZCA9IGRvY3VtZW50LFxuICAgICAgICAgICAgICAgICAgICBlID0gZC5kb2N1bWVudEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIGcgPSBkb2N1bWVudC5ib2R5LFxuICAgICAgICAgICAgICAgICAgICB4ID0gdy5pbm5lcldpZHRoIHx8IGUuY2xpZW50V2lkdGggfHwgZy5jbGllbnRXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgeSA9IHcuaW5uZXJIZWlnaHQgfHwgZS5jbGllbnRIZWlnaHQgfHwgZy5jbGllbnRIZWlnaHQ7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB3aWR0aDogeCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB5XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmb3JtYXRMYXRMbmc6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIGVuc3VyZSBib3VuZHMgdmFsdWVzIGhhdmUgYXQgbGVhc3QgMSBkZWNpbWFsIHBsYWNlXG4gICAgICAgICAgICAgICAgcmV0dXJuICh2YWx1ZSAlIDEgPT09IDApID8gdmFsdWUudG9GaXhlZCgxKSA6IHZhbHVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEREQm91bmRzOiBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgc3csIG5lLCBib3VuZHM7XG4gICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ2RtcycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3cgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdChsb2NhdGlvbi5zb3V0aCwgbG9jYXRpb24ud2VzdCk7XG4gICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3QobG9jYXRpb24ubm9ydGgsIGxvY2F0aW9uLmVhc3QpO1xuICAgICAgICAgICAgICAgICAgICBib3VuZHMgPSBbW3N3LmRkWzBdLCBuZS5kZFsxXV0sIFtuZS5kZFswXSwgc3cuZGRbMV1dXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ21ncnMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3ID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KGxvY2F0aW9uLm1ncnNTVyk7XG4gICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KGxvY2F0aW9uLm1ncnNORSk7XG4gICAgICAgICAgICAgICAgICAgIGJvdW5kcyA9IFtbc3cuZGRbMF0sIG5lLmRkWzFdXSwgW25lLmRkWzBdLCBzdy5kZFsxXV1dO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRlZmluZSByZWN0YW5nbGUgZ2VvZ3JhcGhpY2FsIGJvdW5kc1xuICAgICAgICAgICAgICAgICAgICBib3VuZHMgPSBbW2xvY2F0aW9uLnNvdXRoLCBsb2NhdGlvbi5lYXN0XSwgW2xvY2F0aW9uLm5vcnRoLCBsb2NhdGlvbi53ZXN0XV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBib3VuZHM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29udmVydExhdExuZzogZnVuY3Rpb24gKGxvY2F0aW9uLCBuZXdGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29vcmRpbmF0ZXMsIGxhdExuZztcbiAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24uZm9ybWF0ID09PSAnZG1zJykge1xuICAgICAgICAgICAgICAgICAgICBjb29yZGluYXRlcyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG5nKTtcbiAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzBdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxuZzogcGFyc2VGbG9hdChjb29yZGluYXRlcy5kZFsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICBtZ3JzOiBjb29yZGluYXRlcy5tZ3JzXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsb2NhdGlvbi5mb3JtYXQgPT09ICdtZ3JzJykge1xuICAgICAgICAgICAgICAgICAgICBjb29yZGluYXRlcyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdChsb2NhdGlvbi5tZ3JzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhdDogcGFyc2VGbG9hdChjb29yZGluYXRlcy5kZFswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzOiBjb29yZGluYXRlcy5tZ3JzXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RtcycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdExuZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IGNvb3JkaW5hdGVzLmRtc1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGNvb3JkaW5hdGVzLmRtc1sxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzOiBjb29yZGluYXRlcy5tZ3JzXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsb2NhdGlvbi5mb3JtYXQgPT09ICdkZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZXMgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckREQnJvYWRjYXN0KGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG5nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0Zvcm1hdCA9PT0gJ2RtcycgfHwgbmV3Rm9ybWF0ID09PSAnbWdycycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdExuZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IGNvb3JkaW5hdGVzLmRtc1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGNvb3JkaW5hdGVzLmRtc1sxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzOiBjb29yZGluYXRlcy5tZ3JzXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0TG5nID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhdDogcGFyc2VGbG9hdChjb29yZGluYXRlcy5kZFswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBwYXJzZUZsb2F0KGNvb3JkaW5hdGVzLmRkWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzOiBjb29yZGluYXRlcy5tZ3JzXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBsYXRMbmc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2hvd0Vycm9yOiBmdW5jdGlvbiAoZXJyb3IsIHR5cGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3JDb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZXJyb3IuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yQ29udGVudCA9IGVycm9yLmRhdGEuam9pbignPGJyIC8+Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goXy5rZXlzKGVycm9yLmRhdGEpLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JDb250ZW50ICs9IGtleSArICc6ICcgKyBlcnJvci5kYXRhW2tleV0gKyAnPGJyIC8+JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBlcnJvci5zdGF0dXMgPiAtMSA/IGVycm9yLnN0YXR1cyArICc6ICcgKyBlcnJvci5zdGF0dXNUZXh0IDogJ0Nvbm5lY3Rpb24gRXJyb3InLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiAnPGJyIC8+JyArIGVycm9yQ29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuc2VydmljZSgnc3RhdGVTZXJ2aWNlJywgZnVuY3Rpb24gKFxuICAgICAgICAkcSxcbiAgICAgICAgJGh0dHAsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgJHJvb3RTY29wZSxcbiAgICAgICAgJHRpbWVvdXQsXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBDYW52YXNJbWFnZU92ZXJsYXksXG4gICAgICAgIG1vbWVudCxcbiAgICAgICAgbG9jYWxTdG9yYWdlLFxuICAgICAgICBDaXJjdWxhckpTT04sXG4gICAgICAgIEwsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpLFxuICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5ID0gbmV3IENhbnZhc0ltYWdlT3ZlcmxheSgpLFxuICAgICAgICAgICAgYWN0aXZlU3RhdGUgPSBudWxsLFxuICAgICAgICAgICAgbWFwID0ge30sXG4gICAgICAgICAgICBtYXBGZWF0dXJlR3JvdXAgPSB7fTtcblxuICAgICAgICB2YXIgc2lnbWFTdGF0ZSA9IHtcbiAgICAgICAgICAgIHFzOiBxcyxcbiAgICAgICAgICAgIHZpZXdNb2RlOiBxcy5tb2RlIHx8IHNpZ21hQ29uZmlnLmRlZmF1bHRWaWV3TW9kZSxcbiAgICAgICAgICAgIGJib3g6IHt9LFxuICAgICAgICAgICAgbWFwQ2VudGVyOiB7XG4gICAgICAgICAgICAgICAgbGF0OiBwYXJzZUZsb2F0KHFzLmxhdCkgfHwgc2lnbWFDb25maWcubWFwQ2VudGVyLmxhdCxcbiAgICAgICAgICAgICAgICBsbmc6IHBhcnNlRmxvYXQocXMubG5nKSB8fCBzaWdtYUNvbmZpZy5tYXBDZW50ZXIubG5nLFxuICAgICAgICAgICAgICAgIHpvb206IHBhcnNlSW50KHFzLnpvb20pIHx8IHNpZ21hQ29uZmlnLm1hcENlbnRlci56b29tXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9jYXRpb25Gb3JtYXQ6IHFzLmxvY2F0aW9uRm9ybWF0LFxuICAgICAgICAgICAgcGxheWJhY2tTdGF0ZTogJycsXG4gICAgICAgICAgICBwbGF5YmFja0RpcmVjdGlvbjogJycsXG4gICAgICAgICAgICBwbGF5YmFja0ludGVydmFsOiBfLmZpbmQoc2lnbWFDb25maWcucGxheWJhY2tJbnRlcnZhbHMsIHsgZGVmYXVsdDogdHJ1ZSB9KSxcbiAgICAgICAgICAgIHBsYXliYWNrSW50ZXJ2YWxRdHk6IHNpZ21hQ29uZmlnLmRlZmF1bHRQbGF5YmFja0ludGVydmFsUXR5LFxuICAgICAgICAgICAgcGxheWJhY2tTcGVlZDogc2lnbWFDb25maWcubWF4UGxheWJhY2tEZWxheSxcbiAgICAgICAgICAgIHBsYXliYWNrT3BhY2l0eTogc2lnbWFDb25maWcuZGVmYXVsdExheWVyT3BhY2l0eSxcbiAgICAgICAgICAgIGZyYW1lSW5kZXhlczogW10sXG4gICAgICAgICAgICBmcmFtZUN1cnJlbnQ6IDAsXG4gICAgICAgICAgICBmcmFtZUV4dGVudHM6IHt9LFxuICAgICAgICAgICAgZnJhbWVPdmVybGF5czogW10sXG4gICAgICAgICAgICB0aW1lU2xpZGVyRXh0ZW50czoge30sXG4gICAgICAgICAgICBicnVzaEV4dGVudHM6IHt9LFxuICAgICAgICAgICAgYnJ1c2hSZXNldDogZmFsc2UsXG4gICAgICAgICAgICBlbmFibGVDb3ZlcmFnZTogcXMuZW5hYmxlQ292ZXJhZ2UsXG4gICAgICAgICAgICBjb3ZlcmFnZU9wYWNpdHk6IHFzLmNvdmVyYWdlT3BhY2l0eSxcbiAgICAgICAgICAgIGNvdmVyYWdlRGF0YTogbnVsbCxcbiAgICAgICAgICAgIG1hcE1vZGU6ICdkZWZhdWx0JyxcbiAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyOiB7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IHFzLnN0YXJ0LFxuICAgICAgICAgICAgICAgIHN0b3A6IHFzLnN0b3AsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IHFzLmR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uTGVuZ3RoOiBxcy5kdXJhdGlvbkxlbmd0aFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRpbWVTbGlkZXJEYXRhOiB7fSxcbiAgICAgICAgICAgIHRpbWVTbGlkZXJGcmVxdWVuY3k6IG51bGwsIC8vIGluaXQgdG8gbnVsbCBzbyAkd2F0Y2ggZXZlbnQgd2lsbCBkZXRlY3QgYSBjaGFuZ2VcbiAgICAgICAgICAgIHBvaW50Q29udmVydGVyRGF0YTogbnVsbCxcbiAgICAgICAgICAgIGNvcnJlbGF0aW9uRGF0YTogbnVsbCxcbiAgICAgICAgICAgIHByZWxvYWRlZEltYWdlczogW10sXG4gICAgICAgICAgICBiYXNlbGF5ZXI6IG51bGwsXG4gICAgICAgICAgICBjb250cmFzdExldmVsOiBfLmZpbmQoc2lnbWFDb25maWcuY29udHJhc3RMZXZlbHMsIHsgZGVmYXVsdDogdHJ1ZSB9KSxcbiAgICAgICAgICAgIHNwYXRpYWxab29tOiAnJyxcbiAgICAgICAgICAgIHRlbXBvcmFsWm9vbTogJycsXG4gICAgICAgICAgICBiYW5kOiBxcy5iYW5kLFxuICAgICAgICAgICAgdmlld3BvcnRTaXplOiB7fSxcbiAgICAgICAgICAgIGltYWdlUXVhbGl0eTogc2lnbWFDb25maWcuZGVmYXVsdEltYWdlUXVhbGl0eSxcbiAgICAgICAgICAgIHNlbnNvcjogcXMuc2Vuc29yXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHFzLm4gfHwgcXMubmUpIHtcbiAgICAgICAgICAgIHNpZ21hU3RhdGUuYmJveCA9IHtcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IHNpZ21hU3RhdGUubG9jYXRpb25Gb3JtYXQsXG4gICAgICAgICAgICAgICAgbm9ydGg6IHNpZ21hU3RhdGUubG9jYXRpb25Gb3JtYXQgPT09ICdkZCcgPyBwYXJzZUZsb2F0KHFzLm4pIDogcXMubixcbiAgICAgICAgICAgICAgICBzb3V0aDogc2lnbWFTdGF0ZS5sb2NhdGlvbkZvcm1hdCA9PT0gJ2RkJyA/IHBhcnNlRmxvYXQocXMucykgOiBxcy5zLFxuICAgICAgICAgICAgICAgIGVhc3Q6IHNpZ21hU3RhdGUubG9jYXRpb25Gb3JtYXQgPT09ICdkZCcgPyBwYXJzZUZsb2F0KHFzLmUpIDogcXMuZSxcbiAgICAgICAgICAgICAgICB3ZXN0OiBzaWdtYVN0YXRlLmxvY2F0aW9uRm9ybWF0ID09PSAnZGQnID8gcGFyc2VGbG9hdChxcy53KSA6IHFzLncsXG4gICAgICAgICAgICAgICAgbWdyc05FOiBxcy5uZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBtZ3JzU1c6IHFzLnN3IHx8ICcnXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHFzLnN0YXJ0ICYmIHFzLnN0b3ApIHtcbiAgICAgICAgICAgIHNpZ21hU3RhdGUudGltZVNsaWRlckV4dGVudHMgPSB7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IG1vbWVudC51dGMocXMuc3RhcnQpLnRvRGF0ZSgpLFxuICAgICAgICAgICAgICAgIHN0b3A6IG1vbWVudC51dGMocXMuc3RvcCkudG9EYXRlKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0UXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS5xcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRRczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLnFzID0gZGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRBY3RpdmVTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY3RpdmVTdGF0ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRBY3RpdmVTdGF0ZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBhY3RpdmVTdGF0ZSA9IGRhdGE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Vmlld01vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS52aWV3TW9kZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRWaWV3TW9kZTogZnVuY3Rpb24gKG1vZGUpIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLnZpZXdNb2RlID0gbW9kZTtcbiAgICAgICAgICAgICAgICBxcy5tb2RlID0gbW9kZTtcblxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENhbnZhc0ltYWdlT3ZlcmxheTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYW52YXNJbWFnZU92ZXJsYXk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0Q2FudmFzSW1hZ2VPdmVybGF5OiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIGNhbnZhc0ltYWdlT3ZlcmxheSA9IGRhdGE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0QmJveFBhcmFtczogZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFsb2NhdGlvbi5mb3JtYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uZm9ybWF0ID0gc2lnbWFDb25maWcuZGVmYXVsdExvY2F0aW9uRm9ybWF0O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldExvY2F0aW9uRm9ybWF0KGxvY2F0aW9uLmZvcm1hdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlmIGFueXRoaW5nIGNoYW5nZSwgdXBkYXRlICRsb2NhdGlvbi5zZWFyY2goKSBhbmQgYnJvYWRjYXN0IG5vdGlmaWNhdGlvbiBvZiBjaGFuZ2VcbiAgICAgICAgICAgICAgICBpZiAoc2lnbWFTdGF0ZS5iYm94Lm5vcnRoICE9PSBsb2NhdGlvbi5ub3J0aCB8fCBzaWdtYVN0YXRlLmJib3guc291dGggIT09IGxvY2F0aW9uLnNvdXRoIHx8IHNpZ21hU3RhdGUuYmJveC5lYXN0ICE9PSBsb2NhdGlvbi5lYXN0IHx8IHNpZ21hU3RhdGUuYmJveC53ZXN0ICE9PSBsb2NhdGlvbi53ZXN0IHx8IHNpZ21hU3RhdGUubG9jYXRpb25Gb3JtYXQgIT09IGxvY2F0aW9uLmZvcm1hdCB8fCBzaWdtYVN0YXRlLmJib3gubWdyc05FICE9PSBsb2NhdGlvbi5tZ3JzTkUgfHwgc2lnbWFTdGF0ZS5iYm94Lm1ncnNTVyAhPT0gbG9jYXRpb24ubWdyc1NXKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb2NhdGlvbi5ub3J0aCAhPT0gJycgJiYgbG9jYXRpb24uc291dGggIT09ICcnICYmIGxvY2F0aW9uLmVhc3QgIT09ICcnICYmIGxvY2F0aW9uLndlc3QgIT09ICcnICYmIGxvY2F0aW9uLmZvcm1hdCA9PT0gJ2RkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubm9ydGggPSBwYXJzZUZsb2F0KGxvY2F0aW9uLm5vcnRoKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uc291dGggPSBwYXJzZUZsb2F0KGxvY2F0aW9uLnNvdXRoKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uZWFzdCA9IHBhcnNlRmxvYXQobG9jYXRpb24uZWFzdCkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLndlc3QgPSBwYXJzZUZsb2F0KGxvY2F0aW9uLndlc3QpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCYm94KGxvY2F0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgcXMubiA9IGxvY2F0aW9uLm5vcnRoID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5ub3J0aDtcbiAgICAgICAgICAgICAgICAgICAgcXMucyA9IGxvY2F0aW9uLnNvdXRoID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5zb3V0aDtcbiAgICAgICAgICAgICAgICAgICAgcXMuZSA9IGxvY2F0aW9uLmVhc3QgPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLmVhc3Q7XG4gICAgICAgICAgICAgICAgICAgIHFzLncgPSBsb2NhdGlvbi53ZXN0ID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi53ZXN0O1xuICAgICAgICAgICAgICAgICAgICBxcy5sb2NhdGlvbkZvcm1hdCA9IGxvY2F0aW9uLmZvcm1hdCA9PT0gJycgPyBudWxsIDogbG9jYXRpb24uZm9ybWF0O1xuICAgICAgICAgICAgICAgICAgICBxcy5uZSA9IGxvY2F0aW9uLm1ncnNORSA9PT0gJycgPyBudWxsIDogbG9jYXRpb24ubWdyc05FO1xuICAgICAgICAgICAgICAgICAgICBxcy5zdyA9IGxvY2F0aW9uLm1ncnNTVyA9PT0gJycgPyBudWxsIDogbG9jYXRpb24ubWdyc1NXO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldExvY2F0aW9uRm9ybWF0KHFzLmxvY2F0aW9uRm9ybWF0KTtcbiAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEJib3g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS5iYm94O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldEJib3g6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLmJib3ggPSB2YWw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0TWFwRmVhdHVyZUdyb3VwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hcEZlYXR1cmVHcm91cDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRNYXBGZWF0dXJlR3JvdXA6IGZ1bmN0aW9uIChmZWF0dXJlR3JvdXApIHtcbiAgICAgICAgICAgICAgICBtYXBGZWF0dXJlR3JvdXAgPSBmZWF0dXJlR3JvdXA7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0TWFwQ2VudGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ21hU3RhdGUubWFwQ2VudGVyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldE1hcENlbnRlcjogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLm1hcENlbnRlciA9IGRhdGE7XG4gICAgICAgICAgICAgICAgcXMubGF0ID0gZGF0YS5sYXQ7XG4gICAgICAgICAgICAgICAgcXMubG5nID0gZGF0YS5sbmc7XG4gICAgICAgICAgICAgICAgcXMuem9vbSA9IGRhdGEuem9vbTtcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHFzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRMb2NhdGlvbkZvcm1hdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLmxvY2F0aW9uRm9ybWF0O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldExvY2F0aW9uRm9ybWF0OiBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5sb2NhdGlvbkZvcm1hdCA9IGZvcm1hdDtcbiAgICAgICAgICAgICAgICBxcy5sb2NhdGlvbkZvcm1hdCA9IGZvcm1hdDtcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHFzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRQbGF5YmFja1N0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ21hU3RhdGUucGxheWJhY2tTdGF0ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRQbGF5YmFja1N0YXRlOiBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLnBsYXliYWNrU3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRQbGF5YmFja0RpcmVjdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLnBsYXliYWNrRGlyZWN0aW9uO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFBsYXliYWNrRGlyZWN0aW9uOiBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5wbGF5YmFja0RpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRQbGF5YmFja0ludGVydmFsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ21hU3RhdGUucGxheWJhY2tJbnRlcnZhbDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRQbGF5YmFja0ludGVydmFsOiBmdW5jdGlvbiAoaW50ZXJ2YWwpIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLnBsYXliYWNrSW50ZXJ2YWwgPSBpbnRlcnZhbDtcbiAgICAgICAgICAgICAgICBxcy5wbGF5YmFja0ludGVydmFsID0gaW50ZXJ2YWwudmFsdWU7XG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0UGxheWJhY2tJbnRlcnZhbFF0eTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLnBsYXliYWNrSW50ZXJ2YWxRdHk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0UGxheWJhY2tJbnRlcnZhbFF0eTogZnVuY3Rpb24gKHF0eSkge1xuICAgICAgICAgICAgICAgIHNpZ21hU3RhdGUucGxheWJhY2tJbnRlcnZhbFF0eSA9IHF0eTtcbiAgICAgICAgICAgICAgICBxcy5wbGF5YmFja0ludGVydmFsUXR5ID0gcXR5O1xuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFBsYXliYWNrU3BlZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS5wbGF5YmFja1NwZWVkO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFBsYXliYWNrU3BlZWQ6IGZ1bmN0aW9uIChzcGVlZCkge1xuICAgICAgICAgICAgICAgIHNpZ21hU3RhdGUucGxheWJhY2tTcGVlZCA9IHNwZWVkO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFBsYXliYWNrT3BhY2l0eTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLnBsYXliYWNrT3BhY2l0eTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRQbGF5YmFja09wYWNpdHk6IGZ1bmN0aW9uIChvcGFjaXR5KSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5wbGF5YmFja09wYWNpdHkgPSBvcGFjaXR5O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEZyYW1lSW5kZXhlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLmZyYW1lSW5kZXhlcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRGcmFtZUluZGV4ZXM6IGZ1bmN0aW9uIChpbmRleGVzKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5mcmFtZUluZGV4ZXMgPSBpbmRleGVzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEZyYW1lQ3VycmVudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLmZyYW1lQ3VycmVudDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRGcmFtZUN1cnJlbnQ6IGZ1bmN0aW9uIChmcmFtZSkge1xuICAgICAgICAgICAgICAgIHNpZ21hU3RhdGUuZnJhbWVDdXJyZW50ID0gZnJhbWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0RnJhbWVFeHRlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ21hU3RhdGUuZnJhbWVFeHRlbnRzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldEZyYW1lRXh0ZW50czogZnVuY3Rpb24gKHN0YXJ0LCBzdG9wKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5mcmFtZUV4dGVudHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgICAgICAgc3RvcDogc3RvcFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0RnJhbWVPdmVybGF5czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLmZyYW1lT3ZlcmxheXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0RnJhbWVPdmVybGF5czogZnVuY3Rpb24gKG92ZXJsYXlzKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5mcmFtZU92ZXJsYXlzID0gb3ZlcmxheXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VGltZVNsaWRlckV4dGVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS50aW1lU2xpZGVyRXh0ZW50cztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRUaW1lU2xpZGVyRXh0ZW50czogZnVuY3Rpb24gKHN0YXJ0LCBzdG9wKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS50aW1lU2xpZGVyRXh0ZW50cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBzdG9wOiBzdG9wXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRCcnVzaEV4dGVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS5icnVzaEV4dGVudHM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0QnJ1c2hFeHRlbnRzOiBmdW5jdGlvbiAoc3RhcnQsIHN0b3ApIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLmJydXNoRXh0ZW50cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBzdG9wOiBzdG9wXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRCcnVzaFJlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ21hU3RhdGUuYnJ1c2hSZXNldDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRCcnVzaFJlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5icnVzaFJlc2V0ID0gIXNpZ21hU3RhdGUuYnJ1c2hSZXNldDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRFbmFibGVDb3ZlcmFnZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5lbmFibGVDb3ZlcmFnZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBxcy5lbmFibGVDb3ZlcmFnZSA9IHZhbHVlID8gdmFsdWUudG9TdHJpbmcoKSA6IHNpZ21hQ29uZmlnLmRlZmF1bHRFbmFibGVDb3ZlcmFnZS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHFzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0RW5hYmxlQ292ZXJhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS5lbmFibGVDb3ZlcmFnZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRDb3ZlcmFnZU9wYWNpdHk6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHNpZ21hU3RhdGUuY292ZXJhZ2VPcGFjaXR5ID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcXMuY292ZXJhZ2VPcGFjaXR5ID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q292ZXJhZ2VPcGFjaXR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ21hU3RhdGUuY292ZXJhZ2VPcGFjaXR5O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldENvdmVyYWdlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLmNvdmVyYWdlRGF0YSA9IHZhbHVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENvdmVyYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ21hU3RhdGUuY292ZXJhZ2VEYXRhO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldE1hcDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXA7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0TWFwOiBmdW5jdGlvbiAobWFwSW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICBtYXAgPSBtYXBJbnN0YW5jZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRNYXBNb2RlOiBmdW5jdGlvbiAobW9kZSkge1xuICAgICAgICAgICAgICAgIHNpZ21hU3RhdGUubWFwTW9kZSA9IG1vZGU7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ21hcCBtb2RlIHNldCB0byAnICsgbW9kZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0TWFwTW9kZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLm1hcE1vZGU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0TWFwQm91bmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1hcC5nZXRCb3VuZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJvdW5kcyA9IG1hcC5nZXRCb3VuZHMoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvdW5kcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1heExhdExuZ0JvdW5kcyA9IEwubGF0TG5nQm91bmRzKHNpZ21hQ29uZmlnLm1heEJvdW5kcy5ub3J0aEVhc3QsIHNpZ21hQ29uZmlnLm1heEJvdW5kcy5zb3V0aFdlc3QpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzSW5Cb3VuZHMgPSBtYXhMYXRMbmdCb3VuZHMuY29udGFpbnMoYm91bmRzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0luQm91bmRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9ydGg6IGJvdW5kcy5fbm9ydGhFYXN0LmxhdCA+IG1heExhdExuZ0JvdW5kcy5fbm9ydGhFYXN0LmxhdCA/IG1heExhdExuZ0JvdW5kcy5fbm9ydGhFYXN0LmxhdCA6IGJvdW5kcy5fbm9ydGhFYXN0LmxhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291dGg6IGJvdW5kcy5fc291dGhXZXN0LmxhdCA8IG1heExhdExuZ0JvdW5kcy5fc291dGhXZXN0LmxhdCA/IG1heExhdExuZ0JvdW5kcy5fc291dGhXZXN0LmxhdCA6IGJvdW5kcy5fc291dGhXZXN0LmxhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWFzdDogYm91bmRzLl9ub3J0aEVhc3QubG5nID4gbWF4TGF0TG5nQm91bmRzLl9ub3J0aEVhc3QubG5nID8gbWF4TGF0TG5nQm91bmRzLl9ub3J0aEVhc3QubG5nIDogYm91bmRzLl9ub3J0aEVhc3QubG5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZXN0OiBib3VuZHMuX3NvdXRoV2VzdC5sbmcgPCBtYXhMYXRMbmdCb3VuZHMuX3NvdXRoV2VzdC5sbmcgPyBtYXhMYXRMbmdCb3VuZHMuX3NvdXRoV2VzdC5sbmcgOiBib3VuZHMuX3NvdXRoV2VzdC5sbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3J0aDogYm91bmRzLl9ub3J0aEVhc3QubGF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXRoOiBib3VuZHMuX3NvdXRoV2VzdC5sYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWFzdDogYm91bmRzLl9ub3J0aEVhc3QubG5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlc3Q6IGJvdW5kcy5fc291dGhXZXN0LmxuZ1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjbGVhckFPSTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QmJveFBhcmFtcyhcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9ydGg6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgc291dGg6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZWFzdDogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICB3ZXN0OiAnJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1hcE1vZGUoJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRUZW1wb3JhbEZpbHRlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLnRlbXBvcmFsRmlsdGVyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyOiBmdW5jdGlvbiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIHFzRmlsdGVyID0ge1xuICAgICAgICAgICAgICAgICAgICBzdGFydDogcXMuc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHN0b3A6IHFzLnN0b3AsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBxcy5kdXJhdGlvbiA/IHFzLmR1cmF0aW9uIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25MZW5ndGg6IHFzLmR1cmF0aW9uTGVuZ3RoID8gcGFyc2VJbnQocXMuZHVyYXRpb25MZW5ndGgpIDogbnVsbFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIGZpbHRlclN0YXJ0ID0gJycsXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclN0b3AgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXIuZXF1YWxzKHFzRmlsdGVyLCBmaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIuZHVyYXRpb24gJiYgZmlsdGVyLmR1cmF0aW9uTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdGFydCA9IG1vbWVudC51dGMoKS5zdWJ0cmFjdChmaWx0ZXIuZHVyYXRpb25MZW5ndGgsIGZpbHRlci5kdXJhdGlvbikuc3RhcnRPZignZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RvcCA9IG1vbWVudC51dGMoKS5lbmRPZignZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcXMuc3RhcnQgPSBmaWx0ZXJTdGFydC50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcXMuc3RvcCA9IGZpbHRlclN0b3AudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHFzLmR1cmF0aW9uID0gZmlsdGVyLmR1cmF0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgcXMuZHVyYXRpb25MZW5ndGggPSBmaWx0ZXIuZHVyYXRpb25MZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdGFydCA9IG1vbWVudC51dGMoZmlsdGVyLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlclN0b3AgPSBtb21lbnQudXRjKGZpbHRlci5zdG9wKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHFzLnN0YXJ0ID0gZmlsdGVyU3RhcnQudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHFzLnN0b3AgPSBmaWx0ZXJTdG9wLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBxcy5kdXJhdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBxcy5kdXJhdGlvbkxlbmd0aCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyLnN0YXJ0ID0gZmlsdGVyU3RhcnQudG9EYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpbHRlci5zdG9wID0gZmlsdGVyU3RvcC50b0RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS50ZW1wb3JhbEZpbHRlciA9IGZpbHRlcjtcbiAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzaWdtYVN0YXRlLnRlbXBvcmFsRmlsdGVyLnN0YXJ0IHx8ICFzaWdtYVN0YXRlLnRlbXBvcmFsRmlsdGVyLnN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpZ21hU3RhdGUudGVtcG9yYWxGaWx0ZXIgPSBmaWx0ZXI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VGltZVNsaWRlckRhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS50aW1lU2xpZGVyRGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRUaW1lU2xpZGVyRGF0YTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLnRpbWVTbGlkZXJEYXRhID0gZGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRUaW1lU2xpZGVyRnJlcXVlbmN5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ21hU3RhdGUudGltZVNsaWRlckZyZXF1ZW5jeTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRUaW1lU2xpZGVyRnJlcXVlbmN5OiBmdW5jdGlvbiAoZnJlcXVlbmN5KSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS50aW1lU2xpZGVyRnJlcXVlbmN5ID0gZnJlcXVlbmN5O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFByZWxvYWRlZEltYWdlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLnByZWxvYWRlZEltYWdlcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRQcmVsb2FkZWRJbWFnZXM6IGZ1bmN0aW9uIChpbWFnZXMpIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLnByZWxvYWRlZEltYWdlcyA9IGltYWdlcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRQb2ludENvbnZlcnRlckRhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS5wb2ludENvbnZlcnRlckRhdGE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0UG9pbnRDb252ZXJ0ZXJEYXRhOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHNpZ21hU3RhdGUucG9pbnRDb252ZXJ0ZXJEYXRhID0gZGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRDb3JyZWxhdGlvbkRhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS5jb3JyZWxhdGlvbkRhdGE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0Q29ycmVsYXRpb25EYXRhOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgncmVjZW50Q29ycmVsYXRpb25zJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNpZ21hU3RhdGUuY29ycmVsYXRpb25EYXRhID0gZGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRCYXNlbGF5ZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS5iYXNlbGF5ZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0QmFzZWxheWVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLmJhc2VsYXllciA9IGxheWVyO1xuICAgICAgICAgICAgICAgIHFzLmJhc2VsYXllciA9IGxheWVyLmlkO1xuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENvbnRyYXN0TGV2ZWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lnbWFTdGF0ZS5jb250cmFzdExldmVsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldENvbnRyYXN0TGV2ZWw6IGZ1bmN0aW9uIChsZXZlbCkge1xuICAgICAgICAgICAgICAgIHNpZ21hU3RhdGUuY29udHJhc3RMZXZlbCA9IGxldmVsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFNwYXRpYWxab29tOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ21hU3RhdGUuc3BhdGlhbFpvb207XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0U3BhdGlhbFpvb206IGZ1bmN0aW9uICh6b29tKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5zcGF0aWFsWm9vbSA9IHpvb207XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VGVtcG9yYWxab29tOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ21hU3RhdGUudGVtcG9yYWxab29tO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFRlbXBvcmFsWm9vbTogZnVuY3Rpb24gKHpvb20pIHtcbiAgICAgICAgICAgICAgICBzaWdtYVN0YXRlLnRlbXBvcmFsWm9vbSA9IHpvb207XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0QmFuZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLmJhbmQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0QmFuZDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5iYW5kID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcXMuYmFuZCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFZpZXdwb3J0U2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLnZpZXdwb3J0U2l6ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRWaWV3cG9ydFNpemU6IGZ1bmN0aW9uIChzaXplKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS52aWV3cG9ydFNpemUgPSBzaXplO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEltYWdlUXVhbGl0eTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLmltYWdlUXVhbGl0eTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRJbWFnZVF1YWxpdHk6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZS5pbWFnZVF1YWxpdHkgPSBkYXRhO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFNlbnNvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWdtYVN0YXRlLnNlbnNvcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRTZW5zb3I6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHNpZ21hU3RhdGUuc2Vuc29yID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcXMuc2Vuc29yID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0U3RhdGU6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgc2lnbWFTdGF0ZSA9IGRhdGE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0U3RhdGU6IGZ1bmN0aW9uIChzdGF0ZUlkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpLFxuICAgICAgICAgICAgICAgICAgICBzZWxmID0gdGhpcztcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBzaWdtYUNvbmZpZy51cmxzLmFwcFN0YXRlICsgJy9zdGF0ZS8nICsgc3RhdGVJZFxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld1N0YXRlID0gQ2lyY3VsYXJKU09OLnBhcnNlKHJlc3VsdC5kYXRhLnVzZXJfc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICBxcyA9IG5ld1N0YXRlLnFzO1xuICAgICAgICAgICAgICAgICAgICBxcy5pZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0QWN0aXZlU3RhdGUocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUobmV3U3RhdGUpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIGVycm9yQ2FsbGJhY2sgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1cGRhdGVTdGF0ZVRpdGxlOiBmdW5jdGlvbiAoaWQsIHRpdGxlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRRcygkbG9jYXRpb24uc2VhcmNoKCkpO1xuICAgICAgICAgICAgICAgIHZhciBkID0gJHEuZGVmZXIoKSxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogc2lnbWFDb25maWcudXJscy5hcHBTdGF0ZSArICcvc3RhdGUvJyArIGlkLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBwYXJhbXNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayhyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayhlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2F2ZVN0YXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFFzKCRsb2NhdGlvbi5zZWFyY2goKSk7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyX3N0YXRlOiBDaXJjdWxhckpTT04uc3RyaW5naWZ5KHNpZ21hU3RhdGUpXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogc2lnbWFDb25maWcudXJscy5hcHBTdGF0ZSArICcvc3RhdGUvJyArIGlkLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBwYXJhbXNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayhyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayhlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY3JlYXRlU3RhdGU6IGZ1bmN0aW9uICh1c2VyTmFtZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0UXMoJGxvY2F0aW9uLnNlYXJjaCgpKTtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCksXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJfbmFtZTogdXNlck5hbWUgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcF9uYW1lOiAnc2lnbWEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlcl9zdGF0ZTogQ2lyY3VsYXJKU09OLnN0cmluZ2lmeShzaWdtYVN0YXRlKVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBzaWdtYUNvbmZpZy51cmxzLmFwcFN0YXRlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBwYXJhbXNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayhyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayhlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0U3RhdGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHNpZ21hQ29uZmlnLnVybHMuYXBwU3RhdGUgKyAnL2FwcC9zaWdtYSdcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlbGV0ZVN0YXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICAgICAgICAgIHVybDogc2lnbWFDb25maWcudXJscy5hcHBTdGF0ZSArICcvc3RhdGUvJyArIGlkXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2socmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIGVycm9yQ2FsbGJhY2soZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdzZWFyY2hDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgJGFsZXJ0LFxuICAgICAgICAkdGltZW91dCxcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHNpZ21hU2VydmljZSxcbiAgICAgICAgc2VhcmNoU2VydmljZSxcbiAgICAgICAgYW5hbHl6ZVNlcnZpY2UsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgbGVhZmxldERhdGEsXG4gICAgICAgIGJsb2NrVUksXG4gICAgICAgIF8sXG4gICAgICAgIG1vbWVudFxuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXG4gICAgICAgICAgICBlbmFibGVDb3ZlcmFnZSA9IHFzLmVuYWJsZUNvdmVyYWdlID09PSAndHJ1ZSc7XG5cbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5pbml0aWFsaXplZCA9IGZhbHNlO1xuICAgICAgICB2bS5iYm94ID0gbnVsbDtcbiAgICAgICAgdm0ubW9kZSA9IHFzLm1vZGUgfHwgc3RhdGVTZXJ2aWNlLmdldFZpZXdNb2RlKCk7XG5cbiAgICAgICAgdmFyIGdldE1hcEJvdW5kcywgZ2V0VGVtcG9yYWxGaWx0ZXIsIGdldEVuYWJsZUNvdmVyYWdlLCBnZXRCYW5kLCBnZXRTZW5zb3IsIGdldEJib3g7XG5cbiAgICAgICAgdmFyIGdlbmVyYXRlU2VhcmNoRnJlcXVlbmN5ID0gZnVuY3Rpb24gKHRpbWVsaW5lKSB7XG4gICAgICAgICAgICB2YXIgZnJlcXVlbmN5ID0gW10sXG4gICAgICAgICAgICAgICAgdGltZVNsaWRlckV4dGVudHMgPSBzdGF0ZVNlcnZpY2UuZ2V0VGltZVNsaWRlckV4dGVudHMoKTtcblxuICAgICAgICAgICAgLy8gZGV0ZXJtaW5lIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuIHRpbWUgZXh0ZW50c1xuICAgICAgICAgICAgdmFyIG51bURheXMgPSBtb21lbnQudXRjKHRpbWVTbGlkZXJFeHRlbnRzLnN0b3ApLmRpZmYobW9tZW50LnV0Yyh0aW1lU2xpZGVyRXh0ZW50cy5zdGFydCksICdkJykgKyAxO1xuXG4gICAgICAgICAgICAvLyBhZGQgMCB2YWx1ZXMgZm9yIGV2ZXJ5IGRheSB0aGF0IGhhcyBubyB2YWx1ZSBpbiB0aW1lbGluZVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1EYXlzOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZSA9IG1vbWVudC51dGModGltZVNsaWRlckV4dGVudHMuc3RhcnQpLnN0YXJ0T2YoJ2QnKS5hZGQoaSwgJ2QnKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICBjb3VudCA9IF8uZmluZCh0aW1lbGluZSwgeyB0aW1lOiB0aW1lIH0pO1xuXG4gICAgICAgICAgICAgICAgZnJlcXVlbmN5LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICB0aW1lOiB0aW1lLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogY291bnQgPyBjb3VudC5jb3VudCA6IDBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZyZXF1ZW5jeTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdFNlYXJjaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB1cGRhdGVDb3ZlcmFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VhcmNoU2VydmljZS5nZXRDb3ZlcmFnZSgpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRDb3ZlcmFnZShkYXRhLmRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2lnbWFTZXJ2aWNlLnNob3dFcnJvcihlcnJvciwgJ2RhbmdlcicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBnZXRDb2xsZWN0Q291bnRzQnlEYXkgPSBfLmRlYm91bmNlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldENvbGxlY3RDb3VudHNCeURheSgpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3VsdC5kYXRhO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0aW1lbGluZSA9IFtdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGZvcm1hdCBjb3VudHMgaW50byBhbiBhcnJheSBvZiBvYmplY3RzIGZvciB1c2Ugd2l0aCB0aW1lU2xpZGVyXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChkYXRhLnJlc3VsdHMsIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWU6IG1vbWVudC51dGMocmVzdWx0LmRheSwgJ1lZWVktTS1EJykudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogcmVzdWx0LmNvdW50XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gc29ydCBieSBkYXRlIGFzY1xuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZSA9IF8uc29ydEJ5KHRpbWVsaW5lLCBbJ3RpbWUnXSwgWydhc2MnXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGZyZXF1ZW5jeSA9IGdlbmVyYXRlU2VhcmNoRnJlcXVlbmN5KHRpbWVsaW5lKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoXy5tYXgoZnJlcXVlbmN5KSA9PT0gMCB8fCBfLm1heChmcmVxdWVuY3kpID09PSAnLUluZmluaXR5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGFsZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0NvdmVyYWdlIEluZm9ybWF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiAnTm8gZmVhdHVyZXMgYXZhaWxhYmxlIGF0IHRoaXMgbG9jYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbmZvJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBwdWJsaXNoIGNoYW5nZXMgdG8gc3RhdGVTZXJ2aWNlXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUaW1lU2xpZGVyRnJlcXVlbmN5KGZyZXF1ZW5jeSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmVxdWVuY3kgPSBnZW5lcmF0ZVNlYXJjaEZyZXF1ZW5jeShbXSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUaW1lU2xpZGVyRnJlcXVlbmN5KGZyZXF1ZW5jeSk7XG4gICAgICAgICAgICAgICAgICAgIHNpZ21hU2VydmljZS5zaG93RXJyb3IoZXJyb3IsICdkYW5nZXInKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIDc1MCk7XG5cbiAgICAgICAgICAgIGdldE1hcEJvdW5kcyA9ICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TWFwQm91bmRzKCknLCBfLmRlYm91bmNlKGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwICYmIHZtLm1vZGUgPT09ICdzZWFyY2gnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRDb2xsZWN0Q291bnRzQnlEYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHNpZ21hQ29uZmlnLmRlYm91bmNlVGltZSkpO1xuXG4gICAgICAgICAgICBnZXRUZW1wb3JhbEZpbHRlciA9ICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKScsIF8uZGVib3VuY2UoZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID4gMCAmJiB2bS5tb2RlID09PSAnc2VhcmNoJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW5hYmxlQ292ZXJhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZUNvdmVyYWdlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihnZXRDb2xsZWN0Q291bnRzQnlEYXkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmcmVxdWVuY3kgPSBnZW5lcmF0ZVNlYXJjaEZyZXF1ZW5jeShbXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRpbWVTbGlkZXJGcmVxdWVuY3koZnJlcXVlbmN5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgc2lnbWFDb25maWcuZGVib3VuY2VUaW1lKSk7XG5cbiAgICAgICAgICAgIGdldEVuYWJsZUNvdmVyYWdlID0gJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldEVuYWJsZUNvdmVyYWdlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbmV3VmFsdWUgPSB0eXBlb2YgbmV3VmFsdWUgPT09ICdzdHJpbmcnID8gbmV3VmFsdWUgPT09ICd0cnVlJyA6IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIG9sZFZhbHVlID0gdHlwZW9mIG9sZFZhbHVlID09PSAnc3RyaW5nJyA/IG9sZFZhbHVlID09PSAndHJ1ZScgOiBvbGRWYWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVuYWJsZUNvdmVyYWdlID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlICYmIHZtLm1vZGUgPT09ICdzZWFyY2gnKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUNvdmVyYWdlKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGdldENvbGxlY3RDb3VudHNCeURheSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZyZXF1ZW5jeSA9IGdlbmVyYXRlU2VhcmNoRnJlcXVlbmN5KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUaW1lU2xpZGVyRnJlcXVlbmN5KGZyZXF1ZW5jeSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBnZXRCYW5kID0gJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldEJhbmQoKScsIF8uZGVib3VuY2UoZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlICYmIHZtLm1vZGUgPT09ICdzZWFyY2gnKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUNvdmVyYWdlKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGdldENvbGxlY3RDb3VudHNCeURheSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgc2lnbWFDb25maWcuZGVib3VuY2VUaW1lKSk7XG5cbiAgICAgICAgICAgIGdldFNlbnNvciA9ICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRTZW5zb3IoKScsIF8uZGVib3VuY2UoZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlID0gdHlwZW9mIG5ld1ZhbHVlID09PSAnc3RyaW5nJyA/IHBhcnNlSW50KG5ld1ZhbHVlKSA6IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIG9sZFZhbHVlID0gdHlwZW9mIG9sZFZhbHVlID09PSAnc3RyaW5nJyA/IHBhcnNlSW50KG9sZFZhbHVlKSA6IG9sZFZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlICYmIHZtLm1vZGUgPT09ICdzZWFyY2gnKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUNvdmVyYWdlKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGdldENvbGxlY3RDb3VudHNCeURheSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgc2lnbWFDb25maWcuZGVib3VuY2VUaW1lKSk7XG5cbiAgICAgICAgICAgIGdldEJib3ggPSAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJib3goKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2bS5tb2RlID09PSAnc2VhcmNoJykge1xuICAgICAgICAgICAgICAgICAgICB2bS5iYm94ID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRBbmFseXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRlbXBvcmFsRmlsdGVyID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCk7XG5cbiAgICAgICAgICAgIHZhciBnZW5lcmF0ZUFuYWx5emVGcmVxdWVuY3kgPSBmdW5jdGlvbiAodGltZWxpbmUpIHtcbiAgICAgICAgICAgICAgICAvLyBkZXRlcm1pbmUgdGhlIG51bWJlciBvZiBob3VycyBiZXR3ZWVuIHRpbWUgZXh0ZW50c1xuICAgICAgICAgICAgICAgIHZhciBmcmVxdWVuY3kgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgbnVtSG91cnMgPSBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0b3ApLmRpZmYobW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdGFydCksICdoJykgKyAxO1xuXG4gICAgICAgICAgICAgICAgLy8gYWRkIDAgdmFsdWVzIGZvciBldmVyeSBob3VyIHRoYXQgaGFzIG5vIHZhbHVlIGluIHRpbWVsaW5lXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Ib3VyczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aW1lID0gbW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdGFydCkuc3RhcnRPZignaCcpLmFkZChpLCAnaCcpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudCA9IF8uZmluZCh0aW1lbGluZSwgeyB0aW1lOiB0aW1lIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGZyZXF1ZW5jeS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWU6IHRpbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogY291bnQgPyBjb3VudC5jb3VudCA6IDBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyZXF1ZW5jeTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhbmFseXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBmcmVxdWVuY3kgPSBbXTtcbiAgICAgICAgICAgICAgICBibG9ja1VJLnN0YXJ0KCdMb2FkaW5nIEFPSSBEYXRhJyk7XG4gICAgICAgICAgICAgICAgYW5hbHl6ZVNlcnZpY2UuZ2V0T3ZlcmxheXMoKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSByZXN1bHQuZGF0YTtcblxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U3BhdGlhbFpvb20oZGF0YS5zcGF0aWFsWm9vbSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUZW1wb3JhbFpvb20oZGF0YS50ZW1wb3JhbFpvb20pO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmZyYW1lICYmIGRhdGEuZnJhbWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVsaW5lID0gW107XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGV4dHJhY3QgbnVtYmVyIG9mIGNvbGxlY3RzIHBlciBob3VyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY291bnRzID0gXy5jb3VudEJ5KGRhdGEuZnJhbWUsIGZ1bmN0aW9uIChmcmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnQudXRjKGZyYW1lLnRpbWUpLnN0YXJ0T2YoJ2gnKS50b0lTT1N0cmluZygpIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZm9ybWF0IGNvdW50cyBpbnRvIGFuIGFycmF5IG9mIG9iamVjdHMgZm9yIHVzZSB3aXRoIHRpbWVTbGlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChfLnRvUGFpcnMoY291bnRzKSwgZnVuY3Rpb24gKGNvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWU6IG1vbWVudC51dGMoY291bnRbMF0pLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiBjb3VudFsxXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNvcnQgYnkgZGF0ZSBhc2NcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lID0gXy5zb3J0QnkodGltZWxpbmUsIFsndGltZSddLCBbJ2FzYyddKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZnJlcXVlbmN5ID0gZ2VuZXJhdGVBbmFseXplRnJlcXVlbmN5KHRpbWVsaW5lKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8ubWF4KGZyZXF1ZW5jeSkgPT09IDAgfHwgXy5tYXgoZnJlcXVlbmN5KSA9PT0gJy1JbmZpbml0eScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkYWxlcnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0NvdmVyYWdlIEluZm9ybWF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogJ05vIGZlYXR1cmVzIGF2YWlsYWJsZSBhdCB0aGlzIGxvY2F0aW9uIGR1cmluZyBzcGVjaWZpZWQgdGltZSBpbnRlcnZhbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbmZvJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgc3RhdGVTZXJ2aWNlXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRpbWVTbGlkZXJGcmVxdWVuY3koZnJlcXVlbmN5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGltZVNsaWRlckRhdGEoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tVSS5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmVxdWVuY3kgPSBnZW5lcmF0ZUFuYWx5emVGcmVxdWVuY3koW10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRpbWVTbGlkZXJGcmVxdWVuY3koZnJlcXVlbmN5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUaW1lU2xpZGVyRGF0YShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdDb3ZlcmFnZSBJbmZvcm1hdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogJ05vIGZlYXR1cmVzIGF2YWlsYWJsZSBhdCB0aGlzIGxvY2F0aW9uIGR1cmluZyBzcGVjaWZpZWQgdGltZSBpbnRlcnZhbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2luZm8nXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyZXF1ZW5jeSA9IGdlbmVyYXRlQW5hbHl6ZUZyZXF1ZW5jeShbXSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUaW1lU2xpZGVyRnJlcXVlbmN5KGZyZXF1ZW5jeSk7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0NvbW11bmljYXRpb24gRXJyb3InLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogJ1VuYWJsZSB0byByZXRyaWV2ZSBBT0kgbWV0YWRhdGEuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgYW5hbHl6ZSgpO1xuXG4gICAgICAgICAgICAvLyBjbGVhciBjb3ZlcmFnZSBhbmQgZW5hYmxlQ292ZXJhZ2Ugc28gdGhlICR3YXRjaCBzdGF0ZW1lbnRzIGluIHNlYXJjaENvbnRyb2xsZXIgd2lsbCBvYnNlcnZlIHRoZSB2YWx1ZSBjaGFuZ2VcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRDb3ZlcmFnZShbXSk7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RW5hYmxlQ292ZXJhZ2UobnVsbCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZG9Jbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh2bS5tb2RlID09PSAnYW5hbHl6ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5pdEFuYWx5emUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2bS5tb2RlID0gJ3NlYXJjaCc7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXNJbWFnZU92ZXJsYXkgPSBzdGF0ZVNlcnZpY2UuZ2V0Q2FudmFzSW1hZ2VPdmVybGF5KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYW52YXNJbWFnZU92ZXJsYXkuaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24gKG1hcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbnZhc0ltYWdlT3ZlcmxheS5kZXN0cm95KG1hcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdFNlYXJjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0U2VhcmNoKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoJGxvY2F0aW9uLnNlYXJjaCgpLmlkKSB7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLmdldFN0YXRlKCRsb2NhdGlvbi5zZWFyY2goKS5pZCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBkb0luaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVzdG9yZSB0aGUgc3RhdGUgYW5kIHF1ZXJ5c3RyaW5nIGFmdGVyIGluaXQsIHNvIGFsbCB0aGUgY29udHJvbGxlcnMgd2lsbCB1cGRhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIHFzID0gZGF0YS5xcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRTdGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRRcyhkYXRhLnFzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBhbGVydCgnRXJyb3IgcmV0cmlldmluZyBzdGF0ZTogJyArIGVyci5zdGF0dXMgKyAnICcgKyBlcnIuc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2goeyBpZDogbnVsbCB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZG9Jbml0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRWaWV3TW9kZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5tb2RlID0gbmV3VmFsdWU7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgPT09ICdhbmFseXplJykge1xuICAgICAgICAgICAgICAgIC8vIGRlcmVnaXN0ZXIgdGhlIHNlYXJjaCB3YXRjaGVzXG4gICAgICAgICAgICAgICAgZ2V0TWFwQm91bmRzKCk7XG4gICAgICAgICAgICAgICAgZ2V0VGVtcG9yYWxGaWx0ZXIoKTtcbiAgICAgICAgICAgICAgICBnZXRFbmFibGVDb3ZlcmFnZSgpO1xuICAgICAgICAgICAgICAgIGdldEJhbmQoKTtcbiAgICAgICAgICAgICAgICBnZXRTZW5zb3IoKTtcbiAgICAgICAgICAgICAgICBnZXRCYm94KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5ld1ZhbHVlID09PSAnc2VhcmNoJykge1xuICAgICAgICAgICAgICAgIC8vIGNsZWFyIHRpbWUgc2xpZGVyIGRhdGFcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGltZVNsaWRlckRhdGEoW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ2FvaUFuYWx5c2lzQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkYWxlcnQsXG4gICAgICAgICRtb2RhbCxcbiAgICAgICAgJGFzaWRlLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc2lnbWFTZXJ2aWNlLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGFuYWx5emVTZXJ2aWNlLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICBMLFxuICAgICAgICBfLFxuICAgICAgICBtb21lbnRcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIGJib3ggPSBzdGF0ZVNlcnZpY2UuZ2V0QmJveCgpLFxuICAgICAgICAgICAgYmFuZCA9IHN0YXRlU2VydmljZS5nZXRCYW5kKCksXG4gICAgICAgICAgICBhb2lBbmFseXNpc0FzaWRlID0gJGFzaWRlKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAnQU9JIEFuYWx5c2lzJyxcbiAgICAgICAgICAgICAgICBiYWNrZHJvcDogZmFsc2UsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvYW9pQW5hbHlzaXMvYW9pQW5hbHlzaXNDb25maWcudHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIHNob3c6IGZhbHNlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB2bS5zaWdtYUNvbmZpZyA9IHNpZ21hQ29uZmlnO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmFvaUFuYWx5c2lzVmFsdWVzID0gXy5jbG9uZURlZXAoc2lnbWFDb25maWcuYW9pQW5hbHlzaXNWYWx1ZXMpO1xuICAgICAgICB2bS5zZWxlY3RlZEFuYWx5c2lzID0gdm0uYW9pQW5hbHlzaXNWYWx1ZXNbMF07XG4gICAgICAgIHZtLmFuYWx5c2lzU3JjID0gbnVsbDtcbiAgICAgICAgdm0uZ2VvdGlmZkxpbmsgPSAnJztcbiAgICAgICAgdm0uc2hvd1RocmVzaG9sZCA9IGZhbHNlO1xuICAgICAgICB2bS50aHJlc2hvbGQgPSBudWxsO1xuICAgICAgICB2bS5jb2xvcm1hcFZhbHVlcyA9IF8uY2xvbmVEZWVwKHNpZ21hQ29uZmlnLmNvbG9ybWFwVmFsdWVzKTtcbiAgICAgICAgdm0uc2VsZWN0ZWRDb2xvcm1hcCA9IHZtLmNvbG9ybWFwVmFsdWVzWzBdO1xuXG4gICAgICAgIHZhciBhbmFseXNpc01vZGFsID0gJG1vZGFsKHtzY29wZTogJHNjb3BlLCB0ZW1wbGF0ZVVybDogJ2FuYWx5c2lzTW9kYWwuaHRtbCcsIHNob3c6IGZhbHNlLCBhbmltYXRpb246ICdhbS1mYWRlLWFuZC1zY2FsZSd9KTtcblxuICAgICAgICB2bS50b2dnbGVBc2lkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFvaUFuYWx5c2lzQXNpZGUuJHByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgYW9pQW5hbHlzaXNBc2lkZS50b2dnbGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmFuYWx5emVBb2kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBibG9ja1VJLnN0YXJ0KCdBbmFseXppbmcgQU9JJyk7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIG9wZXJhdGlvbjogdm0uc2VsZWN0ZWRBbmFseXNpcy5uYW1lLFxuICAgICAgICAgICAgICAgIHJldHVyblR5cGU6ICdwbmcnLFxuICAgICAgICAgICAgICAgIG1pblRocmVzaG9sZDogdm0udGhyZXNob2xkID8gdm0udGhyZXNob2xkLm1pbiA6IG51bGwsXG4gICAgICAgICAgICAgICAgbWF4VGhyZXNob2xkOiB2bS50aHJlc2hvbGQgPyB2bS50aHJlc2hvbGQubWF4IDogbnVsbCxcbiAgICAgICAgICAgICAgICBjb2xvcm1hcDogdm0uc2VsZWN0ZWRDb2xvcm1hcC5uYW1lXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYW5hbHl6ZVNlcnZpY2UuYW5hbHl6ZUFvaShwYXJhbXMpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHZtLmFuYWx5c2lzU3JjID0gcmVzdWx0LmRhdGE7XG4gICAgICAgICAgICAgICAgYmxvY2tVSS5zdG9wKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBzZXQgdXAgZ2VvdGlmZiBsaW5rXG4gICAgICAgICAgICAgICAgdmFyIHRpbWUgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICAgICAgc2Vuc29yID0gc3RhdGVTZXJ2aWNlLmdldFNlbnNvcigpLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogbW9tZW50LnV0Yyh0aW1lLnN0YXJ0KS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogbW9tZW50LnV0Yyh0aW1lLnN0b3ApLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb246IHZtLnNlbGVjdGVkQW5hbHlzaXMubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG46IGJib3gubm9ydGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBlOiBiYm94LmVhc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICBzOiBiYm94LnNvdXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgdzogYmJveC53ZXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VRdWFsaXR5OiBzdGF0ZVNlcnZpY2UuZ2V0SW1hZ2VRdWFsaXR5KCksXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5UaHJlc2hvbGQ6IHZtLnRocmVzaG9sZCA/IHZtLnRocmVzaG9sZC5taW4gOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4VGhyZXNob2xkOiB2bS50aHJlc2hvbGQgPyB2bS50aHJlc2hvbGQubWF4IDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9ybWFwOiB2bS5zZWxlY3RlZENvbG9ybWFwLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5zb3I6IHNlbnNvciA+PSAwID8gc2Vuc29yIDogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdm0uZ2VvdGlmZkxpbmsgPSBzaWdtYUNvbmZpZy51cmxzLmFvaWFuYWx5c2lzICsgJz9zdGFydD0nICsgcGFyYW1zLnN0YXJ0ICsgJyZzdG9wPScgKyBwYXJhbXMuc3RvcCArICcmb3BlcmF0aW9uPScgKyBwYXJhbXMub3BlcmF0aW9uICsgJyZuPScgKyBwYXJhbXMubiArICcmZT0nICsgcGFyYW1zLmUgKyAnJnM9JyArIHBhcmFtcy5zICsgJyZ3PScgKyBwYXJhbXMudyArICcmYmFuZD0nICsgYmFuZCArICcmcmV0dXJudHlwZT1nZW90aWZmJmltYWdlcXVhbGl0eT0nICsgcGFyYW1zLmltYWdlUXVhbGl0eSArICcmY29sb3JtYXA9JyArIHBhcmFtcy5jb2xvcm1hcDtcblxuICAgICAgICAgICAgICAgIGlmIChwYXJhbXMubWluVGhyZXNob2xkICYmIHBhcmFtcy5tYXhUaHJlc2hvbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uZ2VvdGlmZkxpbmsgPSB2bS5nZW90aWZmTGluayArICcmbWludGhyZXNob2xkPScgKyBwYXJhbXMubWluVGhyZXNob2xkICsgJyZtYXh0aHJlc2hvbGQ9JyArIHBhcmFtcy5tYXhUaHJlc2hvbGQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5zZW5zb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uZ2VvdGlmZkxpbmsgPSB2bS5nZW90aWZmTGluayA9IHZtLmdlb3RpZmZMaW5rICsgJyZzZW5zb3I9JyArIHBhcmFtcy5zZW5zb3I7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYW5hbHlzaXNNb2RhbC4kcHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5hbHlzaXNNb2RhbC5zaG93KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBibG9ja1VJLnJlc2V0KCk7XG4gICAgICAgICAgICAgICAgc2lnbWFTZXJ2aWNlLnNob3dFcnJvcihlcnJvciwgJ2RhbmdlcicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udXBkYXRlVGhyZXNob2xkTWluID0gZnVuY3Rpb24gKGV2ZW50LCBkZWx0YSwgZGVsdGFYLCBkZWx0YVkpIHtcbiAgICAgICAgICAgIGlmIChkZWx0YVkgPiAwKSB7XG4gICAgICAgICAgICAgICAgdm0udGhyZXNob2xkLm1pbisrO1xuICAgICAgICAgICAgICAgIGlmICh2bS50aHJlc2hvbGQubWluID4gdm0udGhyZXNob2xkLm1heCkge1xuICAgICAgICAgICAgICAgICAgICB2bS50aHJlc2hvbGQubWF4Kys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChkZWx0YVkgPCAwKSB7XG4gICAgICAgICAgICAgICAgdm0udGhyZXNob2xkLm1pbi0tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnVwZGF0ZVRocmVzaG9sZE1heCA9IGZ1bmN0aW9uIChldmVudCwgZGVsdGEsIGRlbHRhWCwgZGVsdGFZKSB7XG4gICAgICAgICAgICBpZiAoZGVsdGFZID4gMCkge1xuICAgICAgICAgICAgICAgIHZtLnRocmVzaG9sZC5tYXgrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGVsdGFZIDwgMCkge1xuICAgICAgICAgICAgICAgIHZtLnRocmVzaG9sZC5tYXgtLTtcbiAgICAgICAgICAgICAgICBpZiAodm0udGhyZXNob2xkLm1heCA8IHZtLnRocmVzaG9sZC5taW4pIHtcbiAgICAgICAgICAgICAgICAgICAgdm0udGhyZXNob2xkLm1pbi0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zZWxlY3RlZEFuYWx5c2lzJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUudGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgdm0udGhyZXNob2xkID0ge1xuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogc2lnbWFDb25maWcudGhyZXNob2xkQ2VpbGluZ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdm0uc2hvd1RocmVzaG9sZCA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZtLnRocmVzaG9sZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgdm0uc2hvd1RocmVzaG9sZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vmlld01vZGUoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYW9pQW5hbHlzaXNBc2lkZS5oaWRlKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYUFvaUFuYWx5c2lzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2FvaUFuYWx5c2lzL2FvaUFuYWx5c2lzVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnYW9pQW5hbHlzaXNDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ2JhbmRDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0uc2lnbWFDb25maWcgPSBzaWdtYUNvbmZpZztcbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLm1vZGUgPSAkc2NvcGUuJHBhcmVudC5tb2RlO1xuICAgICAgICB2bS5iYW5kcyA9IF8uY2xvbmVEZWVwKHNpZ21hQ29uZmlnLmJhbmRzKTtcbiAgICAgICAgdm0uc2VsZWN0ZWRCYW5kID0gcXMuYmFuZCA/IF8uZmluZCh2bS5iYW5kcywgeyBuYW1lOiBxcy5iYW5kIH0pIDogXy5maW5kKHZtLmJhbmRzLCB7IGRlZmF1bHQ6IHRydWUgfSk7XG5cbiAgICAgICAgdm0uc2V0QmFuZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJhbmQodmFsdWUubmFtZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLnNldEJhbmQodm0uc2VsZWN0ZWRCYW5kKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRRcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxcyA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFCYW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2JhbmQvYmFuZFRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2JhbmRDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcignY29ycmVsYXRpb25BbmFseXNpc0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJG1vZGFsLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBfLFxuICAgICAgICBtb21lbnRcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uY29ycmVsYXRpb24gPSB7fTtcbiAgICAgICAgdm0uY29ycmVsYXRpb25TcmMgPSBudWxsO1xuICAgICAgICB2bS5nZW90aWZmTGluayA9ICcnO1xuICAgICAgICB2bS5nZW90aWZmRmlsZW5hbWUgPSAnJztcblxuICAgICAgICB2YXIgYW5hbHlzaXNNb2RhbCA9ICRtb2RhbCh7c2NvcGU6ICRzY29wZSwgdGVtcGxhdGVVcmw6ICdjb3JyZWxhdGlvbkFuYWx5c2lzTW9kYWwuaHRtbCcsIHNob3c6IGZhbHNlLCBhbmltYXRpb246ICdhbS1mYWRlLWFuZC1zY2FsZSd9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldENvcnJlbGF0aW9uRGF0YSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgJiYgXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdm0uY29ycmVsYXRpb24gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICB2bS5nZW90aWZmTGluayA9IHNpZ21hQ29uZmlnLnVybHMuY29ycmVsYXRlICsgJz9zdGFydD0nICsgdm0uY29ycmVsYXRpb24uc3RhcnQudG9JU09TdHJpbmcoKSArICcmc3RvcD0nICsgdm0uY29ycmVsYXRpb24uc3RvcC50b0lTT1N0cmluZygpICsgJyZuPScgKyB2bS5jb3JyZWxhdGlvbi5iYm94Lm5vcnRoICsgJyZlPScgKyB2bS5jb3JyZWxhdGlvbi5iYm94LmVhc3QgKyAnJnM9JyArIHZtLmNvcnJlbGF0aW9uLmJib3guc291dGggKyAnJnc9JyArIHZtLmNvcnJlbGF0aW9uLmJib3gud2VzdCArICcmbGF0PScgKyB2bS5jb3JyZWxhdGlvbi5sYXRsbmcubGF0ICsgJyZsbmc9JyArIHZtLmNvcnJlbGF0aW9uLmxhdGxuZy5sbmcgKyAnJmJhbmQ9JyArIHZtLmNvcnJlbGF0aW9uLmJhbmQgKyAnJnJldHVybnR5cGU9Z2VvdGlmZiZpbWFnZXF1YWxpdHk9JyArIHZtLmNvcnJlbGF0aW9uLmltYWdlUXVhbGl0eTtcbiAgICAgICAgICAgICAgICB2bS5nZW90aWZmRmlsZW5hbWUgPSAnc2lnbWEtY29ycmVsYXRpb24tYW5hbHlzaXMtJyArIG1vbWVudC51dGMoKS51bml4KCkgKyAnLnRpZic7XG4gICAgICAgICAgICAgICAgdm0uY29ycmVsYXRpb25TcmMgPSB2bS5jb3JyZWxhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICAgIGFuYWx5c2lzTW9kYWwuJHByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuYWx5c2lzTW9kYWwuc2hvdygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFDb3JyZWxhdGlvbkFuYWx5c2lzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2NvcnJlbGF0aW9uQW5hbHlzaXMvY29ycmVsYXRpb25BbmFseXNpc1RlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2NvcnJlbGF0aW9uQW5hbHlzaXNDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ2NvdmVyYWdlRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2VcbiAgICApIHtcbiAgICAgICAgdmFyIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpLFxuICAgICAgICAgICAgdm0gPSB0aGlzO1xuXG4gICAgICAgIHZtLmVuYWJsZUNvdmVyYWdlQ29tcG9uZW50ID0gc2lnbWFDb25maWcuY29tcG9uZW50cy5jb3ZlcmFnZUZpbHRlcjtcbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgIH07XG4gICAgICAgIHZtLmNvdmVyYWdlRW5hYmxlZCA9IHFzLmVuYWJsZUNvdmVyYWdlID8gcXMuZW5hYmxlQ292ZXJhZ2UgPT09ICd0cnVlJyA6IHNpZ21hQ29uZmlnLmRlZmF1bHRFbmFibGVDb3ZlcmFnZTtcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5jb3ZlcmFnZU9wYWNpdHlTbGlkZXIgPSB7XG4gICAgICAgICAgICBtaW46IDAuMDEsXG4gICAgICAgICAgICBtYXg6IDEuMCxcbiAgICAgICAgICAgIHZhbHVlOiBxcy5jb3ZlcmFnZU9wYWNpdHkgPyBwYXJzZUZsb2F0KHFzLmNvdmVyYWdlT3BhY2l0eSkgOiAwLjVcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFFzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHFzID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLmNvdmVyYWdlRW5hYmxlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFbmFibGVDb3ZlcmFnZSh2bS5jb3ZlcmFnZUVuYWJsZWQpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5jb3ZlcmFnZU9wYWNpdHlTbGlkZXIudmFsdWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q292ZXJhZ2VPcGFjaXR5KHZtLmNvdmVyYWdlT3BhY2l0eVNsaWRlci52YWx1ZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRFbmFibGVDb3ZlcmFnZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5jb3ZlcmFnZUVuYWJsZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldENvdmVyYWdlT3BhY2l0eSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5jb3ZlcmFnZU9wYWNpdHlTbGlkZXIudmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hQ292ZXJhZ2VGaWx0ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvY292ZXJhZ2VGaWx0ZXIvY292ZXJhZ2VGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdjb3ZlcmFnZUZpbHRlckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIFxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ2dvdG9Db250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHNpZ21hU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBMXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKSxcbiAgICAgICAgICAgIG1hcCA9IHN0YXRlU2VydmljZS5nZXRNYXAoKTtcblxuICAgICAgICAkc2NvcGUubW9kZSA9ICRzY29wZS4kcGFyZW50Lm1vZGU7XG4gICAgICAgIHZtLnNpZ21hQ29uZmlnID0gc2lnbWFDb25maWc7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLmxhdCA9ICcnO1xuICAgICAgICB2bS5sbmcgPSAnJztcbiAgICAgICAgdm0ubWdycyA9ICcnO1xuICAgICAgICB2bS5sb2NhdGlvbkZvcm1hdCA9IHFzLmxvY2F0aW9uRm9ybWF0ID8gcXMubG9jYXRpb25Gb3JtYXQgOiBzaWdtYUNvbmZpZy5kZWZhdWx0TG9jYXRpb25Gb3JtYXQ7XG5cbiAgICAgICAgdmFyIGNvbnZlcnRMYXRMbmcgPSBmdW5jdGlvbiAobmV3Rm9ybWF0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2lnbWFTZXJ2aWNlLmNvbnZlcnRMYXRMbmcoe1xuICAgICAgICAgICAgICAgIGxhdDogdm0ubGF0LFxuICAgICAgICAgICAgICAgIGxuZzogdm0ubG5nLFxuICAgICAgICAgICAgICAgIG1ncnM6IHZtLm1ncnMsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiB2bS5sb2NhdGlvbkZvcm1hdFxuICAgICAgICAgICAgfSwgbmV3Rm9ybWF0KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdm0uZ290byA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBkZExhdExuZyA9IGNvbnZlcnRMYXRMbmcoJ2RkJyk7XG4gICAgICAgICAgICBtYXAuc2V0VmlldyhMLmxhdExuZyhkZExhdExuZy5sYXQsIGRkTGF0TG5nLmxuZykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldExvY2F0aW9uRm9ybWF0ID0gZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExvY2F0aW9uRm9ybWF0KGZvcm1hdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5zZXRMb2NhdGlvbkZvcm1hdCh2bS5sb2NhdGlvbkZvcm1hdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0UXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXMgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldExvY2F0aW9uRm9ybWF0KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgodm0ubGF0ICE9PSAnJyAmJiB2bS5sbmcgIT09ICcnKSB8fCB2bS5tZ3JzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIHZhciBjb252ZXJ0ZWRMYXRMbmcgPSBjb252ZXJ0TGF0TG5nKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgICAgICB2bS5sYXQgPSBjb252ZXJ0ZWRMYXRMbmcubGF0O1xuICAgICAgICAgICAgICAgIHZtLmxuZyA9IGNvbnZlcnRlZExhdExuZy5sbmc7XG4gICAgICAgICAgICAgICAgdm0ubWdycyA9IGNvbnZlcnRlZExhdExuZy5tZ3JzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0ubG9jYXRpb25Gb3JtYXQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYUdvdG8nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvZ290by9nb3RvVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZ290b0NvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcignZnJhbWVPdmVybGF5c0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGFsZXJ0LFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBfXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBmcmFtZUluZGV4ZXMgPSBbXSxcbiAgICAgICAgICAgIGNhbnZhc0ltYWdlT3ZlcmxheSA9IHN0YXRlU2VydmljZS5nZXRDYW52YXNJbWFnZU92ZXJsYXkoKTtcblxuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5mcmFtZU92ZXJsYXlzID0gW107XG4gICAgICAgIHZtLnBsYXliYWNrU3RhdGUgPSAnJztcbiAgICAgICAgdm0uY29udHJhc3RMZXZlbHMgPSBzaWdtYUNvbmZpZy5jb250cmFzdExldmVscztcbiAgICAgICAgdm0uc2VsZWN0ZWRDb250cmFzdExldmVsID0gXy5maW5kKHNpZ21hQ29uZmlnLmNvbnRyYXN0TGV2ZWxzLCB7IGRlZmF1bHQ6IHRydWUgfSk7XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5oaWdobGlnaHRJbWFnZSA9IGZ1bmN0aW9uIChvdmVybGF5LCBkb0hpZ2hsaWdodCkge1xuICAgICAgICAgICAgaWYgKGRvSGlnaGxpZ2h0KSB7XG4gICAgICAgICAgICAgICAgaWYgKG92ZXJsYXkuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goY2FudmFzSW1hZ2VPdmVybGF5LmZyYW1lc1tjYW52YXNJbWFnZU92ZXJsYXkuY3VycmVudElkeF0uaW1hZ2VzLCBmdW5jdGlvbihvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXJrIGFsbCBvdmVybGF5cyBhcyBoaWRkZW4sIGV4Y2VwdCBmb3IgdGhlIG1hdGNoaW5nIHRhcmdldFxuICAgICAgICAgICAgICAgICAgICAgICAgby52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoby51cmwgPT09IG92ZXJsYXkudXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgby52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gdG8gXCJub3JtYWxcIiBzdGF0ZVxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChjYW52YXNJbWFnZU92ZXJsYXkuZnJhbWVzW2NhbnZhc0ltYWdlT3ZlcmxheS5jdXJyZW50SWR4XS5pbWFnZXMsIGZ1bmN0aW9uKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgby52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5LnJlZHJhdygpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZUltYWdlID0gZnVuY3Rpb24gKG92ZXJsYXkpIHtcbiAgICAgICAgICAgIC8vIGFsbCB0aGlzIGRvZXMgcmlnaHQgbm93IGlzIHN1cGVyZmljaWFsbHkgcmVtb3ZlIHRoZSBpbWFnZSBmcm9tIHRoZSBhcnJheSBhbmQgdGhlIG1hcFxuICAgICAgICAgICAgLy8gbmVlZCB0aGlzIHRvIHBlcnNpc3RcbiAgICAgICAgICAgIHZhciBmcmFtZUN1cnJlbnQgPSBzdGF0ZVNlcnZpY2UuZ2V0RnJhbWVDdXJyZW50KCksXG4gICAgICAgICAgICAgICAgb3ZlcmxheUlkeCA9IF8uaW5kZXhPZihmcmFtZUluZGV4ZXNbZnJhbWVDdXJyZW50XS5pbWFnZXMsIG92ZXJsYXkpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG92ZXJsYXlJZHggPT09ICd1bmRlZmluZWQnIHx8IG92ZXJsYXlJZHggPT09IG51bGwgfHwgb3ZlcmxheUlkeCA+IGZyYW1lSW5kZXhlc1tmcmFtZUN1cnJlbnRdLmltYWdlcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgJGFsZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdPdmVybGF5IEVycm9yJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogJ1VuYWJsZSB0byByZXRyaWV2ZSBvdmVybGF5IG9iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAob3ZlcmxheS5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uaW1hZ2VzW292ZXJsYXlJZHhdLmVuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RnJhbWVJbmRleGVzKGZyYW1lSW5kZXhlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF8uZmluZCh2bS5mcmFtZU92ZXJsYXlzLCAnc3JjJywgb3ZlcmxheS5zcmMpLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyByZW5kZXIgdGhlIG92ZXJsYXkgc2VydmljZVxuICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5LnJlZHJhdygpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldENvbnRyYXN0TGV2ZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q29udHJhc3RMZXZlbCh2bS5zZWxlY3RlZENvbnRyYXN0TGV2ZWwpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RnJhbWVPdmVybGF5cygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2bS5mcmFtZU92ZXJsYXlzID0gbmV3VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RnJhbWVJbmRleGVzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZyYW1lSW5kZXhlcyA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0UGxheWJhY2tTdGF0ZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5wbGF5YmFja1N0YXRlID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZtLmdldE92ZXJsYXlUb29sdGlwID0gZnVuY3Rpb24gKG92ZXJsYXkpIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSBvdmVybGF5LnVybDtcbiAgICAgICAgICAgIHJldHVybiB1cmwuc3BsaXQoJy8nKVt1cmwuc3BsaXQoJy8nKS5sZW5ndGggLSAzXSArICc8c3BhbiBjbGFzcz1cImZpbGUtcGF0aC1kZWxpbWl0ZXJcIj4vPC9zcGFuPicgKyB1cmwuc3BsaXQoJy8nKVt1cmwuc3BsaXQoJy8nKS5sZW5ndGggLSAyXSArICc8c3BhbiBjbGFzcz1cImZpbGUtcGF0aC1kZWxpbWl0ZXJcIj4vPC9zcGFuPicgKyB1cmwuc3BsaXQoJy8nKVt1cmwuc3BsaXQoJy8nKS5sZW5ndGggLSAxXTtcbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFGcmFtZU92ZXJsYXlzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2ZyYW1lT3ZlcmxheXMvZnJhbWVPdmVybGF5c1RlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2ZyYW1lT3ZlcmxheXNDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ2ltYWdlRmlsdGVyc0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgLy8gZW51bSB2YWx1ZSBmb3IgYSBkaXZpZGVyXG4gICAgICAgICAgICBESVZJREVSID0gJy0nLFxuICAgICAgICAgICAgLy8gb3JkZXIgb2Ygc2xpZGVyc1xuICAgICAgICAgICAgY29udHJvbHMgPSBbXG4gICAgICAgICAgICAgICAgJ29wYWNpdHknLFxuICAgICAgICAgICAgICAgICdicmlnaHRuZXNzJyxcbiAgICAgICAgICAgICAgICAnY29udHJhc3QnLFxuICAgICAgICAgICAgICAgIERJVklERVIsXG4gICAgICAgICAgICAgICAgLy8nc2hhcnBlbicsIC8vIFRPRE9cbiAgICAgICAgICAgICAgICAnYmx1cicsXG4gICAgICAgICAgICAgICAgRElWSURFUixcbiAgICAgICAgICAgICAgICAnaHVlJyxcbiAgICAgICAgICAgICAgICAnc2F0dXJhdGlvbicsXG4gICAgICAgICAgICAgICAgRElWSURFUixcbiAgICAgICAgICAgICAgICAnaW52ZXJ0JyxcbiAgICAgICAgICAgICAgICAnc2VwaWEnLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0cyB0aGUga2V5IG9mIHRoZSBjb250cm9sIHRvIHRoZSBzaWdtYUNvbmZpZyB2YWx1ZS4gSWYgdGhlIGNvbmZpZ1xuICAgICAgICAgICAgICogdmFsdWUgaXMgdW5kZWZpbmVkLCB0aGUgcGFzc2VkIGluIGRlZmF1bHQgdmFsdWUgaXMgc2V0LlxuICAgICAgICAgICAgICogQHBhcmFtICB7b2JqZWN0fSBjb250cm9sICAgIEEgY29udHJvbCBvYmplY3RcbiAgICAgICAgICAgICAqIEBwYXJhbSAge3N0cmluZ30ga2V5ICAgICAgIFRoZSBwcm9wZXJ0eSBvbiBjb250cm9sIHRvIHNldFxuICAgICAgICAgICAgICogQHBhcmFtICB7YW55fSAgICB2YWx1ZSAgICAgQSBkZWZhdWx0IHZhbHVlIHRvIHNldCwgaWYgbm90IG9uIHNpZ21hQ29uZmlnXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IGZpbHRlcktleSBUaGUgbG9va3VwIGZvciB0aGUgaW1hZ2VGaWx0ZXIgaW4gc2lnbWFDb25maWdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2V0RGVmYXVsdCA9IGZ1bmN0aW9uIChjb250cm9sLCBrZXksIHZhbHVlLCBmaWx0ZXJLZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIHZhbHVlIGZyb20gdGhlIGNvbmZpZ1xuICAgICAgICAgICAgICAgIGNvbnRyb2xba2V5XSA9IHNpZ21hQ29uZmlnLmltYWdlRmlsdGVyc1tmaWx0ZXJLZXldW2tleV07XG5cbiAgICAgICAgICAgICAgICAvLyBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLCBzZXQgdGhlIGdpdmVuIGRlZmF1bHQgdmFsdWVcbiAgICAgICAgICAgICAgICBpZiAoISBhbmd1bGFyLmlzRGVmaW5lZChjb250cm9sW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cblxuICAgICAgICB2bS5jYW52YXNJbWFnZU92ZXJsYXkgPSBzdGF0ZVNlcnZpY2UuZ2V0Q2FudmFzSW1hZ2VPdmVybGF5KCk7XG4gICAgICAgIHZtLmNvbnRyb2xzID0gW107XG5cblxuICAgICAgICAvLyBsb29wIHRocm91Z2ggb3JkZXIgb2YgY29udHJvbHMgYW5kIGNyZWF0ZSBvYmplY3RzIHRvIHVzZSBpbiB0aGUgc2NvcGVcbiAgICAgICAgXy5mb3JFYWNoKGNvbnRyb2xzLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBpZiAoa2V5ID09PSBESVZJREVSKSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBzZXQgcGFyYW1zIGZvciBkaXZpZGVyc1xuICAgICAgICAgICAgICAgIHZtLmNvbnRyb2xzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBpc0RpdmlkZXI6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2lnbWFDb25maWcuaW1hZ2VGaWx0ZXJzW2tleV0uZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIHZhciBjb250cm9sID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaDogc2lnbWFDb25maWcuaW1hZ2VGaWx0ZXJzW2tleV0uc3dpdGNoLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgZGVmYXVsdCBuYW1lIGJhc2VkIG9uIHRoZSBrZXlcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IGtleS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGtleS5zbGljZSgxKTtcblxuICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB0aGUgdmFsdWVzIGhhdmUgYSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgc2V0RGVmYXVsdChjb250cm9sLCAnbmFtZScsIG5hbWUsIGtleSk7XG4gICAgICAgICAgICAgICAgc2V0RGVmYXVsdChjb250cm9sLCAnZGVmYXVsdCcsIDAsIGtleSk7XG4gICAgICAgICAgICAgICAgc2V0RGVmYXVsdChjb250cm9sLCAnbWluJywgMCwga2V5KTtcbiAgICAgICAgICAgICAgICBzZXREZWZhdWx0KGNvbnRyb2wsICdtYXgnLCAxMDAsIGtleSk7XG4gICAgICAgICAgICAgICAgc2V0RGVmYXVsdChjb250cm9sLCAnc3RlcCcsIDEsIGtleSk7XG4gICAgICAgICAgICAgICAgc2V0RGVmYXVsdChjb250cm9sLCAndW5pdHMnLCAnJScsIGtleSk7XG5cbiAgICAgICAgICAgICAgICB2bS5jb250cm9scy5wdXNoKGNvbnRyb2wpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIHZtLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmNhbnZhc0ltYWdlT3ZlcmxheS5yZWRyYXcoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5yZXNldCA9IGZ1bmN0aW9uIChhdHRyLCB2YWwpIHtcbiAgICAgICAgICAgIHZtLmNhbnZhc0ltYWdlT3ZlcmxheVthdHRyXSA9IHZhbDtcbiAgICAgICAgICAgIHZtLnJlbmRlcigpO1xuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcignbG9jYXRpb25GaWx0ZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcblxuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0ubW9kZSA9ICRzY29wZS4kcGFyZW50Lm1vZGU7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0ubG9jYXRpb24gPSB7fTtcbiAgICAgICAgdm0uc3BhdGlhbFpvb20gPSAnJztcblxuICAgICAgICB2bS5zZXRMb2NhdGlvbkJvdW5kcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh2bS5sb2NhdGlvbi5mb3JtYXQgIT09ICdtZ3JzJykge1xuICAgICAgICAgICAgICAgIGlmICh2bS5sb2NhdGlvbi5ub3J0aCAmJiB2bS5sb2NhdGlvbi5zb3V0aCAmJiB2bS5sb2NhdGlvbi5lYXN0ICYmIHZtLmxvY2F0aW9uLndlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJib3hQYXJhbXModm0ubG9jYXRpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHZtLmxvY2F0aW9uLm1ncnNORSAmJiB2bS5sb2NhdGlvbi5tZ3JzU1cpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJib3hQYXJhbXModm0ubG9jYXRpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRMb2NhdGlvbkZvcm1hdCh2bS5sb2NhdGlvbi5mb3JtYXQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRCYm94KCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uID0ge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLmxvY2F0aW9uJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5zZXRMb2NhdGlvbkJvdW5kcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodm0ubW9kZSA9PT0gJ2FuYWx5emUnKSB7XG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0U3BhdGlhbFpvb20oKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHZtLnNwYXRpYWxab29tID0gbmV3VmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYUxvY2F0aW9uRmlsdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2xvY2F0aW9uRmlsdGVyL2xvY2F0aW9uRmlsdGVyVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnbG9jYXRpb25GaWx0ZXJDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9J1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdsb2NhdGlvbkZvcm1hdENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0ubG9jYXRpb24gPSB7XG4gICAgICAgICAgICBmb3JtYXQ6IHFzLmxvY2F0aW9uRm9ybWF0IHx8IHNpZ21hQ29uZmlnLmRlZmF1bHRMb2NhdGlvbkZvcm1hdCxcbiAgICAgICAgICAgIG5vcnRoOiBxcy5uIHx8ICcnLFxuICAgICAgICAgICAgc291dGg6IHFzLnMgfHwgJycsXG4gICAgICAgICAgICBlYXN0OiBxcy5lIHx8ICcnLFxuICAgICAgICAgICAgd2VzdDogcXMudyB8fCAnJyxcbiAgICAgICAgICAgIG1ncnNORTogcXMubmUgfHwgJycsXG4gICAgICAgICAgICBtZ3JzU1c6IHFzLnN3IHx8ICcnXG4gICAgICAgIH07XG4gICAgICAgIHZtLm1vZGUgPSAkc2NvcGUuJHBhcmVudC5tb2RlO1xuICAgICAgICBcbiAgICAgICAgdm0uc2V0Rm9ybWF0ID0gZnVuY3Rpb24gKG5ld0Zvcm1hdCkge1xuICAgICAgICAgICAgdmFyIG5lLCBzdztcbiAgICAgICAgICAgIHN3aXRjaCAodm0ubG9jYXRpb24uZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRERCcm9hZGNhc3Qodm0ubG9jYXRpb24uc291dGgsIHZtLmxvY2F0aW9uLndlc3QpO1xuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRERCcm9hZGNhc3Qodm0ubG9jYXRpb24ubm9ydGgsIHZtLmxvY2F0aW9uLmVhc3QpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdkbXMnOlxuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KHZtLmxvY2F0aW9uLnNvdXRoLCB2bS5sb2NhdGlvbi53ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgbmUgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdCh2bS5sb2NhdGlvbi5ub3J0aCwgdm0ubG9jYXRpb24uZWFzdCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ21ncnMnOlxuICAgICAgICAgICAgICAgICAgICBpZiAodm0ubG9jYXRpb24ubWdyc1NXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdCh2bS5sb2NhdGlvbi5tZ3JzU1cpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5sb2NhdGlvbi5tZ3JzTkUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KHZtLmxvY2F0aW9uLm1ncnNORSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5zb3V0aCA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ud2VzdCA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ubm9ydGggPSAnJztcbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLmVhc3QgPSAnJztcbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLm1ncnNORSA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ubWdyc1NXID0gJyc7XG5cbiAgICAgICAgICAgIHN3aXRjaCAobmV3Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3cgJiYgbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLnNvdXRoID0gc3cuZGRbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi53ZXN0ID0gc3cuZGRbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5ub3J0aCA9IG5lLmRkWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24uZWFzdCA9IG5lLmRkWzFdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Rtcyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdyAmJiBuZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24uc291dGggPSBzdy5kbXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi53ZXN0ID0gc3cuZG1zWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24ubm9ydGggPSBuZS5kbXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5lYXN0ID0gbmUuZG1zWzFdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ21ncnMnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3cgJiYgbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLm1ncnNTVyA9IHN3Lm1ncnMgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5tZ3JzTkUgPSBuZS5tZ3JzIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5mb3JtYXQgPSBuZXdGb3JtYXQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmJveFBhcmFtcyh2bS5sb2NhdGlvbik7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TG9jYXRpb25Gb3JtYXQobmV3Rm9ybWF0KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFFzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHFzID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QmJveCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbiA9IHt9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYUxvY2F0aW9uRm9ybWF0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2xvY2F0aW9uRm9ybWF0L2xvY2F0aW9uRm9ybWF0VGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnbG9jYXRpb25Gb3JtYXRDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ21hcENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJHRpbWVvdXQsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIGFuYWx5emVTZXJ2aWNlLFxuICAgICAgICBzaWdtYVNlcnZpY2UsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgbGVhZmxldERhdGEsXG4gICAgICAgIGJsb2NrVUksXG4gICAgICAgIEwsXG4gICAgICAgIF8sXG4gICAgICAgIGQzXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKSxcbiAgICAgICAgICAgIG1hcCA9IHt9LFxuICAgICAgICAgICAgZHJhd0NvbnRyb2wgPSBudWxsLFxuICAgICAgICAgICAgZW5hYmxlQ292ZXJhZ2UgPSBxcy5lbmFibGVDb3ZlcmFnZSA/IHFzLmVuYWJsZUNvdmVyYWdlIDogc2lnbWFDb25maWcuZGVmYXVsdEVuYWJsZUNvdmVyYWdlLFxuICAgICAgICAgICAgY292ZXJhZ2VPcGFjaXR5ID0gc3RhdGVTZXJ2aWNlLmdldENvdmVyYWdlT3BhY2l0eSgpLFxuICAgICAgICAgICAgY292ZXJhZ2VMYXllciA9IG5ldyBMLkxheWVyR3JvdXAoKSxcbiAgICAgICAgICAgIGNvdmVyYWdlRGF0YSxcbiAgICAgICAgICAgIGZyYW1lRXh0ZW50cyA9IHt9LFxuICAgICAgICAgICAgbWFwRmVhdHVyZUdyb3VwID0gbmV3IEwuRmVhdHVyZUdyb3VwKCk7XG5cbiAgICAgICAgdm0ubW9kZSA9ICRzY29wZS5tb2RlO1xuICAgICAgICB2bS5tYXBIZWlnaHQgPSAnMHB4JztcbiAgICAgICAgdm0uY2VudGVyID0gc3RhdGVTZXJ2aWNlLmdldE1hcENlbnRlcigpO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLm1heEJvdW5kcyA9IHNpZ21hQ29uZmlnLm1heEJvdW5kcztcblxuICAgICAgICAvLyB1aS1sZWFmbGV0IGRlZmF1bHRzXG4gICAgICAgIHZtLmRlZmF1bHRzID0ge1xuICAgICAgICAgICAgY3JzOiBzaWdtYUNvbmZpZy5kZWZhdWx0UHJvamVjdGlvbixcbiAgICAgICAgICAgIHpvb21Db250cm9sOiB0cnVlLFxuICAgICAgICAgICAgYXR0cmlidXRpb25Db250cm9sOiBmYWxzZSxcbiAgICAgICAgICAgIGNvbnRyb2xzOiB7XG4gICAgICAgICAgICAgICAgbGF5ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBjb2xsYXBzZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gdWktbGVhZmxldCBiYXNlbGF5ZXJzIG9iamVjdFxuICAgICAgICB2bS5sYXllcnMgPSBfLmNsb25lRGVlcChzaWdtYUNvbmZpZy5sYXllcnMpO1xuXG4gICAgICAgIHZtLmNvbG9yU2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgICAgLnJhbmdlKFsnZ3JlZW4nLCAneWVsbG93JywgJ3JlZCddKSAvLyBvciB1c2UgaGV4IHZhbHVlc1xuICAgICAgICAgICAgLmRvbWFpbihbNTAsIDEyMCwgMjAwXSk7XG5cbiAgICAgICAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBzZXQgbWFwIGhlaWdodCBlcXVhbCB0byBhdmFpbGFibGUgcGFnZSBoZWlnaHRcbiAgICAgICAgICAgIHZhciB2aWV3cG9ydCA9IHNpZ21hU2VydmljZS5nZXRWaWV3cG9ydFNpemUoKTtcbiAgICAgICAgICAgIHZtLm1hcEhlaWdodCA9IHZpZXdwb3J0LmhlaWdodCArICdweCc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZtLmRyYXdDb3ZlcmFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh2bS5tb2RlID09PSAnc2VhcmNoJykge1xuICAgICAgICAgICAgICAgIGlmIChjb3ZlcmFnZUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvdmVyYWdlTGF5ZXIuY2xlYXJMYXllcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlICYmIGNvdmVyYWdlRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGNvdmVyYWdlRGF0YSwgZnVuY3Rpb24gKGNvdmVyYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvdmVyYWdlICE9PSBudWxsICYmIGNvdmVyYWdlLm4gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGVmaW5lIHJlY3RhbmdsZSBnZW9ncmFwaGljYWwgYm91bmRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBib3VuZHMgPSBbW2NvdmVyYWdlLnMsIGNvdmVyYWdlLmVdLCBbY292ZXJhZ2UubiwgY292ZXJhZ2Uud11dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYSByZWN0YW5nbGUgb3ZlcmxheVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMLnJlY3RhbmdsZShib3VuZHMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2bS5jb2xvclNjYWxlKGNvdmVyYWdlLmNvdW50KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodDogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IGNvdmVyYWdlT3BhY2l0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxPcGFjaXR5OiBjb3ZlcmFnZU9wYWNpdHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuYWRkVG8oY292ZXJhZ2VMYXllcikuYnJpbmdUb0JhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvdmVyYWdlTGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY292ZXJhZ2VMYXllci5jbGVhckxheWVycygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS51cGRhdGVCYXNlbGF5ZXIgPSBmdW5jdGlvbiAobGF5ZXIpIHtcbiAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldExheWVycygpLnRoZW4oZnVuY3Rpb24gKGxheWVycykge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChsYXllcnMuYmFzZWxheWVycywgZnVuY3Rpb24gKGxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLm1hcC5yZW1vdmVMYXllcihsYXllcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdm0ubWFwLmFkZExheWVyKGxheWVycy5iYXNlbGF5ZXJzW2xheWVyLmlkXSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdERyYXdDb250cm9scyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChkcmF3Q29udHJvbCkge1xuICAgICAgICAgICAgICAgIG1hcC5yZW1vdmVDb250cm9sKGRyYXdDb250cm9sKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRyYXdDb250cm9sID0gbmV3IEwuQ29udHJvbC5EcmF3KHtcbiAgICAgICAgICAgICAgICBkcmF3OiB7XG4gICAgICAgICAgICAgICAgICAgIHJlY3RhbmdsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvbHlsaW5lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9seWdvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNpcmNsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlcjogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVkaXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUdyb3VwOiBtYXBGZWF0dXJlR3JvdXBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICh2bS5tb2RlID09PSAnc2VhcmNoJykge1xuICAgICAgICAgICAgICAgIEwuZHJhd0xvY2FsLmVkaXQudG9vbGJhci5idXR0b25zID0ge1xuICAgICAgICAgICAgICAgICAgICBlZGl0OiAnRWRpdCBBT0knLFxuICAgICAgICAgICAgICAgICAgICBlZGl0RGlzYWJsZWQ6ICdObyBBT0kgdG8gZWRpdCcsXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZTogJ0RlbGV0ZSBBT0knLFxuICAgICAgICAgICAgICAgICAgICByZW1vdmVEaXNhYmxlZDogJ05vIEFPSSB0byBkZWxldGUnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodm0ubW9kZSA9PT0gJ2FuYWx5emUnKSB7XG4gICAgICAgICAgICAgICAgTC5kcmF3TG9jYWwuZWRpdC50b29sYmFyLmJ1dHRvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGVkaXQ6ICdFZGl0IG1hcmtlcnMnLFxuICAgICAgICAgICAgICAgICAgICBlZGl0RGlzYWJsZWQ6ICdObyBtYXJrZXJzIHRvIGVkaXQnLFxuICAgICAgICAgICAgICAgICAgICByZW1vdmU6ICdEZWxldGUgbWFya2VycycsXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZURpc2FibGVkOiAnTm8gbWFya2VycyB0byBkZWxldGUnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hcC5hZGRDb250cm9sKGRyYXdDb250cm9sKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFFzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHFzID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vmlld3BvcnRTaXplKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLm1hcEhlaWdodCA9IG5ld1ZhbHVlLmhlaWdodCArICdweCc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q292ZXJhZ2UoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY292ZXJhZ2VEYXRhID0gbmV3VmFsdWU7XG4gICAgICAgICAgICBpZiAoZW5hYmxlQ292ZXJhZ2UpIHtcbiAgICAgICAgICAgICAgICB2bS5kcmF3Q292ZXJhZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRFbmFibGVDb3ZlcmFnZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbmFibGVDb3ZlcmFnZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlICYmIGNvdmVyYWdlRGF0YSkge1xuICAgICAgICAgICAgICAgIHZtLmRyYXdDb3ZlcmFnZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb3ZlcmFnZUxheWVyLmNsZWFyTGF5ZXJzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q292ZXJhZ2VPcGFjaXR5KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvdmVyYWdlT3BhY2l0eSA9IG5ld1ZhbHVlO1xuXG4gICAgICAgICAgICBjb3ZlcmFnZUxheWVyLmVhY2hMYXllcihmdW5jdGlvbiAobGF5ZXIpIHtcbiAgICAgICAgICAgICAgICBsYXllci5zZXRTdHlsZSh7XG4gICAgICAgICAgICAgICAgICAgIGZpbGxPcGFjaXR5OiBuZXdWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogbmV3VmFsdWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsYXllci5yZWRyYXcoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJhc2VsYXllcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS51cGRhdGVCYXNlbGF5ZXIobmV3VmFsdWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEZyYW1lRXh0ZW50cygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcmFtZUV4dGVudHMgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRNYXBDZW50ZXIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlICYmICFpc05hTihuZXdWYWx1ZS5sYXQpICYmICFpc05hTihuZXdWYWx1ZS5sbmcpKSB7XG4gICAgICAgICAgICAgICAgdm0uY2VudGVyID0gbmV3VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZtLmluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TWFwRmVhdHVyZUdyb3VwKG1hcEZlYXR1cmVHcm91cCk7XG5cbiAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBtYXAgPSBkYXRhO1xuXG4gICAgICAgICAgICAgICAgbWFwRmVhdHVyZUdyb3VwLmFkZFRvKG1hcCk7XG5cbiAgICAgICAgICAgICAgICAvLyBpbml0IGRyYXcgY29udHJvbHNcbiAgICAgICAgICAgICAgICBpbml0RHJhd0NvbnRyb2xzKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBpbml0IG1hcCBjZW50ZXJcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TWFwQ2VudGVyKHZtLmNlbnRlcik7XG5cbiAgICAgICAgICAgICAgICAvLyBkaXNhYmxlIGxlYWZsZXQga2V5Ym9hcmQgc2hvcnRjdXRzIHRvIHByZXZlbnQgY29sbGlzaW9uIHdpdGggYW5ndWxhciBob3RrZXlzXG4gICAgICAgICAgICAgICAgbWFwLmtleWJvYXJkLmRpc2FibGUoKTtcblxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRNYXAobWFwKTtcbiAgICAgICAgICAgICAgICB2bS5tYXAgPSBtYXA7XG5cbiAgICAgICAgICAgICAgICAvLyBhZGQgY29vcmRpbmF0ZXMgY29udHJvbFxuICAgICAgICAgICAgICAgIEwuY29udHJvbC5jb29yZGluYXRlcyh7XG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZVVzZXJJbnB1dDogZmFsc2VcbiAgICAgICAgICAgICAgICB9KS5hZGRUbyhtYXApO1xuXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VsYXllcklkID0gcXMuYmFzZWxheWVyLFxuICAgICAgICAgICAgICAgICAgICBiYXNlbGF5ZXIgPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAoYmFzZWxheWVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIHJlcXVlc3RlZCBiYXNlbGF5ZXIgdG8gdm0ubGF5ZXJzLmJhc2VsYXllcnMgZmlyc3RcbiAgICAgICAgICAgICAgICAgICAgYmFzZWxheWVyID0gXy5maW5kKHNpZ21hQ29uZmlnLmxheWVycy5iYXNlbGF5ZXJzLCB7IGlkOiBiYXNlbGF5ZXJJZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgdm0udXBkYXRlQmFzZWxheWVyKGJhc2VsYXllcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYmFzZWxheWVyIG5vdCBwcmVzZW50IGluIHF1ZXJ5c3RyaW5nLCBzbyBqdXN0IGdvIHdpdGggZGVmYXVsdHNcbiAgICAgICAgICAgICAgICAgICAgYmFzZWxheWVyID0gc2lnbWFDb25maWcubGF5ZXJzLmJhc2VsYXllcnNbc2lnbWFDb25maWcuZGVmYXVsdEJhc2VsYXllcl07XG4gICAgICAgICAgICAgICAgICAgIHZtLmxheWVycyA9IF8uY2xvbmVEZWVwKHNpZ21hQ29uZmlnLmxheWVycyk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRCYXNlbGF5ZXIoYmFzZWxheWVyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb3ZlcmFnZUxheWVyLmFkZFRvKG1hcCk7XG5cbiAgICAgICAgICAgICAgICBtYXAub24oJ2Jhc2VsYXllcmNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiYXNlbGF5ZXIgPSBfLmZpbmQoc2lnbWFDb25maWcubGF5ZXJzLmJhc2VsYXllcnMsIHsgbmFtZTogZS5uYW1lIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmFzZWxheWVyKGJhc2VsYXllcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBtYXAub24oJ21vdmVlbmQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbW92ZWVuZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGVTZXJ2aWNlLmdldFZpZXdNb2RlKCkgPT09ICdzZWFyY2gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFwQ2VudGVyID0gZS50YXJnZXQuZ2V0Q2VudGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TWFwQ2VudGVyKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IG1hcENlbnRlci5sYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBtYXBDZW50ZXIubG5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHpvb206IGUudGFyZ2V0LmdldFpvb20oKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmluaXRpYWxpemUoKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vmlld01vZGUoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdm0ubW9kZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgdm0uZHJhd0NvdmVyYWdlKCk7XG4gICAgICAgICAgICBpbml0RHJhd0NvbnRyb2xzKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYU1hcCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9tYXAvbWFwVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnbWFwQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIG1vZGU6ICc9J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcigncGxheWJhY2tDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRhbGVydCxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICAkdGltZW91dCxcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgT3ZlcmxheSxcbiAgICAgICAgdmlkZW9TZXJ2aWNlLFxuICAgICAgICBkMyxcbiAgICAgICAgXyxcbiAgICAgICAgTCxcbiAgICAgICAgbGVhZmxldERhdGEsXG4gICAgICAgIG1vbWVudCxcbiAgICAgICAgYmxvY2tVSSxcbiAgICAgICAgaG90a2V5cyxcbiAgICAgICAgSW1hZ2UsXG4gICAgICAgICQsXG4gICAgICAgICRhc2lkZVxuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXG4gICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkgPSBzdGF0ZVNlcnZpY2UuZ2V0Q2FudmFzSW1hZ2VPdmVybGF5KCksXG4gICAgICAgICAgICBvdmVybGF5cyA9IFtdLFxuICAgICAgICAgICAgYnJ1c2hFeHRlbnRzID0ge30sXG4gICAgICAgICAgICBmcmFtZUluZGV4ZXMgPSBbXSxcbiAgICAgICAgICAgIGZyYW1lQ3VycmVudCA9IDAsXG4gICAgICAgICAgICBmcmFtZUR1cmF0aW9uID0gMCxcbiAgICAgICAgICAgIHRvdGFsU2Vjb25kcyA9IDAsXG4gICAgICAgICAgICBpc0N1c3RvbUludGVydmFsID0gZmFsc2UsXG4gICAgICAgICAgICB0aW1lU2xpZGVyRXh0ZW50U3RhcnQgPSAnJyxcbiAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdG9wID0gJycsXG4gICAgICAgICAgICB0aW1lU2xpZGVyRGF0YSA9IHt9LFxuICAgICAgICAgICAgLy8gdGhlIGZpcnN0IGZyYW1lIGlkeCB3aGVuIHRoZSB2aWRlbyBleHBvcnRlciBpcyBzdGFydGVkXG4gICAgICAgICAgICBleHBvcnRGcmFtZVN0YXJ0ID0gMCxcbiAgICAgICAgICAgIC8vIGhvdyBtYW55IGxvb3BzIHRoZSB2aWRlbyBleHBvcnRlciBoaXRzLCB1c2VkIGZvciB3aGVuIHRvIHN0b3AgcmVjb3JkaW5nXG4gICAgICAgICAgICBleHBvcnRMb29wQ291bnRlciA9IDAsXG4gICAgICAgICAgICAvLyB0b3RhbCBudW1iZXIgb2YgcmFtZXMgdmlkZW8gZXhwb3J0ZXIgcmVjb3JkcywgdXNlZCBmb3IgcHJvZ3Jlc3NcbiAgICAgICAgICAgIGV4cG9ydEZyYW1lQ291bnRlciA9IDAsXG4gICAgICAgICAgICBjb250cmFzdExldmVsID0gXy5maW5kKHNpZ21hQ29uZmlnLmNvbnRyYXN0TGV2ZWxzLCB7IGRlZmF1bHQ6IHRydWUgfSksXG4gICAgICAgICAgICBpbWdGaWx0ZXJzQXNpZGUgPSAkYXNpZGUoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAnSW1hZ2UgZmlsdGVycycsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ2ltYWdlRmlsdGVyc0NvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgICAgICBiYWNrZHJvcDogZmFsc2UsXG4gICAgICAgICAgICAgICAgY29udGVudFRlbXBsYXRlOiAnbW9kdWxlcy9jb21wb25lbnRzL2ltYWdlRmlsdGVycy9pbWFnZUZpbHRlcnNUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiBmYWxzZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGV4cG9ydFJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gaGVscGVyIHRvIHNldCB0aGUgdmlkZW8gZXhwb3J0IGJhY2sgdG8gYW4gdW5pbml0aWFsaXplZCBzdGF0ZVxuICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmlzUmVjb3JkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB2aWRlb1NlcnZpY2UuY2xlYXIoKTtcbiAgICAgICAgICAgIGV4cG9ydExvb3BDb3VudGVyID0gMDtcbiAgICAgICAgICAgIGV4cG9ydEZyYW1lU3RhcnQgPSAwO1xuICAgICAgICAgICAgZXhwb3J0RnJhbWVDb3VudGVyID0gMDtcbiAgICAgICAgICAgIGlmICh2bS5leHBvcnRMYWJlbHMpIHtcbiAgICAgICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkudGV4dExheWVyLnRleHQgPSAnJztcbiAgICAgICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkucmVkcmF3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGV4cG9ydENoZWNrTG9vcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGZ1bmN0aW9uIHRvIGNhbGwgb24gZWFjaCBpdGVyYXRpb24gb2YgdGhlIHBsYXliYWNrIGxvb3AgdG8gY2hlY2tcbiAgICAgICAgICAgIC8vIHdoZW4gdG8gc3RvcCBhbmQgc3RhcnQgdGhlIGVuY29kZXJcbiAgICAgICAgICAgIGlmICh2aWRlb1NlcnZpY2UuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiB0aGUgY3VycmVudCBmcmFtZSBjb21lcyBiYWNrIHRvIHdoZXJldmVyIHRoZSB2aWRlb1xuICAgICAgICAgICAgICAgIC8vIHdhcyBzdGFydGVkIGF0LCBjb3VudCBhIG5ldyBsb29wXG4gICAgICAgICAgICAgICAgaWYgKGZyYW1lQ3VycmVudCA9PT0gZXhwb3J0RnJhbWVTdGFydCkge1xuICAgICAgICAgICAgICAgICAgICBleHBvcnRMb29wQ291bnRlcisrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgbnVtYmVyIG9mIGZyYW1lcyByZWNvcmRlZFxuICAgICAgICAgICAgICAgIGV4cG9ydEZyYW1lQ291bnRlcisrO1xuXG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHByb2dyZXNzIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICB2YXIgdG90YWxGcmFtZXMgPSBmcmFtZUluZGV4ZXMubGVuZ3RoICogcGFyc2VJbnQodm0uZXhwb3J0TG9vcHMudmFsdWUpLFxuICAgICAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IE1hdGgucm91bmQoKGV4cG9ydEZyYW1lQ291bnRlciAvIHRvdGFsRnJhbWVzKSAqIDEwMCk7XG4gICAgICAgICAgICAgICAgYmxvY2tVSS5tZXNzYWdlKCdSZWNvcmRpbmcgJyArIHByb2dyZXNzICsgJyUnKTtcblxuICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgdGV4dCBhdCB0aGUgdG9wIGxlZnQgb2YgdGhlIFBJWEkgcmVuZGVyZXJcbiAgICAgICAgICAgICAgICBpZiAodm0uZXhwb3J0TGFiZWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZXh0TGF5ZXIgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgdGV4dExheWVyICs9IG1vbWVudC51dGMoZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uc3RhcnQpLmZvcm1hdCgnTU0vREQvWVlZWSBISDptbTpzcycpO1xuICAgICAgICAgICAgICAgICAgICB0ZXh0TGF5ZXIgKz0gJyAtICc7XG4gICAgICAgICAgICAgICAgICAgIHRleHRMYXllciArPSBtb21lbnQudXRjKGZyYW1lSW5kZXhlc1tmcmFtZUN1cnJlbnRdLnN0b3ApLmZvcm1hdCgnTU0vREQvWVlZWSBISDptbTpzcycpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhbnZhc0ltYWdlT3ZlcmxheS50ZXh0TGF5ZXIudGV4dCA9IHRleHRMYXllcjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkudGV4dExheWVyLnRleHQgPSAnJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBvbmNlIHRoZSBsb29wcyBoYXZlIGhpdCB0aGUgY29udHJvbGxlciB2YWx1ZSBzdGFydCBleHBvcnRcbiAgICAgICAgICAgICAgICBpZiAoZXhwb3J0TG9vcENvdW50ZXIgPj0gcGFyc2VJbnQodm0uZXhwb3J0TG9vcHMudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0b3AgdGhlIHBsYXliYWNrIGFuaW1hdGlvblxuICAgICAgICAgICAgICAgICAgICB2bS5zbGlkZXJDdHJsKCdzdG9wJyk7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RvcCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSBpcyBhIGZpbGUgbmFtZVxuICAgICAgICAgICAgICAgICAgICB2YXIgZm5hbWUgPSB2bS5leHBvcnRGaWxlbmFtZSA/IHZtLmV4cG9ydEZpbGVuYW1lIDogc2lnbWFDb25maWcudGl0bGU7XG4gICAgICAgICAgICAgICAgICAgIGZuYW1lICs9ICcuJyArIHZtLmV4cG9ydEZvcm1hdDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBzdGFydCB0aGUgZW5jb2RpbmdcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmVuY29kZShmbmFtZSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRSZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRSZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGFsZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0Vycm9yJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiAnRXJyb3Igc2F2aW5nIHZpZGVvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLnBsYXliYWNrV2l0aEdhcHMgPSBzaWdtYUNvbmZpZy5wbGF5YmFja1dpdGhHYXBzO1xuICAgICAgICB2bS5wbGF5YmFja1NwZWVkID0ge1xuICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgbWF4OiBzaWdtYUNvbmZpZy5tYXhQbGF5YmFja0RlbGF5IC8gMTAwLFxuICAgICAgICAgICAgdmFsdWU6IHNpZ21hQ29uZmlnLm1heFBsYXliYWNrRGVsYXkgLyAxMDAsXG4gICAgICAgICAgICBzdGVwOiAwLjAxXG4gICAgICAgIH07XG5cbiAgICAgICAgdm0ucGxheWJhY2tTdGFydCA9IG1vbWVudC51dGMoKS5zdGFydE9mKCdkJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdm0ucGxheWJhY2tTdG9wID0gbW9tZW50LnV0YygpLmVuZE9mKCdkJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdm0uc2V0UGxheWJhY2tGaWx0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IGltYWdlcyB0aGF0IGRvbid0IGZhbGwgYmV0d2VlbiBwbGF5YmFjayBmaWx0ZXIgdmFsdWVzXG4gICAgICAgICAgICBmcmFtZUluZGV4ZXMgPSBfLmNsb25lRGVlcChzdGF0ZVNlcnZpY2UuZ2V0RnJhbWVJbmRleGVzKCkpO1xuICAgICAgICAgICAgZnJhbWVJbmRleGVzID0gXy5mb3JFYWNoKGZyYW1lSW5kZXhlcywgZnVuY3Rpb24gKGZyYW1lKSB7XG4gICAgICAgICAgICAgICAgZnJhbWUuaW1hZ2VzID0gXy5maWx0ZXIoZnJhbWUuaW1hZ2VzLCBmdW5jdGlvbiAoaW1hZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHllYXIgPSBtb21lbnQudXRjKGltYWdlLnRpbWUpLmZvcm1hdCgnWVlZWScpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbW9udGggPSBtb21lbnQudXRjKGltYWdlLnRpbWUpLmZvcm1hdCgnTU0nKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHN0YXJ0RGF5ID0gbW9tZW50LnV0YyhpbWFnZS50aW1lKS5mb3JtYXQoJ0REJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdGFydEhvdXIgPSBtb21lbnQudXRjKHZtLnBsYXliYWNrU3RhcnQpLmZvcm1hdCgnSEgnKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHN0YXJ0TWludXRlID0gbW9tZW50LnV0Yyh2bS5wbGF5YmFja1N0YXJ0KS5mb3JtYXQoJ21tJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdGFydFNlY29uZCA9IG1vbWVudC51dGModm0ucGxheWJhY2tTdGFydCkuZm9ybWF0KCdzcycpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29tcGFyZVN0YXJ0ID0gbW9tZW50LnV0Yyh5ZWFyICsgJy0nICsgbW9udGggKyAnLScgKyBzdGFydERheSArICdUJyArIHN0YXJ0SG91ciArICc6JyArIHN0YXJ0TWludXRlICsgJzonICsgc3RhcnRTZWNvbmQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3RvcERheSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb21lbnQudXRjKHZtLnBsYXliYWNrU3RvcCkuaXNCZWZvcmUobW9tZW50LnV0Yyh2bS5wbGF5YmFja1N0YXJ0KSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BEYXkgPSBtb21lbnQudXRjKGltYWdlLnRpbWUpLmFkZCgxLCAnZCcpLmZvcm1hdCgnREQnKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BEYXkgPSBtb21lbnQudXRjKGltYWdlLnRpbWUpLmZvcm1hdCgnREQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgc3RvcEhvdXIgPSBtb21lbnQudXRjKHZtLnBsYXliYWNrU3RvcCkuZm9ybWF0KCdISCcpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3RvcE1pbnV0ZSA9IG1vbWVudC51dGModm0ucGxheWJhY2tTdG9wKS5mb3JtYXQoJ21tJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdG9wU2Vjb25kID0gbW9tZW50LnV0Yyh2bS5wbGF5YmFja1N0b3ApLmZvcm1hdCgnc3MnKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbXBhcmVTdG9wID0gbW9tZW50LnV0Yyh5ZWFyICsgJy0nICsgbW9udGggKyAnLScgKyBzdG9wRGF5ICsgJ1QnICsgc3RvcEhvdXIgKyAnOicgKyBzdG9wTWludXRlICsgJzonICsgc3RvcFNlY29uZCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnQudXRjKGltYWdlLnRpbWUpLmlzQmV0d2Vlbihjb21wYXJlU3RhcnQsIGNvbXBhcmVTdG9wLCBudWxsLCAnW10nKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCF2bS5wbGF5YmFja1dpdGhHYXBzKSB7XG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGZyYW1lcyBmcm9tIHRoZSBpbmRleCB0aGF0IGRvbid0IGNvbnRhaW4gaW1hZ2VzXG4gICAgICAgICAgICAgICAgZnJhbWVJbmRleGVzID0gXy5maWx0ZXIoZnJhbWVJbmRleGVzLCBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaS5pbWFnZXMubGVuZ3RoICE9PSAwO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnBsYXliYWNrVG9nZ2xlQXNpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBvbmNsaWNrIGV2ZW50IGZvciB0aGUgXCJmaWx0ZXJzXCIgYnV0dG9uIHRvIG9wZW4gdGhlIGFzaWRlXG4gICAgICAgICAgICBpbWdGaWx0ZXJzQXNpZGUudG9nZ2xlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gdmlkZW8gZXhwb3J0IGNvbnRyb2xzXG4gICAgICAgIHZtLmV4cG9ydEJhc2VMYXllciA9IHRydWU7XG4gICAgICAgIHZtLmV4cG9ydExhYmVscyA9IHRydWU7XG4gICAgICAgIHZtLmV4cG9ydEZvcm1hdHMgPSBfLnRyYW5zZm9ybShzaWdtYUNvbmZpZy5lbmNvZGVycywgZnVuY3Rpb24gKHJlc3VsdCwgdiwgaykge1xuICAgICAgICAgICAgaWYgKHYuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBbXSk7XG4gICAgICAgIHZtLmV4cG9ydEZvcm1hdCA9IHZpZGVvU2VydmljZS5lbmNvZGVyO1xuICAgICAgICB2bS5leHBvcnRMb29wcyA9IHtcbiAgICAgICAgICAgIG1pbjogMSxcbiAgICAgICAgICAgIG1heDogMTAsXG4gICAgICAgICAgICB2YWx1ZTogMSxcbiAgICAgICAgICAgIHN0ZXA6IDFcbiAgICAgICAgfTtcbiAgICAgICAgdm0uZXhwb3J0RmlsZW5hbWUgPSAnJztcbiAgICAgICAgdm0uZXhwb3J0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gaGVscGVyIHRvIHN0YXJ0IGV4cG9ydGluZyBhIHZpZGVvXG4gICAgICAgICAgICB2aWRlb1NlcnZpY2UuaXNSZWNvcmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmluY2x1ZGVCYXNlTGF5ZXIgPSB2bS5leHBvcnRCYXNlTGF5ZXI7XG5cbiAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB0aGUgYW5pbWF0aW9uIGlzIHN0b3BwZWRcbiAgICAgICAgICAgIHZtLnNsaWRlckN0cmwoJ3N0b3AnKTtcblxuICAgICAgICAgICAgLy8gd2FpdCBmb3IgdGhlIGluaXRpYWxpemF0aW9uIHRvIGZpbmlzaFxuICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmluaXRpYWxpemUoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIFVJIG1lc3NhZ2UsIHdpbGwgYmUgdXBkYXRlZCBvciBzdG9wcGVkIGluIGV4cG9ydENoZWNrTG9vcCgpXG4gICAgICAgICAgICAgICAgYmxvY2tVSS5zdGFydCgnUmVjb3JkaW5nJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBzYXZlIHRoZSBmcmFtZSB3ZSBzdGFydCBhdCBhbmQgc3RhcnQgdGhlIHBsYXliYWNrXG4gICAgICAgICAgICAgICAgZXhwb3J0RnJhbWVTdGFydCA9IGZyYW1lQ3VycmVudDtcbiAgICAgICAgICAgICAgICB2bS5zbGlkZXJDdHJsKCdwbGF5UGF1c2UnKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2aWRlb1NlcnZpY2UuaXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2aWRlb1NlcnZpY2UuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICAkYWxlcnQoe1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0Vycm9yJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogJ0Vycm9yIGluaXRpYWxpemluZyB2aWRlbyByZWNvcmRpbmcnLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0ucGxheWJhY2tJbnRlcnZhbHMgPSBfLmNsb25lRGVlcChzaWdtYUNvbmZpZy5wbGF5YmFja0ludGVydmFscyk7XG4gICAgICAgIHZtLnBsYXliYWNrSW50ZXJ2YWwgPSBxcy5wbGF5YmFja0ludGVydmFsID8gXy5maW5kKHZtLnBsYXliYWNrSW50ZXJ2YWxzLCB7IHZhbHVlOiBxcy5wbGF5YmFja0ludGVydmFsIH0pIDogXy5maW5kKHZtLnBsYXliYWNrSW50ZXJ2YWxzLCB7IGRlZmF1bHQ6IHRydWUgfSk7XG4gICAgICAgIHZtLnBsYXliYWNrSW50ZXJ2YWxRdHkgPSBxcy5wbGF5YmFja0ludGVydmFsUXR5ID8gcGFyc2VJbnQocXMucGxheWJhY2tJbnRlcnZhbFF0eSkgOiBfLmNsb25lKHNpZ21hQ29uZmlnLmRlZmF1bHRQbGF5YmFja0ludGVydmFsUXR5KTtcblxuICAgICAgICBpZiAodm0ucGxheWJhY2tJbnRlcnZhbFF0eSA9PT0gMCkge1xuICAgICAgICAgICAgdm0ucGxheWJhY2tJbnRlcnZhbCA9IF8uZmluZCh2bS5wbGF5YmFja0ludGVydmFscywgeyB2YWx1ZTogbnVsbCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZtLnBsYXliYWNrU3RhdGUgPSAnc3RvcCc7XG4gICAgICAgIHZtLnBsYXliYWNrRGlyZWN0aW9uID0gJ2ZvcndhcmQnO1xuICAgICAgICB2bS5udW1JbWFnZXNMb2FkZWQgPSAwO1xuICAgICAgICB2bS50b3RhbEltYWdlcyA9IDA7XG4gICAgICAgIHZtLmltYWdlUXVhbGl0eVBlcmNlbnRhZ2UgPSB7XG4gICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAvLyBJIGRvbid0IGtub3cgd2h5LCBidXQgQW5ndWxhciBkb2Vzbid0IGhhbmRsZSByYW5nZSBzbGlkZXIgdmFsdWVzXG4gICAgICAgICAgICAvLyBwcm9wZXJseSB3aGVuIG1pbi9tYXggYXJlIGJldHdlZW4gMC0xLCBzbyBzZXQgbWF4IHRvIDEwIGFuZFxuICAgICAgICAgICAgLy8gZGl2aWRlIGJ5IDEwIGxhdGVydG8gb2J0YWluIHJhbmdlIHNsaWRlciB2YWx1ZVxuICAgICAgICAgICAgbWF4OiAxMCxcbiAgICAgICAgICAgIHZhbHVlOiBzaWdtYUNvbmZpZy5kZWZhdWx0SW1hZ2VRdWFsaXR5LFxuICAgICAgICAgICAgc3RlcDogMC4wMVxuICAgICAgICB9O1xuXG4gICAgICAgIGhvdGtleXMuYmluZFRvKCRzY29wZSlcbiAgICAgICAgICAgIC5hZGQoe1xuICAgICAgICAgICAgICAgIGNvbWJvOiAncCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQbGF5L1BhdXNlJyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2bS5zbGlkZXJDdHJsKCdwbGF5UGF1c2UnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5hZGQoe1xuICAgICAgICAgICAgY29tYm86ICdsZWZ0JyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU3RlcCBCYWNrJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdm0uc2xpZGVyQ3RybCgnc3RlcEJhY2t3YXJkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICBjb21ibzogJ3JpZ2h0JyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU3RlcCBGb3J3YXJkJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdm0uc2xpZGVyQ3RybCgnc3RlcEZvcndhcmQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuYWRkKHtcbiAgICAgICAgICAgIGNvbWJvOiAndXAnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQbGF5L1BhdXNlIEZvcndhcmQnLFxuICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2bS5zbGlkZXJDdHJsKCdmb3J3YXJkJyk7XG4gICAgICAgICAgICAgICAgdm0uc2xpZGVyQ3RybCgncGxheVBhdXNlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICBjb21ibzogJ2Rvd24nLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQbGF5L1BhdXNlIEJhY2t3YXJkJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdm0uc2xpZGVyQ3RybCgnYmFja3dhcmQnKTtcbiAgICAgICAgICAgICAgICB2bS5zbGlkZXJDdHJsKCdwbGF5UGF1c2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuYWRkKHtcbiAgICAgICAgICAgIGNvbWJvOiAnYWx0K2xlZnQnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZXZlcnNlJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdm0uc2xpZGVyQ3RybCgnYmFja3dhcmQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuYWRkKHtcbiAgICAgICAgICAgIGNvbWJvOiAnYWx0K3JpZ2h0JyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9yd2FyZCcsXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZtLnNsaWRlckN0cmwoJ2ZvcndhcmQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gZGV0ZXJtaW5lIHRoZSBudW1iZXIgb2YgZnJhbWVzIGJhc2VkIG9uIHRoZSBzZWxlY3RlZCBwb3J0aW9uIG9mIHRoZSBzbGlkZXIgZXh0ZW50c1xuICAgICAgICB2YXIgY2FsY3VsYXRlTnVtYmVyT2ZGcmFtZXMgPSBmdW5jdGlvbiAodXNlSW50ZXJ2YWxDb250cm9sKSB7XG4gICAgICAgICAgICB0b3RhbFNlY29uZHMgPSBtb21lbnQudXRjKHRpbWVTbGlkZXJFeHRlbnRTdG9wKS5kaWZmKG1vbWVudC51dGModGltZVNsaWRlckV4dGVudFN0YXJ0KSwgJ3MnKTtcblxuICAgICAgICAgICAgLy8gYnVpbGQgcGxheWJhY2sgYXJyYXkgYmFzZWQgb24gaW50ZXJ2YWxcbiAgICAgICAgICAgIGlmICh1c2VJbnRlcnZhbENvbnRyb2wpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGVtcERhdGUgPSBtb21lbnQudXRjKHRpbWVTbGlkZXJFeHRlbnRTdGFydCkuYWRkKHZtLnBsYXliYWNrSW50ZXJ2YWxRdHksIHZtLnBsYXliYWNrSW50ZXJ2YWwudmFsdWUpO1xuICAgICAgICAgICAgICAgIGZyYW1lRHVyYXRpb24gPSB0ZW1wRGF0ZS5kaWZmKG1vbWVudC51dGModGltZVNsaWRlckV4dGVudFN0YXJ0KSwgJ3MnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnJQbGF5YmFja0ludGVydmFsUXR5ID0gdm0ucGxheWJhY2tJbnRlcnZhbFF0eSxcbiAgICAgICAgICAgICAgICAgICAgY3VyclBsYXliYWNrSW50ZXJ2YWwgPSB2bS5wbGF5YmFja0ludGVydmFsO1xuXG4gICAgICAgICAgICAgICAgZnJhbWVEdXJhdGlvbiA9IG1vbWVudC51dGMoYnJ1c2hFeHRlbnRzLnN0b3ApLmRpZmYobW9tZW50LnV0YyhicnVzaEV4dGVudHMuc3RhcnQpLCAncycpO1xuICAgICAgICAgICAgICAgIGlmIChtb21lbnQuZHVyYXRpb24oZnJhbWVEdXJhdGlvbiwgJ3MnKS5kYXlzKCkgPCAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlcXVlc3RlZCBpbnRlcnZhbCBpcyBsZXNzIHRoYW4gYSBkYXksIHNvIG1ha2Ugc3VyZSBpdCdzIG5vdCBsZXNzIHRoYW4gdGhlIGRlZmF1bHQgbWluaW11bVxuICAgICAgICAgICAgICAgICAgICBpZiAobW9tZW50LmR1cmF0aW9uKGZyYW1lRHVyYXRpb24sICdzJykuZ2V0KHNpZ21hQ29uZmlnLm1pbmltdW1GcmFtZUR1cmF0aW9uLmludGVydmFsKSA8IHNpZ21hQ29uZmlnLm1pbmltdW1GcmFtZUR1cmF0aW9uLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUR1cmF0aW9uID0gbW9tZW50LnV0YyhicnVzaEV4dGVudHMuc3RhcnQpLmFkZChzaWdtYUNvbmZpZy5taW5pbXVtRnJhbWVEdXJhdGlvbi52YWx1ZSwgc2lnbWFDb25maWcubWluaW11bUZyYW1lRHVyYXRpb24uaW50ZXJ2YWwpLmRpZmYobW9tZW50LnV0YyhicnVzaEV4dGVudHMuc3RhcnQpLCAncycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrSW50ZXJ2YWxRdHkgPSBtb21lbnQuZHVyYXRpb24oZnJhbWVEdXJhdGlvbiwgJ3MnKS5nZXQoc2lnbWFDb25maWcubWluaW11bUZyYW1lRHVyYXRpb24uaW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0ludGVydmFsID0gXy5maW5kKHZtLnBsYXliYWNrSW50ZXJ2YWxzLCB7dmFsdWU6IHNpZ21hQ29uZmlnLm1pbmltdW1GcmFtZUR1cmF0aW9uLmludGVydmFsfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdm0ucGxheWJhY2tJbnRlcnZhbFF0eSA9IE1hdGguZmxvb3IobW9tZW50LmR1cmF0aW9uKGZyYW1lRHVyYXRpb24sICdzJykuYXNEYXlzKCkpO1xuICAgICAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0ludGVydmFsID0gXy5maW5kKHZtLnBsYXliYWNrSW50ZXJ2YWxzLCB7dmFsdWU6ICdkJ30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY3VyclBsYXliYWNrSW50ZXJ2YWxRdHkgPT09IHZtLnBsYXliYWNrSW50ZXJ2YWxRdHkgJiYgY3VyclBsYXliYWNrSW50ZXJ2YWwudGl0bGUgPT09IHZtLnBsYXliYWNrSW50ZXJ2YWwudGl0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheWJhY2sgaW50ZXJ2YWwgaGFzbid0IGNoYW5nZWQgc28gdGhlcmUgaXMgbm8gbmVlZCBmb3IgdXBkYXRpbmcgdGhlIGJydXNoIG9yIHRoZSBwbGF5YmFjayBhcnJheVxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QnJ1c2hSZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFBsYXliYWNrSW50ZXJ2YWxRdHkodm0ucGxheWJhY2tJbnRlcnZhbFF0eSk7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UGxheWJhY2tJbnRlcnZhbCh2bS5wbGF5YmFja0ludGVydmFsKTtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmNlaWwodG90YWxTZWNvbmRzL2ZyYW1lRHVyYXRpb24pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHNldCB1cCBhcnJheSBvZiB0aW1lLWJhc2VkIGltYWdlcyB0byBwcm9qZWN0IG9udG8gdGhlIG1hcFxuICAgICAgICB2YXIgdXBkYXRlUGxheWJhY2tBcnJheSA9IGZ1bmN0aW9uICh1c2VJbnRlcnZhbENvbnRyb2wpIHtcbiAgICAgICAgICAgIGJsb2NrVUkuc3RhcnQoJ0NvbmZpZ3VyaW5nIFBsYXliYWNrJyk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdXNlSW50ZXJ2YWxDb250cm9sID09PSAndW5kZWZpbmVkJyB8fCB1c2VJbnRlcnZhbENvbnRyb2wgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB1c2VJbnRlcnZhbENvbnRyb2wgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmcmFtZUluZGV4ZXMgPSBbXTtcbiAgICAgICAgICAgIGZyYW1lQ3VycmVudCA9IDA7XG4gICAgICAgICAgICB2bS5udW1JbWFnZXNMb2FkZWQgPSAwO1xuICAgICAgICAgICAgdm0udG90YWxJbWFnZXMgPSAwO1xuXG4gICAgICAgICAgICAvLyBzb3J0IGltYWdlcyBieSBpbWFnZXF1YWxpdHkgZGVzY2VuZGluZyBpbiBwcmVwYXJhdGlvbiBmb3IgaW1hZ2VxdWFsaXR5IGZpbHRlcmluZ1xuICAgICAgICAgICAgdmFyIHNvcnRlZE92ZXJsYXlzSW1hZ2VRdWFsaXR5ID0gXy5zb3J0QnkodGltZVNsaWRlckRhdGEuZnJhbWUsIFsnaW1hZ2VxdWFsaXR5J10sIFsnZGVzYyddKTtcblxuICAgICAgICAgICAgLy8gaWYgaW1hZ2VxdWFsaXR5IGhhcyBiZWVuIGFkanVzdGVkIGFib3ZlIDAsIHJlbW92ZSBhbGwgb3ZlcmxheXMgd2hlcmUgaW1hZ2VxdWFsaXR5IGlzIG51bGxcbiAgICAgICAgICAgIGlmIChNYXRoLmNlaWwodm0uaW1hZ2VRdWFsaXR5UGVyY2VudGFnZS52YWx1ZS8xMCkgPiAwKSB7XG4gICAgICAgICAgICAgICAgXy5yZW1vdmUoc29ydGVkT3ZlcmxheXNJbWFnZVF1YWxpdHksIHsgaW1hZ2VxdWFsaXR5OiBudWxsIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UsIG1vdmUgaW1hZ2VzIHdpdGggbnVsbCBpbWFnZXF1YWxpdHkgdG8gdGhlIGJvdHRvbSBvZiB0aGUgbGlzdFxuICAgICAgICAgICAgICAgIHZhciBvdmVybGF5c1dpdGhOdWxsSW1hZ2VRdWFsaXR5ID0gXy5yZW1vdmUoc29ydGVkT3ZlcmxheXNJbWFnZVF1YWxpdHksIHsgaW1hZ2VxdWFsaXR5OiBudWxsIH0pO1xuICAgICAgICAgICAgICAgIGlmIChvdmVybGF5c1dpdGhOdWxsSW1hZ2VRdWFsaXR5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc29ydGVkT3ZlcmxheXNJbWFnZVF1YWxpdHkgPSBzb3J0ZWRPdmVybGF5c0ltYWdlUXVhbGl0eS5jb25jYXQob3ZlcmxheXNXaXRoTnVsbEltYWdlUXVhbGl0eSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdG90YWxPdmVybGF5cyA9IHRpbWVTbGlkZXJEYXRhLmZyYW1lLmxlbmd0aDtcbiAgICAgICAgICAgIC8vIHVzZSBpbWFnZXF1YWxpdHkgdmFsdWUgdG8gdGFrZSBvbmx5IHRoZSB0b3AgbiUgb2YgaW1hZ2VzXG4gICAgICAgICAgICAvLyB0aGlzIGFsbG93cyBmb3IgbW9yZSBjb25zaXN0ZW50IHJlc3VsdHMsIHNpbmNlIGFuIGltYWdlcXVhbGl0eSBvZiAwLjIgY291bGQgbWVhbiBkaWZmZXJlbnQgdGhpbmdzIGFjcm9zcyB0aWxlc1xuICAgICAgICAgICAgLy8gZGl2aWRlIGltYWdlUXVhbGl0eVBlcmNlbnRhZ2UudmFsdWUgYnkgMTAgYmVjYXVzZSBvZiBBbmd1bGFyIGJlaGF2aW9yIG1lbnRpb25lZCBlYXJsaWVyXG4gICAgICAgICAgICB2YXIgbnVtVG9UYWtlID0gdG90YWxPdmVybGF5cyAtIChNYXRoLmNlaWwoKHZtLmltYWdlUXVhbGl0eVBlcmNlbnRhZ2UudmFsdWUvMTApICogdG90YWxPdmVybGF5cykpO1xuICAgICAgICAgICAgdmFyIGZpbHRlcmVkT3ZlcmxheXMgPSBfLnRha2Uoc29ydGVkT3ZlcmxheXNJbWFnZVF1YWxpdHksIG51bVRvVGFrZSk7XG4gICAgICAgICAgICAvLyB0aGUgbG93ZXN0IGltYWdlcXVhbGl0eSB2YWx1ZSBsZWZ0IGlzIHdoYXQgd2lsbCBiZSB1c2VkIGZvciBhb2lhbmFseXNpcywgcG9pbnRjb252ZXJ0ZXIsIGFuZCBjb3JyZWxhdGlvblxuICAgICAgICAgICAgdmFyIGFjdHVhbEltYWdlUXVhbGl0eSA9IGZpbHRlcmVkT3ZlcmxheXNbZmlsdGVyZWRPdmVybGF5cy5sZW5ndGggLSAxXS5pbWFnZXF1YWxpdHkgfHwgMDtcbiAgICAgICAgICAgIC8vIGZpbmFsbHksIHNvcnQgb3ZlcmxheXMgYnkgdGltZSBhc2NlbmRpbmcgZm9yIHBsYXliYWNrXG4gICAgICAgICAgICB2YXIgc29ydGVkT3ZlcmxheXNUaW1lID0gXy5zb3J0QnkoZmlsdGVyZWRPdmVybGF5cywgJ3RpbWUnKTtcblxuICAgICAgICAgICAgLy8gcmVwb3J0IGFjdHVhbEltYWdlUXVhbGl0eSB0byBzdGF0ZVNlcnZpY2VcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRJbWFnZVF1YWxpdHkoYWN0dWFsSW1hZ2VRdWFsaXR5KTtcbiAgICAgICAgICAgIHZtLnRvdGFsSW1hZ2VzID0gc29ydGVkT3ZlcmxheXNUaW1lLmxlbmd0aDtcblxuICAgICAgICAgICAgLy8gb25sb2FkIGNhbGxiYWNrIGZvciBlYWNoIGltYWdlIGxvYWQgZXZlbnRcbiAgICAgICAgICAgIHZhciBvbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdm0ubnVtSW1hZ2VzTG9hZGVkKys7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBjdXJyT3ZlcmxheXMgPSBfLmZpbHRlcihzb3J0ZWRPdmVybGF5c1RpbWUsIGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vbWVudC51dGMoby50aW1lKS5pc1NhbWVPckFmdGVyKG1vbWVudC51dGModGltZVNsaWRlckV4dGVudFN0YXJ0KSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIG51bUZyYW1lcyA9IHZtLnBsYXliYWNrSW50ZXJ2YWwudmFsdWUgPT09IG51bGwgPyBjdXJyT3ZlcmxheXMubGVuZ3RoIDogY2FsY3VsYXRlTnVtYmVyT2ZGcmFtZXModXNlSW50ZXJ2YWxDb250cm9sKSxcbiAgICAgICAgICAgICAgICBjdXJyU3RhcnRUaW1lID0gbW9tZW50LnV0Yyh0aW1lU2xpZGVyRXh0ZW50U3RhcnQpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgY3VyclN0b3BUaW1lID0gdm0ucGxheWJhY2tJbnRlcnZhbC52YWx1ZSA9PT0gbnVsbCA/IGN1cnJPdmVybGF5c1swXS50aW1lIDogbW9tZW50LnV0YyhjdXJyU3RhcnRUaW1lKS5hZGQoZnJhbWVEdXJhdGlvbiwgJ3MnKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgIGN1cnJEZXRhaWxJZHggPSAwO1xuXG4gICAgICAgICAgICBpZiAobnVtRnJhbWVzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJ1aWxkRnJhbWVzID0gZnVuY3Rpb24gKGZyYW1lSWR4KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBjdXJyU3RhcnRUaW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogY3VyclN0b3BUaW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSwgLy9ldmVudHVhbGx5IHRoZSBlbmFibGVkIHZhbHVlIHdpbGwgY29tZSBmcm9tIHRoZSBzZXJ2aWNlXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWFnZXM6IFtdXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjdXJyT3ZlcmxheXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyT3ZlcmxheXNbY3VyckRldGFpbElkeF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobW9tZW50LnV0YyhjdXJyU3RvcFRpbWUpLmlzU2FtZU9yQWZ0ZXIobW9tZW50LnV0YyhjdXJyT3ZlcmxheXNbY3VyckRldGFpbElkeF0udGltZSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvdmVybGF5RGF0YSA9IGN1cnJPdmVybGF5c1tjdXJyRGV0YWlsSWR4XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltZ1NyYyA9IHNpZ21hQ29uZmlnLm92ZXJsYXlQcmVmaXggKyBvdmVybGF5RGF0YVtjb250cmFzdExldmVsLm5hbWVdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheSA9IG5ldyBPdmVybGF5KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJsYXlEYXRhW2NvbnRyYXN0TGV2ZWwubmFtZV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1nU3JjLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJsYXlEYXRhLmltYWdlcXVhbGl0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVybGF5RGF0YS5ib3VuZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheURhdGEudGltZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZS5lbmFibGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubG9hZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZS5pbWFnZXMucHVzaChvdmVybGF5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyckRldGFpbElkeCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZyYW1lSW5kZXhlcy5wdXNoKGZyYW1lKTtcblxuICAgICAgICAgICAgICAgICAgICBmcmFtZUlkeCsrO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChmcmFtZUlkeCA8PSBudW1GcmFtZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJTdGFydFRpbWUgPSB2bS5wbGF5YmFja0ludGVydmFsLnZhbHVlID09PSBudWxsID8gbW9tZW50LnV0YyhjdXJyT3ZlcmxheXNbZnJhbWVJZHggLSAxXS50aW1lKS5zdWJ0cmFjdCgxLCAncycpIDogbW9tZW50LnV0YyhjdXJyU3RvcFRpbWUpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyU3RvcFRpbWUgPSB2bS5wbGF5YmFja0ludGVydmFsLnZhbHVlID09PSBudWxsID8gY3Vyck92ZXJsYXlzW2ZyYW1lSWR4IC0gMV0udGltZSA6IG1vbWVudC51dGMoY3VyclN0YXJ0VGltZSkuYWRkKGZyYW1lRHVyYXRpb24sICdzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkRnJhbWVzKGZyYW1lSWR4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBidWlsZEZyYW1lcygwKTtcblxuICAgICAgICAgICAgICAgIGlmICghdm0ucGxheWJhY2tXaXRoR2Fwcykge1xuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgZnJhbWVzIGZyb20gdGhlIGluZGV4IHRoYXQgZG9uJ3QgY29udGFpbiBpbWFnZXNcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVJbmRleGVzID0gXy5maWx0ZXIoZnJhbWVJbmRleGVzLCBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGkuaW1hZ2VzLmxlbmd0aCAhPT0gMDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gc2VuZCBhbGwgdGhlIGZyYW1lcyB0byB0aGUgY2FudmFzIHJlbmRlcmVyXG4gICAgICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5LnNldChmcmFtZUluZGV4ZXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBibG9ja1VJLnN0b3AoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZG9QbGF5YmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh2bS5wbGF5YmFja1N0YXRlID09PSAncGxheScgfHwgdm0ucGxheWJhY2tTdGF0ZSA9PT0gJ3BhdXNlJyB8fCB2bS5wbGF5YmFja1N0YXRlID09PSAnc3RlcCcpIHtcbiAgICAgICAgICAgICAgICBvdmVybGF5cyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgLy8gaXRlcmF0ZSBmcmFtZVxuICAgICAgICAgICAgICAgIGlmICh2bS5wbGF5YmFja0RpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmcmFtZUN1cnJlbnQgPT09IGZyYW1lSW5kZXhlcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUN1cnJlbnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVDdXJyZW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZtLnBsYXliYWNrRGlyZWN0aW9uID09PSAnYmFja3dhcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmcmFtZUN1cnJlbnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lQ3VycmVudCA9IGZyYW1lSW5kZXhlcy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVDdXJyZW50LS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiBhIHZpZGVvIGlzIGJlaW5nIHJlY29yZGVkXG4gICAgICAgICAgICAgICAgZXhwb3J0Q2hlY2tMb29wKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBhZGQgb3ZlcmxheSBpbWFnZXMgZm9yIHRoaXMgZnJhbWUgdG8gdGhlIG1hcFxuICAgICAgICAgICAgICAgIGlmIChmcmFtZUluZGV4ZXNbZnJhbWVDdXJyZW50XSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXR0aW5nIHRoZSBmcmFtZSB3aWxsIHJlcmVuZGVyIHRoZSBjYW52YXNcbiAgICAgICAgICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5LnNldElkeChmcmFtZUN1cnJlbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5wbGF5YmFja1N0YXRlID09PSAncGF1c2UnIHx8IHZtLnBsYXliYWNrU3RhdGUgPT09ICdzdGVwJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZyYW1lT3ZlcmxheXMob3ZlcmxheXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZyYW1lQ3VycmVudChmcmFtZUN1cnJlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZyYW1lSW5kZXhlcyhmcmFtZUluZGV4ZXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gc2F2ZSB0aGUgZnJhbWUgdG8gYSB2aWRlbyAob25seSBoYXBwZW5zIGluIHJlY29yZCBtb2RlKVxuICAgICAgICAgICAgICAgICAgICB2aWRlb1NlcnZpY2UuY2FwdHVyZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHRlbGwgdGltZSBzbGlkZXIgdGhlIHN0YXJ0L3N0b3Agb2YgdGhlIG5leHQgZnJhbWU7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGcmFtZUV4dGVudHMoZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uc3RhcnQsIGZyYW1lSW5kZXhlc1tmcmFtZUN1cnJlbnRdLnN0b3ApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrU3RhdGUgPSAnc3RvcCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVQbGF5YmFja0FycmF5KGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuXG4gICAgICAgIHZhciBnZXRUaW1lU2xpZGVyRXh0ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHBsYWNlIHRoaXMgd2F0Y2ggaW5zaWRlIGEgZnVuY3Rpb24gdGhhdCBvbmx5IGdldHMgY2FsbGVkIGFmdGVyIHRpbWVTbGlkZXJEYXRhIGhhcyBiZWVuIHNldFxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRUaW1lU2xpZGVyRXh0ZW50cygpJywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdGFydCA9IG1vbWVudC51dGMobmV3VmFsdWUuc3RhcnQpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdG9wID0gbW9tZW50LnV0YyhuZXdWYWx1ZS5zdG9wKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAvLyBub3cgdGhhdCB3ZSBrbm93IHRoZSBzbGlkZXIgZXh0ZW50LCBidWlsZCB0aGUgcGxheWJhY2sgYXJyYXlcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlUGxheWJhY2tBcnJheSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHNpZ21hQ29uZmlnLmRlYm91bmNlVGltZSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLm1pbmltaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnLm1hcC1hbmFseXplIC5sZWFmbGV0LXRvcCAubGVhZmxldC1jb250cm9sLWxheWVycycpLmFuaW1hdGUoeyAndG9wJzogJy09NXB4J30sIDIwMCk7XG4gICAgICAgICAgICAkKCcubWFwLWFuYWx5emUgLmxlYWZsZXQtdG9wLmxlYWZsZXQtbGVmdCcpLmFuaW1hdGUoeyAndG9wJzogJy09NTBweCd9LCAyMDApO1xuICAgICAgICAgICAgJCgnLnBsYXliYWNrLWNvbnRyb2xzLWNvbnRhaW5lcicpLnNsaWRlVG9nZ2xlKDIwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy5wbGF5YmFjay1jb250cm9scy1tYXhpbWl6ZScpLnNsaWRlVG9nZ2xlKDIwMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5tYXhpbWl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJy5wbGF5YmFjay1jb250cm9scy1tYXhpbWl6ZScpLnNsaWRlVG9nZ2xlKDIwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy5tYXAtYW5hbHl6ZSAubGVhZmxldC10b3AgLmxlYWZsZXQtY29udHJvbC1sYXllcnMnKS5hbmltYXRlKHsgJ3RvcCc6ICcrPTVweCd9LCAyMDApO1xuICAgICAgICAgICAgICAgICQoJy5tYXAtYW5hbHl6ZSAubGVhZmxldC10b3AubGVhZmxldC1sZWZ0JykuYW5pbWF0ZSh7ICd0b3AnOiAnKz01MHB4J30sIDIwMCk7XG4gICAgICAgICAgICAgICAgJCgnLnBsYXliYWNrLWNvbnRyb2xzLWNvbnRhaW5lcicpLnNsaWRlVG9nZ2xlKDIwMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5kaXNhYmxlUGxheVBhdXNlQnV0dG9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZyYW1lSW5kZXhlcy5sZW5ndGggPT09IDA7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uZGlzYWJsZVN0ZXBCdXR0b24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISEodm0ucGxheWJhY2tTdGF0ZSA9PT0gJ3N0b3AnIHx8IHZtLnBsYXliYWNrU3RhdGUgPT09ICdwbGF5Jyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2hvd1BsYXlCdXR0b24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdm0ucGxheWJhY2tTdGF0ZSAhPT0gJ3BsYXknO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNob3dQYXVzZUJ1dHRvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB2bS5wbGF5YmFja1N0YXRlID09PSAncGxheSc7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0SW50ZXJ2YWwgPSBmdW5jdGlvbiAoaW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIGlzQ3VzdG9tSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChpbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrSW50ZXJ2YWwgPSBpbnRlcnZhbDtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UGxheWJhY2tJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodm0ucGxheWJhY2tJbnRlcnZhbC52YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrSW50ZXJ2YWxRdHkgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXJzZUludCh2bS5wbGF5YmFja0ludGVydmFsUXR5KSA8IDEpIHtcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0ludGVydmFsUXR5ID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRQbGF5YmFja0ludGVydmFsUXR5KHZtLnBsYXliYWNrSW50ZXJ2YWxRdHkpO1xuICAgICAgICAgICAgdXBkYXRlUGxheWJhY2tBcnJheSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldEludGVydmFsUXR5ID0gXy5kZWJvdW5jZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5wbGF5YmFja0ludGVydmFsUXR5ID0gcGFyc2VJbnQodm0ucGxheWJhY2tJbnRlcnZhbFF0eSk7XG4gICAgICAgICAgICBpZiAodm0ucGxheWJhY2tJbnRlcnZhbFF0eSA8IDEgfHwgaXNOYU4odm0ucGxheWJhY2tJbnRlcnZhbFF0eSkpIHtcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0ludGVydmFsUXR5ID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRQbGF5YmFja0ludGVydmFsUXR5KHBhcnNlRmxvYXQodm0ucGxheWJhY2tJbnRlcnZhbFF0eSkpO1xuICAgICAgICAgICAgdXBkYXRlUGxheWJhY2tBcnJheSgpO1xuICAgICAgICB9LCA3NTApO1xuXG4gICAgICAgIHZtLnNsaWRlckN0cmwgPSBmdW5jdGlvbiAoYWN0aW9uKSB7XG4gICAgICAgICAgICBpZiAoYWN0aW9uID09PSAncGxheVBhdXNlJykge1xuICAgICAgICAgICAgICAgIGlmICh2bS5wbGF5YmFja1N0YXRlICE9PSAncGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0ucGxheWJhY2tTdGF0ZSA9ICdwbGF5JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBwYXVzZSBwbGF5YmFja1xuICAgICAgICAgICAgICAgICAgICB2bS5wbGF5YmFja1N0YXRlID0gJ3BhdXNlJztcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZyYW1lT3ZlcmxheXMob3ZlcmxheXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RnJhbWVFeHRlbnRzKG1vbWVudC51dGMoZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uc3RhcnQpLnRvSVNPU3RyaW5nKCksIG1vbWVudC51dGMoZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uc3RvcCkudG9JU09TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgZG9QbGF5YmFjaygpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09ICdzdG9wJykge1xuICAgICAgICAgICAgICAgIC8vIHN0b3AgcGxheWJhY2tcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja1N0YXRlID0gJ3N0b3AnO1xuICAgICAgICAgICAgICAgIHZtLmRldGFpbEZlYXR1cmVzID0gW107XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tTdGF0ZSA9ICdzdG9wJztcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QoJy54LmJydXNoJykuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ2FsbCcpO1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gaGlkZSBpbWFnZSBvdmVybGF5cz9cblxuICAgICAgICAgICAgICAgIG92ZXJsYXlzID0gW107XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZyYW1lT3ZlcmxheXMob3ZlcmxheXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09ICdzdGVwQmFja3dhcmQnKSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tTdGF0ZSA9ICdzdGVwJztcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0RpcmVjdGlvbiA9ICdiYWNrd2FyZCc7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZyYW1lRXh0ZW50cyhtb21lbnQudXRjKGZyYW1lSW5kZXhlc1tmcmFtZUN1cnJlbnRdLnN0YXJ0KS50b0lTT1N0cmluZygpLCBtb21lbnQudXRjKGZyYW1lSW5kZXhlc1tmcmFtZUN1cnJlbnRdLnN0b3ApLnRvSVNPU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRQbGF5YmFja1N0YXRlKCdwYXVzZScpO1xuICAgICAgICAgICAgICAgIGRvUGxheWJhY2soKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAnc3RlcEZvcndhcmQnKSB7XG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tTdGF0ZSA9ICdzdGVwJztcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0RpcmVjdGlvbiA9ICdmb3J3YXJkJztcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RnJhbWVFeHRlbnRzKG1vbWVudC51dGMoZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uc3RhcnQpLnRvSVNPU3RyaW5nKCksIG1vbWVudC51dGMoZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uc3RvcCkudG9JU09TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFBsYXliYWNrU3RhdGUoJ3BhdXNlJyk7XG4gICAgICAgICAgICAgICAgZG9QbGF5YmFjaygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBiYWNrd2FyZCBvciBmb3J3YXJkIGJ1dHRvbiB3YXMgcHJlc3NlZFxuICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrRGlyZWN0aW9uID0gYWN0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gc2V0IHZhbHVlcyBmb3IgdXNlIGluIG90aGVyIGNvbnRyb2xsZXJzXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UGxheWJhY2tTdGF0ZSh2bS5wbGF5YmFja1N0YXRlKTtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRQbGF5YmFja0RpcmVjdGlvbih2bS5wbGF5YmFja0RpcmVjdGlvbik7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uIChtYXApIHtcbiAgICAgICAgICAgICAgICAvLyBpbml0IGNhbnZhc0ltYWdlT3ZlcmxheSBhZnRlciBhIGRlbGF5IHNvIGFvaSByZWN0YW5nbGUgaXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIC8vIFRPRE8gZmlndXJlIG91dCBhIGJldHRlciB3YXkgdG8gdGltZSB0aGlzXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkuaW5pdGlhbGl6ZShtYXApO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q2FudmFzSW1hZ2VPdmVybGF5KGNhbnZhc0ltYWdlT3ZlcmxheSk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcblxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0UXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBxcyA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRCcnVzaEV4dGVudHMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vbWVudC51dGMobmV3VmFsdWUuc3RhcnQpLmlzU2FtZShtb21lbnQudXRjKG9sZFZhbHVlLnN0YXJ0KSkgJiYgbW9tZW50LnV0YyhuZXdWYWx1ZS5zdG9wKS5pc1NhbWUobW9tZW50LnV0YyhvbGRWYWx1ZS5zdG9wKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGJydXNoRXh0ZW50cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBuZXdWYWx1ZS5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3A6IG5ld1ZhbHVlLnN0b3BcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodm0ucGxheWJhY2tTdGF0ZSAhPT0gJ3N0b3AnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb1BsYXliYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLmV4cG9ydEZvcm1hdCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEgYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmVuY29kZXIgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0ucGxheWJhY2tTcGVlZC52YWx1ZScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UGxheWJhY2tTcGVlZChuZXdWYWx1ZSAqIDEwMCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5pbWFnZVF1YWxpdHlQZXJjZW50YWdlLnZhbHVlJywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlUGxheWJhY2tBcnJheSgpO1xuICAgICAgICAgICAgICAgIH0sIDc1MCkpO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0ucGxheWJhY2tXaXRoR2FwcycsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVQbGF5YmFja0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFRpbWVTbGlkZXJEYXRhKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlLmZyYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lU2xpZGVyRGF0YSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXRUaW1lU2xpZGVyRXh0ZW50cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbWFnZXMgbm90IHByZWxvYWRlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZVNsaWRlckRhdGEgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSW5kZXhlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VuZCBhbGwgdGhlIGZyYW1lcyB0byB0aGUgY2FudmFzIHJlbmRlcmVyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkuc2V0KGZyYW1lSW5kZXhlcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRWaWV3TW9kZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSA9PT0gJ2FuYWx5emUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdmVybGF5cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZyYW1lT3ZlcmxheXMob3ZlcmxheXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEZyYW1lSW5kZXhlcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lSW5kZXhlcyA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRDb250cmFzdExldmVsKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29udHJhc3RMZXZlbCA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYVBsYXliYWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL3BsYXliYWNrL3BsYXliYWNrVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAncGxheWJhY2tDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3BvaW50Q29udmVydGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkZWxlbWVudCxcbiAgICAgICAgJG1vZGFsLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc2lnbWFTZXJ2aWNlLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIF8sXG4gICAgICAgIGMzLFxuICAgICAgICBtb21lbnQsXG4gICAgICAgIEZpbGVTYXZlcixcbiAgICAgICAgQmxvYlxuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgY2hhcnRIZWlnaHQgPSAwLFxuICAgICAgICAgICAgc2NhdHRlck1vZGFsID0gJG1vZGFsKHtzY29wZTogJHNjb3BlLCB0ZW1wbGF0ZVVybDogJ3NjYXR0ZXJNb2RhbC5odG1sJywgc2hvdzogZmFsc2UsIGFuaW1hdGlvbjogJ2FtLWZhZGUtYW5kLXNjYWxlJ30pO1xuICAgICAgICBcbiAgICAgICAgdm0uc2lnbWFDb25maWcgPSBzaWdtYUNvbmZpZztcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5wb2ludENvbnZlcnRlckRhdGEgPSB7fTtcblxuICAgICAgICB2bS5leHBvcnREYXRhID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkodm0ucG9pbnRDb252ZXJ0ZXJEYXRhLmNvbGxlY3RzKSkge1xuICAgICAgICAgICAgICAgIHZhciBrZXlzID0gXy5rZXlzKHZtLnBvaW50Q29udmVydGVyRGF0YS5jb2xsZWN0c1swXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBmaXJzdCBpdGVtIGluIGRhdGEgd2lsbCBiZSBhcnJheSBvZiBrZXlzXG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBba2V5c107XG5cbiAgICAgICAgICAgICAgICAvLyBhZGQgdmFsdWVzIHRvIG91dHB1dCBkYXRhXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHZtLnBvaW50Q29udmVydGVyRGF0YS5jb2xsZWN0cywgZnVuY3Rpb24gKGNvbGxlY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goa2V5cywgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzLnB1c2goY29sbGVjdFtrZXldKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHVzaCh2YWx1ZXMpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gb3V0cHV0IHRoZXNlIHRvIHN0cmluZ3NcbiAgICAgICAgICAgICAgICB2YXIgY3N2Q29udGVudCA9ICdkYXRhOnRleHQvY3N2O2NoYXJzZXQ9dXRmLTgsJztcbiAgICAgICAgICAgICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKGluZm9BcnJheSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGFTdHJpbmcgPSBpbmZvQXJyYXkuam9pbignLCcpO1xuICAgICAgICAgICAgICAgICAgICBjc3ZDb250ZW50ICs9IGluZGV4IDwgZGF0YS5sZW5ndGggPyBkYXRhU3RyaW5nKyAnXFxuJyA6IGRhdGFTdHJpbmc7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBzYXZlIGRhdGFcbiAgICAgICAgICAgICAgICB2YXIgYmxvYkRhdGEgPSBuZXcgQmxvYihbY3N2Q29udGVudF0sIHsgdHlwZTogJ3RleHQvY3N2O2NoYXJzZXQ9dXRmLTgnIH0pO1xuICAgICAgICAgICAgICAgIEZpbGVTYXZlci5zYXZlQXMoYmxvYkRhdGEsICdzaWdtYV9wb2ludF9jb252ZXJ0ZXJfZGF0YS5jc3YnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdXBkYXRlUGxvdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkodm0ucG9pbnRDb252ZXJ0ZXJEYXRhLmNvbGxlY3RzKSkge1xuICAgICAgICAgICAgICAgIC8vIHVzZSAkcHJvbWlzZSBwcm9wZXJ0eSB0byBlbnN1cmUgdGhlIHRlbXBsYXRlIGhhcyBiZWVuIGxvYWRlZFxuICAgICAgICAgICAgICAgIHNjYXR0ZXJNb2RhbC4kcHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2hvdyBtb2RhbCBmaXJzdCBzbyBjMyBoYXMgc29tZXRoaW5nIHRvIGJpbmQgdG9cbiAgICAgICAgICAgICAgICAgICAgc2NhdHRlck1vZGFsLnNob3coKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcG9yYWxGaWx0ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsb3RKc29uID0gW10sXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludENvbnZlcnRlckRhdGEgPSBfLnNvcnRCeSh2bS5wb2ludENvbnZlcnRlckRhdGEuY29sbGVjdHMsICd0aW1lJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBwbG90QmFuZHMgPSBfLnVuaXEoXy5tYXAocG9pbnRDb252ZXJ0ZXJEYXRhLCAnYmFuZCcpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsb3ROYW1lcyA9IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgIHBsb3RCYW5kcyA9IF8ubWFwKHBsb3RCYW5kcywgZnVuY3Rpb24gKGJhbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBiYW5kLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlZmluZSBmcmllbmRseSBuYW1lcyBmb3IgY2hhcnQgbGVnZW5kXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChzaWdtYUNvbmZpZy5iYW5kcywgZnVuY3Rpb24gKGJhbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsb3ROYW1lc1tiYW5kLm5hbWVdID0gYmFuZC50aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGpzb24gYXJyYXkgZm9yIEMzIGNoYXJ0XG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChwb2ludENvbnZlcnRlckRhdGEsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YU9iaiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lOiBkYXRhLnRpbWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmFuZCA9IGRhdGEuYmFuZC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YU9ialtiYW5kXSA9IGRhdGEuaW50ZW5zaXR5O1xuICAgICAgICAgICAgICAgICAgICAgICAgcGxvdEpzb24ucHVzaChkYXRhT2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGVtcHR5IGRheXMgb250byBlbmQgb2YgY2hhcnQgaWYgbmVjZXNzYXJ5XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaWZmID0gbW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdG9wKS5kaWZmKG1vbWVudC51dGMocG9pbnRDb252ZXJ0ZXJEYXRhW3BvaW50Q29udmVydGVyRGF0YS5sZW5ndGggLSAxXS50aW1lKSwgJ2QnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsb3RTdG9wID0gbW9tZW50LnV0Yyhwb2ludENvbnZlcnRlckRhdGFbcG9pbnRDb252ZXJ0ZXJEYXRhLmxlbmd0aCAtIDFdLnRpbWUpLnRvSVNPU3RyaW5nKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPD0gZGlmZjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwbG90SnNvbi5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lOiBtb21lbnQudXRjKHBsb3RTdG9wKS5hZGQoaSwgJ2QnKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjMy5nZW5lcmF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBiaW5kdG86IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzY2F0dGVyQ2hhcnQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29uOiBwbG90SnNvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6ICd0aW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBsb3RCYW5kc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeEZvcm1hdDogJyVZLSVtLSVkVCVIOiVNOiVTWicsIC8vIDIwMTQtMDgtMDFUMTY6MTY6MDdaXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3NjYXR0ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzOiBwbG90TmFtZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBjaGFydEhlaWdodFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICd0aW1lc2VyaWVzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdUaW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGljazoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiAnJVktJW0tJWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VsbGluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogTWF0aC5mbG9vcihtb21lbnQudXRjKHBvaW50Q29udmVydGVyRGF0YVtwb2ludENvbnZlcnRlckRhdGEubGVuZ3RoIC0gMV0udGltZSkuZGlmZihtb21lbnQudXRjKHBvaW50Q29udmVydGVyRGF0YVsxXS50aW1lKSwgJ3cnKSAvIDIpIC8vIG9uZSB0aWNrIGV2ZXJ5IDIgd2Vla3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogJ0ludGVuc2l0eSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogNlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHpvb206IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc2NhbGU6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sdGlwOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBmdW5jdGlvbiAoeCkgeyByZXR1cm4gbW9tZW50LnV0Yyh4KS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3NbWl0nKTsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdmlld3BvcnRTaXplID0gc2lnbWFTZXJ2aWNlLmdldFZpZXdwb3J0U2l6ZSgpO1xuICAgICAgICAgICAgY2hhcnRIZWlnaHQgPSB2aWV3cG9ydFNpemUuaGVpZ2h0IC0gMjUwOyAvLyBzdWJ0cmFjdCAyNTAgdG8gYWNjb3VudCBmb3IgbWFyZ2luIGFuZCBtb2RhbCBoZWFkZXJcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRQb2ludENvbnZlcnRlckRhdGEoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSAmJiBfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0VxdWFsKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2bS5wb2ludENvbnZlcnRlckRhdGEgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICB1cGRhdGVQbG90KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYVBvaW50Q29udmVydGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL3BvaW50Q29udmVydGVyL3BvaW50Q29udmVydGVyVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAncG9pbnRDb252ZXJ0ZXJDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgeFByb3BlcnR5OiAnQCcsXG4gICAgICAgICAgICAgICAgeVByb3BlcnR5OiAnQCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5mYWN0b3J5KCdyYWRpYWxCYXJDaGFydCcsIGZ1bmN0aW9uIChkMykge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gcmFkaWFsQmFyQ2hhcnQoKSB7XG4gICAgICAgICAgICAvLyBDb25maWd1cmFibGUgdmFyaWFibGVzXG4gICAgICAgICAgICB2YXIgbWFyZ2luID0ge3RvcDogMjAsIHJpZ2h0OiAyMCwgYm90dG9tOiAyMCwgbGVmdDogMjB9O1xuICAgICAgICAgICAgdmFyIGJhckhlaWdodCA9IDEwMDtcbiAgICAgICAgICAgIHZhciByZXZlcnNlTGF5ZXJPcmRlciA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGJhckNvbG9ycztcbiAgICAgICAgICAgIHZhciBjYXBpdGFsaXplTGFiZWxzID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgZG9tYWluID0gWzAsIDEwMF07XG4gICAgICAgICAgICB2YXIgdGlja1ZhbHVlcztcbiAgICAgICAgICAgIHZhciBjb2xvckxhYmVscyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHRpY2tDaXJjbGVWYWx1ZXMgPSBbXTtcbiAgICAgICAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSAxMDAwO1xuXG4gICAgICAgICAgICAvLyBTY2FsZXMgJiBvdGhlciB1c2VmdWwgdGhpbmdzXG4gICAgICAgICAgICB2YXIgbnVtQmFycyA9IG51bGw7XG4gICAgICAgICAgICB2YXIgYmFyU2NhbGUgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgICAgIHZhciBsYWJlbFJhZGl1cyA9IDA7XG4gICAgICAgICAgICB2YXIgYXhpcyA9IGQzLnN2Zy5heGlzKCk7XG5cblxuICAgICAgICAgICAgZnVuY3Rpb24gaW5pdChkKSB7XG4gICAgICAgICAgICAgICAgYmFyU2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oZG9tYWluKS5yYW5nZShbMCwgYmFySGVpZ2h0XSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkWzBdLmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZFswXS5kYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goZFswXS5kYXRhW2ldWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGtleXMgPSBkMy5tYXAoZFswXS5kYXRhKS5rZXlzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG51bUJhcnMgPSBrZXlzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIC8vIFJhZGl1cyBvZiB0aGUga2V5IGxhYmVsc1xuICAgICAgICAgICAgICAgIGxhYmVsUmFkaXVzID0gYmFySGVpZ2h0ICogMS4wMjU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHN2Z1JvdGF0ZShhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyb3RhdGUoJysgKCthKSArJyknO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBzdmdUcmFuc2xhdGUoeCwgeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcrICgreCkgKycsJysgKCt5KSArJyknO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBpbml0Q2hhcnQoY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBkMy5zZWxlY3QoY29udGFpbmVyKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCdzdmcnKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoJ3dpZHRoJywgMiAqIGJhckhlaWdodCArIG1hcmdpbi5sZWZ0ICsgbWFyZ2luLnJpZ2h0ICsgJ3B4JylcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKCdoZWlnaHQnLCAyICogYmFySGVpZ2h0ICsgbWFyZ2luLnRvcCArIG1hcmdpbi5ib3R0b20gKyAncHgnKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoJ3JhZGlhbC1iYXJjaGFydCcsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBzdmdUcmFuc2xhdGUobWFyZ2luLmxlZnQgKyBiYXJIZWlnaHQsIG1hcmdpbi50b3AgKyBiYXJIZWlnaHQpKTtcblxuICAgICAgICAgICAgICAgIC8vIENvbmNlbnRyaWMgY2lyY2xlcyBhdCBzcGVjaWZpZWQgdGljayB2YWx1ZXNcbiAgICAgICAgICAgICAgICBnLmFwcGVuZCgnZycpXG4gICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCd0aWNrLWNpcmNsZXMnLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKCdjaXJjbGUnKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YSh0aWNrQ2lyY2xlVmFsdWVzKVxuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCdjaXJjbGUnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cigncicsIGZ1bmN0aW9uKGQpIHtyZXR1cm4gYmFyU2NhbGUoZCk7fSlcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKCdmaWxsJywgJ25vbmUnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gcmVuZGVyT3ZlcmxheXMoY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBkMy5zZWxlY3QoY29udGFpbmVyKS5zZWxlY3QoJ3N2ZyBnLnJhZGlhbC1iYXJjaGFydCcpO1xuXG4gICAgICAgICAgICAgICAgLy8gU3Bva2VzXG4gICAgICAgICAgICAgICAgZy5hcHBlbmQoJ2cnKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZCgnc3Bva2VzJywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbCgnbGluZScpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGtleXMpXG4gICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ2xpbmUnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cigneTInLCAtYmFySGVpZ2h0KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCwgaSkge3JldHVybiBzdmdSb3RhdGUoaSAqIDM2MCAvIG51bUJhcnMpO30pO1xuXG4gICAgICAgICAgICAgICAgLy8gQXhpc1xuICAgICAgICAgICAgICAgIHZhciBheGlzU2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oZG9tYWluKS5yYW5nZShbMCwgLWJhckhlaWdodF0pO1xuICAgICAgICAgICAgICAgIGF4aXMuc2NhbGUoYXhpc1NjYWxlKS5vcmllbnQoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgaWYodGlja1ZhbHVlcyl7XG4gICAgICAgICAgICAgICAgICAgIGF4aXMudGlja1ZhbHVlcyh0aWNrVmFsdWVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZy5hcHBlbmQoJ2cnKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZCgnYXhpcycsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgIC5jYWxsKGF4aXMpO1xuXG4gICAgICAgICAgICAgICAgLy8gT3V0ZXIgY2lyY2xlXG4gICAgICAgICAgICAgICAgZy5hcHBlbmQoJ2NpcmNsZScpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdyJywgYmFySGVpZ2h0KVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZCgnb3V0ZXInLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnbm9uZScpO1xuXG4gICAgICAgICAgICAgICAgLy8gTGFiZWxzXG4gICAgICAgICAgICAgICAgdmFyIGxhYmVscyA9IGcuYXBwZW5kKCdnJylcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoJ2xhYmVscycsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgbGFiZWxzLmFwcGVuZCgnZGVmJylcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgncGF0aCcpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdpZCcsICdsYWJlbC1wYXRoJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2QnLCAnbTAgJyArIC1sYWJlbFJhZGl1cyArICcgYScgKyBsYWJlbFJhZGl1cyArICcgJyArIGxhYmVsUmFkaXVzICsgJyAwIDEsMSAtMC4wMSAwJyk7XG5cbiAgICAgICAgICAgICAgICBsYWJlbHMuc2VsZWN0QWxsKCd0ZXh0JylcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEoa2V5cylcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCAnbWlkZGxlJylcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKCdmaWxsJywgZnVuY3Rpb24oZCwgaSkge3JldHVybiBjb2xvckxhYmVscyA/IGJhckNvbG9yc1tpICUgYmFyQ29sb3JzLmxlbmd0aF0gOiBudWxsO30pXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ3RleHRQYXRoJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3hsaW5rOmhyZWYnLCAnI2xhYmVsLXBhdGgnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignc3RhcnRPZmZzZXQnLCBmdW5jdGlvbihkLCBpKSB7cmV0dXJuIGkgKiAxMDAgLyBudW1CYXJzICsgNTAgLyBudW1CYXJzICsgJyUnO30pXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHtyZXR1cm4gY2FwaXRhbGl6ZUxhYmVscyA/IGQudG9VcHBlckNhc2UoKSA6IGQ7fSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qIEFyYyBmdW5jdGlvbnMgKi9cbiAgICAgICAgICAgIHZhciBvciA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmFyU2NhbGUoZCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIHNhID0gZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoaSAqIDIgKiBNYXRoLlBJKSAvIG51bUJhcnM7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGVhID0gZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoKGkgKyAxKSAqIDIgKiBNYXRoLlBJKSAvIG51bUJhcnM7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBjaGFydChzZWxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb24uZWFjaChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIGluaXQoZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYocmV2ZXJzZUxheWVyT3JkZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZC5yZXZlcnNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YXIgZyA9IGQzLnNlbGVjdCh0aGlzKS5zZWxlY3QoJ3N2ZyBnLnJhZGlhbC1iYXJjaGFydCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIHdoZXRoZXIgY2hhcnQgaGFzIGFscmVhZHkgYmVlbiBjcmVhdGVkXG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGUgPSBnWzBdWzBdICE9PSBudWxsOyAvLyB0cnVlIGlmIGRhdGEgaXMgYmVpbmcgdXBkYXRlZFxuXG4gICAgICAgICAgICAgICAgICAgIGlmKCF1cGRhdGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5pdENoYXJ0KHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZyA9IGQzLnNlbGVjdCh0aGlzKS5zZWxlY3QoJ3N2ZyBnLnJhZGlhbC1iYXJjaGFydCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIExheWVyIGVudGVyL2V4aXQvdXBkYXRlXG4gICAgICAgICAgICAgICAgICAgIHZhciBsYXllcnMgPSBnLnNlbGVjdEFsbCgnZy5sYXllcicpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZGF0YShkKTtcblxuICAgICAgICAgICAgICAgICAgICBsYXllcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2xheWVyLScgKyBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdsYXllcicsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxheWVycy5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2VnbWVudCBlbnRlci9leGl0L3VwZGF0ZVxuICAgICAgICAgICAgICAgICAgICB2YXIgc2VnbWVudHMgPSBsYXllcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoJ3BhdGgnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmRhdGEoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtID0gZDMubWFwKGQuZGF0YSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1WYWx1ZXMgPSBtLnZhbHVlcygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtQXJyID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobVZhbHVlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtVmFsdWVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtQXJyLnB1c2gobVZhbHVlc1tpXVsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtQXJyID0gbVZhbHVlcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1BcnI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBzZWdtZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ3BhdGgnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0eWxlKCdmaWxsJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFiYXJDb2xvcnMpeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFyQ29sb3JzW2kgJSBiYXJDb2xvcnMubGVuZ3RoXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHNlZ21lbnRzLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgICAgICAgICBzZWdtZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKHRyYW5zaXRpb25EdXJhdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdkJywgZDMuc3ZnLmFyYygpLmlubmVyUmFkaXVzKDApLm91dGVyUmFkaXVzKG9yKS5zdGFydEFuZ2xlKHNhKS5lbmRBbmdsZShlYSkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKCF1cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlck92ZXJsYXlzKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF4aXNTY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihkb21haW4pLnJhbmdlKFswLCAtYmFySGVpZ2h0XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBheGlzLnNjYWxlKGF4aXNTY2FsZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAub3JpZW50KCdyaWdodCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRpY2tWYWx1ZXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF4aXMudGlja1ZhbHVlcyh0aWNrVmFsdWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0KCcucmFkaWFsIC5heGlzJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKDIwMDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhbGwoYXhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBDb25maWd1cmF0aW9uIGdldHRlcnMvc2V0dGVycyAqL1xuICAgICAgICAgICAgY2hhcnQubWFyZ2luID0gZnVuY3Rpb24oXykge1xuICAgICAgICAgICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCl7IHJldHVybiBtYXJnaW47IH1cbiAgICAgICAgICAgICAgICBtYXJnaW4gPSBfO1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGFydDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNoYXJ0LmJhckhlaWdodCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpeyByZXR1cm4gYmFySGVpZ2h0OyB9XG4gICAgICAgICAgICAgICAgYmFySGVpZ2h0ID0gXztcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hhcnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjaGFydC5yZXZlcnNlTGF5ZXJPcmRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpeyByZXR1cm4gcmV2ZXJzZUxheWVyT3JkZXI7IH1cbiAgICAgICAgICAgICAgICByZXZlcnNlTGF5ZXJPcmRlciA9IF87XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY2hhcnQuYmFyQ29sb3JzID0gZnVuY3Rpb24oXykge1xuICAgICAgICAgICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCl7IHJldHVybiBiYXJDb2xvcnM7IH1cbiAgICAgICAgICAgICAgICBiYXJDb2xvcnMgPSBfO1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGFydDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNoYXJ0LmNhcGl0YWxpemVMYWJlbHMgPSBmdW5jdGlvbihfKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKXsgcmV0dXJuIGNhcGl0YWxpemVMYWJlbHM7IH1cbiAgICAgICAgICAgICAgICBjYXBpdGFsaXplTGFiZWxzID0gXztcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hhcnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjaGFydC5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKXsgcmV0dXJuIGRvbWFpbjsgfVxuICAgICAgICAgICAgICAgIGRvbWFpbiA9IF87XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY2hhcnQudGlja1ZhbHVlcyA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpeyByZXR1cm4gdGlja1ZhbHVlczsgfVxuICAgICAgICAgICAgICAgIHRpY2tWYWx1ZXMgPSBfO1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGFydDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNoYXJ0LmNvbG9yTGFiZWxzID0gZnVuY3Rpb24oXykge1xuICAgICAgICAgICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCl7IHJldHVybiBjb2xvckxhYmVsczsgfVxuICAgICAgICAgICAgICAgIGNvbG9yTGFiZWxzID0gXztcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hhcnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjaGFydC50aWNrQ2lyY2xlVmFsdWVzID0gZnVuY3Rpb24oXykge1xuICAgICAgICAgICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCl7IHJldHVybiB0aWNrQ2lyY2xlVmFsdWVzOyB9XG4gICAgICAgICAgICAgICAgdGlja0NpcmNsZVZhbHVlcyA9IF87XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY2hhcnQudHJhbnNpdGlvbkR1cmF0aW9uID0gZnVuY3Rpb24oXykge1xuICAgICAgICAgICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCl7IHJldHVybiB0cmFuc2l0aW9uRHVyYXRpb247IH1cbiAgICAgICAgICAgICAgICB0cmFuc2l0aW9uRHVyYXRpb24gPSBfO1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGFydDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBjaGFydDtcbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3JhZGlhbENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgc2lnbWFTZXJ2aWNlLFxuICAgICAgICBzZWFyY2hTZXJ2aWNlLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICByYWRpYWxCYXJDaGFydCxcbiAgICAgICAgZDMsXG4gICAgICAgIF8sXG4gICAgICAgIG1vbWVudFxuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgY29sbGVjdERhdGEgPSBbXSxcbiAgICAgICAgICAgIGNoYXJ0ID0ge307XG5cbiAgICAgICAgdm0uYmxvY2tlciA9IGJsb2NrVUkuaW5zdGFuY2VzLmdldCgnYmxvY2tlcicpO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLnJhZGlhbFJlYWR5ID0gZmFsc2U7XG4gICAgICAgIHZtLnpvb21DbGFzcyA9ICcnO1xuICAgICAgICB2bS5lbmFibGVDb3ZlcmFnZSA9IHN0YXRlU2VydmljZS5nZXRFbmFibGVDb3ZlcmFnZSgpO1xuXG4gICAgICAgIHZtLnRvZ2dsZVpvb21DbGFzcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2bS56b29tQ2xhc3MgPSB2bS56b29tQ2xhc3MgPT09ICdzY2FsZScgPyAnJyA6ICdzY2FsZSc7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGRyYXdDaGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGZvcm1hdCBkYXRhIHRvIHdvcmsgd2l0aCByYWRpYWxCYXJDaGFydFxuICAgICAgICAgICAgdmFyIGNoYXJ0RGF0YVZhbHVlcyA9IFtdLFxuICAgICAgICAgICAgICAgIGNoYXJ0RGF0YSA9IFt7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IFtdXG4gICAgICAgICAgICAgICAgfV07XG5cbiAgICAgICAgICAgIHZhciBmaW5kQ29sbGVjdCA9IGZ1bmN0aW9uIChob3VyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8uZmluZChjb2xsZWN0RGF0YSwgZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1vbWVudC51dGMoYy5ob3VyKS5ob3VyKCkgPT09IGhvdXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmb3IgKHZhciBob3VyID0gMDsgaG91ciA8IDI0OyBob3VyKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sbGVjdCA9IGZpbmRDb2xsZWN0KGhvdXIpO1xuICAgICAgICAgICAgICAgIGNoYXJ0RGF0YVZhbHVlcy5wdXNoKGNvbGxlY3QgPyBjb2xsZWN0LmNvdW50IDogMCk7XG4gICAgICAgICAgICAgICAgY2hhcnREYXRhWzBdLmRhdGEucHVzaChbbW9tZW50LnV0Yyhob3VyLCAnaCcpLmZvcm1hdCgnSEg6bW0nKSwgY29sbGVjdCA/IGNvbGxlY3QuY291bnQgOiAwXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGFycmF5IG9mIHZhbHVlcyBmb3IgZGV0ZXJtaW5pbmcgZG9tYWluIGFuZCBhdmVyYWdlIG51bWJlciBvZiBjb2xsZWN0c1xuICAgICAgICAgICAgLy92YXIgY2hhcnRUaWNrcyA9IE1hdGguZmxvb3IoZDMubWVhbihjaGFydERhdGFWYWx1ZXMpIC8gMyk7XG4gICAgICAgICAgICB2YXIgY2hhcnRUaWNrcyA9IE1hdGguZmxvb3IoZDMubWF4KGNoYXJ0RGF0YVZhbHVlcykgLyAzKTtcblxuICAgICAgICAgICAgLy8gaW5zdGFudGlhdGUgcmFkaWFsQmFyQ2hhcnRcbiAgICAgICAgICAgIGNoYXJ0ID0gcmFkaWFsQmFyQ2hhcnQoKTtcbiAgICAgICAgICAgIGNoYXJ0LmJhckhlaWdodCgxNzUpXG4gICAgICAgICAgICAgICAgLnJldmVyc2VMYXllck9yZGVyKHRydWUpXG4gICAgICAgICAgICAgICAgLmNhcGl0YWxpemVMYWJlbHModHJ1ZSlcbiAgICAgICAgICAgICAgICAuYmFyQ29sb3JzKFsnI0M2QTgwMCcsICcjRkZEODAwJywgJyNGRkU4NjQnXSkgLy8gdGhlc2UgcmVwZWF0IGlmIGFycmF5IGxlbmd0aCBpcyBzaG9ydGVyIHRoYW4gdGhlIG51bWJlciBvZiBiYXJzXG4gICAgICAgICAgICAgICAgLmRvbWFpbihbMCxkMy5tYXgoY2hhcnREYXRhVmFsdWVzKV0pXG4gICAgICAgICAgICAgICAgLnRpY2tWYWx1ZXMoW2NoYXJ0VGlja3MsIGNoYXJ0VGlja3MgKiAyLCBjaGFydFRpY2tzICogM10pXG4gICAgICAgICAgICAgICAgLnRpY2tDaXJjbGVWYWx1ZXMoY2hhcnREYXRhVmFsdWVzKTtcbiAgICAgICAgICAgIGQzLnNlbGVjdCgnLnJhZGlhbCcpXG4gICAgICAgICAgICAgICAgLmRhdHVtKGNoYXJ0RGF0YSlcbiAgICAgICAgICAgICAgICAuY2FsbChjaGFydCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldENvbGxlY3RDb3VudHNCeUhvdXIgPSBfLmRlYm91bmNlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0Q29sbGVjdENvdW50c0J5SG91cigpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGNvbGxlY3REYXRhID0gcmVzdWx0LmRhdGEucmVzdWx0cztcbiAgICAgICAgICAgICAgICBkcmF3Q2hhcnQoKTtcbiAgICAgICAgICAgICAgICB2bS5yYWRpYWxSZWFkeSA9IHRydWU7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICAgICAgc2lnbWFTZXJ2aWNlLnNob3dFcnJvcihlcnJvciwgJ2RhbmdlcicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIHNpZ21hQ29uZmlnLmRlYm91bmNlVGltZSk7XG5cbiAgICAgICAgdm0uaW5pdFJhZGlhbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TWFwQm91bmRzKCknLCBfLmRlYm91bmNlKGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZtLmVuYWJsZUNvdmVyYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRDb2xsZWN0Q291bnRzQnlIb3VyKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDc1MCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRFbmFibGVDb3ZlcmFnZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgbmV3VmFsdWUgPSB0eXBlb2YgbmV3VmFsdWUgPT09ICdzdHJpbmcnID8gbmV3VmFsdWUgPT09ICd0cnVlJyA6IG5ld1ZhbHVlO1xuICAgICAgICAgICAgb2xkVmFsdWUgPSB0eXBlb2Ygb2xkVmFsdWUgPT09ICdzdHJpbmcnID8gb2xkVmFsdWUgPT09ICd0cnVlJyA6IG9sZFZhbHVlO1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5lbmFibGVDb3ZlcmFnZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgdm0uaW5pdFJhZGlhbCgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFSYWRpYWwnLCBmdW5jdGlvbiAoJCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL3JhZGlhbC9yYWRpYWxUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdyYWRpYWxDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUudm0uZW5hYmxlQ292ZXJhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnZtLmluaXRSYWRpYWwoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgJHJhZGlhbENvbnRhaW5lciA9ICQoJy5jaGFydC1yYWRpYWwnKTtcbiAgICAgICAgICAgICAgICAgICAgJHJhZGlhbENvbnRhaW5lci5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkcmFkaWFsQ29udGFpbmVyLnRvZ2dsZUNsYXNzKCdzY2FsZScpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3JlY2VudEFvaUxpc3RDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgbG9jYWxTdG9yYWdlLFxuICAgICAgICBfLFxuICAgICAgICBtb21lbnRcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcblxuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5yZWNlbnRBT0lzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmVjZW50QU9JcycpKSB8fCBbXTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmNsZWFyUmVjZW50QU9JcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3JlY2VudEFPSXMnKTtcbiAgICAgICAgICAgIHZtLnJlY2VudEFPSXMgPSBbXTtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmFjdGl2YXRlQU9JID0gZnVuY3Rpb24gKGFvaSkge1xuICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChhb2kuc2VhcmNoKTtcbiAgICAgICAgICAgIHZhciBhb2lCYXNlbGF5ZXIgPSBfLmZpbmQoc2lnbWFDb25maWcubGF5ZXJzLmJhc2VsYXllcnMsIHsgaWQ6IGFvaS5zZWFyY2guYmFzZWxheWVyIH0pO1xuXG4gICAgICAgICAgICAvLyB1cGRhdGUgcGFyYW1ldGVyc1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJib3goYW9pLmJib3gpO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsRmlsdGVyKGFvaS50ZW1wb3JhbEZpbHRlcik7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmFzZWxheWVyKGFvaUJhc2VsYXllcik7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q292ZXJhZ2VPcGFjaXR5KHBhcnNlRmxvYXQoYW9pLnNlYXJjaC5jb3ZlcmFnZU9wYWNpdHkpKTtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFbmFibGVDb3ZlcmFnZShhb2kuc2VhcmNoLmVuYWJsZUNvdmVyYWdlID09PSAndHJ1ZScpO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJhbmQoYW9pLnNlYXJjaC5iYW5kKTtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRTZW5zb3IoYW9pLnNlYXJjaC5zZW5zb3IpO1xuXG5cbiAgICAgICAgICAgIC8vIGRldGVybWluZSB3aGljaCBhb2kgaXMgYWN0aXZlXG4gICAgICAgICAgICBfLmZvckVhY2godm0ucmVjZW50QU9JcywgZnVuY3Rpb24gKHJlY2VudEFPSSkge1xuICAgICAgICAgICAgICAgIHJlY2VudEFPSS5hY3RpdmUgPSBhb2kudXJsID09PSByZWNlbnRBT0kudXJsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFZpZXdNb2RlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSA9PT0gJ2FuYWx5emUnKSB7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHZtLnJlY2VudEFPSXMsIGZ1bmN0aW9uIChhb2kpIHtcbiAgICAgICAgICAgICAgICAgICAgYW9pLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdmFyIGJib3ggPSBzdGF0ZVNlcnZpY2UuZ2V0QmJveCgpLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wb3JhbEZpbHRlciA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpLFxuICAgICAgICAgICAgICAgICAgICBjaGVja0ZvckFPSSA9IF8uZmluZCh2bS5yZWNlbnRBT0lzLCB7IHNlYXJjaDogJGxvY2F0aW9uLnNlYXJjaCgpIH0pO1xuXG4gICAgICAgICAgICAgICAgdmFyIGFvaVRlbXBvcmFsRmlsdGVyID0ge1xuICAgICAgICAgICAgICAgICAgICBzdGFydDogbW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdGFydCkudG9EYXRlKCksXG4gICAgICAgICAgICAgICAgICAgIHN0b3A6IG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RvcCkudG9EYXRlKCksXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiB0ZW1wb3JhbEZpbHRlci5kdXJhdGlvbiA/IHRlbXBvcmFsRmlsdGVyLmR1cmF0aW9uIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25MZW5ndGg6IHRlbXBvcmFsRmlsdGVyLmR1cmF0aW9uTGVuZ3RoID8gdGVtcG9yYWxGaWx0ZXIuZHVyYXRpb25MZW5ndGggOiBudWxsXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmICghY2hlY2tGb3JBT0kpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSBhZGQgdW5pcXVlIEFPSXNcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlYXJjaCA9ICRsb2NhdGlvbi5zZWFyY2goKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHFzID0gXy50b1BhaXJzKHNlYXJjaCksXG4gICAgICAgICAgICAgICAgICAgICAgICBxc0FyciA9IFtdO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChxcywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxc0Fyci5wdXNoKHZhbHVlLmpvaW4oJz0nKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHZtLnJlY2VudEFPSXMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYm94OiBiYm94LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXI6IGFvaVRlbXBvcmFsRmlsdGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBxc0Fyci5qb2luKCcmJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodm0ucmVjZW50QU9Jcy5sZW5ndGggPiBzaWdtYUNvbmZpZy5tYXhpbXVtUmVjZW50QU9Jcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ucmVjZW50QU9Jcy5zcGxpY2UoKHZtLnJlY2VudEFPSXMubGVuZ3RoIC0gMSksIDEpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JlY2VudEFPSXMnLCBKU09OLnN0cmluZ2lmeSh2bS5yZWNlbnRBT0lzKSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zYXZlU3RhdGUoJ3N2ZW5kc2VuZW0nKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBfLmZvckVhY2godm0ucmVjZW50QU9JcywgZnVuY3Rpb24gKGFvaSkge1xuICAgICAgICAgICAgICAgIGFvaS5hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgc2VhcmNoID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuICAgICAgICAgICAgc2VhcmNoLmNvdmVyYWdlT3BhY2l0eSA9IHBhcnNlRmxvYXQoc2VhcmNoLmNvdmVyYWdlT3BhY2l0eSk7IC8vIHBhcnNlIGZsb2F0IHRvIGVuYWJsZSBvYmplY3QgZXF1YWxpdHlcblxuICAgICAgICAgICAgdmFyIGN1cnJlbnRBT0kgPSBfLmZpbHRlcih2bS5yZWNlbnRBT0lzLCBmdW5jdGlvbiAoYW9pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFuZ3VsYXIuZXF1YWxzKGFvaS5zZWFyY2gsIHNlYXJjaCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRBT0kgJiYgY3VycmVudEFPSS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudEFPSVswXS5hY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcblxuICAgICAgICB2YXIgZG9XYXRjaCA9IGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUsIGlzQ29sbGVjdGlvbikge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNDb2xsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBpbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRCYm94KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBkb1dhdGNoKG5ld1ZhbHVlLCBvbGRWYWx1ZSwgdHJ1ZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGRvV2F0Y2gobmV3VmFsdWUsIG9sZFZhbHVlLCB0cnVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRCYXNlbGF5ZXIoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGRvV2F0Y2gobmV3VmFsdWUsIG9sZFZhbHVlLCB0cnVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldENvdmVyYWdlT3BhY2l0eSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgZG9XYXRjaChuZXdWYWx1ZSwgb2xkVmFsdWUsIGZhbHNlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldEVuYWJsZUNvdmVyYWdlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBkb1dhdGNoKG5ld1ZhbHVlLCBvbGRWYWx1ZSwgZmFsc2UpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QmFuZCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgZG9XYXRjaChuZXdWYWx1ZSwgb2xkVmFsdWUsIGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRTZW5zb3IoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGRvV2F0Y2gobmV3VmFsdWUsIG9sZFZhbHVlLCBmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYVJlY2VudEFvaUxpc3QnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvcmVjZW50QW9pTGlzdC9yZWNlbnRBb2lMaXN0VGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAncmVjZW50QW9pTGlzdENvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcigncmVjZW50UG9pbnRzTGlzdENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgbG9jYWxTdG9yYWdlLFxuICAgICAgICBfLFxuICAgICAgICBNb3VzZUV2ZW50XG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5yZWNlbnRQb2ludHMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyZWNlbnRQb2ludHMnKSkgfHwgW107XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5jbGVhclJlY2VudFBvaW50cyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3JlY2VudFBvaW50cycpO1xuICAgICAgICAgICAgdm0ucmVjZW50UG9pbnRzID0gW107XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zaG93UG9pbnQgPSBmdW5jdGlvbiAocG9pbnQpIHtcbiAgICAgICAgICAgIC8vIGFkZCBzb3VyY2UgZXZlbnQgdG8gZW5zdXJlIHRoZSByZXN1bHQgaXMgdW5pcXVlIGluIG9yZGVyIHRvIGJlIHBpY2tlZCB1cCBieSB0aGUgJHdhdGNoIHN0YXRlbWVudFxuICAgICAgICAgICAgcG9pbnQuZGF0YS5zb3VyY2VFdmVudCA9IG5ldyBNb3VzZUV2ZW50KCdjbGljaycsIHtcbiAgICAgICAgICAgICAgICAndmlldyc6IHdpbmRvdyxcbiAgICAgICAgICAgICAgICAnYnViYmxlcyc6IHRydWUsXG4gICAgICAgICAgICAgICAgJ2NhbmNlbGFibGUnOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UG9pbnRDb252ZXJ0ZXJEYXRhKHBvaW50LmRhdGEpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0UG9pbnRDb252ZXJ0ZXJEYXRhKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVjZW50UG9pbnRDb252ZXJ0ZXJEYXRhID0gXy5vbWl0KG5ld1ZhbHVlLCAnc291cmNlRXZlbnQnKSxcbiAgICAgICAgICAgICAgICAgICAgYnJ1c2hFeHRlbnRzID0gc3RhdGVTZXJ2aWNlLmdldEJydXNoRXh0ZW50cygpLFxuICAgICAgICAgICAgICAgICAgICBjaGVja0ZvclBvaW50ID0gXy5maW5kKHZtLnJlY2VudFBvaW50cywgJ2RhdGEucG9pbnQnLCBuZXdWYWx1ZS5wb2ludCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWNoZWNrRm9yUG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSBhZGQgdW5pcXVlIHBvaW50c1xuICAgICAgICAgICAgICAgICAgICB2bS5yZWNlbnRQb2ludHMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiByZWNlbnRQb2ludENvbnZlcnRlckRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICBicnVzaEV4dGVudHM6IGJydXNoRXh0ZW50c1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodm0ucmVjZW50UG9pbnRzLmxlbmd0aCA+IHNpZ21hQ29uZmlnLm1heGltdW1SZWNlbnRQb2ludHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnJlY2VudFBvaW50cy5zcGxpY2UoKHZtLnJlY2VudFBvaW50cy5sZW5ndGggLSAxKSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncmVjZW50UG9pbnRzJywgSlNPTi5zdHJpbmdpZnkodm0ucmVjZW50UG9pbnRzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hUmVjZW50UG9pbnRzTGlzdCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9yZWNlbnRQb2ludHNMaXN0L3JlY2VudFBvaW50c0xpc3RUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdyZWNlbnRQb2ludHNMaXN0Q29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdzZW5zb3JDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5zaWdtYUNvbmZpZyA9IHNpZ21hQ29uZmlnO1xuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0ubW9kZSA9ICRzY29wZS4kcGFyZW50Lm1vZGU7XG4gICAgICAgIHZtLnNlbnNvcnMgPSBbXTtcbiAgICAgICAgdm0uc2VsZWN0ZWRTZW5zb3IgPSB7fTtcblxuICAgICAgICB2bS5zZXRTZW5zb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U2Vuc29yKHZtLnNlbGVjdGVkU2Vuc29yLmlkKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKGJhbmQpIHtcbiAgICAgICAgICAgIHZtLnNlbnNvcnMgPSBfLmZpbHRlcihzaWdtYUNvbmZpZy5zZW5zb3JzLCBmdW5jdGlvbiAoc2Vuc29yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8uaW5kZXhPZihzZW5zb3IuYmFuZHMsIGJhbmQpID49IDA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZtLnNlbGVjdGVkU2Vuc29yID0gcXMuc2Vuc29yID8gXy5maW5kKHZtLnNlbnNvcnMsIHsgaWQ6IHBhcnNlSW50KHFzLnNlbnNvcikgfSkgOiBfLmZpbmQodm0uc2Vuc29ycywgeyBkZWZhdWx0OiB0cnVlIH0pO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFNlbnNvcih2bS5zZWxlY3RlZFNlbnNvci5pZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRRcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxcyA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJhbmQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgaW5pdGlhbGl6ZShuZXdWYWx1ZSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYVNlbnNvcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9zZW5zb3Ivc2Vuc29yVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnc2Vuc29yQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3NpZGViYXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHNpZ21hU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBsb2NhbFN0b3JhZ2UsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHZtLm1vZGUgPSAkc2NvcGUubW9kZTtcbiAgICAgICAgdm0ubG9nbyA9IHNpZ21hQ29uZmlnLmxvZ287XG4gICAgICAgIHZtLnNpZGViYXJTdHlsZSA9ICcnO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmRpc2FibGVBbmFseXplQnRuID0gdHJ1ZTtcblxuICAgICAgICB2YXIgYWRqdXN0U2l6ZSA9IGZ1bmN0aW9uIChoZWlnaHQpIHtcbiAgICAgICAgICAgIHZtLnNpZGViYXJTdHlsZSA9ICdoZWlnaHQ6ICcgKyBoZWlnaHQgKyAncHg7IG92ZXJmbG93LXk6IGF1dG8nO1xuICAgICAgICB9O1xuXG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gc2V0IHNpZGViYXIgaGVpZ2h0IGVxdWFsIHRvIGF2YWlsYWJsZSBwYWdlIGhlaWdodFxuICAgICAgICAgICAgdmFyIHZpZXdwb3J0ID0gc2lnbWFTZXJ2aWNlLmdldFZpZXdwb3J0U2l6ZSgpO1xuICAgICAgICAgICAgYWRqdXN0U2l6ZSh2aWV3cG9ydC5oZWlnaHQpO1xuICAgICAgICB9KTtcblxuICAgICAgICB2bS5hbmFseXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gbmF2aWdhdGUgdG8gYW5hbHl6ZSBzY3JlZW5cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRWaWV3TW9kZSgnYW5hbHl6ZScpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnZpZXdNYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vmlld01vZGUoJ3NlYXJjaCcpO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldENvcnJlbGF0aW9uRGF0YShudWxsKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFZpZXdwb3J0U2l6ZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZGp1c3RTaXplKG5ld1ZhbHVlLmhlaWdodCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0QmJveCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUuZm9ybWF0ICE9PSAnbWdycycpIHtcbiAgICAgICAgICAgICAgICB2bS5kaXNhYmxlQW5hbHl6ZUJ0biA9ICEobmV3VmFsdWUubm9ydGggIT09ICcnICYmIG5ld1ZhbHVlLnNvdXRoICE9PSAnJyAmJiBuZXdWYWx1ZS5lYXN0ICE9PSAnJyAmJiBuZXdWYWx1ZS53ZXN0ICE9PSAnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZtLmRpc2FibGVBbmFseXplQnRuID0gIShuZXdWYWx1ZS5tZ3JzTkUgIT09ICcnICYmIG5ld1ZhbHVlLm1ncnNTVyAhPT0gJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vmlld01vZGUoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gc2V0IHZtIGZvciB0aGlzIGNvbnRyb2xsZXIgYW5kICRzY29wZSBmb3IgY2hpbGQgY29udHJvbGxlcnNcbiAgICAgICAgICAgIHZtLm1vZGUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICRzY29wZS5tb2RlID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYVNpZGViYXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvc2lkZWJhci9zaWRlYmFyVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnc2lkZWJhckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBtb2RlOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3N0YXRlQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkd2luZG93LFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgICRhbGVydCxcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzO1xuXG4gICAgICAgIHZtLnNpZ21hQ29uZmlnID0gc2lnbWFDb25maWc7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5zZWxlY3RlZFN0YXRlID0gbnVsbDtcbiAgICAgICAgdm0uc3RhdGVzID0gW107XG4gICAgICAgIHZtLmRpc2FibGVTYXZlU3RhdGUgPSBmYWxzZTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmNyZWF0ZVN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLmNyZWF0ZVN0YXRlKCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdm0uc3RhdGVzLnB1c2gocmVzdWx0LmRhdGEpO1xuICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkU3RhdGUgPSByZXN1bHQuZGF0YTtcbiAgICAgICAgICAgICAgICB2bS5wb3BvdmVyID0ge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1NoYXJlJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgJy8jLz9pZD0nICsgdm0uc2VsZWN0ZWRTdGF0ZS5pZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgJGFsZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdTdGF0ZSBTYXZlZCcsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50OiAndG9wLXJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keScsXG4gICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbjogJ2FtLWZhZGUtYW5kLXNsaWRlLXRvcCcsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1LFxuICAgICAgICAgICAgICAgICAgICBzaG93OiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAkYWxlcnQoe1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogZXJyLnN0YXR1cyA+IC0xID8gJ0Vycm9yOiAnICsgZXJyLnN0YXR1cyA6ICdDb25uZWN0aW9uIEVycm9yJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogZXJyLnN0YXR1c1RleHQubGVuZ3RoID4gMCA/IGVyci5zdGF0dXNUZXh0IDogJ1VuYWJsZSB0byByZXRyaWV2ZSBhcHBsaWNhdGlvbiBzdGF0ZXMuJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ3RvcC1yaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogJ2JvZHknLFxuICAgICAgICAgICAgICAgICAgICBhbmltYXRpb246ICdhbS1mYWRlLWFuZC1zbGlkZS10b3AnLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNSxcbiAgICAgICAgICAgICAgICAgICAgc2hvdzogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uZ2V0U3RhdGUgPSBmdW5jdGlvbiAodmFsdWUsIGZvcmNlUmVmcmVzaCkge1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhbmd1bGFyLmVxdWFscyh2YWx1ZSwgdm0uc2VsZWN0ZWRTdGF0ZSkgfHwgZm9yY2VSZWZyZXNoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkU3RhdGUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnVybCgnLz9pZD0nICsgdm0uc2VsZWN0ZWRTdGF0ZS5pZCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gZmluZCBhIHdheSB0byBkbyB0aGlzIHdpdGhvdXQgcmVsb2FkaW5nIHRoZSB3aG9sZSBhcHBcbiAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0ucmVzZXRTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmdldFN0YXRlKHZtLnNlbGVjdGVkU3RhdGUsIHRydWUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNhdmVTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zYXZlU3RhdGUodm0uc2VsZWN0ZWRTdGF0ZS5pZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJGFsZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdDaGFuZ2VzIFNhdmVkJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICd0b3AtcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXI6ICdib2R5JyxcbiAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uOiAnYW0tZmFkZS1hbmQtc2xpZGUtdG9wJyxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUsXG4gICAgICAgICAgICAgICAgICAgIHNob3c6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBlcnIuc3RhdHVzID4gLTEgPyAnRXJyb3I6ICcgKyBlcnIuc3RhdHVzIDogJ0Nvbm5lY3Rpb24gRXJyb3InLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBlcnIuc3RhdHVzVGV4dC5sZW5ndGggPiAwID8gZXJyLnN0YXR1c1RleHQgOiAnVW5hYmxlIHRvIHVwZGF0ZSBhcHBsaWNhdGlvbiBzdGF0ZS4nLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50OiAndG9wLXJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keScsXG4gICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbjogJ2FtLWZhZGUtYW5kLXNsaWRlLXRvcCcsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1LFxuICAgICAgICAgICAgICAgICAgICBzaG93OiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS51cGRhdGVTdGF0ZVRpdGxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnVwZGF0ZVN0YXRlVGl0bGUodm0uc2VsZWN0ZWRTdGF0ZS5pZCwgdm0uc2VsZWN0ZWRTdGF0ZS50aXRsZSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJGFsZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdUaXRsZSBVcGRhdGVkJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICd0b3AtcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXI6ICdib2R5JyxcbiAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uOiAnYW0tZmFkZS1hbmQtc2xpZGUtdG9wJyxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUsXG4gICAgICAgICAgICAgICAgICAgIHNob3c6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBlcnIuc3RhdHVzID4gLTEgPyAnRXJyb3I6ICcgKyBlcnIuc3RhdHVzIDogJ0Nvbm5lY3Rpb24gRXJyb3InLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBlcnIuc3RhdHVzVGV4dC5sZW5ndGggPiAwID8gZXJyLnN0YXR1c1RleHQgOiAnVW5hYmxlIHRvIHVwZGF0ZSBhcHBsaWNhdGlvbiBzdGF0ZS4nLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50OiAndG9wLXJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keScsXG4gICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbjogJ2FtLWZhZGUtYW5kLXNsaWRlLXRvcCcsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1LFxuICAgICAgICAgICAgICAgICAgICBzaG93OiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5kZWxldGVTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5kZWxldGVTdGF0ZSh2bS5zZWxlY3RlZFN0YXRlLmlkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBfLnJlbW92ZSh2bS5zdGF0ZXMsIHZtLnNlbGVjdGVkU3RhdGUpO1xuICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkU3RhdGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnRmF2b3JpdGUgRGVsZXRlZCcsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50OiAndG9wLXJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keScsXG4gICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbjogJ2FtLWZhZGUtYW5kLXNsaWRlLXRvcCcsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1LFxuICAgICAgICAgICAgICAgICAgICBzaG93OiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAkYWxlcnQoe1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogZXJyLnN0YXR1cyA+IC0xID8gJ0Vycm9yOiAnICsgZXJyLnN0YXR1cyA6ICdDb25uZWN0aW9uIEVycm9yJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogZXJyLnN0YXR1c1RleHQubGVuZ3RoID4gMCA/IGVyci5zdGF0dXNUZXh0IDogJ1VuYWJsZSB0byB1cGRhdGUgYXBwbGljYXRpb24gc3RhdGUuJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ3RvcC1yaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogJ2JvZHknLFxuICAgICAgICAgICAgICAgICAgICBhbmltYXRpb246ICdhbS1mYWRlLWFuZC1zbGlkZS10b3AnLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNSxcbiAgICAgICAgICAgICAgICAgICAgc2hvdzogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2UuZ2V0U3RhdGVzKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHZtLnN0YXRlcyA9IF8uc29ydEJ5KGRhdGEsICd0aXRsZScpO1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZVNlcnZpY2UuZ2V0QWN0aXZlU3RhdGUoKSkge1xuICAgICAgICAgICAgICAgICAgICB2bS5zZWxlY3RlZFN0YXRlID0gXy5maW5kKHZtLnN0YXRlcywgeyBpZDogc3RhdGVTZXJ2aWNlLmdldEFjdGl2ZVN0YXRlKCkuaWQgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZtLnBvcG92ZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1NoYXJlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArICcvIy8/aWQ9JyArIHZtLnNlbGVjdGVkU3RhdGUuaWRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICB2bS5kaXNhYmxlU2F2ZVN0YXRlID0gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFTdGF0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9zdGF0ZS9zdGF0ZVRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ3N0YXRlQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3RlbXBvcmFsRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgbW9tZW50LFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLm1vZGUgPSAkc2NvcGUuJHBhcmVudC5tb2RlO1xuICAgICAgICB2bS5leHBhbmRlZFJhbmdlID0gcXMuZHVyYXRpb24gPyBmYWxzZSA6IHRydWU7XG4gICAgICAgIHZtLmV4cGFuZGVkRHVyYXRpb24gPSBxcy5kdXJhdGlvbiA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5tb21lbnQgPSBtb21lbnQ7XG4gICAgICAgIHZtLnN0YXJ0ID0gJyc7XG4gICAgICAgIHZtLnN0b3AgPSAnJztcbiAgICAgICAgdm0uZHVyYXRpb25MZW5ndGggPSBxcy5kdXJhdGlvbkxlbmd0aCA/IHBhcnNlSW50KHFzLmR1cmF0aW9uTGVuZ3RoKSA6IHNpZ21hQ29uZmlnLmRlZmF1bHREdXJhdGlvbkxlbmd0aDtcbiAgICAgICAgdm0uZHVyYXRpb25zID0gc2lnbWFDb25maWcuZHVyYXRpb25zO1xuICAgICAgICB2bS5zZWxlY3RlZER1cmF0aW9uID0gcXMuZHVyYXRpb24gPyBfLmZpbmQoc2lnbWFDb25maWcuZHVyYXRpb25zLCB7IHZhbHVlOiBxcy5kdXJhdGlvbiB9KSA6IF8uZmluZChzaWdtYUNvbmZpZy5kdXJhdGlvbnMsIHsgZGVmYXVsdDogdHJ1ZSB9KTtcbiAgICAgICAgdm0ucmFuZ2VzID0gc2lnbWFDb25maWcucmFuZ2VzO1xuICAgICAgICB2bS50ZW1wb3JhbFpvb20gPSAnJztcblxuICAgICAgICB2bS5zZXRUZW1wb3JhbEZpbHRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh2bS5leHBhbmRlZER1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdm0uc3RhcnQgPSBtb21lbnQudXRjKG1vbWVudC51dGMoKS5lbmRPZignZCcpKS5zdWJ0cmFjdCh2bS5kdXJhdGlvbkxlbmd0aCwgdm0uc2VsZWN0ZWREdXJhdGlvbi52YWx1ZSkuc3RhcnRPZignZCcpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgICAgIHZtLnN0b3AgPSBtb21lbnQudXRjKCkuZW5kT2YoJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsRmlsdGVyKHtcbiAgICAgICAgICAgICAgICBzdGFydDogdm0uc3RhcnQsXG4gICAgICAgICAgICAgICAgc3RvcDogdm0uc3RvcCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogdm0uZXhwYW5kZWREdXJhdGlvbiA/IHZtLnNlbGVjdGVkRHVyYXRpb24udmFsdWUgOiBudWxsLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uTGVuZ3RoOiB2bS5leHBhbmRlZER1cmF0aW9uID8gcGFyc2VJbnQodm0uZHVyYXRpb25MZW5ndGgpIDogbnVsbFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcblxuICAgICAgICAgICAgaWYgKHZtLmV4cGFuZGVkUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICB2bS5zdGFydCA9IHFzLnN0YXJ0ID8gbW9tZW50LnV0Yyhxcy5zdGFydCkudG9EYXRlKCkgOiBtb21lbnQudXRjKCkuc3VidHJhY3Qoc2lnbWFDb25maWcuZGVmYXVsdERheXNCYWNrLCAnZGF5cycpLnN0YXJ0T2YoJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgICAgICB2bS5zdG9wID0gcXMuc3RvcCA/IG1vbWVudC51dGMocXMuc3RvcCkudG9EYXRlKCkgOiBtb21lbnQudXRjKCkuZW5kT2YoJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodm0uZXhwYW5kZWREdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkRHVyYXRpb24gPSBxcy5kdXJhdGlvbiA/IF8uZmluZCh2bS5kdXJhdGlvbnMsIHsgdmFsdWU6IHFzLmR1cmF0aW9uIH0pIDogXy5maW5kKHZtLmR1cmF0aW9ucywgeyBkZWZhdWx0OiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgIHZtLmR1cmF0aW9uTGVuZ3RoID0gcXMuZHVyYXRpb25MZW5ndGggPyBwYXJzZUludChxcy5kdXJhdGlvbkxlbmd0aCkgOiBzaWdtYUNvbmZpZy5kZWZhdWx0RHVyYXRpb25MZW5ndGg7XG4gICAgICAgICAgICAgICAgdm0uc3RhcnQgPSBtb21lbnQudXRjKG1vbWVudC51dGMoKS5lbmRPZignZCcpKS5zdWJ0cmFjdCh2bS5kdXJhdGlvbkxlbmd0aCwgdm0uc2VsZWN0ZWREdXJhdGlvbi52YWx1ZSkuc3RhcnRPZignZCcpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgICAgIHZtLnN0b3AgPSBtb21lbnQudXRjKCkuZW5kT2YoJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdm0uc2V0VGVtcG9yYWxGaWx0ZXIoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkRmlsdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWRSYW5nZSA9ICF2bS5leHBhbmRlZFJhbmdlO1xuICAgICAgICAgICAgdm0uZXhwYW5kZWREdXJhdGlvbiA9ICF2bS5leHBhbmRlZER1cmF0aW9uO1xuXG4gICAgICAgICAgICB2bS5zZXRUZW1wb3JhbEZpbHRlcigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldFJhbmdlID0gZnVuY3Rpb24gKHVuaXRzLCB1bml0T2ZUaW1lKSB7XG4gICAgICAgICAgICB2bS5zdGFydCA9IG1vbWVudC51dGMoKS5hZGQodW5pdHMsIHVuaXRPZlRpbWUpLnN0YXJ0T2YoJ2RheScpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgdm0uc3RvcCA9IG1vbWVudC51dGMoKS5lbmRPZignZCcpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgdm0uc2V0VGVtcG9yYWxGaWx0ZXIoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRRcygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxcyA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLnN0YXJ0ID0gbW9tZW50LnV0YyhuZXdWYWx1ZS5zdGFydCkudG9EYXRlKCk7XG4gICAgICAgICAgICB2bS5zdG9wID0gbW9tZW50LnV0YyhuZXdWYWx1ZS5zdG9wKS50b0RhdGUoKTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBuZXdWYWx1ZS5kdXJhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgbmV3VmFsdWUuZHVyYXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUuZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uc2VsZWN0ZWREdXJhdGlvbiA9IF8uZmluZCh2bS5kdXJhdGlvbnMsIHt2YWx1ZTogbmV3VmFsdWUuZHVyYXRpb259KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUuZHVyYXRpb25MZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uZHVyYXRpb25MZW5ndGggPSBuZXdWYWx1ZS5kdXJhdGlvbkxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2bS5leHBhbmRlZFJhbmdlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdm0uZXhwYW5kZWREdXJhdGlvbiA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZtLmV4cGFuZGVkUmFuZ2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZtLmV4cGFuZGVkRHVyYXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHZtLm1vZGUgPT09ICdhbmFseXplJykge1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsWm9vbSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdm0udGVtcG9yYWxab29tID0gbmV3VmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYVRlbXBvcmFsRmlsdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL3RlbXBvcmFsRmlsdGVyL3RlbXBvcmFsRmlsdGVyVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAndGVtcG9yYWxGaWx0ZXJDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcigndGltZVNsaWRlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJHEsXG4gICAgICAgICR0aW1lb3V0LFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGJsb2NrVUksXG4gICAgICAgIGQzLFxuICAgICAgICBfLFxuICAgICAgICAkLFxuICAgICAgICBtb21lbnRcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLm1vZGUgPSBxcy5tb2RlIHx8ICRzY29wZS5tb2RlO1xuXG4gICAgICAgIHZhciBtYXJnaW4gPSB7dG9wOiAyNSwgcmlnaHQ6IDU1LCBib3R0b206IDI1LCBsZWZ0OiAyNX0sXG4gICAgICAgICAgICBhc3BlY3QgPSAwLFxuICAgICAgICAgICAgYWJzV2lkdGggPSAwLFxuICAgICAgICAgICAgYWJzSGVpZ2h0ID0gODUsXG4gICAgICAgICAgICB3aWR0aCA9IDAsXG4gICAgICAgICAgICBoZWlnaHQgPSBhYnNIZWlnaHQgLSBtYXJnaW4udG9wIC0gbWFyZ2luLmJvdHRvbSxcbiAgICAgICAgICAgIHggPSAwLFxuICAgICAgICAgICAgeSA9IDAsXG4gICAgICAgICAgICB4QXhpcyA9IHt9LFxuICAgICAgICAgICAgYXJlYSA9IGZ1bmN0aW9uICgpIHt9LFxuICAgICAgICAgICAgc3ZnID0ge30sXG4gICAgICAgICAgICBmb2N1cyA9IHt9LFxuICAgICAgICAgICAgYnJ1c2ggPSBkMy5zdmcuYnJ1c2goKSxcbiAgICAgICAgICAgIGNvbnRleHQgPSB7fSxcbiAgICAgICAgICAgIGFyZWFQYXRoID0ge30sXG4gICAgICAgICAgICB6b29tID0gZDMuYmVoYXZpb3Iuem9vbSgpLFxuICAgICAgICAgICAgeERhdGEgPSBbXSxcbiAgICAgICAgICAgIHlEYXRhID0gW10sXG4gICAgICAgICAgICB0aW1lU2xpZGVyRnJlcXVlbmN5ID0gW10sXG4gICAgICAgICAgICB0aW1lU2xpZGVyRXh0ZW50U3RhcnQgPSBxcy5zdGFydCB8fCBzaWdtYUNvbmZpZy5kZWZhdWx0U2xpZGVyU3RhcnQudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdG9wID0gcXMuc3RvcCB8fCBzaWdtYUNvbmZpZy5kZWZhdWx0U2xpZGVyU3RvcC50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgcGxheWJhY2tTdGF0ZSA9ICdzdG9wJyxcbiAgICAgICAgICAgIHBsYXliYWNrU3BlZWQgPSBzaWdtYUNvbmZpZy5tYXhQbGF5YmFja0RlbGF5LFxuICAgICAgICAgICAgcGxheWJhY2tJbnRlcnZhbFF0eSA9IHNpZ21hQ29uZmlnLmRlZmF1bHRQbGF5YmFja0ludGVydmFsUXR5LFxuICAgICAgICAgICAgcGxheWJhY2tJbnRlcnZhbCA9IF8uZmluZChzaWdtYUNvbmZpZy5wbGF5YmFja0ludGVydmFscywgeyBkZWZhdWx0OiB0cnVlIH0pLFxuICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXIgPSB7fTtcblxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLnNsaWRlclJlYWR5ID0gZmFsc2U7XG4gICAgICAgIHZtLmJydXNoU3RhdGUgPSAnc2VsZWN0JztcbiAgICAgICAgdm0udG9nZ2xlQnJ1c2hUZXh0ID0gJ1NlbGVjdCc7XG4gICAgICAgIHZtLnRvZ2dsZUJydXNoQ2xhc3MgPSAnZmEgZmEtY3Jvc3NoYWlycyc7XG5cbiAgICAgICAgdmFyIGRyYXdTbGlkZXIgPSBmdW5jdGlvbiAoZmlsdGVyLCBkdXJhdGlvbikge1xuICAgICAgICAgICAgZHVyYXRpb24gPSBkdXJhdGlvbiB8fCBzaWdtYUNvbmZpZy5tYXhQbGF5YmFja0RlbGF5IC0gcGxheWJhY2tTcGVlZDtcbiAgICAgICAgICAgIC8vZHVyYXRpb24gPSAxMDtcbiAgICAgICAgICAgIGJydXNoLmV4dGVudChbbW9tZW50LnV0YyhmaWx0ZXIuc3RhcnQpLnRvRGF0ZSgpLCBtb21lbnQudXRjKGZpbHRlci5zdG9wKS50b0RhdGUoKV0pO1xuXG4gICAgICAgICAgICAvLyBkcmF3IHRoZSBicnVzaCB0byBtYXRjaCBvdXIgZXh0ZW50XG4gICAgICAgICAgICAvLyBkb24ndCB0cmFuc2l0aW9uIGR1cmluZyBwbGF5YmFja1xuICAgICAgICAgICAgaWYgKHBsYXliYWNrU3RhdGUgIT09ICdwbGF5JyAmJiBwbGF5YmFja1N0YXRlICE9PSAncGF1c2UnICYmIHBsYXliYWNrU3RhdGUgIT09ICdzdGVwJykge1xuICAgICAgICAgICAgICAgIGJydXNoKGQzLnNlbGVjdCgnLmJydXNoJykudHJhbnNpdGlvbigpLmR1cmF0aW9uKGR1cmF0aW9uKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJydXNoKGQzLnNlbGVjdCgnLmJydXNoJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB1cGRhdGUgdGhlIGJydXNoIGRhdGUgbGFiZWxzXG4gICAgICAgICAgICBpZiAoYnJ1c2guZXh0ZW50KCkpIHtcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QoJy5yZXNpemUudyB0ZXh0JykuaHRtbChtb21lbnQudXRjKGJydXNoLmV4dGVudCgpWzBdKS5mb3JtYXQoJ01NL0REL1lZWVkgSEg6bW06c3MnKSArICcgJiM5NjYwOycpO1xuICAgICAgICAgICAgICAgIGQzLnNlbGVjdCgnLnJlc2l6ZS5lIHRleHQnKS5odG1sKCcmIzk2NjA7ICcgKyBtb21lbnQudXRjKGJydXNoLmV4dGVudCgpWzFdKS5mb3JtYXQoJ01NL0REL1lZWVkgSEg6bW06c3MnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGZpcmUgdGhlIGJydXNoc3RhcnQsIGJydXNobW92ZSwgYW5kIGJydXNoZW5kIGV2ZW50c1xuICAgICAgICAgICAgYnJ1c2guZXZlbnQoZDMuc2VsZWN0KCcuYnJ1c2gnKS50cmFuc2l0aW9uKCkuZHVyYXRpb24oZHVyYXRpb24pKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdXBkYXRlSW50ZXJ2YWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyByZWRyYXcgc2xpZGVyIGJydXNoXG4gICAgICAgICAgICB2YXIgZmlsdGVyID0ge1xuICAgICAgICAgICAgICAgIHN0YXJ0OiBtb21lbnQudXRjKHRpbWVTbGlkZXJFeHRlbnRTdGFydCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBzdG9wOiBtb21lbnQudXRjKHRpbWVTbGlkZXJFeHRlbnRTdGFydCkuYWRkKHBsYXliYWNrSW50ZXJ2YWxRdHksIHBsYXliYWNrSW50ZXJ2YWwudmFsdWUpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkcmF3U2xpZGVyKGZpbHRlcik7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGJydXNoaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gc2xpZGVyIGJydXNoIGlzIGJlaW5nIG1vdmVkLCBzbyB1cGRhdGUgdGhlIGRhdGUgbGFiZWwgdmFsdWVzXG4gICAgICAgICAgICAkKCcucmVzaXplLncgdGV4dCcpLmh0bWwobW9tZW50LnV0YyhicnVzaC5leHRlbnQoKVswXSkuZm9ybWF0KCdNTS9ERC9ZWVlZIEhIOm1tOnNzJykgKyAnICYjOTY2MDsnKTtcbiAgICAgICAgICAgICQoJy5yZXNpemUuZSB0ZXh0JykuaHRtbCgnJiM5NjYwOyAnICsgbW9tZW50LnV0YyhicnVzaC5leHRlbnQoKVsxXSkuZm9ybWF0KCdNTS9ERC9ZWVlZIEhIOm1tOnNzJykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBicnVzaGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHBsYXliYWNrU3RhdGUgPT09ICdwbGF5JyB8fCBwbGF5YmFja1N0YXRlID09PSAncGF1c2UnIHx8IHBsYXliYWNrU3RhdGUgPT09ICdzdGVwJykge1xuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSB0aW1lIHNsaWRlciBwb2ludGVyIGV2ZW50cyB0byBwcmV2ZW50IGN1c3RvbSByZXNpemluZyBvZiB0aGUgcGxheWJhY2sgd2luZG93XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KCcueC5icnVzaCcpLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdub25lJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBhZHZhbmNlIHNsaWRlciBicnVzaCB3aGVuIHBsYXlpbmdcbiAgICAgICAgICAgICAgICBpZiAocGxheWJhY2tTdGF0ZSA9PT0gJ3BsYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNlbmQgYnJ1c2ggZXh0ZW50cyB0byBzdGF0ZVNlcnZpY2Ugc28gcGxheWJhY2tDb250cm9sbGVyIGNhbiBpdGVyYXRlIHRoZSBjdXJyZW50IGZyYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QnJ1c2hFeHRlbnRzKGJydXNoLmV4dGVudCgpWzBdLCBicnVzaC5leHRlbnQoKVsxXSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KCcueC5icnVzaCcpLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdhbGwnKTtcblxuICAgICAgICAgICAgICAgIGlmICh2bS5tb2RlID09PSAncGxheWJhY2snKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGQzLmV2ZW50LnNvdXJjZUV2ZW50IHJldHVybnMgYSBtb3VzZSBldmVudCBpZiB0aGUgYnJ1c2ggaXMgYWx0ZXJlZCBieSB0aGUgdXNlciBkaXJlY3RseVxuICAgICAgICAgICAgICAgICAgICBpZiAoZDMuZXZlbnQuc291cmNlRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QnJ1c2hFeHRlbnRzKGJydXNoLmV4dGVudCgpWzBdLCBicnVzaC5leHRlbnQoKVsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkMy5ldmVudC5zb3VyY2VFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHZhbHVlcyB3ZXJlIG1vZGlmaWVkIGRpcmVjdGx5IGJ5IHNsaWRlciwgc28ganVzdCBzZXQgdGltZSByYW5nZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUZW1wb3JhbEZpbHRlcih7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBtb21lbnQudXRjKGJydXNoLmV4dGVudCgpWzBdKS50b0RhdGUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogbW9tZW50LnV0YyhicnVzaC5leHRlbnQoKVsxXSkudG9EYXRlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByZWRyYXdTbGlkZXJDaGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhcmVhIHdpdGggbmV3IGRhdGFcbiAgICAgICAgICAgIGFyZWFQYXRoLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgIC5kdXJhdGlvbigwKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkJywgYXJlYSh0aW1lU2xpZGVyRnJlcXVlbmN5KSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgeCBheGlzXG4gICAgICAgICAgICBjb250ZXh0LnNlbGVjdCgnLnguYXhpcycpXG4gICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgIC5kdXJhdGlvbigwKVxuICAgICAgICAgICAgICAgIC5jYWxsKHhBeGlzKVxuICAgICAgICAgICAgICAgIC5lYWNoKCdlbmQnLCBmdW5jdGlvbiAoKSB7ICRzY29wZS4kYXBwbHkoKTsgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIG1vdXNlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh2bS5tb2RlID09PSAnc2VhcmNoJykge1xuICAgICAgICAgICAgICAgIHZhciBiaXNlY3REYXRlID0gZDMuYmlzZWN0b3IoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnQudXRjKGQudGltZSkudG9EYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pLmxlZnQsXG4gICAgICAgICAgICAgICAgICAgIHgwID0geC5pbnZlcnQoZDMubW91c2UodGhpcylbMF0pLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgIGkgPSBiaXNlY3REYXRlKHRpbWVTbGlkZXJGcmVxdWVuY3ksIHgwLCAxKSxcbiAgICAgICAgICAgICAgICAgICAgZDAgPSB0aW1lU2xpZGVyRnJlcXVlbmN5W2kgLSAxXSxcbiAgICAgICAgICAgICAgICAgICAgZDEgPSB0aW1lU2xpZGVyRnJlcXVlbmN5W2ldO1xuXG4gICAgICAgICAgICAgICAgaWYgKGQwICYmIGQxKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkID0gZDEgPyBtb21lbnQudXRjKHgwKS5zdWJ0cmFjdChkMC50aW1lKS5pc0FmdGVyKG1vbWVudC51dGMoZDEudGltZSkuc3VidHJhY3QobW9tZW50LnV0Yyh4MCkudG9JU09TdHJpbmcoKSkpID8gZDEgOiBkMCA6IGQwO1xuXG4gICAgICAgICAgICAgICAgICAgIGZvY3VzLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArICh4KG1vbWVudC51dGMoZC50aW1lKS50b0RhdGUoKSkgKyBtYXJnaW4ubGVmdCkgKyAnLCcgKyAoeShkLmNvdW50KSArIG1hcmdpbi50b3ApICsgJyknKTtcbiAgICAgICAgICAgICAgICAgICAgZm9jdXMuc2VsZWN0KCd0ZXh0JykudGV4dChtb21lbnQudXRjKG1vbWVudC51dGMoZC50aW1lKS50b0RhdGUoKSkuZm9ybWF0KCdNTS9ERC9ZWVlZJykgKyAnOiAnICsgZC5jb3VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBkcmF3U2xpZGVyQ2hhcnQgPSBmdW5jdGlvbiAoaXNVcGRhdGUpIHtcbiAgICAgICAgICAgIGlzVXBkYXRlID0gaXNVcGRhdGUgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhcnJheXMgb2YganVzdCBkYXRlcyBhbmQgdmFsdWVzIGluIG9yZGVyIHRvIHNldCB0aGUgeCBhbmQgeSBkb21haW5zXG4gICAgICAgICAgICB4RGF0YSA9IF8ubWFwKHRpbWVTbGlkZXJGcmVxdWVuY3ksICd0aW1lJyk7XG4gICAgICAgICAgICB5RGF0YSA9IF8ubWFwKHRpbWVTbGlkZXJGcmVxdWVuY3ksICdjb3VudCcpO1xuXG4gICAgICAgICAgICAvLyBjcmVhdGUgc2xpZGVyIGNoYXJ0XG4gICAgICAgICAgICB4LmRvbWFpbihbbW9tZW50LnV0Yyh4RGF0YVswXSkudG9EYXRlKCksIG1vbWVudC51dGMoeERhdGFbeERhdGEubGVuZ3RoIC0gMV0pLmVuZE9mKCdkJykudG9EYXRlKCldKTtcbiAgICAgICAgICAgIHkuZG9tYWluKFswLCBkMy5tYXgoeURhdGEpXSk7XG4gICAgICAgICAgICB6b29tLngoeCk7XG5cbiAgICAgICAgICAgIGlmIChpc1VwZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJlZHJhd1NsaWRlckNoYXJ0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGFyZWFcbiAgICAgICAgICAgICAgICBhcmVhUGF0aCA9IGNvbnRleHQuYXBwZW5kKCdwYXRoJylcbiAgICAgICAgICAgICAgICAgICAgLmRhdHVtKHRpbWVTbGlkZXJGcmVxdWVuY3kpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdhcmVhJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2QnLCBhcmVhKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignY2xpcC1wYXRoJywgJ3VybCgjY2xpcCknKTtcblxuICAgICAgICAgICAgICAgIGZvY3VzID0gc3ZnLmFwcGVuZCgnZycpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdmb2N1cycpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG5cbiAgICAgICAgICAgICAgICBmb2N1cy5hcHBlbmQoJ2NpcmNsZScpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdyJywgNC41KTtcblxuICAgICAgICAgICAgICAgIGZvY3VzLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCd4JywgOSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2R5JywgJy4zNWVtJyk7XG5cbiAgICAgICAgICAgICAgICBzdmcuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgd2lkdGggKyBtYXJnaW4ubGVmdCArIG1hcmdpbi5yaWdodClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGhlaWdodCArIG1hcmdpbi50b3AgKyBtYXJnaW4uYm90dG9tKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnem9vbScpXG4gICAgICAgICAgICAgICAgICAgIC5jYWxsKHpvb20pO1xuXG4gICAgICAgICAgICAgICAgY29udGV4dC5hcHBlbmQoJ2cnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCAneCBheGlzJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoMCwnICsgaGVpZ2h0ICsgJyknKVxuICAgICAgICAgICAgICAgICAgICAuY2FsbCh4QXhpcyk7XG5cbiAgICAgICAgICAgICAgICBjb250ZXh0LmFwcGVuZCgnZycpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICd4IGJydXNoJylcbiAgICAgICAgICAgICAgICAgICAgLmNhbGwoYnJ1c2gpXG4gICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoJ3JlY3QnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cigneScsIC02KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0ICsgNylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsaXAtcGF0aCcsICd1cmwoI2NsaXApJyk7XG5cbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QoJy50aW1lLXNsaWRlcicpXG4gICAgICAgICAgICAgICAgICAgIC5vbignbW91c2VvdmVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXMuc3R5bGUoJ2Rpc3BsYXknLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdtb3VzZW1vdmUnLCBtb3VzZW1vdmUpO1xuXG4gICAgICAgICAgICAgICAgY29udGV4dC5zZWxlY3QoJy5yZXNpemUudycpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cigneCcsIC0xMjIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCd5JywgLTgpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgJyNmZmQ4MDAnKVxuICAgICAgICAgICAgICAgICAgICAudGV4dCgnJyk7XG5cbiAgICAgICAgICAgICAgICBjb250ZXh0LnNlbGVjdCgnLnJlc2l6ZS5lJylcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCd4JywgLTYpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCd5JywgLTgpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgJyNmZmQ4MDAnKVxuICAgICAgICAgICAgICAgICAgICAudGV4dCgnJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZtLnNsaWRlclJlYWR5ID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gZHJhdyBzbGlkZXIgYnJ1c2hcbiAgICAgICAgICAgIGlmICh2bS5tb2RlID09PSAncGxheWJhY2snKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlSW50ZXJ2YWwoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodm0ubW9kZSA9PT0gJ3NlYXJjaCcpIHtcbiAgICAgICAgICAgICAgICBkcmF3U2xpZGVyKHRlbXBvcmFsRmlsdGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodm0ubW9kZSA9PT0gJ2FuYWx5emUnKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlSW50ZXJ2YWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5taW5pbWl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJy5jaGFydCcpLmFuaW1hdGUoeyAnYm90dG9tJzogJy09ODVweCd9LCAyMDApO1xuICAgICAgICAgICAgJCgnLmxlYWZsZXQtY29udHJvbC1jb29yZGluYXRlcycpLmFuaW1hdGUoeyAnYm90dG9tJzogJy09NDVweCd9LCAyMDApO1xuICAgICAgICAgICAgJCgnLnRpbWUtc2xpZGVyLWNvbnRhaW5lcicpLnNsaWRlVG9nZ2xlKDIwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy50aW1lLXNsaWRlci1tYXhpbWl6ZScpLnNsaWRlVG9nZ2xlKDIwMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5tYXhpbWl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJy50aW1lLXNsaWRlci1tYXhpbWl6ZScpLnNsaWRlVG9nZ2xlKDIwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy5jaGFydCcpLmFuaW1hdGUoeyAnYm90dG9tJzogJys9ODVweCd9LCAyMDApO1xuICAgICAgICAgICAgICAgICQoJy5sZWFmbGV0LWNvbnRyb2wtY29vcmRpbmF0ZXMnKS5hbmltYXRlKHsgJ2JvdHRvbSc6ICcrPTQ1cHgnfSwgMjAwKTtcbiAgICAgICAgICAgICAgICAkKCcudGltZS1zbGlkZXItY29udGFpbmVyJykuc2xpZGVUb2dnbGUoMjAwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZUJydXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uYnJ1c2hTdGF0ZSA9IHZtLmJydXNoU3RhdGUgPT09ICdzZWxlY3QnID8gJ3pvb20nIDogJ3NlbGVjdCc7XG4gICAgICAgICAgICBkMy5zZWxlY3QoJy54LmJydXNoJykuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgdm0uYnJ1c2hTdGF0ZSA9PT0gJ3NlbGVjdCcgPyAnYWxsJyA6ICdub25lJyk7XG4gICAgICAgICAgICB2bS50b2dnbGVCcnVzaFRleHQgPSB2bS5icnVzaFN0YXRlID09PSAnc2VsZWN0JyA/ICdTZWxlY3QnIDogJ1pvb20vUGFuJztcbiAgICAgICAgICAgIHZtLnRvZ2dsZUJydXNoQ2xhc3MgPSB2bS5icnVzaFN0YXRlID09PSAnc2VsZWN0JyA/ICdmYSBmYS1jcm9zc2hhaXJzJyA6ICdmYSBmYS1zZWFyY2gnO1xuICAgICAgICAgICAgJCgnLnpvb20nKS50b2dnbGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5pbml0VGltZVNsaWRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFic1dpZHRoID0gJCgnLnRpbWUtc2xpZGVyLWNvbnRhaW5lcicpLndpZHRoKCk7XG4gICAgICAgICAgICB3aWR0aCA9ICBhYnNXaWR0aCAtIG1hcmdpbi5sZWZ0IC0gbWFyZ2luLnJpZ2h0O1xuICAgICAgICAgICAgYXNwZWN0ID0gKGFic1dpZHRoIC8gYWJzSGVpZ2h0KTtcblxuICAgICAgICAgICAgLy8gcmVzaXplIHNsaWRlciB3aGVuIHZpZXdwb3J0IGlzIGNoYW5nZWRcbiAgICAgICAgICAgICQod2luZG93KS5vbigncmVzaXplJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXRXaWR0aCA9ICQoJy50aW1lLXNsaWRlci1jb250YWluZXInKS53aWR0aCgpO1xuICAgICAgICAgICAgICAgIHN2Zy5hdHRyKCd3aWR0aCcsIHRhcmdldFdpZHRoKTtcbiAgICAgICAgICAgICAgICBzdmcuYXR0cignaGVpZ2h0JywgdGFyZ2V0V2lkdGggLyBhc3BlY3QpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHggPSBkMy50aW1lLnNjYWxlLnV0YygpLnJhbmdlKFswLCB3aWR0aF0pO1xuICAgICAgICAgICAgeSA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFtoZWlnaHQsIDBdKTtcblxuICAgICAgICAgICAgeEF4aXMgPSBkMy5zdmcuYXhpcygpLnNjYWxlKHgpLm9yaWVudCgnYm90dG9tJyk7XG5cbiAgICAgICAgICAgIGJydXNoLngoeClcbiAgICAgICAgICAgICAgICAub24oJ2JydXNoJywgYnJ1c2hpbmcpXG4gICAgICAgICAgICAgICAgLm9uKCdicnVzaGVuZCcsIGJydXNoZWQpO1xuXG4gICAgICAgICAgICBhcmVhID0gZDMuc3ZnLmFyZWEoKVxuICAgICAgICAgICAgICAgIC54KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4KG1vbWVudC51dGMoZC50aW1lKS50b0RhdGUoKSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAueTAoaGVpZ2h0KVxuICAgICAgICAgICAgICAgIC55MShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geShkLmNvdW50KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgc3ZnID0gZDMuc2VsZWN0KCcudGltZS1zbGlkZXInKS5hcHBlbmQoJ3N2ZycpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgd2lkdGggKyBtYXJnaW4ubGVmdCArIG1hcmdpbi5yaWdodClcbiAgICAgICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0ICsgbWFyZ2luLnRvcCArIG1hcmdpbi5ib3R0b20pXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCAnMCAwICcgKyAod2lkdGggKyBtYXJnaW4ubGVmdCArIG1hcmdpbi5yaWdodCkgKyAnICcgKyAoaGVpZ2h0ICsgbWFyZ2luLnRvcCArIG1hcmdpbi5ib3R0b20pKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJ3hNaW5ZTWluJyk7XG5cbiAgICAgICAgICAgIHN2Zy5hcHBlbmQoJ2NsaXBQYXRoJylcbiAgICAgICAgICAgICAgICAuYXR0cignaWQnLCAnY2xpcCcpXG4gICAgICAgICAgICAgICAgLmFwcGVuZCgncmVjdCcpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3gnLCB4KDApKVxuICAgICAgICAgICAgICAgIC5hdHRyKCd5JywgeSgxKSlcbiAgICAgICAgICAgICAgICAuYXR0cignd2lkdGgnLCB4KDEpIC0geCgwKSlcbiAgICAgICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgeSgwKSAtIHkoMSkpO1xuXG4gICAgICAgICAgICBjb250ZXh0ID0gc3ZnLmFwcGVuZCgnZycpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2NvbnRleHQnKVxuICAgICAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBtYXJnaW4ubGVmdCArICcsJyArIG1hcmdpbi50b3AgKyAnKScpO1xuXG4gICAgICAgICAgICB6b29tLm9uKCd6b29tJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlZHJhd1NsaWRlckNoYXJ0KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFFzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHFzID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RnJhbWVFeHRlbnRzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGZyYW1lIGV4dGVudHMgYXJlIHVwZGF0ZWQgd2hlbiBwbGF5YmFja0NvbnRyb2xsZXIgYWR2YW5jZXMgdG8gdGhlIG5leHQgZnJhbWVcbiAgICAgICAgICAgIGlmIChfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAocGxheWJhY2tTdGF0ZSA9PT0gJ3BsYXknIHx8IHBsYXliYWNrU3RhdGUgPT09ICdwYXVzZScgfHwgcGxheWJhY2tTdGF0ZSA9PT0gJ3N0ZXAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGRyYXdTbGlkZXIoe3N0YXJ0OiBtb21lbnQudXRjKG5ld1ZhbHVlLnN0YXJ0KS50b0lTT1N0cmluZygpLCBzdG9wOiBtb21lbnQudXRjKG5ld1ZhbHVlLnN0b3ApLnRvSVNPU3RyaW5nKCl9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0VGltZVNsaWRlckZyZXF1ZW5jeSgpJywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aW1lU2xpZGVyRnJlcXVlbmN5ID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgZHJhd1NsaWRlckNoYXJ0KHZtLnNsaWRlclJlYWR5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBzaWdtYUNvbmZpZy5kZWJvdW5jZVRpbWUpKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vmlld01vZGUoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgdm0ubW9kZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgaWYgKHZtLm1vZGUgPT09ICdhbmFseXplJyAmJiB2bS5zbGlkZXJSZWFkeSkge1xuICAgICAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdGFydCA9IHFzLnN0YXJ0O1xuICAgICAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdG9wID0gcXMuc3RvcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXIgPSBuZXdWYWx1ZTtcblxuICAgICAgICAgICAgICAgIGlmICh2bS5tb2RlID09PSAnc2VhcmNoJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWQzLmV2ZW50KSB7IC8vIHRlbXBvcmFsRmlsdGVyIHdhcyBub3QgbW9kaWZpZWQgYnkgdGhlIGJydXNoXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBidWZmZXIgdGltZSBzbGlkZXIgZXh0ZW50cyBhcm91bmQgdGVtcG9yYWwgZmlsdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobW9tZW50LnV0YygpLmRpZmYobW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdGFydCksICdkJykgPiAzNjUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lU2xpZGVyRXh0ZW50U3RhcnQgPSBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0YXJ0KS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lU2xpZGVyRXh0ZW50U3RhcnQgPSBtb21lbnQudXRjKCkuc3VidHJhY3QoMSwgJ3knKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobW9tZW50LnV0YygpLmRpZmYobW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdG9wKSwgJ2QnKSA+IDkwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZVNsaWRlckV4dGVudFN0b3AgPSBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0b3ApLmFkZCgzLCAnTScpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdG9wID0gbW9tZW50LnV0YygpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNldCBzbGlkZXIgZXh0ZW50cyBmb3IgdXNlIGluIG90aGVyIGNvbnRyb2xsZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGltZVNsaWRlckV4dGVudHModGltZVNsaWRlckV4dGVudFN0YXJ0LCB0aW1lU2xpZGVyRXh0ZW50U3RvcCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2bS5zbGlkZXJSZWFkeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYXdTbGlkZXJDaGFydCh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vZHJhd1NsaWRlcih0ZW1wb3JhbEZpbHRlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGltZVNsaWRlckV4dGVudHModGVtcG9yYWxGaWx0ZXIuc3RhcnQsIHRlbXBvcmFsRmlsdGVyLnN0b3ApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFBsYXliYWNrU3RhdGUoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGxheWJhY2tTdGF0ZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgaWYgKHBsYXliYWNrU3RhdGUgPT09ICdwbGF5JyB8fCBwbGF5YmFja1N0YXRlID09PSAncGF1c2UnIHx8IHBsYXliYWNrU3RhdGUgPT09ICdzdGVwJykge1xuICAgICAgICAgICAgICAgIHZhciBmcmFtZUV4dGVudHMgPSBzdGF0ZVNlcnZpY2UuZ2V0RnJhbWVFeHRlbnRzKCk7XG4gICAgICAgICAgICAgICAgZHJhd1NsaWRlcihmcmFtZUV4dGVudHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRQbGF5YmFja1NwZWVkKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBsYXliYWNrU3BlZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFBsYXliYWNrSW50ZXJ2YWxRdHkoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGxheWJhY2tJbnRlcnZhbFF0eSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgdXBkYXRlSW50ZXJ2YWwoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRQbGF5YmFja0ludGVydmFsKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBsYXliYWNrSW50ZXJ2YWwgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIHVwZGF0ZUludGVydmFsKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRCcnVzaFJlc2V0KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHVwZGF0ZUludGVydmFsKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYVRpbWVTbGlkZXInLCBmdW5jdGlvbiAoJHRpbWVvdXQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy90aW1lU2xpZGVyL3RpbWVTbGlkZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICd0aW1lU2xpZGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIHN0YXJ0OiAnPScsXG4gICAgICAgICAgICAgICAgc3RvcDogJz0nLFxuICAgICAgICAgICAgICAgIG1vZGU6ICc9J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRpZ2VzdCBjeWNsZXMgdG8gY29tcGxldGUgdG8gZW5zdXJlIERPTSBpcyBmdWxseSByZWFkeVxuICAgICAgICAgICAgICAgIC8vIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudCkucmVhZHkoKSBkb2VzIG5vdCBlbnN1cmUgZXZlcnl0aGluZyBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudm0uaW5pdFRpbWVTbGlkZXIoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmZhY3RvcnkoJ3ZpZGVvU2VydmljZScsIGZ1bmN0aW9uIChcbiAgICAgICAgJHRpbWVvdXQsXG4gICAgICAgICRxLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICBXaGFtbXksXG4gICAgICAgIEdJRixcbiAgICAgICAgbGVhZmxldEltYWdlLFxuICAgICAgICBGaWxlU2F2ZXJcbiAgICApIHtcbiAgICAgICAgdmFyIHNlbGYsXG4gICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkgPSBzdGF0ZVNlcnZpY2UuZ2V0Q2FudmFzSW1hZ2VPdmVybGF5KCk7XG5cbiAgICAgICAgc2VsZiA9IHtcbiAgICAgICAgICAgIC8vIHRlbXAgY29udHJvbCBmbGFnIHVzZWQgb3V0c2lkZSBvZiB0aGlzIHNlcnZpY2VcbiAgICAgICAgICAgIGlzUmVjb3JkaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGlmIHRoZSBiYXNlIGxheWVyIGlzIGJlaW5nIGNyZWF0ZWRcbiAgICAgICAgICAgIGlzSW5pdGlhbGl6aW5nOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGlmIHRoZSBpbml0aWFsaXplciBzaG91bGQgc2F2ZSB0aGUgYmFzZSBsYXllclxuICAgICAgICAgICAgaW5jbHVkZUJhc2VMYXllcjogdHJ1ZSxcbiAgICAgICAgICAgIC8vIHRoZSBlbmNvZGVyIHRvIHVzZVxuICAgICAgICAgICAgZW5jb2Rlcjogc2lnbWFDb25maWcuZGVmYXVsdEVuY29kZXIsICAgLy8gJ3dlYm0nIG9yICdnaWYnXG4gICAgICAgICAgICAvLyBsaXN0IG9mIGVuY29kZXJzXG4gICAgICAgICAgICBfZW5jb2RlcnM6IHtcbiAgICAgICAgICAgICAgICB3ZWJtOiBuZXcgV2hhbW15LlZpZGVvKCksXG4gICAgICAgICAgICAgICAgZ2lmOiBuZXcgR0lGKHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyU2NyaXB0OiAnc2NyaXB0cy9naWYud29ya2VyLmpzJyxcbiAgICAgICAgICAgICAgICAgICAgd29ya2Vyczogc2lnbWFDb25maWcuZW5jb2RlcnMuZ2lmLndvcmtlcnMsXG4gICAgICAgICAgICAgICAgICAgIHF1YWxpdHk6IHNpZ21hQ29uZmlnLmVuY29kZXJzLmdpZi5xdWFsaXR5XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBhIHRlbXAgY2FudmFzIHRvIGRyYXcgbWVyZ2VkIGxheWVycyBvbnRvXG4gICAgICAgICAgICBfdG1wQ2FudmFzOiBhbmd1bGFyLmVsZW1lbnQoJzxjYW52YXM+JylbMF0sXG4gICAgICAgICAgICAvLyB0aGUgY2FudmFzIGJhc2UgbGF5ZXIsIGNyZWF0ZWQgdGhyb3VnaCBfYnVpbGRCYXNlTGF5ZXIoKVxuICAgICAgICAgICAgX2Jhc2VMYXllcjogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBfYmFzZUxheWVyIGNhbnZhcyBvYmplY3QgYnkgdXNpbmcgbGVhZmxldEltYWdlIHRvXG4gICAgICAgICAgICAgKiBmbGF0dGVuIGFsbCBiYXNlIHRpbGVzIGFuZCBhZGQgdGhlbSBvbnRvIGEgY2FudmFzLiBEaXNwbGF5cyBhIGJsb2NrVUlcbiAgICAgICAgICAgICAqIG1lc3NhZ2Ugd2hpbGUgcmVuZGVyaW5nLlxuICAgICAgICAgICAgICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIGNhbGxiYWNrIHdoZW4gY2FudmFzIHJlc29sdmVzLCBlcnIgZm9yIHJlamVjdGVkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9idWlsZEJhc2VMYXllcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuaW5jbHVkZUJhc2VMYXllcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tVSS5zdGFydCgnUmVuZGVyaW5nIGJhc2UgbGF5ZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuaXNJbml0aWFsaXppbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWFmbGV0SW1hZ2UoY2FudmFzSW1hZ2VPdmVybGF5LmxheWVyLl9tYXAsIGZ1bmN0aW9uIChlcnIsIGNhbnZhcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuaXNJbml0aWFsaXppbmcgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tVSS5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX2Jhc2VMYXllciA9IGNhbnZhcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tVSS5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoY2FudmFzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gaW5jbHVkZSB0aGUgbGF5ZXIsIGp1c3QgcmVzb2x2ZVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ2xlYXJzIHRoZSBlbmNvZGVyIGFuZCBzYXZlcyBhIGNvcHkgb2YgdGhlIGJhc2UgbGF5ZXIuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBQcm9taXNlIHdpdGggY2FsbGJhY2sgd2hlbiBjYW52YXMgcmVzb2x2ZXMsIGVyciBmb3IgcmVqZWN0ZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5fYnVpbGRCYXNlTGF5ZXIoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ2xlYXJzIHRoZSBiYXNlIGxheWVyIGFuZCBkZXN0cm95cyBhbnkgZnJhbWVzIGluIHRoZSBlbmNvZGVyLlxuICAgICAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSB0aGlzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZW5jb2RlcnMud2VibS5mcmFtZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBzZWxmLl9lbmNvZGVycy5naWYuZnJhbWVzID0gW107XG4gICAgICAgICAgICAgICAgc2VsZi5fYmFzZUxheWVyID0gbnVsbDtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0cmlldmVzIHRoZSBjYW52YXMgZm9yIHRoZSBpbWFnZSBvdmVybGF5IGxheWVycy5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0NhbnZhc30gdGhlIGNhbnZhcyB1c2VkIGJ5IENhbnZhc0ltYWdlT3ZlcmxheVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfZ2V0T3ZlcmxheUNhbnZhczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYW52YXNJbWFnZU92ZXJsYXkubGF5ZXIuY2FudmFzKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNhdmVzIHRoZSBzdGF0ZSBvZiB0aGUgbGVhZmxldCBtYXAgYXMgYSBmcmFtZSBvbiB0aGUgZW5jb2Rlci4gVGhlXG4gICAgICAgICAgICAgKiBiYXNlbGF5ZXIgc2hvdWxkIGhhdmUgYmVlbiBzYXZlZCBwcmlvciB0byB0aGlzIGNhbGwuIFRoZSBfdG1wQ2FudmFzXG4gICAgICAgICAgICAgKiBpcyBjbGVhcmVkLCB0aGUgX2Jhc2VMYXllciBkcmF3biwgdGhlbiB0aGUgb3ZlcmxheSBsYXllciBkcmF3bi5cbiAgICAgICAgICAgICAqIFRoZSBfdG1wQ2FudmFzIGlzIGNvbnZlcnRlZCB0byBhIEJsb2IgdGhlbiBzYXZlZCBhcyBhIGZyYW1lIGluXG4gICAgICAgICAgICAgKiB0aGUgZW5jb2Rlci5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gdGhpc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjYXB0dXJlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNpemUgPSBjYW52YXNJbWFnZU92ZXJsYXkubGF5ZXIuX21hcC5nZXRTaXplKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHggPSBzZWxmLl90bXBDYW52YXMuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gc2lnbWFDb25maWcubWF4UGxheWJhY2tEZWxheSAtIHN0YXRlU2VydmljZS5nZXRQbGF5YmFja1NwZWVkKCkgKyAxMDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdG1wIGNhbnZhcyBzaXplIHRvIGN1cnJlbnQgbWFwIHNpemVcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fdG1wQ2FudmFzLndpZHRoID0gc2l6ZS54O1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl90bXBDYW52YXMuaGVpZ2h0ID0gc2l6ZS55O1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNsZWFyIHRoZSB0bXAgY2FudmFzXG4gICAgICAgICAgICAgICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgc2VsZi5fdG1wQ2FudmFzLndpZHRoLCBzZWxmLl90bXBDYW52YXMuaGVpZ2h0KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBkcmF3IHRoZSBiYXNlIGxheWVyLCB0aGVuIGRyYXcgdGhlIG92ZXJsYXkgbGF5ZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuaW5jbHVkZUJhc2VMYXllcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShzZWxmLl9iYXNlTGF5ZXIsIDAsIDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2Uoc2VsZi5fZ2V0T3ZlcmxheUNhbnZhcygpLCAwLCAwKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjb252ZXIgdGhlIHRtcCBjYW52YXMgdG8gd2VicCBhbmQgYWRkIHRvIHRoZSBlbmNvZGVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmVuY29kZXIgPT09ICdnaWYnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9lbmNvZGVycy5naWYuYWRkRnJhbWUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdG1wQ2FudmFzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjb3B5OiB0cnVlLCBkZWxheTogZHVyYXRpb259XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNlbGYuZW5jb2RlciA9PT0gJ3dlYm0nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9lbmNvZGVycy53ZWJtLmFkZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl90bXBDYW52YXMudG9EYXRhVVJMKCdpbWFnZS93ZWJwJywgc2lnbWFDb25maWcuZW5jb2RlcnMud2VibS5xdWFsaXR5KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGludmFsaWQgZW5jb2RlciBmb3JtYXRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSGVscGVyIGZ1bmN0aW9uIHRvIGVuY29kZSBhbmQgc2F2ZSBhIGdpZi4gRGlzcGxheXMgYSBibG9ja1VJXG4gICAgICAgICAgICAgKiBtZXNzYWdlIHdoaWxlIGVuY29kaW5nLlxuICAgICAgICAgICAgICogQHBhcmFtICB7ZnVuY3Rpb259IHJlc29sdmUgQSBjYWxsYmFjayBmb3Igd2hlbiBmaW5pc2hlZFxuICAgICAgICAgICAgICogQHBhcmFtICB7c3RyaW5nfSAgIGZuYW1lICAgVGhlIG5hbWUgdG8gc2F2ZSB0aGUgZmlsZSBhc1xuICAgICAgICAgICAgICogQHJldHVybiB7ZnVuY3Rpb259ICAgICAgICAgVGhlIHJlc29sdmVkIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9lbmNvZGVHaWY6IGZ1bmN0aW9uIChyZXNvbHZlLCBmbmFtZSkge1xuICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RhcnQoJ0VuY29kaW5nJyk7XG4gICAgICAgICAgICAgICAgdmFyIGxhc3RCbG9iLFxuICAgICAgICAgICAgICAgICAgICB0aW1lcjtcblxuICAgICAgICAgICAgICAgIC8vIGF0dGFjaCBldmVudCBsaXN0ZW5lciBmb3Igd2hlbiBmaW5pc2hlZFxuICAgICAgICAgICAgICAgIHNlbGYuX2VuY29kZXJzLmdpZi5vbignZmluaXNoZWQnLCBmdW5jdGlvbiAoYmxvYikge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgZW5jb2RlciBlbWl0cyBhIGZpbmlzaGVkIGV2ZW50IG9uY2Ugb3IgdHdpY2VcbiAgICAgICAgICAgICAgICAgICAgLy8gc2F2ZSB3aGVudmVyIGJsb2Igd2UgY3VycmVudGx5IGdldCB0aGlzIHJvdW5kXG4gICAgICAgICAgICAgICAgICAgIGxhc3RCbG9iID0gYmxvYjtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGUgdGltZXIgaXMgYWxyZWFkeSBydW5uaW5nIGNhbmNlbCBpdFxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIG1lYW5zIGFub3RoZXIgZmluaXNoIGV2ZW50IGhhcyBhbHJlYWR5IGJlZW4gZmlyZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHRpbWVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gdXNlIGEgZ2VuZXJvdXMgdGltZW91dCB0byB3YWl0IGZvciBhbGwgZmluaXNoZWQgZXZlbnRzXG4gICAgICAgICAgICAgICAgICAgIHRpbWVyID0gJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBzaG91bGQgYmUgdGhlIGxhc3QgZmluaXNoZWQgZXZlbnQgY2FsbCwgc2FmZSB0byBzYXZlXG4gICAgICAgICAgICAgICAgICAgICAgICBGaWxlU2F2ZXIuc2F2ZUFzKGxhc3RCbG9iLCBmbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBibG9ja1VJLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUobGFzdEJsb2IpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzb21ldGltZXMgdGhlIGVuY29kZXIgdGhpbmtzIGl0cyBzdGlsbCBydW5uaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBob2xkIGl0J3MgaGFuZCBhbmQgdGVsbCBpdCBldmVyeXRoaW5nIHdpbGwgYmUgb2tcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX2VuY29kZXJzLmdpZi5hYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyICogMTAwMCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBhdHRhY2ggcHJvZ3Jlc3MgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgICAgICAgICBzZWxmLl9lbmNvZGVycy5naWYub24oJ3Byb2dyZXNzJywgZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdXNlIHRpbWVvdXQgZm9yIGEgc2FmZSAkc2NvcGUuJGFwcGx5KClcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tVSS5tZXNzYWdlKCdFbmNvZGluZyAnICsgTWF0aC5yb3VuZChwICogMTAwKSArICclJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gc3RhcnQgdGhlIHJlbmRlcmluZ1xuICAgICAgICAgICAgICAgIHNlbGYuX2VuY29kZXJzLmdpZi5yZW5kZXIoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSGVscGVyIGZ1bmN0aW9uIHRvIGVuY29kZSBhbmQgc2F2ZSBhIHdlYm0uIERpc3BsYXlzIGEgYmxvY2tVSVxuICAgICAgICAgICAgICogbWVzc2FnZSB3aGlsZSBlbmNvZGluZy4gTm8gcHJvZ3Jlc3MgdXBkYXRlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufSByZXNvbHZlIEEgY2FsbGJhY2sgZm9yIHdoZW4gZmluaXNoZWRcbiAgICAgICAgICAgICAqIEBwYXJhbSAge3N0cmluZ30gICBmbmFtZSAgIFRoZSBuYW1lIHRvIHNhdmUgdGhlIGZpbGUgYXNcbiAgICAgICAgICAgICAqIEByZXR1cm4ge2Z1bmN0aW9ufSAgICAgICAgIFRoZSByZXNvbHZlZCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfZW5jb2RlV2VibTogZnVuY3Rpb24gKHJlc29sdmUsIGZuYW1lKSB7XG4gICAgICAgICAgICAgICAgYmxvY2tVSS5zdGFydCgnRW5jb2RpbmcnKTtcblxuICAgICAgICAgICAgICAgIHNlbGYuX2VuY29kZXJzLndlYm0uY29tcGlsZShmYWxzZSwgZnVuY3Rpb24gKGJsb2IpIHtcbiAgICAgICAgICAgICAgICAgICAgRmlsZVNhdmVyLnNhdmVBcyhibG9iLCBmbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGJsb2IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb21waWxlcyB0aGUgZnJhbWVzIGludG8gYSB2aWRlbyBvciBnaWYgYW5kIHNhdmVzIGl0IGFzIHRoZSBnaXZlbiBmaWxlbmFtZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge3N0cmluZ30gIGZuYW1lIFRoZSBmaWxlbmFtZSB0byBzYXZlIGFzXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBBIHByb21pc2UgZm9yIHdoZW4gdGhlIHZpZGVvIGZpbmlzaGVzIGVuY29kaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGVuY29kZTogZnVuY3Rpb24gKGZuYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxKGZ1bmN0aW9uIChyZXNvbHZlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmVuY29kZXIgPT09ICdnaWYnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5fZW5jb2RlR2lmKHJlc29sdmUsIGZuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZWxmLmVuY29kZXIgPT09ICd3ZWJtJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2VuY29kZVdlYm0ocmVzb2x2ZSwgZm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW52YWxpZCBlbmNvZGVyIGZvcm1hdFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdjb3JyZWxhdGlvbkNvbnRyb2xDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgJGFsZXJ0LFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc2lnbWFTZXJ2aWNlLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGFuYWx5emVTZXJ2aWNlLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICBsZWFmbGV0RGF0YSxcbiAgICAgICAgTCxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXG4gICAgICAgICAgICBtYXAgPSB7fSxcbiAgICAgICAgICAgIGJhbmRzID0gXy5jbG9uZURlZXAoc2lnbWFDb25maWcuYmFuZHMpLFxuICAgICAgICAgICAgc2VsZWN0ZWRCYW5kID0gcXMuYmFuZCA/IF8uZmluZChiYW5kcywge25hbWU6IHFzLmJhbmR9KSA6IF8uZmluZChiYW5kcywge2RlZmF1bHQ6IHRydWV9KSxcbiAgICAgICAgICAgIG1hcEZlYXR1cmVHcm91cCA9IHN0YXRlU2VydmljZS5nZXRNYXBGZWF0dXJlR3JvdXAoKSxcbiAgICAgICAgICAgIGVhc3lCdXR0b24gPSBudWxsLFxuICAgICAgICAgICAgZWRpdE1vZGUgPSAnJztcblxuICAgICAgICB2bS5tb2RlID0gJHNjb3BlLiRwYXJlbnQubW9kZTtcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5tYXJrZXJUaXRsZSA9IGJhbmRzLmxlbmd0aCA+IDEgPyAnQ29ycmVsYXRpb24gLSAnICsgc2VsZWN0ZWRCYW5kLnRpdGxlIDogJ0NvcnJlbGF0aW9uJztcblxuICAgICAgICBMLkRyYXcuQ29ycmVsYXRpb24gPSBMLkRyYXcuTWFya2VyLmV4dGVuZCh7XG4gICAgICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAobWFwLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50eXBlID0gJ2NvcnJlbGF0aW9uJztcbiAgICAgICAgICAgICAgICBvcHRpb25zLnJlcGVhdE1vZGUgPSBzaWdtYUNvbmZpZy5jb3JyZWxhdGlvbk1hcmtlck9wdGlvbnMucmVwZWF0TW9kZTtcbiAgICAgICAgICAgICAgICBMLkRyYXcuRmVhdHVyZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG1hcCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhZGRIb29rczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEwuRHJhdy5NYXJrZXIucHJvdG90eXBlLmFkZEhvb2tzLmNhbGwodGhpcyk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fbWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3Rvb2x0aXAudXBkYXRlQ29udGVudCh7IHRleHQ6ICdDbGljayBtYXAgdG8gY29ycmVsYXRlIHBvaW50JyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBncmVlbk1hcmtlciA9IEwuaWNvbih7XG4gICAgICAgICAgICBpY29uVXJsOiAnLi9zdHlsZXNoZWV0cy9pbWFnZXMvbWFya2VyLWljb24tZ3JlZW4ucG5nJyxcbiAgICAgICAgICAgIHNoYWRvd1VybDogJy4vc3R5bGVzaGVldHMvaW1hZ2VzL21hcmtlci1zaGFkb3cucG5nJyxcbiAgICAgICAgICAgIGljb25BbmNob3I6IFsxMiwgNDFdXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZtLmNvcnJlbGF0ZVBvaW50ID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGJsb2NrVUkuc3RhcnQoJ0NvcnJlbGF0aW5nIFBvaW50Jyk7XG5cbiAgICAgICAgICAgIHZhciB0aW1lID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgICAgICB2YXIgc3RhcnQgPSB0aW1lLnN0YXJ0LFxuICAgICAgICAgICAgICAgIHN0b3AgPSB0aW1lLnN0b3AsXG4gICAgICAgICAgICAgICAgbGF0bG5nID0gZS5sYXllci5nZXRMYXRMbmcoKSxcbiAgICAgICAgICAgICAgICBiYm94ID0gc3RhdGVTZXJ2aWNlLmdldEJib3goKSxcbiAgICAgICAgICAgICAgICBmcmFtZUV4dGVudHMgPSBzdGF0ZVNlcnZpY2UuZ2V0RnJhbWVFeHRlbnRzKCksXG4gICAgICAgICAgICAgICAgYmFuZCA9IHN0YXRlU2VydmljZS5nZXRCYW5kKCksXG4gICAgICAgICAgICAgICAgaW1hZ2VRdWFsaXR5ID0gc3RhdGVTZXJ2aWNlLmdldEltYWdlUXVhbGl0eSgpO1xuXG4gICAgICAgICAgICBhbmFseXplU2VydmljZS5jb3JyZWxhdGVQb2ludChsYXRsbmcubGF0LCBsYXRsbmcubG5nLCBzdGFydCwgc3RvcCwgJ3BuZycpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHZhciBjb3JyZWxhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBzdG9wOiBzdG9wLFxuICAgICAgICAgICAgICAgICAgICBsYXRsbmc6IGxhdGxuZyxcbiAgICAgICAgICAgICAgICAgICAgYmJveDogYmJveCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogcmVzdWx0LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIGZyYW1lRXh0ZW50czogZnJhbWVFeHRlbnRzLFxuICAgICAgICAgICAgICAgICAgICBiYW5kOiBiYW5kLFxuICAgICAgICAgICAgICAgICAgICBpbWFnZVF1YWxpdHk6IGltYWdlUXVhbGl0eVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldENvcnJlbGF0aW9uRGF0YShjb3JyZWxhdGlvbik7XG4gICAgICAgICAgICAgICAgYmxvY2tVSS5zdG9wKCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBibG9ja1VJLnJlc2V0KCk7XG4gICAgICAgICAgICAgICAgc2lnbWFTZXJ2aWNlLnNob3dFcnJvcihlcnJvciwgJ2RhbmdlcicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBtYXAgPSBkYXRhO1xuICAgICAgICAgICAgICAgIHZhciBtYXJrZXIgPSBuZXcgTC5EcmF3LkNvcnJlbGF0aW9uKG1hcCwgeyBpY29uOiBncmVlbk1hcmtlciB9KTtcblxuICAgICAgICAgICAgICAgIGVhc3lCdXR0b24gPSBMLmVhc3lCdXR0b24oJzxpIGNsYXNzPVwiZmEgZmEtbWFwLW1hcmtlciBjb3JyZWxhdGlvbi1jb250cm9sXCI+PC9pPicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLmVuYWJsZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGVhc3lCdXR0b24uYWRkVG8obWFwKTtcblxuICAgICAgICAgICAgICAgIG1hcC5vbignZHJhdzpjcmVhdGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUubGF5ZXJUeXBlID09PSAnY29ycmVsYXRpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXIgPSBlLmxheWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJib3ggPSBzdGF0ZVNlcnZpY2UuZ2V0QmJveCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3ID0gTC5sYXRMbmcoYmJveC5zb3V0aCwgYmJveC53ZXN0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZSA9IEwubGF0TG5nKGJib3gubm9ydGgsIGJib3guZWFzdCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gTC5sYXRMbmdCb3VuZHMoc3csIG5lKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIG1hcmtlciB3YXMgcGxhY2VkIGluc2lkZSBBT0lcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChib3VuZHMuY29udGFpbnMoZS5sYXllci5nZXRMYXRMbmcoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBGZWF0dXJlR3JvdXAuYWRkTGF5ZXIobGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uY29ycmVsYXRlUG9pbnQoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uY29ycmVsYXRlUG9pbnQoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTWFya2VyIG11c3QgYmUgcGxhY2VkIHdpdGhpbiBBT0knLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBtYXAub24oJ2RyYXc6ZGVsZXRlc3RhcnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGVkaXRNb2RlID0gJ2RlbGV0ZSc7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBtYXAub24oJ2RyYXc6ZGVsZXRlc3RvcCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZWRpdE1vZGUgPSAnJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChzaWdtYUNvbmZpZy5jb21wb25lbnRzLm1hcC5jb250cm9scy5jb3JyZWxhdGlvbiAmJiB2bS5tb2RlID09PSAnYW5hbHl6ZScpIHtcbiAgICAgICAgICAgIHZtLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0UXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXMgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFZpZXdNb2RlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLm1vZGUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGlmIChzaWdtYUNvbmZpZy5jb21wb25lbnRzLm1hcC5jb250cm9scy5jb3JyZWxhdGlvbiAmJiB2bS5tb2RlID09PSAnYW5hbHl6ZScpIHtcbiAgICAgICAgICAgICAgICB2bS5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChlYXN5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhc3lCdXR0b24ucmVtb3ZlRnJvbShtYXApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hQ29ycmVsYXRpb25Db250cm9sJywgZnVuY3Rpb24gKCR0b29sdGlwLCBsZWFmbGV0RGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdjb3JyZWxhdGlvbkNvbnRyb2xDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYnRuID0gYW5ndWxhci5lbGVtZW50KCcuY29ycmVsYXRpb24tY29udHJvbCcpLnBhcmVudCgpLnBhcmVudCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChidG4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkdG9vbHRpcChidG4sIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogc2NvcGUudm0ubWFya2VyVGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnYXV0byByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdwb2ludENvbnZlcnRlckNvbnRyb2xDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRhbGVydCxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBzaWdtYVNlcnZpY2UsXG4gICAgICAgIGFuYWx5emVTZXJ2aWNlLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICBsZWFmbGV0RGF0YSxcbiAgICAgICAgTCxcbiAgICAgICAgbG9jYWxTdG9yYWdlLFxuICAgICAgICBfLFxuICAgICAgICBNb3VzZUV2ZW50XG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKSxcbiAgICAgICAgICAgIG1hcCA9IHt9LFxuICAgICAgICAgICAgYmFuZHMgPSBfLmNsb25lRGVlcChzaWdtYUNvbmZpZy5iYW5kcyksXG4gICAgICAgICAgICBzZWxlY3RlZEJhbmQgPSBxcy5iYW5kID8gXy5maW5kKGJhbmRzLCB7bmFtZTogcXMuYmFuZH0pIDogXy5maW5kKGJhbmRzLCB7ZGVmYXVsdDogdHJ1ZX0pLFxuICAgICAgICAgICAgaW5jbHVkZU11bHRpYmFuZCA9IGJhbmRzLmxlbmd0aCA+IDEsXG4gICAgICAgICAgICBtYXBGZWF0dXJlR3JvdXAgPSBzdGF0ZVNlcnZpY2UuZ2V0TWFwRmVhdHVyZUdyb3VwKCksXG4gICAgICAgICAgICBlZGl0TW9kZSA9ICcnLFxuICAgICAgICAgICAgcmVjZW50UG9pbnRzID0gW10sXG4gICAgICAgICAgICBiYXJBcnJheSA9IFtdLFxuICAgICAgICAgICAgZWFzeUJhciA9IHt9O1xuXG4gICAgICAgIHZtLm1vZGUgPSAkc2NvcGUuJHBhcmVudC5tb2RlO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLm1hcmtlclRpdGxlID0gYmFuZHMubGVuZ3RoID4gMSA/ICdQb2ludCBDb252ZXJ0ZXIgLSAnICsgc2VsZWN0ZWRCYW5kLnRpdGxlIDogJ1BvaW50IENvbnZlcnRlcic7XG5cbiAgICAgICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBwb2ludCBjb252ZXJ0ZXIgZGF0YVxuICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgncmVjZW50UG9pbnRzJyk7XG5cbiAgICAgICAgLy8gc2V0IGljb24gaW1hZ2VwYXRoXG4gICAgICAgIEwuSWNvbi5EZWZhdWx0LmltYWdlUGF0aCA9ICcuL3N0eWxlc2hlZXRzL2ltYWdlcy8nO1xuXG4gICAgICAgIC8vIHNpbmdsZSBiYW5kIGNvbnRyb2xcbiAgICAgICAgTC5EcmF3LlBvaW50Y29udmVydGVyID0gTC5EcmF3Lk1hcmtlci5leHRlbmQoe1xuICAgICAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG1hcCwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHRoaXMudHlwZSA9ICdwb2ludGNvbnZlcnRlcic7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5yZXBlYXRNb2RlID0gc2lnbWFDb25maWcucG9pbnRjb252ZXJ0ZXJNYXJrZXJPcHRpb25zLnJlcGVhdE1vZGU7XG4gICAgICAgICAgICAgICAgTC5EcmF3LkZlYXR1cmUucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBtYXAsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgYWRkSG9va3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBMLkRyYXcuTWFya2VyLnByb3RvdHlwZS5hZGRIb29rcy5jYWxsKHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX21hcCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl90b29sdGlwLnVwZGF0ZUNvbnRlbnQoeyB0ZXh0OiAnQ2xpY2sgbWFwIHRvIGFuYWx5emUgdGltZS9pbnRlbnNpdHknIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gbXVsdGliYW5kIGNvbnRyb2xcbiAgICAgICAgdmFyIHJlZE1hcmtlciA9IEwuaWNvbih7XG4gICAgICAgICAgICBpY29uVXJsOiAnLi9zdHlsZXNoZWV0cy9pbWFnZXMvbWFya2VyLWljb24tcmVkLnBuZycsXG4gICAgICAgICAgICBzaGFkb3dVcmw6ICcuL3N0eWxlc2hlZXRzL2ltYWdlcy9tYXJrZXItc2hhZG93LnBuZycsXG4gICAgICAgICAgICBpY29uQW5jaG9yOiBbMTIsIDQxXVxuICAgICAgICB9KTtcblxuICAgICAgICBMLkRyYXcuUG9pbnRjb252ZXJ0ZXJNdWx0aWJhbmQgPSBMLkRyYXcuTWFya2VyLmV4dGVuZCh7XG4gICAgICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAobWFwLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50eXBlID0gJ3BvaW50Y29udmVydGVyLW11bHRpYmFuZCc7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5yZXBlYXRNb2RlID0gc2lnbWFDb25maWcucG9pbnRjb252ZXJ0ZXJNYXJrZXJPcHRpb25zLnJlcGVhdE1vZGU7XG4gICAgICAgICAgICAgICAgTC5EcmF3LkZlYXR1cmUucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBtYXAsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgYWRkSG9va3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBMLkRyYXcuTWFya2VyLnByb3RvdHlwZS5hZGRIb29rcy5jYWxsKHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX21hcCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl90b29sdGlwLnVwZGF0ZUNvbnRlbnQoe3RleHQ6ICdDbGljayBtYXAgdG8gYW5hbHl6ZSB0aW1lL2ludGVuc2l0eSBhY3Jvc3MgYWxsIGJhbmRzJ30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdm0uYW5hbHl6ZUN1YmUgPSBmdW5jdGlvbiAoZSwgaXNNdWx0aWJhbmQpIHtcbiAgICAgICAgICAgIGJsb2NrVUkuc3RhcnQoJ0FuYWx5emluZyBEYXRhJyk7XG5cbiAgICAgICAgICAgIHZhciB0aW1lID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgc3RhcnQgPSB0aW1lLnN0YXJ0LFxuICAgICAgICAgICAgICAgIHN0b3AgPSB0aW1lLnN0b3AsXG4gICAgICAgICAgICAgICAgbGF0bG5nID0gZS5sYXllci5nZXRMYXRMbmcoKSxcbiAgICAgICAgICAgICAgICBiYW5kID0gaXNNdWx0aWJhbmQgPyAnYWxsJyA6IHNlbGVjdGVkQmFuZC5uYW1lLFxuICAgICAgICAgICAgICAgIHNlbnNvciA9IHN0YXRlU2VydmljZS5nZXRTZW5zb3IoKTtcblxuICAgICAgICAgICAgYW5hbHl6ZVNlcnZpY2UuY29udmVydFBvaW50KGxhdGxuZy5sYXQsIGxhdGxuZy5sbmcsIHN0YXJ0LCBzdG9wLCBiYW5kLCBzZW5zb3IpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHJlY2VudFBvaW50cy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogcmVzdWx0LFxuICAgICAgICAgICAgICAgICAgICBmcmFtZUV4dGVudHM6IHN0YXRlU2VydmljZS5nZXRGcmFtZUV4dGVudHMoKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyZWNlbnRQb2ludHMnLCBKU09OLnN0cmluZ2lmeShyZWNlbnRQb2ludHMpKTtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UG9pbnRDb252ZXJ0ZXJEYXRhKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgYmxvY2tVSS5zdG9wKCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBibG9ja1VJLnJlc2V0KCk7XG4gICAgICAgICAgICAgICAgc2lnbWFTZXJ2aWNlLnNob3dFcnJvcihlcnJvciwgJ2RhbmdlcicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0ucGxhY2VNYXJrZXIgPSBmdW5jdGlvbiAoZSwgaXNNdWx0aWJhbmQpIHtcbiAgICAgICAgICAgIHZhciBsYXllciA9IGUubGF5ZXIsXG4gICAgICAgICAgICAgICAgYmJveCA9IHN0YXRlU2VydmljZS5nZXRCYm94KCksXG4gICAgICAgICAgICAgICAgYm91bmRzID0gTC5sYXRMbmdCb3VuZHMoc2lnbWFTZXJ2aWNlLmdldEREQm91bmRzKGJib3gpKTtcblxuICAgICAgICAgICAgLy8gbWFrZSBzdXJlIG1hcmtlciB3YXMgcGxhY2VkIGluc2lkZSBBT0lcbiAgICAgICAgICAgIGlmIChib3VuZHMuY29udGFpbnMoZS5sYXllci5nZXRMYXRMbmcoKSkpIHtcbiAgICAgICAgICAgICAgICBtYXBGZWF0dXJlR3JvdXAuYWRkTGF5ZXIobGF5ZXIpO1xuICAgICAgICAgICAgICAgIGxheWVyLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlZGl0TW9kZSAhPT0gJ2RlbGV0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNob3cgdGltZS9pbnRlbnNpdHkgZGF0YSBmb3IgdGhpcyBwb2ludFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBvaW50ID0gXy5maW5kKHJlY2VudFBvaW50cywgJ2RhdGEucG9pbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBlLmxhdGxuZy5sYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9uOiBlLmxhdGxuZy5sbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnQuZGF0YS5zb3VyY2VFdmVudCA9IG5ldyBNb3VzZUV2ZW50KCdjbGljaycsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3ZpZXcnOiB3aW5kb3csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdidWJibGVzJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NhbmNlbGFibGUnOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRQb2ludENvbnZlcnRlckRhdGEocG9pbnQuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2bS5hbmFseXplQ3ViZShlLCBpc011bHRpYmFuZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTWFya2VyIEVycm9yJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogJ01hcmtlciBtdXN0IGJlIHBsYWNlZCB3aXRoaW4gQU9JJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcidcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5pbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIG1hcCA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIG1hcmtlciA9IG5ldyBMLkRyYXcuUG9pbnRjb252ZXJ0ZXIobWFwLCB7fSksXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlck11bHRpYmFuZCA9IG5ldyBMLkRyYXcuUG9pbnRjb252ZXJ0ZXJNdWx0aWJhbmQobWFwLCB7IGljb246IHJlZE1hcmtlciB9KTtcblxuICAgICAgICAgICAgICAgIHZhciBidG5TaW5nbGVCYW5kID0gTC5lYXN5QnV0dG9uKCc8aSBjbGFzcz1cImZhIGZhLW1hcC1tYXJrZXIgcG9pbnRjb252ZXJ0ZXItY29udHJvbFwiPjwvaT4nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5lbmFibGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHZhciBidG5NdWx0aWJhbmQgPSBMLmVhc3lCdXR0b24oJzxpIGNsYXNzPVwiZmEgZmEtbWFwLW1hcmtlciBwb2ludGNvbnZlcnRlci1jb250cm9sLW11bHRpYmFuZFwiPjwvaT4nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlck11bHRpYmFuZC5lbmFibGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGJhckFycmF5ID0gaW5jbHVkZU11bHRpYmFuZCA/IFtidG5TaW5nbGVCYW5kLCBidG5NdWx0aWJhbmRdIDogW2J0blNpbmdsZUJhbmRdO1xuXG4gICAgICAgICAgICAgICAgZWFzeUJhciA9IEwuZWFzeUJhcihiYXJBcnJheSk7XG4gICAgICAgICAgICAgICAgZWFzeUJhci5hZGRUbyhtYXApO1xuXG4gICAgICAgICAgICAgICAgbWFwLm9uKCdkcmF3OmNyZWF0ZWQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZS5sYXllclR5cGUgPT09ICdwb2ludGNvbnZlcnRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnBsYWNlTWFya2VyKGUsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlLmxheWVyVHlwZSA9PT0gJ3BvaW50Y29udmVydGVyLW11bHRpYmFuZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnBsYWNlTWFya2VyKGUsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBtYXAub24oJ2RyYXc6ZGVsZXRlc3RhcnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGVkaXRNb2RlID0gJ2RlbGV0ZSc7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBtYXAub24oJ2RyYXc6ZGVsZXRlc3RvcCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZWRpdE1vZGUgPSAnJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChzaWdtYUNvbmZpZy5jb21wb25lbnRzLm1hcC5jb250cm9scy5wb2ludGNvbnZlcnRlciAmJiB2bS5tb2RlID09PSAnYW5hbHl6ZScpIHtcbiAgICAgICAgICAgIHZtLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0UXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXMgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFZpZXdNb2RlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLm1vZGUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGlmIChzaWdtYUNvbmZpZy5jb21wb25lbnRzLm1hcC5jb250cm9scy5wb2ludGNvbnZlcnRlciAmJiB2bS5tb2RlID09PSAnYW5hbHl6ZScpIHtcbiAgICAgICAgICAgICAgICB2bS5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChiYXJBcnJheS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhc3lCYXIucmVtb3ZlRnJvbShtYXApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hUG9pbnRDb252ZXJ0ZXJDb250cm9sJywgZnVuY3Rpb24gKCR0b29sdGlwLCBsZWFmbGV0RGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdwb2ludENvbnZlcnRlckNvbnRyb2xDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgaW5jbHVkZU11bHRpYmFuZDogJz0nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwb2ludEJ0biA9IGFuZ3VsYXIuZWxlbWVudCgnLnBvaW50Y29udmVydGVyLWNvbnRyb2wnKS5wYXJlbnQoKS5wYXJlbnQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhbmRCdG4gPSBhbmd1bGFyLmVsZW1lbnQoJy5wb2ludGNvbnZlcnRlci1jb250cm9sLW11bHRpYmFuZCcpLnBhcmVudCgpLnBhcmVudCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChwb2ludEJ0bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0b29sdGlwKHBvaW50QnRuLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHNjb3BlLnZtLm1hcmtlclRpbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnYXV0byByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGJhbmRCdG4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkdG9vbHRpcChiYW5kQnRuLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdQb2ludCBDb252ZXJ0ZXIgLSBBbGwgQmFuZHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2F1dG8gcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogJ2JvZHknXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcigncmVjdGFuZ2xlQ29udHJvbENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJHRpbWVvdXQsXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIHNpZ21hU2VydmljZSxcbiAgICAgICAgY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLFxuICAgICAgICBhbmFseXplU2VydmljZSxcbiAgICAgICAgYmxvY2tVSSxcbiAgICAgICAgbGVhZmxldERhdGEsXG4gICAgICAgIEwsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIGVhc3lCdXR0b24gPSBudWxsLFxuICAgICAgICAgICAgbWFwRmVhdHVyZUdyb3VwID0gc3RhdGVTZXJ2aWNlLmdldE1hcEZlYXR1cmVHcm91cCgpLFxuICAgICAgICAgICAgZWRpdE1vZGUgPSAnJyxcbiAgICAgICAgICAgIGN1cnJNYXAgPSB7fTtcblxuICAgICAgICB2YXIgY2xlYXJSZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHJlY3RMYXllciA9IF8uZmluZChtYXBGZWF0dXJlR3JvdXAuZ2V0TGF5ZXJzKCksIHsgb3B0aW9uczogeyBuYW1lOiAncmVjdCcgfX0pO1xuICAgICAgICAgICAgaWYgKHJlY3RMYXllcikge1xuICAgICAgICAgICAgICAgIG1hcEZlYXR1cmVHcm91cC5yZW1vdmVMYXllcihyZWN0TGF5ZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcblxuICAgICAgICB2bS5yZWRyYXdSZWN0ID0gZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gICAgICAgICAgICBpZiAobWFwRmVhdHVyZUdyb3VwKSB7XG4gICAgICAgICAgICAgICAgLy8gZXJhc2UgZXhpc3RpbmcgYmJveCBpZiBuZWNlc3NhcnlcbiAgICAgICAgICAgICAgICBjbGVhclJlY3QoKTtcbiAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uLm5vcnRoIHx8IGxvY2F0aW9uLm1ncnNORSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJvdW5kcyA9IHNpZ21hU2VydmljZS5nZXREREJvdW5kcyhsb2NhdGlvbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhIHJlY3RhbmdsZVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlY3QgPSBMLnJlY3RhbmdsZShib3VuZHMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJyMwMDAwZmYnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw6ICcjMDAwMGZmJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxsT3BhY2l0eTogJHNjb3BlLiRwYXJlbnQubW9kZSA9PT0gJ3NlYXJjaCcgPyAwLjI1IDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZWlnaHQ6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3JlY3QnXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwRmVhdHVyZUdyb3VwLmFkZExheWVyKHJlY3QpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB6b29tIHRoZSBtYXAgdG8gdGhlIHJlY3RhbmdsZSBib3VuZHNcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3Vyck1hcCAmJiBib3VuZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3Vyck1hcC5maXRCb3VuZHMoYm91bmRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uIChtYXApIHtcbiAgICAgICAgICAgICAgICBjdXJyTWFwID0gbWFwO1xuXG4gICAgICAgICAgICAgICAgdmFyIHJlY3RhbmdsZSA9IG5ldyBMLkRyYXcuUmVjdGFuZ2xlKG1hcCk7XG5cbiAgICAgICAgICAgICAgICBlYXN5QnV0dG9uID0gTC5lYXN5QnV0dG9uKCc8aSBjbGFzcz1cImZhIGZhLXN0b3AgcmVjdGFuZ2xlLWNvbnRyb2xcIj48L2k+JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZWN0YW5nbGUuZW5hYmxlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS4kcGFyZW50Lm1vZGUgPT09ICdzZWFyY2gnKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhc3lCdXR0b24uYWRkVG8obWFwKTtcblxuICAgICAgICAgICAgICAgICAgICBtYXAub24oJ2RyYXc6Y3JlYXRlZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXIgPSBlLmxheWVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUubGF5ZXJUeXBlID09PSAncmVjdGFuZ2xlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVyYXNlIGV4aXN0aW5nIGZlYXR1cmUgZ3JvdXAgbGF5ZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hcEZlYXR1cmVHcm91cCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBGZWF0dXJlR3JvdXAuY2xlYXJMYXllcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLmNsZWFyQU9JKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBib3VuZHMgPSBsYXllci5nZXRCb3VuZHMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmJveFBhcmFtcyh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogJ2RkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9ydGg6IGJvdW5kcy5fbm9ydGhFYXN0LmxhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWFzdDogYm91bmRzLl9ub3J0aEVhc3QubG5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3V0aDogYm91bmRzLl9zb3V0aFdlc3QubGF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZXN0OiBib3VuZHMuX3NvdXRoV2VzdC5sbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnNORTogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnNTVzogJydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgbWFwLm9uKCdkcmF3OmVkaXRlZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLiRwYXJlbnQubW9kZSA9PT0gJ3NlYXJjaCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXIgPSBlLmxheWVycy5nZXRMYXllcnMoKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYm91bmRzID0gbGF5ZXIuZ2V0Qm91bmRzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJib3hQYXJhbXMoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6ICdkZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vcnRoOiBib3VuZHMuX25vcnRoRWFzdC5sYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVhc3Q6IGJvdW5kcy5fbm9ydGhFYXN0LmxuZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291dGg6IGJvdW5kcy5fc291dGhXZXN0LmxhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2VzdDogYm91bmRzLl9zb3V0aFdlc3QubG5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzTkU6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzU1c6ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIG1hcC5vbignZHJhdzpkZWxldGVzdGFydCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRNb2RlID0gJ2RlbGV0ZSc7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIG1hcC5vbignZHJhdzpkZWxldGVzdG9wJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRpdE1vZGUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgbWFwLm9uKCdkcmF3OmRlbGV0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBlcmFzZSBleGlzdGluZyBiYm94IGlmIG5lY2Vzc2FyeVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJSZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2UuY2xlYXJBT0koKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGJiID0gc3RhdGVTZXJ2aWNlLmdldEJib3goKTtcbiAgICAgICAgICAgICAgICB2bS5yZWRyYXdSZWN0KGJiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHNpZ21hQ29uZmlnLmNvbXBvbmVudHMubWFwLmNvbnRyb2xzLnJlY3RhbmdsZSkge1xuICAgICAgICAgICAgdm0uaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJib3goKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZtLnJlZHJhd1JlY3QobmV3VmFsdWUpO1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRWaWV3TW9kZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgYmIgPSBzdGF0ZVNlcnZpY2UuZ2V0QmJveCgpO1xuICAgICAgICAgICAgdm0ucmVkcmF3UmVjdChiYik7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgPT09ICdhbmFseXplJykge1xuICAgICAgICAgICAgICAgIGlmIChlYXN5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhc3lCdXR0b24ucmVtb3ZlRnJvbShjdXJyTWFwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5ld1ZhbHVlID09PSAnc2VhcmNoJykge1xuICAgICAgICAgICAgICAgIGlmIChlYXN5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhc3lCdXR0b24uYWRkVG8oY3Vyck1hcCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFSZWN0YW5nbGVDb250cm9sJywgZnVuY3Rpb24gKCR0b29sdGlwLCBsZWFmbGV0RGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdyZWN0YW5nbGVDb250cm9sQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge30sXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBidG4gPSBhbmd1bGFyLmVsZW1lbnQoJy5yZWN0YW5nbGUtY29udHJvbCcpLnBhcmVudCgpLnBhcmVudCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChidG4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkdG9vbHRpcChidG4sIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FPSScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnYXV0byByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb25maWcoZnVuY3Rpb24oJHByb3ZpZGUpe1xuICAgICAgICAkcHJvdmlkZS5kZWNvcmF0b3IoJyRodHRwQmFja2VuZCcsIGFuZ3VsYXIubW9jay5lMmUuJGh0dHBCYWNrZW5kRGVjb3JhdG9yKTtcbiAgICB9KS5ydW4oZnVuY3Rpb24oJGh0dHBCYWNrZW5kLCBkMywgc2lnbWFDb25maWcsIF8sIFhNTEh0dHBSZXF1ZXN0KXtcblxuICAgICAgICB2YXIgZ2V0U3luYyA9IGZ1bmN0aW9uKHVybCl7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgcmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcbiAgICAgICAgICAgIHJlcXVlc3Quc2VuZChudWxsKTtcbiAgICAgICAgICAgIHJldHVybiBbcmVxdWVzdC5zdGF0dXMsIHJlcXVlc3QucmVzcG9uc2UsIHt9XTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY292ZXJhZ2VPdmVycmlkZVVybCA9ICdtb2Nrcy9kYXRhL2NvdmVyYWdlLmpzb24nO1xuICAgICAgICB2YXIgcG9pbnRBbmFseXNpc1VybCA9ICdtb2Nrcy9kYXRhL3BvaW50Q29udmVydGVyLmpzb24nO1xuICAgICAgICB2YXIgYWdncmVnYXRlRGF5VXJsID0gJ21vY2tzL2RhdGEvYWdncmVnYXRlX2RheS5qc29uJztcbiAgICAgICAgdmFyIGFnZ3JlZ2F0ZUhvdXJVcmwgPSAnbW9ja3MvZGF0YS9hZ2dyZWdhdGVfaG91ci5qc29uJztcbiAgICAgICAgdmFyIG92ZXJsYXlVcmwgPSAnbW9ja3MvZGF0YS9vdmVybGF5Lmpzb24nO1xuXG4gICAgICAgIHZhciBhZ2dyZWdhdGVSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgc2lnbWFDb25maWcudXJscy5hZ2dyZWdhdGUsICdpJyk7XG4gICAgICAgIHZhciBjb3ZlcmFnZVJlZ2V4ID0gbmV3IFJlZ0V4cCgnXicgKyBzaWdtYUNvbmZpZy51cmxzLmNvdmVyYWdlLCAnaScpO1xuICAgICAgICB2YXIgb3ZlcmxheXNSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgc2lnbWFDb25maWcudXJscy5vdmVybGF5cywgJ2knKTtcbiAgICAgICAgdmFyIHBvaW50QW5hbHlzaXNSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgc2lnbWFDb25maWcudXJscy5wb2ludGNvbnZlcnRlciwgJ2knKTtcbiAgICAgICAgdmFyIGNvcnJlbGF0ZVJlZ2V4ID0gbmV3IFJlZ0V4cCgnXicgKyBzaWdtYUNvbmZpZy51cmxzLmNvcnJlbGF0ZSwgJ2knKTtcbiAgICAgICAgdmFyIGFwcFN0YXRlUmVnZXggPSBuZXcgUmVnRXhwKCdeJyArIHNpZ21hQ29uZmlnLnVybHMuYXBwU3RhdGUsICdpJyk7XG5cbiAgICAgICAgc2lnbWFDb25maWcub3ZlcmxheVByZWZpeCA9ICdodHRwOi8vMTI3LjAuMC4xOjMwMDAvJztcblxuICAgICAgICAvLyBUZW1wbGF0ZXMgcmVxdWVzdHMgbXVzdCBwYXNzIHRocm91Z2hcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQoL2h0bWwkLykucGFzc1Rocm91Z2goKTtcblxuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVChhcHBTdGF0ZVJlZ2V4KS5wYXNzVGhyb3VnaCgpO1xuICAgICAgICAkaHR0cEJhY2tlbmQud2hlblBPU1QoYXBwU3RhdGVSZWdleCkucGFzc1Rocm91Z2goKTtcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5QVVQoYXBwU3RhdGVSZWdleCkucGFzc1Rocm91Z2goKTtcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5ERUxFVEUoYXBwU3RhdGVSZWdleCkucGFzc1Rocm91Z2goKTtcblxuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVChjb3JyZWxhdGVSZWdleCkucmVzcG9uZChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gWzQwMCwgSlNPTi5zdHJpbmdpZnkoWydTb21ldGhpbmcgd2VudCB3cm9uZyddKSwge30sICdCYWQgUmVxdWVzdCddO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZ2dyZWdhdGUgc2VydmljZVxuICAgICAgICAvLyRodHRwQmFja2VuZC53aGVuR0VUKGFnZ3JlZ2F0ZVJlZ2V4KS5wYXNzVGhyb3VnaCgpO1xuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVChhZ2dyZWdhdGVSZWdleCkucmVzcG9uZChmdW5jdGlvbihtZXRob2QsIHVybCkge1xuICAgICAgICAgICAgaWYodXJsLmluZGV4T2YoJ2dyb3VwX2J5PWRheScpID4gLTEgKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0U3luYyhhZ2dyZWdhdGVEYXlVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGdldFN5bmMoYWdncmVnYXRlSG91clVybCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGNvdmVyYWdlIHNlcnZpY2VcbiAgICAgICAgLy8kaHR0cEJhY2tlbmQud2hlbkdFVChjb3ZlcmFnZVJlZ2V4KS5wYXNzVGhyb3VnaCgpO1xuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVChjb3ZlcmFnZVJlZ2V4KS5yZXNwb25kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTeW5jKGNvdmVyYWdlT3ZlcnJpZGVVcmwpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBvdmVybGF5cyBzZXJ2aWNlXG4gICAgICAgIC8vJGh0dHBCYWNrZW5kLndoZW5HRVQob3ZlcmxheXNSZWdleCkucGFzc1Rocm91Z2goKTtcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQob3ZlcmxheXNSZWdleCkucmVzcG9uZChmdW5jdGlvbiAobWV0aG9kLCB1cmwpIHtcbiAgICAgICAgICAgIHZhciB1cmxQYXJhbXMgPSBfLmZyb21QYWlycyhfLm1hcCh1cmwuc3BsaXQoJz8nKVsxXS5zcGxpdCgnJicpLCBmdW5jdGlvbiAocykgeyByZXR1cm4gcy5zcGxpdCgnPScpOyB9KSk7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgcmVxdWVzdC5vcGVuKCdHRVQnLCBvdmVybGF5VXJsLCBmYWxzZSk7XG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQobnVsbCk7XG4gICAgICAgICAgICB2YXIgb3ZlcmxheXMgPSBKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgICAgICAgb3ZlcmxheXMubiA9IHBhcnNlSW50KHVybFBhcmFtcy5uKTtcbiAgICAgICAgICAgIG92ZXJsYXlzLnMgPSBwYXJzZUludCh1cmxQYXJhbXMucyk7XG4gICAgICAgICAgICBvdmVybGF5cy5lID0gcGFyc2VJbnQodXJsUGFyYW1zLmUpO1xuICAgICAgICAgICAgb3ZlcmxheXMudyA9IHBhcnNlSW50KHVybFBhcmFtcy53KTtcbiAgICAgICAgICAgIG92ZXJsYXlzLnN0YXJ0ID0gdXJsUGFyYW1zLnN0YXJ0O1xuICAgICAgICAgICAgb3ZlcmxheXMuc3RvcCA9IHVybFBhcmFtcy5zdG9wO1xuICAgICAgICAgICAgcmV0dXJuIFsyMDAsIEpTT04uc3RyaW5naWZ5KG92ZXJsYXlzKSwge31dO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBwb2ludCBhbmFseXNpcyBzZXJ2aWNlXG4gICAgICAgIC8vJGh0dHBCYWNrZW5kLndoZW5HRVQocG9pbnRBbmFseXNpc1JlZ2V4KS5wYXNzVGhyb3VnaCgpO1xuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVChwb2ludEFuYWx5c2lzUmVnZXgpLnJlc3BvbmQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFN5bmMocG9pbnRBbmFseXNpc1VybCk7XG4gICAgICAgIH0pO1xuXG5cbiAgICB9KTtcbn0pKCk7XG4iXX0=
