import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Calendar,
  Calculator,
  Check,
  Database,
  FolderKanban,
  ShieldCheck,
  Snowflake,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { RjmLogo } from '../ui/RjmLogo';

interface LoginExperienceProps {
  onSignIn: () => void;
}

const MODULES = [
  { label: 'Proyek & tugas', icon: FolderKanban },
  { label: 'Kalender', icon: Calendar },
  { label: 'Material', icon: Calculator },
  { label: 'Heat load', icon: Snowflake },
  { label: 'Database produk', icon: Database },
];

const WORKFLOW = [
  {
    title: 'Buka konteks proyek lebih cepat',
    body: 'Status, lokasi, tugas drafting, dan riwayat pekerjaan berada di satu alur yang dapat dipindai dalam hitungan detik.',
    image: '/images/refrigeration-drafting-desk.webp',
    alt: 'Meja drafting dengan gambar sistem refrigerasi, alat ukur, dan komponen kompresor',
  },
  {
    title: 'Hitung tanpa kehilangan jejak',
    body: 'Estimasi material dan heat load tetap dekat dengan proyek, sehingga keputusan teknis tidak terpisah dari pekerjaan lapangan.',
    image: '/images/cold-room-panel-joint.webp',
    alt: 'Detail sambungan panel insulated cold room dan mekanisme pengunci',
  },
  {
    title: 'Jaga akses tetap terkendali',
    body: 'Google sign-in, peran pengguna, dan izin tiap modul mempertahankan batas kerja yang sudah digunakan tim RJM.',
    image: '/images/refrigeration-drafting-desk.webp',
    alt: 'Gambar kerja cold room dan sistem refrigerasi di meja engineering',
  },
];

export const LoginExperience: React.FC<LoginExperienceProps> = ({ onSignIn }) => {
  const reduceMotion = useReducedMotion();
  const framedPreview = window.self !== window.top;
  const visibleModules = reduceMotion ? MODULES : [...MODULES, ...MODULES];

  return (
    <div className="login-world min-h-dvh bg-base text-primary">
      <a className="skip-link" href="#main-content">Lewati ke konten utama</a>

      <header className="sticky top-0 z-30 border-b border-divider bg-surface-elevated/95">
        <div className="mx-auto flex h-20 max-w-[1536px] items-center justify-between gap-6 px-4 sm:px-6 xl:px-8">
          <RjmLogo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-secondary md:flex" aria-label="Navigasi halaman masuk">
            <a className="transition-colors hover:text-primary" href="#kapabilitas">Kapabilitas</a>
            <a className="transition-colors hover:text-primary" href="#alur-kerja">Alur kerja</a>
            <a className="transition-colors hover:text-primary" href="#akses">Akses</a>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1536px] grid-cols-1 items-stretch lg:grid-cols-12" aria-labelledby="login-heading">
          <div className="flex flex-col justify-between px-5 py-10 sm:px-8 sm:py-14 lg:col-span-7 lg:px-12 lg:py-16 xl:px-16">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-4xl"
            >
              <p className="mb-7 max-w-xl text-sm font-medium leading-6 text-secondary">
                Workspace engineering dan drafting PT Rokindo Jaya Mandiri
              </p>
              <h1 id="login-heading" className="max-w-[13ch] text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.94] tracking-[-0.04em] text-primary">
                Kendalikan detail.
                <span className="mt-2 block">
                  Jaga{' '}
                  <span
                    className="inline-block h-[0.72em] w-[1.55em] translate-y-[0.04em] rounded-[0.16em] bg-cover bg-center align-middle"
                    style={{ backgroundImage: "url('/images/cold-room-panel-joint.webp')" }}
                    role="img"
                    aria-label="Detail sambungan panel cold room"
                  />{' '}
                  proyek bergerak.
                </span>
              </h1>
              <p className="mt-7 max-w-[60ch] text-base leading-7 text-secondary sm:text-lg">
                Hubungkan proyek, jadwal, material, dan perhitungan cold room dalam satu alur kerja yang jelas.
              </p>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 max-w-xl border-t border-divider pt-7"
            >
              <Button onClick={onSignIn} size="lg" className="group w-full justify-between px-5 text-base sm:w-auto sm:min-w-72">
                <span className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white font-semibold text-slate-800">G</span>
                  Masuk dengan Google
                </span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Button>
              <div className="mt-5 flex items-start gap-3 text-sm leading-6 text-secondary">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent-600)]" aria-hidden="true" />
                <p>Akses hanya untuk akun yang telah didaftarkan oleh administrator RJM.</p>
              </div>
              {framedPreview && (
                <div className="mt-5 border-l border-amber-500 px-4 py-1 text-xs leading-5 text-amber-800 dark:text-amber-300" role="note">
                  Login Google perlu dibuka melalui tab baru karena preview ini berjalan di dalam iframe.
                </div>
              )}
            </motion.div>
          </div>

          <motion.figure
            initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative min-h-[28rem] overflow-hidden border-t border-divider lg:col-span-5 lg:min-h-full lg:border-l lg:border-t-0"
          >
            <img
              src="/images/cold-room-panel-joint.webp"
              alt="Sambungan panel insulated cold room dengan mekanisme pengunci galvanis"
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
            />
            <figcaption className="absolute inset-x-0 bottom-0 border-t border-white/65 bg-white/90 px-6 py-5 text-sm font-medium text-slate-700 sm:px-8">
              Detail material yang tepat memudahkan keputusan di lapangan.
            </figcaption>
          </motion.figure>
        </section>

        <section id="kapabilitas" className="border-y border-divider bg-surface-elevated py-20 sm:py-28">
          <div className="mx-auto max-w-[1536px] px-4 sm:px-6 xl:px-8">
            <div className="max-w-3xl">
              <h2 className="text-[clamp(2rem,4vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-primary">
                Satu ruang kerja untuk pekerjaan yang saling bergantung.
              </h2>
              <p className="mt-5 max-w-[62ch] text-base leading-7 text-secondary">
                Data proyek, tugas drafting, agenda, perhitungan, dan referensi produk tetap dekat tanpa menambah langkah yang tidak perlu.
              </p>
            </div>

            <div className="mt-12 grid grid-flow-dense grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-divider bg-divider lg:grid-cols-12 lg:grid-rows-2">
              <article className="group relative min-h-[30rem] overflow-hidden bg-slate-900 lg:col-span-7 lg:row-span-2">
                <img
                  src="/images/refrigeration-drafting-desk.webp"
                  alt="Gambar sistem refrigerasi dan alat ukur pada meja drafting"
                  className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-[1.025]"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-slate-950/82 p-7 text-white sm:p-9">
                  <h3 className="max-w-lg text-2xl font-semibold tracking-[-0.025em]">Konteks engineering tetap terlihat.</h3>
                  <p className="mt-3 max-w-[52ch] text-sm leading-6 text-slate-200">
                    Informasi teknis dan progres proyek dapat dipahami bersama, bukan tersebar di banyak catatan.
                  </p>
                </div>
              </article>
              <article className="flex min-h-60 flex-col justify-between bg-surface-elevated p-7 lg:col-span-5 lg:row-span-1 sm:p-9">
                <FolderKanban className="h-7 w-7 text-[var(--color-accent-600)]" aria-hidden="true" />
                <div className="mt-14">
                  <h3 className="text-xl font-semibold tracking-[-0.02em]">Proyek dan tugas bergerak bersama</h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">Status, aktivitas, dokumen, dan detail lokasi mengikuti konteks proyek.</p>
                </div>
              </article>
              <article className="flex min-h-60 flex-col justify-between bg-[var(--color-accent-50)] p-7 lg:col-span-5 lg:row-span-1 sm:p-9">
                <Calculator className="h-7 w-7 text-[var(--color-accent-700)]" aria-hidden="true" />
                <div className="mt-14">
                  <h3 className="text-xl font-semibold tracking-[-0.02em]">Perhitungan siap dipakai</h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">Material dan heat load memiliki ruang kerja yang terstruktur dan dapat ditinjau ulang.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b border-divider bg-base py-4" aria-label="Modul yang tersedia">
          <div className={reduceMotion ? 'flex justify-center' : 'module-marquee'}>
            <div className="flex min-w-max items-center gap-3 px-3">
              {visibleModules.map((module, index) => (
                <div key={`${module.label}-${index}`} className="flex h-12 items-center gap-2.5 rounded-full border border-divider bg-surface-elevated px-5 text-sm font-semibold text-secondary">
                  <module.icon size={17} className="text-[var(--color-accent-600)]" aria-hidden="true" />
                  {module.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="alur-kerja" className="bg-base py-20 sm:py-28">
          <div className="mx-auto max-w-[1536px] px-4 sm:px-6 xl:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
              <div className="lg:sticky lg:top-28 lg:col-span-4">
                <h2 className="text-[clamp(2rem,4vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-primary">
                  Alur yang mengikuti pekerjaan nyata.
                </h2>
                <p className="mt-5 max-w-[46ch] text-base leading-7 text-secondary">
                  Setiap tahap menjawab pertanyaan kerja yang berbeda, tanpa mengubah cara tim menyimpan data dan memberi izin.
                </p>
                <div className="mt-8 flex items-center gap-2 text-sm font-medium text-secondary">
                  <Check className="h-4 w-4 text-[var(--color-accent-600)]" aria-hidden="true" />
                  Business logic dan Firebase tetap dipertahankan
                </div>
              </div>

              <div className="space-y-6 lg:col-span-8">
                {WORKFLOW.map((step, index) => (
                  <motion.article
                    key={step.title}
                    initial={reduceMotion ? false : { opacity: 0.35, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden rounded-[var(--radius-panel)] border border-divider bg-surface-elevated lg:sticky"
                    style={{ top: `${7 + index * 1.5}rem` }}
                  >
                    <div className="grid min-h-[32rem] grid-cols-1 md:grid-cols-[0.92fr_1.08fr]">
                      <div className="flex flex-col justify-between p-7 sm:p-9">
                        <span className="data-value text-sm text-muted">0{index + 1}</span>
                        <div className="mt-20">
                          <h3 className="max-w-sm text-2xl font-semibold tracking-[-0.025em] text-primary sm:text-3xl">{step.title}</h3>
                          <p className="mt-4 max-w-[48ch] text-sm leading-6 text-secondary sm:text-base sm:leading-7">{step.body}</p>
                        </div>
                      </div>
                      <img src={step.image} alt={step.alt} className="h-full min-h-72 w-full object-cover" loading="lazy" />
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-divider bg-surface-elevated py-20 sm:py-28" aria-labelledby="tools-heading">
          <div className="mx-auto max-w-[1536px] px-4 sm:px-6 xl:px-8">
            <h2 id="tools-heading" className="max-w-3xl text-[clamp(2rem,4vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-primary">
              Pilih konteks, lalu fokus pada pekerjaan.
            </h2>
            <div className="mt-12 flex flex-col gap-3 lg:h-[32rem] lg:flex-row">
              {[
                { title: 'Kontrol proyek', body: 'Status, tugas, dokumen, dan riwayat perubahan.', image: '/images/refrigeration-drafting-desk.webp' },
                { title: 'Engineering tools', body: 'Material, heat load, dan referensi produk.', image: '/images/cold-room-panel-joint.webp' },
                { title: 'Jadwal tim', body: 'Agenda survey, target, dan tenggat pekerjaan.', image: '/images/refrigeration-drafting-desk.webp' },
              ].map((tool) => (
                <article key={tool.title} className="group relative min-h-64 overflow-hidden rounded-[var(--radius-panel)] border border-divider bg-slate-900 transition-[flex] duration-700 ease-out lg:min-h-0 lg:flex-[1_1_0%] lg:hover:flex-[1.7_1_0%]">
                  <img src={tool.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-[1.035]" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 bg-slate-950/82 p-6 text-white sm:p-8">
                    <h3 className="text-xl font-semibold">{tool.title}</h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-200">{tool.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="akses" className="bg-base py-20 sm:py-28">
          <div className="mx-auto grid max-w-[1536px] gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:items-end xl:px-8">
            <div className="lg:col-span-8">
              <h2 className="max-w-3xl text-[clamp(2.4rem,5vw,5rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-primary">
                Siap kembali ke pekerjaan tim.
              </h2>
              <p className="mt-5 max-w-[58ch] text-base leading-7 text-secondary">
                Gunakan akun Google yang sudah terdaftar. Hak akses mengikuti peran yang ditetapkan administrator.
              </p>
            </div>
            <div className="border-t border-divider pt-6 lg:col-span-4">
              <p className="text-sm leading-6 text-secondary">
                Jika akun belum terdaftar, hubungi administrator internal RJM untuk mendapatkan akses.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-divider bg-surface-elevated">
        <div className="mx-auto flex max-w-[1536px] flex-col gap-3 px-4 py-7 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 xl:px-8">
          <span>PT Rokindo Jaya Mandiri</span>
          <span>Drafter Tracker untuk penggunaan internal</span>
        </div>
      </footer>
    </div>
  );
};
