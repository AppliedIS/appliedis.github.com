import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
// D3 Components
import { extent, max } from 'd3-array';
import { scaleLinear } from 'd3-scale';

import ChartAxis from './ChartAxis';
import ChartLine from './ChartLine';
import ChartProfileBand from './ChartProfileBand';
import ChartTooltips from './ChartTooltips';
import Spinner from '../Spinner';


const MARGIN = {
    top: 0,
    right: 30,
    bottom: 20,
    left: 30
};
const AXIS_COLOR = '#9b9b9b';

class ProfileChart extends React.Component {

    constructor(props, context) {
        super(props, context);

        this.state = {
            componentSize: {
                height: 0,
                width: 0
            }
        };

        this.setState = this.setState.bind(this);
        this.updateDimensions = this.updateDimensions.bind(this);
    }

    componentDidMount() {
        window.addEventListener('resize', this.updateDimensions);
        this.updateDimensions();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateDimensions);
    }

    initScales(size, data) {
        const xSize =  size.width - (MARGIN.right + MARGIN.left);
        const x = scaleLinear()
            .range([0, xSize])
            .domain(extent(data, d => {
                return d.time;
            }));

        const ySize = size.height - MARGIN.top - MARGIN.bottom;
        const y = scaleLinear()
            .range([ySize, 0])
            .domain([0, max(data, d => {
                return d.high;
            })]);

        return {
            x: x,
            y: y
        };
    }

    updateDimensions() {
        let el = ReactDOM.findDOMNode(this).parentNode;
        this.setState({
            componentSize: Object.assign({}, {
                height: el.offsetHeight,
                width: el.offsetWidth
            })
        });
    }

    render() {
        const profile = this.props.profile;

        if (typeof profile.signature === 'undefined') {
            return (
                <div className="chart__spinner">
                    <Spinner />
                </div>
            );
        }

        const size = {
            height: this.props.chartHeight,
            width: this.state.componentSize.width
        };

        let context = {};
        context.axisColor = AXIS_COLOR;
        context.margin = MARGIN;
        context.scales = this.initScales(size, profile.signature);
        context.size = size;

        let selectionLines = undefined;
        if (this.props.selection) {
            selectionLines = this.props.selection.map(item => {
                return <ChartLine key={'sig_' + item.id} data={item.signature} context={context} selected={true} />;
            });
        }

        return (
            <svg className="chart chart__profile" height={size.height + 10} width={size.width}>
                <ChartProfileBand data={profile.signature} context={context} />
                <ChartLine data={profile.signature} context={context} />
                {selectionLines}
                <ChartAxis context={context} showTicks={this.props.showTicks} />
                <ChartTooltips data={profile.signature} context={context} />
            </svg>
        );
    }

}

ProfileChart.propTypes ={
    profile: PropTypes.object.isRequired,
    showTicks: PropTypes.bool,
    chartHeight: PropTypes.number,
    selection: PropTypes.array
};

ProfileChart.defaultProps = {
    showTicks: true,
    chartHeight: 250,
    selection: []
};

export default ProfileChart;
