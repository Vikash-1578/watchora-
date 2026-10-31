package com.watchora.ui

import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchora.data.AuthRepository
import com.watchora.data.Catalog
import com.watchora.data.Category
import com.watchora.data.Title
import com.watchora.data.WatchUser
import com.watchora.ui.screens.*
import com.watchora.ui.theme.*
import com.watchora.data.friendlyError
import kotlinx.coroutines.launch

enum class Tab(val label: String, val icon: WIcon) {
    Home("Home", WIcon.Home),
    Search("Search", WIcon.Search),
    Watchlist("Watchlist", WIcon.Bookmark),
    Profile("Profile", WIcon.Person)
}

sealed interface Screen {
    data object Splash : Screen
    data object Welcome : Screen
    data object EmailAuth : Screen
    data class Main(val tab: Tab) : Screen
    data class ShelfList(val key: String) : Screen
    data class Detail(val id: String) : Screen
    data class Player(val id: String) : Screen
}

private val qualities = listOf("Auto", "720p", "480p")

@Composable
fun WatchoraApp() {
    val context = LocalContext.current
    val auth = remember { AuthRepository(context) }
    val scope = rememberCoroutineScope()
    var googleBusy by remember { mutableStateOf(false) }

    val stack = remember { mutableStateListOf<Screen>(Screen.Splash) }
    var user by remember { mutableStateOf<WatchUser?>(null) }
    var category by remember { mutableStateOf<Category?>(null) }
    var query by remember { mutableStateOf("") }
    var lang by remember { mutableStateOf<String?>(null) }
    val saved = remember { mutableStateListOf("sintel") }
    var quality by remember { mutableStateOf("Auto") }
    var notifications by remember { mutableStateOf(true) }

    val screen = stack.last()

    fun go(s: Screen) { stack.add(s) }
    fun reset(s: Screen) { stack.clear(); stack.add(s) }
    fun goTab(t: Tab) = reset(Screen.Main(t))
    fun back() {
        if (stack.size > 1) stack.removeAt(stack.lastIndex) else goTab(Tab.Home)
    }
    val open: (Title) -> Unit = { go(Screen.Detail(it.id)) }
    val play: (Title) -> Unit = { go(Screen.Player(it.id)) }
    val cycleQuality = { quality = qualities[(qualities.indexOf(quality) + 1) % qualities.size] }
    val comingSoon = {
        Toast.makeText(context, "Phone OTP jaldi aa raha hai. Abhi Google ya Email se login karo.", Toast.LENGTH_SHORT).show()
    }
    val googleLogin: () -> Unit = {
        if (!googleBusy) {
            googleBusy = true
            scope.launch {
                try {
                    user = auth.signInWithGoogle(context)
                    goTab(Tab.Home)
                } catch (e: Exception) {
                    Toast.makeText(context, friendlyError(e), Toast.LENGTH_LONG).show()
                } finally {
                    googleBusy = false
                }
            }
        }
    }

    // App khulte hi check: pehle se login hai?
    LaunchedEffect(Unit) {
        user = auth.currentUser()
        reset(if (user != null) Screen.Main(Tab.Home) else Screen.Welcome)
    }

    // Phone ka back button
    BackHandler(enabled = stack.size > 1 || (screen is Screen.Main && screen.tab != Tab.Home)) { back() }

    Column(Modifier.fillMaxSize().background(Bg)) {
        Box(Modifier.weight(1f)) {
            when (val s = screen) {
                Screen.Splash -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Logo(box = 44.dp, textSize = 28.sp)
                }
                Screen.Welcome -> WelcomeScreen(
                    onGoogle = googleLogin,
                    onPhone = comingSoon,
                    onEmail = { go(Screen.EmailAuth) }
                )
                Screen.EmailAuth -> EmailAuthScreen(
                    auth = auth,
                    onDone = { user = it; goTab(Tab.Home) },
                    onBack = { back() }
                )
                is Screen.Main -> when (s.tab) {
                    Tab.Home -> HomeScreen(
                        category = category,
                        onCategory = { category = it },
                        onOpen = open,
                        onPlay = play,
                        onShelf = { go(Screen.ShelfList(it)) },
                        onSearch = { goTab(Tab.Search) }
                    )
                    Tab.Search -> SearchScreen(query, { query = it }, lang, { lang = it }, open)
                    Tab.Watchlist -> WatchlistScreen(saved, open) { goTab(Tab.Home) }
                    Tab.Profile -> ProfileScreen(
                        userName = user?.name ?: "",
                        userEmail = user?.email ?: "",
                        quality = quality,
                        onQuality = cycleQuality,
                        notifications = notifications,
                        onNotifications = { notifications = it },
                        onLogout = {
                            auth.logout()
                            user = null
                            category = null; query = ""; lang = null
                            reset(Screen.Welcome)
                        }
                    )
                }
                is Screen.ShelfList -> {
                    val shelf = Catalog.shelf(s.key)
                    ShelfScreen(shelf.title, shelf.ids.map(Catalog::get), { back() }, open)
                }
                is Screen.Detail -> {
                    val t = Catalog.get(s.id)
                    DetailScreen(
                        t = t,
                        saved = t.id in saved,
                        onToggleSave = { if (t.id in saved) saved.remove(t.id) else saved.add(t.id) },
                        onPlay = { play(t) },
                        onBack = { back() },
                        onOpen = open
                    )
                }
                is Screen.Player -> key(s) {
                    PlayerScreen(Catalog.get(s.id), quality, cycleQuality) { back() }
                }
            }
        }
        if (screen is Screen.Main) BottomBar(screen.tab) { goTab(it) }
    }
}

@Composable
private fun BottomBar(current: Tab, onSelect: (Tab) -> Unit) {
    Column(Modifier.fillMaxWidth().background(NavBg)) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(Color(0xFF22242E)))
        Row(Modifier.fillMaxWidth().height(64.dp)) {
            Tab.entries.forEach { tab ->
                val color = if (tab == current) Accent else NavMuted
                Column(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable(role = Role.Tab) { onSelect(tab) },
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    WatchIcon(tab.icon, color)
                    Spacer(Modifier.height(3.dp))
                    Text(tab.label, color = color, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }
            }
        }
        Spacer(Modifier.navigationBarsPadding())
    }
}
