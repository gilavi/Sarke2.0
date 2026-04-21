import SwiftUI

struct MoreView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        List {
            if let user = session.currentUser {
                Section {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(user.displayName).font(.headline)
                        Text(user.email).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            Section {
                NavigationLink { HistoryView() } label: {
                    Label("ისტორია", systemImage: "clock.arrow.circlepath")
                }
                NavigationLink { CertificatesView() } label: {
                    Label("სერტიფიკატები", systemImage: "rosette")
                }
                NavigationLink { TemplatesView() } label: {
                    Label("შაბლონები", systemImage: "doc.on.doc")
                }
            }
            Section {
                Button(role: .destructive) {
                    Task { try? await session.signOut() }
                } label: {
                    Label("გასვლა", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
        }
        .navigationTitle("მეტი")
    }
}
