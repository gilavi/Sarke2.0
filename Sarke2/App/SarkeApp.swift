import SwiftUI

@main
struct SarkeApp: App {
    @State private var session = SessionStore()
    @State private var networkMonitor = NetworkMonitor.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(networkMonitor)
                .environment(\.locale, Locale(identifier: "ka"))
                .tint(Theme.accentPrimary)
                .task { await session.bootstrap() }
        }
    }
}

struct RootView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        VStack(spacing: 0) {
            OfflineBanner()
            Group {
                switch session.state {
                case .loading:
                    ProgressView().controlSize(.large).frame(maxWidth: .infinity, maxHeight: .infinity)
                case .signedOut:
                    AuthRootView()
                case .signedIn:
                    MainTabView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .animation(.default, value: session.state)
    }
}
