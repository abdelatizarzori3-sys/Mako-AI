# Mako-AI Android

تمت إضافة غلاف Capacitor أصلي في `android/` بمعرّف الحزمة `com.abdelatizarzori.makoai`. يعتمد الغلاف على مخرجات Vite الموجودة في `dist/` ويحتفظ بتجربة Mako-AI داخل تطبيق Android.

## المتطلبات

يتطلب البناء Android Studio أو Android SDK وJDK 21. تستخدم النسخة المحمولة خادم Mako-AI العام `https://marokecho-jrrh7cuh.manus.space` لخدمات tRPC وLLM؛ لا توجد أسرار داخل APK. يحتاج الخادم إلى السماح بأصول Capacitor الآمنة (`http://localhost` و`capacitor://localhost`) عبر CORS.

## تجهيز الواجهة

```bash
pnpm install
pnpm build:android
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

## Developer

**Abdelati Zarzori** — `abdelatizarzori3@gmail.com`
