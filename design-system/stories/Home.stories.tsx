import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ProjectCard } from '@root/components/home/ProjectCard';

const meta: Meta = { title: 'Patterns/Project Card' };
export default meta;
type Story = StoryObj;

// ProjectCard embeds a map; on web the map area is a blank stub (react-native-maps
// is native-only — aliased to the repo's web shim).
const project = {
  id: 'p1',
  name: 'Tower crane — site B',
  company_name: 'Hubble Construction',
  address: 'Tbilisi, Georgia',
  latitude: 41.7151,
  longitude: 44.8271,
} as any;

export const Default: Story = {
  render: () => (
    <View style={{ width: 360 }}>
      <ProjectCard project={project} onPress={() => {}} />
    </View>
  ),
};

export const NoLocation: Story = {
  render: () => (
    <View style={{ width: 360 }}>
      <ProjectCard project={{ ...project, latitude: null, longitude: null }} onPress={() => {}} />
    </View>
  ),
};
