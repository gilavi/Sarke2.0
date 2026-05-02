import Foundation
import Network
import Observation

// Reachability watcher — replaces the Expo app's `lib/offline.tsx` reachability
// hook. The offline queue (see Core/OfflineQueue) subscribes to changes and
// flushes pending operations when the path becomes satisfied.
//
// Use as `NetworkMonitor.shared` and inject into the SwiftUI environment from
// SarkeApp.swift via `.environment(NetworkMonitor.shared)`.
@MainActor
@Observable
final class NetworkMonitor {
    static let shared = NetworkMonitor()

    private(set) var isOnline: Bool = true
    private(set) var isExpensive: Bool = false       // cellular / personal hotspot
    private(set) var isConstrained: Bool = false     // Low Data Mode

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "ge.sarke.network-monitor")

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let online = path.status == .satisfied
            let expensive = path.isExpensive
            let constrained = path.isConstrained
            Task { @MainActor in
                guard let self else { return }
                self.isOnline = online
                self.isExpensive = expensive
                self.isConstrained = constrained
            }
        }
        monitor.start(queue: queue)
    }

    deinit { monitor.cancel() }
}
