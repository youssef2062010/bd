package com.fakecall.editor

import android.content.Context
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        setupWebView()
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true

        webView.addJavascriptInterface(AndroidBridge(this), "FakeCallAndroidBridge")
        webView.loadUrl("file:///android_asset/editor-app/index.html")
    }

    class AndroidBridge(private val context: Context) {

        @JavascriptInterface
        fun getConfigJson(): String {
            val sharedDir = File(context.getExternalFilesDir(null)?.parentFile?.parentFile, "com.fakecall.shared")
            val configFile = File(sharedDir, "config.json")
            return if (configFile.exists()) configFile.readText() else ""
        }

        @JavascriptInterface
        fun saveConfigJson(json: String) {
            try {
                val sharedDir = File(context.getExternalFilesDir(null)?.parentFile?.parentFile, "com.fakecall.shared")
                if (!sharedDir.exists()) {
                    sharedDir.mkdirs()
                }
                val configFile = File(sharedDir, "config.json")
                configFile.writeText(json)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
