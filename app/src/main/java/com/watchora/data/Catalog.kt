package com.watchora.data

import androidx.compose.ui.graphics.Color

enum class Category(val label: String) {
    Movies("Movies"),
    Series("Shows"),
    Shorts("Shorts"),
    Documentary("Documentary"),
    Anime("Anime")
}

/**
 * Ek title (movie / series / short).
 * top, bottom, glow = poster art ke rang (asli poster image aane tak).
 */
data class Title(
    val id: String,
    val name: String,
    val year: String,
    val category: Category,
    val genre: String,
    val lang: String,       // filter ke liye: Hindi / English / Other
    val langLabel: String,  // poster par dikhne wala text
    val tag: String,        // NEW, HOT, NEW SERIES ya ""
    val description: String,
    val top: Color,
    val bottom: Color,
    val glow: Color,
    val glowX: Float,
    val glowY: Float,
    val glowSize: Float
) {
    val isSeries: Boolean get() = category == Category.Series
    val meta: String get() = if (isSeries) "Season 1 · $genre" else "$year · $genre"
    val fullMeta: String get() = "$meta · $langLabel"
}

data class Shelf(val key: String, val title: String, val ids: List<String>, val preview: Int)

/** Demo data. Baad me ye Firebase (Firestore) se aayega. */
object Catalog {
    val titles = listOf(
        Title("nosferatu", "Nosferatu", "1922", Category.Movies, "Horror", "English", "English", "HOT",
            "1922 ki German silent horror film, jo Dracula ki kahani par aadharit hai.",
            Color(0xFF5C1F3B), Color(0xFF1A0A14), Color(0xFFFFDEB8), 0.72f, 0.26f, 0.13f),
        Title("trip", "A Trip to the Moon", "1902", Category.Shorts, "Sci-Fi", "Other", "Silent", "",
            "Georges Melies ki 1902 ki French silent short film.",
            Color(0xFF0C2D52), Color(0xFF06142A), Color(0xFFF3DCAE), 0.6f, 0.38f, 0.16f),
        Title("harish", "Raja Harishchandra", "1913", Category.Movies, "Mythology", "Hindi", "Hindi", "HOT",
            "1913 ki silent film, jise pehli Indian feature film mana jata hai.",
            Color(0xFFA8541A), Color(0xFF3A1A07), Color(0xFFFFD27A), 0.5f, 0.6f, 0.18f),
        Title("nanook", "Nanook of the North", "1922", Category.Documentary, "Documentary", "English", "English", "",
            "1922 ki silent documentary, Arctic Canada ke ek Inuit parivar par.",
            Color(0xFF3A7078), Color(0xFF1A3A3F), Color(0xFFFFFFFF), 0.28f, 0.5f, 0.06f),
        Title("bunny", "Big Buck Bunny", "2008", Category.Shorts, "Animation", "English", "English", "NEW",
            "Ek bade, pyaare khargosh ki mazedaar animated kahani.",
            Color(0xFF7AC4E8), Color(0xFF2F6F9F), Color(0xFFFFE28A), 0.75f, 0.24f, 0.1f),
        Title("sintel", "Sintel", "2010", Category.Shorts, "Animation", "English", "English", "NEW",
            "Ek ladki aur uske chhote dragon ki khoj ki animated kahani.",
            Color(0xFF8E2F22), Color(0xFF2A0E0A), Color(0xFFFFB36B), 0.5f, 0.52f, 0.16f),
        Title("notld", "Night of the Living Dead", "1968", Category.Movies, "Horror", "English", "English", "",
            "1968 ki American horror film.",
            Color(0xFF4A4A55), Color(0xFF14141A), Color(0xFFECECF2), 0.24f, 0.24f, 0.09f),
        Title("metro", "Metropolis", "1927", Category.Movies, "Sci-Fi", "Other", "Silent", "HOT",
            "Fritz Lang ki 1927 ki German silent sci-fi film.",
            Color(0xFF4A4FB0), Color(0xFF12143A), Color(0xFFFFC878), 0.5f, 0.92f, 0.3f),
        Title("general", "The General", "1926", Category.Movies, "Comedy", "Other", "Silent", "",
            "Buster Keaton ki 1926 ki silent comedy, ek train ke peeche ki daud.",
            Color(0xFFE08A3C), Color(0xFF7A3A12), Color(0xFFFFE0A3), 0.7f, 0.4f, 0.12f),
        Title("elephants", "Elephants Dream", "2006", Category.Shorts, "Animation", "English", "English", "",
            "Ek ajeeb mashino ki duniya me do logon ki animated kahani.",
            Color(0xFF3B2A6A), Color(0xFF120C24), Color(0xFFC9A4FF), 0.3f, 0.34f, 0.16f),
        Title("tears", "Tears of Steel", "2012", Category.Shorts, "Sci-Fi", "English", "English", "NEW",
            "Future ke Amsterdam me robots aur insaano ki sci-fi short film.",
            Color(0xFF1D3C55), Color(0xFF0A1520), Color(0xFF6EC8FF), 0.5f, 0.4f, 0.2f),
        Title("series", "Sample Series", "", Category.Series, "Drama", "Hindi", "Hindi | English", "NEW SERIES",
            "Series ka sample page: yahan episodes ki list dikhti hai.",
            Color(0xFF6A49A0), Color(0xFF1B1230), Color(0x55FFFFFF), 0.5f, 0.38f, 0.2f)
    )

    private val byId = titles.associateBy { it.id }

    fun get(id: String): Title = byId[id] ?: titles.first()

    val shelves = listOf(
        Shelf("trending", "Trending abhi", listOf("nosferatu", "harish", "metro", "tears", "bunny", "general"), 6),
        Shelf("fresh", "Nayi aayi", listOf("series", "tears", "sintel", "bunny", "elephants", "notld"), 3),
        Shelf("animation", "Animation ki duniya", listOf("bunny", "sintel", "elephants", "tears"), 3),
        Shelf("classics", "Sadabahar classics", listOf("general", "trip", "nosferatu", "metro", "notld", "harish", "nanook"), 3)
    )

    fun shelf(key: String): Shelf = shelves.firstOrNull { it.key == key } ?: shelves.first()

    /** (title id, kitna dekha 0..1) */
    val continueWatching = listOf("nosferatu" to 0.62f, "bunny" to 0.30f)

    fun similarTo(t: Title): List<Title> {
        val same = titles.filter { it.id != t.id && (it.genre == t.genre || it.category == t.category) }
        val rest = titles.filter { it.id != t.id && it !in same }
        return (same + rest).take(3)
    }
}
