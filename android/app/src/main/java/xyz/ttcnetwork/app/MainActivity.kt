package xyz.ttcnetwork.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Bitmap
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.webkit.*
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import android.webkit.JavascriptInterface
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : ComponentActivity() {

    companion object {
        const val BASE_URL = "https://ttcnetwork.xyz/news-feed?source=app"
        const val NOTIFICATION_CHANNEL_ID = "ttc_notifications_channel"
    }

    /**
     * JavaScript interface to bridge native FCM token to the web app.
     * The web app calls window.TTCNative.getFCMToken() or registerToken(uid)
     */
    inner class TTCNativeBridge {

        @JavascriptInterface
        fun getFCMToken(): String {
            return TTCFirebaseMessagingService.getStoredToken(this@MainActivity) ?: ""
        }

        @JavascriptInterface
        fun registerToken(uid: String) {
            if (uid.isBlank()) return

            val stored = TTCFirebaseMessagingService.getStoredToken(this@MainActivity)
            if (!stored.isNullOrBlank()) {
                sendTokenToApi(uid, stored)
            } else {
                FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    if (task.isSuccessful && !task.result.isNullOrBlank()) {
                        val token = task.result
                        TTCFirebaseMessagingService.storeToken(this@MainActivity, token)
                        sendTokenToApi(uid, token)
                    }
                }
            }
        }

        private fun sendTokenToApi(uid: String, token: String) {
            thread {
                try {
                    val url = URL("https://ttcnetwork.xyz/api/register-push")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.doOutput = true
                    conn.connectTimeout = 15000
                    conn.readTimeout = 15000

                    val json = JSONObject().apply {
                        put("uid", uid)
                        put("token", token)
                    }

                    OutputStreamWriter(conn.outputStream).use {
                        it.write(json.toString())
                        it.flush()
                    }

                    val responseCode = conn.responseCode
                    android.util.Log.d("TTCNativeBridge", "Token registered for $uid: HTTP $responseCode")
                    conn.disconnect()
                } catch (e: Exception) {
                    android.util.Log.e("TTCNativeBridge", "Failed to register token for $uid", e)
                }
            }
        }

        @JavascriptInterface
        fun isNativeApp(): Boolean = true

        @JavascriptInterface
        fun setSwipeRefreshEnabled(enabled: Boolean) {
            runOnUiThread {
                swipeRefresh.isEnabled = enabled
            }
        }
    }

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: TouchConflictSwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineContainer: LinearLayout
    private lateinit var btnRetry: Button
    private lateinit var splashOverlay: FrameLayout

    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var lastBackPressTime: Long = 0L

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (fileChooserCallback == null) return@registerForActivityResult

        val uris = when {
            result.resultCode == RESULT_OK && result.data != null -> {
                val data = result.data
                if (data?.clipData != null) {
                    val count = data.clipData!!.itemCount
                    val uriList = ArrayList<Uri>()
                    for (i in 0 until count) {
                        uriList.add(data.clipData!!.getItemAt(i).uri)
                    }
                    uriList.toTypedArray()
                } else if (data?.data != null) {
                    arrayOf(data.data!!)
                } else {
                    null
                }
            }
            else -> null
        }
        fileChooserCallback?.onReceiveValue(uris)
        fileChooserCallback = null
    }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            createNotificationChannel()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Handle edge-to-edge system bars (Android 15 enforcement)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContentView(R.layout.activity_main)

        val rootLayout = findViewById<View>(R.id.root_layout)
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { view, windowInsets ->
            val insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.updatePadding(
                top = insets.top,
                bottom = insets.bottom,
                left = insets.left,
                right = insets.right
            )
            WindowInsetsCompat.CONSUMED
        }

        // Configure system bar icon contrast based on day/night mode
        val insetsController = WindowCompat.getInsetsController(window, window.decorView)
        val isNightMode = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        insetsController.isAppearanceLightStatusBars = !isNightMode
        insetsController.isAppearanceLightNavigationBars = !isNightMode

        webView = findViewById(R.id.web_view)
        swipeRefresh = findViewById(R.id.swipe_refresh)
        progressBar = findViewById(R.id.progress_bar)
        offlineContainer = findViewById(R.id.offline_container)
        btnRetry = findViewById(R.id.btn_retry)
        splashOverlay = findViewById(R.id.splash_overlay)

        createNotificationChannel()
        requestNotificationPermissionIfNeeded()
        setupWebView()
        setupSwipeRefresh()
        setupBackNavigation()

        btnRetry.setOnClickListener {
            offlineContainer.visibility = View.GONE
            splashOverlay.visibility = View.GONE
            webView.visibility = View.VISIBLE
            webView.reload()
        }

        // Handle initial load or deep-link intent
        val targetUrl = getTargetUrlFromIntent(intent) ?: BASE_URL
        webView.loadUrl(targetUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        settings.setSupportMultipleWindows(false)
        settings.useWideViewPort = true
        // Append custom client tag to User-Agent for native detection
        val currentUa = settings.userAgentString
        settings.userAgentString = "$currentUa TTCNetworkApp/1.0.0 (Android)"

        // Add native bridge for FCM token exchange
        webView.addJavascriptInterface(TTCNativeBridge(), "TTCNative")

        // Ensure we have a fresh native FCM token and persist it
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                if (!token.isNullOrBlank()) {
                    TTCFirebaseMessagingService.storeToken(this@MainActivity, token)
                    android.util.Log.d("MainActivity", "Native FCM token stored: ${token.take(15)}...")
                    runOnUiThread {
                        val js = """
                            (function() {
                                window.__ttcNativeFcmToken = '$token';
                                window.dispatchEvent(new CustomEvent('ttc-native-fcm-ready', {
                                    detail: { hasToken: true, token: '$token' }
                                }));
                            })();
                        """.trimIndent()
                        webView.evaluateJavascript(js, null)
                    }
                }
            }
        }

        // Inject PWA mode cookie so the web app recognizes the native client
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)
        cookieManager.setCookie("https://ttcnetwork.xyz", "pwa_mode=true; Path=/; Max-Age=31536000")
        cookieManager.setCookie("https://ttc-network.vercel.app", "pwa_mode=true; Path=/; Max-Age=31536000")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                    swipeRefresh.isRefreshing = false
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                
                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = null
                    return false
                }
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false

                // If internal URL, open in WebView
                if (url.contains("ttcnetwork.xyz") || url.contains("ttc-network.vercel.app") || url.startsWith(BASE_URL) || url.startsWith("/")) {
                    return false
                }

                // If external scheme or social platform, launch external intent
                return try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    true
                } catch (e: Exception) {
                    false
                }
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                offlineContainer.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }

            override fun onPageCommitVisible(view: WebView?, url: String?) {
                super.onPageCommitVisible(view, url)
                injectNativeStandaloneMode(view)
                hideSplash()
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectNativeStandaloneMode(view)
                injectNativeFCMToken(view)
                hideSplash()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    webView.visibility = View.GONE
                    offlineContainer.visibility = View.VISIBLE
                    splashOverlay.visibility = View.GONE
                    swipeRefresh.isRefreshing = false
                }
            }
        }

        // File download listener
        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, _ ->
            try {
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    setMimeType(mimetype)
                    addRequestHeader("User-Agent", userAgent)
                    setDescription("Downloading file from TTC Network...")
                    setTitle(URLUtil.guessFileName(url, contentDisposition, mimetype))
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        URLUtil.guessFileName(url, contentDisposition, mimetype)
                    )
                }
                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
                Toast.makeText(this, "Downloading file...", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                // Fallback to browser
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                startActivity(intent)
            }
        }
    }

    private fun setupSwipeRefresh() {
        swipeRefresh.setColorSchemeColors(ContextCompat.getColor(this, R.color.primary))
        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }
        swipeRefresh.setOnChildScrollUpCallback { _, _ ->
            webView.canScrollVertically(-1)
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    val currentTime = System.currentTimeMillis()
                    if (currentTime - lastBackPressTime < 2000) {
                        finish()
                    } else {
                        lastBackPressTime = currentTime
                        Toast.makeText(this@MainActivity, "Press back again to exit", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "TTC Network Updates"
            val descriptionText = "Official circulars, study resources, and peer notifications"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(NOTIFICATION_CHANNEL_ID, name, importance).apply {
                description = descriptionText
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 200, 100, 200)
                enableLights(true)
                lightColor = ContextCompat.getColor(this@MainActivity, R.color.primary)
                val defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build()
                setSound(defaultSound, audioAttributes)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun injectNativeStandaloneMode(view: WebView?) {
        val script = """
            (function() {
                if (!window.__ttcNativeInjected) {
                    window.__ttcNativeInjected = true;
                    var origMatchMedia = window.matchMedia;
                    window.matchMedia = function(q) {
                        if (q === '(display-mode: standalone)') {
                            return {
                                matches: true,
                                media: q,
                                onchange: null,
                                addListener: function() {},
                                removeListener: function() {},
                                addEventListener: function() {},
                                removeEventListener: function() {},
                                dispatchEvent: function() { return false; }
                            };
                        }
                        return origMatchMedia ? origMatchMedia.call(window, q) : { matches: false };
                    };
                }

                var styleId = 'ttc-native-dock-override';
                if (!document.getElementById(styleId)) {
                    var style = document.createElement('style');
                    style.id = styleId;
                    style.innerHTML = [
                        'div[class*="fixed bottom-0"] a[href="/"] { display: none !important; }',
                        'div[class*="fixed bottom-0"] a[data-dock-link="home"] { display: none !important; }',
                        'nav a[href="/"].nav-home-link { display: none !important; }'
                    ].join('\n');
                    (document.head || document.documentElement).appendChild(style);
                }
            })();
        """.trimIndent()
        view?.evaluateJavascript(script, null)
    }

    /**
     * Injects the native FCM token into the web app so it can register it with Firestore.
     * This bridges the gap since WebView doesn't support Web Push API.
     */
    private fun injectNativeFCMToken(view: WebView?) {
        val script = """
            (function() {
                function syncUserWithNative() {
                    if (typeof TTCNative === 'undefined' || window.__ttcSyncDone) return;

                    // 1. Try Firebase Auth IndexedDB (Default for Firebase Web SDK)
                    try {
                        var idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
                        if (idb) {
                            var req = idb.open('firebaseLocalStorageDb');
                            req.onsuccess = function(e) {
                                try {
                                    var db = e.target.result;
                                    if (db.objectStoreNames.contains('firebaseLocalStorage')) {
                                        var tx = db.transaction('firebaseLocalStorage', 'readonly');
                                        var store = tx.objectStore('firebaseLocalStorage');
                                        var cursorReq = store.openCursor();
                                        cursorReq.onsuccess = function(ev) {
                                            var cursor = ev.target.result;
                                            if (cursor) {
                                                var val = cursor.value;
                                                var uid = (val && val.value && val.value.uid) || (val && val.uid);
                                                if (uid && typeof TTCNative !== 'undefined') {
                                                    window.__ttcSyncDone = true;
                                                    TTCNative.registerToken(uid);
                                                    return;
                                                }
                                                cursor.continue();
                                            }
                                        };
                                    }
                                } catch(err) {}
                            };
                        }
                    } catch(e) {}

                    // 2. Try localStorage fallback
                    try {
                        for (var i = 0; i < localStorage.length; i++) {
                            var k = localStorage.key(i);
                            if (k && (k.indexOf('authUser') !== -1 || k.indexOf('firebase') !== -1)) {
                                var raw = localStorage.getItem(k);
                                if (raw) {
                                    var parsed = JSON.parse(raw);
                                    var uid = (parsed && parsed.uid) || (parsed && parsed.value && parsed.value.uid);
                                    if (uid && typeof TTCNative !== 'undefined') {
                                        window.__ttcSyncDone = true;
                                        TTCNative.registerToken(uid);
                                        return;
                                    }
                                }
                            }
                        }
                    } catch(e) {}

                    // 3. Try global object
                    try {
                        if (window.__ttcUser && window.__ttcUser.uid && typeof TTCNative !== 'undefined') {
                            window.__ttcSyncDone = true;
                            TTCNative.registerToken(window.__ttcUser.uid);
                            return;
                        }
                    } catch(e) {}
                }

                syncUserWithNative();
                setTimeout(syncUserWithNative, 1500);
                setTimeout(syncUserWithNative, 4000);

                window.dispatchEvent(new CustomEvent('ttc-native-fcm-ready', {
                    detail: { hasToken: typeof TTCNative !== 'undefined' && TTCNative.getFCMToken() !== '' }
                }));
            })();
        """.trimIndent()
        view?.evaluateJavascript(script, null)
    }

    private fun hideSplash() {
        if (splashOverlay.visibility == View.VISIBLE) {
            splashOverlay.animate()
                .alpha(0f)
                .setDuration(280)
                .withEndAction {
                    splashOverlay.visibility = View.GONE
                }
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    private fun getTargetUrlFromIntent(intent: Intent?): String? {
        if (intent == null) return null

        // 1. Direct URI
        val dataStr = intent.dataString
        if (!dataStr.isNullOrBlank() && (dataStr.startsWith("http://") || dataStr.startsWith("https://"))) {
            return dataStr
        }

        // 2. Notification extras (FCM puts data payload in extras when tapped)
        val extras = intent.extras
        if (extras != null) {
            val target = extras.getString("targetUrl")
                ?: extras.getString("click_action")
                ?: extras.getString("url")
                ?: extras.getString("link")

            if (!target.isNullOrBlank() && !target.startsWith("android.intent")) {
                return if (target.startsWith("http://") || target.startsWith("https://")) target
                else "https://ttcnetwork.xyz${if (target.startsWith("/")) target else "/$target"}"
            }
        }

        return null
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)

        // Handle notification click deep link
        val targetUrl = getTargetUrlFromIntent(intent)
        if (!targetUrl.isNullOrBlank()) {
            android.util.Log.d("MainActivity", "Navigating to deep link: $targetUrl")
            webView.loadUrl(targetUrl)
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
