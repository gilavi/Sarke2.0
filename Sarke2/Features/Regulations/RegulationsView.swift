import SwiftUI

struct RegulationItem: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let description: String
    let url: URL?
}

struct RegulationsView: View {
    let items: [RegulationItem] = [
        .init(title: "საქართველოს შრომის უსაფრთხოების კოდექსი",
              description: "ძირითადი საკანონმდებლო აქტი შრომის უსაფრთხოების სფეროში.",
              url: URL(string: "https://matsne.gov.ge/ka/document/view/4486188")),
        .init(title: "ფასადის ხარაჩოები — ტექნიკური რეგლამენტი",
              description: "ხარაჩოების აწყობისა და ექსპლუატაციის წესები.",
              url: nil),
        .init(title: "სიმაღლიდან ვარდნისგან დამცავი საშუალებები",
              description: "ქამრების, თოკების, კარაბინების შერჩევა, შემოწმება.",
              url: nil),
    ]

    var body: some View {
        List(items) { item in
            VStack(alignment: .leading, spacing: 4) {
                Text(item.title).font(.headline)
                Text(item.description).font(.subheadline).foregroundStyle(.secondary)
                if let url = item.url {
                    Link("ბმული", destination: url).font(.caption)
                }
            }
            .padding(.vertical, 4)
        }
        .navigationTitle("რეგულაციები")
    }
}
