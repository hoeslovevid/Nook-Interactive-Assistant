import XCTest
@testable import NookPhone

final class NookSearchTests: XCTestCase {
    func testSpotlightIdentifiersRoundTripAndRejectMalformedData() {
        let scope = IndexedSession.pcScope("http://192.168.1.10:45821")
        let original = IndexedSession(sessionID: "claude:session+1", archived: true, scope: scope)
        let decoded = IndexedSession.decode(original.identifier)
        XCTAssertEqual(decoded?.sessionID, original.sessionID)
        XCTAssertEqual(decoded?.archived, true)
        XCTAssertEqual(decoded?.scope, scope)
        XCTAssertNil(IndexedSession.decode("https://example.com"))
        XCTAssertNil(IndexedSession.decode("nook.session.invalid"))
        XCTAssertNil(IndexedSession.decode(String(repeating: "x", count: 1001)))
        XCTAssertNotEqual(scope, IndexedSession.pcScope("http://192.168.1.20:45821"))
    }
    func testNewPhoneStateFieldsRemainCompatibleWithOlderPCs() throws {
        let json = #"{"status":"Quiet","sessions":[],"activity":[],"services":[],"detailsEnabled":false,"instructionsEnabled":false}"#
        let state = try JSONDecoder().decode(PhoneState.self, from: Data(json.utf8))
        XCTAssertNil(state.locked)
        XCTAssertNil(state.handoffActive)
    }
}
