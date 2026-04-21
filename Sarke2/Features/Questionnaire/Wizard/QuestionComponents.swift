import SwiftUI
import PhotosUI

// MARK: - Yes/No

struct YesNoQuestionView: View {
    @Bindable var vm: WizardViewModel
    let question: Question

    var body: some View {
        let current = vm.answersByQuestion[question.id]?.valueBool
        HStack(spacing: 12) {
            choiceButton("კი", isSelected: current == true, color: .green) {
                Task { await save(true) }
            }
            choiceButton("არა", isSelected: current == false, color: .red) {
                Task { await save(false) }
            }
        }
    }

    private func choiceButton(_ label: String, isSelected: Bool, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(isSelected ? color.opacity(0.18) : Theme.subtleSurface)
                .foregroundStyle(isSelected ? color : .primary)
                .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.cornerRadius)
                        .stroke(isSelected ? color : .clear, lineWidth: 2)
                )
        }
    }

    private func save(_ value: Bool) async {
        Haptic.tap()
        await vm.saveAnswer(for: question) { $0.valueBool = value }
    }
}

// MARK: - Measure

struct MeasureQuestionView: View {
    @Bindable var vm: WizardViewModel
    let question: Question
    @State private var text: String = ""
    @State private var debounce: Task<Void, Never>?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                TextField("მნიშვნელობა", text: $text)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
                if let unit = question.unit { Text(unit).foregroundStyle(.secondary) }
            }
            if let min = question.minVal, let max = question.maxVal {
                Text("დიაპაზონი: \(min.clean) – \(max.clean)")
                    .font(.caption).foregroundStyle(.secondary)
            }
            if let warning = validationWarning {
                Text(warning).font(.caption).foregroundStyle(.orange)
            }
        }
        .onAppear {
            if let v = vm.answersByQuestion[question.id]?.valueNum { text = v.clean }
        }
        .onChange(of: text) { _, newValue in
            debounce?.cancel()
            debounce = Task {
                try? await Task.sleep(for: .milliseconds(500))
                if Task.isCancelled { return }
                let num = Double(newValue.replacingOccurrences(of: ",", with: "."))
                await vm.saveAnswer(for: question) { $0.valueNum = num }
            }
        }
        .onDisappear {
            debounce?.cancel()
            let num = Double(text.replacingOccurrences(of: ",", with: "."))
            Task { await vm.saveAnswer(for: question) { $0.valueNum = num } }
        }
    }

    private var validationWarning: String? {
        guard let v = Double(text.replacingOccurrences(of: ",", with: ".")) else { return nil }
        if let min = question.minVal, v < min { return "მნიშვნელობა მინიმუმს ქვემოთაა (\(min.clean))" }
        if let max = question.maxVal, v > max { return "მნიშვნელობა მაქსიმუმს აღემატება (\(max.clean))" }
        return nil
    }
}

private extension Double {
    var clean: String {
        self.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(self))
            : String(self)
    }
}

// MARK: - Component grid — one row per step

struct GridRowStepView: View {
    @Bindable var vm: WizardViewModel
    let question: Question
    let row: String

    @State private var commentSheet = false
    @State private var photoSheet = false

    private var cols: [String] { question.gridCols ?? [] }
    private var isHarness: Bool { (question.gridRows ?? []).first == "N1" }

    // For harness, each column is an independent component with a 2-way toggle.
    // For others, all columns are mutually-exclusive statuses and the user picks one.
    private var isMultiField: Bool { isHarness }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text(question.title).font(.footnote).foregroundStyle(.secondary)
                Text(row).font(.title2.bold())

                if isHarness {
                    // Set number of harnesses on the first row's step
                    if row == "N1" {
                        Stepper("რამდენი ქამარი სულ?  (\(vm.harnessRowCount))",
                                value: $vm.harnessRowCount, in: 1...15)
                            .padding(.vertical, 4)
                            .onChange(of: vm.harnessRowCount) { _, _ in
                                Task { await vm.pruneOrphanHarnessRows(for: question) }
                            }
                    }
                    VStack(spacing: 10) {
                        ForEach(cols, id: \.self) { col in
                            harnessRow(col: col)
                        }
                    }
                } else {
                    VStack(spacing: 12) {
                        ForEach(cols, id: \.self) { col in
                            statusButton(col: col)
                        }
                    }
                }

                HStack {
                    Button { commentSheet = true } label: {
                        Label(commentLabel, systemImage: "text.bubble")
                    }.buttonStyle(.bordered)
                    Button { photoSheet = true } label: {
                        Label("ფოტო", systemImage: "camera")
                    }.buttonStyle(.bordered)
                }
            }
            .padding()
        }
        .sheet(isPresented: $commentSheet) { CommentSheet(vm: vm, question: question) }
        .sheet(isPresented: $photoSheet) { PhotoPickerSheet(vm: vm, question: question) }
    }

    private var currentValues: [String: String] {
        vm.answersByQuestion[question.id]?.gridValues?[row] ?? [:]
    }

    private func statusButton(col: String) -> some View {
        let selected = currentValues.values.contains(col)
        return Button {
            Task { await selectExclusive(col: col) }
        } label: {
            HStack {
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(selected ? color(for: col) : .gray)
                Text(col)
                    .font(.headline)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.leading)
                Spacer()
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(selected ? color(for: col).opacity(0.18) : Theme.subtleSurface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius)
                    .stroke(selected ? color(for: col) : .clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    private func harnessRow(col: String) -> some View {
        let value = currentValues[col]
        return HStack {
            Text(col).font(.subheadline).frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 8) {
                choiceChip("✓", color: .green, isSelected: value == "ვარგისია") {
                    Task { await setField(col: col, value: "ვარგისია") }
                }
                choiceChip("✗", color: .red, isSelected: value == "დაზიანებულია") {
                    Task { await setField(col: col, value: "დაზიანებულია") }
                }
            }
        }
        .padding(10)
        .background(Theme.subtleSurface)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func choiceChip(_ label: String, color: Color, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.headline)
                .frame(width: 40, height: 34)
                .background(isSelected ? color.opacity(0.25) : Color(.systemBackground))
                .foregroundStyle(isSelected ? color : .secondary)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(isSelected ? color : Color.gray.opacity(0.3), lineWidth: 1.5)
                )
        }
        .buttonStyle(.plain)
    }

    private func color(for col: String) -> Color {
        switch col {
        case "გამართულია": return .green
        case "აღენიშნება დაზიანება": return .red
        case "არ გააჩნია": return .gray
        default: return Theme.accent
        }
    }

    private var commentLabel: String {
        let has = (vm.answersByQuestion[question.id]?.comment?.isEmpty == false)
        return has ? "კომენტარი ✓" : "კომენტარი"
    }

    // Exclusive: store `{ row: { col: col } }` — one key equals the chosen column.
    private func selectExclusive(col: String) async {
        Haptic.tap()
        await vm.saveAnswer(for: question) { answer in
            var grid = answer.gridValues ?? [:]
            grid[row] = [col: col]
            answer.gridValues = grid
        }
    }

    private func setField(col: String, value: String) async {
        Haptic.tap()
        await vm.saveAnswer(for: question) { answer in
            var grid = answer.gridValues ?? [:]
            var cols = grid[row] ?? [:]
            cols[col] = value
            grid[row] = cols
            answer.gridValues = grid
        }
    }
}

// MARK: - Freetext

struct FreetextQuestionView: View {
    @Bindable var vm: WizardViewModel
    let question: Question
    @State private var text = ""
    @State private var debounce: Task<Void, Never>?

    var body: some View {
        TextEditor(text: $text)
            .frame(minHeight: 180)
            .padding(8)
            .background(Theme.subtleSurface)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .onAppear {
                text = vm.answersByQuestion[question.id]?.valueText ?? ""
            }
            .onChange(of: text) { _, newValue in
                debounce?.cancel()
                debounce = Task {
                    try? await Task.sleep(for: .milliseconds(500))
                    if Task.isCancelled { return }
                    await vm.saveAnswer(for: question) { $0.valueText = newValue }
                }
            }
            .onDisappear {
                debounce?.cancel()
                let snapshot = text
                Task { await vm.saveAnswer(for: question) { $0.valueText = snapshot } }
            }
    }
}

// MARK: - Photo upload (dedicated)

struct PhotoUploadQuestionView: View {
    @Bindable var vm: WizardViewModel
    let question: Question

    @State private var items: [PhotosPickerItem] = []

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            PhotosPicker("ფოტოების არჩევა", selection: $items, maxSelectionCount: 10, matching: .images)
                .buttonStyle(.borderedProminent)
                .onChange(of: items) { _, newItems in
                    Task { await handleSelection(newItems) }
                }

            let answerId = vm.answersByQuestion[question.id]?.id
            let photos = answerId.flatMap { vm.photosByAnswer[$0] } ?? []
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 8) {
                ForEach(photos) { photo in
                    AsyncStoragePhoto(path: photo.storagePath)
                        .frame(height: 100)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
    }

    @MainActor
    private func handleSelection(_ selected: [PhotosPickerItem]) async {
        for item in selected {
            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                await vm.addPhoto(for: question, image: image)
            }
        }
        items = []
    }
}

// MARK: - Photo picker sheet (reused by non-photo questions)

struct PhotoPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var vm: WizardViewModel
    let question: Question
    @State private var items: [PhotosPickerItem] = []

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                PhotosPicker("ფოტოების არჩევა", selection: $items, maxSelectionCount: 10, matching: .images)
                    .buttonStyle(.borderedProminent)
                    .padding()

                let answerId = vm.answersByQuestion[question.id]?.id
                let photos = answerId.flatMap { vm.photosByAnswer[$0] } ?? []
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 8) {
                        ForEach(photos) { photo in
                            AsyncStoragePhoto(path: photo.storagePath)
                                .frame(height: 100)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }.padding()
                }
            }
            .navigationTitle("ფოტოები")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("დასრულება") { dismiss() } }
            }
            .onChange(of: items) { _, newItems in
                Task {
                    for item in newItems {
                        if let data = try? await item.loadTransferable(type: Data.self),
                           let image = UIImage(data: data) {
                            await vm.addPhoto(for: question, image: image)
                        }
                    }
                    items = []
                }
            }
        }
    }
}

// MARK: - Comment sheet

struct CommentSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var vm: WizardViewModel
    let question: Question
    @State private var text = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("კომენტარი", text: $text, axis: .vertical)
                    .lineLimit(3...10)
            }
            .navigationTitle("კომენტარი")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("გაუქმება") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("შენახვა") {
                        Task {
                            await vm.saveAnswer(for: question) { $0.comment = text }
                            dismiss()
                        }
                    }
                }
            }
            .onAppear { text = vm.answersByQuestion[question.id]?.comment ?? "" }
        }
    }
}

// MARK: - Async storage photo

struct AsyncStoragePhoto: View {
    let path: String
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                Rectangle().fill(Theme.subtleSurface)
                    .overlay(ProgressView())
            }
        }
        .task { await load() }
    }

    private func load() async {
        if let data = try? await StorageService.download(bucket: .answerPhotos, path: path),
           let img = UIImage(data: data) {
            self.image = img
        }
    }
}

// MARK: - Conclusion step

struct ConclusionStepView: View {
    @Bindable var vm: WizardViewModel

    var body: some View {
        Form {
            if !vm.unansweredQuestions.isEmpty {
                Section {
                    Label("\(vm.unansweredQuestions.count) კითხვა უპასუხოდ დარჩა. შეამოწმე კითხვარი.",
                          systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                }
            }

            if vm.template.categoryKind == .harness {
                Section("ღვედის დასახელება") {
                    TextField("მაგ. Petzl NEWTON", text: $vm.harnessName)
                }
            }
            Section("დასკვნა") {
                TextEditor(text: $vm.conclusionText).frame(minHeight: 140)
            }
            Section("უსაფრთხოების დასკვნა") {
                Picker("სტატუსი", selection: Binding(
                    get: { vm.isSafeForUse },
                    set: { vm.isSafeForUse = $0 }
                )) {
                    Text("აირჩიე").tag(Bool?.none)
                    Text("✓ უსაფრთხოა").tag(Bool?.some(true))
                    Text("✗ არ არის უსაფრთხო").tag(Bool?.some(false))
                }
                .pickerStyle(.inline)
                .labelsHidden()
                if vm.isSafeForUse == nil {
                    Text("აუცილებლად აირჩიე უსაფრთხოების სტატუსი PDF-ის დაგენერირებამდე.")
                        .font(.caption).foregroundStyle(.red)
                }
            }
        }
    }
}
