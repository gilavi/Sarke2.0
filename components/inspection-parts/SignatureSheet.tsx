// Unified signature bottom-sheet for all inspection acts.
// Wraps SignatureBlock in SheetLayout + BottomSheetScrollView so every act
// gets the same scroll behaviour, header, and padding.

import { SheetLayout } from '../SheetLayout';
import { BottomSheetScrollView } from '../BottomSheet';
import { SignatureBlock, type SignatureBlockProps } from './SignatureBlock';

interface Props extends SignatureBlockProps {
  onClose: () => void;
}

export function SignatureSheet({ onClose, ...blockProps }: Props) {
  return (
    <SheetLayout
      header={{ title: 'ხელმოწერები', onClose }}
      maxHeightRatio={0.92}
      showHandle={false}
      ScrollComponent={BottomSheetScrollView}
    >
      <SignatureBlock {...blockProps} />
    </SheetLayout>
  );
}
