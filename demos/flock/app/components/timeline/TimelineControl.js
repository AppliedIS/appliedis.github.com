import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
import Faux from 'react-faux-dom';
import { axisBottom } from 'd3-axis';
import { scaleLinear, scaleUtc } from 'd3-scale';
import { mouse, select } from 'd3-selection';

import TimelineMarkers from './TimelineMarkers';
import TimelineIndicator from './TimelineIndicator';

const MARGIN = {
    top: 10,
    right: 30,
    bottom: 25,
    left: 30
};

class TimelineControl extends React.Component {

    constructor(props, context) {
        super(props, context);

        this.state = {
            width: 0,
            height: 0,
            data: []
        };

        this.updateDimensions = this.updateDimensions.bind(this);
        this.getScales = this.getScales.bind(this);
        this.processData = this.processData.bind(this);
        this.onTimelineClick = this.onTimelineClick.bind(this);
    }

    componentDidMount() {
        window.addEventListener('resize', this.updateDimensions);
        this.updateDimensions();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.width !== this.props.width ||
            nextProps.height !== this.props.height ||
            nextProps.data !== this.props.data) {
            this.updateDimensions();
        }
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateDimensions);
    }

    updateDimensions() {
        let el = ReactDOM.findDOMNode(this).parentNode;
        const width = this.props.width ? this.props.width : el.offsetWidth;
        const height = this.props.height ? this.props.height : el.offsetHeight;

        const scales = this.getScales(this.props.data, width, height);

        this.setState({
            width,
            height,
            scales
        });
    }

    getScales(data, width, height) {
        if (!data || data.length === 0) {
            return;
        }

        const w = width === undefined ? this.state.width : width;
        const h = height === undefined ? this.state.height : height;

        const xSize = w - (MARGIN.right + MARGIN.left);
        const ySize = h - MARGIN.top - MARGIN.bottom;

        const x = scaleUtc().range([0, xSize]).domain([new Date(data[0].time), new Date(data[data.length - 1].time)]);
        const y = scaleLinear().range([ySize, 0]);

        return {
            x,
            y
        };
    }

    processData(data, scales) {
        let processed = [];
        if (data) {
            processed = data.map(d => {
                const x = scales.x(new Date(d.time));

                return {
                    time: d.time,
                    line: [[x, MARGIN.top ], [x, this.state.height - MARGIN.bottom]]
                };
            });
        }

        return processed;
    }

    onTimelineClick(x /*, y*/) {
        if (this.props.setTime && this.state.scales) {
            const xPos = this.state.scales.x.invert(x - MARGIN.left);
            this.props.setTime(xPos);
        }
    }

    render() {
        const size = {
            height: this.state.height,
            width: this.state.width
        };

        if (!this.props.data || !this.state.scales) {
            return (<div />);
        }

        let timelineGroup = select(Faux.createElement('g'));
        timelineGroup.attr('class', 'timeline-axis');

        // background rect
        let backgroundRect = timelineGroup.append('rect');
        backgroundRect.attrs({
            class: 'timeline-background',
            x: 0,
            y: 0,
            width: size.width,
            height: size.height
        });

        const that = this;
        backgroundRect.on('mousedown', function() {
            that.onTimelineClick(mouse(this.component)[0], mouse(this.component)[1]);
        });

        // x axis
        let layerAxisX = timelineGroup.append('g');

        const axisX = axisBottom(this.state.scales.x);
        layerAxisX.call(axisX);
        layerAxisX.attr('transform', 'translate(' + MARGIN.left + ', ' + (size.height - MARGIN.bottom) + ')');

        const markerHeight = this.state.height - MARGIN.top - MARGIN.bottom;

        return (
            <svg className="timeline" width={size.width} height={size.height}>
                { timelineGroup.node().toReact() }
                <TimelineMarkers data={this.props.data} height={markerHeight} margin={MARGIN} scales={this.state.scales} />
                <TimelineIndicator height={markerHeight} margin={MARGIN} scales={this.state.scales} time={this.props.time} />
            </svg>
        );
    }

}

TimelineControl.propTypes = {
    data: PropTypes.array.isRequired,
    time: PropTypes.instanceOf(Date),
    width: PropTypes.number,
    height: PropTypes.number,
    setTime: PropTypes.func
};

export default TimelineControl;
