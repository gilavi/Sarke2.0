import Foundation
import Supabase

@Observable
final class SessionStore {
    enum State: Equatable { case loading, signedOut, signedIn }

    var state: State = .loading
    var currentUser: AppUser?

    func bootstrap() async {
        do {
            let session = try await SupabaseService.shared.auth.session
            await loadUser(userId: session.user.id)
        } catch {
            state = .signedOut
        }
        await observeAuthChanges()
    }

    private func observeAuthChanges() async {
        for await change in SupabaseService.shared.auth.authStateChanges {
            switch change.event {
            case .signedIn, .tokenRefreshed, .initialSession:
                if let user = change.session?.user {
                    await loadUser(userId: user.id)
                } else {
                    state = .signedOut
                }
            case .signedOut:
                currentUser = nil
                state = .signedOut
            default:
                break
            }
        }
    }

    func loadUser(userId: UUID) async {
        do {
            let user: AppUser = try await SupabaseService.shared
                .from("users")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            currentUser = user
            state = .signedIn
        } catch {
            state = .signedOut
        }
    }

    func signIn(email: String, password: String) async throws {
        _ = try await SupabaseService.shared.auth.signIn(email: email, password: password)
    }

    func register(email: String, password: String, firstName: String, lastName: String) async throws {
        _ = try await SupabaseService.shared.auth.signUp(
            email: email,
            password: password,
            data: [
                "first_name": .string(firstName),
                "last_name": .string(lastName)
            ]
        )
    }

    func signOut() async throws {
        try await SupabaseService.shared.auth.signOut()
    }

    func resetPassword(email: String) async throws {
        try await SupabaseService.shared.auth.resetPasswordForEmail(email)
    }
}
