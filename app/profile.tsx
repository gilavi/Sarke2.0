// Profile editing screen.
//
// Reached by tapping the profile card at the top of the More tab. Allows the
// user to edit their first / last name, link out to the existing password
// change flow, and delete their account (Apple App Store Review Guideline
// 5.1.1(v) requires an in-app deletion path).
//
// Data flow:
//   - Reads `user` from `useSession()` (the SessionProvider already populates
//     it on boot from `public.users`).
//   - On save: `updateProfile()` from `lib/profileService.ts` mutates both
//     `auth.users.user_metadata` and the `public.users` row, then refreshes
//     the session so the More tab + everywhere else picks up the new name.
//   - On delete: invokes the `delete-account` Edge Function, signs the user
//     out, and routes to /(auth)/login.

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardSafeArea } from '../components/layout/KeyboardSafeArea';
import { Stack, useRouter } from 'expo-router';
import { Key, ChevronRight, Trash2 } from 'lucide-react-native';
import { A11yText as Text } from '../components/primitives/A11yText';
import { RefreshControl } from '../components/primitives';
import { Button } from '../components/ui';
import { FloatingLabelInput } from '../components/inputs/FloatingLabelInput';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { useTheme, type Theme } from '../lib/theme';
import { friendlyError } from '../lib/errorMap';
import { a11y } from '../lib/accessibility';
import { updateProfile, deleteAccount } from '../lib/profileService';
import { useSubmitGuard } from '../hooks/useSubmitGuard';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const { state, refreshUser, signOut } = useSession();

  const user = state.status === 'signedIn' ? state.user : null;
  const userId = state.status === 'signedIn' ? state.session.user.id : null;

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Enabled save button + on-press name-field errors.
  const { attempted, guard } = useSubmitGuard();

  useEffect(() => {
    setFirstName(user?.first_name ?? '');
    setLastName(user?.last_name ?? '');
  }, [user?.first_name, user?.last_name]);

  const handleSave = async () => {
    if (!userId || busy) return;
    if (!firstName.trim() || !lastName.trim()) return;
    setBusy(true);
    try {
      await updateProfile(userId, firstName.trim(), lastName.trim());
      await refreshUser();
      toast.success('პროფილი განახლდა');
      router.back();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (deleting) return;
    Alert.alert(
      'ანგარიშის წაშლა',
      'დარწმუნებული ხართ? ეს მოქმედება შეუქცევადია.',
      [
        { text: 'უკან', style: 'cancel' },
        {
          text: 'წაშლა',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              await signOut();
              toast.success('ანგარიში წაიშალა');
              router.replace('/(auth)/login');
            } catch (e) {
              setDeleting(false);
              toast.error(friendlyError(e));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'პროფილი', headerBackTitle: 'უკან' }} />

      <KeyboardSafeArea headerHeight={0} contentStyle={styles.content}>
        <ScrollView
          contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl onRefresh={() => refreshUser()} />}
        >
          {/* Name fields */}
          <View style={{ gap: 12 }}>
            <FloatingLabelInput
              label="სახელი"
              value={firstName}
              onChangeText={setFirstName}
              editable={!busy && !deleting}
              autoComplete="name-given"
              textContentType="givenName"
              required
              error={attempted && !firstName.trim() ? 'სავალდებულო ველი' : undefined}
            />
            <FloatingLabelInput
              label="გვარი"
              value={lastName}
              onChangeText={setLastName}
              editable={!busy && !deleting}
              autoComplete="name-family"
              textContentType="familyName"
              required
              error={attempted && !lastName.trim() ? 'სავალდებულო ველი' : undefined}
            />
            <Text style={styles.helperText}>ელ-ფოსტა: {user?.email ?? '-'}</Text>
          </View>

          {/* Save button */}
          <Button
            title="შენახვა"
            onPress={() => guard(!!firstName.trim() && !!lastName.trim(), handleSave)}
            disabled={busy}
            loading={busy}
            size="lg"
          />

          {/* Password change row */}
          <Pressable
            onPress={() => router.push('/account-settings')}
            style={styles.row}
            disabled={busy || deleting}
            {...a11y('პაროლის შეცვლა', undefined, 'button')}
          >
            <Key size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={styles.rowLabel}>პაროლის შეცვლა</Text>
            <ChevronRight size={16} color={theme.colors.inkFaint} strokeWidth={1.5} />
          </Pressable>

          <View style={{ flex: 1, minHeight: 24 }} />

          {/* Delete account */}
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteRow, (busy || deleting) && { opacity: 0.5 }]}
            disabled={busy || deleting}
            {...a11y('ანგარიშის წაშლა', 'ანგარიშის შეუქცევადი წაშლა', 'button')}
          >
            {deleting ? (
              <ActivityIndicator color={theme.colors.danger} />
            ) : (
              <Trash2 size={18} color={theme.colors.danger} strokeWidth={1.5} />
            )}
            <Text style={styles.deleteLabel}>ანგარიშის წაშლა</Text>
          </Pressable>
        </ScrollView>
      </KeyboardSafeArea>
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      flex: 1,
    },
    helperText: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      marginTop: 2,
      marginLeft: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.ink,
    },
    deleteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      backgroundColor: 'transparent',
    },
    deleteLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.danger,
    },
  });
}
