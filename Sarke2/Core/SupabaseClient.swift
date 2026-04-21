import Foundation
import Supabase

enum Env {
    static var supabaseURL: URL {
        guard let s = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let url = URL(string: s) else {
            fatalError("SUPABASE_URL missing in Info.plist / Secrets.xcconfig")
        }
        return url
    }

    static var supabaseAnonKey: String {
        guard let s = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String, !s.isEmpty else {
            fatalError("SUPABASE_ANON_KEY missing in Info.plist / Secrets.xcconfig")
        }
        return s
    }
}

enum SupabaseService {
    static let shared = SupabaseClient(
        supabaseURL: Env.supabaseURL,
        supabaseKey: Env.supabaseAnonKey
    )
}
