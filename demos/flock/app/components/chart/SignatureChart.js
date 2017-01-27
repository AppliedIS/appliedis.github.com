import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
import Faux from 'react-faux-dom';
// D3 Components
import { extent } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import 'd3-selection-multi'; // attrs() function to d3 selections

import Spinner from '../Spinner';


class SignatureChart extends React.Component {

    constructor(props, context) {
        super(props, context);

        this.state = {
            componentSize: {
                height: 0,
                width: 0
            }
        };
        this.MAX_HEIGHT = 250;

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

    drawChart(svg, data, config) {

        const margin = {
            top: 0,
            right: 60,
            bottom: 20,
            left: 30
        };

        let layerLine = svg.append('g');
        layerLine.attr('class', 'chart__line');
        layerLine.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        let layerAxis = svg.append('g');
        layerAxis.attr('class', 'chart__axis');
        let layerAxisX = layerAxis.append('g');
        let layerAxisY = layerAxis.append('g');

        // X Axis
        const xSize = config.width - (margin.right + margin.left);
        const x = scaleLinear()
            .range([0, xSize])
            .domain(extent(data, d => {
                return d.time;
            }));
        const axisX = axisBottom(x);
        layerAxisX.call(axisX);
        layerAxisX.attr('transform', 'translate(' + margin.left + ', ' + (config.height - margin.bottom) + ')');

        // Y Axis
        const ySize = config.height - margin.top - margin.bottom;
        const y = scaleLinear()
            .range([ySize, 0])
            .domain(extent(data, d => {
                return d.intensity;
            }));
        const axisY = axisLeft(y);
        layerAxisY.call(axisY);
        layerAxisY.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

        // Styling for the axis - sucks we have to do this, but d3 v4 is
        // hard coded for a light theme
        const axisColor = '#9b9b9b';
        layerAxis.selectAll('.domain').attrs({
            stroke: axisColor
        });
        layerAxis.selectAll('.tick').attrs({
            stroke: axisColor
        });
        layerAxis.selectAll('line').attrs({
            stroke: axisColor
        });

        // Paint the Signature Line
        const painter = line()
            .x(d => {
                return x(d.time);
            })
            .y(d => {
                return y(d.intensity);
            });

        let path = layerLine.append('path');
        path.datum(data);
        path.attrs({
            d: painter,
            class: 'chart__line-signature'
        });
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
        if (typeof this.props.signature.signature === 'undefined') {
            return (
                <div className="chart__spinner">
                    <Spinner />
                </div>
            );
        }

        const sig = this.props.signature;

        const config = {
            height: this.MAX_HEIGHT,
            width: this.state.componentSize.width
        };

        let svg = select(Faux.createElement('svg'));
        svg.attrs({
            'class': 'chart chart__signature',
            'height': config.height,
            'width': config.width
        });

        this.drawChart(svg, sig.signature, config);

        return svg.node().toReact();
    }
}

SignatureChart.propTypes ={
    signature: PropTypes.object.isRequired,
};

export default SignatureChart;
