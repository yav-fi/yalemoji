import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesignsGrid } from "@/components/designs-grid";
import { defaultConfig } from "@/lib/avatar-config";
import type { Design } from "@/lib/designs";

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

afterEach(() => vi.unstubAllGlobals());

describe("DesignsGrid", () => {
  describe("cards", () => {
    it("show the name, the saved date and a link that opens the design", () => {
      stubFetch(() => json(200, {}));
      render(<DesignsGrid designs={fixtures()} />);

      for (const { version, name, savedLabel } of fixtures()) {
        const item = within(card(name));
        expect(item.getByText(name)).toBeInTheDocument();
        expect(item.getByText(`Saved ${savedLabel}`).tagName).toBe("TIME");
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
      expect(current.getByText("Current")).toBeInTheDocument();
      expect(
        current.getByText("Current avatar: save a different design to remove this one.")
      ).toBeInTheDocument();
      expect(within(card("Untitled 1")).queryByText("Current")).not.toBeInTheDocument();

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

  it("shows an empty state with a link to the editor", () => {
    render(<DesignsGrid designs={[]} />);

    expect(screen.getByText("No designs yet")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/editor");
  });
});
