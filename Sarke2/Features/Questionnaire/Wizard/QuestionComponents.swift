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
        await vm.saveAnswer(for: question) { $0.valueBool = value }
    }
}

// MARK: - Measure

struct MeasureQuestionView: View {
    @Bindable var vm: WizardViewModel
    let question: Question
    @State private var text: String = ""

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
            if let v = vm.answersByQuestion[question.id]?.valueNum { text = String(v) }
        }
        .onChange(of: text) { _, newValue in
            Task {
                let num = Double(newValue.replacingOccurrences(of: ",", with: "."))
                await vm.saveAnswer(for: question) { $0.valueNum = num }
            }
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

// MARK: - Component grid

struct ComponentGridQuestionView: View {
    @Bindable var vm: WizardViewModel
    let question: Question

    var body: some View {
        let rows = displayRows
        let cols = question.gridCols ?? []

        VStack(alignment: .leading, spacing: 12) {
            if isHarnessGrid {
                Stepper("რამდენი ქამარი?  (\(vm.harnessRowCount))",
                        value: $vm.harnessRowCount, in: 1...15)
                    .padding(.bottom, 4)
            }

            ScrollView(.horizontal) {
                VStack(spacing: 0) {
                    HStack(spacing: 0) {
                        cellHeader("", width: 140)
                        ForEach(cols, id: \.self) { col in
                            cellHeader(col, width: 120)
                        }
                    }
                    ForEach(rows, id: \.self) { row in
                        HStack(spacing: 0) {
                            cellHeader(row, width: 140, leading: true)
                            ForEach(cols, id: \.self) { col in
                                cell(row: row, col: col)
                            }
                        }
                    }
                }
            }
        }
    }

    private var isHarnessGrid: Bool {
        (question.gridRows ?? []).first == "N1"
    }

    private var displayRows: [String] {
        let base = question.gridRows ?? []
        if isHarnessGrid { return Array(base.prefix(vm.harnessRowCount)) }
        return base
    }

    private func cellHeader(_ text: String, width: CGFloat, leading: Bool = false) -> some View {
        Text(text)
            .font(.caption.weight(.medium))
            .multilineTextAlignment(leading ? .leading : .center)
            .frame(width: width, minHeight: 44, alignment: leading ? .leading : .center)
            .padding(6)
            .background(Theme.subtleSurface)
            .overlay(Rectangle().stroke(.gray.opacity(0.25)))
    }

    private func cell(row: String, col: String) -> some View {
        let values = vm.answersByQuestion[question.id]?.gridValues ?? [:]
        let current = values[row]?[col]
        let options = optionsFor(col: col)

        return Menu {
            ForEach(options, id: \.self) { opt in
                Button(opt) {
                    Task { await setValue(opt, row: row, col: col) }
                }
            }
            if current != nil {
                Button("გასუფთავება", role: .destructive) {
                    Task { await setValue(nil, row: row, col: col) }
                }
            }
        } label: {
            Text(current ?? "—")
                .font(.caption)
                .frame(width: 120, minHeight: 44)
                .background(color(for: current).opacity(0.18))
                .overlay(Rectangle().stroke(.gray.opacity(0.25)))
        }
    }

    private func optionsFor(col: String) -> [String] {
        // Scaffolding columns expect ✓; harness columns expect ვარგისია/დაზიანებულია
        if col.localizedCaseInsensitiveContains("Shoulder") ||
           col.localizedCaseInsensitiveContains("D-Ring") ||
           col.localizedCaseInsensitiveContains("Strap") ||
           col.localizedCaseInsensitiveContains("Rope") ||
           col.localizedCaseInsensitiveContains("Carabiner") ||
           col.localizedCaseInsensitiveContains("Absorber") ||
           col.localizedCaseInsensitiveContains("Hook") ||
           col.localizedCaseInsensitiveContains("Belt") {
            return ["ვარგისია", "დაზიანებულია"]
        }
        return ["✓", "✗"]
    }

    private func color(for value: String?) -> Color {
        switch value {
        case "ვარგისია", "✓", "გამართულია": return .green
        case "დაზიანებულია", "✗", "აღენიშნება დაზიანება": return .red
        case "არ გააჩნია": return .gray
        default: return .clear
        }
    }

    private func setValue(_ value: String?, row: String, col: String) async {
        await vm.saveAnswer(for: question) { answer in
            var grid = answer.gridValues ?? [:]
            var cols = grid[row] ?? [:]
            if let value { cols[col] = value } else { cols.removeValue(forKey: col) }
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
                Task {
                    await vm.saveAnswer(for: question) { $0.valueText = newValue }
                }
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
            if vm.template.category == "harness" {
                Section("ღვედის დასახელება") {
                    TextField("მაგ. Petzl NEWTON", text: $vm.harnessName)
                }
            }
            Section("დასკვნა") {
                TextEditor(text: $vm.conclusionText).frame(minHeight: 140)
            }
            Section {
                Toggle("უსაფრთხოა ექსპლუატაციისთვის", isOn: $vm.isSafeForUse)
            }
        }
    }
}
