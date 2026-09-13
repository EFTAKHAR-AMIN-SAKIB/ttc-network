package xyz.ttcnetwork.app

import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.ViewConfiguration
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import kotlin.math.abs

/**
 * Enhanced SwipeRefreshLayout that prevents touch conflicts with horizontal swipe gestures
 * inside the embedded WebView (such as swipeable tab bars, stories, and carousels).
 *
 * If a touch gesture's horizontal displacement exceeds its vertical displacement
 * (accounting for touch slop), this layout yields touch control to the WebView child
 * and refrains from stealing the touch stream with ACTION_CANCEL.
 */
class TouchConflictSwipeRefreshLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : SwipeRefreshLayout(context, attrs) {

    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private var initialDownX = 0f
    private var initialDownY = 0f
    private var isHorizontalSwipe = false

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                initialDownX = ev.x
                initialDownY = ev.y
                isHorizontalSwipe = false
            }

            MotionEvent.ACTION_MOVE -> {
                if (isHorizontalSwipe) {
                    // Once recognized as a horizontal gesture, never intercept!
                    return false
                }

                val deltaX = abs(ev.x - initialDownX)
                val deltaY = abs(ev.y - initialDownY)

                // If horizontal movement exceeds touch slop and dominates vertical movement,
                // lock this gesture sequence as horizontal and let the WebView handle it.
                if (deltaX > touchSlop && deltaX > deltaY) {
                    isHorizontalSwipe = true
                    return false
                }
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                isHorizontalSwipe = false
            }
        }

        return super.onInterceptTouchEvent(ev)
    }
}
