import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getBootstrap } from "@/lib/server-api";
import { Photo } from "@/components/ui/photo";

export const metadata = { title: "Hikâyemiz" };
export default async function Story() {
  const { settings } = await getBootstrap();
  return (
    <div className="story-page page-container">
      <div className="story-heading">
        <span className="eyebrow">THE QUANTIA WAY</span>
        <h1>{settings.editorialTitle}</h1>
        <p>{settings.editorialText}</p>
      </div>
      <div className="story-photo">
        <Photo
          src={settings.heroImage}
          alt="Quantia yaşam ve stil anlayışı"
          priority
          sizes="90vw"
        />
      </div>
      <div className="story-words">
        <span className="eyebrow">ZAMANA DEĞİL, KENDİNE AİT</span>
        <h2>Stil, detaylarda saklı.</h2>
        <p>
          Quantia'nın seçkisi; doğal dokular, sade çizgiler ve dengeli kesimler etrafında
          şekillenir. Her parça, gardırobunuzun geri kalanıyla kolayca bir araya gelecek şekilde
          düşünülür.
        </p>
        <Link href="/koleksiyon" className="text-link">
          Koleksiyonu keşfedin <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
