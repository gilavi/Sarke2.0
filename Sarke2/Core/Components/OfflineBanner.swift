import SwiftUI

// MARK: - OfflineBanner
//
// Top-of-screen amber bar that appears when `NetworkMonitor.shared.isOnline`
// flips false. Mirrors `components/OfflineBanner.tsx` from the Expo app.
// Inserted globally above the tab content in `RootView`.
//
// Auto-hides when reachability returns. Respects safe-area top inset.

struct OfflineBanner: View {
    @Environment(NetworkMonitor.self) private var monitor

    var body: some View {
        Group {
            if !monitor.isOnline {
                HStack(spacing: 8) {
                    Image(systemName: "wifi.slash")
                        .font(.inter(13, weight: .bold))
                    Text("ხაზგარეშე — ცვლილებები ინახება ლოკალურად")
                        .font(.inter(12, weight: .medium))
                }
                .foregroundStyle(SwiftUI.Color(hex: 0xB45309))   // certTint amber
                .padding(.vertical, 8)
                .padding(.horizontal, 14)
                .frame(maxWidth: .infinity)
                .background(Theme.Color.semantic.warningSoft)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(Theme.motion.springGentle, value: monitor.isOnline)
    }
}
