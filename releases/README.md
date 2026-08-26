# Android release artifacts

هذه الملفات مبنية من غلاف Capacitor الخاص بـ Mako-AI.

- `Mako-AI-debug.apk`: نسخة اختبار قابلة للتثبيت المباشر على Android.
- `Mako-AI-release.aab`: حزمة Android App Bundle للتحقق والنشر.

قبل نشر AAB على Google Play، استخدم keystore إنتاجيًا خارج GitHub واضبط عنوان خادم tRPC وOAuth العام. لا تضع أسرار OAuth أو قاعدة البيانات أو LLM داخل التطبيق.
