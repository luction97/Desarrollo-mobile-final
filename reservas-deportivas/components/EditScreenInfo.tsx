import React from 'react';
import { View } from 'react-native';

import { ExternalLink } from './ExternalLink';
import { Surface, Text, uiLayout } from '../src/components/ui';
import { controlSizes } from '../src/theme';

export default function EditScreenInfo({ path }: { path: string }) {
  return (
    <View style={uiLayout.section}>
      <View style={uiLayout.section}>
        <Text tone="muted">
          Open up the code for this screen:
        </Text>

        <Surface><Text selectable numeric>{path}</Text></Surface>

        <Text tone="muted">
          Change any of the text, save the file, and your app will automatically update.
        </Text>
      </View>

      <View>
        <ExternalLink
          style={controlSizes.md}
          href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet">
          <Text tone="primary">
            Tap here if your app doesn't automatically update after making changes
          </Text>
        </ExternalLink>
      </View>
    </View>
  );
}
