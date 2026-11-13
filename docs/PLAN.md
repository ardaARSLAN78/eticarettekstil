# Quantia — uygulama ve teslim planı

Tarih: 13 Kasım 2026

## Hedef

Klasik erkek giyimi satan Quantia için Türkçe, mobil uyumlu bir Next.js mağaza ve aynı veritabanını yöneten bir yönetim paneli kurulacak. Backend TypeScript, Express.js, Prisma ve PostgreSQL kullanacak; geliştirme ve dağıtım ortamı Docker Compose ile tekrarlanabilir olacak.

Referanstaki üst duyuru şeridi, yatay menü, büyük kampanya görseli, güven öğeleri, kategori kartları, ürün sırası, iki kampanya alanı ve kapsamlı alt bilgi korunacak. Sokak giyimi yerine keten gömlek, polo, blazer, pileli pantolon, triko ve loafer kullanılacak. Tasarım dili: kırık beyaz, orman yeşili, taş rengi ve sınırlı pirinç vurgusu; zarif serif başlıklar ve sade arayüz yazıları.

## 1. Backend — ilk tamamlanacak aşama

- `backend/src/core`, `graphql`, `jobs`, `lib`, `modules` yapısı referansa uygun kurulacak.
- Her modül anlaşılır `*.dto.ts`, `*.schema.ts`, `*.resolvers.ts`, `*.service.ts` dosyalarına ayrılacak. İlgili yerlerde Türkçe açıklamalar kullanılacak.
- Üyelik, giriş, güvenli oturum ve müşteri/yönetici yetkileri.
- Kategoriler, ürünler, çoklu görseller, renk/beden varyantları ve varyant bazında stok.
- Kalıcı sepet, sunucuda hesaplanan fiyat ve kargo, atomik stok kontrolü, tekrar gönderime dayanıklı sipariş.
- Yönetilebilir ana sayfa, kampanyalar, marka/iletişim bilgileri ve mağaza ayarları.
- Bülten aboneliği, sipariş yönetimi ve denetim kayıtları.
- Gerçek Google Places yorumları için sunucu tarafında bağlantı; hesap bağlanmadan uydurma Google yorumu gösterilmeyecek.
- Ödemeler sağlayıcı adaptörleriyle ayrılacak: iyzico CheckoutForm, PayTR iFrame, Stripe Checkout ve havale/EFT. Yönetici anahtarları panelden girer; anahtarlar AES-256-GCM ile şifreli saklanır ve tekrar tarayıcıya gönderilmez. Yeni sanal POS eklemek için sağlayıcıya özel adaptör ve doğrulama testleri gerekir.
- Gerçek sağlayıcı hesapları bağlanana kadar açıkça belirtilen demo yöntemi kullanılacak. Canlı tahsilatın kabulü, ilgili sağlayıcının test hesabında ve canlı hesap onayıyla yapılacak; anahtar girilmesinin her banka için tek başına yeterli olduğu varsayılmayacak.

**Geçiş koşulu:** Prisma şema/migration doğrulaması, TypeScript derlemesi, gerçek PostgreSQL üzerinde API/entegrasyon testleri ve olumsuz güvenlik senaryoları geçmeli.

## 2. Frontend ve marka

- Özgün, ölçeklenebilir Quantia kelime logosu ve Q monogramı (SVG).
- Referans düzeninde, özgün renk ve tipografiyle ana sayfa.
- Koleksiyon/ürün arama, kategori ve sıralama; ürün detayında renk, beden, stok ve görsel galerisi.
- Sunucu sepetine bağlı sepet çekmecesi, teslimat formu, test siparişi ve sipariş sonucu.
- Üyelik, giriş, hesap ve sipariş geçmişi.
- Telefon/tablet/masaüstü düzenleri, klavye erişimi ve görünür hata/yükleme durumları.

**Not:** Next.js React tabanlı mobil uyumlu web sitesi bu teslimin parçasıdır. React Native ayrı bir yerel mobil uygulama teknolojisidir; aynı GraphQL API bu sonraki uygulamaya temel oluşturur.

## 3. Yönetim paneli

- Yetki kontrollü giriş ve özet ekranı.
- Ürün oluşturma/düzenleme, yayın durumu, kategori, fiyat, görsel, varyant ve stok yönetimi.
- Kategori düzenleme ve sıralama.
- Sipariş listesi ve izinli durum geçişleri.
- Ana sayfa yazıları/görselleri, kampanyalar, iletişim, kargo ücretleri ve Google işletme kimliği ayarları.
- Yönetici işlemleri için denetim kaydı.

## 4. Güvenlik katmanları

1. Nginx/HTTP: istek boyutu, süre sınırları, güvenlik başlıkları; üretimde TLS ters vekilde sonlandırılır.
2. API: yalnızca JSON, kaynak doğrulaması ve özel istek başlığıyla CSRF koruması, hız sınırı, GraphQL derinlik/alan sınırı ve toplu sorgu engeli.
3. Oturum: kriptografik rastgele anahtar, veritabanında yalnızca özeti, HttpOnly/SameSite çerezi, üretimde Secure, çıkışta iptal.
4. Yetki: her ayrı yönetici ve sipariş işleminde sunucu kontrolü; kullanıcı kendi kaydına erişir.
5. İş kuralları: istemci fiyatına güvenilmez; stok ve sipariş aynı transaction içinde; idempotency kontrolü.
6. Veri: Prisma parametreli sorguları, doğrulanan girdiler, tutarların kuruş olarak saklanması, veritabanı kısıtları.
7. İşletim: ortam değişkenleri, sürüm kilidi, ayrı servisler, veritabanı/Redis'in üretimde dışarı açılmaması, sağlık kontrolü ve yedekleme yönergesi.

Bu kontroller bağımsız penetrasyon testinin veya işletmenin canlı ortam incelemesinin yerine geçtiği iddiasıyla sunulmayacak.

## 5. Son doğrulama ve teslim

- Backend testleri tekrar çalıştırılacak; frontend üretim derlemesi yapılacak.
- Masaüstü ve mobilde katalog → varyant → sepet → sipariş akışı doğrulanacak.
- Yönetim panelinden yapılan değişikliğin mağazaya yansıdığı kontrol edilecek.
- Giriş, yetkisiz erişim, geçersiz girdi, stok yarışı, tekrar sipariş ve CSRF senaryoları kontrol edilecek.
- Çalıştırma komutları, klasör haritası, test sonuçları ve gerçek hesap gerektiren adımlar belgelenecek.

## Canlı satıştan önce işletmeden gerekenler

- Alan adı, barındırma ve TLS; gerçek ürün fotoğrafları ve ürün bilgileri.
- Ödeme kuruluşu seçimi ve onaylı işletme hesabı; canlı tahsilat/iade entegrasyonu.
- Google Cloud Places API anahtarı ve işletmenin Place ID'si.
- İletişim, fatura/kargo bilgileri ve işletmeye özel sözleşme/KVKK metinleri.

## Başvuru kaynakları

- [Next.js kurulum ve App Router](https://nextjs.org/docs/app/getting-started/installation)
- [Prisma 7 PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)
- [OWASP GraphQL güvenlik önerileri](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
- [Google Places ayrıntıları ve yorumlar](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Google Places gösterim/atıf kuralları](https://developers.google.com/maps/documentation/places/web-service/policies)
