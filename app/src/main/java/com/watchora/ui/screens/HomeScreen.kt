package com.watchora.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchora.data.Catalog
import com.watchora.data.Category
import com.watchora.data.Title
import com.watchora.ui.*
import com.watchora.ui.theme.*

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HomeScreen(
    category: Category?,
    onCategory: (Category?) -> Unit,
    onOpen: (Title) -> Unit,
    onPlay: (Title) -> Unit,
    onShelf: (String) -> Unit,
    onSearch: () -> Unit
) {
    LazyColumn(
        Modifier.fillMaxSize().background(Bg),
        contentPadding = PaddingValues(bottom = 16.dp)
    ) {
        // Upar logo + category pills (scroll par chipke rehte hain)
        stickyHeader {
            Column(Modifier.fillMaxWidth().background(Bg).statusBarsPadding().padding(bottom = 6.dp)) {
                Row(
                    Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Logo()
                    Spacer(Modifier.weight(1f))
                    IconButtonW(WIcon.Search, "Search kholo", onSearch)
                }
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item { Pill("Home", category == null) { onCategory(null) } }
                    items(Category.entries) { c -> Pill(c.label, category == c) { onCategory(c) } }
                }
            }
        }

        if (category == null) {
            item { Hero(Catalog.get("nosferatu"), onPlay, onOpen) }
            item {
                SectionHeader("Dekhna jaari rakho")
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(Catalog.continueWatching) { (id, pct) ->
                        ContinueCard(Catalog.get(id), pct) { onPlay(Catalog.get(id)) }
                    }
                }
            }
            items(Catalog.shelves, key = { it.key }) { shelf ->
                SectionHeader(shelf.title) { onShelf(shelf.key) }
                PosterGrid(shelf.ids.take(shelf.preview).map(Catalog::get), onOpen)
            }
        } else {
            val list = Catalog.titles.filter { it.category == category }
            item { SectionHeader(category.label) }
            item {
                if (list.isEmpty()) EmptyNote("Is category me jaldi naya content aayega.")
                else PosterGrid(list, onOpen)
            }
        }

        item { AdSlot(Modifier.padding(start = 16.dp, end = 16.dp, top = 26.dp)) }
    }
}

@Composable
private fun Hero(t: Title, onPlay: (Title) -> Unit, onOpen: (Title) -> Unit) {
    Box(
        Modifier
            .padding(start = 16.dp, end = 16.dp, top = 8.dp)
            .fillMaxWidth()
            .height(250.dp)
            .clip(RoundedCornerShape(18.dp))
    ) {
        PosterArt(t, Modifier.matchParentSize())
        Column(Modifier.align(Alignment.BottomStart).padding(18.dp)) {
            TagLabel("AAJ KI PASAND", fontSize = 11.sp)
            Text(
                t.name, Modifier.padding(top = 10.dp),
                color = Color.White, fontSize = 30.sp, lineHeight = 33.sp, fontWeight = FontWeight.Bold
            )
            Text(t.fullMeta, Modifier.padding(top = 4.dp), color = Color(0xFFE7E3EE), fontSize = 13.sp)
            Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    Modifier
                        .height(44.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .background(Color.White)
                        .clickable(role = Role.Button) { onPlay(t) }
                        .padding(horizontal = 22.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    WatchIcon(WIcon.Play, Bg, size = 14.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("Play", color = Bg, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
                Box(
                    Modifier
                        .height(44.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .background(Color.White.copy(alpha = 0.16f))
                        .clickable(role = Role.Button) { onOpen(t) }
                        .padding(horizontal = 20.dp),
                    contentAlignment = Alignment.Center
                ) { Text("Details", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Medium) }
            }
        }
    }
}

@Composable
private fun ContinueCard(t: Title, progress: Float, onClick: () -> Unit) {
    Box(
        Modifier
            .width(200.dp)
            .height(112.dp)
            .clip(RoundedCornerShape(10.dp))
            .clickable(role = Role.Button, onClick = onClick)
    ) {
        PosterArt(t, Modifier.matchParentSize())
        Text(
            t.name,
            Modifier.align(Alignment.BottomStart).padding(start = 10.dp, bottom = 14.dp),
            color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold
        )
        Box(
            Modifier.align(Alignment.BottomStart).fillMaxWidth().height(4.dp)
                .background(Color.White.copy(alpha = 0.25f))
        ) {
            Box(Modifier.fillMaxWidth(progress).fillMaxHeight().background(Accent))
        }
    }
}
