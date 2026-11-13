# Quantia marka ve görsel kaydı

## Görsel dil

Kullanıcının beğendiği referansın sayfa sırası korundu: üst duyuru, yatay menü, büyük kampanya, dört güven öğesi, kategori kartları, yeni ürünler, hikâye, iki kampanya kartı, bülten ve alt bilgi. Tasarım klasik erkek giyimine uyarlandı. Ana renk `#223d32`, zemin `#fbfaf7`, taş ve sınırlı altın vurgusu kullanılır. Başlıklar Cormorant Garamond, arayüz DM Sans'tır; font dosyaları yerel paketlerden sunulur.

Logo `frontend/public/brand/quantia-logo.svg`, Q monogramı `quantia-monogram.svg` dosyasındadır. Vektör kaynaklar düzenlenebilir. Mağaza üst ve alt logosu yönetim panelindeki marka ayarına bağlıdır. Varsayılan başlıkta yerel fontla aynı kelime logosu çizilir.

## Üretilen tanıtım görselleri

Raster görseller OpenAI ImageGen ile bu proje için üretildi; aşağıdaki metinler üretim yönergelerinin özetidir. Gerçek satıcı ürün fotoğrafı olarak sunulmazlar. Stok renklerini temsil eden gerçek çekimlerle değiştirilmelidir; örnek katalogda her renk için ayrı gerçek çekim bulunmaz.

| Dosya                                    | Üretim yönergesi özeti                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `frontend/public/media/quantia-hero.png` | Akdeniz gölü kıyısında tarihi villada, ekru örgü polo ve pileli pantolon giyen yetişkin erkek; doğal ışık, klasik lüks editoryal görünüm; solda başlık için koyu boşluk; yazı ve logo yok. |
| `polo.png`                               | Ekru, kısa kollu, örgü dokulu klasik polo; sade sıcak taş renkli stüdyo fonu, ürünün tamamı görünür; yazı/logo yok.                                                                        |
| `shirt.png`                              | Doğal keten dokulu açık renk erkek gömleği; sıcak nötr stüdyo fonu, düzenli ürün çekimi; yazı/logo yok.                                                                                    |
| `trousers.png`                           | Taş/kahve tonda pileli klasik erkek pantolonu; kumaş ve kesim görünür, nötr fon; yazı/logo yok.                                                                                            |
| `blazer.png`                             | Kahve tonda yapısız iki düğmeli klasik erkek blazer; sade ürün çekimi, nötr fon; yazı/logo yok.                                                                                            |
| `knit.png`                               | Orman yeşili, bisiklet yaka ince merinos görünümlü erkek triko; nötr stüdyo fonu; yazı/logo yok.                                                                                           |
| `loafers.png`                            | Kahve süet loafer çifti; deri taban ve ürün dokusu görünür, sıcak nötr stüdyo fonu; yazı/logo yok.                                                                                         |

Görsellerin özgün üretim dosyaları Codex'in `generated_images` klasöründe bırakıldı; kullanılan kopyalar projenin `public/media` dizinindedir. Ana görsel kaynağı 1672 × 941 pikseldir; 4K kaynak olduğu iddia edilmez. Son denenen alternatif ana görsel kullanılmamıştır; beğenilen kompozisyon korunmuştur.

## %100 görünüm düzeltmesi

- Ana görselde üstten hizalı kadraj, geniş monitörde başın kesilmesini önler.
- Mobilde sağa odaklı kadraj yüzü korur. `object-fit: cover` nedeniyle fotoğrafın gerçek ölçeklenen genişliği yaklaşık 1000 pikseldir; mobil `sizes` değeri bu genişliğe göre seçilir. Yalnızca 390 piksel görsel indirip iki kat büyütme önlenir.
- 1600 piksel ve üstünde içerik genişliği 1760 piksele kadar açılır; ana başlık ve arayüz yazıları yeniden ölçeklenir.
- Küçük arayüz yazıları okunur boyutlara yükseltildi. Sayfanın tamamına CSS zoom/transform uygulanmaz.
- Next.js `sizes` ve geniş ekran `srcset` boyutları tanımlıdır. Öncelikli ana/ürün görsellerinde kalite 100, kartlarda 90 kullanılır. Dış HTTPS görseller kaynağından sunulur.
- Admin yükleme servisi yüksek çözünürlüklü kaynağı 3840 piksele kadar korur; küçük görseli yapay olarak büyütmez. EXIF kaldırılır, WebP kalite 94 ile kaydedilir.
- Kaynak fotoğrafın gerçek çözünürlüğü ayrıntı sınırıdır. Yeni canlı kampanya çekimleri için en az 2560 piksel genişlik, yüksek piksel yoğunluklu ekranlar için 3840 piksel kaynak tercih edilmelidir.
