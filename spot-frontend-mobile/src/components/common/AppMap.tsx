import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { GEOAPIFY_TILE_URL_TEMPLATE } from '@/config/env';

export type AppMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  tintColor: string;
  emoji: string;
};

export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

type Props = {
  markers: AppMapMarker[];
  onSelectMarker?: (id: string) => void;
  initialRegion: Region;
};

function regionToZoom(latitudeDelta: number): number {
  // Rough log2 mapping from a lat span to a Leaflet zoom level (world = 360°).
  return Math.max(2, Math.min(18, Math.round(Math.log2(360 / latitudeDelta))));
}

function buildHtml(markers: AppMapMarker[], region: Region): string {
  const zoom = regionToZoom(region.latitudeDelta);
  const markersJson = JSON.stringify(markers);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #F8F9FF; }
    .spot-pin { width: 32px; height: 32px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 16px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${region.latitude}, ${region.longitude}], ${zoom});
    L.tileLayer('${GEOAPIFY_TILE_URL_TEMPLATE ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}', {
      maxZoom: 19
    }).addTo(map);

    var markers = ${markersJson};
    markers.forEach(function (m) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="spot-pin" style="background:' + m.tintColor + '">' + m.emoji + '</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
      marker.on('click', function () {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m.id);
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Shared real map — Leaflet.js (via CDN) rendered inside a WebView, with
 * Geoapify raster tiles (GEOAPIFY_TILE_URL_TEMPLATE, src/config/env.ts).
 *
 * NOT react-native-maps: on Android that library always renders through
 * the native Google Maps SDK regardless of provider/mapType/tile-overlay
 * settings, and that SDK refuses to draw anything (blank canvas, only the
 * mandatory Google logo shows) without a Google Cloud Maps API key — which
 * needs a billing account this project doesn't have. WebView + Leaflet has
 * no such native dependency on either platform, so it's the only option
 * that works with only a Geoapify key. AppMap.web.tsx is the Metro-picked
 * fallback for `npm run web`.
 *
 * Markers use an emoji (not an Ionicons glyph) because the icon has to
 * render as plain HTML text inside the WebView's page, not as a native
 * font glyph.
 *
 * Intentionally generic (markers in, id out on select) so both
 * JoinMatchMapScreen (kèo) and, later, BookingMapScreen (venues) can share
 * this one component instead of each hand-rolling pins — see SPOT-76 "map"
 * follow-up discussion.
 */
export default function AppMap({ markers, onSelectMarker, initialRegion }: Props) {
  const html = useMemo(() => buildHtml(markers, initialRegion), [markers, initialRegion]);

  const handleMessage = (event: WebViewMessageEvent) => {
    onSelectMarker?.(event.nativeEvent.data);
  };

  return (
    <WebView
      testID="app-map"
      style={StyleSheet.absoluteFill}
      originWhitelist={['*']}
      source={{ html }}
      onMessage={handleMessage}
    />
  );
}
