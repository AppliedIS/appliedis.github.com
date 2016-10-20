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
        'ngFileSaver'
    ]);

    app.config(['$routeProvider', '$provide', 'blockUIConfig', function ($routeProvider, $provide, blockUIConfig) {
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

        blockUIConfig.message = 'Loading';
        blockUIConfig.template = '<div class="block-ui-overlay"></div><div class="block-ui-message-container"><div class="block-ui-message"><div class="block-ui-message-text">{{ state.message }}</div><div class="block-ui-message-animation"><three-bounce-spinner></three-bounce-spinner></div></div></div>';
    }])
    .value('moment', window.moment)
    .value('_', window._)
    .value('L', window.L)
    .value('d3', window.d3)
    .value('$', window.$)
    .value('toastr', window.toastr)
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
    .value('GIF', window.GIF);



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
                    title: 'Min'
                },
                {
                    name: 'max',
                    title: 'Max'
                },
                {
                    name: 'mean',
                    title: 'Mean'
                },
                // {
                //     name: 'median',
                //     title: 'Median'
                // },
                {
                    name: 'stdev',
                    title: 'Standard Deviation'
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
                goto: true
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
                sharpen: {
                    enabled: true,
                    max: 3,
                    units: ''
                },
                blur: {
                    enabled: true,
                    name: 'Gaussian blur',
                    max: 25,
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
                grayscale: {
                    enabled: false
                },
                invert: {
                    enabled: true
                },
                sepia: {
                    enabled: true
                },
                noise: {
                    enabled: false
                }
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
                id: 0,
                name: 'all',
                title: 'All',
                default: true
              },
              {
                id: 1,
                name: 'sensor1',
                title: 'Sensor One',
                default: false
              },
              {
                id: 2,
                name: 'sensor2',
                title: 'Sensor Two',
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
                invertFilter = new PIXI.filters.InvertFilter(),
                grayFilter = new PIXI.filters.GrayFilter(),
                sepiaFilter = new PIXI.filters.SepiaFilter(),
                noiseFilter = new PIXI.filters.NoiseFilter(),
                //contrastFilter = new PIXI.filters.ColorMatrixFilter(),
                brightnessFilter = new PIXI.filters.ColorMatrixFilter(),
                hueFilter = new PIXI.filters.ColorMatrixFilter(),
                saturationFilter = new PIXI.filters.ColorMatrixFilter(),
                sharpenMatrix = [ 0, -1,  0, -1,  5, -1, 0, -1,  0 ],
                blurFilter = new PIXI.filters.BloomFilter(),
                filtersToApply;

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

            if (_cioInstance.invert > 0) {
                invertFilter.invert = parseFloat(_cioInstance.invert) / 100;
                filtersToApply.push(invertFilter);
            }

            if (_cioInstance.grayscale > 0) {
                grayFilter.gray = parseFloat(_cioInstance.grayscale) / 100;
                filtersToApply.push(grayFilter);
            }

            if (_cioInstance.sepia > 0) {
                sepiaFilter.sepia = parseFloat(_cioInstance.sepia) / 100;
                filtersToApply.push(sepiaFilter);
            }

            if (_cioInstance.noise > 0) {
                noiseFilter.noise = parseFloat(_cioInstance.noise) / 100;
                filtersToApply.push(noiseFilter);
            }

            // TODO this doesn't work
            // replaced with CSS property on entire canvas instead
            /*if (_cioInstance.contrast) {
             contrastFilter.contrast(parseFloat(_cioInstance.contrast));
             filtersToApply.push(contrastFilter);
             }*/
            if (_cioInstance.layer) {
                angular.element(_cioInstance.layer.canvas())
                    .css('-webkit-filter', 'contrast(' + _cioInstance.contrast + '%)')
                    .css('filter', 'contrast(' + _cioInstance.contrast + '%)');
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
                blurFilter.blur = parseFloat(_cioInstance.blur);
                filtersToApply.push(blurFilter);
            }

            _.forEach(_.range(_cioInstance.sharpen), function () {
                filtersToApply.push(
                    new PIXI.filters.ConvolutionFilter(
                        sharpenMatrix,
                        params.stage.width,
                        params.stage.height
                    )
                );
            });

            // add all filters to the stage and render
            params.stage.filters = filtersToApply.length ? filtersToApply : null;
            params.renderer.render(params.stage);
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

            initialize: function () {
                var self = this;
                // leaflet map is returned from a promise
                leafletData.getMap().then(function (map) {
                    self.layer = L.pixiOverlay()
                        .drawing(_render)
                        .addTo(map)
                        .bringToBack();
                });
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

    angular.module('sigma').service('analyzeService', ['$q', '$http', 'sigmaConfig', 'stateService', 'sigmaService', function (
        $q,
        $http,
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

        // Only use sensor id param if a particular sensor is selected, set to null if "All" is selected
        var getSensorParam = function (sensor) {
          return sensor >= 1 ? sensor : null;
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
                sensor: sensor
            };

            return params;
        };

        var getAoiParams = function (start, stop, location, type, band, returntype, imageQuality, sensor) {
            var params = {
                start: start,
                stop: stop,
                type: type,
                band: band,
                returntype: returntype,
                imagequality: imageQuality,
                sensor: sensor
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
                sensor: sensor
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

            analyzeAoi: function (type, returntype) {
                var location = stateService.getBbox(),
                    time = stateService.getTemporalFilter(),
                    url = sigmaConfig.urls.aoianalysis,
                    band = stateService.getBand(),
                    imageQuality = stateService.getImageQuality(),
                    sensor = stateService.getSensor(),
                    params = getAoiParams(time.start, time.stop, location, type, band, returntype, imageQuality, sensor),
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
                    var location = stateService.getMapBounds(),
                        time = stateService.getTemporalFilter(),
                        url = sigmaConfig.urls.coverage,
                        band = stateService.getBand();

                    location.north = Math.ceil(location.north);
                    location.east = Math.ceil(location.east);
                    location.south = Math.floor(location.south);
                    location.west = Math.floor(location.west);

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

    angular.module('sigma').service('sigmaService', ['coordinateConversionService', function (coordinateConversionService) {
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
            }
        };
    }]);
})();
(function () {
    'use strict';

    angular.module('sigma').service('stateService', ['$location', '$rootScope', 'sigmaConfig', 'CanvasImageOverlay', 'moment', 'localStorage', '_', function (
        $location,
        $rootScope,
        sigmaConfig,
        CanvasImageOverlay,
        moment,
        localStorage,
        _
    ) {
        var queryString = $location.search();

        var bbox = {},
            bboxFeatureGroup = {},
            markerFeatureGroup = {},
            locationFormat = queryString.locationFormat,
            playbackState = '',
            playbackDirection = '',
            playbackInterval = _.findWhere(sigmaConfig.playbackIntervals, { default: true }),
            playbackIntervalQty = sigmaConfig.defaultPlaybackIntervalQty,
            playbackSpeed = sigmaConfig.maxPlaybackDelay,
            playbackOpacity = sigmaConfig.defaultLayerOpacity,
            frameIndexes = [],
            frameCurrent = 0,
            frameExtents = {},
            frameOverlays = [],
            timeSliderExtents = {},
            brushExtents = {},
            brushReset = false,
            enableCoverage = queryString.enableCoverage,
            coverageOpacity = queryString.coverageOpacity,
            coverageData,
            map = {},
            mapMode = 'default',
            viewMode = 'search',
            temporalFilter = {
                start: queryString.start,
                stop: queryString.stop,
                duration: queryString.duration,
                durationLength: queryString.durationLength
            },
            timeSliderData = {},
            timeSliderFrequency = null, // init to null so $watch event will detect a change
            pointConverterData,
            correlationData,
            preloadedImages = [],
            baselayer = null,
            contrastLevel = _.findWhere(sigmaConfig.contrastLevels, { default: true }),
            spatialZoom = '',
            temporalZoom = '',
            band = queryString.band,
            viewportSize = {},
            canvasImageOverlay = new CanvasImageOverlay(),
            imageQuality = sigmaConfig.defaultImageQuality,
            sensor = queryString.sensor;

        if (queryString.n || queryString.ne) {
            bbox = {
                format: locationFormat,
                north: locationFormat === 'dd' ? parseFloat(queryString.n) : queryString.n,
                south: locationFormat === 'dd' ? parseFloat(queryString.s) : queryString.s,
                east: locationFormat === 'dd' ? parseFloat(queryString.e) : queryString.e,
                west: locationFormat === 'dd' ? parseFloat(queryString.w) : queryString.w,
                mgrsNE: queryString.ne || '',
                mgrsSW: queryString.sw || ''
            };
        }

        if (queryString.start && queryString.stop) {
            timeSliderExtents = {
                start: moment.utc(queryString.start).toDate(),
                stop: moment.utc(queryString.stop).toDate()
            };
        }

        return {
            setTimeParams: function (timeParams) {
                return timeParams;
            },
            setBboxParams: function (location) {
                if (!location.format) {
                    location.format = sigmaConfig.defaultLocationFormat;
                    this.setLocationFormat(location.format);
                }
                // if anything change, update $location.search() and broadcast notification of change
                if (queryString.n !== location.north.toString() || queryString.s !== location.south.toString() || queryString.e !== location.east.toString() || queryString.w !== location.west.toString() || queryString.locationFormat !== location.format || queryString.ne !== location.mgrsNE.toString() || queryString.sw !== location.mgrsSW.toString()) {
                    if (location.north !== '' && location.south !== '' && location.east !== '' && location.west !== '' && location.format === 'dd') {
                        location.north = parseFloat(location.north).toFixed(2);
                        location.south = parseFloat(location.south).toFixed(2);
                        location.east = parseFloat(location.east).toFixed(2);
                        location.west = parseFloat(location.west).toFixed(2);
                    }
                    this.setBbox(location);
                    queryString.n = location.north === '' ? null : location.north;
                    queryString.s = location.south === '' ? null : location.south;
                    queryString.e = location.east === '' ? null : location.east;
                    queryString.w = location.west === '' ? null : location.west;
                    queryString.locationFormat = location.format === '' ? null : location.format;
                    queryString.ne = location.mgrsNE === '' ? null : location.mgrsNE;
                    queryString.sw = location.mgrsSW === '' ? null : location.mgrsSW;
                    this.setLocationFormat(queryString.locationFormat);
                    $location.search(queryString);
                }
                if (!$rootScope.$$phase) {
                    $rootScope.$apply();
                }
            },
            getBbox: function () {
                return bbox;
            },
            setBbox: function (val) {
                bbox = val;
            },
            getBboxFeatureGroup: function () {
                return bboxFeatureGroup;
            },
            setBboxFeatureGroup: function (featureGroup) {
                bboxFeatureGroup = featureGroup;
            },
            getMarkerFeatureGroup: function () {
                return markerFeatureGroup;
            },
            setMarkerFeatureGroup: function (featureGroup) {
                markerFeatureGroup = featureGroup;
            },
            getLocationFormat: function () {
                return locationFormat;
            },
            setLocationFormat: function (format) {
                locationFormat = format;
                queryString.locationFormat = locationFormat;
                $location.search(queryString);
            },
            getPlaybackState: function () {
                return playbackState;
            },
            setPlaybackState: function (state) {
                playbackState = state;
            },
            getPlaybackDirection: function () {
                return playbackDirection;
            },
            setPlaybackDirection: function (direction) {
                playbackDirection = direction;
            },
            getPlaybackInterval: function () {
                return playbackInterval;
            },
            setPlaybackInterval: function (interval) {
                playbackInterval = interval;
            },
            getPlaybackIntervalQty: function () {
                return playbackIntervalQty;
            },
            setPlaybackIntervalQty: function (qty) {
                playbackIntervalQty = qty;
            },
            getPlaybackSpeed: function () {
                return playbackSpeed;
            },
            setPlaybackSpeed: function (speed) {
                playbackSpeed = speed;
            },
            getPlaybackOpacity: function () {
                return playbackOpacity;
            },
            setPlaybackOpacity: function (opacity) {
                playbackOpacity = opacity;
            },
            getFrameIndexes: function () {
                return frameIndexes;
            },
            setFrameIndexes: function (indexes) {
                frameIndexes = indexes;
            },
            getFrameCurrent: function () {
                return frameCurrent;
            },
            setFrameCurrent: function (frame) {
                frameCurrent = frame;
            },
            getFrameExtents: function () {
                return frameExtents;
            },
            setFrameExtents: function (start, stop) {
                frameExtents = {
                    start: start,
                    stop: stop
                };
            },
            getFrameOverlays: function () {
                return frameOverlays;
            },
            setFrameOverlays: function (overlays) {
                frameOverlays = overlays;
            },
            getTimeSliderExtents: function () {
                return timeSliderExtents;
            },
            setTimeSliderExtents: function (start, stop) {
                timeSliderExtents = {
                    start: start,
                    stop: stop
                };
            },
            getBrushExtents: function () {
                return brushExtents;
            },
            setBrushExtents: function (start, stop) {
                brushExtents = {
                    start: start,
                    stop: stop
                };
            },
            getBrushReset: function () {
                return brushReset;
            },
            setBrushReset: function () {
                brushReset = !brushReset;
            },
            setEnableCoverage: function (value) {
                enableCoverage = value;
                if (enableCoverage !== null) {
                    queryString.enableCoverage = enableCoverage ? enableCoverage.toString() : sigmaConfig.defaultEnableCoverage.toString();
                    $location.search(queryString);
                }
            },
            getEnableCoverage: function () {
                return enableCoverage;
            },
            setCoverageOpacity: function (value) {
                coverageOpacity = value;
                queryString.coverageOpacity = coverageOpacity;
                $location.search(queryString);
            },
            getCoverageOpacity: function () {
                return coverageOpacity;
            },
            setCoverage: function (value) {
                coverageData = value;
            },
            getCoverage: function () {
                return coverageData;
            },
            getMap: function () {
                return map;
            },
            setMap: function (mapInstance) {
                map = mapInstance;
            },
            setMapMode: function (mode) {
                mapMode = mode;
                console.log('map mode set to ' + mode);
            },
            getMapMode: function () {
                return mapMode;
            },
            getViewMode: function () {
                return viewMode;
            },
            setViewMode: function (mode) {
                viewMode = mode;
            },
            getMapBounds: function () {
                if (map.getBounds) {
                    var bounds = map.getBounds();
                    if (bounds) {

                        var location = {
                            north: bounds._northEast.lat,
                            south: bounds._southWest.lat,
                            east: bounds._northEast.lng,
                            west: bounds._southWest.lng
                        };
                        return location;
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
            getTimeSliderData: function () {
                return timeSliderData;
            },
            setTimeSliderData: function (data) {
                timeSliderData = data;
            },
            getTimeSliderFrequency: function () {
                return timeSliderFrequency;
            },
            setTimeSliderFrequency: function (frequency) {
                timeSliderFrequency = frequency;
            },
            getPreloadedImages: function () {
                return preloadedImages;
            },
            setPreloadedImages: function (images) {
                preloadedImages = images;
            },
            getPointConverterData: function () {
                return pointConverterData;
            },
            setPointConverterData: function (data) {
                pointConverterData = data;
            },
            getCorrelationData: function () {
                return correlationData;
            },
            setCorrelationData: function (data) {
                if (!data) {
                    localStorage.removeItem('recentCorrelations');
                }
                correlationData = data;
            },
            getBaselayer: function () {
                return baselayer;
            },
            setBaselayer: function (layer) {
                baselayer = layer;
                queryString.baselayer = baselayer.id;
                $location.search(queryString);
            },
            getContrastLevel: function () {
                return contrastLevel;
            },
            setContrastLevel: function (level) {
                contrastLevel = level;
            },
            getSpatialZoom: function () {
                return spatialZoom;
            },
            setSpatialZoom: function (zoom) {
                spatialZoom = zoom;
            },
            getTemporalZoom: function () {
                return temporalZoom;
            },
            setTemporalZoom: function (zoom) {
                temporalZoom = zoom;
            },
            getBand: function () {
                return band;
            },
            setBand: function (value) {
                band = value;
                queryString.band = band;
                $location.search(queryString);
            },
            getViewportSize: function () {
                return viewportSize;
            },
            setViewportSize: function (size) {
                viewportSize = size;
            },
            getCanvasImageOverlay: function () {
                return canvasImageOverlay;
            },
            setCanvasImageOverlay: function (data) {
                canvasImageOverlay = data;
            },
            getImageQuality: function () {
                return imageQuality;
            },
            setImageQuality: function (data) {
                imageQuality = data;
            },
            getSensor: function () {
                return sensor;
            },
            setSensor: function (value) {
                sensor = value;
                queryString.sensor = sensor;
                $location.search(queryString);
            }
        };

    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('analyzeController', ['$scope', '$q', 'sigmaConfig', 'stateService', 'analyzeService', 'blockUI', 'moment', 'd3', '_', 'toastr', function (
        $scope,
        $q,
        sigmaConfig,
        stateService,
        analyzeService,
        blockUI, 
        moment,
        d3,
        _,
        toastr
    ) {
        stateService.setViewMode('analyze');

        var temporalFilter = stateService.getTemporalFilter();

        $scope.start = temporalFilter.start;
        $scope.stop = temporalFilter.stop;

        var generateFrequency = function (timeline) {
            // determine the number of hours between time extents
            var frequency = [],
                numHours = moment.utc(temporalFilter.stop).diff(moment.utc(temporalFilter.start), 'h') + 1;

            // add 0 values for every hour that has no value in timeline
            for (var i = 0; i < numHours; i++) {
                var time = moment.utc(temporalFilter.start).startOf('h').add(i, 'h').toISOString(),
                    count = _.findWhere(timeline, { time: time });

                frequency.push({
                    time: time,
                    count: count ? count.count : 0
                });
            }

            return frequency;
        };

        var initialize = function () {
            // create canvas layer
            var canvasImageOverlay = stateService.getCanvasImageOverlay();
            canvasImageOverlay.initialize();
            
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
                    _.forEach(_.pairs(counts), function (count) {
                        timeline.push({
                            time: moment.utc(count[0]).toISOString(),
                            count: count[1]
                        });
                    });

                    // sort by date asc
                    timeline = _.sortBy(timeline, ['time'], ['asc']);

                    frequency = generateFrequency(timeline);

                    if (_.max(frequency) === 0 || _.max(frequency) === '-Infinity') {
                        toastr.info('No features available at this location during specified time interval', 'Coverage Information');
                    }

                    // update stateService
                    stateService.setTimeSliderFrequency(frequency);
                    stateService.setTimeSliderData(data);

                    blockUI.stop();
                } else {
                    frequency = generateFrequency([]);
                    stateService.setTimeSliderFrequency(frequency);
                    toastr.info('No features available at this location during specified time interval', 'Coverage Information');
                    blockUI.stop();
                }
            }, function (error) {
                frequency = generateFrequency([]);
                stateService.setTimeSliderFrequency(frequency);
                blockUI.stop();
                console.log(error);
                toastr.error('Unable to retrieve AOI metadata.', 'Communication Error');
            });
        };

        initialize();

        // clear coverage and enableCoverage so the $watch statements in searchController will observe the value change
        stateService.setCoverage([]);
        stateService.setEnableCoverage(null);
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('searchController', ['$scope', 'sigmaConfig', 'searchService', 'stateService', 'blockUI', '_', 'moment', 'toastr', function (
        $scope,
        sigmaConfig,
        searchService,
        stateService,
        blockUI,
        _,
        moment,
        toastr
    ) {
        var enableCoverage = sigmaConfig.defaultEnableCoverage;

        $scope.coverageData = [];
        $scope.stateService = stateService;

        var updateCoverage = function () {
            return searchService.getCoverage().then(function (data) {
                    stateService.setCoverage(data.data.results);
                }, function (error) {
                    console.log(error);
                    toastr.warning('Unable to load coverage data', 'Communications Error');
                }
            );
        };

        var generateFrequency = function (timeline) {
            var frequency = [],
                timeSliderExtents = stateService.getTimeSliderExtents();

            // determine the number of days between time extents
            var numDays = moment.utc(timeSliderExtents.stop).diff(moment.utc(timeSliderExtents.start), 'd') + 1;

            // add 0 values for every day that has no value in timeline
            for (var i = 0; i < numDays; i++) {
                var time = moment.utc(timeSliderExtents.start).startOf('d').add(i, 'd').toISOString(),
                    count = _.findWhere(timeline, { time: time });

                frequency.push({
                    time: time,
                    count: count ? count.count : 0
                });
            }

            return frequency;
        };

        var getCollectCountsByDay = function () {
            blockUI.start('Loading Collect Counts');
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

                var frequency = generateFrequency(timeline);

                if (_.max(frequency) === 0 || _.max(frequency) === '-Infinity') {
                    toastr.info('No features available at this location', 'Coverage Information');
                }

                // publish changes to stateService
                stateService.setTimeSliderFrequency(frequency);

                blockUI.stop();
            }, function (error) {
                console.log(error);
                var frequency = generateFrequency([]);
                stateService.setTimeSliderFrequency(frequency);
                blockUI.stop();
                toastr.warning('Unable to retrieve collect counts', 'Communications Error');
            });
        };

        $scope.$watchCollection('stateService.getMapBounds()', _.debounce(function (newValue, oldValue) {
            if (_.keys(newValue).length > 0) {
                if (angular.equals(newValue, oldValue)) {
                    return;
                }
                if (enableCoverage) {
                    updateCoverage()
                        .then(getCollectCountsByDay);
                }
            }
        }, sigmaConfig.debounceTime));

        $scope.$watchCollection('stateService.getTemporalFilter()', _.debounce(function (newValue, oldValue) {
            if (_.keys(newValue).length > 0) {
                if (angular.equals(newValue, oldValue)) {
                    return;
                }
                if (enableCoverage) {
                    updateCoverage()
                        .then(getCollectCountsByDay);
                } else {
                    var frequency = generateFrequency([]);
                    stateService.setTimeSliderFrequency(frequency);
                }
            }
        }, sigmaConfig.debounceTime));

        $scope.$watch('stateService.getBand()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if (enableCoverage) {
                updateCoverage()
                    .then(getCollectCountsByDay);
            }
        });

        $scope.$watch('stateService.getEnableCoverage()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            enableCoverage = newValue;

            if (enableCoverage) {
                updateCoverage()
                    .then(getCollectCountsByDay);
            } else {
                var frequency = generateFrequency([]);
                stateService.setTimeSliderFrequency(frequency);
            }
        });

        $scope.$watch('stateService.getSensor()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            if (enableCoverage) {
                updateCoverage()
                    .then(getCollectCountsByDay);
            }
        });
    }]);
})();

(function () {
    'use strict';

    angular.module('sigma').controller('aoiAnalysisController', ['$scope', '$modal', 'sigmaConfig', 'stateService', 'analyzeService', 'blockUI', 'toastr', 'L', 'moment', function (
        $scope,
        $modal,
        sigmaConfig,
        stateService,
        analyzeService,
        blockUI,
        toastr,
        L,
        moment
    ) {
        var vm = this,
            map = stateService.getMap(),
            bbox = stateService.getBbox(),
            analysisOverlay = {},
            band = stateService.getBand();

        vm.sigmaConfig = sigmaConfig;
        vm.stateService = stateService;
        vm.aoiAnalysisValues = sigmaConfig.aoiAnalysisValues;
        vm.selectedAnalysis = {};
        vm.geotiffLink = '';

        var analysisModal = $modal({scope: $scope, templateUrl: 'analysisModal.html', show: false, animation: 'am-fade-and-scale'}),
            analysisImage = document.createElement('img');

        vm.analyzeAoi = function (value) {
            vm.selectedAnalysis = value.title;
            blockUI.start('Analyzing AOI');
            analyzeService.analyzeAoi(value.name, 'base64').then(function (result) {
                analysisImage.setAttribute('class', 'img-responsive');
                analysisImage.src = 'data:image/png;base64,' + result.data.replace(/(\r\n|\n|\r)/gm, '');
                blockUI.stop();

                // set up geotiff link
                var time = stateService.getTemporalFilter(),
                    params = {
                        start: moment.utc(time.start).toISOString(),
                        stop: moment.utc(time.stop).toISOString(),
                        type: value.name,
                        n: bbox.north,
                        e: bbox.east,
                        s: bbox.south,
                        w: bbox.west,
                        imageQuality: stateService.getImageQuality()
                    };

                vm.geotiffLink = sigmaConfig.urls.aoianalysis + '?start=' + params.start + '&stop=' + params.stop + '&type=' + params.type + '&n=' + params.n + '&e=' + params.e + '&s=' + params.s + '&w=' + params.w + '&band=' + band + '&returntype=geotiff&imagequality=' + params.imageQuality;

                // set up modal
                var sw = L.latLng(bbox.south, bbox.west),
                    ne = L.latLng(bbox.north, bbox.east),
                    bounds = L.latLngBounds(sw, ne);

                analysisOverlay = L.imageOverlay(analysisImage.src, bounds);
                console.log(map);
                //analysisOverlay.addTo(map)._bringToBack();
                analysisModal.$promise.then(function () {
                    analysisModal.show();
                    document.getElementById('analysisImage').appendChild(analysisImage);
                });
            }, function (error) {
                blockUI.reset();
                console.log(error);
                toastr.error(error, 'AOI Analysis Error');
            });
        };
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

        vm.expanded = $scope.expanded;
        vm.mode = $scope.mode;
        vm.bands = _.cloneDeep(sigmaConfig.bands);
        vm.selectedBand = qs.band ? _.findWhere(vm.bands, {name: qs.band}) : _.findWhere(vm.bands, {default: true});

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
                expanded: '=',
                mode: '@'
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
        vm.geotiffLink = '';
        vm.geotiffFilename = '';

        var analysisModal = $modal({scope: $scope, templateUrl: 'correlationAnalysisModal.html', show: false, animation: 'am-fade-and-scale'}),
            analysisImage = document.createElement('img'),
            bbox = stateService.getBbox(),
            band = stateService.getBand(),
            imageQuality = stateService.getImageQuality();

        $scope.$watchCollection('vm.stateService.getCorrelationData()', function (newValue) {
            if (newValue && _.keys(newValue).length > 0) {
                vm.correlation = newValue;
                vm.geotiffLink = sigmaConfig.urls.correlate + '?start=' + vm.correlation.start.toISOString() + '&stop=' + vm.correlation.stop.toISOString() + '&n=' + bbox.north + '&e=' + bbox.east + '&s=' + bbox.south + '&w=' + bbox.west + '&lat=' + vm.correlation.latlng.lat + '&lng=' + vm.correlation.latlng.lng + '&band=' + band + '&returntype=geotiff&imagequality=' + imageQuality;
                vm.geotiffFilename = 'sigma-correlation-analysis-' + moment.utc().unix() + '.tif';
                analysisImage.height = '512';
                analysisImage.width = '512';
                analysisImage.src = 'data:image/png;base64,' + vm.correlation.data.replace(/(\r\n|\n|\r)/gm, '');
                analysisModal.$promise.then(function () {
                    analysisModal.show();
                    document.getElementById('analysisImage').appendChild(analysisImage);
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

    angular.module('sigma').controller('frameOverlaysController', ['$scope', 'sigmaConfig', 'stateService', '_', 'toastr', function (
        $scope,
        sigmaConfig,
        stateService,
        _,
        toastr
    ) {
        var vm = this,
            frameIndexes = [],
            canvasImageOverlay = stateService.getCanvasImageOverlay();

        vm.expanded = $scope.expanded;
        vm.stateService = stateService;
        vm.frameOverlays = [];
        vm.playbackState = '';
        vm.contrastLevels = sigmaConfig.contrastLevels;
        vm.selectedContrastLevel = _.findWhere(sigmaConfig.contrastLevels, { default: true });

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
                toastr.error('Unable to retrieve overlay object', 'Overlay Error');
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

    angular.module('sigma').controller('mapController', ['$scope', '$timeout', '$location', 'sigmaConfig', 'analyzeService', 'sigmaService', 'stateService', 'leafletData', 'blockUI', 'toastr', 'L', '_', 'd3', function (
        $scope,
        $timeout,
        $location,
        sigmaConfig,
        analyzeService,
        sigmaService,
        stateService,
        leafletData,
        blockUI,
        toastr,
        L,
        _,
        d3
    ) {
        var vm = this,
            qs = $location.search(),
            enableCoverage = qs.enableCoverage ? qs.enableCoverage : sigmaConfig.defaultEnableCoverage,
            coverageOpacity = stateService.getCoverageOpacity(),
            coverageLayer = new L.LayerGroup(),
            coverageData,
            frameExtents = {},
            bboxFeatureGroup = new L.FeatureGroup(),
            markerFeatureGroup = new L.FeatureGroup();

        vm.mode = $scope.mode;
        vm.mapHeight = '0px';
        vm.center = sigmaConfig.mapCenter;
        vm.stateService = stateService;

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

        // must be a nested object (draw.draw) in order to work with ui-leaflet and leaflet-draw
        vm.controls = {
            draw: {
                draw: {
                    rectangle: false,
                    polyline: false,
                    polygon: false,
                    circle: false,
                    marker: false
                },
                edit: {
                    featureGroup: vm.mode === 'search' ? bboxFeatureGroup : markerFeatureGroup
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
            //console.log('watch.stateService.getCoverage');
            coverageData = newValue;
            console.log('getCoverage');
            if (enableCoverage) {
                vm.drawCoverage();
            }
        });

        $scope.$watchCollection('vm.stateService.getEnableCoverage()', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            enableCoverage = newValue;
            console.log('getEnableCoverage');
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

        vm.initialize = function () {
            stateService.setBboxFeatureGroup(bboxFeatureGroup);
            stateService.setMarkerFeatureGroup(markerFeatureGroup);
            
            leafletData.getMap().then(function (map) {
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

                map.on('baselayerchange', function (e) {
                    var baselayer = _.find(sigmaConfig.layers.baselayers, { name: e.name });
                    stateService.setBaselayer(baselayer);
                });
            });
        };

        vm.initialize();
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
                mode: '@'
            }
        };
    });
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
        vm.mode = $scope.mode;
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
                expanded: '=',
                mode: '@'
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
            sliders = [
                'opacity',
                'brightness',
                'contrast',
                DIVIDER,
                'sharpen',
                'blur',
                DIVIDER,
                'hue',
                'saturation',
                DIVIDER,
                'grayscale',
                'invert',
                'sepia',
                'noise',
            ],
            /**
             * Sets the key of the slider to the sigmaConfig value. If the config
             * value is undefined, the passed in default value is set.
             * @param  {object} slider    A slider object
             * @param  {string} key       The property on slider to set
             * @param  {any}    value     A default value to set, if not on sigmaConfig
             * @param  {string} filterKey The lookup for the imageFilter in sigmaConfig
             */
            setDefault = function (slider, key, value, filterKey) {
                // set the value from the config
                slider[key] = sigmaConfig.imageFilters[filterKey][key];

                // if the value is undefined, set the given default value
                if (! angular.isDefined(slider[key])) {
                    slider[key] = value;
                }
            };


        vm.canvasImageOverlay = stateService.getCanvasImageOverlay();
        vm.sliders = [];


        // loop through order of sliders and create objects to use in the scope
        _.forEach(sliders, function (key) {
            if (key === DIVIDER) {
                // no need to set params for dividers
                vm.sliders.push({
                    isDivider: true
                });
            } else if (sigmaConfig.imageFilters[key].enabled) {
                var slider = {
                        id: key
                    },
                    // create default name based on the key
                    name = key.charAt(0).toUpperCase() + key.slice(1);

                // make sure the values have a default
                setDefault(slider, 'name', name, key);
                setDefault(slider, 'default', 0, key);
                setDefault(slider, 'min', 0, key);
                setDefault(slider, 'max', 100, key);
                setDefault(slider, 'step', 1, key);
                setDefault(slider, 'units', '%', key);

                vm.sliders.push(slider);
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

    angular.module('sigma').controller('playbackController', ['$scope', 'sigmaConfig', 'stateService', 'Overlay', 'videoService', 'd3', '_', 'L', 'moment', 'blockUI', 'toastr', 'hotkeys', 'Image', '$', '$aside', function (
        $scope,
        sigmaConfig,
        stateService,
        Overlay,
        videoService,
        d3,
        _,
        L,
        moment,
        blockUI,
        toastr,
        hotkeys,
        Image,
        $,
        $aside
    ) {
        var vm = this,
            canvasImageOverlay = stateService.getCanvasImageOverlay(),
            overlays = [],
            map = {},
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
            contrastLevel = _.findWhere(sigmaConfig.contrastLevels, { default: true }),
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
                        toastr.error('Error saving video');
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
                toastr.error('Error initializing video recording');
            });
        };

        vm.playbackIntervals = sigmaConfig.playbackIntervals;
        vm.playbackInterval = _.findWhere(sigmaConfig.playbackIntervals, { default: true });
        vm.playbackIntervalQty = sigmaConfig.defaultPlaybackIntervalQty;
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

        canvasImageOverlay.clear();

        // determine the number of frames based on the selected portion of the slider extents
        var calculateNumberOfFrames = function (useIntervalControl) {
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
                    vm.playbackInterval = _.findWhere(sigmaConfig.playbackIntervals, { value: sigmaConfig.minimumFrameDuration.interval });
                } else {
                    vm.playbackIntervalQty = Math.floor(moment.duration(frameDuration, 's').asDays());
                    vm.playbackInterval = _.findWhere(sigmaConfig.playbackIntervals, { value: 'd' });
                }
                if (currPlaybackIntervalQty === vm.playbackIntervalQty && currPlaybackInterval.title === vm.playbackInterval.title) {
                    // playback interval hasn't changed so there is no need for updating the brush or the playback array
                    stateService.setBrushReset();
                    return false;
                }
                stateService.setPlaybackIntervalQty(vm.playbackIntervalQty);
                stateService.setPlaybackInterval(vm.playbackInterval);
            }
            totalSeconds = moment.utc(timeSliderExtentStop).diff(moment.utc(timeSliderExtentStart), 's');
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

            var numFrames = calculateNumberOfFrames(useIntervalControl),
                currStartTime = moment.utc(timeSliderExtentStart).toISOString(),
                currStopTime = moment.utc(currStartTime).add(frameDuration, 's').toISOString(),
                currDetailIdx = 0;

            if (numFrames) {
                // sort images by imagequality descending in preparation for imagequality filtering
                var sortedOverlaysImageQuality = _.sortByOrder(timeSliderData.frame, ['imagequality'], ['desc']);
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
                console.log(actualImageQuality);
                vm.totalImages = sortedOverlaysTime.length;

                // onload callback for each image load event
                var onload = function () {
                    vm.numImagesLoaded++;
                    $scope.$evalAsync();
                };

                var buildFrames = function (frameIdx) {
                    var frame = {
                        start: currStartTime,
                        stop: currStopTime,
                        enabled: true, //eventually the enabled value will come from the service
                        images: []
                    };

                    while (currDetailIdx < sortedOverlaysTime.length && moment.utc(currStopTime).isAfter(moment.utc(sortedOverlaysTime[currDetailIdx].time))) {
                        var overlayData = sortedOverlaysTime[currDetailIdx],
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

                    frameIndexes.push(frame);

                    // set start/stop of next frame
                    currStartTime = moment.utc(currStopTime).toISOString();
                    currStopTime = moment.utc(currStartTime).add(frameDuration, 's').toISOString();

                    if (moment.utc(currStopTime).isAfter(moment.utc(timeSliderExtentStop))) {
                        currStopTime = moment.utc(timeSliderExtentStop).toISOString();
                    }

                    frameIdx++;

                    if (frameIdx < numFrames) {
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
                var frameImages = frameIndexes[frameCurrent].images;
                _.forEach(frameImages, function (overlay) {
                    overlays.push(overlay);
                });

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
            if (parseInt(vm.playbackIntervalQty) < 1) {
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

        $scope.$watch('vm.stateService.getMap()', function (newValue) {
            map = newValue;
        });

        $scope.$watchCollection('vm.stateService.getBrushExtents()', function (newValue, oldValue) {
            if (moment.utc(newValue.start).isSame(moment.utc(oldValue.start)) && moment.utc(newValue.stop).isSame(moment.utc(oldValue.stop))) {
                return;
            }

            brushExtents = {
                start: newValue.start,
                stop: newValue.stop
            };

            doPlayback();
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
            stateService.setImageQuality(newValue);
            updatePlaybackArray();
        }, 750));

        $scope.$watch('vm.playbackWithGaps', function (newValue, oldValue) {
            if (angular.equals(newValue, oldValue)) {
                return;
            }
            updatePlaybackArray();
        });

        $scope.$watch('vm.stateService.getTimeSliderData()', _.debounce(function (newValue) {
            if (_.keys(newValue).length > 0) {
                if (newValue.frame) {
                    timeSliderData = newValue;
                    getTimeSliderExtents();
                    $scope.$apply();
                } else {
                    console.error('Images not preloaded');
                }
            }
        }, sigmaConfig.debounceTime));

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
                    checkForAOI = _.findWhere(vm.recentAOIs, { search: $location.search() });

                var aoiTemporalFilter = {
                    start: moment.utc(temporalFilter.start).toDate(),
                    stop: moment.utc(temporalFilter.stop).toDate(),
                    duration: temporalFilter.duration ? temporalFilter.duration : null,
                    durationLength: temporalFilter.durationLength ? temporalFilter.durationLength : null
                };

                if (!checkForAOI) {
                    // only add unique AOIs
                    var search = $location.search(),
                        qs = _.pairs(search),
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
                        pointConverterData = _.sortByOrder(vm.pointConverterData.collects, 'time'),
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
                            xFormat: '%Y-%m-%dT%H:%M:%S', // 2014-08-01T16:16:07
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

    angular.module('sigma').controller('radialController', ['$scope', 'sigmaConfig', 'stateService', 'searchService', 'blockUI', 'radialBarChart', 'd3', '_', 'moment', function (
        $scope,
        sigmaConfig,
        stateService,
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

        vm.initRadial = function () {
            vm.blocker.start('Radial');
            $scope.$watchCollection('vm.stateService.getMapBounds()', _.debounce(function (newValue) {
                if (_.keys(newValue).length > 0) {
                    if (vm.enableCoverage) {
                        searchService.getCollectCountsByHour().then(function (result) {
                            collectData = result.data.results;
                            drawChart();
                            vm.radialReady = true;
                            vm.blocker.stop();
                        }, function(error){
                            vm.error = error;
                            console.log(error);
                            vm.blocker.stop();
                        });
                    }
                }
            }, sigmaConfig.debounceTime));
        };

        $scope.$watch('vm.stateService.getEnableCoverage()', function (newValue) {
            vm.enableCoverage = newValue;
            if (vm.enableCoverage && vm.radialReady) {
                vm.initRadial();
            }
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

        vm.expanded = $scope.expanded;
        vm.mode = $scope.mode;
        vm.sensors = _.cloneDeep(sigmaConfig.sensors);
        vm.selectedSensor = qs.sensor ? _.findWhere(vm.sensors, {id: parseInt(qs.sensor)}) : _.findWhere(vm.sensors, {default: true});

        vm.setSensor = function (value) {
            stateService.setSensor(value.id);
        };

        vm.toggleExpanded = function () {
            vm.expanded = !vm.expanded;
        };

        var initialize = function () {
            vm.setSensor(vm.selectedSensor);
        };

        initialize();
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
                expanded: '=',
                mode: '@'
            }
        };
    });
})();

(function () {
    'use strict';

    angular.module('sigma').controller('sidebarController', ['$scope', '$location', 'sigmaService', 'stateService', 'localStorage', '_', 'sigmaConfig', function (
        $scope,
        $location,
        sigmaService,
        stateService,
        localStorage,
        _,
        sigmaConfig
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
            $location.path('/analyze').search($location.search());
        };

        vm.viewMap = function () {
            stateService.setViewMode('search');
            stateService.setCorrelationData(null);
            $location.path('/').search($location.search());
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
                mode: '@'
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
        vm.mode = $scope.mode;
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

        var initialize = function() {
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
                expanded: '=',
                mode: '@'
            }
        };
    });
})();
(function () {
    'use strict';

    angular.module('sigma').controller('timeSliderController', ['$scope', '$q', 'sigmaConfig', 'stateService', 'blockUI', 'd3', '_', '$', 'moment', function (
        $scope,
        $q,
        sigmaConfig,
        stateService,
        blockUI,
        d3,
        _,
        $,
        moment
    ) {
        var vm = this;

        vm.start = $scope.start;
        vm.stop = $scope.stop;
        vm.mode = $scope.mode;

        var map = {},
            margin = {top: 25, right: 55, bottom: 25, left: 25},
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
            timeSliderExtentStart = vm.start || sigmaConfig.defaultSliderStart.toISOString(),
            timeSliderExtentStop = vm.stop || sigmaConfig.defaultSliderStop.toISOString(),
            playbackState = 'stop',
            playbackSpeed = sigmaConfig.maxPlaybackDelay,
            playbackIntervalQty = sigmaConfig.defaultPlaybackIntervalQty,
            playbackInterval = _.findWhere(sigmaConfig.playbackIntervals, { default: true }),
            temporalFilter = {};

        vm.stateService = stateService;
        vm.sliderReady = false;
        vm.brushState = 'select';
        vm.toggleBrushText = 'Select';
        vm.toggleBrushClass = 'fa fa-crosshairs';

        // set slider extents for use in other controllers
        stateService.setTimeSliderExtents(timeSliderExtentStart, timeSliderExtentStop);

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
                    // send brush extents to stateService so playbackController can iterate the current frame
                    stateService.setBrushExtents(brush.extent()[0], brush.extent()[1]);
                    $scope.$apply();
                }
            } else {
                d3.select('.x.brush').style('pointer-events', 'all');

                if (vm.mode === 'playback') {
                    // d3.event.sourceEvent returns a mouse event if the brush is altered by the user directly
                    if (d3.event.sourceEvent) {
                        stateService.setBrushExtents(brush.extent()[0], brush.extent()[1]);

                        // notify angular of changes
                        $scope.$apply();
                    }
                } else {
                    if (d3.event.sourceEvent) {
                        // values were modified directly by slider, so just set time range
                        stateService.setTemporalFilter({
                            start: moment.utc(brush.extent()[0]).toDate(),
                            stop: moment.utc(brush.extent()[1]).toDate()
                        });

                        // notify angular of changes
                        $scope.$apply();
                    }
                }
            }
        };

        var redrawSliderChart = function () {
            // Update area with new data
            areaPath.transition()
                .duration(500)
                .attr('d', area(timeSliderFrequency));

            // Update the x axis
            context.select('.x.axis')
                .transition()
                .duration(500)
                .call(xAxis)
                .each('end', function () { $scope.$apply(); });

            drawSlider(temporalFilter);
        };

        var mousemove = function () {
            var bisectDate = d3.bisector(function (d) {
                    return moment.utc(d.time).toDate();
                }).left,
                x0 = x.invert(d3.mouse(this)[0]),
                i = bisectDate(timeSliderFrequency, x0, 1),
                d0 = timeSliderFrequency[i - 1],
                d1 = timeSliderFrequency[i];

            if (d0 && d1) {
                var d = d1 ? moment.utc(x0).subtract(d0.time).isAfter(moment.utc(d1.time).subtract(moment.utc(x0))) ? d1 : d0 : d0;

                focus.attr('transform', 'translate(' + (x(moment.utc(d.time).toDate()) + margin.left) + ',' + (y(d.count) + margin.top) + ')');
                focus.select('text').text(moment.utc(moment.utc(d.time).toDate()).format('MM/DD/YYYY') + ': ' + d.count);
            }
        };

        var drawSliderChart = function (isUpdate) {
            isUpdate = isUpdate || false;

            // create arrays of just dates and values in order to set the x and y domains
            xData = _.pluck(timeSliderFrequency, 'time');
            yData = _.pluck(timeSliderFrequency, 'count');

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
            } else {
                drawSlider(temporalFilter);
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
            timeSliderFrequency = newValue;
            drawSliderChart(vm.sliderReady);
            $scope.$apply();
        }, sigmaConfig.debounceTime));

        $scope.$watch('vm.stateService.getMap()', function (newValue) {
            if (newValue) {
                map = newValue;
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
                mode: '@'
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

    angular.module('sigma').controller('correlationControlController', ['$scope', '$location', 'sigmaConfig', 'stateService', 'analyzeService', 'blockUI', 'leafletData', 'L', 'toastr', 'localStorage', '_', 'MouseEvent', function (
        $scope,
        $location,
        sigmaConfig,
        stateService,
        analyzeService,
        blockUI,
        leafletData,
        L,
        toastr,
        localStorage,
        _,
        MouseEvent
    ) {
        var vm = this,
            qs = $location.search(),
            bands = _.cloneDeep(sigmaConfig.bands),
            selectedBand = qs.band ? _.findWhere(bands, {name: qs.band}) : _.findWhere(bands, {default: true}),
            markerFeatureGroup = stateService.getMarkerFeatureGroup(),
            editMode = '',
            recentCorrelations = [];

        vm.stateService = stateService;
        vm.markerTitle = bands.length > 1 ? 'Correlation - ' + selectedBand.title : 'Correlation';

        // remove any existing point converter data
        localStorage.removeItem('recentCorrelations');

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
            var start = time.start;
            var stop = time.stop;
            var latlng = e.layer.getLatLng();

            analyzeService.correlatePoint(latlng.lat, latlng.lng, start, stop, 'base64').then(function (result) {
                var correlation = {
                    start: start,
                    stop: stop,
                    latlng: latlng,
                    bbox: stateService.getBbox(),
                    data: result.data,
                    frameExtents: stateService.getFrameExtents()
                };
                recentCorrelations.unshift(correlation);
                localStorage.setItem('recentCorrelations', JSON.stringify(recentCorrelations));
                stateService.setCorrelationData(correlation);
                blockUI.stop();
            }, function (error) {
                blockUI.reset();
                toastr.error(error, 'API Error');
            });
        };

        vm.initialize = function () {
            leafletData.getMap().then(function (map) {
                var marker = new L.Draw.Correlation(map, { icon: greenMarker });

                markerFeatureGroup.addTo(map);

                L.easyButton('<i class="fa fa-map-marker correlation-control"></i>', function () {
                    marker.enable();
                }).addTo(map);

                map.on('draw:created', function (e) {
                    if (e.layerType === 'correlation') {
                        var layer = e.layer,
                            bbox = stateService.getBbox(),
                            sw = L.latLng(bbox.south, bbox.west),
                            ne = L.latLng(bbox.north, bbox.east),
                            bounds = L.latLngBounds(sw, ne);

                        // make sure marker was placed inside AOI
                        if (bounds.contains(e.layer.getLatLng())) {
                            markerFeatureGroup.addLayer(layer);
                            layer.on('click', function (e) {
                                if (editMode !== 'delete') {
                                    var correlationPoint = _.find(recentCorrelations, 'latlng', {
                                        lat: e.latlng.lat,
                                        lng: e.latlng.lng
                                    });
                                    if (correlationPoint) {
                                        correlationPoint.sourceEvent = new MouseEvent('click', {
                                            'view': window,
                                            'bubbles': true,
                                            'cancelable': false
                                        });
                                        stateService.setCorrelationData(correlationPoint);
                                    }
                                }
                            });
                            vm.correlatePoint(e);
                        } else {
                            toastr.error('Marker must be placed within AOI');
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
        
        if (sigmaConfig.components.map.controls.correlation && $scope.$parent.mode === 'analyze') {
            vm.initialize();
        }
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

    angular.module('sigma').controller('pointConverterControlController', ['$scope', '$location', 'sigmaConfig', 'stateService', 'sigmaService', 'analyzeService', 'blockUI', 'leafletData', 'L', 'toastr', 'localStorage', '_', 'MouseEvent', function (
        $scope,
        $location,
        sigmaConfig,
        stateService,
        sigmaService,
        analyzeService,
        blockUI,
        leafletData,
        L,
        toastr,
        localStorage,
        _,
        MouseEvent
    ) {
        var vm = this,
            qs = $location.search(),
            bands = _.cloneDeep(sigmaConfig.bands),
            selectedBand = qs.band ? _.findWhere(bands, {name: qs.band}) : _.findWhere(bands, {default: true}),
            includeMultiband = bands.length > 1,
            markerFeatureGroup = stateService.getMarkerFeatureGroup(),
            editMode = '',
            recentPoints = [];

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
                toastr.error(error, 'API Error');
            });
        };

        vm.placeMarker = function (e, isMultiband) {
            var layer = e.layer,
                bbox = stateService.getBbox(),
                bounds = L.latLngBounds(sigmaService.getDDBounds(bbox));

            // make sure marker was placed inside AOI
            if (bounds.contains(e.layer.getLatLng())) {
                markerFeatureGroup.addLayer(layer);
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
                toastr.error('Marker must be placed within AOI');
            }
        };

        vm.initialize = function () {
            leafletData.getMap().then(function (map) {
                var marker = new L.Draw.Pointconverter(map, {}),
                    markerMultiband = new L.Draw.PointconverterMultiband(map, { icon: redMarker });

                markerFeatureGroup.addTo(map);

                var btnSingleBand = L.easyButton('<i class="fa fa-map-marker pointconverter-control"></i>', function () {
                    marker.enable();
                });

                var btnMultiband = L.easyButton('<i class="fa fa-map-marker pointconverter-control-multiband"></i>', function () {
                    markerMultiband.enable();
                });

                var barArray = includeMultiband ? [btnSingleBand, btnMultiband] : [btnSingleBand];

                L.easyBar(barArray).addTo(map);

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

        if (sigmaConfig.components.map.controls.pointconverter && $scope.$parent.mode === 'analyze') {
            vm.initialize();
        }
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

    angular.module('sigma').controller('rectangleControlController', ['$scope', '$timeout', 'sigmaConfig', 'stateService', 'sigmaService', 'coordinateConversionService', 'analyzeService', 'blockUI', 'leafletData', 'L', function (
        $scope,
        $timeout,
        sigmaConfig,
        stateService,
        sigmaService,
        coordinateConversionService,
        analyzeService,
        blockUI,
        leafletData,
        L
    ) {
        var vm = this,
            bboxFeatureGroup = stateService.getBboxFeatureGroup(),
            editMode = '',
            currMap = {};

        vm.stateService = stateService;

        vm.redrawRect = function (location) {
            if (bboxFeatureGroup) {
                bboxFeatureGroup.clearLayers();
                if (location) {
                    if (location.north || location.mgrsNE) {
                        var bounds = sigmaService.getDDBounds(location);

                        // create a rectangle
                        var rect = L.rectangle(bounds, {
                            color: '#0000ff',
                            fill: '#0000ff',
                            fillOpacity: $scope.$parent.mode === 'search' ? 0.25 : 0,
                            weight: 1
                        });

                        bboxFeatureGroup.addLayer(rect);
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

                bboxFeatureGroup.addTo(map);
                
                if ($scope.$parent.mode === 'search') {
                    L.easyButton('<i class="fa fa-stop rectangle-control"></i>', function () {
                        rectangle.enable();
                    }).addTo(map);

                    map.on('draw:created', function (e) {
                        var layer = e.layer;
                        if (e.layerType === 'rectangle') {
                            // erase existing bbox if necessary
                            if (bboxFeatureGroup) {
                                bboxFeatureGroup.clearLayers();
                                stateService.clearAOI();
                            }
                            bboxFeatureGroup.addLayer(layer);
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
                        bboxFeatureGroup.clearLayers();
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
    }]).run(['$httpBackend', 'd3', 'sigmaConfig', 'XMLHttpRequest', function($httpBackend, d3, sigmaConfig, XMLHttpRequest){

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

        sigmaConfig.overlayPrefix = '';

        // Templates requests must pass through
        $httpBackend.whenGET(/html$/).passThrough();

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
        $httpBackend.whenGET(coverageRegex).respond(function() {
            return getSync(coverageOverrideUrl);
        });

        // overlays service
        //$httpBackend.whenGET(overlaysRegex).passThrough();
        $httpBackend.whenGET(overlaysRegex).respond(function() {
            return getSync(overlayUrl);
        });

        // point analysis service
        //$httpBackend.whenGET(pointAnalysisRegex).passThrough();
        $httpBackend.whenGET(pointAnalysisRegex).respond(function(){
            return getSync(pointAnalysisUrl);
        });


    }]);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsInNpZ21hQ29uZmlnLmpzIiwibW9kZWxzL0NhbnZhc0ltYWdlT3ZlcmxheS5qcyIsIm1vZGVscy9PdmVybGF5LmpzIiwic2VydmljZXMvYW5hbHl6ZVNlcnZpY2UuanMiLCJzZXJ2aWNlcy9jb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UuanMiLCJzZXJ2aWNlcy9zZWFyY2hTZXJ2aWNlLmpzIiwic2VydmljZXMvc2lnbWFTZXJ2aWNlLmpzIiwic2VydmljZXMvc3RhdGVTZXJ2aWNlLmpzIiwicGFnZXMvYW5hbHl6ZUNvbnRyb2xsZXIuanMiLCJwYWdlcy9zZWFyY2hDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9hb2lBbmFseXNpcy9hb2lBbmFseXNpc0NvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2FvaUFuYWx5c2lzL2FvaUFuYWx5c2lzRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9iYW5kL2JhbmRDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9iYW5kL2JhbmREaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2NvcnJlbGF0aW9uQW5hbHlzaXMvY29ycmVsYXRpb25BbmFseXNpc0NvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2NvcnJlbGF0aW9uQW5hbHlzaXMvY29ycmVsYXRpb25BbmFseXNpc0RpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvY292ZXJhZ2VGaWx0ZXIvY292ZXJhZ2VGaWx0ZXJDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9jb3ZlcmFnZUZpbHRlci9jb3ZlcmFnZUZpbHRlckRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvZnJhbWVPdmVybGF5cy9mcmFtZU92ZXJsYXlzQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZnJhbWVPdmVybGF5cy9mcmFtZU92ZXJsYXlzRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9nb3RvL2dvdG9Db250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9nb3RvL2dvdG9EaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL2xvY2F0aW9uRm9ybWF0L2xvY2F0aW9uRm9ybWF0Q29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvbG9jYXRpb25Gb3JtYXQvbG9jYXRpb25Gb3JtYXREaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL21hcC9tYXBDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9tYXAvbWFwRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9sb2NhdGlvbkZpbHRlci9sb2NhdGlvbkZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL2xvY2F0aW9uRmlsdGVyL2xvY2F0aW9uRmlsdGVyRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9pbWFnZUZpbHRlcnMvaW1hZ2VGaWx0ZXJzQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvcGxheWJhY2svcGxheWJhY2tDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9wbGF5YmFjay9wbGF5YmFja0RpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvcmVjZW50QW9pTGlzdC9yZWNlbnRBb2lMaXN0Q29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvcmVjZW50QW9pTGlzdC9yZWNlbnRBb2lMaXN0RGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9wb2ludENvbnZlcnRlci9wb2ludENvbnZlcnRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3BvaW50Q29udmVydGVyL3BvaW50Q29udmVydGVyRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9yYWRpYWwvcmFkaWFsQmFyQ2hhcnRGYWN0b3J5LmpzIiwiY29tcG9uZW50cy9yYWRpYWwvcmFkaWFsQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvcmFkaWFsL3JhZGlhbERpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvcmVjZW50UG9pbnRzTGlzdC9yZWNlbnRQb2ludHNMaXN0Q29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvcmVjZW50UG9pbnRzTGlzdC9yZWNlbnRQb2ludHNMaXN0RGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9zZW5zb3Ivc2Vuc29yQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvc2Vuc29yL3NlbnNvckRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvc2lkZWJhci9zaWRlYmFyQ29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvc2lkZWJhci9zaWRlYmFyRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy90ZW1wb3JhbEZpbHRlci90ZW1wb3JhbEZpbHRlckNvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL3RlbXBvcmFsRmlsdGVyL3RlbXBvcmFsRmlsdGVyRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy90aW1lU2xpZGVyL3RpbWVTbGlkZXJDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy90aW1lU2xpZGVyL3RpbWVTbGlkZXJEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3ZpZGVvL3ZpZGVvU2VydmljZS5qcyIsImNvbXBvbmVudHMvbWFwL2NvbnRyb2xzL2NvcnJlbGF0aW9uQ29udHJvbENvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL21hcC9jb250cm9scy9jb3JyZWxhdGlvbkNvbnRyb2xEaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL21hcC9jb250cm9scy9wb2ludENvbnZlcnRlckNvbnRyb2xDb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9tYXAvY29udHJvbHMvcG9pbnRDb252ZXJ0ZXJDb250cm9sRGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9tYXAvY29udHJvbHMvcmVjdGFuZ2xlQ29udHJvbENvbnRyb2xsZXIuanMiLCJjb21wb25lbnRzL21hcC9jb250cm9scy9yZWN0YW5nbGVDb250cm9sRGlyZWN0aXZlLmpzIiwiYmFja2VuZFN0dWJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUEsWUFBQTtJQUNBOztJQUVBLElBQUEsTUFBQSxRQUFBLE9BQUEsU0FBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FB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LGFBQUE7WUFDQSxLQUFBLFFBQUEsU0FBQTtZQUNBLEtBQUEsUUFBQSxTQUFBO1lBQ0EsS0FBQSxXQUFBLFlBQUE7WUFDQSxLQUFBLGFBQUEsY0FBQTtZQUNBLEtBQUEsTUFBQSxPQUFBO1lBQ0EsS0FBQSxhQUFBLGNBQUE7WUFDQSxLQUFBLFVBQUEsV0FBQTtZQUNBLEtBQUEsT0FBQSxRQUFBOzs7UUFHQSxJQUFBLGVBQUE7Ozs7Ozs7Ozs7Ozs7UUFhQSxJQUFBLFVBQUEsVUFBQSxjQUFBLFFBQUE7WUFDQSxJQUFBO2dCQUNBO2dCQUNBO2dCQUNBLGVBQUEsSUFBQSxLQUFBLFFBQUE7Z0JBQ0EsYUFBQSxJQUFBLEtBQUEsUUFBQTtnQkFDQSxjQUFBLElBQUEsS0FBQSxRQUFBO2dCQUNBLGNBQUEsSUFBQSxLQUFBLFFBQUE7O2dCQUVBLG1CQUFBLElBQUEsS0FBQSxRQUFBO2dCQUNBLFlBQUEsSUFBQSxLQUFBLFFBQUE7Z0JBQ0EsbUJBQUEsSUFBQSxLQUFBLFFBQUE7Z0JBQ0EsZ0JBQUEsRUFBQSxHQUFBLENBQUEsSUFBQSxHQUFBLENBQUEsSUFBQSxHQUFBLENBQUEsR0FBQSxHQUFBLENBQUEsSUFBQTtnQkFDQSxhQUFBLElBQUEsS0FBQSxRQUFBO2dCQUNBOztZQUVBLEVBQUEsUUFBQSxhQUFBLFFBQUEsVUFBQSxPQUFBLFVBQUE7Z0JBQ0EsRUFBQSxRQUFBLE1BQUEsUUFBQSxVQUFBLFNBQUE7O29CQUVBLFFBQUEsT0FBQSxVQUFBOzs7O29CQUlBLElBQUEsYUFBQSxlQUFBLFlBQUEsUUFBQSxTQUFBOzt3QkFFQSxTQUFBLEVBQUEsYUFBQSxRQUFBO3dCQUNBLFVBQUEsYUFBQSxNQUFBLEtBQUE7NEJBQ0EsT0FBQTs7d0JBRUEsT0FBQSxhQUFBLE1BQUEsS0FBQTs0QkFDQSxPQUFBOzBCQUNBLFVBQUE7Ozt3QkFHQSxRQUFBLE9BQUEsSUFBQSxRQUFBO3dCQUNBLFFBQUEsT0FBQSxJQUFBLFFBQUE7d0JBQ0EsUUFBQSxPQUFBLFFBQUEsS0FBQTt3QkFDQSxRQUFBLE9BQUEsU0FBQSxLQUFBOzs7d0JBR0EsSUFBQSxRQUFBLFNBQUE7NEJBQ0EsUUFBQSxPQUFBLFFBQUEsYUFBQSxVQUFBOzRCQUNBLFFBQUEsT0FBQSxVQUFBOytCQUNBOzRCQUNBLFFBQUEsT0FBQSxVQUFBOzs7Ozs7O1lBT0EsaUJBQUE7O1lBRUEsSUFBQSxhQUFBLFNBQUEsR0FBQTtnQkFDQSxhQUFBLFNBQUEsV0FBQSxhQUFBLFVBQUE7Z0JBQ0EsZUFBQSxLQUFBOzs7WUFHQSxJQUFBLGFBQUEsWUFBQSxHQUFBO2dCQUNBLFdBQUEsT0FBQSxXQUFBLGFBQUEsYUFBQTtnQkFDQSxlQUFBLEtBQUE7OztZQUdBLElBQUEsYUFBQSxRQUFBLEdBQUE7Z0JBQ0EsWUFBQSxRQUFBLFdBQUEsYUFBQSxTQUFBO2dCQUNBLGVBQUEsS0FBQTs7O1lBR0EsSUFBQSxhQUFBLFFBQUEsR0FBQTtnQkFDQSxZQUFBLFFBQUEsV0FBQSxhQUFBLFNBQUE7Z0JBQ0EsZUFBQSxLQUFBOzs7Ozs7Ozs7WUFTQSxJQUFBLGFBQUEsT0FBQTtnQkFDQSxRQUFBLFFBQUEsYUFBQSxNQUFBO3FCQUNBLElBQUEsa0JBQUEsY0FBQSxhQUFBLFdBQUE7cUJBQ0EsSUFBQSxVQUFBLGNBQUEsYUFBQSxXQUFBOzs7WUFHQSxJQUFBLGFBQUEsZUFBQSxLQUFBO2dCQUNBLGlCQUFBLFdBQUEsV0FBQSxhQUFBLGNBQUE7Z0JBQ0EsZUFBQSxLQUFBOzs7WUFHQSxJQUFBLGFBQUEsS0FBQTtnQkFDQSxVQUFBLElBQUEsV0FBQSxhQUFBO2dCQUNBLGVBQUEsS0FBQTs7O1lBR0EsSUFBQSxhQUFBLFlBQUE7Z0JBQ0EsaUJBQUEsU0FBQSxXQUFBLGFBQUEsY0FBQTtnQkFDQSxlQUFBLEtBQUE7OztZQUdBLElBQUEsYUFBQSxNQUFBO2dCQUNBLFdBQUEsT0FBQSxXQUFBLGFBQUE7Z0JBQ0EsZUFBQSxLQUFBOzs7WUFHQSxFQUFBLFFBQUEsRUFBQSxNQUFBLGFBQUEsVUFBQSxZQUFBO2dCQUNBLGVBQUE7b0JBQ0EsSUFBQSxLQUFBLFFBQUE7d0JBQ0E7d0JBQ0EsT0FBQSxNQUFBO3dCQUNBLE9BQUEsTUFBQTs7Ozs7O1lBTUEsT0FBQSxNQUFBLFVBQUEsZUFBQSxTQUFBLGlCQUFBO1lBQ0EsT0FBQSxTQUFBLE9BQUEsT0FBQTs7OztRQUlBLG1CQUFBLFlBQUE7Ozs7Ozs7O1lBUUEsS0FBQSxVQUFBLEtBQUE7Z0JBQ0EsSUFBQSxPQUFBO2dCQUNBLElBQUEsUUFBQSxRQUFBLE1BQUE7b0JBQ0EsS0FBQSxTQUFBOztvQkFFQSxLQUFBLE1BQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUEsS0FBQSxRQUFBLFVBQUEsT0FBQTt3QkFDQSxFQUFBLFFBQUEsTUFBQSxRQUFBLFVBQUEsU0FBQTs0QkFDQSxLQUFBLE1BQUEsUUFBQSxTQUFBLFFBQUE7Ozs7Z0JBSUEsT0FBQTs7Ozs7Ozs7O1lBU0EsS0FBQSxVQUFBLE9BQUE7Z0JBQ0EsSUFBQSxPQUFBO2dCQUNBLElBQUEsUUFBQSxTQUFBLFFBQUE7b0JBQ0EsS0FBQSxPQUFBLEtBQUE7O29CQUVBLEVBQUEsUUFBQSxNQUFBLFFBQUEsVUFBQSxTQUFBO3dCQUNBLEtBQUEsTUFBQSxRQUFBLFNBQUEsUUFBQTs7O2dCQUdBLE9BQUE7Ozs7Ozs7OztZQVNBLEtBQUEsVUFBQSxLQUFBO2dCQUNBLElBQUEsT0FBQTtnQkFDQSxJQUFBLFFBQUEsVUFBQSxNQUFBO29CQUNBLE9BQUEsS0FBQSxPQUFBOztnQkFFQSxPQUFBLEtBQUE7Ozs7Ozs7O1lBUUEsT0FBQSxZQUFBO2dCQUNBLElBQUEsT0FBQTtnQkFDQSxJQUFBLEtBQUEsT0FBQTtvQkFDQSxLQUFBLE1BQUEsUUFBQTs7Z0JBRUEsS0FBQSxTQUFBO2dCQUNBLEtBQUEsYUFBQTtnQkFDQSxLQUFBO2dCQUNBLE9BQUE7Ozs7Ozs7OztZQVNBLFFBQUEsVUFBQSxLQUFBO2dCQUNBLElBQUEsT0FBQTtnQkFDQSxLQUFBLGFBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxPQUFBOzs7Ozs7OztZQVFBLFFBQUEsWUFBQTtnQkFDQSxJQUFBLE9BQUE7Z0JBQ0EsSUFBQSxLQUFBLE9BQUE7b0JBQ0EsS0FBQSxVQUFBLFFBQUE7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QUFBLFNBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsUUFBQSxlQUFBOzs7WUFHQSxJQUFBLFVBQUE7Z0JBQ0EsUUFBQSxPQUFBLFFBQUEsWUFBQTs7O1lBR0EsT0FBQTs7O1FBR0EsSUFBQSwwQkFBQSxVQUFBLE9BQUEsTUFBQSxLQUFBLEtBQUEsTUFBQSxjQUFBLFFBQUE7WUFDQSxJQUFBLFNBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLEtBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxNQUFBO2dCQUNBLGNBQUE7Z0JBQ0EsUUFBQTs7O1lBR0EsT0FBQTs7O1FBR0EsSUFBQSxlQUFBLFVBQUEsT0FBQSxNQUFBLFVBQUEsTUFBQSxNQUFBLFlBQUEsY0FBQSxRQUFBO1lBQ0EsSUFBQSxTQUFBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxNQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsWUFBQTtnQkFDQSxjQUFBO2dCQUNBLFFBQUE7OztZQUdBLElBQUEsVUFBQTtnQkFDQSxRQUFBLE9BQUEsUUFBQSxZQUFBOzs7WUFHQSxPQUFBOzs7UUFHQSxJQUFBLDBCQUFBLFVBQUEsS0FBQSxLQUFBLE9BQUEsTUFBQSxNQUFBLFlBQUEsVUFBQSxjQUFBLFFBQUE7WUFDQSxJQUFBLFNBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxLQUFBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxNQUFBO2dCQUNBLFlBQUE7Z0JBQ0EsY0FBQTtnQkFDQSxRQUFBOzs7WUFHQSxJQUFBLFVBQUE7Z0JBQ0EsUUFBQSxPQUFBLFFBQUEsWUFBQTs7O1lBR0EsT0FBQTs7O1FBR0EsT0FBQTtZQUNBLGFBQUEsWUFBQTtnQkFDQSxJQUFBLFdBQUEsYUFBQTtvQkFDQSxPQUFBLGFBQUE7b0JBQ0EsTUFBQSxZQUFBLEtBQUE7b0JBQ0EsT0FBQSxhQUFBO29CQUNBLFNBQUEsYUFBQTtvQkFDQSxTQUFBLGlCQUFBLEtBQUEsT0FBQSxLQUFBLE1BQUEsTUFBQSxVQUFBO29CQUNBLElBQUEsR0FBQTs7Z0JBRUEsUUFBQSxJQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQTtvQkFDQSxRQUFBO21CQUNBLEtBQUEsU0FBQSxpQkFBQSxNQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxTQUFBLGVBQUEsT0FBQTtvQkFDQSxRQUFBLElBQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOzs7WUFHQSxjQUFBLFVBQUEsS0FBQSxLQUFBLE9BQUEsTUFBQSxNQUFBLFFBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7b0JBQ0EsZUFBQSxhQUFBO29CQUNBLFNBQUEsd0JBQUEsT0FBQSxNQUFBLEtBQUEsS0FBQSxNQUFBLGNBQUE7b0JBQ0EsTUFBQSxZQUFBLEtBQUE7Z0JBQ0EsTUFBQTtvQkFDQSxRQUFBO29CQUNBLEtBQUE7b0JBQ0EsUUFBQTttQkFDQSxLQUFBLFVBQUEsUUFBQTtvQkFDQSxFQUFBLFFBQUEsT0FBQTttQkFDQSxTQUFBLGVBQUEsT0FBQTtvQkFDQSxRQUFBLElBQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOzs7WUFHQSxZQUFBLFVBQUEsTUFBQSxZQUFBO2dCQUNBLElBQUEsV0FBQSxhQUFBO29CQUNBLE9BQUEsYUFBQTtvQkFDQSxNQUFBLFlBQUEsS0FBQTtvQkFDQSxPQUFBLGFBQUE7b0JBQ0EsZUFBQSxhQUFBO29CQUNBLFNBQUEsYUFBQTtvQkFDQSxTQUFBLGFBQUEsS0FBQSxPQUFBLEtBQUEsTUFBQSxVQUFBLE1BQUEsTUFBQSxZQUFBLGNBQUE7b0JBQ0EsSUFBQSxHQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQTtvQkFDQSxRQUFBO21CQUNBLEtBQUEsU0FBQSxpQkFBQSxNQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxTQUFBLGVBQUEsT0FBQTtvQkFDQSxRQUFBLElBQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOzs7WUFHQSxnQkFBQSxVQUFBLEtBQUEsS0FBQSxPQUFBLE1BQUEsWUFBQTtnQkFDQSxJQUFBLFdBQUEsYUFBQTtvQkFDQSxlQUFBLGFBQUE7b0JBQ0EsTUFBQSxZQUFBLEtBQUE7b0JBQ0EsT0FBQSxhQUFBO29CQUNBLFNBQUEsYUFBQTtvQkFDQSxTQUFBLHdCQUFBLEtBQUEsS0FBQSxPQUFBLE1BQUEsTUFBQSxZQUFBLFVBQUEsY0FBQTtvQkFDQSxJQUFBLEdBQUE7O2dCQUVBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBO29CQUNBLFFBQUE7bUJBQ0EsS0FBQSxTQUFBLGlCQUFBLE1BQUE7b0JBQ0EsRUFBQSxRQUFBO21CQUNBLFNBQUEsZUFBQSxPQUFBO29CQUNBLFFBQUEsSUFBQTtvQkFDQSxFQUFBLE9BQUE7OztnQkFHQSxPQUFBLEVBQUE7Ozs7OztBQ3BMQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxRQUFBLDRDQUFBLFVBQUEsVUFBQTs7UUFFQSxJQUFBLFdBQUEsVUFBQSxRQUFBO1lBQ0EsSUFBQSxTQUFBLEdBQUE7Z0JBQ0EsT0FBQSxLQUFBLEtBQUE7O2lCQUVBO2dCQUNBLE9BQUEsS0FBQSxNQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE1BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxJQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7OztRQVFBLElBQUEsZ0JBQUEsVUFBQSxLQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxPQUFBLE9BQUEsT0FBQSxHQUFBO2dCQUNBLFVBQUEsU0FBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxNQUFBLFdBQUE7Z0JBQ0EsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsV0FBQSxNQUFBLFdBQUEsSUFBQSxRQUFBO2dCQUNBLE9BQUEsVUFBQSxNQUFBLFVBQUEsT0FBQSxVQUFBO21CQUNBLElBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxLQUFBO2dCQUNBLFVBQUEsVUFBQTtnQkFDQSxVQUFBLFNBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxLQUFBLElBQUEsWUFBQTtnQkFDQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxJQUFBLE9BQUEsS0FBQSxJQUFBLFlBQUEsTUFBQSxXQUFBLElBQUEsUUFBQTtnQkFDQSxPQUFBLFVBQUEsTUFBQSxVQUFBLE9BQUEsVUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxnQkFBQSxVQUFBLFdBQUEsV0FBQSxXQUFBO1lBQ0EsSUFBQTtZQUNBLElBQUE7WUFDQSxJQUFBO1lBQ0EsSUFBQSxXQUFBLGFBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBLEtBQUEsSUFBQTtnQkFDQSxPQUFBLENBQUEsQ0FBQSxVQUFBLFdBQUEsQ0FBQSxHQUFBLFFBQUE7bUJBQ0EsSUFBQSxXQUFBLGNBQUEsR0FBQTtnQkFDQSxVQUFBLFdBQUEsYUFBQTtnQkFDQSxVQUFBLENBQUEsV0FBQSxhQUFBLFdBQUE7Z0JBQ0EsVUFBQSxXQUFBO2dCQUNBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsUUFBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7O1FBT0EsSUFBQSxlQUFBOzs7Ozs7O1FBT0EsYUFBQSxxQkFBQSxVQUFBLEtBQUEsS0FBQTtZQUNBLElBQUEsQ0FBQSxPQUFBLFFBQUEsTUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLE9BQUEsT0FBQSxRQUFBLE1BQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxLQUFBO2dCQUNBLElBQUEsVUFBQTtvQkFDQSxLQUFBLENBQUEsY0FBQSxNQUFBLGNBQUE7b0JBQ0EsSUFBQSxDQUFBLEtBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLElBQUE7b0JBQ0EsUUFBQSxPQUFBLFNBQUEsS0FBQSxLQUFBOztnQkFFQSxPQUFBO21CQUNBLElBQUEsRUFBQSxPQUFBLENBQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQSxJQUFBLEVBQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxNQUFBO2dCQUNBLE9BQUE7Ozs7Ozs7OztRQVNBLGFBQUEsc0JBQUEsVUFBQSxRQUFBLFFBQUE7WUFDQSxJQUFBLFdBQUEsV0FBQSxXQUFBLFdBQUEsV0FBQTtZQUNBLFNBQUEsT0FBQSxRQUFBLFdBQUEsSUFBQSxNQUFBO1lBQ0EsU0FBQSxPQUFBLFFBQUEsV0FBQSxJQUFBLE1BQUE7O1lBRUEsSUFBQSxPQUFBLFVBQUEsR0FBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsSUFBQTttQkFDQSxJQUFBLE9BQUEsV0FBQSxHQUFBO2dCQUNBLFNBQUEsT0FBQSxHQUFBLE1BQUE7Z0JBQ0EsWUFBQSxXQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsS0FBQSxNQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxJQUFBOztZQUVBLElBQUEsT0FBQSxVQUFBLEdBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLElBQUE7bUJBQ0EsSUFBQSxPQUFBLFdBQUEsR0FBQTtnQkFDQSxTQUFBLE9BQUEsR0FBQSxNQUFBO2dCQUNBLFlBQUEsV0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEtBQUEsTUFBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsTUFBQSxHQUFBLENBQUEsSUFBQTs7O1lBR0E7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsYUFBQTtnQkFDQSxhQUFBLENBQUEsT0FBQSxhQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQSxDQUFBO2dCQUNBLFdBQUEsYUFBQSxXQUFBLFlBQUEsUUFBQSxXQUFBLFlBQUEsV0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUE7Y0FDQTtnQkFDQSxJQUFBLFVBQUE7b0JBQ0EsS0FBQTt3QkFDQSxZQUFBLE1BQUEsWUFBQSxPQUFBLFlBQUE7d0JBQ0EsWUFBQSxNQUFBLFlBQUEsT0FBQSxZQUFBO29CQUNBLElBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7d0JBQ0EsY0FBQSxXQUFBLFdBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsUUFBQSxHQUFBLE1BQUEsSUFBQTtvQkFDQSxRQUFBLE9BQUEsU0FBQSxRQUFBLEdBQUEsSUFBQSxRQUFBLEdBQUEsSUFBQTs7Z0JBRUEsT0FBQTttQkFDQTtnQkFDQSxPQUFBOzs7Ozs7Ozs7Ozs7Ozs7UUFlQSxhQUFBLHVCQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsU0FBQTtZQUNBLFNBQUEsT0FBQSxJQUFBOztZQUVBLElBQUEsTUFBQSxPQUFBLE9BQUEsTUFBQSxPQUFBLEtBQUE7Z0JBQ0EsT0FBQTttQkFDQTs7Z0JBRUEsT0FBQSxLQUFBLEtBQUEsTUFBQSxPQUFBLEtBQUEsT0FBQTtnQkFDQSxPQUFBLEtBQUEsS0FBQSxNQUFBLE9BQUEsS0FBQSxPQUFBO2dCQUNBLE9BQUE7b0JBQ0EsTUFBQTtvQkFDQSxJQUFBO29CQUNBLEtBQUEsQ0FBQSxjQUFBLE9BQUEsS0FBQSxjQUFBLE9BQUE7Ozs7O1FBS0EsYUFBQSxlQUFBLFVBQUEsS0FBQTtZQUNBLFFBQUEsQ0FBQSxPQUFBLFFBQUEsS0FBQSxRQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsT0FBQTs7UUFFQSxhQUFBLGVBQUEsVUFBQSxLQUFBO1lBQ0EsU0FBQSxDQUFBLE9BQUEsUUFBQSxLQUFBLFFBQUEsT0FBQSxPQUFBLENBQUEsT0FBQSxPQUFBOzs7UUFHQSxhQUFBLGdCQUFBLFVBQUEsUUFBQTtZQUNBLElBQUEsV0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxXQUFBLFdBQUE7WUFDQSxTQUFBLE9BQUEsUUFBQSxXQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsVUFBQSxHQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxJQUFBO21CQUNBLElBQUEsT0FBQSxXQUFBLEdBQUE7Z0JBQ0EsU0FBQSxPQUFBLEdBQUEsTUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLElBQUE7O1lBRUE7Z0JBQ0EsYUFBQSxDQUFBLE1BQUEsYUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxhQUFBLEtBQUEsWUFBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUEsQ0FBQTtnQkFDQSxXQUFBLGFBQUEsV0FBQSxZQUFBLFFBQUEsV0FBQSxZQUFBLFdBQUE7Ozs7UUFJQSxhQUFBLGdCQUFBLFVBQUEsUUFBQTtZQUNBLElBQUEsV0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxXQUFBLFdBQUE7WUFDQSxTQUFBLE9BQUEsUUFBQSxXQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsVUFBQSxHQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLElBQUE7Z0JBQ0EsWUFBQSxTQUFBLE9BQUEsSUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxJQUFBO21CQUNBLElBQUEsT0FBQSxXQUFBLEdBQUE7Z0JBQ0EsU0FBQSxPQUFBLEdBQUEsTUFBQTtnQkFDQSxZQUFBLFdBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxLQUFBLE1BQUEsT0FBQSxJQUFBO2dCQUNBLFlBQUEsU0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsSUFBQTtnQkFDQSxZQUFBLFNBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLElBQUE7OztZQUdBO2dCQUNBLGFBQUEsS0FBQSxZQUFBO2dCQUNBLGFBQUEsS0FBQSxZQUFBO2dCQUNBLGFBQUEsQ0FBQSxPQUFBLGFBQUE7Z0JBQ0EsV0FBQSxhQUFBLFdBQUEsWUFBQSxRQUFBLFdBQUEsWUFBQSxXQUFBLENBQUE7Z0JBQ0EsV0FBQSxhQUFBLFdBQUEsWUFBQSxRQUFBLFdBQUEsWUFBQSxXQUFBOzs7O1FBSUEsYUFBQSxjQUFBLFVBQUEsTUFBQTtZQUNBLElBQUEsU0FBQSxJQUFBO2dCQUNBLE9BQUE7O1lBRUEsT0FBQSxPQUFBO1lBQ0EsT0FBQSxDQUFBLENBQUEsS0FBQSxNQUFBOzs7UUFHQSxPQUFBOzs7QUNsU0EsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsUUFBQSw0RkFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtNQUNBO1FBQ0EsSUFBQSxjQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsU0FBQSxhQUFBLFlBQUE7WUFDQSxPQUFBO2dCQUNBLEdBQUEsT0FBQSxHQUFBO2dCQUNBLEdBQUEsT0FBQSxHQUFBO2dCQUNBLEdBQUEsT0FBQSxHQUFBO2dCQUNBLEdBQUEsT0FBQSxHQUFBOzs7O1FBSUEsSUFBQSxZQUFBLFVBQUEsT0FBQSxNQUFBLFVBQUEsU0FBQSxNQUFBO1lBQ0EsSUFBQSxTQUFBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxNQUFBOzs7WUFHQSxJQUFBLFVBQUE7Z0JBQ0EsUUFBQSxPQUFBLFFBQUEsWUFBQTs7O1lBR0EsSUFBQSxTQUFBO2dCQUNBLE9BQUEsV0FBQTs7O1lBR0EsT0FBQTs7O1FBR0EsSUFBQSxrQkFBQTs7UUFFQSxPQUFBO1lBQ0EsYUFBQSxZQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBOztnQkFFQSxJQUFBLGlCQUFBO29CQUNBLFNBQUEsT0FBQTs7O2dCQUdBLGtCQUFBLFNBQUEsVUFBQTtvQkFDQSxJQUFBLFdBQUEsYUFBQTt3QkFDQSxPQUFBLGFBQUE7d0JBQ0EsTUFBQSxZQUFBLEtBQUE7d0JBQ0EsT0FBQSxhQUFBOztvQkFFQSxTQUFBLFFBQUEsS0FBQSxLQUFBLFNBQUE7b0JBQ0EsU0FBQSxPQUFBLEtBQUEsS0FBQSxTQUFBO29CQUNBLFNBQUEsUUFBQSxLQUFBLE1BQUEsU0FBQTtvQkFDQSxTQUFBLE9BQUEsS0FBQSxNQUFBLFNBQUE7O29CQUVBLElBQUEsU0FBQSxVQUFBLEtBQUEsT0FBQSxLQUFBLE1BQUEsVUFBQSxNQUFBO29CQUNBLE9BQUEsT0FBQTs7b0JBRUEsTUFBQTt3QkFDQSxRQUFBO3dCQUNBLEtBQUE7d0JBQ0EsUUFBQTt1QkFDQSxLQUFBLFNBQUEsaUJBQUEsTUFBQTt3QkFDQSxFQUFBLFFBQUE7dUJBQ0EsU0FBQSxlQUFBLE9BQUE7d0JBQ0EsUUFBQSxJQUFBO3dCQUNBLEVBQUEsT0FBQTs7O21CQUdBOzs7Z0JBR0EsT0FBQSxFQUFBOztZQUVBLHdCQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7b0JBQ0EsV0FBQSxhQUFBO29CQUNBLE9BQUEsYUFBQTtvQkFDQSxNQUFBLFlBQUEsS0FBQTtvQkFDQSxPQUFBLGFBQUE7b0JBQ0EsU0FBQSxVQUFBLEtBQUEsT0FBQSxLQUFBLE1BQUEsVUFBQSxRQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQTtvQkFDQSxRQUFBO21CQUNBLEtBQUEsU0FBQSxpQkFBQSxNQUFBO29CQUNBLEVBQUEsUUFBQTttQkFDQSxTQUFBLGVBQUEsT0FBQTtvQkFDQSxRQUFBLElBQUE7b0JBQ0EsRUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxFQUFBOztZQUVBLHVCQUFBLFlBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUE7b0JBQ0EsV0FBQSxhQUFBO29CQUNBLE9BQUEsYUFBQTtvQkFDQSxNQUFBLFlBQUEsS0FBQTtvQkFDQSxPQUFBLGFBQUE7b0JBQ0EsU0FBQSxVQUFBLEtBQUEsT0FBQSxLQUFBLE1BQUEsVUFBQSxPQUFBOztnQkFFQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQTtvQkFDQSxRQUFBO21CQUNB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QSxtQkFBQSxFQUFBLFVBQUEsWUFBQSxtQkFBQSxFQUFBLFNBQUE7WUFDQSxzQkFBQSxZQUFBO1lBQ0EsZ0JBQUEsWUFBQTtZQUNBLGtCQUFBLFlBQUE7WUFDQSxlQUFBO1lBQ0EsZUFBQTtZQUNBLGVBQUE7WUFDQSxnQkFBQTtZQUNBLG9CQUFBO1lBQ0EsZUFBQTtZQUNBLGFBQUE7WUFDQSxpQkFBQSxZQUFBO1lBQ0Esa0JBQUEsWUFBQTtZQUNBO1lBQ0EsTUFBQTtZQUNBLFVBQUE7WUFDQSxXQUFBO1lBQ0EsaUJBQUE7Z0JBQ0EsT0FBQSxZQUFBO2dCQUNBLE1BQUEsWUFBQTtnQkFDQSxVQUFBLFlBQUE7Z0JBQ0EsZ0JBQUEsWUFBQTs7WUFFQSxpQkFBQTtZQUNBLHNCQUFBO1lBQ0E7WUFDQTtZQUNBLGtCQUFBO1lBQ0EsWUFBQTtZQUNBLGdCQUFBLEVBQUEsVUFBQSxZQUFBLGdCQUFBLEVBQUEsU0FBQTtZQUNBLGNBQUE7WUFDQSxlQUFBO1lBQ0EsT0FBQSxZQUFBO1lBQ0EsZUFBQTtZQUNBLHFCQUFBLElBQUE7WUFDQSxlQUFBLFlBQUE7WUFDQSxTQUFBLFlBQUE7O1FBRUEsSUFBQSxZQUFBLEtBQUEsWUFBQSxJQUFBO1lBQ0EsT0FBQTtnQkFDQSxRQUFBO2dCQUNBLE9BQUEsbUJBQUEsT0FBQSxXQUFBLFlBQUEsS0FBQSxZQUFBO2dCQUNBLE9BQUEsbUJBQUEsT0FBQSxXQUFBLFlBQUEsS0FBQSxZQUFBO2dCQUNBLE1BQUEsbUJBQUEsT0FBQSxXQUFBLFlBQUEsS0FBQSxZQUFBO2dCQUNBLE1BQUEsbUJBQUEsT0FBQSxXQUFBLFlBQUEsS0FBQSxZQUFBO2dCQUNBLFFBQUEsWUFBQSxNQUFBO2dCQUNBLFFBQUEsWUFBQSxNQUFBOzs7O1FBSUEsSUFBQSxZQUFBLFNBQUEsWUFBQSxNQUFBO1lBQ0Esb0JBQUE7Z0JBQ0EsT0FBQSxPQUFBLElBQUEsWUFBQSxPQUFBO2dCQUNBLE1BQUEsT0FBQSxJQUFBLFlBQUEsTUFBQTs7OztRQUlBLE9BQUE7WUFDQSxlQUFBLFVBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLGVBQUEsVUFBQSxVQUFBO2dCQUNBLElBQUEsQ0FBQSxTQUFBLFFBQUE7b0JBQ0EsU0FBQSxTQUFBLFlBQUE7b0JBQ0EsS0FBQSxrQkFBQSxTQUFBOzs7Z0JBR0EsSUFBQSxZQUFBLE1BQUEsU0FBQSxNQUFBLGNBQUEsWUFBQSxNQUFBLFNBQUEsTUFBQSxjQUFBLFlBQUEsTUFBQSxTQUFBLEtBQUEsY0FBQSxZQUFBLE1BQUEsU0FBQSxLQUFBLGNBQUEsWUFBQSxtQkFBQSxTQUFBLFVBQUEsWUFBQSxPQUFBLFNBQUEsT0FBQSxjQUFBLFlBQUEsT0FBQSxTQUFBLE9BQUEsWUFBQTtvQkFDQSxJQUFBLFNBQUEsVUFBQSxNQUFBLFNBQUEsVUFBQSxNQUFBLFNBQUEsU0FBQSxNQUFBLFNBQUEsU0FBQSxNQUFBLFNBQUEsV0FBQSxNQUFBO3dCQUNBLFNBQUEsUUFBQSxXQUFBLFNBQUEsT0FBQSxRQUFBO3dCQUNBLFNBQUEsUUFBQSxXQUFBLFNBQUEsT0FBQSxRQUFBO3dCQUNBLFNBQUEsT0FBQSxXQUFBLFNBQUEsTUFBQSxRQUFBO3dCQUNBLFNBQUEsT0FBQSxXQUFBLFNBQUEsTUFBQSxRQUFBOztvQkFFQSxLQUFBLFFBQUE7b0JBQ0EsWUFBQSxJQUFBLFNBQUEsVUFBQSxLQUFBLE9BQUEsU0FBQTtvQkFDQSxZQUFBLElBQUEsU0FBQSxVQUFBLEtBQUEsT0FBQSxTQUFBO29CQUNBLFlBQUEsSUFBQSxTQUFBLFNBQUEsS0FBQSxPQUFBLFNBQUE7b0JBQ0EsWUFBQSxJQUFBLFNBQUEsU0FBQSxLQUFBLE9BQUEsU0FBQTtvQkFDQSxZQUFBLGlCQUFBLFNBQUEsV0FBQSxLQUFBLE9BQUEsU0FBQTtvQkFDQSxZQUFBLEtBQUEsU0FBQSxXQUFBLEtBQUEsT0FBQSxTQUFBO29CQUNBLFlBQUEsS0FBQSxTQUFBLFdBQUEsS0FBQSxPQUFBLFNBQUE7b0JBQ0EsS0FBQSxrQkFBQSxZQUFBO29CQUNBLFVBQUEsT0FBQTs7Z0JBRUEsSUFBQSxDQUFBLFdBQUEsU0FBQTtvQkFDQSxXQUFBOzs7WUFHQSxTQUFBLFlB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LFlBQUEsU0FBQTtnQkFDQSxVQUFBLE9BQUE7Ozs7Ozs7QUNyYUEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsV0FBQSxpSUFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxhQUFBLFlBQUE7O1FBRUEsSUFBQSxpQkFBQSxhQUFBOztRQUVBLE9BQUEsUUFBQSxlQUFBO1FBQ0EsT0FBQSxPQUFBLGVBQUE7O1FBRUEsSUFBQSxvQkFBQSxVQUFBLFVBQUE7O1lBRUEsSUFBQSxZQUFBO2dCQUNBLFdBQUEsT0FBQSxJQUFBLGVBQUEsTUFBQSxLQUFBLE9BQUEsSUFBQSxlQUFBLFFBQUEsT0FBQTs7O1lBR0EsS0FBQSxJQUFBLElBQUEsR0FBQSxJQUFBLFVBQUEsS0FBQTtnQkFDQSxJQUFBLE9BQUEsT0FBQSxJQUFBLGVBQUEsT0FBQSxRQUFBLEtBQUEsSUFBQSxHQUFBLEtBQUE7b0JBQ0EsUUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLE1BQUE7O2dCQUVBLFVBQUEsS0FBQTtvQkFDQSxNQUFBO29CQUNBLE9BQUEsUUFBQSxNQUFBLFFBQUE7Ozs7WUFJQSxPQUFBOzs7UUFHQSxJQUFBLGFBQUEsWUFBQTs7WUFFQSxJQUFBLHFCQUFBLGFBQUE7WUFDQSxtQkFBQTs7WUFFQSxJQUFBLFlBQUE7WUFDQSxRQUFBLE1BQUE7WUFDQSxlQUFBLGNBQUEsS0FBQSxVQUFBLFFBQUE7Z0JBQ0EsSUFBQSxPQUFBLE9BQUE7O2dCQUVBLGFBQUEsZUFBQSxLQUFBO2dCQUNBLGFBQUEsZ0JBQUEsS0FBQTs7Z0JBRUEsSUFBQSxLQUFBLFNBQUEsS0FBQSxNQUFBLFNBQUEsR0FBQTtvQkFDQSxJQUFBLFdBQUE7OztvQkFHQSxJQUFBLFNBQUEsRUFBQSxRQUFBLEtBQUEsT0FBQSxVQUFBLE9BQUE7d0JBQ0EsT0FBQSxPQUFBLElBQUEsTUFBQSxNQUFBLFFBQUEsS0FBQSxpQkFBQTs7OztvQkFJQSxFQUFBLFFBQUEsRUFBQSxNQUFBLFNBQUEsVUFB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O2dCQUNBOztZQUVBLEdBQUE7OztRQUdBLElBQUEsR0FBQSxTQUFBLFdBQUE7WUFDQSxPQUFBLE9BQUEsb0NBQUEsVUFBQSxVQUFBO2dCQUNBLEdBQUEsY0FBQTs7Ozs7QUN0REEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsVUFBQSx1QkFBQSxZQUFBO1FBQ0EsT0FBQTtZQUNBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsWUFBQTtZQUNBLGNBQUE7WUFDQSxPQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsTUFBQTs7Ozs7O0FDWEEsQ0FBQSxZQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLFNBQUEsV0FBQSx5RUFBQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7O1lBRUEsVUFBQTs7WUFFQSxVQUFBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBOzs7Ozs7Ozs7O1lBVUEsYUFBQSxVQUFBLFFBQUEsS0FBQSxPQUFBLFdBQUE7O2dCQUVBLE9BQUEsT0FBQSxZQUFBLGFBQUEsV0FBQTs7O2dCQUdBLElBQUEsRUFBQSxRQUFBLFVBQUEsT0FBQSxPQUFBO29CQUNBLE9BQUEsT0FBQTs7Ozs7UUFLQSxHQUFBLHFCQUFBLGFBQUE7UUFDQSxHQUFBLFVBQUE7Ozs7UUFJQSxFQUFBLFFBQUEsU0FBQSxVQUFBLEtBQUE7WUFDQSxJQUFBLFFBQUEsU0FBQTs7Z0JBRUEsR0FBQSxRQUFBLEtBQUE7b0JBQ0EsV0FBQTs7bUJBRUEsSUFBQSxZQUFBLGFBQUEsS0FBQSxTQUFBO2dCQUNBLElBQUEsU0FBQTt3QkFDQSxJQUFBOzs7b0JBR0EsT0FBQSxJQUFBLE9BQUEsR0FBQSxnQkFBQSxJQUFBLE1BQUE7OztnQkFHQSxXQUFBLFFBQUEsUUFBQSxNQUFBO2dCQUNBLFdBQUEsUUFBQSxXQUFBLEdBQUE7Z0JBQ0EsV0FBQSxRQUFBLE9BQUEsR0FBQTtnQkFDQSxXQUFBLFFBQUEsT0FBQSxL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QUE7Z0JBQ0E7O1lBRUEsSUFBQSxjQUFBO2dCQUNBLElBQUEsRUFBQSxLQUFBLFVBQUEsU0FBQSxHQUFBO29CQUNBOzttQkFFQTtnQkFDQTs7OztRQUlBLE9BQUEsaUJBQUEsNkJBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxRQUFBLFVBQUEsVUFBQTs7O1FBR0EsT0FBQSxpQkFBQSx1Q0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLFFBQUEsVUFBQSxVQUFBOzs7UUFHQSxPQUFBLGlCQUFBLGtDQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsUUFBQSxVQUFBLFVBQUE7OztRQUdBLE9BQUEsT0FBQSx3Q0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLFFBQUEsVUFBQSxVQUFBOzs7UUFHQSxPQUFBLE9BQUEsdUNBQUEsVUFBQSxVQUFBLFVBQUE7WUFDQSxRQUFBLFVBQUEsVUFBQTs7O1FBR0EsT0FBQSxPQUFBLDZCQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsUUFBQSxVQUFBLFVBQUE7O1FBRUEsT0FBQSxPQUFBLCtCQUFBLFVBQUEsVUFBQSxVQUFBO1lBQ0EsUUFBQSxVQUFBLFVBQUE7Ozs7O0FDdkpBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFVBQUEsc0JBQUEsWUFBQTtRQUNBLE9BQUE7WUFDQSxVQUFBO1lBQ0EsYUFBQTtZQUNBLFlBQUE7WUFDQSxjQUFBO1lBQ0EsT0FBQTtnQkFDQSxVQUFBOzs7OztBQ1ZBLENBQUEsWUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSxTQUFBLFdBQUEsc0pBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7WUFDQSxjQUFBO1lBQ0EsZUFBQSxPQUFBLENBQUEsT0FBQSxRQUFBLGFBQUEscUJBQUEsTUFBQSxPQUFBLFdBQUE7O1FBRUEsR0FBQSxjQUFBO1FBQ0EsR0FBQSxlQUFBO1FBQ0EsR0FBQSxxQkFBQTs7UUFFQSxHQUFBLGFBQUEsVUFBQTtZQUNBLElBQUEsRUFB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QUEsR0FBQSxHQUFBO2dCQUNBLE9BQUEsZUFBQSxDQUFBLElBQUEsTUFBQSxDQUFBLElBQUE7OztZQUdBLFNBQUEsVUFBQSxXQUFBO2dCQUNBLElBQUEsSUFBQSxHQUFBLE9BQUE7cUJBQ0EsT0FBQTtxQkFDQSxNQUFBLFNBQUEsSUFBQSxZQUFBLE9BQUEsT0FBQSxPQUFBLFFBQUE7cUJBQ0EsTUFBQSxVQUFBLElBQUEsWUFBQSxPQUFBLE1BQUEsT0FBQSxTQUFBO3FCQUNBLE9BQUE7cUJBQ0EsUUFBQSxtQkFBQTtxQkFDQSxLQUFBLGFBQUEsYUFBQSxPQUFBLE9BQUEsV0FBQSxPQUFBLE1BQUE7OztnQkFHQSxFQUFBLE9BQUE7cUJBQ0EsUUFBQSxnQkFBQTtxQkFDQSxVQUFBO3FCQUNBLEtBQUE7cUJBQ0E7cUJBQ0EsT0FBQTtxQkFDQSxLQUFBLEtBQUEsU0FBQSxHQUFBLENBQUEsT0FBQSxTQUFBO3FCQUNBLE1BQUEsUUFBQTs7O1lBR0EsU0FBQSxlQUFBLFdBQUE7Z0JBQ0EsSUFBQSxJQUFBLEdBQUEsT0FBQSxXQUFBLE9BQUE7OztnQkFHQSxFQUFBLE9BQUE7cUJBQ0EsUUFBQSxVQUFBO3FCQUNBLFVBQUE7cUJBQ0EsS0FBQTtxQkFDQTtxQkFDQSxPQUFBO3FCQUNBLEtBQUEsTUFBQSxDQUFBO3FCQUNBLEtBQUEsYUFBQSxTQUFBLEdBQUEsR0FBQSxDQUFBLE9BQUEsVUFBQSxJQUFBLE1BQUE7OztnQkFHQSxJQUFBLFlBQUEsR0FBQSxNQUFBLFNBQUEsT0FBQSxRQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUE7Z0JBQ0EsS0FBQSxNQUFBLFdBQUEsT0FBQTtnQkFDQSxHQUFBLFdBQUE7b0JBQ0EsS0FBQSxXQUFBOztnQkFFQSxFQUFBLE9BQUE7cUJBQ0EsUUFBQSxRQUFBO3FCQUNBLEtBQUE7OztnQkFHQSxFQUFBLE9BQUE7cUJBQ0EsS0FBQSxLQUFBO3FCQUNBLFFBQUEsU0FBQTtxQkFDQSxNQUFBLFFBQUE7OztnQkFHQSxJQUFBLFNBQUEsRUFBQSxPQUFBO3FCQUNBLFFBQUEsVUFBQTs7Z0JBRUEsT0FBQSxPQUFBO3FCQUNBLE9BQUE7cUJBQ0EsS0FBQSxNQUFBO3FCQUNBLEtBQUEsS0FBQSxRQUFBLENBQUEsY0FBQSxPQUFBLGNBQUEsTUFBQSxjQUFBOztnQkFFQSxPQUFBLFVBQUE7cUJBQ0EsS0FBQTtxQkFDQTtxQkFDQSxPQUFBO3FCQUNBLE1BQUEsZUFBQTtxQkFDQSxNQUFBLFFBQUEsU0FBQSxHQUFBLEdBQUEsQ0FBQSxPQUFBLGNBQUEsVUFBQSxJQUFBLFVBQUEsVUFBQTtxQkFDQSxPQUFBO3FCQUNBLEtBQUEsY0FBQTtxQkFDQSxLQUFBLGVBQUEsU0FBQSxHQUFBLEdBQUEsQ0FBQSxPQUFBLElBQUEsTUFBQSxVQUFBLEtBQUEsVUFBQTtxQkFDQSxLQUFBLFNBQUEsR0FBQSxDQUFBLE9BQUEsbUJBQUEsRUFBQSxnQkFBQTs7OztZQUlBLElBQUEsS0FBQSxTQUFBLEdBQUE7Z0JBQ0EsT0FBQSxTQUFBOztZQUVBLElBQUEsS0FBQSxTQUFBLEdBQUEsR0FBQTtnQkFDQSxPQUFBLENBQUEsSUFBQSxJQUFBLEtBQUEsTUFBQTs7WUFFQSxJQUFBLEtBQUEsU0FBQSxHQUFBLEdBQUE7Z0JBQ0EsT0FBQSxDQUFBLENBQUEsSUFBQSxLQUFBLElBQUEsS0FBQSxNQUFBOzs7WUFHQSxTQUFBLE1BQUEsV0FBQTtnQkFDQSxVQUFBLEtBQUEsU0FBQSxHQUFBO29CQUNBLEtBQUE7O29CQUVBLEdBQUEsa0JBQUE7d0JBQ0EsRUFBQTs7O29CQUdBLElBQUEsSUFBQSxHQUFBLE9BQUEsTUFBQSxPQUFBOzs7b0JBR0EsSUFBQSxTQUFBLEVBQUEsR0FBQSxPQUFBOztvQkFFQSxHQUFBLENBQUEsT0FBQTt3QkFDQSxVQUFBOzs7b0JBR0EsSUFBQSxHQUFBLE9BQUEsTUFBQSxPQUFBOzs7b0JBR0EsSUFBQSxTQUFBLEVBQUEsVUFBQTt5QkFDQSxLQUFBOztvQkFFQTt5QkFDQTt5QkFDQSxPQUFBO3lCQUNBLEtBQUEsU0FBQSxTQUFBLEdBQUEsR0FBQTs0QkFDQSxPQUFBLFdBQUE7O3lCQUVBLFFBQUEsU0FBQTs7b0JBRUEsT0FBQSxPQUFBOzs7b0JBR0EsSUFBQSxXQUFBO3lCQUNBLFVBQUE7eUJBQ0EsS0FBQSxTQUFBLEdBQUE7NEJBQ0EsSUFBQSxJQUFBLEdBQUEsSUFBQSxFQUFBO2dDQUNBLFVBQUEsRUFBQTtnQ0FDQSxPQUFBOzRCQUNBLElBQUEsTUFBQSxRQUFBLFVBQUE7Z0NBQ0EsS0FBQSxJQUFBLElBQUEsR0FBQSxJQUFBLFFBQUEsUUFBQSxFQUFBLEdBQUE7b0NBQ0EsS0FBQSxLQUFBLFFBQUEsR0FBQTs7bUNBRUE7Z0NBQ0EsT0FBQTs7NEJBRUEsT0FBQTs7O29CQUdBO3lCQUNBO3lCQUNBLE9BQUE7eUJBQ0EsTUFBQSxRQUFBLFNBQUEsR0FBQSxHQUFBOzRCQUNBLEdBQUEsQ0FBQSxVQUFBLEVBQUE7NEJBQ0EsT0FBQSxVQUFBLElBQUEsVUFBQTs7O29CQUdBLFNBQUEsT0FBQTs7b0JBRUE7eUJBQ0E7eUJBQ0EsU0FBQTt5QkFDQSxLQUFBLEtBQUEsR0FBQSxJQUFBLE1BQUEsWUFBQSxHQUFBLFlBQUEsSUFBQSxXQUFBLElBQUEsU0FBQTs7b0JBRUEsR0FBQSxDQUFBLFFBQUE7d0JBQ0EsZUFBQTsyQkFDQTt3QkFDQSxJQUFBLFlBQUEsR0FBQSxNQUFBLFNBQUEsT0FBQSxRQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUE7d0JBQ0EsS0FBQSxNQUFBOzZCQUNBLE9BQUE7d0JBQ0EsSUFBQSxXQUFBOzRCQUNBLEtBQUEsV0FBQTs7O3dCQUdBLEdBQUEsT0FBQTs2QkFDQTs2QkFDQSxTQUFBOzZCQUNBLEtBQUE7Ozs7Ozs7WUFPQSxNQUFBLFNBQUEsU0FBQSxHQUFBO2dCQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxPQUFBO2dCQUNBLFNBQUE7Z0JBQ0EsT0FBQTs7O1lBR0EsTUFBQSxZQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsT0FBQTtnQkFDQSxZQUFBO2dCQUNBLE9BQUE7OztZQUdBLE1BQUEsb0JBQUEsU0FBQSxHQUFBO2dCQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxPQUFBO2dCQUNBLG9CQUFBO2dCQUNBLE9BQUE7OztZQUdBLE1BQUEsWUFBQSxTQUFBLEdBQUE7Z0JBQ0EsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE9BQUE7Z0JBQ0EsWUFBQTtnQkFDQSxPQUFBOzs7WUFHQSxNQUFBLG1CQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsT0FBQTtnQkFDQSxtQkFBQTtnQkFDQSxPQUFBOzs7WUFHQSxNQUFBLFNBQUEsU0FBQSxHQUFBO2dCQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxPQUFBO2dCQUNBLFNBQUE7Z0JBQ0EsT0FBQTs7O1lBR0EsTUFBQSxhQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsT0FBQTtnQkFDQSxhQUFBO2dCQUNBLE9BQUE7OztZQUdBLE1BQUEsY0FBQSxTQUFBLEdBQUE7Z0JBQ0EsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE9BQUE7Z0JBQ0EsY0FBQTtnQkFDQSxPQUFBOzs7WUFHQSxNQUFBLG1CQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsT0FBQTtnQkFDQSxtQkFBQTtnQkFDQSxPQUFBOzs7WUFHQSxNQUFBLHFCQUFBLFNBQUEsR0FBQTtnQkFDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsT0FBQTtnQkFDQSxxQkFBQTtnQkFDQSxPQUFBOzs7WUFHQSxPQUFBOzs7OztBQ25SQSxDQUFBLFlBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsU0FBQSxXQUFBLGlJQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO01BQ0E7UUFDQSxJQUFBLEtBQUE7WUFDQSxjQUFBO1lBQ0EsUUFBQTs7UUFFQSxHQUFBLFVBQUEsUUFBQSxVQUFBLElBQUE7UUFDQSxHQUFBLGVBQUE7UUFDQSxHQUFBLGNBQUE7UUFDQSxHQUFBLFlBQUE7UUFDQSxHQUFBLGlCQUFBLGFBQUE7O1FBRUEsR0FBQSxr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WUFDQSxLQUFBLFVBQUE7O1lBRUEsSUFBQSxHQUFBLGVBQUE7Z0JBQ0EsR0FBQSxRQUFBLEdBQUEsUUFBQSxPQUFBLElBQUEsR0FBQSxPQUFBLFdBQUEsT0FBQSxNQUFBLFNBQUEsWUFBQSxpQkFBQSxRQUFBLFFBQUEsS0FBQTtnQkFDQSxHQUFBLE9BQUEsR0FBQSxPQUFBLE9BQUEsSUFBQSxHQUFBLE1BQUEsV0FBQSxPQUFBLE1BQUEsTUFBQSxLQUFBO21CQUNBLElBQUEsR0FBQSxrQkFBQTtnQkFDQSxHQUFBLG1CQUFBLEdBQUEsV0FBQSxFQUFBLEtBQUEsR0FBQSxXQUFBLEVBQUEsT0FBQSxHQUFBLGNBQUEsRUFBQSxLQUFBLEdBQUEsV0FBQSxFQUFBLFNBQUE7Z0JBQ0EsR0FBQSxpQkFBQSxHQUFBLGlCQUFBLFNBQUEsR0FBQSxrQkFBQSxZQUFBO2dCQUNBLEdBQUEsUUFBQSxPQUFBLElBQUEsT0FBQSxNQUFBLE1BQUEsTUFBQSxTQUFBLEdBQUEsZ0JBQUEsR0FBQSxpQkFBQSxPQUFBLFFBQUEsS0FBQTtnQkFDQSxHQUFBLE9BQUEsT0FBQSxNQUFBLE1BQUEsS0FBQTs7O1lBR0EsR0FBQTs7O1FBR0EsR0FBQSxpQkFBQSxZQUFBO1lBQ0EsR0FBQSxXQUFBLENBQUEsR0FBQTs7O1FBR0EsR0FBQSx1QkFBQSxZQUFBO1lBQ0EsR0FBQSxnQkFBQSxDQUFBLEdBQUE7WUFDQSxHQUFBLG1CQUFBLENBQUEsR0FBQTs7WUFFQSxHQUFBOzs7UUFHQSxHQUFBLFdBQUEsVUFBQSxPQUFBLFlBQUE7WUFDQSxHQUFBLFFBQUEsT0FBQSxNQUFBLElBQUEsT0FBQSxZQUFBLFFBQUEsT0FBQTtZQUNBLEdBQUEsT0FBQSxPQUFBLE1BQUEsTUFBQSxLQUFBO1lBQ0EsR0FBQTs7O1FBR0E7O1FBRUEsT0FBQSxpQkFBQSx1Q0FBQSxVQUFBLFVBQUEsVUFBQTtZQUNBLElBQUEsUUFBQSxPQUFBLFVBQUEsV0FBQTtnQkFDQTs7WUFFQSxHQUFBLFFBQUEsT0FBQSxJQUFBLFNBQUEsT0FBQTtZQUNBLEdBQUEsT0FBQSxPQUFB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QUFBLG9CQUFBOztZQUVBLElBQUEsTUFBQSxJQUFBO2dCQUNBLElBQUEsSUFBQSxLQUFBLE9BQUEsSUFBQSxJQUFBLFNBQUEsR0FBQSxNQUFBLFFBQUEsT0FBQSxJQUFBLEdBQUEsTUFBQSxTQUFBLE9BQUEsSUFBQSxRQUFBLEtBQUEsS0FBQTs7Z0JBRUEsTUFBQSxLQUFBLGFBQUEsZ0JBQUEsRUFBQSxPQUFBLElBQUEsRUFBQSxNQUFBLFlBQUEsT0FBQSxRQUFBLE9BQUEsRUFBQSxFQUFBLFNBQUEsT0FBQSxPQUFBO2dCQUNBLE1BQUEsT0FBQSxRQUFBLEtBQUEsT0FBQSxJQUFBLE9BQUEsSUFBQSxFQUFBLE1BQUEsVUFBQSxPQUFBLGdCQUFBLE9BQUEsRUFBQTs7OztRQUlBLElBQUEsa0JBQUEsVUFBQSxVQUFBO1lBQ0EsV0FBQSxZQUFBOzs7WUFHQSxRQUFBLEVBQUEsTUFBQSxxQkFBQTtZQUNBLFFBQUEsRUFBQSxNQUFBLHFCQUFBOzs7WUFHQSxFQUFBLE9BQUEsQ0FBQSxPQUFBLElBQUEsTUFBQSxJQUFBLFVBQUEsT0FBQSxJQUFBLE1BQUEsTUFBQSxTQUFBLElBQUEsTUFBQSxLQUFBO1lBQ0EsRUFBQSxPQUFBLENBQUEsR0FBQSxHQUFBLElBQUE7WUFDQSxLQUFBLEVBQUE7O1lBRUEsSUFBQSxVQUFBO2dCQUNBO21CQUNBOztnQkFFQSxXQUFBLFFBQUEsT0FBQTtxQkFDQSxNQUFBO3FCQUNBLEtBQUEsU0FBQTtxQkFDQSxLQUFBLEtBQUE7cUJBQ0EsS0FBQSxhQUFBOztnQkFFQSxRQUFBLElBQUEsT0FBQTtxQkFDQSxLQUFBLFNBQUE7cUJBQ0EsTUFBQSxXQUFBOztnQkFFQSxNQUFBLE9BQUE7cUJBQ0EsS0FBQSxLQUFBOztnQkFFQSxNQUFBLE9BQUE7cUJBQ0EsS0FBQSxLQUFBO3FCQUNBLEtBQUEsTUFBQTs7Z0JBRUEsSUFBQSxPQUFBO3FCQUNBLEtBQUEsU0FBQSxRQUFBLE9BQUEsT0FBQSxPQUFBO3FCQUNBLEtBQUEsVUFBQSxTQUFBLE9BQUEsTUFBQSxPQUFBO3FCQUNBLEtBQUEsU0FB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RUFBQSxNQUFBOzs7OztRQUtBLElBQUEsY0FBQSxFQUFBLEtBQUE7WUFDQSxTQUFBO1lBQ0EsV0FBQTtZQUNBLFlBQUEsQ0FBQSxJQUFBOzs7UUFHQSxHQUFBLGlCQUFBLFVBQUEsR0FBQTtZQUNBLFFBQUEsTUFBQTs7WUFFQSxJQUFBLE9BQUEsYUFBQTtZQUNBLElBQUEsUUFBQSxLQUFBO1lBQ0EsSUFBQSxPQUFBLEtBQUE7WUFDQSxJQUFBLFNBQUEsRUFBQSxNQUFBOztZQUVBLGVBQUEsZUFBQSxPQUFBLEtBQUEsT0FBQSxLQUFBLE9BQUEsTUFBQSxVQUFBLEtBQUEsVUFBQSxRQUFBO2dCQUNBLElBQUEsY0FBQTtvQkFDQSxPQUFBO29CQUNBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxNQUFBLGFBQUE7b0JBQ0EsTUFBQSxPQUFBO29CQUNBLGNBQUEsYUFBQTs7Z0JBRUEsbUJBQUEsUUFBQTtnQkFDQSxhQUFBLFFBQUEsc0JBQUEsS0FBQSxVQUFBO2dCQUNBLGFBQUEsbUJBQUE7Z0JBQ0EsUUFBQTtlQUNBLFVBQUEsT0FBQTtnQkFDQSxRQUFBO2dCQUNBLE9BQUEsTUFBQSxPQUFBOzs7O1FBSUEsR0FBQSxhQUFBLFlBQUE7WUFDQSxZQUFBLFNBQUEsS0FBQSxVQUFBLEtBQUE7Z0JBQ0EsSUFBQSxTQUFBLElBQUEsRUFBQSxLQUFBLFlBQUEsS0FBQSxFQUFBLE1BQUE7O2dCQUVBLG1CQUFBLE1BQUE7O2dCQUVBLEVBQUEsV0FBQSx3REFBQSxZQUFBO29CQUNBLE9BQUE7bUJBQ0EsTUFBQTs7Z0JBRUEsSUFBQSxHQUFBLGdCQUFBLFVBQUEsR0FBQTtvQkFDQSxJQUFBLEVBQUEsY0FBQSxlQUFBO3dCQUNBLElBQUEsUUFBQSxFQUFBOzRCQUNBLE9BQUEsYUFBQTs0QkFDQSxLQUFBLEVBQUEsT0FBQSxLQUFBLE9BQUEsS0FBQTs0QkFDQSxLQUFBLEVBQUEsT0FBQSxLQUFBLE9BQUEsS0FBQTs0QkFDQSxTQUFBLEVBQUEsYUFBQSxJQUFBOzs7d0JBR0EsSUFBQSxPQUFBLFNBQUEsRUFBQSxNQUFBLGNBQUE7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KCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnLCBbXG4gICAgICAgICdzaWdtYS5jb25maWcnLFxuICAgICAgICAnbmdDb29raWVzJyxcbiAgICAgICAgJ25nUmVzb3VyY2UnLFxuICAgICAgICAnbmdTYW5pdGl6ZScsXG4gICAgICAgICduZ1JvdXRlJyxcbiAgICAgICAgJ25nQW5pbWF0ZScsXG4gICAgICAgICduZW1Mb2dnaW5nJyxcbiAgICAgICAgJ3VpLWxlYWZsZXQnLFxuICAgICAgICAnYmxvY2tVSScsXG4gICAgICAgICdtZ2NyZWEubmdTdHJhcCcsXG4gICAgICAgICdjZnAuaG90a2V5cycsXG4gICAgICAgICdhbmd1bGFyLXNwaW5raXQnLFxuICAgICAgICAndG9nZ2xlLXN3aXRjaCcsXG4gICAgICAgICduZ0ZpbGVTYXZlcidcbiAgICBdKTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRyb3V0ZVByb3ZpZGVyLCAkcHJvdmlkZSwgYmxvY2tVSUNvbmZpZykge1xuICAgICAgICAvLyBGaXggc291cmNlbWFwc1xuICAgICAgICAvLyBAdXJsIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIuanMvaXNzdWVzLzUyMTcjaXNzdWVjb21tZW50LTUwOTkzNTEzXG4gICAgICAgICRwcm92aWRlLmRlY29yYXRvcignJGV4Y2VwdGlvbkhhbmRsZXInLCBmdW5jdGlvbiAoJGRlbGVnYXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGV4Y2VwdGlvbiwgY2F1c2UpIHtcbiAgICAgICAgICAgICAgICAkZGVsZWdhdGUoZXhjZXB0aW9uLCBjYXVzZSk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvdXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC53aGVuKCcvJywge1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdzZWFyY2hDb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvcGFnZXMvc2VhcmNoVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgcmVsb2FkT25TZWFyY2g6IGZhbHNlXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLndoZW4oJy9hbmFseXplJywge1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdhbmFseXplQ29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL3BhZ2VzL2FuYWx5emVUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgICAgICByZWxvYWRPblNlYXJjaDogZmFsc2VcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub3RoZXJ3aXNlKHtcbiAgICAgICAgICAgICAgICByZWRpcmVjdFRvOiAnLydcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGJsb2NrVUlDb25maWcubWVzc2FnZSA9ICdMb2FkaW5nJztcbiAgICAgICAgYmxvY2tVSUNvbmZpZy50ZW1wbGF0ZSA9ICc8ZGl2IGNsYXNzPVwiYmxvY2stdWktb3ZlcmxheVwiPjwvZGl2PjxkaXYgY2xhc3M9XCJibG9jay11aS1tZXNzYWdlLWNvbnRhaW5lclwiPjxkaXYgY2xhc3M9XCJibG9jay11aS1tZXNzYWdlXCI+PGRpdiBjbGFzcz1cImJsb2NrLXVpLW1lc3NhZ2UtdGV4dFwiPnt7IHN0YXRlLm1lc3NhZ2UgfX08L2Rpdj48ZGl2IGNsYXNzPVwiYmxvY2stdWktbWVzc2FnZS1hbmltYXRpb25cIj48dGhyZWUtYm91bmNlLXNwaW5uZXI+PC90aHJlZS1ib3VuY2Utc3Bpbm5lcj48L2Rpdj48L2Rpdj48L2Rpdj4nO1xuICAgIH0pXG4gICAgLnZhbHVlKCdtb21lbnQnLCB3aW5kb3cubW9tZW50KVxuICAgIC52YWx1ZSgnXycsIHdpbmRvdy5fKVxuICAgIC52YWx1ZSgnTCcsIHdpbmRvdy5MKVxuICAgIC52YWx1ZSgnZDMnLCB3aW5kb3cuZDMpXG4gICAgLnZhbHVlKCckJywgd2luZG93LiQpXG4gICAgLnZhbHVlKCd0b2FzdHInLCB3aW5kb3cudG9hc3RyKVxuICAgIC52YWx1ZSgnbG9jYWxTdG9yYWdlJywgd2luZG93LmxvY2FsU3RvcmFnZSlcbiAgICAudmFsdWUoJ0ltYWdlJywgd2luZG93LkltYWdlKVxuICAgIC52YWx1ZSgnTW91c2VFdmVudCcsIHdpbmRvdy5Nb3VzZUV2ZW50KVxuICAgIC52YWx1ZSgnYzMnLCB3aW5kb3cuYzMpXG4gICAgLnZhbHVlKCdYTUxIdHRwUmVxdWVzdCcsIHdpbmRvdy5YTUxIdHRwUmVxdWVzdClcbiAgICAudmFsdWUoJ0Jsb2InLCB3aW5kb3cuQmxvYilcbiAgICAudmFsdWUoJ0xMdG9NR1JTJywgd2luZG93LkxMdG9NR1JTKVxuICAgIC52YWx1ZSgnUElYSScsIHdpbmRvdy5QSVhJKVxuICAgIC52YWx1ZSgnV2hhbW15Jywgd2luZG93LldoYW1teSlcbiAgICAudmFsdWUoJ2xlYWZsZXRJbWFnZScsIHdpbmRvdy5sZWFmbGV0SW1hZ2UpXG4gICAgLnZhbHVlKCdHSUYnLCB3aW5kb3cuR0lGKTtcblxuXG5cbiAgICBhcHAucnVuKGZ1bmN0aW9uKCRyb290U2NvcGUsICR0aW1lb3V0LCAkd2luZG93LCBzaWdtYUNvbmZpZywgc2lnbWFTZXJ2aWNlLCBzdGF0ZVNlcnZpY2UpIHtcbiAgICAgICAgLy8gc2V0IGEgZ29iYWwgc2NvcGUgcGFyYW0gZm9yIHRoZSA8dGl0bGU+IGVsZW1lbnRcbiAgICAgICAgJHJvb3RTY29wZS5wYWdlVGl0bGUgPSBzaWdtYUNvbmZpZy50aXRsZTtcblxuICAgICAgICAvLyBoYW5kbGUgYW4gZXZlbnQgd2hlbiB0aGUgdmlld3BvcnQgaXMgcmVzaXplZFxuICAgICAgICB2YXIgcmVzaXplVGltZXI7XG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KS5vbigncmVzaXplJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQocmVzaXplVGltZXIpKSB7XG4gICAgICAgICAgICAgICAgLy8gdGltZXIgaXMgY3VycmVudGx5IGFjdGl2ZVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzaXplVGltZXIgPSAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBvayB0byBzZW5kIGFuIGV2ZW50XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFZpZXdwb3J0U2l6ZShzaWdtYVNlcnZpY2UuZ2V0Vmlld3BvcnRTaXplKCkpO1xuXG4gICAgICAgICAgICAgICAgLy8gZmluaXNoZWQgcmVzaXppbmcsIGFsbG93IHRpbWVyIHRvIGJlIHNldCBhZ2FpblxuICAgICAgICAgICAgICAgIHJlc2l6ZVRpbWVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSwgMzAwKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLnNlcnZpY2UoJ3NpZ21hQ29uZmlnJywgZnVuY3Rpb24gKHNpZ21hQ29uZmlnTG9jYWwsIG1vbWVudCwgXywgTCkge1xuICAgICAgICB2YXIgY2ZnID0ge1xuICAgICAgICAgICAgdGl0bGU6ICdTaWdtYScsXG4gICAgICAgICAgICBsb2dvOiAnzqMgU2lnbWEnLFxuICAgICAgICAgICAgdXJsczoge30sXG4gICAgICAgICAgICBvdmVybGF5UHJlZml4OiAnJyxcbiAgICAgICAgICAgIG1hcENlbnRlcjoge1xuICAgICAgICAgICAgICAgIGxhdDogNDQuMzY2NDI4LFxuICAgICAgICAgICAgICAgIGxuZzogLTgxLjQ1Mzk0NSxcbiAgICAgICAgICAgICAgICB6b29tOiA4XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGF5ZXJzOiB7XG4gICAgICAgICAgICAgICAgYmFzZWxheWVyczoge31cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWZhdWx0TG9jYXRpb25Gb3JtYXQ6ICdkZCcsXG4gICAgICAgICAgICBkZWZhdWx0QmFzZWxheWVyOiAnJyxcbiAgICAgICAgICAgIG1heERheXNCYWNrOiAxMDAwMCxcbiAgICAgICAgICAgIGRlZmF1bHREYXlzQmFjazogOTAsXG4gICAgICAgICAgICByYW5nZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzOiAtOTAsXG4gICAgICAgICAgICAgICAgICAgIHVuaXRPZlRpbWU6ICdkYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICc5MCBEYXlzJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB1bml0czogLTYsXG4gICAgICAgICAgICAgICAgICAgIHVuaXRPZlRpbWU6ICdtb250aHMnLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogJzYgTW9udGhzJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB1bml0czogLTEsXG4gICAgICAgICAgICAgICAgICAgIHVuaXRPZlRpbWU6ICd5ZWFyJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICcxIFllYXInXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRlZmF1bHREdXJhdGlvbkxlbmd0aDogMSxcbiAgICAgICAgICAgIGR1cmF0aW9uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdkYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdEYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICd3ZWVrcycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnV2Vla3MnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ21vbnRocycsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnTW9udGhzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ3llYXJzJyxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdZZWFycycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRlZmF1bHRMYXllckNvbnRyYXN0OiAxLFxuICAgICAgICAgICAgZGVmYXVsdExheWVyT3BhY2l0eTogNTAsXG4gICAgICAgICAgICBkZWZhdWx0U2xpZGVyU3RhcnQ6IG1vbWVudC51dGMoKS5zdWJ0cmFjdCgxLCAneScpLFxuICAgICAgICAgICAgZGVmYXVsdFNsaWRlclN0b3A6IG1vbWVudC51dGMoKS5lbmRPZignZCcpLFxuICAgICAgICAgICAgZGVmYXVsdEVuYWJsZUNvdmVyYWdlOiBmYWxzZSxcbiAgICAgICAgICAgIGRlZmF1bHRQcm9qZWN0aW9uOiBMLkNSUy5FUFNHNDMyNixcbiAgICAgICAgICAgIHBsYXliYWNrSW50ZXJ2YWxzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0hvdXJzJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdoJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdEYXlzJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdkJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1dlZWtzJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICd3JyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgY29udHJhc3RMZXZlbHM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTG93JyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3VybGxvdycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTWVkaXVtJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3VybCcsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdIaWdoJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3VybGhpZ2gnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBkZWZhdWx0UGxheWJhY2tJbnRlcnZhbFF0eTogMSxcbiAgICAgICAgICAgIG1heFBsYXliYWNrRGVsYXk6IDgwMCxcbiAgICAgICAgICAgIGRlZmF1bHRJbWFnZVF1YWxpdHk6IDAsXG4gICAgICAgICAgICBtaW5pbXVtRnJhbWVEdXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIGludGVydmFsOiAnaCcsIC8vIG11c3QgYmUgYSB2YWxpZCBtb21lbnRqcyBzaG9ydGhhbmQga2V5OiBodHRwOi8vbW9tZW50anMuY29tL2RvY3MvIy9tYW5pcHVsYXRpbmcvYWRkL1xuICAgICAgICAgICAgICAgIHZhbHVlOiAxXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWluaW11bUFPSUR1cmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgaW50ZXJ2YWw6ICdoJywgLy8gbXVzdCBiZSBhIHZhbGlkIG1vbWVudGpzIHNob3J0aGFuZCBrZXk6IGh0dHA6Ly9tb21lbnRqcy5jb20vZG9jcy8jL21hbmlwdWxhdGluZy9hZGQvXG4gICAgICAgICAgICAgICAgdmFsdWU6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWJvdW5jZVRpbWU6IDMwMCxcbiAgICAgICAgICAgIG1heGltdW1SZWNlbnRBT0lzOiA1LFxuICAgICAgICAgICAgbWF4aW11bVJlY2VudFBvaW50czogNSxcbiAgICAgICAgICAgIGFvaUFuYWx5c2lzVmFsdWVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbWluJyxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdNaW4nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdtYXgnLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ01heCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ21lYW4nLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ01lYW4nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyB7XG4gICAgICAgICAgICAgICAgLy8gICAgIG5hbWU6ICdtZWRpYW4nLFxuICAgICAgICAgICAgICAgIC8vICAgICB0aXRsZTogJ01lZGlhbidcbiAgICAgICAgICAgICAgICAvLyB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3N0ZGV2JyxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdTdGFuZGFyZCBEZXZpYXRpb24nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGJhbmRzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1Zpc2libGUnLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAndmlzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1NXSVInLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnc3dpcicsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnVklJUlNfRE5CJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3ZpaXJzX2RuYicsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTVdJUicsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdtd2lyJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgY29tcG9uZW50czoge1xuICAgICAgICAgICAgICAgIGNvdmVyYWdlRmlsdGVyOiB0cnVlLFxuICAgICAgICAgICAgICAgIGFvaUFuYWx5c2lzOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1hcDoge1xuICAgICAgICAgICAgICAgICAgICBjb250cm9sczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29ycmVsYXRpb246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludGNvbnZlcnRlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY3RhbmdsZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBnb3RvOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGxheWJhY2tXaXRoR2FwczogZmFsc2UsXG4gICAgICAgICAgICBwb2ludGNvbnZlcnRlck1hcmtlck9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICByZXBlYXRNb2RlOiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvcnJlbGF0aW9uTWFya2VyT3B0aW9uczoge1xuICAgICAgICAgICAgICAgIHJlcGVhdE1vZGU6IGZhbHNlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW1hZ2VGaWx0ZXJzOiB7XG4gICAgICAgICAgICAgICAgb3BhY2l0eToge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiA1MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYnJpZ2h0bmVzczoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDIwMCxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogMTAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjb250cmFzdDoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDIwMCxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogMTAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaGFycGVuOiB7XG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMyxcbiAgICAgICAgICAgICAgICAgICAgdW5pdHM6ICcnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBibHVyOiB7XG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdHYXVzc2lhbiBibHVyJyxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAyNSxcbiAgICAgICAgICAgICAgICAgICAgdW5pdHM6ICcnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBodWU6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdW5pdHM6ICfCsCcsXG4gICAgICAgICAgICAgICAgICAgIG1pbjogLTE4MCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAxODBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNhdHVyYXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWluOiAtMTAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBncmF5c2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGludmVydDoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXBpYToge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBub2lzZToge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmNvZGVyczoge1xuICAgICAgICAgICAgICAgIGdpZjoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB3b3JrZXJzOiA0LFxuICAgICAgICAgICAgICAgICAgICBxdWFsaXR5OiAxMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgd2VibToge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBxdWFsaXR5OiAwLjkyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlZmF1bHRFbmNvZGVyOiAnd2VibScsXG4gICAgICAgICAgICBzZW5zb3JzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZDogMCxcbiAgICAgICAgICAgICAgICBuYW1lOiAnYWxsJyxcbiAgICAgICAgICAgICAgICB0aXRsZTogJ0FsbCcsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6IDEsXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NlbnNvcjEnLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAnU2Vuc29yIE9uZScsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiAyLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdzZW5zb3IyJyxcbiAgICAgICAgICAgICAgICB0aXRsZTogJ1NlbnNvciBUd28nLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyByZWN1cnNpdmVseSBtZXJnZSB0aGUgbG9jYWwgY29uZmlnIG9udG8gdGhlIGRlZmF1bHQgY29uZmlnXG4gICAgICAgIGFuZ3VsYXIubWVyZ2UoY2ZnLCBzaWdtYUNvbmZpZ0xvY2FsKTtcblxuICAgICAgICBpZiAodHlwZW9mIGNmZy5kZWZhdWx0UHJvamVjdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIGRlZmF1bHRQcm9qZWN0aW9uIGhhcyBiZWVuIG92ZXJ3cml0dGVuIGluIGxvY2FsIGNvbmZpZ1xuICAgICAgICAgICAgLy8gb25seSBhIHN0cmluZyB2YWx1ZSBjYW4gYmUgc3BlY2lmaWVkIGluIGxvY2FsIGNvbmZpZywgc28gdXNlIGV2YWwgdG8gcHJvZHVjZSB0aGUgcHJvcGVyIEpTIG9iamVjdFxuICAgICAgICAgICAgY2ZnLmRlZmF1bHRQcm9qZWN0aW9uID0gZXZhbChjZmcuZGVmYXVsdFByb2plY3Rpb24pOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2ZnO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZmFjdG9yeSgnQ2FudmFzSW1hZ2VPdmVybGF5JywgZnVuY3Rpb24gKFxuICAgICAgICBQSVhJLFxuICAgICAgICBMLFxuICAgICAgICBsZWFmbGV0RGF0YSxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICAvLyBDb25zdHJ1Y3RvclxuICAgICAgICB2YXIgQ2FudmFzSW1hZ2VPdmVybGF5ID0gZnVuY3Rpb24gKGZyYW1lcywgY3VycmVudElkeCwgbGF5ZXIsIHRleHRMYXllciwgb3BhY2l0eSwgY2xpcHBpbmcsIGludmVydCwgZ3JheXNjYWxlLCBzZXBpYSwgbm9pc2UsIGNvbnRyYXN0LCBicmlnaHRuZXNzLCBodWUsIHNhdHVyYXRpb24sIHNoYXJwZW4sIGJsdXIpIHtcbiAgICAgICAgICAgIHRoaXMuZnJhbWVzID0gZnJhbWVzIHx8IFtdO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50SWR4ID0gY3VycmVudElkeCB8fCAwO1xuICAgICAgICAgICAgdGhpcy5sYXllciA9IGxheWVyO1xuICAgICAgICAgICAgdGhpcy50ZXh0TGF5ZXIgPSB0ZXh0TGF5ZXIgfHwgbmV3IFBJWEkuVGV4dCgnJywge1xuICAgICAgICAgICAgICAgIGZvbnQ6ICczMDAgMThweCBBcmlhbCcsXG4gICAgICAgICAgICAgICAgZmlsbDogJyNmZmYnLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogJyMwMDAnLFxuICAgICAgICAgICAgICAgIHN0cm9rZVRoaWNrbmVzczogMlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLm9wYWNpdHkgPSBvcGFjaXR5IHx8IDUwO1xuICAgICAgICAgICAgdGhpcy5jbGlwcGluZyA9IGNsaXBwaW5nIHx8IDA7XG4gICAgICAgICAgICB0aGlzLmludmVydCA9IGludmVydCB8fCAwO1xuICAgICAgICAgICAgdGhpcy5ncmF5c2NhbGUgPSBncmF5c2NhbGUgfHwgMDtcbiAgICAgICAgICAgIHRoaXMuc2VwaWEgPSBzZXBpYSB8fCAwO1xuICAgICAgICAgICAgdGhpcy5ub2lzZSA9IG5vaXNlIHx8IDA7XG4gICAgICAgICAgICB0aGlzLmNvbnRyYXN0ID0gY29udHJhc3QgfHwgMTAwO1xuICAgICAgICAgICAgdGhpcy5icmlnaHRuZXNzID0gYnJpZ2h0bmVzcyB8fCAxMDA7XG4gICAgICAgICAgICB0aGlzLmh1ZSA9IGh1ZSB8fCAwO1xuICAgICAgICAgICAgdGhpcy5zYXR1cmF0aW9uID0gc2F0dXJhdGlvbiB8fCAwO1xuICAgICAgICAgICAgdGhpcy5zaGFycGVuID0gc2hhcnBlbiB8fCAwO1xuICAgICAgICAgICAgdGhpcy5ibHVyID0gYmx1ciB8fCAwO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBfY2lvSW5zdGFuY2UgPSBudWxsO1xuXG4gICAgICAgIC8vIHByaXZhdGUgbWV0aG9kc1xuICAgICAgICAvKipcbiAgICAgICAgICogSW50ZXJuYWwgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgcGFzc2VkIGludG8gdGhlIG92ZXJsYXlcbiAgICAgICAgICogYXMgdGhlIGRyYXdpbmcgZnVuY3Rpb24uIFRoZSBzaG91bGQgYmUgY2FsbGVkIGZyb20gdGhlIGxheWVyXG4gICAgICAgICAqIGl0c2VsZiwgZWcgdGhpcy5sYXllci5yZWRyYXcoKS5cbiAgICAgICAgICogQHBhcmFtICB7UElYSS5XZWJHTFJlbmRlcmVyLFBJWEkuQ2FudmFzUmVuZGVyZXJ9IHBpeGlSZW5kZXJlclxuICAgICAgICAgKiAgICAgICAgIEFuIGF1dG9kZXRlY3RlZCByZW5kZXJlciBiYXNlZCBvbiBhdmFpbGFibGUgdGVjaHMuXG4gICAgICAgICAqIEBwYXJhbSAge29iamVjdH0gcGFyYW1zIENhbGxiYWNrIHBhcmFtcyBjb250YWluaW5nIHRoZSBzdGFnZVxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIsIGFuZCB0aGUgYm91bmRzLCBzaXplLCB6b29tLFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQgem9vbVNjYWxlIG9mIHRoZSBtYXAuXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgX3JlbmRlciA9IGZ1bmN0aW9uIChwaXhpUmVuZGVyZXIsIHBhcmFtcykge1xuICAgICAgICAgICAgdmFyIGJvdW5kcyxcbiAgICAgICAgICAgICAgICB0b3BMZWZ0LFxuICAgICAgICAgICAgICAgIHNpemUsXG4gICAgICAgICAgICAgICAgaW52ZXJ0RmlsdGVyID0gbmV3IFBJWEkuZmlsdGVycy5JbnZlcnRGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBncmF5RmlsdGVyID0gbmV3IFBJWEkuZmlsdGVycy5HcmF5RmlsdGVyKCksXG4gICAgICAgICAgICAgICAgc2VwaWFGaWx0ZXIgPSBuZXcgUElYSS5maWx0ZXJzLlNlcGlhRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgbm9pc2VGaWx0ZXIgPSBuZXcgUElYSS5maWx0ZXJzLk5vaXNlRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgLy9jb250cmFzdEZpbHRlciA9IG5ldyBQSVhJLmZpbHRlcnMuQ29sb3JNYXRyaXhGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBicmlnaHRuZXNzRmlsdGVyID0gbmV3IFBJWEkuZmlsdGVycy5Db2xvck1hdHJpeEZpbHRlcigpLFxuICAgICAgICAgICAgICAgIGh1ZUZpbHRlciA9IG5ldyBQSVhJLmZpbHRlcnMuQ29sb3JNYXRyaXhGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBzYXR1cmF0aW9uRmlsdGVyID0gbmV3IFBJWEkuZmlsdGVycy5Db2xvck1hdHJpeEZpbHRlcigpLFxuICAgICAgICAgICAgICAgIHNoYXJwZW5NYXRyaXggPSBbIDAsIC0xLCAgMCwgLTEsICA1LCAtMSwgMCwgLTEsICAwIF0sXG4gICAgICAgICAgICAgICAgYmx1ckZpbHRlciA9IG5ldyBQSVhJLmZpbHRlcnMuQmxvb21GaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBmaWx0ZXJzVG9BcHBseTtcblxuICAgICAgICAgICAgXy5mb3JFYWNoKF9jaW9JbnN0YW5jZS5mcmFtZXMsIGZ1bmN0aW9uIChmcmFtZSwgZnJhbWVJZHgpIHtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goZnJhbWUuaW1hZ2VzLCBmdW5jdGlvbiAob3ZlcmxheSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYXJrIGFsbCBzcHJpdGVzIGFzIGhpZGRlblxuICAgICAgICAgICAgICAgICAgICBvdmVybGF5LnNwcml0ZS52aXNpYmxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gc2hvdyBvbmx5IGlmIHRoZSBjdXJyZW50IGlkeCBpcyBhdCB0aGUgZnJhbWUgaWR4XG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZCBpZiB0aGUgb3ZlcmxheSBpdHNlbGYgaGFzIGJlZW4gZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoX2Npb0luc3RhbmNlLmN1cnJlbnRJZHggPT09IGZyYW1lSWR4ICYmIG92ZXJsYXkuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHRoZSBib3VuZHMgYW5kIHNpemUgb2YgdGhlIHNwcml0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gTC5sYXRMbmdCb3VuZHMob3ZlcmxheS5ib3VuZHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9wTGVmdCA9IF9jaW9JbnN0YW5jZS5sYXllci5fbWFwLmxhdExuZ1RvQ29udGFpbmVyUG9pbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm91bmRzLmdldE5vcnRoV2VzdCgpXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZSA9IF9jaW9JbnN0YW5jZS5sYXllci5fbWFwLmxhdExuZ1RvQ29udGFpbmVyUG9pbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm91bmRzLmdldFNvdXRoRWFzdCgpXG4gICAgICAgICAgICAgICAgICAgICAgICApLl9zdWJ0cmFjdCh0b3BMZWZ0KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBwb3NpdGlvbiBhbmQgc2l6ZVxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheS5zcHJpdGUueCA9IHRvcExlZnQueDtcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJsYXkuc3ByaXRlLnkgPSB0b3BMZWZ0Lnk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdmVybGF5LnNwcml0ZS53aWR0aCA9IHNpemUueDtcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJsYXkuc3ByaXRlLmhlaWdodCA9IHNpemUueTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgdGhlIGZsYWcgb24gdGhlIG92ZXJsYXkgZGlyZWN0bHkgKG5vdCB0aGUgc3ByaXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG92ZXJsYXkudmlzaWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJsYXkuc3ByaXRlLmFscGhhID0gX2Npb0luc3RhbmNlLm9wYWNpdHkgLyAxMDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheS5zcHJpdGUudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJsYXkuc3ByaXRlLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIG9ubHkgYWRkIGZpbHRlcnMgaWYgbmVjZXNzYXJ5XG4gICAgICAgICAgICBmaWx0ZXJzVG9BcHBseSA9IFtdO1xuXG4gICAgICAgICAgICBpZiAoX2Npb0luc3RhbmNlLmludmVydCA+IDApIHtcbiAgICAgICAgICAgICAgICBpbnZlcnRGaWx0ZXIuaW52ZXJ0ID0gcGFyc2VGbG9hdChfY2lvSW5zdGFuY2UuaW52ZXJ0KSAvIDEwMDtcbiAgICAgICAgICAgICAgICBmaWx0ZXJzVG9BcHBseS5wdXNoKGludmVydEZpbHRlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChfY2lvSW5zdGFuY2UuZ3JheXNjYWxlID4gMCkge1xuICAgICAgICAgICAgICAgIGdyYXlGaWx0ZXIuZ3JheSA9IHBhcnNlRmxvYXQoX2Npb0luc3RhbmNlLmdyYXlzY2FsZSkgLyAxMDA7XG4gICAgICAgICAgICAgICAgZmlsdGVyc1RvQXBwbHkucHVzaChncmF5RmlsdGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKF9jaW9JbnN0YW5jZS5zZXBpYSA+IDApIHtcbiAgICAgICAgICAgICAgICBzZXBpYUZpbHRlci5zZXBpYSA9IHBhcnNlRmxvYXQoX2Npb0luc3RhbmNlLnNlcGlhKSAvIDEwMDtcbiAgICAgICAgICAgICAgICBmaWx0ZXJzVG9BcHBseS5wdXNoKHNlcGlhRmlsdGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKF9jaW9JbnN0YW5jZS5ub2lzZSA+IDApIHtcbiAgICAgICAgICAgICAgICBub2lzZUZpbHRlci5ub2lzZSA9IHBhcnNlRmxvYXQoX2Npb0luc3RhbmNlLm5vaXNlKSAvIDEwMDtcbiAgICAgICAgICAgICAgICBmaWx0ZXJzVG9BcHBseS5wdXNoKG5vaXNlRmlsdGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVE9ETyB0aGlzIGRvZXNuJ3Qgd29ya1xuICAgICAgICAgICAgLy8gcmVwbGFjZWQgd2l0aCBDU1MgcHJvcGVydHkgb24gZW50aXJlIGNhbnZhcyBpbnN0ZWFkXG4gICAgICAgICAgICAvKmlmIChfY2lvSW5zdGFuY2UuY29udHJhc3QpIHtcbiAgICAgICAgICAgICBjb250cmFzdEZpbHRlci5jb250cmFzdChwYXJzZUZsb2F0KF9jaW9JbnN0YW5jZS5jb250cmFzdCkpO1xuICAgICAgICAgICAgIGZpbHRlcnNUb0FwcGx5LnB1c2goY29udHJhc3RGaWx0ZXIpO1xuICAgICAgICAgICAgIH0qL1xuICAgICAgICAgICAgaWYgKF9jaW9JbnN0YW5jZS5sYXllcikge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChfY2lvSW5zdGFuY2UubGF5ZXIuY2FudmFzKCkpXG4gICAgICAgICAgICAgICAgICAgIC5jc3MoJy13ZWJraXQtZmlsdGVyJywgJ2NvbnRyYXN0KCcgKyBfY2lvSW5zdGFuY2UuY29udHJhc3QgKyAnJSknKVxuICAgICAgICAgICAgICAgICAgICAuY3NzKCdmaWx0ZXInLCAnY29udHJhc3QoJyArIF9jaW9JbnN0YW5jZS5jb250cmFzdCArICclKScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoX2Npb0luc3RhbmNlLmJyaWdodG5lc3MgIT09IDEwMCkge1xuICAgICAgICAgICAgICAgIGJyaWdodG5lc3NGaWx0ZXIuYnJpZ2h0bmVzcyhwYXJzZUZsb2F0KF9jaW9JbnN0YW5jZS5icmlnaHRuZXNzKSAvIDEwMCk7XG4gICAgICAgICAgICAgICAgZmlsdGVyc1RvQXBwbHkucHVzaChicmlnaHRuZXNzRmlsdGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKF9jaW9JbnN0YW5jZS5odWUpIHtcbiAgICAgICAgICAgICAgICBodWVGaWx0ZXIuaHVlKHBhcnNlRmxvYXQoX2Npb0luc3RhbmNlLmh1ZSkpO1xuICAgICAgICAgICAgICAgIGZpbHRlcnNUb0FwcGx5LnB1c2goaHVlRmlsdGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKF9jaW9JbnN0YW5jZS5zYXR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgc2F0dXJhdGlvbkZpbHRlci5zYXR1cmF0ZShwYXJzZUZsb2F0KF9jaW9JbnN0YW5jZS5zYXR1cmF0aW9uKSAvIDEwMCk7XG4gICAgICAgICAgICAgICAgZmlsdGVyc1RvQXBwbHkucHVzaChzYXR1cmF0aW9uRmlsdGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKF9jaW9JbnN0YW5jZS5ibHVyKSB7XG4gICAgICAgICAgICAgICAgYmx1ckZpbHRlci5ibHVyID0gcGFyc2VGbG9hdChfY2lvSW5zdGFuY2UuYmx1cik7XG4gICAgICAgICAgICAgICAgZmlsdGVyc1RvQXBwbHkucHVzaChibHVyRmlsdGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgXy5mb3JFYWNoKF8ucmFuZ2UoX2Npb0luc3RhbmNlLnNoYXJwZW4pLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyc1RvQXBwbHkucHVzaChcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBJWEkuZmlsdGVycy5Db252b2x1dGlvbkZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYXJwZW5NYXRyaXgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc3RhZ2Uud2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc3RhZ2UuaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIGFkZCBhbGwgZmlsdGVycyB0byB0aGUgc3RhZ2UgYW5kIHJlbmRlclxuICAgICAgICAgICAgcGFyYW1zLnN0YWdlLmZpbHRlcnMgPSBmaWx0ZXJzVG9BcHBseS5sZW5ndGggPyBmaWx0ZXJzVG9BcHBseSA6IG51bGw7XG4gICAgICAgICAgICBwYXJhbXMucmVuZGVyZXIucmVuZGVyKHBhcmFtcy5zdGFnZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcHVibGljIG1ldGhvZHNcbiAgICAgICAgQ2FudmFzSW1hZ2VPdmVybGF5LnByb3RvdHlwZSA9IHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQXR0YWNoIGEgbmV3IGFycmF5IG9mIGZyYW1lcyB0byB0aGUgY2FudmFzIGxheWVyLiBFYWNoXG4gICAgICAgICAgICAgKiBvdmVybGF5IGluIGVhY2ggZnJhbWUgd2lsbCBiZSBhZGRlZCB0byB0aGUgc3RhZ2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHthcnJheX0gdmFsIEFuIGFycmF5IG9mIGZyYW1lIG9iamVjdHMsIGVhY2ggY29udGFpbmluZ1xuICAgICAgICAgICAgICogICAgICAgICAgICAgICAgICAgICBhbiBhcnJheSBvZiBvdmVybGF5IG9iamVjdHMuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9ICAgIHRoaXNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmZyYW1lcyA9IHZhbDtcblxuICAgICAgICAgICAgICAgICAgICBzZWxmLmxheWVyLnN0YWdlKCkucmVtb3ZlQ2hpbGRyZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKHNlbGYuZnJhbWVzLCBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChmcmFtZS5pbWFnZXMsIGZ1bmN0aW9uIChvdmVybGF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5sYXllci5zdGFnZSgpLmFkZENoaWxkKG92ZXJsYXkuc3ByaXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNhdmVzIGEgc2luZ2xlIGZyYW1lIGFuZCBhZGRzIGl0IHRvIHRoZSBjYW52YXMgbGF5ZXIncyBzdGFnZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge29iamVjdH0gZnJhbWUgQSBmcmFtZSBvYmplY3QgY29udGFpbmluZyBhbiBhcnJheSBvZlxuICAgICAgICAgICAgICogICAgICAgICAgICAgICAgICAgICAgICBvdmVybGF5IG9iamVjdHMuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgIFtkZXNjcmlwdGlvbl1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWRkOiBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QoZnJhbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZnJhbWVzLnB1c2goZnJhbWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChmcmFtZS5pbWFnZXMsIGZ1bmN0aW9uIChvdmVybGF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmxheWVyLnN0YWdlKCkuYWRkQ2hpbGQob3ZlcmxheS5zcHJpdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHJpZXZlIGVpdGhlciBhIHNpbmdsZSBmcmFtZSBvciB0aGUgZW50aXJlIGZyYW1lcyBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICogQHBhcmFtICB7aW50LHVuZGVmaW5lZH0gaWR4IFRoZSBpbmRleCB3aXRoaW4gZnJhbWVzIHRvIHJldHJpZXZlLFxuICAgICAgICAgICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlYXZlIGJsYWNrIGZvciB0aGUgZW50aXJlIGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3QsYXJyYXl9ICBBIHNpbmdsZSBmcmFtZSBvciBhbGwgZnJhbWVzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKGlkeCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoaWR4KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5mcmFtZXNbaWR4XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuZnJhbWVzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDbGVhcnMgdGhlIGZyYW1lcywgcmVzZXRzIHRoZSBpbmRleCwgYW5kIHJlbW92ZXMgY2hpbGRyZW4gZnJvbVxuICAgICAgICAgICAgICogdGhlIGNhbnZhcyBsYXllcidzIHN0YWdlLCBhbmQgcmVkcmF3cyB0aGUgbGF5ZXIuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IHRoaXNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYubGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sYXllci5zdGFnZSgpLnJlbW92ZUNoaWxkcmVuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYuZnJhbWVzID0gW107XG4gICAgICAgICAgICAgICAgc2VsZi5jdXJyZW50SWR4ID0gMDtcbiAgICAgICAgICAgICAgICBzZWxmLnJlZHJhdygpO1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXRzIHRoZSBpbnRlcm5hbCBpbmRleCBvZiB0aGUgZnJhbWUgdG8gdGhlIGdpdmVuIHZhbHVlIGFuZFxuICAgICAgICAgICAgICogcmVkcmF3cyB0aGUgY2FudmFzIGxheWVyLlxuICAgICAgICAgICAgICogQHBhcmFtICB7aW50fSBpZHggVGhlIGluZGV4IHdpdGhpbiB0aGlzLmZyYW1lcyB0byBkcmF3XG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9ICB0aGlzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNldElkeDogZnVuY3Rpb24gKGlkeCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICBzZWxmLmN1cnJlbnRJZHggPSBpZHg7XG4gICAgICAgICAgICAgICAgc2VsZi5yZWRyYXcoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSGVscGVyIHRvIHJlZHJhdyB0aGUgY2FudmFzIGxheWVyJ3MgcmVkcmF3IGZ1bmN0aW9uLiBEcmF3c1xuICAgICAgICAgICAgICogYSB0ZXh0IGxheWVyLCBpZiBhbnksIHRvIGVuc3VyZSBpdCdzIGF0IHRoZSB0b3Agb2YgdGhlIHN0YWNrLlxuICAgICAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSB0aGlzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlZHJhdzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5sYXllcikge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnRleHRMYXllci5hbHBoYSA9IDAuOTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sYXllci5fc3RhZ2UuYWRkQ2hpbGQoc2VsZi50ZXh0TGF5ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLmxheWVyLl9yZWRyYXcoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIC8vIGxlYWZsZXQgbWFwIGlzIHJldHVybmVkIGZyb20gYSBwcm9taXNlXG4gICAgICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAobWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubGF5ZXIgPSBMLnBpeGlPdmVybGF5KClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5kcmF3aW5nKF9yZW5kZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkVG8obWFwKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmJyaW5nVG9CYWNrKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgX2Npb0luc3RhbmNlID0gc2VsZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBzdGF0aWMgbWV0aG9kc1xuICAgICAgICBDYW52YXNJbWFnZU92ZXJsYXkuYnVpbGQgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENhbnZhc0ltYWdlT3ZlcmxheShcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5mcmFtZXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY3VycmVudElkeCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5sYXllcixcbiAgICAgICAgICAgICAgICAgICAgZGF0YS50ZXh0TGF5ZXIsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEub3BhY2l0eSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5jbGlwcGluZyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5pbnZlcnQsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZ3JheXNjYWxlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLnNlcGlhLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLm5vaXNlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbnRyYXN0LFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmJyaWdodG5lc3MsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaHVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLnNhdHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuc2hhcnBlbixcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5ibHVyXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgQ2FudmFzSW1hZ2VPdmVybGF5KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgQ2FudmFzSW1hZ2VPdmVybGF5LnRyYW5zZm9ybWVyID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tYXAoQ2FudmFzSW1hZ2VPdmVybGF5LmJ1aWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBDYW52YXNJbWFnZU92ZXJsYXkuYnVpbGQoZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIENhbnZhc0ltYWdlT3ZlcmxheTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmZhY3RvcnkoJ092ZXJsYXknLCBmdW5jdGlvbiAoXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIFBJWElcbiAgICApIHtcbiAgICAgICAgLy8gQ29uc3RydWN0b3JcbiAgICAgICAgdmFyIE92ZXJsYXkgPSBmdW5jdGlvbiAodXJsLCBpbWFnZVNyYywgaW1hZ2VRdWFsaXR5LCBib3VuZHMsIHRpbWUsIGVuYWJsZWQsIG9ubG9hZCkge1xuICAgICAgICAgICAgdGhpcy51cmwgPSBzaWdtYUNvbmZpZy5vdmVybGF5UHJlZml4ICsgdXJsO1xuICAgICAgICAgICAgLy8gVE9ETyBuZWVkIGltYWdlU3JjP1xuICAgICAgICAgICAgdGhpcy5zcmMgPSBpbWFnZVNyYztcbiAgICAgICAgICAgIHRoaXMuaW1hZ2VRdWFsaXR5ID0gaW1hZ2VRdWFsaXR5O1xuICAgICAgICAgICAgdGhpcy5ib3VuZHMgPSBib3VuZHM7XG4gICAgICAgICAgICB0aGlzLnRpbWUgPSB0aW1lO1xuICAgICAgICAgICAgdGhpcy5lbmFibGVkID0gZW5hYmxlZDtcbiAgICAgICAgICAgIHRoaXMudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLm9ubG9hZCA9IG9ubG9hZDsgLy8gdXNlIGZvciBjYWxsYmFjayBvZiBpbWFnZSBsb2FkXG4gICAgICAgICAgICB0aGlzLnNwcml0ZSA9IG51bGw7XG5cbiAgICAgICAgICAgIHRoaXMuaW5pdEltYWdlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcHVibGljIG1ldGhvZHNcbiAgICAgICAgT3ZlcmxheS5wcm90b3R5cGUgPSB7XG4gICAgICAgICAgICBpbWFnZUxvYWRlZDogZnVuY3Rpb24gKHNwcml0ZSwgZXJyKSB7XG4gICAgICAgICAgICAgICAgLy8gY2FsbCB0aGUgb25sb2FkIGZ1bmN0aW9uLCBpZiBhbnlcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKHRoaXMub25sb2FkKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9ubG9hZChlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGFkZCBpdCB0byB0aGUgcGl4aSBzdGFnZSBsYXllclxuICAgICAgICAgICAgICAgIHZhciBjYW52YXNJbWFnZU92ZXJsYXkgPSBzdGF0ZVNlcnZpY2UuZ2V0Q2FudmFzSW1hZ2VPdmVybGF5KCk7XG4gICAgICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5LmxheWVyLnN0YWdlKCkuYWRkQ2hpbGQoc3ByaXRlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbml0SW1hZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdmFyIHNwcml0ZSA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZSh0aGlzLnNyYyk7XG5cbiAgICAgICAgICAgICAgICBzcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNwcml0ZS50ZXh0dXJlLmJhc2VUZXh0dXJlLmhhc0xvYWRlZCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmltYWdlTG9hZGVkKHNwcml0ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc3ByaXRlLnRleHR1cmUuYmFzZVRleHR1cmUub24oJ2xvYWRlZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5pbWFnZUxvYWRlZChzcHJpdGUsIGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5zcHJpdGUgPSBzcHJpdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gc3RhdGljIG1ldGhvZHNcbiAgICAgICAgT3ZlcmxheS5idWlsZCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgT3ZlcmxheShcbiAgICAgICAgICAgICAgICAgICAgZGF0YS51cmwsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaW1hZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaW1hZ2VxdWFsaXR5LCAvLyBwYXJhbSBmcm9tIGFwaSBpcyBhbGwgbG93ZXJjYXNlXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuYm91bmRzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLnRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZW5hYmxlZFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IE92ZXJsYXkoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBPdmVybGF5LnRyYW5zZm9ybWVyID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tYXAoT3ZlcmxheS5idWlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gT3ZlcmxheS5idWlsZChkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gT3ZlcmxheTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLnNlcnZpY2UoJ2FuYWx5emVTZXJ2aWNlJywgZnVuY3Rpb24gKFxuICAgICAgICAkcSxcbiAgICAgICAgJGh0dHAsXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIHNpZ21hU2VydmljZVxuICAgICkge1xuICAgICAgICB2YXIgZ2V0RERCb3VuZHMgPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgICAgICAgICAgIHZhciBib3VuZHMgPSBzaWdtYVNlcnZpY2UuZ2V0RERCb3VuZHMobG9jYXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuOiBib3VuZHNbMV1bMF0sXG4gICAgICAgICAgICAgICAgZTogYm91bmRzWzBdWzFdLFxuICAgICAgICAgICAgICAgIHM6IGJvdW5kc1swXVswXSxcbiAgICAgICAgICAgICAgICB3OiBib3VuZHNbMV1bMV1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gT25seSB1c2Ugc2Vuc29yIGlkIHBhcmFtIGlmIGEgcGFydGljdWxhciBzZW5zb3IgaXMgc2VsZWN0ZWQsIHNldCB0byBudWxsIGlmIFwiQWxsXCIgaXMgc2VsZWN0ZWRcbiAgICAgICAgdmFyIGdldFNlbnNvclBhcmFtID0gZnVuY3Rpb24gKHNlbnNvcikge1xuICAgICAgICAgIHJldHVybiBzZW5zb3IgPj0gMSA/IHNlbnNvciA6IG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldE92ZXJsYXlQYXJhbXMgPSBmdW5jdGlvbiAoc3RhcnQsIHN0b3AsIGJhbmQsIGxvY2F0aW9uLCBzZW5zb3IpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgIHN0b3A6IHN0b3AsXG4gICAgICAgICAgICAgICAgYmFuZDogYmFuZCxcbiAgICAgICAgICAgICAgICBzZW5zb3I6IGdldFNlbnNvclBhcmFtKHNlbnNvcilcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChsb2NhdGlvbikge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHBhcmFtcywgZ2V0RERCb3VuZHMobG9jYXRpb24pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZ2V0UG9pbnRDb252ZXJ0ZXJQYXJhbXMgPSBmdW5jdGlvbiAoc3RhcnQsIHN0b3AsIGxhdCwgbG5nLCBiYW5kLCBpbWFnZVF1YWxpdHksIHNlbnNvcikge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgICAgICAgc3RvcDogc3RvcCxcbiAgICAgICAgICAgICAgICBsYXQ6IGxhdCxcbiAgICAgICAgICAgICAgICBsbmc6IGxuZyxcbiAgICAgICAgICAgICAgICBiYW5kOiBiYW5kLFxuICAgICAgICAgICAgICAgIGltYWdlcXVhbGl0eTogaW1hZ2VRdWFsaXR5LFxuICAgICAgICAgICAgICAgIHNlbnNvcjogc2Vuc29yXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRBb2lQYXJhbXMgPSBmdW5jdGlvbiAoc3RhcnQsIHN0b3AsIGxvY2F0aW9uLCB0eXBlLCBiYW5kLCByZXR1cm50eXBlLCBpbWFnZVF1YWxpdHksIHNlbnNvcikge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgICAgICAgc3RvcDogc3RvcCxcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgICAgIGJhbmQ6IGJhbmQsXG4gICAgICAgICAgICAgICAgcmV0dXJudHlwZTogcmV0dXJudHlwZSxcbiAgICAgICAgICAgICAgICBpbWFnZXF1YWxpdHk6IGltYWdlUXVhbGl0eSxcbiAgICAgICAgICAgICAgICBzZW5zb3I6IHNlbnNvclxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGxvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5leHRlbmQocGFyYW1zLCBnZXREREJvdW5kcyhsb2NhdGlvbikpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRDb3JyZWxhdGVQb2ludFBhcmFtcyA9IGZ1bmN0aW9uIChsYXQsIGxuZywgc3RhcnQsIHN0b3AsIGJhbmQsIHJldHVybnR5cGUsIGxvY2F0aW9uLCBpbWFnZVF1YWxpdHksIHNlbnNvcikge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICBsYXQ6IGxhdCxcbiAgICAgICAgICAgICAgICBsbmc6IGxuZyxcbiAgICAgICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgICAgICAgc3RvcDogc3RvcCxcbiAgICAgICAgICAgICAgICBiYW5kOiBiYW5kLFxuICAgICAgICAgICAgICAgIHJldHVybnR5cGU6IHJldHVybnR5cGUsXG4gICAgICAgICAgICAgICAgaW1hZ2VxdWFsaXR5OiBpbWFnZVF1YWxpdHksXG4gICAgICAgICAgICAgICAgc2Vuc29yOiBzZW5zb3JcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChsb2NhdGlvbikge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHBhcmFtcywgZ2V0RERCb3VuZHMobG9jYXRpb24pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0T3ZlcmxheXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgbG9jYXRpb24gPSBzdGF0ZVNlcnZpY2UuZ2V0QmJveCgpLFxuICAgICAgICAgICAgICAgICAgICB0aW1lID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgICAgIHVybCA9IHNpZ21hQ29uZmlnLnVybHMub3ZlcmxheXMsXG4gICAgICAgICAgICAgICAgICAgIGJhbmQgPSBzdGF0ZVNlcnZpY2UuZ2V0QmFuZCgpLFxuICAgICAgICAgICAgICAgICAgICBzZW5zb3IgPSBzdGF0ZVNlcnZpY2UuZ2V0U2Vuc29yKCksXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IGdldE92ZXJsYXlQYXJhbXModGltZS5zdGFydCwgdGltZS5zdG9wLCBiYW5kLCBsb2NhdGlvbiwgc2Vuc29yKSxcbiAgICAgICAgICAgICAgICAgICAgZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwYXJhbXMpO1xuXG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBkLnJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY29udmVydFBvaW50OiBmdW5jdGlvbiAobGF0LCBsbmcsIHN0YXJ0LCBzdG9wLCBiYW5kLCBzZW5zb3IpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCksXG4gICAgICAgICAgICAgICAgICAgIGltYWdlUXVhbGl0eSA9IHN0YXRlU2VydmljZS5nZXRJbWFnZVF1YWxpdHkoKSxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gZ2V0UG9pbnRDb252ZXJ0ZXJQYXJhbXMoc3RhcnQsIHN0b3AsIGxhdCwgbG5nLCBiYW5kLCBpbWFnZVF1YWxpdHksIHNlbnNvciksXG4gICAgICAgICAgICAgICAgICAgIHVybCA9IHNpZ21hQ29uZmlnLnVybHMucG9pbnRjb252ZXJ0ZXI7XG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiBlcnJvckNhbGxiYWNrIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhbmFseXplQW9pOiBmdW5jdGlvbiAodHlwZSwgcmV0dXJudHlwZSkge1xuICAgICAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IHN0YXRlU2VydmljZS5nZXRCYm94KCksXG4gICAgICAgICAgICAgICAgICAgIHRpbWUgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICAgICAgdXJsID0gc2lnbWFDb25maWcudXJscy5hb2lhbmFseXNpcyxcbiAgICAgICAgICAgICAgICAgICAgYmFuZCA9IHN0YXRlU2VydmljZS5nZXRCYW5kKCksXG4gICAgICAgICAgICAgICAgICAgIGltYWdlUXVhbGl0eSA9IHN0YXRlU2VydmljZS5nZXRJbWFnZVF1YWxpdHkoKSxcbiAgICAgICAgICAgICAgICAgICAgc2Vuc29yID0gc3RhdGVTZXJ2aWNlLmdldFNlbnNvcigpLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSBnZXRBb2lQYXJhbXModGltZS5zdGFydCwgdGltZS5zdG9wLCBsb2NhdGlvbiwgdHlwZSwgYmFuZCwgcmV0dXJudHlwZSwgaW1hZ2VRdWFsaXR5LCBzZW5zb3IpLFxuICAgICAgICAgICAgICAgICAgICBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogcGFyYW1zXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2sgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIGVycm9yQ2FsbGJhY2sgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGNvcnJlbGF0ZVBvaW50OiBmdW5jdGlvbiAobGF0LCBsbmcsIHN0YXJ0LCBzdG9wLCByZXR1cm50eXBlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gc3RhdGVTZXJ2aWNlLmdldEJib3goKSxcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VRdWFsaXR5ID0gc3RhdGVTZXJ2aWNlLmdldEltYWdlUXVhbGl0eSgpLFxuICAgICAgICAgICAgICAgICAgICB1cmwgPSBzaWdtYUNvbmZpZy51cmxzLmNvcnJlbGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgYmFuZCA9IHN0YXRlU2VydmljZS5nZXRCYW5kKCksXG4gICAgICAgICAgICAgICAgICAgIHNlbnNvciA9IHN0YXRlU2VydmljZS5nZXRTZW5zb3IoKSxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gZ2V0Q29ycmVsYXRlUG9pbnRQYXJhbXMobGF0LCBsbmcsIHN0YXJ0LCBzdG9wLCBiYW5kLCByZXR1cm50eXBlLCBsb2NhdGlvbiwgaW1hZ2VRdWFsaXR5LCBzZW5zb3IpLFxuICAgICAgICAgICAgICAgICAgICBkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogcGFyYW1zXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2sgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5yZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIGVycm9yQ2FsbGJhY2sgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgZC5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvbWlzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmZhY3RvcnkoJ2Nvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZScsIGZ1bmN0aW9uIChMTHRvTUdSUykge1xuICAgICAgICAvL3RydW5jYXRlIGlzIGEgc2lnbiBhcHByb3ByaWF0ZSB0cnVuY2F0aW9uIGZ1bmN0aW9uXG4gICAgICAgIHZhciB0cnVuY2F0ZSA9IGZ1bmN0aW9uIChfdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChfdmFsdWUgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguY2VpbChfdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoX3ZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgbGF0aXR1ZGUgZGVjaW1hbCBkZWdyZWVzIChmbG9hdCkgaW50byBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIGFzIGEgc3RyaW5nIGluIHRoZSBmb3JtYXQ6XG4gICAgICAgICAnWFjCsFhYJ1hYLlhYWCdcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZExhdFRvRE1TTGF0ID0gZnVuY3Rpb24gKGxhdCkge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKGxhdCA8PSA5MCAmJiBsYXQgPj0gMCkge1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSB0cnVuY2F0ZShsYXQpO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB0cnVuY2F0ZSgobGF0IC0gZGVncmVlcykgKiA2MCk7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9ICgoKChsYXQgLSBkZWdyZWVzKSAqIDYwKSAtIG1pbnV0ZXMpICogNjApLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZ3JlZXMgKyAnwrAnICsgbWludXRlcyArICdcXCcnICsgc2Vjb25kcyArICdcIic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdCA8IDAgJiYgbGF0ID49IC05MCkge1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSB0cnVuY2F0ZShsYXQpO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB0cnVuY2F0ZSgoTWF0aC5hYnMobGF0KSAtIE1hdGguYWJzKGRlZ3JlZXMpKSAqIDYwKTtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gKCgoKE1hdGguYWJzKGxhdCkgLSBNYXRoLmFicyhkZWdyZWVzKSkgKiA2MCkgLSBtaW51dGVzKSAqIDYwKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWdyZWVzICsgJ8KwJyArIG1pbnV0ZXMgKyAnXFwnJyArIHNlY29uZHMgKyAnXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ludmFsaWQgTGF0aXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyBsb25naXR1ZGUgZGVjaW1hbCBkZWdyZWVzIChmbG9hdCkgaW50byBkZWdyZWVzLCBtaW51dGVzLCBzZWNvbmRzIGFzIGEgc3RyaW5nIGluIHRoZSBmb3JtYXQ6XG4gICAgICAgICAnWFjCsFhYJ1hYLlhYWCdcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZExvblRvRE1TTG9uID0gZnVuY3Rpb24gKGxvbikge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKGxvbiA8PSAxODAgJiYgbG9uID49IDApIHtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gdHJ1bmNhdGUobG9uKTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdHJ1bmNhdGUoKGxvbiAtIGRlZ3JlZXMpICogNjApO1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSAoKCgobG9uIC0gZGVncmVlcykgKiA2MCkgLSBtaW51dGVzKSAqIDYwKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWdyZWVzICsgJ8KwJyArIG1pbnV0ZXMgKyAnXFwnJyArIHNlY29uZHMgKyAnXCInO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb24gPCAwICYmIGxvbiA+PSAtMTgwKSB7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHRydW5jYXRlKChsb24pKTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdHJ1bmNhdGUoKE1hdGguYWJzKGxvbikgLSBNYXRoLmFicyhkZWdyZWVzKSkgKiA2MCk7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9ICgoKChNYXRoLmFicyhsb24pIC0gTWF0aC5hYnMoZGVncmVlcykpICogNjApIC0gbWludXRlcykgKiA2MCkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVncmVlcyArICfCsCcgKyBtaW51dGVzICsgJ1xcJycgKyBzZWNvbmRzICsgJ1wiJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdJbnZhbGlkIGxvbmdpdHVkZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLypcbiAgICAgICAgIENvbnZlcnRzIGxhdGl0dWRlIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgaW50byBkZWNpbWFsIGRlZ3JlZXMgKGZsb2F0KVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGRtc0xhdFRvRERMYXQgPSBmdW5jdGlvbiAobGF0RGVncmVlLCBsYXRNaW51dGUsIGxhdFNlY29uZCkge1xuICAgICAgICAgICAgdmFyIGRlZ3JlZXM7XG4gICAgICAgICAgICB2YXIgbWludXRlcztcbiAgICAgICAgICAgIHZhciBzZWNvbmRzO1xuICAgICAgICAgICAgaWYgKHBhcnNlRmxvYXQobGF0RGVncmVlKSA8IDApIHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gcGFyc2VGbG9hdChsYXRTZWNvbmQpIC8gNjA7XG4gICAgICAgICAgICAgICAgbWludXRlcyA9IChwYXJzZUZsb2F0KGxhdE1pbnV0ZSkgKyBzZWNvbmRzKSAvIDYwO1xuICAgICAgICAgICAgICAgIGRlZ3JlZXMgPSBwYXJzZUZsb2F0KE1hdGguYWJzKGxhdERlZ3JlZSkpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoKGRlZ3JlZXMgKyBtaW51dGVzKSAqIC0xKS50b0ZpeGVkKDYpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXJzZUZsb2F0KGxhdERlZ3JlZSkgPj0gMCkge1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBwYXJzZUZsb2F0KGxhdFNlY29uZCkgLyA2MDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gKHBhcnNlRmxvYXQobGF0TWludXRlKSArIHNlY29uZHMpIC8gNjA7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHBhcnNlRmxvYXQobGF0RGVncmVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGRlZ3JlZXMgKyBtaW51dGVzKS50b0ZpeGVkKDYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ludmFsaWQgTGF0aXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyBsb25naXR1ZGUgZGVncmVlcywgbWludXRlcywgc2Vjb25kcyBpbnRvIGRlY2ltYWwgZGVncmVlcyAoZmxvYXQpXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgZG1zTG9uVG9ERExvbiA9IGZ1bmN0aW9uIChsb25EZWdyZWUsIGxvbk1pbnV0ZSwgbG9uU2Vjb25kKSB7XG4gICAgICAgICAgICB2YXIgZGVncmVlcztcbiAgICAgICAgICAgIHZhciBtaW51dGVzO1xuICAgICAgICAgICAgdmFyIHNlY29uZHM7XG4gICAgICAgICAgICBpZiAocGFyc2VGbG9hdChsb25EZWdyZWUpIDwgMCkge1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBwYXJzZUZsb2F0KGxvblNlY29uZCkgLyA2MDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gKHBhcnNlRmxvYXQobG9uTWludXRlKSArIHNlY29uZHMpIC8gNjA7XG4gICAgICAgICAgICAgICAgZGVncmVlcyA9IHBhcnNlRmxvYXQoTWF0aC5hYnMobG9uRGVncmVlKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgoZGVncmVlcyArIG1pbnV0ZXMpICogLTEpLnRvRml4ZWQoNik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnNlRmxvYXQobG9uRGVncmVlKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9IHBhcnNlRmxvYXQobG9uU2Vjb25kKSAvIDYwO1xuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSAocGFyc2VGbG9hdChsb25NaW51dGUpICsgc2Vjb25kcykgLyA2MDtcbiAgICAgICAgICAgICAgICBkZWdyZWVzID0gcGFyc2VGbG9hdChsb25EZWdyZWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoZGVncmVlcyArIG1pbnV0ZXMpLnRvRml4ZWQoNik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnSW52YWxpZCBMb25naXR1ZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vTXlTZXJ2aWNlIGlzIGFuIG9iamVjdCB0byBjb250YWluIGFsbCBmaWVsZHMgYW5kXG4gICAgICAgIC8vZnVuY3Rpb25zIG5lY2Vzc2FyeSB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSB2YXJpb3VzXG4gICAgICAgIC8vY29udHJvbGxlcnNcbiAgICAgICAgdmFyIGNvb3JkU2VydmljZSA9IHt9O1xuXG4gICAgICAgIC8qXG4gICAgICAgICBDb252ZXJ0cyB0aGUgZGVjaW1hbCBkZWdyZWVzIG9mIGxhdGl0dWRlIGFuZCBsb25naXR1ZGUgaW5wdXQgYm94IHRoZSBvdGhlciBmb3JtYXRzIChETVMgYW5kIE1HUlMpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICBjb29yZFNlcnZpY2UucHJlcEZvckREQnJvYWRjYXN0ID0gZnVuY3Rpb24gKGxhdCwgbG9uKSB7XG4gICAgICAgICAgICBpZiAoKGxhdCB8fCBsYXQgPT09IDApICYmIGxhdCA+PSAtOTAgJiYgbGF0IDw9IDkwICYmIChsb24gfHwgbG9uID09PSAwKSAmJiBsb24gPj0gLTE4MCAmJiBsb24gPD0gMTgwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGRtczogW2RkTGF0VG9ETVNMYXQobGF0KSwgZGRMb25Ub0RNU0xvbihsb24pXSxcbiAgICAgICAgICAgICAgICAgICAgZGQ6IFtsYXQsIGxvbl0sXG4gICAgICAgICAgICAgICAgICAgIG1ncnM6ICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAobGF0ID49IC04MCAmJiBsYXQgPD0gODQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5tZ3JzID0gTEx0b01HUlMobGF0LCBsb24sIDUpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCEobGF0ID49IC04MCAmJiBsYXQgPD0gODQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCEobG9uID49IC0xODAgJiYgbG9uIDw9IDE4MCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgdGhlIGRlZ3JlZXMsIG1pbnV0ZXMsIHNlY29uZHMgc3RyaW5ncyBvZiBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlIGlucHV0IGJveCB0aGUgb3RoZXIgZm9ybWF0cyAoREQgYW5kIE1HUlMpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICBjb29yZFNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdCA9IGZ1bmN0aW9uIChsYXRETVMsIGxvbkRNUykge1xuICAgICAgICAgICAgdmFyIGxhdERlZ3JlZSwgbGF0TWludXRlLCBsYXRTZWNvbmQsIGxvbkRlZ3JlZSwgbG9uTWludXRlLCBsb25TZWNvbmQ7XG4gICAgICAgICAgICBsYXRETVMgPSBsYXRETVMucmVwbGFjZSgvW05TIF0vaWcsICcnKS5zcGxpdCgvW8KwJ1wiXS8pO1xuICAgICAgICAgICAgbG9uRE1TID0gbG9uRE1TLnJlcGxhY2UoL1tFVyBdL2lnLCAnJykuc3BsaXQoL1vCsCdcIl0vKTtcblxuICAgICAgICAgICAgaWYgKGxhdERNUy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA9IHBhcnNlSW50KGxhdERNU1swXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA9IHBhcnNlSW50KGxhdERNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA9IHBhcnNlRmxvYXQobGF0RE1TWzJdLCAxMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdERNUy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsYXRETVMgPSBsYXRETVNbMF0uc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPSBwYXJzZUZsb2F0KGxhdERNU1swXS5zdWJzdHIoLTIpICsgJy4nICsgbGF0RE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0TWludXRlID0gcGFyc2VJbnQobGF0RE1TWzBdLnN1YnN0cigtNCwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPSBwYXJzZUludChsYXRETVNbMF0uc2xpY2UoMCwgLTQpLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobG9uRE1TLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID0gcGFyc2VJbnQobG9uRE1TWzBdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uTWludXRlID0gcGFyc2VJbnQobG9uRE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID0gcGFyc2VGbG9hdChsb25ETVNbMl0sIDEwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9uRE1TLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGxvbkRNUyA9IGxvbkRNU1swXS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgICAgIGxvblNlY29uZCA9IHBhcnNlRmxvYXQobG9uRE1TWzBdLnN1YnN0cigtMikgKyAnLicgKyBsb25ETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPSBwYXJzZUludChsb25ETVNbMF0uc3Vic3RyKC00LCAyKSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbkRlZ3JlZSA9IHBhcnNlSW50KGxvbkRNU1swXS5zbGljZSgwLCAtNCksIDEwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA+PSAtOTAgJiYgbGF0RGVncmVlIDw9IDkwICYmXG4gICAgICAgICAgICAgICAgbGF0TWludXRlID49IDAgJiYgbGF0TWludXRlIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbGF0U2Vjb25kID49IDAgJiYgbGF0U2Vjb25kIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uTWludXRlID49IDAgJiYgbG9uTWludXRlIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID49IDAgJiYgbG9uU2Vjb25kIDw9IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID49IC0xODAgJiYgbG9uRGVncmVlIDw9IDE4MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobGF0RGVncmVlKSAtIHBhcnNlRmxvYXQobGF0TWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxhdFNlY29uZCAqIDAuMDAwMSkgPj0gLTkwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsYXREZWdyZWUpICsgcGFyc2VGbG9hdChsYXRNaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobGF0U2Vjb25kICogMC4wMDAxKSA8PSA5MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobG9uRGVncmVlKSAtIHBhcnNlRmxvYXQobG9uTWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxvblNlY29uZCAqIDAuMDAwMSkgPj0gLTE4MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobG9uRGVncmVlKSArIHBhcnNlRmxvYXQobG9uTWludXRlICogMC4wMSkgKyBwYXJzZUZsb2F0KGxvblNlY29uZCAqIDAuMDAwMSkgPD0gMTgwXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgZG1zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXREZWdyZWUgKyAnwrAnICsgbGF0TWludXRlICsgJ1xcJycgKyBsYXRTZWNvbmQgKyAnXCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9uRGVncmVlICsgJ8KwJyArIGxvbk1pbnV0ZSArICdcXCcnICsgbG9uU2Vjb25kICsgJ1wiJ10sXG4gICAgICAgICAgICAgICAgICAgIGRkOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBkbXNMYXRUb0RETGF0KGxhdERlZ3JlZSwgbGF0TWludXRlLCBsYXRTZWNvbmQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZG1zTG9uVG9ERExvbihsb25EZWdyZWUsIGxvbk1pbnV0ZSwgbG9uU2Vjb25kKV0sXG4gICAgICAgICAgICAgICAgICAgIG1ncnM6ICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0cy5kZFswXSA+PSAtODAgJiYgcmVzdWx0cy5kZFswXSA8PSA4NCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLm1ncnMgPSBMTHRvTUdSUyhyZXN1bHRzLmRkWzBdLCByZXN1bHRzLmRkWzFdLCA1KTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKlxuICAgICAgICAgQ29udmVydHMgdGhlIE1HUlMtZW5jb2RlZCBzdHJpbmcgb2YgbGF0aXR1ZGUgYW5kIGxvbmdpdHVkZSBpbnB1dCBib3ggdGhlIG90aGVyIGZvcm1hdHMgKERNUyBhbmQgREQpIHNvXG4gICAgICAgICB0aGF0IHRob3NlIGlucHV0IGJveGVzIG1hdGNoIGFzIGNvbnZlcnRlZCB2YWx1ZXMuICBXaWxsIGRvIGRhdGEgdmFsaWRhdGlvbiBieSBjaGVja2luZyBpbnB1dCBjb29yZGluYXRlc1xuICAgICAgICAgZmFsbCBiZXR3ZWVuIC04MCBhbmQgODQgbGF0aXR1ZGUgYW5kIC0xODAgYW5kIDE4MCBmb3IgbG9uZ2l0dWRlXG4gICAgICAgICAqL1xuICAgICAgICAvL3ByZXBGb3JNR1JTQnJvYWRjYXN0IGlzIHRoZSBmdW5jdGlvbiB0aGF0IGNvbnZlcnRzIHRoZVxuICAgICAgICAvL2Nvb3JkaW5hdGVzIGVudGVyZWQgaW4gdGhlIE1HUlMgaW5wdXQgYm94ZXMgYW5kIHNldHNcbiAgICAgICAgLy90aGUgcmVzdCBvZiB0aGUgZmllbGRzIGluIHRoZSBteVNlcnZpY2Ugb2JqZWN0LiBkYXRhXG4gICAgICAgIC8vdmFsaWRhdGlvbiBpcyBjb21wbGV0ZWQgYnkgY2hlY2tpbmcgaWYgdGhlIGlucHV0XG4gICAgICAgIC8vY29vcmRpbmF0ZXMgcmV0dXJuIHZhbHVlcyB0byB0aGUgbGF0TG9uW10gZnJvbSB0aGVcbiAgICAgICAgLy9VU05HdG9MTCgpIGZ1bmN0aW9uIG9mIHRoZSB1c25nLmpzIGxpYnJhcnkuXG4gICAgICAgIGNvb3JkU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdCA9IGZ1bmN0aW9uIChNR1JTKSB7XG4gICAgICAgICAgICB2YXIgbGF0TG9uID0gW107XG4gICAgICAgICAgICBVU05HdG9MTChNR1JTICsgJycsIGxhdExvbik7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuXG4gICAgICAgICAgICBpZiAoaXNOYU4obGF0TG9uWzBdKSB8fCBpc05hTihsYXRMb25bMV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGFmdGVyIDUgZGVjaW1hbCBwbGFjZXMsIHRoZSByZXN1bHRzIHN0YXJ0IGdvaW5nIG9mZlxuICAgICAgICAgICAgICAgIGxhdExvblswXSA9IE1hdGgucm91bmQobGF0TG9uWzBdICogMWU1KSAvIDEuZTU7XG4gICAgICAgICAgICAgICAgbGF0TG9uWzFdID0gTWF0aC5yb3VuZChsYXRMb25bMV0gKiAxZTUpIC8gMS5lNTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBtZ3JzOiBNR1JTLFxuICAgICAgICAgICAgICAgICAgICBkZDogbGF0TG9uLFxuICAgICAgICAgICAgICAgICAgICBkbXM6IFtkZExhdFRvRE1TTGF0KGxhdExvblswXSksIGRkTG9uVG9ETVNMb24obGF0TG9uWzFdKV1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTGF0REQgPSBmdW5jdGlvbiAobGF0KSB7XG4gICAgICAgICAgICByZXR1cm4gKChsYXQgfHwgbGF0ID09PSAwIHx8IGxhdCA9PT0gJycpICYmIGxhdCA+PSAtOTAgJiYgbGF0IDw9IDkwKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRMb25ERCA9IGZ1bmN0aW9uIChsb24pIHtcbiAgICAgICAgICAgIHJldHVybiAoIChsb24gfHwgbG9uID09PSAwIHx8IGxvbiA9PT0gJycpICYmIGxvbiA+PSAtMTgwICYmIGxvbiA8PSAxODApO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvb3JkU2VydmljZS5pc1ZhbGlkTGF0RE1TID0gZnVuY3Rpb24gKGxhdERNUykge1xuICAgICAgICAgICAgaWYgKGxhdERNUyA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsYXREZWdyZWUsIGxhdE1pbnV0ZSwgbGF0U2Vjb25kO1xuICAgICAgICAgICAgbGF0RE1TID0gbGF0RE1TLnJlcGxhY2UoL1tOUyBdL2lnLCAnJykuc3BsaXQoL1vCsCdcIl0vKTtcblxuICAgICAgICAgICAgaWYgKGxhdERNUy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA9IHBhcnNlSW50KGxhdERNU1swXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdE1pbnV0ZSA9IHBhcnNlSW50KGxhdERNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxhdFNlY29uZCA9IHBhcnNlRmxvYXQobGF0RE1TWzJdLCAxMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhdERNUy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBsYXRETVMgPSBsYXRETVNbMF0uc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPSBwYXJzZUZsb2F0KGxhdERNU1swXS5zdWJzdHIoLTIpICsgJy4nICsgbGF0RE1TWzFdLCAxMCk7XG4gICAgICAgICAgICAgICAgbGF0TWludXRlID0gcGFyc2VJbnQobGF0RE1TWzBdLnN1YnN0cigtNCwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICBsYXREZWdyZWUgPSBwYXJzZUludChsYXRETVNbMF0uc2xpY2UoMCwgLTQpLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIGxhdERlZ3JlZSA+PSAtOTAgJiYgbGF0RGVncmVlIDw9IDkwICYmXG4gICAgICAgICAgICAgICAgbGF0TWludXRlID49IDAgJiYgbGF0TWludXRlIDwgNjAgJiZcbiAgICAgICAgICAgICAgICBsYXRTZWNvbmQgPj0gMCAmJiBsYXRTZWNvbmQgPCA2MCAmJlxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobGF0RGVncmVlKSAtIHBhcnNlRmxvYXQobGF0TWludXRlICogMC4wMSkgLSBwYXJzZUZsb2F0KGxhdFNlY29uZCAqIDAuMDAwMSkgPj0gLTkwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsYXREZWdyZWUpICsgcGFyc2VGbG9hdChsYXRNaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobGF0U2Vjb25kICogMC4wMDAxKSA8PSA5MFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb29yZFNlcnZpY2UuaXNWYWxpZExvbkRNUyA9IGZ1bmN0aW9uIChsb25ETVMpIHtcbiAgICAgICAgICAgIGlmIChsb25ETVMgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbG9uRGVncmVlLCBsb25NaW51dGUsIGxvblNlY29uZDtcbiAgICAgICAgICAgIGxvbkRNUyA9IGxvbkRNUy5yZXBsYWNlKC9bRVcgXS9pZywgJycpLnNwbGl0KC9bwrAnXCJdLyk7XG5cbiAgICAgICAgICAgIGlmIChsb25ETVMubGVuZ3RoID49IDMpIHtcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPSBwYXJzZUludChsb25ETVNbMF0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25NaW51dGUgPSBwYXJzZUludChsb25ETVNbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICBsb25TZWNvbmQgPSBwYXJzZUZsb2F0KGxvbkRNU1syXSwgMTApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb25ETVMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgbG9uRE1TID0gbG9uRE1TWzBdLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID0gcGFyc2VGbG9hdChsb25ETVNbMF0uc3Vic3RyKC0yKSArICcuJyArIGxvbkRNU1sxXSwgMTApO1xuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA9IHBhcnNlSW50KGxvbkRNU1swXS5zdWJzdHIoLTQsIDIpLCAxMCk7XG4gICAgICAgICAgICAgICAgbG9uRGVncmVlID0gcGFyc2VJbnQobG9uRE1TWzBdLnNsaWNlKDAsIC00KSwgMTApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIGxvbk1pbnV0ZSA+PSAwICYmIGxvbk1pbnV0ZSA8IDYwICYmXG4gICAgICAgICAgICAgICAgbG9uU2Vjb25kID49IDAgJiYgbG9uU2Vjb25kIDwgNjAgJiZcbiAgICAgICAgICAgICAgICBsb25EZWdyZWUgPj0gLTE4MCAmJiBsb25EZWdyZWUgPD0gMTgwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsb25EZWdyZWUpIC0gcGFyc2VGbG9hdChsb25NaW51dGUgKiAwLjAxKSAtIHBhcnNlRmxvYXQobG9uU2Vjb25kICogMC4wMDAxKSA+PSAtMTgwICYmXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChsb25EZWdyZWUpICsgcGFyc2VGbG9hdChsb25NaW51dGUgKiAwLjAxKSArIHBhcnNlRmxvYXQobG9uU2Vjb25kICogMC4wMDAxKSA8PSAxODBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29vcmRTZXJ2aWNlLmlzVmFsaWRNR1JTID0gZnVuY3Rpb24gKG1ncnMpIHtcbiAgICAgICAgICAgIGlmIChtZ3JzID09PSAnJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWdycyA9IG1ncnMgKyAnJztcbiAgICAgICAgICAgIHJldHVybiAhIW1ncnMubWF0Y2goL14oWzAtNV1bMC05XVtDLVhdfDYwW0MtWF18W0FCWVpdKVtBLVpdezJ9XFxkezQsMTR9JC9pKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gY29vcmRTZXJ2aWNlO1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLnNlcnZpY2UoJ3NlYXJjaFNlcnZpY2UnLCBmdW5jdGlvbiAoXG4gICAgICAgICRodHRwLFxuICAgICAgICAkcSxcbiAgICAgICAgJHRpbWVvdXQsXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIHNpZ21hU2VydmljZVxuICAgICkge1xuICAgICAgICB2YXIgZ2V0RERCb3VuZHMgPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgICAgICAgICAgIHZhciBib3VuZHMgPSBzaWdtYVNlcnZpY2UuZ2V0RERCb3VuZHMobG9jYXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuOiBib3VuZHNbMV1bMF0sXG4gICAgICAgICAgICAgICAgZTogYm91bmRzWzBdWzFdLFxuICAgICAgICAgICAgICAgIHM6IGJvdW5kc1swXVswXSxcbiAgICAgICAgICAgICAgICB3OiBib3VuZHNbMV1bMV1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdldFBhcmFtcyA9IGZ1bmN0aW9uIChzdGFydCwgc3RvcCwgbG9jYXRpb24sIGdyb3VwQnksIGJhbmQpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgIHN0b3A6IHN0b3AsXG4gICAgICAgICAgICAgICAgYmFuZDogYmFuZFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGxvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5leHRlbmQocGFyYW1zLCBnZXREREJvdW5kcyhsb2NhdGlvbikpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZ3JvdXBCeSkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5ncm91cF9ieSA9IGdyb3VwQnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHRpbWVvdXRDb3ZlcmFnZSA9IG51bGw7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGdldENvdmVyYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVvdXRDb3ZlcmFnZSkge1xuICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwodGltZW91dENvdmVyYWdlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aW1lb3V0Q292ZXJhZ2UgPSAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9jYXRpb24gPSBzdGF0ZVNlcnZpY2UuZ2V0TWFwQm91bmRzKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSBzaWdtYUNvbmZpZy51cmxzLmNvdmVyYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFuZCA9IHN0YXRlU2VydmljZS5nZXRCYW5kKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubm9ydGggPSBNYXRoLmNlaWwobG9jYXRpb24ubm9ydGgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5lYXN0ID0gTWF0aC5jZWlsKGxvY2F0aW9uLmVhc3QpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5zb3V0aCA9IE1hdGguZmxvb3IobG9jYXRpb24uc291dGgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi53ZXN0ID0gTWF0aC5mbG9vcihsb2NhdGlvbi53ZXN0KTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gZ2V0UGFyYW1zKHRpbWUuc3RhcnQsIHRpbWUuc3RvcCwgbG9jYXRpb24sIG51bGwsIGJhbmQpO1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc3RlcCA9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2sgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuXG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENvbGxlY3RDb3VudHNCeUhvdXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZCA9ICRxLmRlZmVyKCksXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uID0gc3RhdGVTZXJ2aWNlLmdldE1hcEJvdW5kcygpLFxuICAgICAgICAgICAgICAgICAgICB0aW1lID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgICAgIHVybCA9IHNpZ21hQ29uZmlnLnVybHMuYWdncmVnYXRlLFxuICAgICAgICAgICAgICAgICAgICBiYW5kID0gc3RhdGVTZXJ2aWNlLmdldEJhbmQoKSxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gZ2V0UGFyYW1zKHRpbWUuc3RhcnQsIHRpbWUuc3RvcCwgbG9jYXRpb24sICdob3VyJywgYmFuZCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiBlcnJvckNhbGxiYWNrIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q29sbGVjdENvdW50c0J5RGF5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGQgPSAkcS5kZWZlcigpLFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbiA9IHN0YXRlU2VydmljZS5nZXRNYXBCb3VuZHMoKSxcbiAgICAgICAgICAgICAgICAgICAgdGltZSA9IHN0YXRlU2VydmljZS5nZXRUaW1lU2xpZGVyRXh0ZW50cygpLFxuICAgICAgICAgICAgICAgICAgICB1cmwgPSBzaWdtYUNvbmZpZy51cmxzLmFnZ3JlZ2F0ZSxcbiAgICAgICAgICAgICAgICAgICAgYmFuZCA9IHN0YXRlU2VydmljZS5nZXRCYW5kKCksXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IGdldFBhcmFtcyh0aW1lLnN0YXJ0LCB0aW1lLnN0b3AsIGxvY2F0aW9uLCAnZGF5JywgYmFuZCk7XG5cbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGQucmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiBlcnJvckNhbGxiYWNrIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuc2VydmljZSgnc2lnbWFTZXJ2aWNlJywgZnVuY3Rpb24gKGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0Vmlld3BvcnRTaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHcgPSB3aW5kb3csXG4gICAgICAgICAgICAgICAgICAgIGQgPSBkb2N1bWVudCxcbiAgICAgICAgICAgICAgICAgICAgZSA9IGQuZG9jdW1lbnRFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICBnID0gZG9jdW1lbnQuYm9keSxcbiAgICAgICAgICAgICAgICAgICAgeCA9IHcuaW5uZXJXaWR0aCB8fCBlLmNsaWVudFdpZHRoIHx8IGcuY2xpZW50V2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIHkgPSB3LmlubmVySGVpZ2h0IHx8IGUuY2xpZW50SGVpZ2h0IHx8IGcuY2xpZW50SGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogeVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZm9ybWF0TGF0TG5nOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBlbnN1cmUgYm91bmRzIHZhbHVlcyBoYXZlIGF0IGxlYXN0IDEgZGVjaW1hbCBwbGFjZVxuICAgICAgICAgICAgICAgIHJldHVybiAodmFsdWUgJSAxID09PSAwKSA/IHZhbHVlLnRvRml4ZWQoMSkgOiB2YWx1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXREREJvdW5kczogZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN3LCBuZSwgYm91bmRzO1xuICAgICAgICAgICAgICAgIGlmIChsb2NhdGlvbi5mb3JtYXQgPT09ICdkbXMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3ID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JETVNCcm9hZGNhc3QobG9jYXRpb24uc291dGgsIGxvY2F0aW9uLndlc3QpO1xuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KGxvY2F0aW9uLm5vcnRoLCBsb2NhdGlvbi5lYXN0KTtcbiAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gW1tzdy5kZFswXSwgbmUuZGRbMV1dLCBbbmUuZGRbMF0sIHN3LmRkWzFdXV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsb2NhdGlvbi5mb3JtYXQgPT09ICdtZ3JzJykge1xuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdChsb2NhdGlvbi5tZ3JzU1cpO1xuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdChsb2NhdGlvbi5tZ3JzTkUpO1xuICAgICAgICAgICAgICAgICAgICBib3VuZHMgPSBbW3N3LmRkWzBdLCBuZS5kZFsxXV0sIFtuZS5kZFswXSwgc3cuZGRbMV1dXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBkZWZpbmUgcmVjdGFuZ2xlIGdlb2dyYXBoaWNhbCBib3VuZHNcbiAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gW1tsb2NhdGlvbi5zb3V0aCwgbG9jYXRpb24uZWFzdF0sIFtsb2NhdGlvbi5ub3J0aCwgbG9jYXRpb24ud2VzdF1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gYm91bmRzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbnZlcnRMYXRMbmc6IGZ1bmN0aW9uIChsb2NhdGlvbiwgbmV3Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvb3JkaW5hdGVzLCBsYXRMbmc7XG4gICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uLmZvcm1hdCA9PT0gJ2RtcycpIHtcbiAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZXMgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdChsb2NhdGlvbi5sYXQsIGxvY2F0aW9uLmxuZyk7XG4gICAgICAgICAgICAgICAgICAgIGxhdExuZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdDogcGFyc2VGbG9hdChjb29yZGluYXRlcy5kZFswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICBsbmc6IHBhcnNlRmxvYXQoY29vcmRpbmF0ZXMuZGRbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWdyczogY29vcmRpbmF0ZXMubWdyc1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobG9jYXRpb24uZm9ybWF0ID09PSAnbWdycycpIHtcbiAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZXMgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvck1HUlNCcm9hZGNhc3QobG9jYXRpb24ubWdycyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdGb3JtYXQgPT09ICdkZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdExuZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IHBhcnNlRmxvYXQoY29vcmRpbmF0ZXMuZGRbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxuZzogcGFyc2VGbG9hdChjb29yZGluYXRlcy5kZFsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWdyczogY29vcmRpbmF0ZXMubWdyc1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXdGb3JtYXQgPT09ICdkbXMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRMbmcgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBjb29yZGluYXRlcy5kbXNbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBjb29yZGluYXRlcy5kbXNbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWdyczogY29vcmRpbmF0ZXMubWdyc1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobG9jYXRpb24uZm9ybWF0ID09PSAnZGQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JEREJyb2FkY2FzdChsb2NhdGlvbi5sYXQsIGxvY2F0aW9uLmxuZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdGb3JtYXQgPT09ICdkbXMnIHx8IG5ld0Zvcm1hdCA9PT0gJ21ncnMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRMbmcgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0OiBjb29yZGluYXRlcy5kbXNbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG5nOiBjb29yZGluYXRlcy5kbXNbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWdyczogY29vcmRpbmF0ZXMubWdyc1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdExuZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IHBhcnNlRmxvYXQoY29vcmRpbmF0ZXMuZGRbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxuZzogcGFyc2VGbG9hdChjb29yZGluYXRlcy5kZFsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWdyczogY29vcmRpbmF0ZXMubWdyc1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbGF0TG5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLnNlcnZpY2UoJ3N0YXRlU2VydmljZScsIGZ1bmN0aW9uIChcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICAkcm9vdFNjb3BlLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgQ2FudmFzSW1hZ2VPdmVybGF5LFxuICAgICAgICBtb21lbnQsXG4gICAgICAgIGxvY2FsU3RvcmFnZSxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgcXVlcnlTdHJpbmcgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdmFyIGJib3ggPSB7fSxcbiAgICAgICAgICAgIGJib3hGZWF0dXJlR3JvdXAgPSB7fSxcbiAgICAgICAgICAgIG1hcmtlckZlYXR1cmVHcm91cCA9IHt9LFxuICAgICAgICAgICAgbG9jYXRpb25Gb3JtYXQgPSBxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCxcbiAgICAgICAgICAgIHBsYXliYWNrU3RhdGUgPSAnJyxcbiAgICAgICAgICAgIHBsYXliYWNrRGlyZWN0aW9uID0gJycsXG4gICAgICAgICAgICBwbGF5YmFja0ludGVydmFsID0gXy5maW5kV2hlcmUoc2lnbWFDb25maWcucGxheWJhY2tJbnRlcnZhbHMsIHsgZGVmYXVsdDogdHJ1ZSB9KSxcbiAgICAgICAgICAgIHBsYXliYWNrSW50ZXJ2YWxRdHkgPSBzaWdtYUNvbmZpZy5kZWZhdWx0UGxheWJhY2tJbnRlcnZhbFF0eSxcbiAgICAgICAgICAgIHBsYXliYWNrU3BlZWQgPSBzaWdtYUNvbmZpZy5tYXhQbGF5YmFja0RlbGF5LFxuICAgICAgICAgICAgcGxheWJhY2tPcGFjaXR5ID0gc2lnbWFDb25maWcuZGVmYXVsdExheWVyT3BhY2l0eSxcbiAgICAgICAgICAgIGZyYW1lSW5kZXhlcyA9IFtdLFxuICAgICAgICAgICAgZnJhbWVDdXJyZW50ID0gMCxcbiAgICAgICAgICAgIGZyYW1lRXh0ZW50cyA9IHt9LFxuICAgICAgICAgICAgZnJhbWVPdmVybGF5cyA9IFtdLFxuICAgICAgICAgICAgdGltZVNsaWRlckV4dGVudHMgPSB7fSxcbiAgICAgICAgICAgIGJydXNoRXh0ZW50cyA9IHt9LFxuICAgICAgICAgICAgYnJ1c2hSZXNldCA9IGZhbHNlLFxuICAgICAgICAgICAgZW5hYmxlQ292ZXJhZ2UgPSBxdWVyeVN0cmluZy5lbmFibGVDb3ZlcmFnZSxcbiAgICAgICAgICAgIGNvdmVyYWdlT3BhY2l0eSA9IHF1ZXJ5U3RyaW5nLmNvdmVyYWdlT3BhY2l0eSxcbiAgICAgICAgICAgIGNvdmVyYWdlRGF0YSxcbiAgICAgICAgICAgIG1hcCA9IHt9LFxuICAgICAgICAgICAgbWFwTW9kZSA9ICdkZWZhdWx0JyxcbiAgICAgICAgICAgIHZpZXdNb2RlID0gJ3NlYXJjaCcsXG4gICAgICAgICAgICB0ZW1wb3JhbEZpbHRlciA9IHtcbiAgICAgICAgICAgICAgICBzdGFydDogcXVlcnlTdHJpbmcuc3RhcnQsXG4gICAgICAgICAgICAgICAgc3RvcDogcXVlcnlTdHJpbmcuc3RvcCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogcXVlcnlTdHJpbmcuZHVyYXRpb24sXG4gICAgICAgICAgICAgICAgZHVyYXRpb25MZW5ndGg6IHF1ZXJ5U3RyaW5nLmR1cmF0aW9uTGVuZ3RoXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZVNsaWRlckRhdGEgPSB7fSxcbiAgICAgICAgICAgIHRpbWVTbGlkZXJGcmVxdWVuY3kgPSBudWxsLCAvLyBpbml0IHRvIG51bGwgc28gJHdhdGNoIGV2ZW50IHdpbGwgZGV0ZWN0IGEgY2hhbmdlXG4gICAgICAgICAgICBwb2ludENvbnZlcnRlckRhdGEsXG4gICAgICAgICAgICBjb3JyZWxhdGlvbkRhdGEsXG4gICAgICAgICAgICBwcmVsb2FkZWRJbWFnZXMgPSBbXSxcbiAgICAgICAgICAgIGJhc2VsYXllciA9IG51bGwsXG4gICAgICAgICAgICBjb250cmFzdExldmVsID0gXy5maW5kV2hlcmUoc2lnbWFDb25maWcuY29udHJhc3RMZXZlbHMsIHsgZGVmYXVsdDogdHJ1ZSB9KSxcbiAgICAgICAgICAgIHNwYXRpYWxab29tID0gJycsXG4gICAgICAgICAgICB0ZW1wb3JhbFpvb20gPSAnJyxcbiAgICAgICAgICAgIGJhbmQgPSBxdWVyeVN0cmluZy5iYW5kLFxuICAgICAgICAgICAgdmlld3BvcnRTaXplID0ge30sXG4gICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkgPSBuZXcgQ2FudmFzSW1hZ2VPdmVybGF5KCksXG4gICAgICAgICAgICBpbWFnZVF1YWxpdHkgPSBzaWdtYUNvbmZpZy5kZWZhdWx0SW1hZ2VRdWFsaXR5LFxuICAgICAgICAgICAgc2Vuc29yID0gcXVlcnlTdHJpbmcuc2Vuc29yO1xuXG4gICAgICAgIGlmIChxdWVyeVN0cmluZy5uIHx8IHF1ZXJ5U3RyaW5nLm5lKSB7XG4gICAgICAgICAgICBiYm94ID0ge1xuICAgICAgICAgICAgICAgIGZvcm1hdDogbG9jYXRpb25Gb3JtYXQsXG4gICAgICAgICAgICAgICAgbm9ydGg6IGxvY2F0aW9uRm9ybWF0ID09PSAnZGQnID8gcGFyc2VGbG9hdChxdWVyeVN0cmluZy5uKSA6IHF1ZXJ5U3RyaW5nLm4sXG4gICAgICAgICAgICAgICAgc291dGg6IGxvY2F0aW9uRm9ybWF0ID09PSAnZGQnID8gcGFyc2VGbG9hdChxdWVyeVN0cmluZy5zKSA6IHF1ZXJ5U3RyaW5nLnMsXG4gICAgICAgICAgICAgICAgZWFzdDogbG9jYXRpb25Gb3JtYXQgPT09ICdkZCcgPyBwYXJzZUZsb2F0KHF1ZXJ5U3RyaW5nLmUpIDogcXVlcnlTdHJpbmcuZSxcbiAgICAgICAgICAgICAgICB3ZXN0OiBsb2NhdGlvbkZvcm1hdCA9PT0gJ2RkJyA/IHBhcnNlRmxvYXQocXVlcnlTdHJpbmcudykgOiBxdWVyeVN0cmluZy53LFxuICAgICAgICAgICAgICAgIG1ncnNORTogcXVlcnlTdHJpbmcubmUgfHwgJycsXG4gICAgICAgICAgICAgICAgbWdyc1NXOiBxdWVyeVN0cmluZy5zdyB8fCAnJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChxdWVyeVN0cmluZy5zdGFydCAmJiBxdWVyeVN0cmluZy5zdG9wKSB7XG4gICAgICAgICAgICB0aW1lU2xpZGVyRXh0ZW50cyA9IHtcbiAgICAgICAgICAgICAgICBzdGFydDogbW9tZW50LnV0YyhxdWVyeVN0cmluZy5zdGFydCkudG9EYXRlKCksXG4gICAgICAgICAgICAgICAgc3RvcDogbW9tZW50LnV0YyhxdWVyeVN0cmluZy5zdG9wKS50b0RhdGUoKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXRUaW1lUGFyYW1zOiBmdW5jdGlvbiAodGltZVBhcmFtcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aW1lUGFyYW1zO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldEJib3hQYXJhbXM6IGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICAgICAgICAgICAgICAgIGlmICghbG9jYXRpb24uZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmZvcm1hdCA9IHNpZ21hQ29uZmlnLmRlZmF1bHRMb2NhdGlvbkZvcm1hdDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRMb2NhdGlvbkZvcm1hdChsb2NhdGlvbi5mb3JtYXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBpZiBhbnl0aGluZyBjaGFuZ2UsIHVwZGF0ZSAkbG9jYXRpb24uc2VhcmNoKCkgYW5kIGJyb2FkY2FzdCBub3RpZmljYXRpb24gb2YgY2hhbmdlXG4gICAgICAgICAgICAgICAgaWYgKHF1ZXJ5U3RyaW5nLm4gIT09IGxvY2F0aW9uLm5vcnRoLnRvU3RyaW5nKCkgfHwgcXVlcnlTdHJpbmcucyAhPT0gbG9jYXRpb24uc291dGgudG9TdHJpbmcoKSB8fCBxdWVyeVN0cmluZy5lICE9PSBsb2NhdGlvbi5lYXN0LnRvU3RyaW5nKCkgfHwgcXVlcnlTdHJpbmcudyAhPT0gbG9jYXRpb24ud2VzdC50b1N0cmluZygpIHx8IHF1ZXJ5U3RyaW5nLmxvY2F0aW9uRm9ybWF0ICE9PSBsb2NhdGlvbi5mb3JtYXQgfHwgcXVlcnlTdHJpbmcubmUgIT09IGxvY2F0aW9uLm1ncnNORS50b1N0cmluZygpIHx8IHF1ZXJ5U3RyaW5nLnN3ICE9PSBsb2NhdGlvbi5tZ3JzU1cudG9TdHJpbmcoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24ubm9ydGggIT09ICcnICYmIGxvY2F0aW9uLnNvdXRoICE9PSAnJyAmJiBsb2NhdGlvbi5lYXN0ICE9PSAnJyAmJiBsb2NhdGlvbi53ZXN0ICE9PSAnJyAmJiBsb2NhdGlvbi5mb3JtYXQgPT09ICdkZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLm5vcnRoID0gcGFyc2VGbG9hdChsb2NhdGlvbi5ub3J0aCkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLnNvdXRoID0gcGFyc2VGbG9hdChsb2NhdGlvbi5zb3V0aCkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmVhc3QgPSBwYXJzZUZsb2F0KGxvY2F0aW9uLmVhc3QpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi53ZXN0ID0gcGFyc2VGbG9hdChsb2NhdGlvbi53ZXN0KS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QmJveChsb2NhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLm4gPSBsb2NhdGlvbi5ub3J0aCA9PT0gJycgPyBudWxsIDogbG9jYXRpb24ubm9ydGg7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnMgPSBsb2NhdGlvbi5zb3V0aCA9PT0gJycgPyBudWxsIDogbG9jYXRpb24uc291dGg7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmUgPSBsb2NhdGlvbi5lYXN0ID09PSAnJyA/IG51bGwgOiBsb2NhdGlvbi5lYXN0O1xuICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy53ID0gbG9jYXRpb24ud2VzdCA9PT0gJycgPyBudWxsIDogbG9jYXRpb24ud2VzdDtcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcubG9jYXRpb25Gb3JtYXQgPSBsb2NhdGlvbi5mb3JtYXQgPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLmZvcm1hdDtcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcubmUgPSBsb2NhdGlvbi5tZ3JzTkUgPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLm1ncnNORTtcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc3cgPSBsb2NhdGlvbi5tZ3JzU1cgPT09ICcnID8gbnVsbCA6IGxvY2F0aW9uLm1ncnNTVztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRMb2NhdGlvbkZvcm1hdChxdWVyeVN0cmluZy5sb2NhdGlvbkZvcm1hdCk7XG4gICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoISRyb290U2NvcGUuJCRwaGFzZSkge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRCYm94OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJib3g7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0QmJveDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgIGJib3ggPSB2YWw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0QmJveEZlYXR1cmVHcm91cDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBiYm94RmVhdHVyZUdyb3VwO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldEJib3hGZWF0dXJlR3JvdXA6IGZ1bmN0aW9uIChmZWF0dXJlR3JvdXApIHtcbiAgICAgICAgICAgICAgICBiYm94RmVhdHVyZUdyb3VwID0gZmVhdHVyZUdyb3VwO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldE1hcmtlckZlYXR1cmVHcm91cDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXJrZXJGZWF0dXJlR3JvdXA7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0TWFya2VyRmVhdHVyZUdyb3VwOiBmdW5jdGlvbiAoZmVhdHVyZUdyb3VwKSB7XG4gICAgICAgICAgICAgICAgbWFya2VyRmVhdHVyZUdyb3VwID0gZmVhdHVyZUdyb3VwO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldExvY2F0aW9uRm9ybWF0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uRm9ybWF0O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldExvY2F0aW9uRm9ybWF0OiBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgbG9jYXRpb25Gb3JtYXQgPSBmb3JtYXQ7XG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcubG9jYXRpb25Gb3JtYXQgPSBsb2NhdGlvbkZvcm1hdDtcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHF1ZXJ5U3RyaW5nKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRQbGF5YmFja1N0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBsYXliYWNrU3RhdGU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0UGxheWJhY2tTdGF0ZTogZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgcGxheWJhY2tTdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFBsYXliYWNrRGlyZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBsYXliYWNrRGlyZWN0aW9uO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFBsYXliYWNrRGlyZWN0aW9uOiBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgcGxheWJhY2tEaXJlY3Rpb24gPSBkaXJlY3Rpb247XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0UGxheWJhY2tJbnRlcnZhbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwbGF5YmFja0ludGVydmFsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFBsYXliYWNrSW50ZXJ2YWw6IGZ1bmN0aW9uIChpbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgIHBsYXliYWNrSW50ZXJ2YWwgPSBpbnRlcnZhbDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRQbGF5YmFja0ludGVydmFsUXR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBsYXliYWNrSW50ZXJ2YWxRdHk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0UGxheWJhY2tJbnRlcnZhbFF0eTogZnVuY3Rpb24gKHF0eSkge1xuICAgICAgICAgICAgICAgIHBsYXliYWNrSW50ZXJ2YWxRdHkgPSBxdHk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0UGxheWJhY2tTcGVlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwbGF5YmFja1NwZWVkO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFBsYXliYWNrU3BlZWQ6IGZ1bmN0aW9uIChzcGVlZCkge1xuICAgICAgICAgICAgICAgIHBsYXliYWNrU3BlZWQgPSBzcGVlZDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRQbGF5YmFja09wYWNpdHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGxheWJhY2tPcGFjaXR5O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFBsYXliYWNrT3BhY2l0eTogZnVuY3Rpb24gKG9wYWNpdHkpIHtcbiAgICAgICAgICAgICAgICBwbGF5YmFja09wYWNpdHkgPSBvcGFjaXR5O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEZyYW1lSW5kZXhlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmcmFtZUluZGV4ZXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0RnJhbWVJbmRleGVzOiBmdW5jdGlvbiAoaW5kZXhlcykge1xuICAgICAgICAgICAgICAgIGZyYW1lSW5kZXhlcyA9IGluZGV4ZXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0RnJhbWVDdXJyZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyYW1lQ3VycmVudDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRGcmFtZUN1cnJlbnQ6IGZ1bmN0aW9uIChmcmFtZSkge1xuICAgICAgICAgICAgICAgIGZyYW1lQ3VycmVudCA9IGZyYW1lO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEZyYW1lRXh0ZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmcmFtZUV4dGVudHM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0RnJhbWVFeHRlbnRzOiBmdW5jdGlvbiAoc3RhcnQsIHN0b3ApIHtcbiAgICAgICAgICAgICAgICBmcmFtZUV4dGVudHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgICAgICAgc3RvcDogc3RvcFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0RnJhbWVPdmVybGF5czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmcmFtZU92ZXJsYXlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldEZyYW1lT3ZlcmxheXM6IGZ1bmN0aW9uIChvdmVybGF5cykge1xuICAgICAgICAgICAgICAgIGZyYW1lT3ZlcmxheXMgPSBvdmVybGF5cztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRUaW1lU2xpZGVyRXh0ZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aW1lU2xpZGVyRXh0ZW50cztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRUaW1lU2xpZGVyRXh0ZW50czogZnVuY3Rpb24gKHN0YXJ0LCBzdG9wKSB7XG4gICAgICAgICAgICAgICAgdGltZVNsaWRlckV4dGVudHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgICAgICAgc3RvcDogc3RvcFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0QnJ1c2hFeHRlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJydXNoRXh0ZW50cztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRCcnVzaEV4dGVudHM6IGZ1bmN0aW9uIChzdGFydCwgc3RvcCkge1xuICAgICAgICAgICAgICAgIGJydXNoRXh0ZW50cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBzdG9wOiBzdG9wXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRCcnVzaFJlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJydXNoUmVzZXQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0QnJ1c2hSZXNldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGJydXNoUmVzZXQgPSAhYnJ1c2hSZXNldDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRFbmFibGVDb3ZlcmFnZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZW5hYmxlQ292ZXJhZ2UgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoZW5hYmxlQ292ZXJhZ2UgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZW5hYmxlQ292ZXJhZ2UgPSBlbmFibGVDb3ZlcmFnZSA/IGVuYWJsZUNvdmVyYWdlLnRvU3RyaW5nKCkgOiBzaWdtYUNvbmZpZy5kZWZhdWx0RW5hYmxlQ292ZXJhZ2UudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEVuYWJsZUNvdmVyYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVuYWJsZUNvdmVyYWdlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldENvdmVyYWdlT3BhY2l0eTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgY292ZXJhZ2VPcGFjaXR5ID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuY292ZXJhZ2VPcGFjaXR5ID0gY292ZXJhZ2VPcGFjaXR5O1xuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENvdmVyYWdlT3BhY2l0eTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb3ZlcmFnZU9wYWNpdHk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0Q292ZXJhZ2U6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGNvdmVyYWdlRGF0YSA9IHZhbHVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENvdmVyYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvdmVyYWdlRGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRNYXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFwO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldE1hcDogZnVuY3Rpb24gKG1hcEluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgbWFwID0gbWFwSW5zdGFuY2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0TWFwTW9kZTogZnVuY3Rpb24gKG1vZGUpIHtcbiAgICAgICAgICAgICAgICBtYXBNb2RlID0gbW9kZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbWFwIG1vZGUgc2V0IHRvICcgKyBtb2RlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRNYXBNb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hcE1vZGU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Vmlld01vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmlld01vZGU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0Vmlld01vZGU6IGZ1bmN0aW9uIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgdmlld01vZGUgPSBtb2RlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldE1hcEJvdW5kczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChtYXAuZ2V0Qm91bmRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBib3VuZHMgPSBtYXAuZ2V0Qm91bmRzKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3VuZHMpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vcnRoOiBib3VuZHMuX25vcnRoRWFzdC5sYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291dGg6IGJvdW5kcy5fc291dGhXZXN0LmxhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlYXN0OiBib3VuZHMuX25vcnRoRWFzdC5sbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2VzdDogYm91bmRzLl9zb3V0aFdlc3QubG5nXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNsZWFyQU9JOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRCYm94UGFyYW1zKFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub3J0aDogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3V0aDogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBlYXN0OiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdlc3Q6ICcnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0TWFwTW9kZSgnZGVmYXVsdCcpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFRlbXBvcmFsRmlsdGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRlbXBvcmFsRmlsdGVyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFRlbXBvcmFsRmlsdGVyOiBmdW5jdGlvbiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIHFzRmlsdGVyID0ge1xuICAgICAgICAgICAgICAgICAgICBzdGFydDogcXVlcnlTdHJpbmcuc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHN0b3A6IHF1ZXJ5U3RyaW5nLnN0b3AsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBxdWVyeVN0cmluZy5kdXJhdGlvbiA/IHF1ZXJ5U3RyaW5nLmR1cmF0aW9uIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25MZW5ndGg6IHF1ZXJ5U3RyaW5nLmR1cmF0aW9uTGVuZ3RoID8gcGFyc2VJbnQocXVlcnlTdHJpbmcuZHVyYXRpb25MZW5ndGgpIDogbnVsbFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIGZpbHRlclN0YXJ0ID0gJycsXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclN0b3AgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXIuZXF1YWxzKHFzRmlsdGVyLCBmaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIuZHVyYXRpb24gJiYgZmlsdGVyLmR1cmF0aW9uTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdGFydCA9IG1vbWVudC51dGMoKS5zdWJ0cmFjdChmaWx0ZXIuZHVyYXRpb25MZW5ndGgsIGZpbHRlci5kdXJhdGlvbikuc3RhcnRPZignZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyU3RvcCA9IG1vbWVudC51dGMoKS5lbmRPZignZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc3RhcnQgPSBmaWx0ZXJTdGFydC50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuc3RvcCA9IGZpbHRlclN0b3AudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmR1cmF0aW9uID0gZmlsdGVyLmR1cmF0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcuZHVyYXRpb25MZW5ndGggPSBmaWx0ZXIuZHVyYXRpb25MZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJTdGFydCA9IG1vbWVudC51dGMoZmlsdGVyLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlclN0b3AgPSBtb21lbnQudXRjKGZpbHRlci5zdG9wKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnN0YXJ0ID0gZmlsdGVyU3RhcnQudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnN0b3AgPSBmaWx0ZXJTdG9wLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5kdXJhdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5kdXJhdGlvbkxlbmd0aCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyLnN0YXJ0ID0gZmlsdGVyU3RhcnQudG9EYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpbHRlci5zdG9wID0gZmlsdGVyU3RvcC50b0RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXIgPSBmaWx0ZXI7XG4gICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGVtcG9yYWxGaWx0ZXIuc3RhcnQgfHwgIXRlbXBvcmFsRmlsdGVyLnN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyID0gZmlsdGVyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFRpbWVTbGlkZXJEYXRhOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRpbWVTbGlkZXJEYXRhO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFRpbWVTbGlkZXJEYXRhOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHRpbWVTbGlkZXJEYXRhID0gZGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRUaW1lU2xpZGVyRnJlcXVlbmN5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRpbWVTbGlkZXJGcmVxdWVuY3k7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0VGltZVNsaWRlckZyZXF1ZW5jeTogZnVuY3Rpb24gKGZyZXF1ZW5jeSkge1xuICAgICAgICAgICAgICAgIHRpbWVTbGlkZXJGcmVxdWVuY3kgPSBmcmVxdWVuY3k7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0UHJlbG9hZGVkSW1hZ2VzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByZWxvYWRlZEltYWdlcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRQcmVsb2FkZWRJbWFnZXM6IGZ1bmN0aW9uIChpbWFnZXMpIHtcbiAgICAgICAgICAgICAgICBwcmVsb2FkZWRJbWFnZXMgPSBpbWFnZXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0UG9pbnRDb252ZXJ0ZXJEYXRhOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBvaW50Q29udmVydGVyRGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRQb2ludENvbnZlcnRlckRhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgcG9pbnRDb252ZXJ0ZXJEYXRhID0gZGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRDb3JyZWxhdGlvbkRhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29ycmVsYXRpb25EYXRhO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldENvcnJlbGF0aW9uRGF0YTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3JlY2VudENvcnJlbGF0aW9ucycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb3JyZWxhdGlvbkRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEJhc2VsYXllcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBiYXNlbGF5ZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0QmFzZWxheWVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcbiAgICAgICAgICAgICAgICBiYXNlbGF5ZXIgPSBsYXllcjtcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5iYXNlbGF5ZXIgPSBiYXNlbGF5ZXIuaWQ7XG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q29udHJhc3RMZXZlbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb250cmFzdExldmVsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldENvbnRyYXN0TGV2ZWw6IGZ1bmN0aW9uIChsZXZlbCkge1xuICAgICAgICAgICAgICAgIGNvbnRyYXN0TGV2ZWwgPSBsZXZlbDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRTcGF0aWFsWm9vbTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzcGF0aWFsWm9vbTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRTcGF0aWFsWm9vbTogZnVuY3Rpb24gKHpvb20pIHtcbiAgICAgICAgICAgICAgICBzcGF0aWFsWm9vbSA9IHpvb207XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VGVtcG9yYWxab29tOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRlbXBvcmFsWm9vbTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRUZW1wb3JhbFpvb206IGZ1bmN0aW9uICh6b29tKSB7XG4gICAgICAgICAgICAgICAgdGVtcG9yYWxab29tID0gem9vbTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRCYW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJhbmQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0QmFuZDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYmFuZCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLmJhbmQgPSBiYW5kO1xuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gocXVlcnlTdHJpbmcpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFZpZXdwb3J0U2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2aWV3cG9ydFNpemU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0Vmlld3BvcnRTaXplOiBmdW5jdGlvbiAoc2l6ZSkge1xuICAgICAgICAgICAgICAgIHZpZXdwb3J0U2l6ZSA9IHNpemU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q2FudmFzSW1hZ2VPdmVybGF5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbnZhc0ltYWdlT3ZlcmxheTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRDYW52YXNJbWFnZU92ZXJsYXk6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5ID0gZGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRJbWFnZVF1YWxpdHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaW1hZ2VRdWFsaXR5O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldEltYWdlUXVhbGl0eTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpbWFnZVF1YWxpdHkgPSBkYXRhO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFNlbnNvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZW5zb3I7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0U2Vuc29yOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBzZW5zb3IgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZy5zZW5zb3IgPSBzZW5zb3I7XG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChxdWVyeVN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ2FuYWx5emVDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRxLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBhbmFseXplU2VydmljZSxcbiAgICAgICAgYmxvY2tVSSwgXG4gICAgICAgIG1vbWVudCxcbiAgICAgICAgZDMsXG4gICAgICAgIF8sXG4gICAgICAgIHRvYXN0clxuICAgICkge1xuICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vmlld01vZGUoJ2FuYWx5emUnKTtcblxuICAgICAgICB2YXIgdGVtcG9yYWxGaWx0ZXIgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKTtcblxuICAgICAgICAkc2NvcGUuc3RhcnQgPSB0ZW1wb3JhbEZpbHRlci5zdGFydDtcbiAgICAgICAgJHNjb3BlLnN0b3AgPSB0ZW1wb3JhbEZpbHRlci5zdG9wO1xuXG4gICAgICAgIHZhciBnZW5lcmF0ZUZyZXF1ZW5jeSA9IGZ1bmN0aW9uICh0aW1lbGluZSkge1xuICAgICAgICAgICAgLy8gZGV0ZXJtaW5lIHRoZSBudW1iZXIgb2YgaG91cnMgYmV0d2VlbiB0aW1lIGV4dGVudHNcbiAgICAgICAgICAgIHZhciBmcmVxdWVuY3kgPSBbXSxcbiAgICAgICAgICAgICAgICBudW1Ib3VycyA9IG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RvcCkuZGlmZihtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0YXJ0KSwgJ2gnKSArIDE7XG5cbiAgICAgICAgICAgIC8vIGFkZCAwIHZhbHVlcyBmb3IgZXZlcnkgaG91ciB0aGF0IGhhcyBubyB2YWx1ZSBpbiB0aW1lbGluZVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Ib3VyczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWUgPSBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0YXJ0KS5zdGFydE9mKCdoJykuYWRkKGksICdoJykudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgY291bnQgPSBfLmZpbmRXaGVyZSh0aW1lbGluZSwgeyB0aW1lOiB0aW1lIH0pO1xuXG4gICAgICAgICAgICAgICAgZnJlcXVlbmN5LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICB0aW1lOiB0aW1lLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogY291bnQgPyBjb3VudC5jb3VudCA6IDBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZyZXF1ZW5jeTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBjYW52YXMgbGF5ZXJcbiAgICAgICAgICAgIHZhciBjYW52YXNJbWFnZU92ZXJsYXkgPSBzdGF0ZVNlcnZpY2UuZ2V0Q2FudmFzSW1hZ2VPdmVybGF5KCk7XG4gICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZnJlcXVlbmN5ID0gW107XG4gICAgICAgICAgICBibG9ja1VJLnN0YXJ0KCdMb2FkaW5nIEFPSSBEYXRhJyk7XG4gICAgICAgICAgICBhbmFseXplU2VydmljZS5nZXRPdmVybGF5cygpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gcmVzdWx0LmRhdGE7XG5cbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0U3BhdGlhbFpvb20oZGF0YS5zcGF0aWFsWm9vbSk7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsWm9vbShkYXRhLnRlbXBvcmFsWm9vbSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5mcmFtZSAmJiBkYXRhLmZyYW1lLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVsaW5lID0gW107XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gZXh0cmFjdCBudW1iZXIgb2YgY29sbGVjdHMgcGVyIGhvdXJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvdW50cyA9IF8uY291bnRCeShkYXRhLmZyYW1lLCBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnQudXRjKGZyYW1lLnRpbWUpLnN0YXJ0T2YoJ2gnKS50b0lTT1N0cmluZygpIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGZvcm1hdCBjb3VudHMgaW50byBhbiBhcnJheSBvZiBvYmplY3RzIGZvciB1c2Ugd2l0aCB0aW1lU2xpZGVyXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChfLnBhaXJzKGNvdW50cyksIGZ1bmN0aW9uIChjb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZTogbW9tZW50LnV0Yyhjb3VudFswXSkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogY291bnRbMV1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBzb3J0IGJ5IGRhdGUgYXNjXG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lID0gXy5zb3J0QnkodGltZWxpbmUsIFsndGltZSddLCBbJ2FzYyddKTtcblxuICAgICAgICAgICAgICAgICAgICBmcmVxdWVuY3kgPSBnZW5lcmF0ZUZyZXF1ZW5jeSh0aW1lbGluZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKF8ubWF4KGZyZXF1ZW5jeSkgPT09IDAgfHwgXy5tYXgoZnJlcXVlbmN5KSA9PT0gJy1JbmZpbml0eScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvYXN0ci5pbmZvKCdObyBmZWF0dXJlcyBhdmFpbGFibGUgYXQgdGhpcyBsb2NhdGlvbiBkdXJpbmcgc3BlY2lmaWVkIHRpbWUgaW50ZXJ2YWwnLCAnQ292ZXJhZ2UgSW5mb3JtYXRpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBzdGF0ZVNlcnZpY2VcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRpbWVTbGlkZXJGcmVxdWVuY3koZnJlcXVlbmN5KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRpbWVTbGlkZXJEYXRhKGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RvcCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZyZXF1ZW5jeSA9IGdlbmVyYXRlRnJlcXVlbmN5KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRpbWVTbGlkZXJGcmVxdWVuY3koZnJlcXVlbmN5KTtcbiAgICAgICAgICAgICAgICAgICAgdG9hc3RyLmluZm8oJ05vIGZlYXR1cmVzIGF2YWlsYWJsZSBhdCB0aGlzIGxvY2F0aW9uIGR1cmluZyBzcGVjaWZpZWQgdGltZSBpbnRlcnZhbCcsICdDb3ZlcmFnZSBJbmZvcm1hdGlvbicpO1xuICAgICAgICAgICAgICAgICAgICBibG9ja1VJLnN0b3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBmcmVxdWVuY3kgPSBnZW5lcmF0ZUZyZXF1ZW5jeShbXSk7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRpbWVTbGlkZXJGcmVxdWVuY3koZnJlcXVlbmN5KTtcbiAgICAgICAgICAgICAgICBibG9ja1VJLnN0b3AoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgdG9hc3RyLmVycm9yKCdVbmFibGUgdG8gcmV0cmlldmUgQU9JIG1ldGFkYXRhLicsICdDb21tdW5pY2F0aW9uIEVycm9yJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gY2xlYXIgY292ZXJhZ2UgYW5kIGVuYWJsZUNvdmVyYWdlIHNvIHRoZSAkd2F0Y2ggc3RhdGVtZW50cyBpbiBzZWFyY2hDb250cm9sbGVyIHdpbGwgb2JzZXJ2ZSB0aGUgdmFsdWUgY2hhbmdlXG4gICAgICAgIHN0YXRlU2VydmljZS5zZXRDb3ZlcmFnZShbXSk7XG4gICAgICAgIHN0YXRlU2VydmljZS5zZXRFbmFibGVDb3ZlcmFnZShudWxsKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3NlYXJjaENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHNlYXJjaFNlcnZpY2UsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgYmxvY2tVSSxcbiAgICAgICAgXyxcbiAgICAgICAgbW9tZW50LFxuICAgICAgICB0b2FzdHJcbiAgICApIHtcbiAgICAgICAgdmFyIGVuYWJsZUNvdmVyYWdlID0gc2lnbWFDb25maWcuZGVmYXVsdEVuYWJsZUNvdmVyYWdlO1xuXG4gICAgICAgICRzY29wZS5jb3ZlcmFnZURhdGEgPSBbXTtcbiAgICAgICAgJHNjb3BlLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcblxuICAgICAgICB2YXIgdXBkYXRlQ292ZXJhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gc2VhcmNoU2VydmljZS5nZXRDb3ZlcmFnZSgpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldENvdmVyYWdlKGRhdGEuZGF0YS5yZXN1bHRzKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB0b2FzdHIud2FybmluZygnVW5hYmxlIHRvIGxvYWQgY292ZXJhZ2UgZGF0YScsICdDb21tdW5pY2F0aW9ucyBFcnJvcicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGdlbmVyYXRlRnJlcXVlbmN5ID0gZnVuY3Rpb24gKHRpbWVsaW5lKSB7XG4gICAgICAgICAgICB2YXIgZnJlcXVlbmN5ID0gW10sXG4gICAgICAgICAgICAgICAgdGltZVNsaWRlckV4dGVudHMgPSBzdGF0ZVNlcnZpY2UuZ2V0VGltZVNsaWRlckV4dGVudHMoKTtcblxuICAgICAgICAgICAgLy8gZGV0ZXJtaW5lIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuIHRpbWUgZXh0ZW50c1xuICAgICAgICAgICAgdmFyIG51bURheXMgPSBtb21lbnQudXRjKHRpbWVTbGlkZXJFeHRlbnRzLnN0b3ApLmRpZmYobW9tZW50LnV0Yyh0aW1lU2xpZGVyRXh0ZW50cy5zdGFydCksICdkJykgKyAxO1xuXG4gICAgICAgICAgICAvLyBhZGQgMCB2YWx1ZXMgZm9yIGV2ZXJ5IGRheSB0aGF0IGhhcyBubyB2YWx1ZSBpbiB0aW1lbGluZVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1EYXlzOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZSA9IG1vbWVudC51dGModGltZVNsaWRlckV4dGVudHMuc3RhcnQpLnN0YXJ0T2YoJ2QnKS5hZGQoaSwgJ2QnKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICBjb3VudCA9IF8uZmluZFdoZXJlKHRpbWVsaW5lLCB7IHRpbWU6IHRpbWUgfSk7XG5cbiAgICAgICAgICAgICAgICBmcmVxdWVuY3kucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiBjb3VudCA/IGNvdW50LmNvdW50IDogMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZnJlcXVlbmN5O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBnZXRDb2xsZWN0Q291bnRzQnlEYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBibG9ja1VJLnN0YXJ0KCdMb2FkaW5nIENvbGxlY3QgQ291bnRzJyk7XG4gICAgICAgICAgICBzZWFyY2hTZXJ2aWNlLmdldENvbGxlY3RDb3VudHNCeURheSgpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gcmVzdWx0LmRhdGE7XG5cbiAgICAgICAgICAgICAgICB2YXIgdGltZWxpbmUgPSBbXTtcblxuICAgICAgICAgICAgICAgIC8vIGZvcm1hdCBjb3VudHMgaW50byBhbiBhcnJheSBvZiBvYmplY3RzIGZvciB1c2Ugd2l0aCB0aW1lU2xpZGVyXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGRhdGEucmVzdWx0cywgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWU6IG1vbWVudC51dGMocmVzdWx0LmRheSwgJ1lZWVktTS1EJykudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiByZXN1bHQuY291bnRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBzb3J0IGJ5IGRhdGUgYXNjXG4gICAgICAgICAgICAgICAgdGltZWxpbmUgPSBfLnNvcnRCeSh0aW1lbGluZSwgWyd0aW1lJ10sIFsnYXNjJ10pO1xuXG4gICAgICAgICAgICAgICAgdmFyIGZyZXF1ZW5jeSA9IGdlbmVyYXRlRnJlcXVlbmN5KHRpbWVsaW5lKTtcblxuICAgICAgICAgICAgICAgIGlmIChfLm1heChmcmVxdWVuY3kpID09PSAwIHx8IF8ubWF4KGZyZXF1ZW5jeSkgPT09ICctSW5maW5pdHknKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvYXN0ci5pbmZvKCdObyBmZWF0dXJlcyBhdmFpbGFibGUgYXQgdGhpcyBsb2NhdGlvbicsICdDb3ZlcmFnZSBJbmZvcm1hdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHB1Ymxpc2ggY2hhbmdlcyB0byBzdGF0ZVNlcnZpY2VcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGltZVNsaWRlckZyZXF1ZW5jeShmcmVxdWVuY3kpO1xuXG4gICAgICAgICAgICAgICAgYmxvY2tVSS5zdG9wKCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgdmFyIGZyZXF1ZW5jeSA9IGdlbmVyYXRlRnJlcXVlbmN5KFtdKTtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGltZVNsaWRlckZyZXF1ZW5jeShmcmVxdWVuY3kpO1xuICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RvcCgpO1xuICAgICAgICAgICAgICAgIHRvYXN0ci53YXJuaW5nKCdVbmFibGUgdG8gcmV0cmlldmUgY29sbGVjdCBjb3VudHMnLCAnQ29tbXVuaWNhdGlvbnMgRXJyb3InKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCdzdGF0ZVNlcnZpY2UuZ2V0TWFwQm91bmRzKCknLCBfLmRlYm91bmNlKGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChlbmFibGVDb3ZlcmFnZSkge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVDb3ZlcmFnZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihnZXRDb2xsZWN0Q291bnRzQnlEYXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgc2lnbWFDb25maWcuZGVib3VuY2VUaW1lKSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3N0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpJywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZW5hYmxlQ292ZXJhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlQ292ZXJhZ2UoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZ2V0Q29sbGVjdENvdW50c0J5RGF5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZnJlcXVlbmN5ID0gZ2VuZXJhdGVGcmVxdWVuY3koW10pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0VGltZVNsaWRlckZyZXF1ZW5jeShmcmVxdWVuY3kpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgc2lnbWFDb25maWcuZGVib3VuY2VUaW1lKSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnc3RhdGVTZXJ2aWNlLmdldEJhbmQoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlQ292ZXJhZ2UoKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihnZXRDb2xsZWN0Q291bnRzQnlEYXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdzdGF0ZVNlcnZpY2UuZ2V0RW5hYmxlQ292ZXJhZ2UoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5hYmxlQ292ZXJhZ2UgPSBuZXdWYWx1ZTtcblxuICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlQ292ZXJhZ2UoKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihnZXRDb2xsZWN0Q291bnRzQnlEYXkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgZnJlcXVlbmN5ID0gZ2VuZXJhdGVGcmVxdWVuY3koW10pO1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUaW1lU2xpZGVyRnJlcXVlbmN5KGZyZXF1ZW5jeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3N0YXRlU2VydmljZS5nZXRTZW5zb3IoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlQ292ZXJhZ2UoKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihnZXRDb2xsZWN0Q291bnRzQnlEYXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ2FvaUFuYWx5c2lzQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbW9kYWwsXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGFuYWx5emVTZXJ2aWNlLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICB0b2FzdHIsXG4gICAgICAgIEwsXG4gICAgICAgIG1vbWVudFxuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgbWFwID0gc3RhdGVTZXJ2aWNlLmdldE1hcCgpLFxuICAgICAgICAgICAgYmJveCA9IHN0YXRlU2VydmljZS5nZXRCYm94KCksXG4gICAgICAgICAgICBhbmFseXNpc092ZXJsYXkgPSB7fSxcbiAgICAgICAgICAgIGJhbmQgPSBzdGF0ZVNlcnZpY2UuZ2V0QmFuZCgpO1xuXG4gICAgICAgIHZtLnNpZ21hQ29uZmlnID0gc2lnbWFDb25maWc7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uYW9pQW5hbHlzaXNWYWx1ZXMgPSBzaWdtYUNvbmZpZy5hb2lBbmFseXNpc1ZhbHVlcztcbiAgICAgICAgdm0uc2VsZWN0ZWRBbmFseXNpcyA9IHt9O1xuICAgICAgICB2bS5nZW90aWZmTGluayA9ICcnO1xuXG4gICAgICAgIHZhciBhbmFseXNpc01vZGFsID0gJG1vZGFsKHtzY29wZTogJHNjb3BlLCB0ZW1wbGF0ZVVybDogJ2FuYWx5c2lzTW9kYWwuaHRtbCcsIHNob3c6IGZhbHNlLCBhbmltYXRpb246ICdhbS1mYWRlLWFuZC1zY2FsZSd9KSxcbiAgICAgICAgICAgIGFuYWx5c2lzSW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblxuICAgICAgICB2bS5hbmFseXplQW9pID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICB2bS5zZWxlY3RlZEFuYWx5c2lzID0gdmFsdWUudGl0bGU7XG4gICAgICAgICAgICBibG9ja1VJLnN0YXJ0KCdBbmFseXppbmcgQU9JJyk7XG4gICAgICAgICAgICBhbmFseXplU2VydmljZS5hbmFseXplQW9pKHZhbHVlLm5hbWUsICdiYXNlNjQnKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBhbmFseXNpc0ltYWdlLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnaW1nLXJlc3BvbnNpdmUnKTtcbiAgICAgICAgICAgICAgICBhbmFseXNpc0ltYWdlLnNyYyA9ICdkYXRhOmltYWdlL3BuZztiYXNlNjQsJyArIHJlc3VsdC5kYXRhLnJlcGxhY2UoLyhcXHJcXG58XFxufFxccikvZ20sICcnKTtcbiAgICAgICAgICAgICAgICBibG9ja1VJLnN0b3AoKTtcblxuICAgICAgICAgICAgICAgIC8vIHNldCB1cCBnZW90aWZmIGxpbmtcbiAgICAgICAgICAgICAgICB2YXIgdGltZSA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogbW9tZW50LnV0Yyh0aW1lLnN0YXJ0KS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogbW9tZW50LnV0Yyh0aW1lLnN0b3ApLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB2YWx1ZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgbjogYmJveC5ub3J0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGU6IGJib3guZWFzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHM6IGJib3guc291dGgsXG4gICAgICAgICAgICAgICAgICAgICAgICB3OiBiYm94Lndlc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWFnZVF1YWxpdHk6IHN0YXRlU2VydmljZS5nZXRJbWFnZVF1YWxpdHkoKVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdm0uZ2VvdGlmZkxpbmsgPSBzaWdtYUNvbmZpZy51cmxzLmFvaWFuYWx5c2lzICsgJz9zdGFydD0nICsgcGFyYW1zLnN0YXJ0ICsgJyZzdG9wPScgKyBwYXJhbXMuc3RvcCArICcmdHlwZT0nICsgcGFyYW1zLnR5cGUgKyAnJm49JyArIHBhcmFtcy5uICsgJyZlPScgKyBwYXJhbXMuZSArICcmcz0nICsgcGFyYW1zLnMgKyAnJnc9JyArIHBhcmFtcy53ICsgJyZiYW5kPScgKyBiYW5kICsgJyZyZXR1cm50eXBlPWdlb3RpZmYmaW1hZ2VxdWFsaXR5PScgKyBwYXJhbXMuaW1hZ2VRdWFsaXR5O1xuXG4gICAgICAgICAgICAgICAgLy8gc2V0IHVwIG1vZGFsXG4gICAgICAgICAgICAgICAgdmFyIHN3ID0gTC5sYXRMbmcoYmJveC5zb3V0aCwgYmJveC53ZXN0KSxcbiAgICAgICAgICAgICAgICAgICAgbmUgPSBMLmxhdExuZyhiYm94Lm5vcnRoLCBiYm94LmVhc3QpLFxuICAgICAgICAgICAgICAgICAgICBib3VuZHMgPSBMLmxhdExuZ0JvdW5kcyhzdywgbmUpO1xuXG4gICAgICAgICAgICAgICAgYW5hbHlzaXNPdmVybGF5ID0gTC5pbWFnZU92ZXJsYXkoYW5hbHlzaXNJbWFnZS5zcmMsIGJvdW5kcyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWFwKTtcbiAgICAgICAgICAgICAgICAvL2FuYWx5c2lzT3ZlcmxheS5hZGRUbyhtYXApLl9icmluZ1RvQmFjaygpO1xuICAgICAgICAgICAgICAgIGFuYWx5c2lzTW9kYWwuJHByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuYWx5c2lzTW9kYWwuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5hbHlzaXNJbWFnZScpLmFwcGVuZENoaWxkKGFuYWx5c2lzSW1hZ2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgYmxvY2tVSS5yZXNldCgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICB0b2FzdHIuZXJyb3IoZXJyb3IsICdBT0kgQW5hbHlzaXMgRXJyb3InKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFBb2lBbmFseXNpcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9hb2lBbmFseXNpcy9hb2lBbmFseXNpc1RlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2FvaUFuYWx5c2lzQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge31cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdiYW5kQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5tb2RlID0gJHNjb3BlLm1vZGU7XG4gICAgICAgIHZtLmJhbmRzID0gXy5jbG9uZURlZXAoc2lnbWFDb25maWcuYmFuZHMpO1xuICAgICAgICB2bS5zZWxlY3RlZEJhbmQgPSBxcy5iYW5kID8gXy5maW5kV2hlcmUodm0uYmFuZHMsIHtuYW1lOiBxcy5iYW5kfSkgOiBfLmZpbmRXaGVyZSh2bS5iYW5kcywge2RlZmF1bHQ6IHRydWV9KTtcblxuICAgICAgICB2bS5zZXRCYW5kID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmFuZCh2YWx1ZS5uYW1lKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uc2V0QmFuZCh2bS5zZWxlY3RlZEJhbmQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGluaXRpYWxpemUoKTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hQmFuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9iYW5kL2JhbmRUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdiYW5kQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPScsXG4gICAgICAgICAgICAgICAgbW9kZTogJ0AnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcignY29ycmVsYXRpb25BbmFseXNpc0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJG1vZGFsLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBfLFxuICAgICAgICBtb21lbnRcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uY29ycmVsYXRpb24gPSB7fTtcbiAgICAgICAgdm0uZ2VvdGlmZkxpbmsgPSAnJztcbiAgICAgICAgdm0uZ2VvdGlmZkZpbGVuYW1lID0gJyc7XG5cbiAgICAgICAgdmFyIGFuYWx5c2lzTW9kYWwgPSAkbW9kYWwoe3Njb3BlOiAkc2NvcGUsIHRlbXBsYXRlVXJsOiAnY29ycmVsYXRpb25BbmFseXNpc01vZGFsLmh0bWwnLCBzaG93OiBmYWxzZSwgYW5pbWF0aW9uOiAnYW0tZmFkZS1hbmQtc2NhbGUnfSksXG4gICAgICAgICAgICBhbmFseXNpc0ltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyksXG4gICAgICAgICAgICBiYm94ID0gc3RhdGVTZXJ2aWNlLmdldEJib3goKSxcbiAgICAgICAgICAgIGJhbmQgPSBzdGF0ZVNlcnZpY2UuZ2V0QmFuZCgpLFxuICAgICAgICAgICAgaW1hZ2VRdWFsaXR5ID0gc3RhdGVTZXJ2aWNlLmdldEltYWdlUXVhbGl0eSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q29ycmVsYXRpb25EYXRhKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSAmJiBfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2bS5jb3JyZWxhdGlvbiA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIHZtLmdlb3RpZmZMaW5rID0gc2lnbWFDb25maWcudXJscy5jb3JyZWxhdGUgKyAnP3N0YXJ0PScgKyB2bS5jb3JyZWxhdGlvbi5zdGFydC50b0lTT1N0cmluZygpICsgJyZzdG9wPScgKyB2bS5jb3JyZWxhdGlvbi5zdG9wLnRvSVNPU3RyaW5nKCkgKyAnJm49JyArIGJib3gubm9ydGggKyAnJmU9JyArIGJib3guZWFzdCArICcmcz0nICsgYmJveC5zb3V0aCArICcmdz0nICsgYmJveC53ZXN0ICsgJyZsYXQ9JyArIHZtLmNvcnJlbGF0aW9uLmxhdGxuZy5sYXQgKyAnJmxuZz0nICsgdm0uY29ycmVsYXRpb24ubGF0bG5nLmxuZyArICcmYmFuZD0nICsgYmFuZCArICcmcmV0dXJudHlwZT1nZW90aWZmJmltYWdlcXVhbGl0eT0nICsgaW1hZ2VRdWFsaXR5O1xuICAgICAgICAgICAgICAgIHZtLmdlb3RpZmZGaWxlbmFtZSA9ICdzaWdtYS1jb3JyZWxhdGlvbi1hbmFseXNpcy0nICsgbW9tZW50LnV0YygpLnVuaXgoKSArICcudGlmJztcbiAgICAgICAgICAgICAgICBhbmFseXNpc0ltYWdlLmhlaWdodCA9ICc1MTInO1xuICAgICAgICAgICAgICAgIGFuYWx5c2lzSW1hZ2Uud2lkdGggPSAnNTEyJztcbiAgICAgICAgICAgICAgICBhbmFseXNpc0ltYWdlLnNyYyA9ICdkYXRhOmltYWdlL3BuZztiYXNlNjQsJyArIHZtLmNvcnJlbGF0aW9uLmRhdGEucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyKS9nbSwgJycpO1xuICAgICAgICAgICAgICAgIGFuYWx5c2lzTW9kYWwuJHByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuYWx5c2lzTW9kYWwuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5hbHlzaXNJbWFnZScpLmFwcGVuZENoaWxkKGFuYWx5c2lzSW1hZ2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hQ29ycmVsYXRpb25BbmFseXNpcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9jb3JyZWxhdGlvbkFuYWx5c2lzL2NvcnJlbGF0aW9uQW5hbHlzaXNUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdjb3JyZWxhdGlvbkFuYWx5c2lzQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge31cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdjb3ZlcmFnZUZpbHRlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlXG4gICAgKSB7XG4gICAgICAgIHZhciBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKSxcbiAgICAgICAgICAgIHZtID0gdGhpcztcblxuICAgICAgICB2bS5lbmFibGVDb3ZlcmFnZUNvbXBvbmVudCA9IHNpZ21hQ29uZmlnLmNvbXBvbmVudHMuY292ZXJhZ2VGaWx0ZXI7XG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuICAgICAgICB2bS5jb3ZlcmFnZUVuYWJsZWQgPSBxcy5lbmFibGVDb3ZlcmFnZSA/IHFzLmVuYWJsZUNvdmVyYWdlID09PSAndHJ1ZScgOiBzaWdtYUNvbmZpZy5kZWZhdWx0RW5hYmxlQ292ZXJhZ2U7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uY292ZXJhZ2VPcGFjaXR5U2xpZGVyID0ge1xuICAgICAgICAgICAgbWluOiAwLjAxLFxuICAgICAgICAgICAgbWF4OiAxLjAsXG4gICAgICAgICAgICB2YWx1ZTogcXMuY292ZXJhZ2VPcGFjaXR5ID8gcGFyc2VGbG9hdChxcy5jb3ZlcmFnZU9wYWNpdHkpIDogMC41XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uY292ZXJhZ2VFbmFibGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEVuYWJsZUNvdmVyYWdlKHZtLmNvdmVyYWdlRW5hYmxlZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLmNvdmVyYWdlT3BhY2l0eVNsaWRlci52YWx1ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRDb3ZlcmFnZU9wYWNpdHkodm0uY292ZXJhZ2VPcGFjaXR5U2xpZGVyLnZhbHVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldEVuYWJsZUNvdmVyYWdlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmNvdmVyYWdlRW5hYmxlZCA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q292ZXJhZ2VPcGFjaXR5KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmNvdmVyYWdlT3BhY2l0eVNsaWRlci52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFDb3ZlcmFnZUZpbHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9jb3ZlcmFnZUZpbHRlci9jb3ZlcmFnZUZpbHRlclRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2NvdmVyYWdlRmlsdGVyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdmcmFtZU92ZXJsYXlzQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBfLFxuICAgICAgICB0b2FzdHJcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIGZyYW1lSW5kZXhlcyA9IFtdLFxuICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5ID0gc3RhdGVTZXJ2aWNlLmdldENhbnZhc0ltYWdlT3ZlcmxheSgpO1xuXG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLmZyYW1lT3ZlcmxheXMgPSBbXTtcbiAgICAgICAgdm0ucGxheWJhY2tTdGF0ZSA9ICcnO1xuICAgICAgICB2bS5jb250cmFzdExldmVscyA9IHNpZ21hQ29uZmlnLmNvbnRyYXN0TGV2ZWxzO1xuICAgICAgICB2bS5zZWxlY3RlZENvbnRyYXN0TGV2ZWwgPSBfLmZpbmRXaGVyZShzaWdtYUNvbmZpZy5jb250cmFzdExldmVscywgeyBkZWZhdWx0OiB0cnVlIH0pO1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWQgPSAhdm0uZXhwYW5kZWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uaGlnaGxpZ2h0SW1hZ2UgPSBmdW5jdGlvbiAob3ZlcmxheSwgZG9IaWdobGlnaHQpIHtcbiAgICAgICAgICAgIGlmIChkb0hpZ2hsaWdodCkge1xuICAgICAgICAgICAgICAgIGlmIChvdmVybGF5LmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGNhbnZhc0ltYWdlT3ZlcmxheS5mcmFtZXNbY2FudmFzSW1hZ2VPdmVybGF5LmN1cnJlbnRJZHhdLmltYWdlcywgZnVuY3Rpb24obykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFyayBhbGwgb3ZlcmxheXMgYXMgaGlkZGVuLCBleGNlcHQgZm9yIHRoZSBtYXRjaGluZyB0YXJnZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIG8udmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG8udXJsID09PSBvdmVybGF5LnVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8udmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIHRvIFwibm9ybWFsXCIgc3RhdGVcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goY2FudmFzSW1hZ2VPdmVybGF5LmZyYW1lc1tjYW52YXNJbWFnZU92ZXJsYXkuY3VycmVudElkeF0uaW1hZ2VzLCBmdW5jdGlvbihvKSB7XG4gICAgICAgICAgICAgICAgICAgIG8udmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbnZhc0ltYWdlT3ZlcmxheS5yZWRyYXcoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS50b2dnbGVJbWFnZSA9IGZ1bmN0aW9uIChvdmVybGF5KSB7XG4gICAgICAgICAgICAvLyBhbGwgdGhpcyBkb2VzIHJpZ2h0IG5vdyBpcyBzdXBlcmZpY2lhbGx5IHJlbW92ZSB0aGUgaW1hZ2UgZnJvbSB0aGUgYXJyYXkgYW5kIHRoZSBtYXBcbiAgICAgICAgICAgIC8vIG5lZWQgdGhpcyB0byBwZXJzaXN0XG4gICAgICAgICAgICB2YXIgZnJhbWVDdXJyZW50ID0gc3RhdGVTZXJ2aWNlLmdldEZyYW1lQ3VycmVudCgpLFxuICAgICAgICAgICAgICAgIG92ZXJsYXlJZHggPSBfLmluZGV4T2YoZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uaW1hZ2VzLCBvdmVybGF5KTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvdmVybGF5SWR4ID09PSAndW5kZWZpbmVkJyB8fCBvdmVybGF5SWR4ID09PSBudWxsIHx8IG92ZXJsYXlJZHggPiBmcmFtZUluZGV4ZXNbZnJhbWVDdXJyZW50XS5pbWFnZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIHRvYXN0ci5lcnJvcignVW5hYmxlIHRvIHJldHJpZXZlIG92ZXJsYXkgb2JqZWN0JywgJ092ZXJsYXkgRXJyb3InKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvdmVybGF5LmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBmcmFtZUluZGV4ZXNbZnJhbWVDdXJyZW50XS5pbWFnZXNbb3ZlcmxheUlkeF0uZW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGcmFtZUluZGV4ZXMoZnJhbWVJbmRleGVzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgXy5maW5kKHZtLmZyYW1lT3ZlcmxheXMsICdzcmMnLCBvdmVybGF5LnNyYykuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJlbmRlciB0aGUgb3ZlcmxheSBzZXJ2aWNlXG4gICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkucmVkcmF3KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0Q29udHJhc3RMZXZlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRDb250cmFzdExldmVsKHZtLnNlbGVjdGVkQ29udHJhc3RMZXZlbCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRGcmFtZU92ZXJsYXlzKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHZtLmZyYW1lT3ZlcmxheXMgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRGcmFtZUluZGV4ZXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnJhbWVJbmRleGVzID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRQbGF5YmFja1N0YXRlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLnBsYXliYWNrU3RhdGUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdm0uZ2V0T3ZlcmxheVRvb2x0aXAgPSBmdW5jdGlvbiAob3ZlcmxheSkge1xuICAgICAgICAgICAgdmFyIHVybCA9IG92ZXJsYXkudXJsO1xuICAgICAgICAgICAgcmV0dXJuIHVybC5zcGxpdCgnLycpW3VybC5zcGxpdCgnLycpLmxlbmd0aCAtIDNdICsgJzxzcGFuIGNsYXNzPVwiZmlsZS1wYXRoLWRlbGltaXRlclwiPi88L3NwYW4+JyArIHVybC5zcGxpdCgnLycpW3VybC5zcGxpdCgnLycpLmxlbmd0aCAtIDJdICsgJzxzcGFuIGNsYXNzPVwiZmlsZS1wYXRoLWRlbGltaXRlclwiPi88L3NwYW4+JyArIHVybC5zcGxpdCgnLycpW3VybC5zcGxpdCgnLycpLmxlbmd0aCAtIDFdO1xuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYUZyYW1lT3ZlcmxheXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvZnJhbWVPdmVybGF5cy9mcmFtZU92ZXJsYXlzVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnZnJhbWVPdmVybGF5c0NvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIFxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ2dvdG9Db250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHNpZ21hU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBMXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKSxcbiAgICAgICAgICAgIG1hcCA9IHN0YXRlU2VydmljZS5nZXRNYXAoKTtcblxuICAgICAgICAkc2NvcGUubW9kZSA9ICRzY29wZS4kcGFyZW50Lm1vZGU7XG4gICAgICAgIHZtLnNpZ21hQ29uZmlnID0gc2lnbWFDb25maWc7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLmxhdCA9ICcnO1xuICAgICAgICB2bS5sbmcgPSAnJztcbiAgICAgICAgdm0ubWdycyA9ICcnO1xuICAgICAgICB2bS5sb2NhdGlvbkZvcm1hdCA9IHFzLmxvY2F0aW9uRm9ybWF0ID8gcXMubG9jYXRpb25Gb3JtYXQgOiBzaWdtYUNvbmZpZy5kZWZhdWx0TG9jYXRpb25Gb3JtYXQ7XG5cbiAgICAgICAgdmFyIGNvbnZlcnRMYXRMbmcgPSBmdW5jdGlvbiAobmV3Rm9ybWF0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2lnbWFTZXJ2aWNlLmNvbnZlcnRMYXRMbmcoe1xuICAgICAgICAgICAgICAgIGxhdDogdm0ubGF0LFxuICAgICAgICAgICAgICAgIGxuZzogdm0ubG5nLFxuICAgICAgICAgICAgICAgIG1ncnM6IHZtLm1ncnMsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiB2bS5sb2NhdGlvbkZvcm1hdFxuICAgICAgICAgICAgfSwgbmV3Rm9ybWF0KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdm0uZ290byA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBkZExhdExuZyA9IGNvbnZlcnRMYXRMbmcoJ2RkJyk7XG4gICAgICAgICAgICBtYXAuc2V0VmlldyhMLmxhdExuZyhkZExhdExuZy5sYXQsIGRkTGF0TG5nLmxuZykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldExvY2F0aW9uRm9ybWF0ID0gZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExvY2F0aW9uRm9ybWF0KGZvcm1hdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5zZXRMb2NhdGlvbkZvcm1hdCh2bS5sb2NhdGlvbkZvcm1hdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRMb2NhdGlvbkZvcm1hdCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKHZtLmxhdCAhPT0gJycgJiYgdm0ubG5nICE9PSAnJykgfHwgdm0ubWdycyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29udmVydGVkTGF0TG5nID0gY29udmVydExhdExuZyhuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgICAgdm0ubGF0ID0gY29udmVydGVkTGF0TG5nLmxhdDtcbiAgICAgICAgICAgICAgICB2bS5sbmcgPSBjb252ZXJ0ZWRMYXRMbmcubG5nO1xuICAgICAgICAgICAgICAgIHZtLm1ncnMgPSBjb252ZXJ0ZWRMYXRMbmcubWdycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLmxvY2F0aW9uRm9ybWF0ID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBcbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hR290bycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9nb3RvL2dvdG9UZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdnb3RvQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdsb2NhdGlvbkZvcm1hdENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UsXG4gICAgICAgIF9cbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0ubG9jYXRpb24gPSB7XG4gICAgICAgICAgICBmb3JtYXQ6IHFzLmxvY2F0aW9uRm9ybWF0IHx8IHNpZ21hQ29uZmlnLmRlZmF1bHRMb2NhdGlvbkZvcm1hdCxcbiAgICAgICAgICAgIG5vcnRoOiBxcy5uIHx8ICcnLFxuICAgICAgICAgICAgc291dGg6IHFzLnMgfHwgJycsXG4gICAgICAgICAgICBlYXN0OiBxcy5lIHx8ICcnLFxuICAgICAgICAgICAgd2VzdDogcXMudyB8fCAnJyxcbiAgICAgICAgICAgIG1ncnNORTogcXMubmUgfHwgJycsXG4gICAgICAgICAgICBtZ3JzU1c6IHFzLnN3IHx8ICcnXG4gICAgICAgIH07XG4gICAgICAgIHZtLm1vZGUgPSAkc2NvcGUuJHBhcmVudC5tb2RlO1xuICAgICAgICBcbiAgICAgICAgdm0uc2V0Rm9ybWF0ID0gZnVuY3Rpb24gKG5ld0Zvcm1hdCkge1xuICAgICAgICAgICAgdmFyIG5lLCBzdztcbiAgICAgICAgICAgIHN3aXRjaCAodm0ubG9jYXRpb24uZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRERCcm9hZGNhc3Qodm0ubG9jYXRpb24uc291dGgsIHZtLmxvY2F0aW9uLndlc3QpO1xuICAgICAgICAgICAgICAgICAgICBuZSA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRERCcm9hZGNhc3Qodm0ubG9jYXRpb24ubm9ydGgsIHZtLmxvY2F0aW9uLmVhc3QpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdkbXMnOlxuICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yRE1TQnJvYWRjYXN0KHZtLmxvY2F0aW9uLnNvdXRoLCB2bS5sb2NhdGlvbi53ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgbmUgPSBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UucHJlcEZvckRNU0Jyb2FkY2FzdCh2bS5sb2NhdGlvbi5ub3J0aCwgdm0ubG9jYXRpb24uZWFzdCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ21ncnMnOlxuICAgICAgICAgICAgICAgICAgICBpZiAodm0ubG9jYXRpb24ubWdyc1NXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdyA9IGNvb3JkaW5hdGVDb252ZXJzaW9uU2VydmljZS5wcmVwRm9yTUdSU0Jyb2FkY2FzdCh2bS5sb2NhdGlvbi5tZ3JzU1cpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5sb2NhdGlvbi5tZ3JzTkUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5lID0gY29vcmRpbmF0ZUNvbnZlcnNpb25TZXJ2aWNlLnByZXBGb3JNR1JTQnJvYWRjYXN0KHZtLmxvY2F0aW9uLm1ncnNORSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5zb3V0aCA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ud2VzdCA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ubm9ydGggPSAnJztcbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLmVhc3QgPSAnJztcbiAgICAgICAgICAgIHZtLmxvY2F0aW9uLm1ncnNORSA9ICcnO1xuICAgICAgICAgICAgdm0ubG9jYXRpb24ubWdyc1NXID0gJyc7XG5cbiAgICAgICAgICAgIHN3aXRjaCAobmV3Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3cgJiYgbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLnNvdXRoID0gc3cuZGRbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi53ZXN0ID0gc3cuZGRbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5ub3J0aCA9IG5lLmRkWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24uZWFzdCA9IG5lLmRkWzFdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Rtcyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdyAmJiBuZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24uc291dGggPSBzdy5kbXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi53ZXN0ID0gc3cuZG1zWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ubG9jYXRpb24ubm9ydGggPSBuZS5kbXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5lYXN0ID0gbmUuZG1zWzFdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ21ncnMnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3cgJiYgbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmxvY2F0aW9uLm1ncnNTVyA9IHN3Lm1ncnMgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbi5tZ3JzTkUgPSBuZS5tZ3JzIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2bS5sb2NhdGlvbi5mb3JtYXQgPSBuZXdGb3JtYXQ7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmJveFBhcmFtcyh2bS5sb2NhdGlvbik7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TG9jYXRpb25Gb3JtYXQobmV3Rm9ybWF0KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJib3goKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbiA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdm0ubG9jYXRpb24gPSB7fTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hTG9jYXRpb25Gb3JtYXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvbG9jYXRpb25Gb3JtYXQvbG9jYXRpb25Gb3JtYXRUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdsb2NhdGlvbkZvcm1hdENvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHt9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcignbWFwQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkdGltZW91dCxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgYW5hbHl6ZVNlcnZpY2UsXG4gICAgICAgIHNpZ21hU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBsZWFmbGV0RGF0YSxcbiAgICAgICAgYmxvY2tVSSxcbiAgICAgICAgdG9hc3RyLFxuICAgICAgICBMLFxuICAgICAgICBfLFxuICAgICAgICBkM1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCksXG4gICAgICAgICAgICBlbmFibGVDb3ZlcmFnZSA9IHFzLmVuYWJsZUNvdmVyYWdlID8gcXMuZW5hYmxlQ292ZXJhZ2UgOiBzaWdtYUNvbmZpZy5kZWZhdWx0RW5hYmxlQ292ZXJhZ2UsXG4gICAgICAgICAgICBjb3ZlcmFnZU9wYWNpdHkgPSBzdGF0ZVNlcnZpY2UuZ2V0Q292ZXJhZ2VPcGFjaXR5KCksXG4gICAgICAgICAgICBjb3ZlcmFnZUxheWVyID0gbmV3IEwuTGF5ZXJHcm91cCgpLFxuICAgICAgICAgICAgY292ZXJhZ2VEYXRhLFxuICAgICAgICAgICAgZnJhbWVFeHRlbnRzID0ge30sXG4gICAgICAgICAgICBiYm94RmVhdHVyZUdyb3VwID0gbmV3IEwuRmVhdHVyZUdyb3VwKCksXG4gICAgICAgICAgICBtYXJrZXJGZWF0dXJlR3JvdXAgPSBuZXcgTC5GZWF0dXJlR3JvdXAoKTtcblxuICAgICAgICB2bS5tb2RlID0gJHNjb3BlLm1vZGU7XG4gICAgICAgIHZtLm1hcEhlaWdodCA9ICcwcHgnO1xuICAgICAgICB2bS5jZW50ZXIgPSBzaWdtYUNvbmZpZy5tYXBDZW50ZXI7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcblxuICAgICAgICAvLyB1aS1sZWFmbGV0IGRlZmF1bHRzXG4gICAgICAgIHZtLmRlZmF1bHRzID0ge1xuICAgICAgICAgICAgY3JzOiBzaWdtYUNvbmZpZy5kZWZhdWx0UHJvamVjdGlvbixcbiAgICAgICAgICAgIHpvb21Db250cm9sOiB0cnVlLFxuICAgICAgICAgICAgYXR0cmlidXRpb25Db250cm9sOiBmYWxzZSxcbiAgICAgICAgICAgIGNvbnRyb2xzOiB7XG4gICAgICAgICAgICAgICAgbGF5ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBjb2xsYXBzZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gbXVzdCBiZSBhIG5lc3RlZCBvYmplY3QgKGRyYXcuZHJhdykgaW4gb3JkZXIgdG8gd29yayB3aXRoIHVpLWxlYWZsZXQgYW5kIGxlYWZsZXQtZHJhd1xuICAgICAgICB2bS5jb250cm9scyA9IHtcbiAgICAgICAgICAgIGRyYXc6IHtcbiAgICAgICAgICAgICAgICBkcmF3OiB7XG4gICAgICAgICAgICAgICAgICAgIHJlY3RhbmdsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvbHlsaW5lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9seWdvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNpcmNsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlcjogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVkaXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUdyb3VwOiB2bS5tb2RlID09PSAnc2VhcmNoJyA/IGJib3hGZWF0dXJlR3JvdXAgOiBtYXJrZXJGZWF0dXJlR3JvdXBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gdWktbGVhZmxldCBiYXNlbGF5ZXJzIG9iamVjdFxuICAgICAgICB2bS5sYXllcnMgPSBfLmNsb25lRGVlcChzaWdtYUNvbmZpZy5sYXllcnMpO1xuXG4gICAgICAgIHZtLmNvbG9yU2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgICAgLnJhbmdlKFsnZ3JlZW4nLCAneWVsbG93JywgJ3JlZCddKSAvLyBvciB1c2UgaGV4IHZhbHVlc1xuICAgICAgICAgICAgLmRvbWFpbihbNTAsIDEyMCwgMjAwXSk7XG5cbiAgICAgICAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBzZXQgbWFwIGhlaWdodCBlcXVhbCB0byBhdmFpbGFibGUgcGFnZSBoZWlnaHRcbiAgICAgICAgICAgIHZhciB2aWV3cG9ydCA9IHNpZ21hU2VydmljZS5nZXRWaWV3cG9ydFNpemUoKTtcbiAgICAgICAgICAgIHZtLm1hcEhlaWdodCA9IHZpZXdwb3J0LmhlaWdodCArICdweCc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZtLmRyYXdDb3ZlcmFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh2bS5tb2RlID09PSAnc2VhcmNoJykge1xuICAgICAgICAgICAgICAgIGlmIChjb3ZlcmFnZUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvdmVyYWdlTGF5ZXIuY2xlYXJMYXllcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlICYmIGNvdmVyYWdlRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGNvdmVyYWdlRGF0YSwgZnVuY3Rpb24gKGNvdmVyYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvdmVyYWdlICE9PSBudWxsICYmIGNvdmVyYWdlLm4gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGVmaW5lIHJlY3RhbmdsZSBnZW9ncmFwaGljYWwgYm91bmRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBib3VuZHMgPSBbW2NvdmVyYWdlLnMsIGNvdmVyYWdlLmVdLCBbY292ZXJhZ2UubiwgY292ZXJhZ2Uud11dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYSByZWN0YW5nbGUgb3ZlcmxheVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMLnJlY3RhbmdsZShib3VuZHMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2bS5jb2xvclNjYWxlKGNvdmVyYWdlLmNvdW50KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodDogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IGNvdmVyYWdlT3BhY2l0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxPcGFjaXR5OiBjb3ZlcmFnZU9wYWNpdHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuYWRkVG8oY292ZXJhZ2VMYXllcikuYnJpbmdUb0JhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHZtLnVwZGF0ZUJhc2VsYXllciA9IGZ1bmN0aW9uIChsYXllcikge1xuICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TGF5ZXJzKCkudGhlbihmdW5jdGlvbiAobGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGxheWVycy5iYXNlbGF5ZXJzLCBmdW5jdGlvbiAobGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0ubWFwLnJlbW92ZUxheWVyKGxheWVyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2bS5tYXAuYWRkTGF5ZXIobGF5ZXJzLmJhc2VsYXllcnNbbGF5ZXIuaWRdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vmlld3BvcnRTaXplKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLm1hcEhlaWdodCA9IG5ld1ZhbHVlLmhlaWdodCArICdweCc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q292ZXJhZ2UoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnd2F0Y2guc3RhdGVTZXJ2aWNlLmdldENvdmVyYWdlJyk7XG4gICAgICAgICAgICBjb3ZlcmFnZURhdGEgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnZXRDb3ZlcmFnZScpO1xuICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlKSB7XG4gICAgICAgICAgICAgICAgdm0uZHJhd0NvdmVyYWdlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RW5hYmxlQ292ZXJhZ2UoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5hYmxlQ292ZXJhZ2UgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnZXRFbmFibGVDb3ZlcmFnZScpO1xuICAgICAgICAgICAgaWYgKGVuYWJsZUNvdmVyYWdlICYmIGNvdmVyYWdlRGF0YSkge1xuICAgICAgICAgICAgICAgIHZtLmRyYXdDb3ZlcmFnZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb3ZlcmFnZUxheWVyLmNsZWFyTGF5ZXJzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q292ZXJhZ2VPcGFjaXR5KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvdmVyYWdlT3BhY2l0eSA9IG5ld1ZhbHVlO1xuXG4gICAgICAgICAgICBjb3ZlcmFnZUxheWVyLmVhY2hMYXllcihmdW5jdGlvbiAobGF5ZXIpIHtcbiAgICAgICAgICAgICAgICBsYXllci5zZXRTdHlsZSh7XG4gICAgICAgICAgICAgICAgICAgIGZpbGxPcGFjaXR5OiBuZXdWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogbmV3VmFsdWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsYXllci5yZWRyYXcoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJhc2VsYXllcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS51cGRhdGVCYXNlbGF5ZXIobmV3VmFsdWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEZyYW1lRXh0ZW50cygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcmFtZUV4dGVudHMgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdm0uaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRCYm94RmVhdHVyZUdyb3VwKGJib3hGZWF0dXJlR3JvdXApO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldE1hcmtlckZlYXR1cmVHcm91cChtYXJrZXJGZWF0dXJlR3JvdXApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uIChtYXApIHtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0TWFwKG1hcCk7XG4gICAgICAgICAgICAgICAgdm0ubWFwID0gbWFwO1xuXG4gICAgICAgICAgICAgICAgLy8gYWRkIGNvb3JkaW5hdGVzIGNvbnRyb2xcbiAgICAgICAgICAgICAgICBMLmNvbnRyb2wuY29vcmRpbmF0ZXMoe1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVVc2VySW5wdXQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSkuYWRkVG8obWFwKTtcblxuICAgICAgICAgICAgICAgIHZhciBiYXNlbGF5ZXJJZCA9IHFzLmJhc2VsYXllcixcbiAgICAgICAgICAgICAgICAgICAgYmFzZWxheWVyID0ge307XG4gICAgICAgICAgICAgICAgaWYgKGJhc2VsYXllcklkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCByZXF1ZXN0ZWQgYmFzZWxheWVyIHRvIHZtLmxheWVycy5iYXNlbGF5ZXJzIGZpcnN0XG4gICAgICAgICAgICAgICAgICAgIGJhc2VsYXllciA9IF8uZmluZChzaWdtYUNvbmZpZy5sYXllcnMuYmFzZWxheWVycywgeyBpZDogYmFzZWxheWVySWQgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZtLnVwZGF0ZUJhc2VsYXllcihiYXNlbGF5ZXIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGJhc2VsYXllciBub3QgcHJlc2VudCBpbiBxdWVyeXN0cmluZywgc28ganVzdCBnbyB3aXRoIGRlZmF1bHRzXG4gICAgICAgICAgICAgICAgICAgIGJhc2VsYXllciA9IHNpZ21hQ29uZmlnLmxheWVycy5iYXNlbGF5ZXJzW3NpZ21hQ29uZmlnLmRlZmF1bHRCYXNlbGF5ZXJdO1xuICAgICAgICAgICAgICAgICAgICB2bS5sYXllcnMgPSBfLmNsb25lRGVlcChzaWdtYUNvbmZpZy5sYXllcnMpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmFzZWxheWVyKGJhc2VsYXllcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY292ZXJhZ2VMYXllci5hZGRUbyhtYXApO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZtLm1vZGUgPT09ICdzZWFyY2gnKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBMLmRyYXdMb2NhbC5lZGl0LnRvb2xiYXIuYnV0dG9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkaXQ6ICdFZGl0IEFPSScsXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0RGlzYWJsZWQ6ICdObyBBT0kgdG8gZWRpdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmU6ICdEZWxldGUgQU9JJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZURpc2FibGVkOiAnTm8gQU9JIHRvIGRlbGV0ZSdcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZtLm1vZGUgPT09ICdhbmFseXplJykge1xuICAgICAgICAgICAgICAgICAgICBMLmRyYXdMb2NhbC5lZGl0LnRvb2xiYXIuYnV0dG9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkaXQ6ICdFZGl0IG1hcmtlcnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZWRpdERpc2FibGVkOiAnTm8gbWFya2VycyB0byBlZGl0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZTogJ0RlbGV0ZSBtYXJrZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZURpc2FibGVkOiAnTm8gbWFya2VycyB0byBkZWxldGUnXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbWFwLm9uKCdiYXNlbGF5ZXJjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmFzZWxheWVyID0gXy5maW5kKHNpZ21hQ29uZmlnLmxheWVycy5iYXNlbGF5ZXJzLCB7IG5hbWU6IGUubmFtZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJhc2VsYXllcihiYXNlbGF5ZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYU1hcCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9tYXAvbWFwVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnbWFwQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIG1vZGU6ICdAJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ2xvY2F0aW9uRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBfXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXM7XG5cbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLm1vZGUgPSAkc2NvcGUubW9kZTtcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5sb2NhdGlvbiA9IHt9O1xuICAgICAgICB2bS5zcGF0aWFsWm9vbSA9ICcnO1xuXG4gICAgICAgIHZtLnNldExvY2F0aW9uQm91bmRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHZtLmxvY2F0aW9uLmZvcm1hdCAhPT0gJ21ncnMnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZtLmxvY2F0aW9uLm5vcnRoICYmIHZtLmxvY2F0aW9uLnNvdXRoICYmIHZtLmxvY2F0aW9uLmVhc3QgJiYgdm0ubG9jYXRpb24ud2VzdCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmJveFBhcmFtcyh2bS5sb2NhdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodm0ubG9jYXRpb24ubWdyc05FICYmIHZtLmxvY2F0aW9uLm1ncnNTVykge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmJveFBhcmFtcyh2bS5sb2NhdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldExvY2F0aW9uRm9ybWF0KHZtLmxvY2F0aW9uLmZvcm1hdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJib3goKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2bS5sb2NhdGlvbiA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdm0ubG9jYXRpb24gPSB7fTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0ubG9jYXRpb24nLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZtLnNldExvY2F0aW9uQm91bmRzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh2bS5tb2RlID09PSAnYW5hbHl6ZScpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRTcGF0aWFsWm9vbSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdm0uc3BhdGlhbFpvb20gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYUxvY2F0aW9uRmlsdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL2xvY2F0aW9uRmlsdGVyL2xvY2F0aW9uRmlsdGVyVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnbG9jYXRpb25GaWx0ZXJDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9JyxcbiAgICAgICAgICAgICAgICBtb2RlOiAnQCdcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ2ltYWdlRmlsdGVyc0NvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgLy8gZW51bSB2YWx1ZSBmb3IgYSBkaXZpZGVyXG4gICAgICAgICAgICBESVZJREVSID0gJy0nLFxuICAgICAgICAgICAgLy8gb3JkZXIgb2Ygc2xpZGVyc1xuICAgICAgICAgICAgc2xpZGVycyA9IFtcbiAgICAgICAgICAgICAgICAnb3BhY2l0eScsXG4gICAgICAgICAgICAgICAgJ2JyaWdodG5lc3MnLFxuICAgICAgICAgICAgICAgICdjb250cmFzdCcsXG4gICAgICAgICAgICAgICAgRElWSURFUixcbiAgICAgICAgICAgICAgICAnc2hhcnBlbicsXG4gICAgICAgICAgICAgICAgJ2JsdXInLFxuICAgICAgICAgICAgICAgIERJVklERVIsXG4gICAgICAgICAgICAgICAgJ2h1ZScsXG4gICAgICAgICAgICAgICAgJ3NhdHVyYXRpb24nLFxuICAgICAgICAgICAgICAgIERJVklERVIsXG4gICAgICAgICAgICAgICAgJ2dyYXlzY2FsZScsXG4gICAgICAgICAgICAgICAgJ2ludmVydCcsXG4gICAgICAgICAgICAgICAgJ3NlcGlhJyxcbiAgICAgICAgICAgICAgICAnbm9pc2UnLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0cyB0aGUga2V5IG9mIHRoZSBzbGlkZXIgdG8gdGhlIHNpZ21hQ29uZmlnIHZhbHVlLiBJZiB0aGUgY29uZmlnXG4gICAgICAgICAgICAgKiB2YWx1ZSBpcyB1bmRlZmluZWQsIHRoZSBwYXNzZWQgaW4gZGVmYXVsdCB2YWx1ZSBpcyBzZXQuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtvYmplY3R9IHNsaWRlciAgICBBIHNsaWRlciBvYmplY3RcbiAgICAgICAgICAgICAqIEBwYXJhbSAge3N0cmluZ30ga2V5ICAgICAgIFRoZSBwcm9wZXJ0eSBvbiBzbGlkZXIgdG8gc2V0XG4gICAgICAgICAgICAgKiBAcGFyYW0gIHthbnl9ICAgIHZhbHVlICAgICBBIGRlZmF1bHQgdmFsdWUgdG8gc2V0LCBpZiBub3Qgb24gc2lnbWFDb25maWdcbiAgICAgICAgICAgICAqIEBwYXJhbSAge3N0cmluZ30gZmlsdGVyS2V5IFRoZSBsb29rdXAgZm9yIHRoZSBpbWFnZUZpbHRlciBpbiBzaWdtYUNvbmZpZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZXREZWZhdWx0ID0gZnVuY3Rpb24gKHNsaWRlciwga2V5LCB2YWx1ZSwgZmlsdGVyS2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gc2V0IHRoZSB2YWx1ZSBmcm9tIHRoZSBjb25maWdcbiAgICAgICAgICAgICAgICBzbGlkZXJba2V5XSA9IHNpZ21hQ29uZmlnLmltYWdlRmlsdGVyc1tmaWx0ZXJLZXldW2tleV07XG5cbiAgICAgICAgICAgICAgICAvLyBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLCBzZXQgdGhlIGdpdmVuIGRlZmF1bHQgdmFsdWVcbiAgICAgICAgICAgICAgICBpZiAoISBhbmd1bGFyLmlzRGVmaW5lZChzbGlkZXJba2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2xpZGVyW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgdm0uY2FudmFzSW1hZ2VPdmVybGF5ID0gc3RhdGVTZXJ2aWNlLmdldENhbnZhc0ltYWdlT3ZlcmxheSgpO1xuICAgICAgICB2bS5zbGlkZXJzID0gW107XG5cblxuICAgICAgICAvLyBsb29wIHRocm91Z2ggb3JkZXIgb2Ygc2xpZGVycyBhbmQgY3JlYXRlIG9iamVjdHMgdG8gdXNlIGluIHRoZSBzY29wZVxuICAgICAgICBfLmZvckVhY2goc2xpZGVycywgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gRElWSURFUikge1xuICAgICAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gc2V0IHBhcmFtcyBmb3IgZGl2aWRlcnNcbiAgICAgICAgICAgICAgICB2bS5zbGlkZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBpc0RpdmlkZXI6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2lnbWFDb25maWcuaW1hZ2VGaWx0ZXJzW2tleV0uZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIHZhciBzbGlkZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDoga2V5XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBkZWZhdWx0IG5hbWUgYmFzZWQgb24gdGhlIGtleVxuICAgICAgICAgICAgICAgICAgICBuYW1lID0ga2V5LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsga2V5LnNsaWNlKDEpO1xuXG4gICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSB2YWx1ZXMgaGF2ZSBhIGRlZmF1bHRcbiAgICAgICAgICAgICAgICBzZXREZWZhdWx0KHNsaWRlciwgJ25hbWUnLCBuYW1lLCBrZXkpO1xuICAgICAgICAgICAgICAgIHNldERlZmF1bHQoc2xpZGVyLCAnZGVmYXVsdCcsIDAsIGtleSk7XG4gICAgICAgICAgICAgICAgc2V0RGVmYXVsdChzbGlkZXIsICdtaW4nLCAwLCBrZXkpO1xuICAgICAgICAgICAgICAgIHNldERlZmF1bHQoc2xpZGVyLCAnbWF4JywgMTAwLCBrZXkpO1xuICAgICAgICAgICAgICAgIHNldERlZmF1bHQoc2xpZGVyLCAnc3RlcCcsIDEsIGtleSk7XG4gICAgICAgICAgICAgICAgc2V0RGVmYXVsdChzbGlkZXIsICd1bml0cycsICclJywga2V5KTtcblxuICAgICAgICAgICAgICAgIHZtLnNsaWRlcnMucHVzaChzbGlkZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIHZtLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmNhbnZhc0ltYWdlT3ZlcmxheS5yZWRyYXcoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5yZXNldCA9IGZ1bmN0aW9uIChhdHRyLCB2YWwpIHtcbiAgICAgICAgICAgIHZtLmNhbnZhc0ltYWdlT3ZlcmxheVthdHRyXSA9IHZhbDtcbiAgICAgICAgICAgIHZtLnJlbmRlcigpO1xuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcigncGxheWJhY2tDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIE92ZXJsYXksXG4gICAgICAgIHZpZGVvU2VydmljZSxcbiAgICAgICAgZDMsXG4gICAgICAgIF8sXG4gICAgICAgIEwsXG4gICAgICAgIG1vbWVudCxcbiAgICAgICAgYmxvY2tVSSxcbiAgICAgICAgdG9hc3RyLFxuICAgICAgICBob3RrZXlzLFxuICAgICAgICBJbWFnZSxcbiAgICAgICAgJCxcbiAgICAgICAgJGFzaWRlXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkgPSBzdGF0ZVNlcnZpY2UuZ2V0Q2FudmFzSW1hZ2VPdmVybGF5KCksXG4gICAgICAgICAgICBvdmVybGF5cyA9IFtdLFxuICAgICAgICAgICAgbWFwID0ge30sXG4gICAgICAgICAgICBicnVzaEV4dGVudHMgPSB7fSxcbiAgICAgICAgICAgIGZyYW1lSW5kZXhlcyA9IFtdLFxuICAgICAgICAgICAgZnJhbWVDdXJyZW50ID0gMCxcbiAgICAgICAgICAgIGZyYW1lRHVyYXRpb24gPSAwLFxuICAgICAgICAgICAgdG90YWxTZWNvbmRzID0gMCxcbiAgICAgICAgICAgIGlzQ3VzdG9tSW50ZXJ2YWwgPSBmYWxzZSxcbiAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdGFydCA9ICcnLFxuICAgICAgICAgICAgdGltZVNsaWRlckV4dGVudFN0b3AgPSAnJyxcbiAgICAgICAgICAgIHRpbWVTbGlkZXJEYXRhID0ge30sXG4gICAgICAgICAgICAvLyB0aGUgZmlyc3QgZnJhbWUgaWR4IHdoZW4gdGhlIHZpZGVvIGV4cG9ydGVyIGlzIHN0YXJ0ZWRcbiAgICAgICAgICAgIGV4cG9ydEZyYW1lU3RhcnQgPSAwLFxuICAgICAgICAgICAgLy8gaG93IG1hbnkgbG9vcHMgdGhlIHZpZGVvIGV4cG9ydGVyIGhpdHMsIHVzZWQgZm9yIHdoZW4gdG8gc3RvcCByZWNvcmRpbmdcbiAgICAgICAgICAgIGV4cG9ydExvb3BDb3VudGVyID0gMCxcbiAgICAgICAgICAgIC8vIHRvdGFsIG51bWJlciBvZiByYW1lcyB2aWRlbyBleHBvcnRlciByZWNvcmRzLCB1c2VkIGZvciBwcm9ncmVzc1xuICAgICAgICAgICAgZXhwb3J0RnJhbWVDb3VudGVyID0gMCxcbiAgICAgICAgICAgIGNvbnRyYXN0TGV2ZWwgPSBfLmZpbmRXaGVyZShzaWdtYUNvbmZpZy5jb250cmFzdExldmVscywgeyBkZWZhdWx0OiB0cnVlIH0pLFxuICAgICAgICAgICAgaW1nRmlsdGVyc0FzaWRlID0gJGFzaWRlKHtcbiAgICAgICAgICAgICAgICB0aXRsZTogJ0ltYWdlIGZpbHRlcnMnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdpbWFnZUZpbHRlcnNDb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICAgICAgYmFja2Ryb3A6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNvbnRlbnRUZW1wbGF0ZTogJ21vZHVsZXMvY29tcG9uZW50cy9pbWFnZUZpbHRlcnMvaW1hZ2VGaWx0ZXJzVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogZmFsc2VcbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgdmFyIGV4cG9ydFJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gaGVscGVyIHRvIHNldCB0aGUgdmlkZW8gZXhwb3J0IGJhY2sgdG8gYW4gdW5pbml0aWFsaXplZCBzdGF0ZVxuICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmlzUmVjb3JkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB2aWRlb1NlcnZpY2UuY2xlYXIoKTtcbiAgICAgICAgICAgIGV4cG9ydExvb3BDb3VudGVyID0gMDtcbiAgICAgICAgICAgIGV4cG9ydEZyYW1lU3RhcnQgPSAwO1xuICAgICAgICAgICAgZXhwb3J0RnJhbWVDb3VudGVyID0gMDtcbiAgICAgICAgICAgIGlmICh2bS5leHBvcnRMYWJlbHMpIHtcbiAgICAgICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkudGV4dExheWVyLnRleHQgPSAnJztcbiAgICAgICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkucmVkcmF3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGV4cG9ydENoZWNrTG9vcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGZ1bmN0aW9uIHRvIGNhbGwgb24gZWFjaCBpdGVyYXRpb24gb2YgdGhlIHBsYXliYWNrIGxvb3AgdG8gY2hlY2tcbiAgICAgICAgICAgIC8vIHdoZW4gdG8gc3RvcCBhbmQgc3RhcnQgdGhlIGVuY29kZXJcbiAgICAgICAgICAgIGlmICh2aWRlb1NlcnZpY2UuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiB0aGUgY3VycmVudCBmcmFtZSBjb21lcyBiYWNrIHRvIHdoZXJldmVyIHRoZSB2aWRlb1xuICAgICAgICAgICAgICAgIC8vIHdhcyBzdGFydGVkIGF0LCBjb3VudCBhIG5ldyBsb29wXG4gICAgICAgICAgICAgICAgaWYgKGZyYW1lQ3VycmVudCA9PT0gZXhwb3J0RnJhbWVTdGFydCkge1xuICAgICAgICAgICAgICAgICAgICBleHBvcnRMb29wQ291bnRlcisrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgbnVtYmVyIG9mIGZyYW1lcyByZWNvcmRlZFxuICAgICAgICAgICAgICAgIGV4cG9ydEZyYW1lQ291bnRlcisrO1xuXG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHByb2dyZXNzIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICB2YXIgdG90YWxGcmFtZXMgPSBmcmFtZUluZGV4ZXMubGVuZ3RoICogcGFyc2VJbnQodm0uZXhwb3J0TG9vcHMudmFsdWUpLFxuICAgICAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IE1hdGgucm91bmQoKGV4cG9ydEZyYW1lQ291bnRlciAvIHRvdGFsRnJhbWVzKSAqIDEwMCk7XG4gICAgICAgICAgICAgICAgYmxvY2tVSS5tZXNzYWdlKCdSZWNvcmRpbmcgJyArIHByb2dyZXNzICsgJyUnKTtcblxuICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgdGV4dCBhdCB0aGUgdG9wIGxlZnQgb2YgdGhlIFBJWEkgcmVuZGVyZXJcbiAgICAgICAgICAgICAgICBpZiAodm0uZXhwb3J0TGFiZWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZXh0TGF5ZXIgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgdGV4dExheWVyICs9IG1vbWVudC51dGMoZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uc3RhcnQpLmZvcm1hdCgnTU0vREQvWVlZWSBISDptbTpzcycpO1xuICAgICAgICAgICAgICAgICAgICB0ZXh0TGF5ZXIgKz0gJyAtICc7XG4gICAgICAgICAgICAgICAgICAgIHRleHRMYXllciArPSBtb21lbnQudXRjKGZyYW1lSW5kZXhlc1tmcmFtZUN1cnJlbnRdLnN0b3ApLmZvcm1hdCgnTU0vREQvWVlZWSBISDptbTpzcycpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhbnZhc0ltYWdlT3ZlcmxheS50ZXh0TGF5ZXIudGV4dCA9IHRleHRMYXllcjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYW52YXNJbWFnZU92ZXJsYXkudGV4dExheWVyLnRleHQgPSAnJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBvbmNlIHRoZSBsb29wcyBoYXZlIGhpdCB0aGUgY29udHJvbGxlciB2YWx1ZSBzdGFydCBleHBvcnRcbiAgICAgICAgICAgICAgICBpZiAoZXhwb3J0TG9vcENvdW50ZXIgPj0gcGFyc2VJbnQodm0uZXhwb3J0TG9vcHMudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0b3AgdGhlIHBsYXliYWNrIGFuaW1hdGlvblxuICAgICAgICAgICAgICAgICAgICB2bS5zbGlkZXJDdHJsKCdzdG9wJyk7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RvcCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSBpcyBhIGZpbGUgbmFtZVxuICAgICAgICAgICAgICAgICAgICB2YXIgZm5hbWUgPSB2bS5leHBvcnRGaWxlbmFtZSA/IHZtLmV4cG9ydEZpbGVuYW1lIDogc2lnbWFDb25maWcudGl0bGU7XG4gICAgICAgICAgICAgICAgICAgIGZuYW1lICs9ICcuJyArIHZtLmV4cG9ydEZvcm1hdDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBzdGFydCB0aGUgZW5jb2RpbmdcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmVuY29kZShmbmFtZSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRSZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRSZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9hc3RyLmVycm9yKCdFcnJvciBzYXZpbmcgdmlkZW8nKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0ucGxheWJhY2tXaXRoR2FwcyA9IHNpZ21hQ29uZmlnLnBsYXliYWNrV2l0aEdhcHM7XG4gICAgICAgIHZtLnBsYXliYWNrU3BlZWQgPSB7XG4gICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICBtYXg6IHNpZ21hQ29uZmlnLm1heFBsYXliYWNrRGVsYXkgLyAxMDAsXG4gICAgICAgICAgICB2YWx1ZTogc2lnbWFDb25maWcubWF4UGxheWJhY2tEZWxheSAvIDEwMCxcbiAgICAgICAgICAgIHN0ZXA6IDAuMDFcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5wbGF5YmFja1RvZ2dsZUFzaWRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gb25jbGljayBldmVudCBmb3IgdGhlIFwiZmlsdGVyc1wiIGJ1dHRvbiB0byBvcGVuIHRoZSBhc2lkZVxuICAgICAgICAgICAgaW1nRmlsdGVyc0FzaWRlLnRvZ2dsZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHZpZGVvIGV4cG9ydCBjb250cm9sc1xuICAgICAgICB2bS5leHBvcnRCYXNlTGF5ZXIgPSB0cnVlO1xuICAgICAgICB2bS5leHBvcnRMYWJlbHMgPSB0cnVlO1xuICAgICAgICB2bS5leHBvcnRGb3JtYXRzID0gXy50cmFuc2Zvcm0oc2lnbWFDb25maWcuZW5jb2RlcnMsIGZ1bmN0aW9uIChyZXN1bHQsIHYsIGspIHtcbiAgICAgICAgICAgIGlmICh2LmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgW10pO1xuICAgICAgICB2bS5leHBvcnRGb3JtYXQgPSB2aWRlb1NlcnZpY2UuZW5jb2RlcjtcbiAgICAgICAgdm0uZXhwb3J0TG9vcHMgPSB7XG4gICAgICAgICAgICBtaW46IDEsXG4gICAgICAgICAgICBtYXg6IDEwLFxuICAgICAgICAgICAgdmFsdWU6IDEsXG4gICAgICAgICAgICBzdGVwOiAxXG4gICAgICAgIH07XG4gICAgICAgIHZtLmV4cG9ydEZpbGVuYW1lID0gJyc7XG4gICAgICAgIHZtLmV4cG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGhlbHBlciB0byBzdGFydCBleHBvcnRpbmcgYSB2aWRlb1xuICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHZpZGVvU2VydmljZS5pbmNsdWRlQmFzZUxheWVyID0gdm0uZXhwb3J0QmFzZUxheWVyO1xuXG4gICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGFuaW1hdGlvbiBpcyBzdG9wcGVkXG4gICAgICAgICAgICB2bS5zbGlkZXJDdHJsKCdzdG9wJyk7XG5cbiAgICAgICAgICAgIC8vIHdhaXQgZm9yIHRoZSBpbml0aWFsaXphdGlvbiB0byBmaW5pc2hcbiAgICAgICAgICAgIHZpZGVvU2VydmljZS5pbml0aWFsaXplKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBVSSBtZXNzYWdlLCB3aWxsIGJlIHVwZGF0ZWQgb3Igc3RvcHBlZCBpbiBleHBvcnRDaGVja0xvb3AoKVxuICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RhcnQoJ1JlY29yZGluZycpO1xuXG4gICAgICAgICAgICAgICAgLy8gc2F2ZSB0aGUgZnJhbWUgd2Ugc3RhcnQgYXQgYW5kIHN0YXJ0IHRoZSBwbGF5YmFja1xuICAgICAgICAgICAgICAgIGV4cG9ydEZyYW1lU3RhcnQgPSBmcmFtZUN1cnJlbnQ7XG4gICAgICAgICAgICAgICAgdm0uc2xpZGVyQ3RybCgncGxheVBhdXNlJyk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmlzUmVjb3JkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgdG9hc3RyLmVycm9yKCdFcnJvciBpbml0aWFsaXppbmcgdmlkZW8gcmVjb3JkaW5nJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5wbGF5YmFja0ludGVydmFscyA9IHNpZ21hQ29uZmlnLnBsYXliYWNrSW50ZXJ2YWxzO1xuICAgICAgICB2bS5wbGF5YmFja0ludGVydmFsID0gXy5maW5kV2hlcmUoc2lnbWFDb25maWcucGxheWJhY2tJbnRlcnZhbHMsIHsgZGVmYXVsdDogdHJ1ZSB9KTtcbiAgICAgICAgdm0ucGxheWJhY2tJbnRlcnZhbFF0eSA9IHNpZ21hQ29uZmlnLmRlZmF1bHRQbGF5YmFja0ludGVydmFsUXR5O1xuICAgICAgICB2bS5wbGF5YmFja1N0YXRlID0gJ3N0b3AnO1xuICAgICAgICB2bS5wbGF5YmFja0RpcmVjdGlvbiA9ICdmb3J3YXJkJztcbiAgICAgICAgdm0ubnVtSW1hZ2VzTG9hZGVkID0gMDtcbiAgICAgICAgdm0udG90YWxJbWFnZXMgPSAwO1xuICAgICAgICB2bS5pbWFnZVF1YWxpdHlQZXJjZW50YWdlID0ge1xuICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgLy8gSSBkb24ndCBrbm93IHdoeSwgYnV0IEFuZ3VsYXIgZG9lc24ndCBoYW5kbGUgcmFuZ2Ugc2xpZGVyIHZhbHVlc1xuICAgICAgICAgICAgLy8gcHJvcGVybHkgd2hlbiBtaW4vbWF4IGFyZSBiZXR3ZWVuIDAtMSwgc28gc2V0IG1heCB0byAxMCBhbmRcbiAgICAgICAgICAgIC8vIGRpdmlkZSBieSAxMCBsYXRlcnRvIG9idGFpbiByYW5nZSBzbGlkZXIgdmFsdWVcbiAgICAgICAgICAgIG1heDogMTAsXG4gICAgICAgICAgICB2YWx1ZTogc2lnbWFDb25maWcuZGVmYXVsdEltYWdlUXVhbGl0eSxcbiAgICAgICAgICAgIHN0ZXA6IDAuMDFcbiAgICAgICAgfTtcblxuICAgICAgICBob3RrZXlzLmJpbmRUbygkc2NvcGUpXG4gICAgICAgICAgICAuYWRkKHtcbiAgICAgICAgICAgICAgICBjb21ibzogJ3AnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGxheS9QYXVzZScsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdm0uc2xpZGVyQ3RybCgncGxheVBhdXNlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuYWRkKHtcbiAgICAgICAgICAgIGNvbWJvOiAnbGVmdCcsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1N0ZXAgQmFjaycsXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZtLnNsaWRlckN0cmwoJ3N0ZXBCYWNrd2FyZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5hZGQoe1xuICAgICAgICAgICAgY29tYm86ICdyaWdodCcsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1N0ZXAgRm9yd2FyZCcsXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZtLnNsaWRlckN0cmwoJ3N0ZXBGb3J3YXJkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICBjb21ibzogJ3VwJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGxheS9QYXVzZSBGb3J3YXJkJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdm0uc2xpZGVyQ3RybCgnZm9yd2FyZCcpO1xuICAgICAgICAgICAgICAgIHZtLnNsaWRlckN0cmwoJ3BsYXlQYXVzZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5hZGQoe1xuICAgICAgICAgICAgY29tYm86ICdkb3duJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGxheS9QYXVzZSBCYWNrd2FyZCcsXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZtLnNsaWRlckN0cmwoJ2JhY2t3YXJkJyk7XG4gICAgICAgICAgICAgICAgdm0uc2xpZGVyQ3RybCgncGxheVBhdXNlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICBjb21ibzogJ2FsdCtsZWZ0JyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmV2ZXJzZScsXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZtLnNsaWRlckN0cmwoJ2JhY2t3YXJkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmFkZCh7XG4gICAgICAgICAgICBjb21ibzogJ2FsdCtyaWdodCcsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZvcndhcmQnLFxuICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2bS5zbGlkZXJDdHJsKCdmb3J3YXJkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbnZhc0ltYWdlT3ZlcmxheS5jbGVhcigpO1xuXG4gICAgICAgIC8vIGRldGVybWluZSB0aGUgbnVtYmVyIG9mIGZyYW1lcyBiYXNlZCBvbiB0aGUgc2VsZWN0ZWQgcG9ydGlvbiBvZiB0aGUgc2xpZGVyIGV4dGVudHNcbiAgICAgICAgdmFyIGNhbGN1bGF0ZU51bWJlck9mRnJhbWVzID0gZnVuY3Rpb24gKHVzZUludGVydmFsQ29udHJvbCkge1xuICAgICAgICAgICAgaWYgKHVzZUludGVydmFsQ29udHJvbCkge1xuICAgICAgICAgICAgICAgIHZhciB0ZW1wRGF0ZSA9IG1vbWVudC51dGModGltZVNsaWRlckV4dGVudFN0YXJ0KS5hZGQodm0ucGxheWJhY2tJbnRlcnZhbFF0eSwgdm0ucGxheWJhY2tJbnRlcnZhbC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgZnJhbWVEdXJhdGlvbiA9IHRlbXBEYXRlLmRpZmYobW9tZW50LnV0Yyh0aW1lU2xpZGVyRXh0ZW50U3RhcnQpLCAncycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VyclBsYXliYWNrSW50ZXJ2YWxRdHkgPSB2bS5wbGF5YmFja0ludGVydmFsUXR5LFxuICAgICAgICAgICAgICAgICAgICBjdXJyUGxheWJhY2tJbnRlcnZhbCA9IHZtLnBsYXliYWNrSW50ZXJ2YWw7XG5cbiAgICAgICAgICAgICAgICBmcmFtZUR1cmF0aW9uID0gbW9tZW50LnV0YyhicnVzaEV4dGVudHMuc3RvcCkuZGlmZihtb21lbnQudXRjKGJydXNoRXh0ZW50cy5zdGFydCksICdzJyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vbWVudC5kdXJhdGlvbihmcmFtZUR1cmF0aW9uLCAncycpLmRheXMoKSA8IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVxdWVzdGVkIGludGVydmFsIGlzIGxlc3MgdGhhbiBhIGRheSwgc28gbWFrZSBzdXJlIGl0J3Mgbm90IGxlc3MgdGhhbiB0aGUgZGVmYXVsdCBtaW5pbXVtXG4gICAgICAgICAgICAgICAgICAgIGlmIChtb21lbnQuZHVyYXRpb24oZnJhbWVEdXJhdGlvbiwgJ3MnKS5nZXQoc2lnbWFDb25maWcubWluaW11bUZyYW1lRHVyYXRpb24uaW50ZXJ2YWwpIDwgc2lnbWFDb25maWcubWluaW11bUZyYW1lRHVyYXRpb24udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lRHVyYXRpb24gPSBtb21lbnQudXRjKGJydXNoRXh0ZW50cy5zdGFydCkuYWRkKHNpZ21hQ29uZmlnLm1pbmltdW1GcmFtZUR1cmF0aW9uLnZhbHVlLCBzaWdtYUNvbmZpZy5taW5pbXVtRnJhbWVEdXJhdGlvbi5pbnRlcnZhbCkuZGlmZihtb21lbnQudXRjKGJydXNoRXh0ZW50cy5zdGFydCksICdzJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdm0ucGxheWJhY2tJbnRlcnZhbFF0eSA9IG1vbWVudC5kdXJhdGlvbihmcmFtZUR1cmF0aW9uLCAncycpLmdldChzaWdtYUNvbmZpZy5taW5pbXVtRnJhbWVEdXJhdGlvbi5pbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrSW50ZXJ2YWwgPSBfLmZpbmRXaGVyZShzaWdtYUNvbmZpZy5wbGF5YmFja0ludGVydmFscywgeyB2YWx1ZTogc2lnbWFDb25maWcubWluaW11bUZyYW1lRHVyYXRpb24uaW50ZXJ2YWwgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdm0ucGxheWJhY2tJbnRlcnZhbFF0eSA9IE1hdGguZmxvb3IobW9tZW50LmR1cmF0aW9uKGZyYW1lRHVyYXRpb24sICdzJykuYXNEYXlzKCkpO1xuICAgICAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0ludGVydmFsID0gXy5maW5kV2hlcmUoc2lnbWFDb25maWcucGxheWJhY2tJbnRlcnZhbHMsIHsgdmFsdWU6ICdkJyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJQbGF5YmFja0ludGVydmFsUXR5ID09PSB2bS5wbGF5YmFja0ludGVydmFsUXR5ICYmIGN1cnJQbGF5YmFja0ludGVydmFsLnRpdGxlID09PSB2bS5wbGF5YmFja0ludGVydmFsLnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHBsYXliYWNrIGludGVydmFsIGhhc24ndCBjaGFuZ2VkIHNvIHRoZXJlIGlzIG5vIG5lZWQgZm9yIHVwZGF0aW5nIHRoZSBicnVzaCBvciB0aGUgcGxheWJhY2sgYXJyYXlcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJydXNoUmVzZXQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UGxheWJhY2tJbnRlcnZhbFF0eSh2bS5wbGF5YmFja0ludGVydmFsUXR5KTtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UGxheWJhY2tJbnRlcnZhbCh2bS5wbGF5YmFja0ludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRvdGFsU2Vjb25kcyA9IG1vbWVudC51dGModGltZVNsaWRlckV4dGVudFN0b3ApLmRpZmYobW9tZW50LnV0Yyh0aW1lU2xpZGVyRXh0ZW50U3RhcnQpLCAncycpO1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguY2VpbCh0b3RhbFNlY29uZHMvZnJhbWVEdXJhdGlvbik7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gc2V0IHVwIGFycmF5IG9mIHRpbWUtYmFzZWQgaW1hZ2VzIHRvIHByb2plY3Qgb250byB0aGUgbWFwXG4gICAgICAgIHZhciB1cGRhdGVQbGF5YmFja0FycmF5ID0gZnVuY3Rpb24gKHVzZUludGVydmFsQ29udHJvbCkge1xuICAgICAgICAgICAgYmxvY2tVSS5zdGFydCgnQ29uZmlndXJpbmcgUGxheWJhY2snKTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiB1c2VJbnRlcnZhbENvbnRyb2wgPT09ICd1bmRlZmluZWQnIHx8IHVzZUludGVydmFsQ29udHJvbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHVzZUludGVydmFsQ29udHJvbCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZyYW1lSW5kZXhlcyA9IFtdO1xuICAgICAgICAgICAgZnJhbWVDdXJyZW50ID0gMDtcbiAgICAgICAgICAgIHZtLm51bUltYWdlc0xvYWRlZCA9IDA7XG4gICAgICAgICAgICB2bS50b3RhbEltYWdlcyA9IDA7XG5cbiAgICAgICAgICAgIHZhciBudW1GcmFtZXMgPSBjYWxjdWxhdGVOdW1iZXJPZkZyYW1lcyh1c2VJbnRlcnZhbENvbnRyb2wpLFxuICAgICAgICAgICAgICAgIGN1cnJTdGFydFRpbWUgPSBtb21lbnQudXRjKHRpbWVTbGlkZXJFeHRlbnRTdGFydCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBjdXJyU3RvcFRpbWUgPSBtb21lbnQudXRjKGN1cnJTdGFydFRpbWUpLmFkZChmcmFtZUR1cmF0aW9uLCAncycpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgY3VyckRldGFpbElkeCA9IDA7XG5cbiAgICAgICAgICAgIGlmIChudW1GcmFtZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBzb3J0IGltYWdlcyBieSBpbWFnZXF1YWxpdHkgZGVzY2VuZGluZyBpbiBwcmVwYXJhdGlvbiBmb3IgaW1hZ2VxdWFsaXR5IGZpbHRlcmluZ1xuICAgICAgICAgICAgICAgIHZhciBzb3J0ZWRPdmVybGF5c0ltYWdlUXVhbGl0eSA9IF8uc29ydEJ5T3JkZXIodGltZVNsaWRlckRhdGEuZnJhbWUsIFsnaW1hZ2VxdWFsaXR5J10sIFsnZGVzYyddKTtcbiAgICAgICAgICAgICAgICB2YXIgdG90YWxPdmVybGF5cyA9IHRpbWVTbGlkZXJEYXRhLmZyYW1lLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAvLyB1c2UgaW1hZ2VxdWFsaXR5IHZhbHVlIHRvIHRha2Ugb25seSB0aGUgdG9wIG4lIG9mIGltYWdlc1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgYWxsb3dzIGZvciBtb3JlIGNvbnNpc3RlbnQgcmVzdWx0cywgc2luY2UgYW4gaW1hZ2VxdWFsaXR5IG9mIDAuMiBjb3VsZCBtZWFuIGRpZmZlcmVudCB0aGluZ3MgYWNyb3NzIHRpbGVzXG4gICAgICAgICAgICAgICAgLy8gZGl2aWRlIGltYWdlUXVhbGl0eVBlcmNlbnRhZ2UudmFsdWUgYnkgMTAgYmVjYXVzZSBvZiBBbmd1bGFyIGJlaGF2aW9yIG1lbnRpb25lZCBlYXJsaWVyXG4gICAgICAgICAgICAgICAgdmFyIG51bVRvVGFrZSA9IHRvdGFsT3ZlcmxheXMgLSAoTWF0aC5jZWlsKCh2bS5pbWFnZVF1YWxpdHlQZXJjZW50YWdlLnZhbHVlLzEwKSAqIHRvdGFsT3ZlcmxheXMpKTtcbiAgICAgICAgICAgICAgICB2YXIgZmlsdGVyZWRPdmVybGF5cyA9IF8udGFrZShzb3J0ZWRPdmVybGF5c0ltYWdlUXVhbGl0eSwgbnVtVG9UYWtlKTtcbiAgICAgICAgICAgICAgICAvLyB0aGUgbG93ZXN0IGltYWdlcXVhbGl0eSB2YWx1ZSBsZWZ0IGlzIHdoYXQgd2lsbCBiZSB1c2VkIGZvciBhb2lhbmFseXNpcywgcG9pbnRjb252ZXJ0ZXIsIGFuZCBjb3JyZWxhdGlvblxuICAgICAgICAgICAgICAgIHZhciBhY3R1YWxJbWFnZVF1YWxpdHkgPSBmaWx0ZXJlZE92ZXJsYXlzW2ZpbHRlcmVkT3ZlcmxheXMubGVuZ3RoIC0gMV0uaW1hZ2VxdWFsaXR5IHx8IDA7XG4gICAgICAgICAgICAgICAgLy8gZmluYWxseSwgc29ydCBvdmVybGF5cyBieSB0aW1lIGFzY2VuZGluZyBmb3IgcGxheWJhY2tcbiAgICAgICAgICAgICAgICB2YXIgc29ydGVkT3ZlcmxheXNUaW1lID0gXy5zb3J0QnkoZmlsdGVyZWRPdmVybGF5cywgJ3RpbWUnKTtcblxuICAgICAgICAgICAgICAgIC8vIHJlcG9ydCBhY3R1YWxJbWFnZVF1YWxpdHkgdG8gc3RhdGVTZXJ2aWNlXG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEltYWdlUXVhbGl0eShhY3R1YWxJbWFnZVF1YWxpdHkpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGFjdHVhbEltYWdlUXVhbGl0eSk7XG4gICAgICAgICAgICAgICAgdm0udG90YWxJbWFnZXMgPSBzb3J0ZWRPdmVybGF5c1RpbWUubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgLy8gb25sb2FkIGNhbGxiYWNrIGZvciBlYWNoIGltYWdlIGxvYWQgZXZlbnRcbiAgICAgICAgICAgICAgICB2YXIgb25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2bS5udW1JbWFnZXNMb2FkZWQrKztcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdmFyIGJ1aWxkRnJhbWVzID0gZnVuY3Rpb24gKGZyYW1lSWR4KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBjdXJyU3RhcnRUaW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogY3VyclN0b3BUaW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSwgLy9ldmVudHVhbGx5IHRoZSBlbmFibGVkIHZhbHVlIHdpbGwgY29tZSBmcm9tIHRoZSBzZXJ2aWNlXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWFnZXM6IFtdXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGN1cnJEZXRhaWxJZHggPCBzb3J0ZWRPdmVybGF5c1RpbWUubGVuZ3RoICYmIG1vbWVudC51dGMoY3VyclN0b3BUaW1lKS5pc0FmdGVyKG1vbWVudC51dGMoc29ydGVkT3ZlcmxheXNUaW1lW2N1cnJEZXRhaWxJZHhdLnRpbWUpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG92ZXJsYXlEYXRhID0gc29ydGVkT3ZlcmxheXNUaW1lW2N1cnJEZXRhaWxJZHhdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltZ1NyYyA9IHNpZ21hQ29uZmlnLm92ZXJsYXlQcmVmaXggKyBvdmVybGF5RGF0YVtjb250cmFzdExldmVsLm5hbWVdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJsYXkgPSBuZXcgT3ZlcmxheShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheURhdGFbY29udHJhc3RMZXZlbC5uYW1lXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1nU3JjLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVybGF5RGF0YS5pbWFnZXF1YWxpdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJsYXlEYXRhLmJvdW5kcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmxheURhdGEudGltZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWUuZW5hYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25sb2FkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWUuaW1hZ2VzLnB1c2gob3ZlcmxheSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyRGV0YWlsSWR4Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmcmFtZUluZGV4ZXMucHVzaChmcmFtZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHN0YXJ0L3N0b3Agb2YgbmV4dCBmcmFtZVxuICAgICAgICAgICAgICAgICAgICBjdXJyU3RhcnRUaW1lID0gbW9tZW50LnV0YyhjdXJyU3RvcFRpbWUpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJTdG9wVGltZSA9IG1vbWVudC51dGMoY3VyclN0YXJ0VGltZSkuYWRkKGZyYW1lRHVyYXRpb24sICdzJykudG9JU09TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAobW9tZW50LnV0YyhjdXJyU3RvcFRpbWUpLmlzQWZ0ZXIobW9tZW50LnV0Yyh0aW1lU2xpZGVyRXh0ZW50U3RvcCkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyU3RvcFRpbWUgPSBtb21lbnQudXRjKHRpbWVTbGlkZXJFeHRlbnRTdG9wKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZnJhbWVJZHgrKztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZnJhbWVJZHggPCBudW1GcmFtZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkRnJhbWVzKGZyYW1lSWR4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBidWlsZEZyYW1lcygwKTtcblxuICAgICAgICAgICAgICAgIGlmICghdm0ucGxheWJhY2tXaXRoR2Fwcykge1xuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgZnJhbWVzIGZyb20gdGhlIGluZGV4IHRoYXQgZG9uJ3QgY29udGFpbiBpbWFnZXNcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVJbmRleGVzID0gXy5maWx0ZXIoZnJhbWVJbmRleGVzLCBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGkuaW1hZ2VzLmxlbmd0aCAhPT0gMDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gc2VuZCBhbGwgdGhlIGZyYW1lcyB0byB0aGUgY2FudmFzIHJlbmRlcmVyXG4gICAgICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5LnNldChmcmFtZUluZGV4ZXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBibG9ja1VJLnN0b3AoKTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIHZhciBkb1BsYXliYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHZtLnBsYXliYWNrU3RhdGUgPT09ICdwbGF5JyB8fCB2bS5wbGF5YmFja1N0YXRlID09PSAncGF1c2UnIHx8IHZtLnBsYXliYWNrU3RhdGUgPT09ICdzdGVwJykge1xuICAgICAgICAgICAgICAgIG92ZXJsYXlzID0gW107XG5cbiAgICAgICAgICAgICAgICAvLyBpdGVyYXRlIGZyYW1lXG4gICAgICAgICAgICAgICAgaWYgKHZtLnBsYXliYWNrRGlyZWN0aW9uID09PSAnZm9yd2FyZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lQ3VycmVudCA9PT0gZnJhbWVJbmRleGVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lQ3VycmVudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUN1cnJlbnQrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodm0ucGxheWJhY2tEaXJlY3Rpb24gPT09ICdiYWNrd2FyZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyYW1lQ3VycmVudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVDdXJyZW50ID0gZnJhbWVJbmRleGVzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUN1cnJlbnQtLTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIGEgdmlkZW8gaXMgYmVpbmcgcmVjb3JkZWRcbiAgICAgICAgICAgICAgICBleHBvcnRDaGVja0xvb3AoKTtcblxuICAgICAgICAgICAgICAgIC8vIGFkZCBvdmVybGF5IGltYWdlcyBmb3IgdGhpcyBmcmFtZSB0byB0aGUgbWFwXG4gICAgICAgICAgICAgICAgdmFyIGZyYW1lSW1hZ2VzID0gZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uaW1hZ2VzO1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChmcmFtZUltYWdlcywgZnVuY3Rpb24gKG92ZXJsYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcmxheXMucHVzaChvdmVybGF5KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIHNldHRpbmcgdGhlIGZyYW1lIHdpbGwgcmVyZW5kZXIgdGhlIGNhbnZhc1xuICAgICAgICAgICAgICAgIGNhbnZhc0ltYWdlT3ZlcmxheS5zZXRJZHgoZnJhbWVDdXJyZW50KTtcblxuICAgICAgICAgICAgICAgIGlmICh2bS5wbGF5YmFja1N0YXRlID09PSAncGF1c2UnIHx8IHZtLnBsYXliYWNrU3RhdGUgPT09ICdzdGVwJykge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RnJhbWVPdmVybGF5cyhvdmVybGF5cyk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGcmFtZUN1cnJlbnQoZnJhbWVDdXJyZW50KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEZyYW1lSW5kZXhlcyhmcmFtZUluZGV4ZXMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHNhdmUgdGhlIGZyYW1lIHRvIGEgdmlkZW8gKG9ubHkgaGFwcGVucyBpbiByZWNvcmQgbW9kZSlcbiAgICAgICAgICAgICAgICB2aWRlb1NlcnZpY2UuY2FwdHVyZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gdGVsbCB0aW1lIHNsaWRlciB0aGUgc3RhcnQvc3RvcCBvZiB0aGUgbmV4dCBmcmFtZTtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RnJhbWVFeHRlbnRzKGZyYW1lSW5kZXhlc1tmcmFtZUN1cnJlbnRdLnN0YXJ0LCBmcmFtZUluZGV4ZXNbZnJhbWVDdXJyZW50XS5zdG9wKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlUGxheWJhY2tBcnJheShmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cblxuICAgICAgICB2YXIgZ2V0VGltZVNsaWRlckV4dGVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBwbGFjZSB0aGlzIHdhdGNoIGluc2lkZSBhIGZ1bmN0aW9uIHRoYXQgb25seSBnZXRzIGNhbGxlZCBhZnRlciB0aW1lU2xpZGVyRGF0YSBoYXMgYmVlbiBzZXRcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0VGltZVNsaWRlckV4dGVudHMoKScsIF8uZGVib3VuY2UoZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aW1lU2xpZGVyRXh0ZW50U3RhcnQgPSBtb21lbnQudXRjKG5ld1ZhbHVlLnN0YXJ0KS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICB0aW1lU2xpZGVyRXh0ZW50U3RvcCA9IG1vbWVudC51dGMobmV3VmFsdWUuc3RvcCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gbm93IHRoYXQgd2Uga25vdyB0aGUgc2xpZGVyIGV4dGVudCwgYnVpbGQgdGhlIHBsYXliYWNrIGFycmF5XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBsYXliYWNrQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBzaWdtYUNvbmZpZy5kZWJvdW5jZVRpbWUpKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5taW5pbWl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJy5tYXAtYW5hbHl6ZSAubGVhZmxldC10b3AgLmxlYWZsZXQtY29udHJvbC1sYXllcnMnKS5hbmltYXRlKHsgJ3RvcCc6ICctPTVweCd9LCAyMDApO1xuICAgICAgICAgICAgJCgnLm1hcC1hbmFseXplIC5sZWFmbGV0LXRvcC5sZWFmbGV0LWxlZnQnKS5hbmltYXRlKHsgJ3RvcCc6ICctPTUwcHgnfSwgMjAwKTtcbiAgICAgICAgICAgICQoJy5wbGF5YmFjay1jb250cm9scy1jb250YWluZXInKS5zbGlkZVRvZ2dsZSgyMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKCcucGxheWJhY2stY29udHJvbHMtbWF4aW1pemUnKS5zbGlkZVRvZ2dsZSgyMDApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0ubWF4aW1pemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcucGxheWJhY2stY29udHJvbHMtbWF4aW1pemUnKS5zbGlkZVRvZ2dsZSgyMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKCcubWFwLWFuYWx5emUgLmxlYWZsZXQtdG9wIC5sZWFmbGV0LWNvbnRyb2wtbGF5ZXJzJykuYW5pbWF0ZSh7ICd0b3AnOiAnKz01cHgnfSwgMjAwKTtcbiAgICAgICAgICAgICAgICAkKCcubWFwLWFuYWx5emUgLmxlYWZsZXQtdG9wLmxlYWZsZXQtbGVmdCcpLmFuaW1hdGUoeyAndG9wJzogJys9NTBweCd9LCAyMDApO1xuICAgICAgICAgICAgICAgICQoJy5wbGF5YmFjay1jb250cm9scy1jb250YWluZXInKS5zbGlkZVRvZ2dsZSgyMDApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uZGlzYWJsZVBsYXlQYXVzZUJ1dHRvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBmcmFtZUluZGV4ZXMubGVuZ3RoID09PSAwO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmRpc2FibGVTdGVwQnV0dG9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhKHZtLnBsYXliYWNrU3RhdGUgPT09ICdzdG9wJyB8fCB2bS5wbGF5YmFja1N0YXRlID09PSAncGxheScpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNob3dQbGF5QnV0dG9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHZtLnBsYXliYWNrU3RhdGUgIT09ICdwbGF5JztcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5zaG93UGF1c2VCdXR0b24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdm0ucGxheWJhY2tTdGF0ZSA9PT0gJ3BsYXknO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldEludGVydmFsID0gZnVuY3Rpb24gKGludGVydmFsKSB7XG4gICAgICAgICAgICBpc0N1c3RvbUludGVydmFsID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoaW50ZXJ2YWwpIHtcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja0ludGVydmFsID0gaW50ZXJ2YWw7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFBsYXliYWNrSW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHBhcnNlSW50KHZtLnBsYXliYWNrSW50ZXJ2YWxRdHkpIDwgMSkge1xuICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrSW50ZXJ2YWxRdHkgPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFBsYXliYWNrSW50ZXJ2YWxRdHkodm0ucGxheWJhY2tJbnRlcnZhbFF0eSk7XG4gICAgICAgICAgICB1cGRhdGVQbGF5YmFja0FycmF5KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uc2V0SW50ZXJ2YWxRdHkgPSBfLmRlYm91bmNlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLnBsYXliYWNrSW50ZXJ2YWxRdHkgPSBwYXJzZUludCh2bS5wbGF5YmFja0ludGVydmFsUXR5KTtcbiAgICAgICAgICAgIGlmICh2bS5wbGF5YmFja0ludGVydmFsUXR5IDwgMSB8fCBpc05hTih2bS5wbGF5YmFja0ludGVydmFsUXR5KSkge1xuICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrSW50ZXJ2YWxRdHkgPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFBsYXliYWNrSW50ZXJ2YWxRdHkocGFyc2VGbG9hdCh2bS5wbGF5YmFja0ludGVydmFsUXR5KSk7XG4gICAgICAgICAgICB1cGRhdGVQbGF5YmFja0FycmF5KCk7XG4gICAgICAgIH0sIDc1MCk7XG5cbiAgICAgICAgdm0uc2xpZGVyQ3RybCA9IGZ1bmN0aW9uIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdwbGF5UGF1c2UnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZtLnBsYXliYWNrU3RhdGUgIT09ICdwbGF5Jykge1xuICAgICAgICAgICAgICAgICAgICB2bS5wbGF5YmFja1N0YXRlID0gJ3BsYXknO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHBhdXNlIHBsYXliYWNrXG4gICAgICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrU3RhdGUgPSAncGF1c2UnO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RnJhbWVPdmVybGF5cyhvdmVybGF5cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGcmFtZUV4dGVudHMobW9tZW50LnV0YyhmcmFtZUluZGV4ZXNbZnJhbWVDdXJyZW50XS5zdGFydCkudG9JU09TdHJpbmcoKSwgbW9tZW50LnV0YyhmcmFtZUluZGV4ZXNbZnJhbWVDdXJyZW50XS5zdG9wKS50b0lTT1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICBkb1BsYXliYWNrKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gJ3N0b3AnKSB7XG4gICAgICAgICAgICAgICAgLy8gc3RvcCBwbGF5YmFja1xuICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrU3RhdGUgPSAnc3RvcCc7XG4gICAgICAgICAgICAgICAgdm0uZGV0YWlsRmVhdHVyZXMgPSBbXTtcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja1N0YXRlID0gJ3N0b3AnO1xuICAgICAgICAgICAgICAgIGQzLnNlbGVjdCgnLnguYnJ1c2gnKS5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnYWxsJyk7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBoaWRlIGltYWdlIG92ZXJsYXlzP1xuXG4gICAgICAgICAgICAgICAgb3ZlcmxheXMgPSBbXTtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RnJhbWVPdmVybGF5cyhvdmVybGF5cyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gJ3N0ZXBCYWNrd2FyZCcpIHtcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja1N0YXRlID0gJ3N0ZXAnO1xuICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrRGlyZWN0aW9uID0gJ2JhY2t3YXJkJztcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0RnJhbWVFeHRlbnRzKG1vbWVudC51dGMoZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uc3RhcnQpLnRvSVNPU3RyaW5nKCksIG1vbWVudC51dGMoZnJhbWVJbmRleGVzW2ZyYW1lQ3VycmVudF0uc3RvcCkudG9JU09TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFBsYXliYWNrU3RhdGUoJ3BhdXNlJyk7XG4gICAgICAgICAgICAgICAgZG9QbGF5YmFjaygpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09ICdzdGVwRm9yd2FyZCcpIHtcbiAgICAgICAgICAgICAgICB2bS5wbGF5YmFja1N0YXRlID0gJ3N0ZXAnO1xuICAgICAgICAgICAgICAgIHZtLnBsYXliYWNrRGlyZWN0aW9uID0gJ2ZvcndhcmQnO1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGcmFtZUV4dGVudHMobW9tZW50LnV0YyhmcmFtZUluZGV4ZXNbZnJhbWVDdXJyZW50XS5zdGFydCkudG9JU09TdHJpbmcoKSwgbW9tZW50LnV0YyhmcmFtZUluZGV4ZXNbZnJhbWVDdXJyZW50XS5zdG9wKS50b0lTT1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UGxheWJhY2tTdGF0ZSgncGF1c2UnKTtcbiAgICAgICAgICAgICAgICBkb1BsYXliYWNrKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGJhY2t3YXJkIG9yIGZvcndhcmQgYnV0dG9uIHdhcyBwcmVzc2VkXG4gICAgICAgICAgICAgICAgdm0ucGxheWJhY2tEaXJlY3Rpb24gPSBhY3Rpb247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVzIGZvciB1c2UgaW4gb3RoZXIgY29udHJvbGxlcnNcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRQbGF5YmFja1N0YXRlKHZtLnBsYXliYWNrU3RhdGUpO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFBsYXliYWNrRGlyZWN0aW9uKHZtLnBsYXliYWNrRGlyZWN0aW9uKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TWFwKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIG1hcCA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJydXNoRXh0ZW50cygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKG1vbWVudC51dGMobmV3VmFsdWUuc3RhcnQpLmlzU2FtZShtb21lbnQudXRjKG9sZFZhbHVlLnN0YXJ0KSkgJiYgbW9tZW50LnV0YyhuZXdWYWx1ZS5zdG9wKS5pc1NhbWUobW9tZW50LnV0YyhvbGRWYWx1ZS5zdG9wKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJydXNoRXh0ZW50cyA9IHtcbiAgICAgICAgICAgICAgICBzdGFydDogbmV3VmFsdWUuc3RhcnQsXG4gICAgICAgICAgICAgICAgc3RvcDogbmV3VmFsdWUuc3RvcFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZG9QbGF5YmFjaygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5leHBvcnRGb3JtYXQnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoISBhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmlkZW9TZXJ2aWNlLmVuY29kZXIgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0ucGxheWJhY2tTcGVlZC52YWx1ZScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFBsYXliYWNrU3BlZWQobmV3VmFsdWUgKiAxMDApO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5pbWFnZVF1YWxpdHlQZXJjZW50YWdlLnZhbHVlJywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRJbWFnZVF1YWxpdHkobmV3VmFsdWUpO1xuICAgICAgICAgICAgdXBkYXRlUGxheWJhY2tBcnJheSgpO1xuICAgICAgICB9LCA3NTApKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5wbGF5YmFja1dpdGhHYXBzJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB1cGRhdGVQbGF5YmFja0FycmF5KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRUaW1lU2xpZGVyRGF0YSgpJywgXy5kZWJvdW5jZShmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUuZnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGltZVNsaWRlckRhdGEgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgZ2V0VGltZVNsaWRlckV4dGVudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ltYWdlcyBub3QgcHJlbG9hZGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBzaWdtYUNvbmZpZy5kZWJvdW5jZVRpbWUpKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Vmlld01vZGUoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlID09PSAnYW5hbHl6ZScpIHtcbiAgICAgICAgICAgICAgICBvdmVybGF5cyA9IFtdO1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRGcmFtZU92ZXJsYXlzKG92ZXJsYXlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRGcmFtZUluZGV4ZXMoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnJhbWVJbmRleGVzID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q29udHJhc3RMZXZlbCgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250cmFzdExldmVsID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYVBsYXliYWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL3BsYXliYWNrL3BsYXliYWNrVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAncGxheWJhY2tDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3JlY2VudEFvaUxpc3RDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRsb2NhdGlvbixcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgbG9jYWxTdG9yYWdlLFxuICAgICAgICBfLFxuICAgICAgICBtb21lbnRcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcblxuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5yZWNlbnRBT0lzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmVjZW50QU9JcycpKSB8fCBbXTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmNsZWFyUmVjZW50QU9JcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3JlY2VudEFPSXMnKTtcbiAgICAgICAgICAgIHZtLnJlY2VudEFPSXMgPSBbXTtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmFjdGl2YXRlQU9JID0gZnVuY3Rpb24gKGFvaSkge1xuICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChhb2kuc2VhcmNoKTtcbiAgICAgICAgICAgIHZhciBhb2lCYXNlbGF5ZXIgPSBfLmZpbmQoc2lnbWFDb25maWcubGF5ZXJzLmJhc2VsYXllcnMsIHsgaWQ6IGFvaS5zZWFyY2guYmFzZWxheWVyIH0pO1xuXG4gICAgICAgICAgICAvLyB1cGRhdGUgcGFyYW1ldGVyc1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJib3goYW9pLmJib3gpO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsRmlsdGVyKGFvaS50ZW1wb3JhbEZpbHRlcik7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmFzZWxheWVyKGFvaUJhc2VsYXllcik7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q292ZXJhZ2VPcGFjaXR5KHBhcnNlRmxvYXQoYW9pLnNlYXJjaC5jb3ZlcmFnZU9wYWNpdHkpKTtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRFbmFibGVDb3ZlcmFnZShhb2kuc2VhcmNoLmVuYWJsZUNvdmVyYWdlID09PSAndHJ1ZScpO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJhbmQoYW9pLnNlYXJjaC5iYW5kKTtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRTZW5zb3IoYW9pLnNlYXJjaC5zZW5zb3IpO1xuXG5cbiAgICAgICAgICAgIC8vIGRldGVybWluZSB3aGljaCBhb2kgaXMgYWN0aXZlXG4gICAgICAgICAgICBfLmZvckVhY2godm0ucmVjZW50QU9JcywgZnVuY3Rpb24gKHJlY2VudEFPSSkge1xuICAgICAgICAgICAgICAgIHJlY2VudEFPSS5hY3RpdmUgPSBhb2kudXJsID09PSByZWNlbnRBT0kudXJsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFZpZXdNb2RlKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSA9PT0gJ2FuYWx5emUnKSB7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHZtLnJlY2VudEFPSXMsIGZ1bmN0aW9uIChhb2kpIHtcbiAgICAgICAgICAgICAgICAgICAgYW9pLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdmFyIGJib3ggPSBzdGF0ZVNlcnZpY2UuZ2V0QmJveCgpLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wb3JhbEZpbHRlciA9IHN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpLFxuICAgICAgICAgICAgICAgICAgICBjaGVja0ZvckFPSSA9IF8uZmluZFdoZXJlKHZtLnJlY2VudEFPSXMsIHsgc2VhcmNoOiAkbG9jYXRpb24uc2VhcmNoKCkgfSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgYW9pVGVtcG9yYWxGaWx0ZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0YXJ0KS50b0RhdGUoKSxcbiAgICAgICAgICAgICAgICAgICAgc3RvcDogbW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdG9wKS50b0RhdGUoKSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IHRlbXBvcmFsRmlsdGVyLmR1cmF0aW9uID8gdGVtcG9yYWxGaWx0ZXIuZHVyYXRpb24gOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbkxlbmd0aDogdGVtcG9yYWxGaWx0ZXIuZHVyYXRpb25MZW5ndGggPyB0ZW1wb3JhbEZpbHRlci5kdXJhdGlvbkxlbmd0aCA6IG51bGxcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKCFjaGVja0ZvckFPSSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IGFkZCB1bmlxdWUgQU9Jc1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2VhcmNoID0gJGxvY2F0aW9uLnNlYXJjaCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcXMgPSBfLnBhaXJzKHNlYXJjaCksXG4gICAgICAgICAgICAgICAgICAgICAgICBxc0FyciA9IFtdO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChxcywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxc0Fyci5wdXNoKHZhbHVlLmpvaW4oJz0nKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHZtLnJlY2VudEFPSXMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYm94OiBiYm94LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcG9yYWxGaWx0ZXI6IGFvaVRlbXBvcmFsRmlsdGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBxc0Fyci5qb2luKCcmJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodm0ucmVjZW50QU9Jcy5sZW5ndGggPiBzaWdtYUNvbmZpZy5tYXhpbXVtUmVjZW50QU9Jcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ucmVjZW50QU9Jcy5zcGxpY2UoKHZtLnJlY2VudEFPSXMubGVuZ3RoIC0gMSksIDEpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JlY2VudEFPSXMnLCBKU09OLnN0cmluZ2lmeSh2bS5yZWNlbnRBT0lzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh2bS5yZWNlbnRBT0lzLCBmdW5jdGlvbiAoYW9pKSB7XG4gICAgICAgICAgICAgICAgYW9pLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBzZWFyY2ggPSAkbG9jYXRpb24uc2VhcmNoKCk7XG4gICAgICAgICAgICBzZWFyY2guY292ZXJhZ2VPcGFjaXR5ID0gcGFyc2VGbG9hdChzZWFyY2guY292ZXJhZ2VPcGFjaXR5KTsgLy8gcGFyc2UgZmxvYXQgdG8gZW5hYmxlIG9iamVjdCBlcXVhbGl0eVxuXG4gICAgICAgICAgICB2YXIgY3VycmVudEFPSSA9IF8uZmlsdGVyKHZtLnJlY2VudEFPSXMsIGZ1bmN0aW9uIChhb2kpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYW5ndWxhci5lcXVhbHMoYW9pLnNlYXJjaCwgc2VhcmNoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoY3VycmVudEFPSSAmJiBjdXJyZW50QU9JLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50QU9JWzBdLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIHZhciBkb1dhdGNoID0gZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSwgaXNDb2xsZWN0aW9uKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc0NvbGxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJib3goKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGRvV2F0Y2gobmV3VmFsdWUsIG9sZFZhbHVlLCB0cnVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgZG9XYXRjaChuZXdWYWx1ZSwgb2xkVmFsdWUsIHRydWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJhc2VsYXllcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgZG9XYXRjaChuZXdWYWx1ZSwgb2xkVmFsdWUsIHRydWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0Q292ZXJhZ2VPcGFjaXR5KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBkb1dhdGNoKG5ld1ZhbHVlLCBvbGRWYWx1ZSwgZmFsc2UpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0RW5hYmxlQ292ZXJhZ2UoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGRvV2F0Y2gobmV3VmFsdWUsIG9sZFZhbHVlLCBmYWxzZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRCYW5kKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBkb1dhdGNoKG5ld1ZhbHVlLCBvbGRWYWx1ZSwgZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFNlbnNvcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgZG9XYXRjaChuZXdWYWx1ZSwgb2xkVmFsdWUsIGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hUmVjZW50QW9pTGlzdCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9yZWNlbnRBb2lMaXN0L3JlY2VudEFvaUxpc3RUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdyZWNlbnRBb2lMaXN0Q29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdwb2ludENvbnZlcnRlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGVsZW1lbnQsXG4gICAgICAgICRtb2RhbCxcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHNpZ21hU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBfLFxuICAgICAgICBjMyxcbiAgICAgICAgbW9tZW50LFxuICAgICAgICBGaWxlU2F2ZXIsXG4gICAgICAgIEJsb2JcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIGNoYXJ0SGVpZ2h0ID0gMCxcbiAgICAgICAgICAgIHNjYXR0ZXJNb2RhbCA9ICRtb2RhbCh7c2NvcGU6ICRzY29wZSwgdGVtcGxhdGVVcmw6ICdzY2F0dGVyTW9kYWwuaHRtbCcsIHNob3c6IGZhbHNlLCBhbmltYXRpb246ICdhbS1mYWRlLWFuZC1zY2FsZSd9KTtcbiAgICAgICAgXG4gICAgICAgIHZtLnNpZ21hQ29uZmlnID0gc2lnbWFDb25maWc7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0ucG9pbnRDb252ZXJ0ZXJEYXRhID0ge307XG5cbiAgICAgICAgdm0uZXhwb3J0RGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHZtLnBvaW50Q29udmVydGVyRGF0YS5jb2xsZWN0cykpIHtcbiAgICAgICAgICAgICAgICB2YXIga2V5cyA9IF8ua2V5cyh2bS5wb2ludENvbnZlcnRlckRhdGEuY29sbGVjdHNbMF0pO1xuXG4gICAgICAgICAgICAgICAgLy8gZmlyc3QgaXRlbSBpbiBkYXRhIHdpbGwgYmUgYXJyYXkgb2Yga2V5c1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gW2tleXNdO1xuXG4gICAgICAgICAgICAgICAgLy8gYWRkIHZhbHVlcyB0byBvdXRwdXQgZGF0YVxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh2bS5wb2ludENvbnZlcnRlckRhdGEuY29sbGVjdHMsIGZ1bmN0aW9uIChjb2xsZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGtleXMsIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlcy5wdXNoKGNvbGxlY3Rba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBkYXRhLnB1c2godmFsdWVzKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIG91dHB1dCB0aGVzZSB0byBzdHJpbmdzXG4gICAgICAgICAgICAgICAgdmFyIGNzdkNvbnRlbnQgPSAnZGF0YTp0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04LCc7XG4gICAgICAgICAgICAgICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChpbmZvQXJyYXksIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhU3RyaW5nID0gaW5mb0FycmF5LmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICAgICAgY3N2Q29udGVudCArPSBpbmRleCA8IGRhdGEubGVuZ3RoID8gZGF0YVN0cmluZysgJ1xcbicgOiBkYXRhU3RyaW5nO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gc2F2ZSBkYXRhXG4gICAgICAgICAgICAgICAgdmFyIGJsb2JEYXRhID0gbmV3IEJsb2IoW2NzdkNvbnRlbnRdLCB7IHR5cGU6ICd0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04JyB9KTtcbiAgICAgICAgICAgICAgICBGaWxlU2F2ZXIuc2F2ZUFzKGJsb2JEYXRhLCAnc2lnbWFfcG9pbnRfY29udmVydGVyX2RhdGEuY3N2Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHVwZGF0ZVBsb3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHZtLnBvaW50Q29udmVydGVyRGF0YS5jb2xsZWN0cykpIHtcbiAgICAgICAgICAgICAgICAvLyB1c2UgJHByb21pc2UgcHJvcGVydHkgdG8gZW5zdXJlIHRoZSB0ZW1wbGF0ZSBoYXMgYmVlbiBsb2FkZWRcbiAgICAgICAgICAgICAgICBzY2F0dGVyTW9kYWwuJHByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNob3cgbW9kYWwgZmlyc3Qgc28gYzMgaGFzIHNvbWV0aGluZyB0byBiaW5kIHRvXG4gICAgICAgICAgICAgICAgICAgIHNjYXR0ZXJNb2RhbC5zaG93KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBvcmFsRmlsdGVyID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwbG90SnNvbiA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRDb252ZXJ0ZXJEYXRhID0gXy5zb3J0QnlPcmRlcih2bS5wb2ludENvbnZlcnRlckRhdGEuY29sbGVjdHMsICd0aW1lJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBwbG90QmFuZHMgPSBfLnVuaXEoXy5tYXAocG9pbnRDb252ZXJ0ZXJEYXRhLCAnYmFuZCcpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsb3ROYW1lcyA9IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgIHBsb3RCYW5kcyA9IF8ubWFwKHBsb3RCYW5kcywgZnVuY3Rpb24gKGJhbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBiYW5kLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlZmluZSBmcmllbmRseSBuYW1lcyBmb3IgY2hhcnQgbGVnZW5kXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChzaWdtYUNvbmZpZy5iYW5kcywgZnVuY3Rpb24gKGJhbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsb3ROYW1lc1tiYW5kLm5hbWVdID0gYmFuZC50aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGpzb24gYXJyYXkgZm9yIEMzIGNoYXJ0XG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChwb2ludENvbnZlcnRlckRhdGEsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YU9iaiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lOiBkYXRhLnRpbWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmFuZCA9IGRhdGEuYmFuZC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YU9ialtiYW5kXSA9IGRhdGEuaW50ZW5zaXR5O1xuICAgICAgICAgICAgICAgICAgICAgICAgcGxvdEpzb24ucHVzaChkYXRhT2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGVtcHR5IGRheXMgb250byBlbmQgb2YgY2hhcnQgaWYgbmVjZXNzYXJ5XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaWZmID0gbW9tZW50LnV0Yyh0ZW1wb3JhbEZpbHRlci5zdG9wKS5kaWZmKG1vbWVudC51dGMocG9pbnRDb252ZXJ0ZXJEYXRhW3BvaW50Q29udmVydGVyRGF0YS5sZW5ndGggLSAxXS50aW1lKSwgJ2QnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsb3RTdG9wID0gbW9tZW50LnV0Yyhwb2ludENvbnZlcnRlckRhdGFbcG9pbnRDb252ZXJ0ZXJEYXRhLmxlbmd0aCAtIDFdLnRpbWUpLnRvSVNPU3RyaW5nKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPD0gZGlmZjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwbG90SnNvbi5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lOiBtb21lbnQudXRjKHBsb3RTdG9wKS5hZGQoaSwgJ2QnKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjMy5nZW5lcmF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBiaW5kdG86IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzY2F0dGVyQ2hhcnQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29uOiBwbG90SnNvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6ICd0aW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBsb3RCYW5kc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeEZvcm1hdDogJyVZLSVtLSVkVCVIOiVNOiVTJywgLy8gMjAxNC0wOC0wMVQxNjoxNjowN1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzY2F0dGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lczogcGxvdE5hbWVzXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogY2hhcnRIZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBheGlzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGltZXNlcmllcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiAnVGltZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpY2s6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogJyVZLSVtLSVkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1bGxpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IE1hdGguZmxvb3IobW9tZW50LnV0Yyhwb2ludENvbnZlcnRlckRhdGFbcG9pbnRDb252ZXJ0ZXJEYXRhLmxlbmd0aCAtIDFdLnRpbWUpLmRpZmYobW9tZW50LnV0Yyhwb2ludENvbnZlcnRlckRhdGFbMV0udGltZSksICd3JykgLyAyKSAvLyBvbmUgdGljayBldmVyeSAyIHdlZWtzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdJbnRlbnNpdHknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyaWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6IDZcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB6b29tOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNjYWxlOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbHRpcDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogZnVuY3Rpb24gKHgpIHsgcmV0dXJuIG1vbWVudC51dGMoeCkuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tOnNzW1pdJyk7IH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHZpZXdwb3J0U2l6ZSA9IHNpZ21hU2VydmljZS5nZXRWaWV3cG9ydFNpemUoKTtcbiAgICAgICAgICAgIGNoYXJ0SGVpZ2h0ID0gdmlld3BvcnRTaXplLmhlaWdodCAtIDI1MDsgLy8gc3VidHJhY3QgMjUwIHRvIGFjY291bnQgZm9yIG1hcmdpbiBhbmQgbW9kYWwgaGVhZGVyXG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0UG9pbnRDb252ZXJ0ZXJEYXRhKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgJiYgXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNFcXVhbChuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdm0ucG9pbnRDb252ZXJ0ZXJEYXRhID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgdXBkYXRlUGxvdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hUG9pbnRDb252ZXJ0ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvcG9pbnRDb252ZXJ0ZXIvcG9pbnRDb252ZXJ0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdwb2ludENvbnZlcnRlckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICB4UHJvcGVydHk6ICdAJyxcbiAgICAgICAgICAgICAgICB5UHJvcGVydHk6ICdAJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmZhY3RvcnkoJ3JhZGlhbEJhckNoYXJ0JywgZnVuY3Rpb24gKGQzKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiByYWRpYWxCYXJDaGFydCgpIHtcbiAgICAgICAgICAgIC8vIENvbmZpZ3VyYWJsZSB2YXJpYWJsZXNcbiAgICAgICAgICAgIHZhciBtYXJnaW4gPSB7dG9wOiAyMCwgcmlnaHQ6IDIwLCBib3R0b206IDIwLCBsZWZ0OiAyMH07XG4gICAgICAgICAgICB2YXIgYmFySGVpZ2h0ID0gMTAwO1xuICAgICAgICAgICAgdmFyIHJldmVyc2VMYXllck9yZGVyID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgYmFyQ29sb3JzO1xuICAgICAgICAgICAgdmFyIGNhcGl0YWxpemVMYWJlbHMgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBkb21haW4gPSBbMCwgMTAwXTtcbiAgICAgICAgICAgIHZhciB0aWNrVmFsdWVzO1xuICAgICAgICAgICAgdmFyIGNvbG9yTGFiZWxzID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgdGlja0NpcmNsZVZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IDEwMDA7XG5cbiAgICAgICAgICAgIC8vIFNjYWxlcyAmIG90aGVyIHVzZWZ1bCB0aGluZ3NcbiAgICAgICAgICAgIHZhciBudW1CYXJzID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBiYXJTY2FsZSA9IG51bGw7XG4gICAgICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICAgICAgdmFyIGxhYmVsUmFkaXVzID0gMDtcbiAgICAgICAgICAgIHZhciBheGlzID0gZDMuc3ZnLmF4aXMoKTtcblxuXG4gICAgICAgICAgICBmdW5jdGlvbiBpbml0KGQpIHtcbiAgICAgICAgICAgICAgICBiYXJTY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihkb21haW4pLnJhbmdlKFswLCBiYXJIZWlnaHRdKTtcblxuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRbMF0uZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkWzBdLmRhdGEubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChkWzBdLmRhdGFbaV1bMF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAga2V5cyA9IGQzLm1hcChkWzBdLmRhdGEpLmtleXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbnVtQmFycyA9IGtleXMubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgLy8gUmFkaXVzIG9mIHRoZSBrZXkgbGFiZWxzXG4gICAgICAgICAgICAgICAgbGFiZWxSYWRpdXMgPSBiYXJIZWlnaHQgKiAxLjAyNTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gc3ZnUm90YXRlKGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3JvdGF0ZSgnKyAoK2EpICsnKSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHN2Z1RyYW5zbGF0ZSh4LCB5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJysgKCt4KSArJywnKyAoK3kpICsnKSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRDaGFydChjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IGQzLnNlbGVjdChjb250YWluZXIpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ3N2ZycpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZSgnd2lkdGgnLCAyICogYmFySGVpZ2h0ICsgbWFyZ2luLmxlZnQgKyBtYXJnaW4ucmlnaHQgKyAncHgnKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoJ2hlaWdodCcsIDIgKiBiYXJIZWlnaHQgKyBtYXJnaW4udG9wICsgbWFyZ2luLmJvdHRvbSArICdweCcpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZCgncmFkaWFsLWJhcmNoYXJ0JywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsIHN2Z1RyYW5zbGF0ZShtYXJnaW4ubGVmdCArIGJhckhlaWdodCwgbWFyZ2luLnRvcCArIGJhckhlaWdodCkpO1xuXG4gICAgICAgICAgICAgICAgLy8gQ29uY2VudHJpYyBjaXJjbGVzIGF0IHNwZWNpZmllZCB0aWNrIHZhbHVlc1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kKCdnJylcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoJ3RpY2stY2lyY2xlcycsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoJ2NpcmNsZScpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKHRpY2tDaXJjbGVWYWx1ZXMpXG4gICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ2NpcmNsZScpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdyJywgZnVuY3Rpb24oZCkge3JldHVybiBiYXJTY2FsZShkKTt9KVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnbm9uZScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiByZW5kZXJPdmVybGF5cyhjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IGQzLnNlbGVjdChjb250YWluZXIpLnNlbGVjdCgnc3ZnIGcucmFkaWFsLWJhcmNoYXJ0Jyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTcG9rZXNcbiAgICAgICAgICAgICAgICBnLmFwcGVuZCgnZycpXG4gICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdzcG9rZXMnLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKCdsaW5lJylcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEoa2V5cylcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgnbGluZScpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCd5MicsIC1iYXJIZWlnaHQpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkLCBpKSB7cmV0dXJuIHN2Z1JvdGF0ZShpICogMzYwIC8gbnVtQmFycyk7fSk7XG5cbiAgICAgICAgICAgICAgICAvLyBBeGlzXG4gICAgICAgICAgICAgICAgdmFyIGF4aXNTY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihkb21haW4pLnJhbmdlKFswLCAtYmFySGVpZ2h0XSk7XG4gICAgICAgICAgICAgICAgYXhpcy5zY2FsZShheGlzU2NhbGUpLm9yaWVudCgncmlnaHQnKTtcbiAgICAgICAgICAgICAgICBpZih0aWNrVmFsdWVzKXtcbiAgICAgICAgICAgICAgICAgICAgYXhpcy50aWNrVmFsdWVzKHRpY2tWYWx1ZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBnLmFwcGVuZCgnZycpXG4gICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdheGlzJywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgLmNhbGwoYXhpcyk7XG5cbiAgICAgICAgICAgICAgICAvLyBPdXRlciBjaXJjbGVcbiAgICAgICAgICAgICAgICBnLmFwcGVuZCgnY2lyY2xlJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3InLCBiYXJIZWlnaHQpXG4gICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdvdXRlcicsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICdub25lJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBMYWJlbHNcbiAgICAgICAgICAgICAgICB2YXIgbGFiZWxzID0gZy5hcHBlbmQoJ2cnKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZCgnbGFiZWxzJywgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICBsYWJlbHMuYXBwZW5kKCdkZWYnKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCdwYXRoJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2lkJywgJ2xhYmVsLXBhdGgnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignZCcsICdtMCAnICsgLWxhYmVsUmFkaXVzICsgJyBhJyArIGxhYmVsUmFkaXVzICsgJyAnICsgbGFiZWxSYWRpdXMgKyAnIDAgMSwxIC0wLjAxIDAnKTtcblxuICAgICAgICAgICAgICAgIGxhYmVscy5zZWxlY3RBbGwoJ3RleHQnKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShrZXlzKVxuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCBmdW5jdGlvbihkLCBpKSB7cmV0dXJuIGNvbG9yTGFiZWxzID8gYmFyQ29sb3JzW2kgJSBiYXJDb2xvcnMubGVuZ3RoXSA6IG51bGw7fSlcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgndGV4dFBhdGgnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cigneGxpbms6aHJlZicsICcjbGFiZWwtcGF0aCcpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdzdGFydE9mZnNldCcsIGZ1bmN0aW9uKGQsIGkpIHtyZXR1cm4gaSAqIDEwMCAvIG51bUJhcnMgKyA1MCAvIG51bUJhcnMgKyAnJSc7fSlcbiAgICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkge3JldHVybiBjYXBpdGFsaXplTGFiZWxzID8gZC50b1VwcGVyQ2FzZSgpIDogZDt9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyogQXJjIGZ1bmN0aW9ucyAqL1xuICAgICAgICAgICAgdmFyIG9yID0gZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBiYXJTY2FsZShkKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgc2EgPSBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChpICogMiAqIE1hdGguUEkpIC8gbnVtQmFycztcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgZWEgPSBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgoaSArIDEpICogMiAqIE1hdGguUEkpIC8gbnVtQmFycztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNoYXJ0KHNlbGVjdGlvbikge1xuICAgICAgICAgICAgICAgIHNlbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5pdChkKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihyZXZlcnNlTGF5ZXJPcmRlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICBkLnJldmVyc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBnID0gZDMuc2VsZWN0KHRoaXMpLnNlbGVjdCgnc3ZnIGcucmFkaWFsLWJhcmNoYXJ0Jyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgd2hldGhlciBjaGFydCBoYXMgYWxyZWFkeSBiZWVuIGNyZWF0ZWRcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwZGF0ZSA9IGdbMF1bMF0gIT09IG51bGw7IC8vIHRydWUgaWYgZGF0YSBpcyBiZWluZyB1cGRhdGVkXG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIXVwZGF0ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0Q2hhcnQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBnID0gZDMuc2VsZWN0KHRoaXMpLnNlbGVjdCgnc3ZnIGcucmFkaWFsLWJhcmNoYXJ0Jyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTGF5ZXIgZW50ZXIvZXhpdC91cGRhdGVcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxheWVycyA9IGcuc2VsZWN0QWxsKCdnLmxheWVyJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5kYXRhKGQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxheWVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnbGF5ZXItJyArIGk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoJ2xheWVyJywgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgbGF5ZXJzLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTZWdtZW50IGVudGVyL2V4aXQvdXBkYXRlXG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWdtZW50cyA9IGxheWVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbCgncGF0aCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZGF0YShmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG0gPSBkMy5tYXAoZC5kYXRhKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbVZhbHVlcyA9IG0udmFsdWVzKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1BcnIgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtVmFsdWVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1WYWx1ZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1BcnIucHVzaChtVmFsdWVzW2ldWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1BcnIgPSBtVmFsdWVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbUFycjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHNlZ21lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgncGF0aCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWJhckNvbG9ycyl7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXJDb2xvcnNbaSAlIGJhckNvbG9ycy5sZW5ndGhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudHMuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHNlZ21lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24odHJhbnNpdGlvbkR1cmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2QnLCBkMy5zdmcuYXJjKCkuaW5uZXJSYWRpdXMoMCkub3V0ZXJSYWRpdXMob3IpLnN0YXJ0QW5nbGUoc2EpLmVuZEFuZ2xlKGVhKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIXVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyT3ZlcmxheXModGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXhpc1NjYWxlID0gZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKGRvbWFpbikucmFuZ2UoWzAsIC1iYXJIZWlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF4aXMuc2NhbGUoYXhpc1NjYWxlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5vcmllbnQoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGlja1ZhbHVlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXhpcy50aWNrVmFsdWVzKHRpY2tWYWx1ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3QoJy5yYWRpYWwgLmF4aXMnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24oMjAwMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2FsbChheGlzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qIENvbmZpZ3VyYXRpb24gZ2V0dGVycy9zZXR0ZXJzICovXG4gICAgICAgICAgICBjaGFydC5tYXJnaW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKXsgcmV0dXJuIG1hcmdpbjsgfVxuICAgICAgICAgICAgICAgIG1hcmdpbiA9IF87XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY2hhcnQuYmFySGVpZ2h0ID0gZnVuY3Rpb24oXykge1xuICAgICAgICAgICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCl7IHJldHVybiBiYXJIZWlnaHQ7IH1cbiAgICAgICAgICAgICAgICBiYXJIZWlnaHQgPSBfO1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGFydDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNoYXJ0LnJldmVyc2VMYXllck9yZGVyID0gZnVuY3Rpb24oXykge1xuICAgICAgICAgICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCl7IHJldHVybiByZXZlcnNlTGF5ZXJPcmRlcjsgfVxuICAgICAgICAgICAgICAgIHJldmVyc2VMYXllck9yZGVyID0gXztcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hhcnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjaGFydC5iYXJDb2xvcnMgPSBmdW5jdGlvbihfKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKXsgcmV0dXJuIGJhckNvbG9yczsgfVxuICAgICAgICAgICAgICAgIGJhckNvbG9ycyA9IF87XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY2hhcnQuY2FwaXRhbGl6ZUxhYmVscyA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpeyByZXR1cm4gY2FwaXRhbGl6ZUxhYmVsczsgfVxuICAgICAgICAgICAgICAgIGNhcGl0YWxpemVMYWJlbHMgPSBfO1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGFydDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNoYXJ0LmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpeyByZXR1cm4gZG9tYWluOyB9XG4gICAgICAgICAgICAgICAgZG9tYWluID0gXztcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hhcnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjaGFydC50aWNrVmFsdWVzID0gZnVuY3Rpb24oXykge1xuICAgICAgICAgICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCl7IHJldHVybiB0aWNrVmFsdWVzOyB9XG4gICAgICAgICAgICAgICAgdGlja1ZhbHVlcyA9IF87XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY2hhcnQuY29sb3JMYWJlbHMgPSBmdW5jdGlvbihfKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKXsgcmV0dXJuIGNvbG9yTGFiZWxzOyB9XG4gICAgICAgICAgICAgICAgY29sb3JMYWJlbHMgPSBfO1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGFydDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNoYXJ0LnRpY2tDaXJjbGVWYWx1ZXMgPSBmdW5jdGlvbihfKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKXsgcmV0dXJuIHRpY2tDaXJjbGVWYWx1ZXM7IH1cbiAgICAgICAgICAgICAgICB0aWNrQ2lyY2xlVmFsdWVzID0gXztcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hhcnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjaGFydC50cmFuc2l0aW9uRHVyYXRpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKXsgcmV0dXJuIHRyYW5zaXRpb25EdXJhdGlvbjsgfVxuICAgICAgICAgICAgICAgIHRyYW5zaXRpb25EdXJhdGlvbiA9IF87XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIGNoYXJ0O1xuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcigncmFkaWFsQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBzZWFyY2hTZXJ2aWNlLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICByYWRpYWxCYXJDaGFydCxcbiAgICAgICAgZDMsXG4gICAgICAgIF8sXG4gICAgICAgIG1vbWVudFxuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgY29sbGVjdERhdGEgPSBbXSxcbiAgICAgICAgICAgIGNoYXJ0ID0ge307XG5cbiAgICAgICAgdm0uYmxvY2tlciA9IGJsb2NrVUkuaW5zdGFuY2VzLmdldCgnYmxvY2tlcicpO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLnJhZGlhbFJlYWR5ID0gZmFsc2U7XG4gICAgICAgIHZtLnpvb21DbGFzcyA9ICcnO1xuICAgICAgICB2bS5lbmFibGVDb3ZlcmFnZSA9IHN0YXRlU2VydmljZS5nZXRFbmFibGVDb3ZlcmFnZSgpO1xuXG4gICAgICAgIHZtLnRvZ2dsZVpvb21DbGFzcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2bS56b29tQ2xhc3MgPSB2bS56b29tQ2xhc3MgPT09ICdzY2FsZScgPyAnJyA6ICdzY2FsZSc7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGRyYXdDaGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGZvcm1hdCBkYXRhIHRvIHdvcmsgd2l0aCByYWRpYWxCYXJDaGFydFxuICAgICAgICAgICAgdmFyIGNoYXJ0RGF0YVZhbHVlcyA9IFtdLFxuICAgICAgICAgICAgICAgIGNoYXJ0RGF0YSA9IFt7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IFtdXG4gICAgICAgICAgICAgICAgfV07XG5cbiAgICAgICAgICAgIHZhciBmaW5kQ29sbGVjdCA9IGZ1bmN0aW9uIChob3VyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8uZmluZChjb2xsZWN0RGF0YSwgZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1vbWVudC51dGMoYy5ob3VyKS5ob3VyKCkgPT09IGhvdXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmb3IgKHZhciBob3VyID0gMDsgaG91ciA8IDI0OyBob3VyKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sbGVjdCA9IGZpbmRDb2xsZWN0KGhvdXIpO1xuICAgICAgICAgICAgICAgIGNoYXJ0RGF0YVZhbHVlcy5wdXNoKGNvbGxlY3QgPyBjb2xsZWN0LmNvdW50IDogMCk7XG4gICAgICAgICAgICAgICAgY2hhcnREYXRhWzBdLmRhdGEucHVzaChbbW9tZW50LnV0Yyhob3VyLCAnaCcpLmZvcm1hdCgnSEg6bW0nKSwgY29sbGVjdCA/IGNvbGxlY3QuY291bnQgOiAwXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGFycmF5IG9mIHZhbHVlcyBmb3IgZGV0ZXJtaW5pbmcgZG9tYWluIGFuZCBhdmVyYWdlIG51bWJlciBvZiBjb2xsZWN0c1xuICAgICAgICAgICAgLy92YXIgY2hhcnRUaWNrcyA9IE1hdGguZmxvb3IoZDMubWVhbihjaGFydERhdGFWYWx1ZXMpIC8gMyk7XG4gICAgICAgICAgICB2YXIgY2hhcnRUaWNrcyA9IE1hdGguZmxvb3IoZDMubWF4KGNoYXJ0RGF0YVZhbHVlcykgLyAzKTtcblxuICAgICAgICAgICAgLy8gaW5zdGFudGlhdGUgcmFkaWFsQmFyQ2hhcnRcbiAgICAgICAgICAgIGNoYXJ0ID0gcmFkaWFsQmFyQ2hhcnQoKTtcbiAgICAgICAgICAgIGNoYXJ0LmJhckhlaWdodCgxNzUpXG4gICAgICAgICAgICAgICAgLnJldmVyc2VMYXllck9yZGVyKHRydWUpXG4gICAgICAgICAgICAgICAgLmNhcGl0YWxpemVMYWJlbHModHJ1ZSlcbiAgICAgICAgICAgICAgICAuYmFyQ29sb3JzKFsnI0M2QTgwMCcsICcjRkZEODAwJywgJyNGRkU4NjQnXSkgLy8gdGhlc2UgcmVwZWF0IGlmIGFycmF5IGxlbmd0aCBpcyBzaG9ydGVyIHRoYW4gdGhlIG51bWJlciBvZiBiYXJzXG4gICAgICAgICAgICAgICAgLmRvbWFpbihbMCxkMy5tYXgoY2hhcnREYXRhVmFsdWVzKV0pXG4gICAgICAgICAgICAgICAgLnRpY2tWYWx1ZXMoW2NoYXJ0VGlja3MsIGNoYXJ0VGlja3MgKiAyLCBjaGFydFRpY2tzICogM10pXG4gICAgICAgICAgICAgICAgLnRpY2tDaXJjbGVWYWx1ZXMoY2hhcnREYXRhVmFsdWVzKTtcbiAgICAgICAgICAgIGQzLnNlbGVjdCgnLnJhZGlhbCcpXG4gICAgICAgICAgICAgICAgLmRhdHVtKGNoYXJ0RGF0YSlcbiAgICAgICAgICAgICAgICAuY2FsbChjaGFydCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uaW5pdFJhZGlhbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmJsb2NrZXIuc3RhcnQoJ1JhZGlhbCcpO1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRNYXBCb3VuZHMoKScsIF8uZGVib3VuY2UoZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodm0uZW5hYmxlQ292ZXJhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaFNlcnZpY2UuZ2V0Q29sbGVjdENvdW50c0J5SG91cigpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxlY3REYXRhID0gcmVzdWx0LmRhdGEucmVzdWx0cztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmF3Q2hhcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2bS5yYWRpYWxSZWFkeSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uYmxvY2tlci5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uYmxvY2tlci5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHNpZ21hQ29uZmlnLmRlYm91bmNlVGltZSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRFbmFibGVDb3ZlcmFnZSgpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICB2bS5lbmFibGVDb3ZlcmFnZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgaWYgKHZtLmVuYWJsZUNvdmVyYWdlICYmIHZtLnJhZGlhbFJlYWR5KSB7XG4gICAgICAgICAgICAgICAgdm0uaW5pdFJhZGlhbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hUmFkaWFsJywgZnVuY3Rpb24gKCQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9yYWRpYWwvcmFkaWFsVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAncmFkaWFsQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge30sXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLnZtLmVuYWJsZUNvdmVyYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS52bS5pbml0UmFkaWFsKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyICRyYWRpYWxDb250YWluZXIgPSAkKCcuY2hhcnQtcmFkaWFsJyk7XG4gICAgICAgICAgICAgICAgICAgICRyYWRpYWxDb250YWluZXIuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJhZGlhbENvbnRhaW5lci50b2dnbGVDbGFzcygnc2NhbGUnKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdyZWNlbnRQb2ludHNMaXN0Q29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBsb2NhbFN0b3JhZ2UsXG4gICAgICAgIF8sXG4gICAgICAgIE1vdXNlRXZlbnRcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHZtLmV4cGFuZGVkID0gJHNjb3BlLmV4cGFuZGVkO1xuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLnJlY2VudFBvaW50cyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JlY2VudFBvaW50cycpKSB8fCBbXTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmNsZWFyUmVjZW50UG9pbnRzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgncmVjZW50UG9pbnRzJyk7XG4gICAgICAgICAgICB2bS5yZWNlbnRQb2ludHMgPSBbXTtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNob3dQb2ludCA9IGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgICAgICAgLy8gYWRkIHNvdXJjZSBldmVudCB0byBlbnN1cmUgdGhlIHJlc3VsdCBpcyB1bmlxdWUgaW4gb3JkZXIgdG8gYmUgcGlja2VkIHVwIGJ5IHRoZSAkd2F0Y2ggc3RhdGVtZW50XG4gICAgICAgICAgICBwb2ludC5kYXRhLnNvdXJjZUV2ZW50ID0gbmV3IE1vdXNlRXZlbnQoJ2NsaWNrJywge1xuICAgICAgICAgICAgICAgICd2aWV3Jzogd2luZG93LFxuICAgICAgICAgICAgICAgICdidWJibGVzJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAnY2FuY2VsYWJsZSc6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRQb2ludENvbnZlcnRlckRhdGEocG9pbnQuZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRQb2ludENvbnZlcnRlckRhdGEoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciByZWNlbnRQb2ludENvbnZlcnRlckRhdGEgPSBfLm9taXQobmV3VmFsdWUsICdzb3VyY2VFdmVudCcpLFxuICAgICAgICAgICAgICAgICAgICBicnVzaEV4dGVudHMgPSBzdGF0ZVNlcnZpY2UuZ2V0QnJ1c2hFeHRlbnRzKCksXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrRm9yUG9pbnQgPSBfLmZpbmQodm0ucmVjZW50UG9pbnRzLCAnZGF0YS5wb2ludCcsIG5ld1ZhbHVlLnBvaW50KTtcblxuICAgICAgICAgICAgICAgIGlmICghY2hlY2tGb3JQb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IGFkZCB1bmlxdWUgcG9pbnRzXG4gICAgICAgICAgICAgICAgICAgIHZtLnJlY2VudFBvaW50cy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHJlY2VudFBvaW50Q29udmVydGVyRGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJydXNoRXh0ZW50czogYnJ1c2hFeHRlbnRzXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5yZWNlbnRQb2ludHMubGVuZ3RoID4gc2lnbWFDb25maWcubWF4aW11bVJlY2VudFBvaW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdm0ucmVjZW50UG9pbnRzLnNwbGljZSgodm0ucmVjZW50UG9pbnRzLmxlbmd0aCAtIDEpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyZWNlbnRQb2ludHMnLCBKU09OLnN0cmluZ2lmeSh2bS5yZWNlbnRQb2ludHMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFSZWNlbnRQb2ludHNMaXN0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9jb21wb25lbnRzL3JlY2VudFBvaW50c0xpc3QvcmVjZW50UG9pbnRzTGlzdFRlbXBsYXRlLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ3JlY2VudFBvaW50c0xpc3RDb250cm9sbGVyJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWQ6ICc9J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3NlbnNvckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBfXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXMsXG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcblxuICAgICAgICB2bS5leHBhbmRlZCA9ICRzY29wZS5leHBhbmRlZDtcbiAgICAgICAgdm0ubW9kZSA9ICRzY29wZS5tb2RlO1xuICAgICAgICB2bS5zZW5zb3JzID0gXy5jbG9uZURlZXAoc2lnbWFDb25maWcuc2Vuc29ycyk7XG4gICAgICAgIHZtLnNlbGVjdGVkU2Vuc29yID0gcXMuc2Vuc29yID8gXy5maW5kV2hlcmUodm0uc2Vuc29ycywge2lkOiBwYXJzZUludChxcy5zZW5zb3IpfSkgOiBfLmZpbmRXaGVyZSh2bS5zZW5zb3JzLCB7ZGVmYXVsdDogdHJ1ZX0pO1xuXG4gICAgICAgIHZtLnNldFNlbnNvciA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFNlbnNvcih2YWx1ZS5pZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0udG9nZ2xlRXhwYW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2bS5leHBhbmRlZCA9ICF2bS5leHBhbmRlZDtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLnNldFNlbnNvcih2bS5zZWxlY3RlZFNlbnNvcik7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5pdGlhbGl6ZSgpO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuZGlyZWN0aXZlKCdzaWdtYVNlbnNvcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9zZW5zb3Ivc2Vuc29yVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnc2Vuc29yQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiAnPScsXG4gICAgICAgICAgICAgICAgbW9kZTogJ0AnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdzaWRlYmFyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHNpZ21hU2VydmljZSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBsb2NhbFN0b3JhZ2UsXG4gICAgICAgIF8sXG4gICAgICAgIHNpZ21hQ29uZmlnXG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICB2bS5tb2RlID0gJHNjb3BlLm1vZGU7XG4gICAgICAgIHZtLmxvZ28gPSBzaWdtYUNvbmZpZy5sb2dvO1xuICAgICAgICB2bS5zaWRlYmFyU3R5bGUgPSAnJztcbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5kaXNhYmxlQW5hbHl6ZUJ0biA9IHRydWU7XG5cbiAgICAgICAgdmFyIGFkanVzdFNpemUgPSBmdW5jdGlvbiAoaGVpZ2h0KSB7XG4gICAgICAgICAgICB2bS5zaWRlYmFyU3R5bGUgPSAnaGVpZ2h0OiAnICsgaGVpZ2h0ICsgJ3B4OyBvdmVyZmxvdy15OiBhdXRvJztcbiAgICAgICAgfTtcblxuICAgICAgICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHNldCBzaWRlYmFyIGhlaWdodCBlcXVhbCB0byBhdmFpbGFibGUgcGFnZSBoZWlnaHRcbiAgICAgICAgICAgIHZhciB2aWV3cG9ydCA9IHNpZ21hU2VydmljZS5nZXRWaWV3cG9ydFNpemUoKTtcbiAgICAgICAgICAgIGFkanVzdFNpemUodmlld3BvcnQuaGVpZ2h0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdm0uYW5hbHl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIG5hdmlnYXRlIHRvIGFuYWx5emUgc2NyZWVuXG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vmlld01vZGUoJ2FuYWx5emUnKTtcbiAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKCcvYW5hbHl6ZScpLnNlYXJjaCgkbG9jYXRpb24uc2VhcmNoKCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnZpZXdNYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Vmlld01vZGUoJ3NlYXJjaCcpO1xuICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldENvcnJlbGF0aW9uRGF0YShudWxsKTtcbiAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKCcvJykuc2VhcmNoKCRsb2NhdGlvbi5zZWFyY2goKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRWaWV3cG9ydFNpemUoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRqdXN0U2l6ZShuZXdWYWx1ZS5oZWlnaHQpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJib3goKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKF8ua2V5cyhuZXdWYWx1ZSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlLmZvcm1hdCAhPT0gJ21ncnMnKSB7XG4gICAgICAgICAgICAgICAgdm0uZGlzYWJsZUFuYWx5emVCdG4gPSAhKG5ld1ZhbHVlLm5vcnRoICE9PSAnJyAmJiBuZXdWYWx1ZS5zb3V0aCAhPT0gJycgJiYgbmV3VmFsdWUuZWFzdCAhPT0gJycgJiYgbmV3VmFsdWUud2VzdCAhPT0gJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5kaXNhYmxlQW5hbHl6ZUJ0biA9ICEobmV3VmFsdWUubWdyc05FICE9PSAnJyAmJiBuZXdWYWx1ZS5tZ3JzU1cgIT09ICcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hU2lkZWJhcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvY29tcG9uZW50cy9zaWRlYmFyL3NpZGViYXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdzaWRlYmFyQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIG1vZGU6ICdAJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3RlbXBvcmFsRmlsdGVyQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgbW9tZW50LFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgX1xuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgcXMgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgdm0uZXhwYW5kZWQgPSAkc2NvcGUuZXhwYW5kZWQ7XG4gICAgICAgIHZtLm1vZGUgPSAkc2NvcGUubW9kZTtcbiAgICAgICAgdm0uZXhwYW5kZWRSYW5nZSA9IHFzLmR1cmF0aW9uID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICB2bS5leHBhbmRlZER1cmF0aW9uID0gcXMuZHVyYXRpb24gPyB0cnVlIDogZmFsc2U7XG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0ubW9tZW50ID0gbW9tZW50O1xuICAgICAgICB2bS5zdGFydCA9ICcnO1xuICAgICAgICB2bS5zdG9wID0gJyc7XG4gICAgICAgIHZtLmR1cmF0aW9uTGVuZ3RoID0gcXMuZHVyYXRpb25MZW5ndGggPyBwYXJzZUludChxcy5kdXJhdGlvbkxlbmd0aCkgOiBzaWdtYUNvbmZpZy5kZWZhdWx0RHVyYXRpb25MZW5ndGg7XG4gICAgICAgIHZtLmR1cmF0aW9ucyA9IHNpZ21hQ29uZmlnLmR1cmF0aW9ucztcbiAgICAgICAgdm0uc2VsZWN0ZWREdXJhdGlvbiA9IHFzLmR1cmF0aW9uID8gXy5maW5kKHNpZ21hQ29uZmlnLmR1cmF0aW9ucywgeyB2YWx1ZTogcXMuZHVyYXRpb24gfSkgOiBfLmZpbmQoc2lnbWFDb25maWcuZHVyYXRpb25zLCB7IGRlZmF1bHQ6IHRydWUgfSk7XG4gICAgICAgIHZtLnJhbmdlcyA9IHNpZ21hQ29uZmlnLnJhbmdlcztcbiAgICAgICAgdm0udGVtcG9yYWxab29tID0gJyc7XG5cbiAgICAgICAgdm0uc2V0VGVtcG9yYWxGaWx0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodm0uZXhwYW5kZWREdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHZtLnN0YXJ0ID0gbW9tZW50LnV0Yyhtb21lbnQudXRjKCkuZW5kT2YoJ2QnKSkuc3VidHJhY3Qodm0uZHVyYXRpb25MZW5ndGgsIHZtLnNlbGVjdGVkRHVyYXRpb24udmFsdWUpLnN0YXJ0T2YoJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgICAgICB2bS5zdG9wID0gbW9tZW50LnV0YygpLmVuZE9mKCdkJykudG9EYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUZW1wb3JhbEZpbHRlcih7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IHZtLnN0YXJ0LFxuICAgICAgICAgICAgICAgIHN0b3A6IHZtLnN0b3AsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IHZtLmV4cGFuZGVkRHVyYXRpb24gPyB2bS5zZWxlY3RlZER1cmF0aW9uLnZhbHVlIDogbnVsbCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbkxlbmd0aDogdm0uZXhwYW5kZWREdXJhdGlvbiA/IHBhcnNlSW50KHZtLmR1cmF0aW9uTGVuZ3RoKSA6IG51bGxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBxcyA9ICRsb2NhdGlvbi5zZWFyY2goKTtcblxuICAgICAgICAgICAgaWYgKHZtLmV4cGFuZGVkUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICB2bS5zdGFydCA9IHFzLnN0YXJ0ID8gbW9tZW50LnV0Yyhxcy5zdGFydCkudG9EYXRlKCkgOiBtb21lbnQudXRjKCkuc3VidHJhY3Qoc2lnbWFDb25maWcuZGVmYXVsdERheXNCYWNrLCAnZGF5cycpLnN0YXJ0T2YoJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgICAgICB2bS5zdG9wID0gcXMuc3RvcCA/IG1vbWVudC51dGMocXMuc3RvcCkudG9EYXRlKCkgOiBtb21lbnQudXRjKCkuZW5kT2YoJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodm0uZXhwYW5kZWREdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkRHVyYXRpb24gPSBxcy5kdXJhdGlvbiA/IF8uZmluZCh2bS5kdXJhdGlvbnMsIHsgdmFsdWU6IHFzLmR1cmF0aW9uIH0pIDogXy5maW5kKHZtLmR1cmF0aW9ucywgeyBkZWZhdWx0OiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgIHZtLmR1cmF0aW9uTGVuZ3RoID0gcXMuZHVyYXRpb25MZW5ndGggPyBwYXJzZUludChxcy5kdXJhdGlvbkxlbmd0aCkgOiBzaWdtYUNvbmZpZy5kZWZhdWx0RHVyYXRpb25MZW5ndGg7XG4gICAgICAgICAgICAgICAgdm0uc3RhcnQgPSBtb21lbnQudXRjKG1vbWVudC51dGMoKS5lbmRPZignZCcpKS5zdWJ0cmFjdCh2bS5kdXJhdGlvbkxlbmd0aCwgdm0uc2VsZWN0ZWREdXJhdGlvbi52YWx1ZSkuc3RhcnRPZignZCcpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgICAgIHZtLnN0b3AgPSBtb21lbnQudXRjKCkuZW5kT2YoJ2QnKS50b0RhdGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdm0uc2V0VGVtcG9yYWxGaWx0ZXIoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS50b2dnbGVFeHBhbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZtLmV4cGFuZGVkID0gIXZtLmV4cGFuZGVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZUV4cGFuZGVkRmlsdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uZXhwYW5kZWRSYW5nZSA9ICF2bS5leHBhbmRlZFJhbmdlO1xuICAgICAgICAgICAgdm0uZXhwYW5kZWREdXJhdGlvbiA9ICF2bS5leHBhbmRlZER1cmF0aW9uO1xuXG4gICAgICAgICAgICB2bS5zZXRUZW1wb3JhbEZpbHRlcigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnNldFJhbmdlID0gZnVuY3Rpb24gKHVuaXRzLCB1bml0T2ZUaW1lKSB7XG4gICAgICAgICAgICB2bS5zdGFydCA9IG1vbWVudC51dGMoKS5hZGQodW5pdHMsIHVuaXRPZlRpbWUpLnN0YXJ0T2YoJ2RheScpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgdm0uc3RvcCA9IG1vbWVudC51dGMoKS5lbmRPZignZCcpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgdm0uc2V0VGVtcG9yYWxGaWx0ZXIoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0aWFsaXplKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbEZpbHRlcigpJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bS5zdGFydCA9IG1vbWVudC51dGMobmV3VmFsdWUuc3RhcnQpLnRvRGF0ZSgpO1xuICAgICAgICAgICAgdm0uc3RvcCA9IG1vbWVudC51dGMobmV3VmFsdWUuc3RvcCkudG9EYXRlKCk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbmV3VmFsdWUuZHVyYXRpb24gIT09ICd1bmRlZmluZWQnICYmIG5ld1ZhbHVlLmR1cmF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkRHVyYXRpb24gPSBfLmZpbmQodm0uZHVyYXRpb25zLCB7dmFsdWU6IG5ld1ZhbHVlLmR1cmF0aW9ufSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlLmR1cmF0aW9uTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmR1cmF0aW9uTGVuZ3RoID0gbmV3VmFsdWUuZHVyYXRpb25MZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdm0uZXhwYW5kZWRSYW5nZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZtLmV4cGFuZGVkRHVyYXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2bS5leHBhbmRlZFJhbmdlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2bS5leHBhbmRlZER1cmF0aW9uID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh2bS5tb2RlID09PSAnYW5hbHl6ZScpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRUZW1wb3JhbFpvb20oKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHZtLnRlbXBvcmFsWm9vbSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5kaXJlY3RpdmUoJ3NpZ21hVGVtcG9yYWxGaWx0ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvdGVtcG9yYWxGaWx0ZXIvdGVtcG9yYWxGaWx0ZXJUZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICd0ZW1wb3JhbEZpbHRlckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBleHBhbmRlZDogJz0nLFxuICAgICAgICAgICAgICAgIG1vZGU6ICdAJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3RpbWVTbGlkZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRxLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICBkMyxcbiAgICAgICAgXyxcbiAgICAgICAgJCxcbiAgICAgICAgbW9tZW50XG4gICAgKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXM7XG5cbiAgICAgICAgdm0uc3RhcnQgPSAkc2NvcGUuc3RhcnQ7XG4gICAgICAgIHZtLnN0b3AgPSAkc2NvcGUuc3RvcDtcbiAgICAgICAgdm0ubW9kZSA9ICRzY29wZS5tb2RlO1xuXG4gICAgICAgIHZhciBtYXAgPSB7fSxcbiAgICAgICAgICAgIG1hcmdpbiA9IHt0b3A6IDI1LCByaWdodDogNTUsIGJvdHRvbTogMjUsIGxlZnQ6IDI1fSxcbiAgICAgICAgICAgIGFzcGVjdCA9IDAsXG4gICAgICAgICAgICBhYnNXaWR0aCA9IDAsXG4gICAgICAgICAgICBhYnNIZWlnaHQgPSA4NSxcbiAgICAgICAgICAgIHdpZHRoID0gMCxcbiAgICAgICAgICAgIGhlaWdodCA9IGFic0hlaWdodCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tLFxuICAgICAgICAgICAgeCA9IDAsXG4gICAgICAgICAgICB5ID0gMCxcbiAgICAgICAgICAgIHhBeGlzID0ge30sXG4gICAgICAgICAgICBhcmVhID0gZnVuY3Rpb24gKCkge30sXG4gICAgICAgICAgICBzdmcgPSB7fSxcbiAgICAgICAgICAgIGZvY3VzID0ge30sXG4gICAgICAgICAgICBicnVzaCA9IGQzLnN2Zy5icnVzaCgpLFxuICAgICAgICAgICAgY29udGV4dCA9IHt9LFxuICAgICAgICAgICAgYXJlYVBhdGggPSB7fSxcbiAgICAgICAgICAgIHpvb20gPSBkMy5iZWhhdmlvci56b29tKCksXG4gICAgICAgICAgICB4RGF0YSA9IFtdLFxuICAgICAgICAgICAgeURhdGEgPSBbXSxcbiAgICAgICAgICAgIHRpbWVTbGlkZXJGcmVxdWVuY3kgPSBbXSxcbiAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdGFydCA9IHZtLnN0YXJ0IHx8IHNpZ21hQ29uZmlnLmRlZmF1bHRTbGlkZXJTdGFydC50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgdGltZVNsaWRlckV4dGVudFN0b3AgPSB2bS5zdG9wIHx8IHNpZ21hQ29uZmlnLmRlZmF1bHRTbGlkZXJTdG9wLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBwbGF5YmFja1N0YXRlID0gJ3N0b3AnLFxuICAgICAgICAgICAgcGxheWJhY2tTcGVlZCA9IHNpZ21hQ29uZmlnLm1heFBsYXliYWNrRGVsYXksXG4gICAgICAgICAgICBwbGF5YmFja0ludGVydmFsUXR5ID0gc2lnbWFDb25maWcuZGVmYXVsdFBsYXliYWNrSW50ZXJ2YWxRdHksXG4gICAgICAgICAgICBwbGF5YmFja0ludGVydmFsID0gXy5maW5kV2hlcmUoc2lnbWFDb25maWcucGxheWJhY2tJbnRlcnZhbHMsIHsgZGVmYXVsdDogdHJ1ZSB9KSxcbiAgICAgICAgICAgIHRlbXBvcmFsRmlsdGVyID0ge307XG5cbiAgICAgICAgdm0uc3RhdGVTZXJ2aWNlID0gc3RhdGVTZXJ2aWNlO1xuICAgICAgICB2bS5zbGlkZXJSZWFkeSA9IGZhbHNlO1xuICAgICAgICB2bS5icnVzaFN0YXRlID0gJ3NlbGVjdCc7XG4gICAgICAgIHZtLnRvZ2dsZUJydXNoVGV4dCA9ICdTZWxlY3QnO1xuICAgICAgICB2bS50b2dnbGVCcnVzaENsYXNzID0gJ2ZhIGZhLWNyb3NzaGFpcnMnO1xuXG4gICAgICAgIC8vIHNldCBzbGlkZXIgZXh0ZW50cyBmb3IgdXNlIGluIG90aGVyIGNvbnRyb2xsZXJzXG4gICAgICAgIHN0YXRlU2VydmljZS5zZXRUaW1lU2xpZGVyRXh0ZW50cyh0aW1lU2xpZGVyRXh0ZW50U3RhcnQsIHRpbWVTbGlkZXJFeHRlbnRTdG9wKTtcblxuICAgICAgICB2YXIgZHJhd1NsaWRlciA9IGZ1bmN0aW9uIChmaWx0ZXIsIGR1cmF0aW9uKSB7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IGR1cmF0aW9uIHx8IHNpZ21hQ29uZmlnLm1heFBsYXliYWNrRGVsYXkgLSBwbGF5YmFja1NwZWVkO1xuICAgICAgICAgICAgLy9kdXJhdGlvbiA9IDEwO1xuICAgICAgICAgICAgYnJ1c2guZXh0ZW50KFttb21lbnQudXRjKGZpbHRlci5zdGFydCkudG9EYXRlKCksIG1vbWVudC51dGMoZmlsdGVyLnN0b3ApLnRvRGF0ZSgpXSk7XG5cbiAgICAgICAgICAgIC8vIGRyYXcgdGhlIGJydXNoIHRvIG1hdGNoIG91ciBleHRlbnRcbiAgICAgICAgICAgIC8vIGRvbid0IHRyYW5zaXRpb24gZHVyaW5nIHBsYXliYWNrXG4gICAgICAgICAgICBpZiAocGxheWJhY2tTdGF0ZSAhPT0gJ3BsYXknICYmIHBsYXliYWNrU3RhdGUgIT09ICdwYXVzZScgJiYgcGxheWJhY2tTdGF0ZSAhPT0gJ3N0ZXAnKSB7XG4gICAgICAgICAgICAgICAgYnJ1c2goZDMuc2VsZWN0KCcuYnJ1c2gnKS50cmFuc2l0aW9uKCkuZHVyYXRpb24oZHVyYXRpb24pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJ1c2goZDMuc2VsZWN0KCcuYnJ1c2gnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgYnJ1c2ggZGF0ZSBsYWJlbHNcbiAgICAgICAgICAgIGlmIChicnVzaC5leHRlbnQoKSkge1xuICAgICAgICAgICAgICAgIGQzLnNlbGVjdCgnLnJlc2l6ZS53IHRleHQnKS5odG1sKG1vbWVudC51dGMoYnJ1c2guZXh0ZW50KClbMF0pLmZvcm1hdCgnTU0vREQvWVlZWSBISDptbTpzcycpICsgJyAmIzk2NjA7Jyk7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KCcucmVzaXplLmUgdGV4dCcpLmh0bWwoJyYjOTY2MDsgJyArIG1vbWVudC51dGMoYnJ1c2guZXh0ZW50KClbMV0pLmZvcm1hdCgnTU0vREQvWVlZWSBISDptbTpzcycpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZmlyZSB0aGUgYnJ1c2hzdGFydCwgYnJ1c2htb3ZlLCBhbmQgYnJ1c2hlbmQgZXZlbnRzXG4gICAgICAgICAgICBicnVzaC5ldmVudChkMy5zZWxlY3QoJy5icnVzaCcpLnRyYW5zaXRpb24oKS5kdXJhdGlvbihkdXJhdGlvbikpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB1cGRhdGVJbnRlcnZhbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHJlZHJhdyBzbGlkZXIgYnJ1c2hcbiAgICAgICAgICAgIHZhciBmaWx0ZXIgPSB7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IG1vbWVudC51dGModGltZVNsaWRlckV4dGVudFN0YXJ0KS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHN0b3A6IG1vbWVudC51dGModGltZVNsaWRlckV4dGVudFN0YXJ0KS5hZGQocGxheWJhY2tJbnRlcnZhbFF0eSwgcGxheWJhY2tJbnRlcnZhbC52YWx1ZSkudG9JU09TdHJpbmcoKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRyYXdTbGlkZXIoZmlsdGVyKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYnJ1c2hpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBzbGlkZXIgYnJ1c2ggaXMgYmVpbmcgbW92ZWQsIHNvIHVwZGF0ZSB0aGUgZGF0ZSBsYWJlbCB2YWx1ZXNcbiAgICAgICAgICAgICQoJy5yZXNpemUudyB0ZXh0JykuaHRtbChtb21lbnQudXRjKGJydXNoLmV4dGVudCgpWzBdKS5mb3JtYXQoJ01NL0REL1lZWVkgSEg6bW06c3MnKSArICcgJiM5NjYwOycpO1xuICAgICAgICAgICAgJCgnLnJlc2l6ZS5lIHRleHQnKS5odG1sKCcmIzk2NjA7ICcgKyBtb21lbnQudXRjKGJydXNoLmV4dGVudCgpWzFdKS5mb3JtYXQoJ01NL0REL1lZWVkgSEg6bW06c3MnKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGJydXNoZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAocGxheWJhY2tTdGF0ZSA9PT0gJ3BsYXknIHx8IHBsYXliYWNrU3RhdGUgPT09ICdwYXVzZScgfHwgcGxheWJhY2tTdGF0ZSA9PT0gJ3N0ZXAnKSB7XG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIHRpbWUgc2xpZGVyIHBvaW50ZXIgZXZlbnRzIHRvIHByZXZlbnQgY3VzdG9tIHJlc2l6aW5nIG9mIHRoZSBwbGF5YmFjayB3aW5kb3dcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QoJy54LmJydXNoJykuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKTtcblxuICAgICAgICAgICAgICAgIC8vIGFkdmFuY2Ugc2xpZGVyIGJydXNoIHdoZW4gcGxheWluZ1xuICAgICAgICAgICAgICAgIGlmIChwbGF5YmFja1N0YXRlID09PSAncGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2VuZCBicnVzaCBleHRlbnRzIHRvIHN0YXRlU2VydmljZSBzbyBwbGF5YmFja0NvbnRyb2xsZXIgY2FuIGl0ZXJhdGUgdGhlIGN1cnJlbnQgZnJhbWVcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJydXNoRXh0ZW50cyhicnVzaC5leHRlbnQoKVswXSwgYnJ1c2guZXh0ZW50KClbMV0pO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QoJy54LmJydXNoJykuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ2FsbCcpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZtLm1vZGUgPT09ICdwbGF5YmFjaycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZDMuZXZlbnQuc291cmNlRXZlbnQgcmV0dXJucyBhIG1vdXNlIGV2ZW50IGlmIHRoZSBicnVzaCBpcyBhbHRlcmVkIGJ5IHRoZSB1c2VyIGRpcmVjdGx5XG4gICAgICAgICAgICAgICAgICAgIGlmIChkMy5ldmVudC5zb3VyY2VFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJydXNoRXh0ZW50cyhicnVzaC5leHRlbnQoKVswXSwgYnJ1c2guZXh0ZW50KClbMV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBub3RpZnkgYW5ndWxhciBvZiBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZDMuZXZlbnQuc291cmNlRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHZhbHVlcyB3ZXJlIG1vZGlmaWVkIGRpcmVjdGx5IGJ5IHNsaWRlciwgc28ganVzdCBzZXQgdGltZSByYW5nZVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldFRlbXBvcmFsRmlsdGVyKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogbW9tZW50LnV0YyhicnVzaC5leHRlbnQoKVswXSkudG9EYXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogbW9tZW50LnV0YyhicnVzaC5leHRlbnQoKVsxXSkudG9EYXRlKClcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBub3RpZnkgYW5ndWxhciBvZiBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHJlZHJhd1NsaWRlckNoYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGFyZWEgd2l0aCBuZXcgZGF0YVxuICAgICAgICAgICAgYXJlYVBhdGgudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAgICAgLmR1cmF0aW9uKDUwMClcbiAgICAgICAgICAgICAgICAuYXR0cignZCcsIGFyZWEodGltZVNsaWRlckZyZXF1ZW5jeSkpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHggYXhpc1xuICAgICAgICAgICAgY29udGV4dC5zZWxlY3QoJy54LmF4aXMnKVxuICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgICAgIC5jYWxsKHhBeGlzKVxuICAgICAgICAgICAgICAgIC5lYWNoKCdlbmQnLCBmdW5jdGlvbiAoKSB7ICRzY29wZS4kYXBwbHkoKTsgfSk7XG5cbiAgICAgICAgICAgIGRyYXdTbGlkZXIodGVtcG9yYWxGaWx0ZXIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBtb3VzZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYmlzZWN0RGF0ZSA9IGQzLmJpc2VjdG9yKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnQudXRjKGQudGltZSkudG9EYXRlKCk7XG4gICAgICAgICAgICAgICAgfSkubGVmdCxcbiAgICAgICAgICAgICAgICB4MCA9IHguaW52ZXJ0KGQzLm1vdXNlKHRoaXMpWzBdKSxcbiAgICAgICAgICAgICAgICBpID0gYmlzZWN0RGF0ZSh0aW1lU2xpZGVyRnJlcXVlbmN5LCB4MCwgMSksXG4gICAgICAgICAgICAgICAgZDAgPSB0aW1lU2xpZGVyRnJlcXVlbmN5W2kgLSAxXSxcbiAgICAgICAgICAgICAgICBkMSA9IHRpbWVTbGlkZXJGcmVxdWVuY3lbaV07XG5cbiAgICAgICAgICAgIGlmIChkMCAmJiBkMSkge1xuICAgICAgICAgICAgICAgIHZhciBkID0gZDEgPyBtb21lbnQudXRjKHgwKS5zdWJ0cmFjdChkMC50aW1lKS5pc0FmdGVyKG1vbWVudC51dGMoZDEudGltZSkuc3VidHJhY3QobW9tZW50LnV0Yyh4MCkpKSA/IGQxIDogZDAgOiBkMDtcblxuICAgICAgICAgICAgICAgIGZvY3VzLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArICh4KG1vbWVudC51dGMoZC50aW1lKS50b0RhdGUoKSkgKyBtYXJnaW4ubGVmdCkgKyAnLCcgKyAoeShkLmNvdW50KSArIG1hcmdpbi50b3ApICsgJyknKTtcbiAgICAgICAgICAgICAgICBmb2N1cy5zZWxlY3QoJ3RleHQnKS50ZXh0KG1vbWVudC51dGMobW9tZW50LnV0YyhkLnRpbWUpLnRvRGF0ZSgpKS5mb3JtYXQoJ01NL0REL1lZWVknKSArICc6ICcgKyBkLmNvdW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZHJhd1NsaWRlckNoYXJ0ID0gZnVuY3Rpb24gKGlzVXBkYXRlKSB7XG4gICAgICAgICAgICBpc1VwZGF0ZSA9IGlzVXBkYXRlIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBjcmVhdGUgYXJyYXlzIG9mIGp1c3QgZGF0ZXMgYW5kIHZhbHVlcyBpbiBvcmRlciB0byBzZXQgdGhlIHggYW5kIHkgZG9tYWluc1xuICAgICAgICAgICAgeERhdGEgPSBfLnBsdWNrKHRpbWVTbGlkZXJGcmVxdWVuY3ksICd0aW1lJyk7XG4gICAgICAgICAgICB5RGF0YSA9IF8ucGx1Y2sodGltZVNsaWRlckZyZXF1ZW5jeSwgJ2NvdW50Jyk7XG5cbiAgICAgICAgICAgIC8vIGNyZWF0ZSBzbGlkZXIgY2hhcnRcbiAgICAgICAgICAgIHguZG9tYWluKFttb21lbnQudXRjKHhEYXRhWzBdKS50b0RhdGUoKSwgbW9tZW50LnV0Yyh4RGF0YVt4RGF0YS5sZW5ndGggLSAxXSkuZW5kT2YoJ2QnKS50b0RhdGUoKV0pO1xuICAgICAgICAgICAgeS5kb21haW4oWzAsIGQzLm1heCh5RGF0YSldKTtcbiAgICAgICAgICAgIHpvb20ueCh4KTtcblxuICAgICAgICAgICAgaWYgKGlzVXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmVkcmF3U2xpZGVyQ2hhcnQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYXJlYVxuICAgICAgICAgICAgICAgIGFyZWFQYXRoID0gY29udGV4dC5hcHBlbmQoJ3BhdGgnKVxuICAgICAgICAgICAgICAgICAgICAuZGF0dW0odGltZVNsaWRlckZyZXF1ZW5jeSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2FyZWEnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignZCcsIGFyZWEpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGlwLXBhdGgnLCAndXJsKCNjbGlwKScpO1xuXG4gICAgICAgICAgICAgICAgZm9jdXMgPSBzdmcuYXBwZW5kKCdnJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ZvY3VzJylcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcblxuICAgICAgICAgICAgICAgIGZvY3VzLmFwcGVuZCgnY2lyY2xlJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3InLCA0LjUpO1xuXG4gICAgICAgICAgICAgICAgZm9jdXMuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3gnLCA5KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignZHknLCAnLjM1ZW0nKTtcblxuICAgICAgICAgICAgICAgIHN2Zy5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignd2lkdGgnLCB3aWR0aCArIG1hcmdpbi5sZWZ0ICsgbWFyZ2luLnJpZ2h0KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0ICsgbWFyZ2luLnRvcCArIG1hcmdpbi5ib3R0b20pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICd6b29tJylcbiAgICAgICAgICAgICAgICAgICAgLmNhbGwoem9vbSk7XG5cbiAgICAgICAgICAgICAgICBjb250ZXh0LmFwcGVuZCgnZycpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICd4IGF4aXMnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLCcgKyBoZWlnaHQgKyAnKScpXG4gICAgICAgICAgICAgICAgICAgIC5jYWxsKHhBeGlzKTtcblxuICAgICAgICAgICAgICAgIGNvbnRleHQuYXBwZW5kKCdnJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3ggYnJ1c2gnKVxuICAgICAgICAgICAgICAgICAgICAuY2FsbChicnVzaClcbiAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbCgncmVjdCcpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCd5JywgLTYpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCBoZWlnaHQgKyA3KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignY2xpcC1wYXRoJywgJ3VybCgjY2xpcCknKTtcblxuICAgICAgICAgICAgICAgIGQzLnNlbGVjdCgnLnRpbWUtc2xpZGVyJylcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb2N1cy5zdHlsZSgnZGlzcGxheScsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAub24oJ21vdXNlb3V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXMuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAub24oJ21vdXNlbW92ZScsIG1vdXNlbW92ZSk7XG5cbiAgICAgICAgICAgICAgICBjb250ZXh0LnNlbGVjdCgnLnJlc2l6ZS53JylcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCd4JywgLTEyMilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3knLCAtOClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnI2ZmZDgwMCcpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KCcnKTtcblxuICAgICAgICAgICAgICAgIGNvbnRleHQuc2VsZWN0KCcucmVzaXplLmUnKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3gnLCAtNilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3knLCAtOClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnI2ZmZDgwMCcpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KCcnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdm0uc2xpZGVyUmVhZHkgPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBkcmF3IHNsaWRlciBicnVzaFxuICAgICAgICAgICAgaWYgKHZtLm1vZGUgPT09ICdwbGF5YmFjaycpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVJbnRlcnZhbCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkcmF3U2xpZGVyKHRlbXBvcmFsRmlsdGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5taW5pbWl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJy5jaGFydCcpLmFuaW1hdGUoeyAnYm90dG9tJzogJy09ODVweCd9LCAyMDApO1xuICAgICAgICAgICAgJCgnLmxlYWZsZXQtY29udHJvbC1jb29yZGluYXRlcycpLmFuaW1hdGUoeyAnYm90dG9tJzogJy09NDVweCd9LCAyMDApO1xuICAgICAgICAgICAgJCgnLnRpbWUtc2xpZGVyLWNvbnRhaW5lcicpLnNsaWRlVG9nZ2xlKDIwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy50aW1lLXNsaWRlci1tYXhpbWl6ZScpLnNsaWRlVG9nZ2xlKDIwMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5tYXhpbWl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJy50aW1lLXNsaWRlci1tYXhpbWl6ZScpLnNsaWRlVG9nZ2xlKDIwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy5jaGFydCcpLmFuaW1hdGUoeyAnYm90dG9tJzogJys9ODVweCd9LCAyMDApO1xuICAgICAgICAgICAgICAgICQoJy5sZWFmbGV0LWNvbnRyb2wtY29vcmRpbmF0ZXMnKS5hbmltYXRlKHsgJ2JvdHRvbSc6ICcrPTQ1cHgnfSwgMjAwKTtcbiAgICAgICAgICAgICAgICAkKCcudGltZS1zbGlkZXItY29udGFpbmVyJykuc2xpZGVUb2dnbGUoMjAwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnRvZ2dsZUJydXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdm0uYnJ1c2hTdGF0ZSA9IHZtLmJydXNoU3RhdGUgPT09ICdzZWxlY3QnID8gJ3pvb20nIDogJ3NlbGVjdCc7XG4gICAgICAgICAgICBkMy5zZWxlY3QoJy54LmJydXNoJykuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgdm0uYnJ1c2hTdGF0ZSA9PT0gJ3NlbGVjdCcgPyAnYWxsJyA6ICdub25lJyk7XG4gICAgICAgICAgICB2bS50b2dnbGVCcnVzaFRleHQgPSB2bS5icnVzaFN0YXRlID09PSAnc2VsZWN0JyA/ICdTZWxlY3QnIDogJ1pvb20vUGFuJztcbiAgICAgICAgICAgIHZtLnRvZ2dsZUJydXNoQ2xhc3MgPSB2bS5icnVzaFN0YXRlID09PSAnc2VsZWN0JyA/ICdmYSBmYS1jcm9zc2hhaXJzJyA6ICdmYSBmYS1zZWFyY2gnO1xuICAgICAgICAgICAgJCgnLnpvb20nKS50b2dnbGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2bS5pbml0VGltZVNsaWRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFic1dpZHRoID0gJCgnLnRpbWUtc2xpZGVyLWNvbnRhaW5lcicpLndpZHRoKCk7XG4gICAgICAgICAgICB3aWR0aCA9ICBhYnNXaWR0aCAtIG1hcmdpbi5sZWZ0IC0gbWFyZ2luLnJpZ2h0O1xuICAgICAgICAgICAgYXNwZWN0ID0gKGFic1dpZHRoIC8gYWJzSGVpZ2h0KTtcblxuICAgICAgICAgICAgLy8gcmVzaXplIHNsaWRlciB3aGVuIHZpZXdwb3J0IGlzIGNoYW5nZWRcbiAgICAgICAgICAgICQod2luZG93KS5vbigncmVzaXplJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXRXaWR0aCA9ICQoJy50aW1lLXNsaWRlci1jb250YWluZXInKS53aWR0aCgpO1xuICAgICAgICAgICAgICAgIHN2Zy5hdHRyKCd3aWR0aCcsIHRhcmdldFdpZHRoKTtcbiAgICAgICAgICAgICAgICBzdmcuYXR0cignaGVpZ2h0JywgdGFyZ2V0V2lkdGggLyBhc3BlY3QpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHggPSBkMy50aW1lLnNjYWxlLnV0YygpLnJhbmdlKFswLCB3aWR0aF0pO1xuICAgICAgICAgICAgeSA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFtoZWlnaHQsIDBdKTtcblxuICAgICAgICAgICAgeEF4aXMgPSBkMy5zdmcuYXhpcygpLnNjYWxlKHgpLm9yaWVudCgnYm90dG9tJyk7XG5cbiAgICAgICAgICAgIGJydXNoLngoeClcbiAgICAgICAgICAgICAgICAub24oJ2JydXNoJywgYnJ1c2hpbmcpXG4gICAgICAgICAgICAgICAgLm9uKCdicnVzaGVuZCcsIGJydXNoZWQpO1xuXG4gICAgICAgICAgICBhcmVhID0gZDMuc3ZnLmFyZWEoKVxuICAgICAgICAgICAgICAgIC54KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4KG1vbWVudC51dGMoZC50aW1lKS50b0RhdGUoKSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAueTAoaGVpZ2h0KVxuICAgICAgICAgICAgICAgIC55MShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geShkLmNvdW50KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgc3ZnID0gZDMuc2VsZWN0KCcudGltZS1zbGlkZXInKS5hcHBlbmQoJ3N2ZycpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgd2lkdGggKyBtYXJnaW4ubGVmdCArIG1hcmdpbi5yaWdodClcbiAgICAgICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0ICsgbWFyZ2luLnRvcCArIG1hcmdpbi5ib3R0b20pXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCAnMCAwICcgKyAod2lkdGggKyBtYXJnaW4ubGVmdCArIG1hcmdpbi5yaWdodCkgKyAnICcgKyAoaGVpZ2h0ICsgbWFyZ2luLnRvcCArIG1hcmdpbi5ib3R0b20pKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJ3hNaW5ZTWluJyk7XG5cbiAgICAgICAgICAgIHN2Zy5hcHBlbmQoJ2NsaXBQYXRoJylcbiAgICAgICAgICAgICAgICAuYXR0cignaWQnLCAnY2xpcCcpXG4gICAgICAgICAgICAgICAgLmFwcGVuZCgncmVjdCcpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3gnLCB4KDApKVxuICAgICAgICAgICAgICAgIC5hdHRyKCd5JywgeSgxKSlcbiAgICAgICAgICAgICAgICAuYXR0cignd2lkdGgnLCB4KDEpIC0geCgwKSlcbiAgICAgICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgeSgwKSAtIHkoMSkpO1xuXG4gICAgICAgICAgICBjb250ZXh0ID0gc3ZnLmFwcGVuZCgnZycpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2NvbnRleHQnKVxuICAgICAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBtYXJnaW4ubGVmdCArICcsJyArIG1hcmdpbi50b3AgKyAnKScpO1xuXG4gICAgICAgICAgICB6b29tLm9uKCd6b29tJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlZHJhd1NsaWRlckNoYXJ0KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEZyYW1lRXh0ZW50cygpJywgZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAvLyBmcmFtZSBleHRlbnRzIGFyZSB1cGRhdGVkIHdoZW4gcGxheWJhY2tDb250cm9sbGVyIGFkdmFuY2VzIHRvIHRoZSBuZXh0IGZyYW1lXG4gICAgICAgICAgICBpZiAoXy5rZXlzKG5ld1ZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsYXliYWNrU3RhdGUgPT09ICdwbGF5JyB8fCBwbGF5YmFja1N0YXRlID09PSAncGF1c2UnIHx8IHBsYXliYWNrU3RhdGUgPT09ICdzdGVwJykge1xuICAgICAgICAgICAgICAgICAgICBkcmF3U2xpZGVyKHtzdGFydDogbW9tZW50LnV0YyhuZXdWYWx1ZS5zdGFydCkudG9JU09TdHJpbmcoKSwgc3RvcDogbW9tZW50LnV0YyhuZXdWYWx1ZS5zdG9wKS50b0lTT1N0cmluZygpfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFRpbWVTbGlkZXJGcmVxdWVuY3koKScsIF8uZGVib3VuY2UoZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKG5ld1ZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lU2xpZGVyRnJlcXVlbmN5ID0gbmV3VmFsdWU7XG4gICAgICAgICAgICBkcmF3U2xpZGVyQ2hhcnQodm0uc2xpZGVyUmVhZHkpO1xuICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xuICAgICAgICB9LCBzaWdtYUNvbmZpZy5kZWJvdW5jZVRpbWUpKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCd2bS5zdGF0ZVNlcnZpY2UuZ2V0TWFwKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIG1hcCA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCknLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChfLmtleXMobmV3VmFsdWUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0ZW1wb3JhbEZpbHRlciA9IG5ld1ZhbHVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZtLm1vZGUgPT09ICdzZWFyY2gnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZDMuZXZlbnQpIHsgLy8gdGVtcG9yYWxGaWx0ZXIgd2FzIG5vdCBtb2RpZmllZCBieSB0aGUgYnJ1c2hcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJ1ZmZlciB0aW1lIHNsaWRlciBleHRlbnRzIGFyb3VuZCB0ZW1wb3JhbCBmaWx0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtb21lbnQudXRjKCkuZGlmZihtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0YXJ0KSwgJ2QnKSA+IDM2NSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdGFydCA9IG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RhcnQpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVTbGlkZXJFeHRlbnRTdGFydCA9IG1vbWVudC51dGMoKS5zdWJ0cmFjdCgxLCAneScpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtb21lbnQudXRjKCkuZGlmZihtb21lbnQudXRjKHRlbXBvcmFsRmlsdGVyLnN0b3ApLCAnZCcpID4gOTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lU2xpZGVyRXh0ZW50U3RvcCA9IG1vbWVudC51dGModGVtcG9yYWxGaWx0ZXIuc3RvcCkuYWRkKDMsICdNJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZVNsaWRlckV4dGVudFN0b3AgPSBtb21lbnQudXRjKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHNsaWRlciBleHRlbnRzIGZvciB1c2UgaW4gb3RoZXIgY29udHJvbGxlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRUaW1lU2xpZGVyRXh0ZW50cyh0aW1lU2xpZGVyRXh0ZW50U3RhcnQsIHRpbWVTbGlkZXJFeHRlbnRTdG9wKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZtLnNsaWRlclJlYWR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhd1NsaWRlckNoYXJ0KHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy9kcmF3U2xpZGVyKHRlbXBvcmFsRmlsdGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFBsYXliYWNrU3RhdGUoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGxheWJhY2tTdGF0ZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgaWYgKHBsYXliYWNrU3RhdGUgPT09ICdwbGF5JyB8fCBwbGF5YmFja1N0YXRlID09PSAncGF1c2UnIHx8IHBsYXliYWNrU3RhdGUgPT09ICdzdGVwJykge1xuICAgICAgICAgICAgICAgIHZhciBmcmFtZUV4dGVudHMgPSBzdGF0ZVNlcnZpY2UuZ2V0RnJhbWVFeHRlbnRzKCk7XG4gICAgICAgICAgICAgICAgZHJhd1NsaWRlcihmcmFtZUV4dGVudHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRQbGF5YmFja1NwZWVkKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBsYXliYWNrU3BlZWQgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgndm0uc3RhdGVTZXJ2aWNlLmdldFBsYXliYWNrSW50ZXJ2YWxRdHkoKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyhuZXdWYWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGxheWJhY2tJbnRlcnZhbFF0eSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgdXBkYXRlSW50ZXJ2YWwoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3ZtLnN0YXRlU2VydmljZS5nZXRQbGF5YmFja0ludGVydmFsKCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBsYXliYWNrSW50ZXJ2YWwgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIHVwZGF0ZUludGVydmFsKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3ZtLnN0YXRlU2VydmljZS5nZXRCcnVzaFJlc2V0KCknLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHVwZGF0ZUludGVydmFsKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFUaW1lU2xpZGVyJywgZnVuY3Rpb24gKCR0aW1lb3V0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2NvbXBvbmVudHMvdGltZVNsaWRlci90aW1lU2xpZGVyVGVtcGxhdGUuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAndGltZVNsaWRlckNvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBzdGFydDogJz0nLFxuICAgICAgICAgICAgICAgIHN0b3A6ICc9JyxcbiAgICAgICAgICAgICAgICBtb2RlOiAnQCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBkaWdlc3QgY3ljbGVzIHRvIGNvbXBsZXRlIHRvIGVuc3VyZSBET00gaXMgZnVsbHkgcmVhZHlcbiAgICAgICAgICAgICAgICAvLyBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQpLnJlYWR5KCkgZG9lcyBub3QgZW5zdXJlIGV2ZXJ5dGhpbmcgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZtLmluaXRUaW1lU2xpZGVyKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5mYWN0b3J5KCd2aWRlb1NlcnZpY2UnLCBmdW5jdGlvbiAoXG4gICAgICAgICR0aW1lb3V0LFxuICAgICAgICAkcSxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgYmxvY2tVSSxcbiAgICAgICAgV2hhbW15LFxuICAgICAgICBHSUYsXG4gICAgICAgIGxlYWZsZXRJbWFnZSxcbiAgICAgICAgRmlsZVNhdmVyXG4gICAgKSB7XG4gICAgICAgIHZhciBzZWxmLFxuICAgICAgICAgICAgY2FudmFzSW1hZ2VPdmVybGF5ID0gc3RhdGVTZXJ2aWNlLmdldENhbnZhc0ltYWdlT3ZlcmxheSgpO1xuXG4gICAgICAgIHNlbGYgPSB7XG4gICAgICAgICAgICAvLyB0ZW1wIGNvbnRyb2wgZmxhZyB1c2VkIG91dHNpZGUgb2YgdGhpcyBzZXJ2aWNlXG4gICAgICAgICAgICBpc1JlY29yZGluZzogZmFsc2UsXG4gICAgICAgICAgICAvLyBpZiB0aGUgYmFzZSBsYXllciBpcyBiZWluZyBjcmVhdGVkXG4gICAgICAgICAgICBpc0luaXRpYWxpemluZzogZmFsc2UsXG4gICAgICAgICAgICAvLyBpZiB0aGUgaW5pdGlhbGl6ZXIgc2hvdWxkIHNhdmUgdGhlIGJhc2UgbGF5ZXJcbiAgICAgICAgICAgIGluY2x1ZGVCYXNlTGF5ZXI6IHRydWUsXG4gICAgICAgICAgICAvLyB0aGUgZW5jb2RlciB0byB1c2VcbiAgICAgICAgICAgIGVuY29kZXI6IHNpZ21hQ29uZmlnLmRlZmF1bHRFbmNvZGVyLCAgIC8vICd3ZWJtJyBvciAnZ2lmJ1xuICAgICAgICAgICAgLy8gbGlzdCBvZiBlbmNvZGVyc1xuICAgICAgICAgICAgX2VuY29kZXJzOiB7XG4gICAgICAgICAgICAgICAgd2VibTogbmV3IFdoYW1teS5WaWRlbygpLFxuICAgICAgICAgICAgICAgIGdpZjogbmV3IEdJRih7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlclNjcmlwdDogJ3NjcmlwdHMvZ2lmLndvcmtlci5qcycsXG4gICAgICAgICAgICAgICAgICAgIHdvcmtlcnM6IHNpZ21hQ29uZmlnLmVuY29kZXJzLmdpZi53b3JrZXJzLFxuICAgICAgICAgICAgICAgICAgICBxdWFsaXR5OiBzaWdtYUNvbmZpZy5lbmNvZGVycy5naWYucXVhbGl0eVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gYSB0ZW1wIGNhbnZhcyB0byBkcmF3IG1lcmdlZCBsYXllcnMgb250b1xuICAgICAgICAgICAgX3RtcENhbnZhczogYW5ndWxhci5lbGVtZW50KCc8Y2FudmFzPicpWzBdLFxuICAgICAgICAgICAgLy8gdGhlIGNhbnZhcyBiYXNlIGxheWVyLCBjcmVhdGVkIHRocm91Z2ggX2J1aWxkQmFzZUxheWVyKClcbiAgICAgICAgICAgIF9iYXNlTGF5ZXI6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgX2Jhc2VMYXllciBjYW52YXMgb2JqZWN0IGJ5IHVzaW5nIGxlYWZsZXRJbWFnZSB0b1xuICAgICAgICAgICAgICogZmxhdHRlbiBhbGwgYmFzZSB0aWxlcyBhbmQgYWRkIHRoZW0gb250byBhIGNhbnZhcy4gRGlzcGxheXMgYSBibG9ja1VJXG4gICAgICAgICAgICAgKiBtZXNzYWdlIHdoaWxlIHJlbmRlcmluZy5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1Byb21pc2V9IFByb21pc2Ugd2l0aCBjYWxsYmFjayB3aGVuIGNhbnZhcyByZXNvbHZlcywgZXJyIGZvciByZWplY3RlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfYnVpbGRCYXNlTGF5ZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmluY2x1ZGVCYXNlTGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RhcnQoJ1JlbmRlcmluZyBiYXNlIGxheWVyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmlzSW5pdGlhbGl6aW5nID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGVhZmxldEltYWdlKGNhbnZhc0ltYWdlT3ZlcmxheS5sYXllci5fbWFwLCBmdW5jdGlvbiAoZXJyLCBjYW52YXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmlzSW5pdGlhbGl6aW5nID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9iYXNlTGF5ZXIgPSBjYW52YXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGNhbnZhcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBubyBuZWVkIHRvIGluY2x1ZGUgdGhlIGxheWVyLCBqdXN0IHJlc29sdmVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENsZWFycyB0aGUgZW5jb2RlciBhbmQgc2F2ZXMgYSBjb3B5IG9mIHRoZSBiYXNlIGxheWVyLlxuICAgICAgICAgICAgICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIGNhbGxiYWNrIHdoZW4gY2FudmFzIHJlc29sdmVzLCBlcnIgZm9yIHJlamVjdGVkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2J1aWxkQmFzZUxheWVyKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENsZWFycyB0aGUgYmFzZSBsYXllciBhbmQgZGVzdHJveXMgYW55IGZyYW1lcyBpbiB0aGUgZW5jb2Rlci5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gdGhpc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX2VuY29kZXJzLndlYm0uZnJhbWVzID0gW107XG4gICAgICAgICAgICAgICAgc2VsZi5fZW5jb2RlcnMuZ2lmLmZyYW1lcyA9IFtdO1xuICAgICAgICAgICAgICAgIHNlbGYuX2Jhc2VMYXllciA9IG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHJpZXZlcyB0aGUgY2FudmFzIGZvciB0aGUgaW1hZ2Ugb3ZlcmxheSBsYXllcnMuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtDYW52YXN9IHRoZSBjYW52YXMgdXNlZCBieSBDYW52YXNJbWFnZU92ZXJsYXlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX2dldE92ZXJsYXlDYW52YXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FudmFzSW1hZ2VPdmVybGF5LmxheWVyLmNhbnZhcygpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTYXZlcyB0aGUgc3RhdGUgb2YgdGhlIGxlYWZsZXQgbWFwIGFzIGEgZnJhbWUgb24gdGhlIGVuY29kZXIuIFRoZVxuICAgICAgICAgICAgICogYmFzZWxheWVyIHNob3VsZCBoYXZlIGJlZW4gc2F2ZWQgcHJpb3IgdG8gdGhpcyBjYWxsLiBUaGUgX3RtcENhbnZhc1xuICAgICAgICAgICAgICogaXMgY2xlYXJlZCwgdGhlIF9iYXNlTGF5ZXIgZHJhd24sIHRoZW4gdGhlIG92ZXJsYXkgbGF5ZXIgZHJhd24uXG4gICAgICAgICAgICAgKiBUaGUgX3RtcENhbnZhcyBpcyBjb252ZXJ0ZWQgdG8gYSBCbG9iIHRoZW4gc2F2ZWQgYXMgYSBmcmFtZSBpblxuICAgICAgICAgICAgICogdGhlIGVuY29kZXIuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IHRoaXNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2FwdHVyZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmlzUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzaXplID0gY2FudmFzSW1hZ2VPdmVybGF5LmxheWVyLl9tYXAuZ2V0U2l6ZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4ID0gc2VsZi5fdG1wQ2FudmFzLmdldENvbnRleHQoJzJkJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IHNpZ21hQ29uZmlnLm1heFBsYXliYWNrRGVsYXkgLSBzdGF0ZVNlcnZpY2UuZ2V0UGxheWJhY2tTcGVlZCgpICsgMTA7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRtcCBjYW52YXMgc2l6ZSB0byBjdXJyZW50IG1hcCBzaXplXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3RtcENhbnZhcy53aWR0aCA9IHNpemUueDtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fdG1wQ2FudmFzLmhlaWdodCA9IHNpemUueTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjbGVhciB0aGUgdG1wIGNhbnZhc1xuICAgICAgICAgICAgICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHNlbGYuX3RtcENhbnZhcy53aWR0aCwgc2VsZi5fdG1wQ2FudmFzLmhlaWdodCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gZHJhdyB0aGUgYmFzZSBsYXllciwgdGhlbiBkcmF3IHRoZSBvdmVybGF5IGxheWVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmluY2x1ZGVCYXNlTGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2Uoc2VsZi5fYmFzZUxheWVyLCAwLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdHguZHJhd0ltYWdlKHNlbGYuX2dldE92ZXJsYXlDYW52YXMoKSwgMCwgMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY29udmVyIHRoZSB0bXAgY2FudmFzIHRvIHdlYnAgYW5kIGFkZCB0byB0aGUgZW5jb2RlclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5lbmNvZGVyID09PSAnZ2lmJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fZW5jb2RlcnMuZ2lmLmFkZEZyYW1lKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3RtcENhbnZhcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y29weTogdHJ1ZSwgZGVsYXk6IGR1cmF0aW9ufVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZWxmLmVuY29kZXIgPT09ICd3ZWJtJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fZW5jb2RlcnMud2VibS5hZGQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdG1wQ2FudmFzLnRvRGF0YVVSTCgnaW1hZ2Uvd2VicCcsIHNpZ21hQ29uZmlnLmVuY29kZXJzLndlYm0ucXVhbGl0eSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpbnZhbGlkIGVuY29kZXIgZm9ybWF0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEhlbHBlciBmdW5jdGlvbiB0byBlbmNvZGUgYW5kIHNhdmUgYSBnaWYuIERpc3BsYXlzIGEgYmxvY2tVSVxuICAgICAgICAgICAgICogbWVzc2FnZSB3aGlsZSBlbmNvZGluZy5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufSByZXNvbHZlIEEgY2FsbGJhY2sgZm9yIHdoZW4gZmluaXNoZWRcbiAgICAgICAgICAgICAqIEBwYXJhbSAge3N0cmluZ30gICBmbmFtZSAgIFRoZSBuYW1lIHRvIHNhdmUgdGhlIGZpbGUgYXNcbiAgICAgICAgICAgICAqIEByZXR1cm4ge2Z1bmN0aW9ufSAgICAgICAgIFRoZSByZXNvbHZlZCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfZW5jb2RlR2lmOiBmdW5jdGlvbiAocmVzb2x2ZSwgZm5hbWUpIHtcbiAgICAgICAgICAgICAgICBibG9ja1VJLnN0YXJ0KCdFbmNvZGluZycpO1xuICAgICAgICAgICAgICAgIHZhciBsYXN0QmxvYixcbiAgICAgICAgICAgICAgICAgICAgdGltZXI7XG5cbiAgICAgICAgICAgICAgICAvLyBhdHRhY2ggZXZlbnQgbGlzdGVuZXIgZm9yIHdoZW4gZmluaXNoZWRcbiAgICAgICAgICAgICAgICBzZWxmLl9lbmNvZGVycy5naWYub24oJ2ZpbmlzaGVkJywgZnVuY3Rpb24gKGJsb2IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGVuY29kZXIgZW1pdHMgYSBmaW5pc2hlZCBldmVudCBvbmNlIG9yIHR3aWNlXG4gICAgICAgICAgICAgICAgICAgIC8vIHNhdmUgd2hlbnZlciBibG9iIHdlIGN1cnJlbnRseSBnZXQgdGhpcyByb3VuZFxuICAgICAgICAgICAgICAgICAgICBsYXN0QmxvYiA9IGJsb2I7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlIHRpbWVyIGlzIGFscmVhZHkgcnVubmluZyBjYW5jZWwgaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBtZWFucyBhbm90aGVyIGZpbmlzaCBldmVudCBoYXMgYWxyZWFkeSBiZWVuIGZpcmVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZCh0aW1lcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhIGdlbmVyb3VzIHRpbWVvdXQgdG8gd2FpdCBmb3IgYWxsIGZpbmlzaGVkIGV2ZW50c1xuICAgICAgICAgICAgICAgICAgICB0aW1lciA9ICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgc2hvdWxkIGJlIHRoZSBsYXN0IGZpbmlzaGVkIGV2ZW50IGNhbGwsIHNhZmUgdG8gc2F2ZVxuICAgICAgICAgICAgICAgICAgICAgICAgRmlsZVNhdmVyLnNhdmVBcyhsYXN0QmxvYiwgZm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tVSS5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGxhc3RCbG9iKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc29tZXRpbWVzIHRoZSBlbmNvZGVyIHRoaW5rcyBpdHMgc3RpbGwgcnVubmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaG9sZCBpdCdzIGhhbmQgYW5kIHRlbGwgaXQgZXZlcnl0aGluZyB3aWxsIGJlIG9rXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9lbmNvZGVycy5naWYuYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMiAqIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gYXR0YWNoIHByb2dyZXNzIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgICAgICAgICAgc2VsZi5fZW5jb2RlcnMuZ2lmLm9uKCdwcm9ncmVzcycsIGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSB0aW1lb3V0IGZvciBhIHNhZmUgJHNjb3BlLiRhcHBseSgpXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrVUkubWVzc2FnZSgnRW5jb2RpbmcgJyArIE1hdGgucm91bmQocCAqIDEwMCkgKyAnJScpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIHN0YXJ0IHRoZSByZW5kZXJpbmdcbiAgICAgICAgICAgICAgICBzZWxmLl9lbmNvZGVycy5naWYucmVuZGVyKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEhlbHBlciBmdW5jdGlvbiB0byBlbmNvZGUgYW5kIHNhdmUgYSB3ZWJtLiBEaXNwbGF5cyBhIGJsb2NrVUlcbiAgICAgICAgICAgICAqIG1lc3NhZ2Ugd2hpbGUgZW5jb2RpbmcuIE5vIHByb2dyZXNzIHVwZGF0ZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbn0gcmVzb2x2ZSBBIGNhbGxiYWNrIGZvciB3aGVuIGZpbmlzaGVkXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtzdHJpbmd9ICAgZm5hbWUgICBUaGUgbmFtZSB0byBzYXZlIHRoZSBmaWxlIGFzXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtmdW5jdGlvbn0gICAgICAgICBUaGUgcmVzb2x2ZWQgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX2VuY29kZVdlYm06IGZ1bmN0aW9uIChyZXNvbHZlLCBmbmFtZSkge1xuICAgICAgICAgICAgICAgIGJsb2NrVUkuc3RhcnQoJ0VuY29kaW5nJyk7XG5cbiAgICAgICAgICAgICAgICBzZWxmLl9lbmNvZGVycy53ZWJtLmNvbXBpbGUoZmFsc2UsIGZ1bmN0aW9uIChibG9iKSB7XG4gICAgICAgICAgICAgICAgICAgIEZpbGVTYXZlci5zYXZlQXMoYmxvYiwgZm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBibG9ja1VJLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShibG9iKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29tcGlsZXMgdGhlIGZyYW1lcyBpbnRvIGEgdmlkZW8gb3IgZ2lmIGFuZCBzYXZlcyBpdCBhcyB0aGUgZ2l2ZW4gZmlsZW5hbWUuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtzdHJpbmd9ICBmbmFtZSBUaGUgZmlsZW5hbWUgdG8gc2F2ZSBhc1xuICAgICAgICAgICAgICogQHJldHVybiB7UHJvbWlzZX0gQSBwcm9taXNlIGZvciB3aGVuIHRoZSB2aWRlbyBmaW5pc2hlcyBlbmNvZGluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBlbmNvZGU6IGZ1bmN0aW9uIChmbmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5lbmNvZGVyID09PSAnZ2lmJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2VuY29kZUdpZihyZXNvbHZlLCBmbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2VsZi5lbmNvZGVyID09PSAnd2VibScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLl9lbmNvZGVXZWJtKHJlc29sdmUsIGZuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGludmFsaWQgZW5jb2RlciBmb3JtYXRcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ3NpZ21hJykuY29udHJvbGxlcignY29ycmVsYXRpb25Db250cm9sQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkbG9jYXRpb24sXG4gICAgICAgIHNpZ21hQ29uZmlnLFxuICAgICAgICBzdGF0ZVNlcnZpY2UsXG4gICAgICAgIGFuYWx5emVTZXJ2aWNlLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICBsZWFmbGV0RGF0YSxcbiAgICAgICAgTCxcbiAgICAgICAgdG9hc3RyLFxuICAgICAgICBsb2NhbFN0b3JhZ2UsXG4gICAgICAgIF8sXG4gICAgICAgIE1vdXNlRXZlbnRcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpLFxuICAgICAgICAgICAgYmFuZHMgPSBfLmNsb25lRGVlcChzaWdtYUNvbmZpZy5iYW5kcyksXG4gICAgICAgICAgICBzZWxlY3RlZEJhbmQgPSBxcy5iYW5kID8gXy5maW5kV2hlcmUoYmFuZHMsIHtuYW1lOiBxcy5iYW5kfSkgOiBfLmZpbmRXaGVyZShiYW5kcywge2RlZmF1bHQ6IHRydWV9KSxcbiAgICAgICAgICAgIG1hcmtlckZlYXR1cmVHcm91cCA9IHN0YXRlU2VydmljZS5nZXRNYXJrZXJGZWF0dXJlR3JvdXAoKSxcbiAgICAgICAgICAgIGVkaXRNb2RlID0gJycsXG4gICAgICAgICAgICByZWNlbnRDb3JyZWxhdGlvbnMgPSBbXTtcblxuICAgICAgICB2bS5zdGF0ZVNlcnZpY2UgPSBzdGF0ZVNlcnZpY2U7XG4gICAgICAgIHZtLm1hcmtlclRpdGxlID0gYmFuZHMubGVuZ3RoID4gMSA/ICdDb3JyZWxhdGlvbiAtICcgKyBzZWxlY3RlZEJhbmQudGl0bGUgOiAnQ29ycmVsYXRpb24nO1xuXG4gICAgICAgIC8vIHJlbW92ZSBhbnkgZXhpc3RpbmcgcG9pbnQgY29udmVydGVyIGRhdGFcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3JlY2VudENvcnJlbGF0aW9ucycpO1xuXG4gICAgICAgIEwuRHJhdy5Db3JyZWxhdGlvbiA9IEwuRHJhdy5NYXJrZXIuZXh0ZW5kKHtcbiAgICAgICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uIChtYXAsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnR5cGUgPSAnY29ycmVsYXRpb24nO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMucmVwZWF0TW9kZSA9IHNpZ21hQ29uZmlnLmNvcnJlbGF0aW9uTWFya2VyT3B0aW9ucy5yZXBlYXRNb2RlO1xuICAgICAgICAgICAgICAgIEwuRHJhdy5GZWF0dXJlLnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgbWFwLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICAgICAgYWRkSG9va3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBMLkRyYXcuTWFya2VyLnByb3RvdHlwZS5hZGRIb29rcy5jYWxsKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fbWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3Rvb2x0aXAudXBkYXRlQ29udGVudCh7IHRleHQ6ICdDbGljayBtYXAgdG8gY29ycmVsYXRlIHBvaW50JyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBncmVlbk1hcmtlciA9IEwuaWNvbih7XG4gICAgICAgICAgICBpY29uVXJsOiAnLi9zdHlsZXNoZWV0cy9pbWFnZXMvbWFya2VyLWljb24tZ3JlZW4ucG5nJyxcbiAgICAgICAgICAgIHNoYWRvd1VybDogJy4vc3R5bGVzaGVldHMvaW1hZ2VzL21hcmtlci1zaGFkb3cucG5nJyxcbiAgICAgICAgICAgIGljb25BbmNob3I6IFsxMiwgNDFdXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZtLmNvcnJlbGF0ZVBvaW50ID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGJsb2NrVUkuc3RhcnQoJ0NvcnJlbGF0aW5nIFBvaW50Jyk7XG5cbiAgICAgICAgICAgIHZhciB0aW1lID0gc3RhdGVTZXJ2aWNlLmdldFRlbXBvcmFsRmlsdGVyKCk7XG4gICAgICAgICAgICB2YXIgc3RhcnQgPSB0aW1lLnN0YXJ0O1xuICAgICAgICAgICAgdmFyIHN0b3AgPSB0aW1lLnN0b3A7XG4gICAgICAgICAgICB2YXIgbGF0bG5nID0gZS5sYXllci5nZXRMYXRMbmcoKTtcblxuICAgICAgICAgICAgYW5hbHl6ZVNlcnZpY2UuY29ycmVsYXRlUG9pbnQobGF0bG5nLmxhdCwgbGF0bG5nLmxuZywgc3RhcnQsIHN0b3AsICdiYXNlNjQnKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29ycmVsYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgICAgICAgc3RvcDogc3RvcCxcbiAgICAgICAgICAgICAgICAgICAgbGF0bG5nOiBsYXRsbmcsXG4gICAgICAgICAgICAgICAgICAgIGJib3g6IHN0YXRlU2VydmljZS5nZXRCYm94KCksXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHJlc3VsdC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICBmcmFtZUV4dGVudHM6IHN0YXRlU2VydmljZS5nZXRGcmFtZUV4dGVudHMoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVjZW50Q29ycmVsYXRpb25zLnVuc2hpZnQoY29ycmVsYXRpb24pO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyZWNlbnRDb3JyZWxhdGlvbnMnLCBKU09OLnN0cmluZ2lmeShyZWNlbnRDb3JyZWxhdGlvbnMpKTtcbiAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q29ycmVsYXRpb25EYXRhKGNvcnJlbGF0aW9uKTtcbiAgICAgICAgICAgICAgICBibG9ja1VJLnN0b3AoKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGJsb2NrVUkucmVzZXQoKTtcbiAgICAgICAgICAgICAgICB0b2FzdHIuZXJyb3IoZXJyb3IsICdBUEkgRXJyb3InKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLmluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uIChtYXApIHtcbiAgICAgICAgICAgICAgICB2YXIgbWFya2VyID0gbmV3IEwuRHJhdy5Db3JyZWxhdGlvbihtYXAsIHsgaWNvbjogZ3JlZW5NYXJrZXIgfSk7XG5cbiAgICAgICAgICAgICAgICBtYXJrZXJGZWF0dXJlR3JvdXAuYWRkVG8obWFwKTtcblxuICAgICAgICAgICAgICAgIEwuZWFzeUJ1dHRvbignPGkgY2xhc3M9XCJmYSBmYS1tYXAtbWFya2VyIGNvcnJlbGF0aW9uLWNvbnRyb2xcIj48L2k+JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuZW5hYmxlKCk7XG4gICAgICAgICAgICAgICAgfSkuYWRkVG8obWFwKTtcblxuICAgICAgICAgICAgICAgIG1hcC5vbignZHJhdzpjcmVhdGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUubGF5ZXJUeXBlID09PSAnY29ycmVsYXRpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXIgPSBlLmxheWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJib3ggPSBzdGF0ZVNlcnZpY2UuZ2V0QmJveCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3ID0gTC5sYXRMbmcoYmJveC5zb3V0aCwgYmJveC53ZXN0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZSA9IEwubGF0TG5nKGJib3gubm9ydGgsIGJib3guZWFzdCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gTC5sYXRMbmdCb3VuZHMoc3csIG5lKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIG1hcmtlciB3YXMgcGxhY2VkIGluc2lkZSBBT0lcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChib3VuZHMuY29udGFpbnMoZS5sYXllci5nZXRMYXRMbmcoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXJGZWF0dXJlR3JvdXAuYWRkTGF5ZXIobGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlZGl0TW9kZSAhPT0gJ2RlbGV0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb3JyZWxhdGlvblBvaW50ID0gXy5maW5kKHJlY2VudENvcnJlbGF0aW9ucywgJ2xhdGxuZycsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IGUubGF0bG5nLmxhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGUubGF0bG5nLmxuZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29ycmVsYXRpb25Qb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlbGF0aW9uUG9pbnQuc291cmNlRXZlbnQgPSBuZXcgTW91c2VFdmVudCgnY2xpY2snLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd2aWV3Jzogd2luZG93LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnYnViYmxlcyc6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjYW5jZWxhYmxlJzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0Q29ycmVsYXRpb25EYXRhKGNvcnJlbGF0aW9uUG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm0uY29ycmVsYXRlUG9pbnQoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvYXN0ci5lcnJvcignTWFya2VyIG11c3QgYmUgcGxhY2VkIHdpdGhpbiBBT0knKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbWFwLm9uKCdkcmF3OmRlbGV0ZXN0YXJ0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBlZGl0TW9kZSA9ICdkZWxldGUnO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbWFwLm9uKCdkcmF3OmRlbGV0ZXN0b3AnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGVkaXRNb2RlID0gJyc7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzaWdtYUNvbmZpZy5jb21wb25lbnRzLm1hcC5jb250cm9scy5jb3JyZWxhdGlvbiAmJiAkc2NvcGUuJHBhcmVudC5tb2RlID09PSAnYW5hbHl6ZScpIHtcbiAgICAgICAgICAgIHZtLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFDb3JyZWxhdGlvbkNvbnRyb2wnLCBmdW5jdGlvbiAoJHRvb2x0aXAsIGxlYWZsZXREYXRhKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ2NvcnJlbGF0aW9uQ29udHJvbENvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBidG4gPSBhbmd1bGFyLmVsZW1lbnQoJy5jb3JyZWxhdGlvbi1jb250cm9sJykucGFyZW50KCkucGFyZW50KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ0bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0b29sdGlwKGJ0biwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBzY29wZS52bS5tYXJrZXJUaXRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdhdXRvIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXI6ICdib2R5J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmNvbnRyb2xsZXIoJ3BvaW50Q29udmVydGVyQ29udHJvbENvbnRyb2xsZXInLCBmdW5jdGlvbiAoXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICBzaWdtYUNvbmZpZyxcbiAgICAgICAgc3RhdGVTZXJ2aWNlLFxuICAgICAgICBzaWdtYVNlcnZpY2UsXG4gICAgICAgIGFuYWx5emVTZXJ2aWNlLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICBsZWFmbGV0RGF0YSxcbiAgICAgICAgTCxcbiAgICAgICAgdG9hc3RyLFxuICAgICAgICBsb2NhbFN0b3JhZ2UsXG4gICAgICAgIF8sXG4gICAgICAgIE1vdXNlRXZlbnRcbiAgICApIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcyxcbiAgICAgICAgICAgIHFzID0gJGxvY2F0aW9uLnNlYXJjaCgpLFxuICAgICAgICAgICAgYmFuZHMgPSBfLmNsb25lRGVlcChzaWdtYUNvbmZpZy5iYW5kcyksXG4gICAgICAgICAgICBzZWxlY3RlZEJhbmQgPSBxcy5iYW5kID8gXy5maW5kV2hlcmUoYmFuZHMsIHtuYW1lOiBxcy5iYW5kfSkgOiBfLmZpbmRXaGVyZShiYW5kcywge2RlZmF1bHQ6IHRydWV9KSxcbiAgICAgICAgICAgIGluY2x1ZGVNdWx0aWJhbmQgPSBiYW5kcy5sZW5ndGggPiAxLFxuICAgICAgICAgICAgbWFya2VyRmVhdHVyZUdyb3VwID0gc3RhdGVTZXJ2aWNlLmdldE1hcmtlckZlYXR1cmVHcm91cCgpLFxuICAgICAgICAgICAgZWRpdE1vZGUgPSAnJyxcbiAgICAgICAgICAgIHJlY2VudFBvaW50cyA9IFtdO1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcbiAgICAgICAgdm0ubWFya2VyVGl0bGUgPSBiYW5kcy5sZW5ndGggPiAxID8gJ1BvaW50IENvbnZlcnRlciAtICcgKyBzZWxlY3RlZEJhbmQudGl0bGUgOiAnUG9pbnQgQ29udmVydGVyJztcblxuICAgICAgICAvLyByZW1vdmUgYW55IGV4aXN0aW5nIHBvaW50IGNvbnZlcnRlciBkYXRhXG4gICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdyZWNlbnRQb2ludHMnKTtcblxuICAgICAgICAvLyBzZXQgaWNvbiBpbWFnZXBhdGhcbiAgICAgICAgTC5JY29uLkRlZmF1bHQuaW1hZ2VQYXRoID0gJy4vc3R5bGVzaGVldHMvaW1hZ2VzLyc7XG5cbiAgICAgICAgLy8gc2luZ2xlIGJhbmQgY29udHJvbFxuICAgICAgICBMLkRyYXcuUG9pbnRjb252ZXJ0ZXIgPSBMLkRyYXcuTWFya2VyLmV4dGVuZCh7XG4gICAgICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAobWFwLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50eXBlID0gJ3BvaW50Y29udmVydGVyJztcbiAgICAgICAgICAgICAgICBvcHRpb25zLnJlcGVhdE1vZGUgPSBzaWdtYUNvbmZpZy5wb2ludGNvbnZlcnRlck1hcmtlck9wdGlvbnMucmVwZWF0TW9kZTtcbiAgICAgICAgICAgICAgICBMLkRyYXcuRmVhdHVyZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG1hcCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhZGRIb29rczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEwuRHJhdy5NYXJrZXIucHJvdG90eXBlLmFkZEhvb2tzLmNhbGwodGhpcyk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fbWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3Rvb2x0aXAudXBkYXRlQ29udGVudCh7IHRleHQ6ICdDbGljayBtYXAgdG8gYW5hbHl6ZSB0aW1lL2ludGVuc2l0eScgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBtdWx0aWJhbmQgY29udHJvbFxuICAgICAgICB2YXIgcmVkTWFya2VyID0gTC5pY29uKHtcbiAgICAgICAgICAgIGljb25Vcmw6ICcuL3N0eWxlc2hlZXRzL2ltYWdlcy9tYXJrZXItaWNvbi1yZWQucG5nJyxcbiAgICAgICAgICAgIHNoYWRvd1VybDogJy4vc3R5bGVzaGVldHMvaW1hZ2VzL21hcmtlci1zaGFkb3cucG5nJyxcbiAgICAgICAgICAgIGljb25BbmNob3I6IFsxMiwgNDFdXG4gICAgICAgIH0pO1xuXG4gICAgICAgIEwuRHJhdy5Qb2ludGNvbnZlcnRlck11bHRpYmFuZCA9IEwuRHJhdy5NYXJrZXIuZXh0ZW5kKHtcbiAgICAgICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uIChtYXAsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnR5cGUgPSAncG9pbnRjb252ZXJ0ZXItbXVsdGliYW5kJztcbiAgICAgICAgICAgICAgICBvcHRpb25zLnJlcGVhdE1vZGUgPSBzaWdtYUNvbmZpZy5wb2ludGNvbnZlcnRlck1hcmtlck9wdGlvbnMucmVwZWF0TW9kZTtcbiAgICAgICAgICAgICAgICBMLkRyYXcuRmVhdHVyZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG1hcCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhZGRIb29rczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEwuRHJhdy5NYXJrZXIucHJvdG90eXBlLmFkZEhvb2tzLmNhbGwodGhpcyk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fbWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3Rvb2x0aXAudXBkYXRlQ29udGVudCh7dGV4dDogJ0NsaWNrIG1hcCB0byBhbmFseXplIHRpbWUvaW50ZW5zaXR5IGFjcm9zcyBhbGwgYmFuZHMnfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2bS5hbmFseXplQ3ViZSA9IGZ1bmN0aW9uIChlLCBpc011bHRpYmFuZCkge1xuICAgICAgICAgICAgYmxvY2tVSS5zdGFydCgnQW5hbHl6aW5nIERhdGEnKTtcblxuICAgICAgICAgICAgdmFyIHRpbWUgPSBzdGF0ZVNlcnZpY2UuZ2V0VGVtcG9yYWxGaWx0ZXIoKSxcbiAgICAgICAgICAgICAgICBzdGFydCA9IHRpbWUuc3RhcnQsXG4gICAgICAgICAgICAgICAgc3RvcCA9IHRpbWUuc3RvcCxcbiAgICAgICAgICAgICAgICBsYXRsbmcgPSBlLmxheWVyLmdldExhdExuZygpLFxuICAgICAgICAgICAgICAgIGJhbmQgPSBpc011bHRpYmFuZCA/ICdhbGwnIDogc2VsZWN0ZWRCYW5kLm5hbWUsXG4gICAgICAgICAgICAgICAgc2Vuc29yID0gc3RhdGVTZXJ2aWNlLmdldFNlbnNvcigpO1xuXG4gICAgICAgICAgICBhbmFseXplU2VydmljZS5jb252ZXJ0UG9pbnQobGF0bG5nLmxhdCwgbGF0bG5nLmxuZywgc3RhcnQsIHN0b3AsIGJhbmQsIHNlbnNvcikudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmVjZW50UG9pbnRzLnVuc2hpZnQoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHQsXG4gICAgICAgICAgICAgICAgICAgIGZyYW1lRXh0ZW50czogc3RhdGVTZXJ2aWNlLmdldEZyYW1lRXh0ZW50cygpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JlY2VudFBvaW50cycsIEpTT04uc3RyaW5naWZ5KHJlY2VudFBvaW50cykpO1xuICAgICAgICAgICAgICAgIHN0YXRlU2VydmljZS5zZXRQb2ludENvbnZlcnRlckRhdGEocmVzdWx0KTtcbiAgICAgICAgICAgICAgICBibG9ja1VJLnN0b3AoKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGJsb2NrVUkucmVzZXQoKTtcbiAgICAgICAgICAgICAgICB0b2FzdHIuZXJyb3IoZXJyb3IsICdBUEkgRXJyb3InKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZtLnBsYWNlTWFya2VyID0gZnVuY3Rpb24gKGUsIGlzTXVsdGliYW5kKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSBlLmxheWVyLFxuICAgICAgICAgICAgICAgIGJib3ggPSBzdGF0ZVNlcnZpY2UuZ2V0QmJveCgpLFxuICAgICAgICAgICAgICAgIGJvdW5kcyA9IEwubGF0TG5nQm91bmRzKHNpZ21hU2VydmljZS5nZXREREJvdW5kcyhiYm94KSk7XG5cbiAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSBtYXJrZXIgd2FzIHBsYWNlZCBpbnNpZGUgQU9JXG4gICAgICAgICAgICBpZiAoYm91bmRzLmNvbnRhaW5zKGUubGF5ZXIuZ2V0TGF0TG5nKCkpKSB7XG4gICAgICAgICAgICAgICAgbWFya2VyRmVhdHVyZUdyb3VwLmFkZExheWVyKGxheWVyKTtcbiAgICAgICAgICAgICAgICBsYXllci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWRpdE1vZGUgIT09ICdkZWxldGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaG93IHRpbWUvaW50ZW5zaXR5IGRhdGEgZm9yIHRoaXMgcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwb2ludCA9IF8uZmluZChyZWNlbnRQb2ludHMsICdkYXRhLnBvaW50Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhdDogZS5sYXRsbmcubGF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvbjogZS5sYXRsbmcubG5nXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50LmRhdGEuc291cmNlRXZlbnQgPSBuZXcgTW91c2VFdmVudCgnY2xpY2snLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd2aWV3Jzogd2luZG93LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnYnViYmxlcyc6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjYW5jZWxhYmxlJzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0UG9pbnRDb252ZXJ0ZXJEYXRhKHBvaW50LmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdm0uYW5hbHl6ZUN1YmUoZSwgaXNNdWx0aWJhbmQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b2FzdHIuZXJyb3IoJ01hcmtlciBtdXN0IGJlIHBsYWNlZCB3aXRoaW4gQU9JJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdm0uaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxlYWZsZXREYXRhLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24gKG1hcCkge1xuICAgICAgICAgICAgICAgIHZhciBtYXJrZXIgPSBuZXcgTC5EcmF3LlBvaW50Y29udmVydGVyKG1hcCwge30pLFxuICAgICAgICAgICAgICAgICAgICBtYXJrZXJNdWx0aWJhbmQgPSBuZXcgTC5EcmF3LlBvaW50Y29udmVydGVyTXVsdGliYW5kKG1hcCwgeyBpY29uOiByZWRNYXJrZXIgfSk7XG5cbiAgICAgICAgICAgICAgICBtYXJrZXJGZWF0dXJlR3JvdXAuYWRkVG8obWFwKTtcblxuICAgICAgICAgICAgICAgIHZhciBidG5TaW5nbGVCYW5kID0gTC5lYXN5QnV0dG9uKCc8aSBjbGFzcz1cImZhIGZhLW1hcC1tYXJrZXIgcG9pbnRjb252ZXJ0ZXItY29udHJvbFwiPjwvaT4nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5lbmFibGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHZhciBidG5NdWx0aWJhbmQgPSBMLmVhc3lCdXR0b24oJzxpIGNsYXNzPVwiZmEgZmEtbWFwLW1hcmtlciBwb2ludGNvbnZlcnRlci1jb250cm9sLW11bHRpYmFuZFwiPjwvaT4nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlck11bHRpYmFuZC5lbmFibGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHZhciBiYXJBcnJheSA9IGluY2x1ZGVNdWx0aWJhbmQgPyBbYnRuU2luZ2xlQmFuZCwgYnRuTXVsdGliYW5kXSA6IFtidG5TaW5nbGVCYW5kXTtcblxuICAgICAgICAgICAgICAgIEwuZWFzeUJhcihiYXJBcnJheSkuYWRkVG8obWFwKTtcblxuICAgICAgICAgICAgICAgIG1hcC5vbignZHJhdzpjcmVhdGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUubGF5ZXJUeXBlID09PSAncG9pbnRjb252ZXJ0ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5wbGFjZU1hcmtlcihlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5sYXllclR5cGUgPT09ICdwb2ludGNvbnZlcnRlci1tdWx0aWJhbmQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5wbGFjZU1hcmtlcihlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbWFwLm9uKCdkcmF3OmRlbGV0ZXN0YXJ0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBlZGl0TW9kZSA9ICdkZWxldGUnO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbWFwLm9uKCdkcmF3OmRlbGV0ZXN0b3AnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGVkaXRNb2RlID0gJyc7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2lnbWFDb25maWcuY29tcG9uZW50cy5tYXAuY29udHJvbHMucG9pbnRjb252ZXJ0ZXIgJiYgJHNjb3BlLiRwYXJlbnQubW9kZSA9PT0gJ2FuYWx5emUnKSB7XG4gICAgICAgICAgICB2bS5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFQb2ludENvbnZlcnRlckNvbnRyb2wnLCBmdW5jdGlvbiAoJHRvb2x0aXAsIGxlYWZsZXREYXRhKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ3BvaW50Q29udmVydGVyQ29udHJvbENvbnRyb2xsZXInLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBpbmNsdWRlTXVsdGliYW5kOiAnPSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgICAgICBsZWFmbGV0RGF0YS5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBvaW50QnRuID0gYW5ndWxhci5lbGVtZW50KCcucG9pbnRjb252ZXJ0ZXItY29udHJvbCcpLnBhcmVudCgpLnBhcmVudCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFuZEJ0biA9IGFuZ3VsYXIuZWxlbWVudCgnLnBvaW50Y29udmVydGVyLWNvbnRyb2wtbXVsdGliYW5kJykucGFyZW50KCkucGFyZW50KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvaW50QnRuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHRvb2x0aXAocG9pbnRCdG4sIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogc2NvcGUudm0ubWFya2VyVGlsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdhdXRvIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXI6ICdib2R5J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFuZEJ0bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0b29sdGlwKGJhbmRCdG4sIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1BvaW50IENvbnZlcnRlciAtIEFsbCBCYW5kcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnYXV0byByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb250cm9sbGVyKCdyZWN0YW5nbGVDb250cm9sQ29udHJvbGxlcicsIGZ1bmN0aW9uIChcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkdGltZW91dCxcbiAgICAgICAgc2lnbWFDb25maWcsXG4gICAgICAgIHN0YXRlU2VydmljZSxcbiAgICAgICAgc2lnbWFTZXJ2aWNlLFxuICAgICAgICBjb29yZGluYXRlQ29udmVyc2lvblNlcnZpY2UsXG4gICAgICAgIGFuYWx5emVTZXJ2aWNlLFxuICAgICAgICBibG9ja1VJLFxuICAgICAgICBsZWFmbGV0RGF0YSxcbiAgICAgICAgTFxuICAgICkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzLFxuICAgICAgICAgICAgYmJveEZlYXR1cmVHcm91cCA9IHN0YXRlU2VydmljZS5nZXRCYm94RmVhdHVyZUdyb3VwKCksXG4gICAgICAgICAgICBlZGl0TW9kZSA9ICcnLFxuICAgICAgICAgICAgY3Vyck1hcCA9IHt9O1xuXG4gICAgICAgIHZtLnN0YXRlU2VydmljZSA9IHN0YXRlU2VydmljZTtcblxuICAgICAgICB2bS5yZWRyYXdSZWN0ID0gZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gICAgICAgICAgICBpZiAoYmJveEZlYXR1cmVHcm91cCkge1xuICAgICAgICAgICAgICAgIGJib3hGZWF0dXJlR3JvdXAuY2xlYXJMYXllcnMoKTtcbiAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uLm5vcnRoIHx8IGxvY2F0aW9uLm1ncnNORSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJvdW5kcyA9IHNpZ21hU2VydmljZS5nZXREREJvdW5kcyhsb2NhdGlvbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhIHJlY3RhbmdsZVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlY3QgPSBMLnJlY3RhbmdsZShib3VuZHMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJyMwMDAwZmYnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw6ICcjMDAwMGZmJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxsT3BhY2l0eTogJHNjb3BlLiRwYXJlbnQubW9kZSA9PT0gJ3NlYXJjaCcgPyAwLjI1IDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZWlnaHQ6IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBiYm94RmVhdHVyZUdyb3VwLmFkZExheWVyKHJlY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gem9vbSB0aGUgbWFwIHRvIHRoZSByZWN0YW5nbGUgYm91bmRzXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJNYXAgJiYgYm91bmRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJNYXAuZml0Qm91bmRzKGJvdW5kcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2bS5pbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAobWFwKSB7XG4gICAgICAgICAgICAgICAgY3Vyck1hcCA9IG1hcDtcblxuICAgICAgICAgICAgICAgIHZhciByZWN0YW5nbGUgPSBuZXcgTC5EcmF3LlJlY3RhbmdsZShtYXApO1xuXG4gICAgICAgICAgICAgICAgYmJveEZlYXR1cmVHcm91cC5hZGRUbyhtYXApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuJHBhcmVudC5tb2RlID09PSAnc2VhcmNoJykge1xuICAgICAgICAgICAgICAgICAgICBMLmVhc3lCdXR0b24oJzxpIGNsYXNzPVwiZmEgZmEtc3RvcCByZWN0YW5nbGUtY29udHJvbFwiPjwvaT4nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWN0YW5nbGUuZW5hYmxlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pLmFkZFRvKG1hcCk7XG5cbiAgICAgICAgICAgICAgICAgICAgbWFwLm9uKCdkcmF3OmNyZWF0ZWQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxheWVyID0gZS5sYXllcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLmxheWVyVHlwZSA9PT0gJ3JlY3RhbmdsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBlcmFzZSBleGlzdGluZyBiYm94IGlmIG5lY2Vzc2FyeVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiYm94RmVhdHVyZUdyb3VwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJib3hGZWF0dXJlR3JvdXAuY2xlYXJMYXllcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLmNsZWFyQU9JKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJib3hGZWF0dXJlR3JvdXAuYWRkTGF5ZXIobGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBib3VuZHMgPSBsYXllci5nZXRCb3VuZHMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2Uuc2V0QmJveFBhcmFtcyh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogJ2RkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9ydGg6IGJvdW5kcy5fbm9ydGhFYXN0LmxhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWFzdDogYm91bmRzLl9ub3J0aEVhc3QubG5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3V0aDogYm91bmRzLl9zb3V0aFdlc3QubGF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZXN0OiBib3VuZHMuX3NvdXRoV2VzdC5sbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnNORTogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ncnNTVzogJydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgbWFwLm9uKCdkcmF3OmVkaXRlZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLiRwYXJlbnQubW9kZSA9PT0gJ3NlYXJjaCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXIgPSBlLmxheWVycy5nZXRMYXllcnMoKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYm91bmRzID0gbGF5ZXIuZ2V0Qm91bmRzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVTZXJ2aWNlLnNldEJib3hQYXJhbXMoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6ICdkZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vcnRoOiBib3VuZHMuX25vcnRoRWFzdC5sYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVhc3Q6IGJvdW5kcy5fbm9ydGhFYXN0LmxuZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291dGg6IGJvdW5kcy5fc291dGhXZXN0LmxhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2VzdDogYm91bmRzLl9zb3V0aFdlc3QubG5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzTkU6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZ3JzU1c6ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIG1hcC5vbignZHJhdzpkZWxldGVzdGFydCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRNb2RlID0gJ2RlbGV0ZSc7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIG1hcC5vbignZHJhdzpkZWxldGVzdG9wJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRpdE1vZGUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgbWFwLm9uKCdkcmF3OmRlbGV0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYm94RmVhdHVyZUdyb3VwLmNsZWFyTGF5ZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZVNlcnZpY2UuY2xlYXJBT0koKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGJiID0gc3RhdGVTZXJ2aWNlLmdldEJib3goKTtcbiAgICAgICAgICAgICAgICB2bS5yZWRyYXdSZWN0KGJiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHNpZ21hQ29uZmlnLmNvbXBvbmVudHMubWFwLmNvbnRyb2xzLnJlY3RhbmdsZSkge1xuICAgICAgICAgICAgdm0uaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbigndm0uc3RhdGVTZXJ2aWNlLmdldEJib3goKScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMobmV3VmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZtLnJlZHJhd1JlY3QobmV3VmFsdWUpO1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdzaWdtYScpLmRpcmVjdGl2ZSgnc2lnbWFSZWN0YW5nbGVDb250cm9sJywgZnVuY3Rpb24gKCR0b29sdGlwLCBsZWFmbGV0RGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdyZWN0YW5nbGVDb250cm9sQ29udHJvbGxlcicsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBzY29wZToge30sXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGVhZmxldERhdGEuZ2V0TWFwKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBidG4gPSBhbmd1bGFyLmVsZW1lbnQoJy5yZWN0YW5nbGUtY29udHJvbCcpLnBhcmVudCgpLnBhcmVudCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChidG4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkdG9vbHRpcChidG4sIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FPSScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnYXV0byByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnc2lnbWEnKS5jb25maWcoZnVuY3Rpb24oJHByb3ZpZGUpe1xuICAgICAgICAkcHJvdmlkZS5kZWNvcmF0b3IoJyRodHRwQmFja2VuZCcsIGFuZ3VsYXIubW9jay5lMmUuJGh0dHBCYWNrZW5kRGVjb3JhdG9yKTtcbiAgICB9KS5ydW4oZnVuY3Rpb24oJGh0dHBCYWNrZW5kLCBkMywgc2lnbWFDb25maWcsIFhNTEh0dHBSZXF1ZXN0KXtcblxuICAgICAgICB2YXIgZ2V0U3luYyA9IGZ1bmN0aW9uKHVybCl7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgcmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcbiAgICAgICAgICAgIHJlcXVlc3Quc2VuZChudWxsKTtcbiAgICAgICAgICAgIHJldHVybiBbcmVxdWVzdC5zdGF0dXMsIHJlcXVlc3QucmVzcG9uc2UsIHt9XTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY292ZXJhZ2VPdmVycmlkZVVybCA9ICdtb2Nrcy9kYXRhL2NvdmVyYWdlLmpzb24nO1xuICAgICAgICB2YXIgcG9pbnRBbmFseXNpc1VybCA9ICdtb2Nrcy9kYXRhL3BvaW50Q29udmVydGVyLmpzb24nO1xuICAgICAgICB2YXIgYWdncmVnYXRlRGF5VXJsID0gJ21vY2tzL2RhdGEvYWdncmVnYXRlX2RheS5qc29uJztcbiAgICAgICAgdmFyIGFnZ3JlZ2F0ZUhvdXJVcmwgPSAnbW9ja3MvZGF0YS9hZ2dyZWdhdGVfaG91ci5qc29uJztcbiAgICAgICAgdmFyIG92ZXJsYXlVcmwgPSAnbW9ja3MvZGF0YS9vdmVybGF5Lmpzb24nO1xuXG4gICAgICAgIHZhciBhZ2dyZWdhdGVSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgc2lnbWFDb25maWcudXJscy5hZ2dyZWdhdGUsICdpJyk7XG4gICAgICAgIHZhciBjb3ZlcmFnZVJlZ2V4ID0gbmV3IFJlZ0V4cCgnXicgKyBzaWdtYUNvbmZpZy51cmxzLmNvdmVyYWdlLCAnaScpO1xuICAgICAgICB2YXIgb3ZlcmxheXNSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgc2lnbWFDb25maWcudXJscy5vdmVybGF5cywgJ2knKTtcbiAgICAgICAgdmFyIHBvaW50QW5hbHlzaXNSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgc2lnbWFDb25maWcudXJscy5wb2ludGNvbnZlcnRlciwgJ2knKTtcblxuICAgICAgICBzaWdtYUNvbmZpZy5vdmVybGF5UHJlZml4ID0gJ2h0dHA6Ly8xMjcuMC4wLjE6MzAwMC8nO1xuXG4gICAgICAgIC8vIFRlbXBsYXRlcyByZXF1ZXN0cyBtdXN0IHBhc3MgdGhyb3VnaFxuICAgICAgICAkaHR0cEJhY2tlbmQud2hlbkdFVCgvaHRtbCQvKS5wYXNzVGhyb3VnaCgpO1xuXG4gICAgICAgIC8vIEFnZ3JlZ2F0ZSBzZXJ2aWNlXG4gICAgICAgIC8vJGh0dHBCYWNrZW5kLndoZW5HRVQoYWdncmVnYXRlUmVnZXgpLnBhc3NUaHJvdWdoKCk7XG4gICAgICAgICRodHRwQmFja2VuZC53aGVuR0VUKGFnZ3JlZ2F0ZVJlZ2V4KS5yZXNwb25kKGZ1bmN0aW9uKG1ldGhvZCwgdXJsKSB7XG4gICAgICAgICAgICBpZih1cmwuaW5kZXhPZignZ3JvdXBfYnk9ZGF5JykgPiAtMSApe1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRTeW5jKGFnZ3JlZ2F0ZURheVVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3luYyhhZ2dyZWdhdGVIb3VyVXJsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gY292ZXJhZ2Ugc2VydmljZVxuICAgICAgICAvLyRodHRwQmFja2VuZC53aGVuR0VUKGNvdmVyYWdlUmVnZXgpLnBhc3NUaHJvdWdoKCk7XG4gICAgICAgICRodHRwQmFja2VuZC53aGVuR0VUKGNvdmVyYWdlUmVnZXgpLnJlc3BvbmQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3luYyhjb3ZlcmFnZU92ZXJyaWRlVXJsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gb3ZlcmxheXMgc2VydmljZVxuICAgICAgICAvLyRodHRwQmFja2VuZC53aGVuR0VUKG92ZXJsYXlzUmVnZXgpLnBhc3NUaHJvdWdoKCk7XG4gICAgICAgICRodHRwQmFja2VuZC53aGVuR0VUKG92ZXJsYXlzUmVnZXgpLnJlc3BvbmQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3luYyhvdmVybGF5VXJsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcG9pbnQgYW5hbHlzaXMgc2VydmljZVxuICAgICAgICAvLyRodHRwQmFja2VuZC53aGVuR0VUKHBvaW50QW5hbHlzaXNSZWdleCkucGFzc1Rocm91Z2goKTtcbiAgICAgICAgJGh0dHBCYWNrZW5kLndoZW5HRVQocG9pbnRBbmFseXNpc1JlZ2V4KS5yZXNwb25kKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3luYyhwb2ludEFuYWx5c2lzVXJsKTtcbiAgICAgICAgfSk7XG5cblxuICAgIH0pO1xufSkoKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
