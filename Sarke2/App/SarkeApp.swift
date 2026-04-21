import SwiftUI

@main
struct SarkeApp: App {
    @State private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(\.locale, Locale(identifier: "ka"))
                .tint(Theme.accent)
                .task { await session.bootstrap() }
        }
    }
}

struct RootView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        Group {
            switch session.state {
            case .loading:
                ProgressView().controlSize(.large)
            case .signedOut:
                AuthRootView()
            case .signedIn:
                MainTabView()
            }
        }
        .animation(.default, value: session.state)
    }
}
