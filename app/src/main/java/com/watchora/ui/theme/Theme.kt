package com.watchora.ui.theme

import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider

private val WatchoraColors = darkColorScheme(
    primary = Accent,
    onPrimary = Bg,
    background = Bg,
    onBackground = TextMain,
    surface = Bg,
    onSurface = TextMain,
    surfaceVariant = SurfaceC,
    onSurfaceVariant = Muted,
    outline = Line
)

@Composable
fun WatchoraTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = WatchoraColors, typography = Typography) {
        CompositionLocalProvider(LocalContentColor provides TextMain, content = content)
    }
}
