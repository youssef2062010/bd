import UIKit
import WebKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate, WKScriptMessageHandler {

    var window: UIWindow?
    var webView: WKWebView?

    let appGroupId = "group.com.fakecall.shared"

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        window = UIWindow(frame: UIScreen.main.bounds)

        let contentController = WKUserContentController()
        contentController.add(self, name: "fakeCallStorage")

        let config = WKWebViewConfiguration()
        config.userContentController = contentController

        webView = WKWebView(frame: window!.bounds, configuration: config)
        let viewController = UIViewController()
        viewController.view = webView
        window?.rootViewController = viewController
        window?.makeKeyAndVisible()

        // Load bundled web app
        if let htmlPath = Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "www/editor-app") {
            let fileUrl = URL(fileURLWithPath: htmlPath)
            let wwwPath = Bundle.main.bundleURL.appendingPathComponent("www")
            webView?.loadFileURL(fileUrl, allowingReadAccessTo: wwwPath)
        }

        return true
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let dict = message.body as? [String: Any],
              let action = dict["action"] as? String else { return }

        let sharedDefaults = UserDefaults(suiteName: appGroupId)

        if action == "SAVE_CONFIG", let config = dict["config"] as? [String: Any] {
            if let jsonData = try? JSONSerialization.data(withJSONObject: config, options: []),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                sharedDefaults?.set(jsonString, forKey: "fake_call_config")
                sharedDefaults?.synchronize()
            }
        } else if action == "GET_CONFIG" {
            let savedJson = sharedDefaults?.string(forKey: "fake_call_config") ?? ""
            let js = "window.__onNativeConfigLoaded(\(savedJson));"
            webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}
