import SwiftUI

// MARK: - BottomSheet
//
// Thin wrapper around SwiftUI's `.sheet` + `.presentationDetents` that gives
// every form sheet in the app the same chrome: drag indicator, thin-material
// background, keyboard-aware safe area, optional title + footer slot.
//
// Mirrors `components/SheetLayout.tsx`'s shape — the title slot sits inside
// the scrollable content rather than as a navigationTitle, so it follows
// the keyboard and sheet height.
//
// Usage:
//   .sheet(isPresented: $showing) {
//       BottomSheet(title: "ხელმოწერის დამატება") {
//           // form content
//       } footer: {
//           Button("შენახვა") { ... }.buttonStyle(.primary)
//       }
//   }

struct BottomSheet<Content: View, Footer: View>: View {
    let title: String?
    var detents: Set<PresentationDetent>
    @ViewBuilder let content: () -> Content
    @ViewBuilder let footer: () -> Footer

    init(title: String? = nil,
         detents: Set<PresentationDetent> = [.medium, .large],
         @ViewBuilder content: @escaping () -> Content,
         @ViewBuilder footer: @escaping () -> Footer = { EmptyView() }) {
        self.title = title
        self.detents = detents
        self.content = content
        self.footer = footer
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let title {
                        Text(title)
                            .font(.spaceGrotesk(20, weight: .bold))
                            .foregroundStyle(Theme.ink)
                            .padding(.top, 12)
                    }
                    content()
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
            }

            // Footer (sticky)
            let footerView = footer()
            if !(footerView is EmptyView) {
                VStack(spacing: 0) {
                    Divider().background(Theme.border)
                    footerView
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                }
                .background(.thinMaterial)
            }
        }
        .background(Theme.surface)
        .presentationDetents(detents)
        .presentationDragIndicator(.visible)
        .presentationBackground(.thinMaterial)
        .presentationCornerRadius(Theme.radius.xxl)
    }
}
