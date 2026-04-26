// Photo Annotate route
//
// Modal screen that wraps PhotoAnnotator. Receives the photo URI and
// returns the annotated URI back to the caller via navigation params.

import { useLocalSearchParams, useRouter } from 'expo-router';
import PhotoAnnotator from '../components/PhotoAnnotator';

export default function PhotoAnnotateScreen() {
  const { uri, returnTo, answerId, rowKey } = useLocalSearchParams<{
    uri: string;
    returnTo?: string;
    answerId?: string;
    rowKey?: string;
  }>();
  const router = useRouter();

  if (!uri) {
    router.back();
    return null;
  }

  return (
    <PhotoAnnotator
      sourceUri={decodeURIComponent(uri)}
      onSave={(annotatedUri) => {
        // Pass annotated URI back to caller as a param
        const target = returnTo || '/';
        router.navigate({
          pathname: target as any,
          params: {
            annotatedPhotoUri: encodeURIComponent(annotatedUri),
            answerId: answerId ?? '',
            rowKey: rowKey ?? '',
          },
        });
      }}
      onCancel={() => router.back()}
    />
  );
}
