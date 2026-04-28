// Photo Annotate route
//
// Modal screen that wraps PhotoAnnotator. Receives the photo URI and
// returns the annotated URI back to the caller via photoPickerBus.

import { useLocalSearchParams, useRouter } from 'expo-router';
import PhotoAnnotator from '../components/PhotoAnnotator';
import { resolvePhotoAnnotate } from '../lib/photoPickerBus';

export default function PhotoAnnotateScreen() {
  const { uri } = useLocalSearchParams<{
    uri: string;
  }>();
  const router = useRouter();

  if (!uri) {
    resolvePhotoAnnotate(null);
    router.back();
    return null;
  }

  return (
    <PhotoAnnotator
      sourceUri={decodeURIComponent(uri)}
      onSave={(annotatedUri) => {
        resolvePhotoAnnotate(annotatedUri);
        router.back();
      }}
      onCancel={() => {
        resolvePhotoAnnotate(null);
        router.back();
      }}
    />
  );
}
