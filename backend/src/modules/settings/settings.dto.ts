import { z } from "zod";
import { email, imageUrl, money, optionalUrl, text } from "../../core/sanitizer/index.js";

export const settingsDto = z
  .object({
    brandName: text(50),
    logoUrl: imageUrl,
    monogramUrl: imageUrl,
    themeColor: z.string().regex(/^#[a-fA-F0-9]{6}$/),
    allowIndexing: z.boolean(),
    tagline: text(120),
    announcement: text(180),
    heroEyebrow: text(100),
    heroTitle: text(150),
    heroSubtitle: text(350),
    heroImage: imageUrl,
    heroCta: text(60),
    editorialEyebrow: text(100),
    editorialTitle: text(150),
    editorialText: text(500),
    editorialImage: imageUrl,
    campaignTitle: text(120),
    campaignText: text(250),
    campaignImage: imageUrl,
    newsletterTitle: text(150),
    contactEmail: email,
    contactPhone: text(30),
    address: text(400),
    instagramUrl: optionalUrl,
    googlePlaceId: z
      .string()
      .max(160)
      .regex(/^[A-Za-z0-9_-]*$/),
    showGoogleReviews: z.boolean(),
    shippingFee: money,
    shippingVatRateBps: z.number().int().min(0).max(10000),
    freeShippingThreshold: money,
    bankAccountName: z.string().max(160),
    bankIban: z.string().max(40),
    privacyText: text(15000),
    returnsText: text(15000),
    termsText: text(15000),
  })
  .strict();

export type StoreSettings = z.infer<typeof settingsDto>;

export const defaultSettings: StoreSettings = {
  brandName: "QUANTIA",
  logoUrl: "/brand/quantia-logo.svg",
  monogramUrl: "/brand/quantia-monogram.svg",
  themeColor: "#223d32",
  allowIndexing: false,
  tagline: "Zamana değil, kendine ait.",
  announcement: "3.000 TL ve üzeri alışverişlerinizde kargo bizden.",
  heroEyebrow: "SONBAHAR / KIŞ 2026",
  heroTitle: "Bazı şeyler\nzamansızdır.",
  heroSubtitle:
    "İyi bir duruş. Doğru bir doku. Kendinden emin bir sadelik.\nYeni Quantia koleksiyonuyla tanışın.",
  heroImage: "/media/quantia-hero.png",
  heroCta: "Koleksiyonu keşfet",
  editorialEyebrow: "THE QUANTIA WAY",
  editorialTitle: "Az şey.\nÇok şey anlatır.",
  editorialText:
    "Gösterişten uzak, karaktere yakın. Doğal dokular ve incelikle düşünülmüş detaylarla, yıllar boyu size eşlik edecek bir gardırop.",
  editorialImage: "/media/quantia-hero.png",
  campaignTitle: "İyi giyinmek,\nbir alışkanlık.",
  campaignText: "Günün her anına eşlik eden seçkiler.",
  campaignImage: "/media/shirt.png",
  newsletterTitle: "İyi şeylerden ilk siz haberdar olun.",
  contactEmail: "merhaba@quantia.example",
  contactPhone: "+90 (212) 000 00 00",
  address: "İstanbul, Türkiye — örnek mağaza bilgisi",
  instagramUrl: "",
  googlePlaceId: "",
  showGoogleReviews: true,
  shippingFee: 9990,
  shippingVatRateBps: 0,
  freeShippingThreshold: 300000,
  bankAccountName: "",
  bankIban: "",
  privacyText:
    "Bu metin bir taslak alandır. Mağazanızın veri sorumlusu, iletişim, işleme amaçları, saklama süreleri ve başvuru bilgileriyle işletmenize özel gizlilik metnini yönetim panelinden yayınlayın.",
  returnsText:
    "Bu alan örnek iade ve teslimat bilgilendirmesidir. Kargo firması, teslimat süresi, iade adresi ve ürün koşulları işletme tarafından yönetim panelinden tamamlanmalıdır.",
  termsText:
    "Bu alan mağaza sözleşmeleri için ayrılmıştır. Canlı satış öncesinde satıcı bilgileri ve işletmeye uygun mesafeli satış koşulları yönetim panelinden tamamlanmalıdır.",
};
