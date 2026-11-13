import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { getBootstrap } from "@/lib/server-api";

export const metadata = { title: "İletişim" };
export default async function Contact() {
  const { settings } = await getBootstrap();
  return (
    <div className="contact-page page-container">
      <span className="eyebrow">BİR MERHABA DEYİN</span>
      <h1>Size yardımcı olalım.</h1>
      <p>Beden, ürün seçimi veya siparişinizle ilgili sorularınız için buradayız.</p>
      <div className="contact-grid">
        <a href={`mailto:${settings.contactEmail}`}>
          <Mail size={27} strokeWidth={1} />
          <h2>Bize yazın</h2>
          <span>
            {settings.contactEmail} <ArrowUpRight size={16} />
          </span>
        </a>
        <a href={`tel:${settings.contactPhone.replace(/[^+\d]/g, "")}`}>
          <Phone size={27} strokeWidth={1} />
          <h2>Bir ses uzağınızdayız</h2>
          <span>{settings.contactPhone}</span>
        </a>
        <div>
          <MapPin size={27} strokeWidth={1} />
          <h2>Quantia</h2>
          <span>{settings.address}</span>
        </div>
      </div>
    </div>
  );
}
