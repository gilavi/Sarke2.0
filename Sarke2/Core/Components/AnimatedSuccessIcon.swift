import SwiftUI

// MARK: - AnimatedSuccessIcon
//
// SwiftUI port of `components/AnimatedSuccessIcon` from the Expo app.
// Green-circle checkmark with a glow pulse used to mark inspection
// completion, briefing submission, etc.
//
// Auto-plays on appear: a quick scale-in + check stroke + outward glow.

struct AnimatedSuccessIcon: View {
    var size: CGFloat = 88
    var onComplete: (() -> Void)? = nil

    @State private var scale: CGFloat = 0.6
    @State private var checkProgress: CGFloat = 0
    @State private var glowOpacity: Double = 0
    @State private var glowScale: CGFloat = 1.0

    var body: some View {
        ZStack {
            // Glow halo (pulses outward)
            Circle()
                .fill(Theme.accentPrimary)
                .opacity(glowOpacity)
                .scaleEffect(glowScale)
                .frame(width: size, height: size)

            // Solid disk
            Circle()
                .fill(Theme.accentPrimary)
                .frame(width: size, height: size)
                .scaleEffect(scale)
                .themeShadow(Theme.shadow.glow)

            // Animated checkmark stroke
            CheckmarkShape()
                .trim(from: 0, to: checkProgress)
                .stroke(.white, style: StrokeStyle(lineWidth: size * 0.09, lineCap: .round, lineJoin: .round))
                .frame(width: size * 0.55, height: size * 0.4)
                .scaleEffect(scale)
        }
        .onAppear { play() }
    }

    private func play() {
        Haptic.success()

        withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
            scale = 1.0
        }
        withAnimation(.easeOut(duration: 0.4).delay(0.18)) {
            checkProgress = 1.0
        }
        withAnimation(.easeOut(duration: 0.6).delay(0.05)) {
            glowOpacity = 0.35
            glowScale = 1.6
        }
        withAnimation(.easeIn(duration: 0.4).delay(0.65)) {
            glowOpacity = 0
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) {
            onComplete?()
        }
    }
}

private struct CheckmarkShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX,        y: rect.midY))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.38, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX,    y: rect.minY))
        return path
    }
}
