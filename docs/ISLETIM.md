# Quantia işletim rehberi

## Servisler ve kalıcılık

`compose.yml`: PostgreSQL 17 (yerel 5433), Redis 7 (yerel 6380), Express (yerel 4100), Next.js (yerel 3000), sipariş süresi işçisi. Uygulama imajları root kullanıcısıyla çalışmaz. PostgreSQL `postgres_data`, görseller `media_data` volume'ündedir. Redis fiyat veya sepetin kaynağı değildir; hız sınırları ve kısa süreli veriler için kullanılır.

API başlangıçta migration uygular. Örnek kataloğu yüklemek ve yönetici oluşturmak ayrı, açık adımlardır. Mevcut veriler seed ile ezilmez.

## Tek komutla üretim kurulumu

Docker kurulu Linux sunucuda önerilen yol `bash install.sh --domain magaza.ornek.com` komutudur. Bağımsız `compose.server.yml` yığını kullanılır; Caddy HTTPS sertifikasını otomatik alır ve yeniler. Sırlar `.deployment` altında korunur, migration ve ilk yönetici/sözlük hazırlığı otomatik yapılır. Tekrar çalıştırmada migration öncesi veritabanı/görsel/sır yedeği alınır. Ayrıntılar [tek komut kurulum rehberinde](TEK-KOMUT-KURULUM.md). Aşağıdaki elle kurulum, mevcut ters vekilini kullanmak isteyen ortamlara aittir; iki yöntemin ortam dosyalarını karıştırmayın.

## Elle üretim kurulumu

13 Kasım 2026 tarihinde mevcut imajlarla, ayrı Docker projesi ve boş PostgreSQL volume'ü üzerinde üretim kurulum provası başarılı oldu. Kullanılan Compose sürümü 5.3.1'dir. Prova gerçek sunucunun DNS/TLS sertifikasını veya ödeme kuruluşlarını doğrulamaz.

Yerelde aynı provayı çalıştırmak için, imajlar derlendikten sonra `node scripts/check-deployment.mjs` kullanılır. Node.js 24 ve Docker CLI gerektirir. Betik yalnızca geçici `quantia-deployment-check` projesini kullanır, 3300 portuna bağlanır ve koşu sonunda kendi oluşturduğu kaynakları kaldırır. Bu isimde önceden kaynak varsa durur; mevcut mağazayı temizlemez.

Boş üretim veritabanında örnek ürünler otomatik eklenmez. Yerelde hazırlanan ürünleri taşımak için PostgreSQL yedeği ile görsel volume'ünün birlikte aktarılması gerekir. Var olan veritabanını taşıyorsanız şifreli kayıtlar için mevcut `ENCRYPTION_KEY` korunmalı; yeni anahtar yalnızca yeni kurulumda oluşturulmalıdır. Yönetici hesabı da yedekle taşınıyorsa ilk yönetici oluşturma adımı mevcut hesabı değiştirmez.

1. Üretim makinesinde ayrı `.env` ve `backend/.env` oluşturun. Git'e eklemeyin.
2. PostgreSQL için uzun, rastgele bir parola kullanın. Compose bağlantı adresine yerleştirildiği için hex biçiminde parola seçmek URL özel karakterlerini önler.
3. Yeni `ENCRYPTION_KEY` için `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` çalıştırın. Aynı anahtarı backend/worker için kullanın; şifreli kayıtlarla birlikte güvenli yedeğini tutun. Var olan şifreli kayıtların anahtarını plansız değiştirmeyin.
4. `WEB_ORIGIN=https://magazaniz.example`, `PUBLIC_API_URL=https://magazaniz.example`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_USER` değerlerini ayarlayın. Örnekteki alan adını gerçek alan adınızla değiştirin.
5. İmajları derleyin. `docker compose -f compose.yml -f compose.production.yml --profile app config --quiet` ile yapılandırmayı doğrulayın.
6. `docker compose -f compose.yml -f compose.production.yml --profile app up -d --no-build` çalıştırın.
7. TLS sağlayan ana ters vekili aynı makinenin `127.0.0.1:8080` gateway portuna bağlayın. PostgreSQL, Redis ve doğrudan API portları üretim override'ında dışarı açılmaz. Demo ödeme kapalıdır.
8. `SEED_ADMIN_EMAIL` ve yeni `SEED_ADMIN_PASSWORD` değerlerini backend ortam dosyasına girin. İlk yönetici için `docker compose --profile app exec backend node backend/scripts/create-admin.mjs` çalıştırın. Üretim override kullanıyorsanız aynı `-f` dosyalarını bu komutta da kullanın. Var olan hesabın şifresi bu betikle değiştirilmez.
9. Panelde işletme bilgileri, banka/kargo, gerçek ürünler, vergi oranları, metinler ve ödeme sağlayıcılarını yapılandırın. Gerçek sağlayıcı testlerini [ödeme rehberine](ODEME-ENTEGRASYONLARI.md) göre tamamlayın.
10. İçerikler hazır olduğunda panelde arama motoru indekslemeyi açın. Başlangıçta robots/noindex koruması etkindir.

Bu elle kurulum yığını TLS sertifikası üretmez; TLS sonlandırma mevcut ters vekilde yapılır. Tek komut yığınında ise bu görevi Caddy üstlenir. Kaynak/çerez kontrolleri için mağaza adresini tek canonical origin olarak kullanın; alternatif www adresini bu adrese yönlendirin.

TLS ters vekili istemciden gelen `X-Forwarded-For` başlığını güvenilir istemci adresiyle oluşturmalıdır. Gateway bu zincire kendi bağlantı adresini ekler; API yalnızca özel ağdaki güvenilir vekilleri tanır. Gerçek IP aktarımını dağıtımda doğrulayın; aksi hâlde farklı müşteriler aynı IP hız sınırını paylaşır.

Kabul takımını tekrar çalıştırmadan önce yalnızca `backend-e2e` servisini yeniden başlatın ve `frontend-e2e` bağımlılık sağlık kontrolünü bekletin. Test modundaki bellek hız sayacı böyle sıfırlanır. Gerçek mağazanın hız sınırları bu amaçla değiştirilmez veya temizlenmez.

## Yedekleme ve geri yükleme

Çalışan PostgreSQL'in dosya dizinini kopyalamak yerine `pg_dump -Fc` kullanın. PowerShell 7.4 ve üzerinde yerel bayt yönlendirmesiyle:

```powershell
New-Item -ItemType Directory -Force -Path output/backups
docker compose exec -T postgres pg_dump -U quantia -d quantia -Fc > output/backups/quantia.dump
```

Kullanıcı/veritabanı adlarını kendi ortamınıza uyarlayın. Görsel volume'ünü, ortam sırlarını ve şifreleme anahtarını ayrı güvenli yedeklerde tutun. `output` kaynak kontrolünde yoktur. Yedekleri aynı diskte bırakmayın; üretimde zamanlanmış dış yedekleme sağlayın.

Geri yüklemeyi önce ayrı bir boş PostgreSQL veritabanında `pg_restore` ile prova edin. Kaynak mağaza veritabanına yıkıcı geri yükleme otomatik yapılmaz. Son başarılı yedek ve geri yükleme provası işletim kaydında tutulmalıdır.

## Güncelleme ve takip

- `npm ci`, `npm run typecheck`, `npm run test:backend` ve Docker derlemeleri dağıtım öncesi geçmeli.
- Kabul ortamında `npm run test:e2e` çalıştırın; bu ortam yalnızca `quantia_test` içindir.
- Yeni sürümü başlatmadan önce veri/görsel yedeği alın ve migration'ları inceleyin.
- `docker compose --profile app ps` ve `docker compose --profile app logs --tail 100 backend worker frontend` ile sağlık/hataları izleyin. Logları herkese açık paylaşmayın.
- İşçi çalışmıyorsa ödeme bekleyen stok rezervasyonları zamanında kapanmaz; işçi servisini izleyin.
- İade gerekli siparişleri sağlayıcı panelinde kontrol edin ve gerçek iade sürecini tamamlayın.
- Bu kurulum tek mağaza içindir. Bağımsız müşteriler için ayrı veritabanı, ortam sırları ve dağıtım kurun; tek veritabanı çok kiracılı izolasyon sunmaz.
