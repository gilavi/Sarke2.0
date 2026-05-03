import SwiftUI

// MARK: - CalendarView (Phase C scaffold)
//
// 5th tab placeholder. The full calendar implementation lands in Plan B
// Phase 5 (Functional Parity — calendar UI proper, Google sync). For now
// this view loads `ScheduleService.list()` and renders the upcoming
// inspections as a simple list, plus an empty state when there are none.
// Mirrors the tab's intent in the Expo app.

struct CalendarView: View {
    @State private var schedules: [Schedule] = []
    @State private var isLoading = true

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("კალენდარი")
                        .font(.spaceGrotesk(28, weight: .bold))
                        .foregroundStyle(Theme.ink)
                        .padding(.horizontal, 20)
                        .padding(.top, 8)

                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 40)
                    } else if schedules.isEmpty {
                        emptyState
                    } else {
                        ForEach(schedules) { schedule in
                            scheduleRow(schedule)
                                .padding(.horizontal, 20)
                        }
                    }
                }
                .padding(.bottom, 24)
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "calendar")
                .font(.system(size: 48))
                .foregroundStyle(Theme.inkFaint)
            Text("შემოწმებები არ არის დაგეგმილი")
                .font(.inter(15, weight: .medium))
                .foregroundStyle(Theme.inkSoft)
            Text("რეგულარული შემოწმებების დასაგეგმად დაამატე ობიექტი პროექტში.")
                .font(.inter(13))
                .foregroundStyle(Theme.inkFaint)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    @ViewBuilder
    private func scheduleRow(_ schedule: Schedule) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                if let next = schedule.nextDueAt {
                    Text(next.formatted(date: .abbreviated, time: .shortened))
                        .font(.inter(14, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                }
                if let last = schedule.lastInspectedAt {
                    Text("ბოლოს: \(last.formatted(date: .abbreviated, time: .omitted))")
                        .font(.inter(12))
                        .foregroundStyle(Theme.inkFaint)
                }
            }
            Spacer()
            StatusPill(kind: .info, text: "\(schedule.intervalDays) დღე")
        }
        .padding(14)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius.lg, style: .continuous)
                .strokeBorder(Theme.border, lineWidth: 0.5)
        )
        .themeShadow(Theme.shadow.card)
    }

    @MainActor
    private func load() async {
        isLoading = true; defer { isLoading = false }
        schedules = (try? await ScheduleService.list()) ?? []
    }
}
