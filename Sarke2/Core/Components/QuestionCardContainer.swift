import SwiftUI

// MARK: - QuestionCardContainer
//
// SwiftUI port of `components/wizard/QuestionCard.tsx`. The signature
// "wizard card" wrapper used by the inspection flow. Renders question
// number badge + title + arbitrary content slot inside a bordered surface
// card with a spring-animated slide-in keyed on direction.
//
// Direction is derived from a `keyChange` value (typically the wizard's
// stepIndex). When the value increases, slide-in from the right; when it
// decreases, slide-in from the left.
//
// Usage:
//   QuestionCardContainer(stepNumber: 3, totalSteps: 17,
//                         title: "მუშის სიმაღლე",
//                         keyChange: stepIndex) {
//       AnswerButtonsRow(value: $isAnswered)
//   }

struct QuestionCardContainer<Content: View>: View {
    let stepNumber: Int
    let totalSteps: Int
    let title: String
    let keyChange: Int
    @ViewBuilder let content: () -> Content

    @State private var lastKey: Int = 0
    @State private var slideEdge: Edge = .trailing

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header: step badge + counter
            HStack(spacing: 8) {
                Text("\(stepNumber)")
                    .font(.spaceGrotesk(13, weight: .bold))
                    .foregroundStyle(Theme.accentPrimary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Theme.accentSoftSurface)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius.xs, style: .continuous))
                Text("/ \(totalSteps)")
                    .font(.inter(12, weight: .medium))
                    .foregroundStyle(Theme.inkFaint)
                Spacer()
            }

            // Title
            Text(title)
                .font(.spaceGrotesk(20, weight: .bold))
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)

            // Content slot
            content()
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                .strokeBorder(Theme.border, lineWidth: 0.5)
        )
        .themeShadow(Theme.shadow.card)
        .id(keyChange)
        .transition(.asymmetric(
            insertion: .move(edge: slideEdge).combined(with: .opacity),
            removal:   .move(edge: slideEdge == .trailing ? .leading : .trailing).combined(with: .opacity)
        ))
        .onChange(of: keyChange) { oldValue, newValue in
            slideEdge = newValue >= oldValue ? .trailing : .leading
        }
        .onAppear { lastKey = keyChange }
    }
}
