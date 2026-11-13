# Quantia

Klasik erkek giyimi için Türkçe e-ticaret mağazası ve yönetim paneli. Express.js + TypeScript, Prisma + PostgreSQL, Next.js + React ve Docker Compose kullanır. Para kuruş olarak saklanır; fiyat, kampanya, vergi, kargo ve stok sunucuda doğrulanır.

## Linux sunucuya tek komutla kurulum

Docker kurulu sunucuda proje klasöründe, alan adınızı girerek:

```bash
bash install.sh --domain magaza.ornek.com
```

Üretim ayarları, PostgreSQL, migration, ilk yönetici ve otomatik HTTPS hazırlanır. Yönetici bilgileri `.deployment/credentials.txt` dosyasındadır. Alan adı sunucuya yönelmeli, TCP 80/443 portları açık ve boş olmalıdır. API bilgileri panelden girilir. Güncellemede `bash install.sh` aynı sırları korur ve migration öncesi yerel yedek alır. Gereksinimler, işletme ayarları ve doğrulama sınırları [tek komut kurulum rehberinde](docs/TEK-KOMUT-KURULUM.md).

## Yerel önizleme

- Mağaza: http://localhost:3000
- Yönetim: http://localhost:3000/yonetim
- API sağlık: http://localhost:4100/health/ready
- Yönetici erişimi yalnızca yerel [tmp/admin-access.txt](tmp/admin-access.txt) dosyasındadır. Şifre kaynak koda yazılmaz.

Node.js 24 ve Docker Desktop gerekir. İlk kurulum:

```powershell
npm ci
npm run setup:local
docker compose up -d postgres redis
npm run db:generate
npm run db:migrate
npm run db:seed
```

Geliştirme sırasında:

```powershell
npm run dev
```

Tüm uygulamayı Docker imajlarıyla çalıştırmak için geliştirme sunucusunu kapatıp:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-images.ps1
docker compose --profile app up -d --no-build
```

Türkçe klasör adında Docker Compose bake aktarımı hata verirse bu betik doğrudan `docker build` kullanır. Linux'ta aynı işlemler:

```bash
docker build -t quantia-backend -t quantia-worker -f backend/Dockerfile .
docker build -t quantia-frontend -f frontend/Dockerfile .
docker compose --profile app up -d --no-build
```

Mevcut `.env` dosyaları ve başlangıç kayıtları yeniden kurulumda ezilmez. PostgreSQL ve yüklenen görseller kalıcı Docker volume'lerinde tutulur. `docker compose down -v` veri siler; normal durdurma için `docker compose stop` kullanın.

## Testler

```powershell
npm run typecheck
npm run test:backend
docker compose -f compose.yml -f compose.qa.yml --profile qa up -d --no-build backend-e2e frontend-e2e
docker compose -f compose.yml -f compose.qa.yml --profile qa restart backend-e2e
docker compose -f compose.yml -f compose.qa.yml --profile qa up -d --no-build frontend-e2e
npm run test:e2e
docker compose -f compose.yml -f compose.qa.yml --profile qa stop frontend-e2e backend-e2e
```

Sıralı çalıştırın. Backend testleri yalnızca `quantia_test` veritabanını temizler. Kabul ortamı 3200 portunda aynı üretim Next.js imajını bu ayrı test veritabanına bağlar. `test:e2e`, tarayıcı açmadan gerçek HTTP/BFF/API/veritabanı zincirini sınar. Ekran etkileşimleri ve duyarlı tasarım ayrıca tarayıcıda kontrol edilmiştir. Sonuçlar [test raporunda](docs/TEST-RAPORU.md).

## Yönetim kapsamı

Ana sayfa özeti, ürünler, renk/beden matrisi, görsel galerisi, kategori hiyerarşisi, marka ve koleksiyonlar, sipariş durumları, fatura bağlantıları, kampanya/kuponlar, müşteriler/adresler, satış raporları, depo/stok hareketleri, kullanıcı yetkileri, bülten izinleri, ödeme anahtarları, mağaza içerikleri, tema/logo, SEO alanları, yönlendirmeler ve denetim kayıtları yönetilir.

Yönetim menüsü URL hash'inde tutulur; yenilenen ekran aynı bölümde açılır. Stok düzenleme sürüm kontrollüdür. Başka sekme veya sipariş stoğu değiştirdiyse eski formun ezmesine izin verilmez. Hesap sepeti PostgreSQL'de hesaba bağlıdır; misafir sepeti girişte birleştirilir. Sayfa yenileme, tekrar giriş ve sekmeler arası değişiklikler için doğrulama yapılmıştır.

## Belgeler ve işletmeye teslim

- [Uygulama planı](docs/PLAN.md)
- [Mimari, veri modeli ve iş kuralları](docs/MIMARI.md)
- [Ödeme adaptörleri ve gerçek hesap kabulü](docs/ODEME-ENTEGRASYONLARI.md)
- [Kurulum, üretim ve yedekleme](docs/ISLETIM.md)
- [Docker kurulu Linux sunucuda tek komut](docs/TEK-KOMUT-KURULUM.md)
- [Marka ve görsel kaynakları](docs/MARKA-VE-GORSELLER.md)
- [Test sonuçları](docs/TEST-RAPORU.md)

Örnek fotoğraflar ve ürün verileri tanıtım içindir. Canlı satış için işletme bilgileri, gerçek ürünler, vergi/kargo ayarları, sözleşmeler, HTTPS alan adı ve onaylı ödeme hesabı tamamlanmalıdır. Google yorumları gerçek Places hesabı bağlanınca gösterilir. Demo ödeme açıkça etiketlidir; gerçek tahsilat yapmaz ve üretim modunda açılmaz.

iyzico, PayTR, Stripe ve havale/EFT adaptörleri vardır. Diğer banka/POS sağlayıcıları kendi protokollerine göre yeni adaptör gerektirir. E-posta/SMS gönderimi, otomatik kargo etiketi, e-fatura kesimi ve sağlayıcıya otomatik iade gönderimi bu sürümde bağlı değildir. İade gerektiren kayıtlar görünür şekilde işaretlenir; fatura ve takip bilgileri panelden kaydedilebilir. Next.js mobil uyumlu web sunar; ayrı React Native uygulaması bu teslimin parçası değildir.
