import "@testing-library/jest-dom";
import "../i18n/config";

if (!globalThis.PointerEvent) {
    globalThis.PointerEvent = MouseEvent as typeof PointerEvent;
}
