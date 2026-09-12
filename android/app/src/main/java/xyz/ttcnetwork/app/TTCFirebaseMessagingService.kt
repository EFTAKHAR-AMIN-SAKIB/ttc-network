package xyz.ttcnetwork.app

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.net.HttpURLConnection
import java.net.URL

/**
 * Native Firebase Cloud Messaging Service for TTC Network.
 *
 * Handles:
 * - Receiving push messages in the background and foreground
 * - Generating rich Android notifications with avatars, actions, and deep links
 * - Token refresh and persistence to SharedPreferences
 */
class TTCFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "TTCFirebaseMsg"
        private const val PREFS_NAME = "ttc_fcm_prefs"
        private const val KEY_FCM_TOKEN = "fcm_token"
        private const val GROUP_KEY = "xyz.ttcnetwork.app.NOTIFICATIONS"
        private const val SUMMARY_ID = 0

        fun getStoredToken(context: Context): String? {
            return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_FCM_TOKEN, null)
        }

        fun storeToken(context: Context, token: String) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_FCM_TOKEN, token)
                .apply()
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM token generated: ${token.take(15)}...")
        storeToken(this, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "Push message received from: ${message.from}")

        val data = message.data
        val notification = message.notification

        val title = data["title"] ?: notification?.title ?: "TTC NETWORK"
        val body = data["body"] ?: notification?.body ?: "You have a new update."
        val targetUrl = data["targetUrl"] ?: data["click_action"] ?: "/news-feed"
        val iconUrl = data["icon"] ?: data["senderPhotoURL"]
        val imageUrl = data["image"]
        val tag = data["tag"] ?: "ttc-alert-${System.currentTimeMillis()}"

        showNotification(title, body, targetUrl, iconUrl, imageUrl, tag)
    }

    private fun showNotification(
        title: String,
        body: String,
        targetUrl: String,
        iconUrl: String?,
        imageUrl: String?,
        tag: String
    ) {
        // Build deep-link intent to open the target URL in the WebView
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("targetUrl", targetUrl)
            // Also set the data URI so it can be picked up
            this.data = android.net.Uri.parse("https://ttcnetwork.xyz${if (targetUrl.startsWith("/")) targetUrl else "/$targetUrl"}")
        }

        val pendingIntent = PendingIntent.getActivity(
            this, tag.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Load sender avatar as large icon (async on this thread is fine for FCM service)
        val largeIcon = loadBitmapFromUrl(iconUrl)

        // Load big picture if available
        val bigPicture = if (!imageUrl.isNullOrBlank()) loadBitmapFromUrl(imageUrl) else null

        val defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val builder = NotificationCompat.Builder(this, MainActivity.NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(defaultSound)
            .setVibrate(longArrayOf(0, 200, 100, 200))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_SOCIAL)
            .setContentIntent(pendingIntent)
            .setGroup(GROUP_KEY)
            .setColor(0xFFDC2626.toInt()) // TTC primary red

        // Set large icon (sender avatar)
        if (largeIcon != null) {
            builder.setLargeIcon(largeIcon)
        }

        // Use BigTextStyle for long messages, or BigPictureStyle if there's an image
        if (bigPicture != null) {
            builder.setStyle(
                NotificationCompat.BigPictureStyle()
                    .bigPicture(bigPicture)
                    .bigLargeIcon(largeIcon)
                    .setSummaryText(body)
            )
        } else {
            builder.setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(body)
            )
        }

        // Action buttons
        val viewAction = NotificationCompat.Action.Builder(
            R.drawable.ic_notification, "View", pendingIntent
        ).build()
        builder.addAction(viewAction)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notificationId = tag.hashCode()
        notificationManager.notify(notificationId, builder.build())

        // Summary notification for grouping (Android 7+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val summaryNotification = NotificationCompat.Builder(this, MainActivity.NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("TTC NETWORK")
                .setContentText("You have new notifications")
                .setGroup(GROUP_KEY)
                .setGroupSummary(true)
                .setAutoCancel(true)
                .setColor(0xFFDC2626.toInt())
                .build()
            notificationManager.notify(SUMMARY_ID, summaryNotification)
        }
    }

    /**
     * Downloads an image from a URL and returns it as a Bitmap.
     * Returns null on failure — notifications still work without avatars.
     */
    private fun loadBitmapFromUrl(url: String?): Bitmap? {
        if (url.isNullOrBlank()) return null
        val fullUrl = if (url.startsWith("http://") || url.startsWith("https://")) url
                      else "https://ttcnetwork.xyz${if (url.startsWith("/")) url else "/$url"}"
        return try {
            val connection = URL(fullUrl).openConnection() as HttpURLConnection
            connection.doInput = true
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.connect()
            val input = connection.inputStream
            BitmapFactory.decodeStream(input)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to load notification icon: $url", e)
            null
        }
    }
}
