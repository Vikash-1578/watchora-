package com.watchora.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchora.data.Title
import com.watchora.ui.*
import com.watchora.ui.theme.*
import kotlinx.coroutines.delay

/** Abhi demo player hai. Phase 4 me yahan ExoPlayer (Media3) aayega. */
@Composable
fun PlayerScreen(t: Title, quality: String, onQuality: () -> Unit, onBack: () -> Unit) {
    var playing by remember { mutableStateOf(true) }
    var progress by remember { mutableFloatStateOf(0f) }

    LaunchedEffect(playing) {
        while (playing && progress < 1f) {
            delay(1000)
            progress = (progress + 0.01f).coerceAtMost(1f)
        }
    }

    Column(Modifier.fillMaxSize().background(Color.Black).statusBarsPadding().navigationBarsPadding()) {
        Row(Modifier.padding(horizontal = 8.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButtonW(WIcon.Back, "Wapas jao", onBack, tint = Color.White)
            Spacer(Modifier.width(4.dp))
            Text(t.name, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Medium)
        }
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f)) {
            PosterArt(t, Modifier.matchParentSize(), scrim = false)
            IconButtonW(
                if (playing) WIcon.Pause else WIcon.Play,
                if (playing) "Pause karo" else "Chalao",
                { playing = !playing },
                Modifier.align(Alignment.Center),
                size = 64.dp, background = Color.Black.copy(alpha = 0.55f), tint = Color.White
            )
        }
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 10.dp)) {
            Slider(
                value = progress,
                onValueChange = { progress = it },
                colors = SliderDefaults.colors(
                    thumbColor = Accent,
                    activeTrackColor = Accent,
                    inactiveTrackColor = Line
                )
            )
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("${(progress * 100).toInt()}% dekha", Modifier.weight(1f), color = Muted, fontSize = 13.sp)
                Box(
                    Modifier
                        .height(44.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .border(1.dp, Line, RoundedCornerShape(22.dp))
                        .clickable(role = Role.Button, onClick = onQuality)
                        .padding(horizontal = 16.dp),
                    contentAlignment = Alignment.Center
                ) { Text("Quality: $quality", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium) }
            }
        }
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 14.dp)) {
            Text(t.name, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(t.fullMeta, Modifier.padding(top = 4.dp), color = Muted, fontSize = 14.sp)
        }
        Spacer(Modifier.weight(1f))
        AdSlot(Modifier.padding(16.dp))
    }
}
