import SwiftUI

enum WizardStep: Hashable {
    case question(Question)
    case gridRow(Question, row: String, rowIndex: Int)
    case conclusion
}

struct WizardView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var vm: WizardViewModel
    @State private var stepIndex = 0
    @State private var goingToSigning = false
    @State private var confirmExit = false
    @State private var confirmProceedUnanswered = false

    init(questionnaire: Questionnaire, template: Template) {
        let model = WizardViewModel(questionnaire: questionnaire, template: template)
        _vm = State(initialValue: model)
        _stepIndex = State(initialValue: model.savedStepIndex)
    }

    private var flatSteps: [WizardStep] {
        var steps: [WizardStep] = []
        for q in vm.orderedQuestions {
            if q.type == .componentGrid, let rows = q.gridRows {
                let isHarness = rows.first == "N1"
                if isHarness {
                    // Harness takes the entire matrix view in one step rather
                    // than paginating per-belt — Phase F change.
                    steps.append(.question(q))
                } else {
                    for (i, row) in rows.enumerated() {
                        steps.append(.gridRow(q, row: row, rowIndex: i))
                    }
                }
            } else {
                steps.append(.question(q))
            }
        }
        steps.append(.conclusion)
        return steps
    }

    private func isHarnessGrid(_ q: Question) -> Bool {
        q.type == .componentGrid && (q.gridRows ?? []).first == "N1"
    }

    private var stepCount: Int { flatSteps.count }

    var body: some View {
        VStack(spacing: 0) {
            // Restyled progress chrome
            VStack(spacing: 6) {
                ProgressView(value: Double(stepIndex + 1), total: Double(stepCount))
                    .progressViewStyle(.linear)
                    .tint(Theme.accentPrimary)
                    .scaleEffect(x: 1, y: 1.5, anchor: .center)
                Text("\(stepIndex + 1) / \(stepCount)")
                    .font(.inter(11, weight: .semibold))
                    .foregroundStyle(Theme.inkFaint)
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 8)

            if vm.isLoading {
                Spacer(); ProgressView(); Spacer()
            } else {
                let steps = flatSteps
                let safeIndex = min(stepIndex, steps.count - 1)
                stepView(for: steps[safeIndex], stepIndex: safeIndex)
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
                        if vm.unansweredQuestions.isEmpty {
                            proceedToSigning()
                        } else {
                            confirmProceedUnanswered = true
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
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { confirmExit = true } label: {
                    Label("დახურვა", systemImage: "xmark")
                }
            }
        }
        .task { await vm.load() }
        .onChange(of: stepIndex) { _, newValue in
            vm.savedStepIndex = newValue
        }
        .navigationDestination(isPresented: $goingToSigning) {
            SigningView(vm: vm)
        }
        .confirmationDialog("გახსნილი კითხვარი შენახულია ავტომატურად.",
                            isPresented: $confirmExit,
                            titleVisibility: .visible) {
            Button("გასვლა") { dismiss() }
            Button("გაგრძელება", role: .cancel) { }
        }
        .confirmationDialog("\(vm.unansweredQuestions.count) კითხვა უპასუხოდაა. მაინც გააგრძელებ?",
                            isPresented: $confirmProceedUnanswered,
                            titleVisibility: .visible) {
            Button("გაგრძელება") { proceedToSigning() }
            Button("დაბრუნება", role: .cancel) { }
        }
    }

    private func proceedToSigning() {
        Task {
            await vm.saveConclusion()
            goingToSigning = true
        }
    }

    @ViewBuilder
    private func stepView(for step: WizardStep, stepIndex: Int) -> some View {
        switch step {
        case .question(let q):
            if isHarnessGrid(q) {
                // Harness gets a full-screen matrix takeover (no card chrome).
                HarnessMatrixView(vm: vm, question: q) {
                    if self.stepIndex < stepCount - 1 { self.stepIndex += 1 }
                }
            } else {
                ScrollView {
                    QuestionCardContainer(
                        stepNumber: stepIndex + 1,
                        totalSteps: stepCount,
                        title: q.title,
                        keyChange: stepIndex
                    ) {
                        QuestionStepView(vm: vm, question: q)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                }
            }
        case .gridRow(let q, let row, _):
            ScrollView {
                QuestionCardContainer(
                    stepNumber: stepIndex + 1,
                    totalSteps: stepCount,
                    title: "\(q.title) — \(row)",
                    keyChange: stepIndex
                ) {
                    GridRowStepView(vm: vm, question: q, row: row)
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
            }
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
        // Title is rendered by the parent QuestionCardContainer; only the
        // type-specific control + comment/photo affordances live here.
        VStack(alignment: .leading, spacing: 16) {
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
                EmptyView()  // routed to GridRowStepView or HarnessMatrixView via flatSteps
            }

            HStack(spacing: 10) {
                Button { commentSheet = true } label: {
                    Label(commentLabel, systemImage: "text.bubble")
                        .font(.inter(13, weight: .medium))
                }
                .buttonStyle(.secondaryMuted)

                if question.type != .photoUpload {
                    Button { photoSheet = true } label: {
                        Label(photoLabel, systemImage: "camera")
                            .font(.inter(13, weight: .medium))
                    }
                    .buttonStyle(.secondaryMuted)
                }
            }
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
