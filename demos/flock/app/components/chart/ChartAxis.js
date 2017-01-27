import React, { PropTypes } from 'react';
import Faux from 'react-faux-dom';
// D3 Components
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';


class ChartAxis extends React.Component {

    constructor(props, context) {
        super(props, context);
    }

    componentDidMount() {
    }

    componentWillUnmount() {
    }

    render() {
        const context = this.props.context;

        if (typeof context === 'undefined') {
            return null;
        }

        let layerAxis = select(Faux.createElement('g'));
        layerAxis.attr('class', 'chart__axis');
        let layerAxisX = layerAxis.append('g');
        let layerAxisY = layerAxis.append('g');

        // X Axis
        const axisX = axisBottom(context.scales.x);
        if (!this.props.showTicks) {
            axisX.tickValues(context.scales.x.domain());
        }

        layerAxisX.call(axisX);
        layerAxisX.attr('transform', 'translate(' + context.margin.left + ', ' + (context.size.height - context.margin.bottom) + ')');

        // Y Axis
        const axisY = axisLeft(context.scales.y);
        if (!this.props.showTicks) {
            axisY.tickValues(context.scales.y.domain());
        }

        layerAxisY.call(axisY);
        layerAxisY.attr('transform', 'translate(' + context.margin.left + ', ' + context.margin.top + ')');


        // Styling for the axis - sucks we have to do this, but d3 v4 is
        // hard coded for a light theme
        layerAxis.selectAll('.domain').attrs({
            stroke: context.axisColor
        });
        layerAxis.selectAll('.tick').attrs({
            stroke: context.axisColor
        });
        layerAxis.selectAll('line').attrs({
            stroke: context.axisColor
        });

        return layerAxis.node().toReact();
    }
}

ChartAxis.propTypes = {
    context: PropTypes.object.isRequired,
    showTicks: PropTypes.bool
};

ChartAxis.defaultProps = {
    showTicks: true
};

export default ChartAxis;
