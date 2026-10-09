"use client"

import { track } from "@/lib/analytics"
import { shareUrl, whatsappUrl } from "@/lib/share"
import { Progression } from "@/types"

/** After making a progression public: its link (already copied if the browser allowed it) and a WhatsApp button. */
export default function ShareNotice({ progression, copied }: { progression: Progression; copied: boolean }) {
  return (
    <div role="status" className="mt-4 flex flex-col gap-2 rounded-lg border border-fn-tonic/30 bg-fn-tonic/10 p-3 text-sm">
      <p className="break-all">
        {copied ? "Enlace copiado: " : "Comparte este enlace: "}
        <a href={shareUrl(progression)} className="font-semibold underline">
          {shareUrl(progression)}
        </a>
      </p>
      <a
        href={whatsappUrl(progression)}
        target="_blank"
        rel="noreferrer"
        onClick={() => track("share", { method: "whatsapp" })}
        className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md bg-[#1f7a4d] px-4 font-bold text-white hover:bg-[#17603c]"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
        </svg>
        Enviar por WhatsApp
      </a>
    </div>
  )
}
