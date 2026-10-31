package com.watchora.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchora.data.AuthRepository
import com.watchora.data.WatchUser
import com.watchora.data.friendlyError
import com.watchora.ui.*
import com.watchora.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun EmailAuthScreen(auth: AuthRepository, onDone: (WatchUser) -> Unit, onBack: () -> Unit) {
    var signUp by rememberSaveable { mutableStateOf(false) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun submit() {
        error = when {
            signUp && name.isBlank() -> "Apna naam likho."
            !email.contains("@") || !email.contains(".") -> "Sahi email likho."
            password.length < 8 -> "Password kam se kam 8 akshar ka hona chahiye."
            else -> null
        }
        if (error != null || loading) return
        loading = true
        scope.launch {
            try {
                val user = if (signUp) auth.signUp(name, email, password) else auth.login(email, password)
                onDone(user)
            } catch (e: Exception) {
                error = friendlyError(e)
            } finally {
                loading = false
            }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Bg)
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
    ) {
        Box(Modifier.padding(8.dp)) { IconButtonW(WIcon.Back, "Wapas jao", onBack) }
        Column(Modifier.padding(horizontal = 24.dp)) {
            Logo(box = 34.dp, textSize = 22.sp)
            Text(
                if (signUp) "Naya account banao" else "Wapas swagat hai",
                Modifier.padding(top = 28.dp),
                color = TextMain, fontSize = 28.sp, fontWeight = FontWeight.Bold
            )
            Text(
                if (signUp) "Bas 3 cheezein, aur shuru." else "Email aur password se login karo.",
                Modifier.padding(top = 6.dp),
                color = Muted, fontSize = 15.sp
            )
            Row(Modifier.padding(top = 22.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill("Login", !signUp) { signUp = false; error = null }
                Pill("Sign up", signUp) { signUp = true; error = null }
            }
            Spacer(Modifier.height(18.dp))
            if (signUp) {
                AuthField("Naam", name, { name = it })
                Spacer(Modifier.height(14.dp))
            }
            AuthField("Email", email, { email = it }, keyboard = KeyboardType.Email)
            Spacer(Modifier.height(14.dp))
            AuthField("Password", password, { password = it }, keyboard = KeyboardType.Password, secret = true)

            if (error != null) {
                Text(error!!, Modifier.padding(top = 14.dp), color = Hot, fontSize = 14.sp, lineHeight = 20.sp)
            }

            BigButton(
                text = when {
                    loading -> "Ruko..."
                    signUp -> "Account banao"
                    else -> "Login karo"
                },
                onClick = { submit() },
                modifier = Modifier.fillMaxWidth().padding(top = 22.dp, bottom = 24.dp)
            )
        }
    }
}

@Composable
private fun AuthField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    keyboard: KeyboardType = KeyboardType.Text,
    secret: Boolean = false
) {
    Column {
        Text(label, color = Muted, fontSize = 13.sp, fontWeight = FontWeight.Medium)
        Spacer(Modifier.height(6.dp))
        BasicTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            textStyle = TextStyle(color = TextMain, fontSize = 16.sp),
            cursorBrush = SolidColor(Accent),
            keyboardOptions = KeyboardOptions(keyboardType = keyboard),
            visualTransformation = if (secret) PasswordVisualTransformation() else VisualTransformation.None,
            modifier = Modifier.fillMaxWidth(),
            decorationBox = { inner ->
                val shape = RoundedCornerShape(14.dp)
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(shape)
                        .background(SurfaceC)
                        .border(1.dp, Line, shape)
                        .padding(horizontal = 14.dp),
                    contentAlignment = Alignment.CenterStart
                ) { inner() }
            }
        )
    }
}
