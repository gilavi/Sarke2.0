import SwiftUI

struct WizardView: View {
    @State private var vm: WizardViewModel
    @State private var stepIndex = 0
    @State private var goingToSigning = false

    init(questionnaire: Questionnaire, template: Template) {
        _vm = State(initialValue: WizardViewModel(questionnaire: questionnaire, template: template))
    }

    // Each step: one question OR the conclusion screen at the end
    private var stepCount: Int {
        vm.orderedQuestions.count + 1   // +1 = conclusion
    }

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
            } else if stepIndex < vm.orderedQuestions.count {
                let question = vm.orderedQuestions[stepIndex]
                QuestionStepView(vm: vm, question: question)
                    .id(question.id)
            } else {
                ConclusionStepView(vm: vm)
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
                case .componentGrid:
                    ComponentGridQuestionView(vm: vm, question: question)
                case .freetext:
                    FreetextQuestionView(vm: vm, question: question)
                case .photoUpload:
                    PhotoUploadQuestionView(vm: vm, question: question)
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
