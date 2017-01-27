import React, { PropTypes } from 'react';
import Faux from 'react-faux-dom';
// D3 Components
import { select } from 'd3-selection';
import { area } from 'd3-shape';


class ChartProfileBand extends React.Component {

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

        if (typeof context === 'undefined') {
            return null;
        }

        let layerBand = select(Faux.createElement('g'));
        layerBand.attr('class', 'chart__band');
        layerBand.attr('transform', 'translate(' + context.margin.left + ',' + context.margin.top + ')');

        // Paint the hi/low band
        const bandPainter = area()
            .x(function(d) {
                return context.scales.x(d.time);
            })
            .y0(function(d) {
                return context.scales.y(d.high);
            })
            .y1(function(d) {
                return context.scales.y(d.low);
            });

        let bandPath = layerBand.append('path');
        bandPath.datum(data);
        bandPath.attrs({
            d: bandPainter,
            class: 'chart__band-area'
        });

        return layerBand.node().toReact();
    }
}

ChartProfileBand.propTypes = {
    context: PropTypes.object.isRequired,
    data: PropTypes.array.isRequired
};

export default ChartProfileBand;
