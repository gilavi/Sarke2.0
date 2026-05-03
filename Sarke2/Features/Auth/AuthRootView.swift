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
    @State private var passwordHidden = true
    @State private var isWorking = false
    @State private var errorMessage: String?
    @State private var infoMessage: String?
    @State private var showingReset = false

    var body: some View {
        VStack(spacing: 14) {
            FloatingLabelInput(label: "ელ-ფოსტა", text: $email)

            FloatingLabelInput(label: "პაროლი", text: $password, isSecure: passwordHidden)
                .trailing { PasswordEyeToggle(isSecure: $passwordHidden) }

            HStack {
                Spacer()
                Button("პაროლი დაგავიწყდა?") { showingReset = true }
                    .font(.inter(13, weight: .medium))
                    .foregroundStyle(Theme.accentPrimary)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.inter(13, weight: .medium))
                    .foregroundStyle(Theme.Color.semantic.danger)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            if let infoMessage {
                Text(infoMessage)
                    .font(.inter(13, weight: .medium))
                    .foregroundStyle(Theme.accentPrimary)
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

            // Divider + Google placeholder (Plan B Phase 5 wires the OAuth flow
            // once a Google Cloud OAuth client + Apple Developer team-ID land.)
            HStack(spacing: 12) {
                Rectangle().fill(Theme.border).frame(height: 1)
                Text("ან")
                    .font(.inter(11, weight: .medium))
                    .foregroundStyle(Theme.inkFaint)
                Rectangle().fill(Theme.border).frame(height: 1)
            }
            .padding(.vertical, 4)

            Button {
                Haptic.tap()
                infoMessage = "Google-ით შესვლა მალე გამოვა."
            } label: {
                HStack(spacing: 10) {
                    Text("G")
                        .font(.spaceGrotesk(18, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 24, height: 24)
                        .background(LinearGradient(colors: [Color(hex: 0x4285F4), Color(hex: 0x34A853)], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .clipShape(Circle())
                    Text("Google-ით შესვლა")
                        .font(.inter(15, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.surface)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius.md, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.radius.md, style: .continuous)
                        .strokeBorder(Theme.border, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
        }
        .sheet(isPresented: $showingReset) {
            PasswordResetSheet(prefilledEmail: email) { sentTo in
                infoMessage = "პაროლის აღდგენის ბმული გაიგზავნა: \(sentTo)"
            }
        }
    }

    @MainActor
    private func signIn() async {
        isWorking = true; defer { isWorking = false }
        errorMessage = nil; infoMessage = nil
        do {
            try await session.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Password reset sheet

struct PasswordResetSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SessionStore.self) private var session
    let prefilledEmail: String
    var onSent: (String) -> Void

    @State private var email: String
    @State private var isWorking = false
    @State private var errorMessage: String?

    init(prefilledEmail: String, onSent: @escaping (String) -> Void) {
        self.prefilledEmail = prefilledEmail
        self.onSent = onSent
        _email = State(initialValue: prefilledEmail)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("პაროლის აღდგენა") {
                    TextField("იმეილი", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Text("გამოგეგზავნება ბმული პაროლის განახლებისთვის.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red).font(.footnote)
                }
            }
            .navigationTitle("აღდგენა")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("დახურვა") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("გაგზავნა") { Task { await send() } }
                        .disabled(email.isEmpty || isWorking)
                }
            }
        }
    }

    @MainActor
    private func send() async {
        isWorking = true; defer { isWorking = false }
        errorMessage = nil
        do {
            try await session.resetPassword(email: email)
            onSent(email)
            dismiss()
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
    @State private var infoMessage: String?

    @State private var passwordHidden = true

    var body: some View {
        VStack(spacing: 14) {
            HStack(spacing: 10) {
                FloatingLabelInput(label: "სახელი", text: $firstName)
                FloatingLabelInput(label: "გვარი", text: $lastName)
            }
            FloatingLabelInput(label: "ელ-ფოსტა", text: $email)
            FloatingLabelInput(label: "პაროლი (მინ. 6)", text: $password, isSecure: passwordHidden)
                .trailing { PasswordEyeToggle(isSecure: $passwordHidden) }

            if let errorMessage {
                Text(errorMessage)
                    .font(.inter(13, weight: .medium))
                    .foregroundStyle(Theme.Color.semantic.danger)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            if let infoMessage {
                Text(infoMessage)
                    .font(.inter(13, weight: .medium))
                    .foregroundStyle(Theme.accentPrimary)
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
        errorMessage = nil; infoMessage = nil
        do {
            try await session.register(
                email: email, password: password,
                firstName: firstName, lastName: lastName
            )
        } catch {
            errorMessage = error.localizedDescription
            return
        }
        // Try immediate sign-in. If it fails, project likely requires email confirmation.
        do {
            try await session.signIn(email: email, password: password)
        } catch {
            infoMessage = "შეამოწმე იმეილი და დაადასტურე რეგისტრაცია, შემდეგ შეხვალ."
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
