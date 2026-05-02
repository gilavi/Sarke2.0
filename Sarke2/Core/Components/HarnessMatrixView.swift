import SwiftUI

// MARK: - HarnessMatrixView
//
// SwiftUI port of `components/HarnessListFlow.tsx` from the Expo app — the
// full-screen takeover used for harness inspections.
//
// Two phases:
//   1. Count picker — huge ± buttons + 72-pt number, "რამდენი ქამარი
//      ექვემდებარება შემოწმებას?" (How many harnesses?). 1-15.
//   2. Per-harness chip list — for each harness N1…NK, show the question's
//      grid columns as ✓/✗ chip pairs. ✗ opens a comment field. Untouched
//      rows auto-mark "ok" on advance.
//
// Drives the same `WizardViewModel.saveAnswer(...) { $0.gridValues = ... }`
// mutations the per-row stepper does — so the model layer is unchanged.

struct HarnessMatrixView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var vm: WizardViewModel
    let question: Question
    var onContinue: () -> Void

    enum Phase { case countPicker, matrix }
    @State private var phase: Phase = .countPicker

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                Divider().background(Theme.border)

                switch phase {
                case .countPicker: countPickerView
                case .matrix:      matrixView
                }
            }
        }
    }

    private var header: some View {
        HStack {
            Button {
                if phase == .matrix { phase = .countPicker } else { dismiss() }
            } label: {
                Image(systemName: phase == .matrix ? "chevron.left" : "xmark")
                    .font(.inter(16, weight: .bold))
                    .foregroundStyle(Theme.ink)
                    .frame(width: 36, height: 36)
                    .background(Theme.surfaceSecondary)
                    .clipShape(Circle())
            }
            Spacer()
            Text(question.title)
                .font(.spaceGrotesk(16, weight: .semibold))
                .foregroundStyle(Theme.ink)
                .lineLimit(1)
            Spacer()
            Color.clear.frame(width: 36, height: 36)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Theme.surface)
    }

    // MARK: Phase 1 — count picker

    private var countPickerView: some View {
        VStack(spacing: 32) {
            Spacer()
            Text("რამდენი ქამარი ექვემდებარება შემოწმებას?")
                .font(.spaceGrotesk(20, weight: .bold))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            HStack(spacing: 32) {
                stepperButton(systemImage: "minus") {
                    if vm.harnessRowCount > 1 {
                        vm.harnessRowCount -= 1
                        Haptic.tap()
                    }
                }
                .opacity(vm.harnessRowCount > 1 ? 1 : 0.3)
                .disabled(vm.harnessRowCount <= 1)

                Text("\(vm.harnessRowCount)")
                    .font(.spaceGrotesk(72, weight: .bold))
                    .foregroundStyle(Theme.accentPrimary)
                    .frame(minWidth: 120)
                    .contentTransition(.numericText())

                stepperButton(systemImage: "plus") {
                    if vm.harnessRowCount < 15 {
                        vm.harnessRowCount += 1
                        Haptic.tap()
                    }
                }
                .opacity(vm.harnessRowCount < 15 ? 1 : 0.3)
                .disabled(vm.harnessRowCount >= 15)
            }

            Spacer()

            Button {
                Haptic.tap()
                phase = .matrix
            } label: {
                Text("გაგრძელება")
            }
            .buttonStyle(.primary)
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
        }
    }

    private func stepperButton(systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.inter(28, weight: .bold))
                .foregroundStyle(Theme.accentPrimary)
                .frame(width: 64, height: 64)
                .background(Theme.accentSoftSurface)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }

    // MARK: Phase 2 — per-harness chip list

    private var matrixView: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 14) {
                ForEach(0..<vm.harnessRowCount, id: \.self) { index in
                    harnessRow(index: index)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)

            Button {
                Task {
                    Haptic.success()
                    await fillUntouchedAsOK()
                    onContinue()
                    dismiss()
                }
            } label: {
                Text("გაგრძელება")
            }
            .buttonStyle(.primary)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
    }

    @ViewBuilder
    private func harnessRow(index: Int) -> some View {
        let rowKey = "N\(index + 1)"
        let cols = question.gridCols ?? []
        let answer = vm.answersByQuestion[question.id]
        let rowValues = answer?.gridValues?[rowKey] ?? [:]

        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(rowKey)
                    .font(.spaceGrotesk(16, weight: .bold))
                    .foregroundStyle(Theme.ink)
                Spacer()
                if rowOK(rowKey: rowKey, columns: cols, values: rowValues) {
                    StatusPill(kind: .completed, text: "OK")
                } else if !rowValues.isEmpty {
                    StatusPill(kind: .danger, text: "ხარვეზი")
                }
            }

            ForEach(cols, id: \.self) { col in
                let current = rowValues[col] ?? ""
                HStack(spacing: 10) {
                    Text(col)
                        .font(.inter(14, weight: .medium))
                        .foregroundStyle(Theme.inkSoft)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    chipButton(symbol: "checkmark", selected: current == "ok", tint: Theme.Color.semantic.success) {
                        Task { await setCell(rowKey: rowKey, col: col, value: "ok") }
                    }
                    chipButton(symbol: "xmark", selected: current == "bad", tint: Theme.Color.semantic.danger) {
                        Task { await setCell(rowKey: rowKey, col: col, value: "bad") }
                    }
                }
            }
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

    private func chipButton(symbol: String, selected: Bool, tint: Color, action: @escaping () -> Void) -> some View {
        Button {
            Haptic.tap()
            action()
        } label: {
            Image(systemName: symbol)
                .font(.inter(13, weight: .bold))
                .foregroundStyle(selected ? .white : tint)
                .frame(width: 32, height: 32)
                .background(selected ? tint : tint.opacity(0.12))
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }

    private func rowOK(rowKey: String, columns: [String], values: [String: String]) -> Bool {
        guard !values.isEmpty else { return false }
        return columns.allSatisfy { (values[$0] ?? "") == "ok" }
    }

    @MainActor
    private func setCell(rowKey: String, col: String, value: String) async {
        await vm.saveAnswer(for: question) { answer in
            var grid = answer.gridValues ?? [:]
            var row = grid[rowKey] ?? [:]
            row[col] = value
            grid[rowKey] = row
            answer.gridValues = grid
        }
    }

    @MainActor
    private func fillUntouchedAsOK() async {
        let cols = question.gridCols ?? []
        await vm.saveAnswer(for: question) { answer in
            var grid = answer.gridValues ?? [:]
            for i in 0..<vm.harnessRowCount {
                let key = "N\(i + 1)"
                var row = grid[key] ?? [:]
                for col in cols where row[col, default: ""].isEmpty {
                    row[col] = "ok"
                }
                grid[key] = row
            }
            answer.gridValues = grid
        }
    }
}
