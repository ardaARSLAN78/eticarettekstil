# Quantia doğrulama kaydı

Tarih: 13 Kasım 2026. Bu kayıt yalnızca gerçekten çalıştırılan kontrolleri içerir. Yerel geliştirme/kabul ortamı ile gerçek hesap kabulü ayrı değerlendirilir.

## Sonuçlar

| Kontrol                                                   | Sonuç                                                 |
| --------------------------------------------------------- | ----------------------------------------------------- |
| Backend ve frontend sıkı TypeScript kontrolü              | Başarılı                                              |
| Kaynak biçim kontrolü (`npm run format:check`)            | Başarılı                                              |
| Docker PostgreSQL üzerinde 6 migration                    | Başarılı                                              |
| Backend birim/protokol ve gerçek PostgreSQL testleri      | **82 / 82 geçti**                                     |
| Üretim Next.js → Express → PostgreSQL HTTP kabul testleri | **9 / 9 geçti**                                       |
| Express/worker ve Next.js Docker imajları                 | Derlendi, çalıştırıldı                                |
| Next.js üretim derlemesi                                  | Başarılı; mağaza, yönetim ve tüm API yolları üretildi |
| `npm audit --omit=dev --audit-level=moderate`             | **0 bilinen açık**                                    |
| Yerel mağaza, API, PostgreSQL ve Redis sağlık kontrolleri | Başarılı                                              |

`npm audit` sonucu yalnızca npm üretim bağımlılıklarını kapsar; tüm işletim sistemi/altyapı için açık bulunmadığı iddiası değildir.

## Backend kapsamı

Nginx yapılandırma testi ve üretim Compose çözümlemesi de başarılıdır.

- Kaynak/CSRF kontrolü, istek sınırları, GraphQL alias/fragment/derinlik sınırları ve güvenli hata dönüşümleri.
- Scrypt şifre özeti, oturum iptali, rol yükseltme engeli, adres/sipariş sahipliği ve kapatılmış hesap erişimi.
- Katalog CRUD, kategori döngüleri, renk/beden varyant sahipliği, medya ve SEO alanları, eski stok formu çatışması, veritabanı CHECK kısıtları.
- Kampanya/kupon kapsamı, alt kategoriler, tarih/kullanım sınırları, paralel kullanım, indirimlerin kuruş olarak dağıtımı, kargo ve vergi hesabı.
- Sunucu fiyatı, atomik son stok yarışı, sipariş idempotency, iptal/süre dolumunda tek stok iadesi.
- Hesap sepetinin yenileme ve başka cihazdan girişte korunması; çıkış ve tekrar giriş, misafir sepetini bir kere birleştirme, başka hesaba sepet sızmaması, paralel ekleme, eski sekmeden silinen ürünün geri yazılmaması, sipariş sonrası boş sepet.
- Varyanta özel düşük stok eşiği; stok sayımı, depo giriş/çıkış hareketleri, rezervasyon bulunan varyantın taşınmaması ve dolu deponun kapatılamaması.
- Müşteri ve yönetim kayıtlarının yetki kontrolü, yönetici şifresiyle erişim değişikliği, son etkin yönetici koruması.
- İstanbul gece yarısı sınırında doğru rapor günü, demo/iptal işlemlerinin tahsilattan ayrılması.
- Açık bülten izni, imzalı ayrılma bağlantısı, geçersiz imza ve yeniden açık onayla abonelik.
- Şifreli ödeme anahtarı, imzalı/imzasız bildirim, yanlış tutar, tekrar bildirim, rezervasyon sonrasında geç gelen ödeme ve sağlayıcı başlatma hatası.
- Sağlayıcı başlatma hatasında stok/kampanya rezervasyonunu kaldırma, ürün ve kuponu sepete geri koyma; sağlayıcı yanıtı beklenirken eklenen diğer ürünün korunması.
- Görsel dosya türü doğrulama, SVG kılığına girmiş dosyayı reddetme, WebP kaydı/sunumu ve **3200 × 1800** kampanya görselini çözünürlük kaybı olmadan koruma.

İndirimli sağlayıcı sepetlerinin toplamı iyzico, PayTR ve Stripe için ayrı doğrulanır. Dış sağlayıcı çağrıları protokol testlerinde taklit edilir; gerçek para tahsil edilmiş değildir.

Test hazırlığı, veritabanı yolu tam olarak `/quantia_test` değilse durur. Mağaza veritabanı testlerde temizlenmez. Tekrarlanan HTTP kabul koşularında giriş hız sınırı devreye girmiştir; yalnızca test servisi yeniden başlatılarak sayaç sıfırlanmış, güvenlik sınırları korunmuştur.

## Üretim HTTP kabul testleri

1. Ana sayfa HTML'i, nonce CSP, güvenlik başlıkları ve yüksek kaliteli geniş kampanya görseli.
2. Koleksiyon, ürün, hesap, ödeme, iletişim, hikâye, bilgilendirme, yönetim ve bülten ayrılma sayfaları; bulunamayan adreste 404.
3. Sitemap, robots, canonical/Product `AggregateOffer`, sipariş noindex ve referrer koruması.
4. Next.js BFF'te yabancı origin/özel başlıksız istek ve yetkisiz yönetim erişimi.
5. Yeni HTTP istemcisinde hesap sepetini bulma, silme, misafir birleşimi ve tekrar giriş.
6. Demo checkout'ta aynı anahtarla tek sipariş ve boşalan sepet; makbuz sayfası.
7. Admin içerik değişikliğinin mağaza HTML'ine yansıması ve test sonunda geri alınması.
8. Müşteri, kullanıcı, rapor, depo, stok, abone, Google ve ödeme ekranlarının gerçek API sözleşmeleri.
9. Next.js medya BFF üzerinden yükleme ve doğru test ortamından WebP dosyası sunumu.

Bu takım Playwright'ın HTTP istemcisini kullanır; tarayıcı etkileşim testi olarak sunulmaz. Üretim Next.js imajı 3200 portunda, ayrı `quantia_test` veritabanıyla çalıştırılmıştır.

## Tarayıcıda doğrulanan etkileşimler

- Admin girişi ve açık renkli referansa göre genel bakış ekranı.
- Yeni ürün formunda metinler, renk/beden matrisi, stok ve görsel adresi; sekme değişiminde form verisinin korunması; başarılı kayıt ve ürünün mağazada açılması.
- Kategori, müşteri, kampanya, içerik, tasarım, rapor, pazarlama, ödeme, stok/depo, kullanıcı, ayar, SEO ve denetim alt ekranlarının açılması.
- Kayıtlı hesapta ürünü sepete ekleme → yenileme → ürünün kalması.
- İki açık sekmede aynı sepet → birinden silme → diğerinin kendiliğinden boşalması → yenilemede ürünün geri gelmemesi.
- Geniş ekranda %100 görünüm, görsel kadrajı, arayüz yazıları; telefon görünümünde menü, içerik ve yatay taşma kontrolü.
- Admin ürün akışında tarayıcı hata/uyarı kaydı alınmadı.

## Düzeltilen görsel sorun

Son sürümde 2560 piksel / DPR 1 masaüstünde `w=2560&q=100`, 390 piksel telefonda `w=1024&q=100` ana görsel seçimi doğrulandı. Mağaza, ürün, ödeme ve mobil admin ekranında yatay taşma görülmedi; mobil admin menüsü açılıp kapandı.

Ana kampanyanın merkezden kesilmesi ve çok küçük yazılar düzeltildi. Görsel kalite seçenekleri/`srcset` genişletildi. Mobilde `cover` alanının etkili genişliğine uygun kaynak seçimi sağlandı; küçük bir indirmeyi kapak boyutuna büyütme önlendi. Ayrıntılar [görsel kaydında](MARKA-VE-GORSELLER.md).

## Bilinen bağımlılık uyarısı

Prisma 7 PostgreSQL adaptörü çoklu ilişki sorgularında pg sürücüsünün gelecekteki 9. sürümüne yönelik kullanım dışı kalma uyarısı verebiliyor. Testler başarılıdır; pg ana sürümü 8 aralığında kilitlidir. Uyarı gizlenmedi. Ana sürüm yükseltmesinden önce yeniden incelenmelidir. [Prisma takip kaydı](https://github.com/prisma/orm/issues/29407).

## Gerçek hesap ve dağıtım kabulü

### Boş üretim kurulum provası

13 Kasım 2026 tarihinde `scripts/check-deployment.mjs` başarılı çalıştı. Ayrı proje, yeni PostgreSQL/medya volume'leri ve yeni rastgele sırlarla mevcut üretim Compose dosyaları kullanıldı. Otomatik migration, boş katalog, ana sayfa/CSP, ilk yönetici oluşturma/giriş, Secure/HttpOnly çerez, kapalı demo, Nginx üzerinden gerçek PNG yükleme/WebP sunumu ve backend yeniden başlatmasında kayıt/görsel kalıcılığı doğrulandı. Geçici kaynaklar kaldırıldı; mevcut mağaza sağlıklı kaldı.

Bu provada HTTPS alan adı ayarlarıyla TLS sonlandırıcının arkasındaki HTTP geçidi sınandı. Gerçek sertifika, alan adı ve tarayıcı üzerinden HTTPS kabulü hedef sunucuda yapılmalıdır. Docker'ın yerel varsayılan ağ havuzu dolu olduğu için mevcut ağlar silinmeden, mevcut Docker ağlarıyla çakışmayan geçici bir alt ağ kullanıldı.

### Hedef sunucuda kalan doğrulama

iyzico, PayTR, Stripe ve Google Places'ın gerçek hesapla kabulü yapılmamıştır. HTTPS alan adı, işletme hesabı ve işletmenin kendi anahtarları gerekir. Gerçek tahsilat, iade ve webhook teslimi sağlayıcı ortamında doğrulanmalıdır. E-posta/SMS, otomatik kargo/e-fatura ve otomatik iade gönderimi bağlı değildir. Bağımsız penetrasyon testi ve üretim yedekten dönüş provası yapılmış değildir. Bunların ayrıntıları [işletim](ISLETIM.md) ve [ödeme](ODEME-ENTEGRASYONLARI.md) rehberlerindedir.

## Tek komutlu Linux kurulumu

13 Kasım 2026 tarihinde aşağıdaki ek kontroller geçti. Yeni `compose.server.yml`, geliştirme ortamından bağımsız üretim yığınıdır; `install.sh` Docker kurulu Linux üzerinde çalışır. Kullanım [kurulum rehberinde](TEK-KOMUT-KURULUM.md).

- `npm run test:deployment`: **3/3 geçti**. Rastgele sırların tekrar çalıştırmada korunması, mevcut Docker ağıyla çakışmayan alt ağ seçimi, farklı alan adında durma, komut/port/yol içeren alan adlarını reddetme ve bozuk/kayıp sır dosyasında parolaları ezmeme.
- `tests/deployment/install-flow.test.sh`: Node 24 Debian Linux konteynerinde başarılı. Gerçek yapılandırma yardımcısı ve taklit Docker komutlarıyla ilk kurulum, tekrar kurulum, 700/600 dosya izinleri, yedek adımları, eşzamanlı kurulum kilidi, bootstrap hatası ve HTTPS hatasında başarısız dönüş/başarı işareti yazılmaması sınandı. Bu kabuk testi gerçek Docker servislerinin veya yedekten dönüşün testi değildir.
- `npm run test:installer`: **başarılı**. Ayrı `quantia-server-install-check` Docker projesinde boş PostgreSQL, 6 migration, üretim API/Next.js, Redis, işçi, Nginx ve Caddy gerçekten çalıştırıldı. İlk yönetici girişi ve Secure çerezi, 6 kategori/6 renk/12 beden/marka/koleksiyon, kapalı demo, sırların korunması ve `pg_dump` ile şema dışa aktarma doğrulandı.
- Başlangıç hazırlığını tekrar çalıştırmak mağaza metnini ezmedi, silinen rengi geri getirmedi ve e-postası değiştirilen yöneticinin yerine yeni yönetici oluşturmadı. Backend/frontend konteynerleri zorla yeniden oluşturulduktan sonra oturum ve kayıtlar korundu; Nginx yeni adresleri çözümleyerek HTTPS mağaza/API kontrolünü yeniden geçirdi.
- TLS bağlantısı test CA'sına açıkça güvenilerek doğrulandı; sertifika doğrulaması kapatılmadı. Aynı `scripts/deploy/verify.mjs` yardımcısı gerçek HTTPS üzerinden çalıştı. Testte özel CA kullanıldı; herkese açık ACME sertifikası gerçek alan adı olmadığı için bu ortamda alınmadı.
- Üretim backend imajı son bootstrap düzenlemesiyle yeniden derlendi. Bash sözdizimi ve depo biçim kontrolü geçti. Geçici test konteynerleri, volume'leri ve ağı kaldırıldı; mevcut mağaza korunarak çalışır bırakıldı.

Gerçek `bash install.sh` orkestrasyonu Linux kabuk akışı testinde, gerçek servis zinciri ise ayrı Docker kabul testinde sınandı. Hedef sunucunun dağıtımı, DNS'i ve herkese açık sertifikası henüz denenmiş değildir. Güncelleme betiğinin yerel yedek alması ayrıca üretim verisiyle geri yükleme provası yapıldığı anlamına gelmez. Önceki 82 backend ve 9 HTTP kabul testi bu kayıttaki uygulama sürümüne aittir; bu dağıtım değişikliğinde uygulama testleri tekrar çalıştırılmadı.

Yeniden çalıştırma: `npm run test:deployment` yerel Node 24 gerektirir. `npm run test:installer`, Docker erişimi ile önceden derlenmiş `quantia-server-backend:latest` ve `quantia-frontend:latest` imajlarını kullanır; 3443 portunu geçici olarak bağlar ve kendi kaynaklarını temizler. Aynı test proje adında önceden kaynak varsa başlamadan durur.
