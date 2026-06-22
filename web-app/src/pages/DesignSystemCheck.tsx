import { View, Text } from 'react-native';
import { Plus, ArrowRight } from 'lucide-react-native';
import { Button, Card, Badge, Input, IconButton } from '@root/components/primitives';
import type { ButtonVariant, ButtonSize } from '@root/components/primitives/Button';

/**
 * Live smoke-test of the shared (react-native-web) component library inside
 * web-app. If this page renders, the RNW + reanimated + theme + lucide pipeline
 * is wired correctly. Reachable at #/ds (public).
 */
const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'outline', 'danger', 'link'];
const SIZES: ButtonSize[] = ['sm', 'md', 'lg', 'xl'];

export default function DesignSystemCheck() {
  return (
    <View style={{ padding: 24, gap: 24, maxWidth: 720, marginHorizontal: 'auto' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Shared component library — web</Text>

      <Card>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Button variants</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {VARIANTS.map((v) => (
            <Button key={v} title={v} variant={v} onPress={() => {}} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Button sizes + icons</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {SIZES.map((s) => (
            <Button key={s} title={s} size={s} leftIcon={Plus} onPress={() => {}} />
          ))}
          <Button title="Next" rightIcon={ArrowRight} onPress={() => {}} />
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Badges</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Badge>default</Badge>
          <Badge variant="success">success</Badge>
          <Badge variant="warning">warning</Badge>
          <Badge variant="danger">danger</Badge>
          <Badge variant="info">info</Badge>
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Input + IconButton</Text>
        <Input label="Project name" placeholder="Type here…" />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <IconButton icon={Plus} a11yLabel="add" onPress={() => {}} />
          <IconButton icon={ArrowRight} a11yLabel="next" variant="ghost" onPress={() => {}} />
        </View>
      </Card>
    </View>
  );
}
