package com.watchora.data

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.GoogleAuthProvider
import com.watchora.R
import com.google.android.gms.tasks.Task
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.auth.FirebaseAuthWeakPasswordException
import com.google.firebase.auth.UserProfileChangeRequest
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class WatchUser(val name: String, val email: String)

/** Login, sign up, logout: sab Firebase Authentication ke through. */
class AuthRepository(@Suppress("UNUSED_PARAMETER") context: Context) {
    private val auth = FirebaseAuth.getInstance()

    /** Agar pehle se login hai to user, warna null. */
    fun currentUser(): WatchUser? {
        val u = auth.currentUser ?: return null
        return WatchUser(u.displayName.orEmpty(), u.email.orEmpty())
    }

    suspend fun login(email: String, password: String): WatchUser {
        auth.signInWithEmailAndPassword(email.trim(), password).await()
        return currentUser() ?: throw IllegalStateException("Login ke baad user nahi mila")
    }

    suspend fun signUp(name: String, email: String, password: String): WatchUser {
        val result = auth.createUserWithEmailAndPassword(email.trim(), password).await()
        val profile = UserProfileChangeRequest.Builder().setDisplayName(name.trim()).build()
        result.user?.updateProfile(profile)?.await()
        return WatchUser(name.trim(), email.trim())
    }

    /**
     * Google se login. [activityContext] Activity hona chahiye (Compose me LocalContext.current).
     * Web client ID google-services.json se apne-aap R.string.default_web_client_id me aata hai.
     */
    suspend fun signInWithGoogle(activityContext: Context): WatchUser {
        val option = GetSignInWithGoogleOption.Builder(
            activityContext.getString(R.string.default_web_client_id)
        ).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        val result = CredentialManager.create(activityContext).getCredential(activityContext, request)
        val cred = result.credential
        if (cred !is CustomCredential || cred.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            throw IllegalStateException("Google account ki jaankari nahi mili")
        }
        val google = GoogleIdTokenCredential.createFrom(cred.data)
        auth.signInWithCredential(GoogleAuthProvider.getCredential(google.idToken, null)).await()
        return currentUser() ?: throw IllegalStateException("Login ke baad user nahi mila")
    }

    fun logout() = auth.signOut()
}

/** Firebase ke Task ko coroutine me await karna (bina extra library ke). */
private suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { cont ->
    addOnCompleteListener { task ->
        val e = task.exception
        if (e != null) cont.resumeWithException(e)
        else if (task.isCanceled) cont.cancel()
        else cont.resume(task.result)
    }
}

/** Error ko seedhi bhasha me badalna. */
fun friendlyError(e: Throwable): String = when (e) {
    is GetCredentialCancellationException -> "Google login band kar diya gaya."
    is NoCredentialException -> "Phone me koi Google account nahi mila. Settings me Google account jodo."
    is FirebaseAuthWeakPasswordException -> "Password kamzor hai. Kam se kam 8 akshar rakho."
    is FirebaseAuthUserCollisionException -> "Is email se account pehle se bana hai. Login karo."
    is FirebaseAuthInvalidUserException -> "Is email se koi account nahi mila. Sign up karo."
    is FirebaseAuthInvalidCredentialsException -> "Email ya password galat hai."
    is FirebaseNetworkException -> "Internet connection check karo."
    is FirebaseTooManyRequestsException -> "Bahut baar try kiya. Thodi der baad dobara karo."
    else -> "Kuch gadbad hui: ${e.message ?: "pata nahi"}"
}
