import Foundation
import Security

enum ConnectionKeychain {
    private static let base: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.nook.phone.connection", kSecAttrAccount as String: "desktop"]
    static func load() -> Connection? {
        var query = base; query[kSecReturnData as String] = true; query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess, let data = result as? Data else { return nil }
        return try? JSONDecoder().decode(Connection.self, from: data)
    }
    static func save(_ connection: Connection) throws {
        let data = try JSONEncoder().encode(connection)
        let updated = SecItemUpdate(base as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if updated == errSecSuccess { return }
        guard updated == errSecItemNotFound else { throw NSError(domain: "Keychain", code: Int(updated)) }
        var query = base; query[kSecValueData as String] = data; query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let status = SecItemAdd(query as CFDictionary)
        guard status == errSecSuccess else { throw NSError(domain: "Keychain", code: Int(status)) }
    }
    static func clear() { SecItemDelete(base as CFDictionary) }
}
