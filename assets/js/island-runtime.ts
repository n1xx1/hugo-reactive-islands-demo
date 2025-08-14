// Based on https://github.com/withastro/astro/blob/main/packages/astro/src/runtime/server/astro-island.ts

class HugoIsland extends HTMLElement {
  public Component: any;
  public hydrator: any;
  static observedAttributes = ["props"];

  disconnectedCallback() {
    document.removeEventListener("hugo:after-swap", this.unmount);
    document.addEventListener("hugo:after-swap", this.unmount, { once: true });
  }

  connectedCallback() {
    if (
      document.readyState === "interactive" ||
      document.readyState === "complete"
    ) {
      this.childrenConnectedCallback();
    } else {
      // connectedCallback may run *before* children are rendered (ex. HTML streaming)
      // If SSR children are expected, but not yet rendered, wait with a mutation observer
      // for a special marker inserted when rendering islands that signals the end of the island
      const onConnected = () => {
        document.removeEventListener("DOMContentLoaded", onConnected);
        mo.disconnect();
        this.childrenConnectedCallback();
      };
      const mo = new MutationObserver(() => {
        if (
          this.lastChild?.nodeType === Node.COMMENT_NODE &&
          this.lastChild.nodeValue === "hugo:end"
        ) {
          this.lastChild.remove();
          onConnected();
        }
      });
      mo.observe(this, { childList: true });
      // in case the marker comment got stripped and the mutation observer waited indefinitely,
      // also wait for DOMContentLoaded as a last resort
      document.addEventListener("DOMContentLoaded", onConnected);
    }
  }

  async childrenConnectedCallback() {
    let beforeHydrationUrl = this.getAttribute("before-hydration-url");
    if (beforeHydrationUrl) {
      await import(beforeHydrationUrl);
    }
    this.start();
  }

  async start() {
    try {
      const rendererUrl = this.getAttribute("renderer-url");
      const [componentModule, { default: hydrator }] = await Promise.all([
        import(this.getAttribute("component-url")!),
        rendererUrl ? import(rendererUrl) : () => () => {},
      ]);

      const componentExport =
        this.getAttribute("component-export") || "default";
      if (!componentExport.includes(".")) {
        this.Component = componentModule[componentExport];
      } else {
        this.Component = componentModule;
        for (const part of componentExport.split(".")) {
          this.Component = this.Component[part];
        }
      }
      this.hydrator = hydrator;

      await this.hydrate();
    } catch (e) {
      console.error(
        `[hugo-island] Error hydrating ${this.getAttribute("component-url")}`,
        e,
      );
    }
  }

  hydrate = async () => {
    // The client directive needs to load the hydrator code before it can hydrate
    if (!this.hydrator) return;

    // Make sure the island is mounted on the DOM before hydrating. It could be unmounted
    // when the parent island hydrates and re-creates this island.
    if (!this.isConnected) return;

    const slotted = this.querySelectorAll("astro-slot");
    const slots: Record<string, string> = {};

    for (const slot of slotted) {
      const closest = slot.closest(this.tagName);
      if (!closest?.isSameNode(this)) continue;
      slots[slot.getAttribute("name") || "default"] = slot.innerHTML;
    }

    let props: Record<string, unknown>;

    try {
      props = this.hasAttribute("props")
        ? JSON.parse(this.getAttribute("props")!)
        : {};
    } catch (e) {
      let componentName: string =
        this.getAttribute("component-url") || "<unknown>";
      const componentExport = this.getAttribute("component-export");

      if (componentExport) {
        componentName += ` (export ${componentExport})`;
      }

      console.error(
        `[hydrate] Error parsing props for component ${componentName}`,
        this.getAttribute("props"),
        e,
      );
      throw e;
    }

    const hydrator = this.hydrator(this);

    let hydrationTimeStart;
    if (process.env.NODE_ENV === "development") {
      hydrationTimeStart = performance.now();
    }

    await hydrator(this.Component, props, slots);

    if (process.env.NODE_ENV === "development" && hydrationTimeStart) {
      this.setAttribute(
        "client-render-time",
        (performance.now() - hydrationTimeStart).toString(),
      );
    }

    this.dispatchEvent(new CustomEvent("hugo:hydrate"));
  };

  attributeChangedCallback() {
    this.hydrate();
  }

  unmount = () => {
    // If element wasn't persisted, fire unmount event
    if (!this.isConnected) this.dispatchEvent(new CustomEvent("hugo:unmount"));
  };
}

if (!window.customElements.get("hugo-island")) {
  window.customElements.define("hugo-island", HugoIsland);
}

export type { HugoIsland };

export interface RenderToStaticMarkupOptions<TContext> {
  Component: any;
  props: Record<string, any>;
  children: string;
  context: TContext;
}
