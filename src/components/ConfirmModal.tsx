"use client";

/**
 * Confirmation dialog for destructive actions. Nothing is ever deleted
 * without going through this.
 */
export default function ConfirmModal({
  title = "Confirm",
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="video-modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="video-modal confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3>{title}</h3>
        <p className="confirm-modal-text">{message}</p>
        <div className="video-modal-actions">
          <button type="button" className="video-modal-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="video-modal-btn primary" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
