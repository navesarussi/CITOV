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

  const cvUploadDropzone = (
    <FileImport
      userId={props.userId}
      endpoint="/api/cv"
      title={t.fileImport.cvTitle}
      hint={t.fileImport.cvHint}
      variant="dropzone"
      cvMode
      hasExisting={props.hasCv}
      pendingAnalysis={props.cvPending}
      onDone={props.onCvDone}
    />
  );

  const cvSidebar = (
    <FileImport
      userId={props.userId}
      endpoint="/api/cv"
      title={t.fileImport.cvTitle}
      hint={t.fileImport.cvHint}
      variant="sidebar"
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
      <div className="employee-workspace__grid">
        <aside className="employee-sidebar" aria-label={t.profile.yourCard}>
          <CandidateProfileStrip
            userId={props.userId}
            card={props.card}
            onFlexibilityChange={props.onFlexibilityChange}
          />
          {!props.readOnly && !props.hasCv ? (
            <div className="employee-sidebar__cv hidden min-[960px]:block">{cvSidebar}</div>
          ) : null}
        </aside>

        <section className="employee-chat-main" aria-label={t.chat.title}>
          {props.cvPending && props.hasCv ? (
            <div className="hidden" aria-hidden>
              {cvUploadDropzone}
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
              blockedFooter={props.readOnly || props.hasCv ? undefined : cvUploadDropzone}
              lockedOverlay={
                props.hasCv ? undefined : (
                  <div className="employee-chat-locked">
                    <h3 className="employee-chat-locked__title">{t.employee.chatLockedTitle}</h3>
                    <p className="employee-chat-locked__body">{t.employee.chatLockedBody}</p>
                    {cvUploadDropzone}
                    <p className="employee-chat-locked__desktop-hint">{t.chat.cvRequiredEmpty}</p>
                  </div>
                )
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
