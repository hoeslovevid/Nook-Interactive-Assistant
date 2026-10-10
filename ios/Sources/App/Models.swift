import Foundation

enum NookQuery {
    static func route(_ path: String, name: String, value: String) -> String {
        var components = URLComponents()
        components.path = path
        components.queryItems = [URLQueryItem(name: name, value: value)]
        // The desktop uses form-style query decoding, where an unescaped plus is a space.
        return components.string!.replacingOccurrences(of: "+", with: "%2B")
    }
}

struct Connection: Codable { var address: String; var token: String }
struct PhoneState: Decodable {
    var status: String
    var sessions: [AgentSession]
    var pending: AgentRequest?
    var activity: [RecentActivity]
    var services: [ServiceSummary]
    var detailsEnabled: Bool
    var instructionsEnabled: Bool
}
struct AgentSession: Decodable, Identifiable {
    var id: String; var label: String?; var agent: String; var finished: Bool; var file: String?; var task: String?
}
struct AgentRequest: Decodable, Identifiable {
    var id: String; var title: String; var detail: String; var kind: String; var questions: [AgentQuestion]; var always: Bool
}
struct AgentQuestion: Decodable, Identifiable {
    var question: String; var options: [QuestionOption]; var multi: Bool?
    var id: String { question }
}
struct QuestionOption: Decodable, Identifiable { var label: String; var description: String?; var id: String { label } }
struct RecentActivity: Decodable { var title: String; var detail: String?; var agent: String? }
struct ServiceSummary: Decodable, Identifiable { var id: String; var title: String; var detail: String }
struct SessionDetail: Decodable, Identifiable {
    var id: String; var label: String?; var agent: String; var finished: Bool; var final: String; var steps: [SessionStep]; var decisions: [SavedDecision]?
}
struct SessionStep: Decodable {
    var time: Double; var task: String; var title: String; var file: String; var detail: String; var diff: String; var added: Int; var removed: Int
}
struct SavedDecision: Decodable { var action: String; var time: Double; var title: String; var detail: String }
struct HistoryItem: Decodable, Identifiable { var id: String; var label: String; var agent: String; var project: String; var time: Double; var decisions: Int; var steps: Int }
struct HistoryResponse: Decodable { var items: [HistoryItem] }
struct ServiceDetail: Decodable { var service: String; var items: [ServiceItem] }
struct ServiceItem: Decodable, Identifiable { var id: String; var title: String; var detail: String; var url: String; var actions: [ServiceAction] }
struct ServiceAction: Decodable, Identifiable { var id: String; var label: String }
struct PairResponse: Decodable { var token: String }
struct ResultResponse: Decodable { var ok: Bool; var cancelled: Bool?; var error: String? }
