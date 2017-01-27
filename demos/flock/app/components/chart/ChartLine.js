import React, { PropTypes } from 'react';
import Faux from 'react-faux-dom';
// D3 Components
import { select } from 'd3-selection';
import { line } from 'd3-shape';
import 'd3-selection-multi'; // attrs() function to d3 selections


class ChartLine extends React.Component {

    constructor(props, context) {
        super(props, context);
    }

    componentDidMount() {
    }

    componentWillUnmount() {
    }

    render() {
        const context = this.props.context;
        const data = this.props.data;

        // need both data and context
        if (typeof data === 'undefined' || typeof context === 'undefined') {
            return null;
        }

        // Paint the Signature Line
        const linePainter = line()
            .x(d => {
                return context.scales.x(d.time);
            })
            .y(d => {
                return context.scales.y(d.intensity);
            });

        let layerLine = select(Faux.createElement('g'));
        layerLine.attr('transform', 'translate(' + context.margin.left + ',' + context.margin.top + ')');

        let path = layerLine.append('path');
        path.datum(data);
        path.attrs({
            d: linePainter,
            class: 'chart__line-signature' + (this.props.selected ? ' chart__line-selected' : '')
        });

        return layerLine.node().toReact();
    }
}

ChartLine.propTypes = {
    context: PropTypes.object.isRequired,
    data: PropTypes.array.isRequired,
    selected: PropTypes.bool
};

ChartLine.defaultProps = {
    selected: false
};

export default ChartLine;
