import SwiftUI

struct MainTabView: View {
    @State private var tab: Tab = .home

    enum Tab: Hashable { case home, projects, regulations, more }

    init() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Theme.card)
        appearance.shadowColor = UIColor(Theme.hairline)

        let normal = UITabBarItemAppearance()
        normal.normal.iconColor = UIColor(Theme.inkSoft)
        normal.selected.iconColor = UIColor(Theme.accent)
        normal.normal.titleTextAttributes = [.foregroundColor: UIColor(Theme.inkSoft)]
        normal.selected.titleTextAttributes = [.foregroundColor: UIColor(Theme.accent)]
        appearance.stackedLayoutAppearance = normal
        appearance.inlineLayoutAppearance = normal
        appearance.compactInlineLayoutAppearance = normal

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance

        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = UIColor(Theme.background)
        nav.shadowColor = .clear
        nav.titleTextAttributes = [.foregroundColor: UIColor(Theme.ink)]
        nav.largeTitleTextAttributes = [.foregroundColor: UIColor(Theme.ink)]
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
    }

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
        .tint(Theme.accent)
    }
}
