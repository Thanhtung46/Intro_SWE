// Manual Jest mock for react-native-webview — the real package needs
// native modules that don't exist in the jest-expo test environment.
// Renders a plain View (with the given testID) so screens using it can
// still be rendered/asserted on without touching native code. There's no
// way to simulate the WebView's internal page JS firing onMessage from a
// test, so tests exercise onSelectMarker some other way (e.g. calling the
// prop that ends up wired to it directly isn't possible here — screens
// should keep marker-select-driven behavior covered via a different path).
const React = require('react');
const { View } = require('react-native');

function WebView(props) {
  // Forward onMessage (and friends) so tests can simulate the page posting
  // back to RN via fireEvent(getByTestId('app-map'), 'message', {...}).
  return React.createElement(View, { testID: props.testID, onMessage: props.onMessage });
}

module.exports = { WebView };
