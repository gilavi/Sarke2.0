import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ChevronRight, EllipsisVertical } from 'lucide-react-native';
import { InspectionRow } from '@root/components/InspectionRow';

const meta: Meta = { title: 'Patterns/Inspection Row' };
export default meta;
type Story = StoryObj;

// The canonical inspection list row shared by the home screen and the
// project-detail inspections section. Pure presentational — the caller owns
// navigation, swipe wrappers, and any trailing actions.

export const HomeStyle: Story = {
  name: 'Home — time + kebab',
  render: () => (
    <View style={{ width: 380 }}>
      <InspectionRow
        category="harness"
        status="completed"
        title="სამშენებლო აღჭურვილობის შემოწმება"
        subtitle="Hubble Construction"
        trailing="2 სთ წინ"
        showBorder
        actions={
          <View style={{ paddingHorizontal: 8 }}>
            <EllipsisVertical size={18} color="#9aa0a6" strokeWidth={1.5} />
          </View>
        }
        onPress={() => {}}
      />
      <InspectionRow
        category="excavator"
        status="draft"
        title="ექსკავატორის შემოწმება"
        subtitle="Tbilisi Metro"
        trailing="გუშინ"
        actions={
          <View style={{ paddingHorizontal: 8 }}>
            <EllipsisVertical size={18} color="#9aa0a6" strokeWidth={1.5} />
          </View>
        }
        onPress={() => {}}
      />
    </View>
  ),
};

export const CardStyle: Story = {
  name: 'Project card — inset 0 + chevron',
  render: () => (
    <View style={{ width: 380, backgroundColor: '#f4f5f7', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12 }}>
      <InspectionRow
        category="forklift_inspection"
        status="completed"
        title="ჩანგლიანი ავტომტვირთველის შემოწმება"
        subtitle="12 ივნ, 14:30"
        trailing={<ChevronRight size={18} color="#c4c8cc" strokeWidth={1.5} />}
        inset={0}
        showBorder
        onPress={() => {}}
      />
      <InspectionRow
        category="cargo_platform"
        status="draft"
        title="სატვირთო პლატფორმის შემოწმება"
        subtitle="10 ივნ, 09:05"
        trailing={<ChevronRight size={18} color="#c4c8cc" strokeWidth={1.5} />}
        inset={0}
        onPress={() => {}}
      />
    </View>
  ),
};
