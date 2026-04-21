import SwiftUI

struct AuthRootView: View {
    @State private var showingRegister = false

    var body: some View {
        NavigationStack {
            LoginView(showingRegister: $showingRegister)
                .navigationDestination(isPresented: $showingRegister) {
                    RegisterView()
                }
        }
    }
}

struct LoginView: View {
    @Environment(SessionStore.self) private var session
    @Binding var showingRegister: Bool

    @State private var email = ""
    @State private var password = ""
    @State private var isWorking = false
    @State private var errorMessage: String?

    var body: some View {
        Form {
            Section("შესვლა") {
                TextField("იმეილი", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                SecureField("პაროლი", text: $password)
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.footnote)
            }

            Button {
                Task { await signIn() }
            } label: {
                HStack {
                    if isWorking { ProgressView() } else { Text("შესვლა") }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isWorking || email.isEmpty || password.isEmpty)

            Button("რეგისტრაცია") { showingRegister = true }
                .frame(maxWidth: .infinity)
        }
        .navigationTitle("Sarke")
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

struct RegisterView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var isWorking = false
    @State private var errorMessage: String?
    @State private var showingCheck = false

    var body: some View {
        Form {
            Section("რეგისტრაცია") {
                TextField("სახელი", text: $firstName)
                TextField("გვარი", text: $lastName)
                TextField("იმეილი", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                SecureField("პაროლი (მინ. 6 სიმბოლო)", text: $password)
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.footnote)
            }

            Button {
                Task { await register() }
            } label: {
                HStack {
                    if isWorking { ProgressView() } else { Text("რეგისტრაცია") }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!canSubmit)
        }
        .navigationTitle("რეგისტრაცია")
        .alert("შეამოწმე იმეილი", isPresented: $showingCheck) {
            Button("კარგი") { dismiss() }
        } message: {
            Text("დამადასტურებელი ბმული გამოიგზავნა \(email)-ზე. დადასტურების შემდეგ შეხვედი პირველ ფანჯარაზე.")
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
            showingCheck = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
