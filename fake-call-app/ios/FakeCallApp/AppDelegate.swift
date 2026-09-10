import UIKit
import WebKit
import AVFoundation

@main
class AppDelegate: UIResponder, UIApplicationDelegate, WKScriptMessageHandler {

    var window: UIWindow?
    var webView: WKWebView?

    let appGroupId = "group.com.fakecall.shared"

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // Configure audio session for in-app call speaker and ringer simulation (default to receiver/earpiece)
        do {
            try AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to set audio session category: \(error)")
        }

        window = UIWindow(frame: UIScreen.main.bounds)

        let contentController = WKUserContentController()
        contentController.add(self, name: "fakeCallStorage")

        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        webView = WKWebView(frame: window!.bounds, configuration: config)
        let viewController = UIViewController()
        viewController.view = webView
        window?.rootViewController = viewController
        window?.makeKeyAndVisible()

        // Load bundled web app
        if let htmlPath = Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "www/fake-call-app") {
            let fileUrl = URL(fileURLWithPath: htmlPath)
            let wwwPath = Bundle.main.bundleURL.appendingPathComponent("www")
            webView?.loadFileURL(fileUrl, allowingReadAccessTo: wwwPath)
        }

        return true
    }

    // Handle Script Messages from Web to iOS App Group Container
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let dict = message.body as? [String: Any],
              let action = dict["action"] as? String else { return }

        let sharedDefaults = UserDefaults(suiteName: appGroupId)

        if action == "GET_CONFIG" {
            let savedJson = sharedDefaults?.string(forKey: "fake_call_config") ?? ""
            let js = "window.__onNativeConfigLoaded(\(savedJson));"
            webView?.evaluateJavaScript(js, completionHandler: nil)
        } else if action == "SAVE_CONFIG", let config = dict["config"] as? [String: Any] {
            if let jsonData = try? JSONSerialization.data(withJSONObject: config, options: []),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                sharedDefaults?.set(jsonString, forKey: "fake_call_config")
                sharedDefaults?.synchronize()
            }
        } else if action == "SET_SPEAKER", let isSpeaker = dict["speaker"] as? Bool {
            let session = AVAudioSession.sharedInstance()
            do {
                if isSpeaker {
                    try session.overrideOutputAudioPort(.speaker)
                } else {
                    try session.overrideOutputAudioPort(.none)
                }
            } catch {
                print("Failed to route audio port: \(error)")
            }
        } else if action == "RESET_AUDIO" {
            let session = AVAudioSession.sharedInstance()
            do {
                try session.overrideOutputAudioPort(.none)
            } catch {
                print("Failed to reset audio port: \(error)")
            }
        }
    }
}
