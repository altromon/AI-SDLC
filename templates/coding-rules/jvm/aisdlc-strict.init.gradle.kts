// AI-SDLC: Immutable Gradle Strict Compiler & Test Guardrails (Java & Kotlin)
allprojects {
    tasks.withType<JavaCompile>().configureEach {
        options.compilerArgs.addAll(listOf("-Werror", "-Xlint:all", "-Xlint:-processing"))
    }
    tasks.withType<Test>().configureEach {
        useJUnitPlatform()
        failOnNoDiscoveredTests.set(true)
    }
}
