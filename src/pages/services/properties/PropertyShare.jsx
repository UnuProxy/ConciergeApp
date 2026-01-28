import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const PropertyShare = () => {
  const { token } = useParams();
  const db = getFirestore();
  const [loading, setLoading] = useState(true);
  const [shareData, setShareData] = useState(null);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const images = useMemo(() => (shareData?.images || []).filter(Boolean), [shareData]);
  const activeImage = images[activeIndex] || images[0] || '';

  useEffect(() => {
    const fetchShare = async () => {
      try {
        setLoading(true);
        if (!token) {
          setError('Invalid link');
          setLoading(false);
          return;
        }
        const shareRef = doc(db, 'property_shares', token);
        const shareSnap = await getDoc(shareRef);
        if (!shareSnap.exists()) {
          setError('Property not found');
          setLoading(false);
          return;
        }
        const data = shareSnap.data();
        if (!data.public) {
          setError('Link expired');
          setLoading(false);
          return;
        }
        setShareData(data);
      } catch (err) {
        console.error('Error loading shared property:', err);
        setError('Failed to load property');
      } finally {
        setLoading(false);
      }
    };
    fetchShare();
  }, [db, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 text-slate-700">
          {error || 'Property not available'}
        </div>
      </div>
    );
  }

  const priceValue = shareData.price ? Number(shareData.price) : 0;
  const sizeValue = shareData.size ? Number(shareData.size) : 0;
  const currencyLabel = shareData.currency || 'EUR';
  const priceLabel = priceValue ? `${priceValue.toLocaleString()} ${currencyLabel}` : 'Price on request';
  const pricePerSqm = priceValue && sizeValue ? `${Math.round(priceValue / sizeValue).toLocaleString()} ${currencyLabel}/m2` : '';
  const amenities = Array.isArray(shareData.amenities)
    ? shareData.amenities.filter(Boolean)
    : typeof shareData.amenities === 'string'
      ? shareData.amenities.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

  const detailItems = [
    { label: 'Property Type', value: shareData.type },
    { label: 'Status', value: shareData.status },
    { label: 'Total Size', value: sizeValue ? `${sizeValue} m2` : '' },
    { label: 'Buildable Area', value: shareData.buildableArea ? `${shareData.buildableArea} m2` : '' },
    { label: 'Bedrooms', value: shareData.bedrooms ? shareData.bedrooms : '' },
    { label: 'Bathrooms', value: shareData.bathrooms ? shareData.bathrooms : '' },
    { label: 'Year Built', value: shareData.yearBuilt ? shareData.yearBuilt : '' },
    { label: 'Zoning', value: shareData.zoning },
    { label: 'Terrain', value: shareData.terrain }
  ].filter((item) => item.value !== undefined && item.value !== null && String(item.value).length > 0);
  const hasDetails = detailItems.length > 0;

  return (
    <div
      className="min-h-screen text-slate-900"
      style={{
        fontFamily: '"Manrope", "Helvetica Neue", sans-serif',
        background:
          'radial-gradient(circle at 10% 10%, rgba(255,255,255,0.85) 0%, rgba(248,244,236,0.92) 35%, rgba(236,245,244,0.9) 100%)'
      }}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-8 lg:py-12">
        <section className="relative rounded-[32px] overflow-hidden shadow-[0_45px_80px_-60px_rgba(15,23,42,0.6)] bg-slate-200">
          <div className="relative h-[320px] sm:h-[420px] lg:h-[520px]">
            {activeImage ? (
              <img src={activeImage} alt={shareData.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">No image available</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-10 text-white">
              <div className="text-[11px] uppercase tracking-[0.35em] text-emerald-200">Private luxury villa</div>
              <h1
                className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold"
                style={{ fontFamily: '"Playfair Display", "Georgia", serif' }}
              >
                {shareData.title || 'Property'}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-100">{shareData.location || 'Location available on request'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {shareData.type ? (
                  <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs uppercase tracking-widest">
                    {shareData.type}
                  </span>
                ) : null}
                {shareData.status ? (
                  <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs uppercase tracking-widest">
                    {shareData.status}
                  </span>
                ) : null}
                {sizeValue ? (
                  <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs uppercase tracking-widest">
                    {sizeValue} m2
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="lg:absolute lg:top-6 lg:right-6 w-full lg:w-auto bg-white/95 backdrop-blur border border-white/80 rounded-2xl px-5 py-4 text-slate-900 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]">
            <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-700">Asking price</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{priceLabel}</div>
            {pricePerSqm ? <div className="mt-1 text-xs text-slate-500">{pricePerSqm}</div> : null}
          </div>
        </section>

        {images.length > 1 && (
          <section className="mt-6">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Gallery</div>
            <div className="mt-3 -mx-2 flex gap-2 overflow-x-auto pb-2 px-2 sm:mx-0 sm:px-0">
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`h-16 w-24 sm:h-20 sm:w-28 rounded-2xl overflow-hidden border transition ${
                    idx === activeIndex ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-white/70 hover:border-emerald-300'
                  }`}
                >
                  <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <section className="space-y-6">
            <div className="rounded-[26px] border border-white/80 bg-white/90 p-5 sm:p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.35)]">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Signature details</div>
              {hasDetails ? (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {detailItems.map((item) => (
                    <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-widest text-slate-400">{item.label}</div>
                      <div className="mt-1 font-semibold text-slate-800">{item.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Property details are being prepared.
                </div>
              )}
            </div>

            {shareData.description ? (
              <div className="rounded-[26px] border border-white/80 bg-white/90 p-5 sm:p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.35)]">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">About the villa</div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                  {shareData.description}
                </p>
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            {amenities.length > 0 ? (
              <div className="rounded-[26px] border border-white/80 bg-white/90 p-5 sm:p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.35)]">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Lifestyle amenities</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {amenities.map((amenity) => (
                    <span key={amenity} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[26px] bg-slate-900 px-6 py-6 text-white shadow-[0_30px_70px_-50px_rgba(15,23,42,0.6)]">
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">Private viewing</div>
              <div className="mt-3 text-sm text-slate-100">
                Schedule a private viewing or request the full brochure via your concierge.
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-widest text-emerald-200">
                By appointment only
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PropertyShare;
