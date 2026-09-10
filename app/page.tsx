"use client";

import { useEffect, useRef, useState } from "react";

type View = { x: number; y: number; zoom: number };
type ComponentKind = "header" | "footer" | "footer-menu";
type MenuIcon = "home" | "search" | "user" | "heart" | "plus";
type MenuItem = { label: string; icon: MenuIcon; action: string };
type Connector = { kind: ComponentKind; x1: number; y1: number; x2: number; y2: number };
type NodePosition = { x: number; y: number };

const COMPONENTS: { kind: ComponentKind; title: string; description: string }[] = [
  { kind: "header", title: "Header", description: "App bar with actions" },
  { kind: "footer", title: "Footer", description: "Footer content area" },
  { kind: "footer-menu", title: "Footer menu", description: "Bottom navigation" },
];

const INITIAL_MENU_ITEMS: MenuItem[] = [
  { label: "Home", icon: "home", action: "Open home" },
  { label: "Explore", icon: "search", action: "Open search" },
  { label: "Profile", icon: "user", action: "Open profile" },
  { label: "Saved", icon: "heart", action: "Open saved" },
  { label: "Create", icon: "plus", action: "Create item" },
];

export default function Home() {
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(false);
  const [platform, setPlatform] = useState<"android" | "website">("website");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [previewZoom, setPreviewZoom] = useState(1.4);
  const [screenComponents, setScreenComponents] = useState<ComponentKind[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [headerTitle, setHeaderTitle] = useState("My app");
  const [headerAction, setHeaderAction] = useState("Open settings");
  const [footerText, setFooterText] = useState("© 2026 My app");
  const [footerAction, setFooterAction] = useState("Open privacy");
  const [menuCount, setMenuCount] = useState(3);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [activeMenu, setActiveMenu] = useState(0);
  const [lastAction, setLastAction] = useState("");
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [nodePositions, setNodePositions] = useState<Partial<Record<ComponentKind, NodePosition>>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerX: number; pointerY: number; viewX: number; viewY: number } | null>(null);
  const nodeDrag = useRef<{ kind: ComponentKind; pointerX: number; pointerY: number; originX: number; originY: number; width: number; height: number } | null>(null);
  const componentRefs = useRef<Partial<Record<ComponentKind, HTMLElement | null>>>({});
  const configRefs = useRef<Partial<Record<ComponentKind, HTMLDivElement | null>>>({});

  useEffect(() => {
    const updateConnectors = () => {
      setConnectors(screenComponents.flatMap((kind) => {
        const component = componentRefs.current[kind]?.getBoundingClientRect();
        const config = configRefs.current[kind]?.getBoundingClientRect();
        if (!component || !config) return [];
        return [{ kind, x1: component.right, y1: component.top + component.height / 2, x2: config.left, y2: config.top + 28 }];
      }));
    };
    const frame = requestAnimationFrame(updateConnectors);
    const settled = window.setTimeout(updateConnectors, 300);
    window.addEventListener("resize", updateConnectors);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(settled); window.removeEventListener("resize", updateConnectors); };
  }, [screenComponents, orientation, previewZoom, menuCount, nodePositions]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      viewX: view.x,
      viewY: view.y,
    };
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;

    setView((current) => ({
      ...current,
      x: drag.current!.viewX + event.clientX - drag.current!.pointerX,
      y: drag.current!.viewY + event.clientY - drag.current!.pointerY,
    }));
  };

  const stopDragging = () => {
    drag.current = null;
    setDragging(false);
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!canvasRef.current) return;

    const bounds = canvasRef.current.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;

    setView((current) => {
      const zoom = Math.min(2.5, Math.max(0.25, current.zoom * Math.exp(-event.deltaY * 0.0015)));
      const ratio = zoom / current.zoom;

      return {
        zoom,
        x: pointerX - (pointerX - current.x) * ratio,
        y: pointerY - (pointerY - current.y) * ratio,
      };
    });
  };

  const addScreenComponent = (kind: ComponentKind) => {
    setScreenComponents((current) => current.includes(kind) ? current : [...current, kind]);
  };

  const runAction = (action: string) => {
    setLastAction(action);
    window.setTimeout(() => setLastAction(""), 1600);
  };

  const updateMenuItem = (index: number, patch: Partial<MenuItem>) => {
    setMenuItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const startNodeDrag = (event: React.PointerEvent<HTMLDivElement>, kind: ComponentKind) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const node = configRefs.current[kind];
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    nodeDrag.current = {
      kind,
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: bounds.left,
      originY: bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
    setNodePositions((positions) => ({ ...positions, [kind]: { x: bounds.left, y: bounds.top } }));
  };

  const moveNode = (event: React.PointerEvent<HTMLDivElement>) => {
    const moving = nodeDrag.current;
    if (!moving) return;
    const x = Math.min(window.innerWidth - moving.width - 10, Math.max(274, moving.originX + event.clientX - moving.pointerX));
    const y = Math.min(window.innerHeight - moving.height - 10, Math.max(10, moving.originY + event.clientY - moving.pointerY));
    setNodePositions((positions) => ({ ...positions, [moving.kind]: { x, y } }));
  };

  const stopNodeDrag = () => { nodeDrag.current = null; };

  const nodeStyle = (kind: ComponentKind) => nodePositions[kind]
    ? { left: nodePositions[kind]!.x, top: nodePositions[kind]!.y, right: "auto" }
    : undefined;

  return (
    <main
      ref={canvasRef}
      className={`canvas ${dragging ? "dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onWheel={onWheel}
      style={{
        backgroundPosition: `${view.x}px ${view.y}px`,
        backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`,
      }}
    >
      <div className="platform-switch" onPointerDown={(event) => event.stopPropagation()}>
        <button
          className={platform === "android" ? "active" : ""}
          onClick={() => setPlatform("android")}
          aria-pressed={platform === "android"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 9h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" />
            <path d="m8 6-1.5-2M16 6l1.5-2M7 9a5 5 0 0 1 10 0M8.5 13h.01M15.5 13h.01M8 19v2M16 19v2M3 11v5M21 11v5" />
          </svg>
          Android
        </button>
        <button
          className={platform === "website" ? "active" : ""}
          onClick={() => setPlatform("website")}
          aria-pressed={platform === "website"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
          Website
        </button>
      </div>
      {platform === "android" && (
        <>
          <aside className="android-sidebar" onPointerDown={(event) => event.stopPropagation()}>
            <div className="sidebar-title">
              <span className="android-badge">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 9h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" />
                  <path d="m8 6-1.5-2M16 6l1.5-2M7 9a5 5 0 0 1 10 0M8 19v2M16 19v2" />
                </svg>
              </span>
              <div><strong>Android preview</strong><small>Device settings</small></div>
            </div>

            <section className="component-library">
              <label>Components</label>
              <p>Drag a component onto the screen</p>
              <div className="component-list">
                {COMPONENTS.map((component) => (
                  <button
                    key={component.kind}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-ui-component", component.kind);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => addScreenComponent(component.kind)}
                  >
                    <span className={`component-glyph ${component.kind}`}>
                      {component.kind === "footer-menu" && <><i/><i/><i/></>}
                    </span>
                    <span><strong>{component.title}</strong><small>{component.description}</small></span>
                    <b>⠿</b>
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-group">
              <label>Device</label>
              <button className="device-select">Pixel 9 Pro <span>⌄</span></button>
            </section>

            <section className="settings-group">
              <label>Orientation</label>
              <div className="orientation-switch">
                <button className={orientation === "portrait" ? "active" : ""} onClick={() => setOrientation("portrait")}>
                  <span className="portrait-icon" /> Portrait
                </button>
                <button className={orientation === "landscape" ? "active" : ""} onClick={() => setOrientation("landscape")}>
                  <span className="landscape-icon" /> Landscape
                </button>
              </div>
            </section>

            <section className="settings-group dimensions">
              <label>Viewport</label>
              <div><span>Width</span><output>{orientation === "portrait" ? "412" : "915"} px</output></div>
              <div><span>Height</span><output>{orientation === "portrait" ? "915" : "412"} px</output></div>
            </section>

            <section className="settings-group">
              <label>Preview zoom</label>
              <div className="zoom-control">
                <button onClick={() => setPreviewZoom((zoom) => Math.max(0.4, zoom - 0.1))} aria-label="Zoom out">−</button>
                <output>{Math.round(previewZoom * 100)}%</output>
                <button onClick={() => setPreviewZoom((zoom) => Math.min(1.5, zoom + 0.1))} aria-label="Zoom in">+</button>
              </div>
            </section>

            <div className="sidebar-bottom">
              <span className="live-dot" /> Preview connected
            </div>
          </aside>

          {screenComponents.length > 0 && (
            <>
              <svg className="node-connections" aria-hidden="true">
                {connectors.map((line) => {
                  const bend = Math.max(45, (line.x2 - line.x1) * 0.45);
                  return (
                    <g key={line.kind}>
                      <path className="connection-base" d={`M ${line.x1} ${line.y1} C ${line.x1 + bend} ${line.y1}, ${line.x2 - bend} ${line.y2}, ${line.x2} ${line.y2}`} />
                      <path className="connection-flow" d={`M ${line.x1} ${line.y1} C ${line.x1 + bend} ${line.y1}, ${line.x2 - bend} ${line.y2}, ${line.x2} ${line.y2}`} />
                    </g>
                  );
                })}
              </svg>
              <div className="config-nodes" onPointerDown={(event) => event.stopPropagation()}>
                {screenComponents.includes("header") && (
                  <div className="config-node header-config" style={nodeStyle("header")} ref={(element) => { configRefs.current.header = element; }}>
                    <div className="config-title" onPointerDown={(event) => startNodeDrag(event, "header")} onPointerMove={moveNode} onPointerUp={stopNodeDrag} onPointerCancel={stopNodeDrag}><span className="node-port"/><strong>Header</strong><small>CONTENT & ACTION</small><span className="drag-grip">⠿</span></div>
                    <label>Title<input value={headerTitle} onChange={(event) => setHeaderTitle(event.target.value)} /></label>
                    <label>Action
                      <select value={headerAction} onChange={(event) => setHeaderAction(event.target.value)}>
                        <option>Open settings</option><option>Open search</option><option>Open profile</option><option>No action</option>
                      </select>
                    </label>
                  </div>
                )}

                {screenComponents.includes("footer") && (
                  <div className="config-node footer-config" style={nodeStyle("footer")} ref={(element) => { configRefs.current.footer = element; }}>
                    <div className="config-title" onPointerDown={(event) => startNodeDrag(event, "footer")} onPointerMove={moveNode} onPointerUp={stopNodeDrag} onPointerCancel={stopNodeDrag}><span className="node-port"/><strong>Footer</strong><small>CONTENT & ACTION</small><span className="drag-grip">⠿</span></div>
                    <label>Text<input value={footerText} onChange={(event) => setFooterText(event.target.value)} /></label>
                    <label>Link action
                      <select value={footerAction} onChange={(event) => setFooterAction(event.target.value)}>
                        <option>Open privacy</option><option>Open website</option><option>Send email</option><option>No action</option>
                      </select>
                    </label>
                  </div>
                )}

                {screenComponents.includes("footer-menu") && (
                  <div className="config-node menu-config" style={nodeStyle("footer-menu")} ref={(element) => { configRefs.current["footer-menu"] = element; }}>
                    <div className="config-title" onPointerDown={(event) => startNodeDrag(event, "footer-menu")} onPointerMove={moveNode} onPointerUp={stopNodeDrag} onPointerCancel={stopNodeDrag}><span className="node-port"/><strong>Footer menu</strong><small>NAVIGATION</small><span className="drag-grip">⠿</span></div>
                    <div className="menu-count"><span>Menu items</span><div><button onClick={() => setMenuCount((count) => Math.max(2, count - 1))}>-</button><output>{menuCount}</output><button onClick={() => setMenuCount((count) => Math.min(5, count + 1))}>+</button></div></div>
                    <div className="menu-editor">
                      {menuItems.slice(0, menuCount).map((item, index) => (
                        <div className="menu-editor-row" key={index}>
                          <span>{index + 1}</span>
                          <input value={item.label} onChange={(event) => updateMenuItem(index, { label: event.target.value })} aria-label={`Item ${index + 1} label`} />
                          <select value={item.icon} onChange={(event) => updateMenuItem(index, { icon: event.target.value as MenuIcon })} aria-label={`Item ${index + 1} icon`}>
                            <option value="home">Home icon</option><option value="search">Search icon</option><option value="user">User icon</option><option value="heart">Heart icon</option><option value="plus">Plus icon</option>
                          </select>
                          <select value={item.action} onChange={(event) => updateMenuItem(index, { action: event.target.value })} aria-label={`Item ${index + 1} action`}>
                            <option>Open home</option><option>Open search</option><option>Open profile</option><option>Open saved</option><option>Create item</option><option>No action</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <section className={`phone-stage ${orientation} ${screenComponents.length ? "with-config" : ""}`} aria-label="Android device preview">
            <div
              className="phone-frame"
              style={{ transform: `scale(${previewZoom})` }}
              onPointerDown={(event) => event.stopPropagation()}
              onDoubleClick={() => setPreviewZoom(1.4)}
              onWheel={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setPreviewZoom((zoom) => Math.min(1.5, Math.max(0.4, zoom * Math.exp(-event.deltaY * 0.0015))));
              }}
            >
              <div
                className={`phone-screen ${dropActive ? "drop-active" : ""}`}
                onDragEnter={(event) => { event.preventDefault(); setDropActive(true); }}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropActive(false);
                  const kind = event.dataTransfer.getData("application/x-ui-component") as ComponentKind;
                  if (COMPONENTS.some((component) => component.kind === kind)) addScreenComponent(kind);
                }}
              >
                <div className="phone-status">
                  <span>9:41</span>
                  <div>
                    <svg viewBox="0 0 18 12"><path d="M1 9h2V7H1v2Zm4 0h2V5H5v4Zm4 0h2V3H9v6Zm4 0h2V1h-2v8Z" /></svg>
                    <svg viewBox="0 0 18 12"><path d="M1 4.5C5.5.7 12.5.7 17 4.5M4 7c3-2.4 7-2.4 10 0M7 9.5c1.2-.9 2.8-.9 4 0" /></svg>
                    <span className="battery"><i /></span>
                  </div>
                </div>
                <div className="phone-empty">
                  {screenComponents.length === 0 && (
                    <div className="screen-placeholder"><span>+</span><p>Drop components here</p></div>
                  )}
                  {screenComponents.includes("header") && (
                    <div className="ui-header" ref={(element) => { componentRefs.current.header = element; }}>
                      <div className="ui-brand"><span /> {headerTitle || "Untitled"}</div>
                      <button onClick={() => runAction(headerAction)} aria-label={headerAction}>•••</button>
                    </div>
                  )}
                  {screenComponents.includes("footer") && (
                    <div className={`ui-footer ${screenComponents.includes("footer-menu") ? "with-menu" : ""}`} ref={(element) => { componentRefs.current.footer = element; }}>
                      <span>{footerText || "Footer"}</span><button onClick={() => runAction(footerAction)}>Privacy</button>
                    </div>
                  )}
                  {screenComponents.includes("footer-menu") && (
                    <nav className="ui-footer-menu" style={{ gridTemplateColumns: `repeat(${menuCount}, 1fr)` }} ref={(element) => { componentRefs.current["footer-menu"] = element; }}>
                      {menuItems.slice(0, menuCount).map((item, index) => (
                        <button key={index} className={activeMenu === index ? "active" : ""} onClick={() => { setActiveMenu(index); runAction(item.action); }}>
                          <i className={`${item.icon}-icon`}/><span>{item.label || `Item ${index + 1}`}</span>
                        </button>
                      ))}
                    </nav>
                  )}
                  {dropActive && <div className="drop-message">Drop to add</div>}
                  {lastAction && <div className="action-toast">{lastAction}</div>}
                </div>
                <div className="gesture-bar" />
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
