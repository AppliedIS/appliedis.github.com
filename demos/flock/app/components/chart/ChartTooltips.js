import React, { PropTypes } from 'react';
import Faux from 'react-faux-dom';
// D3 Components
//import { bisector } from 'd3-array';
//import { mouse, select } from 'd3-selection';
import { select } from 'd3-selection';
import 'd3-selection-multi'; // attrs() function to d3 selections


class ChartTooltips extends React.Component {

    constructor(props, context) {
        super(props, context);
    }

    componentDidMount() {
    }

    componentWillUnmount() {
    }

    render() {
        const data = this.props.data;
        const context = this.props.context;

        // need both data and context
        if (typeof context === 'undefined' || typeof data === 'undefined') {
            return null;
        }

        let layer = select(Faux.createElement('g'));
        let layerTooltip = layer.append('g');
        layerTooltip.attr('class', 'chart__tooltip');
        layerTooltip.append('text'); // display intensity value
        layerTooltip.append('circle'); // circle on y point

        let layerOverlay = layer.append('g');
        layerOverlay.attr('class', 'chart__overlay');
        layerOverlay.attr('transform', 'translate(' + context.margin.left + ',' + context.margin.top + ')');
        layerOverlay.append('rect').attrs({
            height: context.size.height - (context.margin.top + context.margin.bottom),
            width: context.size.width - (context.margin.left + context.margin.right)
        });

        //let chart = this;
        layerOverlay.on('mousemove', function() {
            // var bisectX = bisector(function(d) {
            //     return d.time;
            // }).left;
            //
            // let xPosition = context.scales.x.invert(mouse(this.component)[0]);
            // let nearestX = bisectX(data, xPosition, 1);
            //let tooltipColor = '#f00';

            // var d = data[nearestX];
            // var textX = context.scales.x(d.time) + context.margin.left;
            // var textY = context.scales.y(d.intensity) + context.margin.top + 20;

            // var txtAnchor = 'middle';
            // if (textX < (context.size.width / 4)) {
            //     txtAnchor = 'start';
            // }
            // else if (textX > (context.size.width - (context.size.width / 4))) {
            //     txtAnchor = 'end';
            // }

            //tooltip.select('text').attr('transform', 'translate(1000, 100)');
            //tooltip.attr('class', 'fart');

            // var val = d.intensity;
            // if (d.intensity && d.intensity.toFixed) {
            //     val = d.intensity.toFixed(2);
            // }
        }); // layerOverlay.on('mousemove')

        return layer.node().toReact();
    }
}

ChartTooltips.propTypes = {
    context: PropTypes.object.isRequired,
    data: PropTypes.array.isRequired
};

export default ChartTooltips;
