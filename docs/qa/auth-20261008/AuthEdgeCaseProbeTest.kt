package com.dflh.app.core.auth

import android.content.ContextWrapper
import com.dflh.app.core.network.NetworkException
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

/** QA probes: assert required behavior; known defects deliberately fail. Not in the default suite. */
class AuthEdgeCaseProbeTest {
    private val now = 1_720_000_000L
    private fun bundle() = tokenBundle(mobileJwt(now), mobileJwt(now, type = "refresh"))
    private fun response() = loginResponse(mobileJwt(now), mobileJwt(now, type = "refresh"))
    private fun repository(fake: FakeAuthRemoteDataSource, store: InMemoryTokenStore): SessionRepository =
        SessionRepository(fake, TokenSessionManager(store,
            MobileTokenParser(authTestJson, currentEpochSeconds = { now }), { fake }, { now }),
            kakaoSignIn = { "synthetic-kakao" }, retryWait = {})
    private fun request() = SocialLinkRequestDto("link-token", name = "합성 가입자", phone = "01000000002",
        email = "qa@example.test", fn = "20", fmDept = "영어",
        phoneVerificationToken = TEST_PHONE_VERIFICATION_TOKEN,
        privacyConsent = PrivacyConsentDto.acceptedCurrentVersion())

    @Test fun offlineBootstrapMustPreserveStoredTokens() = runTest {
        val initial = bundle(); val store = InMemoryTokenStore(initial)
        val fake = FakeAuthRemoteDataSource(currentUserProvider = { throw IOException("synthetic offline") },
            refreshResponseProvider = { error("unexpected refresh") })
        repository(fake, store).bootstrap()
        assertEquals("Transient connectivity failure must not erase a valid session", initial, store.load())
    }

    @Test fun server503BootstrapMustPreserveStoredTokens() = runTest {
        val initial = bundle(); val store = InMemoryTokenStore(initial)
        val fake = FakeAuthRemoteDataSource(currentUserProvider = { throw NetworkException.InvalidStatus(503, "{}") },
            refreshResponseProvider = { error("unexpected refresh") })
        repository(fake, store).bootstrap()
        assertEquals("A server outage must not erase a valid session", initial, store.load())
    }

    @Test fun lateBootstrapMustNotRestoreLoggedOutUI() = runTest {
        val result = CompletableDeferred<LoginUserDto?>(); val store = InMemoryTokenStore(bundle())
        val fake = FakeAuthRemoteDataSource(currentUserProvider = { result.await() },
            refreshResponseProvider = { error("unexpected refresh") })
        val repo = repository(fake, store)
        val pending = async { repo.bootstrap() }; runCurrent()
        repo.signOut()
        result.complete(response().session!!.user); pending.await()
        assertNull(store.load())
        assertEquals("A late auth/me response must not reopen the signed-in UI", SessionState.SignedOut, repo.state.value)
    }

    @Test fun latePasswordLoginMustNotUndoLogout() = runTest {
        val result = CompletableDeferred<LoginResponseDto>(); val store = InMemoryTokenStore()
        val fake = FakeAuthRemoteDataSource(loginResponseProvider = { _, _ -> result.await() },
            refreshResponseProvider = { error("unexpected refresh") })
        val repo = repository(fake, store)
        val pending = async { repo.login("synthetic", "synthetic") }; runCurrent()
        repo.signOut(); result.complete(response()); pending.await()
        assertNull("A response from the abandoned login must not save tokens", store.load())
        assertEquals(SessionState.SignedOut, repo.state.value)
    }

    @Test fun successfulSocialSignupResponseMustNotUndoCancellation() = runTest {
        val result = CompletableDeferred<LoginResponseDto>(); val store = InMemoryTokenStore()
        val fake = FakeAuthRemoteDataSource(loginWithKakaoResponseProvider = { linkRequiredResponse() },
            linkSocialAccountResponseProvider = { result.await() },
            verificationProvider = { MobileVerification(status = "pending") },
            refreshResponseProvider = { error("unexpected refresh") })
        val repo = repository(fake, store)
        repo.loginWithKakao(ContextWrapper(null))
        val pending = async { repo.signUpAsKakaoMember(request(), 2007) }; runCurrent()
        repo.cancelKakaoSignUp(); result.complete(response()); pending.await()
        assertNull("Cancelled signup must not become a persistent authenticated session", store.load())
        assertEquals(SessionState.SignedOut, repo.state.value)
    }

    @Test fun initialVerificationResponseMustNotUndoLogout() = runTest {
        val result = CompletableDeferred<MobileVerification>(); val store = InMemoryTokenStore()
        val fake = FakeAuthRemoteDataSource(loginResponseProvider = { _, _ -> response() },
            verificationProvider = { result.await() }, refreshResponseProvider = { error("unexpected refresh") })
        val repo = repository(fake, store)
        val pending = async { repo.loginAfterRegistration("synthetic", "synthetic", VerificationSubmissionDto(2007, "20", "영어")) }
        runCurrent(); assertNotNull(store.load()); repo.signOut()
        result.complete(MobileVerification(status = "pending")); pending.await()
        assertNull(store.load())
        assertEquals("Late verification must not resurrect authenticated UI", SessionState.SignedOut, repo.state.value)
    }

    @Test fun offlineLogoutStillClearsLocalTokens() = runTest {
        val store = InMemoryTokenStore(bundle())
        val fake = FakeAuthRemoteDataSource(logoutResponseProvider = { throw IOException("synthetic offline") },
            refreshResponseProvider = { error("unexpected refresh") })
        val repo = repository(fake, store); repo.signOut()
        assertNull(store.load()); assertEquals(SessionState.SignedOut, repo.state.value)
    }

    @Test fun signupFailureBeforeAccountCreationMustNotSaveSession() = runTest {
        val store = InMemoryTokenStore()
        val fake = FakeAuthRemoteDataSource(loginWithKakaoResponseProvider = { linkRequiredResponse() },
            linkSocialAccountResponseProvider = { throw NetworkException.InvalidStatus(409, "{\"code\":\"PHONE_TAKEN\"}") },
            refreshResponseProvider = { error("unexpected refresh") })
        val repo = repository(fake, store); repo.loginWithKakao(ContextWrapper(null))
        assertTrue(runCatching { repo.signUpAsKakaoMember(request(), 2007) }.isFailure)
        assertNull(store.load()); assertTrue(repo.state.value is SessionState.SignUpRequired)
    }
}
