// Çakışan periyodik işler aynı süreçte üst üste binmez. Veritabanı işlemleri ayrıca satır kilitlidir.
export function scheduleJob(name: string, everyMs: number, job: () => Promise<unknown>) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await job();
    } catch {
      console.error(`İş tamamlanamadı: ${name}`);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), everyMs);
  void tick();
  return () => clearInterval(timer);
}
