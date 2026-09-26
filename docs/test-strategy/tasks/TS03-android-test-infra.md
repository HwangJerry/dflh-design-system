# TS03 — Android: test dependencies, Robolectric, Kover coverage, MockWebServer pattern

Repo: dflh-saf-v2-kotlin. Branch: `test/ts03-test-infra`.

1. Add to gradle/libs.versions.toml and app/build.gradle.kts (testImplementation): okhttp mockwebserver (match the okhttp version already used),
   robolectric (already declared in the catalog for design-system — reuse), turbine, androidx.test:core, androidx compose ui-test-junit4 +
   ui-test-manifest for JVM Compose tests. Enable `testOptions.unitTests.isIncludeAndroidResources = true`.
2. Add the Kover Gradle plugin (org.jetbrains.kotlinx.kover) to the app module with a `koverHtmlReport`/`koverXmlReport` for the debug unit tests.
   Exclude generated code (BuildConfig, R, Compose singletons, *_Factory) from the report. Do not add coverage gates yet.
3. Prove each piece with one small real test (not placeholders):
   - MockWebServer: a `DflhApiClient` test that points baseUrl at the server and checks one existing endpoint's request path/headers
     (incl. the client identity headers when an identity is given) and error mapping for a 401/426/500 response.
   - Robolectric Compose: port ONE existing androidTest screen test that only uses createComposeRule (e.g. NotificationSettingsScreenTest or
     DSButtonTest-like app test) to app/src/test with @RunWith(RobolectricTestRunner::class). Keep the androidTest original.
   - Turbine: one ViewModel flow test using it (existing MainDispatcherRule).
4. Document in docs/operations (short section): how to run unit tests and coverage (`./gradlew :app:testDebugUnitTest :app:koverHtmlReportDebug` or
   the task names Kover actually creates) and where the report lands.

Verify: `./gradlew :app:testDebugUnitTest` (all pass; baseline 404, report the new count) and the Kover report task; paste line/branch totals. Commit.
