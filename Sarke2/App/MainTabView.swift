import SwiftUI

struct MainTabView: View {
    @State private var tab: Tab = .home

    enum Tab: Hashable { case home, projects, regulations, more }

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack { HomeView() }
                .tabItem { Label("მთავარი", systemImage: "house.fill") }
                .tag(Tab.home)

            NavigationStack { ProjectsListView() }
                .tabItem { Label("პროექტები", systemImage: "folder.fill") }
                .tag(Tab.projects)

            NavigationStack { RegulationsView() }
                .tabItem { Label("რეგულაციები", systemImage: "book.fill") }
                .tag(Tab.regulations)

            NavigationStack { MoreView() }
                .tabItem { Label("მეტი", systemImage: "ellipsis.circle.fill") }
                .tag(Tab.more)
        }
    }
}
