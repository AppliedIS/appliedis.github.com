import React, {PropTypes} from 'react';
import L from 'leaflet';
import 'drmonty-leaflet-awesome-markers';

import PlaybackControl from '../playback/PlaybackControl';
import TimelineControl from '../timeline/TimelineControl';

const defaultMapConfig = {
    options: {
        center: [
            39.7589, -84.1916
        ],
        zoomControl: false,
        zoom: 4,
        maxZoom: 20,
        minZoom: 2,
        scrollwheel: false,
        infoControl: false,
        attributionControl: false
    },
    tileLayer: {
        uri: 'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
        options: {
            maxZoom: 18,
            id: ''
        }
    }
};

const timelineHeight = 90;

const markerIcon = L.AwesomeMarkers.icon({
    icon: 'area-chart',
    prefix: 'fa',
    markerColor: 'cadetblue',
    extraClasses: 'fading-marker'
});

const markerIconSelected = L.AwesomeMarkers.icon({
    icon: 'area-chart',
    prefix: 'fa',
    markerColor: 'green',
    extraClasses: 'fading-marker'
});


class PlaybackMap extends React.Component {
    constructor(props, context) {
        super(props, context);

        let temporal = props.data && props.data.length > 0 && props.data[0].hasOwnProperty('time');
        this.state = {
            activeIndex: 0,
            timestep: 1,
            timeScale: 1,
            temporal,
            sortedData: temporal ? props.data.concat().sort((a, b) => new Date(a.time) - new Date(b.time)) : props.data ? props.data : []
        };

        this.initializeMap = this.initializeMap.bind(this);
        this.createMarkerLayer = this.createMarkerLayer.bind(this);
        this.onPlayClick = this.onPlayClick.bind(this);
        this.onPauseClick = this.onPauseClick.bind(this);
        this.onStopClick = this.onStopClick.bind(this);
        this.onForwardClick = this.onForwardClick.bind(this);
        this.onBackwardClick = this.onBackwardClick.bind(this);
        this.onNextClick = this.onNextClick.bind(this);
        this.onPreviousClick = this.onPreviousClick.bind(this);
        this.onMarkerClick = this.onMarkerClick.bind(this);
        this.onMapClick = this.onMapClick.bind(this);
    }

    componentDidMount() {
        this.initializeMap();
        this.createMarkerLayer(this.state.sortedData);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.data != nextProps.data) {
            let temporal = nextProps.data && nextProps.data.length > 0 && nextProps.data[0].hasOwnProperty('time');
            let sortedData = temporal ? nextProps.data.concat().sort((a, b) => new Date(a.time) - new Date(b.time)) : nextProps.data ? nextProps.data : [];
            this.setState({
                temporal,
                sortedData
            });
            this.createMarkerLayer(sortedData);
        }
    }

    componentWillUnmount() {
        this.map = null;
    }

    initializeMap() {
        if (this.map) {
            return;
        }

        // create the leaflet map, using default options if none are provided
        this.map = L.map(this.mapDiv, this.props.mapOptions || defaultMapConfig.options);
        this.map.on('click', this.onMapClick);

        if (this.props.mapLayers && this.props.mapLayers.length > 0) {
            // add provided map layers to the map
            for (let i=0; i < this.props.mapLayers.length; i++) {
                this.props.mapLayers[i].addTo(this.map);
            }
        }
        else {
            // no map layers provided so create a default basemap layer
            L.tileLayer(defaultMapConfig.tileLayer.uri, defaultMapConfig.tileLayer.options).addTo(this.map);
        }
    }

    createMarkerLayer(data) {
        if (this.map && this.markerGroup) {
            this.map.removeLayer(this.markerGroup);
            this.markerGroup = null;
        }

        if (!this.map || !data || data.length === 0) {
            return;
        }

        let timespan = new Date(data[data.length - 1].time) - new Date(data[0].time);

        // the step here is based on an average of 1 second per data item
        let step = timespan / (1000.0 * data.length);

        let dataMarkers = data.map((data, i) => {
            let icon = this.props.getMarkerIcon ? this.props.getMarkerIcon(data) : markerIcon;
            let marker = L.marker([data.latitude, data.longitude], { icon });
            marker.dataIndex = i;
            marker.on('click', this.onMarkerClick);

            return marker;
        });

        this.markerGroup = L.featureGroup(dataMarkers);
        this.markers = dataMarkers;

        this.setState({ timestep: step });
        this.map.addLayer(this.markerGroup);
        this.map.fitBounds(this.markerGroup.getBounds(), {padding: [timelineHeight, timelineHeight]});
    }

    updateSelectedMarkers(selection) {
        if (this.markers) {
            for (let i=0; i < this.markers.length; i++) {
                let marker = this.markers[i];
                const selected = selection.find(item => item.id === this.state.sortedData[marker.dataIndex].id);
                marker.setIcon(this.props.getMarkerIcon ? this.props.getMarkerIcon(this.state.sortedData[marker.dataIndex], selected) : selected ? markerIconSelected : markerIcon);
            }
        }
    }

    onMarkerClick(e) {
        this.updateSelectedMarkers([this.state.sortedData[e.target.dataIndex]]);

        if (this.props.onSelect) {
            this.props.onSelect([this.state.sortedData[e.target.dataIndex]]);
        }
    }

    onMapClick() {
        this.updateSelectedMarkers([]);

        if (this.props.onSelect) {
            this.props.onSelect([]);
        }
    }

    onPlayClick() {
        this.updateMarkers();
    }

    onPauseClick() {
        this.clearUpdateTimer();
    }

    onStopClick() {
        this.clearUpdateTimer();

        this.setState({ activeIndex: 0, timeScale: 1 });
        this.updateTime();

        this.setVisibleMarker(-1);
    }

    onForwardClick() {
        this.clearUpdateTimer();

        const timeScale = this.adjustTimescale(2.0);
        this.updateMarkers(this.state.activeIndex, timeScale);
    }

    onBackwardClick() {
        this.clearUpdateTimer();

        const timeScale = this.adjustTimescale(0.5);
        this.updateMarkers(this.state.activeIndex, timeScale);
    }

    onNextClick() {
        const index = this.getNextIndex(this.state.activeIndex);

        if (this.timer) {
            this.updateMarkers(index);
        }
        else {
            this.setIndex(index);
        }
    }

    onPreviousClick() {
        const index = this.getNextIndex(this.state.activeIndex, true);

        if (this.timer) {
            this.updateMarkers(index);
        }
        else {
            this.setIndex(index);
        }
    }

    onSetTime() {
        //TODO:
    }

    adjustTimescale(factor) {
        let timeScale = this.state.timeScale < 0 ? this.state.timeScale / factor : this.state.timeScale * factor;

        if (Math.abs(timeScale) < 0.25) {
            timeScale = timeScale < 0 ? 0.25 : -0.25;
        }

        this.setState({ timeScale });

        return timeScale;
    }

    getNextIndex(currentIndex, reverse) {
        if (currentIndex === undefined) {
            return 0;
        }

        const lastIndex = this.state.sortedData.length - 1;

        let nextIndex = reverse ? currentIndex - 1 : currentIndex + 1;
        nextIndex = nextIndex < 0 ? lastIndex : nextIndex > lastIndex ? 0 : nextIndex;

        return nextIndex;
    }

    setIndex(index) {
        this.setState({ activeIndex: index });
        this.setVisibleMarker(index);
        this.updateTime(index);
    }

    clearUpdateTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }

        this.timer = undefined;
    }

    updateMarkers(index, timeScale) {
        this.clearUpdateTimer();

        let currentIndex = index === undefined ? this.state.activeIndex : index;
        let currentTimeScale = timeScale === undefined ? this.state.timeScale : timeScale;

        this.setIndex(currentIndex);

        const nextIndex = this.getNextIndex(currentIndex, currentTimeScale < 0);
        const nextStep = (Math.abs(nextIndex - currentIndex) != 1 ? 1000 : (Math.abs(new Date(this.state.sortedData[nextIndex].time) - new Date(this.state.sortedData[currentIndex].time)) / this.state.timestep)) / Math.abs(currentTimeScale);

        let that = this;
        this.timer = setTimeout(function() {
            that.updateMarkers(nextIndex);
        }, nextStep);
    }

    setVisibleMarker(index) {
        if (!this.state.sortedData || !this.markers) {
            return;
        }

        for (let i=0; i < this.state.sortedData.length; i++) {
            this.markers[i].setOpacity(index >= 0 && i !== index ? 0 : 1);
        }
    }

    updateTime(currentIndex) {
        if (currentIndex === undefined || !this.state.sortedData) {
            this.setState({ currentDate: undefined });
            return;
        }

        this.setState({ currentDate: this.state.sortedData[currentIndex].time });
    }

    render() {
        if (this.props.selection) {
            this.updateSelectedMarkers(this.props.selection);
        }

        let dateDisplay = null;
        let scaleDisplay = null;
        if (this.state.currentDate) {
            dateDisplay = (<div className="map-date">{ this.state.currentDate }</div>);

            if (this.state.timeScale !== 1) {
                scaleDisplay = (<div className="map-timescale">{ this.state.timeScale }x</div>);
            }
        }

        let playbackControl = null;
        let timelineControl = null;
        if (this.state.temporal) {
            playbackControl = (
                <PlaybackControl
                    onPlay={ this.onPlayClick }
                    onPause={ this.onPauseClick }
                    onStop={ this.state.currentDate ? this.onStopClick : undefined }
                    onForward={ this.state.currentDate ? this.onForwardClick : undefined }
                    onBackward={ this.state.currentDate ? this.onBackwardClick : undefined }
                    onNext={ this.state.currentDate ? this.onNextClick : undefined }
                    onPrevious={ this.state.currentDate ? this.onPreviousClick : undefined }
                />
            );

            timelineControl = (
                <TimelineControl height={ timelineHeight } data={ this.state.sortedData } time={ this.state.currentDate ? new Date(this.state.currentDate) : undefined } setTime={ this.onSetTime } />
            );
        }

        return (
            <div className="map-container">
                <div className="map" ref={(div) => { this.mapDiv = div; }}></div>
                <div className="map-controls-top">
                    {playbackControl}
                </div>
                {dateDisplay}
                <div className="map-controls-bottom">
                    <div className="status-bar">
                        {scaleDisplay}
                    </div>
                    {timelineControl}
                </div>
            </div>
        );
    }
}

PlaybackMap.propTypes = {
    data: PropTypes.array.isRequired,
    mapOptions: PropTypes.object,
    mapLayers: PropTypes.array,
    onSelect: PropTypes.func,
    selection: PropTypes.array,
    getMarkerIcon: PropTypes.func
};

export default PlaybackMap;
