import SwiftUI

struct AuthRootView: View {
    @State private var mode: Mode = .login

    enum Mode { case login, register }

    var body: some View {
        ZStack {
            backdrop
            ScrollView {
                VStack(spacing: 28) {
                    header
                    card
                }
                .padding(.horizontal, 22)
                .padding(.top, 80)
                .padding(.bottom, 40)
            }
        }
    }

    private var backdrop: some View {
        LinearGradient(
            colors: [Theme.accentSoft, Theme.background],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    private var header: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle().fill(Theme.accent)
                    .frame(width: 84, height: 84)
                    .shadow(color: Theme.accent.opacity(0.4), radius: 16, y: 8)
                Image(systemName: "shield.lefthalf.filled.badge.checkmark")
                    .font(.system(size: 42, weight: .bold))
                    .foregroundStyle(.white)
            }
            Text("Sarke")
                .font(.display(36, weight: .black))
                .foregroundStyle(Theme.ink)
            Text("შრომის უსაფრთხოების ექსპერტი")
                .font(.callout)
                .foregroundStyle(Theme.inkSoft)
        }
    }

    private var card: some View {
        VStack(spacing: 18) {
            ModePicker(mode: $mode)
            if mode == .login {
                LoginForm()
            } else {
                RegisterForm(mode: $mode)
            }
        }
        .card(padding: 22)
    }
}

// MARK: - Segmented switch

struct ModePicker: View {
    @Binding var mode: AuthRootView.Mode

    var body: some View {
        HStack(spacing: 0) {
            segment(title: "შესვლა", selected: mode == .login) { mode = .login }
            segment(title: "რეგისტრაცია", selected: mode == .register) { mode = .register }
        }
        .padding(4)
        .background(Theme.subtleSurface)
        .clipShape(Capsule())
    }

    private func segment(title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.display(14, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .foregroundStyle(selected ? .white : Theme.inkSoft)
                .background(selected ? Theme.accent : .clear)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.15), value: selected)
    }
}

// MARK: - Login

struct LoginForm: View {
    @Environment(SessionStore.self) private var session

    @State private var email = ""
    @State private var password = ""
    @State private var isWorking = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 14) {
            labeledField(label: "იმეილი") {
                TextField("you@example.com", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textFieldStyle(.rounded)
            }
            labeledField(label: "პაროლი") {
                SecureField("••••••••", text: $password)
                    .textFieldStyle(.rounded)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(Theme.danger)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button {
                Task { await signIn() }
            } label: {
                HStack {
                    if isWorking { ProgressView().tint(.white) }
                    Text("შესვლა")
                }
            }
            .buttonStyle(.primary)
            .disabled(isWorking || email.isEmpty || password.isEmpty)
        }
    }

    @MainActor
    private func signIn() async {
        isWorking = true; defer { isWorking = false }
        errorMessage = nil
        do {
            try await session.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Register

struct RegisterForm: View {
    @Environment(SessionStore.self) private var session
    @Binding var mode: AuthRootView.Mode

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isWorking = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 14) {
            HStack(spacing: 10) {
                labeledField(label: "სახელი") {
                    TextField("გიორგი", text: $firstName).textFieldStyle(.rounded)
                }
                labeledField(label: "გვარი") {
                    TextField("ხელაძე", text: $lastName).textFieldStyle(.rounded)
                }
            }
            labeledField(label: "იმეილი") {
                TextField("you@example.com", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textFieldStyle(.rounded)
            }
            labeledField(label: "პაროლი (მინ. 6)") {
                SecureField("••••••••", text: $password).textFieldStyle(.rounded)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(Theme.danger)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button {
                Task { await register() }
            } label: {
                HStack {
                    if isWorking { ProgressView().tint(.white) }
                    Text("რეგისტრაცია")
                }
            }
            .buttonStyle(.primary)
            .disabled(!canSubmit)
        }
    }

    private var canSubmit: Bool {
        !firstName.isEmpty && !lastName.isEmpty && !email.isEmpty && password.count >= 6 && !isWorking
    }

    @MainActor
    private func register() async {
        isWorking = true; defer { isWorking = false }
        errorMessage = nil
        do {
            try await session.register(
                email: email, password: password,
                firstName: firstName, lastName: lastName
            )
            try await session.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Field label helper

@ViewBuilder
func labeledField<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(label.uppercased())
            .font(.caption2.weight(.semibold))
            .tracking(0.5)
            .foregroundStyle(Theme.inkSoft)
        content()
    }
}
