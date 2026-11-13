import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesignsGrid } from "@/components/designs-grid";
import { defaultConfig } from "@/lib/avatar-config";
import type { Design } from "@/lib/designs";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

type GridDesign = Design & { savedLabel: string };

function design(version: number, name: string, isCurrent = false): GridDesign {
  return {
    version,
    name,
    config: defaultConfig,
    pngUrl: `https://example.test/${version}/avatar.png`,
    backgroundUrl: `https://example.test/${version}/background.svg`,
    createdAt: `2026-11-0${version}T17:00:00.000Z`,
    isCurrent,
    savedLabel: `Nov ${version}, 2026, 12:00 PM`
  };
}

const fixtures = () => [design(3, "Beach day", true), design(1, "Untitled 1")];

function stubFetch(respond: () => Promise<Response> | Response) {
  const fetchMock = vi.fn(async (..._args: [RequestInfo | URL, RequestInit?]) => respond());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const card = (name: string) => screen.getByRole("link", { name: `Open ${name}` }).closest("li")!;

function startRename(name: string, value: string) {
  fireEvent.click(screen.getByRole("button", { name: `Rename ${name}` }));
  const input = screen.getByRole("textbox", { name: "Design name" });
  fireEvent.change(input, { target: { value } });
  return input;
}

// Only Date is faked, so the ages are fixed but timers and waitFor still run.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T17:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("DesignsGrid", () => {
  describe("cards", () => {
    it("show the name, a short age and a link that opens the design", () => {
      stubFetch(() => json(200, {}));
      render(<DesignsGrid designs={fixtures()} />);

      for (const { version, name, savedLabel } of fixtures()) {
        const item = within(card(name));
        expect(item.getByText(name)).toBeInTheDocument();
        // Saved Nov 3 and Nov 1; "now" is Nov 11. The full date is the tooltip.
        const age = item.getByText(version === 3 ? "8d ago" : "10d ago");
        expect(age.tagName).toBe("TIME");
        expect(age).toHaveAttribute("title", `Saved ${savedLabel}`);
        expect(item.getByRole("link", { name: `Open ${name}` })).toHaveAttribute(
          "href",
          `/editor?design=${version}`
        );
      }
    });

    it("mark the current design and refuse to remove it", () => {
      const fetchMock = stubFetch(() => json(200, {}));
      render(<DesignsGrid designs={fixtures()} />);

      const current = within(card("Beach day"));
      // No separate chip: the select button is pressed (filled, with a check).
      expect(current.getByRole("button", { name: "Make Beach day current" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(current.getByRole("button", { name: "Make Beach day current" })).toHaveTextContent("Current");
      expect(screen.queryByText(/Current avatar:/)).not.toBeInTheDocument();
      expect(
        within(card("Untitled 1")).getByRole("button", { name: "Make Untitled 1 current" })
      ).toHaveAttribute("aria-pressed", "false");

      const remove = current.getByRole("button", { name: "Remove Beach day" });
      expect(remove).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(remove);

      expect(screen.queryByText(/from your designs\?/)).not.toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("show a name containing markup as plain text", () => {
      stubFetch(() => json(200, {}));
      const name = "<img src=x onerror=alert(1)>";
      const { container } = render(<DesignsGrid designs={[design(2, name)]} />);

      expect(screen.getByText(name)).toBeInTheDocument();
      expect(container.querySelector('img[src="x"]')).toBeNull();
    });
  });

  describe("renaming", () => {
    it("saves on Enter and shows the name once the server confirms", async () => {
      const fetchMock = stubFetch(() => json(200, { name: "Park" }));
      render(<DesignsGrid designs={fixtures()} />);

      const input = startRename("Untitled 1", "Park");
      expect(input).toHaveAttribute("maxLength", "60");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(await screen.findByRole("link", { name: "Open Park" })).toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: "Design name" })).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/designs/1");
      expect(init).toMatchObject({ method: "PATCH", body: '{"name":"Park"}' });
    });

    it("cancels on Escape, and the blur that follows doesn't save", () => {
      const fetchMock = stubFetch(() => json(200, { name: "Park" }));
      render(<DesignsGrid designs={fixtures()} />);

      const input = startRename("Untitled 1", "Park");
      act(() => {
        fireEvent.keyDown(input, { key: "Escape" });
        fireEvent.blur(input);
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox", { name: "Design name" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Open Untitled 1" })).toBeInTheDocument();
    });

    it("keeps the input open with a message when the server rejects the name", async () => {
      stubFetch(() => json(400, { error: "invalid_name" }));
      render(<DesignsGrid designs={fixtures()} />);

      fireEvent.keyDown(startRename("Untitled 1", "Park"), { key: "Enter" });

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Design name" })).toHaveValue("Park");
    });

    it("disables the card's buttons while the request is pending", async () => {
      const response = deferred<Response>();
      stubFetch(() => response.promise);
      render(<DesignsGrid designs={fixtures()} />);

      fireEvent.keyDown(startRename("Untitled 1", "Park"), { key: "Enter" });

      const item = within(card("Untitled 1"));
      for (const button of item.getAllByRole("button")) expect(button).toBeDisabled();
      expect(within(card("Beach day")).getByRole("button", { name: "Rename Beach day" })).toBeEnabled();

      await act(async () => response.resolve(json(200, { name: "Park" })));
      expect(screen.getByRole("button", { name: "Rename Park" })).toBeEnabled();
    });

    it("removes the card and says so when the design no longer exists", async () => {
      stubFetch(() => json(404, { error: "not_found" }));
      render(<DesignsGrid designs={fixtures()} />);

      fireEvent.keyDown(startRename("Untitled 1", "Park"), { key: "Enter" });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent("This design no longer exists.")
      );
      expect(screen.queryByRole("link", { name: "Open Untitled 1" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Open Park" })).not.toBeInTheDocument();
    });
  });

  describe("removing", () => {
    it("asks first, with focus on Cancel", () => {
      stubFetch(() => new Response(null, { status: 204 }));
      render(<DesignsGrid designs={fixtures()} />);

      fireEvent.click(screen.getByRole("button", { name: "Remove Untitled 1" }));

      expect(screen.getByText("Remove 'Untitled 1' from your designs?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    });

    it("removes the card and moves focus to a remaining design", async () => {
      const fetchMock = stubFetch(() => new Response(null, { status: 204 }));
      render(<DesignsGrid designs={fixtures()} />);

      fireEvent.click(screen.getByRole("button", { name: "Remove Untitled 1" }));
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));

      await waitFor(() =>
        expect(screen.queryByRole("link", { name: "Open Untitled 1" })).not.toBeInTheDocument()
      );
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/designs/1");
      expect(init).toMatchObject({ method: "DELETE" });
      expect(screen.getByRole("link", { name: "Open Beach day" })).toHaveFocus();
    });

    it("shows an error when the server refuses", async () => {
      stubFetch(() => json(409, { error: "current_design" }));
      render(<DesignsGrid designs={fixtures()} />);

      fireEvent.click(screen.getByRole("button", { name: "Remove Untitled 1" }));
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't remove this design.");
      expect(screen.getByRole("link", { name: "Open Untitled 1" })).toBeInTheDocument();
    });

    it("sends one request for two quick clicks and shows no error afterwards", async () => {
      const fetchMock = stubFetch(() => new Response(null, { status: 204 }));
      render(<DesignsGrid designs={fixtures()} />);

      fireEvent.click(screen.getByRole("button", { name: "Remove Untitled 1" }));
      const remove = screen.getByRole("button", { name: "Remove" });
      act(() => {
        fireEvent.click(remove);
        fireEvent.click(remove);
      });

      await waitFor(() =>
        expect(screen.queryByRole("link", { name: "Open Untitled 1" })).not.toBeInTheDocument()
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("review fixes", () => {
    it("saves on blur without pulling focus back to the Rename button", async () => {
      const fetchMock = stubFetch(() => json(200, { name: "Park" }));
      render(
        <>
          <DesignsGrid designs={fixtures()} />
          <button type="button">Elsewhere</button>
        </>
      );
      const input = startRename("Untitled 1", "Park");
      const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
      elsewhere.focus();
      fireEvent.blur(input);

      await screen.findByRole("link", { name: "Open Park" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "Rename Park" })).not.toHaveFocus();
    });

    it("just exits when blurred with an unchanged name", () => {
      const fetchMock = stubFetch(() => json(200, {}));
      render(<DesignsGrid designs={fixtures()} />);
      const input = startRename("Untitled 1", "Untitled 1");
      fireEvent.blur(input);

      expect(screen.queryByRole("textbox", { name: "Design name" })).not.toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Rename Untitled 1" })).not.toHaveFocus();
    });

    it("sends exactly one PATCH when Enter saves", async () => {
      const fetchMock = stubFetch(() => json(200, { name: "Park" }));
      render(<DesignsGrid designs={fixtures()} />);
      const input = startRename("Untitled 1", "Park");
      fireEvent.keyDown(input, { key: "Enter" });

      await screen.findByRole("link", { name: "Open Park" });
      await act(async () => {});
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "Rename Park" })).toHaveFocus();
    });

    it("treats a 404 on remove as already gone", async () => {
      stubFetch(() => new Response(null, { status: 404 }));
      render(<DesignsGrid designs={fixtures()} />);
      fireEvent.click(screen.getByRole("button", { name: "Remove Untitled 1" }));
      fireEvent.click(within(card("Untitled 1")).getByRole("button", { name: "Remove" }));

      await waitFor(() =>
        expect(screen.queryByRole("link", { name: "Open Untitled 1" })).not.toBeInTheDocument()
      );
      expect(screen.getByRole("status")).toHaveTextContent("This design no longer exists.");
      expect(screen.queryByText("Couldn't remove this design.")).not.toBeInTheDocument();
    });

    it("focuses the page heading when the last removable card is removed", async () => {
      stubFetch(() => new Response(null, { status: 204 }));
      render(
        <>
          <h1 id="designs-title" tabIndex={-1}>Designs</h1>
          <DesignsGrid designs={[design(1, "Untitled 1")]} />
        </>
      );
      fireEvent.click(screen.getByRole("button", { name: "Remove Untitled 1" }));
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));

      await screen.findByText("No designs yet");
      expect(screen.getByRole("heading", { name: "Designs" })).toHaveFocus();
    });

    it("explains the current card's disabled Remove button in a tooltip", () => {
      render(<DesignsGrid designs={fixtures()} />);
      expect(screen.getByRole("button", { name: "Remove Beach day" })).toHaveAccessibleDescription(
        "Your current avatar can't be removed"
      );
      expect(screen.getByRole("button", { name: "Remove Untitled 1" })).not.toHaveAttribute("title");
    });
  });

  describe("making a design current", () => {
    it("moves the selected state and the remove rule, and refreshes the header", async () => {
      refresh.mockClear();
      const fetchMock = stubFetch(() => json(200, { version: 1 }));
      render(<DesignsGrid designs={fixtures()} />);

      const select = (name: string) => screen.getByRole("button", { name: `Make ${name} current` });
      fireEvent.click(select("Untitled 1"));

      await waitFor(() => expect(select("Untitled 1")).toHaveAttribute("aria-pressed", "true"));
      expect(fetchMock).toHaveBeenCalledWith("/api/designs/1/current", { method: "POST" });
      expect(select("Beach day")).toHaveAttribute("aria-pressed", "false");
      expect(select("Beach day")).toHaveTextContent("Make current");
      expect(screen.getByRole("button", { name: "Remove Untitled 1" })).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByRole("button", { name: "Remove Beach day" })).not.toHaveAttribute("aria-disabled");
      expect(select("Untitled 1")).toHaveFocus();
      expect(screen.getByRole("status")).toHaveTextContent("'Untitled 1' is now your current avatar.");
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it("disables the card's buttons while the request is pending", async () => {
      const response = deferred<Response>();
      const fetchMock = stubFetch(() => response.promise);
      render(<DesignsGrid designs={fixtures()} />);

      const button = screen.getByRole("button", { name: "Make Untitled 1 current" });
      fireEvent.click(button);
      fireEvent.click(button);
      expect(button).toBeDisabled();
      expect(screen.getByRole("button", { name: "Remove Untitled 1" })).toBeDisabled();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await act(async () => response.resolve(json(200, { version: 1 })));
    });

    it("removes the card when the design no longer exists", async () => {
      stubFetch(() => json(404, { error: "not_found" }));
      render(<DesignsGrid designs={fixtures()} />);
      fireEvent.click(screen.getByRole("button", { name: "Make Untitled 1 current" }));

      await waitFor(() =>
        expect(screen.queryByRole("link", { name: "Open Untitled 1" })).not.toBeInTheDocument()
      );
      expect(screen.getByRole("status")).toHaveTextContent("This design no longer exists.");
      expect(screen.getByRole("button", { name: "Make Beach day current" })).toHaveAttribute("aria-pressed", "true");
    });

    it("shows an error and changes nothing when the server fails", async () => {
      stubFetch(() => json(500, { error: "server_error" }));
      render(<DesignsGrid designs={fixtures()} />);
      fireEvent.click(screen.getByRole("button", { name: "Make Untitled 1 current" }));

      expect(await within(card("Untitled 1")).findByRole("alert")).toHaveTextContent(
        "Couldn't make this design current."
      );
      expect(screen.getByRole("button", { name: "Make Beach day current" })).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("shows an empty state with a link to the editor", () => {
    render(<DesignsGrid designs={[]} />);

    expect(screen.getByText("No designs yet")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/editor");
  });
});
