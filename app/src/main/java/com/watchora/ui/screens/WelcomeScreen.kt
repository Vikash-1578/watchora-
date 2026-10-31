package com.watchora.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchora.data.Catalog
import com.watchora.ui.BigButton
import com.watchora.ui.Logo
import com.watchora.ui.PosterArt
import com.watchora.ui.theme.*

@Composable
fun WelcomeScreen(onGoogle: () -> Unit, onPhone: () -> Unit, onEmail: () -> Unit) {
    Box(Modifier.fillMaxSize().background(Bg)) {
        // Peeche tilted posters ka collage
        Box(Modifier.fillMaxWidth().height(480.dp).clipToBounds()) {
            Row(
                Modifier
                    .requiredWidth(470.dp)
                    .offset(x = (-20).dp, y = (-60).dp)
                    .graphicsLayer { rotationZ = -9f },
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                val columns = listOf(
                    listOf("nosferatu", "metro", "trip") to 30,
                    listOf("harish", "sintel", "bunny") to -20,
                    listOf("notld", "nanook", "tears") to 50
                )
                columns.forEach { (ids, shift) ->
                    Column(
                        Modifier.width(140.dp).offset(y = shift.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        ids.forEach { id ->
                            PosterArt(
                                Catalog.get(id),
                                Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(16.dp)),
                                scrim = false
                            )
                        }
                    }
                }
            }
            Box(
                Modifier.matchParentSize().background(
                    Brush.verticalGradient(
                        0f to Bg.copy(alpha = 0.55f),
                        0.22f to Color.Transparent,
                        0.66f to Bg.copy(alpha = 0.7f),
                        1f to Bg
                    )
                )
            )
        }

        Box(Modifier.statusBarsPadding().padding(start = 24.dp, top = 20.dp)) {
            Logo(box = 38.dp, textSize = 24.sp)
        }

        Column(
            Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(start = 24.dp, end = 24.dp, bottom = 24.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.width(28.dp).height(3.dp).clip(RoundedCornerShape(2.dp)).background(Accent))
                Spacer(Modifier.width(10.dp))
                Text("SWAGAT HAI", color = TextMain, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
            }
            Text(
                "Dekho jo dil chahe.",
                Modifier.padding(top = 14.dp),
                color = TextMain, fontSize = 33.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold
            )
            Text(
                "Movies, series aur bahut kuch. Bilkul free.",
                Modifier.padding(top = 12.dp),
                color = Muted, fontSize = 15.sp, lineHeight = 22.sp
            )
            Spacer(Modifier.height(24.dp))
            BigButton("Google se shuru karein", onGoogle, Modifier.fillMaxWidth())
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                BigButton("Phone OTP", onPhone, Modifier.weight(1f), filled = false)
                BigButton("Email se", onEmail, Modifier.weight(1f), filled = false)
            }
            Text(
                "Aage badhkar aap Terms aur Privacy Policy se sehmat hote ho.",
                Modifier.fillMaxWidth().padding(top = 14.dp),
                color = Muted, fontSize = 12.sp, textAlign = TextAlign.Center
            )
        }
    }
}
