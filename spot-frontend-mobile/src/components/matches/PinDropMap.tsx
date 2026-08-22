import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { GEOAPIFY_TILE_URL_TEMPLATE } from '@/config/env';

export type JumpTo = { latitude: number; longitude: number; token: number };

type Props = {
  initialLatitude: number;
  initialLongitude: number;
  onMove: (latitude: number, longitude: number) => void;
  /** Recenters the map + marker without reloading the WebView (search result picked) — only acts when `token` changes. */
  jumpTo?: JumpTo | null;
};

function buildHtml(latitude: number, longitude: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #F8F9FF; }
    .spot-pin { width: 32px; height: 32px; border-radius: 16px 16px 16px 0; transform: rotate(45deg);
      background: #004AC6; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${latitude}, ${longitude}], 16);
    L.tileLayer('${GEOAPIFY_TILE_URL_TEMPLATE ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}', {
      maxZoom: 19
    }).addTo(map);

    var icon = L.divIcon({ className: '', html: '<div class="spot-pin"></div>', iconSize: [32, 32], iconAnchor: [16, 32] });
    var marker = L.marker([${latitude}, ${longitude}], { icon: icon, draggable: true }).addTo(map);

    function report(latlng) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ lat: latlng.lat, lng: latlng.lng }));
    }
    marker.on('dragend', function () { report(marker.getLatLng()); });
    map.on('click', function (e) { marker.setLatLng(e.latlng); report(e.latlng); });

    window.spotJumpTo = function (lat, lng) {
      var latlng = L.latLng(lat, lng);
      marker.setLatLng(latlng);
      map.setView(latlng, 16);
    };
  </script>
</body>
</html>`;
}

/**
 * Tap-to-place / drag-to-adjust pin picker for HostMatchScreen's "no hit in
 * DB → find it on the map" fallback (SPOT-76 Host form §2). Intentionally
 * separate from AppMap (src/components/common/AppMap.tsx) rather than
 * extending it: AppMap is a read-only viewer shared by JoinMatchMapScreen +
 * VenueMapScreen, and this needs map-click/drag semantics those screens
 * don't want. This component itself only reports lat/lng on every
 * move — PinDropModal is the one that reverse-geocodes the final position
 * into Address/Province/Ward (see its header comment).
 *
 * `jumpTo` recenters via `injectJavaScript` into the *same* WebView instance
 * (not a new `source.html`, which would reload Leaflet and drop the user's
 * current zoom/pan) — PinDropModal bumps its `token` when a search result
 * is picked so this effect fires once per pick, not on every drag-driven
 * `onMove` call.
 */
export default function PinDropMap({ initialLatitude, initialLongitude, onMove, jumpTo }: Props) {
  const html = useMemo(() => buildHtml(initialLatitude, initialLongitude), []); // eslint-disable-line react-hooks/exhaustive-deps
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (!jumpTo) return;
    webViewRef.current?.injectJavaScript(
      `window.spotJumpTo(${jumpTo.latitude}, ${jumpTo.longitude}); true;`
    );
    onMove(jumpTo.latitude, jumpTo.longitude);
    // Only re-run when a new jump is requested (token), not on every onMove/jumpTo object identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo?.token]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      onMove(lat, lng);
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <WebView
      ref={webViewRef}
      testID="pin-drop-map"
      style={StyleSheet.absoluteFill}
      originWhitelist={['*']}
      source={{ html }}
      onMessage={handleMessage}
    />
  );
}
