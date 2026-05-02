import SwiftUI

// MARK: - AnswerButtonsRow
//
// SwiftUI port of `components/wizard/AnswerButtons.tsx`. Two equal-width
// buttons with semantic icons and animated selected state. Used by the
// inspection wizard's yes/no questions and the safety conclusion picker.
//
// Selection states:
//   - .none — both buttons in idle state (subtle outline)
//   - .yes  — left button fills success, right button fades
//   - .no   — right button fills danger, left button fades
//
// Tapping emits a haptic (success for yes, warning for no) and animates
// border + fill to the selected color.
//
// Usage:
//   @State var answer: AnswerButtonsRow.Answer = .none
//   AnswerButtonsRow(selection: $answer,
//                    yesLabel: "კი", noLabel: "არა")
//
//   // Or driven by an external Bool?:
//   AnswerButtonsRow(value: $isSafe)  // Bool?
//
// `.large` makes both buttons taller (used on the conclusion step).

struct AnswerButtonsRow: View {
    enum Answer: Equatable { case none, yes, no }

    @Binding var selection: Answer
    var yesLabel: String = "კი"
    var noLabel: String = "არა"
    var large: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            answerButton(.yes,
                         label: yesLabel,
                         icon: "checkmark.circle.fill",
                         tint: Theme.Color.semantic.success,
                         tintSoft: Theme.Color.semantic.successSoft)
            answerButton(.no,
                         label: noLabel,
                         icon: "xmark.circle.fill",
                         tint: Theme.Color.semantic.danger,
                         tintSoft: Theme.Color.semantic.dangerSoft)
        }
    }

    @ViewBuilder
    private func answerButton(_ value: Answer, label: String, icon: String, tint: Color, tintSoft: Color) -> some View {
        let isSelected = selection == value
        let isOtherSelected = selection != .none && !isSelected

        Button {
            withAnimation(Theme.motion.springStiff) {
                selection = (selection == value) ? .none : value
            }
            switch value {
            case .yes:  Haptic.success()
            case .no:   Haptic.warning()
            case .none: break
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.inter(large ? 22 : 18, weight: .bold))
                    .foregroundStyle(isSelected ? .white : tint)
                Text(label)
                    .font(.inter(large ? 18 : 16, weight: .semibold))
                    .foregroundStyle(isSelected ? .white : (isOtherSelected ? Theme.inkFaint : Theme.ink))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, large ? 18 : 14)
            .background(isSelected ? tint : (isOtherSelected ? Theme.surface : tintSoft))
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius.md, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius.md, style: .continuous)
                    .strokeBorder(isSelected ? tint : Theme.border, lineWidth: isSelected ? 0 : 1)
            )
            .scaleEffect(isSelected ? 1.0 : (isOtherSelected ? 0.98 : 1.0))
            .opacity(isOtherSelected ? 0.55 : 1.0)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Bool? bridge

extension AnswerButtonsRow {
    /// Convenience for screens that already model the answer as `Bool?`
    /// (e.g. WizardViewModel.isSafeForUse).
    init(value: Binding<Bool?>, yesLabel: String = "კი", noLabel: String = "არა", large: Bool = false) {
        let mapped = Binding<Answer>(
            get: {
                switch value.wrappedValue {
                case .some(true): return .yes
                case .some(false): return .no
                case .none: return .none
                }
            },
            set: { new in
                switch new {
                case .yes:  value.wrappedValue = true
                case .no:   value.wrappedValue = false
                case .none: value.wrappedValue = nil
                }
            }
        )
        self.init(selection: mapped, yesLabel: yesLabel, noLabel: noLabel, large: large)
    }
}
