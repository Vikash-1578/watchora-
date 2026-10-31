package com.watchora.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchora.data.Catalog
import com.watchora.data.Title
import com.watchora.ui.*
import com.watchora.ui.theme.*

@Composable
fun DetailScreen(
    t: Title,
    saved: Boolean,
    onToggleSave: () -> Unit,
    onPlay: () -> Unit,
    onBack: () -> Unit,
    onOpen: (Title) -> Unit
) {
    val similar = remember(t.id) { Catalog.similarTo(t) }
    Column(
        Modifier.fillMaxSize().background(Bg).verticalScroll(rememberScrollState()).navigationBarsPadding()
    ) {
        Box(Modifier.fillMaxWidth().height(300.dp)) {
            PosterArt(t, Modifier.matchParentSize(), scrim = false)
            Box(
                Modifier.align(Alignment.BottomStart).fillMaxWidth().height(110.dp)
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Bg)))
            )
            IconButtonW(
                WIcon.Back, "Wapas jao", onBack,
                Modifier.statusBarsPadding().padding(12.dp),
                background = Bg.copy(alpha = 0.6f), tint = Color.White
            )
            IconButtonW(
                WIcon.Play, "Chalao", onPlay,
                Modifier.align(Alignment.Center),
                size = 64.dp, background = Bg.copy(alpha = 0.6f), tint = Color.White
            )
        }

        Column(Modifier.padding(horizontal = 16.dp)) {
            if (t.tag.isNotEmpty()) TagLabel(t.tag, Modifier.padding(bottom = 8.dp), fontSize = 11.sp)
            Text(t.name, color = TextMain, fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold)
            Text(t.fullMeta, Modifier.padding(top = 8.dp), color = Muted, fontSize = 14.sp)
            Row(Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                BigButton("Play", onPlay, Modifier.weight(1f), height = 48.dp, corner = 24.dp, icon = WIcon.Play)
                BigButton(
                    if (saved) "Watchlist me hai" else "Watchlist me jodo", onToggleSave,
                    Modifier.weight(1f), filled = false, height = 48.dp, corner = 24.dp
                )
            }
            Text(t.description, Modifier.padding(top = 18.dp), color = TextMain, fontSize = 15.sp, lineHeight = 23.sp)

            if (t.isSeries) {
                Text(
                    "Episodes", Modifier.padding(top = 22.dp, bottom = 10.dp),
                    color = TextMain, fontSize = 17.sp, fontWeight = FontWeight.SemiBold
                )
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(SurfaceC)) {
                    (1..3).forEach { n ->
                        Row(
                            Modifier.fillMaxWidth().heightIn(min = 56.dp)
                                .clickable(role = Role.Button, onClick = onPlay)
                                .padding(horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Episode $n", Modifier.weight(1f), color = TextMain, fontSize = 15.sp)
                            WatchIcon(WIcon.Play, Accent, size = 18.dp)
                        }
                        if (n < 3) HorizontalDivider(color = Line)
                    }
                }
            }
        }

        SectionHeader("Aapko ye bhi pasand aayega")
        PosterGrid(similar, onOpen)
        AdSlot(Modifier.padding(start = 16.dp, end = 16.dp, top = 22.dp, bottom = 16.dp))
    }
}
