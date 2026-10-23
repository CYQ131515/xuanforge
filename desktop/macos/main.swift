// ============================================================
//  玄炉 XUANFORGE · macOS 桌面壳
//  Native AppKit window + WKWebView, no external dependencies.
// ============================================================

import AppKit
import WebKit

// MARK: - Local asset scheme
// 用自定义 scheme 加载本地资源，避免 file:// 的来源限制（localStorage / history 等）。

final class WebAssetHandler: NSObject, WKURLSchemeHandler {
    private let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL
        super.init()
    }

    private func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "js", "mjs": return "application/javascript; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "gif": return "image/gif"
        case "ico": return "image/x-icon"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        case "ttf": return "font/ttf"
        case "md", "txt": return "text/plain; charset=utf-8"
        default: return "application/octet-stream"
        }
    }

    private func fail(_ task: WKURLSchemeTask, _ code: Int, _ message: String) {
        let url = task.request.url ?? URL(string: "xuanforge://app/")!
        let response = HTTPURLResponse(url: url, statusCode: code, httpVersion: "HTTP/1.1",
                                       headerFields: ["Content-Type": "text/plain; charset=utf-8"])!
        task.didReceive(response)
        task.didReceive(Data(message.utf8))
        task.didFinish()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            return
        }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        guard let decoded = path.removingPercentEncoding else {
            fail(urlSchemeTask, 400, "Bad path"); return
        }
        let relative = decoded.hasPrefix("/") ? String(decoded.dropFirst()) : decoded
        let fileURL = root.appendingPathComponent(relative).standardizedFileURL
        guard fileURL.path.hasPrefix(root.path) else {
            fail(urlSchemeTask, 403, "Forbidden"); return
        }
        guard let data = try? Data(contentsOf: fileURL) else {
            fail(urlSchemeTask, 404, "Not found: \(relative)"); return
        }
        let mime = mimeType(for: fileURL.pathExtension)
        var headers = ["Content-Type": mime, "Content-Length": "\(data.count)",
                       "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*"]
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                       headerFields: headers)!
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var webRoot: URL!
    let isSmokeTest = CommandLine.arguments.contains("--smoke-test")

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.appearance = NSAppearance(named: .darkAqua)
        buildMenu()

        guard let resourceURL = Bundle.main.resourceURL else {
            fatalError("Missing Resources")
        }
        webRoot = resourceURL.appendingPathComponent("web", isDirectory: true)

        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.javaScriptCanOpenWindowsAutomatically = false

        let controller = WKUserContentController()
        let script = """
        document.documentElement.classList.add('is-desktop');
        """
        controller.addUserScript(WKUserScript(source: script,
                                             injectionTime: .atDocumentStart,
                                             forMainFrameOnly: true))
        config.userContentController = controller
        config.setURLSchemeHandler(WebAssetHandler(root: webRoot), forURLScheme: "xuanforge")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.underPageBackgroundColor = NSColor(srgbRed: 4/255, green: 6/255, blue: 12/255, alpha: 1)
        if #available(macOS 13.3, *) { webView.isInspectable = true }

        let rect = NSRect(x: 0, y: 0, width: 1440, height: 900)
        window = NSWindow(contentRect: rect,
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered,
                          defer: false)
        window.title = "玄炉 XUANFORGE"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor(srgbRed: 4/255, green: 6/255, blue: 12/255, alpha: 1)
        window.minSize = NSSize(width: 1100, height: 720)
        window.collectionBehavior.insert(.fullScreenPrimary)
        window.tabbingMode = .disallowed
        window.contentView = webView
        window.setFrameAutosaveName("XuanForgeMainWindow")
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        let index = webRoot.appendingPathComponent("index.html")
        if FileManager.default.fileExists(atPath: index.path) {
            if let appURL = URL(string: "xuanforge://app/index.html") {
                webView.load(URLRequest(url: appURL))
            } else {
                webView.loadFileURL(index, allowingReadAccessTo: webRoot)
            }
        } else {
            webView.loadHTMLString("<body style='background:#04060c;color:#e9f5f0;font-family:-apple-system;padding:40px'>"
                                   + "<h1>玄炉资源缺失</h1><p>找不到 web/index.html，请重新运行 build.sh。</p></body>",
                                   baseURL: nil)
        }

        if isSmokeTest {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) { [weak self] in
                self?.runSmokeTest()
            }
        } else if CommandLine.arguments.contains("--demo-burn") {
            // 演示/截图用：自动点开炉并跳到武火
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) { [weak self] in
                self?.webView.evaluateJavaScript("document.getElementById('btn-ignite').click()")
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { [weak self] in
                    self?.webView.evaluateJavaScript("XFTrain.jump(0.64)")
                }
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag { window.makeKeyAndOrderFront(nil) }
        return true
    }

    // MARK: - Smoke test

    private func runSmokeTest() {
        let boot = """
        JSON.stringify({
          inner: [innerWidth, innerHeight],
          state: document.body.dataset.state,
          rail: document.querySelectorAll('.rail__item').length,
          furnace: !!document.querySelector('.furnace'),
          desktop: document.documentElement.classList.contains('is-desktop'),
          sound: typeof XFSound,
          train: typeof XFTrain,
          protocol: location.protocol,
          storage: (function(){ try { localStorage.setItem('__xf','1'); return localStorage.getItem('__xf') === '1' ? 'ok' : 'mismatch'; } catch(e) { return 'blocked'; } })(),
          title: document.title
        })
        """
        webView.evaluateJavaScript(boot) { result, error in
            if let result = result {
                print("SMOKE_BOOT \(result)")
            } else {
                print("SMOKE_BOOT_FAIL \(error?.localizedDescription ?? "unknown")")
            }
            self.smokeTraining()
        }
    }

    private func smokeTraining() {
        webView.evaluateJavaScript("document.getElementById('btn-ignite').click(); 'ok'") { _, _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                let js = """
                JSON.stringify({
                  state: document.body.dataset.state,
                  phase: document.getElementById('phase-main').textContent,
                  temp: document.getElementById('v-temp').textContent,
                  logs: XFTrain.getLogs().length,
                  soundCtx: (XFSound.debug() || {}).ctx,
                  soundMode: (XFSound.debug() || {}).mode
                })
                """
                self.webView.evaluateJavaScript(js) { res, err in
                    print("SMOKE_TRAIN \(res ?? "nil") \(err?.localizedDescription ?? "")")
                    self.webView.evaluateJavaScript("XFTrain.jump(0.999); 'ok'") { _, _ in
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.3) {
                            self.webView.evaluateJavaScript("""
                            JSON.stringify({
                              modal: !document.getElementById('modal-done').hidden,
                              file: document.getElementById('lora-file').textContent,
                              view: document.body.dataset.view
                            })
                            """) { res2, _ in
                                print("SMOKE_DONE \(res2 ?? "nil")")
                                self.webView.evaluateJavaScript("document.dispatchEvent(new CustomEvent('xf:nav',{detail:'codex'})); 'ok'") { _, _ in
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                                        self.webView.evaluateJavaScript("""
                                        JSON.stringify({
                                          view: document.body.dataset.view,
                                          cards: document.querySelectorAll('.model-card').length
                                        })
                                        """) { res3, _ in
                                            print("SMOKE_NAV \(res3 ?? "nil")")
                                            NSApp.terminate(nil)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - External links

    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow); return
        }
        if url.scheme == "http" || url.scheme == "https" {
            if navigationAction.navigationType == .linkActivated || navigationAction.targetFrame == nil {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, let scheme = url.scheme,
           scheme == "http" || scheme == "https" {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    // MARK: - Menu

    private func buildMenu() {
        let mainMenu = NSMenu()

        // 玄炉
        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "关于 玄炉", action: #selector(showAbout(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "隐藏 玄炉", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let hideOthers = NSMenuItem(title: "隐藏其他",
                                    action: #selector(NSApplication.hideOtherApplications(_:)),
                                    keyEquivalent: "h")
        hideOthers.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(hideOthers)
        appMenu.addItem(withTitle: "显示全部",
                        action: #selector(NSApplication.unhideAllApplications(_:)),
                        keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "退出 玄炉", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        // 编辑
        let editItem = NSMenuItem()
        mainMenu.addItem(editItem)
        let editMenu = NSMenu(title: "编辑")
        editMenu.addItem(withTitle: "撤销", action: Selector(("undo:")), keyEquivalent: "z")
        let redo = NSMenuItem(title: "重做", action: Selector(("redo:")), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        editMenu.addItem(redo)
        editMenu.addItem(.separator())
        editMenu.addItem(withTitle: "剪切", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "复制", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "粘贴", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "全选", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = editMenu

        // 显示
        let viewItem = NSMenuItem()
        mainMenu.addItem(viewItem)
        let viewMenu = NSMenu(title: "显示")
        viewMenu.addItem(withTitle: "重新载入", action: #selector(reloadPage(_:)), keyEquivalent: "r")
        let full = NSMenuItem(title: "进入全屏幕", action: #selector(toggleFullScreen(_:)), keyEquivalent: "f")
        full.keyEquivalentModifierMask = [.command, .control]
        viewMenu.addItem(full)
        viewMenu.addItem(.separator())
        viewMenu.addItem(withTitle: "放大", action: #selector(zoomIn(_:)), keyEquivalent: "+")
        viewMenu.addItem(withTitle: "缩小", action: #selector(zoomOut(_:)), keyEquivalent: "-")
        viewMenu.addItem(withTitle: "实际大小", action: #selector(zoomReset(_:)), keyEquivalent: "0")
        viewMenu.addItem(.separator())
        let browser = NSMenuItem(title: "在浏览器中打开", action: #selector(openInBrowser(_:)), keyEquivalent: "o")
        browser.keyEquivalentModifierMask = [.command, .shift]
        viewMenu.addItem(browser)
        viewItem.submenu = viewMenu

        // 窗口
        let windowItem = NSMenuItem()
        mainMenu.addItem(windowItem)
        let windowMenu = NSMenu(title: "窗口")
        windowMenu.addItem(withTitle: "最小化", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "缩放", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        windowMenu.addItem(.separator())
        windowMenu.addItem(withTitle: "前置全部窗口",
                           action: #selector(NSApplication.arrangeInFront(_:)),
                           keyEquivalent: "")
        windowItem.submenu = windowMenu
        NSApp.windowsMenu = windowMenu

        // 帮助
        let helpItem = NSMenuItem()
        mainMenu.addItem(helpItem)
        let helpMenu = NSMenu(title: "帮助")
        helpMenu.addItem(withTitle: "观炉须知", action: #selector(openHelp(_:)), keyEquivalent: "?")
        helpMenu.addItem(withTitle: "模型谱", action: #selector(goCodex(_:)), keyEquivalent: "")
        helpMenu.addItem(withTitle: "丹方", action: #selector(goRecipes(_:)), keyEquivalent: "")
        helpItem.submenu = helpMenu
        NSApp.helpMenu = helpMenu

        // set targets for custom actions
        for menu in [viewMenu, helpMenu] {
            for item in menu.items where item.action != nil {
                if item.target == nil { item.target = self }
            }
        }
        // edit menu should target first responder
        for item in editMenu.items { item.target = nil }

        NSApp.mainMenu = mainMenu
    }

    // MARK: - Actions

    @objc private func showAbout(_ sender: Any?) {
        let credits = NSAttributedString(
            string: "一炉一气，炼万千形态。\n\n赛博炼丹炉 · LoRA 训练工作台\n图像 / 视频 / 音频 / 语言，万模一炉。",
            attributes: [.font: NSFont.systemFont(ofSize: 11),
                         .foregroundColor: NSColor.secondaryLabelColor])
        NSApp.orderFrontStandardAboutPanel(options: [.credits: credits])
    }

    @objc private func reloadPage(_ sender: Any?) { webView.reload() }
    @objc private func toggleFullScreen(_ sender: Any?) { window.toggleFullScreen(sender) }

    @objc private func zoomIn(_ sender: Any?) {
        webView.pageZoom = min(2.0, webView.pageZoom + 0.1)
    }
    @objc private func zoomOut(_ sender: Any?) {
        webView.pageZoom = max(0.6, webView.pageZoom - 0.1)
    }
    @objc private func zoomReset(_ sender: Any?) { webView.pageZoom = 1.0 }

    @objc private func openInBrowser(_ sender: Any?) {
        let index = webRoot.appendingPathComponent("index.html")
        NSWorkspace.shared.open(index)
    }

    @objc private func openHelp(_ sender: Any?) {
        webView.evaluateJavaScript("""
        (function(){
          var m = document.getElementById('modal-help');
          if (m) m.hidden = false;
        })();
        """, completionHandler: nil)
    }

    @objc private func goView(_ name: String) {
        webView.evaluateJavaScript("window.dispatchEvent(new CustomEvent('xf:nav',{detail:'\(name)'}))",
                                   completionHandler: nil)
    }
    @objc private func goCodex(_ sender: Any?) { goView("codex") }
    @objc private func goRecipes(_ sender: Any?) { goView("recipes") }
}

// MARK: - Entry point

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
