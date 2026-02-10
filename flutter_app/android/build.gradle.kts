allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}
// Fix for plugins missing android namespace (required by AGP 8+)
subprojects {
    val currentProject = this
    if (currentProject.state.executed) {
        if (currentProject.extensions.findByName("android") != null) {
            val android = currentProject.extensions.getByName("android") as com.android.build.gradle.BaseExtension
            if (android.namespace.isNullOrEmpty()) {
                android.namespace = currentProject.group.toString()
            }
        }
    } else {
        afterEvaluate {
            if (extensions.findByName("android") != null) {
                val android = extensions.getByName("android") as com.android.build.gradle.BaseExtension
                if (android.namespace.isNullOrEmpty()) {
                    android.namespace = project.group.toString()
                }
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
