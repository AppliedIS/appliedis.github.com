import React from 'react';

const AboutPage = () => {
    return (
        <div className="page">

            <h1>About Flock</h1>
            <p>
                Flock is a clustering and classification engine for processing x/y-based signatures, giving intelligence analysts a head start by providing typinginformation and context around a given event.
            </p>

            <h2>Pattern Library</h2>
            <p>
                We've developed a pattern library to show off our design resources
                and help the application maintainers in the future reuse components.
            </p>
            <a target="_blank" href="/library.html">View Pattern Library</a>

            <h2>Technology Stack</h2>
            <div className="about__logos">
                <h3>Front End</h3>
                <p>
                    The user interface for Flock was built with the latest tools
                    and techniques for front-end development. A few of the
                    libraries used are listed below.
                </p>
                <a href="http://nodejs.org">
                    <svg className="about__logo"><use xlinkHref="#logo-nodejs"/></svg>
                </a>
                <a href="https://facebook.github.io/react/">
                    <svg className="about__logo"><use xlinkHref="#logo-react"/></svg>
                </a>
                <a href="http://sass-lang.com/">
                    <svg className="about__logo"><use xlinkHref="#logo-sass"/></svg>
                </a>
                <a href="https://d3js.org/">
                    <svg className="about__logo"><use xlinkHref="#logo-d3"/></svg>
                </a>
            </div>

            <h4>Processing</h4>
            <p>
                Our back-end processing stack consists of machine learning algorithms running
                on Apache Spark to determine the similarity between signatures.
            </p>
            <div className="about__logos">
                <a href="http://www.scala-lang.org/">
                    <img className="about__logo-img" src="/images/scala-logo.png"/>
                </a>
                <a href="http://spark.apache.org/">
                    <img className="about__logo-img" src="/images/spark-logo.png"/>
                </a>
            </div>
        </div>
    );
};

export default AboutPage;
