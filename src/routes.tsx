import { Route, Switch } from 'wouter';
import App from './App';
import NP3Page from './pages/NP3Page';

/**
 * Routes configuration for the Better Nothing Glyph Composer app
 *
 * Routes:
 * - / (default): Main composer page for all phone models except NP3
 * - /np3: Custom page specifically for Phone (3) with 625 zones
 */
export default function Routes() {
  return (
    <Switch>
      <Route path="/np3" component={NP3Page} />
      <Route path="/" component={App} />
    </Switch>
  );
}
