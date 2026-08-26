# Mako-AI Android

تمت إضافة غلاف Capacitor أصلي في `android/` بمعرّف الحزمة `com.abdelatizarzori.makoai`. يعتمد الغلاف على مخرجات Vite الموجودة في `dist/` ويحتفظ بتجربة Mako-AI داخل تطبيق Android.

## المتطلبات

يتطلب البناء Android Studio أو Android SDK وJDK 21. قبل بناء الإنتاج، يجب ضبط عنوان الخادم العام لخدمات tRPC وOAuth، مع إبقاء أسرار OAuth وقاعدة البيانات وLLM على الخادم وعدم تضمينها في التطبيق.

## تجهيز الواجهة

```bash
pnpm install
pnpm build
npx cap sync android
npx cap open android
```

## APK للاختبار

```bash
cd android
./gradlew assembleDebug
```

ينتج الملف عادةً في `android/app/build/outputs/apk/debug/app-debug.apk`.

## AAB لـ Google Play

أنشئ keystore خارج المستودع واربطه من Android Studio أو من أسرار CI، ثم شغّل:

```bash
cd android
./gradlew bundleRelease
```

ينتج ملف النشر عادةً في `android/app/build/outputs/bundle/release/app-release.aab`.

يجب اختبار تسجيل الدخول OAuth والاتصال بخادم tRPC على جهاز Android قبل رفع AAB إلى Google Play.
