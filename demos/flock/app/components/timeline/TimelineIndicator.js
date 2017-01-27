import React, { PropTypes } from 'react';
import Faux from 'react-faux-dom';
import { select } from 'd3-selection';

class TimelineIndicator extends React.PureComponent {
    render() {
        let indicatorGroup = select(Faux.createElement('g'));
        indicatorGroup.attr('class', 'timeline-indicators');

        if (this.props.scales && this.props.time) {
            const x = this.props.scales.x(this.props.time);

            indicatorGroup.append('line')
                .attrs( {
                    class: 'timeline-indicator',
                    x1: x,
                    y1: 0,
                    x2: x,
                    y2: this.props.height,
                    transform: 'translate(' + this.props.margin.left + ', ' + this.props.margin.top + ')'
                });
        }

        return indicatorGroup.node().toReact();
    }

}

TimelineIndicator.propTypes = {
    height: PropTypes.number,
    margin: PropTypes.object,
    scales: PropTypes.object.isRequired,
    time: PropTypes.instanceOf(Date),
};

TimelineIndicator.defaultProps = {
    height: 100,
    margin: {
        top: 0,
        left: 0
    }
};

export default TimelineIndicator;
