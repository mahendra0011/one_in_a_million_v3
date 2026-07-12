import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const photos = [
  { src: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 300\'%3E%3Cdefs%3E%3ClinearGradient id=\'g\' x1=\'0\' y1=\'0\' x2=\'1\' y2=\'1\'%3E%3Cstop offset=\'0%25\' stop-color=\'%23f46d22\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%23171315\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=\'url(%23g)\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'200\' y=\'140\' text-anchor=\'middle\' fill=\'white\' font-size=\'20\' font-weight=\'bold\' font-family=\'Inter, sans-serif\'%3EBig Burger Energy%3C/text%3E%3Ctext x=\'200\' y=\'175\' text-anchor=\'middle\' fill=\'rgba(255,255,255,0.8)\' font-size=\'15\' font-family=\'Inter, sans-serif\'%3EFriends & Burgers%3C/text%3E%3C/svg%3E', alt: 'Big burger energy', caption: 'Big burger energy', tall: true },
  { src: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 300\'%3E%3Cdefs%3E%3ClinearGradient id=\'g\' x1=\'0\' y1=\'0\' x2=\'1\' y2=\'1\'%3E%3Cstop offset=\'0%25\' stop-color=\'%234a2c2a\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%23ffc44d\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=\'url(%23g)\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'200\' y=\'140\' text-anchor=\'middle\' fill=\'white\' font-size=\'22\' font-weight=\'bold\' font-family=\'Inter, sans-serif\'%3EOreo Shake%3C/text%3E%3Ctext x=\'200\' y=\'175\' text-anchor=\'middle\' fill=\'rgba(255,255,255,0.8)\' font-size=\'16\' font-family=\'Inter, sans-serif\'%3ECreamy & Thick%3C/text%3E%3C/svg%3E', alt: 'Oreo shake', caption: 'Oreo shake' },
  { src: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 300\'%3E%3Cdefs%3E%3ClinearGradient id=\'g\' x1=\'0\' y1=\'0\' x2=\'1\' y2=\'1\'%3E%3Cstop offset=\'0%25\' stop-color=\'%239adf9d\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%230f7c83\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=\'url(%23g)\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'200\' y=\'140\' text-anchor=\'middle\' fill=\'white\' font-size=\'22\' font-weight=\'bold\' font-family=\'Inter, sans-serif\'%3ECrispy Bites%3C/text%3E%3Ctext x=\'200\' y=\'175\' text-anchor=\'middle\' fill=\'rgba(255,255,255,0.8)\' font-size=\'16\' font-family=\'Inter, sans-serif\'%3EGolden & Melty%3C/text%3E%3C/svg%3E', alt: 'Crispy bites', caption: 'Crispy bites' },
  { src: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 300\'%3E%3Cdefs%3E%3ClinearGradient id=\'g\' x1=\'0\' y1=\'0\' x2=\'1\' y2=\'1\'%3E%3Cstop offset=\'0%25\' stop-color=\'%23c9e9f6\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%230f7c83\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=\'url(%23g)\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'200\' y=\'140\' text-anchor=\'middle\' fill=\'white\' font-size=\'22\' font-weight=\'bold\' font-family=\'Inter, sans-serif\'%3ECoolers & Wraps%3C/text%3E%3Ctext x=\'200\' y=\'175\' text-anchor=\'middle\' fill=\'rgba(255,255,255,0.8)\' font-size=\'16\' font-family=\'Inter, sans-serif\'%3EFresh Refreshments%3C/text%3E%3C/svg%3E', alt: 'Coolers and wraps', caption: 'Coolers and wraps', wide: true },
];

export default function Gallery() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = ref.current?.querySelectorAll('.gallery-card');
      if (cards) {
        gsap.from(cards, {
          y: 40,
          opacity: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 85%',
          },
        });
      }
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="w-[min(1180px,88vw)] mx-auto mb-[90px]" id="gallery" ref={ref}>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-7 mb-6">
        <p className="text-[#F07D14] text-[0.78rem] font-black uppercase tracking-wider mb-0">From the kitchen</p>
        <h2 className="font-fredoka text-3xl sm:text-4xl lg:text-5xl leading-[0.95] max-w-[720px] text-white">
          Real One in a Million photos
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[220px] gap-3.5">
        {photos.map((photo, index) => (
          <figure
            key={index}
            className={`gallery-card relative m-0 overflow-hidden rounded-lg bg-[#1A1310] border border-white/5 ${
              photo.tall ? 'row-span-2' : ''
            } ${photo.wide ? 'col-span-2' : ''} max-md:col-auto max-md:row-auto`}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              className="w-full h-full object-cover transition-transform duration-[420ms] ease-out hover:scale-105"
            />
            <figcaption className="absolute left-3 right-3 bottom-3 px-2.5 py-2 rounded-lg text-white bg-[#0A0604]/80 text-sm font-black backdrop-blur-sm">
              {photo.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}