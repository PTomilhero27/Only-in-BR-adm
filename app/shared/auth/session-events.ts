const SESSION_EXPIRED_EVENT = "app:session-expired";

type SessionExpiredDetail = {
  reason: "unauthorized";
};

let sessionExpiredNotified = false;

export function emitSessionExpired(detail: SessionExpiredDetail) {
  if (typeof window === "undefined") return;
  if (sessionExpiredNotified) return;

  sessionExpiredNotified = true;

  window.dispatchEvent(
    new CustomEvent<SessionExpiredDetail>(SESSION_EXPIRED_EVENT, {
      detail,
    })
  );
}

export function onSessionExpired(
  listener: (detail: SessionExpiredDetail) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<SessionExpiredDetail>;
    listener(customEvent.detail);
  };

  window.addEventListener(SESSION_EXPIRED_EVENT, handler);

  return () => {
    window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  };
}

export function resetSessionExpiredFlag() {
  sessionExpiredNotified = false;
}
