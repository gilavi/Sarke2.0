import SwiftUI

enum WizardStep: Hashable {
    case question(Question)
    case gridRow(Question, row: String, rowIndex: Int)
    case conclusion
}

struct WizardView: View {
    @State private var vm: WizardViewModel
    @State private var stepIndex = 0
    @State private var goingToSigning = false

    init(questionnaire: Questionnaire, template: Template) {
        _vm = State(initialValue: WizardViewModel(questionnaire: questionnaire, template: template))
    }

    private var flatSteps: [WizardStep] {
        var steps: [WizardStep] = []
        for q in vm.orderedQuestions {
            if q.type == .componentGrid, let rows = q.gridRows {
                // For harness template, only show active N-rows
                let isHarness = rows.first == "N1"
                let activeRows = isHarness ? Array(rows.prefix(vm.harnessRowCount)) : rows
                for (i, row) in activeRows.enumerated() {
                    steps.append(.gridRow(q, row: row, rowIndex: i))
                }
            } else {
                steps.append(.question(q))
            }
        }
        steps.append(.conclusion)
        return steps
    }

    private var stepCount: Int { flatSteps.count }

    var body: some View {
        VStack(spacing: 0) {
            ProgressView(value: Double(stepIndex + 1), total: Double(stepCount))
                .padding(.horizontal)
                .padding(.top, 8)

            Text("\(stepIndex + 1) / \(stepCount)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.top, 4)

            if vm.isLoading {
                Spacer(); ProgressView(); Spacer()
            } else {
                let steps = flatSteps
                let safeIndex = min(stepIndex, steps.count - 1)
                stepView(for: steps[safeIndex])
                    .id(safeIndex)
            }

            HStack {
                Button {
                    if stepIndex > 0 { stepIndex -= 1 }
                } label: {
                    Label("უკან", systemImage: "chevron.left")
                }
                .disabled(stepIndex == 0)

                Spacer()

                if stepIndex < stepCount - 1 {
                    Button {
                        stepIndex += 1
                    } label: {
                        Label("შემდეგი", systemImage: "chevron.right")
                            .labelStyle(.titleAndIcon)
                    }
                    .buttonStyle(.borderedProminent)
                } else {
                    Button {
                        Task {
                            await vm.saveConclusion()
                            goingToSigning = true
                        }
                    } label: {
                        Label("ხელმოწერაზე გადასვლა", systemImage: "signature")
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding()
        }
        .navigationTitle(vm.template.name)
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
        .navigationDestination(isPresented: $goingToSigning) {
            SigningView(vm: vm)
        }
    }

    @ViewBuilder
    private func stepView(for step: WizardStep) -> some View {
        switch step {
        case .question(let q):
            QuestionStepView(vm: vm, question: q)
        case .gridRow(let q, let row, _):
            GridRowStepView(vm: vm, question: q, row: row)
        case .conclusion:
            ConclusionStepView(vm: vm)
        }
    }
}

// MARK: - Single question step

struct QuestionStepView: View {
    let vm: WizardViewModel
    let question: Question

    @State private var commentSheet = false
    @State private var photoSheet = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(question.title).font(.title3.bold())

                switch question.type {
                case .yesno:
                    YesNoQuestionView(vm: vm, question: question)
                case .measure:
                    MeasureQuestionView(vm: vm, question: question)
                case .freetext:
                    FreetextQuestionView(vm: vm, question: question)
                case .photoUpload:
                    PhotoUploadQuestionView(vm: vm, question: question)
                case .componentGrid:
                    EmptyView() // routed to GridRowStepView via flatSteps
                }

                HStack {
                    Button {
                        commentSheet = true
                    } label: {
                        Label(commentLabel, systemImage: "text.bubble")
                    }
                    .buttonStyle(.bordered)

                    if question.type != .photoUpload {
                        Button {
                            photoSheet = true
                        } label: {
                            Label(photoLabel, systemImage: "camera")
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }
            .padding()
        }
        .sheet(isPresented: $commentSheet) {
            CommentSheet(vm: vm, question: question)
        }
        .sheet(isPresented: $photoSheet) {
            PhotoPickerSheet(vm: vm, question: question)
        }
    }

    private var commentLabel: String {
        let hasComment = (vm.answersByQuestion[question.id]?.comment?.isEmpty == false)
        return hasComment ? "კომენტარი ✓" : "კომენტარი"
    }

    private var photoLabel: String {
        let count = vm.answersByQuestion[question.id].flatMap { vm.photosByAnswer[$0.id]?.count } ?? 0
        return count == 0 ? "ფოტო" : "ფოტო (\(count))"
    }
}
