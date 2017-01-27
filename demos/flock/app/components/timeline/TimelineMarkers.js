import React, { PropTypes } from 'react';
import Faux from 'react-faux-dom';
import { select } from 'd3-selection';
import { line } from 'd3-shape';

class TimelineMarkers extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.processData = this.processData.bind(this);
    }

    processData(data, scales) {
        let processed = [];
        if (data) {
            processed = data.map(d => {
                const x = scales.x(new Date(d.time));

                return {
                    time: d.time,
                    line: [[x, 0], [x, this.props.height]]
                };
            });
        }

        return processed;
    }

    render() {
        let markerGroup = select(Faux.createElement('g'));
        markerGroup.attr('class', 'timeline-markers');

        if (this.props.data) {
            const linePainter = line()
                .x(d => {
                    return d[0];
                })
                .y(d => {
                    return d[1];
                });

            const data = this.processData(this.props.data, this.props.scales);

            let pathGroup = markerGroup.append('g');
            pathGroup
                .selectAll('path')
                .data(data)
                .enter()
                .append('path')
                .attrs({
                     d: (d => { return linePainter(d.line); }),
                     class: 'timline-datapath',
                     transform: 'translate(' + this.props.margin.left + ', ' + this.props.margin.top + ')'
                });
        }

        return markerGroup.node().toReact();
    }

}

TimelineMarkers.propTypes = {
    data: PropTypes.array.isRequired,
    height: PropTypes.number,
    margin: PropTypes.object,
    scales: PropTypes.object.isRequired
};

TimelineMarkers.defaultProps = {
    height: 100,
    margin: {
        top: 0,
        left: 0
    }
};

export default TimelineMarkers;
