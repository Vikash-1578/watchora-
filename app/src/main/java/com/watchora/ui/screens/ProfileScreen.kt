package com.watchora.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchora.ui.BigButton
import com.watchora.ui.ScreenTitle
import com.watchora.ui.theme.*

@Composable
fun ProfileScreen(
    userName: String,
    userEmail: String,
    quality: String,
    onQuality: () -> Unit,
    notifications: Boolean,
    onNotifications: (Boolean) -> Unit,
    onLogout: () -> Unit
) {
    Column(
        Modifier.fillMaxSize().background(Bg).statusBarsPadding().verticalScroll(rememberScrollState())
    ) {
        ScreenTitle("Profile")
        Row(
            Modifier
                .padding(horizontal = 16.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(SurfaceC)
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                Modifier.size(56.dp).clip(CircleShape).background(Accent),
                contentAlignment = Alignment.Center
            ) { Text(userName.take(1).uppercase().ifEmpty { "W" }, color = Bg, fontSize = 22.sp, fontWeight = FontWeight.Bold) }
            Spacer(Modifier.width(14.dp))
            Column {
                Text(userName.ifBlank { "Watchora user" }, color = TextMain, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                Text(userEmail, Modifier.padding(top = 2.dp), color = Muted, fontSize = 14.sp)
            }
        }

        Column(
            Modifier
                .padding(start = 16.dp, end = 16.dp, top = 16.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(SurfaceC)
        ) {
            Row(
                Modifier.fillMaxWidth().heightIn(min = 56.dp)
                    .clickable(role = Role.Button, onClick = onQuality)
                    .padding(horizontal = 18.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Video quality", Modifier.weight(1f), color = TextMain, fontSize = 16.sp)
                Text(quality, color = Accent, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
            HorizontalDivider(color = Line)
            Row(
                Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = 18.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Nayi titles ki notification", Modifier.weight(1f), color = TextMain, fontSize = 16.sp)
                Switch(
                    checked = notifications,
                    onCheckedChange = onNotifications,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Bg,
                        checkedTrackColor = Accent,
                        uncheckedThumbColor = Muted,
                        uncheckedTrackColor = Bg,
                        uncheckedBorderColor = Line
                    )
                )
            }
            HorizontalDivider(color = Line)
            Row(
                Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = 18.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("App version", Modifier.weight(1f), color = TextMain, fontSize = 16.sp)
                Text("1.0", color = Muted, fontSize = 15.sp)
            }
        }

        BigButton(
            "Logout", onLogout,
            Modifier.padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 16.dp).fillMaxWidth(),
            filled = false
        )
    }
}
