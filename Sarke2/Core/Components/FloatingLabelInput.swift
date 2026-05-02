import SwiftUI
import UIKit

// MARK: - FloatingLabelInput
//
// SwiftUI port of `components/inputs/FloatingLabelInput.tsx`. The label sits
// inside the field at rest and animates above the border once the user
// focuses or types. Border tints accent on focus, danger when an `errorText`
// is shown.
//
// Usage:
//   FloatingLabelInput(label: "ელ-ფოსტა", text: $email)
//       .textContentType(.emailAddress)
//       .keyboardType(.emailAddress)
//
//   FloatingLabelInput(label: "პაროლი", text: $password, isSecure: true)
//
//   FloatingLabelInput.multiline(label: "კომენტარი", text: $note, minHeight: 180)
//
// Honours `.disabled(_)`, `.textContentType(_)`, `.keyboardType(_)`, and any
// other modifiers a TextField/TextEditor accepts because the underlying
// control is exposed via composition (modifiers can be applied to the call
// site exactly as they would on a plain TextField).

struct FloatingLabelInput: View {
    let label: String
    @Binding var text: String
    var isSecure: Bool = false
    var multiline: Bool = false
    var minHeight: CGFloat = 56
    var errorText: String? = nil
    var trailing: AnyView? = nil

    @FocusState private var focused: Bool

    private var isLabelFloating: Bool { focused || !text.isEmpty }
    private var hasError: Bool { errorText != nil }

    private var borderColor: Color {
        if hasError { return Theme.Color.semantic.danger }
        if focused  { return Theme.accentPrimary }
        return Theme.border
    }

    private var labelColor: Color {
        if hasError { return Theme.Color.semantic.danger }
        if focused  { return Theme.accentPrimary }
        return Theme.inkSoft
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ZStack(alignment: .topLeading) {
                // The actual control
                fieldBody
                    .padding(.horizontal, 14)
                    .padding(.top, isLabelFloating ? 22 : 16)
                    .padding(.bottom, multiline ? 14 : 14)
                    .frame(minHeight: multiline ? minHeight : 56, alignment: .topLeading)
                    .background(Theme.surface)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius.input, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.radius.input, style: .continuous)
                            .strokeBorder(borderColor, lineWidth: focused || hasError ? 1.5 : 1)
                    )
                    .animation(Theme.motion.springStiff, value: focused)
                    .animation(Theme.motion.springStiff, value: hasError)

                // Floating label
                Text(label)
                    .font(.inter(isLabelFloating ? 11 : 15, weight: isLabelFloating ? .medium : .regular))
                    .foregroundStyle(labelColor)
                    .padding(.horizontal, 14)
                    .padding(.top, isLabelFloating ? 8 : 18)
                    .animation(Theme.motion.springStiff, value: isLabelFloating)
                    .allowsHitTesting(false)

                // Trailing affordance (e.g. password eye)
                if let trailing {
                    HStack {
                        Spacer()
                        trailing
                            .padding(.trailing, 12)
                            .padding(.top, 16)
                    }
                }
            }

            if let errorText {
                Text(errorText)
                    .font(.inter(12, weight: .medium))
                    .foregroundStyle(Theme.Color.semantic.danger)
                    .padding(.leading, 4)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    @ViewBuilder
    private var fieldBody: some View {
        if multiline {
            TextEditor(text: $text)
                .font(.inter(15))
                .foregroundStyle(Theme.ink)
                .focused($focused)
                .scrollContentBackground(.hidden)
                .padding(.trailing, trailing == nil ? 0 : 36)
        } else if isSecure {
            SecureField("", text: $text)
                .font(.inter(15))
                .foregroundStyle(Theme.ink)
                .focused($focused)
                .padding(.trailing, trailing == nil ? 0 : 36)
        } else {
            TextField("", text: $text)
                .font(.inter(15))
                .foregroundStyle(Theme.ink)
                .focused($focused)
                .padding(.trailing, trailing == nil ? 0 : 36)
        }
    }
}

// MARK: - Convenience constructors

extension FloatingLabelInput {
    /// Multi-line variant (TextEditor) with configurable height.
    static func multiline(label: String, text: Binding<String>, minHeight: CGFloat = 180, errorText: String? = nil) -> FloatingLabelInput {
        FloatingLabelInput(label: label, text: text, isSecure: false, multiline: true, minHeight: minHeight, errorText: errorText, trailing: nil)
    }

    /// Variant with a trailing affordance (e.g. password eye toggle).
    func trailing<V: View>(@ViewBuilder _ content: () -> V) -> FloatingLabelInput {
        var copy = self
        copy.trailing = AnyView(content())
        return copy
    }
}

// MARK: - Password eye toggle helper

struct PasswordEyeToggle: View {
    @Binding var isSecure: Bool

    var body: some View {
        Button {
            isSecure.toggle()
            Haptic.tap()
        } label: {
            Image(systemName: isSecure ? "eye.slash" : "eye")
                .font(.inter(15, weight: .medium))
                .foregroundStyle(Theme.inkFaint)
                .frame(width: 24, height: 24)
        }
        .buttonStyle(.plain)
    }
}
