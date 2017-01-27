import React, { PropTypes } from 'react';

class PlaybackControl extends React.Component {

    constructor(props, context) {
        super(props, context);

        this.state = {
            playing: false
        };

        this.onPlayClick = this.onPlayClick.bind(this);
        this.onStopClick = this.onStopClick.bind(this);
        this.onForwardClick = this.onForwardClick.bind(this);
        this.onBackwardClick = this.onBackwardClick.bind(this);
        this.onNextClick = this.onNextClick.bind(this);
        this.onPreviousClick = this.onPreviousClick.bind(this);
    }

    onPlayClick() {
        if (this.state.playing) {
            if (this.props.onPause) {
                this.props.onPause();
                this.setState({ playing: false });
            }
        }
        else {
            if (this.props.onPlay) {
                this.props.onPlay();
            }

            this.setState({ playing: true });
        }
    }

    onStopClick() {
        if (this.props.onStop) {
            this.props.onStop();
        }

        this.setState({ playing: false });
    }

    onForwardClick() {
        if (this.props.onForward) {
            this.props.onForward();
        }
    }

    onBackwardClick() {
        if (this.props.onBackward) {
            this.props.onBackward();
        }
    }

    onNextClick() {
        if (this.props.onNext) {
            this.props.onNext();
        }
    }

    onPreviousClick() {
        if (this.props.onPrevious) {
            this.props.onPrevious();
        }
    }

    render() {
        const undefinedClass = this.props.hideUndefined ? ' playback-button-hidden' : ' playback-button-disabled';

        return (
            <div className="playback-container">
                <div className={'playback-button playback-button-previous' + (this.props.onPrevious ? '' : undefinedClass)} onClick={this.onPreviousClick}><i className="fa fa-step-backward"></i></div>
                <div className={'playback-button playback-button-backward' + (this.props.onBackward ? '' : undefinedClass)} onClick={this.onBackwardClick}><i className="fa fa-backward"></i></div>
                <div className={'playback-button playback-button-stop' + (this.props.onStop ? '' : undefinedClass)} onClick={this.onStopClick}><i className="fa fa-stop"></i></div>
                <div className={'playback-button playback-button-play' + (this.props.onPlay ? '' : undefinedClass) + (this.state.playing ? ' playback-button-active' : '')} onClick={this.onPlayClick}><i className={this.state.playing && this.props.onPause ? 'fa fa-pause' : 'fa fa-play'}></i></div>
                <div className={'playback-button playback-button-forward' + (this.props.onForward ? '' : undefinedClass)} onClick={this.onForwardClick}><i className="fa fa-forward"></i></div>
                <div className={'playback-button playback-button-next' + (this.props.onNext ? '' : undefinedClass)} onClick={this.onNextClick}><i className="fa fa-step-forward"></i></div>
            </div>
        );
    }

}

PlaybackControl.propTypes = {
    onPlay: PropTypes.func,
    onStop: PropTypes.func,
    onPause: PropTypes.func,
    onForward: PropTypes.func,
    onBackward: PropTypes.func,
    onNext: PropTypes.func,
    onPrevious: PropTypes.func,
    hideUndefined: PropTypes.bool
};

PlaybackControl.defaultProps = {
    hideUndefined: false
};

export default PlaybackControl;
