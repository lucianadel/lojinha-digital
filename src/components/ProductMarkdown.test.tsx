import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProductMarkdown } from "./ProductMarkdown";

afterEach(cleanup);

describe("product Markdown", () => {
  it("renders headings, bold, lists, paragraphs, line breaks and checklists", () => {
    const { container } = render(<ProductMarkdown>{"# Guia\n\n## Benefícios\n\n**Educação** com carinho\nSegunda linha\n\nOutro parágrafo\n\n- Passeios\n- Rotina\n\n- [x] Exercícios\n- [ ] Próximo passo"}</ProductMarkdown>);
    expect(screen.getByRole("heading", { name: "Guia", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Benefícios", level: 2 })).toBeInTheDocument();
    expect(container.querySelector("strong")).toHaveTextContent("Educação");
    expect(container.querySelector("br")).toBeInTheDocument();
    expect(screen.getByText("Outro parágrafo").tagName).toBe("P");
    expect(screen.getByText("Passeios").closest("li")).toBeInTheDocument();
    const checks = screen.getAllByRole("checkbox");
    expect(checks[0]).toBeChecked();
    expect(checks[1]).not.toBeChecked();
    checks.forEach((check) => expect(check).toBeDisabled());
  });

  it("does not execute raw HTML or unsafe links", () => {
    const { container } = render(<ProductMarkdown>{'<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[Perigoso](javascript:alert%281%29)\n\nTexto preservado'}</ProductMarkdown>);
    expect(container.querySelector("script, img, [onerror]")).toBeNull();
    expect(screen.getByText("Perigoso")).not.toHaveAttribute("href", expect.stringContaining("javascript:"));
    expect(screen.getByText("Texto preservado")).toBeInTheDocument();
  });
});
