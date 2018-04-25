import React from 'react';
import PropTypes from 'prop-types';
import { Route, Link, Redirect, Switch } from 'react-router-dom';

import MapContainer from '../containers/MapContainer';
import CardListContainer from '../containers/CardListContainer';
import LoginFormContainer from '../containers/LoginFormContainer';
import PlanCreateContainer from '../containers/PlanCreateContainer';
import ContributorFormContainer from '../containers/ContributorFormContainer';

import capitalize from '../util/capitalize';

class Viewer extends React.Component {

  render() {
    const contributorFormHash = `${this.props.location.pathname}#contributors`;
    const loginHash = `${this.props.location.pathname}#login`;
    const townLower = this.props.match.params.city.toLowerCase();
    const townCapitalized = capitalize(this.props.match.params.city);

    return (
      <section className="component Viewer">
        <header>
          <div className="title">
            <img src={`assets/${townLower}-seal.png`} alt={`Town of ${townCapitalized} Seal`} />
            <h1>Town of {townCapitalized}</h1>
          </div>

          <nav>
            <a href="">FAQ</a>
            {this.props.user.email ?  (
              <Link to={contributorFormHash}>Manage Contributors</Link>
            ) : null}
            {this.props.user.email !== null
              ? <button onClick={this.props.logout}>Logout {this.props.user.email}</button>
              : <Link to={loginHash}>Municipal Login</Link>
            }
          </nav>
        </header>
        <div className="page-wrapper">
          <Route path="/:city/:resource?/:action?" component={MapContainer} />

          <div className="left-panel">
            <Switch>
              <Route exact path="/:city" component={CardListContainer} />
              <Route path="/:city/plan/create" render={(props) =>
                this.props.user.user_id ? (
                  <PlanCreateContainer {...props} />
                ) : (
                  <Redirect to={`/${townLower}`} />
                )
              }/>
              <Redirect to={`/${townLower}`} />
            </Switch>
          </div>
          <Route path="/:city" render={(props) => {
            const hash = props.location.hash;
            switch (hash) {
              case '#login':
                return <LoginFormContainer />;
              case '#contributors':
                return <ContributorFormContainer />;
              default:
                return null;
            }
          }}/>
        </div>
      </section>
    );
  }
}

Viewer.propTypes = {
};

export default Viewer;
