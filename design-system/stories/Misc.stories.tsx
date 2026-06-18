import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Plus, X, ChevronRight } from 'lucide-react-native';
import { FormField } from '@root/components/FormField';
import { FloatingLabelInput } from '@root/components/inputs/FloatingLabelInput';
import { ButtonGroup } from '@root/components/ButtonGroup';
import { FabButton } from '@root/components/primitives/FabButton';
import { Chip } from '@root/components/ui/Chip';
import { SectionHeader } from '@root/components/SectionHeader';
import { Label } from '@root/components/ui/Label';
import { ErrorText } from '@root/components/ui/ErrorText';
import { primary, semantic } from '@tokens';

// A few smaller reusable components grouped together.

const meta: Meta = { title: 'Components/Misc' };
export default meta;
type Story = StoryObj;

export const FormFieldStory: Story = {
  name: 'Form Field',
  render: () => {
    const [v, setV] = useState('');
    return (
      <View style={{ width: 340 }}>
        <FormField label="Crane operator" required helper="Full legal name">
          <FloatingLabelInput label="Name" value={v} onChangeText={setV} />
        </FormField>
      </View>
    );
  },
};

export const ButtonGroupStory: Story = {
  name: 'Button Group',
  render: () => (
    <View style={{ gap: 24, width: 340 }}>
      <ButtonGroup
        buttons={[
          { label: 'Save', variant: 'primary', onPress: () => {} },
          { label: 'Cancel', variant: 'ghost', onPress: () => {} },
        ]}
      />
      <ButtonGroup
        layout="horizontal"
        buttons={[
          { label: 'Back', variant: 'secondary', onPress: () => {} },
          { label: 'Next', variant: 'primary', onPress: () => {} },
        ]}
      />
    </View>
  ),
};

export const Fab: Story = {
  name: 'FAB',
  render: () => (
    <View style={{ flexDirection: 'row', gap: 24 }}>
      <FabButton onPress={() => {}} icon={Plus} a11yLabel="Add" />
      <FabButton onPress={() => {}} icon={X} iconRotation={0} a11yLabel="Close" />
      <FabButton onPress={() => {}} icon={ChevronRight} a11yLabel="Next" />
    </View>
  ),
};

export const Chips: Story = {
  name: 'Chip',
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Chip tint={primary[700]} bg={primary[50]}>Inspection</Chip>
      <Chip tint={semantic.success} bg={semantic.successSoft}>Passed</Chip>
      <Chip tint={semantic.warning} bg={semantic.warningSoft}>Pending</Chip>
      <Chip tint={semantic.danger} bg={semantic.dangerSoft}>Failed</Chip>
    </View>
  ),
};

export const SectionHeaders: Story = {
  name: 'Section Header',
  render: () => (
    <View style={{ gap: 20, width: 360 }}>
      <SectionHeader title="Recent inspections" />
      <SectionHeader title="Projects" variant="highlight" action={{ label: 'See all', icon: ChevronRight, onPress: () => {} }} />
      <SectionHeader title="Archived" variant="muted" />
    </View>
  ),
};

export const LabelsAndErrors: Story = {
  name: 'Label & Error Text',
  render: () => (
    <View style={{ gap: 8, width: 320 }}>
      <Label>Email address</Label>
      <ErrorText>This field is required</ErrorText>
    </View>
  ),
};
