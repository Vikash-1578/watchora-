package com.watchora.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

enum class WIcon { Play, Pause, Back, Chevron, Search, Home, Bookmark, Person }

/** Simple line icons, bina kisi extra library ke. 24x24 grid par bane hain. */
@Composable
fun WatchIcon(kind: WIcon, tint: Color, modifier: Modifier = Modifier, size: Dp = 24.dp) {
    Canvas(modifier.size(size)) {
        val s = this.size.minDimension / 24f
        fun p(x: Float, y: Float) = Offset(x * s, y * s)
        val line = Stroke(width = 1.8f * s, cap = StrokeCap.Round, join = StrokeJoin.Round)
        val bold = Stroke(width = 2.2f * s, cap = StrokeCap.Round, join = StrokeJoin.Round)
        when (kind) {
            WIcon.Play -> drawPath(Path().apply {
                moveTo(7f * s, 4f * s); lineTo(20f * s, 12f * s); lineTo(7f * s, 20f * s); close()
            }, tint)
            WIcon.Pause -> {
                drawRect(tint, p(6f, 4f), Size(4f * s, 16f * s))
                drawRect(tint, p(14f, 4f), Size(4f * s, 16f * s))
            }
            WIcon.Back -> drawPath(Path().apply {
                moveTo(15f * s, 5f * s); lineTo(8f * s, 12f * s); lineTo(15f * s, 19f * s)
            }, tint, style = bold)
            WIcon.Chevron -> drawPath(Path().apply {
                moveTo(9f * s, 5f * s); lineTo(16f * s, 12f * s); lineTo(9f * s, 19f * s)
            }, tint, style = bold)
            WIcon.Search -> {
                drawCircle(tint, 7f * s, p(11f, 11f), style = line)
                drawLine(tint, p(16.5f, 16.5f), p(20f, 20f), 1.8f * s, StrokeCap.Round)
            }
            WIcon.Home -> drawPath(Path().apply {
                moveTo(3f * s, 11f * s); lineTo(12f * s, 3f * s); lineTo(21f * s, 11f * s)
                lineTo(21f * s, 20f * s); lineTo(15f * s, 20f * s); lineTo(15f * s, 15f * s)
                lineTo(9f * s, 15f * s); lineTo(9f * s, 20f * s); lineTo(3f * s, 20f * s); close()
            }, tint, style = line)
            WIcon.Bookmark -> drawPath(Path().apply {
                moveTo(6f * s, 3f * s); lineTo(18f * s, 3f * s); lineTo(18f * s, 21f * s)
                lineTo(12f * s, 17f * s); lineTo(6f * s, 21f * s); close()
            }, tint, style = line)
            WIcon.Person -> {
                drawCircle(tint, 4f * s, p(12f, 8f), style = line)
                drawPath(Path().apply {
                    moveTo(4f * s, 21f * s)
                    cubicTo(4f * s, 17f * s, 8f * s, 15f * s, 12f * s, 15f * s)
                    cubicTo(16f * s, 15f * s, 20f * s, 17f * s, 20f * s, 21f * s)
                }, tint, style = line)
            }
        }
    }
}
