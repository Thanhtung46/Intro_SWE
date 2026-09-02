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

export type UserLocation = { latitude: number; longitude: number };

/** Leaflet [lat, lng] pairs for an in-app route polyline. */
export type RouteLatLng = [number, number];

type Props = {
  markers: AppMapMarker[];
  onSelectMarker?: (id: string) => void;
  initialRegion: Region;
  /** Device GPS — rendered as a home pin. */
  userLocation?: UserLocation | null;
  /** Driving route from GPS → venue (Geoapify). */
  routeCoordinates?: RouteLatLng[] | null;
};

function regionToZoom(latitudeDelta: number): number {
  return Math.max(2, Math.min(18, Math.round(Math.log2(360 / latitudeDelta))));
}

function buildHtml(
  markers: AppMapMarker[],
  region: Region,
  userLocation: UserLocation | null | undefined,
  routeCoordinates: RouteLatLng[] | null | undefined
): string {
  const zoom = regionToZoom(region.latitudeDelta);
  const markersJson = JSON.stringify(markers);
  const userJson = userLocation ? JSON.stringify(userLocation) : 'null';
  const routeJson = routeCoordinates && routeCoordinates.length > 1 ? JSON.stringify(routeCoordinates) : 'null';
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #F8F9FF; }
    .spot-pin { width: 32px; height: 32px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 16px; }
    .spot-home { width: 36px; height: 36px; border-radius: 18px; display: flex; align-items: center; justify-content: center;
      border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); font-size: 18px; background: #2563EB; }
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
    var boundsPoints = [];
    markers.forEach(function (m) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="spot-pin" style="background:' + m.tintColor + '">' + m.emoji + '</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
      boundsPoints.push([m.latitude, m.longitude]);
      marker.on('click', function () {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m.id);
      });
    });

    var user = ${userJson};
    if (user && typeof user.latitude === 'number' && typeof user.longitude === 'number') {
      var homeIcon = L.divIcon({
        className: '',
        html: '<div class="spot-home">🏠</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([user.latitude, user.longitude], { icon: homeIcon, interactive: false, zIndexOffset: 1000 }).addTo(map);
      boundsPoints.push([user.latitude, user.longitude]);
    }

    var route = ${routeJson};
    if (route && route.length > 1) {
      var line = L.polyline(route, { color: '#1D4ED8', weight: 5, opacity: 0.85 }).addTo(map);
      route.forEach(function (p) { boundsPoints.push(p); });
      map.fitBounds(line.getBounds(), { padding: [56, 56], maxZoom: 16 });
    } else if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [48, 48], maxZoom: 15 });
    }
  </script>
</body>
</html>`;
}

/**
 * Shared real map — Leaflet in a WebView + Geoapify tiles.
 * Optional `userLocation` (🏠) and `routeCoordinates` (blue polyline).
 */
export default function AppMap({
  markers,
  onSelectMarker,
  initialRegion,
  userLocation,
  routeCoordinates,
}: Props) {
  const html = useMemo(
    () => buildHtml(markers, initialRegion, userLocation, routeCoordinates),
    [markers, initialRegion, userLocation, routeCoordinates]
  );

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
