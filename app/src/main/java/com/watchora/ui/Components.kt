package com.watchora.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchora.data.Title
import com.watchora.ui.theme.*

/** Poster ka art (asli image aane tak rang + chaand/suraj). */
@Composable
fun PosterArt(title: Title, modifier: Modifier = Modifier, scrim: Boolean = true) {
    Box(modifier.background(Brush.verticalGradient(listOf(title.top, title.bottom)))) {
        Canvas(Modifier.matchParentSize()) {
            val w = size.width
            val h = size.height
            val c = Offset(w * title.glowX, h * title.glowY)
            val r = w * title.glowSize
            drawCircle(title.glow.copy(alpha = title.glow.alpha * 0.22f), r * 1.9f, c)
            drawCircle(title.glow, r, c)
            drawRect(Color(0xCC050507), topLeft = Offset(0f, h * 0.84f), size = Size(w, h * 0.16f))
        }
        if (scrim) {
            Box(
                Modifier.matchParentSize().background(
                    Brush.verticalGradient(0.45f to Color.Transparent, 1f to Color(0xDB000000))
                )
            )
        }
    }
}

@Composable
fun TagLabel(tag: String, modifier: Modifier = Modifier, fontSize: TextUnit = 9.sp) {
    val hot = tag == "HOT"
    Text(
        tag,
        modifier
            .background(if (hot) Hot else Accent, RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
        color = if (hot) Color.White else Bg,
        fontSize = fontSize,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.6.sp
    )
}

@Composable
fun PosterCard(title: Title, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier
            .aspectRatio(2f / 3f)
            .clip(RoundedCornerShape(10.dp))
            .clickable(role = Role.Button, onClick = onClick)
    ) {
        PosterArt(title, Modifier.matchParentSize())
        if (title.tag.isNotEmpty()) {
            TagLabel(title.tag, Modifier.align(Alignment.TopStart).padding(6.dp))
        }
        Column(Modifier.align(Alignment.BottomStart).padding(8.dp)) {
            Text(
                title.name, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                lineHeight = 15.sp, maxLines = 2, overflow = TextOverflow.Ellipsis
            )
            Text(title.langLabel, color = Color.White.copy(alpha = 0.78f), fontSize = 10.sp)
        }
    }
}

/** 3 column ka grid (scroll hone wali list ke andar use karne ke liye). */
@Composable
fun PosterGrid(titles: List<Title>, onOpen: (Title) -> Unit, modifier: Modifier = Modifier) {
    Column(modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        titles.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { t -> PosterCard(t, { onOpen(t) }, Modifier.weight(1f)) }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
fun Pill(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .height(40.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(if (selected) Accent else ChipBg)
            .clickable(role = Role.Tab, onClick = onClick)
            .padding(horizontal = 18.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = if (selected) Bg else TextMain, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun SectionHeader(text: String, onMore: (() -> Unit)? = null) {
    val click = if (onMore != null) Modifier.clickable(role = Role.Button, onClick = onMore) else Modifier
    Row(
        Modifier
            .fillMaxWidth()
            .then(click)
            .padding(start = 16.dp, end = 12.dp, top = 22.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text, Modifier.weight(1f), color = TextMain, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        if (onMore != null) WatchIcon(WIcon.Chevron, TextMain, size = 22.dp)
    }
}

@Composable
fun Logo(box: Dp = 30.dp, textSize: TextUnit = 20.sp) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(box).clip(RoundedCornerShape(box * 0.3f)).background(Accent),
            contentAlignment = Alignment.Center
        ) { WatchIcon(WIcon.Play, Bg, size = box * 0.48f) }
        Spacer(Modifier.width(8.dp))
        Text("Watchora", color = TextMain, fontSize = textSize, fontWeight = FontWeight.Bold)
    }
}

/** Gol icon button (back, play, search). */
@Composable
fun IconButtonW(
    kind: WIcon,
    description: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 44.dp,
    background: Color = Color.Transparent,
    tint: Color = TextMain
) {
    Box(
        modifier
            .size(size)
            .clip(CircleShape)
            .background(background)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center
    ) { WatchIcon(kind, tint, size = if (size > 50.dp) size * 0.42f else 22.dp) }
}

/** Bada button: filled = accent rang, warna dark outline. */
@Composable
fun BigButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    filled: Boolean = true,
    height: Dp = 52.dp,
    corner: Dp = 14.dp,
    icon: WIcon? = null
) {
    val shape = RoundedCornerShape(corner)
    Row(
        modifier
            .height(height)
            .clip(shape)
            .background(if (filled) Accent else SurfaceC)
            .then(if (filled) Modifier else Modifier.border(1.dp, Line, shape))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 18.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            WatchIcon(icon, if (filled) Bg else TextMain, size = 16.dp)
            Spacer(Modifier.width(8.dp))
        }
        Text(
            text,
            color = if (filled) Bg else TextMain,
            fontSize = 15.sp,
            fontWeight = if (filled) FontWeight.Bold else FontWeight.Medium
        )
    }
}

@Composable
fun AdSlot(modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .height(50.dp)
            .border(1.dp, Line, RoundedCornerShape(10.dp)),
        contentAlignment = Alignment.Center
    ) { Text("Ad: AdMob banner (demo)", color = Muted, fontSize = 12.sp) }
}

@Composable
fun EmptyNote(text: String, modifier: Modifier = Modifier, action: (@Composable () -> Unit)? = null) {
    Column(
        modifier
            .padding(16.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceC)
            .padding(horizontal = 20.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text, color = Muted, fontSize = 15.sp, lineHeight = 22.sp, textAlign = TextAlign.Center)
        if (action != null) {
            Spacer(Modifier.height(16.dp))
            action()
        }
    }
}

@Composable
fun ScreenTitle(text: String) {
    Text(
        text,
        Modifier.padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 12.dp),
        color = TextMain, fontSize = 24.sp, fontWeight = FontWeight.Bold
    )
}
