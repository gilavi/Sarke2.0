import { StyleSheet } from 'react-native';

/** Theme-independent layout styles for {@link FloatingLabelInput}. Colors,
 *  border width, and the animated border color are applied inline in render. */
export const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
    backgroundColor: 'transparent',
    // No explicit fontFamily: the label renders in the OS system font, matching
    // the input text below it (which sets none) and the rest of the app. The old
    // 'Inter-Regular' had no Georgian glyphs, so ქართული labels fell back to the
    // system font while Latin stayed Inter — a mismatch with the field's value.
  },
  asterisk: {
    // danger color applied inline via theme in render
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingBottom: 8,
    margin: 0,
    padding: 0,
    paddingLeft: 14,
    // Prevent Android from painting its own white background over the themed
    // container surface - without this, light text is invisible in dark mode.
    backgroundColor: 'transparent',
  },
  inputMultiline: {
    paddingBottom: 10,
    alignSelf: 'stretch',
  },
  rightIcon: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  subText: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
});
