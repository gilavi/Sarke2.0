// Combined camera + library picker. Live camera viewfinder at the top, a
// horizontal strip of recent photos at the bottom - capture or pick, one
// screen, one tap. Returns the chosen URIs via lib/photoPickerBus.
//
// Two modes (driven by the `?multi=1` query param the hook sets):
//   - single: one shutter capture / one strip tap / one library pick → [uri].
//   - multi:  pinch-to-zoom while capturing; recent-strip multi-select with a
//     "დასრულება (n)" bar; system-library multi-select. Resolves [uri1, uri2, …],
//     all of which skip annotation (only a live shutter capture is annotated).
//
// This route is a thin orchestrator: it owns the picker's shared state
// (library assets/selection, the finish→bus handoff) and delegates the camera
// viewfinder to <CameraPane> and the recent-photos strip to <LibraryStrip>
// (features/photo-picker/). The `ImagePicker` system-library escape hatch below
// must stay in this file — check-primitives (`direct-image-picker`) only
// whitelists this route + hooks/usePhotoPicker.ts.
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';

import {
  resolvePhotoPicker,
  cancelPhotoPicker,
  setLastPhotoFromCapture,
} from '../lib/photoPickerBus';
import {
  CameraPane,
  LibraryStrip,
  toLocalUri,
  resolveAssetUri,
  SELECTION_LIMIT,
} from '../features/photo-picker';

export default function PhotoPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ multi?: string; skip?: string }>();
  const multiMode = params.multi === '1';
  // When the caller skips annotation, a pick won't trigger the annotator's
  // router.replace, so the picker must dismiss itself after resolving.
  const skipAnnotate = params.skip === '1';
  const [libPerm, requestLibPerm] = MediaLibrary.usePermissions();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selecting, setSelecting] = useState(false);
  // Ordered selection of recent-strip asset ids (multi mode only).
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const askedLibRef = useRef(false);

  // Request library permission on mount, at most once per mount. If the user
  // dismisses the OS sheet (swipe-down) the permission stays
  // {granted:false, canAskAgain:true} - without this guard the effect would
  // re-fire and re-prompt indefinitely.
  useEffect(() => {
    if (askedLibRef.current) return;
    if (libPerm && !libPerm.granted && libPerm.canAskAgain) {
      askedLibRef.current = true;
      void requestLibPerm();
    }
  }, [libPerm]);

  // Load the most recent ~50 photos from the user's library once we have
  // permission. They render as small square thumbnails below the camera.
  useEffect(() => {
    if (!libPerm?.granted) return;
    (async () => {
      try {
        const page = await MediaLibrary.getAssetsAsync({
          first: 50,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
          mediaType: MediaLibrary.MediaType.photo,
        });
        setAssets(page.assets);
      } catch {
        // Library read failure is non-fatal - user can still use camera.
      }
    })();
  }, [libPerm?.granted]);

  // Use router.dismiss() (modal-aware close) instead of router.back(). back()
  // emits a GO_BACK action that the AuthGate listener intercepts and redirects
  // to /home - sending the user to the dashboard after every capture.
  // Guard with canDismiss() first: dismiss() throws a "POP was not handled"
  // error when the modal stack has nothing to pop (e.g. opened via deep link).
  const close = useCallback(() => {
    if (router.canDismiss()) {
      router.dismiss();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  }, [router]);

  // Resolve the picker with the chosen URIs. `fromCapture` tells the hook whether
  // to route a single result through the annotator (live capture) or add directly.
  const finish = useCallback((uris: string[], fromCapture: boolean) => {
    setLastPhotoFromCapture(fromCapture);
    resolvePhotoPicker(uris);
    // For a live capture in single mode, photo-annotate replaces this screen via
    // router.replace(); otherwise the pushing screen closes us.
  }, []);

  const cancel = useCallback(() => {
    cancelPhotoPicker();
    close();
  }, [close]);

  // A live capture is annotated (and the annotator replaces this screen) UNLESS
  // the caller skips annotation - in which case the hook adds it directly and we
  // must dismiss ourselves.
  const handleCaptured = useCallback(
    (uri: string) => {
      finish([uri], true);
      if (skipAnnotate) close();
    },
    [finish, skipAnnotate, close],
  );

  // Single-mode strip tap: resolve immediately with the one chosen photo.
  const pickAsset = useCallback(
    async (asset: MediaLibrary.Asset) => {
      if (selecting) return;
      setSelecting(true);
      try {
        const uri = await resolveAssetUri(asset);
        finish([uri], false);
        // Single-mode strip pick: annotated unless the caller skips it, in which case
        // the hook resolves directly (no replace) so we dismiss ourselves.
        if (skipAnnotate) close();
      } finally {
        setSelecting(false);
      }
    },
    [close, finish, selecting, skipAnnotate],
  );

  // Multi-mode strip tap: toggle the asset in the ordered selection.
  const toggleSelect = useCallback((asset: MediaLibrary.Asset) => {
    setSelectedIds((prev) =>
      prev.includes(asset.id) ? prev.filter((id) => id !== asset.id) : [...prev, asset.id],
    );
  }, []);

  // Multi-mode "Done (n)": resolve every selected strip asset (ph:// → local).
  const commitSelection = useCallback(async () => {
    if (selecting || selectedIds.length === 0) return;
    setSelecting(true);
    try {
      const byId = new Map(assets.map((a) => [a.id, a]));
      const uris: string[] = [];
      for (const id of selectedIds) {
        const asset = byId.get(id);
        if (!asset) continue;
        uris.push(await resolveAssetUri(asset));
      }
      if (uris.length === 0) {
        setSelecting(false);
        return;
      }
      finish(uris, false);
      // A batch never routes to the annotator (no router.replace), so dismiss here.
      close();
    } finally {
      setSelecting(false);
    }
  }, [assets, close, finish, selectedIds, selecting]);

  const openSystemLibrary = useCallback(async () => {
    if (selecting) return;
    setSelecting(true);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: false,
        allowsMultipleSelection: multiMode,
        selectionLimit: multiMode ? SELECTION_LIMIT : 1,
      });
      if (r.canceled || !r.assets?.length) {
        setSelecting(false);
        return;
      }
      // Resolve iCloud/ph:// URIs for EVERY asset, not just the first.
      const uris: string[] = [];
      for (let i = 0; i < r.assets.length; i++) {
        const a = r.assets[i];
        if (!a?.uri) continue;
        uris.push(await toLocalUri(a.uri, a.assetId ?? `lib_${Date.now()}_${i}`));
      }
      if (uris.length === 0) {
        setSelecting(false);
        return;
      }
      finish(uris, false);
      // The hook adds these directly (no annotator) when it's a multi-mode batch OR an
      // annotation-skipping caller - in both cases it won't replace this screen, so we
      // dismiss it. A single-mode annotated pick is replaced by the annotator instead.
      if (multiMode || skipAnnotate) close();
    } catch {
      setSelecting(false);
    }
  }, [close, finish, multiMode, selecting, skipAnnotate]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraPane
        onCancel={cancel}
        onOpenLibrary={openSystemLibrary}
        onCaptured={handleCaptured}
        multiMode={multiMode}
        selectedCount={selectedIds.length}
        selecting={selecting}
        onCommit={commitSelection}
      />
      <LibraryStrip
        libPerm={libPerm}
        assets={assets}
        multiMode={multiMode}
        selecting={selecting}
        selectedIds={selectedIds}
        onPickAsset={pickAsset}
        onToggleSelect={toggleSelect}
        onRequestLibPerm={requestLibPerm}
      />
    </View>
  );
}
