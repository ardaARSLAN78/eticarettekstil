# Docker kurulu Linux sunucuda Quantia

Proje dosyalarını sunucuya kopyalayın, proje klasörüne girin ve gerçek alan adınızla çalıştırın:

```bash
bash install.sh --domain magaza.ornek.com
```

Sunucuda Bash, çalışan Docker Engine ve `docker compose` eklentisi (`up --wait` desteği) bulunmalıdır. Komutu çalıştıran kullanıcının Docker erişimi ve proje klasörüne yazma izni olmalıdır. Sunucuya Node.js, npm, PostgreSQL veya Nginx kurmak gerekmez. İmaj indirme, bağımlılık kurulumu ve sertifika işlemleri için internet erişimi gerekir. Bu kurulum Docker'ın Linux konteynerleri içindir; bir hosting panelinin paylaşımlı PHP alanında çalışmaz.

## Alan adı ve HTTPS

Alan adının A kaydı sunucunun IPv4 adresine yönelmelidir. AAAA kaydı varsa IPv6 da aynı sunucuya erişmelidir; eski/yanlış AAAA kaydını kaldırın. Sunucunun TCP 80 ve 443 portları dışarıdan erişilebilir ve başka servis tarafından kullanılmıyor olmalıdır. Güvenlik duvarında bu portları açın. UDP 443, HTTP/3 için kullanılır; temel HTTPS için TCP yeterlidir.

Başka bir siteyi barındıran mevcut Nginx/Caddy/Traefik varsa bu yığın aynı 80/443 portlarına bağlanamaz; önce ters vekil düzenini uyarlayın. Betik mevcut sunucu servislerini kapatmaz. Başlangıçta CDN/proxy yerine doğrudan DNS yönlendirmesi kullanın. Tek canonical alan adı seçin; `www` gibi alternatif adları ayrıca yönlendirin.

Caddy geçerli alan adı için sertifika alır, yeniler ve HTTP'yi HTTPS'ye yönlendirir. [Caddy'nin HTTPS gereksinimleri](https://caddyserver.com/docs/automatic-https) geçerlidir. Betik sertifika doğrulamasını kapatmadan **alan adının kendisinden** mağaza ve API erişimini sınar; doğrulama geçmeden başarılı kurulum bildirmez. DNS yayılımı veya sertifika işlemi gecikirse hatayı düzeltip aynı komutu tekrar çalıştırın. Docker servisleri ve veriler silinmez.

## Otomatik yapılanlar

- Geliştirme `.env` dosyalarından bağımsız üretim yapılandırması hazırlanır.
- Rastgele veritabanı parolası, şifreleme anahtarı ve ilk yönetici parolası oluşturulur.
- PostgreSQL, Redis, API, işçi, web, Nginx ve Caddy başlatılır.
- Boş veritabanına bütün Prisma migration'ları uygulanır; sonraki kurulumda yalnızca bekleyen migration'lar çalışır.
- İlk kurulumda ana depo, 6 kategori, 6 renk, 12 beden, Quantia markası, koleksiyon ve mağaza ayarları hazırlanır. Ürün/fiyat/stok uydurulmaz.
- İlk yönetici oluşturulur. Var olan yöneticinin parolası veya e-postası değiştirilmez.
- Veritabanı, yüklenen görseller ve sertifikalar kalıcı Docker volume'lerinde tutulur.
- Veritabanı, Redis ve doğrudan uygulama portları sunucunun dışına açılmaz. Demo ödeme üretimde kapalıdır.

Mağaza: `https://alanadiniz.com` — yönetim: `https://alanadiniz.com/yonetim`.

Yönetici adresi ve **ilk** parola sunucudaki `.deployment/credentials.txt` dosyasına yazılır. Parola konsola veya kaynak koda basılmaz. İlk girişten sonra panelden değiştirin; bu dosyadaki ilk parola sonradan değiştirilmiş parolanın kaydı değildir. Linux'ta sır dosyaları yalnızca sahibi tarafından okunabilir. `.deployment` klasörünü kaynak kontrolüne eklemeyin veya herkese açık paylaşmayın; şifreleme anahtarı dahil güvenli dış yedeğini tutun.

## Panelde girilecek bilgiler

Ödeme altyapıları bölümünde kullandığınız sağlayıcının API bilgilerini girip etkinleştirin. iyzico, PayTR, Stripe ve havale/EFT adaptörleri hazırdır. Diğer banka/POS sağlayıcılarının kendi protokolüne uygun adaptör gerekir; herhangi bir POS anahtarını girmek tek başına yeni sağlayıcı desteği oluşturmaz. Sağlayıcı hesabını ve bildirim adreslerini [ödeme rehberine](ODEME-ENTEGRASYONLARI.md) göre doğrulayın. Google yorumları için panelde Google Places bilgilerini girin.

Gerçek ürünler/varyantlar, fiyatlar, stoklar, vergi ve kargo ücretleri ile işletmenin iletişim, banka ve sözleşme bilgileri panelden tamamlanır. Varsayılan metinler taslaktır. Bu bilgiler alan adı veya API anahtarından üretilemez. Hazır olduğunda SEO bölümünden arama motoru indekslemeyi açın; ilk kurulumda noindex aktiftir. Gerçek ödeme hesabıyla satış ve iptal/iade kabulünü işletme tamamlamalıdır.

Yerel önizleme veritabanı yeni sunucuya otomatik taşınmaz. Mevcut kataloğu/hesapları taşımak için veritabanı, görseller ve mevcut şifreleme anahtarı birlikte aktarılmalıdır; yeni kurulumun üstüne rastgele eski veritabanı yüklemeyin.

## Güncelleme ve tekrar çalıştırma

Yeni sürümün dosyalarını mevcut proje klasörüne, `.deployment` klasörünü koruyarak yerleştirin ve çalıştırın:

```bash
bash install.sh
```

Alan adı ve sırlar korunur; imajlar yeniden derlenir. Migration öncesinde `.deployment/backups` altına PostgreSQL custom-format (`.dump`) yedeği, görsellerin `.tar.gz` arşivi ve sırların durum dosyası kaydedilir. Başlangıç sözlükleri ilk başarılı hazırlıktan sonra yeniden eklenmez; panelde silinen renk/kategori geri getirilmez ve mağaza içeriği ezilmez. Derleme hatasında yeni servisler başlatılmaz. Sonraki adımlarda hata olursa betik başarısız döner; otomatik yıkıcı geri yükleme yapmaz. Migration değişikliklerini inceleyerek ve bakım penceresinde güncelleyin.

Bu yerel yedekler disk arızasına karşı koruma sağlamaz; zamanlanmış dış yedekleme ve ayrı ortamda geri yükleme provası işletim gereksinimidir. Veritabanı/görsel yedekleri ayrı adımlarda alınır; canlı yazma sırasında tek bir atomik dosya/veri anı garantisi verilmez. Yedekten dönüş rehberi [işletim belgesindedir](ISLETIM.md#yedekleme-ve-geri-yükleme).

`.deployment/state.json` kaybolursa mevcut veriler için yeni parola/anahtar üretilmez; betik durur. Güvenli yedekten aynı dosyaları geri getirin. Farklı alan adı mevcut kurulum üzerine sessizce uygulanmaz; alan adı değişimi DNS, sertifika, origin ve ödeme bildirimlerinin birlikte taşınmasını gerektirir.

Eşzamanlı iki kurulum engellenir. Elektrik kesintisi gibi bir durumda `.deployment/install.lock` kalırsa önce başka bir kurulumun çalışmadığını doğrulayın, sonra yalnızca boş kilit klasörünü `rmdir .deployment/install.lock` ile kaldırıp tekrar deneyin. Verileri korumak için `down -v` kullanmayın ve volume'leri silmeyin.

## Durum ve hata inceleme

Proje klasöründe:

```bash
docker compose --env-file .deployment/runtime.env -f compose.server.yml ps
docker compose --env-file .deployment/runtime.env -f compose.server.yml logs --tail 100 edge gateway backend worker frontend
```

Bu komutlar üretim yığınını hedefler. Güncelleme sırasında aynı Compose proje adını (`quantia-server`) koruyun. Logları paylaşmadan önce müşteri bilgilerini ve sağlayıcı verilerini ayıklayın. `.deployment/installed` son başarılı HTTPS doğrulamasının zamanını tutar; canlı izleme servisi değildir.

## Doğrulama sınırı

Kurulum için yapılandırma testleri, Linux kabuk akışı testleri ve ayrı Docker projesinde gerçek PostgreSQL/Prisma/HTTPS kabul testi hazırlanmıştır. Linux kabuk testi Docker komutlarını taklit ederek hata/kilit/yeniden çalıştırma akışını sınar. Ayrı Docker testi ise gerçek servisleri ve test CA'sına güvenilerek doğrulanan TLS bağlantısını kullanır; sertifika kontrolü devre dışı bırakılmaz. Gerçek alan adınızın DNS'i ve herkese açık ACME sertifikası sunucuya kurulum sırasında doğrulanır. Gerçek ödeme hesabının tahsilat/iade kabulü işletme tarafından ayrıca yapılmalıdır. Sonuçlar [test raporundadır](TEST-RAPORU.md).
