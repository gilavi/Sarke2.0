import Foundation
import Security

// Thin wrapper around Security framework keychain APIs. Replaces the Expo
// app's `expo-secure-store` calls.
//
// Use for storing the Supabase refresh token (so a sign-in survives app
// restarts even if Supabase's local persistence is purged), the SMS
// rate-limit per-device counters used by the OTP-signing flow, and any
// other small secrets the offline queue needs.
//
// Keys are namespaced under the bundle identifier as the kSecAttrService
// so two iOS apps sharing the same keychain access group don't collide.
enum Keychain {

    enum KeychainError: Error {
        case unhandled(OSStatus)
        case dataInvalid
    }

    private static var service: String {
        Bundle.main.bundleIdentifier ?? "ge.sarke.app"
    }

    static func setData(_ data: Data, for key: String) throws {
        let baseQuery: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]

        let updateAttributes: [String: Any] = [
            kSecValueData as String:   data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]

        let updateStatus = SecItemUpdate(baseQuery as CFDictionary, updateAttributes as CFDictionary)
        if updateStatus == errSecSuccess { return }
        if updateStatus != errSecItemNotFound { throw KeychainError.unhandled(updateStatus) }

        var addQuery = baseQuery
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
        if addStatus != errSecSuccess { throw KeychainError.unhandled(addStatus) }
    }

    static func setString(_ string: String, for key: String) throws {
        guard let data = string.data(using: .utf8) else { throw KeychainError.dataInvalid }
        try setData(data, for: key)
    }

    static func getData(for key: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String:        kSecClassGenericPassword,
            kSecAttrService as String:  service,
            kSecAttrAccount as String:  key,
            kSecReturnData as String:   true,
            kSecMatchLimit as String:   kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        switch status {
        case errSecSuccess:        return item as? Data
        case errSecItemNotFound:   return nil
        default:                   throw KeychainError.unhandled(status)
        }
    }

    static func getString(for key: String) throws -> String? {
        guard let data = try getData(for: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(for key: String) throws {
        let query: [String: Any] = [
            kSecClass as String:        kSecClassGenericPassword,
            kSecAttrService as String:  service,
            kSecAttrAccount as String:  key,
        ]
        let status = SecItemDelete(query as CFDictionary)
        if status != errSecSuccess && status != errSecItemNotFound {
            throw KeychainError.unhandled(status)
        }
    }
}
