package com.watchora.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchora.data.Catalog
import com.watchora.data.Title
import com.watchora.ui.*
import com.watchora.ui.theme.*

/** 3-column grid jo khud scroll hota hai. */
@Composable
fun TitleGrid(titles: List<Title>, onOpen: (Title) -> Unit, top: Int = 4) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        contentPadding = PaddingValues(start = 16.dp, top = top.dp, end = 16.dp, bottom = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(titles, key = { it.id }) { t -> PosterCard(t, { onOpen(t) }) }
    }
}

/** Section ka "›" dabane par saare titles. */
@Composable
fun ShelfScreen(title: String, titles: List<Title>, onBack: () -> Unit, onOpen: (Title) -> Unit) {
    Column(Modifier.fillMaxSize().background(Bg).statusBarsPadding()) {
        Row(Modifier.padding(horizontal = 8.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButtonW(WIcon.Back, "Wapas jao", onBack)
            Spacer(Modifier.width(4.dp))
            Text(title, color = TextMain, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        }
        TitleGrid(titles, onOpen)
    }
}

@Composable
fun SearchScreen(
    query: String,
    onQuery: (String) -> Unit,
    lang: String?,
    onLang: (String?) -> Unit,
    onOpen: (Title) -> Unit
) {
    val results = remember(query, lang) {
        Catalog.titles.filter {
            (query.isBlank() || it.name.contains(query.trim(), ignoreCase = true)) &&
                (lang == null || it.lang == lang)
        }
    }
    Column(Modifier.fillMaxSize().background(Bg).statusBarsPadding()) {
        ScreenTitle("Search")
        BasicTextField(
            value = query,
            onValueChange = onQuery,
            singleLine = true,
            textStyle = TextStyle(color = TextMain, fontSize = 16.sp),
            cursorBrush = SolidColor(Accent),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            decorationBox = { inner ->
                val shape = RoundedCornerShape(14.dp)
                Row(
                    Modifier
                        .height(48.dp)
                        .clip(shape)
                        .background(SurfaceC)
                        .border(1.dp, Line, shape)
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    WatchIcon(WIcon.Search, Muted, size = 20.dp)
                    Spacer(Modifier.width(10.dp))
                    Box(Modifier.weight(1f)) {
                        if (query.isEmpty()) Text("Movie, series, documentary...", color = Muted, fontSize = 16.sp)
                        inner()
                    }
                }
            }
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val langs = listOf(null to "Sab", "Hindi" to "Hindi", "English" to "English", "Other" to "Baaki")
            items(langs) { (key, label) -> Pill(label, lang == key) { onLang(key) } }
        }
        if (results.isEmpty()) EmptyNote("Koi title nahi mila. Doosra naam ya language try karo.")
        else TitleGrid(results, onOpen, top = 0)
    }
}

@Composable
fun WatchlistScreen(saved: List<String>, onOpen: (Title) -> Unit, onHome: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Bg).statusBarsPadding()) {
        ScreenTitle("Watchlist")
        if (saved.isEmpty()) {
            EmptyNote("Abhi kuch save nahi hai. Kisi title par Watchlist me jodo dabao.") {
                BigButton("Home par jao", onHome, height = 44.dp, corner = 22.dp)
            }
        } else {
            TitleGrid(saved.map(Catalog::get), onOpen, top = 0)
        }
    }
}
