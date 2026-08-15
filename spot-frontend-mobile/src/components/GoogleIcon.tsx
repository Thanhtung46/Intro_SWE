import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface GoogleIconProps {
  size?: number;
}

export function GoogleIcon({ size = 18 }: GoogleIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.35-4.78 7l7.73 6c4.51-4.18 7.09-10.36 7.09-17.47z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91H2.5v6.19C6.44 42.62 14.62 48 24 48z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59v-6.19H2.5C.91 16.46 0 20.12 0 24s.91 7.54 2.5 10.78z"
      />
      <Path
        fill="#EA4335"
        d="M24 9.5c3.52 0 6.68 1.21 9.17 3.58l6.87-6.87C35.9 2.38 30.45 0 24 0 14.62 0 6.44 5.38 2.5 13.22l8.03 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
    </Svg>
  );
}
