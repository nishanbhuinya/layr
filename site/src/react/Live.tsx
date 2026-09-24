/**
 * A live docs example: the snippet compiled in the browser and run in a real, resizable viewport,
 * with Preview and Code tabs and design-frame chips. Loads only when scrolled into view.
 */
import { ArrowSquareOut, Code as CodeIcon, Eye } from "@phosphor-icons/react/ssr";
import { useEffect, useRef, useState } from "react";
import { FrameChips, useRunner, Viewport } from "./stage.tsx";

export function Live({ code, codeHtml, playground }: { code: string; codeHtml: string; playground: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [visible, setVisible] = useState(false);
  const [room, setRoom] = useState(640);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const run = useRunner(code, visible);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisible(true), { rootMargin: "900px" });
    io.observe(el);
    const ro = new ResizeObserver(() => setRoom(Math.max(160, el.clientWidth)));
    ro.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  const error = run.compiled?.errors ? (run.compiled.diagnostics.find((d) => d.severity === "error")?.message ?? "Compile error") : run.runtimeError;

  return (
    <div className="live-box" ref={box}>
      <div className="live-bar" role="tablist" aria-label="Example">
        <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
          <Eye size={15} /> Preview
        </button>
        <button type="button" role="tab" aria-selected={tab === "code"} onClick={() => setTab("code")}>
          <CodeIcon size={15} /> Code
        </button>
        <span className="spacer" />
        {tab === "preview" ? <FrameChips stageW={room} w={w} h={h} setW={setW} setH={setH} /> : null}
        <a className="live-open" href={playground} title="Open in playground">
          <ArrowSquareOut size={15} />
          <span>Playground</span>
        </a>
      </div>
      <div hidden={tab !== "preview"}>
        <Viewport frame={run.frame} onLoad={run.onLoad} ready={run.ready} visible={visible} stageW={room} contentH={run.height} w={w} h={h} setW={setW} setH={setH} loading={!run.ran && !error}>
          {error ? <p className="live-error">{error}</p> : null}
        </Viewport>
      </div>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: build-time highlighted source */}
      <div className="live-code" hidden={tab !== "code"} dangerouslySetInnerHTML={{ __html: codeHtml }} />
    </div>
  );
}
