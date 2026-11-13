import { ArrowUpRight, Quote, Star } from "lucide-react";
import type { GoogleReviews } from "@/lib/types";

export function Reviews({ data }: { data: GoogleReviews }) {
  if (!data.available || !data.reviews.length) return null;
  return (
    <section className="reviews-section page-container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SİZDEN GELENLER</span>
          <h2>İyi hissettiren bir deneyim.</h2>
        </div>
        <div className="google-rating">
          <span className="google-word">Google Maps</span>
          <strong>
            {data.rating?.toFixed(1)} <Star size={14} fill="currentColor" />
          </strong>
          <small>{data.count} değerlendirme</small>
        </div>
      </div>
      <div className="reviews-grid">
        {data.reviews.slice(0, 3).map((review) => (
          <article key={`${review.author}-${review.publishedAt}`} className="review-card">
            <Quote size={25} strokeWidth={1} />
            <div className="review-stars" aria-label={`${review.rating} / 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={13} fill={i < review.rating ? "currentColor" : "none"} />
              ))}
            </div>
            <p>{review.text}</p>
            <div className="review-author">
              {review.avatar && (
                <img src={review.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" />
              )}
              <div>
                <a
                  href={review.authorUrl ?? review.sourceUrl ?? "https://maps.google.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {review.author}
                </a>
                <small>
                  {review.publishedAt
                    ? new Date(review.publishedAt).toLocaleDateString("tr-TR")
                    : "Google değerlendirmesi"}
                  {review.visitDate ? ` · Ziyaret: ${review.visitDate}` : ""}
                </small>
              </div>
            </div>
            {review.sourceUrl && (
              <a
                className="text-link"
                href={review.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google'da görüntüle <ArrowUpRight size={13} />
              </a>
            )}
          </article>
        ))}
      </div>
      {data.mapsUrl && (
        <a
          className="text-link reviews-all"
          href={data.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Tüm Google değerlendirmeleri <ArrowUpRight size={14} />
        </a>
      )}
    </section>
  );
}
