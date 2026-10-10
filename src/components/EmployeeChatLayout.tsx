"use client";

import { CandidateProfileStrip } from "@/components/CandidateProfileStrip";
import { ChatPanel, type ChatTurnPayload } from "@/components/ChatPanel";
import { FileImport } from "@/components/FileImport";
import { useTranslation } from "@/components/LocaleProvider";
import type { Locale } from "@/i18n/types";
import type { CandidateCard } from "@/domain/types";

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string };

export function EmployeeChatLayout(props: {
  userId: string;
  locale: Locale;
  chat: Msg[];
  card: CandidateCard | null | undefined;
  hasCv: boolean;
  cvPending: boolean;
  placeholder: string;
  onTurn: (payload: ChatTurnPayload) => void;
  onCvDone: () => void;
  onFlexibilityChange?: (value: number) => void;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const blockedReason = props.readOnly ? "blocked" : props.hasCv ? undefined : "blocked";

  const cvUpload = (
    <FileImport
      userId={props.userId}
      endpoint="/api/cv"
      title={t.fileImport.cvTitle}
      hint={t.fileImport.cvHint}
      variant="footer"
      compact
      minimalSummary
      cvMode
      hasExisting={props.hasCv}
      pendingAnalysis={props.cvPending}
      onDone={props.onCvDone}
    />
  );

  const cvAttach = (
    <FileImport
      userId={props.userId}
      endpoint="/api/cv"
      title={t.fileImport.cvTitle}
      hint={t.fileImport.cvHint}
      variant="attach"
      minimalSummary
      cvMode
      hasExisting={props.hasCv}
      onDone={props.onCvDone}
    />
  );

  return (
    <div className="employee-workspace enter-delay">
      <CandidateProfileStrip
        userId={props.userId}
        card={props.card}
        onFlexibilityChange={props.onFlexibilityChange}
      />

      <section className="employee-chat-main" aria-label={t.chat.title}>
        {props.cvPending && props.hasCv ? (
          <div className="hidden" aria-hidden>
            {cvUpload}
          </div>
        ) : null}
        <div className="employee-chat-main__panel">
          <ChatPanel
            key={`${props.userId}-employee`}
            userId={props.userId}
            role="employee"
            locale={props.locale}
            initialMessages={props.chat}
            placeholder={props.placeholder}
            blockedReason={blockedReason}
            onTurn={props.onTurn}
            onCvUpdated={props.onCvDone}
            composerAddon={props.readOnly ? undefined : props.hasCv && !props.cvPending ? cvAttach : undefined}
            lockedOverlay={
              props.hasCv ? undefined : (
                <div className="employee-chat-locked">
                  <div className="employee-chat-locked__icon" aria-hidden>
                    💬
                  </div>
                  <h3 className="employee-chat-locked__title">{t.employee.chatLockedTitle}</h3>
                  <p className="employee-chat-locked__body">{t.employee.chatLockedBody}</p>
                  {cvUpload}
                </div>
              )
            }
          />
        </div>
      </section>
    </div>
  );
}
