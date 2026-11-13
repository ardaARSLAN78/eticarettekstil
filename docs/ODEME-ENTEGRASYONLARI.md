# Ödeme altyapıları

Müşteri kendi mağazasının yönetim panelinden sağlayıcıyı seçer, test/canlı ortamını belirler ve hesabındaki API bilgilerini girer. Yeni sağlayıcı eklemek, yalnızca farklı bir anahtar alanı eklemek değildir; ödeme başlatma ve sonuç doğrulama adaptörü gerekir.

| Sağlayıcı  | Akış                          | Girilecek bilgiler                   | Bildirim yolu               |
| ---------- | ----------------------------- | ------------------------------------ | --------------------------- |
| iyzico     | CheckoutForm yönlendirmesi    | API key, secret key                  | `/payments/iyzico/callback` |
| PayTR      | Güvenli ödeme sayfası         | merchant ID, key, salt               | `/payments/paytr/webhook`   |
| Stripe     | Hosted Checkout               | secret key, webhook signing secret   | `/payments/stripe/webhook`  |
| Havale/EFT | Sipariş sonrası banka bilgisi | Mağaza ayarlarında hesap adı ve IBAN | Yönetici banka kontrolü     |

API bilgileri veritabanında AES-256-GCM ile şifrelenir. Şifreleme anahtarı veritabanından ayrı ortam değişkenindedir. Panel API'si kaydedilmiş sırları geri döndürmez. Sırlar log ve denetim kayıtlarına yazılmaz. Açık sipariş, anahtar değişiminden etkilenmemesi için kendi şifreli yapılandırma kopyasını tutar.

## Sonuç doğrulaması

Tarayıcının başarı sayfasına dönmesi, ödemeyi onaylamaz.

- PayTR: HMAC imzası sabit zamanlı karşılaştırılır. Sipariş, test/canlı ortamı ve kuruş tutarı kontrol edilir. Bu sürümde taksit kapalıdır; toplam tutar tam eşleşmelidir. Başarıyla işlenen bildirime düz `OK` verilir.
- iyzico: token özetiyle sipariş bulunur; sonuç kimliği doğrulanmış sunucu API çağrısıyla tekrar alınır. Conversation/basket ID, token, para birimi ve tutar eşleşir.
- Stripe: SDK ham HTTP gövdesindeki webhook imzasını ve zaman toleransını doğrular. Session, sipariş kimliği, tutar, para birimi ve `livemode` kontrol edilir. Yalnızca `payment_status=paid` sonucu onaylanır.
- Tekrarlanan bildirimler benzersiz olay kaydıyla zararsızdır. Stok serbest bırakıldıktan sonra gelen tahsilat siparişi tekrar satılmış saymaz; iade gerektirir.

iyzico'nun istediği alıcı kimlik numarası yalnızca o yöntem seçildiğinde alınır, şifreli tutulur ve işlem kesinleştiğinde/süresi dolduğunda kaldırılır. Sahte bir kimlik numarası canlı isteğe eklenmez.

## Gerçek hesapla kabul adımları

Ödeme oturumu başlatılamazsa sipariş iptal/başarısız durumuna alınır, stok serbest bırakılır ve ürünler ile kupon sepete geri eklenir. O sırada sepete eklenen başka ürünler ezilmez. `PAYMENT_FAILED` yanıtında arayüz güncel sepeti yükler ve sonraki denemeye yeni idempotency anahtarı ayırır. Belirsiz ağ hatası aynı anahtarla tekrar sorgulanır.

Kod testleri sağlayıcı çağrılarını taklit eder; gerçek hesap onayı veya gerçek tahsilatın yerine geçmez. Her sağlayıcı için aşağıdaki kontroller işletmenin hesabında yapılmalıdır:

1. Hesabın faaliyet ülkesi, para birimi ve ürün türü için ödeme almaya onaylı olduğunu kontrol edin.
2. HTTPS mağaza ve API adreslerini ayarlayın. Localhost'a sağlayıcı sunucusundan bildirim gelemez.
3. Yönetim panelindeki bildirim adresini sağlayıcı paneline kaydedin. Stripe için `checkout.session.completed` olayı açılır.
4. Sağlayıcının test kartlarıyla başarılı/başarısız ödeme ve yinelenen bildirim akışlarını çalıştırın.
5. Test/canlı anahtar ayrımını ve başarısız bildirimin siparişi onaylamadığını doğrulayın.
6. Canlı anahtarları açtıktan sonra düşük tutarlı gerçek işlem ve sağlayıcı panelinden iade kabulü yapın.

“Tüm sanal POS'lar desteklenir” iddiası yoktur. Bu dört yöntemin kodu vardır; başka banka/kuruluş için `payments.types.ts` sözleşmesini uygulayan adaptör, güvenilir bildirim rotası ve ilgili testler eklenir.

## Resmî teknik kaynaklar

- [iyzico CheckoutForm akışı](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation)
- [iyzico yanıt doğrulama alanları](https://docs.iyzico.com/en/advanced/response-signature-validation)
- [PayTR token başlatma](https://dev.paytr.com/en/iframe-api/iframe-api-1-adim)
- [PayTR sonuç bildirimi](https://dev.paytr.com/iframe-api/iframe-api-2-adim)
- [Stripe Checkout](https://docs.stripe.com/checkout/quickstart)
- [Stripe webhook imzaları](https://docs.stripe.com/webhooks/signatures)
