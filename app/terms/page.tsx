import Link from "next/link";

export const metadata = { title: "Пользовательское соглашение" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A0C12] px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← На главную
        </Link>

        <h1 className="mb-2 text-xl font-bold text-white">Пользовательское соглашение</h1>
        <p className="mb-8 text-xs text-zinc-500">Редакция от 28 мая 2025 г.</p>

        <div className="space-y-6 text-sm leading-relaxed text-zinc-300">
          <section>
            <h2 className="mb-2 font-semibold text-white">1. Общие положения</h2>
            <p>
              Настоящее Пользовательское соглашение (далее — Соглашение) регулирует отношения между
              администрацией платформы Crypto Platform (далее — Платформа) и физическим лицом,
              получившим доступ к Платформе (далее — Пользователь).
            </p>
            <p className="mt-2">
              Использование Платформы означает полное и безоговорочное принятие условий настоящего
              Соглашения. Если Пользователь не согласен с условиями, он обязан прекратить
              использование Платформы.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white">2. Доступ к Платформе</h2>
            <p>
              Платформа является закрытым сервисом. Регистрация возможна только по персональному
              пригласительному коду, выданному администратором. Пользователь обязуется не передавать
              свои учётные данные третьим лицам.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white">3. Информационный характер материалов</h2>
            <p>
              Все аналитические материалы, сигналы и прогнозы, размещённые на Платформе, носят
              исключительно информационный характер и не являются индивидуальными инвестиционными
              рекомендациями. Администрация не несёт ответственности за результаты торговых решений,
              принятых Пользователем на основе материалов Платформы.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white">4. Правила использования</h2>
            <p>Пользователю запрещается:</p>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-zinc-400">
              <li>распространять материалы Платформы без письменного согласия администрации;</li>
              <li>предпринимать действия, направленные на нарушение работоспособности Платформы;</li>
              <li>использовать Платформу в противоправных целях.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white">5. Ограничение ответственности</h2>
            <p>
              Платформа предоставляется «как есть». Администрация не гарантирует бесперебойную работу
              сервиса и не несёт ответственности за прямые или косвенные убытки Пользователя,
              возникшие в связи с использованием или невозможностью использования Платформы.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white">6. Обработка персональных данных</h2>
            <p>
              Порядок обработки персональных данных описан в{" "}
              <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                Политике конфиденциальности
              </Link>
              , которая является неотъемлемой частью настоящего Соглашения.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white">7. Изменение условий</h2>
            <p>
              Администрация вправе в одностороннем порядке изменять условия настоящего Соглашения.
              Продолжение использования Платформы после публикации изменений означает принятие
              новой редакции Соглашения.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white">8. Применимое право</h2>
            <p>
              Настоящее Соглашение регулируется законодательством Российской Федерации.
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-zinc-800 pt-6 text-center">
          <Link href="/privacy" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Политика конфиденциальности →
          </Link>
        </div>
      </div>
    </div>
  );
}
