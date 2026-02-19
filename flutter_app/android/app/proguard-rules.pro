## ============================================================================
## ProGuard / R8 rules for 30sec Challenge Flutter App
## ============================================================================

## ---------------------------------------------------------------------------
## Flutter Engine
## ---------------------------------------------------------------------------
-keep class io.flutter.** { *; }
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.embedding.** { *; }
-dontwarn io.flutter.embedding.**

## ---------------------------------------------------------------------------
## Firebase Core
## ---------------------------------------------------------------------------
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

## ---------------------------------------------------------------------------
## Firebase Messaging (FCM)
## ---------------------------------------------------------------------------
-keep class com.google.firebase.messaging.** { *; }
-dontwarn com.google.firebase.messaging.**

## ---------------------------------------------------------------------------
## Google Sign-In
## ---------------------------------------------------------------------------
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }
-dontwarn com.google.android.gms.auth.**

## ---------------------------------------------------------------------------
## Google Mobile Ads (AdMob)
## ---------------------------------------------------------------------------
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**
-keep class com.google.ads.** { *; }
-dontwarn com.google.ads.**

## ---------------------------------------------------------------------------
## Dio / OkHttp networking
## ---------------------------------------------------------------------------
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okio.** { *; }

## ---------------------------------------------------------------------------
## Gson (used by Firebase internally)
## ---------------------------------------------------------------------------
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-dontwarn com.google.gson.**

## ---------------------------------------------------------------------------
## Kotlin metadata
## ---------------------------------------------------------------------------
-keep class kotlin.Metadata { *; }
-keepattributes RuntimeVisibleAnnotations
-keep class kotlin.reflect.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

## ---------------------------------------------------------------------------
## General Android rules
## ---------------------------------------------------------------------------
# Keep annotations
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes InnerClasses,EnclosingMethod

# Keep serialization
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep Parcelable
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep R class fields
-keepclassmembers class **.R$* {
    public static <fields>;
}

## ---------------------------------------------------------------------------
## Suppress common warnings
## ---------------------------------------------------------------------------
-dontwarn javax.annotation.**
-dontwarn sun.misc.**
-dontwarn java.lang.invoke.**
